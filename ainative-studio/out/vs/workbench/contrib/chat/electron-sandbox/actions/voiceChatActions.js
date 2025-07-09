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
var VoiceChatSessions_1, ChatSynthesizerSessions_1, KeywordActivationContribution_1, KeywordActivationStatusEntry_1;
import './media/voiceChatActions.css';
import { RunOnceScheduler, disposableTimeout, raceCancellation } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { isNumber } from '../../../../../base/common/types.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Extensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { contrastBorder, focusBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading, syncing } from '../../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { registerThemingParticipant } from '../../../../../platform/theme/common/themeService.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND } from '../../../../common/theme.js';
import { SpeechTimeoutDefault, accessibilityConfigurationNodeBase } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { CHAT_CATEGORY } from '../../browser/actions/chatActions.js';
import { IChatWidgetService, IQuickChatService, showChatView } from '../../browser/chat.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { KEYWORD_ACTIVIATION_SETTING_ID } from '../../common/chatService.js';
import { ChatResponseViewModel, isResponseVM } from '../../common/chatViewModel.js';
import { IVoiceChatService, VoiceChatInProgress as GlobalVoiceChatInProgress } from '../../common/voiceChatService.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { InlineChatController } from '../../../inlineChat/browser/inlineChatController.js';
import { CTX_INLINE_CHAT_FOCUSED, MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { NOTEBOOK_EDITOR_FOCUSED } from '../../../notebook/common/notebookContextKeys.js';
import { HasSpeechProvider, ISpeechService, KeywordRecognitionStatus, SpeechToTextInProgress, SpeechToTextStatus, TextToSpeechStatus, TextToSpeechInProgress as GlobalTextToSpeechInProgress } from '../../../speech/common/speechService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { renderStringAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { SearchContext } from '../../../search/common/constants.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../base/common/severity.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
const VoiceChatSessionContexts = ['view', 'inline', 'quick', 'editor'];
// Global Context Keys (set on global context key service)
const CanVoiceChat = ContextKeyExpr.and(ChatContextKeys.enabled, HasSpeechProvider);
const FocusInChatInput = ContextKeyExpr.or(CTX_INLINE_CHAT_FOCUSED, ChatContextKeys.inChatInput);
const AnyChatRequestInProgress = ChatContextKeys.requestInProgress;
// Scoped Context Keys (set on per-chat-context scoped context key service)
const ScopedVoiceChatGettingReady = new RawContextKey('scopedVoiceChatGettingReady', false, { type: 'boolean', description: localize('scopedVoiceChatGettingReady', "True when getting ready for receiving voice input from the microphone for voice chat. This key is only defined scoped, per chat context.") });
const ScopedVoiceChatInProgress = new RawContextKey('scopedVoiceChatInProgress', undefined, { type: 'string', description: localize('scopedVoiceChatInProgress', "Defined as a location where voice recording from microphone is in progress for voice chat. This key is only defined scoped, per chat context.") });
const AnyScopedVoiceChatInProgress = ContextKeyExpr.or(...VoiceChatSessionContexts.map(context => ScopedVoiceChatInProgress.isEqualTo(context)));
var VoiceChatSessionState;
(function (VoiceChatSessionState) {
    VoiceChatSessionState[VoiceChatSessionState["Stopped"] = 1] = "Stopped";
    VoiceChatSessionState[VoiceChatSessionState["GettingReady"] = 2] = "GettingReady";
    VoiceChatSessionState[VoiceChatSessionState["Started"] = 3] = "Started";
})(VoiceChatSessionState || (VoiceChatSessionState = {}));
class VoiceChatSessionControllerFactory {
    static async create(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const quickChatService = accessor.get(IQuickChatService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorService = accessor.get(IEditorService);
        const viewsService = accessor.get(IViewsService);
        switch (context) {
            case 'focused': {
                const controller = VoiceChatSessionControllerFactory.doCreateForFocusedChat(chatWidgetService, layoutService);
                return controller ?? VoiceChatSessionControllerFactory.create(accessor, 'view'); // fallback to 'view'
            }
            case 'view': {
                const chatWidget = await showChatView(viewsService);
                if (chatWidget) {
                    return VoiceChatSessionControllerFactory.doCreateForChatWidget('view', chatWidget);
                }
                break;
            }
            case 'inline': {
                const activeCodeEditor = getCodeEditor(editorService.activeTextEditorControl);
                if (activeCodeEditor) {
                    const inlineChat = InlineChatController.get(activeCodeEditor);
                    if (inlineChat) {
                        if (!inlineChat.isActive) {
                            inlineChat.run();
                        }
                        return VoiceChatSessionControllerFactory.doCreateForChatWidget('inline', inlineChat.widget.chatWidget);
                    }
                }
                break;
            }
            case 'quick': {
                quickChatService.open(); // this will populate focused chat widget in the chat widget service
                return VoiceChatSessionControllerFactory.create(accessor, 'focused');
            }
        }
        return undefined;
    }
    static doCreateForFocusedChat(chatWidgetService, layoutService) {
        const chatWidget = chatWidgetService.lastFocusedWidget;
        if (chatWidget?.hasInputFocus()) {
            // Figure out the context of the chat widget by asking
            // layout service for the part that has focus. Unfortunately
            // there is no better way because the widget does not know
            // its location.
            let context;
            if (layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
                context = chatWidget.location === ChatAgentLocation.Panel ? 'editor' : 'inline';
            }
            else if (["workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, "workbench.parts.banner" /* Parts.BANNER_PART */, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */].some(part => layoutService.hasFocus(part))) {
                context = 'view';
            }
            else {
                context = 'quick';
            }
            return VoiceChatSessionControllerFactory.doCreateForChatWidget(context, chatWidget);
        }
        return undefined;
    }
    static createChatContextKeyController(contextKeyService, context) {
        const contextVoiceChatGettingReady = ScopedVoiceChatGettingReady.bindTo(contextKeyService);
        const contextVoiceChatInProgress = ScopedVoiceChatInProgress.bindTo(contextKeyService);
        return (state) => {
            switch (state) {
                case VoiceChatSessionState.GettingReady:
                    contextVoiceChatGettingReady.set(true);
                    contextVoiceChatInProgress.reset();
                    break;
                case VoiceChatSessionState.Started:
                    contextVoiceChatGettingReady.reset();
                    contextVoiceChatInProgress.set(context);
                    break;
                case VoiceChatSessionState.Stopped:
                    contextVoiceChatGettingReady.reset();
                    contextVoiceChatInProgress.reset();
                    break;
            }
        };
    }
    static doCreateForChatWidget(context, chatWidget) {
        return {
            context,
            scopedContextKeyService: chatWidget.scopedContextKeyService,
            onDidAcceptInput: chatWidget.onDidAcceptInput,
            onDidHideInput: chatWidget.onDidHide,
            focusInput: () => chatWidget.focusInput(),
            acceptInput: () => chatWidget.acceptInput(undefined, { isVoiceInput: true }),
            updateInput: text => chatWidget.setInput(text),
            getInput: () => chatWidget.getInput(),
            setInputPlaceholder: text => chatWidget.setInputPlaceholder(text),
            clearInputPlaceholder: () => chatWidget.resetInputPlaceholder(),
            updateState: VoiceChatSessionControllerFactory.createChatContextKeyController(chatWidget.scopedContextKeyService, context)
        };
    }
}
let VoiceChatSessions = class VoiceChatSessions {
    static { VoiceChatSessions_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService) {
        if (!VoiceChatSessions_1.instance) {
            VoiceChatSessions_1.instance = instantiationService.createInstance(VoiceChatSessions_1);
        }
        return VoiceChatSessions_1.instance;
    }
    constructor(voiceChatService, configurationService, instantiationService, accessibilityService) {
        this.voiceChatService = voiceChatService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.accessibilityService = accessibilityService;
        this.currentVoiceChatSession = undefined;
        this.voiceChatSessionIds = 0;
    }
    async start(controller, context) {
        // Stop running text-to-speech or speech-to-text sessions in chats
        this.stop();
        ChatSynthesizerSessions.getInstance(this.instantiationService).stop();
        let disableTimeout = false;
        const sessionId = ++this.voiceChatSessionIds;
        const session = this.currentVoiceChatSession = {
            id: sessionId,
            controller,
            hasRecognizedInput: false,
            disposables: new DisposableStore(),
            setTimeoutDisabled: (disabled) => { disableTimeout = disabled; },
            accept: () => this.accept(sessionId),
            stop: () => this.stop(sessionId, controller.context)
        };
        const cts = new CancellationTokenSource();
        session.disposables.add(toDisposable(() => cts.dispose(true)));
        session.disposables.add(controller.onDidAcceptInput(() => this.stop(sessionId, controller.context)));
        session.disposables.add(controller.onDidHideInput(() => this.stop(sessionId, controller.context)));
        controller.focusInput();
        controller.updateState(VoiceChatSessionState.GettingReady);
        const voiceChatSession = await this.voiceChatService.createVoiceChatSession(cts.token, { usesAgents: controller.context !== 'inline', model: context?.widget?.viewModel?.model });
        let inputValue = controller.getInput();
        let voiceChatTimeout = this.configurationService.getValue("accessibility.voice.speechTimeout" /* AccessibilityVoiceSettingId.SpeechTimeout */);
        if (!isNumber(voiceChatTimeout) || voiceChatTimeout < 0) {
            voiceChatTimeout = SpeechTimeoutDefault;
        }
        const acceptTranscriptionScheduler = session.disposables.add(new RunOnceScheduler(() => this.accept(sessionId), voiceChatTimeout));
        session.disposables.add(voiceChatSession.onDidChange(({ status, text, waitingForInput }) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            switch (status) {
                case SpeechToTextStatus.Started:
                    this.onDidSpeechToTextSessionStart(controller, session.disposables);
                    break;
                case SpeechToTextStatus.Recognizing:
                    if (text) {
                        session.hasRecognizedInput = true;
                        session.controller.updateInput(inputValue ? [inputValue, text].join(' ') : text);
                        if (voiceChatTimeout > 0 && context?.voice?.disableTimeout !== true && !disableTimeout) {
                            acceptTranscriptionScheduler.cancel();
                        }
                    }
                    break;
                case SpeechToTextStatus.Recognized:
                    if (text) {
                        session.hasRecognizedInput = true;
                        inputValue = inputValue ? [inputValue, text].join(' ') : text;
                        session.controller.updateInput(inputValue);
                        if (voiceChatTimeout > 0 && context?.voice?.disableTimeout !== true && !waitingForInput && !disableTimeout) {
                            acceptTranscriptionScheduler.schedule();
                        }
                    }
                    break;
                case SpeechToTextStatus.Stopped:
                    this.stop(session.id, controller.context);
                    break;
            }
        }));
        return session;
    }
    onDidSpeechToTextSessionStart(controller, disposables) {
        controller.updateState(VoiceChatSessionState.Started);
        let dotCount = 0;
        const updatePlaceholder = () => {
            dotCount = (dotCount + 1) % 4;
            controller.setInputPlaceholder(`${localize('listening', "I'm listening")}${'.'.repeat(dotCount)}`);
            placeholderScheduler.schedule();
        };
        const placeholderScheduler = disposables.add(new RunOnceScheduler(updatePlaceholder, 500));
        updatePlaceholder();
    }
    stop(voiceChatSessionId = this.voiceChatSessionIds, context) {
        if (!this.currentVoiceChatSession ||
            this.voiceChatSessionIds !== voiceChatSessionId ||
            (context && this.currentVoiceChatSession.controller.context !== context)) {
            return;
        }
        this.currentVoiceChatSession.controller.clearInputPlaceholder();
        this.currentVoiceChatSession.controller.updateState(VoiceChatSessionState.Stopped);
        this.currentVoiceChatSession.disposables.dispose();
        this.currentVoiceChatSession = undefined;
    }
    async accept(voiceChatSessionId = this.voiceChatSessionIds) {
        if (!this.currentVoiceChatSession ||
            this.voiceChatSessionIds !== voiceChatSessionId) {
            return;
        }
        if (!this.currentVoiceChatSession.hasRecognizedInput) {
            // If we have an active session but without recognized
            // input, we do not want to just accept the input that
            // was maybe typed before. But we still want to stop the
            // voice session because `acceptInput` would do that.
            this.stop(voiceChatSessionId, this.currentVoiceChatSession.controller.context);
            return;
        }
        const controller = this.currentVoiceChatSession.controller;
        const response = await controller.acceptInput();
        if (!response) {
            return;
        }
        const autoSynthesize = this.configurationService.getValue("accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */);
        if (autoSynthesize === 'on' || (autoSynthesize !== 'off' && !this.accessibilityService.isScreenReaderOptimized())) {
            let context;
            if (controller.context === 'inline') {
                // This is ugly, but the lightweight inline chat turns into
                // a different widget as soon as a response comes in, so we fallback to
                // picking up from the focused chat widget
                context = 'focused';
            }
            else {
                context = controller;
            }
            ChatSynthesizerSessions.getInstance(this.instantiationService).start(this.instantiationService.invokeFunction(accessor => ChatSynthesizerSessionController.create(accessor, context, response)));
        }
    }
};
VoiceChatSessions = VoiceChatSessions_1 = __decorate([
    __param(0, IVoiceChatService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IAccessibilityService)
], VoiceChatSessions);
export const VOICE_KEY_HOLD_THRESHOLD = 500;
async function startVoiceChatWithHoldMode(id, accessor, target, context) {
    const instantiationService = accessor.get(IInstantiationService);
    const keybindingService = accessor.get(IKeybindingService);
    const holdMode = keybindingService.enableKeybindingHoldMode(id);
    const controller = await VoiceChatSessionControllerFactory.create(accessor, target);
    if (!controller) {
        return;
    }
    const session = await VoiceChatSessions.getInstance(instantiationService).start(controller, context);
    let acceptVoice = false;
    const handle = disposableTimeout(() => {
        acceptVoice = true;
        session?.setTimeoutDisabled(true); // disable accept on timeout when hold mode runs for VOICE_KEY_HOLD_THRESHOLD
    }, VOICE_KEY_HOLD_THRESHOLD);
    await holdMode;
    handle.dispose();
    if (acceptVoice) {
        session.accept();
    }
}
class VoiceChatWithHoldModeAction extends Action2 {
    constructor(desc, target) {
        super(desc);
        this.target = target;
    }
    run(accessor, context) {
        return startVoiceChatWithHoldMode(this.desc.id, accessor, this.target, context);
    }
}
export class VoiceChatInChatViewAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.voiceChatInChatView'; }
    constructor() {
        super({
            id: VoiceChatInChatViewAction.ID,
            title: localize2('workbench.action.chat.voiceChatInView.label', "Voice Chat in Chat View"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate() // disable when a chat request is in progress
            ),
            f1: true
        }, 'view');
    }
}
export class HoldToVoiceChatInChatViewAction extends Action2 {
    static { this.ID = 'workbench.action.chat.holdToVoiceChatInChatView'; }
    constructor() {
        super({
            id: HoldToVoiceChatInChatViewAction.ID,
            title: localize2('workbench.action.chat.holdToVoiceChatInChatView.label', "Hold to Voice Chat in Chat View"),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate(), // disable when a chat request is in progress
                FocusInChatInput?.negate(), // when already in chat input, disable this action and prefer to start voice chat directly
                EditorContextKeys.focus.negate(), // do not steal the inline-chat keybinding
                NOTEBOOK_EDITOR_FOCUSED.negate(), // do not steal the notebook keybinding
                SearchContext.SearchViewFocusedKey.negate() // do not steal the search keybinding
                ),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            }
        });
    }
    async run(accessor, context) {
        // The intent of this action is to provide 2 modes to align with what `Ctrlcmd+I` in inline chat:
        // - if the user press and holds, we start voice chat in the chat view
        // - if the user press and releases quickly enough, we just open the chat view without voice chat
        const instantiationService = accessor.get(IInstantiationService);
        const keybindingService = accessor.get(IKeybindingService);
        const viewsService = accessor.get(IViewsService);
        const holdMode = keybindingService.enableKeybindingHoldMode(HoldToVoiceChatInChatViewAction.ID);
        let session;
        const handle = disposableTimeout(async () => {
            const controller = await VoiceChatSessionControllerFactory.create(accessor, 'view');
            if (controller) {
                session = await VoiceChatSessions.getInstance(instantiationService).start(controller, context);
                session.setTimeoutDisabled(true);
            }
        }, VOICE_KEY_HOLD_THRESHOLD);
        (await showChatView(viewsService))?.focusInput();
        await holdMode;
        handle.dispose();
        if (session) {
            session.accept();
        }
    }
}
export class InlineVoiceChatAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.inlineVoiceChat'; }
    constructor() {
        super({
            id: InlineVoiceChatAction.ID,
            title: localize2('workbench.action.chat.inlineVoiceChat', "Inline Voice Chat"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ActiveEditorContext, ChatContextKeys.requestInProgress.negate() // disable when a chat request is in progress
            ),
            f1: true
        }, 'inline');
    }
}
export class QuickVoiceChatAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.quickVoiceChat'; }
    constructor() {
        super({
            id: QuickVoiceChatAction.ID,
            title: localize2('workbench.action.chat.quickVoiceChat.label', "Quick Voice Chat"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate() // disable when a chat request is in progress
            ),
            f1: true
        }, 'quick');
    }
}
const primaryVoiceActionMenu = (when) => {
    return [
        {
            id: MenuId.ChatInput,
            when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession)), when),
            group: 'navigation',
            order: 3
        },
        {
            id: MenuId.ChatExecute,
            when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel).negate(), ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession).negate(), when),
            group: 'navigation',
            order: 2
        }
    ];
};
export class StartVoiceChatAction extends Action2 {
    static { this.ID = 'workbench.action.chat.startVoiceChat'; }
    constructor() {
        super({
            id: StartVoiceChatAction.ID,
            title: localize2('workbench.action.chat.startVoiceChat.label', "Start Voice Chat"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusInChatInput, // scope this action to chat input fields only
                EditorContextKeys.focus.negate(), // do not steal the editor inline-chat keybinding
                NOTEBOOK_EDITOR_FOCUSED.negate() // do not steal the notebook inline-chat keybinding
                ),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            icon: Codicon.mic,
            precondition: ContextKeyExpr.and(CanVoiceChat, ScopedVoiceChatGettingReady.negate(), // disable when voice chat is getting ready
            AnyChatRequestInProgress?.negate(), // disable when any chat request is in progress
            SpeechToTextInProgress.negate() // disable when speech to text is in progress
            ),
            menu: primaryVoiceActionMenu(ContextKeyExpr.and(HasSpeechProvider, ScopedChatSynthesisInProgress.negate(), // hide when text to speech is in progress
            AnyScopedVoiceChatInProgress?.negate()))
        });
    }
    async run(accessor, context) {
        const widget = context?.widget;
        if (widget) {
            // if we already get a context when the action is executed
            // from a toolbar within the chat widget, then make sure
            // to move focus into the input field so that the controller
            // is properly retrieved
            widget.focusInput();
        }
        return startVoiceChatWithHoldMode(this.desc.id, accessor, 'focused', context);
    }
}
export class StopListeningAction extends Action2 {
    static { this.ID = 'workbench.action.chat.stopListening'; }
    constructor() {
        super({
            id: StopListeningAction.ID,
            title: localize2('workbench.action.chat.stopListening.label', "Stop Listening"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
                when: AnyScopedVoiceChatInProgress
            },
            icon: spinningLoading,
            precondition: GlobalVoiceChatInProgress, // need global context here because of `f1: true`
            menu: primaryVoiceActionMenu(AnyScopedVoiceChatInProgress)
        });
    }
    async run(accessor) {
        VoiceChatSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
export class StopListeningAndSubmitAction extends Action2 {
    static { this.ID = 'workbench.action.chat.stopListeningAndSubmit'; }
    constructor() {
        super({
            id: StopListeningAndSubmitAction.ID,
            title: localize2('workbench.action.chat.stopListeningAndSubmit.label', "Stop Listening and Submit"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusInChatInput, AnyScopedVoiceChatInProgress),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            precondition: GlobalVoiceChatInProgress // need global context here because of `f1: true`
        });
    }
    run(accessor) {
        VoiceChatSessions.getInstance(accessor.get(IInstantiationService)).accept();
    }
}
//#endregion
//#region Text to Speech
const ScopedChatSynthesisInProgress = new RawContextKey('scopedChatSynthesisInProgress', false, { type: 'boolean', description: localize('scopedChatSynthesisInProgress', "Defined as a location where voice recording from microphone is in progress for voice chat. This key is only defined scoped, per chat context.") });
class ChatSynthesizerSessionController {
    static create(accessor, context, response) {
        if (context === 'focused') {
            return ChatSynthesizerSessionController.doCreateForFocusedChat(accessor, response);
        }
        else {
            return {
                onDidHideChat: context.onDidHideInput,
                contextKeyService: context.scopedContextKeyService,
                response
            };
        }
    }
    static doCreateForFocusedChat(accessor, response) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const contextKeyService = accessor.get(IContextKeyService);
        let chatWidget = chatWidgetService.getWidgetBySessionId(response.session.sessionId);
        if (chatWidget?.location === ChatAgentLocation.Editor) {
            // workaround for https://github.com/microsoft/vscode/issues/212785
            chatWidget = chatWidgetService.lastFocusedWidget;
        }
        return {
            onDidHideChat: chatWidget?.onDidHide ?? Event.None,
            contextKeyService: chatWidget?.scopedContextKeyService ?? contextKeyService,
            response
        };
    }
}
let ChatSynthesizerSessions = class ChatSynthesizerSessions {
    static { ChatSynthesizerSessions_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService) {
        if (!ChatSynthesizerSessions_1.instance) {
            ChatSynthesizerSessions_1.instance = instantiationService.createInstance(ChatSynthesizerSessions_1);
        }
        return ChatSynthesizerSessions_1.instance;
    }
    constructor(speechService, configurationService, instantiationService) {
        this.speechService = speechService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.activeSession = undefined;
    }
    async start(controller) {
        // Stop running text-to-speech or speech-to-text sessions in chats
        this.stop();
        VoiceChatSessions.getInstance(this.instantiationService).stop();
        const activeSession = this.activeSession = new CancellationTokenSource();
        const disposables = new DisposableStore();
        activeSession.token.onCancellationRequested(() => disposables.dispose());
        const session = await this.speechService.createTextToSpeechSession(activeSession.token, 'chat');
        if (activeSession.token.isCancellationRequested) {
            return;
        }
        disposables.add(controller.onDidHideChat(() => this.stop()));
        const scopedChatToSpeechInProgress = ScopedChatSynthesisInProgress.bindTo(controller.contextKeyService);
        disposables.add(toDisposable(() => scopedChatToSpeechInProgress.reset()));
        disposables.add(session.onDidChange(e => {
            switch (e.status) {
                case TextToSpeechStatus.Started:
                    scopedChatToSpeechInProgress.set(true);
                    break;
                case TextToSpeechStatus.Stopped:
                    scopedChatToSpeechInProgress.reset();
                    break;
            }
        }));
        for await (const chunk of this.nextChatResponseChunk(controller.response, activeSession.token)) {
            if (activeSession.token.isCancellationRequested) {
                return;
            }
            await raceCancellation(session.synthesize(chunk), activeSession.token);
        }
    }
    async *nextChatResponseChunk(response, token) {
        const context = {
            ignoreCodeBlocks: this.configurationService.getValue("accessibility.voice.ignoreCodeBlocks" /* AccessibilityVoiceSettingId.IgnoreCodeBlocks */),
            insideCodeBlock: false
        };
        let totalOffset = 0;
        let complete = false;
        do {
            const responseLength = response.response.toString().length;
            const { chunk, offset } = this.parseNextChatResponseChunk(response, totalOffset, context);
            totalOffset = offset;
            complete = response.isComplete;
            if (chunk) {
                yield chunk;
            }
            if (token.isCancellationRequested) {
                return;
            }
            if (!complete && responseLength === response.response.toString().length) {
                await raceCancellation(Event.toPromise(response.onDidChange), token); // wait for the response to change
            }
        } while (!token.isCancellationRequested && !complete);
    }
    parseNextChatResponseChunk(response, offset, context) {
        let chunk = undefined;
        const text = response.response.toString();
        if (response.isComplete) {
            chunk = text.substring(offset);
            offset = text.length + 1;
        }
        else {
            const res = parseNextChatResponseChunk(text, offset);
            chunk = res.chunk;
            offset = res.offset;
        }
        if (chunk && context.ignoreCodeBlocks) {
            chunk = this.filterCodeBlocks(chunk, context);
        }
        return {
            chunk: chunk ? renderStringAsPlaintext({ value: chunk }) : chunk, // convert markdown to plain text
            offset
        };
    }
    filterCodeBlocks(chunk, context) {
        return chunk.split('\n')
            .filter(line => {
            if (line.trimStart().startsWith('```')) {
                context.insideCodeBlock = !context.insideCodeBlock;
                return false;
            }
            return !context.insideCodeBlock;
        })
            .join('\n');
    }
    stop() {
        this.activeSession?.dispose(true);
        this.activeSession = undefined;
    }
};
ChatSynthesizerSessions = ChatSynthesizerSessions_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService)
], ChatSynthesizerSessions);
const sentenceDelimiter = ['.', '!', '?', ':'];
const lineDelimiter = '\n';
const wordDelimiter = ' ';
export function parseNextChatResponseChunk(text, offset) {
    let chunk = undefined;
    for (let i = text.length - 1; i >= offset; i--) { // going from end to start to produce largest chunks
        const cur = text[i];
        const next = text[i + 1];
        if (sentenceDelimiter.includes(cur) && next === wordDelimiter || // end of sentence
            lineDelimiter === cur // end of line
        ) {
            chunk = text.substring(offset, i + 1).trim();
            offset = i + 1;
            break;
        }
    }
    return { chunk, offset };
}
export class ReadChatResponseAloud extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.readChatResponseAloud',
            title: localize2('workbench.action.chat.readChatResponseAloud', "Read Aloud"),
            icon: Codicon.unmute,
            precondition: CanVoiceChat,
            menu: [{
                    id: MenuId.ChatMessageFooter,
                    when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.isResponse, // only for responses
                    ScopedChatSynthesisInProgress.negate(), // but not when already in progress
                    ChatContextKeys.responseIsFiltered.negate()),
                    group: 'navigation',
                    order: -10 // first
                }, {
                    id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                    when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.isResponse, // only for responses
                    ScopedChatSynthesisInProgress.negate(), // but not when already in progress
                    ChatContextKeys.responseIsFiltered.negate() // and not when response is filtered
                    ),
                    group: 'navigation',
                    order: -10 // first
                }]
        });
    }
    run(accessor, ...args) {
        const instantiationService = accessor.get(IInstantiationService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        let response = undefined;
        if (args.length > 0) {
            const responseArg = args[0];
            if (isResponseVM(responseArg)) {
                response = responseArg;
            }
        }
        else {
            const chatWidget = chatWidgetService.lastFocusedWidget;
            if (chatWidget) {
                // pick focused response
                const focus = chatWidget.getFocus();
                if (focus instanceof ChatResponseViewModel) {
                    response = focus;
                }
                // pick the last response
                else {
                    const chatViewModel = chatWidget.viewModel;
                    if (chatViewModel) {
                        const items = chatViewModel.getItems();
                        for (let i = items.length - 1; i >= 0; i--) {
                            const item = items[i];
                            if (isResponseVM(item)) {
                                response = item;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (!response) {
            return;
        }
        const controller = ChatSynthesizerSessionController.create(accessor, 'focused', response.model);
        ChatSynthesizerSessions.getInstance(instantiationService).start(controller);
    }
}
export class StopReadAloud extends Action2 {
    static { this.ID = 'workbench.action.speech.stopReadAloud'; }
    constructor() {
        super({
            id: StopReadAloud.ID,
            icon: syncing,
            title: localize2('workbench.action.speech.stopReadAloud', "Stop Reading Aloud"),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: GlobalTextToSpeechInProgress, // need global context here because of `f1: true`
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
                when: ScopedChatSynthesisInProgress
            },
            menu: primaryVoiceActionMenu(ScopedChatSynthesisInProgress)
        });
    }
    async run(accessor) {
        ChatSynthesizerSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
export class StopReadChatItemAloud extends Action2 {
    static { this.ID = 'workbench.action.chat.stopReadChatItemAloud'; }
    constructor() {
        super({
            id: StopReadChatItemAloud.ID,
            icon: Codicon.mute,
            title: localize2('workbench.action.chat.stopReadChatItemAloud', "Stop Reading Aloud"),
            precondition: ScopedChatSynthesisInProgress,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [
                {
                    id: MenuId.ChatMessageFooter,
                    when: ContextKeyExpr.and(ScopedChatSynthesisInProgress, // only when in progress
                    ChatContextKeys.isResponse, // only for responses
                    ChatContextKeys.responseIsFiltered.negate() // but not when response is filtered
                    ),
                    group: 'navigation',
                    order: -10 // first
                },
                {
                    id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                    when: ContextKeyExpr.and(ScopedChatSynthesisInProgress, // only when in progress
                    ChatContextKeys.isResponse, // only for responses
                    ChatContextKeys.responseIsFiltered.negate() // but not when response is filtered
                    ),
                    group: 'navigation',
                    order: -10 // first
                }
            ]
        });
    }
    async run(accessor, ...args) {
        ChatSynthesizerSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
//#endregion
//#region Keyword Recognition
function supportsKeywordActivation(configurationService, speechService, chatAgentService) {
    if (!speechService.hasSpeechProvider || !chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
        return false;
    }
    const value = configurationService.getValue(KEYWORD_ACTIVIATION_SETTING_ID);
    return typeof value === 'string' && value !== KeywordActivationContribution.SETTINGS_VALUE.OFF;
}
let KeywordActivationContribution = class KeywordActivationContribution extends Disposable {
    static { KeywordActivationContribution_1 = this; }
    static { this.ID = 'workbench.contrib.keywordActivation'; }
    static { this.SETTINGS_VALUE = {
        OFF: 'off',
        INLINE_CHAT: 'inlineChat',
        QUICK_CHAT: 'quickChat',
        VIEW_CHAT: 'chatInView',
        CHAT_IN_CONTEXT: 'chatInContext'
    }; }
    constructor(speechService, configurationService, commandService, instantiationService, editorService, hostService, chatAgentService) {
        super();
        this.speechService = speechService;
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.editorService = editorService;
        this.hostService = hostService;
        this.chatAgentService = chatAgentService;
        this.activeSession = undefined;
        this._register(instantiationService.createInstance(KeywordActivationStatusEntry));
        this.registerListeners();
    }
    registerListeners() {
        this._register(Event.runAndSubscribe(this.speechService.onDidChangeHasSpeechProvider, () => {
            this.updateConfiguration();
            this.handleKeywordActivation();
        }));
        const onDidAddDefaultAgent = this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
                this.updateConfiguration();
                this.handleKeywordActivation();
                onDidAddDefaultAgent.dispose();
            }
        }));
        this._register(this.speechService.onDidStartSpeechToTextSession(() => this.handleKeywordActivation()));
        this._register(this.speechService.onDidEndSpeechToTextSession(() => this.handleKeywordActivation()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(KEYWORD_ACTIVIATION_SETTING_ID)) {
                this.handleKeywordActivation();
            }
        }));
    }
    updateConfiguration() {
        if (!this.speechService.hasSpeechProvider || !this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
            return; // these settings require a speech and chat provider
        }
        const registry = Registry.as(Extensions.Configuration);
        registry.registerConfiguration({
            ...accessibilityConfigurationNodeBase,
            properties: {
                [KEYWORD_ACTIVIATION_SETTING_ID]: {
                    'type': 'string',
                    'enum': [
                        KeywordActivationContribution_1.SETTINGS_VALUE.OFF,
                        KeywordActivationContribution_1.SETTINGS_VALUE.VIEW_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.QUICK_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.INLINE_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.CHAT_IN_CONTEXT
                    ],
                    'enumDescriptions': [
                        localize('voice.keywordActivation.off', "Keyword activation is disabled."),
                        localize('voice.keywordActivation.chatInView', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the chat view."),
                        localize('voice.keywordActivation.quickChat', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the quick chat."),
                        localize('voice.keywordActivation.inlineChat', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the active editor if possible."),
                        localize('voice.keywordActivation.chatInContext', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the active editor or view depending on keyboard focus.")
                    ],
                    'description': localize('voice.keywordActivation', "Controls whether the keyword phrase 'Hey Code' is recognized to start a voice chat session. Enabling this will start recording from the microphone but the audio is processed locally and never sent to a server."),
                    'default': 'off',
                    'tags': ['accessibility']
                }
            }
        });
    }
    handleKeywordActivation() {
        const enabled = supportsKeywordActivation(this.configurationService, this.speechService, this.chatAgentService) &&
            !this.speechService.hasActiveSpeechToTextSession;
        if ((enabled && this.activeSession) ||
            (!enabled && !this.activeSession)) {
            return; // already running or stopped
        }
        // Start keyword activation
        if (enabled) {
            this.enableKeywordActivation();
        }
        // Stop keyword activation
        else {
            this.disableKeywordActivation();
        }
    }
    async enableKeywordActivation() {
        const session = this.activeSession = new CancellationTokenSource();
        const result = await this.speechService.recognizeKeyword(session.token);
        if (session.token.isCancellationRequested || session !== this.activeSession) {
            return; // cancelled
        }
        this.activeSession = undefined;
        if (result === KeywordRecognitionStatus.Recognized) {
            if (this.hostService.hasFocus) {
                this.commandService.executeCommand(this.getKeywordCommand());
            }
            // Immediately start another keyboard activation session
            // because we cannot assume that the command we execute
            // will trigger a speech recognition session.
            this.handleKeywordActivation();
        }
    }
    getKeywordCommand() {
        const setting = this.configurationService.getValue(KEYWORD_ACTIVIATION_SETTING_ID);
        switch (setting) {
            case KeywordActivationContribution_1.SETTINGS_VALUE.INLINE_CHAT:
                return InlineVoiceChatAction.ID;
            case KeywordActivationContribution_1.SETTINGS_VALUE.QUICK_CHAT:
                return QuickVoiceChatAction.ID;
            case KeywordActivationContribution_1.SETTINGS_VALUE.CHAT_IN_CONTEXT: {
                const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
                if (activeCodeEditor?.hasWidgetFocus()) {
                    return InlineVoiceChatAction.ID;
                }
            }
            default:
                return VoiceChatInChatViewAction.ID;
        }
    }
    disableKeywordActivation() {
        this.activeSession?.dispose(true);
        this.activeSession = undefined;
    }
    dispose() {
        this.activeSession?.dispose();
        super.dispose();
    }
};
KeywordActivationContribution = KeywordActivationContribution_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IConfigurationService),
    __param(2, ICommandService),
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, IHostService),
    __param(6, IChatAgentService)
], KeywordActivationContribution);
export { KeywordActivationContribution };
let KeywordActivationStatusEntry = class KeywordActivationStatusEntry extends Disposable {
    static { KeywordActivationStatusEntry_1 = this; }
    static { this.STATUS_NAME = localize('keywordActivation.status.name', "Voice Keyword Activation"); }
    static { this.STATUS_COMMAND = 'keywordActivation.status.command'; }
    static { this.STATUS_ACTIVE = localize('keywordActivation.status.active', "Listening to 'Hey Code'..."); }
    static { this.STATUS_INACTIVE = localize('keywordActivation.status.inactive', "Waiting for voice chat to end..."); }
    constructor(speechService, statusbarService, commandService, configurationService, chatAgentService) {
        super();
        this.speechService = speechService;
        this.statusbarService = statusbarService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.chatAgentService = chatAgentService;
        this.entry = this._register(new MutableDisposable());
        this._register(CommandsRegistry.registerCommand(KeywordActivationStatusEntry_1.STATUS_COMMAND, () => this.commandService.executeCommand('workbench.action.openSettings', KEYWORD_ACTIVIATION_SETTING_ID)));
        this.registerListeners();
        this.updateStatusEntry();
    }
    registerListeners() {
        this._register(this.speechService.onDidStartKeywordRecognition(() => this.updateStatusEntry()));
        this._register(this.speechService.onDidEndKeywordRecognition(() => this.updateStatusEntry()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(KEYWORD_ACTIVIATION_SETTING_ID)) {
                this.updateStatusEntry();
            }
        }));
    }
    updateStatusEntry() {
        const visible = supportsKeywordActivation(this.configurationService, this.speechService, this.chatAgentService);
        if (visible) {
            if (!this.entry.value) {
                this.createStatusEntry();
            }
            this.updateStatusLabel();
        }
        else {
            this.entry.clear();
        }
    }
    createStatusEntry() {
        this.entry.value = this.statusbarService.addEntry(this.getStatusEntryProperties(), 'status.voiceKeywordActivation', 1 /* StatusbarAlignment.RIGHT */, 103);
    }
    getStatusEntryProperties() {
        return {
            name: KeywordActivationStatusEntry_1.STATUS_NAME,
            text: this.speechService.hasActiveKeywordRecognition ? '$(mic-filled)' : '$(mic)',
            tooltip: this.speechService.hasActiveKeywordRecognition ? KeywordActivationStatusEntry_1.STATUS_ACTIVE : KeywordActivationStatusEntry_1.STATUS_INACTIVE,
            ariaLabel: this.speechService.hasActiveKeywordRecognition ? KeywordActivationStatusEntry_1.STATUS_ACTIVE : KeywordActivationStatusEntry_1.STATUS_INACTIVE,
            command: KeywordActivationStatusEntry_1.STATUS_COMMAND,
            kind: 'prominent',
            showInAllWindows: true
        };
    }
    updateStatusLabel() {
        this.entry.value?.update(this.getStatusEntryProperties());
    }
};
KeywordActivationStatusEntry = KeywordActivationStatusEntry_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IStatusbarService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IChatAgentService)
], KeywordActivationStatusEntry);
//#endregion
//#region Install Provider Actions
const InstallingSpeechProvider = new RawContextKey('installingSpeechProvider', false, true);
class BaseInstallSpeechProviderAction extends Action2 {
    static { this.SPEECH_EXTENSION_ID = 'ms-vscode.vscode-speech'; }
    async run(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const dialogService = accessor.get(IDialogService);
        try {
            InstallingSpeechProvider.bindTo(contextKeyService).set(true);
            await this.installExtension(extensionsWorkbenchService, dialogService);
        }
        finally {
            InstallingSpeechProvider.bindTo(contextKeyService).reset();
        }
    }
    async installExtension(extensionsWorkbenchService, dialogService) {
        try {
            await extensionsWorkbenchService.install(BaseInstallSpeechProviderAction.SPEECH_EXTENSION_ID, {
                justification: this.getJustification(),
                enable: true
            }, 15 /* ProgressLocation.Notification */);
        }
        catch (error) {
            const { confirmed } = await dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSetupError', "An error occurred while setting up voice chat. Would you like to try again?"),
                detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                primaryButton: localize('retry', "Retry")
            });
            if (confirmed) {
                return this.installExtension(extensionsWorkbenchService, dialogService);
            }
        }
    }
}
export class InstallSpeechProviderForVoiceChatAction extends BaseInstallSpeechProviderAction {
    static { this.ID = 'workbench.action.chat.installProviderForVoiceChat'; }
    constructor() {
        super({
            id: InstallSpeechProviderForVoiceChatAction.ID,
            title: localize2('workbench.action.chat.installProviderForVoiceChat.label', "Start Voice Chat"),
            icon: Codicon.mic,
            precondition: InstallingSpeechProvider.negate(),
            menu: primaryVoiceActionMenu(HasSpeechProvider.negate())
        });
    }
    getJustification() {
        return localize('installProviderForVoiceChat.justification', "Microphone support requires this extension.");
    }
}
//#endregion
registerThemingParticipant((theme, collector) => {
    let activeRecordingColor;
    let activeRecordingDimmedColor;
    if (theme.type === ColorScheme.LIGHT || theme.type === ColorScheme.DARK) {
        activeRecordingColor = theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND) ?? theme.getColor(focusBorder);
        activeRecordingDimmedColor = activeRecordingColor?.transparent(0.38);
    }
    else {
        activeRecordingColor = theme.getColor(contrastBorder);
        activeRecordingDimmedColor = theme.getColor(contrastBorder);
    }
    // Show a "microphone" or "pulse" icon when speech-to-text or text-to-speech is in progress that glows via outline.
    collector.addRule(`
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled),
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled) {
			color: ${activeRecordingColor};
			outline: 1px solid ${activeRecordingColor};
			outline-offset: -1px;
			animation: pulseAnimation 1s infinite;
			border-radius: 50%;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::before,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::before {
			position: absolute;
			outline: 1px solid ${activeRecordingColor};
			outline-offset: 2px;
			border-radius: 50%;
			width: 16px;
			height: 16px;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::after,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::after {
			outline: 2px solid ${activeRecordingColor};
			outline-offset: -1px;
			animation: pulseAnimation 1500ms cubic-bezier(0.75, 0, 0.25, 1) infinite;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::before,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::before {
			position: absolute;
			outline: 1px solid ${activeRecordingColor};
			outline-offset: 2px;
			border-radius: 50%;
			width: 16px;
			height: 16px;
		}

		@keyframes pulseAnimation {
			0% {
				outline-width: 2px;
			}
			62% {
				outline-width: 5px;
				outline-color: ${activeRecordingDimmedColor};
			}
			100% {
				outline-width: 2px;
			}
		}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2VsZWN0cm9uLXNhbmRib3gvYWN0aW9ucy92b2ljZUNoYXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FB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