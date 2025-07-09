/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import { splitLines } from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IMarkerData, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { unsupportedSchemas } from '../../../../platform/markers/common/markerService.js';
export function compareMarkersByUri(a, b) {
    return extUri.compare(a.resource, b.resource);
}
function compareResourceMarkers(a, b) {
    const [firstMarkerOfA] = a.markers;
    const [firstMarkerOfB] = b.markers;
    let res = 0;
    if (firstMarkerOfA && firstMarkerOfB) {
        res = MarkerSeverity.compare(firstMarkerOfA.marker.severity, firstMarkerOfB.marker.severity);
    }
    if (res === 0) {
        res = a.path.localeCompare(b.path) || a.name.localeCompare(b.name);
    }
    return res;
}
export class ResourceMarkers {
    constructor(id, resource) {
        this.id = id;
        this.resource = resource;
        this._markersMap = new ResourceMap();
        this._total = 0;
        this.path = this.resource.fsPath;
        this.name = basename(this.resource);
    }
    get markers() {
        if (!this._cachedMarkers) {
            this._cachedMarkers = [...this._markersMap.values()].flat().sort(ResourceMarkers._compareMarkers);
        }
        return this._cachedMarkers;
    }
    has(uri) {
        return this._markersMap.has(uri);
    }
    set(uri, marker) {
        this.delete(uri);
        if (isNonEmptyArray(marker)) {
            this._markersMap.set(uri, marker);
            this._total += marker.length;
            this._cachedMarkers = undefined;
        }
    }
    delete(uri) {
        const array = this._markersMap.get(uri);
        if (array) {
            this._total -= array.length;
            this._cachedMarkers = undefined;
            this._markersMap.delete(uri);
        }
    }
    get total() {
        return this._total;
    }
    static _compareMarkers(a, b) {
        return MarkerSeverity.compare(a.marker.severity, b.marker.severity)
            || extUri.compare(a.resource, b.resource)
            || Range.compareRangesUsingStarts(a.marker, b.marker);
    }
}
export class Marker {
    get resource() { return this.marker.resource; }
    get range() { return this.marker; }
    get lines() {
        if (!this._lines) {
            this._lines = splitLines(this.marker.message);
        }
        return this._lines;
    }
    constructor(id, marker, relatedInformation = []) {
        this.id = id;
        this.marker = marker;
        this.relatedInformation = relatedInformation;
    }
    toString() {
        return JSON.stringify({
            ...this.marker,
            resource: this.marker.resource.path,
            relatedInformation: this.relatedInformation.length ? this.relatedInformation.map(r => ({ ...r.raw, resource: r.raw.resource.path })) : undefined
        }, null, '\t');
    }
}
export class MarkerTableItem extends Marker {
    constructor(marker, sourceMatches, codeMatches, messageMatches, fileMatches) {
        super(marker.id, marker.marker, marker.relatedInformation);
        this.sourceMatches = sourceMatches;
        this.codeMatches = codeMatches;
        this.messageMatches = messageMatches;
        this.fileMatches = fileMatches;
    }
}
export class RelatedInformation {
    constructor(id, marker, raw) {
        this.id = id;
        this.marker = marker;
        this.raw = raw;
    }
}
export class MarkersModel {
    get resourceMarkers() {
        if (!this.cachedSortedResources) {
            this.cachedSortedResources = [...this.resourcesByUri.values()].sort(compareResourceMarkers);
        }
        return this.cachedSortedResources;
    }
    constructor() {
        this.cachedSortedResources = undefined;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._total = 0;
        this.resourcesByUri = new Map();
    }
    reset() {
        const removed = new Set();
        for (const resourceMarker of this.resourcesByUri.values()) {
            removed.add(resourceMarker);
        }
        this.resourcesByUri.clear();
        this._total = 0;
        this._onDidChange.fire({ removed, added: new Set(), updated: new Set() });
    }
    get total() {
        return this._total;
    }
    getResourceMarkers(resource) {
        return this.resourcesByUri.get(extUri.getComparisonKey(resource, true)) ?? null;
    }
    setResourceMarkers(resourcesMarkers) {
        const change = { added: new Set(), removed: new Set(), updated: new Set() };
        for (const [resource, rawMarkers] of resourcesMarkers) {
            if (unsupportedSchemas.has(resource.scheme)) {
                continue;
            }
            const key = extUri.getComparisonKey(resource, true);
            let resourceMarkers = this.resourcesByUri.get(key);
            if (isNonEmptyArray(rawMarkers)) {
                // update, add
                if (!resourceMarkers) {
                    const resourceMarkersId = this.id(resource.toString());
                    resourceMarkers = new ResourceMarkers(resourceMarkersId, resource.with({ fragment: null }));
                    this.resourcesByUri.set(key, resourceMarkers);
                    change.added.add(resourceMarkers);
                }
                else {
                    change.updated.add(resourceMarkers);
                }
                const markersCountByKey = new Map();
                const markers = rawMarkers.map((rawMarker) => {
                    const key = IMarkerData.makeKey(rawMarker);
                    const index = markersCountByKey.get(key) || 0;
                    markersCountByKey.set(key, index + 1);
                    const markerId = this.id(resourceMarkers.id, key, index, rawMarker.resource.toString());
                    let relatedInformation = undefined;
                    if (rawMarker.relatedInformation) {
                        relatedInformation = rawMarker.relatedInformation.map((r, index) => new RelatedInformation(this.id(markerId, r.resource.toString(), r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn, index), rawMarker, r));
                    }
                    return new Marker(markerId, rawMarker, relatedInformation);
                });
                this._total -= resourceMarkers.total;
                resourceMarkers.set(resource, markers);
                this._total += resourceMarkers.total;
            }
            else if (resourceMarkers) {
                // clear
                this._total -= resourceMarkers.total;
                resourceMarkers.delete(resource);
                this._total += resourceMarkers.total;
                if (resourceMarkers.total === 0) {
                    this.resourcesByUri.delete(key);
                    change.removed.add(resourceMarkers);
                }
                else {
                    change.updated.add(resourceMarkers);
                }
            }
        }
        this.cachedSortedResources = undefined;
        if (change.added.size || change.removed.size || change.updated.size) {
            this._onDidChange.fire(change);
        }
    }
    id(...values) {
        return `${hash(values)}`;
    }
    dispose() {
        this._onDidChange.dispose();
        this.resourcesByUri.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvYnJvd3Nlci9tYXJrZXJzTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWhFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQVcsV0FBVyxFQUF1QixjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUkxRixNQUFNLFVBQVUsbUJBQW1CLENBQUMsQ0FBVSxFQUFFLENBQVU7SUFDekQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLENBQWtCLEVBQUUsQ0FBa0I7SUFDckUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDbkMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENB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