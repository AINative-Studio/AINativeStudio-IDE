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
var SetupChatAgentImplementation_1, ChatSetup_1;
import './media/chatSetup.css';
import { $, getActiveElement, setVisibility } from '../../../../base/browser/dom.js';
import { ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { toAction } from '../../../../base/common/actions.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { combinedDisposable, Disposable, DisposableStore, markAsSingleton, MutableDisposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import product from '../../../../platform/product/common/product.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { ExtensionUrlHandlerOverrideRegistry } from '../../../services/extensions/browser/extensionUrlHandler.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatEntitlement, ChatEntitlementRequests, IChatEntitlementService } from '../common/chatEntitlementService.js';
import { IChatService } from '../common/chatService.js';
import { CHAT_CATEGORY, CHAT_OPEN_ACTION_ID, CHAT_SETUP_ACTION_ID } from './actions/chatActions.js';
import { ChatViewId, EditsViewId, ensureSideBarChatViewSize, IChatWidgetService, preferCopilotEditsView, showCopilotView } from './chat.js';
import { CHAT_EDITING_SIDEBAR_PANEL_ID, CHAT_SIDEBAR_PANEL_ID } from './chatViewPane.js';
import { ChatAgentLocation, ChatConfiguration, validateChatMode } from '../common/constants.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    termsStatementUrl: product.defaultChatAgent?.termsStatementUrl ?? '',
    privacyStatementUrl: product.defaultChatAgent?.privacyStatementUrl ?? '',
    skusDocumentationUrl: product.defaultChatAgent?.skusDocumentationUrl ?? '',
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    providerName: product.defaultChatAgent?.providerName ?? '',
    enterpriseProviderId: product.defaultChatAgent?.enterpriseProviderId ?? '',
    enterpriseProviderName: product.defaultChatAgent?.enterpriseProviderName ?? '',
    providerUriSetting: product.defaultChatAgent?.providerUriSetting ?? '',
    providerScopes: product.defaultChatAgent?.providerScopes ?? [[]],
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    walkthroughCommand: product.defaultChatAgent?.walkthroughCommand ?? '',
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
};
//#region Contribution
const ToolsAgentWhen = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${ChatConfiguration.AgentEnabled}`, true), ChatContextKeys.Editing.agentModeDisallowed.negate(), ContextKeyExpr.not(`previewFeaturesDisabled`) // Set by extension
);
let SetupChatAgentImplementation = class SetupChatAgentImplementation extends Disposable {
    static { SetupChatAgentImplementation_1 = this; }
    static register(instantiationService, location, isToolsAgent, context, controller) {
        return instantiationService.invokeFunction(accessor => {
            const chatAgentService = accessor.get(IChatAgentService);
            let id;
            let description = localize('chatDescription', "Ask Copilot");
            let welcomeMessageContent;
            const baseMessage = localize('chatMessage', "Copilot is powered by AI, so mistakes are possible. Review output carefully before use.");
            switch (location) {
                case ChatAgentLocation.Panel:
                    id = 'setup.chat';
                    welcomeMessageContent = {
                        title: description,
                        message: new MarkdownString(baseMessage),
                        icon: Codicon.copilotLarge
                    };
                    break;
                case ChatAgentLocation.EditingSession:
                    id = isToolsAgent ? 'setup.agent' : 'setup.edits';
                    description = isToolsAgent ? localize('agentDescription', "Edit files in your workspace in agent mode") : localize('editsDescription', "Edit files in your workspace");
                    welcomeMessageContent = isToolsAgent ?
                        {
                            title: localize('editsTitle', "Edit with Copilot"),
                            message: new MarkdownString(localize('agentMessage', "Ask Copilot to edit your files in [agent mode]({0}). Copilot will automatically use multiple requests to pick files to edit, run terminal commands, and iterate on errors.", `https://aka.ms/vscode-copilot-agent`) + `\n\n${baseMessage}`),
                            icon: Codicon.copilotLarge
                        } :
                        {
                            title: localize('editsTitle', "Edit with Copilot"),
                            message: new MarkdownString(localize('editsMessage', "Start your editing session by defining a set of files that you want to work with. Then ask Copilot for the changes you want to make.") + `\n\n${baseMessage}`),
                            icon: Codicon.copilotLarge
                        };
                    break;
                case ChatAgentLocation.Terminal:
                    id = 'setup.terminal';
                    break;
                case ChatAgentLocation.Editor:
                    id = 'setup.editor';
                    break;
                case ChatAgentLocation.Notebook:
                    id = 'setup.notebook';
                    break;
            }
            const disposable = new DisposableStore();
            disposable.add(chatAgentService.registerAgent(id, {
                id,
                name: `${defaultChat.providerName} Copilot`,
                isDefault: true,
                isCore: true,
                isToolsAgent,
                when: isToolsAgent ? ToolsAgentWhen?.serialize() : undefined,
                slashCommands: [],
                disambiguation: [],
                locations: [location],
                metadata: {
                    welcomeMessageContent,
                    helpTextPrefix: SetupChatAgentImplementation_1.SETUP_NEEDED_MESSAGE
                },
                description,
                extensionId: nullExtensionDescription.identifier,
                extensionDisplayName: nullExtensionDescription.name,
                extensionPublisherId: nullExtensionDescription.publisher
            }));
            const agent = disposable.add(instantiationService.createInstance(SetupChatAgentImplementation_1, context, controller, location));
            disposable.add(chatAgentService.registerAgentImplementation(id, agent));
            return { agent, disposable };
        });
    }
    static { this.SETUP_NEEDED_MESSAGE = new MarkdownString(localize('settingUpCopilotNeeded', "You need to set up Copilot to use Chat.")); }
    constructor(context, controller, location, instantiationService, logService, configurationService, telemetryService) {
        super();
        this.context = context;
        this.controller = controller;
        this.location = location;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this._onUnresolvableError = this._register(new Emitter());
        this.onUnresolvableError = this._onUnresolvableError.event;
    }
    async invoke(request, progress) {
        return this.instantiationService.invokeFunction(async (accessor) => {
            const chatService = accessor.get(IChatService); // use accessor for lazy loading
            const languageModelsService = accessor.get(ILanguageModelsService); // of chat related services
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatAgentService = accessor.get(IChatAgentService);
            return this.doInvoke(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService);
        });
    }
    async doInvoke(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService) {
        if (!this.context.state.installed || this.context.state.entitlement === ChatEntitlement.Available || this.context.state.entitlement === ChatEntitlement.Unknown) {
            return this.doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService);
        }
        return this.doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService);
    }
    async doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService) {
        const requestModel = chatWidgetService.getWidgetBySessionId(request.sessionId)?.viewModel?.model.getRequests().at(-1);
        if (!requestModel) {
            this.logService.error('[chat setup] Request model not found, cannot redispatch request.');
            return {}; // this should not happen
        }
        progress({
            kind: 'progressMessage',
            content: new MarkdownString(localize('waitingCopilot', "Getting Copilot ready.")),
        });
        await this.forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService);
        return {};
    }
    async forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService) {
        if (this._handlingForwardedRequest === requestModel.message.text) {
            throw new Error('Already handling this request');
        }
        this._handlingForwardedRequest = requestModel.message.text;
        // We need a signal to know when we can resend the request to
        // Copilot. Waiting for the registration of the agent is not
        // enough, we also need a language model to be available.
        const whenLanguageModelReady = this.whenLanguageModelReady(languageModelsService);
        const whenAgentReady = this.whenAgentReady(chatAgentService);
        if (whenLanguageModelReady instanceof Promise || whenAgentReady instanceof Promise) {
            const timeoutHandle = setTimeout(() => {
                progress({
                    kind: 'progressMessage',
                    content: new MarkdownString(localize('waitingCopilot2', "Copilot is almost ready.")),
                });
            }, 10000);
            try {
                const ready = await Promise.race([
                    timeout(20000).then(() => 'timedout'),
                    Promise.allSettled([whenLanguageModelReady, whenAgentReady])
                ]);
                if (ready === 'timedout') {
                    progress({
                        kind: 'warning',
                        content: new MarkdownString(localize('copilotTookLongWarning', "Copilot took too long to get ready. Please try again."))
                    });
                    // This means Copilot is unhealthy and we cannot retry the
                    // request. Signal this to the outside via an event.
                    this._onUnresolvableError.fire();
                    return;
                }
            }
            finally {
                clearTimeout(timeoutHandle);
            }
        }
        const widget = chatWidgetService.getWidgetBySessionId(requestModel.session.sessionId);
        chatService.resendRequest(requestModel, {
            mode: widget?.input.currentMode,
            userSelectedModelId: widget?.input.currentLanguageModel,
        });
    }
    whenLanguageModelReady(languageModelsService) {
        for (const id of languageModelsService.getLanguageModelIds()) {
            const model = languageModelsService.lookupLanguageModel(id);
            if (model && model.isDefault) {
                return; // we have language models!
            }
        }
        return Event.toPromise(Event.filter(languageModelsService.onDidChangeLanguageModels, e => e.added?.some(added => added.metadata.isDefault) ?? false));
    }
    whenAgentReady(chatAgentService) {
        const defaultAgent = chatAgentService.getDefaultAgent(this.location);
        if (defaultAgent && !defaultAgent.isCore) {
            return; // we have a default agent from an extension!
        }
        return Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(this.location);
            return Boolean(defaultAgent && !defaultAgent.isCore);
        }));
    }
    async doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'chat' });
        const requestModel = chatWidgetService.getWidgetBySessionId(request.sessionId)?.viewModel?.model.getRequests().at(-1);
        const setupListener = Event.runAndSubscribe(this.controller.value.onDidChange, (() => {
            switch (this.controller.value.step) {
                case ChatSetupStep.SigningIn:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('setupChatSignIn2', "Signing in to {0}.", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.enterpriseProviderId ? defaultChat.enterpriseProviderName : defaultChat.providerName)),
                    });
                    break;
                case ChatSetupStep.Installing:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('installingCopilot', "Getting Copilot ready.")),
                    });
                    break;
            }
        }));
        let success = undefined;
        try {
            success = await ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run();
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
        }
        finally {
            setupListener.dispose();
        }
        // User has agreed to run the setup
        if (typeof success === 'boolean') {
            if (success) {
                if (requestModel) {
                    await this.forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService);
                }
            }
            else {
                progress({
                    kind: 'warning',
                    content: new MarkdownString(localize('copilotSetupError', "Copilot setup failed."))
                });
            }
        }
        // User has cancelled the setup
        else {
            progress({
                kind: 'markdownContent',
                content: SetupChatAgentImplementation_1.SETUP_NEEDED_MESSAGE,
            });
        }
        return {};
    }
};
SetupChatAgentImplementation = SetupChatAgentImplementation_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService)
], SetupChatAgentImplementation);
var ChatSetupStrategy;
(function (ChatSetupStrategy) {
    ChatSetupStrategy[ChatSetupStrategy["Canceled"] = 0] = "Canceled";
    ChatSetupStrategy[ChatSetupStrategy["DefaultSetup"] = 1] = "DefaultSetup";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithoutEnterpriseProvider"] = 2] = "SetupWithoutEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithEnterpriseProvider"] = 3] = "SetupWithEnterpriseProvider";
})(ChatSetupStrategy || (ChatSetupStrategy = {}));
let ChatSetup = class ChatSetup {
    static { ChatSetup_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService, context, controller) {
        let instance = ChatSetup_1.instance;
        if (!instance) {
            instance = ChatSetup_1.instance = instantiationService.invokeFunction(accessor => {
                return new ChatSetup_1(context, controller, instantiationService, accessor.get(ITelemetryService), accessor.get(IContextMenuService), accessor.get(IWorkbenchLayoutService), accessor.get(IKeybindingService), accessor.get(IChatEntitlementService), accessor.get(ILogService));
            });
        }
        return instance;
    }
    constructor(context, controller, instantiationService, telemetryService, contextMenuService, layoutService, keybindingService, chatEntitlementService, logService) {
        this.context = context;
        this.controller = controller;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.contextMenuService = contextMenuService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.chatEntitlementService = chatEntitlementService;
        this.logService = logService;
        this.pendingRun = undefined;
    }
    async run() {
        if (this.pendingRun) {
            return this.pendingRun;
        }
        this.pendingRun = this.doRun();
        try {
            return await this.pendingRun;
        }
        finally {
            this.pendingRun = undefined;
        }
    }
    async doRun() {
        let setupStrategy;
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Pro || this.chatEntitlementService.entitlement === ChatEntitlement.Limited) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // existing pro/free users setup without a dialog
        }
        else {
            setupStrategy = await this.showDialog();
        }
        let success = undefined;
        try {
            switch (setupStrategy) {
                case ChatSetupStrategy.SetupWithEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ setupFromDialog: true, useEnterpriseProvider: true });
                    break;
                case ChatSetupStrategy.SetupWithoutEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ setupFromDialog: true, useEnterpriseProvider: false });
                    break;
                case ChatSetupStrategy.DefaultSetup:
                    success = await this.controller.value.setup({ setupFromDialog: true });
                    break;
            }
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
            success = false;
        }
        return success;
    }
    async showDialog() {
        const disposables = new DisposableStore();
        let result = undefined;
        const buttons = [this.getPrimaryButton(), localize('maybeLater', "Maybe Later")];
        const dialog = disposables.add(new Dialog(this.layoutService.activeContainer, this.getDialogTitle(), buttons, createWorkbenchDialogOptions({
            type: 'none',
            icon: Codicon.copilotLarge,
            cancelId: buttons.length - 1,
            renderBody: body => body.appendChild(this.createDialog(disposables)),
            primaryButtonDropdown: {
                contextMenuProvider: this.contextMenuService,
                addPrimaryActionToDropdown: false,
                actions: [
                    toAction({ id: 'setupWithProvider', label: localize('setupWithProvider', "Sign in with a {0} Account", defaultChat.providerName), run: () => result = ChatSetupStrategy.SetupWithoutEnterpriseProvider }),
                    toAction({ id: 'setupWithEnterpriseProvider', label: localize('setupWithEnterpriseProvider', "Sign in with a {0} Account", defaultChat.enterpriseProviderName), run: () => result = ChatSetupStrategy.SetupWithEnterpriseProvider }),
                ]
            }
        }, this.keybindingService, this.layoutService)));
        const { button } = await dialog.show();
        disposables.dispose();
        return button === 0 ? result ?? ChatSetupStrategy.DefaultSetup : ChatSetupStrategy.Canceled;
    }
    getPrimaryButton() {
        if (this.context.state.entitlement === ChatEntitlement.Unknown) {
            return localize('signInButton', "Sign in");
        }
        return localize('useCopilotButton', "Use Copilot");
    }
    getDialogTitle() {
        if (this.context.state.entitlement === ChatEntitlement.Unknown) {
            return this.context.state.registered ? localize('signUp', "Sign in to use Copilot") : localize('signUpFree', "Sign in to use Copilot for free");
        }
        if (this.context.state.entitlement === ChatEntitlement.Pro) {
            return localize('copilotProTitle', "Start using Copilot Pro");
        }
        return this.context.state.registered ? localize('copilotTitle', "Start using Copilot") : localize('copilotFreeTitle', "Start using Copilot for free");
    }
    createDialog(disposables) {
        const element = $('.chat-setup-view');
        const markdown = this.instantiationService.createInstance(MarkdownRenderer, {});
        // Header
        const header = localize({ key: 'headerDialog', comment: ['{Locked="[Copilot]({0})"}'] }, "[Copilot]({0}) is your AI pair programmer. Write code faster with completions, fix bugs and build new features across multiple files, and learn about your codebase through chat.", defaultChat.documentationUrl);
        element.appendChild($('p.setup-header', undefined, disposables.add(markdown.render(new MarkdownString(header, { isTrusted: true }))).element));
        // Terms
        const terms = localize({ key: 'terms', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "By continuing, you agree to the [Terms]({0}) and [Privacy Policy]({1}).", defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        element.appendChild($('p.setup-legal', undefined, disposables.add(markdown.render(new MarkdownString(terms, { isTrusted: true }))).element));
        // SKU Settings
        if (this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */) {
            const settings = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "Copilot Free and Pro may show [public code]({0}) suggestions and we may use your data for product improvement. You can change these [settings]({1}) at any time.", defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
            element.appendChild($('p.setup-settings', undefined, disposables.add(markdown.render(new MarkdownString(settings, { isTrusted: true }))).element));
        }
        return element;
    }
};
ChatSetup = ChatSetup_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITelemetryService),
    __param(4, IContextMenuService),
    __param(5, ILayoutService),
    __param(6, IKeybindingService),
    __param(7, IChatEntitlementService),
    __param(8, ILogService)
], ChatSetup);
let ChatSetupContribution = class ChatSetupContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSetup'; }
    constructor(productService, instantiationService, commandService, telemetryService, chatEntitlementService, configurationService, logService) {
        super();
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.logService = logService;
        const context = chatEntitlementService.context?.value;
        const requests = chatEntitlementService.requests?.value;
        if (!context || !requests) {
            return; // disabled
        }
        const controller = new Lazy(() => this._register(this.instantiationService.createInstance(ChatSetupController, context, requests)));
        this.registerSetupAgents(context, controller);
        this.registerChatWelcome(context, controller);
        this.registerActions(context, requests, controller);
        this.registerUrlLinkHandler();
    }
    registerSetupAgents(context, controller) {
        const registration = markAsSingleton(new MutableDisposable()); // prevents flicker on window reload
        const updateRegistration = () => {
            const disabled = context.state.hidden || !this.configurationService.getValue('chat.setupFromDialog');
            if (!disabled && !registration.value) {
                const { agent: panelAgent, disposable: panelDisposable } = SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Panel, false, context, controller);
                registration.value = combinedDisposable(panelDisposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Terminal, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Notebook, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Editor, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.EditingSession, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.EditingSession, true, context, controller).disposable, panelAgent.onUnresolvableError(() => {
                    // An unresolvable error from our agent registrations means that
                    // Copilot is unhealthy for some reason. We clear our panel
                    // registration to give Copilot a chance to show a custom message
                    // to the user from the views and stop pretending as if there was
                    // a functional agent.
                    this.logService.error('[chat setup] Unresolvable error from Copilot agent registration, clearing registration.');
                    panelDisposable.dispose();
                }));
            }
            else if (disabled && registration.value) {
                registration.clear();
            }
        };
        this._register(Event.runAndSubscribe(Event.any(context.onDidChange, Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('chat.setupFromDialog'))), () => updateRegistration()));
    }
    registerChatWelcome(context, controller) {
        Registry.as("workbench.registry.chat.viewsWelcome" /* ChatViewsWelcomeExtensions.ChatViewsWelcomeRegistry */).register({
            title: localize('welcomeChat', "Welcome to Copilot"),
            when: ChatContextKeys.SetupViewCondition,
            icon: Codicon.copilotLarge,
            content: disposables => disposables.add(this.instantiationService.createInstance(ChatSetupWelcomeContent, controller.value, context)).element,
        });
    }
    registerActions(context, requests, controller) {
        const chatSetupTriggerContext = ContextKeyExpr.or(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp);
        const CHAT_SETUP_ACTION_LABEL = localize2('triggerChatSetup', "Use AI Features with Copilot for free...");
        class ChatSetupTriggerAction extends Action2 {
            constructor() {
                super({
                    id: CHAT_SETUP_ACTION_ID,
                    title: CHAT_SETUP_ACTION_LABEL,
                    category: CHAT_CATEGORY,
                    f1: true,
                    precondition: chatSetupTriggerContext,
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_last',
                        order: 1,
                        when: ContextKeyExpr.and(chatSetupTriggerContext, ContextKeyExpr.or(ChatContextKeys.Setup.fromDialog.negate(), // reduce noise when using the skeleton-view approach
                        ChatContextKeys.Setup.hidden // but enforce it if copilot is hidden
                        ))
                    }
                });
            }
            async run(accessor, mode) {
                const viewsService = accessor.get(IViewsService);
                const viewDescriptorService = accessor.get(IViewDescriptorService);
                const configurationService = accessor.get(IConfigurationService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const statusbarService = accessor.get(IStatusbarService);
                const instantiationService = accessor.get(IInstantiationService);
                const dialogService = accessor.get(IDialogService);
                const commandService = accessor.get(ICommandService);
                const lifecycleService = accessor.get(ILifecycleService);
                await context.update({ hidden: false });
                const chatWidgetPromise = showCopilotView(viewsService, layoutService);
                if (mode) {
                    const chatWidget = await chatWidgetPromise;
                    chatWidget?.input.setChatMode(mode);
                }
                const setupFromDialog = configurationService.getValue('chat.setupFromDialog');
                if (!setupFromDialog) {
                    ensureSideBarChatViewSize(viewDescriptorService, layoutService, viewsService);
                }
                statusbarService.updateEntryVisibility('chat.statusBarEntry', true);
                configurationService.updateValue('chat.commandCenter.enabled', true);
                if (setupFromDialog) {
                    const setup = ChatSetup.getInstance(instantiationService, context, controller);
                    const result = await setup.run();
                    if (result === false && !lifecycleService.willShutdown) {
                        const { confirmed } = await dialogService.confirm({
                            type: Severity.Error,
                            message: localize('setupErrorDialog', "Copilot setup failed. Would you like to try again?"),
                            primaryButton: localize('retry', "Retry"),
                        });
                        if (confirmed) {
                            commandService.executeCommand(CHAT_SETUP_ACTION_ID);
                        }
                    }
                }
            }
        }
        class ChatSetupHideAction extends Action2 {
            static { this.ID = 'workbench.action.chat.hideSetup'; }
            static { this.TITLE = localize2('hideChatSetup', "Hide Copilot"); }
            constructor() {
                super({
                    id: ChatSetupHideAction.ID,
                    title: ChatSetupHideAction.TITLE,
                    f1: true,
                    category: CHAT_CATEGORY,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Setup.hidden.negate()),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'z_hide',
                        order: 1,
                        when: ChatContextKeys.Setup.installed.negate()
                    }
                });
            }
            async run(accessor) {
                const viewsDescriptorService = accessor.get(IViewDescriptorService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const configurationService = accessor.get(IConfigurationService);
                const dialogService = accessor.get(IDialogService);
                const statusbarService = accessor.get(IStatusbarService);
                const { confirmed } = await dialogService.confirm({
                    message: localize('hideChatSetupConfirm', "Are you sure you want to hide Copilot?"),
                    detail: localize('hideChatSetupDetail', "You can restore Copilot by running the '{0}' command.", CHAT_SETUP_ACTION_LABEL.value),
                    primaryButton: localize('hideChatSetupButton', "Hide Copilot")
                });
                if (!confirmed) {
                    return;
                }
                const location = viewsDescriptorService.getViewLocationById(ChatViewId);
                await context.update({ hidden: true });
                if (location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                    const activeContainers = viewsDescriptorService.getViewContainersByLocation(location).filter(container => viewsDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);
                    if (activeContainers.length === 0) {
                        layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */); // hide if there are no views in the secondary sidebar
                    }
                }
                statusbarService.updateEntryVisibility('chat.statusBarEntry', false);
                configurationService.updateValue('chat.commandCenter.enabled', false);
            }
        }
        const windowFocusListener = this._register(new MutableDisposable());
        class UpgradePlanAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.upgradePlan',
                    title: localize2('managePlan', "Upgrade to Copilot Pro"),
                    category: localize2('chat.category', 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.or(ChatContextKeys.Entitlement.canSignUp, ChatContextKeys.Entitlement.limited),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded)
                    }
                });
            }
            async run(accessor, from) {
                const openerService = accessor.get(IOpenerService);
                const hostService = accessor.get(IHostService);
                const commandService = accessor.get(ICommandService);
                openerService.open(URI.parse(defaultChat.upgradePlanUrl));
                const entitlement = context.state.entitlement;
                if (entitlement !== ChatEntitlement.Pro) {
                    // If the user is not yet Pro, we listen to window focus to refresh the token
                    // when the user has come back to the window assuming the user signed up.
                    windowFocusListener.value = hostService.onDidChangeFocus(focus => this.onWindowFocus(focus, commandService));
                }
            }
            async onWindowFocus(focus, commandService) {
                if (focus) {
                    windowFocusListener.clear();
                    const entitlements = await requests.forceResolveEntitlement(undefined);
                    if (entitlements?.entitlement === ChatEntitlement.Pro) {
                        refreshTokens(commandService);
                    }
                }
            }
        }
        registerAction2(ChatSetupTriggerAction);
        registerAction2(ChatSetupHideAction);
        registerAction2(UpgradePlanAction);
    }
    registerUrlLinkHandler() {
        this._register(ExtensionUrlHandlerOverrideRegistry.registerHandler({
            canHandleURL: url => {
                return url.scheme === this.productService.urlProtocol && equalsIgnoreCase(url.authority, defaultChat.chatExtensionId);
            },
            handleURL: async (url) => {
                const params = new URLSearchParams(url.query);
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'url', detail: params.get('referrer') ?? undefined });
                await this.commandService.executeCommand(CHAT_SETUP_ACTION_ID, validateChatMode(params.get('mode')));
                return true;
            }
        }));
    }
};
ChatSetupContribution = __decorate([
    __param(0, IProductService),
    __param(1, IInstantiationService),
    __param(2, ICommandService),
    __param(3, ITelemetryService),
    __param(4, IChatEntitlementService),
    __param(5, IConfigurationService),
    __param(6, ILogService)
], ChatSetupContribution);
export { ChatSetupContribution };
var ChatSetupStep;
(function (ChatSetupStep) {
    ChatSetupStep[ChatSetupStep["Initial"] = 1] = "Initial";
    ChatSetupStep[ChatSetupStep["SigningIn"] = 2] = "SigningIn";
    ChatSetupStep[ChatSetupStep["Installing"] = 3] = "Installing";
})(ChatSetupStep || (ChatSetupStep = {}));
let ChatSetupController = class ChatSetupController extends Disposable {
    get step() { return this._step; }
    constructor(context, requests, telemetryService, authenticationService, viewsService, extensionsWorkbenchService, productService, logService, progressService, chatAgentService, activityService, commandService, layoutService, workspaceTrustRequestService, dialogService, configurationService, lifecycleService, quickInputService) {
        super();
        this.context = context;
        this.requests = requests;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.viewsService = viewsService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.productService = productService;
        this.logService = logService;
        this.progressService = progressService;
        this.chatAgentService = chatAgentService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.layoutService = layoutService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.lifecycleService = lifecycleService;
        this.quickInputService = quickInputService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._step = ChatSetupStep.Initial;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.context.onDidChange(() => this._onDidChange.fire()));
    }
    setStep(step) {
        if (this._step === step) {
            return;
        }
        this._step = step;
        this._onDidChange.fire();
    }
    async setup(options) {
        const watch = new StopWatch(false);
        const title = localize('setupChatProgress', "Getting Copilot ready...");
        const badge = this.activityService.showViewContainerActivity(preferCopilotEditsView(this.viewsService) ? CHAT_EDITING_SIDEBAR_PANEL_ID : CHAT_SIDEBAR_PANEL_ID, {
            badge: new ProgressBadge(() => title),
        });
        try {
            return await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                command: CHAT_OPEN_ACTION_ID,
                title,
            }, () => this.doSetup(options ?? {}, watch));
        }
        finally {
            badge.dispose();
        }
    }
    async doSetup(options, watch) {
        this.context.suspend(); // reduces flicker
        let focusChatInput = false;
        let success = false;
        try {
            const providerId = ChatEntitlementRequests.providerId(this.configurationService);
            let session;
            let entitlement;
            // Entitlement Unknown or `forceSignIn`: we need to sign-in user
            if (this.context.state.entitlement === ChatEntitlement.Unknown || options.forceSignIn) {
                this.setStep(ChatSetupStep.SigningIn);
                const result = await this.signIn(providerId, options);
                if (!result.session) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotSignedIn', installDuration: watch.elapsed(), signUpErrorCode: undefined, setupFromDialog: Boolean(options.setupFromDialog) });
                    return false;
                }
                session = result.session;
                entitlement = result.entitlement;
            }
            const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
                message: localize('copilotWorkspaceTrust', "Copilot is currently only supported in trusted workspaces.")
            });
            if (!trusted) {
                this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotTrusted', installDuration: watch.elapsed(), signUpErrorCode: undefined, setupFromDialog: Boolean(options.setupFromDialog) });
                return false;
            }
            const activeElement = getActiveElement();
            // Install
            this.setStep(ChatSetupStep.Installing);
            success = await this.install(session, entitlement ?? this.context.state.entitlement, providerId, options, watch);
            const currentActiveElement = getActiveElement();
            focusChatInput = activeElement === currentActiveElement || currentActiveElement === mainWindow.document.body;
        }
        finally {
            this.setStep(ChatSetupStep.Initial);
            this.context.resume();
        }
        if (focusChatInput && !options.setupFromDialog) {
            (await showCopilotView(this.viewsService, this.layoutService))?.focusInput();
        }
        return success;
    }
    async signIn(providerId, options) {
        let session;
        let entitlements;
        try {
            if (!options?.setupFromDialog) {
                showCopilotView(this.viewsService, this.layoutService);
            }
            ({ session, entitlements } = await this.requests.signIn());
        }
        catch (e) {
            this.logService.error(`[chat setup] signIn: error ${e}`);
        }
        if (!session && !this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignInError', "Failed to sign in to {0}. Would you like to try again?", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.enterpriseProviderId ? defaultChat.enterpriseProviderName : defaultChat.providerName),
                detail: localize('unknownSignInErrorDetail', "You must be signed in to use Copilot."),
                primaryButton: localize('retry', "Retry")
            });
            if (confirmed) {
                return this.signIn(providerId, options);
            }
        }
        return { session, entitlement: entitlements?.entitlement };
    }
    async install(session, entitlement, providerId, options, watch) {
        const wasInstalled = this.context.state.installed;
        let signUpResult = undefined;
        try {
            if (!options?.setupFromDialog) {
                showCopilotView(this.viewsService, this.layoutService);
            }
            if (entitlement !== ChatEntitlement.Limited && // User is not signed up to Copilot Free
                entitlement !== ChatEntitlement.Pro && // User is not signed up to Copilot Pro
                entitlement !== ChatEntitlement.Unavailable // User is eligible for Copilot Free
            ) {
                if (!session) {
                    try {
                        session = (await this.authenticationService.getSessions(providerId)).at(0);
                    }
                    catch (error) {
                        // ignore - errors can throw if a provider is not registered
                    }
                    if (!session) {
                        this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNoSession', installDuration: watch.elapsed(), signUpErrorCode: undefined, setupFromDialog: Boolean(options.setupFromDialog) });
                        return false; // unexpected
                    }
                }
                signUpResult = await this.requests.signUpLimited(session);
                if (typeof signUpResult !== 'boolean' /* error */) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedSignUp', installDuration: watch.elapsed(), signUpErrorCode: signUpResult.errorCode, setupFromDialog: Boolean(options.setupFromDialog) });
                }
            }
            await this.doInstall();
        }
        catch (error) {
            this.logService.error(`[chat setup] install: error ${error}`);
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: isCancellationError(error) ? 'cancelled' : 'failedInstall', installDuration: watch.elapsed(), signUpErrorCode: undefined, setupFromDialog: Boolean(options.setupFromDialog) });
            return false;
        }
        this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: wasInstalled ? 'alreadyInstalled' : 'installed', installDuration: watch.elapsed(), signUpErrorCode: undefined, setupFromDialog: Boolean(options.setupFromDialog) });
        if (wasInstalled && signUpResult === true) {
            refreshTokens(this.commandService);
        }
        if (!options?.setupFromDialog) {
            await Promise.race([
                timeout(5000), // helps prevent flicker with sign-in welcome view
                Event.toPromise(this.chatAgentService.onDidChangeAgents) // https://github.com/microsoft/vscode-copilot/issues/9274
            ]);
        }
        return true;
    }
    async doInstall() {
        let error;
        try {
            await this.extensionsWorkbenchService.install(defaultChat.extensionId, {
                enable: true,
                isApplicationScoped: true, // install into all profiles
                isMachineScoped: false, // do not ask to sync
                installEverywhere: true, // install in local and remote
                installPreReleaseVersion: this.productService.quality !== 'stable'
            }, preferCopilotEditsView(this.viewsService) ? EditsViewId : ChatViewId);
        }
        catch (e) {
            this.logService.error(`[chat setup] install: error ${error}`);
            error = e;
        }
        if (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: localize('unknownSetupError', "An error occurred while setting up Copilot. Would you like to try again?"),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: localize('retry', "Retry")
                });
                if (confirmed) {
                    return this.doInstall();
                }
            }
            throw error;
        }
    }
    async setupWithProvider(options) {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            'id': 'copilot.setup',
            'type': 'object',
            'properties': {
                [defaultChat.completionsAdvancedSetting]: {
                    'type': 'object',
                    'properties': {
                        'authProvider': {
                            'type': 'string'
                        }
                    }
                },
                [defaultChat.providerUriSetting]: {
                    'type': 'string'
                }
            }
        });
        if (options.useEnterpriseProvider) {
            const success = await this.handleEnterpriseInstance();
            if (!success) {
                return false; // not properly configured, abort
            }
        }
        let existingAdvancedSetting = this.configurationService.inspect(defaultChat.completionsAdvancedSetting).user?.value;
        if (!isObject(existingAdvancedSetting)) {
            existingAdvancedSetting = {};
        }
        if (options.useEnterpriseProvider) {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, {
                ...existingAdvancedSetting,
                'authProvider': defaultChat.enterpriseProviderId
            }, 2 /* ConfigurationTarget.USER */);
        }
        else {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, Object.keys(existingAdvancedSetting).length > 0 ? {
                ...existingAdvancedSetting,
                'authProvider': undefined
            } : undefined, 2 /* ConfigurationTarget.USER */);
            await this.configurationService.updateValue(defaultChat.providerUriSetting, undefined, 2 /* ConfigurationTarget.USER */);
        }
        return this.setup({ ...options, forceSignIn: true });
    }
    async handleEnterpriseInstance() {
        const domainRegEx = /^[a-zA-Z\-_]+$/;
        const fullUriRegEx = /^(https:\/\/)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.ghe\.com\/?$/;
        const uri = this.configurationService.getValue(defaultChat.providerUriSetting);
        if (typeof uri === 'string' && fullUriRegEx.test(uri)) {
            return true; // already setup with a valid URI
        }
        let isSingleWord = false;
        const result = await this.quickInputService.input({
            prompt: localize('enterpriseInstance', "What is your {0} instance?", defaultChat.enterpriseProviderName),
            placeHolder: localize('enterpriseInstancePlaceholder', 'i.e. "octocat" or "https://octocat.ghe.com"...'),
            ignoreFocusLost: true,
            value: uri,
            validateInput: async (value) => {
                isSingleWord = false;
                if (!value) {
                    return undefined;
                }
                if (domainRegEx.test(value)) {
                    isSingleWord = true;
                    return {
                        content: localize('willResolveTo', "Will resolve to {0}", `https://${value}.ghe.com`),
                        severity: Severity.Info
                    };
                }
                if (!fullUriRegEx.test(value)) {
                    return {
                        content: localize('invalidEnterpriseInstance', 'You must enter a valid {0} instance (i.e. "octocat" or "https://octocat.ghe.com")', defaultChat.enterpriseProviderName),
                        severity: Severity.Error
                    };
                }
                return undefined;
            }
        });
        if (!result) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('enterpriseSetupError', "The provided {0} instance is invalid. Would you like to enter it again?", defaultChat.enterpriseProviderName),
                primaryButton: localize('retry', "Retry")
            });
            if (confirmed) {
                return this.handleEnterpriseInstance();
            }
            return false;
        }
        let resolvedUri = result;
        if (isSingleWord) {
            resolvedUri = `https://${resolvedUri}.ghe.com`;
        }
        else {
            const normalizedUri = result.toLowerCase();
            const hasHttps = normalizedUri.startsWith('https://');
            if (!hasHttps) {
                resolvedUri = `https://${result}`;
            }
        }
        await this.configurationService.updateValue(defaultChat.providerUriSetting, resolvedUri, 2 /* ConfigurationTarget.USER */);
        return true;
    }
};
ChatSetupController = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, IViewsService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IProductService),
    __param(7, ILogService),
    __param(8, IProgressService),
    __param(9, IChatAgentService),
    __param(10, IActivityService),
    __param(11, ICommandService),
    __param(12, IWorkbenchLayoutService),
    __param(13, IWorkspaceTrustRequestService),
    __param(14, IDialogService),
    __param(15, IConfigurationService),
    __param(16, ILifecycleService),
    __param(17, IQuickInputService)
], ChatSetupController);
//#endregion
//#region Setup View Welcome
let ChatSetupWelcomeContent = class ChatSetupWelcomeContent extends Disposable {
    constructor(controller, context, instantiationService, contextMenuService, configurationService, telemetryService) {
        super();
        this.controller = controller;
        this.context = context;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.element = $('.chat-setup-view');
        this.create();
    }
    create() {
        const markdown = this.instantiationService.createInstance(MarkdownRenderer, {});
        // Header
        {
            const header = localize({ key: 'header', comment: ['{Locked="[Copilot]({0})"}'] }, "[Copilot]({0}) is your AI pair programmer.", this.context.state.installed ? `command:${defaultChat.walkthroughCommand}` : defaultChat.documentationUrl);
            this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(header, { isTrusted: true }))).element));
            this.element.appendChild($('div.chat-features-container', undefined, $('div', undefined, $('div.chat-feature-container', undefined, renderIcon(Codicon.code), $('span', undefined, localize('featureChat', "Code faster with Completions"))), $('div.chat-feature-container', undefined, renderIcon(Codicon.editSession), $('span', undefined, localize('featureEdits', "Build features with Copilot Edits"))), $('div.chat-feature-container', undefined, renderIcon(Codicon.commentDiscussion), $('span', undefined, localize('featureExplore', "Explore your codebase with Chat"))))));
        }
        // Limited SKU
        const free = localize({ key: 'free', comment: ['{Locked="[]({0})"}'] }, "$(sparkle-filled) We now offer [Copilot for free]({0}).", defaultChat.skusDocumentationUrl);
        const freeContainer = this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(free, { isTrusted: true, supportThemeIcons: true }))).element));
        // Setup Button
        const buttonContainer = this.element.appendChild($('p'));
        buttonContainer.classList.add('button-container');
        const button = this._register(new ButtonWithDropdown(buttonContainer, {
            actions: [
                toAction({ id: 'chatSetup.setupWithProvider', label: localize('setupWithProvider', "Sign in with a {0} Account", defaultChat.providerName), run: () => this.controller.setupWithProvider({ useEnterpriseProvider: false }) }),
                toAction({ id: 'chatSetup.setupWithEnterpriseProvider', label: localize('setupWithEnterpriseProvider', "Sign in with a {0} Account", defaultChat.enterpriseProviderName), run: () => this.controller.setupWithProvider({ useEnterpriseProvider: true }) })
            ],
            addPrimaryActionToDropdown: false,
            contextMenuProvider: this.contextMenuService,
            supportIcons: true,
            ...defaultButtonStyles
        }));
        this._register(button.onDidClick(() => this.controller.setup()));
        // Terms
        const terms = localize({ key: 'terms', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "By continuing, you agree to the [Terms]({0}) and [Privacy Policy]({1}).", defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(terms, { isTrusted: true }))).element));
        // SKU Settings
        const settings = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "Copilot Free and Pro may show [public code]({0}) suggestions and we may use your data for product improvement. You can change these [settings]({1}) at any time.", defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
        const settingsContainer = this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(settings, { isTrusted: true }))).element));
        // Update based on model state
        this._register(Event.runAndSubscribe(this.controller.onDidChange, () => this.update(freeContainer, settingsContainer, button)));
    }
    update(freeContainer, settingsContainer, button) {
        const showSettings = this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */;
        let showFree;
        let buttonLabel;
        switch (this.context.state.entitlement) {
            case ChatEntitlement.Unknown:
                showFree = true;
                buttonLabel = this.context.state.registered ? localize('signUp', "Sign in to use Copilot") : localize('signUpFree', "Sign in to use Copilot for free");
                break;
            case ChatEntitlement.Unresolved:
                showFree = true;
                buttonLabel = this.context.state.registered ? localize('startUp', "Use Copilot") : localize('startUpLimited', "Use Copilot for free");
                break;
            case ChatEntitlement.Available:
            case ChatEntitlement.Limited:
                showFree = true;
                buttonLabel = localize('startUpLimited', "Use Copilot for free");
                break;
            case ChatEntitlement.Pro:
            case ChatEntitlement.Unavailable:
                showFree = false;
                buttonLabel = localize('startUp', "Use Copilot");
                break;
        }
        switch (this.controller.step) {
            case ChatSetupStep.SigningIn:
                buttonLabel = localize('setupChatSignIn', "$(loading~spin) Signing in to {0}...", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.enterpriseProviderId ? defaultChat.enterpriseProviderName : defaultChat.providerName);
                break;
            case ChatSetupStep.Installing:
                buttonLabel = localize('setupChatInstalling', "$(loading~spin) Getting Copilot Ready...");
                break;
        }
        setVisibility(showFree, freeContainer);
        setVisibility(showSettings, settingsContainer);
        button.label = buttonLabel;
        button.enabled = this.controller.step === ChatSetupStep.Initial;
    }
};
ChatSetupWelcomeContent = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, ITelemetryService)
], ChatSetupWelcomeContent);
//#endregion
function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2V0dXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyxFQUFFLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQXVFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hKLE9BQU8sUUFB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