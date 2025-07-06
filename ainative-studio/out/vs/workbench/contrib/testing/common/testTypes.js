/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { TestId } from './testId.js';
export var TestResultState;
(function (TestResultState) {
    TestResultState[TestResultState["Unset"] = 0] = "Unset";
    TestResultState[TestResultState["Queued"] = 1] = "Queued";
    TestResultState[TestResultState["Running"] = 2] = "Running";
    TestResultState[TestResultState["Passed"] = 3] = "Passed";
    TestResultState[TestResultState["Failed"] = 4] = "Failed";
    TestResultState[TestResultState["Skipped"] = 5] = "Skipped";
    TestResultState[TestResultState["Errored"] = 6] = "Errored";
})(TestResultState || (TestResultState = {}));
export const testResultStateToContextValues = {
    [0 /* TestResultState.Unset */]: 'unset',
    [1 /* TestResultState.Queued */]: 'queued',
    [2 /* TestResultState.Running */]: 'running',
    [3 /* TestResultState.Passed */]: 'passed',
    [4 /* TestResultState.Failed */]: 'failed',
    [5 /* TestResultState.Skipped */]: 'skipped',
    [6 /* TestResultState.Errored */]: 'errored',
};
/** note: keep in sync with TestRunProfileKind in vscode.d.ts */
export var ExtTestRunProfileKind;
(function (ExtTestRunProfileKind) {
    ExtTestRunProfileKind[ExtTestRunProfileKind["Run"] = 1] = "Run";
    ExtTestRunProfileKind[ExtTestRunProfileKind["Debug"] = 2] = "Debug";
    ExtTestRunProfileKind[ExtTestRunProfileKind["Coverage"] = 3] = "Coverage";
})(ExtTestRunProfileKind || (ExtTestRunProfileKind = {}));
export var TestControllerCapability;
(function (TestControllerCapability) {
    TestControllerCapability[TestControllerCapability["Refresh"] = 2] = "Refresh";
    TestControllerCapability[TestControllerCapability["CodeRelatedToTest"] = 4] = "CodeRelatedToTest";
    TestControllerCapability[TestControllerCapability["TestRelatedToCode"] = 8] = "TestRelatedToCode";
})(TestControllerCapability || (TestControllerCapability = {}));
export var TestRunProfileBitset;
(function (TestRunProfileBitset) {
    TestRunProfileBitset[TestRunProfileBitset["Run"] = 2] = "Run";
    TestRunProfileBitset[TestRunProfileBitset["Debug"] = 4] = "Debug";
    TestRunProfileBitset[TestRunProfileBitset["Coverage"] = 8] = "Coverage";
    TestRunProfileBitset[TestRunProfileBitset["HasNonDefaultProfile"] = 16] = "HasNonDefaultProfile";
    TestRunProfileBitset[TestRunProfileBitset["HasConfigurable"] = 32] = "HasConfigurable";
    TestRunProfileBitset[TestRunProfileBitset["SupportsContinuousRun"] = 64] = "SupportsContinuousRun";
})(TestRunProfileBitset || (TestRunProfileBitset = {}));
export const testProfileBitset = {
    [2 /* TestRunProfileBitset.Run */]: localize('testing.runProfileBitset.run', 'Run'),
    [4 /* TestRunProfileBitset.Debug */]: localize('testing.runProfileBitset.debug', 'Debug'),
    [8 /* TestRunProfileBitset.Coverage */]: localize('testing.runProfileBitset.coverage', 'Coverage'),
};
/**
 * List of all test run profile bitset values.
 */
