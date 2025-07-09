/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import * as platform from '../../../../../base/common/platform.js';
function hasModifier(e, modifier) {
    return !!e[modifier];
}
/**
 * An event that encapsulates the various trigger modifiers logic needed for go to definition.
 */
export class ClickLinkMouseEvent {
    constructor(source, opts) {
        this.target = source.target;
        this.isLeftClick = source.event.leftButton;
        this.isMiddleClick = source.event.middleButton;
        this.isRightClick = source.event.rightButton;
        this.hasTriggerModifier = hasModifier(source.event, opts.triggerModifier);
        this.hasSideBySideModifier = hasModifier(source.event, opts.triggerSideBySideModifier);
        this.isNoneOrSingleMouseDown = (source.event.detail <= 1);
    }
}
/**
 * An event that encapsulates the various trigger modifiers logic needed for go to definition.
 */
export class ClickLinkKeyboardEvent {
    constructor(source, opts) {
        this.keyCodeIsTriggerKey = (source.keyCode === opts.triggerKey);
        this.keyCodeIsSideBySideKey = (source.keyCode === opts.triggerSideBySideKey);
        this.hasTriggerModifier = hasModifier(source, opts.triggerModifier);
    }
}
export class ClickLinkOptions {
    constructor(triggerKey, triggerModifier, triggerSideBySideKey, triggerSideBySideModifier) {
        this.triggerKey = triggerKey;
        this.triggerModifier = triggerModifier;
        this.triggerSideBySideKey = triggerSideBySideKey;
        this.triggerSideBySideModifier = triggerSideBySideModifier;
    }
    equals(other) {
        return (this.triggerKey === other.triggerKey
            && this.triggerModifier === other.triggerModifier
            && this.triggerSideBySideKey === other.triggerSideBySideKey
            && this.triggerSideBySideModifier === other.triggerSideBySideModifier);
    }
}
function createOptions(multiCursorModifier) {
    if (multiCursorModifier === 'altKey') {
        if (platform.isMacintosh) {
            return new ClickLinkOptions(57 /* KeyCode.Meta */, 'metaKey', 6 /* KeyCode.Alt */, 'altKey');
        }
        return new ClickLinkOptions(5 /* KeyCode.Ctrl */, 'ctrlKey', 6 /* KeyCode.Alt */, 'altKey');
    }
    if (platform.isMacintosh) {
        return new ClickLinkOptions(6 /* KeyCode.Alt */, 'altKey', 57 /* KeyCode.Meta */, 'metaKey');
    }
    return new ClickLinkOptions(6 /* KeyCode.Alt */, 'altKey', 5 /* KeyCode.Ctrl */, 'ctrlKey');
}
export class ClickLinkGesture extends Disposable {
    constructor(editor, opts) {
        super();
        this._onMouseMoveOrRelevantKeyDown = this._register(new Emitter());
        this.onMouseMoveOrRelevantKeyDown = this._onMouseMoveOrRelevantKeyDown.event;
        this._onExecute = this._register(new Emitter());
        this.onExecute = this._onExecute.event;
        this._onCancel = this._register(new Emitter());
        this.onCancel = this._onCancel.event;
        this._editor = editor;
        this._extractLineNumberFromMouseEvent = opts?.extractLineNumberFromMouseEvent ?? ((e) => e.target.position ? e.target.position.lineNumber : 0);
        this._opts = createOptions(this._editor.getOption(79 /* EditorOption.multiCursorModifier */));
        this._lastMouseMoveEvent = null;
        this._hasTriggerKeyOnMouseDown = false;
        this._lineNumberOnMouseDown = 0;
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(79 /* EditorOption.multiCursorModifier */)) {
                const newOpts = createOptions(this._editor.getOption(79 /* EditorOption.multiCursorModifier */));
                if (this._opts.equals(newOpts)) {
                    return;
                }
                this._opts = newOpts;
                this._lastMouseMoveEvent = null;
                this._hasTriggerKeyOnMouseDown = false;
                this._lineNumberOnMouseDown = 0;
                this._onCancel.fire();
            }
        }));
        this._register(this._editor.onMouseMove((e) => this._onEditorMouseMove(new ClickLinkMouseEvent(e, this._opts))));
        this._register(this._editor.onMouseDown((e) => this._onEditorMouseDown(new ClickLinkMouseEvent(e, this._opts))));
        this._register(this._editor.onMouseUp((e) => this._onEditorMouseUp(new ClickLinkMouseEvent(e, this._opts))));
        this._register(this._editor.onKeyDown((e) => this._onEditorKeyDown(new ClickLinkKeyboardEvent(e, this._opts))));
        this._register(this._editor.onKeyUp((e) => this._onEditorKeyUp(new ClickLinkKeyboardEvent(e, this._opts))));
        this._register(this._editor.onMouseDrag(() => this._resetHandler()));
        this._register(this._editor.onDidChangeCursorSelection((e) => this._onDidChangeCursorSelection(e)));
        this._register(this._editor.onDidChangeModel((e) => this._resetHandler()));
        this._register(this._editor.onDidChangeModelContent(() => this._resetHandler()));
        this._register(this._editor.onDidScrollChange((e) => {
            if (e.scrollTopChanged || e.scrollLeftChanged) {
                this._resetHandler();
            }
        }));
    }
    _onDidChangeCursorSelection(e) {
        if (e.selection && e.selection.startColumn !== e.selection.endColumn) {
            this._resetHandler(); // immediately stop this feature if the user starts to select (https://github.com/microsoft/vscode/issues/7827)
        }
    }
    _onEditorMouseMove(mouseEvent) {
        this._lastMouseMoveEvent = mouseEvent;
        this._onMouseMoveOrRelevantKeyDown.fire([mouseEvent, null]);
    }
    _onEditorMouseDown(mouseEvent) {
        // We need to record if we had the trigger key on mouse down because someone might select something in the editor
        // holding the mouse down and then while mouse is down start to press Ctrl/Cmd to start a copy operation and then
        // release the mouse button without wanting to do the navigation.
        // With this flag we prevent goto definition if the mouse was down before the trigger key was pressed.
        this._hasTriggerKeyOnMouseDown = mouseEvent.hasTriggerModifier;
        this._lineNumberOnMouseDown = this._extractLineNumberFromMouseEvent(mouseEvent);
    }
    _onEditorMouseUp(mouseEvent) {
        const currentLineNumber = this._extractLineNumberFromMouseEvent(mouseEvent);
        if (this._hasTriggerKeyOnMouseDown && this._lineNumberOnMouseDown && this._lineNumberOnMouseDown === currentLineNumber) {
            this._onExecute.fire(mouseEvent);
        }
    }
    _onEditorKeyDown(e) {
        if (this._lastMouseMoveEvent
            && (e.keyCodeIsTriggerKey // User just pressed Ctrl/Cmd (normal goto definition)
                || (e.keyCodeIsSideBySideKey && e.hasTriggerModifier) // User pressed Ctrl/Cmd+Alt (goto definition to the side)
            )) {
            this._onMouseMoveOrRelevantKeyDown.fire([this._lastMouseMoveEvent, e]);
        }
        else if (e.hasTriggerModifier) {
            this._onCancel.fire(); // remove decorations if user holds another key with ctrl/cmd to prevent accident goto declaration
        }
    }
    _onEditorKeyUp(e) {
        if (e.keyCodeIsTriggerKey) {
            this._onCancel.fire();
        }
    }
    _resetHandler() {
        this._lastMouseMoveEvent = null;
        this._hasTriggerKeyOnMouseDown = false;
        this._onCancel.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpY2tMaW5rR2VzdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvbGluay9jbGlja0xpbmtHZXN0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQztBQUtuRSxTQUFTLFdBQVcsQ0FBQyxDQUE2RSxFQUFFLFFBQXVEO0lBQzFKLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN0QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW1CO0lBVS9CLFlBQVksTUFBeUIsRUFBRSxJQUFzQjtRQUM1RCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDN0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMscUJBQXFCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFD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