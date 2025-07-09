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
var CurrentlyFilteredToRenderer_1, FileCoverageRenderer_1, DeclarationCoverageRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { memoize } from '../../../../base/common/decorators.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { basenameOrAuthority } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { EditorOpenSource } from '../../../../platform/editor/common/editor.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { onObservableChange } from '../common/observableUtils.js';
import { BypassedFileCoverage, FileCoverage, getTotalCoveragePercent } from '../common/testCoverage.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { testingStatesToIcons, testingWasCovered } from './icons.js';
import { ManagedTestCoverageBars } from './testCoverageBars.js';
var CoverageSortOrder;
(function (CoverageSortOrder) {
    CoverageSortOrder[CoverageSortOrder["Coverage"] = 0] = "Coverage";
    CoverageSortOrder[CoverageSortOrder["Location"] = 1] = "Location";
    CoverageSortOrder[CoverageSortOrder["Name"] = 2] = "Name";
})(CoverageSortOrder || (CoverageSortOrder = {}));
let TestCoverageView = class TestCoverageView extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, coverageService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.coverageService = coverageService;
        this.tree = new MutableDisposable();
        this.sortOrder = observableValue('sortOrder', 1 /* CoverageSortOrder.Location */);
    }
    renderBody(container) {
        super.renderBody(container);
        const labels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility }));
        this._register(autorun(reader => {
            const coverage = this.coverageService.selected.read(reader);
            if (coverage) {
                const t = (this.tree.value ??= this.instantiationService.createInstance(TestCoverageTree, container, labels, this.sortOrder));
                t.setInput(coverage, this.coverageService.filterToTest.read(reader));
            }
            else {
                this.tree.clear();
            }
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.value?.layout(height, width);
    }
};
TestCoverageView = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, ITestCoverageService)
], TestCoverageView);
export { TestCoverageView };
let fnNodeId = 0;
class DeclarationCoverageNode {
    get hits() {
        return this.data.count;
    }
    get label() {
        return this.data.name;
    }
    get location() {
        return this.data.location;
    }
    get tpc() {
        const attr = this.attributableCoverage();
        return attr && getTotalCoveragePercent(attr.statement, attr.branch, undefined);
    }
    constructor(uri, data, details) {
        this.uri = uri;
        this.data = data;
        this.id = String(fnNodeId++);
        this.containedDetails = new Set();
        this.children = [];
        if (data.location instanceof Range) {
            for (const detail of details) {
                if (this.contains(detail.location)) {
                    this.containedDetails.add(detail);
                }
            }
        }
    }
    /** Gets whether this function has a defined range and contains the given range. */
    contains(location) {
        const own = this.data.location;
        return own instanceof Range && (location instanceof Range ? own.containsRange(location) : own.containsPosition(location));
    }
    /**
     * If the function defines a range, we can look at statements within the
     * function to get total coverage for the function, rather than a boolean
     * yes/no.
     */
    attributableCoverage() {
        const { location, count } = this.data;
        if (!(location instanceof Range) || !count) {
            return;
        }
        const statement = { covered: 0, total: 0 };
        const branch = { covered: 0, total: 0 };
        for (const detail of this.containedDetails) {
            if (detail.type !== 1 /* DetailType.Statement */) {
                continue;
            }
            statement.covered += detail.count ? 1 : 0;
            statement.total++;
            if (detail.branches) {
                for (const { count } of detail.branches) {
                    branch.covered += count ? 1 : 0;
                    branch.total++;
                }
            }
        }
        return { statement, branch };
    }
}
__decorate([
    memoize
], DeclarationCoverageNode.prototype, "attributableCoverage", null);
class RevealUncoveredDeclarations {
    get label() {
        return localize('functionsWithoutCoverage', "{0} declarations without coverage...", this.n);
    }
    constructor(n) {
        this.n = n;
        this.id = String(fnNodeId++);
    }
}
class CurrentlyFilteredTo {
    get label() {
        return localize('filteredToTest', "Showing coverage for \"{0}\"", this.testItem.label);
    }
    constructor(testItem) {
        this.testItem = testItem;
        this.id = String(fnNodeId++);
    }
}
class LoadingDetails {
    constructor() {
        this.id = String(fnNodeId++);
        this.label = localize('loadingCoverageDetails', "Loading Coverage Details...");
    }
}
const isFileCoverage = (c) => typeof c === 'object' && 'value' in c;
const isDeclarationCoverage = (c) => c instanceof DeclarationCoverageNode;
const shouldShowDeclDetailsOnExpand = (c) => isFileCoverage(c) && c.value instanceof FileCoverage && !!c.value.declaration?.total;
let TestCoverageTree = class TestCoverageTree extends Disposable {
    constructor(container, labels, sortOrder, instantiationService, editorService, commandService) {
        super();
        this.inputDisposables = this._register(new DisposableStore());
        container.classList.add('testing-stdtree');
        this.tree = instantiationService.createInstance((WorkbenchCompressibleObjectTree), 'TestCoverageView', container, new TestCoverageTreeListDelegate(), [
            instantiationService.createInstance(FileCoverageRenderer, labels),
            instantiationService.createInstance(DeclarationCoverageRenderer),
            instantiationService.createInstance(BasicRenderer),
            instantiationService.createInstance(CurrentlyFilteredToRenderer),
        ], {
            expandOnlyOnTwistieClick: true,
            sorter: new Sorter(sortOrder),
            keyboardNavigationLabelProvider: {
                getCompressedNodeKeyboardNavigationLabel(elements) {
                    return elements.map(e => this.getKeyboardNavigationLabel(e)).join('/');
                },
                getKeyboardNavigationLabel(e) {
                    return isFileCoverage(e)
                        ? basenameOrAuthority(e.value.uri)
                        : e.label;
                },
            },
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isFileCoverage(element)) {
                        const name = basenameOrAuthority(element.value.uri);
                        return localize('testCoverageItemLabel', "{0} coverage: {0}%", name, (element.value.tpc * 100).toFixed(2));
                    }
                    else {
                        return element.label;
                    }
                },
                getWidgetAriaLabel() {
                    return localize('testCoverageTreeLabel', "Test Coverage Explorer");
                }
            },
            identityProvider: new TestCoverageIdentityProvider(),
        });
        this._register(autorun(reader => {
            sortOrder.read(reader);
            this.tree.resort(null, true);
        }));
        this._register(this.tree);
        this._register(this.tree.onDidChangeCollapseState(e => {
            const el = e.node.element;
            if (!e.node.collapsed && !e.node.children.length && el && shouldShowDeclDetailsOnExpand(el)) {
                if (el.value.hasSynchronousDetails) {
                    this.tree.setChildren(el, [{ element: new LoadingDetails(), incompressible: true }]);
                }
                el.value.details().then(details => this.updateWithDetails(el, details));
            }
        }));
        this._register(this.tree.onDidOpen(e => {
            let resource;
            let selection;
            if (e.element) {
                if (isFileCoverage(e.element) && !e.element.children?.size) {
                    resource = e.element.value.uri;
                }
                else if (isDeclarationCoverage(e.element)) {
                    resource = e.element.uri;
                    selection = e.element.location;
                }
                else if (e.element instanceof CurrentlyFilteredTo) {
                    commandService.executeCommand("testing.coverageFilterToTest" /* TestCommandId.CoverageFilterToTest */);
                    return;
                }
            }
            if (!resource) {
                return;
            }
            editorService.openEditor({
                resource,
                options: {
                    selection: selection instanceof Position ? Range.fromPositions(selection, selection) : selection,
                    revealIfOpened: true,
                    selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
                    preserveFocus: e.editorOptions.preserveFocus,
                    pinned: e.editorOptions.pinned,
                    source: EditorOpenSource.USER,
                },
            }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
        }));
    }
    setInput(coverage, showOnlyTest) {
        this.inputDisposables.clear();
        let tree = coverage.tree;
        // Filter to only a test, generate a new tree with only those items selected
        if (showOnlyTest) {
            tree = coverage.filterTreeForTest(showOnlyTest);
        }
        const files = [];
        for (let node of tree.nodes) {
            // when showing initial children, only show from the first file or tee
            while (!(node.value instanceof FileCoverage) && node.children?.size === 1) {
                node = Iterable.first(node.children.values());
            }
            files.push(node);
        }
        const toChild = (value) => {
            const isFile = !value.children?.size;
            return {
                element: value,
                incompressible: isFile,
                collapsed: isFile,
                // directories can be expanded, and items with function info can be expanded
                collapsible: !isFile || !!value.value?.declaration?.total,
                children: value.children && Iterable.map(value.children?.values(), toChild)
            };
        };
        this.inputDisposables.add(onObservableChange(coverage.didAddCoverage, nodes => {
            const toRender = findLast(nodes, n => this.tree.hasElement(n));
            if (toRender) {
                this.tree.setChildren(toRender, Iterable.map(toRender.children?.values() || [], toChild), { diffIdentityProvider: { getId: el => el.value.id } });
            }
        }));
        let children = Iterable.map(files, toChild);
        const filteredTo = showOnlyTest && coverage.result.getTestById(showOnlyTest.toString());
        if (filteredTo) {
            children = Iterable.concat(Iterable.single({
                element: new CurrentlyFilteredTo(filteredTo),
                incompressible: true,
            }), children);
        }
        this.tree.setChildren(null, children);
    }
    layout(height, width) {
        this.tree.layout(height, width);
    }
    updateWithDetails(el, details) {
        if (!this.tree.hasElement(el)) {
            return; // avoid any issues if the tree changes in the meanwhile
        }
        const decl = [];
        for (const fn of details) {
            if (fn.type !== 0 /* DetailType.Declaration */) {
                continue;
            }
            let arr = decl;
            while (true) {
                const parent = arr.find(p => p.containedDetails.has(fn));
                if (parent) {
                    arr = parent.children;
                }
                else {
                    break;
                }
            }
            arr.push(new DeclarationCoverageNode(el.value.uri, fn, details));
        }
        const makeChild = (fn) => ({
            element: fn,
            incompressible: true,
            collapsed: true,
            collapsible: fn.children.length > 0,
            children: fn.children.map(makeChild)
        });
        this.tree.setChildren(el, decl.map(makeChild));
    }
};
TestCoverageTree = __decorate([
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, ICommandService)
], TestCoverageTree);
class TestCoverageTreeListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        if (isFileCoverage(element)) {
            return FileCoverageRenderer.ID;
        }
        if (isDeclarationCoverage(element)) {
            return DeclarationCoverageRenderer.ID;
        }
        if (element instanceof LoadingDetails || element instanceof RevealUncoveredDeclarations) {
            return BasicRenderer.ID;
        }
        if (element instanceof CurrentlyFilteredTo) {
            return CurrentlyFilteredToRenderer.ID;
        }
        assertNever(element);
    }
}
class Sorter {
    constructor(order) {
        this.order = order;
    }
    compare(a, b) {
        const order = this.order.get();
        if (isFileCoverage(a) && isFileCoverage(b)) {
            switch (order) {
                case 1 /* CoverageSortOrder.Location */:
                case 2 /* CoverageSortOrder.Name */:
                    return a.value.uri.toString().localeCompare(b.value.uri.toString());
                case 0 /* CoverageSortOrder.Coverage */:
                    return b.value.tpc - a.value.tpc;
            }
        }
        else if (isDeclarationCoverage(a) && isDeclarationCoverage(b)) {
            switch (order) {
                case 1 /* CoverageSortOrder.Location */:
                    return Position.compare(a.location instanceof Range ? a.location.getStartPosition() : a.location, b.location instanceof Range ? b.location.getStartPosition() : b.location);
                case 2 /* CoverageSortOrder.Name */:
                    return a.label.localeCompare(b.label);
                case 0 /* CoverageSortOrder.Coverage */: {
                    const attrA = a.tpc;
                    const attrB = b.tpc;
                    return (attrA !== undefined && attrB !== undefined && attrB - attrA)
                        || (+b.hits - +a.hits)
                        || a.label.localeCompare(b.label);
                }
            }
        }
        else {
            return 0;
        }
    }
}
let CurrentlyFilteredToRenderer = class CurrentlyFilteredToRenderer {
    static { CurrentlyFilteredToRenderer_1 = this; }
    static { this.ID = 'C'; }
    constructor(menuService, contextKeyService) {
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.templateId = CurrentlyFilteredToRenderer_1.ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        this.renderInner(node.element.elements[node.element.elements.length - 1], templateData);
    }
    renderTemplate(container) {
        container.classList.add('testing-stdtree-container');
        const label = dom.append(container, dom.$('.label'));
        const menu = this.menuService.getMenuActions(MenuId.TestCoverageFilterItem, this.contextKeyService, {
            shouldForwardArgs: true,
        });
        const actions = new ActionBar(container);
        actions.push(getActionBarActions(menu, 'inline').primary, { icon: true, label: false });
        actions.domNode.style.display = 'block';
        return { label, actions };
    }
    renderElement(element, index, templateData, height) {
        this.renderInner(element.element, templateData);
    }
    disposeTemplate(templateData) {
        templateData.actions.dispose();
    }
    renderInner(element, container) {
        container.label.innerText = element.label;
    }
};
CurrentlyFilteredToRenderer = CurrentlyFilteredToRenderer_1 = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService)
], CurrentlyFilteredToRenderer);
let FileCoverageRenderer = class FileCoverageRenderer {
    static { FileCoverageRenderer_1 = this; }
    static { this.ID = 'F'; }
    constructor(labels, labelService, instantiationService) {
        this.labels = labels;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.templateId = FileCoverageRenderer_1.ID;
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        container.classList.add('testing-stdtree-container', 'test-coverage-list-item');
        return {
            container,
            bars: templateDisposables.add(this.instantiationService.createInstance(ManagedTestCoverageBars, { compact: false, container })),
            label: templateDisposables.add(this.labels.create(container, {
                supportHighlights: true,
            })),
            elementsDisposables: templateDisposables.add(new DisposableStore()),
            templateDisposables,
        };
    }
    /** @inheritdoc */
    renderElement(node, _index, templateData) {
        this.doRender(node.element, templateData, node.filterData);
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        this.doRender(node.element.elements, templateData, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    /** @inheritdoc */
    doRender(element, templateData, filterData) {
        templateData.elementsDisposables.clear();
        const stat = (element instanceof Array ? element[element.length - 1] : element);
        const file = stat.value;
        const name = element instanceof Array ? element.map(e => basenameOrAuthority(e.value.uri)) : basenameOrAuthority(file.uri);
        if (file instanceof BypassedFileCoverage) {
            templateData.bars.setCoverageInfo(undefined);
        }
        else {
            templateData.elementsDisposables.add(autorun(reader => {
                stat.value?.didChange.read(reader);
                templateData.bars.setCoverageInfo(file);
            }));
            templateData.bars.setCoverageInfo(file);
        }
        templateData.label.setResource({ resource: file.uri, name }, {
            fileKind: stat.children?.size ? FileKind.FOLDER : FileKind.FILE,
            matches: createMatches(filterData),
            separator: this.labelService.getSeparator(file.uri.scheme, file.uri.authority),
            extraClasses: ['label'],
        });
    }
};
FileCoverageRenderer = FileCoverageRenderer_1 = __decorate([
    __param(1, ILabelService),
    __param(2, IInstantiationService)
], FileCoverageRenderer);
let DeclarationCoverageRenderer = class DeclarationCoverageRenderer {
    static { DeclarationCoverageRenderer_1 = this; }
    static { this.ID = 'N'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.templateId = DeclarationCoverageRenderer_1.ID;
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        container.classList.add('test-coverage-list-item', 'testing-stdtree-container');
        const icon = dom.append(container, dom.$('.state'));
        const label = dom.append(container, dom.$('.label'));
        return {
            container,
            bars: templateDisposables.add(this.instantiationService.createInstance(ManagedTestCoverageBars, { compact: false, container })),
            templateDisposables,
            icon,
            label,
        };
    }
    /** @inheritdoc */
    renderElement(node, _index, templateData) {
        this.doRender(node.element, templateData, node.filterData);
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        this.doRender(node.element.elements[node.element.elements.length - 1], templateData, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    /** @inheritdoc */
    doRender(element, templateData, _filterData) {
        const covered = !!element.hits;
        const icon = covered ? testingWasCovered : testingStatesToIcons.get(0 /* TestResultState.Unset */);
        templateData.container.classList.toggle('not-covered', !covered);
        templateData.icon.className = `computed-state ${ThemeIcon.asClassName(icon)}`;
        templateData.label.innerText = element.label;
        templateData.bars.setCoverageInfo(element.attributableCoverage());
    }
};
DeclarationCoverageRenderer = DeclarationCoverageRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], DeclarationCoverageRenderer);
class BasicRenderer {
    constructor() {
        this.templateId = BasicRenderer.ID;
    }
    static { this.ID = 'B'; }
    renderCompressedElements(node, _index, container) {
        this.renderInner(node.element.elements[node.element.elements.length - 1], container);
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(node, index, container) {
        this.renderInner(node.element, container);
    }
    disposeTemplate() {
        // no-op
    }
    renderInner(element, container) {
        container.innerText = element.label;
    }
}
class TestCoverageIdentityProvider {
    getId(element) {
        return isFileCoverage(element)
            ? element.value.uri.toString()
            : element.id;
    }
}
registerAction2(class TestCoverageChangePerTestFilterAction extends Action2 {
    constructor() {
        super({
            id: "testing.coverageFilterToTest" /* TestCommandId.CoverageFilterToTest */,
            category: Categories.Test,
            title: localize2('testing.changeCoverageFilter', 'Filter Coverage by Test'),
            icon: Codicon.filter,
            toggled: {
                icon: Codicon.filterFilled,
                condition: TestingContextKeys.isCoverageFilteredToTest,
            },
            menu: [
                { id: MenuId.CommandPalette, when: TestingContextKeys.hasPerTestCoverage },
                { id: MenuId.TestCoverageFilterItem, group: 'inline' },
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(TestingContextKeys.hasPerTestCoverage, ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */)),
                    group: 'navigation',
                },
            ]
        });
    }
    run(accessor) {
        const coverageService = accessor.get(ITestCoverageService);
        const quickInputService = accessor.get(IQuickInputService);
        const coverage = coverageService.selected.get();
        if (!coverage) {
            return;
        }
        const tests = [...coverage.allPerTestIDs()].map(TestId.fromString);
        const commonPrefix = TestId.getLengthOfCommonPrefix(tests.length, i => tests[i]);
        const result = coverage.result;
        const previousSelection = coverageService.filterToTest.get();
        const previousSelectionStr = previousSelection?.toString();
        const items = [
            { label: coverUtils.labels.allTests, id: undefined },
            { type: 'separator' },
            ...tests.map(testId => ({ label: coverUtils.getLabelForItem(result, testId, commonPrefix), testId })),
        ];
        quickInputService.pick(items, {
            activeItem: items.find((item) => 'testId' in item && item.testId?.toString() === previousSelectionStr),
            placeHolder: coverUtils.labels.pickShowCoverage,
            onDidFocus: (entry) => {
                coverageService.filterToTest.set(entry.testId, undefined);
            },
        }).then(selected => {
            coverageService.filterToTest.set(selected ? selected.testId : previousSelection, undefined);
        });
    }
});
registerAction2(class TestCoverageChangeSortingAction extends ViewAction {
    constructor() {
        super({
            id: "testing.coverageViewChangeSorting" /* TestCommandId.CoverageViewChangeSorting */,
            viewId: "workbench.view.testCoverage" /* Testing.CoverageViewId */,
            title: localize2('testing.changeCoverageSort', 'Change Sort Order'),
            icon: Codicon.sortPrecedence,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */),
                group: 'navigation',
            }
        });
    }
    runInView(accessor, view) {
        const disposables = new DisposableStore();
        const quickInput = disposables.add(accessor.get(IQuickInputService).createQuickPick());
        const items = [
            { label: localize('testing.coverageSortByLocation', 'Sort by Location'), value: 1 /* CoverageSortOrder.Location */, description: localize('testing.coverageSortByLocationDescription', 'Files are sorted alphabetically, declarations are sorted by position') },
            { label: localize('testing.coverageSortByCoverage', 'Sort by Coverage'), value: 0 /* CoverageSortOrder.Coverage */, description: localize('testing.coverageSortByCoverageDescription', 'Files and declarations are sorted by total coverage') },
            { label: localize('testing.coverageSortByName', 'Sort by Name'), value: 2 /* CoverageSortOrder.Name */, description: localize('testing.coverageSortByNameDescription', 'Files and declarations are sorted alphabetically') },
        ];
        quickInput.placeholder = localize('testing.coverageSortPlaceholder', 'Sort the Test Coverage view...');
        quickInput.items = items;
        quickInput.show();
        disposables.add(quickInput.onDidHide(() => disposables.dispose()));
        disposables.add(quickInput.onDidAccept(() => {
            const picked = quickInput.selectedItems[0]?.value;
            if (picked !== undefined) {
                view.sortOrder.set(picked, undefined);
                quickInput.dispose();
            }
        }));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdENvdmVyYWdlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFLL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RyxPQUFPLEVBQWUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FB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