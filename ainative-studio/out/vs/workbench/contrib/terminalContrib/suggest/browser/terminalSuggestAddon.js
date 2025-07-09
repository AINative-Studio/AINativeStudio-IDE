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
var SuggestAddon_1;
import * as dom from '../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { sep } from '../../../../../base/common/path.js';
import { commonPrefixLength } from '../../../../../base/common/strings.js';
import { editorSuggestWidgetSelectedBackground } from '../../../../../editor/contrib/suggest/browser/suggestWidget.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { getListStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { activeContrastBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { terminalSuggestConfigSection } from '../common/terminalSuggestConfiguration.js';
import { LineContext } from '../../../../services/suggest/browser/simpleCompletionModel.js';
import { SimpleSuggestWidget } from '../../../../services/suggest/browser/simpleSuggestWidget.js';
import { ITerminalCompletionService } from './terminalCompletionService.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ITerminalConfigurationService } from '../../../terminal/browser/terminal.js';
import { GOLDEN_LINE_HEIGHT_RATIO, MINIMUM_LINE_HEIGHT } from '../../../../../editor/common/config/fontInfo.js';
import { TerminalCompletionModel } from './terminalCompletionModel.js';
import { TerminalCompletionItem, TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { IntervalTimer, TimeoutTimer } from '../../../../../base/common/async.js';
import { localize } from '../../../../../nls.js';
import { TerminalSuggestTelemetry } from './terminalSuggestTelemetry.js';
import { terminalSymbolAliasIcon, terminalSymbolArgumentIcon, terminalSymbolEnumMember, terminalSymbolFileIcon, terminalSymbolFlagIcon, terminalSymbolInlineSuggestionIcon, terminalSymbolMethodIcon, terminalSymbolOptionIcon, terminalSymbolFolderIcon } from './terminalSymbolIcons.js';
let SuggestAddon = class SuggestAddon extends Disposable {
    static { SuggestAddon_1 = this; }
    static { this.lastAcceptedCompletionTimestamp = 0; }
    constructor(shellType, _capabilities, _terminalSuggestWidgetVisibleContextKey, _terminalCompletionService, _configurationService, _instantiationService, _extensionService, _terminalConfigurationService) {
        super();
        this._capabilities = _capabilities;
        this._terminalSuggestWidgetVisibleContextKey = _terminalSuggestWidgetVisibleContextKey;
        this._terminalCompletionService = _terminalCompletionService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._promptInputModelSubscriptions = this._register(new MutableDisposable());
        this._enableWidget = true;
        this._pathSeparator = sep;
        this._isFilteringDirectories = false;
        this._cursorIndexDelta = 0;
        this._requestedCompletionsIndex = 0;
        this._lastUserDataTimestamp = 0;
        this.isPasting = false;
        this._onBell = this._register(new Emitter());
        this.onBell = this._onBell.event;
        this._onAcceptedCompletion = this._register(new Emitter());
        this.onAcceptedCompletion = this._onAcceptedCompletion.event;
        this._onDidReceiveCompletions = this._register(new Emitter());
        this.onDidReceiveCompletions = this._onDidReceiveCompletions.event;
        this._onDidFontConfigurationChange = this._register(new Emitter());
        this.onDidFontConfigurationChange = this._onDidFontConfigurationChange.event;
        this._kindToIconMap = new Map([
            [TerminalCompletionItemKind.File, terminalSymbolFileIcon],
            [TerminalCompletionItemKind.Folder, terminalSymbolFolderIcon],
            [TerminalCompletionItemKind.Method, terminalSymbolMethodIcon],
            [TerminalCompletionItemKind.Alias, terminalSymbolAliasIcon],
            [TerminalCompletionItemKind.Argument, terminalSymbolArgumentIcon],
            [TerminalCompletionItemKind.Option, terminalSymbolOptionIcon],
            [TerminalCompletionItemKind.OptionValue, terminalSymbolEnumMember],
            [TerminalCompletionItemKind.Flag, terminalSymbolFlagIcon],
            [TerminalCompletionItemKind.InlineSuggestion, terminalSymbolInlineSuggestionIcon],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, terminalSymbolInlineSuggestionIcon],
        ]);
        this._kindToKindLabelMap = new Map([
            [TerminalCompletionItemKind.File, localize('file', 'File')],
            [TerminalCompletionItemKind.Folder, localize('folder', 'Folder')],
            [TerminalCompletionItemKind.Method, localize('method', 'Method')],
            [TerminalCompletionItemKind.Alias, localize('alias', 'Alias')],
            [TerminalCompletionItemKind.Argument, localize('argument', 'Argument')],
            [TerminalCompletionItemKind.Option, localize('option', 'Option')],
            [TerminalCompletionItemKind.OptionValue, localize('optionValue', 'Option Value')],
            [TerminalCompletionItemKind.Flag, localize('flag', 'Flag')],
            [TerminalCompletionItemKind.InlineSuggestion, localize('inlineSuggestion', 'Inline Suggestion')],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, localize('inlineSuggestionAlwaysOnTop', 'Inline Suggestion')],
        ]);
        this._inlineCompletion = {
            label: '',
            // Right arrow is used to accept the completion. This is a common keybinding in pwsh, zsh
            // and fish.
            inputData: '\x1b[C',
            replacementIndex: 0,
            replacementLength: 0,
            provider: 'core',
            detail: 'Inline suggestion',
            kind: TerminalCompletionItemKind.InlineSuggestion,
            kindLabel: 'Inline suggestion',
            icon: this._kindToIconMap.get(TerminalCompletionItemKind.InlineSuggestion),
        };
        this._inlineCompletionItem = new TerminalCompletionItem(this._inlineCompletion);
        this._shouldSyncWhenReady = false;
        // Initialize shell type, including a promise that completions can await for that resolves:
        // - immediately if shell type
        // - after a short delay if shell type gets set
        // - after a long delay if it doesn't get set
        this.shellType = shellType;
        if (this.shellType) {
            this._shellTypeInit = Promise.resolve();
        }
        else {
            const intervalTimer = this._register(new IntervalTimer());
            const timeoutTimer = this._register(new TimeoutTimer());
            this._shellTypeInit = new Promise(r => {
                intervalTimer.cancelAndSet(() => {
                    if (this.shellType) {
                        r();
                    }
                }, 50);
                timeoutTimer.cancelAndSet(r, 5000);
            }).then(() => {
                this._store.delete(intervalTimer);
                this._store.delete(timeoutTimer);
            });
        }
        this._register(Event.runAndSubscribe(Event.any(this._capabilities.onDidAddCapabilityType, this._capabilities.onDidRemoveCapabilityType), () => {
            const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                if (this._promptInputModel !== commandDetection.promptInputModel) {
                    this._promptInputModel = commandDetection.promptInputModel;
                    this._suggestTelemetry = this._register(this._instantiationService.createInstance(TerminalSuggestTelemetry, commandDetection, this._promptInputModel));
                    this._promptInputModelSubscriptions.value = combinedDisposable(this._promptInputModel.onDidChangeInput(e => this._sync(e)), this._promptInputModel.onDidFinishInput(() => {
                        this.hideSuggestWidget(true);
                    }));
                    if (this._shouldSyncWhenReady) {
                        this._sync(this._promptInputModel);
                        this._shouldSyncWhenReady = false;
                    }
                }
            }
            else {
                this._promptInputModel = undefined;
            }
        }));
        this._register(this._terminalConfigurationService.onConfigChanged(() => this._cachedFontInfo = undefined));
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */)) {
                const value = this._configurationService.getValue(terminalSuggestConfigSection).inlineSuggestion;
                this._inlineCompletionItem.isInvalid = value === 'off';
                switch (value) {
                    case 'alwaysOnTopExceptExactMatch': {
                        this._inlineCompletion.kind = TerminalCompletionItemKind.InlineSuggestion;
                        break;
                    }
                    case 'alwaysOnTop':
                    default: {
                        this._inlineCompletion.kind = TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop;
                        break;
                    }
                }
                this._model?.forceRefilterAll();
            }
        }));
    }
    activate(xterm) {
        this._terminal = xterm;
        this._register(xterm.onKey(async (e) => {
            this._lastUserData = e.key;
            this._lastUserDataTimestamp = Date.now();
        }));
        this._register(xterm.onScroll(() => this.hideSuggestWidget(true)));
    }
    async _handleCompletionProviders(terminal, token, explicitlyInvoked) {
        // Nothing to handle if the terminal is not attached
        if (!terminal?.element || !this._enableWidget || !this._promptInputModel) {
            return;
        }
        // Only show the suggest widget if the terminal is focused
        if (!dom.isAncestorOfActiveElement(terminal.element)) {
            return;
        }
        // Require a shell type for completions. This will wait a short period after launching to
        // wait for the shell type to initialize. This prevents user requests sometimes getting lost
        // if requested shortly after the terminal is created.
        await this._shellTypeInit;
        if (!this.shellType) {
            return;
        }
        let doNotRequestExtensionCompletions = false;
        // Ensure that a key has been pressed since the last accepted completion in order to prevent
        // completions being requested again right after accepting a completion
        if (this._lastUserDataTimestamp < SuggestAddon_1.lastAcceptedCompletionTimestamp) {
            doNotRequestExtensionCompletions = true;
        }
        if (!doNotRequestExtensionCompletions) {
            await this._extensionService.activateByEvent('onTerminalCompletionsRequested');
        }
        this._currentPromptInputState = {
            value: this._promptInputModel.value,
            prefix: this._promptInputModel.prefix,
            suffix: this._promptInputModel.suffix,
            cursorIndex: this._promptInputModel.cursorIndex,
            ghostTextIndex: this._promptInputModel.ghostTextIndex
        };
        this._requestedCompletionsIndex = this._currentPromptInputState.cursorIndex;
        const quickSuggestionsConfig = this._configurationService.getValue(terminalSuggestConfigSection).quickSuggestions;
        const allowFallbackCompletions = explicitlyInvoked || quickSuggestionsConfig.unknown === 'on';
        const providedCompletions = await this._terminalCompletionService.provideCompletions(this._currentPromptInputState.prefix, this._currentPromptInputState.cursorIndex, allowFallbackCompletions, this.shellType, this._capabilities, token, doNotRequestExtensionCompletions);
        if (token.isCancellationRequested) {
            return;
        }
        this._onDidReceiveCompletions.fire();
        this._cursorIndexDelta = this._promptInputModel.cursorIndex - this._requestedCompletionsIndex;
        this._leadingLineContent = this._promptInputModel.prefix.substring(0, this._requestedCompletionsIndex + this._cursorIndexDelta);
        const completions = providedCompletions?.flat() || [];
        if (!explicitlyInvoked && !completions.length) {
            this.hideSuggestWidget(true);
            return;
        }
        const firstChar = this._leadingLineContent.length === 0 ? '' : this._leadingLineContent[0];
        // This is a TabExpansion2 result
        if (this._leadingLineContent.includes(' ') || firstChar === '[') {
            this._leadingLineContent = this._promptInputModel.prefix;
        }
        let normalizedLeadingLineContent = this._leadingLineContent;
        // If there is a single directory in the completions:
        // - `\` and `/` are normalized such that either can be used
        // - Using `\` or `/` will request new completions. It's important that this only occurs
        //   when a directory is present, if not completions like git branches could be requested
        //   which leads to flickering
        this._isFilteringDirectories = completions.some(e => e.kind === TerminalCompletionItemKind.Folder);
        if (this._isFilteringDirectories) {
            const firstDir = completions.find(e => e.kind === TerminalCompletionItemKind.Folder);
            const textLabel = typeof firstDir?.label === 'string' ? firstDir.label : firstDir?.label.label;
            this._pathSeparator = textLabel?.match(/(?<sep>[\\\/])/)?.groups?.sep ?? sep;
            normalizedLeadingLineContent = normalizePathSeparator(normalizedLeadingLineContent, this._pathSeparator);
        }
        // Add any "ghost text" suggestion suggested by the shell. This aligns with behavior of the
        // editor and how it interacts with inline completions. This object is tracked and reused as
        // it may change on input.
        this._refreshInlineCompletion(completions);
        // Add any missing icons based on the completion item kind
        for (const completion of completions) {
            if (!completion.icon && completion.kind !== undefined) {
                completion.icon = this._kindToIconMap.get(completion.kind);
                completion.kindLabel = this._kindToKindLabelMap.get(completion.kind);
            }
        }
        const lineContext = new LineContext(normalizedLeadingLineContent, this._cursorIndexDelta);
        const model = new TerminalCompletionModel([
            ...completions.filter(c => !!c.label).map(c => new TerminalCompletionItem(c)),
            this._inlineCompletionItem,
        ], lineContext);
        if (token.isCancellationRequested) {
            return;
        }
        this._showCompletions(model, explicitlyInvoked);
    }
    setContainerWithOverflow(container) {
        this._container = container;
    }
    setScreen(screen) {
        this._screen = screen;
    }
    toggleExplainMode() {
        this._suggestWidget?.toggleExplainMode();
    }
    toggleSuggestionFocus() {
        this._suggestWidget?.toggleDetailsFocus();
    }
    toggleSuggestionDetails() {
        this._suggestWidget?.toggleDetails();
    }
    resetWidgetSize() {
        this._suggestWidget?.resetWidgetSize();
    }
    async requestCompletions(explicitlyInvoked) {
        if (!this._promptInputModel) {
            this._shouldSyncWhenReady = true;
            return;
        }
        if (this.isPasting) {
            return;
        }
        if (this._cancellationTokenSource) {
            this._cancellationTokenSource.cancel();
            this._cancellationTokenSource.dispose();
        }
        this._cancellationTokenSource = new CancellationTokenSource();
        const token = this._cancellationTokenSource.token;
        await this._handleCompletionProviders(this._terminal, token, explicitlyInvoked);
    }
    _addPropertiesToInlineCompletionItem(completions) {
        const inlineCompletionLabel = (typeof this._inlineCompletionItem.completion.label === 'string' ? this._inlineCompletionItem.completion.label : this._inlineCompletionItem.completion.label.label).trim();
        const inlineCompletionMatchIndex = completions.findIndex(c => typeof c.label === 'string' ? c.label === inlineCompletionLabel : c.label.label === inlineCompletionLabel);
        if (inlineCompletionMatchIndex !== -1) {
            // Remove the existing inline completion item from the completions list
            const richCompletionMatchingInline = completions.splice(inlineCompletionMatchIndex, 1)[0];
            // Apply its properties to the inline completion item
            this._inlineCompletionItem.completion.label = richCompletionMatchingInline.label;
            this._inlineCompletionItem.completion.detail = richCompletionMatchingInline.detail;
            this._inlineCompletionItem.completion.documentation = richCompletionMatchingInline.documentation;
        }
        else if (this._inlineCompletionItem.completion) {
            this._inlineCompletionItem.completion.detail = undefined;
            this._inlineCompletionItem.completion.documentation = undefined;
        }
    }
    _requestTriggerCharQuickSuggestCompletions() {
        if (!this._wasLastInputVerticalArrowKey()) {
            // Only request on trigger character when it's a regular input, or on an arrow if the widget
            // is already visible
            if (!this._wasLastInputIncludedEscape() || this._terminalSuggestWidgetVisibleContextKey.get()) {
                this.requestCompletions();
                return true;
            }
        }
        return false;
    }
    _wasLastInputRightArrowKey() {
        return !!this._lastUserData?.match(/^\x1b[\[O]?C$/);
    }
    _wasLastInputVerticalArrowKey() {
        return !!this._lastUserData?.match(/^\x1b[\[O]?[A-B]$/);
    }
    /**
     * Whether the last input included the escape character. Typically this will mean it was more
     * than just a simple character, such as arrow keys, home, end, etc.
     */
    _wasLastInputIncludedEscape() {
        return !!this._lastUserData?.includes('\x1b');
    }
    _wasLastInputArrowKey() {
        // Never request completions if the last key sequence was up or down as the user was likely
        // navigating history
        return !!this._lastUserData?.match(/^\x1b[\[O]?[A-D]$/);
    }
    _sync(promptInputState) {
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        {
            let sent = false;
            // If the cursor moved to the right
            if (!this._mostRecentPromptInputState || promptInputState.cursorIndex > this._mostRecentPromptInputState.cursorIndex) {
                // Quick suggestions - Trigger whenever a new non-whitespace character is used
                if (!this._terminalSuggestWidgetVisibleContextKey.get()) {
                    const commandLineHasSpace = promptInputState.prefix.trim().match(/\s/);
                    if ((!commandLineHasSpace && config.quickSuggestions.commands !== 'off') ||
                        (commandLineHasSpace && config.quickSuggestions.arguments !== 'off')) {
                        if (promptInputState.prefix.match(/[^\s]$/)) {
                            sent = this._requestTriggerCharQuickSuggestCompletions();
                        }
                    }
                }
                // Trigger characters - this happens even if the widget is showing
                if (config.suggestOnTriggerCharacters && !sent) {
                    const prefix = promptInputState.prefix;
                    if (
                    // Only trigger on `-` if it's after a space. This is required to not clear
                    // completions when typing the `-` in `git cherry-pick`
                    prefix?.match(/\s[\-]$/) ||
                        // Only trigger on `\` and `/` if it's a directory. Not doing so causes problems
                        // with git branches in particular
                        this._isFilteringDirectories && prefix?.match(/[\\\/]$/)) {
                        sent = this._requestTriggerCharQuickSuggestCompletions();
                    }
                    if (!sent) {
                        for (const provider of this._terminalCompletionService.providers) {
                            if (!provider.triggerCharacters) {
                                continue;
                            }
                            for (const char of provider.triggerCharacters) {
                                if (prefix?.endsWith(char)) {
                                    sent = this._requestTriggerCharQuickSuggestCompletions();
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            // If the cursor moved to the left
            if (this._mostRecentPromptInputState && promptInputState.cursorIndex < this._mostRecentPromptInputState.cursorIndex && promptInputState.cursorIndex > 0) {
                // We only want to refresh via trigger characters in this case if the widget is
                // already visible
                if (this._terminalSuggestWidgetVisibleContextKey.get()) {
                    // Backspace or left past a trigger character
                    if (config.suggestOnTriggerCharacters && !sent && this._mostRecentPromptInputState.cursorIndex > 0) {
                        const char = this._mostRecentPromptInputState.value[this._mostRecentPromptInputState.cursorIndex - 1];
                        if (
                        // Only trigger on `\` and `/` if it's a directory. Not doing so causes problems
                        // with git branches in particular
                        this._isFilteringDirectories && char.match(/[\\\/]$/)) {
                            sent = this._requestTriggerCharQuickSuggestCompletions();
                        }
                    }
                }
            }
        }
        // Hide the widget if ghost text was just completed via right arrow
        if (this._wasLastInputRightArrowKey() &&
            this._mostRecentPromptInputState?.ghostTextIndex !== -1 &&
            promptInputState.ghostTextIndex === -1 &&
            this._mostRecentPromptInputState?.value === promptInputState.value) {
            this.hideSuggestWidget(false);
        }
        this._mostRecentPromptInputState = promptInputState;
        if (!this._promptInputModel || !this._terminal || !this._suggestWidget || this._leadingLineContent === undefined) {
            return;
        }
        const previousPromptInputState = this._currentPromptInputState;
        this._currentPromptInputState = promptInputState;
        // Hide the widget if the latest character was a space
        if (this._currentPromptInputState.cursorIndex > 1 && this._currentPromptInputState.value.at(this._currentPromptInputState.cursorIndex - 1) === ' ') {
            if (!this._wasLastInputArrowKey()) {
                this.hideSuggestWidget(false);
                return;
            }
        }
        // Hide the widget if the cursor moves to the left and invalidates the completions.
        // Originally this was to the left of the initial position that the completions were
        // requested, but since extensions are expected to allow the client-side to filter, they are
        // only invalidated when whitespace is encountered.
        if (this._currentPromptInputState && this._currentPromptInputState.cursorIndex < this._leadingLineContent.length) {
            if (this._currentPromptInputState.cursorIndex <= 0 || previousPromptInputState?.value[this._currentPromptInputState.cursorIndex]?.match(/[\\\/\s]/)) {
                this.hideSuggestWidget(false);
                return;
            }
        }
        if (this._terminalSuggestWidgetVisibleContextKey.get()) {
            this._cursorIndexDelta = this._currentPromptInputState.cursorIndex - (this._requestedCompletionsIndex);
            let normalizedLeadingLineContent = this._currentPromptInputState.value.substring(0, this._requestedCompletionsIndex + this._cursorIndexDelta);
            if (this._isFilteringDirectories) {
                normalizedLeadingLineContent = normalizePathSeparator(normalizedLeadingLineContent, this._pathSeparator);
            }
            const lineContext = new LineContext(normalizedLeadingLineContent, this._cursorIndexDelta);
            this._suggestWidget.setLineContext(lineContext);
        }
        this._refreshInlineCompletion(this._model?.items.map(i => i.completion) || []);
        // Hide and clear model if there are no more items
        if (!this._suggestWidget.hasCompletions()) {
            this.hideSuggestWidget(false);
            return;
        }
        const dimensions = this._getTerminalDimensions();
        if (!dimensions.width || !dimensions.height) {
            return;
        }
        const xtermBox = this._screen.getBoundingClientRect();
        this._suggestWidget.showSuggestions(0, false, true, {
            left: xtermBox.left + this._terminal.buffer.active.cursorX * dimensions.width,
            top: xtermBox.top + this._terminal.buffer.active.cursorY * dimensions.height,
            height: dimensions.height
        });
    }
    _refreshInlineCompletion(completions) {
        const oldIsInvalid = this._inlineCompletionItem.isInvalid;
        if (!this._currentPromptInputState || this._currentPromptInputState.ghostTextIndex === -1) {
            this._inlineCompletionItem.isInvalid = true;
        }
        else {
            this._inlineCompletionItem.isInvalid = false;
            // Update properties
            const spaceIndex = this._currentPromptInputState.value.lastIndexOf(' ', this._currentPromptInputState.ghostTextIndex - 1);
            const replacementIndex = spaceIndex === -1 ? 0 : spaceIndex + 1;
            const suggestion = this._currentPromptInputState.value.substring(replacementIndex);
            this._inlineCompletion.label = suggestion;
            this._inlineCompletion.replacementIndex = replacementIndex;
            // Note that the cursor index delta must be taken into account here, otherwise filtering
            // wont work correctly.
            this._inlineCompletion.replacementLength = this._currentPromptInputState.cursorIndex - replacementIndex - this._cursorIndexDelta;
            // Reset the completion item as the object reference must remain the same but its
            // contents will differ across syncs. This is done so we don't need to reassign the
            // model and the slowdown/flickering that could potentially cause.
            this._addPropertiesToInlineCompletionItem(completions);
            const x = new TerminalCompletionItem(this._inlineCompletion);
            this._inlineCompletionItem.idx = x.idx;
            this._inlineCompletionItem.score = x.score;
            this._inlineCompletionItem.labelLow = x.labelLow;
            this._inlineCompletionItem.textLabel = x.textLabel;
            this._inlineCompletionItem.fileExtLow = x.fileExtLow;
            this._inlineCompletionItem.labelLowExcludeFileExt = x.labelLowExcludeFileExt;
            this._inlineCompletionItem.labelLowNormalizedPath = x.labelLowNormalizedPath;
            this._inlineCompletionItem.underscorePenalty = x.underscorePenalty;
            this._inlineCompletionItem.word = x.word;
            this._model?.forceRefilterAll();
        }
        // Force a filter all in order to re-evaluate the inline completion
        if (this._inlineCompletionItem.isInvalid !== oldIsInvalid) {
            this._model?.forceRefilterAll();
        }
    }
    _getTerminalDimensions() {
        const cssCellDims = this._terminal._core._renderService.dimensions.css.cell;
        return {
            width: cssCellDims.width,
            height: cssCellDims.height,
        };
    }
    _getFontInfo() {
        if (this._cachedFontInfo) {
            return this._cachedFontInfo;
        }
        const core = this._terminal._core;
        const font = this._terminalConfigurationService.getFont(dom.getActiveWindow(), core);
        let lineHeight = font.lineHeight;
        const fontSize = font.fontSize;
        const fontFamily = font.fontFamily;
        const letterSpacing = font.letterSpacing;
        const fontWeight = this._configurationService.getValue('editor.fontWeight');
        if (lineHeight <= 1) {
            lineHeight = GOLDEN_LINE_HEIGHT_RATIO * fontSize;
        }
        else if (lineHeight < MINIMUM_LINE_HEIGHT) {
            // Values too small to be line heights in pixels are in ems.
            lineHeight = lineHeight * fontSize;
        }
        // Enforce integer, minimum constraints
        lineHeight = Math.round(lineHeight);
        if (lineHeight < MINIMUM_LINE_HEIGHT) {
            lineHeight = MINIMUM_LINE_HEIGHT;
        }
        const fontInfo = {
            fontSize,
            lineHeight,
            fontWeight: fontWeight.toString(),
            letterSpacing,
            fontFamily
        };
        this._cachedFontInfo = fontInfo;
        return fontInfo;
    }
    _getAdvancedExplainModeDetails() {
        return `promptInputModel: ${this._promptInputModel?.getCombinedString()}`;
    }
    _showCompletions(model, explicitlyInvoked) {
        if (!this._terminal?.element) {
            return;
        }
        const suggestWidget = this._ensureSuggestWidget(this._terminal);
        suggestWidget.setCompletionModel(model);
        this._register(suggestWidget.onDidFocus(() => this._terminal?.focus()));
        if (!this._promptInputModel || !explicitlyInvoked && model.items.length === 0) {
            return;
        }
        this._model = model;
        const dimensions = this._getTerminalDimensions();
        if (!dimensions.width || !dimensions.height) {
            return;
        }
        const xtermBox = this._screen.getBoundingClientRect();
        suggestWidget.showSuggestions(0, false, !explicitlyInvoked, {
            left: xtermBox.left + this._terminal.buffer.active.cursorX * dimensions.width,
            top: xtermBox.top + this._terminal.buffer.active.cursorY * dimensions.height,
            height: dimensions.height
        });
    }
    _ensureSuggestWidget(terminal) {
        if (!this._suggestWidget) {
            this._suggestWidget = this._register(this._instantiationService.createInstance(SimpleSuggestWidget, this._container, this._instantiationService.createInstance(PersistedWidgetSize), {
                statusBarMenuId: MenuId.MenubarTerminalSuggestStatusMenu,
                showStatusBarSettingId: "terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */
            }, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.event.bind(this), this._getAdvancedExplainModeDetails.bind(this)));
            this._suggestWidget.list.style(getListStyles({
                listInactiveFocusBackground: editorSuggestWidgetSelectedBackground,
                listInactiveFocusOutline: activeContrastBorder
            }));
            this._register(this._suggestWidget.onDidSelect(async (e) => this.acceptSelectedSuggestion(e)));
            this._register(this._suggestWidget.onDidHide(() => this._terminalSuggestWidgetVisibleContextKey.reset()));
            this._register(this._suggestWidget.onDidShow(() => this._terminalSuggestWidgetVisibleContextKey.set(true)));
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) || e.affectsConfiguration("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */) || e.affectsConfiguration("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */) || e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) || e.affectsConfiguration('editor.fontSize') || e.affectsConfiguration('editor.fontFamily')) {
                    this._onDidFontConfigurationChange.fire();
                }
            }));
            const element = this._terminal?.element?.querySelector('.xterm-helper-textarea');
            if (element) {
                this._register(dom.addDisposableListener(dom.getActiveDocument(), 'click', (event) => {
                    const target = event.target;
                    if (this._terminal?.element?.contains(target)) {
                        this._suggestWidget?.hide();
                    }
                }));
            }
            this._register(this._suggestWidget.onDidBlurDetails((e) => {
                const elt = e.relatedTarget;
                if (this._terminal?.element?.contains(elt)) {
                    // Do nothing, just the terminal getting focused
                    // If there was a mouse click, the suggest widget will be
                    // hidden above
                    return;
                }
                this._suggestWidget?.hide();
            }));
            this._terminalSuggestWidgetVisibleContextKey.set(false);
        }
        return this._suggestWidget;
    }
    selectPreviousSuggestion() {
        this._suggestWidget?.selectPrevious();
    }
    selectPreviousPageSuggestion() {
        this._suggestWidget?.selectPreviousPage();
    }
    selectNextSuggestion() {
        this._suggestWidget?.selectNext();
    }
    selectNextPageSuggestion() {
        this._suggestWidget?.selectNextPage();
    }
    acceptSelectedSuggestion(suggestion, respectRunOnEnter) {
        if (!suggestion) {
            suggestion = this._suggestWidget?.getFocusedItem();
        }
        const initialPromptInputState = this._mostRecentPromptInputState;
        if (!suggestion || !initialPromptInputState || this._leadingLineContent === undefined || !this._model) {
            this._suggestTelemetry?.acceptCompletion(undefined, this._mostRecentPromptInputState?.value);
            return;
        }
        SuggestAddon_1.lastAcceptedCompletionTimestamp = Date.now();
        this._suggestWidget?.hide();
        const currentPromptInputState = this._currentPromptInputState ?? initialPromptInputState;
        // The replacement text is any text after the replacement index for the completions, this
        // includes any text that was there before the completions were requested and any text added
        // since to refine the completion.
        const replacementText = currentPromptInputState.value.substring(suggestion.item.completion.replacementIndex, currentPromptInputState.cursorIndex);
        // Right side of replacement text in the same word
        let rightSideReplacementText = '';
        if (
        // The line didn't end with ghost text
        (currentPromptInputState.ghostTextIndex === -1 || currentPromptInputState.ghostTextIndex > currentPromptInputState.cursorIndex) &&
            // There is more than one charatcer
            currentPromptInputState.value.length > currentPromptInputState.cursorIndex + 1 &&
            // THe next character is not a space
            currentPromptInputState.value.at(currentPromptInputState.cursorIndex) !== ' ') {
            const spaceIndex = currentPromptInputState.value.substring(currentPromptInputState.cursorIndex, currentPromptInputState.ghostTextIndex === -1 ? undefined : currentPromptInputState.ghostTextIndex).indexOf(' ');
            rightSideReplacementText = currentPromptInputState.value.substring(currentPromptInputState.cursorIndex, spaceIndex === -1 ? undefined : currentPromptInputState.cursorIndex + spaceIndex);
        }
        const completion = suggestion.item.completion;
        let resultSequence = completion.inputData;
        // Use for amend the label if inputData is not defined
        if (resultSequence === undefined) {
            let completionText = typeof completion.label === 'string' ? completion.label : completion.label.label;
            if ((completion.kind === TerminalCompletionItemKind.Folder || completion.isFileOverride) && completionText.includes(' ')) {
                // Escape spaces in files or folders so they're valid paths
                completionText = completionText.replaceAll(' ', '\\ ');
            }
            let runOnEnter = false;
            if (respectRunOnEnter) {
                const runOnEnterConfig = this._configurationService.getValue(terminalSuggestConfigSection).runOnEnter;
                switch (runOnEnterConfig) {
                    case 'always': {
                        runOnEnter = true;
                        break;
                    }
                    case 'exactMatch': {
                        runOnEnter = replacementText.toLowerCase() === completionText.toLowerCase();
                        break;
                    }
                    case 'exactMatchIgnoreExtension': {
                        runOnEnter = replacementText.toLowerCase() === completionText.toLowerCase();
                        if (completion.isFileOverride) {
                            runOnEnter ||= replacementText.toLowerCase() === completionText.toLowerCase().replace(/\.[^\.]+$/, '');
                        }
                        break;
                    }
                }
            }
            const commonPrefixLen = commonPrefixLength(replacementText, completionText);
            const commonPrefix = replacementText.substring(replacementText.length - 1 - commonPrefixLen, replacementText.length - 1);
            const completionSuffix = completionText.substring(commonPrefixLen);
            if (currentPromptInputState.suffix.length > 0 && currentPromptInputState.prefix.endsWith(commonPrefix) && currentPromptInputState.suffix.startsWith(completionSuffix)) {
                // Move right to the end of the completion
                resultSequence = '\x1bOC'.repeat(completionText.length - commonPrefixLen);
            }
            else {
                resultSequence = [
                    // Backspace (left) to remove all additional input
                    '\x7F'.repeat(replacementText.length - commonPrefixLen),
                    // Delete (right) to remove any additional text in the same word
                    '\x1b[3~'.repeat(rightSideReplacementText.length),
                    // Write the completion
                    completionSuffix,
                    // Run on enter if needed
                    runOnEnter ? '\r' : ''
                ].join('');
            }
        }
        // For folders, allow the next completion request to get completions for that folder
        if (completion.kind === TerminalCompletionItemKind.Folder) {
            SuggestAddon_1.lastAcceptedCompletionTimestamp = 0;
        }
        // Send the completion
        this._onAcceptedCompletion.fire(resultSequence);
        this._suggestTelemetry?.acceptCompletion(completion, this._mostRecentPromptInputState?.value);
        this.hideSuggestWidget(true);
    }
    hideSuggestWidget(cancelAnyRequest) {
        if (cancelAnyRequest) {
            this._cancellationTokenSource?.cancel();
            this._cancellationTokenSource = undefined;
        }
        this._currentPromptInputState = undefined;
        this._leadingLineContent = undefined;
        this._suggestWidget?.hide();
    }
};
SuggestAddon = SuggestAddon_1 = __decorate([
    __param(3, ITerminalCompletionService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IExtensionService),
    __param(7, ITerminalConfigurationService)
], SuggestAddon);
export { SuggestAddon };
let PersistedWidgetSize = class PersistedWidgetSize {
    constructor(_storageService) {
        this._storageService = _storageService;
        this._key = "terminal.integrated.suggestSize" /* TerminalStorageKeys.TerminalSuggestSize */;
    }
    restore() {
        const raw = this._storageService.get(this._key, 0 /* StorageScope.PROFILE */) ?? '';
        try {
            const obj = JSON.parse(raw);
            if (dom.Dimension.is(obj)) {
                return dom.Dimension.lift(obj);
            }
        }
        catch {
            // ignore
        }
        return undefined;
    }
    store(size) {
        this._storageService.store(this._key, JSON.stringify(size), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    reset() {
        this._storageService.remove(this._key, 0 /* StorageScope.PROFILE */);
    }
};
PersistedWidgetSize = __decorate([
    __param(0, IStorageService)
], PersistedWidgetSize);
export function normalizePathSeparator(path, sep) {
    if (sep === '/') {
        return path.replaceAll('\\', '/');
    }
    return path.replaceAll('/', '\\');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0QWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbFN1Z2dlc3RBZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDdkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUdqSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFHN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFnRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM1RixPQUFPLEVBQTZCLG1CQUFtQixFQUFFLE1BQU0s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