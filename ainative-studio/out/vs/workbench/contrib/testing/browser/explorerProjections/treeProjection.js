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
import { Emitter } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { TestItemTreeElement, TestTreeErrorMessage, getChildrenForParent, testIdentityProvider } from './index.js';
import { isCollapsedInSerializedTestTree } from './testingViewState.js';
import { refreshComputedState } from '../../common/getComputedState.js';
import { TestId } from '../../common/testId.js';
import { ITestResultService } from '../../common/testResultService.js';
import { ITestService } from '../../common/testService.js';
import { applyTestItemUpdate } from '../../common/testTypes.js';
const computedStateAccessor = {
    getOwnState: i => i instanceof TestItemTreeElement ? i.ownState : 0 /* TestResultState.Unset */,
    getCurrentComputedState: i => i.state,
    setComputedState: (i, s) => i.state = s,
    getCurrentComputedDuration: i => i.duration,
    getOwnDuration: i => i instanceof TestItemTreeElement ? i.ownDuration : undefined,
    setComputedDuration: (i, d) => i.duration = d,
    getChildren: i => Iterable.filter(i.children.values(), (t) => t instanceof TreeTestItemElement),
    *getParents(i) {
        for (let parent = i.parent; parent; parent = parent.parent) {
            yield parent;
        }
    },
};
/**
 * Test tree element element that groups be hierarchy.
 */
class TreeTestItemElement extends TestItemTreeElement {
    get description() {
        return this.test.item.description;
    }
    constructor(test, parent, addedOrRemoved) {
        super({ ...test, item: { ...test.item } }, parent);
        this.addedOrRemoved = addedOrRemoved;
        /**
         * Own, non-computed state.
         * @internal
         */
        this.ownState = 0 /* TestResultState.Unset */;
        this.updateErrorVisibility();
    }
    update(patch) {
        applyTestItemUpdate(this.test, patch);
        this.updateErrorVisibility(patch);
        this.fireChange();
    }
    fireChange() {
        this.changeEmitter.fire();
    }
    updateErrorVisibility(patch) {
        if (this.errorChild && (!this.test.item.error || patch?.item?.error)) {
            this.addedOrRemoved(this);
            this.children.delete(this.errorChild);
            this.errorChild = undefined;
        }
        if (this.test.item.error && !this.errorChild) {
            this.errorChild = new TestTreeErrorMessage(this.test.item.error, this);
            this.children.add(this.errorChild);
            this.addedOrRemoved(this);
        }
    }
}
/**
 * Projection that lists tests in their traditional tree view.
 */
