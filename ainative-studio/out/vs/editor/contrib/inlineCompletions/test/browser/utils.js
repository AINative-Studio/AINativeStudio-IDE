/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { autorun } from '../../../../../base/common/observable.js';
export class MockInlineCompletionsProvider {
    constructor() {
        this.returnValue = [];
        this.delayMs = 0;
        this.callHistory = new Array();
        this.calledTwiceIn50Ms = false;
        this.lastTimeMs = undefined;
    }
    setReturnValue(value, delayMs = 0) {
        this.returnValue = value ? [value] : [];
        this.delayMs = delayMs;
    }
    setReturnValues(values, delayMs = 0) {
        this.returnValue = values;
        this.delayMs = delayMs;
    }
    getAndClearCallHistory() {
        const history = [...this.callHistory];
        this.callHistory = [];
        return history;
    }
    assertNotCalledTwiceWithin50ms() {
        if (this.calledTwiceIn50Ms) {
            throw new Error('provideInlineCompletions has been called at least twice within 50ms. This should not happen.');
        }
    }
    async provideInlineCompletions(model, position, context, token) {
        const currentTimeMs = new Date().getTime();
        if (this.lastTimeMs && currentTimeMs - this.lastTimeMs < 50) {
            this.calledTwiceIn50Ms = true;
        }
        this.lastTimeMs = currentTimeMs;
        this.callHistory.push({
            position: position.toString(),
            triggerKind: context.triggerKind,
            text: model.getValue()
        });
        const result = new Array();
        result.push(...this.returnValue);
        if (this.delayMs > 0) {
            await timeout(this.delayMs);
        }
        return { items: result };
    }
    freeInlineCompletions() { }
    handleItemDidShow() { }
}
export class GhostTextContext extends Disposable {
    get currentPrettyViewState() {
        return this._currentPrettyViewState;
    }
    constructor(model, editor) {
        super();
        this.editor = editor;
        this.prettyViewStates = new Array();
        this._register(autorun(reader => {
            /** @description update */
            const ghostText = model.primaryGhostText.read(reader);
            let view;
            if (ghostText) {
                view = ghostText.render(this.editor.getValue(), true);
            }
            else {
                view = this.editor.getValue();
            }
            if (this._currentPrettyViewState !== view) {
                this.prettyViewStates.push(view);
            }
            this._currentPrettyViewState = view;
        }));
    }
    getAndClearViewStates() {
        const arr = [...this.prettyViewStates];
        this.prettyViewStates.length = 0;
        return arr;
    }
    keyboardType(text) {
        this.editor.trigger('keyboard', 'type', { text });
    }
    cursorUp() {
        CoreNavigationCommands.CursorUp.runEditorCommand(null, this.editor, null);
    }
    cursorRight() {
        CoreNavigationCommands.CursorRight.runEditorCommand(null, this.editor, null);
    }
    cursorLeft() {
        CoreNavigationCommands.CursorLeft.runEditorCommand(null, this.editor, null);
    }
    cursorDown() {
        CoreNavigationCommands.CursorDown.runEditorCommand(null, this.editor, null);
    }
    cursorLineEnd() {
        CoreNavigationCommands.CursorLineEnd.runEditorCommand(null, this.editor, null);
    }
    leftDelete() {
        CoreEditingCommands.DeleteLeft.runEditorCommand(null, this.editor, null);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFNbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5FLE1BQU0sT0FBTyw2QkFBNkI7SUFBMUM7UUFDUyxnQkFBVyxHQUF1QixFQUFFLENBQUM7UUFDckMsWUFBTyxHQUFXLENBQUMsQ0FBQztRQUVwQixnQkFBVyxHQUFHLElBQUksS0FBSyxFQUFXLENBQUM7UUFDbkMsc0JBQWlCLEdBQUcsS0FBSyxDQUFDO1FBd0IxQixlQUFVLEdBQXVCLFNBQVMsQ0FBQztJQXlCcEQsQ0FBQztJQS9DTyxjQUFjLENBQUMsS0FBbUMsRUFBRSxVQUFrQixDQUFDO1FBQzdFLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDeEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUVNLGVBQWUsQ0FBQyxNQUEwQixFQUFFLFVBQWtCLENBQUM7UUFDckUsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUVNLHNCQUFzQjtRQUM1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