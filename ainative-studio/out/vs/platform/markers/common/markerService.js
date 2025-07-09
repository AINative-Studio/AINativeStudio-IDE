/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFalsyOrEmpty, isNonEmptyArray } from '../../../base/common/arrays.js';
import { DebounceEmitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { MarkerSeverity } from './markers.js';
export const unsupportedSchemas = new Set([
    Schemas.inMemory,
    Schemas.vscodeSourceControl,
    Schemas.walkThrough,
    Schemas.walkThroughSnippet,
    Schemas.vscodeChatCodeBlock,
]);
class DoubleResourceMap {
    constructor() {
        this._byResource = new ResourceMap();
        this._byOwner = new Map();
    }
    set(resource, owner, value) {
        let ownerMap = this._byResource.get(resource);
        if (!ownerMap) {
            ownerMap = new Map();
            this._byResource.set(resource, ownerMap);
        }
        ownerMap.set(owner, value);
        let resourceMap = this._byOwner.get(owner);
        if (!resourceMap) {
            resourceMap = new ResourceMap();
            this._byOwner.set(owner, resourceMap);
        }
        resourceMap.set(resource, value);
    }
    get(resource, owner) {
        const ownerMap = this._byResource.get(resource);
        return ownerMap?.get(owner);
    }
    delete(resource, owner) {
        let removedA = false;
        let removedB = false;
        const ownerMap = this._byResource.get(resource);
        if (ownerMap) {
            removedA = ownerMap.delete(owner);
        }
        const resourceMap = this._byOwner.get(owner);
        if (resourceMap) {
            removedB = resourceMap.delete(resource);
        }
        if (removedA !== removedB) {
            throw new Error('illegal state');
        }
        return removedA && removedB;
    }
    values(key) {
        if (typeof key === 'string') {
            return this._byOwner.get(key)?.values() ?? Iterable.empty();
        }
        if (URI.isUri(key)) {
            return this._byResource.get(key)?.values() ?? Iterable.empty();
        }
        return Iterable.map(Iterable.concat(...this._byOwner.values()), map => map[1]);
    }
}
class MarkerStats {
    constructor(service) {
        this.errors = 0;
        this.infos = 0;
        this.warnings = 0;
        this.unknowns = 0;
        this._data = new ResourceMap();
        this._service = service;
        this._subscription = service.onMarkerChanged(this._update, this);
    }
    dispose() {
        this._subscription.dispose();
    }
    _update(resources) {
        for (const resource of resources) {
            const oldStats = this._data.get(resource);
            if (oldStats) {
                this._substract(oldStats);
            }
            const newStats = this._resourceStats(resource);
            this._add(newStats);
            this._data.set(resource, newStats);
        }
    }
    _resourceStats(resource) {
        const result = { errors: 0, warnings: 0, infos: 0, unknowns: 0 };
        // TODO this is a hack
        if (unsupportedSchemas.has(resource.scheme)) {
            return result;
        }
        for (const { severity } of this._service.read({ resource })) {
            if (severity === MarkerSeverity.Error) {
                result.errors += 1;
            }
            else if (severity === MarkerSeverity.Warning) {
                result.warnings += 1;
            }
            else if (severity === MarkerSeverity.Info) {
                result.infos += 1;
            }
            else {
                result.unknowns += 1;
            }
        }
        return result;
    }
    _substract(op) {
        this.errors -= op.errors;
        this.warnings -= op.warnings;
        this.infos -= op.infos;
        this.unknowns -= op.unknowns;
    }
    _add(op) {
        this.errors += op.errors;
        this.warnings += op.warnings;
        this.infos += op.infos;
        this.unknowns += op.unknowns;
    }
}
export class MarkerService {
    constructor() {
        this._onMarkerChanged = new DebounceEmitter({
            delay: 0,
            merge: MarkerService._merge
        });
        this.onMarkerChanged = this._onMarkerChanged.event;
        this._data = new DoubleResourceMap();
        this._stats = new MarkerStats(this);
        this._filteredResources = new ResourceMap();
    }
    dispose() {
        this._stats.dispose();
        this._onMarkerChanged.dispose();
    }
    getStatistics() {
        return this._stats;
    }
    remove(owner, resources) {
        for (const resource of resources || []) {
            this.changeOne(owner, resource, []);
        }
    }
    changeOne(owner, resource, markerData) {
        if (isFalsyOrEmpty(markerData)) {
            // remove marker for this (owner,resource)-tuple
            const removed = this._data.delete(resource, owner);
            if (removed) {
                this._onMarkerChanged.fire([resource]);
            }
        }
        else {
            // insert marker for this (owner,resource)-tuple
            const markers = [];
            for (const data of markerData) {
                const marker = MarkerService._toMarker(owner, resource, data);
                if (marker) {
                    markers.push(marker);
                }
            }
            this._data.set(resource, owner, markers);
            this._onMarkerChanged.fire([resource]);
        }
    }
    installResourceFilter(resource, reason) {
        let reasons = this._filteredResources.get(resource);
        if (!reasons) {
            reasons = [];
            this._filteredResources.set(resource, reasons);
        }
        reasons.push(reason);
        this._onMarkerChanged.fire([resource]);
        return toDisposable(() => {
            const reasons = this._filteredResources.get(resource);
            if (!reasons) {
                return;
            }
            const reasonIndex = reasons.indexOf(reason);
            if (reasonIndex !== -1) {
                reasons.splice(reasonIndex, 1);
                if (reasons.length === 0) {
                    this._filteredResources.delete(resource);
                }
                this._onMarkerChanged.fire([resource]);
            }
        });
    }
    static _toMarker(owner, resource, data) {
        let { code, severity, message, source, startLineNumber, startColumn, endLineNumber, endColumn, relatedInformation, tags, } = data;
        if (!message) {
            return undefined;
        }
        // santize data
        startLineNumber = startLineNumber > 0 ? startLineNumber : 1;
        startColumn = startColumn > 0 ? startColumn : 1;
        endLineNumber = endLineNumber >= startLineNumber ? endLineNumber : startLineNumber;
        endColumn = endColumn > 0 ? endColumn : startColumn;
        return {
            resource,
            owner,
            code,
            severity,
            message,
            source,
            startLineNumber,
            startColumn,
            endLineNumber,
            endColumn,
            relatedInformation,
            tags,
        };
    }
    changeAll(owner, data) {
        const changes = [];
        // remove old marker
        const existing = this._data.values(owner);
        if (existing) {
            for (const data of existing) {
                const first = Iterable.first(data);
                if (first) {
                    changes.push(first.resource);
                    this._data.delete(first.resource, owner);
                }
            }
        }
        // add new markers
        if (isNonEmptyArray(data)) {
            // group by resource
            const groups = new ResourceMap();
            for (const { resource, marker: markerData } of data) {
                const marker = MarkerService._toMarker(owner, resource, markerData);
                if (!marker) {
                    // filter bad markers
                    continue;
                }
                const array = groups.get(resource);
                if (!array) {
                    groups.set(resource, [marker]);
                    changes.push(resource);
                }
                else {
                    array.push(marker);
                }
            }
            // insert all
            for (const [resource, value] of groups) {
                this._data.set(resource, owner, value);
            }
        }
        if (changes.length > 0) {
            this._onMarkerChanged.fire(changes);
        }
    }
    /**
     * Creates an information marker for filtered resources
     */
    _createFilteredMarker(resource, reasons) {
        const message = reasons.length === 1
            ? localize('filtered', "Problems are paused because: \"{0}\"", reasons[0])
            : localize('filtered.network', "Problems are paused because: \"{0}\" and {1} more", reasons[0], reasons.length - 1);
        return {
            owner: 'markersFilter',
            resource,
            severity: MarkerSeverity.Info,
            message,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        };
    }
    read(filter = Object.create(null)) {
        let { owner, resource, severities, take } = filter;
        if (!take || take < 0) {
            take = -1;
        }
        if (owner && resource) {
            // exactly one owner AND resource
            const reasons = this._filteredResources.get(resource);
            if (reasons?.length) {
                const infoMarker = this._createFilteredMarker(resource, reasons);
                return [infoMarker];
            }
            const data = this._data.get(resource, owner);
            if (!data) {
                return [];
            }
            const result = [];
            for (const marker of data) {
                if (take > 0 && result.length === take) {
                    break;
                }
                const reasons = this._filteredResources.get(resource);
                if (reasons?.length) {
                    result.push(this._createFilteredMarker(resource, reasons));
                }
                else if (MarkerService._accept(marker, severities)) {
                    result.push(marker);
                }
            }
            return result;
        }
        else {
            // of one resource OR owner
            const iterable = !owner && !resource
                ? this._data.values()
                : this._data.values(resource ?? owner);
            const result = [];
            const filtered = new ResourceSet();
            for (const markers of iterable) {
                for (const data of markers) {
                    if (filtered.has(data.resource)) {
                        continue;
                    }
                    if (take > 0 && result.length === take) {
                        break;
                    }
                    const reasons = this._filteredResources.get(data.resource);
                    if (reasons?.length) {
                        result.push(this._createFilteredMarker(data.resource, reasons));
                        filtered.add(data.resource);
                    }
                    else if (MarkerService._accept(data, severities)) {
                        result.push(data);
                    }
                }
            }
            return result;
        }
    }
    static _accept(marker, severities) {
        return severities === undefined || (severities & marker.severity) === marker.severity;
    }
    // --- event debounce logic
    static _merge(all) {
        const set = new ResourceMap();
        for (const array of all) {
            for (const item of array) {
                set.set(item, true);
            }
        }
        return Array.from(set.keys());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tYXJrZXJzL2NvbW1vbi9tYXJrZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQXlELGNBQWMsRUFBb0IsTUFBTSxjQUFjLENBQUM7QUFFdkgsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDekMsT0FBTyxDQUFDLFFBQVE7SUFDaEIsT0FBTyxDQUFDLG1CQUFtQjtJQUMzQixPQUFPLENBQUMsV0FBVztJQUNuQixPQUFPLENBQUMsa0JBQWtCO0lBQzFCLE9BQU8sQ0FBQyxtQkFBbUI7Q0FDM0IsQ0FBQyxDQUFDO0FBRUgsTUFBTSxpQkFBaUI7SUFBdkI7UUFFUyxnQkFBVyxHQUFHLElBQUksV0FBVyxFQUFrQixDQUFDO1FBQ2hELGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztJQWtEdEQs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