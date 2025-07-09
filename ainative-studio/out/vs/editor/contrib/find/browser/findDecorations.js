/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import { OverviewRulerLane } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { minimapFindMatch, overviewRulerFindMatchForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
export class FindDecorations {
    constructor(editor) {
        this._editor = editor;
        this._decorations = [];
        this._overviewRulerApproximateDecorations = [];
        this._findScopeDecorationIds = [];
        this._rangeHighlightDecorationId = null;
        this._highlightedDecorationId = null;
        this._startPosition = this._editor.getPosition();
    }
    dispose() {
        this._editor.removeDecorations(this._allDecorations());
        this._decorations = [];
        this._overviewRulerApproximateDecorations = [];
        this._findScopeDecorationIds = [];
        this._rangeHighlightDecorationId = null;
        this._highlightedDecorationId = null;
    }
    reset() {
        this._decorations = [];
        this._overviewRulerApproximateDecorations = [];
        this._findScopeDecorationIds = [];
        this._rangeHighlightDecorationId = null;
        this._highlightedDecorationId = null;
    }
    getCount() {
        return this._decorations.length;
    }
    /** @deprecated use getFindScopes to support multiple selections */
    getFindScope() {
        if (this._findScopeDecorationIds[0]) {
            return this._editor.getModel().getDecorationRange(this._findScopeDecorationIds[0]);
        }
        return null;
    }
    getFindScopes() {
        if (this._findScopeDecorationIds.length) {
            const scopes = this._findScopeDecorationIds.map(findScopeDecorationId => this._editor.getModel().getDecorationRange(findScopeDecorationId)).filter(element => !!element);
            if (scopes.length) {
                return scopes;
            }
        }
        return null;
    }
    getStartPosition() {
        return this._startPosition;
    }
    setStartPosition(newStartPosition) {
        this._startPosition = newStartPosition;
        this.setCurrentFindMatch(null);
    }
    _getDecorationIndex(decorationId) {
        const index = this._decorations.indexOf(decorationId);
        if (index >= 0) {
            return index + 1;
        }
        return 1;
    }
    getDecorationRangeAt(index) {
        const decorationId = index < this._decorations.length ? this._decorations[index] : null;
        if (decorationId) {
            return this._editor.getModel().getDecorationRange(decorationId);
        }
        return null;
    }
    getCurrentMatchesPosition(desiredRange) {
        const candidates = this._editor.getModel().getDecorationsInRange(desiredRange);
        for (const candidate of candidates) {
            const candidateOpts = candidate.options;
            if (candidateOpts === FindDecorations._FIND_MATCH_DECORATION || candidateOpts === FindDecorations._CURRENT_FIND_MATCH_DECORATION) {
                return this._getDecorationIndex(candidate.id);
            }
        }
        // We don't know the current match position, so returns zero to show '?' in find widget
        return 0;
    }
    setCurrentFindMatch(nextMatch) {
        let newCurrentDecorationId = null;
        let matchPosition = 0;
        if (nextMatch) {
            for (let i = 0, len = this._decorations.length; i < len; i++) {
                const range = this._editor.getModel().getDecorationRange(this._decorations[i]);
                if (nextMatch.equalsRange(range)) {
                    newCurrentDecorationId = this._decorations[i];
                    matchPosition = (i + 1);
                    break;
                }
            }
        }
        if (this._highlightedDecorationId !== null || newCurrentDecorationId !== null) {
            this._editor.changeDecorations((changeAccessor) => {
                if (this._highlightedDecorationId !== null) {
                    changeAccessor.changeDecorationOptions(this._highlightedDecorationId, FindDecorations._FIND_MATCH_DECORATION);
                    this._highlightedDecorationId = null;
                }
                if (newCurrentDecorationId !== null) {
                    this._highlightedDecorationId = newCurrentDecorationId;
                    changeAccessor.changeDecorationOptions(this._highlightedDecorationId, FindDecorations._CURRENT_FIND_MATCH_DECORATION);
                }
                if (this._rangeHighlightDecorationId !== null) {
                    changeAccessor.removeDecoration(this._rangeHighlightDecorationId);
                    this._rangeHighlightDecorationId = null;
                }
                if (newCurrentDecorationId !== null) {
                    let rng = this._editor.getModel().getDecorationRange(newCurrentDecorationId);
                    if (rng.startLineNumber !== rng.endLineNumber && rng.endColumn === 1) {
                        const lineBeforeEnd = rng.endLineNumber - 1;
                        const lineBeforeEndMaxColumn = this._editor.getModel().getLineMaxColumn(lineBeforeEnd);
                        rng = new Range(rng.startLineNumber, rng.startColumn, lineBeforeEnd, lineBeforeEndMaxColumn);
                    }
                    this._rangeHighlightDecorationId = changeAccessor.addDecoration(rng, FindDecorations._RANGE_HIGHLIGHT_DECORATION);
                }
            });
        }
        return matchPosition;
    }
    set(findMatches, findScopes) {
        this._editor.changeDecorations((accessor) => {
            let findMatchesOptions = FindDecorations._FIND_MATCH_DECORATION;
            const newOverviewRulerApproximateDecorations = [];
            if (findMatches.length > 1000) {
                // we go into a mode where the overview ruler gets "approximate" decorations
                // the reason is that the overview ruler paints all the decorations in the file and we don't want to cause freezes
                findMatchesOptions = FindDecorations._FIND_MATCH_NO_OVERVIEW_DECORATION;
                // approximate a distance in lines where matches should be merged
                const lineCount = this._editor.getModel().getLineCount();
                const height = this._editor.getLayoutInfo().height;
                const approxPixelsPerLine = height / lineCount;
                const mergeLinesDelta = Math.max(2, Math.ceil(3 / approxPixelsPerLine));
                // merge decorations as much as possible
                let prevStartLineNumber = findMatches[0].range.startLineNumber;
                let prevEndLineNumber = findMatches[0].range.endLineNumber;
                for (let i = 1, len = findMatches.length; i < len; i++) {
                    const range = findMatches[i].range;
                    if (prevEndLineNumber + mergeLinesDelta >= range.startLineNumber) {
                        if (range.endLineNumber > prevEndLineNumber) {
                            prevEndLineNumber = range.endLineNumber;
                        }
                    }
                    else {
                        newOverviewRulerApproximateDecorations.push({
                            range: new Range(prevStartLineNumber, 1, prevEndLineNumber, 1),
                            options: FindDecorations._FIND_MATCH_ONLY_OVERVIEW_DECORATION
                        });
                        prevStartLineNumber = range.startLineNumber;
                        prevEndLineNumber = range.endLineNumber;
                    }
                }
                newOverviewRulerApproximateDecorations.push({
                    range: new Range(prevStartLineNumber, 1, prevEndLineNumber, 1),
                    options: FindDecorations._FIND_MATCH_ONLY_OVERVIEW_DECORATION
                });
            }
            // Find matches
            const newFindMatchesDecorations = new Array(findMatches.length);
            for (let i = 0, len = findMatches.length; i < len; i++) {
                newFindMatchesDecorations[i] = {
                    range: findMatches[i].range,
                    options: findMatchesOptions
                };
            }
            this._decorations = accessor.deltaDecorations(this._decorations, newFindMatchesDecorations);
            // Overview ruler approximate decorations
            this._overviewRulerApproximateDecorations = accessor.deltaDecorations(this._overviewRulerApproximateDecorations, newOverviewRulerApproximateDecorations);
            // Range highlight
            if (this._rangeHighlightDecorationId) {
                accessor.removeDecoration(this._rangeHighlightDecorationId);
                this._rangeHighlightDecorationId = null;
            }
            // Find scope
            if (this._findScopeDecorationIds.length) {
                this._findScopeDecorationIds.forEach(findScopeDecorationId => accessor.removeDecoration(findScopeDecorationId));
                this._findScopeDecorationIds = [];
            }
            if (findScopes?.length) {
                this._findScopeDecorationIds = findScopes.map(findScope => accessor.addDecoration(findScope, FindDecorations._FIND_SCOPE_DECORATION));
            }
        });
    }
    matchBeforePosition(position) {
        if (this._decorations.length === 0) {
            return null;
        }
        for (let i = this._decorations.length - 1; i >= 0; i--) {
            const decorationId = this._decorations[i];
            const r = this._editor.getModel().getDecorationRange(decorationId);
            if (!r || r.endLineNumber > position.lineNumber) {
                continue;
            }
            if (r.endLineNumber < position.lineNumber) {
                return r;
            }
            if (r.endColumn > position.column) {
                continue;
            }
            return r;
        }
        return this._editor.getModel().getDecorationRange(this._decorations[this._decorations.length - 1]);
    }
    matchAfterPosition(position) {
        if (this._decorations.length === 0) {
            return null;
        }
        for (let i = 0, len = this._decorations.length; i < len; i++) {
            const decorationId = this._decorations[i];
            const r = this._editor.getModel().getDecorationRange(decorationId);
            if (!r || r.startLineNumber < position.lineNumber) {
                continue;
            }
            if (r.startLineNumber > position.lineNumber) {
                return r;
            }
            if (r.startColumn < position.column) {
                continue;
            }
            return r;
        }
        return this._editor.getModel().getDecorationRange(this._decorations[0]);
    }
    _allDecorations() {
        let result = [];
        result = result.concat(this._decorations);
        result = result.concat(this._overviewRulerApproximateDecorations);
        if (this._findScopeDecorationIds.length) {
            result.push(...this._findScopeDecorationIds);
        }
        if (this._rangeHighlightDecorationId) {
            result.push(this._rangeHighlightDecorationId);
        }
        return result;
    }
    static { this._CURRENT_FIND_MATCH_DECORATION = ModelDecorationOptions.register({
        description: 'current-find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 13,
        className: 'currentFindMatch',
        inlineClassName: 'currentFindMatchInline',
        showIfCollapsed: true,
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */
        }
    }); }
    static { this._FIND_MATCH_DECORATION = ModelDecorationOptions.register({
        description: 'find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 10,
        className: 'findMatch',
        inlineClassName: 'findMatchInline',
        showIfCollapsed: true,
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */
        }
    }); }
    static { this._FIND_MATCH_NO_OVERVIEW_DECORATION = ModelDecorationOptions.register({
        description: 'find-match-no-overview',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'findMatch',
        showIfCollapsed: true
    }); }
    static { this._FIND_MATCH_ONLY_OVERVIEW_DECORATION = ModelDecorationOptions.register({
        description: 'find-match-only-overview',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center
        }
    }); }
    static { this._RANGE_HIGHLIGHT_DECORATION = ModelDecorationOptions.register({
        description: 'find-range-highlight',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'rangeHighlight',
        isWholeLine: true
    }); }
    static { this._FIND_SCOPE_DECORATION = ModelDecorationOptions.register({
        description: 'find-scope',
        className: 'findScope',
        isWholeLine: true
    }); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvYnJvd3Nlci9maW5kRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBc0YsaUJBQWlCLEVBQTBCLE1BQU0sMEJBQTBCLENBQUM7QUFDekssT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDeEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFckYsTUFBTSxPQUFPLGVBQWU7SUFVM0IsWUFBWSxNQUF5QjtRQUNwQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsb0NBQW9DLEdBQUcsRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQztRQUN4QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNsRCxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFdkQsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLG9DQUFvQyxHQUFHLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUM7UUFDeEMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQztJQUN0QyxDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDO1FBQ3hDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUM7SUFDdEMsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxtRUFBbUU7SUFDNUQsWUFBWTtRQUNsQixJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sYUFBYTtRQUNuQixJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FDdkUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUNqRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxNQUFpQixDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM1QixDQUFDO0lBRU0sZ0JBQWdCLENBQUMsZ0JBQTBCO1FBQ2pELElBQUksQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7UUFDdkMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxZQUFvQjtRQUMvQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0RCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVNLG9CQUFvQixDQUFDLEtBQWE7UUFDeEMsTUFBTSxZQUFZLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDeEYsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVNLHlCQUF5QixDQUFDLFlBQW1CO1FBQ25ELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0UsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDO1lBQ3hDLElBQUksYUFBYSxLQUFLLGVBQWUsQ0FBQyxzQkFBc0IsSUFBSSxhQUFhLEtBQUssZUFBZSxDQUFDLDhCQUE4QixFQUFFLENBQUM7Z0JBQ2xJLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMvQyxDQUFDO1FBQ0YsQ0FBQztRQUNELHVGQUF1RjtRQUN2RixPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFFTSxtQkFBbUIsQ0FBQyxTQUF1QjtRQUNqRCxJQUFJLHNCQUFzQixHQUFrQixJQUFJLENBQUM7UUFDakQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0UsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2xDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLGFBQWEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyx3QkFBd0IsS0FBSyxJQUFJLElBQUksc0JBQXNCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGNBQStDLEVBQUUsRUFBRTtnQkFDbEYsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQzVDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUM7b0JBQzlHLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUM7Z0JBQ3RDLENBQUM7Z0JBQ0QsSUFBSSxzQkFBc0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLHNCQUFzQixDQUFDO29CQUN2RCxjQUFjLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUN2SCxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLDJCQUEyQixLQUFLLElBQUksRUFBRSxDQUFDO29CQUMvQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7b0JBQ2xFLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUM7Z0JBQ3pDLENBQUM7Z0JBQ0QsSUFBSSxzQkFBc0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBRSxDQUFDO29CQUM5RSxJQUFJLEdBQUcsQ0FBQyxlQUFlLEtBQUssR0FBRyxDQUFDLGFBQWEsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUN0RSxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQzt3QkFDNUMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO3dCQUN2RixHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO29CQUM5RixDQUFDO29CQUNELElBQUksQ0FBQywyQkFBMkIsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDbkgsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7SUFFTSxHQUFHLENBQUMsV0FBd0IsRUFBRSxVQUEwQjtRQUM5RCxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFFM0MsSUFBSSxrQkFBa0IsR0FBMkIsZUFBZSxDQUFDLHNCQUFzQixDQUFDO1lBQ3hGLE1BQU0sc0NBQXNDLEdBQTRCLEVBQUUsQ0FBQztZQUUzRSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBQy9CLDRFQUE0RTtnQkFDNUUsa0hBQWtIO2dCQUNsSCxrQkFBa0IsR0FBRyxlQUFlLENBQUMsa0NBQWtDLENBQUM7Z0JBRXhFLGlFQUFpRTtnQkFDakUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDekQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxNQUFNLENBQUM7Z0JBQ25ELE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxHQUFHLFNBQVMsQ0FBQztnQkFDL0MsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO2dCQUV4RSx3Q0FBd0M7Z0JBQ3hDLElBQUksbUJBQW1CLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7Z0JBQy9ELElBQUksaUJBQWlCLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7Z0JBQzNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDeEQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztvQkFDbkMsSUFBSSxpQkFBaUIsR0FBRyxlQUFlLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUNsRSxJQUFJLEtBQUssQ0FBQyxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQzs0QkFDN0MsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQzt3QkFDekMsQ0FBQztvQkFDRixDQUFDO3lCQUFNLENBQUM7d0JBQ1Asc0NBQXNDLENBQUMsSUFBSSxDQUFDOzRCQUMzQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQzs0QkFDOUQsT0FBTyxFQUFFLGVBQWUsQ0FBQyxvQ0FBb0M7eUJBQzdELENBQUMsQ0FBQzt3QkFDSCxtQkFBbUIsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDO3dCQUM1QyxpQkFBaUIsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDO29CQUN6QyxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsc0NBQXNDLENBQUMsSUFBSSxDQUFDO29CQUMzQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztvQkFDOUQsT0FBTyxFQUFFLGVBQWUsQ0FBQyxvQ0FBb0M7aUJBQzdELENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxlQUFlO1lBQ2YsTUFBTSx5QkFBeUIsR0FBNEIsSUFBSSxLQUFLLENBQXdCLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoSCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hELHlCQUF5QixDQUFDLENBQUMsQ0FBQyxHQUFHO29CQUM5QixLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7b0JBQzNCLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzNCLENBQUM7WUFDSCxDQUFDO1lBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1lBRTVGLHlDQUF5QztZQUN6QyxJQUFJLENBQUMsb0NBQW9DLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1lBRXpKLGtCQUFrQjtZQUNsQixJQUFJLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO2dCQUN0QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQzVELElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUM7WUFDekMsQ0FBQztZQUVELGFBQWE7WUFDYixJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztnQkFDaEgsSUFBSSxDQUFDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsSUFBSSxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztZQUN2SSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sbUJBQW1CLENBQUMsUUFBa0I7UUFDNUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pELFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDM0MsT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkMsU0FBUztZQUNWLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxRQUFrQjtRQUMzQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ25ELFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckMsU0FBUztZQUNWLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFTyxlQUFlO1FBQ3RCLElBQUksTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDMUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQzthQUVzQixtQ0FBOEIsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7UUFDdkYsV0FBVyxFQUFFLG9CQUFvQjtRQUNqQyxVQUFVLDREQUFvRDtRQUM5RCxNQUFNLEVBQUUsRUFBRTtRQUNWLFNBQVMsRUFBRSxrQkFBa0I7UUFDN0IsZUFBZSxFQUFFLHdCQUF3QjtRQUN6QyxlQUFlLEVBQUUsSUFBSTtRQUNyQixhQUFhLEVBQUU7WUFDZCxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsZ0NBQWdDLENBQUM7WUFDekQsUUFBUSxFQUFFLGlCQUFpQixDQUFDLE1BQU07U0FDbEM7UUFDRCxPQUFPLEVBQUU7WUFDUixLQUFLLEVBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDekMsUUFBUSxnQ0FBd0I7U0FDaEM7S0FDRCxDQUFDLENBQUM7YUFFb0IsMkJBQXNCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQy9FLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLFVBQVUsNERBQW9EO1FBQzlELE1BQU0sRUFBRSxFQUFFO1FBQ1YsU0FBUyxFQUFFLFdBQVc7UUFDdEIsZUFBZSxFQUFFLGlCQUFpQjtRQUNsQyxlQUFlLEVBQUUsSUFBSTtRQUNyQixhQUFhLEVBQUU7WUFDZCxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsZ0NBQWdDLENBQUM7WUFDekQsUUFBUSxFQUFFLGlCQUFpQixDQUFDLE1BQU07U0FDbEM7UUFDRCxPQUFPLEVBQUU7WUFDUixLQUFLLEVBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDekMsUUFBUSxnQ0FBd0I7U0FDaEM7S0FDRCxDQUFDLENBQUM7YUFFb0IsdUNBQWtDLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQzNGLFdBQVcsRUFBRSx3QkFBd0I7UUFDckMsVUFBVSw0REFBb0Q7UUFDOUQsU0FBUyxFQUFFLFdBQVc7UUFDdEIsZUFBZSxFQUFFLElBQUk7S0FDckIsQ0FBQyxDQUFDO2FBRXFCLHlDQUFvQyxHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUM5RixXQUFXLEVBQUUsMEJBQTBCO1FBQ3ZDLFVBQVUsNERBQW9EO1FBQzlELGFBQWEsRUFBRTtZQUNkLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQztZQUN6RCxRQUFRLEVBQUUsaUJBQWlCLENBQUMsTUFBTTtTQUNsQztLQUNELENBQUMsQ0FBQzthQUVxQixnQ0FBMkIsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7UUFDckYsV0FBVyxFQUFFLHNCQUFzQjtRQUNuQyxVQUFVLDREQUFvRDtRQUM5RCxTQUFTLEVBQUUsZ0JBQWdCO1FBQzNCLFdBQVcsRUFBRSxJQUFJO0tBQ2pCLENBQUMsQ0FBQzthQUVxQiwyQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7UUFDaEYsV0FBVyxFQUFFLFlBQVk7UUFDekIsU0FBUyxFQUFFLFdBQVc7UUFDdEIsV0FBVyxFQUFFLElBQUk7S0FDakIsQ0FBQyxDQUFDIn0=