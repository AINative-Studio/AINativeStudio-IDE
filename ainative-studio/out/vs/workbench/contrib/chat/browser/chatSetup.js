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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBdUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuSSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEosT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxVQUFVLElBQUksdUJBQXVCLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDbkosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sa0RBQWtELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxvREFBb0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUV4RyxPQUFPLEVBQUUsc0JBQXNCLEVBQXlCLE1BQU0sMEJBQTBCLENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hHLE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMxSCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sRUFBaUUsaUJBQWlCLEVBQThCLE1BQU0seUJBQXlCLENBQUM7QUFDdkosT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQTBCLHVCQUF1QixFQUEwQix1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hLLE9BQU8sRUFBaUIsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM1SSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQVksZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRzlGLE1BQU0sV0FBVyxHQUFHO0lBQ25CLFdBQVcsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxJQUFJLEVBQUU7SUFDeEQsZUFBZSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLElBQUksRUFBRTtJQUNoRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLElBQUksRUFBRTtJQUNsRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLElBQUksRUFBRTtJQUNwRSxtQkFBbUIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLElBQUksRUFBRTtJQUN4RSxvQkFBb0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLElBQUksRUFBRTtJQUMxRSxvQkFBb0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLElBQUksRUFBRTtJQUMxRSxjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxFQUFFO0lBQzlELFlBQVksRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxJQUFJLEVBQUU7SUFDMUQsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixJQUFJLEVBQUU7SUFDMUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixJQUFJLEVBQUU7SUFDOUUsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixJQUFJLEVBQUU7SUFDdEUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDaEUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixJQUFJLEVBQUU7SUFDcEUsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLDBCQUEwQixJQUFJLEVBQUU7SUFDdEYsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixJQUFJLEVBQUU7SUFDdEUsOEJBQThCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLDhCQUE4QixJQUFJLEVBQUU7SUFDOUYsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixJQUFJLEVBQUU7Q0FDaEYsQ0FBQztBQUVGLHNCQUFzQjtBQUV0QixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUN4QyxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsaUJBQWlCLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQ3ZFLGVBQWUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLEVBQ3BELGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxtQkFBbUI7Q0FDakUsQ0FBQztBQUVGLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTs7SUFFcEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBMkMsRUFBRSxRQUEyQixFQUFFLFlBQXFCLEVBQUUsT0FBK0IsRUFBRSxVQUFxQztRQUN0TCxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV6RCxJQUFJLEVBQVUsQ0FBQztZQUNmLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3RCxJQUFJLHFCQUE2RCxDQUFDO1lBQ2xFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUseUZBQXlGLENBQUMsQ0FBQztZQUN2SSxRQUFRLFFBQVEsRUFBRSxDQUFDO2dCQUNsQixLQUFLLGlCQUFpQixDQUFDLEtBQUs7b0JBQzNCLEVBQUUsR0FBRyxZQUFZLENBQUM7b0JBQ2xCLHFCQUFxQixHQUFHO3dCQUN2QixLQUFLLEVBQUUsV0FBVzt3QkFDbEIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQzt3QkFDeEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO3FCQUMxQixDQUFDO29CQUNGLE1BQU07Z0JBQ1AsS0FBSyxpQkFBaUIsQ0FBQyxjQUFjO29CQUNwQyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztvQkFDbEQsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDRDQUE0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO29CQUN2SyxxQkFBcUIsR0FBRyxZQUFZLENBQUMsQ0FBQzt3QkFDckM7NEJBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUM7NEJBQ2xELE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLDRLQUE0SyxFQUFFLHFDQUFxQyxDQUFDLEdBQUcsT0FBTyxXQUFXLEVBQUUsQ0FBQzs0QkFDalMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO3lCQUMxQixDQUFDLENBQUM7d0JBQ0g7NEJBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUM7NEJBQ2xELE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLHNJQUFzSSxDQUFDLEdBQUcsT0FBTyxXQUFXLEVBQUUsQ0FBQzs0QkFDcE4sSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO3lCQUMxQixDQUFDO29CQUNILE1BQU07Z0JBQ1AsS0FBSyxpQkFBaUIsQ0FBQyxRQUFRO29CQUM5QixFQUFFLEdBQUcsZ0JBQWdCLENBQUM7b0JBQ3RCLE1BQU07Z0JBQ1AsS0FBSyxpQkFBaUIsQ0FBQyxNQUFNO29CQUM1QixFQUFFLEdBQUcsY0FBYyxDQUFDO29CQUNwQixNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsUUFBUTtvQkFDOUIsRUFBRSxHQUFHLGdCQUFnQixDQUFDO29CQUN0QixNQUFNO1lBQ1IsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFFekMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFO2dCQUNqRCxFQUFFO2dCQUNGLElBQUksRUFBRSxHQUFHLFdBQVcsQ0FBQyxZQUFZLFVBQVU7Z0JBQzNDLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFlBQVk7Z0JBQ1osSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUM1RCxhQUFhLEVBQUUsRUFBRTtnQkFDakIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDckIsUUFBUSxFQUFFO29CQUNULHFCQUFxQjtvQkFDckIsY0FBYyxFQUFFLDhCQUE0QixDQUFDLG9CQUFvQjtpQkFDakU7Z0JBQ0QsV0FBVztnQkFDWCxXQUFXLEVBQUUsd0JBQXdCLENBQUMsVUFBVTtnQkFDaEQsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUMsSUFBSTtnQkFDbkQsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUMsU0FBUzthQUN4RCxDQUFDLENBQUMsQ0FBQztZQUVKLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDhCQUE0QixFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMvSCxVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRXhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO2FBRXVCLHlCQUFvQixHQUFHLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDLEFBQXBHLENBQXFHO0lBS2pKLFlBQ2tCLE9BQStCLEVBQy9CLFVBQXFDLEVBQ3JDLFFBQTJCLEVBQ3JCLG9CQUE0RCxFQUN0RSxVQUF3QyxFQUM5QixvQkFBNEQsRUFDaEUsZ0JBQW9EO1FBRXZFLEtBQUssRUFBRSxDQUFDO1FBUlMsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFDL0IsZUFBVSxHQUFWLFVBQVUsQ0FBMkI7UUFDckMsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDSix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQWE7UUFDYix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFWdkQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDbkUsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQztJQVkvRCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUEwQixFQUFFLFFBQXVDO1FBQy9FLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUMsUUFBUSxFQUFDLEVBQUU7WUFDaEUsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFNLGdDQUFnQztZQUNyRixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLDJCQUEyQjtZQUMvRixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUMzRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV6RCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNsSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQTBCLEVBQUUsUUFBdUMsRUFBRSxXQUF5QixFQUFFLHFCQUE2QyxFQUFFLGlCQUFxQyxFQUFFLGdCQUFtQztRQUMvTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakssT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMzSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUM5SCxDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQTBCLEVBQUUsUUFBdUMsRUFBRSxXQUF5QixFQUFFLHFCQUE2QyxFQUFFLGlCQUFxQyxFQUFFLGdCQUFtQztRQUMzUCxNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0SCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsa0VBQWtFLENBQUMsQ0FBQztZQUMxRixPQUFPLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QjtRQUNyQyxDQUFDO1FBRUQsUUFBUSxDQUFDO1lBQ1IsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHdCQUF3QixDQUFDLENBQUM7U0FDakYsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVwSSxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFHTyxLQUFLLENBQUMsdUJBQXVCLENBQUMsWUFBK0IsRUFBRSxRQUF1QyxFQUFFLFdBQXlCLEVBQUUscUJBQTZDLEVBQUUsZ0JBQW1DLEVBQUUsaUJBQXFDO1FBRW5RLElBQUksSUFBSSxDQUFDLHlCQUF5QixLQUFLLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFJLENBQUMseUJBQXlCLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFFM0QsNkRBQTZEO1FBQzdELDREQUE0RDtRQUM1RCx5REFBeUQ7UUFFekQsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNsRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFN0QsSUFBSSxzQkFBc0IsWUFBWSxPQUFPLElBQUksY0FBYyxZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQ3BGLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3JDLFFBQVEsQ0FBQztvQkFDUixJQUFJLEVBQUUsaUJBQWlCO29CQUN2QixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLDBCQUEwQixDQUFDLENBQUM7aUJBQ3BGLENBQUMsQ0FBQztZQUNKLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVWLElBQUksQ0FBQztnQkFDSixNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ2hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDO29CQUNyQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBQzVELENBQUMsQ0FBQztnQkFFSCxJQUFJLEtBQUssS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDMUIsUUFBUSxDQUFDO3dCQUNSLElBQUksRUFBRSxTQUFTO3dCQUNmLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsdURBQXVELENBQUMsQ0FBQztxQkFDeEgsQ0FBQyxDQUFDO29CQUVILDBEQUEwRDtvQkFDMUQsb0RBQW9EO29CQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2pDLE9BQU87Z0JBQ1IsQ0FBQztZQUNGLENBQUM7b0JBQVMsQ0FBQztnQkFDVixZQUFZLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0IsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLFdBQVcsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFO1lBQ3ZDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDL0IsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxvQkFBb0I7U0FDdkQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLHNCQUFzQixDQUFDLHFCQUE2QztRQUMzRSxLQUFLLE1BQU0sRUFBRSxJQUFJLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUM5RCxNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1RCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzlCLE9BQU8sQ0FBQywyQkFBMkI7WUFDcEMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3ZKLENBQUM7SUFFTyxjQUFjLENBQUMsZ0JBQW1DO1FBQ3pELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckUsSUFBSSxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLDZDQUE2QztRQUN0RCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1lBQzVFLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckUsT0FBTyxPQUFPLENBQUMsWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQTBCLEVBQUUsUUFBdUMsRUFBRSxXQUF5QixFQUFFLHFCQUE2QyxFQUFFLGlCQUFxQyxFQUFFLGdCQUFtQztRQUN4UCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFzRSx5QkFBeUIsRUFBRSxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUU3SyxNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0SCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRTtZQUNwRixRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwQyxLQUFLLGFBQWEsQ0FBQyxTQUFTO29CQUMzQixRQUFRLENBQUM7d0JBQ1IsSUFBSSxFQUFFLGlCQUFpQjt3QkFDdkIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztxQkFDblAsQ0FBQyxDQUFDO29CQUNILE1BQU07Z0JBQ1AsS0FBSyxhQUFhLENBQUMsVUFBVTtvQkFDNUIsUUFBUSxDQUFDO3dCQUNSLElBQUksRUFBRSxpQkFBaUI7d0JBQ3ZCLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztxQkFDcEYsQ0FBQyxDQUFDO29CQUNILE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN4QixJQUFJLENBQUM7WUFDSixPQUFPLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2RyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixDQUFDO2dCQUFTLENBQUM7WUFDVixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekIsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLE9BQU8sT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDckksQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLENBQUM7b0JBQ1IsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO2lCQUNuRixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUVELCtCQUErQjthQUMxQixDQUFDO1lBQ0wsUUFBUSxDQUFDO2dCQUNSLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLE9BQU8sRUFBRSw4QkFBNEIsQ0FBQyxvQkFBb0I7YUFDMUQsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQzs7QUFqUUksNEJBQTRCO0lBbUYvQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0dBdEZkLDRCQUE0QixDQWtRakM7QUFFRCxJQUFLLGlCQUtKO0FBTEQsV0FBSyxpQkFBaUI7SUFDckIsaUVBQVksQ0FBQTtJQUNaLHlFQUFnQixDQUFBO0lBQ2hCLDZHQUFrQyxDQUFBO0lBQ2xDLHVHQUErQixDQUFBO0FBQ2hDLENBQUMsRUFMSSxpQkFBaUIsS0FBakIsaUJBQWlCLFFBS3JCO0FBRUQsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFTOzthQUVDLGFBQVEsR0FBMEIsU0FBUyxBQUFuQyxDQUFvQztJQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUEyQyxFQUFFLE9BQStCLEVBQUUsVUFBcUM7UUFDckksSUFBSSxRQUFRLEdBQUcsV0FBUyxDQUFDLFFBQVEsQ0FBQztRQUNsQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixRQUFRLEdBQUcsV0FBUyxDQUFDLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzlFLE9BQU8sSUFBSSxXQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNoUixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBSUQsWUFDa0IsT0FBK0IsRUFDL0IsVUFBcUMsRUFDL0Isb0JBQTRELEVBQ2hFLGdCQUFvRCxFQUNsRCxrQkFBd0QsRUFDN0QsYUFBdUQsRUFDbkQsaUJBQXNELEVBQ2pELHNCQUFnRSxFQUM1RSxVQUF3QztRQVJwQyxZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixlQUFVLEdBQVYsVUFBVSxDQUEyQjtRQUNkLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNqQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzVDLGtCQUFhLEdBQWIsYUFBYSxDQUF5QjtRQUNsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2hDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVg5QyxlQUFVLEdBQTZDLFNBQVMsQ0FBQztJQVlyRSxDQUFDO0lBRUwsS0FBSyxDQUFDLEdBQUc7UUFDUixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRS9CLElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQzlCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzdCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUs7UUFDbEIsSUFBSSxhQUFnQyxDQUFDO1FBQ3JDLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVJLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxpREFBaUQ7UUFDbEcsQ0FBQzthQUFNLENBQUM7WUFDUCxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDekMsQ0FBQztRQUVELElBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN4QixJQUFJLENBQUM7WUFDSixRQUFRLGFBQWEsRUFBRSxDQUFDO2dCQUN2QixLQUFLLGlCQUFpQixDQUFDLDJCQUEyQjtvQkFDakQsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQ2hILE1BQU07Z0JBQ1AsS0FBSyxpQkFBaUIsQ0FBQyw4QkFBOEI7b0JBQ3BELE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUNqSCxNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsWUFBWTtvQkFDbEMsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQ3ZFLE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0NBQW9DLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkYsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNqQixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVO1FBQ3ZCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsSUFBSSxNQUFNLEdBQWtDLFNBQVMsQ0FBQztRQUV0RCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUVqRixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFDbEMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUNyQixPQUFPLEVBQ1AsNEJBQTRCLENBQUM7WUFDNUIsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDMUIsUUFBUSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUM1QixVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEUscUJBQXFCLEVBQUU7Z0JBQ3RCLG1CQUFtQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7Z0JBQzVDLDBCQUEwQixFQUFFLEtBQUs7Z0JBQ2pDLE9BQU8sRUFBRTtvQkFDUixRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSw0QkFBNEIsRUFBRSxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO29CQUN6TSxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsNkJBQTZCLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw0QkFBNEIsRUFBRSxXQUFXLENBQUMsc0JBQXNCLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLGlCQUFpQixDQUFDLDJCQUEyQixFQUFFLENBQUM7aUJBQ3BPO2FBQ0Q7U0FDRCxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQzlDLENBQUMsQ0FBQztRQUVILE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN2QyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdEIsT0FBTyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7SUFDN0YsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEUsT0FBTyxRQUFRLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU8sY0FBYztRQUNyQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2pKLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDNUQsT0FBTyxRQUFRLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDhCQUE4QixDQUFDLENBQUM7SUFDdkosQ0FBQztJQUVPLFlBQVksQ0FBQyxXQUE0QjtRQUNoRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUV0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWhGLFNBQVM7UUFDVCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsRUFBRSxtTEFBbUwsRUFBRSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUM1UyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRS9JLFFBQVE7UUFDUixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUseUVBQXlFLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3pQLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRTdJLGVBQWU7UUFDZixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLGdDQUF3QixFQUFFLENBQUM7WUFDbEUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxFQUFFLGtLQUFrSyxFQUFFLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUN6VixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BKLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDOztBQWhKSSxTQUFTO0lBbUJaLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsV0FBVyxDQUFBO0dBekJSLFNBQVMsQ0FpSmQ7QUFFTSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7YUFFcEMsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFpQztJQUVuRCxZQUNtQyxjQUErQixFQUN6QixvQkFBMkMsRUFDakQsY0FBK0IsRUFDN0IsZ0JBQW1DLEVBQzlDLHNCQUE4QyxFQUMvQixvQkFBMkMsRUFDckQsVUFBdUI7UUFFckQsS0FBSyxFQUFFLENBQUM7UUFSMEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ3pCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDakQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzdCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFFL0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSXJELE1BQU0sT0FBTyxHQUFHLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDdEQsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0IsT0FBTyxDQUFDLFdBQVc7UUFDcEIsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE9BQStCLEVBQUUsVUFBcUM7UUFDakcsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0NBQW9DO1FBRW5HLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQy9CLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3JHLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsR0FBRyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNqTCxZQUFZLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUN0QyxlQUFlLEVBQ2YsNEJBQTRCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQ25JLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUNuSSw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFDakksNEJBQTRCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQ3pJLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUN4SSxVQUFVLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO29CQUNuQyxnRUFBZ0U7b0JBQ2hFLDJEQUEyRDtvQkFDM0QsaUVBQWlFO29CQUNqRSxpRUFBaUU7b0JBQ2pFLHNCQUFzQjtvQkFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMseUZBQXlGLENBQUMsQ0FBQztvQkFDakgsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMzQixDQUFDLENBQUMsQ0FDRixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLFFBQVEsSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzNDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQzdDLE9BQU8sQ0FBQyxXQUFXLEVBQ25CLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FDckgsRUFBRSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsT0FBK0IsRUFBRSxVQUFxQztRQUNqRyxRQUFRLENBQUMsRUFBRSxrR0FBNEYsQ0FBQyxRQUFRLENBQUM7WUFDaEgsS0FBSyxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLENBQUM7WUFDcEQsSUFBSSxFQUFFLGVBQWUsQ0FBQyxrQkFBa0I7WUFDeEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1lBQzFCLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTztTQUM3SSxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sZUFBZSxDQUFDLE9BQStCLEVBQUUsUUFBaUMsRUFBRSxVQUFxQztRQUNoSSxNQUFNLHVCQUF1QixHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQ2hELGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUN4QyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FDckMsQ0FBQztRQUVGLE1BQU0sdUJBQXVCLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFFMUcsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO1lBRTNDO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixLQUFLLEVBQUUsdUJBQXVCO29CQUM5QixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsRUFBRSxFQUFFLElBQUk7b0JBQ1IsWUFBWSxFQUFFLHVCQUF1QjtvQkFDckMsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO3dCQUMzQixLQUFLLEVBQUUsUUFBUTt3QkFDZixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsdUJBQXVCLEVBQ3ZCLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLHFEQUFxRDt3QkFDaEcsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUksc0NBQXNDO3lCQUN0RSxDQUNEO3FCQUNEO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUM7WUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBYztnQkFDNUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDakQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQ25FLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQzVELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDakUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDckQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBRXpELE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3ZFLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsTUFBTSxVQUFVLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztvQkFDM0MsVUFBVSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7Z0JBRUQsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdEIseUJBQXlCLENBQUMscUJBQXFCLEVBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUMvRSxDQUFDO2dCQUVELGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRXJFLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3JCLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUMvRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDakMsSUFBSSxNQUFNLEtBQUssS0FBSyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7d0JBQ3hELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUM7NEJBQ2pELElBQUksRUFBRSxRQUFRLENBQUMsS0FBSzs0QkFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxvREFBb0QsQ0FBQzs0QkFDM0YsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO3lCQUN6QyxDQUFDLENBQUM7d0JBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQzs0QkFDZixjQUFjLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7d0JBQ3JELENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztTQUNEO1FBRUQsTUFBTSxtQkFBb0IsU0FBUSxPQUFPO3FCQUV4QixPQUFFLEdBQUcsaUNBQWlDLENBQUM7cUJBQ3ZDLFVBQUssR0FBRyxTQUFTLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBRW5FO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsbUJBQW1CLENBQUMsRUFBRTtvQkFDMUIsS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUs7b0JBQ2hDLEVBQUUsRUFBRSxJQUFJO29CQUNSLFFBQVEsRUFBRSxhQUFhO29CQUN2QixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDakgsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO3dCQUMzQixLQUFLLEVBQUUsUUFBUTt3QkFDZixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO3FCQUM5QztpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDO1lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDNUMsTUFBTSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQ3BFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUV6RCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDO29CQUNqRCxPQUFPLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHdDQUF3QyxDQUFDO29CQUNuRixNQUFNLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHVEQUF1RCxFQUFFLHVCQUF1QixDQUFDLEtBQUssQ0FBQztvQkFDL0gsYUFBYSxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUM7aUJBQzlELENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLE9BQU87Z0JBQ1IsQ0FBQztnQkFFRCxNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFeEUsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBRXZDLElBQUksUUFBUSwrQ0FBdUMsRUFBRSxDQUFDO29CQUNyRCxNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDcE0sSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ25DLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSwrREFBMEIsQ0FBQyxDQUFDLHNEQUFzRDtvQkFDbkgsQ0FBQztnQkFDRixDQUFDO2dCQUVELGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNyRSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkUsQ0FBQzs7UUFHRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxpQkFBa0IsU0FBUSxPQUFPO1lBQ3RDO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsbUNBQW1DO29CQUN2QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSx3QkFBd0IsQ0FBQztvQkFDeEQsUUFBUSxFQUFFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDO29CQUM1QyxFQUFFLEVBQUUsSUFBSTtvQkFDUixZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDOUIsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQ3JDLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUNuQztvQkFDRCxJQUFJLEVBQUU7d0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7d0JBQzNCLEtBQUssRUFBRSxTQUFTO3dCQUNoQixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDdEIsZUFBZSxDQUFDLGlCQUFpQixFQUNqQyxlQUFlLENBQUMsd0JBQXdCLENBQ3hDO3FCQUNEO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUM7WUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBYTtnQkFDM0QsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFFckQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztnQkFDOUMsSUFBSSxXQUFXLEtBQUssZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUN6Qyw2RUFBNkU7b0JBQzdFLHlFQUF5RTtvQkFDekUsbUJBQW1CLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlHLENBQUM7WUFDRixDQUFDO1lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFjLEVBQUUsY0FBK0I7Z0JBQzFFLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBRTVCLE1BQU0sWUFBWSxHQUFHLE1BQU0sUUFBUSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUN2RSxJQUFJLFlBQVksRUFBRSxXQUFXLEtBQUssZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUN2RCxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQy9CLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRDtRQUVELGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3hDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3JDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxlQUFlLENBQUM7WUFDbEUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNuQixPQUFPLEdBQUcsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLElBQUksZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdkgsQ0FBQztZQUNELFNBQVMsRUFBRSxLQUFLLEVBQUMsR0FBRyxFQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBc0UseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDO2dCQUV6TixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVyRyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBbFJXLHFCQUFxQjtJQUsvQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtHQVhELHFCQUFxQixDQW1SakM7O0FBcUJELElBQUssYUFJSjtBQUpELFdBQUssYUFBYTtJQUNqQix1REFBVyxDQUFBO0lBQ1gsMkRBQVMsQ0FBQTtJQUNULDZEQUFVLENBQUE7QUFDWCxDQUFDLEVBSkksYUFBYSxLQUFiLGFBQWEsUUFJakI7QUFFRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFNM0MsSUFBSSxJQUFJLEtBQW9CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFaEQsWUFDa0IsT0FBK0IsRUFDL0IsUUFBaUMsRUFDL0IsZ0JBQW9ELEVBQy9DLHFCQUE4RCxFQUN2RSxZQUE0QyxFQUM5QiwwQkFBd0UsRUFDcEYsY0FBZ0QsRUFDcEQsVUFBd0MsRUFDbkMsZUFBa0QsRUFDakQsZ0JBQW9ELEVBQ3JELGVBQWtELEVBQ25ELGNBQWdELEVBQ3hDLGFBQXVELEVBQ2pELDRCQUE0RSxFQUMzRixhQUE4QyxFQUN2QyxvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQ25ELGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQW5CUyxZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQUNkLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDOUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUN0RCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNiLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFDbkUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ25DLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ2hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDcEMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ2xDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBeUI7UUFDaEMsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUMxRSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMvQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ2xDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUF4QjFELGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDM0QsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztRQUV2QyxVQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQXlCckMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFTyxPQUFPLENBQUMsSUFBbUI7UUFDbEMsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUE4RDtRQUN6RSxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN4RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFO1lBQy9KLEtBQUssRUFBRSxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7U0FDckMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDO2dCQUM5QyxRQUFRLGtDQUF5QjtnQkFDakMsT0FBTyxFQUFFLG1CQUFtQjtnQkFDNUIsS0FBSzthQUNMLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUE2RCxFQUFFLEtBQWdCO1FBQ3BHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBRSxrQkFBa0I7UUFFM0MsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzNCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDakYsSUFBSSxPQUEwQyxDQUFDO1lBQy9DLElBQUksV0FBd0MsQ0FBQztZQUU3QyxnRUFBZ0U7WUFDaEUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3ZGLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN0QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUE4QywyQkFBMkIsRUFBRSxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNwUSxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUVELE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO2dCQUN6QixXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUNsQyxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMscUJBQXFCLENBQUM7Z0JBQzdFLE9BQU8sRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsNERBQTRELENBQUM7YUFDeEcsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ25RLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLGdCQUFnQixFQUFFLENBQUM7WUFFekMsVUFBVTtZQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVqSCxNQUFNLG9CQUFvQixHQUFHLGdCQUFnQixFQUFFLENBQUM7WUFDaEQsY0FBYyxHQUFHLGFBQWEsS0FBSyxvQkFBb0IsSUFBSSxvQkFBb0IsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUM5RyxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxJQUFJLGNBQWMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNoRCxDQUFDLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDOUUsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQWtCLEVBQUUsT0FBdUM7UUFDL0UsSUFBSSxPQUEwQyxDQUFDO1FBQy9DLElBQUksWUFBWSxDQUFDO1FBQ2pCLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUM7Z0JBQy9CLGVBQWUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN4RCxDQUFDO1lBRUQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3JELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUN0RCxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3BCLE9BQU8sRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsd0RBQXdELEVBQUUsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDO2dCQUNyUSxNQUFNLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHVDQUF1QyxDQUFDO2dCQUNyRixhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7YUFDekMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxDQUFDO0lBQzVELENBQUM7SUFFTyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQTBDLEVBQUUsV0FBNEIsRUFBRSxVQUFrQixFQUFFLE9BQXNDLEVBQUUsS0FBZ0I7UUFDM0ssTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1FBQ2xELElBQUksWUFBWSxHQUFnRCxTQUFTLENBQUM7UUFFMUUsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQztnQkFDL0IsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3hELENBQUM7WUFFRCxJQUNDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxJQUFJLHdDQUF3QztnQkFDbkYsV0FBVyxLQUFLLGVBQWUsQ0FBQyxHQUFHLElBQUssdUNBQXVDO2dCQUMvRSxXQUFXLEtBQUssZUFBZSxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0M7Y0FDL0UsQ0FBQztnQkFDRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDO3dCQUNKLE9BQU8sR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUUsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQiw0REFBNEQ7b0JBQzdELENBQUM7b0JBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ2xRLE9BQU8sS0FBSyxDQUFDLENBQUMsYUFBYTtvQkFDNUIsQ0FBQztnQkFDRixDQUFDO2dCQUVELFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUxRCxJQUFJLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBOEMsMkJBQTJCLEVBQUUsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsZUFBZSxFQUFFLFlBQVksQ0FBQyxTQUFTLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM3USxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3hCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLCtCQUErQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzlELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzNTLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWhTLElBQUksWUFBWSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQy9CLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFjLGtEQUFrRDtnQkFDN0UsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsQ0FBQywwREFBMEQ7YUFDbkgsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTO1FBQ3RCLElBQUksS0FBd0IsQ0FBQztRQUM3QixJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRTtnQkFDdEUsTUFBTSxFQUFFLElBQUk7Z0JBQ1osbUJBQW1CLEVBQUUsSUFBSSxFQUFHLDRCQUE0QjtnQkFDeEQsZUFBZSxFQUFFLEtBQUssRUFBRyxxQkFBcUI7Z0JBQzlDLGlCQUFpQixFQUFFLElBQUksRUFBRSw4QkFBOEI7Z0JBQ3ZELHdCQUF3QixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLFFBQVE7YUFDbEUsRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM5RCxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUVELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN6QyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztvQkFDdEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLO29CQUNwQixPQUFPLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDBFQUEwRSxDQUFDO29CQUNsSCxNQUFNLEVBQUUsS0FBSyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDaEYsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO2lCQUN6QyxDQUFDLENBQUM7Z0JBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDekIsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLEtBQUssQ0FBQztRQUNiLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQXNFO1FBQzdGLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzVGLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztZQUM5QixJQUFJLEVBQUUsZUFBZTtZQUNyQixNQUFNLEVBQUUsUUFBUTtZQUNoQixZQUFZLEVBQUU7Z0JBQ2IsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsRUFBRTtvQkFDekMsTUFBTSxFQUFFLFFBQVE7b0JBQ2hCLFlBQVksRUFBRTt3QkFDYixjQUFjLEVBQUU7NEJBQ2YsTUFBTSxFQUFFLFFBQVE7eUJBQ2hCO3FCQUNEO2lCQUNEO2dCQUNELENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEVBQUU7b0JBQ2pDLE1BQU0sRUFBRSxRQUFRO2lCQUNoQjthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNuQyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPLEtBQUssQ0FBQyxDQUFDLGlDQUFpQztZQUNoRCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksdUJBQXVCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO1FBQ3BILElBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO1lBQ3hDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztRQUM5QixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxXQUFXLENBQUMsMEJBQTBCLEVBQUUsRUFBRTtnQkFDeEYsR0FBRyx1QkFBdUI7Z0JBQzFCLGNBQWMsRUFBRSxXQUFXLENBQUMsb0JBQW9CO2FBQ2hELG1DQUEyQixDQUFDO1FBQzlCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEdBQUcsV0FBVyxDQUFDLDBCQUEwQixFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxSSxHQUFHLHVCQUF1QjtnQkFDMUIsY0FBYyxFQUFFLFNBQVM7YUFDekIsQ0FBQyxDQUFDLENBQUMsU0FBUyxtQ0FBMkIsQ0FBQztZQUN6QyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsbUNBQTJCLENBQUM7UUFDbEgsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLDZEQUE2RCxDQUFDO1FBRW5GLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdkYsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sSUFBSSxDQUFDLENBQUMsaUNBQWlDO1FBQy9DLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1lBQ2pELE1BQU0sRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNEJBQTRCLEVBQUUsV0FBVyxDQUFDLHNCQUFzQixDQUFDO1lBQ3hHLFdBQVcsRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsZ0RBQWdELENBQUM7WUFDeEcsZUFBZSxFQUFFLElBQUk7WUFDckIsS0FBSyxFQUFFLEdBQUc7WUFDVixhQUFhLEVBQUUsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO2dCQUM1QixZQUFZLEdBQUcsS0FBSyxDQUFDO2dCQUNyQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osT0FBTyxTQUFTLENBQUM7Z0JBQ2xCLENBQUM7Z0JBRUQsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzdCLFlBQVksR0FBRyxJQUFJLENBQUM7b0JBQ3BCLE9BQU87d0JBQ04sT0FBTyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxLQUFLLFVBQVUsQ0FBQzt3QkFDckYsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO3FCQUN2QixDQUFDO2dCQUNILENBQUM7Z0JBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDakMsT0FBTzt3QkFDTixPQUFPLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLG1GQUFtRixFQUFFLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQzt3QkFDdkssUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLO3FCQUN4QixDQUFDO2dCQUNILENBQUM7Z0JBRUQsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUN0RCxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3BCLE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUseUVBQXlFLEVBQUUsV0FBVyxDQUFDLHNCQUFzQixDQUFDO2dCQUN4SixhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7YUFDekMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixPQUFPLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3hDLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUM7UUFDekIsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixXQUFXLEdBQUcsV0FBVyxXQUFXLFVBQVUsQ0FBQztRQUNoRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMzQyxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixXQUFXLEdBQUcsV0FBVyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsV0FBVyxtQ0FBMkIsQ0FBQztRQUVuSCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCxDQUFBO0FBN1ZLLG1CQUFtQjtJQVd0QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxnQkFBZ0IsQ0FBQTtJQUNoQixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsdUJBQXVCLENBQUE7SUFDdkIsWUFBQSw2QkFBNkIsQ0FBQTtJQUM3QixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGtCQUFrQixDQUFBO0dBMUJmLG1CQUFtQixDQTZWeEI7QUFFRCxZQUFZO0FBRVosNEJBQTRCO0FBRTVCLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQUkvQyxZQUNrQixVQUErQixFQUMvQixPQUErQixFQUN6QixvQkFBNEQsRUFDOUQsa0JBQXdELEVBQ3RELG9CQUE0RCxFQUNoRSxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUM7UUFQUyxlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQUMvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUNSLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDN0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFSL0QsWUFBTyxHQUFHLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBWXhDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTyxNQUFNO1FBQ2IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVoRixTQUFTO1FBQ1QsQ0FBQztZQUNBLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsMkJBQTJCLENBQUMsRUFBRSxFQUFFLDRDQUE0QyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDNU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBRXRJLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUN2QixDQUFDLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUN6QyxDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFDakIsQ0FBQyxDQUFDLDRCQUE0QixFQUFFLFNBQVMsRUFDeEMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFDeEIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQzdFLEVBQ0QsQ0FBQyxDQUFDLDRCQUE0QixFQUFFLFNBQVMsRUFDeEMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDL0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDLENBQ25GLEVBQ0QsQ0FBQyxDQUFDLDRCQUE0QixFQUFFLFNBQVMsRUFDeEMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUNyQyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUNuRixDQUNELENBQ0QsQ0FDRCxDQUFDO1FBQ0gsQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSx5REFBeUQsRUFBRSxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNySyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRW5MLGVBQWU7UUFDZixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6RCxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxlQUFlLEVBQUU7WUFDckUsT0FBTyxFQUFFO2dCQUNSLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSw2QkFBNkIsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDRCQUE0QixFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDN04sUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLHVDQUF1QyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsNEJBQTRCLEVBQUUsV0FBVyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7YUFDMVA7WUFDRCwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7WUFDNUMsWUFBWSxFQUFFLElBQUk7WUFDbEIsR0FBRyxtQkFBbUI7U0FDdEIsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakUsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLEVBQUUsRUFBRSx5RUFBeUUsRUFBRSxXQUFXLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDelAsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRXJJLGVBQWU7UUFDZixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsa0tBQWtLLEVBQUUsV0FBVyxDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3pWLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRWxLLDhCQUE4QjtRQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pJLENBQUM7SUFFTyxNQUFNLENBQUMsYUFBMEIsRUFBRSxpQkFBOEIsRUFBRSxNQUEwQjtRQUNwRyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxnQ0FBd0IsQ0FBQztRQUNsRixJQUFJLFFBQWlCLENBQUM7UUFDdEIsSUFBSSxXQUFtQixDQUFDO1FBRXhCLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDeEMsS0FBSyxlQUFlLENBQUMsT0FBTztnQkFDM0IsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDaEIsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7Z0JBQ3ZKLE1BQU07WUFDUCxLQUFLLGVBQWUsQ0FBQyxVQUFVO2dCQUM5QixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztnQkFDdEksTUFBTTtZQUNQLEtBQUssZUFBZSxDQUFDLFNBQVMsQ0FBQztZQUMvQixLQUFLLGVBQWUsQ0FBQyxPQUFPO2dCQUMzQixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixXQUFXLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDLENBQUM7Z0JBQ2pFLE1BQU07WUFDUCxLQUFLLGVBQWUsQ0FBQyxHQUFHLENBQUM7WUFDekIsS0FBSyxlQUFlLENBQUMsV0FBVztnQkFDL0IsUUFBUSxHQUFHLEtBQUssQ0FBQztnQkFDakIsV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ2pELE1BQU07UUFDUixDQUFDO1FBRUQsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLEtBQUssYUFBYSxDQUFDLFNBQVM7Z0JBQzNCLFdBQVcsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsc0NBQXNDLEVBQUUsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3RQLE1BQU07WUFDUCxLQUFLLGFBQWEsQ0FBQyxVQUFVO2dCQUM1QixXQUFXLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDBDQUEwQyxDQUFDLENBQUM7Z0JBQzFGLE1BQU07UUFDUixDQUFDO1FBRUQsYUFBYSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2QyxhQUFhLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFL0MsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUM7UUFDM0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsT0FBTyxDQUFDO0lBQ2pFLENBQUM7Q0FDRCxDQUFBO0FBckhLLHVCQUF1QjtJQU8xQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0dBVmQsdUJBQXVCLENBcUg1QjtBQUVELFlBQVk7QUFFWixTQUFTLGFBQWEsQ0FBQyxjQUErQjtJQUNyRCx5RUFBeUU7SUFDekUsY0FBYyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUMxRSxjQUFjLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3BFLENBQUMifQ==