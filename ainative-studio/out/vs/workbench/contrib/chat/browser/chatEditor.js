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
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground, editorForeground, inputBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { Memento } from '../../../common/memento.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatMode } from '../common/constants.js';
import { clearChatEditor } from './actions/chatClear.js';
import { ChatEditorInput } from './chatEditorInput.js';
import { ChatWidget } from './chatWidget.js';
let ChatEditor = class ChatEditor extends EditorPane {
    get scopedContextKeyService() {
        return this._scopedContextKeyService;
    }
    constructor(group, telemetryService, themeService, instantiationService, storageService, contextKeyService, chatService) {
        super(ChatEditorInput.EditorID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.chatService = chatService;
    }
    async clear() {
        if (this.input) {
            return this.instantiationService.invokeFunction(clearChatEditor, this.input);
        }
    }
    createEditor(parent) {
        this._scopedContextKeyService = this._register(this.contextKeyService.createScoped(parent));
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Panel, undefined, {
            autoScroll: mode => mode !== ChatMode.Ask,
            renderFollowups: true,
            supportsFileReferences: true,
            supportsAdditionalParticipants: true,
            rendererOptions: {
                renderTextEditsAsSummary: (uri) => {
                    return this.chatService.isEditingLocation(ChatAgentLocation.Panel);
                },
                referencesExpandedWhenEmptyResponse: !this.chatService.isEditingLocation(ChatAgentLocation.Panel),
                progressMessageAtBottomOfResponse: mode => mode !== ChatMode.Ask,
            },
            enableImplicitContext: true,
            enableWorkingSet: this.chatService.isEditingLocation(ChatAgentLocation.Panel) ? 'explicit' : undefined,
            supportsChangingModes: this.chatService.isEditingLocation(ChatAgentLocation.Panel),
        }, {
            listForeground: editorForeground,
            listBackground: editorBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground
        }));
        this._register(this.widget.onDidClear(() => this.clear()));
        this.widget.render(parent);
        this.widget.setVisible(true);
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this.widget?.setVisible(visible);
    }
    focus() {
        super.focus();
        this.widget?.focusInput();
    }
    clearInput() {
        this.saveState();
        super.clearInput();
    }
    async setInput(input, options, context, token) {
        super.setInput(input, options, context, token);
        const editorModel = await input.resolve();
        if (!editorModel) {
            throw new Error(`Failed to get model for chat editor. id: ${input.sessionId}`);
        }
        if (!this.widget) {
            throw new Error('ChatEditor lifecycle issue: no editor widget');
        }
        this.updateModel(editorModel.model, options?.viewState ?? input.options.viewState);
    }
    updateModel(model, viewState) {
        this._memento = new Memento('interactive-session-editor-' + CHAT_PROVIDER_ID, this.storageService);
        this._viewState = viewState ?? this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.widget.setModel(model, { ...this._viewState });
    }
    saveState() {
        this.widget?.saveState();
        if (this._memento && this._viewState) {
            const widgetViewState = this.widget.getViewState();
            // Need to set props individually on the memento
            this._viewState.inputValue = widgetViewState.inputValue;
            this._viewState.inputState = widgetViewState.inputState;
            this._memento.saveMemento();
        }
    }
    getViewState() {
        return { ...this._viewState };
    }
    layout(dimension, position) {
        if (this.widget) {
            this.widget.layout(dimension.height, dimension.width);
        }
    }
};
ChatEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IContextKeyService),
    __param(6, IChatService)
], ChatEditor);
export { ChatEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsa0JBQWtCLEVBQTRCLE1BQU0sc0RBQXNELENBQUM7QUFFcEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDekgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDckQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFB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