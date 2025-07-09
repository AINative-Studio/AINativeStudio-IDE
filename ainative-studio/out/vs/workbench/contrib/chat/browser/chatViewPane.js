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
import { $, getWindow } from '../../../../base/browser/dom.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatModelInitState } from '../common/chatModel.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatMode } from '../common/constants.js';
import { ChatWidget } from './chatWidget.js';
import { ChatViewWelcomeController } from './viewsWelcome/chatViewWelcomeController.js';
export const CHAT_SIDEBAR_OLD_VIEW_PANEL_ID = 'workbench.panel.chatSidebar';
export const CHAT_SIDEBAR_PANEL_ID = 'workbench.panel.chat';
export const CHAT_EDITING_SIDEBAR_PANEL_ID = 'workbench.panel.chatEditing';
let ChatViewPane = class ChatViewPane extends ViewPane {
    get widget() { return this._widget; }
    constructor(chatOptions, options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, storageService, chatService, chatAgentService, logService, layoutService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.chatOptions = chatOptions;
        this.storageService = storageService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.modelDisposables = this._register(new DisposableStore());
        this.defaultParticipantRegistrationFailed = false;
        this.didUnregisterProvider = false;
        // View state for the ViewPane is currently global per-provider basically, but some other strictly per-model state will require a separate memento.
        this.memento = new Memento('interactive-session-view-' + CHAT_PROVIDER_ID + (this.chatOptions.location === ChatAgentLocation.EditingSession ? `-edits` : ''), this.storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (this.chatService.unifiedViewEnabled && this.chatOptions.location === ChatAgentLocation.Panel && !this.viewState.hasMigratedCurrentSession) {
            const editsMemento = new Memento('interactive-session-view-' + CHAT_PROVIDER_ID + `-edits`, this.storageService);
            const lastEditsState = editsMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            if (lastEditsState.sessionId) {
                this.logService.trace(`ChatViewPane: last edits session was ${lastEditsState.sessionId}`);
                if (!this.chatService.isPersistedSessionEmpty(lastEditsState.sessionId)) {
                    this.logService.info(`ChatViewPane: migrating ${lastEditsState.sessionId} to unified view`);
                    this.viewState.sessionId = lastEditsState.sessionId;
                    this.viewState.inputValue = lastEditsState.inputValue;
                    this.viewState.inputState = {
                        ...lastEditsState.inputState,
                        chatMode: lastEditsState.inputState?.chatMode ?? ChatMode.Edit
                    };
                    this.viewState.hasMigratedCurrentSession = true;
                }
            }
        }
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (this.chatAgentService.getDefaultAgent(this.chatOptions?.location)) {
                if (!this._widget?.viewModel && !this._restoringSession) {
                    const info = this.getTransferredOrPersistedSessionInfo();
                    this._restoringSession =
                        (info.sessionId ? this.chatService.getOrRestoreSession(info.sessionId) : Promise.resolve(undefined)).then(async (model) => {
                            // The widget may be hidden at this point, because welcome views were allowed. Use setVisible to
                            // avoid doing a render while the widget is hidden. This is changing the condition in `shouldShowWelcome`
                            // so it should fire onDidChangeViewWelcomeState.
                            const wasVisible = this._widget.visible;
                            try {
                                this._widget.setVisible(false);
                                await this.updateModel(model, info.inputValue || info.mode ? { inputState: { chatMode: info.mode }, inputValue: info.inputValue } : undefined);
                                this.defaultParticipantRegistrationFailed = false;
                                this.didUnregisterProvider = false;
                                this._onDidChangeViewWelcomeState.fire();
                            }
                            finally {
                                this.widget.setVisible(wasVisible);
                            }
                        });
                    this._restoringSession.finally(() => this._restoringSession = undefined);
                }
            }
            else if (this._widget?.viewModel?.initState === ChatModelInitState.Initialized) {
                // Model is initialized, and the default agent disappeared, so show welcome view
                this.didUnregisterProvider = true;
            }
            this._onDidChangeViewWelcomeState.fire();
        }));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(ChatContextKeys.SetupViewKeys)) {
                this._onDidChangeViewWelcomeState.fire();
            }
        }));
    }
    getActionsContext() {
        return this.widget?.viewModel ? {
            sessionId: this.widget.viewModel.sessionId,
            $mid: 19 /* MarshalledId.ChatViewContext */
        } : undefined;
    }
    async updateModel(model, viewState) {
        this.modelDisposables.clear();
        model = model ?? (this.chatService.transferredSessionData?.sessionId && this.chatService.transferredSessionData?.location === this.chatOptions.location
            ? await this.chatService.getOrRestoreSession(this.chatService.transferredSessionData.sessionId)
            : this.chatService.startSession(this.chatOptions.location, CancellationToken.None));
        if (!model) {
            throw new Error('Could not start chat session');
        }
        if (viewState) {
            this.updateViewState(viewState);
        }
        this.viewState.sessionId = model.sessionId;
        this._widget.setModel(model, { ...this.viewState });
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    shouldShowWelcome() {
        const showSetup = this.contextKeyService.contextMatchesRules(ChatContextKeys.SetupViewCondition);
        const noPersistedSessions = !this.chatService.hasSessions();
        const hasCoreAgent = this.chatAgentService.getAgents().some(agent => agent.isCore && agent.locations.includes(this.chatOptions.location));
        const shouldShow = !hasCoreAgent && (this.didUnregisterProvider || !this._widget?.viewModel && noPersistedSessions || this.defaultParticipantRegistrationFailed || showSetup);
        this.logService.trace(`ChatViewPane#shouldShowWelcome(${this.chatOptions.location}) = ${shouldShow}: hasCoreAgent=${hasCoreAgent} didUnregister=${this.didUnregisterProvider} || noViewModel=${!this._widget?.viewModel} && noPersistedSessions=${noPersistedSessions} || defaultParticipantRegistrationFailed=${this.defaultParticipantRegistrationFailed} || showSetup=${showSetup}`);
        return !!shouldShow;
    }
    getTransferredOrPersistedSessionInfo() {
        if (this.chatService.transferredSessionData?.location === this.chatOptions.location) {
            const sessionId = this.chatService.transferredSessionData.sessionId;
            return {
                sessionId,
                inputValue: this.chatService.transferredSessionData.inputValue,
                mode: this.chatService.transferredSessionData.mode
            };
        }
        else {
            return { sessionId: this.viewState.sessionId };
        }
    }
    async renderBody(parent) {
        try {
            super.renderBody(parent);
            this._register(this.instantiationService.createInstance(ChatViewWelcomeController, parent, this, this.chatOptions.location));
            const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
            const locationBasedColors = this.getLocationBasedColors();
            const editorOverflowNode = this.layoutService.getContainer(getWindow(parent)).appendChild($('.chat-editor-overflow.monaco-editor'));
            this._register({ dispose: () => editorOverflowNode.remove() });
            this._widget = this._register(scopedInstantiationService.createInstance(ChatWidget, this.chatOptions.location, { viewId: this.id }, {
                autoScroll: mode => mode !== ChatMode.Ask,
                renderFollowups: this.chatOptions.location === ChatAgentLocation.Panel,
                supportsFileReferences: true,
                supportsAdditionalParticipants: this.chatOptions.location === ChatAgentLocation.Panel,
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        return this.chatService.isEditingLocation(this.chatOptions.location);
                    },
                    referencesExpandedWhenEmptyResponse: !this.chatService.isEditingLocation(this.chatOptions.location),
                    progressMessageAtBottomOfResponse: mode => mode !== ChatMode.Ask,
                },
                editorOverflowWidgetsDomNode: editorOverflowNode,
                enableImplicitContext: this.chatOptions.location === ChatAgentLocation.Panel || this.chatService.isEditingLocation(this.chatOptions.location),
                enableWorkingSet: this.chatService.isEditingLocation(this.chatOptions.location) ? 'explicit' : undefined,
                supportsChangingModes: this.chatService.isEditingLocation(this.chatOptions.location),
            }, {
                listForeground: SIDE_BAR_FOREGROUND,
                listBackground: locationBasedColors.background,
                overlayBackground: locationBasedColors.overlayBackground,
                inputEditorBackground: locationBasedColors.background,
                resultEditorBackground: editorBackground,
            }));
            this._register(this.onDidChangeBodyVisibility(visible => {
                this._widget.setVisible(visible);
            }));
            this._register(this._widget.onDidClear(() => this.clear()));
            this._widget.render(parent);
            const info = this.getTransferredOrPersistedSessionInfo();
            const disposeListener = this._register(this.chatService.onDidDisposeSession((e) => {
                // Render the welcome view if provider registration fails, eg when signed out. This activates for any session, but the problem is the same regardless
                if (e.reason === 'initializationFailed') {
                    this.defaultParticipantRegistrationFailed = true;
                    disposeListener?.dispose();
                    this._onDidChangeViewWelcomeState.fire();
                }
            }));
            const model = info.sessionId ? await this.chatService.getOrRestoreSession(info.sessionId) : undefined;
            await this.updateModel(model, info.inputValue || info.mode ? { inputState: { chatMode: info.mode }, inputValue: info.inputValue } : undefined);
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    acceptInput(query) {
        this._widget.acceptInput(query);
    }
    async clear() {
        if (this.widget.viewModel) {
            await this.chatService.clearSession(this.widget.viewModel.sessionId);
        }
        // Grab the widget's latest view state because it will be loaded back into the widget
        this.updateViewState();
        await this.updateModel(undefined);
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    async loadSession(sessionId, viewState) {
        if (this.widget.viewModel) {
            await this.chatService.clearSession(this.widget.viewModel.sessionId);
        }
        const newModel = await this.chatService.getOrRestoreSession(sessionId);
        await this.updateModel(newModel, viewState);
    }
    focusInput() {
        this._widget.focusInput();
    }
    focus() {
        super.focus();
        this._widget.focusInput();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._widget.layout(height, width);
    }
    saveState() {
        if (this._widget) {
            // Since input history is per-provider, this is handled by a separate service and not the memento here.
            // TODO multiple chat views will overwrite each other
            this._widget.saveState();
            this.updateViewState();
            this.memento.saveMemento();
        }
        super.saveState();
    }
    updateViewState(viewState) {
        const newViewState = viewState ?? this._widget.getViewState();
        for (const [key, value] of Object.entries(newViewState)) {
            // Assign all props to the memento so they get saved
            this.viewState[key] = value;
        }
    }
};
ChatViewPane = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IStorageService),
    __param(12, IChatService),
    __param(13, IChatAgentService),
    __param(14, ILogService),
    __param(15, ILayoutService)
], ChatViewPane);
export { ChatViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Vmlld1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBb0IsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRWxFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQWMsTUFBTSx3QkFBd0IsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHlCQUF5QixFQUF3QixNQUFNLDZDQUE2QyxDQUFDO0FBTzlHLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLDZCQUE2QixDQUFDO0FBQzVFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDO0FBQzVELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLDZCQUE2QixDQUFDO0FBQ3BFLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxRQUFRO0lBRXpDLElBQUksTUFBTSxLQUFpQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBVWpELFlBQ2tCLFdBQXFGLEVBQ3RHLE9BQXlCLEVBQ0wsaUJBQXFDLEVBQ3BDLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDOUMsaUJBQXFDLEVBQ2pDLHFCQUE2QyxFQUM5QyxvQkFBMkMsRUFDbEQsYUFBNkIsRUFDOUIsWUFBMkIsRUFDM0IsWUFBMkIsRUFDekIsY0FBZ0QsRUFDbkQsV0FBMEMsRUFDckMsZ0JBQW9ELEVBQzFELFVBQXdDLEVBQ3JDLGFBQThDO1FBRTlELEtBQUssQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztRQWpCdEssZ0JBQVcsR0FBWCxXQUFXLENBQTBFO1FBV3BFLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNwQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3pDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDcEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBeEI5QyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUdsRSx5Q0FBb0MsR0FBRyxLQUFLLENBQUM7UUFDN0MsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBd0JyQyxtSkFBbUo7UUFDbkosSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQywyQkFBMkIsR0FBRyxnQkFBZ0IsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxLQUFLLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkwsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsK0RBQWlFLENBQUM7UUFFMUcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxLQUFLLGlCQUFpQixDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUMvSSxNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQywyQkFBMkIsR0FBRyxnQkFBZ0IsR0FBRyxRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pILE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxVQUFVLCtEQUFpRSxDQUFDO1lBQ2hILElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0JBQzFGLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUN6RSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQywyQkFBMkIsY0FBYyxDQUFDLFNBQVMsa0JBQWtCLENBQUMsQ0FBQztvQkFDNUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQztvQkFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUc7d0JBQzNCLEdBQUcsY0FBYyxDQUFDLFVBQVU7d0JBQzVCLFFBQVEsRUFBRSxjQUFjLENBQUMsVUFBVSxFQUFFLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSTtxQkFDOUQsQ0FBQztvQkFDRixJQUFJLENBQUMsU0FBUyxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQztnQkFDakQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO1lBQzNELElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUN6RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0NBQW9DLEVBQUUsQ0FBQztvQkFDekQsSUFBSSxDQUFDLGlCQUFpQjt3QkFDckIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsS0FBSyxFQUFDLEVBQUU7NEJBQ3ZILGdHQUFnRzs0QkFDaEcseUdBQXlHOzRCQUN6RyxpREFBaUQ7NEJBQ2pELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDOzRCQUN4QyxJQUFJLENBQUM7Z0NBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7Z0NBQy9CLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7Z0NBQy9JLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxLQUFLLENBQUM7Z0NBQ2xELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUM7Z0NBQ25DLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDMUMsQ0FBQztvQ0FBUyxDQUFDO2dDQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDOzRCQUNwQyxDQUFDO3dCQUNGLENBQUMsQ0FBQyxDQUFDO29CQUNKLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUMxRSxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsS0FBSyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEYsZ0ZBQWdGO2dCQUNoRixJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDO1lBQ25DLENBQUM7WUFFRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzVELElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLGlCQUFpQjtRQUN6QixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUMvQixTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUztZQUMxQyxJQUFJLHVDQUE4QjtTQUNsQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDZixDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUE4QixFQUFFLFNBQTBCO1FBQ25GLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRO1lBQ3RKLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7WUFDL0YsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckYsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRXBELGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVRLGlCQUFpQjtRQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDakcsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDNUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzFJLE1BQU0sVUFBVSxHQUFHLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLElBQUksbUJBQW1CLElBQUksSUFBSSxDQUFDLG9DQUFvQyxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQzlLLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsT0FBTyxVQUFVLGtCQUFrQixZQUFZLGtCQUFrQixJQUFJLENBQUMscUJBQXFCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUywyQkFBMkIsbUJBQW1CLDRDQUE0QyxJQUFJLENBQUMsb0NBQW9DLGlCQUFpQixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3hYLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUNyQixDQUFDO0lBRU8sb0NBQW9DO1FBQzNDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQztZQUNwRSxPQUFPO2dCQUNOLFNBQVM7Z0JBQ1QsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsVUFBVTtnQkFDOUQsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsSUFBSTthQUNsRCxDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEQsQ0FBQztJQUNGLENBQUM7SUFFa0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFtQjtRQUN0RCxJQUFJLENBQUM7WUFDSixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXpCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUU3SCxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEssTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUMxRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BJLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBRS9ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQ3RFLFVBQVUsRUFDVixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFDekIsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUNuQjtnQkFDQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEdBQUc7Z0JBQ3pDLGVBQWUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxLQUFLO2dCQUN0RSxzQkFBc0IsRUFBRSxJQUFJO2dCQUM1Qiw4QkFBOEIsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxLQUFLO2dCQUNyRixlQUFlLEVBQUU7b0JBQ2hCLHdCQUF3QixFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7d0JBQ2pDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0RSxDQUFDO29CQUNELG1DQUFtQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztvQkFDbkcsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEdBQUc7aUJBQ2hFO2dCQUNELDRCQUE0QixFQUFFLGtCQUFrQjtnQkFDaEQscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEtBQUssaUJBQWlCLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7Z0JBQzdJLGdCQUFnQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUN4RyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO2FBQ3BGLEVBQ0Q7Z0JBQ0MsY0FBYyxFQUFFLG1CQUFtQjtnQkFDbkMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLFVBQVU7Z0JBQzlDLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDLGlCQUFpQjtnQkFDeEQscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsVUFBVTtnQkFDckQsc0JBQXNCLEVBQUUsZ0JBQWdCO2FBRXhDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ3ZELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7WUFDekQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2pGLHFKQUFxSjtnQkFDckosSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLHNCQUFzQixFQUFFLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxJQUFJLENBQUM7b0JBQ2pELGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUV0RyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hKLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLENBQUM7UUFDVCxDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxLQUFjO1FBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFTyxLQUFLLENBQUMsS0FBSztRQUNsQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQscUZBQXFGO1FBQ3JGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN2QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFbEMsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFNBQTBCO1FBQzlELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkUsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsVUFBVTtRQUNULElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVRLEtBQUs7UUFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFa0IsVUFBVSxDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQzFELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRVEsU0FBUztRQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQix1R0FBdUc7WUFDdkcscURBQXFEO1lBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7WUFFekIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDNUIsQ0FBQztRQUVELEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQTBCO1FBQ2pELE1BQU0sWUFBWSxHQUFHLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzlELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDekQsb0RBQW9EO1lBQ25ELElBQUksQ0FBQyxTQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6UVksWUFBWTtJQWV0QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsWUFBWSxDQUFBO0lBQ1osWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLFdBQVcsQ0FBQTtJQUNYLFlBQUEsY0FBYyxDQUFBO0dBNUJKLFlBQVksQ0F5UXhCIn0=