export const testRunProfileBitsetList = [
    2 /* TestRunProfileBitset.Run */,
    4 /* TestRunProfileBitset.Debug */,
    8 /* TestRunProfileBitset.Coverage */,
    16 /* TestRunProfileBitset.HasNonDefaultProfile */,
    32 /* TestRunProfileBitset.HasConfigurable */,
    64 /* TestRunProfileBitset.SupportsContinuousRun */,
];
export const isStartControllerTests = (t) => 'runId' in t;
export var IRichLocation;
(function (IRichLocation) {
    IRichLocation.serialize = (location) => ({
        range: location.range.toJSON(),
        uri: location.uri.toJSON(),
    });
    IRichLocation.deserialize = (uriIdentity, location) => ({
        range: Range.lift(location.range),
        uri: uriIdentity.asCanonicalUri(URI.revive(location.uri)),
    });
})(IRichLocation || (IRichLocation = {}));
export var TestMessageType;
(function (TestMessageType) {
    TestMessageType[TestMessageType["Error"] = 0] = "Error";
    TestMessageType[TestMessageType["Output"] = 1] = "Output";
})(TestMessageType || (TestMessageType = {}));
export var ITestMessageStackFrame;
(function (ITestMessageStackFrame) {
    ITestMessageStackFrame.serialize = (stack) => ({
        label: stack.label,
        uri: stack.uri?.toJSON(),
        position: stack.position?.toJSON(),
    });
    ITestMessageStackFrame.deserialize = (uriIdentity, stack) => ({
        label: stack.label,
        uri: stack.uri ? uriIdentity.asCanonicalUri(URI.revive(stack.uri)) : undefined,
        position: stack.position ? Position.lift(stack.position) : undefined,
    });
})(ITestMessageStackFrame || (ITestMessageStackFrame = {}));
export var ITestErrorMessage;
(function (ITestErrorMessage) {
    ITestErrorMessage.serialize = (message) => ({
        message: message.message,
        type: 0 /* TestMessageType.Error */,
        expected: message.expected,
        actual: message.actual,
        contextValue: message.contextValue,
        location: message.location && IRichLocation.serialize(message.location),
        stackTrace: message.stackTrace?.map(ITestMessageStackFrame.serialize),
    });
    ITestErrorMessage.deserialize = (uriIdentity, message) => ({
        message: message.message,
        type: 0 /* TestMessageType.Error */,
        expected: message.expected,
        actual: message.actual,
        contextValue: message.contextValue,
        location: message.location && IRichLocation.deserialize(uriIdentity, message.location),
        stackTrace: message.stackTrace && message.stackTrace.map(s => ITestMessageStackFrame.deserialize(uriIdentity, s)),
    });
})(ITestErrorMessage || (ITestErrorMessage = {}));
/**
 * Gets the TTY marker ID for either starting or ending
 * an ITestOutputMessage.marker of the given ID.
 */
