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
import './media/interactive.css';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { NotebookEditorExtensionsRegistry } from '../../notebook/browser/notebookEditorExtensions.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { getDefaultNotebookCreationOptions, NotebookEditorWidget } from '../../notebook/browser/notebookEditorWidget.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ExecutionStateCellStatusBarContrib, TimerCellStatusBarContrib } from '../../notebook/browser/contrib/cellStatusBar/executionStatusBarItemController.js';
import { INotebookKernelService } from '../../notebook/common/notebookKernelService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ReplEditorSettings, INTERACTIVE_INPUT_CURSOR_BOUNDARY } from '../../interactive/browser/interactiveCommon.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { NotebookOptions } from '../../notebook/browser/notebookOptions.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { createActionViewItem, getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { MarkerController } from '../../../../editor/contrib/gotoError/browser/gotoError.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../notebook/common/notebookExecutionStateService.js';
import { NOTEBOOK_KERNEL } from '../../notebook/common/notebookContextKeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { NotebookFindContrib } from '../../notebook/browser/contrib/find/notebookFindWidget.js';
import { REPL_EDITOR_ID } from '../../notebook/common/notebookCommon.js';
import './interactiveEditor.css';
import { deepClone } from '../../../../base/common/objects.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { ReplEditorInput } from './replEditorInput.js';
import { ReplInputHintContentWidget } from '../../interactive/browser/replInputHintContentWidget.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
const INTERACTIVE_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'InteractiveEditorViewState';
const INPUT_CELL_VERTICAL_PADDING = 8;
const INPUT_CELL_HORIZONTAL_PADDING_RIGHT = 10;
const INPUT_EDITOR_PADDING = 8;
let ReplEditor = class ReplEditor extends EditorPane {
    get onDidFocus() { return this._onDidFocusWidget.event; }
    constructor(group, telemetryService, themeService, storageService, instantiationService, notebookWidgetService, contextKeyService, notebookKernelService, languageService, keybindingService, configurationService, menuService, contextMenuService, editorGroupService, textResourceConfigurationService, notebookExecutionStateService, extensionService, _accessibilityService) {
        super(REPL_EDITOR_ID, group, telemetryService, themeService, storageService);
        this._accessibilityService = _accessibilityService;
        this._notebookWidget = { value: undefined };
        this._widgetDisposableStore = this._register(new DisposableStore());
        this._groupListener = this._register(new MutableDisposable());
        this._onDidFocusWidget = this._register(new Emitter());
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeScroll = this._register(new Emitter());
        this.onDidChangeScroll = this._onDidChangeScroll.event;
        this._notebookWidgetService = notebookWidgetService;
        this._configurationService = configurationService;
        this._notebookKernelService = notebookKernelService;
        this._languageService = languageService;
        this._keybindingService = keybindingService;
        this._menuService = menuService;
        this._contextMenuService = contextMenuService;
        this._editorGroupService = editorGroupService;
        this._extensionService = extensionService;
        this._rootElement = DOM.$('.interactive-editor');
        this._contextKeyService = this._register(contextKeyService.createScoped(this._rootElement));
        this._contextKeyService.createKey('isCompositeNotebook', true);
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._editorOptions = this._computeEditorOptions();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor') || e.affectsConfiguration('notebook')) {
                this._editorOptions = this._computeEditorOptions();
            }
        }));
        this._notebookOptions = instantiationService.createInstance(NotebookOptions, this.window, true, { cellToolbarInteraction: 'hover', globalToolbar: true, stickyScrollEnabled: false, dragAndDropEnabled: false, disableRulers: true });
        this._editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, INTERACTIVE_EDITOR_VIEW_STATE_PREFERENCE_KEY);
        this._register(this._keybindingService.onDidUpdateKeybindings(this._updateInputHint, this));
        this._register(notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell && isEqual(e.notebook, this._notebookWidget.value?.viewModel?.notebookDocument.uri)) {
                const cell = this._notebookWidget.value?.getCellByHandle(e.cellHandle);
                if (cell && e.changed?.state) {
                    this._scrollIfNecessary(cell);
                }
            }
        }));
    }
    get inputCellContainerHeight() {
        return 19 + 2 + INPUT_CELL_VERTICAL_PADDING * 2 + INPUT_EDITOR_PADDING * 2;
    }
    get inputCellEditorHeight() {
        return 19 + INPUT_EDITOR_PADDING * 2;
    }
    createEditor(parent) {
        DOM.append(parent, this._rootElement);
        this._rootElement.style.position = 'relative';
        this._notebookEditorContainer = DOM.append(this._rootElement, DOM.$('.notebook-editor-container'));
        this._inputCellContainer = DOM.append(this._rootElement, DOM.$('.input-cell-container'));
        this._inputCellContainer.style.position = 'absolute';
        this._inputCellContainer.style.height = `${this.inputCellContainerHeight}px`;
        this._inputFocusIndicator = DOM.append(this._inputCellContainer, DOM.$('.input-focus-indicator'));
        this._inputRunButtonContainer = DOM.append(this._inputCellContainer, DOM.$('.run-button-container'));
        this._setupRunButtonToolbar(this._inputRunButtonContainer);
        this._inputEditorContainer = DOM.append(this._inputCellContainer, DOM.$('.input-editor-container'));
        this._createLayoutStyles();
    }
    _setupRunButtonToolbar(runButtonContainer) {
        const menu = this._register(this._menuService.createMenu(MenuId.ReplInputExecute, this._contextKeyService));
        this._runbuttonToolbar = this._register(new ToolBar(runButtonContainer, this._contextMenuService, {
            getKeyBinding: action => this._keybindingService.lookupKeybinding(action.id),
            actionViewItemProvider: (action, options) => {
                return createActionViewItem(this._instantiationService, action, options);
            },
            renderDropdownAsChildElement: true
        }));
        const { primary, secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }));
        this._runbuttonToolbar.setActions([...primary, ...secondary]);
    }
    _createLayoutStyles() {
        this._styleElement = domStylesheets.createStyleSheet(this._rootElement);
        const styleSheets = [];
        const { codeCellLeftMargin, cellRunGutter } = this._notebookOptions.getLayoutConfiguration();
        const { focusIndicator } = this._notebookOptions.getDisplayOptions();
        const leftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
        styleSheets.push(`
			.interactive-editor .input-cell-container {
				padding: ${INPUT_CELL_VERTICAL_PADDING}px ${INPUT_CELL_HORIZONTAL_PADDING_RIGHT}px ${INPUT_CELL_VERTICAL_PADDING}px ${leftMargin}px;
			}
		`);
        if (focusIndicator === 'gutter') {
            styleSheets.push(`
				.interactive-editor .input-cell-container:focus-within .input-focus-indicator::before {
					border-color: var(--vscode-notebook-focusedCellBorder) !important;
				}
				.interactive-editor .input-focus-indicator::before {
					border-color: var(--vscode-notebook-inactiveFocusedCellBorder) !important;
				}
				.interactive-editor .input-cell-container .input-focus-indicator {
					display: block;
					top: ${INPUT_CELL_VERTICAL_PADDING}px;
				}
				.interactive-editor .input-cell-container {
					border-top: 1px solid var(--vscode-notebook-inactiveFocusedCellBorder);
				}
			`);
        }
        else {
            // border
            styleSheets.push(`
				.interactive-editor .input-cell-container {
					border-top: 1px solid var(--vscode-notebook-inactiveFocusedCellBorder);
				}
				.interactive-editor .input-cell-container .input-focus-indicator {
					display: none;
				}
			`);
        }
        styleSheets.push(`
			.interactive-editor .input-cell-container .run-button-container {
				width: ${cellRunGutter}px;
				left: ${codeCellLeftMargin}px;
				margin-top: ${INPUT_EDITOR_PADDING - 2}px;
			}
		`);
        this._styleElement.textContent = styleSheets.join('\n');
    }
    _computeEditorOptions() {
        let overrideIdentifier = undefined;
        if (this._codeEditorWidget) {
            overrideIdentifier = this._codeEditorWidget.getModel()?.getLanguageId();
        }
        const editorOptions = deepClone(this._configurationService.getValue('editor', { overrideIdentifier }));
        const editorOptionsOverride = getSimpleEditorOptions(this._configurationService);
        const computed = Object.freeze({
            ...editorOptions,
            ...editorOptionsOverride,
            ...{
                ariaLabel: localize('replEditorInput', "REPL Input"),
                glyphMargin: true,
                padding: {
                    top: INPUT_EDITOR_PADDING,
                    bottom: INPUT_EDITOR_PADDING
                },
                hover: {
                    enabled: true
                },
                rulers: []
            }
        });
        return computed;
    }
    saveState() {
        this._saveEditorViewState(this.input);
        super.saveState();
    }
    getViewState() {
        const input = this.input;
        if (!(input instanceof ReplEditorInput)) {
            return undefined;
        }
        this._saveEditorViewState(input);
        return this._loadNotebookEditorViewState(input);
    }
    _saveEditorViewState(input) {
        if (this._notebookWidget.value && input instanceof ReplEditorInput) {
            if (this._notebookWidget.value.isDisposed) {
                return;
            }
            const state = this._notebookWidget.value.getEditorViewState();
            const editorState = this._codeEditorWidget.saveViewState();
            this._editorMemento.saveEditorState(this.group, input.resource, {
                notebook: state,
                input: editorState
            });
        }
    }
    _loadNotebookEditorViewState(input) {
        const result = this._editorMemento.loadEditorState(this.group, input.resource);
        if (result) {
            return result;
        }
        // when we don't have a view state for the group/input-tuple then we try to use an existing
        // editor for the same resource.
        for (const group of this._editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group.activeEditorPane !== this && group.activeEditorPane === this && group.activeEditor?.matches(input)) {
                const notebook = this._notebookWidget.value?.getEditorViewState();
                const input = this._codeEditorWidget.saveViewState();
                return {
                    notebook,
                    input
                };
            }
        }
        return;
    }
    async setInput(input, options, context, token) {
        // there currently is a widget which we still own so
        // we need to hide it before getting a new widget
        this._notebookWidget.value?.onWillHide();
        this._codeEditorWidget?.dispose();
        this._widgetDisposableStore.clear();
        this._notebookWidget = this._instantiationService.invokeFunction(this._notebookWidgetService.retrieveWidget, this.group.id, input, {
            isReplHistory: true,
            isReadOnly: true,
            contributions: NotebookEditorExtensionsRegistry.getSomeEditorContributions([
                ExecutionStateCellStatusBarContrib.id,
                TimerCellStatusBarContrib.id,
                NotebookFindContrib.id
            ]),
            menuIds: {
                notebookToolbar: MenuId.InteractiveToolbar,
                cellTitleToolbar: MenuId.InteractiveCellTitle,
                cellDeleteToolbar: MenuId.InteractiveCellDelete,
                cellInsertToolbar: MenuId.NotebookCellBetween,
                cellTopInsertToolbar: MenuId.NotebookCellListTop,
                cellExecuteToolbar: MenuId.InteractiveCellExecute,
                cellExecutePrimary: undefined
            },
            cellEditorContributions: EditorExtensionsRegistry.getSomeEditorContributions([
                SelectionClipboardContributionID,
                ContextMenuController.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                MarkerController.ID
            ]),
            options: this._notebookOptions,
            codeWindow: this.window
        }, undefined, this.window);
        const skipContributions = [
            'workbench.notebook.cellToolbar',
            'editor.contrib.inlineCompletionsController'
        ];
        const inputContributions = getDefaultNotebookCreationOptions().cellEditorContributions?.filter(c => skipContributions.indexOf(c.id) === -1);
        this._codeEditorWidget = this._instantiationService.createInstance(CodeEditorWidget, this._inputEditorContainer, this._editorOptions, {
            ...{
                isSimpleWidget: false,
                contributions: inputContributions,
            }
        });
        if (this._lastLayoutDimensions) {
            this._notebookEditorContainer.style.height = `${this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight}px`;
            this._notebookWidget.value.layout(new DOM.Dimension(this._lastLayoutDimensions.dimension.width, this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight), this._notebookEditorContainer);
            const leftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
            const maxHeight = Math.min(this._lastLayoutDimensions.dimension.height / 2, this.inputCellEditorHeight);
            this._codeEditorWidget.layout(this._validateDimension(this._lastLayoutDimensions.dimension.width - leftMargin - INPUT_CELL_HORIZONTAL_PADDING_RIGHT, maxHeight));
            this._inputFocusIndicator.style.height = `${this.inputCellEditorHeight}px`;
            this._inputCellContainer.style.top = `${this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight}px`;
            this._inputCellContainer.style.width = `${this._lastLayoutDimensions.dimension.width}px`;
        }
        await super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (this._runbuttonToolbar) {
            this._runbuttonToolbar.context = input.resource;
        }
        if (model === null) {
            throw new Error('The REPL model could not be resolved');
        }
        this._notebookWidget.value?.setParentContextKeyService(this._contextKeyService);
        const viewState = options?.viewState ?? this._loadNotebookEditorViewState(input);
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._notebookWidget.value.setModel(model.notebook, viewState?.notebook, undefined, 'repl');
        model.notebook.setCellCollapseDefault(this._notebookOptions.getCellCollapseDefault());
        this._notebookWidget.value.setOptions({
            isReadOnly: true
        });
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidResizeOutput((cvm) => {
            this._scrollIfNecessary(cvm);
        }));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidFocusWidget(() => this._onDidFocusWidget.fire()));
        this._widgetDisposableStore.add(this._notebookOptions.onDidChangeOptions(e => {
            if (e.compactView || e.focusIndicator) {
                // update the styling
                this._styleElement?.remove();
                this._createLayoutStyles();
            }
            if (this._lastLayoutDimensions && this.isVisible()) {
                this.layout(this._lastLayoutDimensions.dimension, this._lastLayoutDimensions.position);
            }
            if (e.interactiveWindowCollapseCodeCells) {
                model.notebook.setCellCollapseDefault(this._notebookOptions.getCellCollapseDefault());
            }
        }));
        const editorModel = await input.resolveInput(model.notebook);
        this._codeEditorWidget.setModel(editorModel);
        if (viewState?.input) {
            this._codeEditorWidget.restoreViewState(viewState.input);
        }
        this._editorOptions = this._computeEditorOptions();
        this._codeEditorWidget.updateOptions(this._editorOptions);
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidFocusEditorWidget(() => this._onDidFocusWidget.fire()));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidContentSizeChange(e => {
            if (!e.contentHeightChanged) {
                return;
            }
            if (this._lastLayoutDimensions) {
                this._layoutWidgets(this._lastLayoutDimensions.dimension, this._lastLayoutDimensions.position);
            }
        }));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeCursorPosition(e => this._onDidChangeSelection.fire({ reason: this._toEditorPaneSelectionChangeReason(e) })));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeModelContent(() => this._onDidChangeSelection.fire({ reason: 3 /* EditorPaneSelectionChangeReason.EDIT */ })));
        this._widgetDisposableStore.add(this._notebookKernelService.onDidChangeNotebookAffinity(this._syncWithKernel, this));
        this._widgetDisposableStore.add(this._notebookKernelService.onDidChangeSelectedNotebooks(this._syncWithKernel, this));
        this._widgetDisposableStore.add(this.themeService.onDidColorThemeChange(() => {
            if (this.isVisible()) {
                this._updateInputHint();
            }
        }));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeModelContent(() => {
            if (this.isVisible()) {
                this._updateInputHint();
            }
        }));
        this._codeEditorWidget.onDidChangeModelDecorations(() => {
            if (this.isVisible()) {
                this._updateInputHint();
            }
        });
        const cursorAtBoundaryContext = INTERACTIVE_INPUT_CURSOR_BOUNDARY.bindTo(this._contextKeyService);
        if (input.resource && input.historyService.has(input.resource)) {
            cursorAtBoundaryContext.set('top');
        }
        else {
            cursorAtBoundaryContext.set('none');
        }
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this._codeEditorWidget._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            const firstLine = viewPosition.lineNumber === 1 && viewPosition.column === 1;
            const lastLine = viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol;
            if (firstLine) {
                if (lastLine) {
                    cursorAtBoundaryContext.set('both');
                }
                else {
                    cursorAtBoundaryContext.set('top');
                }
            }
            else {
                if (lastLine) {
                    cursorAtBoundaryContext.set('bottom');
                }
                else {
                    cursorAtBoundaryContext.set('none');
                }
            }
        }));
        this._widgetDisposableStore.add(editorModel.onDidChangeContent(() => {
            const value = editorModel.getValue();
            if (this.input?.resource && value !== '') {
                const historyService = this.input.historyService;
                if (!historyService.matchesCurrent(this.input.resource, value)) {
                    historyService.replaceLast(this.input.resource, value);
                }
            }
        }));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidScroll(() => this._onDidChangeScroll.fire()));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidChangeViewCells(this.handleViewCellChange, this));
        this._updateInputHint();
        this._syncWithKernel();
    }
    handleViewCellChange(e) {
        const notebookWidget = this._notebookWidget.value;
        if (!notebookWidget) {
            return;
        }
        for (const splice of e.splices) {
            const [_start, _delete, addedCells] = splice;
            if (addedCells.length) {
                const viewModel = notebookWidget.viewModel;
                if (viewModel) {
                    this.handleAppend(notebookWidget, viewModel);
                    break;
                }
            }
        }
    }
    handleAppend(notebookWidget, viewModel) {
        this._notebookWidgetService.updateReplContextKey(viewModel.notebookDocument.uri.toString());
        const navigateToCell = this._configurationService.getValue('accessibility.replEditor.autoFocusReplExecution');
        if (this._accessibilityService.isScreenReaderOptimized()) {
            if (navigateToCell === 'lastExecution') {
                setTimeout(() => {
                    const lastCellIndex = viewModel.length - 1;
                    if (lastCellIndex >= 0) {
                        const cell = viewModel.viewCells[lastCellIndex];
                        notebookWidget.focusNotebookCell(cell, 'container');
                    }
                }, 0);
            }
            else if (navigateToCell === 'input') {
                this._codeEditorWidget.focus();
            }
        }
    }
    setOptions(options) {
        this._notebookWidget.value?.setOptions(options);
        super.setOptions(options);
    }
    _toEditorPaneSelectionChangeReason(e) {
        switch (e.source) {
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */: return 1 /* EditorPaneSelectionChangeReason.PROGRAMMATIC */;
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */: return 4 /* EditorPaneSelectionChangeReason.NAVIGATION */;
            case "code.jump" /* TextEditorSelectionSource.JUMP */: return 5 /* EditorPaneSelectionChangeReason.JUMP */;
            default: return 2 /* EditorPaneSelectionChangeReason.USER */;
        }
    }
    _cellAtBottom(cell) {
        const visibleRanges = this._notebookWidget.value?.visibleRanges || [];
        const cellIndex = this._notebookWidget.value?.getCellIndex(cell);
        if (cellIndex === Math.max(...visibleRanges.map(range => range.end - 1))) {
            return true;
        }
        return false;
    }
    _scrollIfNecessary(cvm) {
        const index = this._notebookWidget.value.getCellIndex(cvm);
        if (index === this._notebookWidget.value.getLength() - 1) {
            // If we're already at the bottom or auto scroll is enabled, scroll to the bottom
            if (this._configurationService.getValue(ReplEditorSettings.interactiveWindowAlwaysScrollOnNewCell) || this._cellAtBottom(cvm)) {
                this._notebookWidget.value.scrollToBottom();
            }
        }
    }
    _syncWithKernel() {
        const notebook = this._notebookWidget.value?.textModel;
        const textModel = this._codeEditorWidget.getModel();
        if (notebook && textModel) {
            const info = this._notebookKernelService.getMatchingKernel(notebook);
            const selectedOrSuggested = info.selected
                ?? (info.suggestions.length === 1 ? info.suggestions[0] : undefined)
                ?? (info.all.length === 1 ? info.all[0] : undefined);
            if (selectedOrSuggested) {
                const language = selectedOrSuggested.supportedLanguages[0];
                // All kernels will initially list plaintext as the supported language before they properly initialized.
                if (language && language !== 'plaintext') {
                    const newMode = this._languageService.createById(language).languageId;
                    textModel.setLanguage(newMode);
                }
                NOTEBOOK_KERNEL.bindTo(this._contextKeyService).set(selectedOrSuggested.id);
            }
        }
    }
    layout(dimension, position) {
        this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
        this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
        const editorHeightChanged = dimension.height !== this._lastLayoutDimensions?.dimension.height;
        this._lastLayoutDimensions = { dimension, position };
        if (!this._notebookWidget.value) {
            return;
        }
        if (editorHeightChanged && this._codeEditorWidget) {
            SuggestController.get(this._codeEditorWidget)?.cancelSuggestWidget();
        }
        this._notebookEditorContainer.style.height = `${this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight}px`;
        this._layoutWidgets(dimension, position);
    }
    _layoutWidgets(dimension, position) {
        const contentHeight = this._codeEditorWidget.hasModel() ? this._codeEditorWidget.getContentHeight() : this.inputCellEditorHeight;
        const maxHeight = Math.min(dimension.height / 2, contentHeight);
        const leftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
        const inputCellContainerHeight = maxHeight + INPUT_CELL_VERTICAL_PADDING * 2;
        this._notebookEditorContainer.style.height = `${dimension.height - inputCellContainerHeight}px`;
        this._notebookWidget.value.layout(dimension.with(dimension.width, dimension.height - inputCellContainerHeight), this._notebookEditorContainer, position);
        this._codeEditorWidget.layout(this._validateDimension(dimension.width - leftMargin - INPUT_CELL_HORIZONTAL_PADDING_RIGHT, maxHeight));
        this._inputFocusIndicator.style.height = `${contentHeight}px`;
        this._inputCellContainer.style.top = `${dimension.height - inputCellContainerHeight}px`;
        this._inputCellContainer.style.width = `${dimension.width}px`;
    }
    _validateDimension(width, height) {
        return new DOM.Dimension(Math.max(0, width), Math.max(0, height));
    }
    _hasConflictingDecoration() {
        return Boolean(this._codeEditorWidget.getLineDecorations(1)?.find((d) => d.options.beforeContentClassName
            || d.options.afterContentClassName
            || d.options.before?.content
            || d.options.after?.content));
    }
    _updateInputHint() {
        if (!this._codeEditorWidget) {
            return;
        }
        const shouldHide = !this._codeEditorWidget.hasModel() ||
            this._configurationService.getValue(ReplEditorSettings.showExecutionHint) === false ||
            this._codeEditorWidget.getModel().getValueLength() !== 0 ||
            this._hasConflictingDecoration();
        if (!this._hintElement && !shouldHide) {
            this._hintElement = this._instantiationService.createInstance(ReplInputHintContentWidget, this._codeEditorWidget);
        }
        else if (this._hintElement && shouldHide) {
            this._hintElement.dispose();
            this._hintElement = undefined;
        }
    }
    getScrollPosition() {
        return {
            scrollTop: this._notebookWidget.value?.scrollTop ?? 0,
            scrollLeft: 0
        };
    }
    setScrollPosition(position) {
        this._notebookWidget.value?.setScrollTop(position.scrollTop);
    }
    focus() {
        super.focus();
        this._notebookWidget.value?.onShow();
        this._codeEditorWidget.focus();
    }
    focusHistory() {
        this._notebookWidget.value.focus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this._groupListener.value = this.group.onWillCloseEditor(e => this._saveEditorViewState(e.editor));
        if (!visible) {
            this._saveEditorViewState(this.input);
            if (this.input && this._notebookWidget.value) {
                this._notebookWidget.value.onWillHide();
            }
        }
        this._updateInputHint();
    }
    clearInput() {
        if (this._notebookWidget.value) {
            this._saveEditorViewState(this.input);
            this._notebookWidget.value.onWillHide();
        }
        this._codeEditorWidget?.dispose();
        this._notebookWidget = { value: undefined };
        this._widgetDisposableStore.clear();
        super.clearInput();
    }
    getControl() {
        return {
            notebookEditor: this._notebookWidget.value,
            activeCodeEditor: this.getActiveCodeEditor(),
            onDidChangeActiveEditor: Event.None
        };
    }
    getActiveCodeEditor() {
        if (!this._codeEditorWidget) {
            return undefined;
        }
        return this._codeEditorWidget.hasWidgetFocus() || !this._notebookWidget.value?.activeCodeEditor ?
            this._codeEditorWidget :
            this._notebookWidget.value.activeCodeEditor;
    }
};
ReplEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, INotebookEditorService),
    __param(6, IContextKeyService),
    __param(7, INotebookKernelService),
    __param(8, ILanguageService),
    __param(9, IKeybindingService),
    __param(10, IConfigurationService),
    __param(11, IMenuService),
    __param(12, IContextMenuService),
    __param(13, IEditorGroupsService),
    __param(14, ITextResourceConfigurationService),
    __param(15, INotebookExecutionStateService),
    __param(16, IExtensionService),
    __param(17, IAccessibilityService)
], ReplEditor);
export { ReplEditor };
export function isReplEditorControl(control) {
    const candidate = control;
    return candidate?.activeCodeEditor instanceof CodeEditorWidget && candidate?.notebookEditor instanceof NotebookEditorWidget;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZXBsTm90ZWJvb2svYnJvd3Nlci9yZXBsRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXBHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RHLE9BQU8sRUFBZ0Isc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoSCxPQUFPLEVBQUUs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