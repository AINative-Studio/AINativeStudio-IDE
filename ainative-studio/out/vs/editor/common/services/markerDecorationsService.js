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
import { IMarkerService, MarkerSeverity } from '../../../platform/markers/common/markers.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { OverviewRulerLane } from '../model.js';
import { themeColorFromId } from '../../../platform/theme/common/themeService.js';
import { overviewRulerWarning, overviewRulerInfo, overviewRulerError } from '../core/editorColorRegistry.js';
import { IModelService } from './model.js';
import { Range } from '../core/range.js';
import { Schemas } from '../../../base/common/network.js';
import { Emitter } from '../../../base/common/event.js';
import { minimapInfo, minimapWarning, minimapError } from '../../../platform/theme/common/colorRegistry.js';
import { BidirectionalMap, ResourceMap } from '../../../base/common/map.js';
import { diffSets } from '../../../base/common/collections.js';
import { Iterable } from '../../../base/common/iterator.js';
let MarkerDecorationsService = class MarkerDecorationsService extends Disposable {
    constructor(modelService, _markerService) {
        super();
        this._markerService = _markerService;
        this._onDidChangeMarker = this._register(new Emitter());
        this.onDidChangeMarker = this._onDidChangeMarker.event;
        this._suppressedRanges = new ResourceMap();
        this._markerDecorations = new ResourceMap();
        modelService.getModels().forEach(model => this._onModelAdded(model));
        this._register(modelService.onModelAdded(this._onModelAdded, this));
        this._register(modelService.onModelRemoved(this._onModelRemoved, this));
        this._register(this._markerService.onMarkerChanged(this._handleMarkerChange, this));
    }
    dispose() {
        super.dispose();
        this._markerDecorations.forEach(value => value.dispose());
        this._markerDecorations.clear();
    }
    getMarker(uri, decoration) {
        const markerDecorations = this._markerDecorations.get(uri);
        return markerDecorations ? (markerDecorations.getMarker(decoration) || null) : null;
    }
    getLiveMarkers(uri) {
        const markerDecorations = this._markerDecorations.get(uri);
        return markerDecorations ? markerDecorations.getMarkers() : [];
    }
    addMarkerSuppression(uri, range) {
        let suppressedRanges = this._suppressedRanges.get(uri);
        if (!suppressedRanges) {
            suppressedRanges = new Set();
            this._suppressedRanges.set(uri, suppressedRanges);
        }
        suppressedRanges.add(range);
        this._handleMarkerChange([uri]);
        return toDisposable(() => {
            const suppressedRanges = this._suppressedRanges.get(uri);
            if (suppressedRanges) {
                suppressedRanges.delete(range);
                if (suppressedRanges.size === 0) {
                    this._suppressedRanges.delete(uri);
                }
                this._handleMarkerChange([uri]);
            }
        });
    }
    _handleMarkerChange(changedResources) {
        changedResources.forEach((resource) => {
            const markerDecorations = this._markerDecorations.get(resource);
            if (markerDecorations) {
                this._updateDecorations(markerDecorations);
            }
        });
    }
    _onModelAdded(model) {
        const markerDecorations = new MarkerDecorations(model);
        this._markerDecorations.set(model.uri, markerDecorations);
        this._updateDecorations(markerDecorations);
    }
    _onModelRemoved(model) {
        const markerDecorations = this._markerDecorations.get(model.uri);
        if (markerDecorations) {
            markerDecorations.dispose();
            this._markerDecorations.delete(model.uri);
        }
        // clean up markers for internal, transient models
        if (model.uri.scheme === Schemas.inMemory
            || model.uri.scheme === Schemas.internal
            || model.uri.scheme === Schemas.vscode) {
            this._markerService?.read({ resource: model.uri }).map(marker => marker.owner).forEach(owner => this._markerService.remove(owner, [model.uri]));
        }
    }
    _updateDecorations(markerDecorations) {
        // Limit to the first 500 errors/warnings
        let markers = this._markerService.read({ resource: markerDecorations.model.uri, take: 500 });
        // filter markers from suppressed ranges
        const suppressedRanges = this._suppressedRanges.get(markerDecorations.model.uri);
        if (suppressedRanges) {
            markers = markers.filter(marker => {
                return !Iterable.some(suppressedRanges, candidate => Range.areIntersectingOrTouching(candidate, marker));
            });
        }
        if (markerDecorations.update(markers)) {
            this._onDidChangeMarker.fire(markerDecorations.model);
        }
    }
};
MarkerDecorationsService = __decorate([
    __param(0, IModelService),
    __param(1, IMarkerService)
], MarkerDecorationsService);
export { MarkerDecorationsService };
class MarkerDecorations extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._map = new BidirectionalMap();
        this._register(toDisposable(() => {
            this.model.deltaDecorations([...this._map.values()], []);
            this._map.clear();
        }));
    }
    update(markers) {
        // We use the fact that marker instances are not recreated when different owners
        // update. So we can compare references to find out what changed since the last update.
        const { added, removed } = diffSets(new Set(this._map.keys()), new Set(markers));
        if (added.length === 0 && removed.length === 0) {
            return false;
        }
        const oldIds = removed.map(marker => this._map.get(marker));
        const newDecorations = added.map(marker => {
            return {
                range: this._createDecorationRange(this.model, marker),
                options: this._createDecorationOption(marker)
            };
        });
        const ids = this.model.deltaDecorations(oldIds, newDecorations);
        for (const removedMarker of removed) {
            this._map.delete(removedMarker);
        }
        for (let index = 0; index < ids.length; index++) {
            this._map.set(added[index], ids[index]);
        }
        return true;
    }
    getMarker(decoration) {
        return this._map.getKey(decoration.id);
    }
    getMarkers() {
        const res = [];
        this._map.forEach((id, marker) => {
            const range = this.model.getDecorationRange(id);
            if (range) {
                res.push([range, marker]);
            }
        });
        return res;
    }
    _createDecorationRange(model, rawMarker) {
        let ret = Range.lift(rawMarker);
        if (rawMarker.severity === MarkerSeverity.Hint && !this._hasMarkerTag(rawMarker, 1 /* MarkerTag.Unnecessary */) && !this._hasMarkerTag(rawMarker, 2 /* MarkerTag.Deprecated */)) {
            // * never render hints on multiple lines
            // * make enough space for three dots
            ret = ret.setEndPosition(ret.startLineNumber, ret.startColumn + 2);
        }
        ret = model.validateRange(ret);
        if (ret.isEmpty()) {
            const maxColumn = model.getLineLastNonWhitespaceColumn(ret.startLineNumber) ||
                model.getLineMaxColumn(ret.startLineNumber);
            if (maxColumn === 1 || ret.endColumn >= maxColumn) {
                // empty line or behind eol
                // keep the range as is, it will be rendered 1ch wide
                return ret;
            }
            const word = model.getWordAtPosition(ret.getStartPosition());
            if (word) {
                ret = new Range(ret.startLineNumber, word.startColumn, ret.endLineNumber, word.endColumn);
            }
        }
        else if (rawMarker.endColumn === Number.MAX_VALUE && rawMarker.startColumn === 1 && ret.startLineNumber === ret.endLineNumber) {
            const minColumn = model.getLineFirstNonWhitespaceColumn(rawMarker.startLineNumber);
            if (minColumn < ret.endColumn) {
                ret = new Range(ret.startLineNumber, minColumn, ret.endLineNumber, ret.endColumn);
                rawMarker.startColumn = minColumn;
            }
        }
        return ret;
    }
    _createDecorationOption(marker) {
        let className;
        let color = undefined;
        let zIndex;
        let inlineClassName = undefined;
        let minimap;
        switch (marker.severity) {
            case MarkerSeverity.Hint:
                if (this._hasMarkerTag(marker, 2 /* MarkerTag.Deprecated */)) {
                    className = undefined;
                }
                else if (this._hasMarkerTag(marker, 1 /* MarkerTag.Unnecessary */)) {
                    className = "squiggly-unnecessary" /* ClassName.EditorUnnecessaryDecoration */;
                }
                else {
                    className = "squiggly-hint" /* ClassName.EditorHintDecoration */;
                }
                zIndex = 0;
                break;
            case MarkerSeverity.Info:
                className = "squiggly-info" /* ClassName.EditorInfoDecoration */;
                color = themeColorFromId(overviewRulerInfo);
                zIndex = 10;
                minimap = {
                    color: themeColorFromId(minimapInfo),
                    position: 1 /* MinimapPosition.Inline */
                };
                break;
            case MarkerSeverity.Warning:
                className = "squiggly-warning" /* ClassName.EditorWarningDecoration */;
                color = themeColorFromId(overviewRulerWarning);
                zIndex = 20;
                minimap = {
                    color: themeColorFromId(minimapWarning),
                    position: 1 /* MinimapPosition.Inline */
                };
                break;
            case MarkerSeverity.Error:
            default:
                className = "squiggly-error" /* ClassName.EditorErrorDecoration */;
                color = themeColorFromId(overviewRulerError);
                zIndex = 30;
                minimap = {
                    color: themeColorFromId(minimapError),
                    position: 1 /* MinimapPosition.Inline */
                };
                break;
        }
        if (marker.tags) {
            if (marker.tags.indexOf(1 /* MarkerTag.Unnecessary */) !== -1) {
                inlineClassName = "squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */;
            }
            if (marker.tags.indexOf(2 /* MarkerTag.Deprecated */) !== -1) {
                inlineClassName = "squiggly-inline-deprecated" /* ClassName.EditorDeprecatedInlineDecoration */;
            }
        }
        return {
            description: 'marker-decoration',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className,
            showIfCollapsed: true,
            overviewRuler: {
                color,
                position: OverviewRulerLane.Right
            },
            minimap,
            zIndex,
            inlineClassName,
        };
    }
    _hasMarkerTag(marker, tag) {
        if (marker.tags) {
            return marker.tags.indexOf(tag) >= 0;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyRGVjb3JhdGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbWFya2VyRGVjb3JhdGlvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQVcsY0FBYyxFQUFhLE1BQU0sNkNBQTZDLENBQUM7QUFDakgsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUxRixPQUFPLEVBQXNGLGlCQUFpQixFQUFxRSxNQUFNLGFBQWEsQ0FBQztBQUV2TSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXJELElBQU0sd0JBQXdC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