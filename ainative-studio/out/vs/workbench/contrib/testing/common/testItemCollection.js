/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Barrier, isThenable, RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { assertNever } from '../../../../base/common/assert.js';
import { applyTestItemUpdate, namespaceTestTag } from './testTypes.js';
import { TestId } from './testId.js';
export var TestItemEventOp;
(function (TestItemEventOp) {
    TestItemEventOp[TestItemEventOp["Upsert"] = 0] = "Upsert";
    TestItemEventOp[TestItemEventOp["SetTags"] = 1] = "SetTags";
    TestItemEventOp[TestItemEventOp["UpdateCanResolveChildren"] = 2] = "UpdateCanResolveChildren";
    TestItemEventOp[TestItemEventOp["RemoveChild"] = 3] = "RemoveChild";
    TestItemEventOp[TestItemEventOp["SetProp"] = 4] = "SetProp";
    TestItemEventOp[TestItemEventOp["Bulk"] = 5] = "Bulk";
    TestItemEventOp[TestItemEventOp["DocumentSynced"] = 6] = "DocumentSynced";
})(TestItemEventOp || (TestItemEventOp = {}));
const strictEqualComparator = (a, b) => a === b;
const diffableProps = {
    range: (a, b) => {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.equalsRange(b);
    },
    busy: strictEqualComparator,
    label: strictEqualComparator,
    description: strictEqualComparator,
    error: strictEqualComparator,
    sortText: strictEqualComparator,
    tags: (a, b) => {
        if (a.length !== b.length) {
            return false;
        }
        if (a.some(t1 => !b.includes(t1))) {
            return false;
        }
        return true;
    },
};
const diffableEntries = Object.entries(diffableProps);
const diffTestItems = (a, b) => {
    let output;
    for (const [key, cmp] of diffableEntries) {
        if (!cmp(a[key], b[key])) {
            if (output) {
                output[key] = b[key];
            }
            else {
                output = { [key]: b[key] };
            }
        }
    }
    return output;
};
/**
 * Maintains a collection of test items for a single controller.
 */
