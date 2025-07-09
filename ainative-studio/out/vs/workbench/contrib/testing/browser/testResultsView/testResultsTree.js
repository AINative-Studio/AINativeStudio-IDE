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
var TestRunElementRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { count } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isDefined } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { MenuEntryActionViewItem, fillInActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleObjectTree } from '../../../../../platform/list/browser/listService.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { widgetClose } from '../../../../../platform/theme/common/iconRegistry.js';
import { getTestItemContextOverlay } from '../explorerProjections/testItemContextOverlay.js';
import * as icons from '../icons.js';
import { renderTestMessageAsText } from '../testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject, getMessageArgs, mapFindTestMessage } from './testResultsSubject.js';
import { ITestCoverageService } from '../../common/testCoverageService.js';
import { ITestExplorerFilterState } from '../../common/testExplorerFilterState.js';
import { ITestProfileService } from '../../common/testProfileService.js';
import { LiveTestResult, maxCountPriority } from '../../common/testResult.js';
import { ITestResultService } from '../../common/testResultService.js';
import { InternalTestItem, testResultStateToContextValues } from '../../common/testTypes.js';
import { TestingContextKeys } from '../../common/testingContextKeys.js';
import { cmpPriority } from '../../common/testingStates.js';
import { buildTestUri } from '../../common/testingUri.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
class TestResultElement {
    get icon() {
        return icons.testingStatesToIcons.get(this.value.completedAt === undefined
            ? 2 /* TestResultState.Running */
            : maxCountPriority(this.value.counts));
    }
    constructor(value) {
        this.value = value;
        this.changeEmitter = new Emitter();
        this.onDidChange = this.changeEmitter.event;
        this.type = 'result';
        this.context = this.value.id;
        this.id = this.value.id;
        this.label = this.value.name;
    }
}
const openCoverageLabel = localize('openTestCoverage', 'View Test Coverage');
const closeCoverageLabel = localize('closeTestCoverage', 'Close Test Coverage');
class CoverageElement {
    get label() {
        return this.isOpen ? closeCoverageLabel : openCoverageLabel;
    }
    get icon() {
        return this.isOpen ? widgetClose : icons.testingCoverageReport;
    }
    get isOpen() {
        return this.coverageService.selected.get()?.fromTaskId === this.task.id;
    }
    constructor(results, task, coverageService) {
        this.results = results;
        this.task = task;
        this.coverageService = coverageService;
        this.type = 'coverage';
        this.id = `coverage-${this.results.id}/${this.task.id}`;
        this.onDidChange = Event.fromObservableLight(coverageService.selected);
    }
}
class OlderResultsElement {
    constructor(n) {
        this.n = n;
        this.type = 'older';
        this.id = `older-${this.n}`;
        this.onDidChange = Event.None;
        this.label = localize('nOlderResults', '{0} older results', n);
    }
}
class TestCaseElement {
    get onDidChange() {
        if (!(this.results instanceof LiveTestResult)) {
            return Event.None;
        }
        return Event.filter(this.results.onChange, e => e.item.item.extId === this.test.item.extId);
    }
    get state() {
        return this.test.tasks[this.taskIndex].state;
    }
    get label() {
        return this.test.item.label;
    }
    get labelWithIcons() {
        return renderLabelWithIcons(this.label);
    }
    get icon() {
        return icons.testingStatesToIcons.get(this.state);
    }
    get outputSubject() {
        return new TestOutputSubject(this.results, this.taskIndex, this.test);
    }
    constructor(results, test, taskIndex) {
        this.results = results;
        this.test = test;
        this.taskIndex = taskIndex;
        this.type = 'test';
        this.context = {
            $mid: 16 /* MarshalledId.TestItemContext */,
            tests: [InternalTestItem.serialize(this.test)],
        };
        this.id = `${this.results.id}/${this.test.item.extId}`;
    }
}
class TaskElement {
    get icon() {
        return this.results.tasks[this.index].running ? icons.testingStatesToIcons.get(2 /* TestResultState.Running */) : undefined;
    }
    constructor(results, task, index) {
        this.results = results;
        this.task = task;
        this.index = index;
        this.changeEmitter = new Emitter();
        this.onDidChange = this.changeEmitter.event;
        this.type = 'task';
        this.itemsCache = new CreationCache();
        this.id = `${results.id}/${index}`;
        this.task = results.tasks[index];
        this.context = { resultId: results.id, taskId: this.task.id };
        this.label = this.task.name;
    }
}
class TestMessageElement {
    get onDidChange() {
        if (!(this.result instanceof LiveTestResult)) {
            return Event.None;
        }
        // rerender when the test case changes so it gets retired events
        return Event.filter(this.result.onChange, e => e.item.item.extId === this.test.item.extId);
    }
    get context() {
        return getMessageArgs(this.test, this.message);
    }
    get outputSubject() {
        return new TestOutputSubject(this.result, this.taskIndex, this.test);
    }
    constructor(result, test, taskIndex, messageIndex) {
        this.result = result;
        this.test = test;
        this.taskIndex = taskIndex;
        this.messageIndex = messageIndex;
        this.type = 'message';
        const m = this.message = test.tasks[taskIndex].messages[messageIndex];
        this.location = m.location;
        this.contextValue = m.type === 0 /* TestMessageType.Error */ ? m.contextValue : undefined;
        this.uri = buildTestUri({
            type: 2 /* TestUriType.ResultMessage */,
            messageIndex,
            resultId: result.id,
            taskIndex,
            testExtId: test.item.extId
        });
        this.id = this.uri.toString();
        const asPlaintext = renderTestMessageAsText(m.message);
        const lines = count(asPlaintext.trimEnd(), '\n');
        this.label = firstLine(asPlaintext);
        if (lines > 0) {
            this.description = lines > 1
                ? localize('messageMoreLinesN', '+ {0} more lines', lines)
                : localize('messageMoreLines1', '+ 1 more line');
        }
    }
}
let OutputPeekTree = class OutputPeekTree extends Disposable {
    constructor(container, onDidReveal, options, contextMenuService, results, instantiationService, explorerFilter, coverageService, progressService, telemetryService) {
        super();
        this.contextMenuService = contextMenuService;
        this.disposed = false;
        this.requestReveal = this._register(new Emitter());
        this.onDidRequestReview = this.requestReveal.event;
        this.treeActions = instantiationService.createInstance(TreeActionsProvider, options.showRevealLocationOnMessages, this.requestReveal);
        const diffIdentityProvider = {
            getId(e) {
                return e.id;
            }
        };
        this.tree = this._register(instantiationService.createInstance(WorkbenchCompressibleObjectTree, 'Test Output Peek', container, {
            getHeight: () => 22,
            getTemplateId: () => TestRunElementRenderer.ID,
        }, [instantiationService.createInstance(TestRunElementRenderer, this.treeActions)], {
            compressionEnabled: true,
            hideTwistiesOfChildlessElements: true,
            identityProvider: diffIdentityProvider,
            alwaysConsumeMouseWheel: false,
            sorter: {
                compare(a, b) {
                    if (a instanceof TestCaseElement && b instanceof TestCaseElement) {
                        return cmpPriority(a.state, b.state);
                    }
                    return 0;
                },
            },
            accessibilityProvider: {
                getAriaLabel(element) {
                    return element.ariaLabel || element.label;
                },
                getWidgetAriaLabel() {
                    return localize('testingPeekLabel', 'Test Result Messages');
                }
            }
        }));
        const cc = new CreationCache();
        const getTaskChildren = (taskElem) => {
            const { results, index, itemsCache, task } = taskElem;
            const tests = Iterable.filter(results.tests, test => test.tasks[index].state >= 2 /* TestResultState.Running */ || test.tasks[index].messages.length > 0);
            let result = Iterable.map(tests, test => ({
                element: itemsCache.getOrCreate(test, () => new TestCaseElement(results, test, index)),
                incompressible: true,
                children: getTestChildren(results, test, index),
            }));
            if (task.coverage.get()) {
                result = Iterable.concat(Iterable.single({
                    element: new CoverageElement(results, task, coverageService),
                    collapsible: true,
                    incompressible: true,
                }), result);
            }
            return result;
        };
        const getTestChildren = (result, test, taskIndex) => {
            return test.tasks[taskIndex].messages
                .map((m, messageIndex) => m.type === 0 /* TestMessageType.Error */
                ? { element: cc.getOrCreate(m, () => new TestMessageElement(result, test, taskIndex, messageIndex)), incompressible: false }
                : undefined)
                .filter(isDefined);
        };
        const getResultChildren = (result) => {
            return result.tasks.map((task, taskIndex) => {
                const taskElem = cc.getOrCreate(task, () => new TaskElement(result, task, taskIndex));
                return ({
                    element: taskElem,
                    incompressible: false,
                    collapsible: true,
                    children: getTaskChildren(taskElem),
                });
            });
        };
        const getRootChildren = () => {
            let children = [];
            const older = [];
            for (const result of results.results) {
                if (!children.length && result.tasks.length) {
                    children = getResultChildren(result);
                }
                else if (children) {
                    const element = cc.getOrCreate(result, () => new TestResultElement(result));
                    older.push({
                        element,
                        incompressible: true,
                        collapsible: true,
                        collapsed: this.tree.hasElement(element) ? this.tree.isCollapsed(element) : true,
                        children: getResultChildren(result)
                    });
                }
            }
            if (!children.length) {
                return older;
            }
            if (older.length) {
                children.push({
                    element: new OlderResultsElement(older.length),
                    incompressible: true,
                    collapsible: true,
                    collapsed: true,
                    children: older,
                });
            }
            return children;
        };
        // Queued result updates to prevent spamming CPU when lots of tests are
        // completing and messaging quickly (#142514)
        const taskChildrenToUpdate = new Set();
        const taskChildrenUpdate = this._register(new RunOnceScheduler(() => {
            for (const taskNode of taskChildrenToUpdate) {
                if (this.tree.hasElement(taskNode)) {
                    this.tree.setChildren(taskNode, getTaskChildren(taskNode), { diffIdentityProvider });
                }
            }
            taskChildrenToUpdate.clear();
        }, 300));
        const queueTaskChildrenUpdate = (taskNode) => {
            taskChildrenToUpdate.add(taskNode);
            if (!taskChildrenUpdate.isScheduled()) {
                taskChildrenUpdate.schedule();
            }
        };
        const attachToResults = (result) => {
            const disposable = new DisposableStore();
            disposable.add(result.onNewTask(i => {
                this.tree.setChildren(null, getRootChildren(), { diffIdentityProvider });
                if (result.tasks.length === 1) {
                    this.requestReveal.fire(new TaskSubject(result, 0)); // reveal the first task in new runs
                }
                // note: tasks are bounded and their lifetime is equivalent to that of
                // the test result, so this doesn't leak indefinitely.
                const task = result.tasks[i];
                disposable.add(autorun(reader => {
                    task.coverage.read(reader); // add it to the autorun
                    queueTaskChildrenUpdate(cc.get(task));
                }));
            }));
            disposable.add(result.onEndTask(index => {
                cc.get(result.tasks[index])?.changeEmitter.fire();
            }));
            disposable.add(result.onChange(e => {
                // try updating the item in each of its tasks
                for (const [index, task] of result.tasks.entries()) {
                    const taskNode = cc.get(task);
                    if (!this.tree.hasElement(taskNode)) {
                        continue;
                    }
                    const itemNode = taskNode.itemsCache.get(e.item);
                    if (itemNode && this.tree.hasElement(itemNode)) {
                        if (e.reason === 2 /* TestResultItemChangeReason.NewMessage */ && e.message.type === 0 /* TestMessageType.Error */) {
                            this.tree.setChildren(itemNode, getTestChildren(result, e.item, index), { diffIdentityProvider });
                        }
                        return;
                    }
                    queueTaskChildrenUpdate(taskNode);
                }
            }));
            disposable.add(result.onComplete(() => {
                cc.get(result)?.changeEmitter.fire();
                disposable.dispose();
            }));
        };
        this._register(results.onResultsChanged(e => {
            // little hack here: a result change can cause the peek to be disposed,
            // but this listener will still be queued. Doing stuff with the tree
            // will cause errors.
            if (this.disposed) {
                return;
            }
            if ('completed' in e) {
                cc.get(e.completed)?.changeEmitter.fire();
            }
            else if ('started' in e) {
                attachToResults(e.started);
            }
            else {
                this.tree.setChildren(null, getRootChildren(), { diffIdentityProvider });
            }
        }));
        const revealItem = (element, preserveFocus) => {
            this.tree.setFocus([element]);
            this.tree.setSelection([element]);
            if (!preserveFocus) {
                this.tree.domFocus();
            }
        };
        this._register(onDidReveal(async ({ subject, preserveFocus = false }) => {
            if (subject instanceof TaskSubject) {
                const resultItem = this.tree.getNode(null).children.find(c => {
                    if (c.element instanceof TaskElement) {
                        return c.element.results.id === subject.result.id && c.element.index === subject.taskIndex;
                    }
                    if (c.element instanceof TestResultElement) {
                        return c.element.id === subject.result.id;
                    }
                    return false;
                });
                if (resultItem) {
                    revealItem(resultItem.element, preserveFocus);
                }
                return;
            }
            const revealElement = subject instanceof TestOutputSubject
                ? cc.get(subject.task)?.itemsCache.get(subject.test)
                : cc.get(subject.message);
            if (!revealElement || !this.tree.hasElement(revealElement)) {
                return;
            }
            const parents = [];
            for (let parent = this.tree.getParentElement(revealElement); parent; parent = this.tree.getParentElement(parent)) {
                parents.unshift(parent);
            }
            for (const parent of parents) {
                this.tree.expand(parent);
            }
            if (this.tree.getRelativeTop(revealElement) === null) {
                this.tree.reveal(revealElement, 0.5);
            }
            revealItem(revealElement, preserveFocus);
        }));
        this._register(this.tree.onDidOpen(async (e) => {
            if (e.element instanceof TestMessageElement) {
                this.requestReveal.fire(new MessageSubject(e.element.result, e.element.test, e.element.taskIndex, e.element.messageIndex));
            }
            else if (e.element instanceof TestCaseElement) {
                const t = e.element;
                const message = mapFindTestMessage(e.element.test, (_t, _m, mesasgeIndex, taskIndex) => new MessageSubject(t.results, t.test, taskIndex, mesasgeIndex));
                this.requestReveal.fire(message || new TestOutputSubject(t.results, 0, t.test));
            }
            else if (e.element instanceof CoverageElement) {
                const task = e.element.task;
                if (e.element.isOpen) {
                    return coverageService.closeCoverage();
                }
                progressService.withProgress({ location: options.locationForProgress }, () => coverageService.openCoverage(task, true));
            }
        }));
        this._register(this.tree.onDidChangeSelection(evt => {
            for (const element of evt.elements) {
                if (element && 'test' in element) {
                    explorerFilter.reveal.set(element.test.item.extId, undefined);
                    break;
                }
            }
        }));
        this._register(explorerFilter.onDidSelectTestInExplorer(testId => {
            if (this.tree.getSelection().some(e => e && 'test' in e && e.test.item.extId === testId)) {
                return;
            }
            for (const node of this.tree.getNode(null).children) {
                if (node.element instanceof TaskElement) {
                    for (const testNode of node.children) {
                        if (testNode.element instanceof TestCaseElement && testNode.element.test.item.extId === testId) {
                            this.tree.setSelection([testNode.element]);
                            if (this.tree.getRelativeTop(testNode.element) === null) {
                                this.tree.reveal(testNode.element, 0.5);
                            }
                            break;
                        }
                    }
                }
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onDidChangeCollapseState(e => {
            if (e.node.element instanceof OlderResultsElement && !e.node.collapsed) {
                telemetryService.publicLog2('testing.expandOlderResults');
            }
        }));
        this.tree.setChildren(null, getRootChildren());
        for (const result of results.results) {
            if (!result.completedAt && result instanceof LiveTestResult) {
                attachToResults(result);
            }
        }
    }
    layout(height, width) {
        this.tree.layout(height, width);
    }
    onContextMenu(evt) {
        if (!evt.element) {
            return;
        }
        const actions = this.treeActions.provideActionBar(evt.element);
        this.contextMenuService.showContextMenu({
            getAnchor: () => evt.anchor,
            getActions: () => actions.secondary.length
                ? [...actions.primary, new Separator(), ...actions.secondary]
                : actions.primary,
            getActionsContext: () => evt.element?.context
        });
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
};
OutputPeekTree = __decorate([
    __param(3, IContextMenuService),
    __param(4, ITestResultService),
    __param(5, IInstantiationService),
    __param(6, ITestExplorerFilterState),
    __param(7, ITestCoverageService),
    __param(8, IProgressService),
    __param(9, ITelemetryService)
], OutputPeekTree);
export { OutputPeekTree };
let TestRunElementRenderer = class TestRunElementRenderer {
    static { TestRunElementRenderer_1 = this; }
    static { this.ID = 'testRunElementRenderer'; }
    constructor(treeActions, instantiationService) {
        this.treeActions = treeActions;
        this.instantiationService = instantiationService;
        this.templateId = TestRunElementRenderer_1.ID;
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        const chain = node.element.elements;
        const lastElement = chain[chain.length - 1];
        if ((lastElement instanceof TaskElement || lastElement instanceof TestMessageElement) && chain.length >= 2) {
            this.doRender(chain[chain.length - 2], templateData, lastElement);
        }
        else {
            this.doRender(lastElement, templateData);
        }
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        container.classList.add('testing-stdtree-container');
        const icon = dom.append(container, dom.$('.state'));
        const label = dom.append(container, dom.$('.label'));
        const actionBar = new ActionBar(container, {
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate })
                : undefined
        });
        const elementDisposable = new DisposableStore();
        templateDisposable.add(elementDisposable);
        templateDisposable.add(actionBar);
        return {
            icon,
            label,
            actionBar,
            elementDisposable,
            templateDisposable,
        };
    }
    /** @inheritdoc */
    renderElement(element, _index, templateData) {
        this.doRender(element.element, templateData);
    }
    /** @inheritdoc */
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    /** Called to render a new element */
    doRender(element, templateData, subjectElement) {
        templateData.elementDisposable.clear();
        templateData.elementDisposable.add(element.onDidChange(() => this.doRender(element, templateData, subjectElement)));
        this.doRenderInner(element, templateData, subjectElement);
    }
    /** Called, and may be re-called, to render or re-render an element */
    doRenderInner(element, templateData, subjectElement) {
        let { label, labelWithIcons, description } = element;
        if (subjectElement instanceof TestMessageElement) {
            description = subjectElement.label;
        }
        const descriptionElement = description ? dom.$('span.test-label-description', {}, description) : '';
        if (labelWithIcons) {
            dom.reset(templateData.label, ...labelWithIcons, descriptionElement);
        }
        else {
            dom.reset(templateData.label, label, descriptionElement);
        }
        const icon = element.icon;
        templateData.icon.className = `computed-state ${icon ? ThemeIcon.asClassName(icon) : ''}`;
        const actions = this.treeActions.provideActionBar(element);
        templateData.actionBar.clear();
        templateData.actionBar.context = element.context;
        templateData.actionBar.push(actions.primary, { icon: true, label: false });
    }
};
TestRunElementRenderer = TestRunElementRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], TestRunElementRenderer);
let TreeActionsProvider = class TreeActionsProvider {
    constructor(showRevealLocationOnMessages, requestReveal, contextKeyService, menuService, commandService, testProfileService, editorService) {
        this.showRevealLocationOnMessages = showRevealLocationOnMessages;
        this.requestReveal = requestReveal;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.commandService = commandService;
        this.testProfileService = testProfileService;
        this.editorService = editorService;
    }
    provideActionBar(element) {
        const test = element instanceof TestCaseElement ? element.test : undefined;
        const capabilities = test ? this.testProfileService.capabilitiesForTest(test.item) : 0;
        const contextKeys = [
            ['peek', "editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */],
            [TestingContextKeys.peekItemType.key, element.type],
        ];
        let id = MenuId.TestPeekElement;
        const primary = [];
        const secondary = [];
        if (element instanceof TaskElement) {
            primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', "Show Result Output"), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(new TaskSubject(element.results, element.index))));
            if (element.task.running) {
                primary.push(new Action('testing.outputPeek.cancel', localize('testing.cancelRun', 'Cancel Test Run'), ThemeIcon.asClassName(icons.testingCancelIcon), undefined, () => this.commandService.executeCommand("testing.cancelRun" /* TestCommandId.CancelTestRunAction */, element.results.id, element.task.id)));
            }
            else {
                primary.push(new Action('testing.outputPeek.rerun', localize('testing.reRunLastRun', 'Rerun Last Run'), ThemeIcon.asClassName(icons.testingRerunIcon), undefined, () => this.commandService.executeCommand("testing.reRunLastRun" /* TestCommandId.ReRunLastRun */, element.results.id)));
                primary.push(new Action('testing.outputPeek.debug', localize('testing.debugLastRun', 'Debug Last Run'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand("testing.debugLastRun" /* TestCommandId.DebugLastRun */, element.results.id)));
            }
        }
        if (element instanceof TestResultElement) {
            // only show if there are no collapsed test nodes that have more specific choices
            if (element.value.tasks.length === 1) {
                primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', "Show Result Output"), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(new TaskSubject(element.value, 0))));
            }
            primary.push(new Action('testing.outputPeek.reRunLastRun', localize('testing.reRunTest', "Rerun Test"), ThemeIcon.asClassName(icons.testingRunIcon), undefined, () => this.commandService.executeCommand('testing.reRunLastRun', element.value.id)));
            if (capabilities & 4 /* TestRunProfileBitset.Debug */) {
                primary.push(new Action('testing.outputPeek.debugLastRun', localize('testing.debugTest', "Debug Test"), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand('testing.debugLastRun', element.value.id)));
            }
        }
        if (element instanceof TestCaseElement || element instanceof TestMessageElement) {
            contextKeys.push([TestingContextKeys.testResultOutdated.key, element.test.retired], [TestingContextKeys.testResultState.key, testResultStateToContextValues[element.test.ownComputedState]], ...getTestItemContextOverlay(element.test, capabilities));
            const extId = element.test.item.extId;
            if (element.test.tasks[element.taskIndex].messages.some(m => m.type === 1 /* TestMessageType.Output */)) {
                primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', "Show Result Output"), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(element.outputSubject)));
            }
            secondary.push(new Action('testing.outputPeek.revealInExplorer', localize('testing.revealInExplorer', "Reveal in Test Explorer"), ThemeIcon.asClassName(Codicon.listTree), undefined, () => this.commandService.executeCommand('_revealTestInExplorer', extId)));
            if (capabilities & 2 /* TestRunProfileBitset.Run */) {
                primary.push(new Action('testing.outputPeek.runTest', localize('run test', 'Run Test'), ThemeIcon.asClassName(icons.testingRunIcon), undefined, () => this.commandService.executeCommand('vscode.runTestsById', 2 /* TestRunProfileBitset.Run */, extId)));
            }
            if (capabilities & 4 /* TestRunProfileBitset.Debug */) {
                primary.push(new Action('testing.outputPeek.debugTest', localize('debug test', 'Debug Test'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand('vscode.runTestsById', 4 /* TestRunProfileBitset.Debug */, extId)));
            }
        }
        if (element instanceof TestMessageElement) {
            id = MenuId.TestMessageContext;
            contextKeys.push([TestingContextKeys.testMessageContext.key, element.contextValue]);
            primary.push(new Action('testing.outputPeek.goToTest', localize('testing.goToTest', "Go to Test"), ThemeIcon.asClassName(Codicon.goToFile), undefined, () => this.commandService.executeCommand('vscode.revealTest', element.test.item.extId)));
            if (this.showRevealLocationOnMessages && element.location) {
                primary.push(new Action('testing.outputPeek.goToError', localize('testing.goToError', "Go to Error"), ThemeIcon.asClassName(Codicon.debugStackframe), undefined, () => this.editorService.openEditor({
                    resource: element.location.uri,
                    options: {
                        selection: element.location.range,
                        preserveFocus: true,
                    }
                })));
            }
        }
        const contextOverlay = this.contextKeyService.createOverlay(contextKeys);
        const result = { primary, secondary };
        const menu = this.menuService.getMenuActions(id, contextOverlay, { arg: element.context });
        fillInActionBarActions(menu, result, 'inline');
        return result;
    }
};
TreeActionsProvider = __decorate([
    __param(2, IContextKeyService),
    __param(3, IMenuService),
    __param(4, ICommandService),
    __param(5, ITestProfileService),
    __param(6, IEditorService)
], TreeActionsProvider);
class CreationCache {
    constructor() {
        this.v = new WeakMap();
    }
    get(key) {
        return this.v.get(key);
    }
    getOrCreate(ref, factory) {
        const existing = this.v.get(ref);
        if (existing) {
            return existing;
        }
        const fresh = factory();
        this.v.set(ref, fresh);
        return fresh;
    }
}
const firstLine = (str) => {
    const index = str.indexOf('\n');
    return index === -1 ? str : str.slice(0, index);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0UmVzdWx0c1ZpZXcvdGVzdFJlc3VsdHNUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUs5RixPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXRGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFF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