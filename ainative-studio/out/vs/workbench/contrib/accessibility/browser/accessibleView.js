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
import { EventType, addDisposableListener, getActiveWindow, isActiveElement } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { AccessibilityHelpNLS } from '../../../../editor/common/standaloneStrings.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider, ExtensionContentProvider, isIAccessibleViewContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX, IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { accessibilityHelpIsShown, accessibleViewContainsCodeBlocks, accessibleViewCurrentProviderId, accessibleViewGoToSymbolSupported, accessibleViewHasAssignedKeybindings, accessibleViewHasUnassignedKeybindings, accessibleViewInCodeBlock, accessibleViewIsShown, accessibleViewOnLastLine, accessibleViewSupportsNavigation, accessibleViewVerbosityEnabled } from './accessibilityConfiguration.js';
import { resolveContentAndKeybindingItems } from './accessibleViewKeybindingResolver.js';
import { IChatCodeBlockContextProviderService } from '../../chat/browser/chat.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { Schemas } from '../../../../base/common/network.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
var DIMENSIONS;
(function (DIMENSIONS) {
    DIMENSIONS[DIMENSIONS["MAX_WIDTH"] = 600] = "MAX_WIDTH";
})(DIMENSIONS || (DIMENSIONS = {}));
let AccessibleView = class AccessibleView extends Disposable {
    get editorWidget() { return this._editorWidget; }
    constructor(_openerService, _instantiationService, _configurationService, _modelService, _contextViewService, _contextKeyService, _accessibilityService, _keybindingService, _layoutService, _menuService, _commandService, _codeBlockContextProviderService, _storageService, textModelResolverService, _quickInputService) {
        super();
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._modelService = _modelService;
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._accessibilityService = _accessibilityService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._menuService = _menuService;
        this._commandService = _commandService;
        this._codeBlockContextProviderService = _codeBlockContextProviderService;
        this._storageService = _storageService;
        this.textModelResolverService = textModelResolverService;
        this._quickInputService = _quickInputService;
        this._isInQuickPick = false;
        this._accessiblityHelpIsShown = accessibilityHelpIsShown.bindTo(this._contextKeyService);
        this._accessibleViewIsShown = accessibleViewIsShown.bindTo(this._contextKeyService);
        this._accessibleViewSupportsNavigation = accessibleViewSupportsNavigation.bindTo(this._contextKeyService);
        this._accessibleViewVerbosityEnabled = accessibleViewVerbosityEnabled.bindTo(this._contextKeyService);
        this._accessibleViewGoToSymbolSupported = accessibleViewGoToSymbolSupported.bindTo(this._contextKeyService);
        this._accessibleViewCurrentProviderId = accessibleViewCurrentProviderId.bindTo(this._contextKeyService);
        this._accessibleViewInCodeBlock = accessibleViewInCodeBlock.bindTo(this._contextKeyService);
        this._accessibleViewContainsCodeBlocks = accessibleViewContainsCodeBlocks.bindTo(this._contextKeyService);
        this._onLastLine = accessibleViewOnLastLine.bindTo(this._contextKeyService);
        this._hasUnassignedKeybindings = accessibleViewHasUnassignedKeybindings.bindTo(this._contextKeyService);
        this._hasAssignedKeybindings = accessibleViewHasAssignedKeybindings.bindTo(this._contextKeyService);
        this._container = document.createElement('div');
        this._container.classList.add('accessible-view');
        if (this._configurationService.getValue("accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */)) {
            this._container.classList.add('hide');
        }
        const codeEditorWidgetOptions = {
            contributions: EditorExtensionsRegistry.getEditorContributions().filter(c => c.id !== CodeActionController.ID)
        };
        const titleBar = document.createElement('div');
        titleBar.classList.add('accessible-view-title-bar');
        this._title = document.createElement('div');
        this._title.classList.add('accessible-view-title');
        titleBar.appendChild(this._title);
        const actionBar = document.createElement('div');
        actionBar.classList.add('accessible-view-action-bar');
        titleBar.appendChild(actionBar);
        this._container.appendChild(titleBar);
        this._toolbar = this._register(_instantiationService.createInstance(WorkbenchToolBar, actionBar, { orientation: 0 /* ActionsOrientation.HORIZONTAL */ }));
        this._toolbar.context = { viewId: 'accessibleView' };
        const toolbarElt = this._toolbar.getElement();
        toolbarElt.tabIndex = 0;
        const editorOptions = {
            ...getSimpleEditorOptions(this._configurationService),
            lineDecorationsWidth: 6,
            dragAndDrop: false,
            cursorWidth: 1,
            wordWrap: 'off',
            wrappingStrategy: 'advanced',
            wrappingIndent: 'none',
            padding: { top: 2, bottom: 2 },
            quickSuggestions: false,
            renderWhitespace: 'none',
            dropIntoEditor: { enabled: false },
            readOnly: true,
            fontFamily: 'var(--monaco-monospace-font)'
        };
        this.textModelResolverService.registerTextModelContentProvider(Schemas.accessibleView, this);
        this._editorWidget = this._register(this._instantiationService.createInstance(CodeEditorWidget, this._container, editorOptions, codeEditorWidgetOptions));
        this._register(this._accessibilityService.onDidChangeScreenReaderOptimized(() => {
            if (this._currentProvider && this._accessiblityHelpIsShown.get()) {
                this.show(this._currentProvider);
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (isIAccessibleViewContentProvider(this._currentProvider) && e.affectsConfiguration(this._currentProvider.verbositySettingKey)) {
                if (this._accessiblityHelpIsShown.get()) {
                    this.show(this._currentProvider);
                }
                this._accessibleViewVerbosityEnabled.set(this._configurationService.getValue(this._currentProvider.verbositySettingKey));
                this._updateToolbar(this._currentProvider.actions, this._currentProvider.options.type);
            }
            if (e.affectsConfiguration("accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */)) {
                this._container.classList.toggle('hide', this._configurationService.getValue("accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */));
            }
        }));
        this._register(this._editorWidget.onDidDispose(() => this._resetContextKeys()));
        this._register(this._editorWidget.onDidChangeCursorPosition(() => {
            this._onLastLine.set(this._editorWidget.getPosition()?.lineNumber === this._editorWidget.getModel()?.getLineCount());
        }));
        this._register(this._editorWidget.onDidChangeCursorPosition(() => {
            const cursorPosition = this._editorWidget.getPosition()?.lineNumber;
            if (this._codeBlocks && cursorPosition !== undefined) {
                const inCodeBlock = this._codeBlocks.find(c => c.startLine <= cursorPosition && c.endLine >= cursorPosition) !== undefined;
                this._accessibleViewInCodeBlock.set(inCodeBlock);
            }
        }));
    }
    provideTextContent(resource) {
        return this._getTextModel(resource);
    }
    _resetContextKeys() {
        this._accessiblityHelpIsShown.reset();
        this._accessibleViewIsShown.reset();
        this._accessibleViewSupportsNavigation.reset();
        this._accessibleViewVerbosityEnabled.reset();
        this._accessibleViewGoToSymbolSupported.reset();
        this._accessibleViewCurrentProviderId.reset();
        this._hasAssignedKeybindings.reset();
        this._hasUnassignedKeybindings.reset();
    }
    getPosition(id) {
        if (!id || !this._lastProvider || this._lastProvider.id !== id) {
            return undefined;
        }
        return this._editorWidget.getPosition() || undefined;
    }
    setPosition(position, reveal, select) {
        this._editorWidget.setPosition(position);
        if (reveal) {
            this._editorWidget.revealPosition(position);
        }
        if (select) {
            const lineLength = this._editorWidget.getModel()?.getLineLength(position.lineNumber) ?? 0;
            if (lineLength) {
                this._editorWidget.setSelection({ startLineNumber: position.lineNumber, startColumn: 1, endLineNumber: position.lineNumber, endColumn: lineLength + 1 });
            }
        }
    }
    getCodeBlockContext() {
        const position = this._editorWidget.getPosition();
        if (!this._codeBlocks?.length || !position) {
            return;
        }
        const codeBlockIndex = this._codeBlocks?.findIndex(c => c.startLine <= position?.lineNumber && c.endLine >= position?.lineNumber);
        const codeBlock = codeBlockIndex !== undefined && codeBlockIndex > -1 ? this._codeBlocks[codeBlockIndex] : undefined;
        if (!codeBlock || codeBlockIndex === undefined) {
            return;
        }
        return { code: codeBlock.code, languageId: codeBlock.languageId, codeBlockIndex, element: undefined };
    }
    navigateToCodeBlock(type) {
        const position = this._editorWidget.getPosition();
        if (!this._codeBlocks?.length || !position) {
            return;
        }
        let codeBlock;
        const codeBlocks = this._codeBlocks.slice();
        if (type === 'previous') {
            codeBlock = codeBlocks.reverse().find(c => c.endLine < position.lineNumber);
        }
        else {
            codeBlock = codeBlocks.find(c => c.startLine > position.lineNumber);
        }
        if (!codeBlock) {
            return;
        }
        this.setPosition(new Position(codeBlock.startLine, 1), true);
    }
    showLastProvider(id) {
        if (!this._lastProvider || this._lastProvider.options.id !== id) {
            return;
        }
        this.show(this._lastProvider);
    }
    show(provider, symbol, showAccessibleViewHelp, position) {
        provider = provider ?? this._currentProvider;
        if (!provider) {
            return;
        }
        provider.onOpen?.();
        const delegate = {
            getAnchor: () => { return { x: (getActiveWindow().innerWidth / 2) - ((Math.min(this._layoutService.activeContainerDimension.width * 0.62 /* golden cut */, 600 /* DIMENSIONS.MAX_WIDTH */)) / 2), y: this._layoutService.activeContainerOffset.quickPickTop }; },
            render: (container) => {
                this._viewContainer = container;
                this._viewContainer.classList.add('accessible-view-container');
                return this._render(provider, container, showAccessibleViewHelp);
            },
            onHide: () => {
                if (!showAccessibleViewHelp) {
                    this._updateLastProvider();
                    this._currentProvider?.dispose();
                    this._currentProvider = undefined;
                    this._resetContextKeys();
                }
            }
        };
        this._contextViewService.showContextView(delegate);
        if (position) {
            // Context view takes time to show up, so we need to wait for it to show up before we can set the position
            queueMicrotask(() => {
                this._editorWidget.revealLine(position.lineNumber);
                this._editorWidget.setSelection({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column });
            });
        }
        if (symbol && this._currentProvider) {
            this.showSymbol(this._currentProvider, symbol);
        }
        if (provider instanceof AccessibleContentProvider && provider.onDidRequestClearLastProvider) {
            this._register(provider.onDidRequestClearLastProvider((id) => {
                if (this._lastProvider?.options.id === id) {
                    this._lastProvider = undefined;
                }
            }));
        }
        if (provider.options.id) {
            // only cache a provider with an ID so that it will eventually be cleared.
            this._lastProvider = provider;
        }
        if (provider.id === "panelChat" /* AccessibleViewProviderId.PanelChat */ || provider.id === "quickChat" /* AccessibleViewProviderId.QuickChat */) {
            this._register(this._codeBlockContextProviderService.registerProvider({ getCodeBlockContext: () => this.getCodeBlockContext() }, 'accessibleView'));
        }
        if (provider instanceof ExtensionContentProvider) {
            this._storageService.store(`${ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX}${provider.id}`, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        }
        if (provider.onDidChangeContent) {
            this._register(provider.onDidChangeContent(() => {
                if (this._viewContainer) {
                    this._render(provider, this._viewContainer, showAccessibleViewHelp);
                }
            }));
        }
    }
    previous() {
        const newContent = this._currentProvider?.providePreviousContent?.();
        if (!this._currentProvider || !this._viewContainer || !newContent) {
            return;
        }
        this._render(this._currentProvider, this._viewContainer, undefined, newContent);
    }
    next() {
        const newContent = this._currentProvider?.provideNextContent?.();
        if (!this._currentProvider || !this._viewContainer || !newContent) {
            return;
        }
        this._render(this._currentProvider, this._viewContainer, undefined, newContent);
    }
    _verbosityEnabled() {
        if (!this._currentProvider) {
            return false;
        }
        return isIAccessibleViewContentProvider(this._currentProvider) ? this._configurationService.getValue(this._currentProvider.verbositySettingKey) === true : this._storageService.getBoolean(`${ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX}${this._currentProvider.id}`, -1 /* StorageScope.APPLICATION */, false);
    }
    goToSymbol() {
        if (!this._currentProvider) {
            return;
        }
        this._isInQuickPick = true;
        this._instantiationService.createInstance(AccessibleViewSymbolQuickPick, this).show(this._currentProvider);
    }
    calculateCodeBlocks(markdown) {
        if (!markdown) {
            return;
        }
        if (this._currentProvider?.id !== "panelChat" /* AccessibleViewProviderId.PanelChat */ && this._currentProvider?.id !== "quickChat" /* AccessibleViewProviderId.QuickChat */) {
            return;
        }
        if (this._currentProvider.options.language && this._currentProvider.options.language !== 'markdown') {
            // Symbols haven't been provided and we cannot parse this language
            return;
        }
        const lines = markdown.split('\n');
        this._codeBlocks = [];
        let inBlock = false;
        let startLine = 0;
        let languageId;
        lines.forEach((line, i) => {
            if (!inBlock && line.startsWith('```')) {
                inBlock = true;
                startLine = i + 1;
                languageId = line.substring(3).trim();
            }
            else if (inBlock && line.endsWith('```')) {
                inBlock = false;
                const endLine = i;
                const code = lines.slice(startLine, endLine).join('\n');
                this._codeBlocks?.push({ startLine, endLine, code, languageId });
            }
        });
        this._accessibleViewContainsCodeBlocks.set(this._codeBlocks.length > 0);
    }
    getSymbols() {
        const provider = this._currentProvider ? this._currentProvider : undefined;
        if (!this._currentContent || !provider) {
            return;
        }
        const symbols = 'getSymbols' in provider ? provider.getSymbols?.() || [] : [];
        if (symbols?.length) {
            return symbols;
        }
        if (provider.options.language && provider.options.language !== 'markdown') {
            // Symbols haven't been provided and we cannot parse this language
            return;
        }
        const markdownTokens = marked.marked.lexer(this._currentContent);
        if (!markdownTokens) {
            return;
        }
        this._convertTokensToSymbols(markdownTokens, symbols);
        return symbols.length ? symbols : undefined;
    }
    openHelpLink() {
        if (!this._currentProvider?.options.readMoreUrl) {
            return;
        }
        this._openerService.open(URI.parse(this._currentProvider.options.readMoreUrl));
    }
    configureKeybindings(unassigned) {
        this._isInQuickPick = true;
        const provider = this._updateLastProvider();
        const items = unassigned ? provider?.options?.configureKeybindingItems : provider?.options?.configuredKeybindingItems;
        if (!items) {
            return;
        }
        const disposables = this._register(new DisposableStore());
        const quickPick = disposables.add(this._quickInputService.createQuickPick());
        quickPick.items = items;
        quickPick.title = localize('keybindings', 'Configure keybindings');
        quickPick.placeholder = localize('selectKeybinding', 'Select a command ID to configure a keybinding for it');
        quickPick.show();
        disposables.add(quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0];
            if (item) {
                await this._commandService.executeCommand('workbench.action.openGlobalKeybindings', item.id);
            }
            quickPick.dispose();
        }));
        disposables.add(quickPick.onDidHide(() => {
            if (!quickPick.selectedItems.length && provider) {
                this.show(provider);
            }
            disposables.dispose();
            this._isInQuickPick = false;
        }));
    }
    _convertTokensToSymbols(tokens, symbols) {
        let firstListItem;
        for (const token of tokens) {
            let label = undefined;
            if ('type' in token) {
                switch (token.type) {
                    case 'heading':
                    case 'paragraph':
                    case 'code':
                        label = token.text;
                        break;
                    case 'list': {
                        const firstItem = token.items[0];
                        if (!firstItem) {
                            break;
                        }
                        firstListItem = `- ${firstItem.text}`;
                        label = token.items.map(i => i.text).join(', ');
                        break;
                    }
                }
            }
            if (label) {
                symbols.push({ markdownToParse: label, label: localize('symbolLabel', "({0}) {1}", token.type, label), ariaLabel: localize('symbolLabelAria', "({0}) {1}", token.type, label), firstListItem });
                firstListItem = undefined;
            }
        }
    }
    showSymbol(provider, symbol) {
        if (!this._currentContent) {
            return;
        }
        let lineNumber = symbol.lineNumber;
        const markdownToParse = symbol.markdownToParse;
        if (lineNumber === undefined && markdownToParse === undefined) {
            // No symbols provided and we cannot parse this language
            return;
        }
        if (lineNumber === undefined && markdownToParse) {
            // Note that this scales poorly, thus isn't used for worst case scenarios like the terminal, for which a line number will always be provided.
            // Parse the markdown to find the line number
            const index = this._currentContent.split('\n').findIndex(line => line.includes(markdownToParse.split('\n')[0]) || (symbol.firstListItem && line.includes(symbol.firstListItem))) ?? -1;
            if (index >= 0) {
                lineNumber = index + 1;
            }
        }
        if (lineNumber === undefined) {
            return;
        }
        this._isInQuickPick = false;
        this.show(provider, undefined, undefined, { lineNumber, column: 1 });
        this._updateContextKeys(provider, true);
    }
    disableHint() {
        if (!isIAccessibleViewContentProvider(this._currentProvider)) {
            return;
        }
        this._configurationService.updateValue(this._currentProvider?.verbositySettingKey, false);
        alert(localize('disableAccessibilityHelp', '{0} accessibility verbosity is now disabled', this._currentProvider.verbositySettingKey));
    }
    _updateContextKeys(provider, shown) {
        if (provider.options.type === "help" /* AccessibleViewType.Help */) {
            this._accessiblityHelpIsShown.set(shown);
            this._accessibleViewIsShown.reset();
        }
        else {
            this._accessibleViewIsShown.set(shown);
            this._accessiblityHelpIsShown.reset();
        }
        this._accessibleViewSupportsNavigation.set(provider.provideNextContent !== undefined || provider.providePreviousContent !== undefined);
        this._accessibleViewVerbosityEnabled.set(this._verbosityEnabled());
        this._accessibleViewGoToSymbolSupported.set(this._goToSymbolsSupported() ? this.getSymbols()?.length > 0 : false);
    }
    _updateContent(provider, updatedContent) {
        let content = updatedContent ?? provider.provideContent();
        if (provider.options.type === "view" /* AccessibleViewType.View */) {
            this._currentContent = content;
            this._hasUnassignedKeybindings.reset();
            this._hasAssignedKeybindings.reset();
            return;
        }
        const readMoreLinkHint = this._readMoreHint(provider);
        const disableHelpHint = this._disableVerbosityHint(provider);
        const screenReaderModeHint = this._screenReaderModeHint(provider);
        const exitThisDialogHint = this._exitDialogHint(provider);
        let configureKbHint = '';
        let configureAssignedKbHint = '';
        const resolvedContent = resolveContentAndKeybindingItems(this._keybindingService, screenReaderModeHint + content + readMoreLinkHint + disableHelpHint + exitThisDialogHint);
        if (resolvedContent) {
            content = resolvedContent.content.value;
            if (resolvedContent.configureKeybindingItems) {
                provider.options.configureKeybindingItems = resolvedContent.configureKeybindingItems;
                this._hasUnassignedKeybindings.set(true);
                configureKbHint = this._configureUnassignedKbHint();
            }
            else {
                this._hasAssignedKeybindings.reset();
            }
            if (resolvedContent.configuredKeybindingItems) {
                provider.options.configuredKeybindingItems = resolvedContent.configuredKeybindingItems;
                this._hasAssignedKeybindings.set(true);
                configureAssignedKbHint = this._configureAssignedKbHint();
            }
            else {
                this._hasAssignedKeybindings.reset();
            }
        }
        this._currentContent = content + configureKbHint + configureAssignedKbHint;
    }
    _render(provider, container, showAccessibleViewHelp, updatedContent) {
        this._currentProvider = provider;
        this._accessibleViewCurrentProviderId.set(provider.id);
        const verbose = this._verbosityEnabled();
        this._updateContent(provider, updatedContent);
        this.calculateCodeBlocks(this._currentContent);
        this._updateContextKeys(provider, true);
        const widgetIsFocused = this._editorWidget.hasTextFocus() || this._editorWidget.hasWidgetFocus();
        this._getTextModel(URI.from({ path: `accessible-view-${provider.id}`, scheme: Schemas.accessibleView, fragment: this._currentContent })).then((model) => {
            if (!model) {
                return;
            }
            this._editorWidget.setModel(model);
            const domNode = this._editorWidget.getDomNode();
            if (!domNode) {
                return;
            }
            model.setLanguage(provider.options.language ?? 'markdown');
            container.appendChild(this._container);
            let actionsHint = '';
            const hasActions = this._accessibleViewSupportsNavigation.get() || this._accessibleViewVerbosityEnabled.get() || this._accessibleViewGoToSymbolSupported.get() || provider.actions?.length;
            if (verbose && !showAccessibleViewHelp && hasActions) {
                actionsHint = provider.options.position ? localize('ariaAccessibleViewActionsBottom', 'Explore actions such as disabling this hint (Shift+Tab), use Escape to exit this dialog.') : localize('ariaAccessibleViewActions', 'Explore actions such as disabling this hint (Shift+Tab).');
            }
            let ariaLabel = provider.options.type === "help" /* AccessibleViewType.Help */ ? localize('accessibility-help', "Accessibility Help") : localize('accessible-view', "Accessible View");
            this._title.textContent = ariaLabel;
            if (actionsHint && provider.options.type === "view" /* AccessibleViewType.View */) {
                ariaLabel = localize('accessible-view-hint', "Accessible View, {0}", actionsHint);
            }
            else if (actionsHint) {
                ariaLabel = localize('accessibility-help-hint', "Accessibility Help, {0}", actionsHint);
            }
            if (isWindows && widgetIsFocused) {
                // prevent the screen reader on windows from reading
                // the aria label again when it's refocused
                ariaLabel = '';
            }
            this._editorWidget.updateOptions({ ariaLabel });
            this._editorWidget.focus();
            if (this._currentProvider?.options.position) {
                const position = this._editorWidget.getPosition();
                const isDefaultPosition = position?.lineNumber === 1 && position.column === 1;
                if (this._currentProvider.options.position === 'bottom' || this._currentProvider.options.position === 'initial-bottom' && isDefaultPosition) {
                    const lastLine = this.editorWidget.getModel()?.getLineCount();
                    const position = lastLine !== undefined && lastLine > 0 ? new Position(lastLine, 1) : undefined;
                    if (position) {
                        this._editorWidget.setPosition(position);
                        this._editorWidget.revealLine(position.lineNumber);
                    }
                }
            }
        });
        this._updateToolbar(this._currentProvider.actions, provider.options.type);
        const hide = (e) => {
            if (!this._isInQuickPick) {
                provider.onClose();
            }
            e?.stopPropagation();
            this._contextViewService.hideContextView();
            if (this._isInQuickPick) {
                return;
            }
            this._updateContextKeys(provider, false);
            this._lastProvider = undefined;
            this._currentContent = undefined;
            this._currentProvider?.dispose();
            this._currentProvider = undefined;
        };
        const disposableStore = new DisposableStore();
        disposableStore.add(this._editorWidget.onKeyDown((e) => {
            if (e.keyCode === 3 /* KeyCode.Enter */) {
                this._commandService.executeCommand('editor.action.openLink');
            }
            else if (e.keyCode === 9 /* KeyCode.Escape */ || shouldHide(e.browserEvent, this._keybindingService, this._configurationService)) {
                hide(e);
            }
            else if (e.keyCode === 38 /* KeyCode.KeyH */ && provider.options.readMoreUrl) {
                const url = provider.options.readMoreUrl;
                alert(AccessibilityHelpNLS.openingDocs);
                this._openerService.open(URI.parse(url));
                e.preventDefault();
                e.stopPropagation();
            }
            if (provider instanceof AccessibleContentProvider) {
                provider.onKeyDown?.(e);
            }
        }));
        disposableStore.add(addDisposableListener(this._toolbar.getElement(), EventType.KEY_DOWN, (e) => {
            const keyboardEvent = new StandardKeyboardEvent(e);
            if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
                hide(e);
            }
        }));
        disposableStore.add(this._editorWidget.onDidBlurEditorWidget(() => {
            if (!isActiveElement(this._toolbar.getElement())) {
                hide();
            }
        }));
        disposableStore.add(this._editorWidget.onDidContentSizeChange(() => this._layout()));
        disposableStore.add(this._layoutService.onDidLayoutActiveContainer(() => this._layout()));
        return disposableStore;
    }
    _updateToolbar(providedActions, type) {
        this._toolbar.setAriaLabel(type === "help" /* AccessibleViewType.Help */ ? localize('accessibleHelpToolbar', 'Accessibility Help') : localize('accessibleViewToolbar', "Accessible View"));
        const toolbarMenu = this._register(this._menuService.createMenu(MenuId.AccessibleView, this._contextKeyService));
        const menuActions = getFlatActionBarActions(toolbarMenu.getActions({}));
        if (providedActions) {
            for (const providedAction of providedActions) {
                providedAction.class = providedAction.class || ThemeIcon.asClassName(Codicon.primitiveSquare);
                providedAction.checked = undefined;
            }
            this._toolbar.setActions([...providedActions, ...menuActions]);
        }
        else {
            this._toolbar.setActions(menuActions);
        }
    }
    _layout() {
        const dimension = this._layoutService.activeContainerDimension;
        const maxHeight = dimension.height && dimension.height * .4;
        const height = Math.min(maxHeight, this._editorWidget.getContentHeight());
        const width = Math.min(dimension.width * 0.62 /* golden cut */, 600 /* DIMENSIONS.MAX_WIDTH */);
        this._editorWidget.layout({ width, height });
    }
    async _getTextModel(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        return this._modelService.createModel(resource.fragment, null, resource, false);
    }
    _goToSymbolsSupported() {
        if (!this._currentProvider) {
            return false;
        }
        return this._currentProvider.options.type === "help" /* AccessibleViewType.Help */ || this._currentProvider.options.language === 'markdown' || this._currentProvider.options.language === undefined || (this._currentProvider instanceof AccessibleContentProvider && !!this._currentProvider.getSymbols?.());
    }
    _updateLastProvider() {
        const provider = this._currentProvider;
        if (!provider) {
            return;
        }
        const lastProvider = provider instanceof AccessibleContentProvider ? new AccessibleContentProvider(provider.id, provider.options, provider.provideContent.bind(provider), provider.onClose.bind(provider), provider.verbositySettingKey, provider.onOpen?.bind(provider), provider.actions, provider.provideNextContent?.bind(provider), provider.providePreviousContent?.bind(provider), provider.onDidChangeContent?.bind(provider), provider.onKeyDown?.bind(provider), provider.getSymbols?.bind(provider)) : new ExtensionContentProvider(provider.id, provider.options, provider.provideContent.bind(provider), provider.onClose.bind(provider), provider.onOpen?.bind(provider), provider.provideNextContent?.bind(provider), provider.providePreviousContent?.bind(provider), provider.actions, provider.onDidChangeContent?.bind(provider));
        return lastProvider;
    }
    showAccessibleViewHelp() {
        const lastProvider = this._updateLastProvider();
        if (!lastProvider) {
            return;
        }
        let accessibleViewHelpProvider;
        if (lastProvider instanceof AccessibleContentProvider) {
            accessibleViewHelpProvider = new AccessibleContentProvider(lastProvider.id, { type: "help" /* AccessibleViewType.Help */ }, () => lastProvider.options.customHelp ? lastProvider?.options.customHelp() : this._accessibleViewHelpDialogContent(this._goToSymbolsSupported()), () => {
                this._contextViewService.hideContextView();
                // HACK: Delay to allow the context view to hide #207638
                queueMicrotask(() => this.show(lastProvider));
            }, lastProvider.verbositySettingKey);
        }
        else {
            accessibleViewHelpProvider = new ExtensionContentProvider(lastProvider.id, { type: "help" /* AccessibleViewType.Help */ }, () => lastProvider.options.customHelp ? lastProvider?.options.customHelp() : this._accessibleViewHelpDialogContent(this._goToSymbolsSupported()), () => {
                this._contextViewService.hideContextView();
                // HACK: Delay to allow the context view to hide #207638
                queueMicrotask(() => this.show(lastProvider));
            });
        }
        this._contextViewService.hideContextView();
        // HACK: Delay to allow the context view to hide #186514
        if (accessibleViewHelpProvider) {
            queueMicrotask(() => this.show(accessibleViewHelpProvider, undefined, true));
        }
    }
    _accessibleViewHelpDialogContent(providerHasSymbols) {
        const navigationHint = this._navigationHint();
        const goToSymbolHint = this._goToSymbolHint(providerHasSymbols);
        const toolbarHint = localize('toolbar', "Navigate to the toolbar (Shift+Tab).");
        const chatHints = this._getChatHints();
        let hint = localize('intro', "In the accessible view, you can:\n");
        if (navigationHint) {
            hint += ' - ' + navigationHint + '\n';
        }
        if (goToSymbolHint) {
            hint += ' - ' + goToSymbolHint + '\n';
        }
        if (toolbarHint) {
            hint += ' - ' + toolbarHint + '\n';
        }
        if (chatHints) {
            hint += chatHints;
        }
        return hint;
    }
    _getChatHints() {
        if (this._currentProvider?.id !== "panelChat" /* AccessibleViewProviderId.PanelChat */ && this._currentProvider?.id !== "quickChat" /* AccessibleViewProviderId.QuickChat */) {
            return;
        }
        return [localize('insertAtCursor', " - Insert the code block at the cursor{0}.", '<keybinding:workbench.action.chat.insertCodeBlock>'),
            localize('insertIntoNewFile', " - Insert the code block into a new file{0}.", '<keybinding:workbench.action.chat.insertIntoNewFile>'),
            localize('runInTerminal', " - Run the code block in the terminal{0}.\n", '<keybinding:workbench.action.chat.runInTerminal>')].join('\n');
    }
    _navigationHint() {
        return localize('accessibleViewNextPreviousHint', "Show the next item{0} or previous item{1}.", `<keybinding:${"editor.action.accessibleViewNext" /* AccessibilityCommandId.ShowNext */}`, `<keybinding:${"editor.action.accessibleViewPrevious" /* AccessibilityCommandId.ShowPrevious */}>`);
    }
    _disableVerbosityHint(provider) {
        if (provider.options.type === "help" /* AccessibleViewType.Help */ && this._verbosityEnabled()) {
            return localize('acessibleViewDisableHint', "\nDisable accessibility verbosity for this feature{0}.", `<keybinding:${"editor.action.accessibleViewDisableHint" /* AccessibilityCommandId.DisableVerbosityHint */}>`);
        }
        return '';
    }
    _goToSymbolHint(providerHasSymbols) {
        if (!providerHasSymbols) {
            return;
        }
        return localize('goToSymbolHint', 'Go to a symbol{0}.', `<keybinding:${"editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */}>`);
    }
    _configureUnassignedKbHint() {
        const configureKb = this._keybindingService.lookupKeybinding("editor.action.accessibilityHelpConfigureKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureKeybindings */)?.getAriaLabel();
        const keybindingToConfigureQuickPick = configureKb ? '(' + configureKb + ')' : 'by assigning a keybinding to the command Accessibility Help Configure Unassigned Keybindings.';
        return localize('configureKb', '\nConfigure keybindings for commands that lack them {0}.', keybindingToConfigureQuickPick);
    }
    _configureAssignedKbHint() {
        const configureKb = this._keybindingService.lookupKeybinding("editor.action.accessibilityHelpConfigureAssignedKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureAssignedKeybindings */)?.getAriaLabel();
        const keybindingToConfigureQuickPick = configureKb ? '(' + configureKb + ')' : 'by assigning a keybinding to the command Accessibility Help Configure Assigned Keybindings.';
        return localize('configureKbAssigned', '\nConfigure keybindings for commands that already have assignments {0}.', keybindingToConfigureQuickPick);
    }
    _screenReaderModeHint(provider) {
        const accessibilitySupport = this._accessibilityService.isScreenReaderOptimized();
        let screenReaderModeHint = '';
        const turnOnMessage = (isMacintosh
            ? AccessibilityHelpNLS.changeConfigToOnMac
            : AccessibilityHelpNLS.changeConfigToOnWinLinux);
        if (accessibilitySupport && provider.id === "editor" /* AccessibleViewProviderId.Editor */) {
            screenReaderModeHint = AccessibilityHelpNLS.auto_on;
            screenReaderModeHint += '\n';
        }
        else if (!accessibilitySupport) {
            screenReaderModeHint = AccessibilityHelpNLS.auto_off + '\n' + turnOnMessage;
            screenReaderModeHint += '\n';
        }
        return screenReaderModeHint;
    }
    _exitDialogHint(provider) {
        return this._verbosityEnabled() && !provider.options.position ? localize('exit', '\nExit this dialog (Escape).') : '';
    }
    _readMoreHint(provider) {
        return provider.options.readMoreUrl ? localize("openDoc", "\nOpen a browser window with more information related to accessibility{0}.", `<keybinding:${"editor.action.accessibilityHelpOpenHelpLink" /* AccessibilityCommandId.AccessibilityHelpOpenHelpLink */}>`) : '';
    }
};
AccessibleView = __decorate([
    __param(0, IOpenerService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IModelService),
    __param(4, IContextViewService),
    __param(5, IContextKeyService),
    __param(6, IAccessibilityService),
    __param(7, IKeybindingService),
    __param(8, ILayoutService),
    __param(9, IMenuService),
    __param(10, ICommandService),
    __param(11, IChatCodeBlockContextProviderService),
    __param(12, IStorageService),
    __param(13, ITextModelService),
    __param(14, IQuickInputService)
], AccessibleView);
export { AccessibleView };
let AccessibleViewService = class AccessibleViewService extends Disposable {
    constructor(_instantiationService, _configurationService, _keybindingService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._keybindingService = _keybindingService;
    }
    show(provider, position) {
        if (!this._accessibleView) {
            this._accessibleView = this._register(this._instantiationService.createInstance(AccessibleView));
        }
        this._accessibleView.show(provider, undefined, undefined, position);
    }
    configureKeybindings(unassigned) {
        this._accessibleView?.configureKeybindings(unassigned);
    }
    openHelpLink() {
        this._accessibleView?.openHelpLink();
    }
    showLastProvider(id) {
        this._accessibleView?.showLastProvider(id);
    }
    next() {
        this._accessibleView?.next();
    }
    previous() {
        this._accessibleView?.previous();
    }
    goToSymbol() {
        this._accessibleView?.goToSymbol();
    }
    getOpenAriaHint(verbositySettingKey) {
        if (!this._configurationService.getValue(verbositySettingKey)) {
            return null;
        }
        const keybinding = this._keybindingService.lookupKeybinding("editor.action.accessibleView" /* AccessibilityCommandId.OpenAccessibleView */)?.getAriaLabel();
        let hint = null;
        if (keybinding) {
            hint = localize('acessibleViewHint', "Inspect this in the accessible view with {0}", keybinding);
        }
        else {
            hint = localize('acessibleViewHintNoKbEither', "Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.");
        }
        return hint;
    }
    disableHint() {
        this._accessibleView?.disableHint();
    }
    showAccessibleViewHelp() {
        this._accessibleView?.showAccessibleViewHelp();
    }
    getPosition(id) {
        return this._accessibleView?.getPosition(id) ?? undefined;
    }
    getLastPosition() {
        const lastLine = this._accessibleView?.editorWidget.getModel()?.getLineCount();
        return lastLine !== undefined && lastLine > 0 ? new Position(lastLine, 1) : undefined;
    }
    setPosition(position, reveal, select) {
        this._accessibleView?.setPosition(position, reveal, select);
    }
    getCodeBlockContext() {
        return this._accessibleView?.getCodeBlockContext();
    }
    navigateToCodeBlock(type) {
        this._accessibleView?.navigateToCodeBlock(type);
    }
};
AccessibleViewService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IKeybindingService)
], AccessibleViewService);
export { AccessibleViewService };
let AccessibleViewSymbolQuickPick = class AccessibleViewSymbolQuickPick {
    constructor(_accessibleView, _quickInputService) {
        this._accessibleView = _accessibleView;
        this._quickInputService = _quickInputService;
    }
    show(provider) {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this._quickInputService.createQuickPick());
        quickPick.placeholder = localize('accessibleViewSymbolQuickPickPlaceholder', "Type to search symbols");
        quickPick.title = localize('accessibleViewSymbolQuickPickTitle', "Go to Symbol Accessible View");
        const picks = [];
        const symbols = this._accessibleView.getSymbols();
        if (!symbols) {
            return;
        }
        for (const symbol of symbols) {
            picks.push({
                label: symbol.label,
                ariaLabel: symbol.ariaLabel,
                firstListItem: symbol.firstListItem,
                lineNumber: symbol.lineNumber,
                endLineNumber: symbol.endLineNumber,
                markdownToParse: symbol.markdownToParse
            });
        }
        quickPick.canSelectMany = false;
        quickPick.items = picks;
        quickPick.show();
        disposables.add(quickPick.onDidAccept(() => {
            this._accessibleView.showSymbol(provider, quickPick.selectedItems[0]);
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => {
            if (quickPick.selectedItems.length === 0) {
                // this was escaped, so refocus the accessible view
                this._accessibleView.show(provider);
            }
            disposables.dispose();
        }));
    }
};
AccessibleViewSymbolQuickPick = __decorate([
    __param(1, IQuickInputService)
], AccessibleViewSymbolQuickPick);
function shouldHide(event, keybindingService, configurationService) {
    if (!configurationService.getValue("accessibility.accessibleView.closeOnKeyPress" /* AccessibilityWorkbenchSettingId.AccessibleViewCloseOnKeyPress */)) {
        return false;
    }
    const standardKeyboardEvent = new StandardKeyboardEvent(event);
    const resolveResult = keybindingService.softDispatch(standardKeyboardEvent, standardKeyboardEvent.target);
    const isValidChord = resolveResult.kind === 1 /* ResultKind.MoreChordsNeeded */;
    if (keybindingService.inChordMode || isValidChord) {
        return false;
    }
    return shouldHandleKey(event) && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
}
function shouldHandleKey(event) {
    return !!event.code.match(/^(Key[A-Z]|Digit[0-9]|Equal|Comma|Period|Slash|Quote|Backquote|Backslash|Minus|Semicolon|Space|Enter)$/);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNySCxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNEIsTUFBTSxrRUFBa0UsQ0FBQztBQUM5SCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxD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