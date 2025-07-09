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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFckMsTUFBTSxDQUFOLElBQWtCLGVBUWpCO0FBUkQsV0FBa0IsZUFBZTtJQUNoQyx1REFBUyxDQUFBO0lBQ1QseURBQVUsQ0FBQTtJQUNWLDJEQUFXLENBQUE7SUFDWCx5REFBVSxDQUFBO0lBQ1YseURBQVUsQ0FBQTtJQUNWLDJEQUFXLENBQUE7SUFDWCwyREFBVyxDQUFBO0FBQ1osQ0FBQyxFQVJpQixlQUFlLEtBQWYsZUFBZSxRQVFoQztBQUVELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUF1QztJQUNqRiwrQkFBdUIsRUFBRSxPQUFPO0lBQ2hDLGdDQUF3QixFQUFFLFFBQVE7SUFDbEMsaUNBQXlCLEVBQUUsU0FBUztJQUNwQyxnQ0FBd0IsRUFBRSxRQUFRO0lBQ2xDLGdDQUF3QixFQUFFLFFBQVE7SUFDbEMsaUNBQXlCLEVBQUUsU0FBUztJQUNwQyxpQ0FBeUIsRUFBRSxTQUFTO0NBQ3BDLENBQUM7QUFFRixnRUFBZ0U7QUFDaEUsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0QywrREFBTyxD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WUFDOUQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUFDLENBQUM7WUFDbEUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7WUFBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUFDLENBQUM7WUFDOUQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQs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