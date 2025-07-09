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
var ChatEditorInput_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation } from '../common/constants.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { shouldShowClearEditingSessionConfirmation, showClearEditingSessionConfirmation } from './actions/chatActions.js';
const ChatEditorIcon = registerIcon('chat-editor-label-icon', Codicon.commentDiscussion, nls.localize('chatEditorLabelIcon', 'Icon of the chat editor label.'));
let ChatEditorInput = class ChatEditorInput extends EditorInput {
    static { ChatEditorInput_1 = this; }
    static { this.countsInUse = new Set(); }
    static { this.TypeID = 'workbench.input.chatSession'; }
    static { this.EditorID = 'workbench.editor.chatSession'; }
    static getNewEditorUri() {
        const handle = Math.floor(Math.random() * 1e9);
        return ChatUri.generate(handle);
    }
    static getNextCount() {
        let count = 0;
        while (ChatEditorInput_1.countsInUse.has(count)) {
            count++;
        }
        return count;
    }
    constructor(resource, options, chatService, dialogService) {
        super();
        this.resource = resource;
        this.options = options;
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.closeHandler = this;
        const parsed = ChatUri.parse(resource);
        if (typeof parsed?.handle !== 'number') {
            throw new Error('Invalid chat URI');
        }
        this.sessionId = (options.target && 'sessionId' in options.target) ?
            options.target.sessionId :
            undefined;
        this.inputCount = ChatEditorInput_1.getNextCount();
        ChatEditorInput_1.countsInUse.add(this.inputCount);
        this._register(toDisposable(() => ChatEditorInput_1.countsInUse.delete(this.inputCount)));
    }
    showConfirm() {
        return this.model?.editingSession ? shouldShowClearEditingSessionConfirmation(this.model.editingSession) : false;
    }
    async confirm(editors) {
        if (!this.model?.editingSession) {
            return 0 /* ConfirmResult.SAVE */;
        }
        const titleOverride = nls.localize('chatEditorConfirmTitle', "Close Chat Editor");
        const messageOverride = nls.localize('chat.startEditing.confirmation.pending.message.default', "Closing the chat editor will end your current edit session.");
        const result = await showClearEditingSessionConfirmation(this.model.editingSession, this.dialogService, { titleOverride, messageOverride });
        return result ? 0 /* ConfirmResult.SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    get editorId() {
        return ChatEditorInput_1.EditorID;
    }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */;
    }
    matches(otherInput) {
        return otherInput instanceof ChatEditorInput_1 && otherInput.resource.toString() === this.resource.toString();
    }
    get typeId() {
        return ChatEditorInput_1.TypeID;
    }
    getName() {
        return this.model?.title || nls.localize('chatEditorName', "Chat") + (this.inputCount > 0 ? ` ${this.inputCount + 1}` : '');
    }
    getIcon() {
        return ChatEditorIcon;
    }
    async resolve() {
        if (typeof this.sessionId === 'string') {
            this.model = await this.chatService.getOrRestoreSession(this.sessionId)
                ?? this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        }
        else if (!this.options.target) {
            this.model = this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        }
        else if ('data' in this.options.target) {
            this.model = this.chatService.loadSessionFromContent(this.options.target.data);
        }
        if (!this.model) {
            return null;
        }
        this.sessionId = this.model.sessionId;
        this._register(this.model.onDidChange(() => this._onDidChangeLabel.fire()));
        return this._register(new ChatEditorModel(this.model));
    }
    dispose() {
        super.dispose();
        if (this.sessionId) {
            this.chatService.clearSession(this.sessionId);
        }
    }
};
ChatEditorInput = ChatEditorInput_1 = __decorate([
    __param(2, IChatService),
    __param(3, IDialogService)
], ChatEditorInput);
export { ChatEditorInput };
export class ChatEditorModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._isDisposed = false;
        this._isResolved = false;
    }
    async resolve() {
        this._isResolved = true;
    }
    isResolved() {
        return this._isResolved;
    }
    isDisposed() {
        return this._isDisposed;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
}
export var ChatUri;
(function (ChatUri) {
    ChatUri.scheme = Schemas.vscodeChatSesssion;
    function generate(handle) {
        return URI.from({ scheme: ChatUri.scheme, path: `chat-${handle}` });
    }
    ChatUri.generate = generate;
    function parse(resource) {
        if (resource.scheme !== ChatUri.scheme) {
            return undefined;
        }
        const match = resource.path.match(/chat-(\d+)/);
        const handleStr = match?.[1];
        if (typeof handleStr !== 'string') {
            return undefined;
        }
        const handle = parseInt(handleStr);
        if (isNaN(handle)) {
            return undefined;
        }
        return { handle };
    }
    ChatUri.parse = parse;
})(ChatUri || (ChatUri = {}));
export class ChatEditorInputSerializer {
    canSerialize(input) {
        return input instanceof ChatEditorInput && typeof input.sessionId === 'string';
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const obj = {
            options: input.options,
            sessionId: input.sessionId,
            resource: input.resource
        };
        return JSON.stringify(obj);
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            const parsed = JSON.parse(serializedEditor);
            const resource = URI.revive(parsed.resource);
            return instantiationService.createInstance(ChatEditorInput, resource, { ...parsed.options, target: { sessionId: parsed.sessionId } });
        }
        catch (err) {
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxXQUFXLEVBQXVCLE1BQU0sdUNBQXVDLENBQUM7QUFHekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBaUIsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0YsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFMUgsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsUUFBUSxD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