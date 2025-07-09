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
import { localize } from '../../../../../../nls.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { ToolBar } from '../../../../../../base/browser/ui/toolbar/toolbar.js';
import { IconLabel } from '../../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { createMatches } from '../../../../../../base/common/filters.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { getIconClassesForLanguageId } from '../../../../../../editor/common/services/getIconClasses.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { listErrorForeground, listWarningForeground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { NotebookEditor } from '../../notebookEditor.js';
import { CellKind, NotebookCellsChangeType, NotebookSetting } from '../../../common/notebookCommon.js';
import { IEditorService, SIDE_GROUP } from '../../../../../services/editor/common/editorService.js';
import { IOutlineService } from '../../../../../services/outline/browser/outline.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { mainWindow } from '../../../../../../base/browser/window.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../../platform/contextkey/common/contextkey.js';
import { MenuEntryActionViewItem, getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Delayer, disposableTimeout } from '../../../../../../base/common/async.js';
import { IOutlinePane } from '../../../../outline/browser/outline.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../../common/notebookContextKeys.js';
import { INotebookCellOutlineDataSourceFactory } from '../../viewModel/notebookOutlineDataSourceFactory.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
class NotebookOutlineTemplate {
    static { this.templateId = 'NotebookOutlineRenderer'; }
    constructor(container, iconClass, iconLabel, decoration, actionMenu, elementDisposables) {
        this.container = container;
        this.iconClass = iconClass;
        this.iconLabel = iconLabel;
        this.decoration = decoration;
        this.actionMenu = actionMenu;
        this.elementDisposables = elementDisposables;
    }
}
let NotebookOutlineRenderer = class NotebookOutlineRenderer {
    constructor(_editor, _target, _themeService, _configurationService, _contextMenuService, _contextKeyService, _menuService, _instantiationService) {
        this._editor = _editor;
        this._target = _target;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._instantiationService = _instantiationService;
        this.templateId = NotebookOutlineTemplate.templateId;
    }
    renderTemplate(container) {
        const elementDisposables = new DisposableStore();
        container.classList.add('notebook-outline-element', 'show-file-icons');
        const iconClass = document.createElement('div');
        container.append(iconClass);
        const iconLabel = new IconLabel(container, { supportHighlights: true });
        const decoration = document.createElement('div');
        decoration.className = 'element-decoration';
        container.append(decoration);
        const actionMenu = document.createElement('div');
        actionMenu.className = 'action-menu';
        container.append(actionMenu);
        return new NotebookOutlineTemplate(container, iconClass, iconLabel, decoration, actionMenu, elementDisposables);
    }
    renderElement(node, _index, template, _height) {
        const extraClasses = [];
        const options = {
            matches: createMatches(node.filterData),
            labelEscapeNewLines: true,
            extraClasses,
        };
        const isCodeCell = node.element.cell.cellKind === CellKind.Code;
        if (node.element.level >= 8) { // symbol
            template.iconClass.className = 'element-icon ' + ThemeIcon.asClassNameArray(node.element.icon).join(' ');
        }
        else if (isCodeCell && this._themeService.getFileIconTheme().hasFileIcons && !node.element.isExecuting) {
            template.iconClass.className = '';
            extraClasses.push(...getIconClassesForLanguageId(node.element.cell.language ?? ''));
        }
        else {
            template.iconClass.className = 'element-icon ' + ThemeIcon.asClassNameArray(node.element.icon).join(' ');
        }
        template.iconLabel.setLabel(' ' + node.element.label, undefined, options);
        const { markerInfo } = node.element;
        template.container.style.removeProperty('--outline-element-color');
        template.decoration.innerText = '';
        if (markerInfo) {
            const problem = this._configurationService.getValue('problems.visibility');
            const useBadges = this._configurationService.getValue("outline.problems.badges" /* OutlineConfigKeys.problemsBadges */);
            if (!useBadges || !problem) {
                template.decoration.classList.remove('bubble');
                template.decoration.innerText = '';
            }
            else if (markerInfo.count === 0) {
                template.decoration.classList.add('bubble');
                template.decoration.innerText = '\uea71';
            }
            else {
                template.decoration.classList.remove('bubble');
                template.decoration.innerText = markerInfo.count > 9 ? '9+' : String(markerInfo.count);
            }
            const color = this._themeService.getColorTheme().getColor(markerInfo.topSev === MarkerSeverity.Error ? listErrorForeground : listWarningForeground);
            if (problem === undefined) {
                return;
            }
            const useColors = this._configurationService.getValue("outline.problems.colors" /* OutlineConfigKeys.problemsColors */);
            if (!useColors || !problem) {
                template.container.style.removeProperty('--outline-element-color');
                template.decoration.style.setProperty('--outline-element-color', color?.toString() ?? 'inherit');
            }
            else {
                template.container.style.setProperty('--outline-element-color', color?.toString() ?? 'inherit');
            }
        }
        if (this._target === 1 /* OutlineTarget.OutlinePane */) {
            if (!this._editor) {
                return;
            }
            const nbCell = node.element.cell;
            const nbViewModel = this._editor.getViewModel();
            if (!nbViewModel) {
                return;
            }
            const idx = nbViewModel.getCellIndex(nbCell);
            const length = isCodeCell ? 0 : nbViewModel.getFoldedLength(idx);
            const scopedContextKeyService = template.elementDisposables.add(this._contextKeyService.createScoped(template.container));
            NotebookOutlineContext.CellKind.bindTo(scopedContextKeyService).set(isCodeCell ? CellKind.Code : CellKind.Markup);
            NotebookOutlineContext.CellHasChildren.bindTo(scopedContextKeyService).set(length > 0);
            NotebookOutlineContext.CellHasHeader.bindTo(scopedContextKeyService).set(node.element.level !== 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */);
            NotebookOutlineContext.OutlineElementTarget.bindTo(scopedContextKeyService).set(this._target);
            this.setupFolding(isCodeCell, nbViewModel, scopedContextKeyService, template, nbCell);
            const outlineEntryToolbar = template.elementDisposables.add(new ToolBar(template.actionMenu, this._contextMenuService, {
                actionViewItemProvider: action => {
                    if (action instanceof MenuItemAction) {
                        return this._instantiationService.createInstance(MenuEntryActionViewItem, action, undefined);
                    }
                    return undefined;
                },
            }));
            const menu = template.elementDisposables.add(this._menuService.createMenu(MenuId.NotebookOutlineActionMenu, scopedContextKeyService));
            const actions = getOutlineToolbarActions(menu, { notebookEditor: this._editor, outlineEntry: node.element });
            outlineEntryToolbar.setActions(actions.primary, actions.secondary);
            this.setupToolbarListeners(this._editor, outlineEntryToolbar, menu, actions, node.element, template);
            template.actionMenu.style.padding = '0 0.8em 0 0.4em';
        }
    }
    disposeTemplate(templateData) {
        templateData.iconLabel.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
        DOM.clearNode(templateData.actionMenu);
    }
    setupFolding(isCodeCell, nbViewModel, scopedContextKeyService, template, nbCell) {
        const foldingState = isCodeCell ? 0 /* CellFoldingState.None */ : (nbCell.foldingState);
        const foldingStateCtx = NotebookOutlineContext.CellFoldingState.bindTo(scopedContextKeyService);
        foldingStateCtx.set(foldingState);
        if (!isCodeCell) {
            template.elementDisposables.add(nbViewModel.onDidFoldingStateChanged(() => {
                const foldingState = nbCell.foldingState;
                NotebookOutlineContext.CellFoldingState.bindTo(scopedContextKeyService).set(foldingState);
                foldingStateCtx.set(foldingState);
            }));
        }
    }
    setupToolbarListeners(editor, toolbar, menu, initActions, entry, templateData) {
        // same fix as in cellToolbars setupListeners re #103926
        let dropdownIsVisible = false;
        let deferredUpdate;
        toolbar.setActions(initActions.primary, initActions.secondary);
        templateData.elementDisposables.add(menu.onDidChange(() => {
            if (dropdownIsVisible) {
                const actions = getOutlineToolbarActions(menu, { notebookEditor: editor, outlineEntry: entry });
                deferredUpdate = () => toolbar.setActions(actions.primary, actions.secondary);
                return;
            }
            const actions = getOutlineToolbarActions(menu, { notebookEditor: editor, outlineEntry: entry });
            toolbar.setActions(actions.primary, actions.secondary);
        }));
        templateData.container.classList.remove('notebook-outline-toolbar-dropdown-active');
        templateData.elementDisposables.add(toolbar.onDidChangeDropdownVisibility(visible => {
            dropdownIsVisible = visible;
            if (visible) {
                templateData.container.classList.add('notebook-outline-toolbar-dropdown-active');
            }
            else {
                templateData.container.classList.remove('notebook-outline-toolbar-dropdown-active');
            }
            if (deferredUpdate && !visible) {
                disposableTimeout(() => {
                    deferredUpdate?.();
                }, 0, templateData.elementDisposables);
                deferredUpdate = undefined;
            }
        }));
    }
};
NotebookOutlineRenderer = __decorate([
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IMenuService),
    __param(7, IInstantiationService)
], NotebookOutlineRenderer);
function getOutlineToolbarActions(menu, args) {
    return getActionBarActions(menu.getActions({ shouldForwardArgs: true, arg: args }), g => /^inline/.test(g));
}
class NotebookOutlineAccessibility {
    getAriaLabel(element) {
        return element.label;
    }
    getWidgetAriaLabel() {
        return '';
    }
}
class NotebookNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
}
class NotebookOutlineVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return NotebookOutlineTemplate.templateId;
    }
}
let NotebookQuickPickProvider = class NotebookQuickPickProvider {
    constructor(notebookCellOutlineDataSourceRef, _configurationService, _themeService) {
        this.notebookCellOutlineDataSourceRef = notebookCellOutlineDataSourceRef;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this._disposables = new DisposableStore();
        this.gotoShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.gotoSymbolsAllSymbols);
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.gotoSymbolsAllSymbols)) {
                this.gotoShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.gotoSymbolsAllSymbols);
            }
        }));
    }
    getQuickPickElements() {
        const bucket = [];
        for (const entry of this.notebookCellOutlineDataSourceRef?.object?.entries ?? []) {
            entry.asFlatList(bucket);
        }
        const result = [];
        const { hasFileIcons } = this._themeService.getFileIconTheme();
        const isSymbol = (element) => !!element.symbolKind;
        const isCodeCell = (element) => (element.cell.cellKind === CellKind.Code && element.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */); // code cell entries are exactly level 7 by this constant
        for (let i = 0; i < bucket.length; i++) {
            const element = bucket[i];
            const nextElement = bucket[i + 1]; // can be undefined
            if (!this.gotoShowCodeCellSymbols
                && isSymbol(element)) {
                continue;
            }
            if (this.gotoShowCodeCellSymbols
                && isCodeCell(element)
                && nextElement && isSymbol(nextElement)) {
                continue;
            }
            const useFileIcon = hasFileIcons && !element.symbolKind;
            // todo@jrieken it is fishy that codicons cannot be used with iconClasses
            // but file icons can...
            result.push({
                element,
                label: useFileIcon ? element.label : `$(${element.icon.id}) ${element.label}`,
                ariaLabel: element.label,
                iconClasses: useFileIcon ? getIconClassesForLanguageId(element.cell.language ?? '') : undefined,
            });
        }
        return result;
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookQuickPickProvider = __decorate([
    __param(1, IConfigurationService),
    __param(2, IThemeService)
], NotebookQuickPickProvider);
export { NotebookQuickPickProvider };
/**
 * Checks if the given outline entry should be filtered out of the outlinePane
 *
 * @param entry the OutlineEntry to check
 * @param showMarkdownHeadersOnly whether to show only markdown headers
 * @param showCodeCells whether to show code cells
 * @param showCodeCellSymbols whether to show code cell symbols
 * @returns true if the entry should be filtered out of the outlinePane, false if the entry should be visible.
 */
function filterEntry(entry, showMarkdownHeadersOnly, showCodeCells, showCodeCellSymbols) {
    // if any are true, return true, this entry should NOT be included in the outline
    if ((showMarkdownHeadersOnly && entry.cell.cellKind === CellKind.Markup && entry.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) || // show headers only   + cell is mkdn + is level 7 (not header)
        (!showCodeCells && entry.cell.cellKind === CellKind.Code) || // show code cells off + cell is code
        (!showCodeCellSymbols && entry.cell.cellKind === CellKind.Code && entry.level > 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) // show symbols off    + cell is code + is level >7 (nb symbol levels)
    ) {
        return true;
    }
    return false;
}
let NotebookOutlinePaneProvider = class NotebookOutlinePaneProvider {
    constructor(outlineDataSourceRef, _configurationService) {
        this.outlineDataSourceRef = outlineDataSourceRef;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this.showCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        this.showCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        this.showMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCells)) {
                this.showCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
            }
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols)) {
                this.showCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
            }
            if (e.affectsConfiguration(NotebookSetting.outlineShowMarkdownHeadersOnly)) {
                this.showMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
            }
        }));
    }
    getActiveEntry() {
        const newActive = this.outlineDataSourceRef?.object?.activeElement;
        if (!newActive) {
            return undefined;
        }
        if (!filterEntry(newActive, this.showMarkdownHeadersOnly, this.showCodeCells, this.showCodeCellSymbols)) {
            return newActive;
        }
        // find a valid parent
        let parent = newActive.parent;
        while (parent) {
            if (filterEntry(parent, this.showMarkdownHeadersOnly, this.showCodeCells, this.showCodeCellSymbols)) {
                parent = parent.parent;
            }
            else {
                return parent;
            }
        }
        // no valid parent found, return undefined
        return undefined;
    }
    *getChildren(element) {
        const isOutline = element instanceof NotebookCellOutline;
        const entries = isOutline ? this.outlineDataSourceRef?.object?.entries ?? [] : element.children;
        for (const entry of entries) {
            if (entry.cell.cellKind === CellKind.Markup) {
                if (!this.showMarkdownHeadersOnly) {
                    yield entry;
                }
                else if (entry.level < 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) {
                    yield entry;
                }
            }
            else if (this.showCodeCells && entry.cell.cellKind === CellKind.Code) {
                if (this.showCodeCellSymbols) {
                    yield entry;
                }
                else if (entry.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) {
                    yield entry;
                }
            }
        }
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookOutlinePaneProvider = __decorate([
    __param(1, IConfigurationService)
], NotebookOutlinePaneProvider);
export { NotebookOutlinePaneProvider };
let NotebookBreadcrumbsProvider = class NotebookBreadcrumbsProvider {
    constructor(outlineDataSourceRef, _configurationService) {
        this.outlineDataSourceRef = outlineDataSourceRef;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this.showCodeCells = this._configurationService.getValue(NotebookSetting.breadcrumbsShowCodeCells);
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.breadcrumbsShowCodeCells)) {
                this.showCodeCells = this._configurationService.getValue(NotebookSetting.breadcrumbsShowCodeCells);
            }
        }));
    }
    getBreadcrumbElements() {
        const result = [];
        let candidate = this.outlineDataSourceRef?.object?.activeElement;
        while (candidate) {
            if (this.showCodeCells || candidate.cell.cellKind !== CellKind.Code) {
                result.unshift(candidate);
            }
            candidate = candidate.parent;
        }
        return result;
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookBreadcrumbsProvider = __decorate([
    __param(1, IConfigurationService)
], NotebookBreadcrumbsProvider);
export { NotebookBreadcrumbsProvider };
class NotebookComparator {
    constructor() {
        this._collator = new DOM.WindowIdleValue(mainWindow, () => new Intl.Collator(undefined, { numeric: true }));
    }
    compareByPosition(a, b) {
        return a.index - b.index;
    }
    compareByType(a, b) {
        return a.cell.cellKind - b.cell.cellKind || this._collator.value.compare(a.label, b.label);
    }
    compareByName(a, b) {
        return this._collator.value.compare(a.label, b.label);
    }
}
let NotebookCellOutline = class NotebookCellOutline {
    // getters
    get activeElement() {
        this.checkDelayer();
        if (this._target === 1 /* OutlineTarget.OutlinePane */) {
            return this.config.treeDataSource.getActiveEntry();
        }
        else {
            console.error('activeElement should not be called outside of the OutlinePane');
            return undefined;
        }
    }
    get entries() {
        this.checkDelayer();
        return this._outlineDataSourceReference?.object?.entries ?? [];
    }
    get uri() {
        return this._outlineDataSourceReference?.object?.uri;
    }
    get isEmpty() {
        if (!this._outlineDataSourceReference?.object?.entries) {
            return true;
        }
        return !this._outlineDataSourceReference.object.entries.some(entry => {
            return !filterEntry(entry, this.outlineShowMarkdownHeadersOnly, this.outlineShowCodeCells, this.outlineShowCodeCellSymbols);
        });
    }
    checkDelayer() {
        if (this.delayerRecomputeState.isTriggered()) {
            this.delayerRecomputeState.cancel();
            this.recomputeState();
        }
    }
    constructor(_editor, _target, _themeService, _editorService, _instantiationService, _configurationService, _languageFeaturesService, _notebookExecutionStateService) {
        this._editor = _editor;
        this._target = _target;
        this._themeService = _themeService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.outlineKind = 'notebookCells';
        this._disposables = new DisposableStore();
        this._modelDisposables = new DisposableStore();
        this._dataSourceDisposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.delayerRecomputeState = this._disposables.add(new Delayer(300));
        this.delayerRecomputeActive = this._disposables.add(new Delayer(200));
        // this can be long, because it will force a recompute at the end, so ideally we only do this once all nb language features are registered
        this.delayerRecomputeSymbols = this._disposables.add(new Delayer(2000));
        this.outlineShowCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        this.outlineShowMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        this.initializeOutline();
        const delegate = new NotebookOutlineVirtualDelegate();
        const renderers = [this._instantiationService.createInstance(NotebookOutlineRenderer, this._editor.getControl(), this._target)];
        const comparator = new NotebookComparator();
        const options = {
            collapseByDefault: this._target === 2 /* OutlineTarget.Breadcrumbs */ || (this._target === 1 /* OutlineTarget.OutlinePane */ && this._configurationService.getValue("outline.collapseItems" /* OutlineConfigKeys.collapseItems */) === "alwaysCollapse" /* OutlineConfigCollapseItemsValues.Collapsed */),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            accessibilityProvider: new NotebookOutlineAccessibility(),
            identityProvider: { getId: element => element.cell.uri.toString() },
            keyboardNavigationLabelProvider: new NotebookNavigationLabelProvider()
        };
        this.config = {
            treeDataSource: this._treeDataSource,
            quickPickDataSource: this._quickPickDataSource,
            breadcrumbsDataSource: this._breadcrumbsDataSource,
            delegate,
            renderers,
            comparator,
            options
        };
    }
    initializeOutline() {
        // initial setup
        this.setDataSources();
        this.setModelListeners();
        // reset the data sources + model listeners when we get a new notebook model
        this._disposables.add(this._editor.onDidChangeModel(() => {
            this.setDataSources();
            this.setModelListeners();
            this.computeSymbols();
        }));
        // recompute symbols as document symbol providers are updated in the language features registry
        this._disposables.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => {
            this.delayedComputeSymbols();
        }));
        // recompute active when the selection changes
        this._disposables.add(this._editor.onDidChangeSelection(() => {
            this.delayedRecomputeActive();
        }));
        // recompute state when filter config changes
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowMarkdownHeadersOnly) ||
                e.affectsConfiguration(NotebookSetting.outlineShowCodeCells) ||
                e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols) ||
                e.affectsConfiguration(NotebookSetting.breadcrumbsShowCodeCells)) {
                this.outlineShowCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
                this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
                this.outlineShowMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
                this.delayedRecomputeState();
            }
        }));
        // recompute state when execution states change
        this._disposables.add(this._notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell && !!this._editor.textModel && e.affectsNotebook(this._editor.textModel?.uri)) {
                this.delayedRecomputeState();
            }
        }));
        // recompute symbols when the configuration changes (recompute state - and therefore recompute active - is also called within compute symbols)
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols)) {
                this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
                this.computeSymbols();
            }
        }));
        // fire a change event when the theme changes
        this._disposables.add(this._themeService.onDidFileIconThemeChange(() => {
            this._onDidChange.fire({});
        }));
        // finish with a recompute state
        this.recomputeState();
    }
    /**
     * set up the primary data source + three viewing sources for the various outline views
     */
    setDataSources() {
        const notebookEditor = this._editor.getControl();
        this._outlineDataSourceReference?.dispose();
        this._dataSourceDisposables.clear();
        if (!notebookEditor?.hasModel()) {
            this._outlineDataSourceReference = undefined;
        }
        else {
            this._outlineDataSourceReference = this._dataSourceDisposables.add(this._instantiationService.invokeFunction((accessor) => accessor.get(INotebookCellOutlineDataSourceFactory).getOrCreate(notebookEditor)));
            // escalate outline data source change events
            this._dataSourceDisposables.add(this._outlineDataSourceReference.object.onDidChange(() => {
                this._onDidChange.fire({});
            }));
        }
        // these fields can be passed undefined outlineDataSources. View Providers all handle it accordingly
        this._treeDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookOutlinePaneProvider, this._outlineDataSourceReference));
        this._quickPickDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookQuickPickProvider, this._outlineDataSourceReference));
        this._breadcrumbsDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookBreadcrumbsProvider, this._outlineDataSourceReference));
    }
    /**
     * set up the listeners for the outline content, these respond to model changes in the notebook
     */
    setModelListeners() {
        this._modelDisposables.clear();
        if (!this._editor.textModel) {
            return;
        }
        // Perhaps this is the first time we're building the outline
        if (!this.entries.length) {
            this.computeSymbols();
        }
        // recompute state when there are notebook content changes
        this._modelDisposables.add(this._editor.textModel.onDidChangeContent(contentChanges => {
            if (contentChanges.rawEvents.some(c => c.kind === NotebookCellsChangeType.ChangeCellContent ||
                c.kind === NotebookCellsChangeType.ChangeCellInternalMetadata ||
                c.kind === NotebookCellsChangeType.Move ||
                c.kind === NotebookCellsChangeType.ModelChange)) {
                this.delayedRecomputeState();
            }
        }));
    }
    async computeSymbols(cancelToken = CancellationToken.None) {
        if (this._target === 1 /* OutlineTarget.OutlinePane */ && this.outlineShowCodeCellSymbols) {
            // No need to wait for this, we want the outline to show up quickly.
            void this.doComputeSymbols(cancelToken);
        }
    }
    async doComputeSymbols(cancelToken) {
        await this._outlineDataSourceReference?.object?.computeFullSymbols(cancelToken);
    }
    async delayedComputeSymbols() {
        this.delayerRecomputeState.cancel();
        this.delayerRecomputeActive.cancel();
        this.delayerRecomputeSymbols.trigger(() => { this.computeSymbols(); });
    }
    recomputeState() { this._outlineDataSourceReference?.object?.recomputeState(); }
    delayedRecomputeState() {
        this.delayerRecomputeActive.cancel(); // Active is always recomputed after a recomputing the State.
        this.delayerRecomputeState.trigger(() => { this.recomputeState(); });
    }
    recomputeActive() { this._outlineDataSourceReference?.object?.recomputeActive(); }
    delayedRecomputeActive() {
        this.delayerRecomputeActive.trigger(() => { this.recomputeActive(); });
    }
    async reveal(entry, options, sideBySide) {
        const notebookEditorOptions = {
            ...options,
            override: this._editor.input?.editorId,
            cellRevealType: 5 /* CellRevealType.NearTopIfOutsideViewport */,
            selection: entry.position,
            viewState: undefined,
        };
        await this._editorService.openEditor({
            resource: entry.cell.uri,
            options: notebookEditorOptions,
        }, sideBySide ? SIDE_GROUP : undefined);
    }
    preview(entry) {
        const widget = this._editor.getControl();
        if (!widget) {
            return Disposable.None;
        }
        if (entry.range) {
            const range = Range.lift(entry.range);
            widget.revealRangeInCenterIfOutsideViewportAsync(entry.cell, range);
        }
        else {
            widget.revealInCenterIfOutsideViewport(entry.cell);
        }
        const ids = widget.deltaCellDecorations([], [{
                handle: entry.cell.handle,
                options: { className: 'nb-symbolHighlight', outputClassName: 'nb-symbolHighlight' }
            }]);
        let editorDecorations;
        widget.changeModelDecorations(accessor => {
            if (entry.range) {
                const decorations = [
                    {
                        range: entry.range, options: {
                            description: 'document-symbols-outline-range-highlight',
                            className: 'rangeHighlight',
                            isWholeLine: true
                        }
                    }
                ];
                const deltaDecoration = {
                    ownerId: entry.cell.handle,
                    decorations: decorations
                };
                editorDecorations = accessor.deltaDecorations([], [deltaDecoration]);
            }
        });
        return toDisposable(() => {
            widget.deltaCellDecorations(ids, []);
            if (editorDecorations?.length) {
                widget.changeModelDecorations(accessor => {
                    accessor.deltaDecorations(editorDecorations, []);
                });
            }
        });
    }
    captureViewState() {
        const widget = this._editor.getControl();
        const viewState = widget?.getEditorViewState();
        return toDisposable(() => {
            if (viewState) {
                widget?.restoreListViewState(viewState);
            }
        });
    }
    dispose() {
        this._onDidChange.dispose();
        this._disposables.dispose();
        this._modelDisposables.dispose();
        this._dataSourceDisposables.dispose();
        this._outlineDataSourceReference?.dispose();
    }
};
NotebookCellOutline = __decorate([
    __param(2, IThemeService),
    __param(3, IEditorService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, ILanguageFeaturesService),
    __param(7, INotebookExecutionStateService)
], NotebookCellOutline);
export { NotebookCellOutline };
let NotebookOutlineCreator = class NotebookOutlineCreator {
    constructor(outlineService, _instantiationService) {
        this._instantiationService = _instantiationService;
        const reg = outlineService.registerOutlineCreator(this);
        this.dispose = () => reg.dispose();
    }
    matches(candidate) {
        return candidate.getId() === NotebookEditor.ID;
    }
    async createOutline(editor, target, cancelToken) {
        const outline = this._instantiationService.createInstance(NotebookCellOutline, editor, target);
        if (target === 4 /* OutlineTarget.QuickPick */) {
            // The quickpick creates the outline on demand
            // so we need to ensure the symbols are pre-cached before the entries are syncronously requested
            await outline.doComputeSymbols(cancelToken);
        }
        return outline;
    }
};
NotebookOutlineCreator = __decorate([
    __param(0, IOutlineService),
    __param(1, IInstantiationService)
], NotebookOutlineCreator);
export { NotebookOutlineCreator };
export const NotebookOutlineContext = {
    CellKind: new RawContextKey('notebookCellKind', undefined),
    CellHasChildren: new RawContextKey('notebookCellHasChildren', false),
    CellHasHeader: new RawContextKey('notebookCellHasHeader', false),
    CellFoldingState: new RawContextKey('notebookCellFoldingState', 0 /* CellFoldingState.None */),
    OutlineElementTarget: new RawContextKey('notebookOutlineElementTarget', undefined),
};
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookOutlineCreator, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    'properties': {
        [NotebookSetting.outlineShowMarkdownHeadersOnly]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('outline.showMarkdownHeadersOnly', "When enabled, notebook outline will show only markdown cells containing a header.")
        },
        [NotebookSetting.outlineShowCodeCells]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('outline.showCodeCells', "When enabled, notebook outline shows code cells.")
        },
        [NotebookSetting.outlineShowCodeCellSymbols]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('outline.showCodeCellSymbols', "When enabled, notebook outline shows code cell symbols. Relies on `notebook.outline.showCodeCells` being enabled.")
        },
        [NotebookSetting.breadcrumbsShowCodeCells]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('breadcrumbs.showCodeCells', "When enabled, notebook breadcrumbs contain code cells.")
        },
        [NotebookSetting.gotoSymbolsAllSymbols]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('notebook.gotoSymbols.showAllSymbols', "When enabled, the Go to Symbol Quick Pick will display full code symbols from the notebook, as well as Markdown headers.")
        },
    }
});
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
    submenu: MenuId.NotebookOutlineFilter,
    title: localize('filter', "Filter Entries"),
    icon: Codicon.filter,
    group: 'navigation',
    order: -1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), NOTEBOOK_IS_ACTIVE_EDITOR),
});
registerAction2(class ToggleShowMarkdownHeadersOnly extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleShowMarkdownHeadersOnly',
            title: localize('toggleShowMarkdownHeadersOnly', "Markdown Headers Only"),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showMarkdownHeadersOnly', true)
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                group: '0_markdown_cells',
            }
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showMarkdownHeadersOnly = configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        configurationService.updateValue(NotebookSetting.outlineShowMarkdownHeadersOnly, !showMarkdownHeadersOnly);
    }
});
registerAction2(class ToggleCodeCellEntries extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleCodeCells',
            title: localize('toggleCodeCells', "Code Cells"),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showCodeCells', true)
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                order: 1,
                group: '1_code_cells',
            }
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showCodeCells = configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        configurationService.updateValue(NotebookSetting.outlineShowCodeCells, !showCodeCells);
    }
});
registerAction2(class ToggleCodeCellSymbolEntries extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleCodeCellSymbols',
            title: localize('toggleCodeCellSymbols', "Code Cell Symbols"),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showCodeCellSymbols', true)
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                order: 2,
                group: '1_code_cells',
            }
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showCodeCellSymbols = configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        configurationService.updateValue(NotebookSetting.outlineShowCodeCellSymbols, !showCodeCellSymbols);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9vdXRsaW5lL25vdGVib29rT3V0bGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0UsT0FBTyxFQUEwQixTQUFTLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUk3RyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBbUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNySSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSwwRUFBMEUsQ0FBQztBQUV6SixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sa0VBQWtFLENBQUM7QUFFM0gsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRixP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