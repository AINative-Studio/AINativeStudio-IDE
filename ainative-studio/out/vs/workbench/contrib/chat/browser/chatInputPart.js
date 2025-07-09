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
var ChatInputPart_1;
import * as dom from '../../../../base/browser/dom.js';
import { addDisposableListener } from '../../../../base/browser/dom.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { HistoryNavigator2 } from '../../../../base/common/history.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorOptions } from '../../../../editor/common/config/editorOptions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchButtonBar } from '../../../../platform/actions/browser/buttonbar.js';
import { DropdownMenuActionViewItemWithKeybinding } from '../../../../platform/actions/browser/dropdownActionViewItemWithKeybinding.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions, setupSimpleEditorSelectionStyling } from '../../codeEditor/browser/simpleEditorOptions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatEntitlement, IChatEntitlementService } from '../common/chatEntitlementService.js';
import { isImageVariableEntry, isPasteVariableEntry } from '../common/chatModel.js';
import { IChatService } from '../common/chatService.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { ChatInputHistoryMaxEntries, IChatWidgetHistoryService } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode, validateChatMode } from '../common/constants.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { CancelAction, ChatEditingSessionSubmitAction, ChatSubmitAction, ChatSwitchToNextModelActionId, ToggleAgentModeActionId } from './actions/chatExecuteActions.js';
import { AttachToolsAction } from './actions/chatToolActions.js';
import { ImplicitContextAttachmentWidget } from './attachments/implicitContextAttachment.js';
import { PromptAttachmentsCollectionWidget } from './attachments/promptAttachments/promptAttachmentsCollectionWidget.js';
import { ChatAttachmentModel } from './chatAttachmentModel.js';
import { toChatVariable } from './chatAttachmentModel/chatPromptAttachmentsCollection.js';
import { DefaultChatAttachmentWidget, FileAttachmentWidget, ImageAttachmentWidget, PasteAttachmentWidget } from './chatAttachmentWidgets.js';
import { CollapsibleListPool } from './chatContentParts/chatReferencesContentPart.js';
import { ChatDragAndDrop } from './chatDragAndDrop.js';
import { ChatEditingRemoveAllFilesAction, ChatEditingShowChangesAction } from './chatEditing/chatEditingActions.js';
import { ChatFollowups } from './chatFollowups.js';
import { ChatSelectedTools } from './chatSelectedTools.js';
import { ChatFileReference } from './contrib/chatDynamicVariables/chatFileReference.js';
import { ChatImplicitContext } from './contrib/chatImplicitContext.js';
import { ChatRelatedFiles } from './contrib/chatInputRelatedFilesContrib.js';
import { resizeImage } from './imageUtils.js';
const $ = dom.$;
const INPUT_EDITOR_MAX_HEIGHT = 250;
let ChatInputPart = class ChatInputPart extends Disposable {
    static { ChatInputPart_1 = this; }
    static { this.INPUT_SCHEME = 'chatSessionInput'; }
    static { this._counter = 0; }
    get attachmentModel() {
        return this._attachmentModel;
    }
    getAttachedAndImplicitContext(sessionId) {
        const contextArr = [...this.attachmentModel.attachments];
        if (this.implicitContext?.enabled && this.implicitContext.value) {
            contextArr.push(this.implicitContext.toBaseEntry());
        }
        // factor in nested file links of a prompt into the implicit context
        const variables = this.variableService.getDynamicVariables(sessionId);
        for (const variable of variables) {
            if (!(variable instanceof ChatFileReference)) {
                continue;
            }
            // the usual URIs list of prompt instructions is `bottom-up`, therefore
            // we do the same here - first add all child references to the list
            contextArr.push(...variable.allValidReferences.map((link) => {
                return toChatVariable(link, false);
            }));
        }
        contextArr
            .push(...this.instructionAttachmentsPart.chatAttachments);
        return contextArr;
    }
    /**
     * Check if the chat input part has any prompt instruction attachments.
     */
    get hasInstructionAttachments() {
        return !this.instructionAttachmentsPart.empty;
    }
    get implicitContext() {
        return this._implicitContext;
    }
    get relatedFiles() {
        return this._relatedFiles;
    }
    get inputPartHeight() {
        return this._inputPartHeight;
    }
    get followupsHeight() {
        return this._followupsHeight;
    }
    get editSessionWidgetHeight() {
        return this._editSessionWidgetHeight;
    }
    get inputEditor() {
        return this._inputEditor;
    }
    get currentLanguageModel() {
        return this._currentLanguageModel?.identifier;
    }
    get currentMode() {
        if (this.location === ChatAgentLocation.Panel && !this.chatService.unifiedViewEnabled) {
            return ChatMode.Ask;
        }
        return this._currentMode === ChatMode.Agent && !this.agentService.hasToolsAgent ?
            ChatMode.Edit :
            this._currentMode;
    }
    get selectedElements() {
        const edits = [];
        const editsList = this._chatEditList?.object;
        const selectedElements = editsList?.getSelectedElements() ?? [];
        for (const element of selectedElements) {
            if (element.kind === 'reference' && URI.isUri(element.reference)) {
                edits.push(element.reference);
            }
        }
        return edits;
    }
    /**
     * The number of working set entries that the user actually wanted to attach.
     * This is less than or equal to {@link ChatInputPart.chatEditWorkingSetFiles}.
     */
    get attemptedWorkingSetEntriesCount() {
        return this._attemptedWorkingSetEntriesCount;
    }
    constructor(
    // private readonly editorOptions: ChatEditorOptions, // TODO this should be used
    location, options, styles, getContribsInputState, historyService, modelService, instantiationService, contextKeyService, configurationService, keybindingService, accessibilityService, languageModelsService, logService, fileService, editorService, themeService, textModelResolverService, storageService, labelService, variableService, agentService, chatService, sharedWebExtracterService, experimentService) {
        super();
        this.location = location;
        this.options = options;
        this.historyService = historyService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.fileService = fileService;
        this.editorService = editorService;
        this.themeService = themeService;
        this.textModelResolverService = textModelResolverService;
        this.storageService = storageService;
        this.labelService = labelService;
        this.variableService = variableService;
        this.agentService = agentService;
        this.chatService = chatService;
        this.sharedWebExtracterService = sharedWebExtracterService;
        this.experimentService = experimentService;
        this._onDidLoadInputState = this._register(new Emitter());
        this.onDidLoadInputState = this._onDidLoadInputState.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeContext = this._register(new Emitter());
        this.onDidChangeContext = this._onDidChangeContext.event;
        this._onDidAcceptFollowup = this._register(new Emitter());
        this.onDidAcceptFollowup = this._onDidAcceptFollowup.event;
        this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        this._onDidChangeVisibility = this._register(new Emitter());
        this._contextResourceLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event });
        this.inputEditorHeight = 0;
        this.followupsDisposables = this._register(new DisposableStore());
        this.attachedContextDisposables = this._register(new MutableDisposable());
        this._inputPartHeight = 0;
        this._followupsHeight = 0;
        this._editSessionWidgetHeight = 0;
        this._waitForPersistedLanguageModel = this._register(new MutableDisposable());
        this._onDidChangeCurrentLanguageModel = this._register(new Emitter());
        this._onDidChangeCurrentChatMode = this._register(new Emitter());
        this.onDidChangeCurrentChatMode = this._onDidChangeCurrentChatMode.event;
        this._currentMode = ChatMode.Ask;
        this.inputUri = URI.parse(`${ChatInputPart_1.INPUT_SCHEME}:input-${ChatInputPart_1._counter++}`);
        this._chatEditsActionsDisposables = this._register(new DisposableStore());
        this._chatEditsDisposables = this._register(new DisposableStore());
        this._attemptedWorkingSetEntriesCount = 0;
        this._attachmentModel = this._register(this.instantiationService.createInstance(ChatAttachmentModel));
        this.selectedToolsModel = this._register(this.instantiationService.createInstance(ChatSelectedTools));
        this.dnd = this._register(this.instantiationService.createInstance(ChatDragAndDrop, this._attachmentModel, styles));
        this.getInputState = () => {
            return {
                ...getContribsInputState(),
                chatContextAttachments: this._attachmentModel.attachments,
                chatMode: this._currentMode,
            };
        };
        this.inputEditorMaxHeight = this.options.renderStyle === 'compact' ? INPUT_EDITOR_MAX_HEIGHT / 3 : INPUT_EDITOR_MAX_HEIGHT;
        this.inputEditorHasText = ChatContextKeys.inputHasText.bindTo(contextKeyService);
        this.chatCursorAtTop = ChatContextKeys.inputCursorAtTop.bindTo(contextKeyService);
        this.inputEditorHasFocus = ChatContextKeys.inputHasFocus.bindTo(contextKeyService);
        this.promptInstructionsAttached = ChatContextKeys.instructionsAttached.bindTo(contextKeyService);
        this.chatMode = ChatContextKeys.chatMode.bindTo(contextKeyService);
        this.history = this.loadHistory();
        this._register(this.historyService.onDidClearHistory(() => this.history = new HistoryNavigator2([{ text: '' }], ChatInputHistoryMaxEntries, historyKeyFn)));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                this.inputEditor.updateOptions({ ariaLabel: this._getAriaLabel() });
            }
        }));
        this._chatEditsListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, MenuId.ChatEditingWidgetModifiedFilesToolbar));
        this._hasFileAttachmentContextKey = ChatContextKeys.hasFileAttachments.bindTo(contextKeyService);
        this.instructionAttachmentsPart = this._register(instantiationService.createInstance(PromptAttachmentsCollectionWidget, this.attachmentModel.promptInstructions, this._contextResourceLabels));
        // trigger re-layout of chat input when number of instruction attachment changes
        this.instructionAttachmentsPart.onAttachmentsCountChange(() => {
            this._onDidChangeHeight.fire();
        });
        this.initSelectedModel();
    }
    getSelectedModelStorageKey() {
        return `chat.currentLanguageModel.${this.location}`;
    }
    initSelectedModel() {
        const persistedSelection = this.storageService.get(this.getSelectedModelStorageKey(), -1 /* StorageScope.APPLICATION */);
        if (persistedSelection) {
            const model = this.languageModelsService.lookupLanguageModel(persistedSelection);
            if (model) {
                this.setCurrentLanguageModel({ metadata: model, identifier: persistedSelection });
                this.checkModelSupported();
            }
            else {
                this._waitForPersistedLanguageModel.value = this.languageModelsService.onDidChangeLanguageModels(e => {
                    const persistedModel = e.added?.find(m => m.identifier === persistedSelection);
                    if (persistedModel) {
                        this._waitForPersistedLanguageModel.clear();
                        if (persistedModel.metadata.isUserSelectable) {
                            this.setCurrentLanguageModel({ metadata: persistedModel.metadata, identifier: persistedSelection });
                            this.checkModelSupported();
                        }
                    }
                });
            }
        }
        this._register(this._onDidChangeCurrentChatMode.event(() => {
            this.checkModelSupported();
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.Edits2Enabled)) {
                this.checkModelSupported();
            }
        }));
    }
    switchToNextModel() {
        const models = this.getModels();
        if (models.length > 0) {
            const currentIndex = models.findIndex(model => model.identifier === this._currentLanguageModel?.identifier);
            const nextIndex = (currentIndex + 1) % models.length;
            this.setCurrentLanguageModel(models[nextIndex]);
        }
    }
    checkModelSupported() {
        if (this._currentLanguageModel && !this.modelSupportedForDefaultAgent(this._currentLanguageModel)) {
            this.setCurrentLanguageModelToDefault();
        }
    }
    setChatMode(mode) {
        if (!this.options.supportsChangingModes) {
            return;
        }
        mode = validateChatMode(mode) ?? (this.location === ChatAgentLocation.Panel ? ChatMode.Ask : ChatMode.Edit);
        this._currentMode = mode;
        this.chatMode.set(mode);
        this._onDidChangeCurrentChatMode.fire();
    }
    modelSupportedForDefaultAgent(model) {
        // Probably this logic could live in configuration on the agent, or somewhere else, if it gets more complex
        if (this.currentMode === ChatMode.Agent || (this.currentMode === ChatMode.Edit && this.configurationService.getValue(ChatConfiguration.Edits2Enabled))) {
            if (this.configurationService.getValue('chat.agent.allModels')) {
                return true;
            }
            const supportsToolsAgent = typeof model.metadata.capabilities?.agentMode === 'undefined' || model.metadata.capabilities.agentMode;
            // Filter out models that don't support tool calling, and models that don't support enough context to have a good experience with the tools agent
            return supportsToolsAgent && !!model.metadata.capabilities?.toolCalling;
        }
        return true;
    }
    getModels() {
        const models = this.languageModelsService.getLanguageModelIds()
            .map(modelId => ({ identifier: modelId, metadata: this.languageModelsService.lookupLanguageModel(modelId) }))
            .filter(entry => entry.metadata?.isUserSelectable && this.modelSupportedForDefaultAgent(entry));
        models.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
        return models;
    }
    setCurrentLanguageModelToDefault() {
        const defaultLanguageModelId = this.languageModelsService.getLanguageModelIds().find(id => this.languageModelsService.lookupLanguageModel(id)?.isDefault);
        const hasUserSelectableLanguageModels = this.languageModelsService.getLanguageModelIds().find(id => {
            const model = this.languageModelsService.lookupLanguageModel(id);
            return model?.isUserSelectable && !model.isDefault;
        });
        const defaultModel = hasUserSelectableLanguageModels && defaultLanguageModelId ?
            { metadata: this.languageModelsService.lookupLanguageModel(defaultLanguageModelId), identifier: defaultLanguageModelId } :
            undefined;
        if (defaultModel) {
            this.setCurrentLanguageModel(defaultModel);
        }
    }
    setCurrentLanguageModel(model) {
        this._currentLanguageModel = model;
        if (this.cachedDimensions) {
            // For quick chat and editor chat, relayout because the input may need to shrink to accomodate the model name
            this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
        }
        this.storageService.store(this.getSelectedModelStorageKey(), model.identifier, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeCurrentLanguageModel.fire(model);
    }
    loadHistory() {
        const history = this.historyService.getHistory(this.location);
        if (history.length === 0) {
            history.push({ text: '' });
        }
        return new HistoryNavigator2(history, 50, historyKeyFn);
    }
    _getAriaLabel() {
        const verbose = this.configurationService.getValue("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        if (verbose) {
            const kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            return kbLabel ? localize('actions.chat.accessibiltyHelp', "Chat Input,  Type to ask questions or type / for topics, press enter to send out the request. Use {0} for Chat Accessibility Help.", kbLabel) : localize('chatInput.accessibilityHelpNoKb', "Chat Input,  Type code here and press Enter to run. Use the Chat Accessibility Help command for more information.");
        }
        return localize('chatInput', "Chat Input");
    }
    initForNewChatModel(state, modelIsEmpty) {
        this.history = this.loadHistory();
        this.history.add({
            text: state.inputValue ?? this.history.current().text,
            state: state.inputState ?? this.getInputState()
        });
        const attachments = state.inputState?.chatContextAttachments ?? [];
        this._attachmentModel.clearAndSetContext(...attachments);
        if (state.inputValue) {
            this.setValue(state.inputValue, false);
        }
        if (state.inputState?.chatMode) {
            this.setChatMode(state.inputState.chatMode);
        }
        else if (this.location === ChatAgentLocation.EditingSession) {
            this.setChatMode(ChatMode.Edit);
        }
        if (modelIsEmpty) {
            const storageKey = this.getDefaultModeExperimentStorageKey();
            const hasSetDefaultMode = this.storageService.getBoolean(storageKey, 1 /* StorageScope.WORKSPACE */, false);
            if (!hasSetDefaultMode) {
                Promise.all([
                    this.experimentService.getTreatment('chat.defaultMode'),
                    this.experimentService.getTreatment('chat.defaultLanguageModel'),
                ]).then(([defaultModeTreatment, defaultLanguageModelTreatment]) => {
                    if (typeof defaultModeTreatment === 'string') {
                        this.storageService.store(storageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                        const defaultMode = validateChatMode(defaultModeTreatment);
                        if (defaultMode) {
                            this.logService.trace(`Applying default mode from experiment: ${defaultMode}`);
                            this.setChatMode(defaultMode);
                            this.checkModelSupported();
                        }
                    }
                    if (typeof defaultLanguageModelTreatment === 'string' && this._currentMode === ChatMode.Agent) {
                        this.storageService.store(storageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                        this.logService.trace(`Applying default language model from experiment: ${defaultLanguageModelTreatment}`);
                        this.setExpModelOrWait(defaultLanguageModelTreatment);
                    }
                });
            }
        }
    }
    setExpModelOrWait(modelId) {
        const model = this.languageModelsService.lookupLanguageModel(modelId);
        if (model) {
            this.setCurrentLanguageModel({ metadata: model, identifier: modelId });
            this.checkModelSupported();
            this._waitForPersistedLanguageModel.clear();
        }
        else {
            this._waitForPersistedLanguageModel.value = this.languageModelsService.onDidChangeLanguageModels(e => {
                const model = e.added?.find(m => m.identifier === modelId);
                if (model) {
                    this._waitForPersistedLanguageModel.clear();
                    if (model.metadata.isUserSelectable) {
                        this.setCurrentLanguageModel({ metadata: model.metadata, identifier: modelId });
                        this.checkModelSupported();
                    }
                }
            });
        }
    }
    getDefaultModeExperimentStorageKey() {
        const tag = this.options.widgetViewKindTag;
        return `chat.${tag}.hasSetDefaultModeByExperiment`;
    }
    logInputHistory() {
        const historyStr = [...this.history].map(entry => JSON.stringify(entry)).join('\n');
        this.logService.info(`[${this.location}] Chat input history:`, historyStr);
    }
    setVisible(visible) {
        this._onDidChangeVisibility.fire(visible);
    }
    get element() {
        return this.container;
    }
    async showPreviousValue() {
        const inputState = this.getInputState();
        if (this.history.isAtEnd()) {
            this.saveCurrentValue(inputState);
        }
        else {
            const currentEntry = this.getFilteredEntry(this._inputEditor.getValue(), inputState);
            if (!this.history.has(currentEntry)) {
                this.saveCurrentValue(inputState);
                this.history.resetCursor();
            }
        }
        this.navigateHistory(true);
    }
    async showNextValue() {
        const inputState = this.getInputState();
        if (this.history.isAtEnd()) {
            return;
        }
        else {
            const currentEntry = this.getFilteredEntry(this._inputEditor.getValue(), inputState);
            if (!this.history.has(currentEntry)) {
                this.saveCurrentValue(inputState);
                this.history.resetCursor();
            }
        }
        this.navigateHistory(false);
    }
    async navigateHistory(previous) {
        const historyEntry = previous ?
            this.history.previous() : this.history.next();
        let historyAttachments = historyEntry.state?.chatContextAttachments ?? [];
        // Check for images in history to restore the value.
        if (historyAttachments.length > 0) {
            historyAttachments = (await Promise.all(historyAttachments.map(async (attachment) => {
                if (attachment.isImage && attachment.references?.length && URI.isUri(attachment.references[0].reference)) {
                    const currReference = attachment.references[0].reference;
                    try {
                        const imageBinary = currReference.toString(true).startsWith('http') ? await this.sharedWebExtracterService.readImage(currReference, CancellationToken.None) : (await this.fileService.readFile(currReference)).value;
                        if (!imageBinary) {
                            return undefined;
                        }
                        const newAttachment = { ...attachment };
                        newAttachment.value = (isImageVariableEntry(attachment) && attachment.isPasted) ? imageBinary.buffer : await resizeImage(imageBinary.buffer); // if pasted image, we do not need to resize.
                        return newAttachment;
                    }
                    catch (err) {
                        this.logService.error('Failed to fetch and reference.', err);
                        return undefined;
                    }
                }
                return attachment;
            }))).filter(attachment => attachment !== undefined);
        }
        this._attachmentModel.clearAndSetContext(...historyAttachments);
        aria.status(historyEntry.text);
        this.setValue(historyEntry.text, true);
        this._onDidLoadInputState.fire(historyEntry.state);
        const model = this._inputEditor.getModel();
        if (!model) {
            return;
        }
        if (previous) {
            const endOfFirstViewLine = this._inputEditor._getViewModel()?.getLineLength(1) ?? 1;
            const endOfFirstModelLine = model.getLineLength(1);
            if (endOfFirstViewLine === endOfFirstModelLine) {
                // Not wrapped - set cursor to the end of the first line
                this._inputEditor.setPosition({ lineNumber: 1, column: endOfFirstViewLine + 1 });
            }
            else {
                // Wrapped - set cursor one char short of the end of the first view line.
                // If it's after the next character, the cursor shows on the second line.
                this._inputEditor.setPosition({ lineNumber: 1, column: endOfFirstViewLine });
            }
        }
        else {
            this._inputEditor.setPosition(getLastPosition(model));
        }
    }
    setValue(value, transient) {
        this.inputEditor.setValue(value);
        // always leave cursor at the end
        this.inputEditor.setPosition({ lineNumber: 1, column: value.length + 1 });
        if (!transient) {
            this.saveCurrentValue(this.getInputState());
        }
    }
    saveCurrentValue(inputState) {
        const newEntry = this.getFilteredEntry(this._inputEditor.getValue(), inputState);
        this.history.replaceLast(newEntry);
    }
    focus() {
        this._inputEditor.focus();
    }
    hasFocus() {
        return this._inputEditor.hasWidgetFocus();
    }
    /**
     * Reset the input and update history.
     * @param userQuery If provided, this will be added to the history. Followups and programmatic queries should not be passed.
     */
    async acceptInput(isUserQuery) {
        if (isUserQuery) {
            const userQuery = this._inputEditor.getValue();
            const inputState = this.getInputState();
            const entry = this.getFilteredEntry(userQuery, inputState);
            this.history.replaceLast(entry);
            this.history.add({ text: '' });
        }
        // Clear attached context, fire event to clear input state, and clear the input editor
        this.attachmentModel.clear();
        this._onDidLoadInputState.fire({});
        if (this.accessibilityService.isScreenReaderOptimized() && isMacintosh) {
            this._acceptInputForVoiceover();
        }
        else {
            this._inputEditor.focus();
            this._inputEditor.setValue('');
        }
    }
    validateCurrentMode() {
        if (!this.agentService.hasToolsAgent && this._currentMode === ChatMode.Agent) {
            this.setChatMode(ChatMode.Edit);
        }
    }
    // A funtion that filters out specifically the `value` property of the attachment.
    getFilteredEntry(query, inputState) {
        const attachmentsWithoutImageValues = inputState.chatContextAttachments?.map(attachment => {
            if (attachment.isImage && attachment.references?.length && attachment.value) {
                const newAttachment = { ...attachment };
                newAttachment.value = undefined;
                return newAttachment;
            }
            return attachment;
        });
        inputState.chatContextAttachments = attachmentsWithoutImageValues;
        const newEntry = {
            text: query,
            state: inputState,
        };
        return newEntry;
    }
    _acceptInputForVoiceover() {
        const domNode = this._inputEditor.getDomNode();
        if (!domNode) {
            return;
        }
        // Remove the input editor from the DOM temporarily to prevent VoiceOver
        // from reading the cleared text (the request) to the user.
        domNode.remove();
        this._inputEditor.setValue('');
        this._inputEditorElement.appendChild(domNode);
        this._inputEditor.focus();
    }
    _handleAttachedContextChange() {
        this._hasFileAttachmentContextKey.set(Boolean(this._attachmentModel.attachments.find(a => a.isFile)));
        this.renderAttachedContext();
    }
    render(container, initialValue, widget) {
        let elements;
        if (this.options.renderStyle === 'compact') {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-and-edit-session', [
                    dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                    dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                        dom.h('.chat-input-container@inputContainer', [
                            dom.h('.chat-editor-container@editorContainer'),
                            dom.h('.chat-input-toolbars@inputToolbars'),
                        ]),
                    ]),
                    dom.h('.chat-attachments-container@attachmentsContainer', [
                        dom.h('.chat-attachment-toolbar@attachmentToolbar'),
                        dom.h('.chat-attached-context@attachedContextContainer'),
                        dom.h('.chat-related-files@relatedFilesContainer'),
                    ]),
                    dom.h('.interactive-input-followups@followupsContainer'),
                ])
            ]);
        }
        else {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-followups@followupsContainer'),
                dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                    dom.h('.chat-input-container@inputContainer', [
                        dom.h('.chat-attachments-container@attachmentsContainer', [
                            dom.h('.chat-attachment-toolbar@attachmentToolbar'),
                            dom.h('.chat-related-files@relatedFilesContainer'),
                            dom.h('.chat-attached-context@attachedContextContainer'),
                        ]),
                        dom.h('.chat-editor-container@editorContainer'),
                        dom.h('.chat-input-toolbars@inputToolbars'),
                    ]),
                ]),
            ]);
        }
        this.container = elements.root;
        container.append(this.container);
        this.container.classList.toggle('compact', this.options.renderStyle === 'compact');
        this.followupsContainer = elements.followupsContainer;
        const inputAndSideToolbar = elements.inputAndSideToolbar; // The chat input and toolbar to the right
        const inputContainer = elements.inputContainer; // The chat editor, attachments, and toolbars
        const editorContainer = elements.editorContainer;
        this.attachmentsContainer = elements.attachmentsContainer;
        this.attachedContextContainer = elements.attachedContextContainer;
        this.relatedFilesContainer = elements.relatedFilesContainer;
        const toolbarsContainer = elements.inputToolbars;
        const attachmentToolbarContainer = elements.attachmentToolbar;
        this.chatEditingSessionWidgetContainer = elements.chatEditingSessionWidgetContainer;
        if (this.options.enableImplicitContext) {
            this._implicitContext = this._register(new ChatImplicitContext());
            this._register(this._implicitContext.onDidChangeValue(() => this._handleAttachedContextChange()));
        }
        this.renderAttachedContext();
        this._register(this._attachmentModel.onDidChangeContext(() => this._handleAttachedContextChange()));
        this.renderChatEditingSessionState(null);
        if (this.options.renderWorkingSet) {
            this._relatedFiles = this._register(new ChatRelatedFiles());
            this._register(this._relatedFiles.onDidChange(() => this.renderChatRelatedFiles()));
        }
        this.renderChatRelatedFiles();
        this.dnd.addOverlay(container, container);
        const inputScopedContextKeyService = this._register(this.contextKeyService.createScoped(inputContainer));
        ChatContextKeys.inChatInput.bindTo(inputScopedContextKeyService).set(true);
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, inputScopedContextKeyService])));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(inputScopedContextKeyService, this));
        this.historyNavigationBackwardsEnablement = historyNavigationBackwardsEnablement;
        this.historyNavigationForewardsEnablement = historyNavigationForwardsEnablement;
        const options = getSimpleEditorOptions(this.configurationService);
        options.overflowWidgetsDomNode = this.options.editorOverflowWidgetsDomNode;
        options.pasteAs = EditorOptions.pasteAs.defaultValue;
        options.readOnly = false;
        options.ariaLabel = this._getAriaLabel();
        options.fontFamily = DEFAULT_FONT_FAMILY;
        options.fontSize = 13;
        options.lineHeight = 20;
        options.padding = this.options.renderStyle === 'compact' ? { top: 2, bottom: 2 } : { top: 8, bottom: 8 };
        options.cursorWidth = 1;
        options.wrappingStrategy = 'advanced';
        options.bracketPairColorization = { enabled: false };
        options.suggest = {
            showIcons: true,
            showSnippets: false,
            showWords: true,
            showStatusBar: false,
            insertMode: 'replace',
        };
        options.scrollbar = { ...(options.scrollbar ?? {}), vertical: 'hidden' };
        options.stickyScroll = { enabled: false };
        this._inputEditorElement = dom.append(editorContainer, $(chatInputEditorContainerSelector));
        const editorOptions = getSimpleCodeEditorWidgetOptions();
        editorOptions.contributions?.push(...EditorExtensionsRegistry.getSomeEditorContributions([ContentHoverController.ID, GlyphHoverController.ID, CopyPasteController.ID, LinkDetector.ID]));
        this._inputEditor = this._register(scopedInstantiationService.createInstance(CodeEditorWidget, this._inputEditorElement, options, editorOptions));
        SuggestController.get(this._inputEditor)?.forceRenderingAbove();
        options.overflowWidgetsDomNode?.classList.add('hideSuggestTextIcons');
        this._inputEditorElement.classList.add('hideSuggestTextIcons');
        this._register(this._inputEditor.onDidChangeModelContent(() => {
            const currentHeight = Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight);
            if (currentHeight !== this.inputEditorHeight) {
                this.inputEditorHeight = currentHeight;
                this._onDidChangeHeight.fire();
            }
            const model = this._inputEditor.getModel();
            const inputHasText = !!model && model.getValue().trim().length > 0;
            this.inputEditorHasText.set(inputHasText);
        }));
        this._register(this._inputEditor.onDidContentSizeChange(e => {
            if (e.contentHeightChanged) {
                this.inputEditorHeight = e.contentHeight;
                this._onDidChangeHeight.fire();
            }
        }));
        this._register(this._inputEditor.onDidFocusEditorText(() => {
            this.inputEditorHasFocus.set(true);
            this._onDidFocus.fire();
            inputContainer.classList.toggle('focused', true);
        }));
        this._register(this._inputEditor.onDidBlurEditorText(() => {
            this.inputEditorHasFocus.set(false);
            inputContainer.classList.toggle('focused', false);
            this._onDidBlur.fire();
        }));
        this._register(this._inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this._inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this._inputEditor)?.clearWidgets();
        }));
        const hoverDelegate = this._register(createInstantHoverDelegate());
        this._register(dom.addStandardDisposableListener(toolbarsContainer, dom.EventType.CLICK, e => this.inputEditor.focus()));
        this._register(dom.addStandardDisposableListener(this.attachmentsContainer, dom.EventType.CLICK, e => this.inputEditor.focus()));
        this.inputActionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarsContainer, MenuId.ChatInput, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: { shouldForwardArgs: true },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            hoverDelegate
        }));
        this.inputActionsToolbar.context = { widget };
        this._register(this.inputActionsToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions && typeof this.cachedInputToolbarWidth === 'number' && this.cachedInputToolbarWidth !== this.inputActionsToolbar.getItemsWidth()) {
                this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
            }
        }));
        this.executeToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarsContainer, this.options.menus.executeToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: {
                shouldForwardArgs: true
            },
            hoverDelegate,
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */, // keep it lean when hiding items and avoid a "..." overflow menu
            actionViewItemProvider: (action, options) => {
                if (this.location === ChatAgentLocation.Panel || this.location === ChatAgentLocation.Editor) {
                    if ((action.id === ChatSubmitAction.ID || action.id === CancelAction.ID || action.id === ChatEditingSessionSubmitAction.ID) && action instanceof MenuItemAction) {
                        const dropdownAction = this.instantiationService.createInstance(MenuItemAction, { id: 'chat.moreExecuteActions', title: localize('notebook.moreExecuteActionsLabel', "More..."), icon: Codicon.chevronDown }, undefined, undefined, undefined, undefined);
                        return this.instantiationService.createInstance(ChatSubmitDropdownActionItem, action, dropdownAction, { ...options, menuAsChild: false });
                    }
                }
                if (action.id === ChatSwitchToNextModelActionId && action instanceof MenuItemAction) {
                    if (!this._currentLanguageModel) {
                        this.setCurrentLanguageModelToDefault();
                    }
                    if (this._currentLanguageModel) {
                        const itemDelegate = {
                            onDidChangeModel: this._onDidChangeCurrentLanguageModel.event,
                            setModel: (model) => {
                                // The user changed the language model, so we don't wait for the persisted option to be registered
                                this._waitForPersistedLanguageModel.clear();
                                this.setCurrentLanguageModel(model);
                                this.renderAttachedContext();
                            },
                            getModels: () => this.getModels()
                        };
                        return this.instantiationService.createInstance(ModelPickerActionViewItem, action, this._currentLanguageModel, itemDelegate);
                    }
                }
                else if (action.id === ToggleAgentModeActionId && action instanceof MenuItemAction) {
                    const delegate = {
                        getMode: () => this.currentMode,
                        onDidChangeMode: this._onDidChangeCurrentChatMode.event
                    };
                    return this.instantiationService.createInstance(ToggleChatModeActionViewItem, action, delegate);
                }
                return undefined;
            }
        }));
        this.executeToolbar.getElement().classList.add('chat-execute-toolbar');
        this.executeToolbar.context = { widget };
        this._register(this.executeToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions && typeof this.cachedExecuteToolbarWidth === 'number' && this.cachedExecuteToolbarWidth !== this.executeToolbar.getItemsWidth()) {
                this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
            }
        }));
        if (this.options.menus.inputSideToolbar) {
            const toolbarSide = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, inputAndSideToolbar, this.options.menus.inputSideToolbar, {
                telemetrySource: this.options.menus.telemetrySource,
                menuOptions: {
                    shouldForwardArgs: true
                },
                hoverDelegate
            }));
            this.inputSideToolbarContainer = toolbarSide.getElement();
            toolbarSide.getElement().classList.add('chat-side-toolbar');
            toolbarSide.context = { widget };
        }
        let inputModel = this.modelService.getModel(this.inputUri);
        if (!inputModel) {
            inputModel = this.modelService.createModel('', null, this.inputUri, true);
        }
        this.textModelResolverService.createModelReference(this.inputUri).then(ref => {
            // make sure to hold a reference so that the model doesn't get disposed by the text model service
            if (this._store.isDisposed) {
                ref.dispose();
                return;
            }
            this._register(ref);
        });
        this.inputModel = inputModel;
        this.inputModel.updateOptions({ bracketColorizationOptions: { enabled: false, independentColorPoolPerBracketType: false } });
        this._inputEditor.setModel(this.inputModel);
        if (initialValue) {
            this.inputModel.setValue(initialValue);
            const lineNumber = this.inputModel.getLineCount();
            this._inputEditor.setPosition({ lineNumber, column: this.inputModel.getLineMaxColumn(lineNumber) });
        }
        const onDidChangeCursorPosition = () => {
            const model = this._inputEditor.getModel();
            if (!model) {
                return;
            }
            const position = this._inputEditor.getPosition();
            if (!position) {
                return;
            }
            const atTop = position.lineNumber === 1 && position.column - 1 <= (this._inputEditor._getViewModel()?.getLineLength(1) ?? 0);
            this.chatCursorAtTop.set(atTop);
            this.historyNavigationBackwardsEnablement.set(atTop);
            this.historyNavigationForewardsEnablement.set(position.equals(getLastPosition(model)));
        };
        this._register(this._inputEditor.onDidChangeCursorPosition(e => onDidChangeCursorPosition()));
        onDidChangeCursorPosition();
        this._register(this.themeService.onDidFileIconThemeChange(() => {
            this.renderAttachedContext();
        }));
        this.addFilesToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, attachmentToolbarContainer, MenuId.ChatInputAttachmentToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            label: true,
            menuOptions: { shouldForwardArgs: true, renderShortTitle: true },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            hoverDelegate,
            actionViewItemProvider: (action, options) => {
                if (action.id === 'workbench.action.chat.editing.attachContext' || action.id === 'workbench.action.chat.attachContext') {
                    const viewItem = this.instantiationService.createInstance(AddFilesButton, undefined, action, options);
                    return viewItem;
                }
                if (action.id === AttachToolsAction.id) {
                    return this.selectedToolsModel.toolsActionItemViewItemProvider(action, options);
                }
                return undefined;
            }
        }));
        this.addFilesToolbar.context = { widget, placeholder: localize('chatAttachFiles', 'Search for files and context to add to your request') };
        this._register(this.addFilesToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions) {
                this._onDidChangeHeight.fire();
            }
        }));
        this._register(this.selectedToolsModel.toolsActionItemViewItemProvider.onDidRender(() => this._onDidChangeHeight.fire()));
    }
    renderAttachedContext() {
        const container = this.attachedContextContainer;
        // Note- can't measure attachedContextContainer, because it has `display: contents`, so measure the parent to check for height changes
        const oldHeight = this.attachmentsContainer.offsetHeight;
        const store = new DisposableStore();
        this.attachedContextDisposables.value = store;
        dom.clearNode(container);
        const hoverDelegate = store.add(createInstantHoverDelegate());
        const attachments = [...this.attachmentModel.attachments.entries()];
        const hasAttachments = Boolean(attachments.length) || Boolean(this.implicitContext?.value) || !this.instructionAttachmentsPart.empty;
        dom.setVisibility(Boolean(hasAttachments || (this.addFilesToolbar && !this.addFilesToolbar.isEmpty())), this.attachmentsContainer);
        dom.setVisibility(hasAttachments, this.attachedContextContainer);
        if (!attachments.length) {
            this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        }
        if (this.implicitContext?.value) {
            const implicitPart = store.add(this.instantiationService.createInstance(ImplicitContextAttachmentWidget, this.implicitContext, this._contextResourceLabels));
            container.appendChild(implicitPart.domNode);
        }
        this.promptInstructionsAttached.set(!this.instructionAttachmentsPart.empty);
        this.instructionAttachmentsPart.render(container);
        for (const [index, attachment] of attachments) {
            const resource = URI.isUri(attachment.value) ? attachment.value : attachment.value && typeof attachment.value === 'object' && 'uri' in attachment.value && URI.isUri(attachment.value.uri) ? attachment.value.uri : undefined;
            const range = attachment.value && typeof attachment.value === 'object' && 'range' in attachment.value && Range.isIRange(attachment.value.range) ? attachment.value.range : undefined;
            const shouldFocusClearButton = index === Math.min(this._indexOfLastAttachedContextDeletedWithKeyboard, this.attachmentModel.size - 1);
            let attachmentWidget;
            if (resource && (attachment.isFile || attachment.isDirectory)) {
                attachmentWidget = this.instantiationService.createInstance(FileAttachmentWidget, resource, range, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (attachment.isImage) {
                attachmentWidget = this.instantiationService.createInstance(ImageAttachmentWidget, resource, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isPasteVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PasteAttachmentWidget, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            else {
                attachmentWidget = this.instantiationService.createInstance(DefaultChatAttachmentWidget, resource, range, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            store.add(attachmentWidget);
            store.add(attachmentWidget.onDidDelete((e) => {
                this.handleAttachmentDeletion(e, index, attachment);
            }));
        }
        if (oldHeight !== this.attachmentsContainer.offsetHeight) {
            this._onDidChangeHeight.fire();
        }
    }
    handleAttachmentDeletion(e, index, attachment) {
        this._attachmentModel.delete(attachment.id);
        // Set focus to the next attached context item if deletion was triggered by a keystroke (vs a mouse click)
        if (dom.isKeyboardEvent(e)) {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                this._indexOfLastAttachedContextDeletedWithKeyboard = index;
            }
        }
        if (this._attachmentModel.size === 0) {
            this.focus();
        }
        this._onDidChangeContext.fire({ removed: [attachment] });
    }
    async renderChatEditingSessionState(chatEditingSession) {
        dom.setVisibility(Boolean(chatEditingSession), this.chatEditingSessionWidgetContainer);
        const seenEntries = new ResourceSet();
        const entries = chatEditingSession?.entries.get().map((entry) => {
            seenEntries.add(entry.modifiedURI);
            return {
                reference: entry.modifiedURI,
                state: entry.state.get(),
                kind: 'reference',
            };
        }) ?? [];
        if (!chatEditingSession || !this.options.renderWorkingSet || !entries.length) {
            dom.clearNode(this.chatEditingSessionWidgetContainer);
            this._chatEditsDisposables.clear();
            this._chatEditList = undefined;
            return;
        }
        // Summary of number of files changed
        const innerContainer = this.chatEditingSessionWidgetContainer.querySelector('.chat-editing-session-container.show-file-icons') ?? dom.append(this.chatEditingSessionWidgetContainer, $('.chat-editing-session-container.show-file-icons'));
        for (const entry of chatEditingSession.entries.get()) {
            if (!seenEntries.has(entry.modifiedURI)) {
                entries.unshift({
                    reference: entry.modifiedURI,
                    state: entry.state.get(),
                    kind: 'reference',
                });
                seenEntries.add(entry.modifiedURI);
            }
        }
        entries.sort((a, b) => {
            if (a.kind === 'reference' && b.kind === 'reference') {
                if (a.state === b.state || a.state === undefined || b.state === undefined) {
                    return a.reference.toString().localeCompare(b.reference.toString());
                }
                return a.state - b.state;
            }
            return 0;
        });
        const overviewRegion = innerContainer.querySelector('.chat-editing-session-overview') ?? dom.append(innerContainer, $('.chat-editing-session-overview'));
        const overviewTitle = overviewRegion.querySelector('.working-set-title') ?? dom.append(overviewRegion, $('.working-set-title'));
        const overviewFileCount = overviewTitle.querySelector('span.working-set-count') ?? dom.append(overviewTitle, $('span.working-set-count'));
        overviewFileCount.textContent = entries.length === 1 ? localize('chatEditingSession.oneFile.1', '1 file changed') : localize('chatEditingSession.manyFiles.1', '{0} files changed', entries.length);
        overviewTitle.ariaLabel = overviewFileCount.textContent;
        overviewTitle.tabIndex = 0;
        // Clear out the previous actions (if any)
        this._chatEditsActionsDisposables.clear();
        // Chat editing session actions
        const actionsContainer = overviewRegion.querySelector('.chat-editing-session-actions') ?? dom.append(overviewRegion, $('.chat-editing-session-actions'));
        this._chatEditsActionsDisposables.add(this.instantiationService.createInstance(MenuWorkbenchButtonBar, actionsContainer, MenuId.ChatEditingWidgetToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: {
                arg: { sessionId: chatEditingSession.chatSessionId },
            },
            buttonConfigProvider: (action) => {
                if (action.id === ChatEditingShowChangesAction.ID || action.id === ChatEditingRemoveAllFilesAction.ID) {
                    return { showIcon: true, showLabel: false, isSecondary: true };
                }
                return undefined;
            }
        }));
        if (!chatEditingSession) {
            return;
        }
        // Working set
        const workingSetContainer = innerContainer.querySelector('.chat-editing-session-list') ?? dom.append(innerContainer, $('.chat-editing-session-list'));
        if (!this._chatEditList) {
            this._chatEditList = this._chatEditsListPool.get();
            const list = this._chatEditList.object;
            this._chatEditsDisposables.add(this._chatEditList);
            this._chatEditsDisposables.add(list.onDidFocus(() => {
                this._onDidFocus.fire();
            }));
            this._chatEditsDisposables.add(list.onDidOpen(async (e) => {
                if (e.element?.kind === 'reference' && URI.isUri(e.element.reference)) {
                    const modifiedFileUri = e.element.reference;
                    const entry = chatEditingSession.getEntry(modifiedFileUri);
                    const pane = await this.editorService.openEditor({
                        resource: modifiedFileUri,
                        options: e.editorOptions
                    }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                    if (pane) {
                        entry?.getEditorIntegration(pane).reveal(true);
                    }
                }
            }));
            this._chatEditsDisposables.add(addDisposableListener(list.getHTMLElement(), 'click', e => {
                if (!this.hasFocus()) {
                    this._onDidFocus.fire();
                }
            }, true));
            dom.append(workingSetContainer, list.getHTMLElement());
            dom.append(innerContainer, workingSetContainer);
        }
        const maxItemsShown = 6;
        const itemsShown = Math.min(entries.length, maxItemsShown);
        const height = itemsShown * 22;
        const list = this._chatEditList.object;
        list.layout(height);
        list.getHTMLElement().style.height = `${height}px`;
        list.splice(0, list.length, entries);
        this._onDidChangeHeight.fire();
    }
    async renderChatRelatedFiles() {
        const anchor = this.relatedFilesContainer;
        dom.clearNode(anchor);
        const shouldRender = this.configurationService.getValue('chat.renderRelatedFiles');
        dom.setVisibility(Boolean(this.relatedFiles?.value.length && shouldRender), anchor);
        if (!shouldRender || !this.relatedFiles?.value.length) {
            return;
        }
        const hoverDelegate = getDefaultHoverDelegate('element');
        for (const { uri, description } of this.relatedFiles.value) {
            const uriLabel = this._chatEditsActionsDisposables.add(new Button(anchor, {
                supportIcons: true,
                secondary: true,
                hoverDelegate
            }));
            uriLabel.label = this.labelService.getUriBasenameLabel(uri);
            uriLabel.element.classList.add('monaco-icon-label');
            uriLabel.element.title = localize('suggeste.title', "{0} - {1}", this.labelService.getUriLabel(uri, { relative: true }), description ?? '');
            this._chatEditsActionsDisposables.add(uriLabel.onDidClick(async () => {
                group.remove(); // REMOVE asap
                await this._attachmentModel.addFile(uri);
                this.relatedFiles?.remove(uri);
            }));
            const addButton = this._chatEditsActionsDisposables.add(new Button(anchor, {
                supportIcons: false,
                secondary: true,
                hoverDelegate,
                ariaLabel: localize('chatEditingSession.addSuggestion', 'Add suggestion {0}', this.labelService.getUriLabel(uri, { relative: true })),
            }));
            addButton.icon = Codicon.add;
            addButton.setTitle(localize('chatEditingSession.addSuggested', 'Add suggestion'));
            this._chatEditsActionsDisposables.add(addButton.onDidClick(async () => {
                group.remove(); // REMOVE asap
                await this._attachmentModel.addFile(uri);
                this.relatedFiles?.remove(uri);
            }));
            const sep = document.createElement('div');
            sep.classList.add('separator');
            const group = document.createElement('span');
            group.classList.add('monaco-button-dropdown', 'sidebyside-button');
            group.appendChild(addButton.element);
            group.appendChild(sep);
            group.appendChild(uriLabel.element);
            dom.append(anchor, group);
            this._chatEditsActionsDisposables.add(toDisposable(() => {
                group.remove();
            }));
        }
        this._onDidChangeHeight.fire();
    }
    async renderFollowups(items, response) {
        if (!this.options.renderFollowups) {
            return;
        }
        this.followupsDisposables.clear();
        dom.clearNode(this.followupsContainer);
        if (items && items.length > 0) {
            this.followupsDisposables.add(this.instantiationService.createInstance(ChatFollowups, this.followupsContainer, items, this.location, undefined, followup => this._onDidAcceptFollowup.fire({ followup, response })));
        }
        this._onDidChangeHeight.fire();
    }
    get contentHeight() {
        const data = this.getLayoutData();
        return data.followupsHeight + data.inputPartEditorHeight + data.inputPartVerticalPadding + data.inputEditorBorder + data.attachmentsHeight + data.toolbarsHeight + data.chatEditingStateHeight;
    }
    layout(height, width) {
        this.cachedDimensions = new dom.Dimension(width, height);
        return this._layout(height, width);
    }
    _layout(height, width, allowRecurse = true) {
        const data = this.getLayoutData();
        const inputEditorHeight = Math.min(data.inputPartEditorHeight, height - data.followupsHeight - data.attachmentsHeight - data.inputPartVerticalPadding - data.toolbarsHeight);
        const followupsWidth = width - data.inputPartHorizontalPadding;
        this.followupsContainer.style.width = `${followupsWidth}px`;
        this._inputPartHeight = data.inputPartVerticalPadding + data.followupsHeight + inputEditorHeight + data.inputEditorBorder + data.attachmentsHeight + data.toolbarsHeight + data.chatEditingStateHeight;
        this._followupsHeight = data.followupsHeight;
        this._editSessionWidgetHeight = data.chatEditingStateHeight;
        const initialEditorScrollWidth = this._inputEditor.getScrollWidth();
        const newEditorWidth = width - data.inputPartHorizontalPadding - data.editorBorder - data.inputPartHorizontalPaddingInside - data.toolbarsWidth - data.sideToolbarWidth;
        const newDimension = { width: newEditorWidth, height: inputEditorHeight };
        if (!this.previousInputEditorDimension || (this.previousInputEditorDimension.width !== newDimension.width || this.previousInputEditorDimension.height !== newDimension.height)) {
            // This layout call has side-effects that are hard to understand. eg if we are calling this inside a onDidChangeContent handler, this can trigger the next onDidChangeContent handler
            // to be invoked, and we have a lot of these on this editor. Only doing a layout this when the editor size has actually changed makes it much easier to follow.
            this._inputEditor.layout(newDimension);
            this.previousInputEditorDimension = newDimension;
        }
        if (allowRecurse && initialEditorScrollWidth < 10) {
            // This is probably the initial layout. Now that the editor is layed out with its correct width, it should report the correct contentHeight
            return this._layout(height, width, false);
        }
    }
    getLayoutData() {
        const executeToolbarWidth = this.cachedExecuteToolbarWidth = this.executeToolbar.getItemsWidth();
        const inputToolbarWidth = this.cachedInputToolbarWidth = this.inputActionsToolbar.getItemsWidth();
        const executeToolbarPadding = (this.executeToolbar.getItemsLength() - 1) * 4;
        const inputToolbarPadding = this.inputActionsToolbar.getItemsLength() ? (this.inputActionsToolbar.getItemsLength() - 1) * 4 : 0;
        return {
            inputEditorBorder: 2,
            followupsHeight: this.followupsContainer.offsetHeight,
            inputPartEditorHeight: Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight),
            inputPartHorizontalPadding: this.options.renderStyle === 'compact' ? 16 : 32,
            inputPartVerticalPadding: this.options.renderStyle === 'compact' ? 12 : 28,
            attachmentsHeight: this.attachmentsContainer.offsetHeight + (this.attachmentsContainer.checkVisibility() ? 6 : 0),
            editorBorder: 2,
            inputPartHorizontalPaddingInside: 12,
            toolbarsWidth: this.options.renderStyle === 'compact' ? executeToolbarWidth + executeToolbarPadding + inputToolbarWidth + inputToolbarPadding : 0,
            toolbarsHeight: this.options.renderStyle === 'compact' ? 0 : 22,
            chatEditingStateHeight: this.chatEditingSessionWidgetContainer.offsetHeight,
            sideToolbarWidth: this.inputSideToolbarContainer ? dom.getTotalWidth(this.inputSideToolbarContainer) + 4 /*gap*/ : 0,
        };
    }
    getViewState() {
        return this.getInputState();
    }
    saveState() {
        if (this.history.isAtEnd()) {
            this.saveCurrentValue(this.getInputState());
        }
        const inputHistory = [...this.history];
        this.historyService.saveHistory(this.location, inputHistory);
    }
};
ChatInputPart = ChatInputPart_1 = __decorate([
    __param(4, IChatWidgetHistoryService),
    __param(5, IModelService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IConfigurationService),
    __param(9, IKeybindingService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageModelsService),
    __param(12, ILogService),
    __param(13, IFileService),
    __param(14, IEditorService),
    __param(15, IThemeService),
    __param(16, ITextModelService),
    __param(17, IStorageService),
    __param(18, ILabelService),
    __param(19, IChatVariablesService),
    __param(20, IChatAgentService),
    __param(21, IChatService),
    __param(22, ISharedWebContentExtractorService),
    __param(23, IWorkbenchAssignmentService)
], ChatInputPart);
export { ChatInputPart };
const historyKeyFn = (entry) => JSON.stringify({ ...entry, state: { ...entry.state, chatMode: undefined } });
function getLastPosition(model) {
    return { lineNumber: model.getLineCount(), column: model.getLineLength(model.getLineCount()) + 1 };
}
// This does seems like a lot just to customize an item with dropdown. This whole class exists just because we need an
// onDidChange listener on the submenu, which is apparently not needed in other cases.
let ChatSubmitDropdownActionItem = class ChatSubmitDropdownActionItem extends DropdownWithPrimaryActionViewItem {
    constructor(action, dropdownAction, options, menuService, contextMenuService, contextKeyService, keybindingService, notificationService, themeService, accessibilityService) {
        super(action, dropdownAction, [], '', {
            ...options,
            getKeyBinding: (action) => keybindingService.lookupKeybinding(action.id, contextKeyService)
        }, contextMenuService, keybindingService, notificationService, contextKeyService, themeService, accessibilityService);
        const menu = menuService.createMenu(MenuId.ChatExecuteSecondary, contextKeyService);
        const setActions = () => {
            const secondary = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            this.update(dropdownAction, secondary);
        };
        setActions();
        this._register(menu.onDidChange(() => setActions()));
    }
};
ChatSubmitDropdownActionItem = __decorate([
    __param(3, IMenuService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IKeybindingService),
    __param(7, INotificationService),
    __param(8, IThemeService),
    __param(9, IAccessibilityService)
], ChatSubmitDropdownActionItem);
let ModelPickerActionViewItem = class ModelPickerActionViewItem extends DropdownMenuActionViewItemWithKeybinding {
    constructor(action, currentLanguageModel, delegate, contextMenuService, keybindingService, contextKeyService, chatEntitlementService, commandService, menuService, telemetryService) {
        const modelActionsProvider = {
            getActions: () => {
                const setLanguageModelAction = (entry) => {
                    return {
                        id: entry.identifier,
                        label: entry.metadata.name,
                        tooltip: '',
                        class: undefined,
                        enabled: true,
                        checked: entry.identifier === this.currentLanguageModel.identifier,
                        run: () => {
                            this.currentLanguageModel = entry;
                            this.renderLabel(this.element);
                            this.delegate.setModel(entry);
                        }
                    };
                };
                const models = this.delegate.getModels();
                const actions = models.map(entry => setLanguageModelAction(entry));
                // Add menu contributions from extensions
                const menuActions = menuService.getMenuActions(MenuId.ChatModelPicker, contextKeyService);
                const menuContributions = getFlatActionBarActions(menuActions);
                if (menuContributions.length > 0 || chatEntitlementService.entitlement === ChatEntitlement.Limited) {
                    actions.push(new Separator());
                }
                actions.push(...menuContributions);
                if (chatEntitlementService.entitlement === ChatEntitlement.Limited) {
                    actions.push(toAction({
                        id: 'moreModels', label: localize('chat.moreModels', "Add more Models"), run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-models' });
                            commandService.executeCommand(commandId);
                        }
                    }));
                }
                return actions;
            }
        };
        const actionWithLabel = {
            ...action,
            tooltip: localize('chat.modelPicker.label', "Pick Model"),
            run: () => { }
        };
        super(actionWithLabel, modelActionsProvider, contextMenuService, undefined, keybindingService, contextKeyService);
        this.currentLanguageModel = currentLanguageModel;
        this.delegate = delegate;
        this._register(delegate.onDidChangeModel(modelId => {
            this.currentLanguageModel = modelId;
            this.renderLabel(this.element);
        }));
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        dom.reset(element, dom.$('span.chat-model-label', undefined, this.currentLanguageModel.metadata.name), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModelPickerActionViewItem = __decorate([
    __param(3, IContextMenuService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, IChatEntitlementService),
    __param(7, ICommandService),
    __param(8, IMenuService),
    __param(9, ITelemetryService)
], ModelPickerActionViewItem);
const chatInputEditorContainerSelector = '.interactive-input-editor';
setupSimpleEditorSelectionStyling(chatInputEditorContainerSelector);
let ToggleChatModeActionViewItem = class ToggleChatModeActionViewItem extends DropdownMenuActionViewItemWithKeybinding {
    constructor(action, delegate, contextMenuService, keybindingService, contextKeyService, chatService, chatAgentService) {
        const makeAction = (mode) => ({
            ...action,
            id: mode,
            label: this.modeToString(mode),
            class: undefined,
            enabled: true,
            checked: delegate.getMode() === mode,
            run: async () => {
                const result = await action.run({ mode });
                this.renderLabel(this.element);
                return result;
            }
        });
        const actionProvider = {
            getActions: () => {
                const agentStateActions = [
                    makeAction(ChatMode.Edit),
                ];
                if (chatAgentService.hasToolsAgent) {
                    agentStateActions.push(makeAction(ChatMode.Agent));
                }
                if (chatService.unifiedViewEnabled) {
                    agentStateActions.unshift(makeAction(ChatMode.Ask));
                }
                return agentStateActions;
            }
        };
        super(action, actionProvider, contextMenuService, undefined, keybindingService, contextKeyService);
        this.delegate = delegate;
        this._register(delegate.onDidChangeMode(() => this.renderLabel(this.element)));
    }
    modeToString(mode) {
        switch (mode) {
            case ChatMode.Agent:
                return localize('chat.agentMode', "Agent");
            case ChatMode.Edit:
                return localize('chat.normalMode', "Edit");
            case ChatMode.Ask:
            default:
                return localize('chat.askMode', "Ask");
        }
    }
    renderLabel(element) {
        // Can't call super.renderLabel because it has a hack of forcing the 'codicon' class
        this.setAriaLabelAttributes(element);
        const state = this.modeToString(this.delegate.getMode());
        dom.reset(element, dom.$('span.chat-model-label', undefined, state), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ToggleChatModeActionViewItem = __decorate([
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService),
    __param(5, IChatService),
    __param(6, IChatAgentService)
], ToggleChatModeActionViewItem);
class AddFilesButton extends ActionViewItem {
    constructor(context, action, options) {
        super(context, action, options);
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-attached-context-attachment', 'chat-add-files');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdElucHV0UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUEwQixNQUFNLDBEQUEwRCxDQUFDO0FBQ2xILE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUF1RSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJB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