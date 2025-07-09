/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { getCodeEditor } from '../../../browser/editorBrowser.js';
import { AbstractEditorNavigationQuickAccessProvider } from './editorNavigationQuickAccess.js';
import { localize } from '../../../../nls.js';
export class AbstractGotoLineQuickAccessProvider extends AbstractEditorNavigationQuickAccessProvider {
    static { this.PREFIX = ':'; }
    constructor() {
        super({ canAcceptInBackground: true });
    }
    provideWithoutTextEditor(picker) {
        const label = localize('cannotRunGotoLine', "Open a text editor first to go to a line.");
        picker.items = [{ label }];
        picker.ariaLabel = label;
        return Disposable.None;
    }
    provideWithTextEditor(context, picker, token) {
        const editor = context.editor;
        const disposables = new DisposableStore();
        // Goto line once picked
        disposables.add(picker.onDidAccept(event => {
            const [item] = picker.selectedItems;
            if (item) {
                if (!this.isValidLineNumber(editor, item.lineNumber)) {
                    return;
                }
                this.gotoLocation(context, { range: this.toRange(item.lineNumber, item.column), keyMods: picker.keyMods, preserveFocus: event.inBackground });
                if (!event.inBackground) {
                    picker.hide();
                }
            }
        }));
        // React to picker changes
        const updatePickerAndEditor = () => {
            const position = this.parsePosition(editor, picker.value.trim().substr(AbstractGotoLineQuickAccessProvider.PREFIX.length));
            const label = this.getPickLabel(editor, position.lineNumber, position.column);
            // Picker
            picker.items = [{
                    lineNumber: position.lineNumber,
                    column: position.column,
                    label
                }];
            // ARIA Label
            picker.ariaLabel = label;
            // Clear decorations for invalid range
            if (!this.isValidLineNumber(editor, position.lineNumber)) {
                this.clearDecorations(editor);
                return;
            }
            // Reveal
            const range = this.toRange(position.lineNumber, position.column);
            editor.revealRangeInCenter(range, 0 /* ScrollType.Smooth */);
            // Decorate
            this.addDecorations(editor, range);
        };
        updatePickerAndEditor();
        disposables.add(picker.onDidChangeValue(() => updatePickerAndEditor()));
        // Adjust line number visibility as needed
        const codeEditor = getCodeEditor(editor);
        if (codeEditor) {
            const options = codeEditor.getOptions();
            const lineNumbers = options.get(69 /* EditorOption.lineNumbers */);
            if (lineNumbers.renderType === 2 /* RenderLineNumbersType.Relative */) {
                codeEditor.updateOptions({ lineNumbers: 'on' });
                disposables.add(toDisposable(() => codeEditor.updateOptions({ lineNumbers: 'relative' })));
            }
        }
        return disposables;
    }
    toRange(lineNumber = 1, column = 1) {
        return {
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column
        };
    }
    parsePosition(editor, value) {
        // Support line-col formats of `line,col`, `line:col`, `line#col`
        const numbers = value.split(/,|:|#/).map(part => parseInt(part, 10)).filter(part => !isNaN(part));
        const endLine = this.lineCount(editor) + 1;
        return {
            lineNumber: numbers[0] > 0 ? numbers[0] : endLine + numbers[0],
            column: numbers[1]
        };
    }
    getPickLabel(editor, lineNumber, column) {
        // Location valid: indicate this as picker label
        if (this.isValidLineNumber(editor, lineNumber)) {
            if (this.isValidColumn(editor, lineNumber, column)) {
                return localize('gotoLineColumnLabel', "Go to line {0} and character {1}.", lineNumber, column);
            }
            return localize('gotoLineLabel', "Go to line {0}.", lineNumber);
        }
        // Location invalid: show generic label
        const position = editor.getPosition() || { lineNumber: 1, column: 1 };
        const lineCount = this.lineCount(editor);
        if (lineCount > 1) {
            return localize('gotoLineLabelEmptyWithLimit', "Current Line: {0}, Character: {1}. Type a line number between 1 and {2} to navigate to.", position.lineNumber, position.column, lineCount);
        }
        return localize('gotoLineLabelEmpty', "Current Line: {0}, Character: {1}. Type a line number to navigate to.", position.lineNumber, position.column);
    }
    isValidLineNumber(editor, lineNumber) {
        if (!lineNumber || typeof lineNumber !== 'number') {
            return false;
        }
        return lineNumber > 0 && lineNumber <= this.lineCount(editor);
    }
    isValidColumn(editor, lineNumber, column) {
        if (!column || typeof column !== 'number') {
            return false;
        }
        const model = this.getModel(editor);
        if (!model) {
            return false;
        }
        const positionCandidate = { lineNumber, column };
        return model.validatePosition(positionCandidate).equals(positionCandidate);
    }
    lineCount(editor) {
        return this.getModel(editor)?.getLineCount() ?? 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0xpbmVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL2dvdG9MaW5lUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBS2xFLE9BQU8sRUFBRSwyQ0FBMkMsRUFBaUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFLOUMsTUFBTSxPQUFnQixtQ0FBb0MsU0FBUSwyQ0FBMkM7YUFFckcsV0FBTSxHQUFHLEdBQUcsQ0FBQztJQUVwQjtRQUNDLEtBQUssQ0FBQyxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVTLHdCQUF3QixDQUFDLE1BQW1FO1FBQ3JHLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1FBRXpGLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFekIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFUyxxQkFBcUIsQ0FBQyxPQUFzQyxFQUFFLE1BQW1FLEVBQUUsS0FBd0I7UUFDcEssTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFB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