/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { binarySearch2, equals } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { compare } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../common/core/range.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isEqual } from '../../../../base/common/resources.js';
export class MarkerCoordinate {
    constructor(marker, index, total) {
        this.marker = marker;
        this.index = index;
        this.total = total;
    }
}
let MarkerList = class MarkerList {
    constructor(resourceFilter, _markerService, _configService) {
        this._markerService = _markerService;
        this._configService = _configService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._dispoables = new DisposableStore();
        this._markers = [];
        this._nextIdx = -1;
        if (URI.isUri(resourceFilter)) {
            this._resourceFilter = uri => uri.toString() === resourceFilter.toString();
        }
        else if (resourceFilter) {
            this._resourceFilter = resourceFilter;
        }
        const compareOrder = this._configService.getValue('problems.sortOrder');
        const compareMarker = (a, b) => {
            let res = compare(a.resource.toString(), b.resource.toString());
            if (res === 0) {
                if (compareOrder === 'position') {
                    res = Range.compareRangesUsingStarts(a, b) || MarkerSeverity.compare(a.severity, b.severity);
                }
                else {
                    res = MarkerSeverity.compare(a.severity, b.severity) || Range.compareRangesUsingStarts(a, b);
                }
            }
            return res;
        };
        const updateMarker = () => {
            let newMarkers = this._markerService.read({
                resource: URI.isUri(resourceFilter) ? resourceFilter : undefined,
                severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info
            });
            if (typeof resourceFilter === 'function') {
                newMarkers = newMarkers.filter(m => this._resourceFilter(m.resource));
            }
            newMarkers.sort(compareMarker);
            if (equals(newMarkers, this._markers, (a, b) => a.resource.toString() === b.resource.toString()
                && a.startLineNumber === b.startLineNumber
                && a.startColumn === b.startColumn
                && a.endLineNumber === b.endLineNumber
                && a.endColumn === b.endColumn
                && a.severity === b.severity
                && a.message === b.message)) {
                return false;
            }
            this._markers = newMarkers;
            return true;
        };
        updateMarker();
        this._dispoables.add(_markerService.onMarkerChanged(uris => {
            if (!this._resourceFilter || uris.some(uri => this._resourceFilter(uri))) {
                if (updateMarker()) {
                    this._nextIdx = -1;
                    this._onDidChange.fire();
                }
            }
        }));
    }
    dispose() {
        this._dispoables.dispose();
        this._onDidChange.dispose();
    }
    matches(uri) {
        if (!this._resourceFilter && !uri) {
            return true;
        }
        if (!this._resourceFilter || !uri) {
            return false;
        }
        return this._resourceFilter(uri);
    }
    get selected() {
        const marker = this._markers[this._nextIdx];
        return marker && new MarkerCoordinate(marker, this._nextIdx + 1, this._markers.length);
    }
    _initIdx(model, position, fwd) {
        let idx = this._markers.findIndex(marker => isEqual(marker.resource, model.uri));
        if (idx < 0) {
            // ignore model, position because this will be a different file
            idx = binarySearch2(this._markers.length, idx => compare(this._markers[idx].resource.toString(), model.uri.toString()));
            if (idx < 0) {
                idx = ~idx;
            }
            if (fwd) {
                this._nextIdx = idx;
            }
            else {
                this._nextIdx = (this._markers.length + idx - 1) % this._markers.length;
            }
        }
        else {
            // find marker for file
            let found = false;
            let wentPast = false;
            for (let i = idx; i < this._markers.length; i++) {
                let range = Range.lift(this._markers[i]);
                if (range.isEmpty()) {
                    const word = model.getWordAtPosition(range.getStartPosition());
                    if (word) {
                        range = new Range(range.startLineNumber, word.startColumn, range.startLineNumber, word.endColumn);
                    }
                }
                if (position && (range.containsPosition(position) || position.isBeforeOrEqual(range.getStartPosition()))) {
                    this._nextIdx = i;
                    found = true;
                    wentPast = !range.containsPosition(position);
                    break;
                }
                if (this._markers[i].resource.toString() !== model.uri.toString()) {
                    break;
                }
            }
            if (!found) {
                // after the last change
                this._nextIdx = fwd ? 0 : this._markers.length - 1;
            }
            else if (wentPast && !fwd) {
                // we went past and have to go one back
                this._nextIdx -= 1;
            }
        }
        if (this._nextIdx < 0) {
            this._nextIdx = this._markers.length - 1;
        }
    }
    resetIndex() {
        this._nextIdx = -1;
    }
    move(fwd, model, position) {
        if (this._markers.length === 0) {
            return false;
        }
        const oldIdx = this._nextIdx;
        if (this._nextIdx === -1) {
            this._initIdx(model, position, fwd);
        }
        else if (fwd) {
            this._nextIdx = (this._nextIdx + 1) % this._markers.length;
        }
        else if (!fwd) {
            this._nextIdx = (this._nextIdx - 1 + this._markers.length) % this._markers.length;
        }
        if (oldIdx !== this._nextIdx) {
            return true;
        }
        return false;
    }
    find(uri, position) {
        let idx = this._markers.findIndex(marker => marker.resource.toString() === uri.toString());
        if (idx < 0) {
            return undefined;
        }
        for (; idx < this._markers.length; idx++) {
            if (Range.containsPosition(this._markers[idx], position)) {
                return new MarkerCoordinate(this._markers[idx], idx + 1, this._markers.length);
            }
        }
        return undefined;
    }
};
MarkerList = __decorate([
    __param(1, IMarkerService),
    __param(2, IConfigurationService)
], MarkerList);
export { MarkerList };
export const IMarkerNavigationService = createDecorator('IMarkerNavigationService');
let MarkerNavigationService = class MarkerNavigationService {
    constructor(_markerService, _configService) {
        this._markerService = _markerService;
        this._configService = _configService;
        this._provider = new LinkedList();
    }
    registerProvider(provider) {
        const remove = this._provider.unshift(provider);
        return toDisposable(() => remove());
    }
    getMarkerList(resource) {
        for (const provider of this._provider) {
            const result = provider.getMarkerList(resource);
            if (result) {
                return result;
            }
        }
        // default
        return new MarkerList(resource, this._markerService, this._configService);
    }
};
MarkerNavigationService = __decorate([
    __param(0, IMarkerService),
    __param(1, IConfigurationService)
], MarkerNavigationService);
registerSingleton(IMarkerNavigationService, MarkerNavigationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyTmF2aWdhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b0Vycm9yL2Jyb3dzZXIvbWFya2VyTmF2aWdhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQVcsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRCxNQUFNLE9BQU8sZ0JBQWdCO0lBQzVCLFlBQ1UsTUFBZSxFQUNmLEtBQWEsRUFDYixLQUFhO1FBRmIsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUNmLFVBQUssR0FB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