export const getMarkId = (marker, start) => `${start ? 's' : 'e'}${marker}`;
export var ITestOutputMessage;
(function (ITestOutputMessage) {
    ITestOutputMessage.serialize = (message) => ({
        message: message.message,
        type: 1 /* TestMessageType.Output */,
        offset: message.offset,
        length: message.length,
        location: message.location && IRichLocation.serialize(message.location),
    });
    ITestOutputMessage.deserialize = (uriIdentity, message) => ({
        message: message.message,
        type: 1 /* TestMessageType.Output */,
        offset: message.offset,
        length: message.length,
        location: message.location && IRichLocation.deserialize(uriIdentity, message.location),
    });
})(ITestOutputMessage || (ITestOutputMessage = {}));
export var ITestMessage;
(function (ITestMessage) {
    ITestMessage.serialize = (message) => message.type === 0 /* TestMessageType.Error */ ? ITestErrorMessage.serialize(message) : ITestOutputMessage.serialize(message);
    ITestMessage.deserialize = (uriIdentity, message) => message.type === 0 /* TestMessageType.Error */ ? ITestErrorMessage.deserialize(uriIdentity, message) : ITestOutputMessage.deserialize(uriIdentity, message);
    ITestMessage.isDiffable = (message) => message.type === 0 /* TestMessageType.Error */ && message.actual !== undefined && message.expected !== undefined;
})(ITestMessage || (ITestMessage = {}));
export var ITestTaskState;
(function (ITestTaskState) {
    ITestTaskState.serializeWithoutMessages = (state) => ({
        state: state.state,
        duration: state.duration,
        messages: [],
    });
    ITestTaskState.serialize = (state) => ({
        state: state.state,
        duration: state.duration,
        messages: state.messages.map(ITestMessage.serialize),
    });
    ITestTaskState.deserialize = (uriIdentity, state) => ({
        state: state.state,
        duration: state.duration,
        messages: state.messages.map(m => ITestMessage.deserialize(uriIdentity, m)),
    });
})(ITestTaskState || (ITestTaskState = {}));
const testTagDelimiter = '\0';
export const namespaceTestTag = (ctrlId, tagId) => ctrlId + testTagDelimiter + tagId;
export const denamespaceTestTag = (namespaced) => {
    const index = namespaced.indexOf(testTagDelimiter);
    return { ctrlId: namespaced.slice(0, index), tagId: namespaced.slice(index + 1) };
};
export var ITestItem;
(function (ITestItem) {
    ITestItem.serialize = (item) => ({
        extId: item.extId,
        label: item.label,
        tags: item.tags,
        busy: item.busy,
        children: undefined,
        uri: item.uri?.toJSON(),
        range: item.range?.toJSON() || null,
        description: item.description,
        error: item.error,
        sortText: item.sortText
    });
    ITestItem.deserialize = (uriIdentity, serialized) => ({
        extId: serialized.extId,
        label: serialized.label,
        tags: serialized.tags,
        busy: serialized.busy,
        children: undefined,
        uri: serialized.uri ? uriIdentity.asCanonicalUri(URI.revive(serialized.uri)) : undefined,
        range: serialized.range ? Range.lift(serialized.range) : null,
        description: serialized.description,
        error: serialized.error,
        sortText: serialized.sortText
    });
})(ITestItem || (ITestItem = {}));
export var TestItemExpandState;
(function (TestItemExpandState) {
    TestItemExpandState[TestItemExpandState["NotExpandable"] = 0] = "NotExpandable";
    TestItemExpandState[TestItemExpandState["Expandable"] = 1] = "Expandable";
    TestItemExpandState[TestItemExpandState["BusyExpanding"] = 2] = "BusyExpanding";
    TestItemExpandState[TestItemExpandState["Expanded"] = 3] = "Expanded";
})(TestItemExpandState || (TestItemExpandState = {}));
export var InternalTestItem;
(function (InternalTestItem) {
    InternalTestItem.serialize = (item) => ({
        expand: item.expand,
        item: ITestItem.serialize(item.item)
    });
    InternalTestItem.deserialize = (uriIdentity, serialized) => ({
        // the `controllerId` is derived from the test.item.extId. It's redundant
        // in the non-serialized InternalTestItem too, but there just because it's
        // checked against in many hot paths.
        controllerId: TestId.root(serialized.item.extId),
        expand: serialized.expand,
        item: ITestItem.deserialize(uriIdentity, serialized.item)
    });
})(InternalTestItem || (InternalTestItem = {}));
export var ITestItemUpdate;
(function (ITestItemUpdate) {
    ITestItemUpdate.serialize = (u) => {
        let item;
        if (u.item) {
            item = {};
            if (u.item.label !== undefined) {
                item.label = u.item.label;
            }
            if (u.item.tags !== undefined) {
                item.tags = u.item.tags;
            }
            if (u.item.busy !== undefined) {
                item.busy = u.item.busy;
            }
            if (u.item.uri !== undefined) {
                item.uri = u.item.uri?.toJSON();
            }
            if (u.item.range !== undefined) {
                item.range = u.item.range?.toJSON();
            }
            if (u.item.description !== undefined) {
                item.description = u.item.description;
            }
            if (u.item.error !== undefined) {
                item.error = u.item.error;
            }
            if (u.item.sortText !== undefined) {
                item.sortText = u.item.sortText;
            }
        }
        return { extId: u.extId, expand: u.expand, item };
    };
    ITestItemUpdate.deserialize = (u) => {
        let item;
        if (u.item) {
            item = {};
            if (u.item.label !== undefined) {
                item.label = u.item.label;
            }
            if (u.item.tags !== undefined) {
                item.tags = u.item.tags;
            }
            if (u.item.busy !== undefined) {
                item.busy = u.item.busy;
            }
            if (u.item.range !== undefined) {
                item.range = u.item.range ? Range.lift(u.item.range) : null;
            }
            if (u.item.description !== undefined) {
                item.description = u.item.description;
            }
            if (u.item.error !== undefined) {
                item.error = u.item.error;
            }
            if (u.item.sortText !== undefined) {
                item.sortText = u.item.sortText;
            }
        }
        return { extId: u.extId, expand: u.expand, item };
    };
})(ITestItemUpdate || (ITestItemUpdate = {}));
export const applyTestItemUpdate = (internal, patch) => {
    if (patch.expand !== undefined) {
        internal.expand = patch.expand;
    }
    if (patch.item !== undefined) {
        internal.item = internal.item ? Object.assign(internal.item, patch.item) : patch.item;
    }
};
export var TestResultItem;
(function (TestResultItem) {
    TestResultItem.serializeWithoutMessages = (original) => ({
        ...InternalTestItem.serialize(original),
        ownComputedState: original.ownComputedState,
        computedState: original.computedState,
        tasks: original.tasks.map(ITestTaskState.serializeWithoutMessages),
    });
    TestResultItem.serialize = (original) => ({
        ...InternalTestItem.serialize(original),
        ownComputedState: original.ownComputedState,
        computedState: original.computedState,
        tasks: original.tasks.map(ITestTaskState.serialize),
    });
    TestResultItem.deserialize = (uriIdentity, serialized) => ({
        ...InternalTestItem.deserialize(uriIdentity, serialized),
        ownComputedState: serialized.ownComputedState,
        computedState: serialized.computedState,
        tasks: serialized.tasks.map(m => ITestTaskState.deserialize(uriIdentity, m)),
        retired: true,
    });
})(TestResultItem || (TestResultItem = {}));
export var ICoverageCount;
(function (ICoverageCount) {
    ICoverageCount.empty = () => ({ covered: 0, total: 0 });
    ICoverageCount.sum = (target, src) => {
        target.covered += src.covered;
        target.total += src.total;
    };
})(ICoverageCount || (ICoverageCount = {}));
export var IFileCoverage;
(function (IFileCoverage) {
    IFileCoverage.serialize = (original) => ({
        id: original.id,
        statement: original.statement,
        branch: original.branch,
        declaration: original.declaration,
        testIds: original.testIds,
        uri: original.uri.toJSON(),
    });
    IFileCoverage.deserialize = (uriIdentity, serialized) => ({
        id: serialized.id,
        statement: serialized.statement,
        branch: serialized.branch,
        declaration: serialized.declaration,
        testIds: serialized.testIds,
        uri: uriIdentity.asCanonicalUri(URI.revive(serialized.uri)),
    });
    IFileCoverage.empty = (id, uri) => ({
        id,
        uri,
        statement: ICoverageCount.empty(),
    });
})(IFileCoverage || (IFileCoverage = {}));
function serializeThingWithLocation(serialized) {
    return {
        ...serialized,
        location: serialized.location?.toJSON(),
    };
}
function deserializeThingWithLocation(serialized) {
    serialized.location = serialized.location ? (Position.isIPosition(serialized.location) ? Position.lift(serialized.location) : Range.lift(serialized.location)) : undefined;
    return serialized;
}
/** Number of recent runs in which coverage reports should be retained. */
export const KEEP_N_LAST_COVERAGE_REPORTS = 3;
export var DetailType;
(function (DetailType) {
    DetailType[DetailType["Declaration"] = 0] = "Declaration";
    DetailType[DetailType["Statement"] = 1] = "Statement";
    DetailType[DetailType["Branch"] = 2] = "Branch";
})(DetailType || (DetailType = {}));
export var CoverageDetails;
(function (CoverageDetails) {
    CoverageDetails.serialize = (original) => original.type === 0 /* DetailType.Declaration */ ? IDeclarationCoverage.serialize(original) : IStatementCoverage.serialize(original);
    CoverageDetails.deserialize = (serialized) => serialized.type === 0 /* DetailType.Declaration */ ? IDeclarationCoverage.deserialize(serialized) : IStatementCoverage.deserialize(serialized);
})(CoverageDetails || (CoverageDetails = {}));
export var IBranchCoverage;
(function (IBranchCoverage) {
    IBranchCoverage.serialize = serializeThingWithLocation;
    IBranchCoverage.deserialize = deserializeThingWithLocation;
})(IBranchCoverage || (IBranchCoverage = {}));
export var IDeclarationCoverage;
(function (IDeclarationCoverage) {
    IDeclarationCoverage.serialize = serializeThingWithLocation;
    IDeclarationCoverage.deserialize = deserializeThingWithLocation;
})(IDeclarationCoverage || (IDeclarationCoverage = {}));
export var IStatementCoverage;
(function (IStatementCoverage) {
    IStatementCoverage.serialize = (original) => ({
        ...serializeThingWithLocation(original),
        branches: original.branches?.map(IBranchCoverage.serialize),
    });
    IStatementCoverage.deserialize = (serialized) => ({
        ...deserializeThingWithLocation(serialized),
        branches: serialized.branches?.map(IBranchCoverage.deserialize),
    });
})(IStatementCoverage || (IStatementCoverage = {}));
export var TestDiffOpType;
(function (TestDiffOpType) {
    /** Adds a new test (with children) */
    TestDiffOpType[TestDiffOpType["Add"] = 0] = "Add";
    /** Shallow-updates an existing test */
    TestDiffOpType[TestDiffOpType["Update"] = 1] = "Update";
    /** Ranges of some tests in a document were synced, so it should be considered up-to-date */
    TestDiffOpType[TestDiffOpType["DocumentSynced"] = 2] = "DocumentSynced";
    /** Removes a test (and all its children) */
    TestDiffOpType[TestDiffOpType["Remove"] = 3] = "Remove";
    /** Changes the number of controllers who are yet to publish their collection roots. */
    TestDiffOpType[TestDiffOpType["IncrementPendingExtHosts"] = 4] = "IncrementPendingExtHosts";
    /** Retires a test/result */
    TestDiffOpType[TestDiffOpType["Retire"] = 5] = "Retire";
    /** Add a new test tag */
    TestDiffOpType[TestDiffOpType["AddTag"] = 6] = "AddTag";
    /** Remove a test tag */
    TestDiffOpType[TestDiffOpType["RemoveTag"] = 7] = "RemoveTag";
})(TestDiffOpType || (TestDiffOpType = {}));
export var TestsDiffOp;
(function (TestsDiffOp) {
    TestsDiffOp.deserialize = (uriIdentity, u) => {
        if (u.op === 0 /* TestDiffOpType.Add */) {
            return { op: u.op, item: InternalTestItem.deserialize(uriIdentity, u.item) };
        }
        else if (u.op === 1 /* TestDiffOpType.Update */) {
            return { op: u.op, item: ITestItemUpdate.deserialize(u.item) };
        }
        else if (u.op === 2 /* TestDiffOpType.DocumentSynced */) {
            return { op: u.op, uri: uriIdentity.asCanonicalUri(URI.revive(u.uri)), docv: u.docv };
        }
        else {
            return u;
        }
    };
    TestsDiffOp.serialize = (u) => {
        if (u.op === 0 /* TestDiffOpType.Add */) {
            return { op: u.op, item: InternalTestItem.serialize(u.item) };
        }
        else if (u.op === 1 /* TestDiffOpType.Update */) {
            return { op: u.op, item: ITestItemUpdate.serialize(u.item) };
        }
        else {
            return u;
        }
    };
})(TestsDiffOp || (TestsDiffOp = {}));
/**
 * Maintains tests in this extension host sent from the main thread.
 */
