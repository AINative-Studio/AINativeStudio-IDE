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
var QuickDiffEditorController_1;
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { Action, ActionRunner } from '../../../../base/common/actions.js';
import { Event } from '../../../../base/common/event.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { SelectActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { defaultSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { peekViewBorder, peekViewTitleBackground, peekViewTitleForeground, peekViewTitleInfoForeground, PeekViewWidget } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IMenuService, MenuId, MenuItemAction, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { IQuickDiffModelService } from './quickDiffModel.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { rot } from '../../../../base/common/numbers.js';
import { ChangeType, getChangeHeight, getChangeType, getChangeTypeColor, getModifiedEndLineNumber, lineIntersectsChange } from '../common/quickDiff.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { TextCompareEditorActiveContext } from '../../../common/contextkeys.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { basename } from '../../../../base/common/resources.js';
import { Position } from '../../../../editor/common/core/position.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { gotoNextLocation, gotoPreviousLocation } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Color } from '../../../../base/common/color.js';
import { getOuterEditor } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { quickDiffDecorationCount } from './quickDiffDecorator.js';
export const isQuickDiffVisible = new RawContextKey('dirtyDiffVisible', false);
let QuickDiffPickerViewItem = class QuickDiffPickerViewItem extends SelectActionViewItem {
    constructor(action, providers, selected, contextViewService, themeService) {
        const items = providers.map(provider => ({ provider, text: provider }));
        let startingSelection = providers.indexOf(selected);
        if (startingSelection === -1) {
            startingSelection = 0;
        }
        const styles = { ...defaultSelectBoxStyles };
        const theme = themeService.getColorTheme();
        const editorBackgroundColor = theme.getColor(editorBackground);
        const peekTitleColor = theme.getColor(peekViewTitleBackground);
        const opaqueTitleColor = peekTitleColor?.makeOpaque(editorBackgroundColor) ?? editorBackgroundColor;
        styles.selectBackground = opaqueTitleColor.lighten(.6).toString();
        super(null, action, items, startingSelection, contextViewService, styles, { ariaLabel: nls.localize('remotes', 'Switch quick diff base') });
        this.optionsItems = items;
    }
    setSelection(provider) {
        const index = this.optionsItems.findIndex(item => item.provider === provider);
        this.select(index);
    }
    getActionContext(_, index) {
        return this.optionsItems[index];
    }
    render(container) {
        super.render(container);
        this.setFocusable(true);
    }
};
QuickDiffPickerViewItem = __decorate([
    __param(3, IContextViewService),
    __param(4, IThemeService)
], QuickDiffPickerViewItem);
export { QuickDiffPickerViewItem };
export class QuickDiffPickerBaseAction extends Action {
    static { this.ID = 'quickDiff.base.switch'; }
    static { this.LABEL = nls.localize('quickDiff.base.switch', "Switch Quick Diff Base"); }
    constructor(callback) {
        super(QuickDiffPickerBaseAction.ID, QuickDiffPickerBaseAction.LABEL, undefined, undefined);
        this.callback = callback;
    }
    async run(event) {
        return this.callback(event);
    }
}
class QuickDiffWidgetActionRunner extends ActionRunner {
    runAction(action, context) {
        if (action instanceof MenuItemAction) {
            return action.run(...context);
        }
        return super.runAction(action, context);
    }
}
let QuickDiffWidgetEditorAction = class QuickDiffWidgetEditorAction extends Action {
    constructor(editor, action, cssClass, keybindingService, instantiationService) {
        const keybinding = keybindingService.lookupKeybinding(action.id);
        const label = action.label + (keybinding ? ` (${keybinding.getLabel()})` : '');
        super(action.id, label, cssClass);
        this.instantiationService = instantiationService;
        this.action = action;
        this.editor = editor;
    }
    run() {
        return Promise.resolve(this.instantiationService.invokeFunction(accessor => this.action.run(accessor, this.editor, null)));
    }
};
QuickDiffWidgetEditorAction = __decorate([
    __param(3, IKeybindingService),
    __param(4, IInstantiationService)
], QuickDiffWidgetEditorAction);
let QuickDiffWidget = class QuickDiffWidget extends PeekViewWidget {
    constructor(editor, model, themeService, instantiationService, menuService, contextKeyService) {
        super(editor, { isResizeable: true, frameWidth: 1, keepEditorSelection: true, className: 'dirty-diff' }, instantiationService);
        this.model = model;
        this.themeService = themeService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._index = 0;
        this._provider = '';
        this.height = undefined;
        this._disposables.add(themeService.onDidColorThemeChange(this._applyTheme, this));
        this._applyTheme(themeService.getColorTheme());
        if (!Iterable.isEmpty(this.model.originalTextModels)) {
            contextKeyService = contextKeyService.createOverlay([
                ['originalResourceScheme', Iterable.first(this.model.originalTextModels)?.uri.scheme],
                ['originalResourceSchemes', Iterable.map(this.model.originalTextModels, textModel => textModel.uri.scheme)]
            ]);
        }
        this.create();
        if (editor.hasModel()) {
            this.title = basename(editor.getModel().uri);
        }
        else {
            this.title = '';
        }
        this.setTitle(this.title);
    }
    get provider() {
        return this._provider;
    }
    get index() {
        return this._index;
    }
    get visibleRange() {
        const visibleRanges = this.diffEditor.getModifiedEditor().getVisibleRanges();
        return visibleRanges.length >= 0 ? visibleRanges[0] : undefined;
    }
    showChange(index, usePosition = true) {
        const labeledChange = this.model.changes[index];
        const change = labeledChange.change;
        this._index = index;
        this.contextKeyService.createKey('originalResourceScheme', this.model.changes[index].original.scheme);
        this.updateActions();
        this._provider = labeledChange.label;
        this.change = change;
        if (Iterable.isEmpty(this.model.originalTextModels)) {
            return;
        }
        const onFirstDiffUpdate = Event.once(this.diffEditor.onDidUpdateDiff);
        // TODO@joao TODO@alex need this setTimeout probably because the
        // non-side-by-side diff still hasn't created the view zones
        onFirstDiffUpdate(() => setTimeout(() => this.revealChange(change), 0));
        const diffEditorModel = this.model.getDiffEditorModel(labeledChange.original);
        if (!diffEditorModel) {
            return;
        }
        this.diffEditor.setModel(diffEditorModel);
        this.dropdown?.setSelection(labeledChange.label);
        const position = new Position(getModifiedEndLineNumber(change), 1);
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const editorHeight = this.editor.getLayoutInfo().height;
        const editorHeightInLines = Math.floor(editorHeight / lineHeight);
        const height = Math.min(getChangeHeight(change) + /* padding */ 8, Math.floor(editorHeightInLines / 3));
        this.renderTitle(labeledChange.label);
        const changeType = getChangeType(change);
        const changeTypeColor = getChangeTypeColor(this.themeService.getColorTheme(), changeType);
        this.style({ frameColor: changeTypeColor, arrowColor: changeTypeColor });
        const providerSpecificChanges = [];
        let contextIndex = index;
        for (const change of this.model.changes) {
            if (change.label === this.model.changes[this._index].label) {
                providerSpecificChanges.push(change.change);
                if (labeledChange === change) {
                    contextIndex = providerSpecificChanges.length - 1;
                }
            }
        }
        this._actionbarWidget.context = [diffEditorModel.modified.uri, providerSpecificChanges, contextIndex];
        if (usePosition) {
            this.show(position, height);
            this.editor.setPosition(position);
            this.editor.focus();
        }
    }
    renderTitle(label) {
        const providerChanges = this.model.quickDiffChanges.get(label);
        const providerIndex = providerChanges.indexOf(this._index);
        let detail;
        if (!this.shouldUseDropdown()) {
            detail = this.model.changes.length > 1
                ? nls.localize('changes', "{0} - {1} of {2} changes", label, providerIndex + 1, providerChanges.length)
                : nls.localize('change', "{0} - {1} of {2} change", label, providerIndex + 1, providerChanges.length);
            this.dropdownContainer.style.display = 'none';
        }
        else {
            detail = this.model.changes.length > 1
                ? nls.localize('multiChanges', "{0} of {1} changes", providerIndex + 1, providerChanges.length)
                : nls.localize('multiChange', "{0} of {1} change", providerIndex + 1, providerChanges.length);
            this.dropdownContainer.style.display = 'inherit';
        }
        this.setTitle(this.title, detail);
    }
    switchQuickDiff(event) {
        const newProvider = event?.provider;
        if (newProvider === this.model.changes[this._index].label) {
            return;
        }
        let closestGreaterIndex = this._index < this.model.changes.length - 1 ? this._index + 1 : 0;
        for (let i = closestGreaterIndex; i !== this._index; i < this.model.changes.length - 1 ? i++ : i = 0) {
            if (this.model.changes[i].label === newProvider) {
                closestGreaterIndex = i;
                break;
            }
        }
        let closestLesserIndex = this._index > 0 ? this._index - 1 : this.model.changes.length - 1;
        for (let i = closestLesserIndex; i !== this._index; i >= 0 ? i-- : i = this.model.changes.length - 1) {
            if (this.model.changes[i].label === newProvider) {
                closestLesserIndex = i;
                break;
            }
        }
        const closestIndex = Math.abs(this.model.changes[closestGreaterIndex].change.modifiedEndLineNumber - this.model.changes[this._index].change.modifiedEndLineNumber)
            < Math.abs(this.model.changes[closestLesserIndex].change.modifiedEndLineNumber - this.model.changes[this._index].change.modifiedEndLineNumber)
            ? closestGreaterIndex : closestLesserIndex;
        this.showChange(closestIndex, false);
    }
    shouldUseDropdown() {
        const visibleQuickDiffs = this.model.quickDiffs.filter(quickDiff => quickDiff.visible);
        const visibleQuickDiffResults = this.model.getQuickDiffResults()
            .filter(result => visibleQuickDiffs.some(quickDiff => quickDiff.label === result.label));
        return visibleQuickDiffResults
            .filter(quickDiff => quickDiff.changes.length > 0).length > 1;
    }
    updateActions() {
        if (!this._actionbarWidget) {
            return;
        }
        const previous = this.instantiationService.createInstance(QuickDiffWidgetEditorAction, this.editor, new ShowPreviousChangeAction(this.editor), ThemeIcon.asClassName(gotoPreviousLocation));
        const next = this.instantiationService.createInstance(QuickDiffWidgetEditorAction, this.editor, new ShowNextChangeAction(this.editor), ThemeIcon.asClassName(gotoNextLocation));
        this._disposables.add(previous);
        this._disposables.add(next);
        if (this.menu) {
            this.menu.dispose();
        }
        this.menu = this.menuService.createMenu(MenuId.SCMChangeContext, this.contextKeyService);
        const actions = getFlatActionBarActions(this.menu.getActions({ shouldForwardArgs: true }));
        this._actionbarWidget.clear();
        this._actionbarWidget.push(actions.reverse(), { label: false, icon: true });
        this._actionbarWidget.push([next, previous], { label: false, icon: true });
        this._actionbarWidget.push(this._disposables.add(new Action('peekview.close', nls.localize('label.close', "Close"), ThemeIcon.asClassName(Codicon.close), true, () => this.dispose())), { label: false, icon: true });
    }
    _fillHead(container) {
        super._fillHead(container, true);
        const visibleQuickDiffs = this.model.quickDiffs.filter(quickDiff => quickDiff.visible);
        this.dropdownContainer = dom.prepend(this._titleElement, dom.$('.dropdown'));
        this.dropdown = this.instantiationService.createInstance(QuickDiffPickerViewItem, new QuickDiffPickerBaseAction((event) => this.switchQuickDiff(event)), visibleQuickDiffs.map(quickDiff => quickDiff.label), this.model.changes[this._index].label);
        this.dropdown.render(this.dropdownContainer);
        this.updateActions();
    }
    _getActionBarOptions() {
        const actionRunner = new QuickDiffWidgetActionRunner();
        this._disposables.add(actionRunner);
        // close widget on successful action
        this._disposables.add(actionRunner.onDidRun(e => {
            if (!(e.action instanceof QuickDiffWidgetEditorAction) && !e.error) {
                this.dispose();
            }
        }));
        return {
            ...super._getActionBarOptions(),
            actionRunner
        };
    }
    _fillBody(container) {
        const options = {
            scrollBeyondLastLine: true,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false
            },
            overviewRulerLanes: 2,
            fixedOverflowWidgets: true,
            minimap: { enabled: false },
            renderSideBySide: false,
            readOnly: false,
            renderIndicators: false,
            diffAlgorithm: 'advanced',
            ignoreTrimWhitespace: false,
            stickyScroll: { enabled: false }
        };
        this.diffEditor = this.instantiationService.createInstance(EmbeddedDiffEditorWidget, container, options, {}, this.editor);
        this._disposables.add(this.diffEditor);
    }
    _onWidth(width) {
        if (typeof this.height === 'undefined') {
            return;
        }
        this.diffEditor.layout({ height: this.height, width });
    }
    _doLayoutBody(height, width) {
        super._doLayoutBody(height, width);
        this.diffEditor.layout({ height, width });
        if (typeof this.height === 'undefined' && this.change) {
            this.revealChange(this.change);
        }
        this.height = height;
    }
    revealChange(change) {
        let start, end;
        if (change.modifiedEndLineNumber === 0) { // deletion
            start = change.modifiedStartLineNumber;
            end = change.modifiedStartLineNumber + 1;
        }
        else if (change.originalEndLineNumber > 0) { // modification
            start = change.modifiedStartLineNumber - 1;
            end = change.modifiedEndLineNumber + 1;
        }
        else { // insertion
            start = change.modifiedStartLineNumber;
            end = change.modifiedEndLineNumber;
        }
        this.diffEditor.revealLinesInCenter(start, end, 1 /* ScrollType.Immediate */);
    }
    _applyTheme(theme) {
        const borderColor = theme.getColor(peekViewBorder) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: theme.getColor(peekViewTitleBackground) || Color.transparent,
            primaryHeadingColor: theme.getColor(peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground)
        });
    }
    revealRange(range) {
        this.editor.revealLineInCenterIfOutsideViewport(range.endLineNumber, 0 /* ScrollType.Smooth */);
    }
    hasFocus() {
        return this.diffEditor.hasTextFocus();
    }
    dispose() {
        super.dispose();
        this.menu?.dispose();
    }
};
QuickDiffWidget = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], QuickDiffWidget);
let QuickDiffEditorController = class QuickDiffEditorController extends Disposable {
    static { QuickDiffEditorController_1 = this; }
    static { this.ID = 'editor.contrib.quickdiff'; }
    static get(editor) {
        return editor.getContribution(QuickDiffEditorController_1.ID);
    }
    constructor(editor, contextKeyService, configurationService, quickDiffModelService, instantiationService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.quickDiffModelService = quickDiffModelService;
        this.instantiationService = instantiationService;
        this.model = null;
        this.widget = null;
        this.session = Disposable.None;
        this.mouseDownInfo = null;
        this.enabled = false;
        this.gutterActionDisposables = new DisposableStore();
        this.enabled = !contextKeyService.getContextKeyValue('isInDiffEditor');
        this.stylesheet = domStylesheetsJs.createStyleSheet(undefined, undefined, this._store);
        if (this.enabled) {
            this.isQuickDiffVisible = isQuickDiffVisible.bindTo(contextKeyService);
            this._register(editor.onDidChangeModel(() => this.close()));
            const onDidChangeGutterAction = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorationsGutterAction'));
            this._register(onDidChangeGutterAction(this.onDidChangeGutterAction, this));
            this.onDidChangeGutterAction();
        }
    }
    onDidChangeGutterAction() {
        const gutterAction = this.configurationService.getValue('scm.diffDecorationsGutterAction');
        this.gutterActionDisposables.clear();
        if (gutterAction === 'diff') {
            this.gutterActionDisposables.add(this.editor.onMouseDown(e => this.onEditorMouseDown(e)));
            this.gutterActionDisposables.add(this.editor.onMouseUp(e => this.onEditorMouseUp(e)));
            this.stylesheet.textContent = `
				.monaco-editor .dirty-diff-glyph {
					cursor: pointer;
				}

				.monaco-editor .margin-view-overlays .dirty-diff-glyph:hover::before {
					height: 100%;
					width: 6px;
					left: -6px;
				}

				.monaco-editor .margin-view-overlays .dirty-diff-deleted:hover::after {
					bottom: 0;
					border-top-width: 0;
					border-bottom-width: 0;
				}
			`;
        }
        else {
            this.stylesheet.textContent = ``;
        }
    }
    canNavigate() {
        return !this.widget || (this.widget?.index === -1) || (!!this.model && this.model.changes.length > 1);
    }
    refresh() {
        this.widget?.showChange(this.widget.index, false);
    }
    next(lineNumber) {
        if (!this.assertWidget()) {
            return;
        }
        if (!this.widget || !this.model) {
            return;
        }
        let index;
        if (this.editor.hasModel() && (typeof lineNumber === 'number' || !this.widget.provider)) {
            index = this.model.findNextClosestChange(typeof lineNumber === 'number' ? lineNumber : this.editor.getPosition().lineNumber, true, this.widget.provider);
        }
        else {
            const providerChanges = this.model.quickDiffChanges.get(this.widget.provider) ?? this.model.quickDiffChanges.values().next().value;
            const mapIndex = providerChanges.findIndex(value => value === this.widget.index);
            index = providerChanges[rot(mapIndex + 1, providerChanges.length)];
        }
        this.widget.showChange(index);
    }
    previous(lineNumber) {
        if (!this.assertWidget()) {
            return;
        }
        if (!this.widget || !this.model) {
            return;
        }
        let index;
        if (this.editor.hasModel() && (typeof lineNumber === 'number')) {
            index = this.model.findPreviousClosestChange(typeof lineNumber === 'number' ? lineNumber : this.editor.getPosition().lineNumber, true, this.widget.provider);
        }
        else {
            const providerChanges = this.model.quickDiffChanges.get(this.widget.provider) ?? this.model.quickDiffChanges.values().next().value;
            const mapIndex = providerChanges.findIndex(value => value === this.widget.index);
            index = providerChanges[rot(mapIndex - 1, providerChanges.length)];
        }
        this.widget.showChange(index);
    }
    close() {
        this.session.dispose();
        this.session = Disposable.None;
    }
    assertWidget() {
        if (!this.enabled) {
            return false;
        }
        if (this.widget) {
            if (!this.model || this.model.changes.length === 0) {
                this.close();
                return false;
            }
            return true;
        }
        const editorModel = this.editor.getModel();
        if (!editorModel) {
            return false;
        }
        const modelRef = this.quickDiffModelService.createQuickDiffModelReference(editorModel.uri);
        if (!modelRef) {
            return false;
        }
        if (modelRef.object.changes.length === 0) {
            modelRef.dispose();
            return false;
        }
        this.model = modelRef.object;
        this.widget = this.instantiationService.createInstance(QuickDiffWidget, this.editor, this.model);
        this.isQuickDiffVisible.set(true);
        const disposables = new DisposableStore();
        disposables.add(Event.once(this.widget.onDidClose)(this.close, this));
        const onDidModelChange = Event.chain(this.model.onDidChange, $ => $.filter(e => e.diff.length > 0)
            .map(e => e.diff));
        onDidModelChange(this.onDidModelChange, this, disposables);
        disposables.add(modelRef);
        disposables.add(this.widget);
        disposables.add(toDisposable(() => {
            this.model = null;
            this.widget = null;
            this.isQuickDiffVisible.set(false);
            this.editor.focus();
        }));
        this.session = disposables;
        return true;
    }
    onDidModelChange(splices) {
        if (!this.model || !this.widget || this.widget.hasFocus()) {
            return;
        }
        for (const splice of splices) {
            if (splice.start <= this.widget.index) {
                this.next();
                return;
            }
        }
        this.refresh();
    }
    onEditorMouseDown(e) {
        this.mouseDownInfo = null;
        const range = e.target.range;
        if (!range) {
            return;
        }
        if (!e.event.leftButton) {
            return;
        }
        if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
            return;
        }
        if (!e.target.element) {
            return;
        }
        if (e.target.element.className.indexOf('dirty-diff-glyph') < 0) {
            return;
        }
        const data = e.target.detail;
        const offsetLeftInGutter = e.target.element.offsetLeft;
        const gutterOffsetX = data.offsetX - offsetLeftInGutter;
        // TODO@joao TODO@alex TODO@martin this is such that we don't collide with folding
        if (gutterOffsetX < -3 || gutterOffsetX > 3) { // dirty diff decoration on hover is 6px wide
            return;
        }
        this.mouseDownInfo = { lineNumber: range.startLineNumber };
    }
    onEditorMouseUp(e) {
        if (!this.mouseDownInfo) {
            return;
        }
        const { lineNumber } = this.mouseDownInfo;
        this.mouseDownInfo = null;
        const range = e.target.range;
        if (!range || range.startLineNumber !== lineNumber) {
            return;
        }
        if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
            return;
        }
        const editorModel = this.editor.getModel();
        if (!editorModel) {
            return;
        }
        const modelRef = this.quickDiffModelService.createQuickDiffModelReference(editorModel.uri);
        if (!modelRef) {
            return;
        }
        try {
            const index = modelRef.object.changes
                .findIndex(change => lineIntersectsChange(lineNumber, change.change));
            if (index < 0) {
                return;
            }
            if (index === this.widget?.index) {
                this.close();
            }
            else {
                this.next(lineNumber);
            }
        }
        finally {
            modelRef.dispose();
        }
    }
    dispose() {
        this.gutterActionDisposables.dispose();
        super.dispose();
    }
};
QuickDiffEditorController = QuickDiffEditorController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IQuickDiffModelService),
    __param(4, IInstantiationService)
], QuickDiffEditorController);
export { QuickDiffEditorController };
export class ShowPreviousChangeAction extends EditorAction {
    constructor(outerEditor) {
        super({
            id: 'editor.action.dirtydiff.previous',
            label: nls.localize2('show previous change', "Show Previous Change"),
            precondition: TextCompareEditorActiveContext.toNegated(),
            kbOpts: { kbExpr: EditorContextKeys.editorTextFocus, primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */, weight: 100 /* KeybindingWeight.EditorContrib */ }
        });
        this.outerEditor = outerEditor;
    }
    run(accessor) {
        const outerEditor = this.outerEditor ?? getOuterEditorFromDiffEditor(accessor);
        if (!outerEditor) {
            return;
        }
        const controller = QuickDiffEditorController.get(outerEditor);
        if (!controller) {
            return;
        }
        if (!controller.canNavigate()) {
            return;
        }
        controller.previous();
    }
}
registerEditorAction(ShowPreviousChangeAction);
export class ShowNextChangeAction extends EditorAction {
    constructor(outerEditor) {
        super({
            id: 'editor.action.dirtydiff.next',
            label: nls.localize2('show next change', "Show Next Change"),
            precondition: TextCompareEditorActiveContext.toNegated(),
            kbOpts: { kbExpr: EditorContextKeys.editorTextFocus, primary: 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */, weight: 100 /* KeybindingWeight.EditorContrib */ }
        });
        this.outerEditor = outerEditor;
    }
    run(accessor) {
        const outerEditor = this.outerEditor ?? getOuterEditorFromDiffEditor(accessor);
        if (!outerEditor) {
            return;
        }
        const controller = QuickDiffEditorController.get(outerEditor);
        if (!controller) {
            return;
        }
        if (!controller.canNavigate()) {
            return;
        }
        controller.next();
    }
}
registerEditorAction(ShowNextChangeAction);
export class GotoPreviousChangeAction extends EditorAction {
    constructor() {
        super({
            id: 'workbench.action.editor.previousChange',
            label: nls.localize2('move to previous change', "Go to Previous Change"),
            precondition: ContextKeyExpr.and(TextCompareEditorActiveContext.toNegated(), quickDiffDecorationCount.notEqualsTo(0)),
            kbOpts: { kbExpr: EditorContextKeys.editorTextFocus, primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */, weight: 100 /* KeybindingWeight.EditorContrib */ }
        });
    }
    async run(accessor) {
        const outerEditor = getOuterEditorFromDiffEditor(accessor);
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const accessibilityService = accessor.get(IAccessibilityService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const quickDiffModelService = accessor.get(IQuickDiffModelService);
        if (!outerEditor || !outerEditor.hasModel()) {
            return;
        }
        const modelRef = quickDiffModelService.createQuickDiffModelReference(outerEditor.getModel().uri);
        try {
            if (!modelRef || modelRef.object.changes.length === 0) {
                return;
            }
            const lineNumber = outerEditor.getPosition().lineNumber;
            const index = modelRef.object.findPreviousClosestChange(lineNumber, false);
            const change = modelRef.object.changes[index];
            await playAccessibilitySymbolForChange(change.change, accessibilitySignalService);
            setPositionAndSelection(change.change, outerEditor, accessibilityService, codeEditorService);
        }
        finally {
            modelRef?.dispose();
        }
    }
}
registerEditorAction(GotoPreviousChangeAction);
export class GotoNextChangeAction extends EditorAction {
    constructor() {
        super({
            id: 'workbench.action.editor.nextChange',
            label: nls.localize2('move to next change', "Go to Next Change"),
            precondition: ContextKeyExpr.and(TextCompareEditorActiveContext.toNegated(), quickDiffDecorationCount.notEqualsTo(0)),
            kbOpts: { kbExpr: EditorContextKeys.editorTextFocus, primary: 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */, weight: 100 /* KeybindingWeight.EditorContrib */ }
        });
    }
    async run(accessor) {
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const outerEditor = getOuterEditorFromDiffEditor(accessor);
        const accessibilityService = accessor.get(IAccessibilityService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const quickDiffModelService = accessor.get(IQuickDiffModelService);
        if (!outerEditor || !outerEditor.hasModel()) {
            return;
        }
        const modelRef = quickDiffModelService.createQuickDiffModelReference(outerEditor.getModel().uri);
        try {
            if (!modelRef || modelRef.object.changes.length === 0) {
                return;
            }
            const lineNumber = outerEditor.getPosition().lineNumber;
            const index = modelRef.object.findNextClosestChange(lineNumber, false);
            const change = modelRef.object.changes[index].change;
            await playAccessibilitySymbolForChange(change, accessibilitySignalService);
            setPositionAndSelection(change, outerEditor, accessibilityService, codeEditorService);
        }
        finally {
            modelRef?.dispose();
        }
    }
}
registerEditorAction(GotoNextChangeAction);
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '7_change_nav',
    command: {
        id: 'editor.action.dirtydiff.next',
        title: nls.localize({ key: 'miGotoNextChange', comment: ['&& denotes a mnemonic'] }, "Next &&Change")
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '7_change_nav',
    command: {
        id: 'editor.action.dirtydiff.previous',
        title: nls.localize({ key: 'miGotoPreviousChange', comment: ['&& denotes a mnemonic'] }, "Previous &&Change")
    },
    order: 2
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'closeQuickDiff',
    weight: 100 /* KeybindingWeight.EditorContrib */ + 50,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(isQuickDiffVisible),
    handler: (accessor) => {
        const outerEditor = getOuterEditorFromDiffEditor(accessor);
        if (!outerEditor) {
            return;
        }
        const controller = QuickDiffEditorController.get(outerEditor);
        if (!controller) {
            return;
        }
        controller.close();
    }
});
function setPositionAndSelection(change, editor, accessibilityService, codeEditorService) {
    const position = new Position(change.modifiedStartLineNumber, 1);
    editor.setPosition(position);
    editor.revealPositionInCenter(position);
    if (accessibilityService.isScreenReaderOptimized()) {
        editor.setSelection({ startLineNumber: change.modifiedStartLineNumber, startColumn: 0, endLineNumber: change.modifiedStartLineNumber, endColumn: Number.MAX_VALUE });
        codeEditorService.getActiveCodeEditor()?.writeScreenReaderContent('diff-navigation');
    }
}
async function playAccessibilitySymbolForChange(change, accessibilitySignalService) {
    const changeType = getChangeType(change);
    switch (changeType) {
        case ChangeType.Add:
            accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, { allowManyInParallel: true, source: 'quickDiffDecoration' });
            break;
        case ChangeType.Delete:
            accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, { allowManyInParallel: true, source: 'quickDiffDecoration' });
            break;
        case ChangeType.Modify:
            accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, { allowManyInParallel: true, source: 'quickDiffDecoration' });
            break;
    }
}
function getOuterEditorFromDiffEditor(accessor) {
    const diffEditors = accessor.get(ICodeEditorService).listDiffEditors();
    for (const diffEditor of diffEditors) {
        if (diffEditor.hasTextFocus() && diffEditor instanceof EmbeddedDiffEditorWidget) {
            return diffEditor.getParentEditor();
        }
    }
    return getOuterEditor(accessor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3F1aWNrRGlmZldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM3RixPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSx1QkFBdUIsRUFBRSwyQkFBMkIsRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4TCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFM0gsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BHLE9BQU8sRUFB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