export class TestItemCollection extends Disposable {
    get root() {
        return this.options.root;
    }
    constructor(options) {
        super();
        this.options = options;
        this.debounceSendDiff = this._register(new RunOnceScheduler(() => this.flushDiff(), 200));
        this.diffOpEmitter = this._register(new Emitter());
        this.tree = new Map();
        this.tags = new Map();
        this.diff = [];
        /**
         * Fires when an operation happens that should result in a diff.
         */
        this.onDidGenerateDiff = this.diffOpEmitter.event;
        this.root.canResolveChildren = true;
        this.upsertItem(this.root, undefined);
    }
    /**
     * Handler used for expanding test items.
     */
    set resolveHandler(handler) {
        this._resolveHandler = handler;
        for (const test of this.tree.values()) {
            this.updateExpandability(test);
        }
    }
    get resolveHandler() {
        return this._resolveHandler;
    }
    /**
     * Gets a diff of all changes that have been made, and clears the diff queue.
     */
    collectDiff() {
        const diff = this.diff;
        this.diff = [];
        return diff;
    }
    /**
     * Pushes a new diff entry onto the collected diff list.
     */
    pushDiff(diff) {
        switch (diff.op) {
            case 2 /* TestDiffOpType.DocumentSynced */: {
                for (const existing of this.diff) {
                    if (existing.op === 2 /* TestDiffOpType.DocumentSynced */ && existing.uri === diff.uri) {
                        existing.docv = diff.docv;
                        return;
                    }
                }
                break;
            }
            case 1 /* TestDiffOpType.Update */: {
                // Try to merge updates, since they're invoked per-property
                const last = this.diff[this.diff.length - 1];
                if (last) {
                    if (last.op === 1 /* TestDiffOpType.Update */ && last.item.extId === diff.item.extId) {
                        applyTestItemUpdate(last.item, diff.item);
                        return;
                    }
                    if (last.op === 0 /* TestDiffOpType.Add */ && last.item.item.extId === diff.item.extId) {
                        applyTestItemUpdate(last.item, diff.item);
                        return;
                    }
                }
                break;
            }
        }
        this.diff.push(diff);
        if (!this.debounceSendDiff.isScheduled()) {
            this.debounceSendDiff.schedule();
        }
    }
    /**
     * Expands the test and the given number of `levels` of children. If levels
     * is < 0, then all children will be expanded. If it's 0, then only this
     * item will be expanded.
     */
    expand(testId, levels) {
        const internal = this.tree.get(testId);
        if (!internal) {
            return;
        }
        if (internal.expandLevels === undefined || levels > internal.expandLevels) {
            internal.expandLevels = levels;
        }
        // try to avoid awaiting things if the provider returns synchronously in
        // order to keep everything in a single diff and DOM update.
        if (internal.expand === 1 /* TestItemExpandState.Expandable */) {
            const r = this.resolveChildren(internal);
            return !r.isOpen()
                ? r.wait().then(() => this.expandChildren(internal, levels - 1))
                : this.expandChildren(internal, levels - 1);
        }
        else if (internal.expand === 3 /* TestItemExpandState.Expanded */) {
            return internal.resolveBarrier?.isOpen() === false
                ? internal.resolveBarrier.wait().then(() => this.expandChildren(internal, levels - 1))
                : this.expandChildren(internal, levels - 1);
        }
    }
    dispose() {
        for (const item of this.tree.values()) {
            this.options.getApiFor(item.actual).listener = undefined;
        }
        this.tree.clear();
        this.diff = [];
        super.dispose();
    }
    onTestItemEvent(internal, evt) {
        switch (evt.op) {
            case 3 /* TestItemEventOp.RemoveChild */:
                this.removeItem(TestId.joinToString(internal.fullId, evt.id));
                break;
            case 0 /* TestItemEventOp.Upsert */:
                this.upsertItem(evt.item, internal);
                break;
            case 5 /* TestItemEventOp.Bulk */:
                for (const op of evt.ops) {
                    this.onTestItemEvent(internal, op);
                }
                break;
            case 1 /* TestItemEventOp.SetTags */:
                this.diffTagRefs(evt.new, evt.old, internal.fullId.toString());
                break;
            case 2 /* TestItemEventOp.UpdateCanResolveChildren */:
                this.updateExpandability(internal);
                break;
            case 4 /* TestItemEventOp.SetProp */:
                this.pushDiff({
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: internal.fullId.toString(),
                        item: evt.update,
                    }
                });
                break;
            case 6 /* TestItemEventOp.DocumentSynced */:
                this.documentSynced(internal.actual.uri);
                break;
            default:
                assertNever(evt);
        }
    }
    documentSynced(uri) {
        if (uri) {
            this.pushDiff({
                op: 2 /* TestDiffOpType.DocumentSynced */,
                uri,
                docv: this.options.getDocumentVersion(uri)
            });
        }
    }
    upsertItem(actual, parent) {
        const fullId = TestId.fromExtHostTestItem(actual, this.root.id, parent?.actual);
        // If this test item exists elsewhere in the tree already (exists at an
        // old ID with an existing parent), remove that old item.
        const privateApi = this.options.getApiFor(actual);
        if (privateApi.parent && privateApi.parent !== parent?.actual) {
            this.options.getChildren(privateApi.parent).delete(actual.id);
        }
        let internal = this.tree.get(fullId.toString());
        // Case 1: a brand new item
        if (!internal) {
            internal = {
                fullId,
                actual,
                expandLevels: parent?.expandLevels /* intentionally undefined or 0 */ ? parent.expandLevels - 1 : undefined,
                expand: 0 /* TestItemExpandState.NotExpandable */, // updated by `connectItemAndChildren`
            };
            actual.tags.forEach(this.incrementTagRefs, this);
            this.tree.set(internal.fullId.toString(), internal);
            this.setItemParent(actual, parent);
            this.pushDiff({
                op: 0 /* TestDiffOpType.Add */,
                item: {
                    controllerId: this.options.controllerId,
                    expand: internal.expand,
                    item: this.options.toITestItem(actual),
                },
            });
            this.connectItemAndChildren(actual, internal, parent);
            return;
        }
        // Case 2: re-insertion of an existing item, no-op
        if (internal.actual === actual) {
            this.connectItem(actual, internal, parent); // re-connect in case the parent changed
            return; // no-op
        }
        // Case 3: upsert of an existing item by ID, with a new instance
        if (internal.actual.uri?.toString() !== actual.uri?.toString()) {
            // If the item has a new URI, re-insert it; we don't support updating
            // URIs on existing test items.
            this.removeItem(fullId.toString());
            return this.upsertItem(actual, parent);
        }
        const oldChildren = this.options.getChildren(internal.actual);
        const oldActual = internal.actual;
        const update = diffTestItems(this.options.toITestItem(oldActual), this.options.toITestItem(actual));
        this.options.getApiFor(oldActual).listener = undefined;
        internal.actual = actual;
        internal.resolveBarrier = undefined;
        internal.expand = 0 /* TestItemExpandState.NotExpandable */; // updated by `connectItemAndChildren`
        if (update) {
            // tags are handled in a special way
            if (update.hasOwnProperty('tags')) {
                this.diffTagRefs(actual.tags, oldActual.tags, fullId.toString());
                delete update.tags;
            }
            this.onTestItemEvent(internal, { op: 4 /* TestItemEventOp.SetProp */, update });
        }
        this.connectItemAndChildren(actual, internal, parent);
        // Remove any orphaned children.
        for (const [_, child] of oldChildren) {
            if (!this.options.getChildren(actual).get(child.id)) {
                this.removeItem(TestId.joinToString(fullId, child.id));
            }
        }
        // Re-expand the element if it was previous expanded (#207574)
        const expandLevels = internal.expandLevels;
        if (expandLevels !== undefined) {
            // Wait until a microtask to allow the extension to finish setting up
            // properties of the element and children before we ask it to expand.
            queueMicrotask(() => {
                if (internal.expand === 1 /* TestItemExpandState.Expandable */) {
                    internal.expandLevels = undefined;
                    this.expand(fullId.toString(), expandLevels);
                }
            });
        }
        // Mark ranges in the document as synced (#161320)
        this.documentSynced(internal.actual.uri);
    }
    diffTagRefs(newTags, oldTags, extId) {
        const toDelete = new Set(oldTags.map(t => t.id));
        for (const tag of newTags) {
            if (!toDelete.delete(tag.id)) {
                this.incrementTagRefs(tag);
            }
        }
        this.pushDiff({
            op: 1 /* TestDiffOpType.Update */,
            item: { extId, item: { tags: newTags.map(v => namespaceTestTag(this.options.controllerId, v.id)) } }
        });
        toDelete.forEach(this.decrementTagRefs, this);
    }
    incrementTagRefs(tag) {
        const existing = this.tags.get(tag.id);
        if (existing) {
            existing.refCount++;
        }
        else {
            this.tags.set(tag.id, { refCount: 1 });
            this.pushDiff({
                op: 6 /* TestDiffOpType.AddTag */, tag: {
                    id: namespaceTestTag(this.options.controllerId, tag.id),
                }
            });
        }
    }
    decrementTagRefs(tagId) {
        const existing = this.tags.get(tagId);
        if (existing && !--existing.refCount) {
            this.tags.delete(tagId);
            this.pushDiff({ op: 7 /* TestDiffOpType.RemoveTag */, id: namespaceTestTag(this.options.controllerId, tagId) });
        }
    }
    setItemParent(actual, parent) {
        this.options.getApiFor(actual).parent = parent && parent.actual !== this.root ? parent.actual : undefined;
    }
    connectItem(actual, internal, parent) {
        this.setItemParent(actual, parent);
        const api = this.options.getApiFor(actual);
        api.parent = parent?.actual;
        api.listener = evt => this.onTestItemEvent(internal, evt);
        this.updateExpandability(internal);
    }
    connectItemAndChildren(actual, internal, parent) {
        this.connectItem(actual, internal, parent);
        // Discover any existing children that might have already been added
        for (const [_, child] of this.options.getChildren(actual)) {
            this.upsertItem(child, internal);
        }
    }
    /**
     * Updates the `expand` state of the item. Should be called whenever the
     * resolved state of the item changes. Can automatically expand the item
     * if requested by a consumer.
     */
    updateExpandability(internal) {
        let newState;
        if (!this._resolveHandler) {
            newState = 0 /* TestItemExpandState.NotExpandable */;
        }
        else if (internal.resolveBarrier) {
            newState = internal.resolveBarrier.isOpen()
                ? 3 /* TestItemExpandState.Expanded */
                : 2 /* TestItemExpandState.BusyExpanding */;
        }
        else {
            newState = internal.actual.canResolveChildren
                ? 1 /* TestItemExpandState.Expandable */
                : 0 /* TestItemExpandState.NotExpandable */;
        }
        if (newState === internal.expand) {
            return;
        }
        internal.expand = newState;
        this.pushDiff({ op: 1 /* TestDiffOpType.Update */, item: { extId: internal.fullId.toString(), expand: newState } });
        if (newState === 1 /* TestItemExpandState.Expandable */ && internal.expandLevels !== undefined) {
            this.resolveChildren(internal);
        }
    }
    /**
     * Expands all children of the item, "levels" deep. If levels is 0, only
     * the children will be expanded. If it's 1, the children and their children
     * will be expanded. If it's <0, it's a no-op.
     */
    expandChildren(internal, levels) {
        if (levels < 0) {
            return;
        }
        const expandRequests = [];
        for (const [_, child] of this.options.getChildren(internal.actual)) {
            const promise = this.expand(TestId.joinToString(internal.fullId, child.id), levels);
            if (isThenable(promise)) {
                expandRequests.push(promise);
            }
        }
        if (expandRequests.length) {
            return Promise.all(expandRequests).then(() => { });
        }
    }
    /**
     * Calls `discoverChildren` on the item, refreshing all its tests.
     */
    resolveChildren(internal) {
        if (internal.resolveBarrier) {
            return internal.resolveBarrier;
        }
        if (!this._resolveHandler) {
            const b = new Barrier();
            b.open();
            return b;
        }
        internal.expand = 2 /* TestItemExpandState.BusyExpanding */;
        this.pushExpandStateUpdate(internal);
        const barrier = internal.resolveBarrier = new Barrier();
        const applyError = (err) => {
            console.error(`Unhandled error in resolveHandler of test controller "${this.options.controllerId}"`, err);
        };
        let r;
        try {
            r = this._resolveHandler(internal.actual === this.root ? undefined : internal.actual);
        }
        catch (err) {
            applyError(err);
        }
        if (isThenable(r)) {
            r.catch(applyError).then(() => {
                barrier.open();
                this.updateExpandability(internal);
            });
        }
        else {
            barrier.open();
            this.updateExpandability(internal);
        }
        return internal.resolveBarrier;
    }
    pushExpandStateUpdate(internal) {
        this.pushDiff({ op: 1 /* TestDiffOpType.Update */, item: { extId: internal.fullId.toString(), expand: internal.expand } });
    }
    removeItem(childId) {
        const childItem = this.tree.get(childId);
        if (!childItem) {
            throw new Error('attempting to remove non-existent child');
        }
        this.pushDiff({ op: 3 /* TestDiffOpType.Remove */, itemId: childId });
        const queue = [childItem];
        while (queue.length) {
            const item = queue.pop();
            if (!item) {
                continue;
            }
            this.options.getApiFor(item.actual).listener = undefined;
            for (const tag of item.actual.tags) {
                this.decrementTagRefs(tag.id);
            }
            this.tree.delete(item.fullId.toString());
            for (const [_, child] of this.options.getChildren(item.actual)) {
                queue.push(this.tree.get(TestId.joinToString(item.fullId, child.id)));
            }
        }
    }
    /**
     * Immediately emits any pending diffs on the collection.
     */
    flushDiff() {
        const diff = this.collectDiff();
        if (diff.length) {
            this.diffOpEmitter.fire(diff);
        }
    }
}
export class DuplicateTestItemError extends Error {
    constructor(id) {
        super(`Attempted to insert a duplicate test item ID ${id}`);
    }
}
export class InvalidTestItemError extends Error {
    constructor(id) {
        super(`TestItem with ID "${id}" is invalid. Make sure to create it from the createTestItem method.`);
    }
}
export class MixedTestItemController extends Error {
    constructor(id, ctrlA, ctrlB) {
        super(`TestItem with ID "${id}" is from controller "${ctrlA}" and cannot be added as a child of an item from controller "${ctrlB}".`);
    }
}
export const createTestItemChildren = (api, getApi, checkCtor) => {
    let mapped = new Map();
    return {
        /** @inheritdoc */
        get size() {
            return mapped.size;
        },
        /** @inheritdoc */
        forEach(callback, thisArg) {
            for (const item of mapped.values()) {
                callback.call(thisArg, item, this);
            }
        },
        /** @inheritdoc */
        [Symbol.iterator]() {
            return mapped.entries();
        },
        /** @inheritdoc */
        replace(items) {
            const newMapped = new Map();
            const toDelete = new Set(mapped.keys());
            const bulk = { op: 5 /* TestItemEventOp.Bulk */, ops: [] };
            for (const item of items) {
                if (!(item instanceof checkCtor)) {
                    throw new InvalidTestItemError(item.id);
                }
                const itemController = getApi(item).controllerId;
                if (itemController !== api.controllerId) {
                    throw new MixedTestItemController(item.id, itemController, api.controllerId);
                }
                if (newMapped.has(item.id)) {
                    throw new DuplicateTestItemError(item.id);
                }
                newMapped.set(item.id, item);
                toDelete.delete(item.id);
                bulk.ops.push({ op: 0 /* TestItemEventOp.Upsert */, item });
            }
            for (const id of toDelete.keys()) {
                bulk.ops.push({ op: 3 /* TestItemEventOp.RemoveChild */, id });
            }
            api.listener?.(bulk);
            // important mutations come after firing, so if an error happens no
            // changes will be "saved":
            mapped = newMapped;
        },
        /** @inheritdoc */
        add(item) {
            if (!(item instanceof checkCtor)) {
                throw new InvalidTestItemError(item.id);
            }
            mapped.set(item.id, item);
            api.listener?.({ op: 0 /* TestItemEventOp.Upsert */, item });
        },
        /** @inheritdoc */
        delete(id) {
            if (mapped.delete(id)) {
                api.listener?.({ op: 3 /* TestItemEventOp.RemoveChild */, id });
            }
        },
        /** @inheritdoc */
        get(itemId) {
            return mapped.get(itemId);
        },
        /** JSON serialization function. */
        toJSON() {
            return Array.from(mapped.values());
        },
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEl0ZW1Db2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RJdGVtQ29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBdUIsZ0JBQWdCLEVBQStELE1BQU0sZ0JBQWdCLENBQUM7QUFDekosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQWlCckMsTUFBTSxDQUFOLElBQWtCLGVBUWpCO0FBUkQsV0FBa0IsZUFBZTtJQUNoQyx5REFBTSxDQUFBO0lBQ04sMkRBQU8sQ0FBQTtJQUNQLDZGQUF3QixDQUFBO0lBQ3hCLG1FQUFXLENBQUE7SUFDWCwyREFBTyxDQUFBO0lBQ1AscURBQUksQ0FBQTtJQUNKLHlFQUFjLENBQUE7QUFDZixDQUFDLEVBUmlCLGVBQWUsS0FBZixlQUFlLFFBUWhDO0FBdUVELE1BQU0scUJBQXFCLEdBQUcsQ0FBSSxDQUFJLEVBQUUsQ0FBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pELE1BQU0sYUFBYSxHQUErRTtJQUNqRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUs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