export class AbstractIncrementalTestCollection {
    constructor(uriIdentity) {
        this.uriIdentity = uriIdentity;
        this._tags = new Map();
        /**
         * Map of item IDs to test item objects.
         */
        this.items = new Map();
        /**
         * ID of test root items.
         */
        this.roots = new Set();
        /**
         * Number of 'busy' controllers.
         */
        this.busyControllerCount = 0;
        /**
         * Number of pending roots.
         */
        this.pendingRootCount = 0;
        /**
         * Known test tags.
         */
        this.tags = this._tags;
    }
    /**
     * Applies the diff to the collection.
     */
    apply(diff) {
        const changes = this.createChangeCollector();
        for (const op of diff) {
            switch (op.op) {
                case 0 /* TestDiffOpType.Add */:
                    this.add(InternalTestItem.deserialize(this.uriIdentity, op.item), changes);
                    break;
                case 1 /* TestDiffOpType.Update */:
                    this.update(ITestItemUpdate.deserialize(op.item), changes);
                    break;
                case 3 /* TestDiffOpType.Remove */:
                    this.remove(op.itemId, changes);
                    break;
                case 5 /* TestDiffOpType.Retire */:
                    this.retireTest(op.itemId);
                    break;
                case 4 /* TestDiffOpType.IncrementPendingExtHosts */:
                    this.updatePendingRoots(op.amount);
                    break;
                case 6 /* TestDiffOpType.AddTag */:
                    this._tags.set(op.tag.id, op.tag);
                    break;
                case 7 /* TestDiffOpType.RemoveTag */:
                    this._tags.delete(op.id);
                    break;
            }
        }
        changes.complete?.();
    }
    add(item, changes) {
        const parentId = TestId.parentId(item.item.extId)?.toString();
        let created;
        if (!parentId) {
            created = this.createItem(item);
            this.roots.add(created);
            this.items.set(item.item.extId, created);
        }
        else if (this.items.has(parentId)) {
            const parent = this.items.get(parentId);
            parent.children.add(item.item.extId);
            created = this.createItem(item, parent);
            this.items.set(item.item.extId, created);
        }
        else {
            console.error(`Test with unknown parent ID: ${JSON.stringify(item)}`);
            return;
        }
        changes.add?.(created);
        if (item.expand === 2 /* TestItemExpandState.BusyExpanding */) {
            this.busyControllerCount++;
        }
        return created;
    }
    update(patch, changes) {
        const existing = this.items.get(patch.extId);
        if (!existing) {
            return;
        }
        if (patch.expand !== undefined) {
            if (existing.expand === 2 /* TestItemExpandState.BusyExpanding */) {
                this.busyControllerCount--;
            }
            if (patch.expand === 2 /* TestItemExpandState.BusyExpanding */) {
                this.busyControllerCount++;
            }
        }
        applyTestItemUpdate(existing, patch);
        changes.update?.(existing);
        return existing;
    }
    remove(itemId, changes) {
        const toRemove = this.items.get(itemId);
        if (!toRemove) {
            return;
        }
        const parentId = TestId.parentId(toRemove.item.extId)?.toString();
        if (parentId) {
            const parent = this.items.get(parentId);
            parent.children.delete(toRemove.item.extId);
        }
        else {
            this.roots.delete(toRemove);
        }
        const queue = [[itemId]];
        while (queue.length) {
            for (const itemId of queue.pop()) {
                const existing = this.items.get(itemId);
                if (existing) {
                    queue.push(existing.children);
                    this.items.delete(itemId);
                    changes.remove?.(existing, existing !== toRemove);
                    if (existing.expand === 2 /* TestItemExpandState.BusyExpanding */) {
                        this.busyControllerCount--;
                    }
                }
            }
        }
    }
    /**
     * Called when the extension signals a test result should be retired.
     */
    retireTest(testId) {
        // no-op
    }
    /**
     * Updates the number of test root sources who are yet to report. When
     * the total pending test roots reaches 0, the roots for all controllers
     * will exist in the collection.
     */
    updatePendingRoots(delta) {
        this.pendingRootCount += delta;
    }
    /**
     * Called before a diff is applied to create a new change collector.
     */
    createChangeCollector() {
        return {};
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXJDLE1BQU0sQ0FBTixJQUFrQixlQVFqQjtBQVJELFdBQWtCLGVBQWU7SUFDaEMsdURBQVMsQ0FBQTtJQUNULHlEQUFVLENBQUE7SUFDViwyREFBVyxDQUFBO0lBQ1gseURBQVUsQ0FBQTtJQUNWLHlEQUFVLENBQUE7SUFDViwyREFBVyxDQUFBO0lBQ1gsMkRBQVcsQ0FBQTtBQUNaLENBQUMsRUFSaUIsZUFBZSxLQUFmLGVBQWUsUUFRaEM7QUFFRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBdUM7SUFDakYsK0JBQXVCLEVBQUUsT0FBTztJQUNoQyxnQ0FBd0IsRUFBRSxRQUFRO0lBQ2xDLGlDQUF5QixFQUFFLFNBQVM7SUFDcEMsZ0NBQXdCLEVBQUUsUUFBUTtJQUNsQyxnQ0FBd0IsRUFBRSxRQUFRO0lBQ2xDLGlDQUF5QixFQUFFLFNBQVM7SUFDcEMsaUNBQXlCLEVBQUUsU0FBUztDQUNwQyxDQUFDO0FBRUYsZ0VBQWdFO0FBQ2hFLE1BQU0sQ0FBTixJQUFrQixxQkFJakI7QUFKRCxXQUFrQixxQkFBcUI7SUFDdEMsK0RBQU8sQ0FBQTtJQUNQLG1FQUFTLENBQUE7SUFDVCx5RUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBRUQsTUFBTSxDQUFOLElBQWtCLHdCQUlqQjtBQUpELFdBQWtCLHdCQUF3QjtJQUN6Qyw2RUFBZ0IsQ0FBQTtJQUNoQixpR0FBMEIsQ0FBQTtJQUMxQixpR0FBMEIsQ0FBQTtBQUMzQixDQUFDLEVBSmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFJekM7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBT2pCO0FBUEQsV0FBa0Isb0JBQW9CO0lBQ3JDLDZEQUFZLENBQUE7SUFDWixpRUFBYyxDQUFBO0lBQ2QsdUVBQWlCLENBQUE7SUFDakIsZ0dBQTZCLENBQUE7SUFDN0Isc0ZBQXdCLENBQUE7SUFDeEIsa0dBQThCLENBQUE7QUFDL0IsQ0FBQyxFQVBpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBT3JDO0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUc7SUFDaEMsa0NBQTBCLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLEtBQUssQ0FBQztJQUMzRSxvQ0FBNEIsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsT0FBTyxDQUFDO0lBQ2pGLHVDQUErQixFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxVQUFVLENBQUM7Q0FDMUYsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUc7Ozs7Ozs7Q0FPdkMsQ0FBQztBQXFFRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLENBQWlELEVBQThCLEVBQUUsQ0FBRSxPQUF1QyxJQUFJLENBQUMsQ0FBQztBQTJCdkssTUFBTSxLQUFXLGFBQWEsQ0FlN0I7QUFmRCxXQUFpQixhQUFhO0lBTWhCLHVCQUFTLEdBQUcsQ0FBQyxRQUFpQyxFQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtRQUM5QixHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7S0FDMUIsQ0FBQyxDQUFDO0lBRVUseUJBQVcsR0FBRyxDQUFDLFdBQWtDLEVBQUUsUUFBbUIsRUFBaUIsRUFBRSxDQUFDLENBQUM7UUFDdkcsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUNqQyxHQUFHLEVBQUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN6RCxDQUFDLENBQUM7QUFDSixDQUFDLEVBZmdCLGFBQWEsS0FBYixhQUFhLFFBZTdCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQyx1REFBSyxDQUFBO0lBQ0wseURBQU0sQ0FBQTtBQUNQLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEM7QUFRRCxNQUFNLEtBQVcsc0JBQXNCLENBa0J0QztBQWxCRCxXQUFpQixzQkFBc0I7SUFPekIsZ0NBQVMsR0FBRyxDQUFDLEtBQXVDLEVBQWMsRUFBRSxDQUFDLENBQUM7UUFDbEYsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1FBQ2xCLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRTtRQUN4QixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUU7S0FDbEMsQ0FBQyxDQUFDO0lBRVUsa0NBQVcsR0FBRyxDQUFDLFdBQWtDLEVBQUUsS0FBaUIsRUFBMEIsRUFBRSxDQUFDLENBQUM7UUFDOUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1FBQ2xCLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDOUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQ3BFLENBQUMsQ0FBQztBQUNKLENBQUMsRUFsQmdCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFrQnRDO0FBWUQsTUFBTSxLQUFXLGlCQUFpQixDQThCakM7QUE5QkQsV0FBaUIsaUJBQWlCO0lBV3BCLDJCQUFTLEdBQUcsQ0FBQyxPQUFvQyxFQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztRQUN4QixJQUFJLCtCQUF1QjtRQUMzQixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7UUFDMUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtRQUNsQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDdkUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQztLQUNyRSxDQUFDLENBQUM7SUFFVSw2QkFBVyxHQUFHLENBQUMsV0FBa0MsRUFBRSxPQUFtQixFQUFxQixFQUFFLENBQUMsQ0FBQztRQUMzRyxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDeEIsSUFBSSwrQkFBdUI7UUFDM0IsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1FBQzFCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDbEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUN0RixVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDakgsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxFQTlCZ0IsaUJBQWlCLEtBQWpCLGlCQUFpQixRQThCakM7QUFXRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFjLEVBQUUsS0FBYyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFFN0YsTUFBTSxLQUFXLGtCQUFrQixDQXdCbEM7QUF4QkQsV0FBaUIsa0JBQWtCO0lBU3JCLDRCQUFTLEdBQUcsQ0FBQyxPQUFxQyxFQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztRQUN4QixJQUFJLGdDQUF3QjtRQUM1QixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07UUFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztLQUN2RSxDQUFDLENBQUM7SUFFVSw4QkFBVyxHQUFHLENBQUMsV0FBa0MsRUFBRSxPQUFtQixFQUFzQixFQUFFLENBQUMsQ0FBQztRQUM1RyxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDeEIsSUFBSSxnQ0FBd0I7UUFDNUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDO0tBQ3RGLENBQUMsQ0FBQztBQUNKLENBQUMsRUF4QmdCLGtCQUFrQixLQUFsQixrQkFBa0IsUUF3QmxDO0FBSUQsTUFBTSxLQUFXLFlBQVksQ0FXNUI7QUFYRCxXQUFpQixZQUFZO0lBR2Ysc0JBQVMsR0FBRyxDQUFDLE9BQStCLEVBQWMsRUFBRSxDQUN4RSxPQUFPLENBQUMsSUFBSSxrQ0FBMEIsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFMUcsd0JBQVcsR0FBRyxDQUFDLFdBQWtDLEVBQUUsT0FBbUIsRUFBZ0IsRUFBRSxDQUNwRyxPQUFPLENBQUMsSUFBSSxrQ0FBMEIsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUV4SSx1QkFBVSxHQUFHLENBQUMsT0FBcUIsRUFBdUUsRUFBRSxDQUN4SCxPQUFPLENBQUMsSUFBSSxrQ0FBMEIsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQztBQUMzRyxDQUFDLEVBWGdCLFlBQVksS0FBWixZQUFZLFFBVzVCO0FBUUQsTUFBTSxLQUFXLGNBQWMsQ0F3QjlCO0FBeEJELFdBQWlCLGNBQWM7SUFPakIsdUNBQXdCLEdBQUcsQ0FBQyxLQUFxQixFQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztRQUNsQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7UUFDeEIsUUFBUSxFQUFFLEVBQUU7S0FDWixDQUFDLENBQUM7SUFFVSx3QkFBUyxHQUFHLENBQUMsS0FBK0IsRUFBYyxFQUFFLENBQUMsQ0FBQztRQUMxRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7UUFDbEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1FBQ3hCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO0tBQ3BELENBQUMsQ0FBQztJQUVVLDBCQUFXLEdBQUcsQ0FBQyxXQUFrQyxFQUFFLEtBQWlCLEVBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RHLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztRQUNsQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7UUFDeEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDM0UsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxFQXhCZ0IsY0FBYyxLQUFkLGNBQWMsUUF3QjlCO0FBYUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFFOUIsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQzVCLENBQUMsTUFBYyxFQUFFLEtBQWEsRUFBRSxFQUFFLENBQUMsTUFBTSxHQUFHLGdCQUFnQixHQUFHLEtBQUssQ0FBQztBQUV0RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFVBQWtCLEVBQUUsRUFBRTtJQUN4RCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNuRixDQUFDLENBQUM7QUF1QkYsTUFBTSxLQUFXLFNBQVMsQ0F1Q3pCO0FBdkNELFdBQWlCLFNBQVM7SUFjWixtQkFBUyxHQUFHLENBQUMsSUFBeUIsRUFBYyxFQUFFLENBQUMsQ0FBQztRQUNwRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1FBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtRQUNmLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtRQUNmLFFBQVEsRUFBRSxTQUFTO1FBQ25CLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRTtRQUN2QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxJQUFJO1FBQ25DLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztRQUM3QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDakIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO0tBQ3ZCLENBQUMsQ0FBQztJQUVVLHFCQUFXLEdBQUcsQ0FBQyxXQUFrQyxFQUFFLFVBQXNCLEVBQWEsRUFBRSxDQUFDLENBQUM7UUFDdEcsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO1FBQ3ZCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztRQUN2QixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7UUFDckIsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1FBQ3JCLFFBQVEsRUFBRSxTQUFTO1FBQ25CLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDeEYsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1FBQzdELFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVztRQUNuQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7UUFDdkIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO0tBQzdCLENBQUMsQ0FBQztBQUNKLENBQUMsRUF2Q2dCLFNBQVMsS0FBVCxTQUFTLFFBdUN6QjtBQUVELE1BQU0sQ0FBTixJQUFrQixtQkFLakI7QUFMRCxXQUFrQixtQkFBbUI7SUFDcEMsK0VBQWEsQ0FBQTtJQUNiLHlFQUFVLENBQUE7SUFDViwrRUFBYSxDQUFBO0lBQ2IscUVBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUtwQztBQWNELE1BQU0sS0FBVyxnQkFBZ0IsQ0FtQmhDO0FBbkJELFdBQWlCLGdCQUFnQjtJQU1uQiwwQkFBUyxHQUFHLENBQUMsSUFBZ0MsRUFBYyxFQUFFLENBQUMsQ0FBQztRQUMzRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07UUFDbkIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztLQUNwQyxDQUFDLENBQUM7SUFFVSw0QkFBVyxHQUFHLENBQUMsV0FBa0MsRUFBRSxVQUFzQixFQUFvQixFQUFFLENBQUMsQ0FBQztRQUM3Ryx5RUFBeUU7UUFDekUsMEVBQTBFO1FBQzFFLHFDQUFxQztRQUNyQyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNoRCxNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU07UUFDekIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUM7S0FDekQsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxFQW5CZ0IsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQW1CaEM7QUFXRCxNQUFNLEtBQVcsZUFBZSxDQXdDL0I7QUF4Q0QsV0FBaUIsZUFBZTtJQU9sQix5QkFBUyxHQUFHLENBQUMsQ0FBNEIsRUFBYyxFQUFFO1FBQ3JFLElBQUksSUFBK0MsQ0FBQztRQUNwRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFBQyxDQUFDO1lBQzlELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFBQyxDQUFDO1lBQ2xFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUFDLENBQUM7WUFDeEUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQUMsQ0FBQztZQUNoRixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFBQyxDQUFDO1lBQzlELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUFDLENBQUM7UUFDeEUsQ0FBQztR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