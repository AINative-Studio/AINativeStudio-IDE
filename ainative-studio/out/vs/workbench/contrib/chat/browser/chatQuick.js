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
var QuickChat_1;
import * as dom from '../../../../base/browser/dom.js';
import { Sash } from '../../../../base/browser/ui/sash/sash.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { editorBackground, inputBackground, quickInputBackground, quickInputForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { showChatView } from './chat.js';
import { ChatWidget } from './chatWidget.js';
import { isCellTextEditOperation } from '../common/chatModel.js';
import { IChatService } from '../common/chatService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { ChatAgentLocation } from '../common/constants.js';
let QuickChatService = class QuickChatService extends Disposable {
    constructor(quickInputService, chatService, instantiationService) {
        super();
        this.quickInputService = quickInputService;
        this.chatService = chatService;
        this.instantiationService = instantiationService;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
    }
    get enabled() {
        return !!this.chatService.isEnabled(ChatAgentLocation.Panel);
    }
    get focused() {
        const widget = this._input?.widget;
        if (!widget) {
            return false;
        }
        return dom.isAncestorOfActiveElement(widget);
    }
    toggle(options) {
        // If the input is already shown, hide it. This provides a toggle behavior of the quick
        // pick. This should not happen when there is a query.
        if (this.focused && !options?.query) {
            this.close();
        }
        else {
            this.open(options);
            // If this is a partial query, the value should be cleared when closed as otherwise it
            // would remain for the next time the quick chat is opened in any context.
            if (options?.isPartialQuery) {
                const disposable = this._store.add(Event.once(this.onDidClose)(() => {
                    this._currentChat?.clearValue();
                    this._store.delete(disposable);
                }));
            }
        }
    }
    open(options) {
        if (this._input) {
            if (this._currentChat && options?.query) {
                this._currentChat.focus();
                this._currentChat.setValue(options.query, options.selection);
                if (!options.isPartialQuery) {
                    this._currentChat.acceptInput();
                }
                return;
            }
            return this.focus();
        }
        const disposableStore = new DisposableStore();
        this._input = this.quickInputService.createQuickWidget();
        this._input.contextKey = 'chatInputVisible';
        this._input.ignoreFocusOut = true;
        disposableStore.add(this._input);
        this._container ??= dom.$('.interactive-session');
        this._input.widget = this._container;
        this._input.show();
        if (!this._currentChat) {
            this._currentChat = this.instantiationService.createInstance(QuickChat);
            // show needs to come after the quickpick is shown
            this._currentChat.render(this._container);
        }
        else {
            this._currentChat.show();
        }
        disposableStore.add(this._input.onDidHide(() => {
            disposableStore.dispose();
            this._currentChat.hide();
            this._input = undefined;
            this._onDidClose.fire();
        }));
        this._currentChat.focus();
        if (options?.query) {
            this._currentChat.setValue(options.query, options.selection);
            if (!options.isPartialQuery) {
                this._currentChat.acceptInput();
            }
        }
    }
    focus() {
        this._currentChat?.focus();
    }
    close() {
        this._input?.dispose();
        this._input = undefined;
    }
    async openInChatView() {
        await this._currentChat?.openChatView();
        this.close();
    }
};
QuickChatService = __decorate([
    __param(0, IQuickInputService),
    __param(1, IChatService),
    __param(2, IInstantiationService)
], QuickChatService);
export { QuickChatService };
let QuickChat = class QuickChat extends Disposable {
    static { QuickChat_1 = this; }
    // TODO@TylerLeonhardt: be responsive to window size
    static { this.DEFAULT_MIN_HEIGHT = 200; }
    static { this.DEFAULT_HEIGHT_OFFSET = 100; }
    constructor(instantiationService, contextKeyService, chatService, layoutService, viewsService) {
        super();
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.chatService = chatService;
        this.layoutService = layoutService;
        this.viewsService = viewsService;
        this.maintainScrollTimer = this._register(new MutableDisposable());
        this._deferUpdatingDynamicLayout = false;
    }
    clear() {
        this.model?.dispose();
        this.model = undefined;
        this.updateModel();
        this.widget.inputEditor.setValue('');
    }
    focus(selection) {
        if (this.widget) {
            this.widget.focusInput();
            const value = this.widget.inputEditor.getValue();
            if (value) {
                this.widget.inputEditor.setSelection(selection ?? {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: value.length + 1
                });
            }
        }
    }
    hide() {
        this.widget.setVisible(false);
        // Maintain scroll position for a short time so that if the user re-shows the chat
        // the same scroll position will be used.
        this.maintainScrollTimer.value = disposableTimeout(() => {
            // At this point, clear this mutable disposable which will be our signal that
            // the timer has expired and we should stop maintaining scroll position
            this.maintainScrollTimer.clear();
        }, 30 * 1000); // 30 seconds
    }
    show() {
        this.widget.setVisible(true);
        // If the mutable disposable is set, then we are keeping the existing scroll position
        // so we should not update the layout.
        if (this._deferUpdatingDynamicLayout) {
            this._deferUpdatingDynamicLayout = false;
            this.widget.updateDynamicChatTreeItemLayout(2, this.maxHeight);
        }
        if (!this.maintainScrollTimer.value) {
            this.widget.layoutDynamicChatTreeItemMode();
        }
    }
    render(parent) {
        if (this.widget) {
            // NOTE: if this changes, we need to make sure disposables in this function are tracked differently.
            throw new Error('Cannot render quick chat twice');
        }
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([
            IContextKeyService,
            this._register(this.contextKeyService.createScoped(parent))
        ])));
        this.widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Panel, { isQuickChat: true }, { autoScroll: true, renderInputOnTop: true, renderStyle: 'compact', menus: { inputSideToolbar: MenuId.ChatInputSide }, enableImplicitContext: true }, {
            listForeground: quickInputForeground,
            listBackground: quickInputBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground
        }));
        this.widget.render(parent);
        this.widget.setVisible(true);
        this.widget.setDynamicChatTreeItemLayout(2, this.maxHeight);
        this.updateModel();
        this.sash = this._register(new Sash(parent, { getHorizontalSashTop: () => parent.offsetHeight }, { orientation: 1 /* Orientation.HORIZONTAL */ }));
        this.registerListeners(parent);
    }
    get maxHeight() {
        return this.layoutService.mainContainerDimension.height - QuickChat_1.DEFAULT_HEIGHT_OFFSET;
    }
    registerListeners(parent) {
        this._register(this.layoutService.onDidLayoutMainContainer(() => {
            if (this.widget.visible) {
                this.widget.updateDynamicChatTreeItemLayout(2, this.maxHeight);
            }
            else {
                // If the chat is not visible, then we should defer updating the layout
                // because it relies on offsetHeight which only works correctly
                // when the chat is visible.
                this._deferUpdatingDynamicLayout = true;
            }
        }));
        this._register(this.widget.inputEditor.onDidChangeModelContent((e) => {
            this._currentQuery = this.widget.inputEditor.getValue();
        }));
        this._register(this.widget.onDidClear(() => this.clear()));
        this._register(this.widget.onDidChangeHeight((e) => this.sash.layout()));
        const width = parent.offsetWidth;
        this._register(this.sash.onDidStart(() => {
            this.widget.isDynamicChatTreeItemLayoutEnabled = false;
        }));
        this._register(this.sash.onDidChange((e) => {
            if (e.currentY < QuickChat_1.DEFAULT_MIN_HEIGHT || e.currentY > this.maxHeight) {
                return;
            }
            this.widget.layout(e.currentY, width);
            this.sash.layout();
        }));
        this._register(this.sash.onDidReset(() => {
            this.widget.isDynamicChatTreeItemLayoutEnabled = true;
            this.widget.layoutDynamicChatTreeItemMode();
        }));
    }
    async acceptInput() {
        return this.widget.acceptInput();
    }
    async openChatView() {
        const widget = await showChatView(this.viewsService);
        if (!widget?.viewModel || !this.model) {
            return;
        }
        for (const request of this.model.getRequests()) {
            if (request.response?.response.value || request.response?.result) {
                const message = [];
                for (const item of request.response.response.value) {
                    if (item.kind === 'textEditGroup') {
                        for (const group of item.edits) {
                            message.push({
                                kind: 'textEdit',
                                edits: group,
                                uri: item.uri
                            });
                        }
                    }
                    else if (item.kind === 'notebookEditGroup') {
                        for (const group of item.edits) {
                            if (isCellTextEditOperation(group)) {
                                message.push({
                                    kind: 'textEdit',
                                    edits: [group.edit],
                                    uri: group.uri
                                });
                            }
                            else {
                                message.push({
                                    kind: 'notebookEdit',
                                    edits: [group],
                                    uri: item.uri
                                });
                            }
                        }
                    }
                    else {
                        message.push(item);
                    }
                }
                this.chatService.addCompleteRequest(widget.viewModel.sessionId, request.message, request.variableData, request.attempt, {
                    message,
                    result: request.response.result,
                    followups: request.response.followups
                });
            }
            else if (request.message) {
            }
        }
        const value = this.widget.inputEditor.getValue();
        if (value) {
            widget.inputEditor.setValue(value);
        }
        widget.focusInput();
    }
    setValue(value, selection) {
        this.widget.inputEditor.setValue(value);
        this.focus(selection);
    }
    clearValue() {
        this.widget.inputEditor.setValue('');
    }
    updateModel() {
        this.model ??= this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        if (!this.model) {
            throw new Error('Could not start chat session');
        }
        this.widget.setModel(this.model, { inputValue: this._currentQuery });
    }
};
QuickChat = QuickChat_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IChatService),
    __param(3, ILayoutService),
    __param(4, IViewsService)
], QuickChat);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0UXVpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFlLElBQUksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVuSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBZ0IsTUFBTSxzREFBc0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkosT0FBTyxFQUE0QyxZQUFZLEVBQUUsTUFBTSxXQUFXLENBQUM7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