let TreeProjection = class TreeProjection extends Disposable {
    /**
     * Gets root elements of the tree.
     */
    get rootsWithChildren() {
        const rootsIt = Iterable.map(this.testService.collection.rootItems, r => this.items.get(r.item.extId));
        return Iterable.filter(rootsIt, (r) => !!r?.children.size);
    }
    constructor(lastState, testService, results) {
        super();
        this.lastState = lastState;
        this.testService = testService;
        this.results = results;
        this.updateEmitter = new Emitter();
        this.changedParents = new Set();
        this.resortedParents = new Set();
        this.items = new Map();
        /**
         * @inheritdoc
         */
        this.onUpdate = this.updateEmitter.event;
        this._register(testService.onDidProcessDiff((diff) => this.applyDiff(diff)));
        // when test results are cleared, recalculate all state
        this._register(results.onResultsChanged((evt) => {
            if (!('removed' in evt)) {
                return;
            }
            for (const inTree of [...this.items.values()].sort((a, b) => b.depth - a.depth)) {
                const lookup = this.results.getStateById(inTree.test.item.extId)?.[1];
                inTree.ownDuration = lookup?.ownDuration;
                refreshComputedState(computedStateAccessor, inTree, lookup?.ownComputedState ?? 0 /* TestResultState.Unset */).forEach(i => i.fireChange());
            }
        }));
        // when test states change, reflect in the tree
        this._register(results.onTestChanged(ev => {
            if (ev.reason === 2 /* TestResultItemChangeReason.NewMessage */) {
                return; // no effect in the tree
            }
            let result = ev.item;
            // if the state is unset, or the latest run is not making the change,
            // double check that it's valid. Retire calls might cause previous
            // emit a state change for a test run that's already long completed.
            if (result.ownComputedState === 0 /* TestResultState.Unset */ || ev.result !== results.results[0]) {
                const fallback = results.getStateById(result.item.extId);
                if (fallback) {
                    result = fallback[1];
                }
            }
            const item = this.items.get(result.item.extId);
            if (!item) {
                return;
            }
            // Skip refreshing the duration if we can trivially tell it didn't change.
            const refreshDuration = ev.reason === 1 /* TestResultItemChangeReason.OwnStateChange */ && ev.previousOwnDuration !== result.ownDuration;
            // For items without children, always use the computed state. They are
            // either leaves (for which it's fine) or nodes where we haven't expanded
            // children and should trust whatever the result service gives us.
            const explicitComputed = item.children.size ? undefined : result.computedState;
            item.retired = !!result.retired;
            item.ownState = result.ownComputedState;
            item.ownDuration = result.ownDuration;
            item.fireChange();
            refreshComputedState(computedStateAccessor, item, explicitComputed, refreshDuration).forEach(i => i.fireChange());
        }));
        for (const test of testService.collection.all) {
            this.storeItem(this.createItem(test));
        }
    }
    /**
     * @inheritdoc
     */
    getElementByTestId(testId) {
        return this.items.get(testId);
    }
    /**
     * @inheritdoc
     */
    applyDiff(diff) {
        for (const op of diff) {
            switch (op.op) {
                case 0 /* TestDiffOpType.Add */: {
                    const item = this.createItem(op.item);
                    this.storeItem(item);
                    break;
                }
                case 1 /* TestDiffOpType.Update */: {
                    const patch = op.item;
                    const existing = this.items.get(patch.extId);
                    if (!existing) {
                        break;
                    }
                    // parent needs to be re-rendered on an expand update, so that its
                    // children are rewritten.
                    const needsParentUpdate = existing.test.expand === 0 /* TestItemExpandState.NotExpandable */ && patch.expand;
                    existing.update(patch);
                    if (needsParentUpdate) {
                        this.changedParents.add(existing.parent);
                    }
                    else {
                        this.resortedParents.add(existing.parent);
                    }
                    break;
                }
                case 3 /* TestDiffOpType.Remove */: {
                    const toRemove = this.items.get(op.itemId);
                    if (!toRemove) {
                        break;
                    }
                    // Removing the first element will cause the root to be hidden.
                    // Changing first-level elements will need the root to re-render if
                    // there are no other controllers with items.
                    const parent = toRemove.parent;
                    const affectsRootElement = toRemove.depth === 1 && (parent?.children.size === 1 || !Iterable.some(this.rootsWithChildren, (_, i) => i === 1));
                    this.changedParents.add(affectsRootElement ? null : parent);
                    const queue = [[toRemove]];
                    while (queue.length) {
                        for (const item of queue.pop()) {
                            if (item instanceof TreeTestItemElement) {
                                queue.push(this.unstoreItem(item));
                            }
                        }
                    }
                    if (parent instanceof TreeTestItemElement) {
                        refreshComputedState(computedStateAccessor, parent, undefined, !!parent.duration).forEach(i => i.fireChange());
                    }
                }
            }
        }
        if (diff.length !== 0) {
            this.updateEmitter.fire();
        }
    }
    /**
     * @inheritdoc
     */
    applyTo(tree) {
        for (const parent of this.changedParents) {
            if (!parent || tree.hasElement(parent)) {
                tree.setChildren(parent, getChildrenForParent(this.lastState, this.rootsWithChildren, parent), { diffIdentityProvider: testIdentityProvider });
            }
        }
        for (const parent of this.resortedParents) {
            if (!parent || tree.hasElement(parent)) {
                tree.resort(parent, false);
            }
        }
        this.changedParents.clear();
        this.resortedParents.clear();
    }
    /**
     * @inheritdoc
     */
    expandElement(element, depth) {
        if (!(element instanceof TreeTestItemElement)) {
            return;
        }
        if (element.test.expand === 0 /* TestItemExpandState.NotExpandable */) {
            return;
        }
        this.testService.collection.expand(element.test.item.extId, depth);
    }
    createItem(item) {
        const parentId = TestId.parentId(item.item.extId);
        const parent = parentId ? this.items.get(parentId) : null;
        return new TreeTestItemElement(item, parent, n => this.changedParents.add(n));
    }
    unstoreItem(treeElement) {
        const parent = treeElement.parent;
        parent?.children.delete(treeElement);
        this.items.delete(treeElement.test.item.extId);
        return treeElement.children;
    }
    storeItem(treeElement) {
        treeElement.parent?.children.add(treeElement);
        this.items.set(treeElement.test.item.extId, treeElement);
        // The first element will cause the root to be shown. The first element of
        // a parent may need to re-render it for #204805.
        const affectsParent = treeElement.parent?.children.size === 1;
        const affectedParent = affectsParent ? treeElement.parent.parent : treeElement.parent;
        this.changedParents.add(affectedParent);
        if (affectedParent?.depth === 0) {
            this.changedParents.add(null);
        }
        if (treeElement.depth === 0 || isCollapsedInSerializedTestTree(this.lastState, treeElement.test.item.extId) === false) {
            this.expandElement(treeElement, 0);
        }
        const prevState = this.results.getStateById(treeElement.test.item.extId)?.[1];
        if (prevState) {
            treeElement.retired = !!prevState.retired;
            treeElement.ownState = prevState.computedState;
            treeElement.ownDuration = prevState.ownDuration;
            refreshComputedState(computedStateAccessor, treeElement, undefined, !!treeElement.ownDuration).forEach(i => i.fireChange());
        }
    }
};
TreeProjection = __decorate([
    __param(1, ITestService),
    __param(2, ITestResultService)
], TreeProjection);
export { TreeProjection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVByb2plY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2V4cGxvcmVyUHJvamVjdGlvbnMvdHJlZVByb2plY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFnRCxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNqSyxPQUFPLEVBQW9DLCtCQUErQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUcsT0FBTyxFQUFxQyxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVoRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFzRyxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXBLLE1BQU0scUJBQXFCLEdBQTJEO0lBQ3JGLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLDhCQUFzQjtJQUN2Rix1QkFBdUIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMs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