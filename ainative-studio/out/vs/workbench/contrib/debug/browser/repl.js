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
var Repl_1, ReplOptions_1;
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { HistoryNavigator } from '../../../../base/common/history.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI as uri } from '../../../../base/common/uri.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../editor/common/config/editorOptions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CompletionItemKinds } from '../../../../editor/common/languages.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize, localize2 } from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { editorForeground, resolveColorValue } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { FilterViewPane, ViewAction } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { CONTEXT_DEBUG_STATE, CONTEXT_IN_DEBUG_REPL, CONTEXT_MULTI_SESSION_REPL, DEBUG_SCHEME, IDebugService, REPL_VIEW_ID, getStateLabel } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { ReplEvaluationResult, ReplGroup } from '../common/replModel.js';
import { FocusSessionActionViewItem } from './debugActionViewItems.js';
import { DEBUG_COMMAND_CATEGORY, FOCUS_REPL_ID } from './debugCommands.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
import { debugConsoleClearAll, debugConsoleEvaluationPrompt } from './debugIcons.js';
import './media/repl.css';
import { ReplFilter } from './replFilter.js';
import { ReplAccessibilityProvider, ReplDataSource, ReplDelegate, ReplEvaluationInputsRenderer, ReplEvaluationResultsRenderer, ReplGroupRenderer, ReplOutputElementRenderer, ReplRawObjectsRenderer, ReplVariablesRenderer } from './replViewer.js';
const $ = dom.$;
const HISTORY_STORAGE_KEY = 'debug.repl.history';
const FILTER_HISTORY_STORAGE_KEY = 'debug.repl.filterHistory';
const FILTER_VALUE_STORAGE_KEY = 'debug.repl.filterValue';
const DECORATION_KEY = 'replinputdecoration';
function revealLastElement(tree) {
    tree.scrollTop = tree.scrollHeight - tree.renderHeight;
    // tree.scrollTop = 1e6;
}
const sessionsToIgnore = new Set();
const identityProvider = { getId: (element) => element.getId() };
let Repl = class Repl extends FilterViewPane {
    static { Repl_1 = this; }
    static { this.REFRESH_DELAY = 50; } // delay in ms to refresh the repl for new elements to show
    static { this.URI = uri.parse(`${DEBUG_SCHEME}:replinput`); }
    constructor(options, debugService, instantiationService, storageService, themeService, modelService, contextKeyService, codeEditorService, viewDescriptorService, contextMenuService, configurationService, textResourcePropertiesService, editorService, keybindingService, openerService, hoverService, menuService, languageFeaturesService, logService) {
        const filterText = storageService.get(FILTER_VALUE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '');
        super({
            ...options,
            filterOptions: {
                placeholder: localize({ key: 'workbench.debug.filter.placeholder', comment: ['Text in the brackets after e.g. is not localizable'] }, "Filter (e.g. text, !exclude, \\escape)"),
                text: filterText,
                history: JSON.parse(storageService.get(FILTER_HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '[]')),
            }
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.storageService = storageService;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.textResourcePropertiesService = textResourcePropertiesService;
        this.editorService = editorService;
        this.keybindingService = keybindingService;
        this.languageFeaturesService = languageFeaturesService;
        this.logService = logService;
        this.previousTreeScrollHeight = 0;
        this.styleChangedWhenInvisible = false;
        this.modelChangeListener = Disposable.None;
        this.findIsOpen = false;
        this.menu = menuService.createMenu(MenuId.DebugConsoleContext, contextKeyService);
        this._register(this.menu);
        this.history = this._register(new HistoryNavigator(new Set(JSON.parse(this.storageService.get(HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '[]'))), 100));
        this.filter = new ReplFilter();
        this.filter.filterQuery = filterText;
        this.multiSessionRepl = CONTEXT_MULTI_SESSION_REPL.bindTo(contextKeyService);
        this.replOptions = this._register(this.instantiationService.createInstance(ReplOptions, this.id, () => this.getLocationBasedColors().background));
        this._register(this.replOptions.onDidChange(() => this.onDidStyleChange()));
        codeEditorService.registerDecorationType('repl-decoration', DECORATION_KEY, {});
        this.multiSessionRepl.set(this.isMultiSessionView);
        this.registerListeners();
    }
    registerListeners() {
        if (this.debugService.getViewModel().focusedSession) {
            this.onDidFocusSession(this.debugService.getViewModel().focusedSession);
        }
        this._register(this.debugService.getViewModel().onDidFocusSession(session => {
            this.onDidFocusSession(session);
        }));
        this._register(this.debugService.getViewModel().onDidEvaluateLazyExpression(async (e) => {
            if (e instanceof Variable && this.tree?.hasNode(e)) {
                await this.tree.updateChildren(e, false, true);
                await this.tree.expand(e);
            }
        }));
        this._register(this.debugService.onWillNewSession(async (newSession) => {
            // Need to listen to output events for sessions which are not yet fully initialised
            const input = this.tree?.getInput();
            if (!input || input.state === 0 /* State.Inactive */) {
                await this.selectSession(newSession);
            }
            this.multiSessionRepl.set(this.isMultiSessionView);
        }));
        this._register(this.debugService.onDidEndSession(async () => {
            // Update view, since orphaned sessions might now be separate
            await Promise.resolve(); // allow other listeners to go first, so sessions can update parents
            this.multiSessionRepl.set(this.isMultiSessionView);
        }));
        this._register(this.themeService.onDidColorThemeChange(() => {
            this.refreshReplElements(false);
            if (this.isVisible()) {
                this.updateInputDecoration();
            }
        }));
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (!visible) {
                return;
            }
            if (!this.model) {
                this.model = this.modelService.getModel(Repl_1.URI) || this.modelService.createModel('', null, Repl_1.URI, true);
            }
            const focusedSession = this.debugService.getViewModel().focusedSession;
            if (this.tree && this.tree.getInput() !== focusedSession) {
                this.onDidFocusSession(focusedSession);
            }
            this.setMode();
            this.replInput.setModel(this.model);
            this.updateInputDecoration();
            this.refreshReplElements(true);
            if (this.styleChangedWhenInvisible) {
                this.styleChangedWhenInvisible = false;
                this.tree?.updateChildren(undefined, true, false);
                this.onDidStyleChange();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.console.wordWrap') && this.tree) {
                this.tree.dispose();
                this.treeContainer.innerText = '';
                dom.clearNode(this.treeContainer);
                this.createReplTree();
            }
            if (e.affectsConfiguration('debug.console.acceptSuggestionOnEnter')) {
                const config = this.configurationService.getValue('debug');
                this.replInput.updateOptions({
                    acceptSuggestionOnEnter: config.console.acceptSuggestionOnEnter === 'on' ? 'on' : 'off'
                });
            }
        }));
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this.setMode();
        }));
        this._register(this.filterWidget.onDidChangeFilterText(() => {
            this.filter.filterQuery = this.filterWidget.getFilterText();
            if (this.tree) {
                this.tree.refilter();
                revealLastElement(this.tree);
            }
        }));
    }
    async onDidFocusSession(session) {
        if (session) {
            sessionsToIgnore.delete(session);
            this.completionItemProvider?.dispose();
            if (session.capabilities.supportsCompletionsRequest) {
                this.completionItemProvider = this.languageFeaturesService.completionProvider.register({ scheme: DEBUG_SCHEME, pattern: '**/replinput', hasAccessToAllModels: true }, {
                    _debugDisplayName: 'debugConsole',
                    triggerCharacters: session.capabilities.completionTriggerCharacters || ['.'],
                    provideCompletionItems: async (_, position, _context, token) => {
                        // Disable history navigation because up and down are used to navigate through the suggest widget
                        this.setHistoryNavigationEnablement(false);
                        const model = this.replInput.getModel();
                        if (model) {
                            const text = model.getValue();
                            const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                            const frameId = focusedStackFrame ? focusedStackFrame.frameId : undefined;
                            const response = await session.completions(frameId, focusedStackFrame?.thread.threadId || 0, text, position, token);
                            const suggestions = [];
                            const computeRange = (length) => Range.fromPositions(position.delta(0, -length), position);
                            if (response && response.body && response.body.targets) {
                                response.body.targets.forEach(item => {
                                    if (item && item.label) {
                                        let insertTextRules = undefined;
                                        let insertText = item.text || item.label;
                                        if (typeof item.selectionStart === 'number') {
                                            // If a debug completion item sets a selection we need to use snippets to make sure the selection is selected #90974
                                            insertTextRules = 4 /* CompletionItemInsertTextRule.InsertAsSnippet */;
                                            const selectionLength = typeof item.selectionLength === 'number' ? item.selectionLength : 0;
                                            const placeholder = selectionLength > 0 ? '${1:' + insertText.substring(item.selectionStart, item.selectionStart + selectionLength) + '}$0' : '$0';
                                            insertText = insertText.substring(0, item.selectionStart) + placeholder + insertText.substring(item.selectionStart + selectionLength);
                                        }
                                        suggestions.push({
                                            label: item.label,
                                            insertText,
                                            detail: item.detail,
                                            kind: CompletionItemKinds.fromString(item.type || 'property'),
                                            filterText: (item.start && item.length) ? text.substring(item.start, item.start + item.length).concat(item.label) : undefined,
                                            range: computeRange(item.length || 0),
                                            sortText: item.sortText,
                                            insertTextRules
                                        });
                                    }
                                });
                            }
                            if (this.configurationService.getValue('debug').console.historySuggestions) {
                                const history = this.history.getHistory();
                                const idxLength = String(history.length).length;
                                history.forEach((h, i) => suggestions.push({
                                    label: h,
                                    insertText: h,
                                    kind: 18 /* CompletionItemKind.Text */,
                                    range: computeRange(h.length),
                                    sortText: 'ZZZ' + String(history.length - i).padStart(idxLength, '0')
                                }));
                            }
                            return { suggestions };
                        }
                        return Promise.resolve({ suggestions: [] });
                    }
                });
            }
        }
        await this.selectSession();
    }
    getFilterStats() {
        // This could be called before the tree is created when setting this.filterState.filterText value
        return {
            total: this.tree?.getNode().children.length ?? 0,
            filtered: this.tree?.getNode().children.filter(c => c.visible).length ?? 0
        };
    }
    get isReadonly() {
        // Do not allow to edit inactive sessions
        const session = this.tree?.getInput();
        if (session && session.state !== 0 /* State.Inactive */) {
            return false;
        }
        return true;
    }
    showPreviousValue() {
        if (!this.isReadonly) {
            this.navigateHistory(true);
        }
    }
    showNextValue() {
        if (!this.isReadonly) {
            this.navigateHistory(false);
        }
    }
    focusFilter() {
        this.filterWidget.focus();
    }
    openFind() {
        this.tree?.openFind();
    }
    setMode() {
        if (!this.isVisible()) {
            return;
        }
        const activeEditorControl = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeEditorControl)) {
            this.modelChangeListener.dispose();
            this.modelChangeListener = activeEditorControl.onDidChangeModelLanguage(() => this.setMode());
            if (this.model && activeEditorControl.hasModel()) {
                this.model.setLanguage(activeEditorControl.getModel().getLanguageId());
            }
        }
    }
    onDidStyleChange() {
        if (!this.isVisible()) {
            this.styleChangedWhenInvisible = true;
            return;
        }
        if (this.styleElement) {
            this.replInput.updateOptions({
                fontSize: this.replOptions.replConfiguration.fontSize,
                lineHeight: this.replOptions.replConfiguration.lineHeight,
                fontFamily: this.replOptions.replConfiguration.fontFamily === 'default' ? EDITOR_FONT_DEFAULTS.fontFamily : this.replOptions.replConfiguration.fontFamily
            });
            const replInputLineHeight = this.replInput.getOption(68 /* EditorOption.lineHeight */);
            // Set the font size, font family, line height and align the twistie to be centered, and input theme color
            this.styleElement.textContent = `
				.repl .repl-input-wrapper .repl-input-chevron {
					line-height: ${replInputLineHeight}px
				}

				.repl .repl-input-wrapper .monaco-editor .lines-content {
					background-color: ${this.replOptions.replConfiguration.backgroundColor};
				}
			`;
            const cssFontFamily = this.replOptions.replConfiguration.fontFamily === 'default' ? 'var(--monaco-monospace-font)' : this.replOptions.replConfiguration.fontFamily;
            this.container.style.setProperty(`--vscode-repl-font-family`, cssFontFamily);
            this.container.style.setProperty(`--vscode-repl-font-size`, `${this.replOptions.replConfiguration.fontSize}px`);
            this.container.style.setProperty(`--vscode-repl-font-size-for-twistie`, `${this.replOptions.replConfiguration.fontSizeForTwistie}px`);
            this.container.style.setProperty(`--vscode-repl-line-height`, this.replOptions.replConfiguration.cssLineHeight);
            this.tree?.rerender();
            if (this.bodyContentDimension) {
                this.layoutBodyContent(this.bodyContentDimension.height, this.bodyContentDimension.width);
            }
        }
    }
    navigateHistory(previous) {
        const historyInput = (previous ?
            (this.history.previous() ?? this.history.first()) : this.history.next())
            ?? '';
        this.replInput.setValue(historyInput);
        aria.status(historyInput);
        // always leave cursor at the end.
        this.replInput.setPosition({ lineNumber: 1, column: historyInput.length + 1 });
        this.setHistoryNavigationEnablement(true);
    }
    async selectSession(session) {
        const treeInput = this.tree?.getInput();
        if (!session) {
            const focusedSession = this.debugService.getViewModel().focusedSession;
            // If there is a focusedSession focus on that one, otherwise just show any other not ignored session
            if (focusedSession) {
                session = focusedSession;
            }
            else if (!treeInput || sessionsToIgnore.has(treeInput)) {
                session = this.debugService.getModel().getSessions(true).find(s => !sessionsToIgnore.has(s));
            }
        }
        if (session) {
            this.replElementsChangeListener?.dispose();
            this.replElementsChangeListener = session.onDidChangeReplElements(() => {
                this.refreshReplElements(session.getReplElements().length === 0);
            });
            if (this.tree && treeInput !== session) {
                try {
                    await this.tree.setInput(session);
                }
                catch (err) {
                    // Ignore error because this may happen multiple times while refreshing,
                    // then changing the root may fail. Log to help with debugging if needed.
                    this.logService.error(err);
                }
                revealLastElement(this.tree);
            }
        }
        this.replInput?.updateOptions({ readOnly: this.isReadonly });
        this.updateInputDecoration();
    }
    async clearRepl() {
        const session = this.tree?.getInput();
        if (session) {
            session.removeReplExpressions();
            if (session.state === 0 /* State.Inactive */) {
                // Ignore inactive sessions which got cleared - so they are not shown any more
                sessionsToIgnore.add(session);
                await this.selectSession();
                this.multiSessionRepl.set(this.isMultiSessionView);
            }
        }
        this.replInput.focus();
    }
    acceptReplInput() {
        const session = this.tree?.getInput();
        if (session && !this.isReadonly) {
            session.addReplExpression(this.debugService.getViewModel().focusedStackFrame, this.replInput.getValue());
            revealLastElement(this.tree);
            this.history.add(this.replInput.getValue());
            this.replInput.setValue('');
            if (this.bodyContentDimension) {
                // Trigger a layout to shrink a potential multi line input
                this.layoutBodyContent(this.bodyContentDimension.height, this.bodyContentDimension.width);
            }
        }
    }
    sendReplInput(input) {
        const session = this.tree?.getInput();
        if (session && !this.isReadonly) {
            session.addReplExpression(this.debugService.getViewModel().focusedStackFrame, input);
            revealLastElement(this.tree);
            this.history.add(input);
        }
    }
    getVisibleContent() {
        let text = '';
        if (this.model && this.tree) {
            const lineDelimiter = this.textResourcePropertiesService.getEOL(this.model.uri);
            const traverseAndAppend = (node) => {
                node.children.forEach(child => {
                    if (child.visible) {
                        text += child.element.toString().trimRight() + lineDelimiter;
                        if (!child.collapsed && child.children.length) {
                            traverseAndAppend(child);
                        }
                    }
                });
            };
            traverseAndAppend(this.tree.getNode());
        }
        return removeAnsiEscapeCodes(text);
    }
    layoutBodyContent(height, width) {
        this.bodyContentDimension = new dom.Dimension(width, height);
        const replInputHeight = Math.min(this.replInput.getContentHeight(), height);
        if (this.tree) {
            const lastElementVisible = this.tree.scrollTop + this.tree.renderHeight >= this.tree.scrollHeight;
            const treeHeight = height - replInputHeight;
            this.tree.getHTMLElement().style.height = `${treeHeight}px`;
            this.tree.layout(treeHeight, width);
            if (lastElementVisible) {
                revealLastElement(this.tree);
            }
        }
        this.replInputContainer.style.height = `${replInputHeight}px`;
        this.replInput.layout({ width: width - 30, height: replInputHeight });
    }
    collapseAll() {
        this.tree?.collapseAll();
    }
    getDebugSession() {
        return this.tree?.getInput();
    }
    getReplInput() {
        return this.replInput;
    }
    getReplDataSource() {
        return this.replDataSource;
    }
    getFocusedElement() {
        return this.tree?.getFocus()?.[0];
    }
    focusTree() {
        this.tree?.domFocus();
    }
    async focus() {
        super.focus();
        await timeout(0); // wait a task for the repl to get attached to the DOM, #83387
        this.replInput.focus();
    }
    createActionViewItem(action) {
        if (action.id === selectReplCommandId) {
            const session = (this.tree ? this.tree.getInput() : undefined) ?? this.debugService.getViewModel().focusedSession;
            return this.instantiationService.createInstance(SelectReplActionViewItem, action, session);
        }
        return super.createActionViewItem(action);
    }
    get isMultiSessionView() {
        return this.debugService.getModel().getSessions(true).filter(s => s.hasSeparateRepl() && !sessionsToIgnore.has(s)).length > 1;
    }
    // --- Cached locals
    get refreshScheduler() {
        const autoExpanded = new Set();
        return new RunOnceScheduler(async () => {
            if (!this.tree || !this.tree.getInput() || !this.isVisible()) {
                return;
            }
            await this.tree.updateChildren(undefined, true, false, { diffIdentityProvider: identityProvider });
            const session = this.tree.getInput();
            if (session) {
                // Automatically expand repl group elements when specified
                const autoExpandElements = async (elements) => {
                    for (const element of elements) {
                        if (element instanceof ReplGroup) {
                            if (element.autoExpand && !autoExpanded.has(element.getId())) {
                                autoExpanded.add(element.getId());
                                await this.tree.expand(element);
                            }
                            if (!this.tree.isCollapsed(element)) {
                                // Repl groups can have children which are repl groups thus we might need to expand those as well
                                await autoExpandElements(element.getChildren());
                            }
                        }
                    }
                };
                await autoExpandElements(session.getReplElements());
            }
            // Repl elements count changed, need to update filter stats on the badge
            const { total, filtered } = this.getFilterStats();
            this.filterWidget.updateBadge(total === filtered || total === 0 ? undefined : localize('showing filtered repl lines', "Showing {0} of {1}", filtered, total));
        }, Repl_1.REFRESH_DELAY);
    }
    // --- Creation
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'repl',
            focusNotifiers: [this, this.filterWidget],
            focusNextWidget: () => {
                const element = this.tree?.getHTMLElement();
                if (this.filterWidget.hasFocus()) {
                    this.tree?.domFocus();
                }
                else if (element && dom.isActiveElement(element)) {
                    this.focus();
                }
            },
            focusPreviousWidget: () => {
                const element = this.tree?.getHTMLElement();
                if (this.replInput.hasTextFocus()) {
                    this.tree?.domFocus();
                }
                else if (element && dom.isActiveElement(element)) {
                    this.focusFilter();
                }
            }
        }));
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.container = dom.append(parent, $('.repl'));
        this.treeContainer = dom.append(this.container, $(`.repl-tree.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
        this.createReplInput(this.container);
        this.createReplTree();
    }
    createReplTree() {
        this.replDelegate = new ReplDelegate(this.configurationService, this.replOptions);
        const wordWrap = this.configurationService.getValue('debug').console.wordWrap;
        this.treeContainer.classList.toggle('word-wrap', wordWrap);
        const expressionRenderer = this.instantiationService.createInstance(DebugExpressionRenderer);
        this.replDataSource = new ReplDataSource();
        const tree = this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'DebugRepl', this.treeContainer, this.replDelegate, [
            this.instantiationService.createInstance(ReplVariablesRenderer, expressionRenderer),
            this.instantiationService.createInstance(ReplOutputElementRenderer, expressionRenderer),
            new ReplEvaluationInputsRenderer(),
            this.instantiationService.createInstance(ReplGroupRenderer, expressionRenderer),
            new ReplEvaluationResultsRenderer(expressionRenderer),
            new ReplRawObjectsRenderer(expressionRenderer),
        ], this.replDataSource, {
            filter: this.filter,
            accessibilityProvider: new ReplAccessibilityProvider(),
            identityProvider,
            userSelection: true,
            mouseSupport: false,
            findWidgetEnabled: true,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => e.toString(true) },
            horizontalScrolling: !wordWrap,
            setRowLineHeight: false,
            supportDynamicHeights: wordWrap,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        this._register(tree.onDidChangeContentHeight(() => {
            if (tree.scrollHeight !== this.previousTreeScrollHeight) {
                // Due to rounding, the scrollTop + renderHeight will not exactly match the scrollHeight.
                // Consider the tree to be scrolled all the way down if it is within 2px of the bottom.
                const lastElementWasVisible = tree.scrollTop + tree.renderHeight >= this.previousTreeScrollHeight - 2;
                if (lastElementWasVisible) {
                    setTimeout(() => {
                        // Can't set scrollTop during this event listener, the list might overwrite the change
                        revealLastElement(tree);
                    }, 0);
                }
            }
            this.previousTreeScrollHeight = tree.scrollHeight;
        }));
        this._register(tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(tree.onDidChangeFindOpenState((open) => this.findIsOpen = open));
        let lastSelectedString;
        this._register(tree.onMouseClick(() => {
            if (this.findIsOpen) {
                return;
            }
            const selection = dom.getWindow(this.treeContainer).getSelection();
            if (!selection || selection.type !== 'Range' || lastSelectedString === selection.toString()) {
                // only focus the input if the user is not currently selecting and find isn't open.
                this.replInput.focus();
            }
            lastSelectedString = selection ? selection.toString() : '';
        }));
        // Make sure to select the session if debugging is already active
        this.selectSession();
        this.styleElement = domStylesheetsJs.createStyleSheet(this.container);
        this.onDidStyleChange();
    }
    createReplInput(container) {
        this.replInputContainer = dom.append(container, $('.repl-input-wrapper'));
        dom.append(this.replInputContainer, $('.repl-input-chevron' + ThemeIcon.asCSSSelector(debugConsoleEvaluationPrompt)));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(this.scopedContextKeyService, this));
        this.setHistoryNavigationEnablement = enabled => {
            historyNavigationBackwardsEnablement.set(enabled);
            historyNavigationForwardsEnablement.set(enabled);
        };
        CONTEXT_IN_DEBUG_REPL.bindTo(this.scopedContextKeyService).set(true);
        this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        const options = getSimpleEditorOptions(this.configurationService);
        options.readOnly = true;
        options.suggest = { showStatusBar: true };
        const config = this.configurationService.getValue('debug');
        options.acceptSuggestionOnEnter = config.console.acceptSuggestionOnEnter === 'on' ? 'on' : 'off';
        options.ariaLabel = this.getAriaLabel();
        this.replInput = this.scopedInstantiationService.createInstance(CodeEditorWidget, this.replInputContainer, options, getSimpleCodeEditorWidgetOptions());
        let lastContentHeight = -1;
        this._register(this.replInput.onDidChangeModelContent(() => {
            const model = this.replInput.getModel();
            this.setHistoryNavigationEnablement(!!model && model.getValue() === '');
            const contentHeight = this.replInput.getContentHeight();
            if (contentHeight !== lastContentHeight) {
                lastContentHeight = contentHeight;
                if (this.bodyContentDimension) {
                    this.layoutBodyContent(this.bodyContentDimension.height, this.bodyContentDimension.width);
                }
            }
        }));
        // We add the input decoration only when the focus is in the input #61126
        this._register(this.replInput.onDidFocusEditorText(() => this.updateInputDecoration()));
        this._register(this.replInput.onDidBlurEditorText(() => this.updateInputDecoration()));
        this._register(dom.addStandardDisposableListener(this.replInputContainer, dom.EventType.FOCUS, () => this.replInputContainer.classList.add('synthetic-focus')));
        this._register(dom.addStandardDisposableListener(this.replInputContainer, dom.EventType.BLUR, () => this.replInputContainer.classList.remove('synthetic-focus')));
    }
    getAriaLabel() {
        let ariaLabel = localize('debugConsole', "Debug Console");
        if (!this.configurationService.getValue("accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */)) {
            return ariaLabel;
        }
        const keybinding = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getAriaLabel();
        if (keybinding) {
            ariaLabel = localize('commentLabelWithKeybinding', "{0}, use ({1}) for accessibility help", ariaLabel, keybinding);
        }
        else {
            ariaLabel = localize('commentLabelWithKeybindingNoKeybinding', "{0}, run the command Open Accessibility Help which is currently not triggerable via keybinding.", ariaLabel);
        }
        return ariaLabel;
    }
    onContextMenu(e) {
        const actions = getFlatContextMenuActions(this.menu.getActions({ arg: e.element, shouldForwardArgs: false }));
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => e.element
        });
    }
    // --- Update
    refreshReplElements(noDelay) {
        if (this.tree && this.isVisible()) {
            if (this.refreshScheduler.isScheduled()) {
                return;
            }
            this.refreshScheduler.schedule(noDelay ? 0 : undefined);
        }
    }
    updateInputDecoration() {
        if (!this.replInput) {
            return;
        }
        const decorations = [];
        if (this.isReadonly && this.replInput.hasTextFocus() && !this.replInput.getValue()) {
            const transparentForeground = resolveColorValue(editorForeground, this.themeService.getColorTheme())?.transparent(0.4);
            decorations.push({
                range: {
                    startLineNumber: 0,
                    endLineNumber: 0,
                    startColumn: 0,
                    endColumn: 1
                },
                renderOptions: {
                    after: {
                        contentText: localize('startDebugFirst', "Please start a debug session to evaluate expressions"),
                        color: transparentForeground ? transparentForeground.toString() : undefined
                    }
                }
            });
        }
        this.replInput.setDecorationsByType('repl-decoration', DECORATION_KEY, decorations);
    }
    saveState() {
        const replHistory = this.history.getHistory();
        if (replHistory.length) {
            this.storageService.store(HISTORY_STORAGE_KEY, JSON.stringify(replHistory), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const filterHistory = this.filterWidget.getHistory();
        if (filterHistory.length) {
            this.storageService.store(FILTER_HISTORY_STORAGE_KEY, JSON.stringify(filterHistory), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(FILTER_HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const filterValue = this.filterWidget.getFilterText();
        if (filterValue) {
            this.storageService.store(FILTER_VALUE_STORAGE_KEY, filterValue, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(FILTER_VALUE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        super.saveState();
    }
    dispose() {
        this.replInput?.dispose(); // Disposed before rendered? #174558
        this.replElementsChangeListener?.dispose();
        this.refreshScheduler.dispose();
        this.modelChangeListener.dispose();
        super.dispose();
    }
};
__decorate([
    memoize
], Repl.prototype, "refreshScheduler", null);
Repl = Repl_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, IThemeService),
    __param(5, IModelService),
    __param(6, IContextKeyService),
    __param(7, ICodeEditorService),
    __param(8, IViewDescriptorService),
    __param(9, IContextMenuService),
    __param(10, IConfigurationService),
    __param(11, ITextResourcePropertiesService),
    __param(12, IEditorService),
    __param(13, IKeybindingService),
    __param(14, IOpenerService),
    __param(15, IHoverService),
    __param(16, IMenuService),
    __param(17, ILanguageFeaturesService),
    __param(18, ILogService)
], Repl);
export { Repl };
let ReplOptions = class ReplOptions extends Disposable {
    static { ReplOptions_1 = this; }
    static { this.lineHeightEm = 1.4; }
    get replConfiguration() {
        return this._replConfig;
    }
    constructor(viewId, backgroundColorDelegate, configurationService, themeService, viewDescriptorService) {
        super();
        this.backgroundColorDelegate = backgroundColorDelegate;
        this.configurationService = configurationService;
        this.themeService = themeService;
        this.viewDescriptorService = viewDescriptorService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this.themeService.onDidColorThemeChange(e => this.update()));
        this._register(this.viewDescriptorService.onDidChangeLocation(e => {
            if (e.views.some(v => v.id === viewId)) {
                this.update();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.console.lineHeight') || e.affectsConfiguration('debug.console.fontSize') || e.affectsConfiguration('debug.console.fontFamily')) {
                this.update();
            }
        }));
        this.update();
    }
    update() {
        const debugConsole = this.configurationService.getValue('debug').console;
        this._replConfig = {
            fontSize: debugConsole.fontSize,
            fontFamily: debugConsole.fontFamily,
            lineHeight: debugConsole.lineHeight ? debugConsole.lineHeight : ReplOptions_1.lineHeightEm * debugConsole.fontSize,
            cssLineHeight: debugConsole.lineHeight ? `${debugConsole.lineHeight}px` : `${ReplOptions_1.lineHeightEm}em`,
            backgroundColor: this.themeService.getColorTheme().getColor(this.backgroundColorDelegate()),
            fontSizeForTwistie: debugConsole.fontSize * ReplOptions_1.lineHeightEm / 2 - 8
        };
        this._onDidChange.fire();
    }
};
ReplOptions = ReplOptions_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IThemeService),
    __param(4, IViewDescriptorService)
], ReplOptions);
// Repl actions and commands
class AcceptReplInputAction extends EditorAction {
    constructor() {
        super({
            id: 'repl.action.acceptInput',
            label: localize2({ key: 'actions.repl.acceptInput', comment: ['Apply input from the debug console input box'] }, "Debug Console: Accept Input"),
            precondition: CONTEXT_IN_DEBUG_REPL,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        SuggestController.get(editor)?.cancelSuggestWidget();
        const repl = getReplView(accessor.get(IViewsService));
        repl?.acceptReplInput();
    }
}
class FilterReplAction extends ViewAction {
    constructor() {
        super({
            viewId: REPL_VIEW_ID,
            id: 'repl.action.filter',
            title: localize('repl.action.filter', "Debug Console: Focus Filter"),
            precondition: CONTEXT_IN_DEBUG_REPL,
            keybinding: [{
                    when: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }]
        });
    }
    runInView(accessor, repl) {
        repl.focusFilter();
    }
}
class FindReplAction extends ViewAction {
    constructor() {
        super({
            viewId: REPL_VIEW_ID,
            id: 'repl.action.find',
            title: localize('repl.action.find', "Debug Console: Focus Find"),
            precondition: CONTEXT_IN_DEBUG_REPL,
            keybinding: [{
                    when: ContextKeyExpr.or(CONTEXT_IN_DEBUG_REPL, ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }],
            icon: Codicon.search,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', REPL_VIEW_ID),
                    order: 15
                }, {
                    id: MenuId.DebugConsoleContext,
                    group: 'z_commands',
                    order: 25
                }],
        });
    }
    runInView(accessor, view) {
        view.openFind();
    }
}
class ReplCopyAllAction extends EditorAction {
    constructor() {
        super({
            id: 'repl.action.copyAll',
            label: localize('actions.repl.copyAll', "Debug: Console Copy All"),
            alias: 'Debug Console Copy All',
            precondition: CONTEXT_IN_DEBUG_REPL,
        });
    }
    run(accessor, editor) {
        const clipboardService = accessor.get(IClipboardService);
        const repl = getReplView(accessor.get(IViewsService));
        if (repl) {
            return clipboardService.writeText(repl.getVisibleContent());
        }
    }
}
registerEditorAction(AcceptReplInputAction);
registerEditorAction(ReplCopyAllAction);
registerAction2(FilterReplAction);
registerAction2(FindReplAction);
class SelectReplActionViewItem extends FocusSessionActionViewItem {
    getSessions() {
        return this.debugService.getModel().getSessions(true).filter(s => s.hasSeparateRepl() && !sessionsToIgnore.has(s));
    }
    mapFocusedSessionToSelected(focusedSession) {
        while (focusedSession.parentSession && !focusedSession.hasSeparateRepl()) {
            focusedSession = focusedSession.parentSession;
        }
        return focusedSession;
    }
}
export function getReplView(viewsService) {
    return viewsService.getActiveViewWithId(REPL_VIEW_ID) ?? undefined;
}
const selectReplCommandId = 'workbench.action.debug.selectRepl';
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: selectReplCommandId,
            viewId: REPL_VIEW_ID,
            title: localize('selectRepl', "Select Debug Console"),
            f1: false,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', REPL_VIEW_ID), CONTEXT_MULTI_SESSION_REPL),
                order: 20
            }
        });
    }
    async runInView(accessor, view, session) {
        const debugService = accessor.get(IDebugService);
        // If session is already the focused session we need to manualy update the tree since view model will not send a focused change event
        if (session && session.state !== 0 /* State.Inactive */ && session !== debugService.getViewModel().focusedSession) {
            if (session.state !== 2 /* State.Stopped */) {
                // Focus child session instead if it is stopped #112595
                const stopppedChildSession = debugService.getModel().getSessions().find(s => s.parentSession === session && s.state === 2 /* State.Stopped */);
                if (stopppedChildSession) {
                    session = stopppedChildSession;
                }
            }
            await debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
        }
        // Need to select the session in the view since the focussed session might not have changed
        await view.selectSession(session);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.debug.panel.action.clearReplAction',
            viewId: REPL_VIEW_ID,
            title: localize2('clearRepl', 'Clear Console'),
            metadata: {
                description: localize2('clearRepl.descriotion', 'Clears all program output from your debug REPL')
            },
            f1: true,
            icon: debugConsoleClearAll,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', REPL_VIEW_ID),
                    order: 30
                }, {
                    id: MenuId.DebugConsoleContext,
                    group: 'z_commands',
                    order: 20
                }],
            keybinding: [{
                    primary: 0,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */ },
                    // Weight is higher than work workbench contributions so the keybinding remains
                    // highest priority when chords are registered afterwards
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    when: ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view')
                }],
        });
    }
    runInView(_accessor, view) {
        const accessibilitySignalService = _accessor.get(IAccessibilitySignalService);
        view.clearRepl();
        accessibilitySignalService.playSignal(AccessibilitySignal.clear);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.collapseRepl',
            title: localize('collapse', "Collapse All"),
            viewId: REPL_VIEW_ID,
            menu: {
                id: MenuId.DebugConsoleContext,
                group: 'z_commands',
                order: 10
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
        view.focus();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.replPaste',
            title: localize('paste', "Paste"),
            viewId: REPL_VIEW_ID,
            precondition: CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(0 /* State.Inactive */)),
            menu: {
                id: MenuId.DebugConsoleContext,
                group: '2_cutcopypaste',
                order: 30
            }
        });
    }
    async runInView(accessor, view) {
        const clipboardService = accessor.get(IClipboardService);
        const clipboardText = await clipboardService.readText();
        if (clipboardText) {
            const replInput = view.getReplInput();
            replInput.setValue(replInput.getValue().concat(clipboardText));
            view.focus();
            const model = replInput.getModel();
            const lineNumber = model ? model.getLineCount() : 0;
            const column = model?.getLineMaxColumn(lineNumber);
            if (typeof lineNumber === 'number' && typeof column === 'number') {
                replInput.setPosition({ lineNumber, column });
            }
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.debug.action.copyAll',
            title: localize('copyAll', "Copy All"),
            viewId: REPL_VIEW_ID,
            menu: {
                id: MenuId.DebugConsoleContext,
                group: '2_cutcopypaste',
                order: 20
            }
        });
    }
    async runInView(accessor, view) {
        const clipboardService = accessor.get(IClipboardService);
        await clipboardService.writeText(view.getVisibleContent());
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'debug.replCopy',
            title: localize('copy', "Copy"),
            menu: {
                id: MenuId.DebugConsoleContext,
                group: '2_cutcopypaste',
                order: 10
            }
        });
    }
    async run(accessor, element) {
        const clipboardService = accessor.get(IClipboardService);
        const debugService = accessor.get(IDebugService);
        const nativeSelection = dom.getActiveWindow().getSelection();
        const selectedText = nativeSelection?.toString();
        if (selectedText && selectedText.length > 0) {
            return clipboardService.writeText(selectedText);
        }
        else if (element) {
            return clipboardService.writeText(await this.tryEvaluateAndCopy(debugService, element) || element.toString());
        }
    }
    async tryEvaluateAndCopy(debugService, element) {
        // todo: we should expand DAP to allow copying more types here (#187784)
        if (!(element instanceof ReplEvaluationResult)) {
            return;
        }
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        const session = debugService.getViewModel().focusedSession;
        if (!stackFrame || !session || !session.capabilities.supportsClipboardContext) {
            return;
        }
        try {
            const evaluation = await session.evaluate(element.originalExpression, stackFrame.frameId, 'clipboard');
            return evaluation?.body.result;
        }
        catch (e) {
            return;
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: FOCUS_REPL_ID,
            category: DEBUG_COMMAND_CATEGORY,
            title: localize2({ comment: ['Debug is a noun in this context, not a verb.'], key: 'debugFocusConsole' }, "Focus on Debug Console View"),
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const repl = await viewsService.openView(REPL_VIEW_ID);
        await repl?.focus();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3JlcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLDRDQUE0QyxDQUFDO0FBRy9FLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BHLE9BQU8sRUFB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