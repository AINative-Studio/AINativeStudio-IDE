/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isTextEditorViewState } from '../editor.js';
export function applyTextEditorOptions(options, editor, scrollType) {
    let applied = false;
    // Restore view state if any
    const viewState = massageEditorViewState(options);
    if (isTextEditorViewState(viewState)) {
        editor.restoreViewState(viewState);
        applied = true;
    }
    // Restore selection if any
    if (options.selection) {
        const range = {
            startLineNumber: options.selection.startLineNumber,
            startColumn: options.selection.startColumn,
            endLineNumber: options.selection.endLineNumber ?? options.selection.startLineNumber,
            endColumn: options.selection.endColumn ?? options.selection.startColumn
        };
        // Apply selection with a source so that listeners can
        // distinguish this selection change from others.
        // If no source is provided, set a default source to
        // signal this navigation.
        editor.setSelection(range, options.selectionSource ?? "code.navigation" /* TextEditorSelectionSource.NAVIGATION */);
        // Reveal selection
        if (options.selectionRevealType === 2 /* TextEditorSelectionRevealType.NearTop */) {
            editor.revealRangeNearTop(range, scrollType);
        }
        else if (options.selectionRevealType === 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */) {
            editor.revealRangeNearTopIfOutsideViewport(range, scrollType);
        }
        else if (options.selectionRevealType === 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */) {
            editor.revealRangeInCenterIfOutsideViewport(range, scrollType);
        }
        else {
            editor.revealRangeInCenter(range, scrollType);
        }
        applied = true;
    }
    return applied;
}
function massageEditorViewState(options) {
    // Without a selection or view state, just return immediately
    if (!options.selection || !options.viewState) {
        return options.viewState;
    }
    // Diff editor: since we have an explicit selection, clear the
    // cursor state from the modified side where the selection
    // applies. This avoids a redundant selection change event.
    const candidateDiffViewState = options.viewState;
    if (candidateDiffViewState.modified) {
        candidateDiffViewState.modified.cursorState = [];
        return candidateDiffViewState;
    }
    // Code editor: since we have an explicit selection, clear the
    // cursor state. This avoids a redundant selection change event.
    const candidateEditorViewState = options.viewState;
    if (candidateEditorViewState.cursorState) {
        candidateEditorViewState.cursorState = [];
    }
    return candidateEditorViewState;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9lZGl0b3JPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUVyRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsT0FBMkIsRUFBRSxNQUFlLEVBQUUsVUFBc0I7SUFDMUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBRXBCLDRCQUE0QjtJQUM1QixNQUFNLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRCxJQUFJLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDdEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRW5DLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELDJCQUEyQjtJQUMzQixJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QixNQUFNLEtBQUssR0FBVztZQUNyQixlQUFlLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlO1lBQ2xELFdBQVcsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVc7WUFDMUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsZUFBZTtZQUNuRixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxXQUFXO1NBQ3ZFLENBQUM7UUFFRixzREFBc0Q7UUFDdEQsaURBQWlEO1FBQ2pELG9EQUFvRDtRQUNwRCwwQkFBMEI7UUFDMUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLGVBQWUsZ0VBQXdDLENBQUMsQ0FBQztRQUU1RixtQkFBbUI7UUFDbkIsSUFBSSxPQUFPLENBQUMsbUJBQW1CLGtEQUEwQyxFQUFFLENBQUM7WUFDM0UsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5QyxDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsbUJBQW1CLG1FQUEyRCxFQUFFLENBQUM7WUFDbkcsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMvRCxDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsbUJBQW1CLGtFQUEwRCxFQUFFLENBQUM7WUFDbEcsTUFBTSxDQUFDLG9DQUFvQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLE9BQTJCO0lBRTFELDZEQUE2RDtJQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM5QyxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDMUIsQ0FBQztJQUVELDhEQUE4RDtJQUM5RCwwREFBMEQ7SUFDMUQsMkRBQTJEO0lBQzNELE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLFNBQWlDLENBQUM7SUFDekUsSUFBSSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUVqRCxPQUFPLHNCQUFzQixDQUFDO0lBQy9CLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsZ0VBQWdFO0lBQ2hFLE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLFNBQWlDLENBQUM7SUFDM0UsSUFBSSx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMxQyx3QkFBd0IsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRCxPQUFPLHdCQUF3QixDQUFDO0FBQ2pDLENBQUMifQ==