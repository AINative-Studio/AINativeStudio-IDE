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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFckQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLE9BQTJCLEVBQUUsTUFBZSxFQUFFLFVBQXNCO0lBQzFHLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztJQUVwQiw0QkFBNEI7SUFDNUIsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsSUFBSSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVuQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCwyQkFBMkI7SUFDM0IsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkIsTUFBTSxLQUFLLEdBQVc7WUFDckIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsZUFBZTtZQUNsRCxXQUFXLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxXQUFXO1lBQzFDLGFBQWEsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWU7WUFDbkYsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVztTQUN2RSxDQUFDO1FBRUYsc0RBQXNEO1FBQ3RELGlEQUFpRDtRQUNqRCxvREFBb0Q7UUFDcEQsMEJBQTBCO1FBQzFCLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxlQUFlLGdFQUF3QyxDQUFDLENBQUM7UUFFNUYsbUJBQW1CO1FBQ25CLElBQUksT0FBTyxDQUFDLG1CQUFtQixrREFBMEMsRUFBRSxDQUFDO1lBQzNFLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUMsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLG1CQUFtQixtRUFBMkQsRUFBRSxDQUFDO1lBQ25HLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0QsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLG1CQUFtQixrRUFBMEQsRUFBRSxDQUFDO1lBQ2xHLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEUsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxPQUEyQjtJQUUxRCw2REFBNkQ7SUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDOUMsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDO0lBQzFCLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsMERBQTBEO0lBQzFELDJEQUEyRDtJQUMzRCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxTQUFpQyxDQUFDO0lBQ3pFLElBQUksc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFFakQsT0FBTyxzQkFBc0IsQ0FBQztJQUMvQixDQUFDO0lBRUQsOERBQThEO0lBQzlELGdFQUFnRTtJQUNoRSxNQUFNLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxTQUFpQyxDQUFDO0lBQzNFLElBQUksd0JBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUMsd0JBQXdCLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBRUQsT0FBTyx3QkFBd0IsQ0FBQztBQUNqQyxDQUFDIn0=