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
var TerminalChatController_1;
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatCodeBlockContextProviderService, showChatView } from '../../../chat/browser/chat.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { isDetachedTerminalInstance, ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalChatWidget } from './terminalChatWidget.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
let TerminalChatController = class TerminalChatController extends Disposable {
    static { TerminalChatController_1 = this; }
    static { this.ID = 'terminal.chat'; }
    static get(instance) {
        return instance.getContribution(TerminalChatController_1.ID);
    }
    /**
     * The terminal chat widget for the controller, this will be undefined if xterm is not ready yet (ie. the
     * terminal is still initializing). This wraps the inline chat widget.
     */
    get terminalChatWidget() { return this._terminalChatWidget?.value; }
    get lastResponseContent() {
        return this._lastResponseContent;
    }
    get scopedContextKeyService() {
        return this._terminalChatWidget?.value.inlineChatWidget.scopedContextKeyService ?? this._contextKeyService;
    }
    constructor(_ctx, chatCodeBlockContextProviderService, _contextKeyService, _instantiationService, _terminalService) {
        super();
        this._ctx = _ctx;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._terminalService = _terminalService;
        this._forcedPlaceholder = undefined;
        this._register(chatCodeBlockContextProviderService.registerProvider({
            getCodeBlockContext: (editor) => {
                if (!editor || !this._terminalChatWidget?.hasValue || !this.hasFocus()) {
                    return;
                }
                return {
                    element: editor,
                    code: editor.getValue(),
                    codeBlockIndex: 0,
                    languageId: editor.getModel().getLanguageId()
                };
            }
        }, 'terminal'));
    }
    xtermReady(xterm) {
        this._terminalChatWidget = new Lazy(() => {
            const chatWidget = this._register(this._instantiationService.createInstance(TerminalChatWidget, this._ctx.instance.domElement, this._ctx.instance, xterm));
            this._register(chatWidget.focusTracker.onDidFocus(() => {
                TerminalChatController_1.activeChatController = this;
                if (!isDetachedTerminalInstance(this._ctx.instance)) {
                    this._terminalService.setActiveInstance(this._ctx.instance);
                }
            }));
            this._register(chatWidget.focusTracker.onDidBlur(() => {
                TerminalChatController_1.activeChatController = undefined;
                this._ctx.instance.resetScrollbarVisibility();
            }));
            if (!this._ctx.instance.domElement) {
                throw new Error('FindWidget expected terminal DOM to be initialized');
            }
            return chatWidget;
        });
    }
    _updatePlaceholder() {
        const inlineChatWidget = this._terminalChatWidget?.value.inlineChatWidget;
        if (inlineChatWidget) {
            inlineChatWidget.placeholder = this._getPlaceholderText();
        }
    }
    _getPlaceholderText() {
        return this._forcedPlaceholder ?? '';
    }
    setPlaceholder(text) {
        this._forcedPlaceholder = text;
        this._updatePlaceholder();
    }
    resetPlaceholder() {
        this._forcedPlaceholder = undefined;
        this._updatePlaceholder();
    }
    updateInput(text, selectAll = true) {
        const widget = this._terminalChatWidget?.value.inlineChatWidget;
        if (widget) {
            widget.value = text;
            if (selectAll) {
                widget.selectAll();
            }
        }
    }
    focus() {
        this._terminalChatWidget?.value.focus();
    }
    hasFocus() {
        return this._terminalChatWidget?.rawValue?.hasFocus() ?? false;
    }
    async viewInChat() {
        const chatModel = this.terminalChatWidget?.inlineChatWidget.chatWidget.viewModel?.model;
        if (chatModel) {
            await this._instantiationService.invokeFunction(moveToPanelChat, chatModel);
        }
        this._terminalChatWidget?.rawValue?.hide();
    }
};
TerminalChatController = TerminalChatController_1 = __decorate([
    __param(1, IChatCodeBlockContextProviderService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, ITerminalService)
], TerminalChatController);
export { TerminalChatController };
async function moveToPanelChat(accessor, model) {
    const viewsService = accessor.get(IViewsService);
    const chatService = accessor.get(IChatService);
    const widget = await showChatView(viewsService);
    if (widget && widget.viewModel && model) {
        for (const request of model.getRequests().slice()) {
            await chatService.adoptRequest(widget.viewModel.model.sessionId, request);
        }
        widget.focusLastMessage();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUF5QixNQUFNLCtEQUErRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUE0QyxnQkFBZ0IsRUFBa0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvSixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFJM0UsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVOzthQUNyQyxPQUFFLEdBQUcsZUFBZSxBQUFsQixDQUFtQjtJQUVyQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQTJCO1FBQ3JDLE9BQU8sUUFBUSxDQUFDLGVBQWUsQ0FBeUIsd0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQWFEOzs7T0FHRztJQUNILElBQUksa0JBQWtCLEtBQXFDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHcEcsSUFBSSxtQkFBbUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksdUJBQXVCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUM7SUFDNUcsQ0FBQztJQUVELFlBQ2tCLElBQWtDLEVBQ2IsbUNBQXlFLEVBQzNGLGtCQUF1RCxFQUNwRCxxQkFBNkQsRUFDbEUsZ0JBQW1EO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBTlMsU0FBSSxHQUFKLElBQUksQ0FBOEI7UUFFZCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ25DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDakQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQXdDOUQsdUJBQWtCLEdBQXVCLFNBQVMsQ0FBQztRQXBDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNuRSxtQkFBbUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUMvQixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUN4RSxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsT0FBTztvQkFDTixPQUFPLEVBQUUsTUFBTTtvQkFDZixJQUFJLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTtvQkFDdkIsY0FBYyxFQUFFLENBQUM7b0JBQ2pCLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsYUFBYSxFQUFFO2lCQUM5QyxDQUFDO1lBQ0gsQ0FBQztTQUNELEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQWlEO1FBQzNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDeEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzVKLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUN0RCx3QkFBc0IsQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUM7Z0JBQ25ELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3JELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO2dCQUNyRCx3QkFBc0IsQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7WUFDRCxPQUFPLFVBQVUsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFLTyxrQkFBa0I7UUFDekIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1FBQzFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixnQkFBZ0IsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0QsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBWTtRQUMxQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBQy9CLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBWSxFQUFFLFNBQVMsR0FBRyxJQUFJO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUM7UUFDaEUsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQztJQUNoRSxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVU7UUFDZixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUM7UUFDeEYsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDNUMsQ0FBQzs7QUE3SFcsc0JBQXNCO0lBbUNoQyxXQUFBLG9DQUFvQyxDQUFBO0lBQ3BDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdCQUFnQixDQUFBO0dBdENOLHNCQUFzQixDQThIbEM7O0FBRUQsS0FBSyxVQUFVLGVBQWUsQ0FBQyxRQUEwQixFQUFFLEtBQTZCO0lBRXZGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUUvQyxNQUFNLE1BQU0sR0FBRyxNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVoRCxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pDLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQ0QsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDM0IsQ0FBQztBQUNGLENBQUMifQ==