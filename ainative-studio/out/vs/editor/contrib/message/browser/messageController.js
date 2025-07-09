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
var MessageController_1;
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Event } from '../../../../base/common/event.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import './messageController.css';
import { EditorCommand, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { Range } from '../../../common/core/range.js';
import { openLinkFromMarkdown } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import * as dom from '../../../../base/browser/dom.js';
let MessageController = class MessageController {
    static { MessageController_1 = this; }
    static { this.ID = 'editor.contrib.messageController'; }
    static { this.MESSAGE_VISIBLE = new RawContextKey('messageVisible', false, nls.localize('messageVisible', 'Whether the editor is currently showing an inline message')); }
    static get(editor) {
        return editor.getContribution(MessageController_1.ID);
    }
    constructor(editor, contextKeyService, _openerService) {
        this._openerService = _openerService;
        this._messageWidget = new MutableDisposable();
        this._messageListeners = new DisposableStore();
        this._mouseOverMessage = false;
        this._editor = editor;
        this._visible = MessageController_1.MESSAGE_VISIBLE.bindTo(contextKeyService);
    }
    dispose() {
        this._message?.dispose();
        this._messageListeners.dispose();
        this._messageWidget.dispose();
        this._visible.reset();
    }
    isVisible() {
        return this._visible.get();
    }
    showMessage(message, position) {
        alert(isMarkdownString(message) ? message.value : message);
        this._visible.set(true);
        this._messageWidget.clear();
        this._messageListeners.clear();
        this._message = isMarkdownString(message) ? renderMarkdown(message, {
            actionHandler: {
                callback: (url) => {
                    this.closeMessage();
                    openLinkFromMarkdown(this._openerService, url, isMarkdownString(message) ? message.isTrusted : undefined);
                },
                disposables: this._messageListeners
            },
        }) : undefined;
        this._messageWidget.value = new MessageWidget(this._editor, position, typeof message === 'string' ? message : this._message.element);
        // close on blur (debounced to allow to tab into the message), cursor, model change, dispose
        this._messageListeners.add(Event.debounce(this._editor.onDidBlurEditorText, (last, event) => event, 0)(() => {
            if (this._mouseOverMessage) {
                return; // override when mouse over message
            }
            if (this._messageWidget.value && dom.isAncestor(dom.getActiveElement(), this._messageWidget.value.getDomNode())) {
                return; // override when focus is inside the message
            }
            this.closeMessage();
        }));
        this._messageListeners.add(this._editor.onDidChangeCursorPosition(() => this.closeMessage()));
        this._messageListeners.add(this._editor.onDidDispose(() => this.closeMessage()));
        this._messageListeners.add(this._editor.onDidChangeModel(() => this.closeMessage()));
        this._messageListeners.add(dom.addDisposableListener(this._messageWidget.value.getDomNode(), dom.EventType.MOUSE_ENTER, () => this._mouseOverMessage = true, true));
        this._messageListeners.add(dom.addDisposableListener(this._messageWidget.value.getDomNode(), dom.EventType.MOUSE_LEAVE, () => this._mouseOverMessage = false, true));
        // close on mouse move
        let bounds;
        this._messageListeners.add(this._editor.onMouseMove(e => {
            // outside the text area
            if (!e.target.position) {
                return;
            }
            if (!bounds) {
                // define bounding box around position and first mouse occurance
                bounds = new Range(position.lineNumber - 3, 1, e.target.position.lineNumber + 3, 1);
            }
            else if (!bounds.containsPosition(e.target.position)) {
                // check if position is still in bounds
                this.closeMessage();
            }
        }));
    }
    closeMessage() {
        this._visible.reset();
        this._messageListeners.clear();
        if (this._messageWidget.value) {
            this._messageListeners.add(MessageWidget.fadeOut(this._messageWidget.value));
        }
    }
};
MessageController = MessageController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IOpenerService)
], MessageController);
export { MessageController };
const MessageCommand = EditorCommand.bindToContribution(MessageController.get);
registerEditorCommand(new MessageCommand({
    id: 'leaveEditorMessage',
    precondition: MessageController.MESSAGE_VISIBLE,
    handler: c => c.closeMessage(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        primary: 9 /* KeyCode.Escape */
    }
}));
class MessageWidget {
    static fadeOut(messageWidget) {
        const dispose = () => {
            messageWidget.dispose();
            clearTimeout(handle);
            messageWidget.getDomNode().removeEventListener('animationend', dispose);
        };
        const handle = setTimeout(dispose, 110);
        messageWidget.getDomNode().addEventListener('animationend', dispose);
        messageWidget.getDomNode().classList.add('fadeOut');
        return { dispose };
    }
    constructor(editor, { lineNumber, column }, text) {
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this._editor = editor;
        this._editor.revealLinesInCenterIfOutsideViewport(lineNumber, lineNumber, 0 /* ScrollType.Smooth */);
        this._position = { lineNumber, column };
        this._domNode = document.createElement('div');
        this._domNode.classList.add('monaco-editor-overlaymessage');
        this._domNode.style.marginLeft = '-6px';
        const anchorTop = document.createElement('div');
        anchorTop.classList.add('anchor', 'top');
        this._domNode.appendChild(anchorTop);
        const message = document.createElement('div');
        if (typeof text === 'string') {
            message.classList.add('message');
            message.textContent = text;
        }
        else {
            text.classList.add('message');
            message.appendChild(text);
        }
        this._domNode.appendChild(message);
        const anchorBottom = document.createElement('div');
        anchorBottom.classList.add('anchor', 'below');
        this._domNode.appendChild(anchorBottom);
        this._editor.addContentWidget(this);
        this._domNode.classList.add('fadeIn');
    }
    dispose() {
        this._editor.removeContentWidget(this);
    }
    getId() {
        return 'messageoverlay';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            position: this._position,
            preference: [
                1 /* ContentWidgetPositionPreference.ABOVE */,
                2 /* ContentWidgetPositionPreference.BELOW */,
            ],
            positionAffinity: 1 /* PositionAffinity.Right */,
        };
    }
    afterRender(position) {
        this._domNode.classList.toggle('below', position === 2 /* ContentWidgetPositionPreference.BELOW */);
    }
}
registerEditorContribution(MessageController.ID, MessageController, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbWVzc2FnZS9icm93c2VyL21lc3NhZ2VDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFM0YsT0FBTyxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZHLE9BQU8seUJBQXlCLENBQUM7QUFFakMsT0FBTyxFQUFFLGFBQWEsRUFBbUMscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6SixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDNUcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFFaEQsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7O2FBRU4sT0FBRSxHQUFHLGtDQUFrQyxBQUFyQyxDQUFzQzthQUUvQyxv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