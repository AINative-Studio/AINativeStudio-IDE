/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { getCodeEditor, isDiffEditor } from '../../../browser/editorBrowser.js';
import { OverviewRulerLane } from '../../../common/model.js';
import { overviewRulerRangeHighlight } from '../../../common/core/editorColorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
/**
 * A reusable quick access provider for the editor with support
 * for adding decorations for navigating in the currently active file
 * (for example "Go to line", "Go to symbol").
 */
export class AbstractEditorNavigationQuickAccessProvider {
    constructor(options) {
        this.options = options;
        //#endregion
        //#region Decorations Utils
        this.rangeHighlightDecorationId = undefined;
    }
    //#region Provider methods
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Apply options if any
        picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;
        // Disable filtering & sorting, we control the results
        picker.matchOnLabel = picker.matchOnDescription = picker.matchOnDetail = picker.sortByLabel = false;
        // Provide based on current active editor
        const pickerDisposable = disposables.add(new MutableDisposable());
        pickerDisposable.value = this.doProvide(picker, token, runOptions);
        // Re-create whenever the active editor changes
        disposables.add(this.onDidActiveTextEditorControlChange(() => {
            // Clear old
            pickerDisposable.value = undefined;
            // Add new
            pickerDisposable.value = this.doProvide(picker, token);
        }));
        return disposables;
    }
    doProvide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // With text control
        const editor = this.activeTextEditorControl;
        if (editor && this.canProvideWithTextEditor(editor)) {
            const context = { editor };
            // Restore any view state if this picker was closed
            // without actually going to a line
            const codeEditor = getCodeEditor(editor);
            if (codeEditor) {
                // Remember view state and update it when the cursor position
                // changes even later because it could be that the user has
                // configured quick access to remain open when focus is lost and
                // we always want to restore the current location.
                let lastKnownEditorViewState = editor.saveViewState() ?? undefined;
                disposables.add(codeEditor.onDidChangeCursorPosition(() => {
                    lastKnownEditorViewState = editor.saveViewState() ?? undefined;
                }));
                context.restoreViewState = () => {
                    if (lastKnownEditorViewState && editor === this.activeTextEditorControl) {
                        editor.restoreViewState(lastKnownEditorViewState);
                    }
                };
                disposables.add(createSingleCallFunction(token.onCancellationRequested)(() => context.restoreViewState?.()));
            }
            // Clean up decorations on dispose
            disposables.add(toDisposable(() => this.clearDecorations(editor)));
            // Ask subclass for entries
            disposables.add(this.provideWithTextEditor(context, picker, token, runOptions));
        }
        // Without text control
        else {
            disposables.add(this.provideWithoutTextEditor(picker, token));
        }
        return disposables;
    }
    /**
     * Subclasses to implement if they can operate on the text editor.
     */
    canProvideWithTextEditor(editor) {
        return true;
    }
    gotoLocation({ editor }, options) {
        editor.setSelection(options.range, "code.jump" /* TextEditorSelectionSource.JUMP */);
        editor.revealRangeInCenter(options.range, 0 /* ScrollType.Smooth */);
        if (!options.preserveFocus) {
            editor.focus();
        }
        const model = editor.getModel();
        if (model && 'getLineContent' in model) {
            status(`${model.getLineContent(options.range.startLineNumber)}`);
        }
    }
    getModel(editor) {
        return isDiffEditor(editor) ?
            editor.getModel()?.modified :
            editor.getModel();
    }
    addDecorations(editor, range) {
        editor.changeDecorations(changeAccessor => {
            // Reset old decorations if any
            const deleteDecorations = [];
            if (this.rangeHighlightDecorationId) {
                deleteDecorations.push(this.rangeHighlightDecorationId.overviewRulerDecorationId);
                deleteDecorations.push(this.rangeHighlightDecorationId.rangeHighlightId);
                this.rangeHighlightDecorationId = undefined;
            }
            // Add new decorations for the range
            const newDecorations = [
                // highlight the entire line on the range
                {
                    range,
                    options: {
                        description: 'quick-access-range-highlight',
                        className: 'rangeHighlight',
                        isWholeLine: true
                    }
                },
                // also add overview ruler highlight
                {
                    range,
                    options: {
                        description: 'quick-access-range-highlight-overview',
                        overviewRuler: {
                            color: themeColorFromId(overviewRulerRangeHighlight),
                            position: OverviewRulerLane.Full
                        }
                    }
                }
            ];
            const [rangeHighlightId, overviewRulerDecorationId] = changeAccessor.deltaDecorations(deleteDecorations, newDecorations);
            this.rangeHighlightDecorationId = { rangeHighlightId, overviewRulerDecorationId };
        });
    }
    clearDecorations(editor) {
        const rangeHighlightDecorationId = this.rangeHighlightDecorationId;
        if (rangeHighlightDecorationId) {
            editor.changeDecorations(changeAccessor => {
                changeAccessor.deltaDecorations([
                    rangeHighlightDecorationId.overviewRulerDecorationId,
                    rangeHighlightDecorationId.rangeHighlightId
                ], []);
            });
            this.rangeHighlightDecorationId = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTmF2aWdhdGlvblF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3F1aWNrQWNjZXNzL2Jyb3dzZXIvZWRpdG9yTmF2aWdhdGlvblF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckgsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUdoRixPQUFPLEVBQXFDLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBMEJsRTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFnQiwyQ0FBMkM7SUFFaEUsWUFBc0IsT0FBNkM7UUFBN0MsWUFBTyxHQUFQLE9BQU8sQ0FBc0M7UUE4SG5FLFlBQVk7UUFHWiwyQkFBMkI7UUFFbkIsK0JBQTBCLEdBQXNDLFNBQVMsQ0FBQztJQW5JWCxDQUFDO0lBRXhFLDBCQUEwQjtJQUUxQixPQUFPLENBQUMsTUFBMkQsRUFBRSxLQUF3QixFQUFFLFVBQTJDO1FBQ3pJLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsdUJBQXVCO1FBQ3ZCLE1BQU0sQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFD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