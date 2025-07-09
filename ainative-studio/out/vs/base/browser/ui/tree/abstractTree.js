/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append, clearNode, h, hasParentWithClass, isActiveElement, isKeyboardEvent, addDisposableListener, isEditableElement } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { asCssValueWithDefault } from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { FindInput } from '../findinput/findInput.js';
import { unthemedInboxStyles } from '../inputbox/inputBox.js';
import { ElementsDragAndDropData } from '../list/listView.js';
import { isActionItem, isButton, isMonacoCustomToggle, isMonacoEditor, isStickyScrollContainer, isStickyScrollElement, List, MouseController } from '../list/listWidget.js';
import { Toggle, unthemedToggleStyles } from '../toggle/toggle.js';
import { getVisibleState, isFilterResult } from './indexTreeModel.js';
import { TreeError, TreeMouseEventTarget } from './tree.js';
import { Action } from '../../../common/actions.js';
import { distinct, equals, insertInto, range } from '../../../common/arrays.js';
import { Delayer, disposableTimeout, timeout } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { SetMap } from '../../../common/map.js';
import { Emitter, Event, EventBufferer, Relay } from '../../../common/event.js';
import { fuzzyScore, FuzzyScore } from '../../../common/filters.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../common/lifecycle.js';
import { clamp } from '../../../common/numbers.js';
import './media/tree.css';
import { localize } from '../../../../nls.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { autorun, constObservable } from '../../../common/observable.js';
import { alert } from '../aria/aria.js';
class TreeElementsDragAndDropData extends ElementsDragAndDropData {
    set context(context) {
        this.data.context = context;
    }
    get context() {
        return this.data.context;
    }
    constructor(data) {
        super(data.elements.map(node => node.element));
        this.data = data;
    }
}
function asTreeDragAndDropData(data) {
    if (data instanceof ElementsDragAndDropData) {
        return new TreeElementsDragAndDropData(data);
    }
    return data;
}
class TreeNodeListDragAndDrop {
    constructor(modelProvider, dnd) {
        this.modelProvider = modelProvider;
        this.dnd = dnd;
        this.autoExpandDisposable = Disposable.None;
        this.disposables = new DisposableStore();
    }
    getDragURI(node) {
        return this.dnd.getDragURI(node.element);
    }
    getDragLabel(nodes, originalEvent) {
        if (this.dnd.getDragLabel) {
            return this.dnd.getDragLabel(nodes.map(node => node.element), originalEvent);
        }
        return undefined;
    }
    onDragStart(data, originalEvent) {
        this.dnd.onDragStart?.(asTreeDragAndDropData(data), originalEvent);
    }
    onDragOver(data, targetNode, targetIndex, targetSector, originalEvent, raw = true) {
        const result = this.dnd.onDragOver(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
        const didChangeAutoExpandNode = this.autoExpandNode !== targetNode;
        if (didChangeAutoExpandNode) {
            this.autoExpandDisposable.dispose();
            this.autoExpandNode = targetNode;
        }
        if (typeof targetNode === 'undefined') {
            return result;
        }
        if (didChangeAutoExpandNode && typeof result !== 'boolean' && result.autoExpand) {
            this.autoExpandDisposable = disposableTimeout(() => {
                const model = this.modelProvider();
                const ref = model.getNodeLocation(targetNode);
                if (model.isCollapsed(ref)) {
                    model.setCollapsed(ref, false);
                }
                this.autoExpandNode = undefined;
            }, 500, this.disposables);
        }
        if (typeof result === 'boolean' || !result.accept || typeof result.bubble === 'undefined' || result.feedback) {
            if (!raw) {
                const accept = typeof result === 'boolean' ? result : result.accept;
                const effect = typeof result === 'boolean' ? undefined : result.effect;
                return { accept, effect, feedback: [targetIndex] };
            }
            return result;
        }
        if (result.bubble === 1 /* TreeDragOverBubble.Up */) {
            const model = this.modelProvider();
            const ref = model.getNodeLocation(targetNode);
            const parentRef = model.getParentNodeLocation(ref);
            const parentNode = model.getNode(parentRef);
            const parentIndex = parentRef && model.getListIndex(parentRef);
            return this.onDragOver(data, parentNode, parentIndex, targetSector, originalEvent, false);
        }
        const model = this.modelProvider();
        const ref = model.getNodeLocation(targetNode);
        const start = model.getListIndex(ref);
        const length = model.getListRenderCount(ref);
        return { ...result, feedback: range(start, start + length) };
    }
    drop(data, targetNode, targetIndex, targetSector, originalEvent) {
        this.autoExpandDisposable.dispose();
        this.autoExpandNode = undefined;
        this.dnd.drop(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
    }
    onDragEnd(originalEvent) {
        this.dnd.onDragEnd?.(originalEvent);
    }
    dispose() {
        this.disposables.dispose();
        this.dnd.dispose();
    }
}
function asListOptions(modelProvider, disposableStore, options) {
    return options && {
        ...options,
        identityProvider: options.identityProvider && {
            getId(el) {
                return options.identityProvider.getId(el.element);
            }
        },
        dnd: options.dnd && disposableStore.add(new TreeNodeListDragAndDrop(modelProvider, options.dnd)),
        multipleSelectionController: options.multipleSelectionController && {
            isSelectionSingleChangeEvent(e) {
                return options.multipleSelectionController.isSelectionSingleChangeEvent({ ...e, element: e.element });
            },
            isSelectionRangeChangeEvent(e) {
                return options.multipleSelectionController.isSelectionRangeChangeEvent({ ...e, element: e.element });
            }
        },
        accessibilityProvider: options.accessibilityProvider && {
            ...options.accessibilityProvider,
            getSetSize(node) {
                const model = modelProvider();
                const ref = model.getNodeLocation(node);
                const parentRef = model.getParentNodeLocation(ref);
                const parentNode = model.getNode(parentRef);
                return parentNode.visibleChildrenCount;
            },
            getPosInSet(node) {
                return node.visibleChildIndex + 1;
            },
            isChecked: options.accessibilityProvider && options.accessibilityProvider.isChecked ? (node) => {
                return options.accessibilityProvider.isChecked(node.element);
            } : undefined,
            getRole: options.accessibilityProvider && options.accessibilityProvider.getRole ? (node) => {
                return options.accessibilityProvider.getRole(node.element);
            } : () => 'treeitem',
            getAriaLabel(e) {
                return options.accessibilityProvider.getAriaLabel(e.element);
            },
            getWidgetAriaLabel() {
                return options.accessibilityProvider.getWidgetAriaLabel();
            },
            getWidgetRole: options.accessibilityProvider && options.accessibilityProvider.getWidgetRole ? () => options.accessibilityProvider.getWidgetRole() : () => 'tree',
            getAriaLevel: options.accessibilityProvider && options.accessibilityProvider.getAriaLevel ? (node) => options.accessibilityProvider.getAriaLevel(node.element) : (node) => {
                return node.depth;
            },
            getActiveDescendantId: options.accessibilityProvider.getActiveDescendantId && (node => {
                return options.accessibilityProvider.getActiveDescendantId(node.element);
            })
        },
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            ...options.keyboardNavigationLabelProvider,
            getKeyboardNavigationLabel(node) {
                return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(node.element);
            }
        }
    };
}
export class ComposedTreeDelegate {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getHeight(element) {
        return this.delegate.getHeight(element.element);
    }
    getTemplateId(element) {
        return this.delegate.getTemplateId(element.element);
    }
    hasDynamicHeight(element) {
        return !!this.delegate.hasDynamicHeight && this.delegate.hasDynamicHeight(element.element);
    }
    setDynamicHeight(element, height) {
        this.delegate.setDynamicHeight?.(element.element, height);
    }
}
export class AbstractTreeViewState {
    static lift(state) {
        return state instanceof AbstractTreeViewState ? state : new AbstractTreeViewState(state);
    }
    static empty(scrollTop = 0) {
        return new AbstractTreeViewState({
            focus: [],
            selection: [],
            expanded: Object.create(null),
            scrollTop,
        });
    }
    constructor(state) {
        this.focus = new Set(state.focus);
        this.selection = new Set(state.selection);
        if (state.expanded instanceof Array) { // old format
            this.expanded = Object.create(null);
            for (const id of state.expanded) {
                this.expanded[id] = 1;
            }
        }
        else {
            this.expanded = state.expanded;
        }
        this.expanded = state.expanded;
        this.scrollTop = state.scrollTop;
    }
    toJSON() {
        return {
            focus: Array.from(this.focus),
            selection: Array.from(this.selection),
            expanded: this.expanded,
            scrollTop: this.scrollTop,
        };
    }
}
export var RenderIndentGuides;
(function (RenderIndentGuides) {
    RenderIndentGuides["None"] = "none";
    RenderIndentGuides["OnHover"] = "onHover";
    RenderIndentGuides["Always"] = "always";
})(RenderIndentGuides || (RenderIndentGuides = {}));
class EventCollection {
    get elements() {
        return this._elements;
    }
    constructor(onDidChange, _elements = []) {
        this._elements = _elements;
        this.disposables = new DisposableStore();
        this.onDidChange = Event.forEach(onDidChange, elements => this._elements = elements, this.disposables);
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class TreeRenderer {
    static { this.DefaultIndent = 8; }
    constructor(renderer, model, onDidChangeCollapseState, activeNodes, renderedIndentGuides, options = {}) {
        this.renderer = renderer;
        this.model = model;
        this.activeNodes = activeNodes;
        this.renderedIndentGuides = renderedIndentGuides;
        this.renderedElements = new Map();
        this.renderedNodes = new Map();
        this.indent = TreeRenderer.DefaultIndent;
        this.hideTwistiesOfChildlessElements = false;
        this.shouldRenderIndentGuides = false;
        this.activeIndentNodes = new Set();
        this.indentGuidesDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this.templateId = renderer.templateId;
        this.updateOptions(options);
        Event.map(onDidChangeCollapseState, e => e.node)(this.onDidChangeNodeTwistieState, this, this.disposables);
        renderer.onDidChangeTwistieState?.(this.onDidChangeTwistieState, this, this.disposables);
    }
    updateOptions(options = {}) {
        if (typeof options.indent !== 'undefined') {
            const indent = clamp(options.indent, 0, 40);
            if (indent !== this.indent) {
                this.indent = indent;
                for (const [node, templateData] of this.renderedNodes) {
                    this.renderTreeElement(node, templateData);
                }
            }
        }
        if (typeof options.renderIndentGuides !== 'undefined') {
            const shouldRenderIndentGuides = options.renderIndentGuides !== RenderIndentGuides.None;
            if (shouldRenderIndentGuides !== this.shouldRenderIndentGuides) {
                this.shouldRenderIndentGuides = shouldRenderIndentGuides;
                for (const [node, templateData] of this.renderedNodes) {
                    this._renderIndentGuides(node, templateData);
                }
                this.indentGuidesDisposable.dispose();
                if (shouldRenderIndentGuides) {
                    const disposables = new DisposableStore();
                    this.activeNodes.onDidChange(this._onDidChangeActiveNodes, this, disposables);
                    this.indentGuidesDisposable = disposables;
                    this._onDidChangeActiveNodes(this.activeNodes.elements);
                }
            }
        }
        if (typeof options.hideTwistiesOfChildlessElements !== 'undefined') {
            this.hideTwistiesOfChildlessElements = options.hideTwistiesOfChildlessElements;
        }
    }
    renderTemplate(container) {
        const el = append(container, $('.monaco-tl-row'));
        const indent = append(el, $('.monaco-tl-indent'));
        const twistie = append(el, $('.monaco-tl-twistie'));
        const contents = append(el, $('.monaco-tl-contents'));
        const templateData = this.renderer.renderTemplate(contents);
        return { container, indent, twistie, indentGuidesDisposable: Disposable.None, templateData };
    }
    renderElement(node, index, templateData, height) {
        this.renderedNodes.set(node, templateData);
        this.renderedElements.set(node.element, node);
        this.renderTreeElement(node, templateData);
        this.renderer.renderElement(node, index, templateData.templateData, height);
    }
    disposeElement(node, index, templateData, height) {
        templateData.indentGuidesDisposable.dispose();
        this.renderer.disposeElement?.(node, index, templateData.templateData, height);
        if (typeof height === 'number') {
            this.renderedNodes.delete(node);
            this.renderedElements.delete(node.element);
        }
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.templateData);
    }
    onDidChangeTwistieState(element) {
        const node = this.renderedElements.get(element);
        if (!node) {
            return;
        }
        this.onDidChangeNodeTwistieState(node);
    }
    onDidChangeNodeTwistieState(node) {
        const templateData = this.renderedNodes.get(node);
        if (!templateData) {
            return;
        }
        this._onDidChangeActiveNodes(this.activeNodes.elements);
        this.renderTreeElement(node, templateData);
    }
    renderTreeElement(node, templateData) {
        const indent = TreeRenderer.DefaultIndent + (node.depth - 1) * this.indent;
        templateData.twistie.style.paddingLeft = `${indent}px`;
        templateData.indent.style.width = `${indent + this.indent - 16}px`;
        if (node.collapsible) {
            templateData.container.setAttribute('aria-expanded', String(!node.collapsed));
        }
        else {
            templateData.container.removeAttribute('aria-expanded');
        }
        templateData.twistie.classList.remove(...ThemeIcon.asClassNameArray(Codicon.treeItemExpanded));
        let twistieRendered = false;
        if (this.renderer.renderTwistie) {
            twistieRendered = this.renderer.renderTwistie(node.element, templateData.twistie);
        }
        if (node.collapsible && (!this.hideTwistiesOfChildlessElements || node.visibleChildrenCount > 0)) {
            if (!twistieRendered) {
                templateData.twistie.classList.add(...ThemeIcon.asClassNameArray(Codicon.treeItemExpanded));
            }
            templateData.twistie.classList.add('collapsible');
            templateData.twistie.classList.toggle('collapsed', node.collapsed);
        }
        else {
            templateData.twistie.classList.remove('collapsible', 'collapsed');
        }
        this._renderIndentGuides(node, templateData);
    }
    _renderIndentGuides(node, templateData) {
        clearNode(templateData.indent);
        templateData.indentGuidesDisposable.dispose();
        if (!this.shouldRenderIndentGuides) {
            return;
        }
        const disposableStore = new DisposableStore();
        while (true) {
            const ref = this.model.getNodeLocation(node);
            const parentRef = this.model.getParentNodeLocation(ref);
            if (!parentRef) {
                break;
            }
            const parent = this.model.getNode(parentRef);
            const guide = $('.indent-guide', { style: `width: ${this.indent}px` });
            if (this.activeIndentNodes.has(parent)) {
                guide.classList.add('active');
            }
            if (templateData.indent.childElementCount === 0) {
                templateData.indent.appendChild(guide);
            }
            else {
                templateData.indent.insertBefore(guide, templateData.indent.firstElementChild);
            }
            this.renderedIndentGuides.add(parent, guide);
            disposableStore.add(toDisposable(() => this.renderedIndentGuides.delete(parent, guide)));
            node = parent;
        }
        templateData.indentGuidesDisposable = disposableStore;
    }
    _onDidChangeActiveNodes(nodes) {
        if (!this.shouldRenderIndentGuides) {
            return;
        }
        const set = new Set();
        nodes.forEach(node => {
            const ref = this.model.getNodeLocation(node);
            try {
                const parentRef = this.model.getParentNodeLocation(ref);
                if (node.collapsible && node.children.length > 0 && !node.collapsed) {
                    set.add(node);
                }
                else if (parentRef) {
                    set.add(this.model.getNode(parentRef));
                }
            }
            catch {
                // noop
            }
        });
        this.activeIndentNodes.forEach(node => {
            if (!set.has(node)) {
                this.renderedIndentGuides.forEach(node, line => line.classList.remove('active'));
            }
        });
        set.forEach(node => {
            if (!this.activeIndentNodes.has(node)) {
                this.renderedIndentGuides.forEach(node, line => line.classList.add('active'));
            }
        });
        this.activeIndentNodes = set;
    }
    dispose() {
        this.renderedNodes.clear();
        this.renderedElements.clear();
        this.indentGuidesDisposable.dispose();
        dispose(this.disposables);
    }
}
export function contiguousFuzzyScore(patternLower, wordLower) {
    const index = wordLower.toLowerCase().indexOf(patternLower);
    let score;
    if (index > -1) {
        score = [Number.MAX_SAFE_INTEGER, 0];
        for (let i = patternLower.length; i > 0; i--) {
            score.push(index + i - 1);
        }
    }
    return score;
}
export class FindFilter {
    get totalCount() { return this._totalCount; }
    get matchCount() { return this._matchCount; }
    set findMatchType(type) { this._findMatchType = type; }
    get findMatchType() { return this._findMatchType; }
    set findMode(mode) { this._findMode = mode; }
    get findMode() { return this._findMode; }
    set pattern(pattern) {
        this._pattern = pattern;
        this._lowercasePattern = pattern.toLowerCase();
    }
    constructor(_keyboardNavigationLabelProvider, _filter, _defaultFindVisibility) {
        this._keyboardNavigationLabelProvider = _keyboardNavigationLabelProvider;
        this._filter = _filter;
        this._defaultFindVisibility = _defaultFindVisibility;
        this._totalCount = 0;
        this._matchCount = 0;
        this._findMatchType = TreeFindMatchType.Fuzzy;
        this._findMode = TreeFindMode.Highlight;
        this._pattern = '';
        this._lowercasePattern = '';
        this.disposables = new DisposableStore();
    }
    filter(element, parentVisibility) {
        let visibility = 1 /* TreeVisibility.Visible */;
        if (this._filter) {
            const result = this._filter.filter(element, parentVisibility);
            if (typeof result === 'boolean') {
                visibility = result ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
            else if (isFilterResult(result)) {
                visibility = getVisibleState(result.visibility);
            }
            else {
                visibility = result;
            }
            if (visibility === 0 /* TreeVisibility.Hidden */) {
                return false;
            }
        }
        this._totalCount++;
        if (!this._pattern) {
            this._matchCount++;
            return { data: FuzzyScore.Default, visibility };
        }
        const label = this._keyboardNavigationLabelProvider.getKeyboardNavigationLabel(element);
        const labels = Array.isArray(label) ? label : [label];
        for (const l of labels) {
            const labelStr = l && l.toString();
            if (typeof labelStr === 'undefined') {
                return { data: FuzzyScore.Default, visibility };
            }
            let score;
            if (this._findMatchType === TreeFindMatchType.Contiguous) {
                score = contiguousFuzzyScore(this._lowercasePattern, labelStr.toLowerCase());
            }
            else {
                score = fuzzyScore(this._pattern, this._lowercasePattern, 0, labelStr, labelStr.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
            }
            if (score) {
                this._matchCount++;
                return labels.length === 1 ?
                    { data: score, visibility } :
                    { data: { label: labelStr, score: score }, visibility };
            }
        }
        if (this._findMode === TreeFindMode.Filter) {
            if (typeof this._defaultFindVisibility === 'number') {
                return this._defaultFindVisibility;
            }
            else if (this._defaultFindVisibility) {
                return this._defaultFindVisibility(element);
            }
            else {
                return 2 /* TreeVisibility.Recurse */;
            }
        }
        else {
            return { data: FuzzyScore.Default, visibility };
        }
    }
    reset() {
        this._totalCount = 0;
        this._matchCount = 0;
    }
    dispose() {
        dispose(this.disposables);
    }
}
class TreeFindToggle extends Toggle {
    constructor(contribution, opts, hoverDelegate) {
        super({
            icon: contribution.icon,
            title: contribution.title,
            isChecked: contribution.isChecked,
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
            hoverDelegate,
        });
        this.id = contribution.id;
    }
}
export class FindToggles {
    constructor(startStates) {
        this.stateMap = new Map(startStates.map(state => [state.id, { ...state }]));
    }
    states() {
        return Array.from(this.stateMap.values());
    }
    get(id) {
        const state = this.stateMap.get(id);
        if (state === undefined) {
            throw new Error(`No state found for toggle id ${id}`);
        }
        return state.isChecked;
    }
    set(id, value) {
        const state = this.stateMap.get(id);
        if (state === undefined) {
            throw new Error(`No state found for toggle id ${id}`);
        }
        if (state.isChecked === value) {
            return false;
        }
        state.isChecked = value;
        return true;
    }
}
const unthemedFindWidgetStyles = {
    inputBoxStyles: unthemedInboxStyles,
    toggleStyles: unthemedToggleStyles,
    listFilterWidgetBackground: undefined,
    listFilterWidgetNoMatchesOutline: undefined,
    listFilterWidgetOutline: undefined,
    listFilterWidgetShadow: undefined
};
export var TreeFindMode;
(function (TreeFindMode) {
    TreeFindMode[TreeFindMode["Highlight"] = 0] = "Highlight";
    TreeFindMode[TreeFindMode["Filter"] = 1] = "Filter";
})(TreeFindMode || (TreeFindMode = {}));
export var TreeFindMatchType;
(function (TreeFindMatchType) {
    TreeFindMatchType[TreeFindMatchType["Fuzzy"] = 0] = "Fuzzy";
    TreeFindMatchType[TreeFindMatchType["Contiguous"] = 1] = "Contiguous";
})(TreeFindMatchType || (TreeFindMatchType = {}));
class FindWidget extends Disposable {
    get value() {
        return this.findInput.inputBox.value;
    }
    set value(value) {
        this.findInput.inputBox.value = value;
    }
    constructor(container, tree, contextViewProvider, placeholder, toggleContributions = [], options) {
        super();
        this.tree = tree;
        this.elements = h('.monaco-tree-type-filter', [
            h('.monaco-tree-type-filter-input@findInput'),
            h('.monaco-tree-type-filter-actionbar@actionbar'),
        ]);
        this.toggles = [];
        this._onDidDisable = new Emitter();
        this.onDidDisable = this._onDidDisable.event;
        container.appendChild(this.elements.root);
        this._register(toDisposable(() => this.elements.root.remove()));
        const styles = options?.styles ?? unthemedFindWidgetStyles;
        if (styles.listFilterWidgetBackground) {
            this.elements.root.style.backgroundColor = styles.listFilterWidgetBackground;
        }
        if (styles.listFilterWidgetShadow) {
            this.elements.root.style.boxShadow = `0 0 8px 2px ${styles.listFilterWidgetShadow}`;
        }
        const toggleHoverDelegate = this._register(createInstantHoverDelegate());
        this.toggles = toggleContributions.map(contribution => this._register(new TreeFindToggle(contribution, styles.toggleStyles, toggleHoverDelegate)));
        this.onDidToggleChange = Event.any(...this.toggles.map(toggle => Event.map(toggle.onChange, () => ({ id: toggle.id, isChecked: toggle.checked }))));
        const history = options?.history || [];
        this.findInput = this._register(new FindInput(this.elements.findInput, contextViewProvider, {
            label: localize('type to search', "Type to search"),
            placeholder,
            additionalToggles: this.toggles,
            showCommonFindToggles: false,
            inputBoxStyles: styles.inputBoxStyles,
            toggleStyles: styles.toggleStyles,
            history: new Set(history)
        }));
        this.actionbar = this._register(new ActionBar(this.elements.actionbar));
        const emitter = this._register(new DomEmitter(this.findInput.inputBox.inputElement, 'keydown'));
        const onKeyDown = Event.chain(emitter.event, $ => $.map(e => new StandardKeyboardEvent(e)));
        this._register(onKeyDown((e) => {
            // Using equals() so we reserve modified keys for future use
            if (e.equals(3 /* KeyCode.Enter */)) {
                // This is the only keyboard way to return to the tree from a history item that isn't the last one
                e.preventDefault();
                e.stopPropagation();
                this.findInput.inputBox.addToHistory();
                this.tree.domFocus();
                return;
            }
            if (e.equals(18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
                e.stopPropagation();
                if (this.findInput.inputBox.isAtLastInHistory() || this.findInput.inputBox.isNowhereInHistory()) {
                    // Retain original pre-history DownArrow behavior
                    this.findInput.inputBox.addToHistory();
                    this.tree.domFocus();
                }
                else {
                    // Downward through history
                    this.findInput.inputBox.showNextValue();
                }
                return;
            }
            if (e.equals(16 /* KeyCode.UpArrow */)) {
                e.preventDefault();
                e.stopPropagation();
                // Upward through history
                this.findInput.inputBox.showPreviousValue();
                return;
            }
        }));
        const closeAction = this._register(new Action('close', localize('close', "Close"), 'codicon codicon-close', true, () => this.dispose()));
        this.actionbar.push(closeAction, { icon: true, label: false });
        this.onDidChangeValue = this.findInput.onDidChange;
    }
    setToggleState(id, checked) {
        const toggle = this.toggles.find(toggle => toggle.id === id);
        if (toggle) {
            toggle.checked = checked;
        }
    }
    setPlaceHolder(placeHolder) {
        this.findInput.inputBox.setPlaceHolder(placeHolder);
    }
    getHistory() {
        return this.findInput.inputBox.getHistory();
    }
    focus() {
        this.findInput.focus();
    }
    select() {
        this.findInput.select();
        // Reposition to last in history
        this.findInput.inputBox.addToHistory(true);
    }
    showMessage(message) {
        this.findInput.showMessage(message);
    }
    clearMessage() {
        this.findInput.clearMessage();
    }
    async dispose() {
        this._onDidDisable.fire();
        this.elements.root.classList.add('disabled');
        await timeout(300);
        super.dispose();
    }
}
var DefaultTreeToggles;
(function (DefaultTreeToggles) {
    DefaultTreeToggles["Mode"] = "mode";
    DefaultTreeToggles["MatchType"] = "matchType";
})(DefaultTreeToggles || (DefaultTreeToggles = {}));
export class AbstractFindController {
    get pattern() { return this._pattern; }
    get placeholder() { return this._placeholder; }
    set placeholder(value) {
        this._placeholder = value;
        this.widget?.setPlaceHolder(value);
    }
    constructor(tree, filter, contextViewProvider, options = {}) {
        this.tree = tree;
        this.filter = filter;
        this.contextViewProvider = contextViewProvider;
        this.options = options;
        this._pattern = '';
        this.previousPattern = '';
        this._onDidChangePattern = new Emitter();
        this.onDidChangePattern = this._onDidChangePattern.event;
        this._onDidChangeOpenState = new Emitter();
        this.onDidChangeOpenState = this._onDidChangeOpenState.event;
        this.enabledDisposables = new DisposableStore();
        this.disposables = new DisposableStore();
        this.toggles = new FindToggles(options.toggles ?? []);
        this._placeholder = options.placeholder ?? localize('type to search', "Type to search");
    }
    isOpened() {
        return !!this.widget;
    }
    open() {
        if (this.widget) {
            this.widget.focus();
            this.widget.select();
            return;
        }
        this.tree.updateOptions({ paddingTop: 30 });
        this.widget = new FindWidget(this.tree.getHTMLElement(), this.tree, this.contextViewProvider, this.placeholder, this.toggles.states(), { ...this.options, history: this._history });
        this.enabledDisposables.add(this.widget);
        this.widget.onDidChangeValue(this.onDidChangeValue, this, this.enabledDisposables);
        this.widget.onDidDisable(this.close, this, this.enabledDisposables);
        this.widget.onDidToggleChange(this.onDidToggleChange, this, this.enabledDisposables);
        this.widget.focus();
        this.widget.value = this.previousPattern;
        this.widget.select();
        this._onDidChangeOpenState.fire(true);
    }
    close() {
        if (!this.widget) {
            return;
        }
        this.tree.updateOptions({ paddingTop: 0 });
        this._history = this.widget.getHistory();
        this.widget = undefined;
        this.enabledDisposables.clear();
        this.previousPattern = this.pattern;
        this.onDidChangeValue('');
        this.tree.domFocus();
        this._onDidChangeOpenState.fire(false);
    }
    onDidChangeValue(pattern) {
        this._pattern = pattern;
        this._onDidChangePattern.fire(pattern);
        this.filter.pattern = pattern;
        this.applyPattern(pattern);
    }
    onDidToggleChange(e) {
        this.toggles.set(e.id, e.isChecked);
    }
    updateToggleState(id, checked) {
        this.toggles.set(id, checked);
        this.widget?.setToggleState(id, checked);
    }
    renderMessage(showNotFound, warningMessage) {
        if (showNotFound) {
            if (this.tree.options.showNotFoundMessage ?? true) {
                this.widget?.showMessage({ type: 2 /* MessageType.WARNING */, content: warningMessage ?? localize('not found', "No results found.") });
            }
            else {
                this.widget?.showMessage({ type: 2 /* MessageType.WARNING */ });
            }
        }
        else {
            this.widget?.clearMessage();
        }
    }
    alertResults(results) {
        if (!results) {
            alert(localize('replFindNoResults', "No results"));
        }
        else {
            alert(localize('foundResults', "{0} results", results));
        }
    }
    dispose() {
        this._history = undefined;
        this._onDidChangePattern.dispose();
        this.enabledDisposables.dispose();
        this.disposables.dispose();
    }
}
export class FindController extends AbstractFindController {
    get mode() { return this.toggles.get(DefaultTreeToggles.Mode) ? TreeFindMode.Filter : TreeFindMode.Highlight; }
    set mode(mode) {
        if (mode === this.mode) {
            return;
        }
        const isFilterMode = mode === TreeFindMode.Filter;
        this.updateToggleState(DefaultTreeToggles.Mode, isFilterMode);
        this.placeholder = isFilterMode ? localize('type to filter', "Type to filter") : localize('type to search', "Type to search");
        this.filter.findMode = mode;
        this.tree.refilter();
        this.render();
        this._onDidChangeMode.fire(mode);
    }
    get matchType() { return this.toggles.get(DefaultTreeToggles.MatchType) ? TreeFindMatchType.Fuzzy : TreeFindMatchType.Contiguous; }
    set matchType(matchType) {
        if (matchType === this.matchType) {
            return;
        }
        this.updateToggleState(DefaultTreeToggles.MatchType, matchType === TreeFindMatchType.Fuzzy);
        this.filter.findMatchType = matchType;
        this.tree.refilter();
        this.render();
        this._onDidChangeMatchType.fire(matchType);
    }
    constructor(tree, filter, contextViewProvider, options = {}) {
        const defaultFindMode = options.defaultFindMode ?? TreeFindMode.Highlight;
        const defaultFindMatchType = options.defaultFindMatchType ?? TreeFindMatchType.Fuzzy;
        const toggleContributions = [{
                id: DefaultTreeToggles.Mode,
                icon: Codicon.listFilter,
                title: localize('filter', "Filter"),
                isChecked: defaultFindMode === TreeFindMode.Filter,
            }, {
                id: DefaultTreeToggles.MatchType,
                icon: Codicon.searchFuzzy,
                title: localize('fuzzySearch', "Fuzzy Match"),
                isChecked: defaultFindMatchType === TreeFindMatchType.Fuzzy,
            }];
        filter.findMatchType = defaultFindMatchType;
        filter.findMode = defaultFindMode;
        super(tree, filter, contextViewProvider, { ...options, toggles: toggleContributions });
        this.filter = filter;
        this._onDidChangeMode = new Emitter();
        this.onDidChangeMode = this._onDidChangeMode.event;
        this._onDidChangeMatchType = new Emitter();
        this.onDidChangeMatchType = this._onDidChangeMatchType.event;
        this.disposables.add(this.tree.onDidChangeModel(() => {
            if (!this.isOpened()) {
                return;
            }
            if (this.pattern.length !== 0) {
                this.tree.refilter();
            }
            this.render();
        }));
        this.disposables.add(this.tree.onWillRefilter(() => this.filter.reset()));
    }
    updateOptions(optionsUpdate = {}) {
        if (optionsUpdate.defaultFindMode !== undefined) {
            this.mode = optionsUpdate.defaultFindMode;
        }
        if (optionsUpdate.defaultFindMatchType !== undefined) {
            this.matchType = optionsUpdate.defaultFindMatchType;
        }
    }
    applyPattern(pattern) {
        this.tree.refilter();
        if (pattern) {
            this.tree.focusNext(0, true, undefined, (node) => !FuzzyScore.isDefault(node.filterData));
        }
        const focus = this.tree.getFocus();
        if (focus.length > 0) {
            const element = focus[0];
            if (this.tree.getRelativeTop(element) === null) {
                this.tree.reveal(element, 0.5);
            }
        }
        this.render();
    }
    shouldAllowFocus(node) {
        if (!this.isOpened() || !this.pattern) {
            return true;
        }
        if (this.filter.totalCount > 0 && this.filter.matchCount <= 1) {
            return true;
        }
        return !FuzzyScore.isDefault(node.filterData);
    }
    onDidToggleChange(e) {
        if (e.id === DefaultTreeToggles.Mode) {
            this.mode = e.isChecked ? TreeFindMode.Filter : TreeFindMode.Highlight;
        }
        else if (e.id === DefaultTreeToggles.MatchType) {
            this.matchType = e.isChecked ? TreeFindMatchType.Fuzzy : TreeFindMatchType.Contiguous;
        }
    }
    render() {
        const noMatches = this.filter.matchCount === 0 && this.filter.totalCount > 0;
        const showNotFound = noMatches && this.pattern.length > 0;
        this.renderMessage(showNotFound);
        if (this.pattern.length) {
            this.alertResults(this.filter.matchCount);
        }
    }
}
function stickyScrollNodeStateEquals(node1, node2) {
    return node1.position === node2.position && stickyScrollNodeEquals(node1, node2);
}
function stickyScrollNodeEquals(node1, node2) {
    return node1.node.element === node2.node.element &&
        node1.startIndex === node2.startIndex &&
        node1.height === node2.height &&
        node1.endIndex === node2.endIndex;
}
class StickyScrollState {
    constructor(stickyNodes = []) {
        this.stickyNodes = stickyNodes;
    }
    get count() { return this.stickyNodes.length; }
    equal(state) {
        return equals(this.stickyNodes, state.stickyNodes, stickyScrollNodeStateEquals);
    }
    contains(element) {
        return this.stickyNodes.some(node => node.node.element === element.element);
    }
    lastNodePartiallyVisible() {
        if (this.count === 0) {
            return false;
        }
        const lastStickyNode = this.stickyNodes[this.count - 1];
        if (this.count === 1) {
            return lastStickyNode.position !== 0;
        }
        const secondLastStickyNode = this.stickyNodes[this.count - 2];
        return secondLastStickyNode.position + secondLastStickyNode.height !== lastStickyNode.position;
    }
    animationStateChanged(previousState) {
        if (!equals(this.stickyNodes, previousState.stickyNodes, stickyScrollNodeEquals)) {
            return false;
        }
        if (this.count === 0) {
            return false;
        }
        const lastStickyNode = this.stickyNodes[this.count - 1];
        const previousLastStickyNode = previousState.stickyNodes[previousState.count - 1];
        return lastStickyNode.position !== previousLastStickyNode.position;
    }
}
class DefaultStickyScrollDelegate {
    constrainStickyScrollNodes(stickyNodes, stickyScrollMaxItemCount, maxWidgetHeight) {
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const stickyNodeBottom = stickyNode.position + stickyNode.height;
            if (stickyNodeBottom > maxWidgetHeight || i >= stickyScrollMaxItemCount) {
                return stickyNodes.slice(0, i);
            }
        }
        return stickyNodes;
    }
}
class StickyScrollController extends Disposable {
    constructor(tree, model, view, renderers, treeDelegate, options = {}) {
        super();
        this.tree = tree;
        this.model = model;
        this.view = view;
        this.treeDelegate = treeDelegate;
        this.maxWidgetViewRatio = 0.4;
        const stickyScrollOptions = this.validateStickySettings(options);
        this.stickyScrollMaxItemCount = stickyScrollOptions.stickyScrollMaxItemCount;
        this.stickyScrollDelegate = options.stickyScrollDelegate ?? new DefaultStickyScrollDelegate();
        this.paddingTop = options.paddingTop ?? 0;
        this._widget = this._register(new StickyScrollWidget(view.getScrollableElement(), view, tree, renderers, treeDelegate, options.accessibilityProvider));
        this.onDidChangeHasFocus = this._widget.onDidChangeHasFocus;
        this.onContextMenu = this._widget.onContextMenu;
        this._register(view.onDidScroll(() => this.update()));
        this._register(view.onDidChangeContentHeight(() => this.update()));
        this._register(tree.onDidChangeCollapseState(() => this.update()));
        this._register(model.onDidSpliceRenderedNodes((e) => {
            const state = this._widget.state;
            if (!state) {
                return;
            }
            // If a sticky node is removed, recompute the state
            const hasRemovedStickyNode = e.deleteCount > 0 && state.stickyNodes.some(stickyNode => !this.model.has(this.model.getNodeLocation(stickyNode.node)));
            if (hasRemovedStickyNode) {
                this.update();
                return;
            }
            // If a sticky node is updated, rerender the widget
            const shouldRerenderStickyNodes = state.stickyNodes.some(stickyNode => {
                const listIndex = this.model.getListIndex(this.model.getNodeLocation(stickyNode.node));
                return listIndex >= e.start && listIndex < e.start + e.deleteCount && state.contains(stickyNode.node);
            });
            if (shouldRerenderStickyNodes) {
                this._widget.rerender();
            }
        }));
        this.update();
    }
    get height() {
        return this._widget.height;
    }
    get count() {
        return this._widget.count;
    }
    getNode(node) {
        return this._widget.getNode(node);
    }
    getNodeAtHeight(height) {
        let index;
        if (height === 0) {
            index = this.view.firstVisibleIndex;
        }
        else {
            index = this.view.indexAt(height + this.view.scrollTop);
        }
        if (index < 0 || index >= this.view.length) {
            return undefined;
        }
        return this.view.element(index);
    }
    update() {
        const firstVisibleNode = this.getNodeAtHeight(this.paddingTop);
        // Don't render anything if there are no elements
        if (!firstVisibleNode || this.tree.scrollTop <= this.paddingTop) {
            this._widget.setState(undefined);
            return;
        }
        const stickyState = this.findStickyState(firstVisibleNode);
        this._widget.setState(stickyState);
    }
    findStickyState(firstVisibleNode) {
        const stickyNodes = [];
        let firstVisibleNodeUnderWidget = firstVisibleNode;
        let stickyNodesHeight = 0;
        let nextStickyNode = this.getNextStickyNode(firstVisibleNodeUnderWidget, undefined, stickyNodesHeight);
        while (nextStickyNode) {
            stickyNodes.push(nextStickyNode);
            stickyNodesHeight += nextStickyNode.height;
            if (stickyNodes.length <= this.stickyScrollMaxItemCount) {
                firstVisibleNodeUnderWidget = this.getNextVisibleNode(nextStickyNode);
                if (!firstVisibleNodeUnderWidget) {
                    break;
                }
            }
            nextStickyNode = this.getNextStickyNode(firstVisibleNodeUnderWidget, nextStickyNode.node, stickyNodesHeight);
        }
        const contrainedStickyNodes = this.constrainStickyNodes(stickyNodes);
        return contrainedStickyNodes.length ? new StickyScrollState(contrainedStickyNodes) : undefined;
    }
    getNextVisibleNode(previousStickyNode) {
        return this.getNodeAtHeight(previousStickyNode.position + previousStickyNode.height);
    }
    getNextStickyNode(firstVisibleNodeUnderWidget, previousStickyNode, stickyNodesHeight) {
        const nextStickyNode = this.getAncestorUnderPrevious(firstVisibleNodeUnderWidget, previousStickyNode);
        if (!nextStickyNode) {
            return undefined;
        }
        if (nextStickyNode === firstVisibleNodeUnderWidget) {
            if (!this.nodeIsUncollapsedParent(firstVisibleNodeUnderWidget)) {
                return undefined;
            }
            if (this.nodeTopAlignsWithStickyNodesBottom(firstVisibleNodeUnderWidget, stickyNodesHeight)) {
                return undefined;
            }
        }
        return this.createStickyScrollNode(nextStickyNode, stickyNodesHeight);
    }
    nodeTopAlignsWithStickyNodesBottom(node, stickyNodesHeight) {
        const nodeIndex = this.getNodeIndex(node);
        const elementTop = this.view.getElementTop(nodeIndex);
        const stickyPosition = stickyNodesHeight;
        return this.view.scrollTop === elementTop - stickyPosition;
    }
    createStickyScrollNode(node, currentStickyNodesHeight) {
        const height = this.treeDelegate.getHeight(node);
        const { startIndex, endIndex } = this.getNodeRange(node);
        const position = this.calculateStickyNodePosition(endIndex, currentStickyNodesHeight, height);
        return { node, position, height, startIndex, endIndex };
    }
    getAncestorUnderPrevious(node, previousAncestor = undefined) {
        let currentAncestor = node;
        let parentOfcurrentAncestor = this.getParentNode(currentAncestor);
        while (parentOfcurrentAncestor) {
            if (parentOfcurrentAncestor === previousAncestor) {
                return currentAncestor;
            }
            currentAncestor = parentOfcurrentAncestor;
            parentOfcurrentAncestor = this.getParentNode(currentAncestor);
        }
        if (previousAncestor === undefined) {
            return currentAncestor;
        }
        return undefined;
    }
    calculateStickyNodePosition(lastDescendantIndex, stickyRowPositionTop, stickyNodeHeight) {
        let lastChildRelativeTop = this.view.getRelativeTop(lastDescendantIndex);
        // If the last descendant is only partially visible at the top of the view, getRelativeTop() returns null
        // In that case, utilize the next node's relative top to calculate the sticky node's position
        if (lastChildRelativeTop === null && this.view.firstVisibleIndex === lastDescendantIndex && lastDescendantIndex + 1 < this.view.length) {
            const nodeHeight = this.treeDelegate.getHeight(this.view.element(lastDescendantIndex));
            const nextNodeRelativeTop = this.view.getRelativeTop(lastDescendantIndex + 1);
            lastChildRelativeTop = nextNodeRelativeTop ? nextNodeRelativeTop - nodeHeight / this.view.renderHeight : null;
        }
        if (lastChildRelativeTop === null) {
            return stickyRowPositionTop;
        }
        const lastChildNode = this.view.element(lastDescendantIndex);
        const lastChildHeight = this.treeDelegate.getHeight(lastChildNode);
        const topOfLastChild = lastChildRelativeTop * this.view.renderHeight;
        const bottomOfLastChild = topOfLastChild + lastChildHeight;
        if (stickyRowPositionTop + stickyNodeHeight > bottomOfLastChild && stickyRowPositionTop <= bottomOfLastChild) {
            return bottomOfLastChild - stickyNodeHeight;
        }
        return stickyRowPositionTop;
    }
    constrainStickyNodes(stickyNodes) {
        if (stickyNodes.length === 0) {
            return [];
        }
        // Check if sticky nodes need to be constrained
        const maximumStickyWidgetHeight = this.view.renderHeight * this.maxWidgetViewRatio;
        const lastStickyNode = stickyNodes[stickyNodes.length - 1];
        if (stickyNodes.length <= this.stickyScrollMaxItemCount && lastStickyNode.position + lastStickyNode.height <= maximumStickyWidgetHeight) {
            return stickyNodes;
        }
        // constrain sticky nodes
        const constrainedStickyNodes = this.stickyScrollDelegate.constrainStickyScrollNodes(stickyNodes, this.stickyScrollMaxItemCount, maximumStickyWidgetHeight);
        if (!constrainedStickyNodes.length) {
            return [];
        }
        // Validate constraints
        const lastConstrainedStickyNode = constrainedStickyNodes[constrainedStickyNodes.length - 1];
        if (constrainedStickyNodes.length > this.stickyScrollMaxItemCount || lastConstrainedStickyNode.position + lastConstrainedStickyNode.height > maximumStickyWidgetHeight) {
            throw new Error('stickyScrollDelegate violates constraints');
        }
        return constrainedStickyNodes;
    }
    getParentNode(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const parentLocation = this.model.getParentNodeLocation(nodeLocation);
        return parentLocation ? this.model.getNode(parentLocation) : undefined;
    }
    nodeIsUncollapsedParent(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        return this.model.getListRenderCount(nodeLocation) > 1;
    }
    getNodeIndex(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const nodeIndex = this.model.getListIndex(nodeLocation);
        return nodeIndex;
    }
    getNodeRange(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const startIndex = this.model.getListIndex(nodeLocation);
        if (startIndex < 0) {
            throw new Error('Node not found in tree');
        }
        const renderCount = this.model.getListRenderCount(nodeLocation);
        const endIndex = startIndex + renderCount - 1;
        return { startIndex, endIndex };
    }
    nodePositionTopBelowWidget(node) {
        const ancestors = [];
        let currentAncestor = this.getParentNode(node);
        while (currentAncestor) {
            ancestors.push(currentAncestor);
            currentAncestor = this.getParentNode(currentAncestor);
        }
        let widgetHeight = 0;
        for (let i = 0; i < ancestors.length && i < this.stickyScrollMaxItemCount; i++) {
            widgetHeight += this.treeDelegate.getHeight(ancestors[i]);
        }
        return widgetHeight;
    }
    getFocus() {
        return this._widget.getFocus();
    }
    domFocus() {
        this._widget.domFocus();
    }
    // Whether sticky scroll was the last focused part in the tree or not
    focusedLast() {
        return this._widget.focusedLast();
    }
    updateOptions(optionsUpdate = {}) {
        if (optionsUpdate.paddingTop !== undefined) {
            this.paddingTop = optionsUpdate.paddingTop;
        }
        if (optionsUpdate.stickyScrollMaxItemCount !== undefined) {
            const validatedOptions = this.validateStickySettings(optionsUpdate);
            if (this.stickyScrollMaxItemCount !== validatedOptions.stickyScrollMaxItemCount) {
                this.stickyScrollMaxItemCount = validatedOptions.stickyScrollMaxItemCount;
                this.update();
            }
        }
    }
    validateStickySettings(options) {
        let stickyScrollMaxItemCount = 7;
        if (typeof options.stickyScrollMaxItemCount === 'number') {
            stickyScrollMaxItemCount = Math.max(options.stickyScrollMaxItemCount, 1);
        }
        return { stickyScrollMaxItemCount };
    }
}
class StickyScrollWidget {
    get state() { return this._previousState; }
    constructor(container, view, tree, treeRenderers, treeDelegate, accessibilityProvider) {
        this.view = view;
        this.tree = tree;
        this.treeRenderers = treeRenderers;
        this.treeDelegate = treeDelegate;
        this.accessibilityProvider = accessibilityProvider;
        this._previousElements = [];
        this._previousStateDisposables = new DisposableStore();
        this._rootDomNode = $('.monaco-tree-sticky-container.empty');
        container.appendChild(this._rootDomNode);
        const shadow = $('.monaco-tree-sticky-container-shadow');
        this._rootDomNode.appendChild(shadow);
        this.stickyScrollFocus = new StickyScrollFocus(this._rootDomNode, view);
        this.onDidChangeHasFocus = this.stickyScrollFocus.onDidChangeHasFocus;
        this.onContextMenu = this.stickyScrollFocus.onContextMenu;
    }
    get height() {
        if (!this._previousState) {
            return 0;
        }
        const lastElement = this._previousState.stickyNodes[this._previousState.count - 1];
        return lastElement.position + lastElement.height;
    }
    get count() {
        return this._previousState?.count ?? 0;
    }
    getNode(node) {
        return this._previousState?.stickyNodes.find(stickyNode => stickyNode.node === node);
    }
    setState(state) {
        const wasVisible = !!this._previousState && this._previousState.count > 0;
        const isVisible = !!state && state.count > 0;
        // If state has not changed, do nothing
        if ((!wasVisible && !isVisible) || (wasVisible && isVisible && this._previousState.equal(state))) {
            return;
        }
        // Update visibility of the widget if changed
        if (wasVisible !== isVisible) {
            this.setVisible(isVisible);
        }
        if (!isVisible) {
            this._previousState = undefined;
            this._previousElements = [];
            this._previousStateDisposables.clear();
            return;
        }
        const lastStickyNode = state.stickyNodes[state.count - 1];
        // If the new state is only a change in the last node's position, update the position of the last element
        if (this._previousState && state.animationStateChanged(this._previousState)) {
            this._previousElements[this._previousState.count - 1].style.top = `${lastStickyNode.position}px`;
        }
        // create new dom elements
        else {
            this.renderState(state);
        }
        this._previousState = state;
        // Set the height of the widget to the bottom of the last sticky node
        this._rootDomNode.style.height = `${lastStickyNode.position + lastStickyNode.height}px`;
    }
    renderState(state) {
        this._previousStateDisposables.clear();
        const elements = Array(state.count);
        for (let stickyIndex = state.count - 1; stickyIndex >= 0; stickyIndex--) {
            const stickyNode = state.stickyNodes[stickyIndex];
            const { element, disposable } = this.createElement(stickyNode, stickyIndex, state.count);
            elements[stickyIndex] = element;
            this._rootDomNode.appendChild(element);
            this._previousStateDisposables.add(disposable);
        }
        this.stickyScrollFocus.updateElements(elements, state);
        this._previousElements = elements;
    }
    rerender() {
        if (this._previousState) {
            this.renderState(this._previousState);
        }
    }
    createElement(stickyNode, stickyIndex, stickyNodesTotal) {
        const nodeIndex = stickyNode.startIndex;
        // Sticky element container
        const stickyElement = document.createElement('div');
        stickyElement.style.top = `${stickyNode.position}px`;
        if (this.tree.options.setRowHeight !== false) {
            stickyElement.style.height = `${stickyNode.height}px`;
        }
        if (this.tree.options.setRowLineHeight !== false) {
            stickyElement.style.lineHeight = `${stickyNode.height}px`;
        }
        stickyElement.classList.add('monaco-tree-sticky-row');
        stickyElement.classList.add('monaco-list-row');
        stickyElement.setAttribute('data-index', `${nodeIndex}`);
        stickyElement.setAttribute('data-parity', nodeIndex % 2 === 0 ? 'even' : 'odd');
        stickyElement.setAttribute('id', this.view.getElementID(nodeIndex));
        const accessibilityDisposable = this.setAccessibilityAttributes(stickyElement, stickyNode.node.element, stickyIndex, stickyNodesTotal);
        // Get the renderer for the node
        const nodeTemplateId = this.treeDelegate.getTemplateId(stickyNode.node);
        const renderer = this.treeRenderers.find((renderer) => renderer.templateId === nodeTemplateId);
        if (!renderer) {
            throw new Error(`No renderer found for template id ${nodeTemplateId}`);
        }
        // To make sure we do not influence the original node, we create a copy of the node
        // We need to check if it is already a unique instance of the node by the delegate
        let nodeCopy = stickyNode.node;
        if (nodeCopy === this.tree.getNode(this.tree.getNodeLocation(stickyNode.node))) {
            nodeCopy = new Proxy(stickyNode.node, {});
        }
        // Render the element
        const templateData = renderer.renderTemplate(stickyElement);
        renderer.renderElement(nodeCopy, stickyNode.startIndex, templateData, stickyNode.height);
        // Remove the element from the DOM when state is disposed
        const disposable = toDisposable(() => {
            accessibilityDisposable.dispose();
            renderer.disposeElement(nodeCopy, stickyNode.startIndex, templateData, stickyNode.height);
            renderer.disposeTemplate(templateData);
            stickyElement.remove();
        });
        return { element: stickyElement, disposable };
    }
    setAccessibilityAttributes(container, element, stickyIndex, stickyNodesTotal) {
        if (!this.accessibilityProvider) {
            return Disposable.None;
        }
        if (this.accessibilityProvider.getSetSize) {
            container.setAttribute('aria-setsize', String(this.accessibilityProvider.getSetSize(element, stickyIndex, stickyNodesTotal)));
        }
        if (this.accessibilityProvider.getPosInSet) {
            container.setAttribute('aria-posinset', String(this.accessibilityProvider.getPosInSet(element, stickyIndex)));
        }
        if (this.accessibilityProvider.getRole) {
            container.setAttribute('role', this.accessibilityProvider.getRole(element) ?? 'treeitem');
        }
        const ariaLabel = this.accessibilityProvider.getAriaLabel(element);
        const observable = (ariaLabel && typeof ariaLabel !== 'string') ? ariaLabel : constObservable(ariaLabel);
        const result = autorun(reader => {
            const value = reader.readObservable(observable);
            if (value) {
                container.setAttribute('aria-label', value);
            }
            else {
                container.removeAttribute('aria-label');
            }
        });
        if (typeof ariaLabel === 'string') {
        }
        else if (ariaLabel) {
            container.setAttribute('aria-label', ariaLabel.get());
        }
        const ariaLevel = this.accessibilityProvider.getAriaLevel && this.accessibilityProvider.getAriaLevel(element);
        if (typeof ariaLevel === 'number') {
            container.setAttribute('aria-level', `${ariaLevel}`);
        }
        // Sticky Scroll elements can not be selected
        container.setAttribute('aria-selected', String(false));
        return result;
    }
    setVisible(visible) {
        this._rootDomNode.classList.toggle('empty', !visible);
        if (!visible) {
            this.stickyScrollFocus.updateElements([], undefined);
        }
    }
    getFocus() {
        return this.stickyScrollFocus.getFocus();
    }
    domFocus() {
        this.stickyScrollFocus.domFocus();
    }
    focusedLast() {
        return this.stickyScrollFocus.focusedLast();
    }
    dispose() {
        this.stickyScrollFocus.dispose();
        this._previousStateDisposables.dispose();
        this._rootDomNode.remove();
    }
}
class StickyScrollFocus extends Disposable {
    get domHasFocus() { return this._domHasFocus; }
    set domHasFocus(hasFocus) {
        if (hasFocus !== this._domHasFocus) {
            this._onDidChangeHasFocus.fire(hasFocus);
            this._domHasFocus = hasFocus;
        }
    }
    constructor(container, view) {
        super();
        this.container = container;
        this.view = view;
        this.focusedIndex = -1;
        this.elements = [];
        this._onDidChangeHasFocus = new Emitter();
        this.onDidChangeHasFocus = this._onDidChangeHasFocus.event;
        this._onContextMenu = new Emitter();
        this.onContextMenu = this._onContextMenu.event;
        this._domHasFocus = false;
        this._register(addDisposableListener(this.container, 'focus', () => this.onFocus()));
        this._register(addDisposableListener(this.container, 'blur', () => this.onBlur()));
        this._register(this.view.onDidFocus(() => this.toggleStickyScrollFocused(false)));
        this._register(this.view.onKeyDown((e) => this.onKeyDown(e)));
        this._register(this.view.onMouseDown((e) => this.onMouseDown(e)));
        this._register(this.view.onContextMenu((e) => this.handleContextMenu(e)));
    }
    handleContextMenu(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            if (this.focusedLast()) {
                this.view.domFocus();
            }
            return;
        }
        // The list handles the context menu triggered by a mouse event
        // In that case only set the focus of the element clicked and leave the rest to the list to handle
        if (!isKeyboardEvent(e.browserEvent)) {
            if (!this.state) {
                throw new Error('Context menu should not be triggered when state is undefined');
            }
            const stickyIndex = this.state.stickyNodes.findIndex(stickyNode => stickyNode.node.element === e.element?.element);
            if (stickyIndex === -1) {
                throw new Error('Context menu should not be triggered when element is not in sticky scroll widget');
            }
            this.container.focus();
            this.setFocus(stickyIndex);
            return;
        }
        if (!this.state || this.focusedIndex < 0) {
            throw new Error('Context menu key should not be triggered when focus is not in sticky scroll widget');
        }
        const stickyNode = this.state.stickyNodes[this.focusedIndex];
        const element = stickyNode.node.element;
        const anchor = this.elements[this.focusedIndex];
        this._onContextMenu.fire({ element, anchor, browserEvent: e.browserEvent, isStickyScroll: true });
    }
    onKeyDown(e) {
        // Sticky Scroll Navigation
        if (this.domHasFocus && this.state) {
            // Move up
            if (e.key === 'ArrowUp') {
                this.setFocusedElement(Math.max(0, this.focusedIndex - 1));
                e.preventDefault();
                e.stopPropagation();
            }
            // Move down, if last sticky node is focused, move focus into first child of last sticky node
            else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                if (this.focusedIndex >= this.state.count - 1) {
                    const nodeIndexToFocus = this.state.stickyNodes[this.state.count - 1].startIndex + 1;
                    this.view.domFocus();
                    this.view.setFocus([nodeIndexToFocus]);
                    this.scrollNodeUnderWidget(nodeIndexToFocus, this.state);
                }
                else {
                    this.setFocusedElement(this.focusedIndex + 1);
                }
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    onMouseDown(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            return;
        }
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
    }
    updateElements(elements, state) {
        if (state && state.count === 0) {
            throw new Error('Sticky scroll state must be undefined when there are no sticky nodes');
        }
        if (state && state.count !== elements.length) {
            throw new Error('Sticky scroll focus received illigel state');
        }
        const previousIndex = this.focusedIndex;
        this.removeFocus();
        this.elements = elements;
        this.state = state;
        if (state) {
            const newFocusedIndex = clamp(previousIndex, 0, state.count - 1);
            this.setFocus(newFocusedIndex);
        }
        else {
            if (this.domHasFocus) {
                this.view.domFocus();
            }
        }
        // must come last as it calls blur()
        this.container.tabIndex = state ? 0 : -1;
    }
    setFocusedElement(stickyIndex) {
        // doesn't imply that the widget has (or will have) focus
        const state = this.state;
        if (!state) {
            throw new Error('Cannot set focus when state is undefined');
        }
        this.setFocus(stickyIndex);
        if (stickyIndex < state.count - 1) {
            return;
        }
        // If the last sticky node is not fully visible, scroll it into view
        if (state.lastNodePartiallyVisible()) {
            const lastStickyNode = state.stickyNodes[stickyIndex];
            this.scrollNodeUnderWidget(lastStickyNode.endIndex + 1, state);
        }
    }
    scrollNodeUnderWidget(nodeIndex, state) {
        const lastStickyNode = state.stickyNodes[state.count - 1];
        const secondLastStickyNode = state.count > 1 ? state.stickyNodes[state.count - 2] : undefined;
        const elementScrollTop = this.view.getElementTop(nodeIndex);
        const elementTargetViewTop = secondLastStickyNode ? secondLastStickyNode.position + secondLastStickyNode.height + lastStickyNode.height : lastStickyNode.height;
        this.view.scrollTop = elementScrollTop - elementTargetViewTop;
    }
    getFocus() {
        if (!this.state || this.focusedIndex === -1) {
            return undefined;
        }
        return this.state.stickyNodes[this.focusedIndex].node.element;
    }
    domFocus() {
        if (!this.state) {
            throw new Error('Cannot focus when state is undefined');
        }
        this.container.focus();
    }
    focusedLast() {
        if (!this.state) {
            return false;
        }
        return this.view.getHTMLElement().classList.contains('sticky-scroll-focused');
    }
    removeFocus() {
        if (this.focusedIndex === -1) {
            return;
        }
        this.toggleElementFocus(this.elements[this.focusedIndex], false);
        this.focusedIndex = -1;
    }
    setFocus(newFocusIndex) {
        if (0 > newFocusIndex) {
            throw new Error('addFocus() can not remove focus');
        }
        if (!this.state && newFocusIndex >= 0) {
            throw new Error('Cannot set focus index when state is undefined');
        }
        if (this.state && newFocusIndex >= this.state.count) {
            throw new Error('Cannot set focus index to an index that does not exist');
        }
        const oldIndex = this.focusedIndex;
        if (oldIndex >= 0) {
            this.toggleElementFocus(this.elements[oldIndex], false);
        }
        if (newFocusIndex >= 0) {
            this.toggleElementFocus(this.elements[newFocusIndex], true);
        }
        this.focusedIndex = newFocusIndex;
    }
    toggleElementFocus(element, focused) {
        this.toggleElementActiveFocus(element, focused && this.domHasFocus);
        this.toggleElementPassiveFocus(element, focused);
    }
    toggleCurrentElementActiveFocus(focused) {
        if (this.focusedIndex === -1) {
            return;
        }
        this.toggleElementActiveFocus(this.elements[this.focusedIndex], focused);
    }
    toggleElementActiveFocus(element, focused) {
        // active focus is set when sticky scroll has focus
        element.classList.toggle('focused', focused);
    }
    toggleElementPassiveFocus(element, focused) {
        // passive focus allows to show focus when sticky scroll does not have focus
        // for example when the context menu has focus
        element.classList.toggle('passive-focused', focused);
    }
    toggleStickyScrollFocused(focused) {
        // Weather the last focus in the view was sticky scroll and not the list
        // Is only removed when the focus is back in the tree an no longer in sticky scroll
        this.view.getHTMLElement().classList.toggle('sticky-scroll-focused', focused);
    }
    onFocus() {
        if (!this.state || this.elements.length === 0) {
            throw new Error('Cannot focus when state is undefined or elements are empty');
        }
        this.domHasFocus = true;
        this.toggleStickyScrollFocused(true);
        this.toggleCurrentElementActiveFocus(true);
        if (this.focusedIndex === -1) {
            this.setFocus(0);
        }
    }
    onBlur() {
        this.domHasFocus = false;
        this.toggleCurrentElementActiveFocus(false);
    }
    dispose() {
        this.toggleStickyScrollFocused(false);
        this._onDidChangeHasFocus.fire(false);
        super.dispose();
    }
}
function asTreeMouseEvent(event) {
    let target = TreeMouseEventTarget.Unknown;
    if (hasParentWithClass(event.browserEvent.target, 'monaco-tl-twistie', 'monaco-tl-row')) {
        target = TreeMouseEventTarget.Twistie;
    }
    else if (hasParentWithClass(event.browserEvent.target, 'monaco-tl-contents', 'monaco-tl-row')) {
        target = TreeMouseEventTarget.Element;
    }
    else if (hasParentWithClass(event.browserEvent.target, 'monaco-tree-type-filter', 'monaco-list')) {
        target = TreeMouseEventTarget.Filter;
    }
    return {
        browserEvent: event.browserEvent,
        element: event.element ? event.element.element : null,
        target
    };
}
function asTreeContextMenuEvent(event) {
    const isStickyScroll = isStickyScrollContainer(event.browserEvent.target);
    return {
        element: event.element ? event.element.element : null,
        browserEvent: event.browserEvent,
        anchor: event.anchor,
        isStickyScroll
    };
}
function dfs(node, fn) {
    fn(node);
    node.children.forEach(child => dfs(child, fn));
}
/**
 * The trait concept needs to exist at the tree level, because collapsed
 * tree nodes will not be known by the list.
 */
class Trait {
    get nodeSet() {
        if (!this._nodeSet) {
            this._nodeSet = this.createNodeSet();
        }
        return this._nodeSet;
    }
    constructor(getFirstViewElementWithTrait, identityProvider) {
        this.getFirstViewElementWithTrait = getFirstViewElementWithTrait;
        this.identityProvider = identityProvider;
        this.nodes = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    set(nodes, browserEvent) {
        if (!browserEvent?.__forceEvent && equals(this.nodes, nodes)) {
            return;
        }
        this._set(nodes, false, browserEvent);
    }
    _set(nodes, silent, browserEvent) {
        this.nodes = [...nodes];
        this.elements = undefined;
        this._nodeSet = undefined;
        if (!silent) {
            const that = this;
            this._onDidChange.fire({ get elements() { return that.get(); }, browserEvent });
        }
    }
    get() {
        if (!this.elements) {
            this.elements = this.nodes.map(node => node.element);
        }
        return [...this.elements];
    }
    getNodes() {
        return this.nodes;
    }
    has(node) {
        return this.nodeSet.has(node);
    }
    onDidModelSplice({ insertedNodes, deletedNodes }) {
        if (!this.identityProvider) {
            const set = this.createNodeSet();
            const visit = (node) => set.delete(node);
            deletedNodes.forEach(node => dfs(node, visit));
            this.set([...set.values()]);
            return;
        }
        const deletedNodesIdSet = new Set();
        const deletedNodesVisitor = (node) => deletedNodesIdSet.add(this.identityProvider.getId(node.element).toString());
        deletedNodes.forEach(node => dfs(node, deletedNodesVisitor));
        const insertedNodesMap = new Map();
        const insertedNodesVisitor = (node) => insertedNodesMap.set(this.identityProvider.getId(node.element).toString(), node);
        insertedNodes.forEach(node => dfs(node, insertedNodesVisitor));
        const nodes = [];
        for (const node of this.nodes) {
            const id = this.identityProvider.getId(node.element).toString();
            const wasDeleted = deletedNodesIdSet.has(id);
            if (!wasDeleted) {
                nodes.push(node);
            }
            else {
                const insertedNode = insertedNodesMap.get(id);
                if (insertedNode && insertedNode.visible) {
                    nodes.push(insertedNode);
                }
            }
        }
        if (this.nodes.length > 0 && nodes.length === 0) {
            const node = this.getFirstViewElementWithTrait();
            if (node) {
                nodes.push(node);
            }
        }
        this._set(nodes, true);
    }
    createNodeSet() {
        const set = new Set();
        for (const node of this.nodes) {
            set.add(node);
        }
        return set;
    }
}
class TreeNodeListMouseController extends MouseController {
    constructor(list, tree, stickyScrollProvider) {
        super(list);
        this.tree = tree;
        this.stickyScrollProvider = stickyScrollProvider;
    }
    onViewPointer(e) {
        if (isButton(e.browserEvent.target) ||
            isEditableElement(e.browserEvent.target) ||
            isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        const node = e.element;
        if (!node) {
            return super.onViewPointer(e);
        }
        if (this.isSelectionRangeChangeEvent(e) || this.isSelectionSingleChangeEvent(e)) {
            return super.onViewPointer(e);
        }
        const target = e.browserEvent.target;
        const onTwistie = target.classList.contains('monaco-tl-twistie')
            || (target.classList.contains('monaco-icon-label') && target.classList.contains('folder-icon') && e.browserEvent.offsetX < 16);
        const isStickyElement = isStickyScrollElement(e.browserEvent.target);
        let expandOnlyOnTwistieClick = false;
        if (isStickyElement) {
            expandOnlyOnTwistieClick = true;
        }
        else if (typeof this.tree.expandOnlyOnTwistieClick === 'function') {
            expandOnlyOnTwistieClick = this.tree.expandOnlyOnTwistieClick(node.element);
        }
        else {
            expandOnlyOnTwistieClick = !!this.tree.expandOnlyOnTwistieClick;
        }
        if (!isStickyElement) {
            if (expandOnlyOnTwistieClick && !onTwistie && e.browserEvent.detail !== 2) {
                return super.onViewPointer(e);
            }
            if (!this.tree.expandOnDoubleClick && e.browserEvent.detail === 2) {
                return super.onViewPointer(e);
            }
        }
        else {
            this.handleStickyScrollMouseEvent(e, node);
        }
        if (node.collapsible && (!isStickyElement || onTwistie)) {
            const location = this.tree.getNodeLocation(node);
            const recursive = e.browserEvent.altKey;
            this.tree.setFocus([location]);
            this.tree.toggleCollapsed(location, recursive);
            if (onTwistie) {
                // Do not set this before calling a handler on the super class, because it will reject it as handled
                e.browserEvent.isHandledByList = true;
                return;
            }
        }
        if (!isStickyElement) {
            super.onViewPointer(e);
        }
    }
    handleStickyScrollMouseEvent(e, node) {
        if (isMonacoCustomToggle(e.browserEvent.target) || isActionItem(e.browserEvent.target)) {
            return;
        }
        const stickyScrollController = this.stickyScrollProvider();
        if (!stickyScrollController) {
            throw new Error('Sticky scroll controller not found');
        }
        const nodeIndex = this.list.indexOf(node);
        const elementScrollTop = this.list.getElementTop(nodeIndex);
        const elementTargetViewTop = stickyScrollController.nodePositionTopBelowWidget(node);
        this.tree.scrollTop = elementScrollTop - elementTargetViewTop;
        this.list.domFocus();
        this.list.setFocus([nodeIndex]);
        this.list.setSelection([nodeIndex]);
    }
    onDoubleClick(e) {
        const onTwistie = e.browserEvent.target.classList.contains('monaco-tl-twistie');
        if (onTwistie || !this.tree.expandOnDoubleClick) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        super.onDoubleClick(e);
    }
    // to make sure dom focus is not stolen (for example with context menu)
    onMouseDown(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            super.onMouseDown(e);
            return;
        }
    }
    onContextMenu(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            super.onContextMenu(e);
            return;
        }
    }
}
/**
 * We use this List subclass to restore selection and focus as nodes
 * get rendered in the list, possibly due to a node expand() call.
 */
class TreeNodeList extends List {
    constructor(user, container, virtualDelegate, renderers, focusTrait, selectionTrait, anchorTrait, options) {
        super(user, container, virtualDelegate, renderers, options);
        this.focusTrait = focusTrait;
        this.selectionTrait = selectionTrait;
        this.anchorTrait = anchorTrait;
    }
    createMouseController(options) {
        return new TreeNodeListMouseController(this, options.tree, options.stickyScrollProvider);
    }
    splice(start, deleteCount, elements = []) {
        super.splice(start, deleteCount, elements);
        if (elements.length === 0) {
            return;
        }
        const additionalFocus = [];
        const additionalSelection = [];
        let anchor;
        elements.forEach((node, index) => {
            if (this.focusTrait.has(node)) {
                additionalFocus.push(start + index);
            }
            if (this.selectionTrait.has(node)) {
                additionalSelection.push(start + index);
            }
            if (this.anchorTrait.has(node)) {
                anchor = start + index;
            }
        });
        if (additionalFocus.length > 0) {
            super.setFocus(distinct([...super.getFocus(), ...additionalFocus]));
        }
        if (additionalSelection.length > 0) {
            super.setSelection(distinct([...super.getSelection(), ...additionalSelection]));
        }
        if (typeof anchor === 'number') {
            super.setAnchor(anchor);
        }
    }
    setFocus(indexes, browserEvent, fromAPI = false) {
        super.setFocus(indexes, browserEvent);
        if (!fromAPI) {
            this.focusTrait.set(indexes.map(i => this.element(i)), browserEvent);
        }
    }
    setSelection(indexes, browserEvent, fromAPI = false) {
        super.setSelection(indexes, browserEvent);
        if (!fromAPI) {
            this.selectionTrait.set(indexes.map(i => this.element(i)), browserEvent);
        }
    }
    setAnchor(index, fromAPI = false) {
        super.setAnchor(index);
        if (!fromAPI) {
            if (typeof index === 'undefined') {
                this.anchorTrait.set([]);
            }
            else {
                this.anchorTrait.set([this.element(index)]);
            }
        }
    }
}
export var AbstractTreePart;
(function (AbstractTreePart) {
    AbstractTreePart[AbstractTreePart["Tree"] = 0] = "Tree";
    AbstractTreePart[AbstractTreePart["StickyScroll"] = 1] = "StickyScroll";
})(AbstractTreePart || (AbstractTreePart = {}));
export class AbstractTree {
    get onDidScroll() { return this.view.onDidScroll; }
    get onDidChangeFocus() { return this.eventBufferer.wrapEvent(this.focus.onDidChange); }
    get onDidChangeSelection() { return this.eventBufferer.wrapEvent(this.selection.onDidChange); }
    get onMouseClick() { return Event.map(this.view.onMouseClick, asTreeMouseEvent); }
    get onMouseDblClick() { return Event.filter(Event.map(this.view.onMouseDblClick, asTreeMouseEvent), e => e.target !== TreeMouseEventTarget.Filter); }
    get onMouseOver() { return Event.map(this.view.onMouseOver, asTreeMouseEvent); }
    get onMouseOut() { return Event.map(this.view.onMouseOut, asTreeMouseEvent); }
    get onContextMenu() { return Event.any(Event.filter(Event.map(this.view.onContextMenu, asTreeContextMenuEvent), e => !e.isStickyScroll), this.stickyScrollController?.onContextMenu ?? Event.None); }
    get onTap() { return Event.map(this.view.onTap, asTreeMouseEvent); }
    get onPointer() { return Event.map(this.view.onPointer, asTreeMouseEvent); }
    get onKeyDown() { return this.view.onKeyDown; }
    get onKeyUp() { return this.view.onKeyUp; }
    get onKeyPress() { return this.view.onKeyPress; }
    get onDidFocus() { return this.view.onDidFocus; }
    get onDidBlur() { return this.view.onDidBlur; }
    get onDidChangeModel() { return Event.any(this.onDidChangeModelRelay.event, this.onDidSwapModel.event); }
    get onDidChangeCollapseState() { return this.onDidChangeCollapseStateRelay.event; }
    get onDidChangeRenderNodeCount() { return this.onDidChangeRenderNodeCountRelay.event; }
    get findMode() { return this.findController?.mode ?? TreeFindMode.Highlight; }
    set findMode(findMode) { if (this.findController) {
        this.findController.mode = findMode;
    } }
    get findMatchType() { return this.findController?.matchType ?? TreeFindMatchType.Fuzzy; }
    set findMatchType(findFuzzy) { if (this.findController) {
        this.findController.matchType = findFuzzy;
    } }
    get onDidChangeFindPattern() { return this.findController ? this.findController.onDidChangePattern : Event.None; }
    get expandOnDoubleClick() { return typeof this._options.expandOnDoubleClick === 'undefined' ? true : this._options.expandOnDoubleClick; }
    get expandOnlyOnTwistieClick() { return typeof this._options.expandOnlyOnTwistieClick === 'undefined' ? true : this._options.expandOnlyOnTwistieClick; }
    get onDidDispose() { return this.view.onDidDispose; }
    constructor(_user, container, delegate, renderers, _options = {}) {
        this._user = _user;
        this._options = _options;
        this.eventBufferer = new EventBufferer();
        this.onDidChangeFindOpenState = Event.None;
        this.onDidChangeStickyScrollFocused = Event.None;
        this.disposables = new DisposableStore();
        this.onDidSwapModel = this.disposables.add(new Emitter());
        this.onDidChangeModelRelay = this.disposables.add(new Relay());
        this.onDidSpliceModelRelay = this.disposables.add(new Relay());
        this.onDidChangeCollapseStateRelay = this.disposables.add(new Relay());
        this.onDidChangeRenderNodeCountRelay = this.disposables.add(new Relay());
        this.onDidChangeActiveNodesRelay = this.disposables.add(new Relay());
        this._onWillRefilter = new Emitter();
        this.onWillRefilter = this._onWillRefilter.event;
        this._onDidUpdateOptions = new Emitter();
        this.onDidUpdateOptions = this._onDidUpdateOptions.event;
        this.modelDisposables = new DisposableStore();
        if (_options.keyboardNavigationLabelProvider && (_options.findWidgetEnabled ?? true)) {
            this.findFilter = new FindFilter(_options.keyboardNavigationLabelProvider, _options.filter, _options.defaultFindVisibility);
            _options = { ..._options, filter: this.findFilter }; // TODO need typescript help here
            this.disposables.add(this.findFilter);
        }
        this.model = this.createModel(_user, _options);
        this.treeDelegate = new ComposedTreeDelegate(delegate);
        const activeNodes = this.disposables.add(new EventCollection(this.onDidChangeActiveNodesRelay.event));
        const renderedIndentGuides = new SetMap();
        this.renderers = renderers.map(r => new TreeRenderer(r, this.model, this.onDidChangeCollapseStateRelay.event, activeNodes, renderedIndentGuides, _options));
        for (const r of this.renderers) {
            this.disposables.add(r);
        }
        this.focus = new Trait(() => this.view.getFocusedElements()[0], _options.identityProvider);
        this.selection = new Trait(() => this.view.getSelectedElements()[0], _options.identityProvider);
        this.anchor = new Trait(() => this.view.getAnchorElement(), _options.identityProvider);
        this.view = new TreeNodeList(_user, container, this.treeDelegate, this.renderers, this.focus, this.selection, this.anchor, { ...asListOptions(() => this.model, this.disposables, _options), tree: this, stickyScrollProvider: () => this.stickyScrollController });
        this.setupModel(this.model); // model needs to be setup after the traits have been created
        if (_options.keyboardSupport !== false) {
            const onKeyDown = Event.chain(this.view.onKeyDown, $ => $.filter(e => !isEditableElement(e.target))
                .map(e => new StandardKeyboardEvent(e)));
            Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 15 /* KeyCode.LeftArrow */))(this.onLeftArrow, this, this.disposables);
            Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 17 /* KeyCode.RightArrow */))(this.onRightArrow, this, this.disposables);
            Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 10 /* KeyCode.Space */))(this.onSpace, this, this.disposables);
        }
        if ((_options.findWidgetEnabled ?? true) && _options.keyboardNavigationLabelProvider && _options.contextViewProvider) {
            const findOptions = {
                styles: _options.findWidgetStyles,
                defaultFindMode: _options.defaultFindMode,
                defaultFindMatchType: _options.defaultFindMatchType,
                showNotFoundMessage: _options.showNotFoundMessage,
            };
            this.findController = this.disposables.add(new FindController(this, this.findFilter, _options.contextViewProvider, findOptions));
            this.focusNavigationFilter = node => this.findController.shouldAllowFocus(node);
            this.onDidChangeFindOpenState = this.findController.onDidChangeOpenState;
            this.onDidChangeFindMode = this.findController.onDidChangeMode;
            this.onDidChangeFindMatchType = this.findController.onDidChangeMatchType;
        }
        else {
            this.onDidChangeFindMode = Event.None;
            this.onDidChangeFindMatchType = Event.None;
        }
        if (_options.enableStickyScroll) {
            this.stickyScrollController = new StickyScrollController(this, this.model, this.view, this.renderers, this.treeDelegate, _options);
            this.onDidChangeStickyScrollFocused = this.stickyScrollController.onDidChangeHasFocus;
        }
        this.styleElement = createStyleSheet(this.view.getHTMLElement());
        this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
    }
    updateOptions(optionsUpdate = {}) {
        this._options = { ...this._options, ...optionsUpdate };
        for (const renderer of this.renderers) {
            renderer.updateOptions(optionsUpdate);
        }
        this.view.updateOptions(this._options);
        this.findController?.updateOptions(optionsUpdate);
        this.updateStickyScroll(optionsUpdate);
        this._onDidUpdateOptions.fire(this._options);
        this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
    }
    get options() {
        return this._options;
    }
    updateStickyScroll(optionsUpdate) {
        if (!this.stickyScrollController && this._options.enableStickyScroll) {
            this.stickyScrollController = new StickyScrollController(this, this.model, this.view, this.renderers, this.treeDelegate, this._options);
            this.onDidChangeStickyScrollFocused = this.stickyScrollController.onDidChangeHasFocus;
        }
        else if (this.stickyScrollController && !this._options.enableStickyScroll) {
            this.onDidChangeStickyScrollFocused = Event.None;
            this.stickyScrollController.dispose();
            this.stickyScrollController = undefined;
        }
        this.stickyScrollController?.updateOptions(optionsUpdate);
    }
    updateWidth(element) {
        const index = this.model.getListIndex(element);
        if (index === -1) {
            return;
        }
        this.view.updateWidth(index);
    }
    // Widget
    getHTMLElement() {
        return this.view.getHTMLElement();
    }
    get contentHeight() {
        return this.view.contentHeight;
    }
    get contentWidth() {
        return this.view.contentWidth;
    }
    get onDidChangeContentHeight() {
        return this.view.onDidChangeContentHeight;
    }
    get onDidChangeContentWidth() {
        return this.view.onDidChangeContentWidth;
    }
    get scrollTop() {
        return this.view.scrollTop;
    }
    set scrollTop(scrollTop) {
        this.view.scrollTop = scrollTop;
    }
    get scrollLeft() {
        return this.view.scrollLeft;
    }
    set scrollLeft(scrollLeft) {
        this.view.scrollLeft = scrollLeft;
    }
    get scrollHeight() {
        return this.view.scrollHeight;
    }
    get renderHeight() {
        return this.view.renderHeight;
    }
    get firstVisibleElement() {
        let index = this.view.firstVisibleIndex;
        if (this.stickyScrollController) {
            index += this.stickyScrollController.count;
        }
        if (index < 0 || index >= this.view.length) {
            return undefined;
        }
        const node = this.view.element(index);
        return node.element;
    }
    get lastVisibleElement() {
        const index = this.view.lastVisibleIndex;
        const node = this.view.element(index);
        return node.element;
    }
    get ariaLabel() {
        return this.view.ariaLabel;
    }
    set ariaLabel(value) {
        this.view.ariaLabel = value;
    }
    get selectionSize() {
        return this.selection.getNodes().length;
    }
    domFocus() {
        if (this.stickyScrollController?.focusedLast()) {
            this.stickyScrollController.domFocus();
        }
        else {
            this.view.domFocus();
        }
    }
    isDOMFocused() {
        return isActiveElement(this.getHTMLElement());
    }
    layout(height, width) {
        this.view.layout(height, width);
    }
    style(styles) {
        const suffix = `.${this.view.domId}`;
        const content = [];
        if (styles.treeIndentGuidesStroke) {
            content.push(`.monaco-list${suffix}:hover .monaco-tl-indent > .indent-guide, .monaco-list${suffix}.always .monaco-tl-indent > .indent-guide  { border-color: ${styles.treeInactiveIndentGuidesStroke}; }`);
            content.push(`.monaco-list${suffix} .monaco-tl-indent > .indent-guide.active { border-color: ${styles.treeIndentGuidesStroke}; }`);
        }
        // Sticky Scroll Background
        const stickyScrollBackground = styles.treeStickyScrollBackground ?? styles.listBackground;
        if (stickyScrollBackground) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container { background-color: ${stickyScrollBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container .monaco-tree-sticky-row { background-color: ${stickyScrollBackground}; }`);
        }
        // Sticky Scroll Border
        if (styles.treeStickyScrollBorder) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container { border-bottom: 1px solid ${styles.treeStickyScrollBorder}; }`);
        }
        // Sticky Scroll Shadow
        if (styles.treeStickyScrollShadow) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container .monaco-tree-sticky-container-shadow { box-shadow: ${styles.treeStickyScrollShadow} 0 6px 6px -6px inset; height: 3px; }`);
        }
        // Sticky Scroll Focus
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused { color: inherit; }`);
        }
        // Sticky Scroll Focus Outlines
        const focusAndSelectionOutline = asCssValueWithDefault(styles.listFocusAndSelectionOutline, asCssValueWithDefault(styles.listSelectionOutline, styles.listFocusOutline ?? ''));
        if (focusAndSelectionOutline) { // default: listFocusOutline
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused.selected { outline: 1px solid ${focusAndSelectionOutline}; outline-offset: -1px;}`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused.selected { outline: inherit;}`);
        }
        if (styles.listFocusOutline) { // default: set
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused { outline: inherit; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.passive-focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused.sticky-scroll-focused .monaco-list-rows .monaco-list-row.focused { outline: inherit; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused:not(.sticky-scroll-focused) .monaco-tree-sticky-container .monaco-list-rows .monaco-list-row.focused { outline: inherit; }`);
        }
        this.styleElement.textContent = content.join('\n');
        this.view.style(styles);
    }
    // Tree navigation
    getParentElement(location) {
        const parentRef = this.model.getParentNodeLocation(location);
        const parentNode = this.model.getNode(parentRef);
        return parentNode.element;
    }
    getFirstElementChild(location) {
        return this.model.getFirstElementChild(location);
    }
    // Tree
    getNode(location) {
        return this.model.getNode(location);
    }
    getNodeLocation(node) {
        return this.model.getNodeLocation(node);
    }
    collapse(location, recursive = false) {
        return this.model.setCollapsed(location, true, recursive);
    }
    expand(location, recursive = false) {
        return this.model.setCollapsed(location, false, recursive);
    }
    toggleCollapsed(location, recursive = false) {
        return this.model.setCollapsed(location, undefined, recursive);
    }
    expandAll() {
        this.model.setCollapsed(this.model.rootRef, false, true);
    }
    collapseAll() {
        this.model.setCollapsed(this.model.rootRef, true, true);
    }
    isCollapsible(location) {
        return this.model.isCollapsible(location);
    }
    setCollapsible(location, collapsible) {
        return this.model.setCollapsible(location, collapsible);
    }
    isCollapsed(location) {
        return this.model.isCollapsed(location);
    }
    expandTo(location) {
        this.model.expandTo(location);
    }
    triggerTypeNavigation() {
        this.view.triggerTypeNavigation();
    }
    openFind() {
        this.findController?.open();
    }
    closeFind() {
        this.findController?.close();
    }
    refilter() {
        this._onWillRefilter.fire(undefined);
        this.model.refilter();
    }
    setAnchor(element) {
        if (typeof element === 'undefined') {
            return this.view.setAnchor(undefined);
        }
        this.eventBufferer.bufferEvents(() => {
            const node = this.model.getNode(element);
            this.anchor.set([node]);
            const index = this.model.getListIndex(element);
            if (index > -1) {
                this.view.setAnchor(index, true);
            }
        });
    }
    getAnchor() {
        return this.anchor.get().at(0);
    }
    setSelection(elements, browserEvent) {
        this.eventBufferer.bufferEvents(() => {
            const nodes = elements.map(e => this.model.getNode(e));
            this.selection.set(nodes, browserEvent);
            const indexes = elements.map(e => this.model.getListIndex(e)).filter(i => i > -1);
            this.view.setSelection(indexes, browserEvent, true);
        });
    }
    getSelection() {
        return this.selection.get();
    }
    setFocus(elements, browserEvent) {
        this.eventBufferer.bufferEvents(() => {
            const nodes = elements.map(e => this.model.getNode(e));
            this.focus.set(nodes, browserEvent);
            const indexes = elements.map(e => this.model.getListIndex(e)).filter(i => i > -1);
            this.view.setFocus(indexes, browserEvent, true);
        });
    }
    focusNext(n = 1, loop = false, browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusNext(n, loop, browserEvent, filter);
    }
    focusPrevious(n = 1, loop = false, browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusPrevious(n, loop, browserEvent, filter);
    }
    focusNextPage(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        return this.view.focusNextPage(browserEvent, filter);
    }
    focusPreviousPage(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        return this.view.focusPreviousPage(browserEvent, filter, () => this.stickyScrollController?.height ?? 0);
    }
    focusLast(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusLast(browserEvent, filter);
    }
    focusFirst(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusFirst(browserEvent, filter);
    }
    getFocus() {
        return this.focus.get();
    }
    getStickyScrollFocus() {
        const focus = this.stickyScrollController?.getFocus();
        return focus !== undefined ? [focus] : [];
    }
    getFocusedPart() {
        return this.stickyScrollController?.focusedLast() ? 1 /* AbstractTreePart.StickyScroll */ : 0 /* AbstractTreePart.Tree */;
    }
    reveal(location, relativeTop) {
        this.model.expandTo(location);
        const index = this.model.getListIndex(location);
        if (index === -1) {
            return;
        }
        if (!this.stickyScrollController) {
            this.view.reveal(index, relativeTop);
        }
        else {
            const paddingTop = this.stickyScrollController.nodePositionTopBelowWidget(this.getNode(location));
            this.view.reveal(index, relativeTop, paddingTop);
        }
    }
    /**
     * Returns the relative position of an element rendered in the list.
     * Returns `null` if the element isn't *entirely* in the visible viewport.
     */
    getRelativeTop(location) {
        const index = this.model.getListIndex(location);
        if (index === -1) {
            return null;
        }
        const stickyScrollNode = this.stickyScrollController?.getNode(this.getNode(location));
        return this.view.getRelativeTop(index, stickyScrollNode?.position ?? this.stickyScrollController?.height);
    }
    getViewState(identityProvider = this.options.identityProvider) {
        if (!identityProvider) {
            throw new TreeError(this._user, 'Can\'t get tree view state without an identity provider');
        }
        const getId = (element) => identityProvider.getId(element).toString();
        const state = AbstractTreeViewState.empty(this.scrollTop);
        for (const focus of this.getFocus()) {
            state.focus.add(getId(focus));
        }
        for (const selection of this.getSelection()) {
            state.selection.add(getId(selection));
        }
        const root = this.model.getNode();
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (node !== root && node.collapsible) {
                state.expanded[getId(node.element)] = node.collapsed ? 0 : 1;
            }
            insertInto(stack, stack.length, node.children);
        }
        return state;
    }
    // List
    onLeftArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const didChange = this.model.setCollapsed(location, true);
        if (!didChange) {
            const parentLocation = this.model.getParentNodeLocation(location);
            if (!parentLocation) {
                return;
            }
            const parentListIndex = this.model.getListIndex(parentLocation);
            this.view.reveal(parentListIndex);
            this.view.setFocus([parentListIndex]);
        }
    }
    onRightArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const didChange = this.model.setCollapsed(location, false);
        if (!didChange) {
            if (!node.children.some(child => child.visible)) {
                return;
            }
            const [focusedIndex] = this.view.getFocus();
            const firstChildIndex = focusedIndex + 1;
            this.view.reveal(firstChildIndex);
            this.view.setFocus([firstChildIndex]);
        }
    }
    onSpace(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const recursive = e.browserEvent.altKey;
        this.model.setCollapsed(location, undefined, recursive);
    }
    setupModel(model) {
        this.modelDisposables.clear();
        this.modelDisposables.add(model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => this.view.splice(start, deleteCount, elements)));
        const onDidModelSplice = Event.forEach(model.onDidSpliceModel, e => {
            this.eventBufferer.bufferEvents(() => {
                this.focus.onDidModelSplice(e);
                this.selection.onDidModelSplice(e);
            });
        }, this.modelDisposables);
        // Make sure the `forEach` always runs
        onDidModelSplice(() => null, null, this.modelDisposables);
        // Active nodes can change when the model changes or when focus or selection change.
        // We debounce it with 0 delay since these events may fire in the same stack and we only
        // want to run this once. It also doesn't matter if it runs on the next tick since it's only
        // a nice to have UI feature.
        const activeNodesEmitter = this.modelDisposables.add(new Emitter());
        const activeNodesDebounce = this.modelDisposables.add(new Delayer(0));
        this.modelDisposables.add(Event.any(onDidModelSplice, this.focus.onDidChange, this.selection.onDidChange)(() => {
            activeNodesDebounce.trigger(() => {
                const set = new Set();
                for (const node of this.focus.getNodes()) {
                    set.add(node);
                }
                for (const node of this.selection.getNodes()) {
                    set.add(node);
                }
                activeNodesEmitter.fire([...set.values()]);
            });
        }));
        this.onDidChangeActiveNodesRelay.input = activeNodesEmitter.event;
        this.onDidChangeModelRelay.input = Event.signal(model.onDidSpliceModel);
        this.onDidChangeCollapseStateRelay.input = model.onDidChangeCollapseState;
        this.onDidChangeRenderNodeCountRelay.input = model.onDidChangeRenderNodeCount;
        this.onDidSpliceModelRelay.input = model.onDidSpliceModel;
    }
    navigate(start) {
        return new TreeNavigator(this.view, this.model, start);
    }
    dispose() {
        dispose(this.disposables);
        this.stickyScrollController?.dispose();
        this.view.dispose();
        this.modelDisposables.dispose();
    }
}
class TreeNavigator {
    constructor(view, model, start) {
        this.view = view;
        this.model = model;
        if (start) {
            this.index = this.model.getListIndex(start);
        }
        else {
            this.index = -1;
        }
    }
    current() {
        if (this.index < 0 || this.index >= this.view.length) {
            return null;
        }
        return this.view.element(this.index).element;
    }
    previous() {
        this.index--;
        return this.current();
    }
    next() {
        this.index++;
        return this.current();
    }
    first() {
        this.index = 0;
        return this.current();
    }
    last() {
        this.index = this.view.length - 1;
        return this.current();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL2Fic3RyYWN0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdkosT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEQsT0FBTyxFQUEwQyxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRHLE9BQU8sRUFBRSx1QkFBdUIsRUFBd0IsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRixPQUFPLEVBQXlELFlBQVksRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxlQUFlLEVBQXNCLE1BQU0sdUJBQXVCLENBQUM7QUFDdlAsT0FBTyxFQUFpQixNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMs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