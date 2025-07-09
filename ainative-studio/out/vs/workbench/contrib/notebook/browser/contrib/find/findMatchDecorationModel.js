/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { FindDecorations } from '../../../../../../editor/contrib/find/browser/findDecorations.js';
import { overviewRulerSelectionHighlightForeground, overviewRulerFindMatchForeground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { NotebookOverviewRulerLane, } from '../../notebookBrowser.js';
export class FindMatchDecorationModel extends Disposable {
    constructor(_notebookEditor, ownerID) {
        super();
        this._notebookEditor = _notebookEditor;
        this.ownerID = ownerID;
        this._allMatchesDecorations = [];
        this._currentMatchCellDecorations = [];
        this._allMatchesCellDecorations = [];
        this._currentMatchDecorations = null;
    }
    get currentMatchDecorations() {
        return this._currentMatchDecorations;
    }
    clearDecorations() {
        this.clearCurrentFindMatchDecoration();
        this.setAllFindMatchesDecorations([]);
    }
    async highlightCurrentFindMatchDecorationInCell(cell, cellRange) {
        this.clearCurrentFindMatchDecoration();
        // match is an editor FindMatch, we update find match decoration in the editor
        // we will highlight the match in the webview
        this._notebookEditor.changeModelDecorations(accessor => {
            const findMatchesOptions = FindDecorations._CURRENT_FIND_MATCH_DECORATION;
            const decorations = [
                { range: cellRange, options: findMatchesOptions }
            ];
            const deltaDecoration = {
                ownerId: cell.handle,
                decorations: decorations
            };
            this._currentMatchDecorations = {
                kind: 'input',
                decorations: accessor.deltaDecorations(this._currentMatchDecorations?.kind === 'input' ? this._currentMatchDecorations.decorations : [], [deltaDecoration])
            };
        });
        this._currentMatchCellDecorations = this._notebookEditor.deltaCellDecorations(this._currentMatchCellDecorations, [{
                handle: cell.handle,
                options: {
                    overviewRuler: {
                        color: overviewRulerSelectionHighlightForeground,
                        modelRanges: [cellRange],
                        includeOutput: false,
                        position: NotebookOverviewRulerLane.Center
                    }
                }
            }]);
        return null;
    }
    async highlightCurrentFindMatchDecorationInWebview(cell, index) {
        this.clearCurrentFindMatchDecoration();
        const offset = await this._notebookEditor.findHighlightCurrent(index, this.ownerID);
        this._currentMatchDecorations = { kind: 'output', index: index };
        this._currentMatchCellDecorations = this._notebookEditor.deltaCellDecorations(this._currentMatchCellDecorations, [{
                handle: cell.handle,
                options: {
                    overviewRuler: {
                        color: overviewRulerSelectionHighlightForeground,
                        modelRanges: [],
                        includeOutput: true,
                        position: NotebookOverviewRulerLane.Center
                    }
                }
            }]);
        return offset;
    }
    clearCurrentFindMatchDecoration() {
        if (this._currentMatchDecorations?.kind === 'input') {
            this._notebookEditor.changeModelDecorations(accessor => {
                accessor.deltaDecorations(this._currentMatchDecorations?.kind === 'input' ? this._currentMatchDecorations.decorations : [], []);
                this._currentMatchDecorations = null;
            });
        }
        else if (this._currentMatchDecorations?.kind === 'output') {
            this._notebookEditor.findUnHighlightCurrent(this._currentMatchDecorations.index, this.ownerID);
        }
        this._currentMatchCellDecorations = this._notebookEditor.deltaCellDecorations(this._currentMatchCellDecorations, []);
    }
    setAllFindMatchesDecorations(cellFindMatches) {
        this._notebookEditor.changeModelDecorations((accessor) => {
            const findMatchesOptions = FindDecorations._FIND_MATCH_DECORATION;
            const deltaDecorations = cellFindMatches.map(cellFindMatch => {
                // Find matches
                const newFindMatchesDecorations = new Array(cellFindMatch.contentMatches.length);
                for (let i = 0; i < cellFindMatch.contentMatches.length; i++) {
                    newFindMatchesDecorations[i] = {
                        range: cellFindMatch.contentMatches[i].range,
                        options: findMatchesOptions
                    };
                }
                return { ownerId: cellFindMatch.cell.handle, decorations: newFindMatchesDecorations };
            });
            this._allMatchesDecorations = accessor.deltaDecorations(this._allMatchesDecorations, deltaDecorations);
        });
        this._allMatchesCellDecorations = this._notebookEditor.deltaCellDecorations(this._allMatchesCellDecorations, cellFindMatches.map(cellFindMatch => {
            return {
                ownerId: cellFindMatch.cell.handle,
                handle: cellFindMatch.cell.handle,
                options: {
                    overviewRuler: {
                        color: overviewRulerFindMatchForeground,
                        modelRanges: cellFindMatch.contentMatches.map(match => match.range),
                        includeOutput: cellFindMatch.webviewMatches.length > 0,
                        position: NotebookOverviewRulerLane.Center
                    }
                }
            };
        }));
    }
    stopWebviewFind() {
        this._notebookEditor.findStop(this.ownerID);
    }
    dispose() {
        this.clearDecorations();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1hdGNoRGVjb3JhdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9maW5kL2ZpbmRNYXRjaERlY29yYXRpb25Nb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRW5HLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3ZKLE9BQU8sRUFBd0kseUJBQXlCLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQztBQUU1TSxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQU12RCxZQUNrQixlQUFnQyxFQUNoQyxPQUFlO1FBRWhDLEtBQUssRUFBRSxDQUFDO1FBSFMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFQekIsMkJBQXNCLEdBQTRCLEVBQUUsQ0FBQztRQUNyRCxpQ0FBNEIsR0FBYSxFQUFFLENBQUM7UUFDNUMsK0JBQTBCLEdBQWEsRUFBRSxDQUFDO1FBQzFDLDZCQUF3QixHQUF1RyxJQUFJLENBQUM7SUFPNUksQ0FBQztJQUVELElBQVcsdUJBQXVCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDO0lBQ3RDLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFHTSxLQUFLLENBQUMseUNBQXlDLENBQUMsSUFB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