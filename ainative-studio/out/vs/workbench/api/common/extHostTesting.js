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
import { RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { isDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { InvalidTestItemError } from '../../contrib/testing/common/testItemCollection.js';
import { AbstractIncrementalTestCollection, TestsDiffOp, isStartControllerTests } from '../../contrib/testing/common/testTypes.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostCommands } from './extHostCommands.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostTestItemCollection, TestItemImpl, TestItemRootImpl, toItemFromContext } from './extHostTestItem.js';
import * as Convert from './extHostTypeConverters.js';
import { FileCoverage, TestRunProfileBase, TestRunRequest } from './extHostTypes.js';
let followupCounter = 0;
const testResultInternalIDs = new WeakMap();
export const IExtHostTesting = createDecorator('IExtHostTesting');
let ExtHostTesting = class ExtHostTesting extends Disposable {
    constructor(rpc, logService, commands, editors) {
        super();
        this.logService = logService;
        this.commands = commands;
        this.editors = editors;
        this.resultsChangedEmitter = this._register(new Emitter());
        this.controllers = new Map();
        this.defaultProfilesChangedEmitter = this._register(new Emitter());
        this.followupProviders = new Set();
        this.testFollowups = new Map();
        this.onResultsChanged = this.resultsChangedEmitter.event;
        this.results = [];
        this.proxy = rpc.getProxy(MainContext.MainThreadTesting);
        this.observer = new TestObservers(this.proxy);
        this.runTracker = new TestRunCoordinator(this.proxy, logService);
        commands.registerArgumentProcessor({
            processArgument: arg => {
                switch (arg?.$mid) {
                    case 16 /* MarshalledId.TestItemContext */: {
                        const cast = arg;
                        const targetTest = cast.tests[cast.tests.length - 1].item.extId;
                        const controller = this.controllers.get(TestId.root(targetTest));
                        return controller?.collection.tree.get(targetTest)?.actual ?? toItemFromContext(arg);
                    }
                    case 18 /* MarshalledId.TestMessageMenuArgs */: {
                        const { test, message } = arg;
                        const extId = test.item.extId;
                        return {
                            test: this.controllers.get(TestId.root(extId))?.collection.tree.get(extId)?.actual
                                ?? toItemFromContext({ $mid: 16 /* MarshalledId.TestItemContext */, tests: [test] }),
                            message: Convert.TestMessage.to(message),
                        };
                    }
                    default: return arg;
                }
            }
        });
        commands.registerCommand(false, 'testing.getExplorerSelection', async () => {
            const inner = await commands.executeCommand("_testing.getExplorerSelection" /* TestCommandId.GetExplorerSelection */);
            const lookup = (i) => {
                const controller = this.controllers.get(TestId.root(i));
                if (!controller) {
                    return undefined;
                }
                return TestId.isRoot(i) ? controller.controller : controller.collection.tree.get(i)?.actual;
            };
            return {
                include: inner?.include.map(lookup).filter(isDefined) || [],
                exclude: inner?.exclude.map(lookup).filter(isDefined) || [],
            };
        });
    }
    //#region public API
    /**
     * Implements vscode.test.registerTestProvider
     */
    createTestController(extension, controllerId, label, refreshHandler) {
        if (this.controllers.has(controllerId)) {
            throw new Error(`Attempt to insert a duplicate controller with ID "${controllerId}"`);
        }
        const disposable = new DisposableStore();
        const collection = disposable.add(new ExtHostTestItemCollection(controllerId, label, this.editors));
        collection.root.label = label;
        const profiles = new Map();
        const activeProfiles = new Set();
        const proxy = this.proxy;
        const getCapability = () => {
            let cap = 0;
            if (refreshHandler) {
                cap |= 2 /* TestControllerCapability.Refresh */;
            }
            const rcp = info.relatedCodeProvider;
            if (rcp) {
                if (rcp?.provideRelatedTests) {
                    cap |= 8 /* TestControllerCapability.TestRelatedToCode */;
                }
                if (rcp?.provideRelatedCode) {
                    cap |= 4 /* TestControllerCapability.CodeRelatedToTest */;
                }
            }
            return cap;
        };
        const controller = {
            items: collection.root.children,
            get label() {
                return label;
            },
            set label(value) {
                label = value;
                collection.root.label = value;
                proxy.$updateController(controllerId, { label });
            },
            get refreshHandler() {
                return refreshHandler;
            },
            set refreshHandler(value) {
                refreshHandler = value;
                proxy.$updateController(controllerId, { capabilities: getCapability() });
            },
            get id() {
                return controllerId;
            },
            get relatedCodeProvider() {
                return info.relatedCodeProvider;
            },
            set relatedCodeProvider(value) {
                checkProposedApiEnabled(extension, 'testRelatedCode');
                info.relatedCodeProvider = value;
                proxy.$updateController(controllerId, { capabilities: getCapability() });
            },
            createRunProfile: (label, group, runHandler, isDefault, tag, supportsContinuousRun) => {
                // Derive the profile ID from a hash so that the same profile will tend
                // to have the same hashes, allowing re-run requests to work across reloads.
                let profileId = hash(label);
                while (profiles.has(profileId)) {
                    profileId++;
                }
                return new TestRunProfileImpl(this.proxy, profiles, activeProfiles, this.defaultProfilesChangedEmitter.event, controllerId, profileId, label, group, runHandler, isDefault, tag, supportsContinuousRun);
            },
            createTestItem(id, label, uri) {
                return new TestItemImpl(controllerId, id, label, uri);
            },
            createTestRun: (request, name, persist = true) => {
                return this.runTracker.createTestRun(extension, controllerId, collection, request, name, persist);
            },
            invalidateTestResults: items => {
                if (items === undefined) {
                    this.proxy.$markTestRetired(undefined);
                }
                else {
                    const itemsArr = items instanceof Array ? items : [items];
                    this.proxy.$markTestRetired(itemsArr.map(i => TestId.fromExtHostTestItem(i, controllerId).toString()));
                }
            },
            set resolveHandler(fn) {
                collection.resolveHandler = fn;
            },
            get resolveHandler() {
                return collection.resolveHandler;
            },
            dispose: () => {
                disposable.dispose();
            },
        };
        const info = { controller, collection, profiles, extension, activeProfiles };
        proxy.$registerTestController(controllerId, label, getCapability());
        disposable.add(toDisposable(() => proxy.$unregisterTestController(controllerId)));
        this.controllers.set(controllerId, info);
        disposable.add(toDisposable(() => this.controllers.delete(controllerId)));
        disposable.add(collection.onDidGenerateDiff(diff => proxy.$publishDiff(controllerId, diff.map(TestsDiffOp.serialize))));
        return controller;
    }
    /**
     * Implements vscode.test.createTestObserver
     */
    createTestObserver() {
        return this.observer.checkout();
    }
    /**
     * Implements vscode.test.runTests
     */
    async runTests(req, token = CancellationToken.None) {
        const profile = tryGetProfileFromTestRunReq(req);
        if (!profile) {
            throw new Error('The request passed to `vscode.test.runTests` must include a profile');
        }
        const controller = this.controllers.get(profile.controllerId);
        if (!controller) {
            throw new Error('Controller not found');
        }
        await this.proxy.$runTests({
            preserveFocus: req.preserveFocus ?? true,
            group: Convert.TestRunProfileKind.from(profile.kind),
            targets: [{
                    testIds: req.include?.map(t => TestId.fromExtHostTestItem(t, controller.collection.root.id).toString()) ?? [controller.collection.root.id],
                    profileId: profile.profileId,
                    controllerId: profile.controllerId,
                }],
            exclude: req.exclude?.map(t => t.id),
        }, token);
    }
    /**
     * Implements vscode.test.registerTestFollowupProvider
     */
    registerTestFollowupProvider(provider) {
        this.followupProviders.add(provider);
        return { dispose: () => { this.followupProviders.delete(provider); } };
    }
    //#endregion
    //#region RPC methods
    /**
     * @inheritdoc
     */
    async $getTestsRelatedToCode(uri, _position, token) {
        const doc = this.editors.getDocument(URI.revive(uri));
        if (!doc) {
            return [];
        }
        const position = Convert.Position.to(_position);
        const related = [];
        await Promise.all([...this.controllers.values()].map(async (c) => {
            let tests;
            try {
                tests = await c.relatedCodeProvider?.provideRelatedTests?.(doc.document, position, token);
            }
            catch (e) {
                if (!token.isCancellationRequested) {
                    this.logService.warn(`Error thrown while providing related tests for ${c.controller.label}`, e);
                }
            }
            if (tests) {
                for (const test of tests) {
                    related.push(TestId.fromExtHostTestItem(test, c.controller.id).toString());
                }
                c.collection.flushDiff();
            }
        }));
        return related;
    }
    /**
     * @inheritdoc
     */
    async $getCodeRelatedToTest(testId, token) {
        const controller = this.controllers.get(TestId.root(testId));
        if (!controller) {
            return [];
        }
        const test = controller.collection.tree.get(testId);
        if (!test) {
            return [];
        }
        const locations = await controller.relatedCodeProvider?.provideRelatedCode?.(test.actual, token);
        return locations?.map(Convert.location.from) ?? [];
    }
    /**
     * @inheritdoc
     */
    $syncTests() {
        for (const { collection } of this.controllers.values()) {
            collection.flushDiff();
        }
        return Promise.resolve();
    }
    /**
     * @inheritdoc
     */
    async $getCoverageDetails(coverageId, testId, token) {
        const details = await this.runTracker.getCoverageDetails(coverageId, testId, token);
        return details?.map(Convert.TestCoverage.fromDetails);
    }
    /**
     * @inheritdoc
     */
    async $disposeRun(runId) {
        this.runTracker.disposeTestRun(runId);
    }
    /** @inheritdoc */
    $configureRunProfile(controllerId, profileId) {
        this.controllers.get(controllerId)?.profiles.get(profileId)?.configureHandler?.();
    }
    /** @inheritdoc */
    $setDefaultRunProfiles(profiles) {
        const evt = new Map();
        for (const [controllerId, profileIds] of Object.entries(profiles)) {
            const ctrl = this.controllers.get(controllerId);
            if (!ctrl) {
                continue;
            }
            const changes = new Map();
            const added = profileIds.filter(id => !ctrl.activeProfiles.has(id));
            const removed = [...ctrl.activeProfiles].filter(id => !profileIds.includes(id));
            for (const id of added) {
                changes.set(id, true);
                ctrl.activeProfiles.add(id);
            }
            for (const id of removed) {
                changes.set(id, false);
                ctrl.activeProfiles.delete(id);
            }
            if (changes.size) {
                evt.set(controllerId, changes);
            }
        }
        this.defaultProfilesChangedEmitter.fire(evt);
    }
    /** @inheritdoc */
    async $refreshTests(controllerId, token) {
        await this.controllers.get(controllerId)?.controller.refreshHandler?.(token);
    }
    /**
     * Updates test results shown to extensions.
     * @override
     */
    $publishTestResults(results) {
        this.results = Object.freeze(results
            .map(r => {
            const o = Convert.TestResults.to(r);
            const taskWithCoverage = r.tasks.findIndex(t => t.hasCoverage);
            if (taskWithCoverage !== -1) {
                o.getDetailedCoverage = (uri, token = CancellationToken.None) => this.proxy.$getCoverageDetails(r.id, taskWithCoverage, uri, token).then(r => r.map(Convert.TestCoverage.to));
            }
            testResultInternalIDs.set(o, r.id);
            return o;
        })
            .concat(this.results)
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, 32));
        this.resultsChangedEmitter.fire();
    }
    /**
     * Expands the nodes in the test tree. If levels is less than zero, it will
     * be treated as infinite.
     */
    async $expandTest(testId, levels) {
        const collection = this.controllers.get(TestId.fromString(testId).controllerId)?.collection;
        if (collection) {
            await collection.expand(testId, levels < 0 ? Infinity : levels);
            collection.flushDiff();
        }
    }
    /**
     * Receives a test update from the main thread. Called (eventually) whenever
     * tests change.
     */
    $acceptDiff(diff) {
        this.observer.applyDiff(diff.map(d => TestsDiffOp.deserialize({ asCanonicalUri: u => u }, d)));
    }
    /**
     * Runs tests with the given set of IDs. Allows for test from multiple
     * providers to be run.
     * @inheritdoc
     */
    async $runControllerTests(reqs, token) {
        return Promise.all(reqs.map(req => this.runControllerTestRequest(req, false, token)));
    }
    /**
     * Starts continuous test runs with the given set of IDs. Allows for test from
     * multiple providers to be run.
     * @inheritdoc
     */
    async $startContinuousRun(reqs, token) {
        const cts = new CancellationTokenSource(token);
        const res = await Promise.all(reqs.map(req => this.runControllerTestRequest(req, true, cts.token)));
        // avoid returning until cancellation is requested, otherwise ipc disposes of the token
        if (!token.isCancellationRequested && !res.some(r => r.error)) {
            await new Promise(r => token.onCancellationRequested(r));
        }
        cts.dispose(true);
        return res;
    }
    /** @inheritdoc */
    async $provideTestFollowups(req, token) {
        const results = this.results.find(r => testResultInternalIDs.get(r) === req.resultId);
        const test = results && findTestInResultSnapshot(TestId.fromString(req.extId), results?.results);
        if (!test) {
            return [];
        }
        let followups = [];
        await Promise.all([...this.followupProviders].map(async (provider) => {
            try {
                const r = await provider.provideFollowup(results, test, req.taskIndex, req.messageIndex, token);
                if (r) {
                    followups = followups.concat(r);
                }
            }
            catch (e) {
                this.logService.error(`Error thrown while providing followup for test message`, e);
            }
        }));
        if (token.isCancellationRequested) {
            return [];
        }
        return followups.map(command => {
            const id = followupCounter++;
            this.testFollowups.set(id, command);
            return { title: command.title, id };
        });
    }
    $disposeTestFollowups(id) {
        for (const i of id) {
            this.testFollowups.delete(i);
        }
    }
    $executeTestFollowup(id) {
        const command = this.testFollowups.get(id);
        if (!command) {
            return Promise.resolve();
        }
        return this.commands.executeCommand(command.command, ...(command.arguments || []));
    }
    /**
     * Cancels an ongoing test run.
     */
    $cancelExtensionTestRun(runId, taskId) {
        if (runId === undefined) {
            this.runTracker.cancelAllRuns();
        }
        else {
            this.runTracker.cancelRunById(runId, taskId);
        }
    }
    //#endregion
    getMetadataForRun(run) {
        for (const tracker of this.runTracker.trackers) {
            const taskId = tracker.getTaskIdForRun(run);
            if (taskId) {
                return { taskId, runId: tracker.id };
            }
        }
        return undefined;
    }
    async runControllerTestRequest(req, isContinuous, token) {
        const lookup = this.controllers.get(req.controllerId);
        if (!lookup) {
            return {};
        }
        const { collection, profiles, extension } = lookup;
        const profile = profiles.get(req.profileId);
        if (!profile) {
            return {};
        }
        const includeTests = req.testIds
            .map((testId) => collection.tree.get(testId))
            .filter(isDefined);
        const excludeTests = req.excludeExtIds
            .map(id => lookup.collection.tree.get(id))
            .filter(isDefined)
            .filter(exclude => includeTests.some(include => include.fullId.compare(exclude.fullId) === 2 /* TestPosition.IsChild */));
        if (!includeTests.length) {
            return {};
        }
        const publicReq = new TestRunRequest(includeTests.some(i => i.actual instanceof TestItemRootImpl) ? undefined : includeTests.map(t => t.actual), excludeTests.map(t => t.actual), profile, isContinuous);
        const tracker = isStartControllerTests(req) && this.runTracker.prepareForMainThreadTestRun(extension, publicReq, TestRunDto.fromInternal(req, lookup.collection), profile, token);
        try {
            await profile.runHandler(publicReq, token);
            return {};
        }
        catch (e) {
            return { error: String(e) };
        }
        finally {
            if (tracker) {
                if (tracker.hasRunningTasks && !token.isCancellationRequested) {
                    await Event.toPromise(tracker.onEnd);
                }
            }
        }
    }
};
ExtHostTesting = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostCommands),
    __param(3, IExtHostDocumentsAndEditors)
], ExtHostTesting);
export { ExtHostTesting };
// Deadline after being requested by a user that a test run is forcibly cancelled.
const RUN_CANCEL_DEADLINE = 10_000;
var TestRunTrackerState;
(function (TestRunTrackerState) {
    // Default state
    TestRunTrackerState[TestRunTrackerState["Running"] = 0] = "Running";
    // Cancellation is requested, but the run is still going.
    TestRunTrackerState[TestRunTrackerState["Cancelling"] = 1] = "Cancelling";
    // All tasks have ended
    TestRunTrackerState[TestRunTrackerState["Ended"] = 2] = "Ended";
})(TestRunTrackerState || (TestRunTrackerState = {}));
class TestRunTracker extends Disposable {
    /**
     * Gets whether there are any tests running.
     */
    get hasRunningTasks() {
        return this.running > 0;
    }
    /**
     * Gets the run ID.
     */
    get id() {
        return this.dto.id;
    }
    constructor(dto, proxy, logService, profile, extension, parentToken) {
        super();
        this.dto = dto;
        this.proxy = proxy;
        this.logService = logService;
        this.profile = profile;
        this.extension = extension;
        this.state = 0 /* TestRunTrackerState.Running */;
        this.running = 0;
        this.tasks = new Map();
        this.sharedTestIds = new Set();
        this.endEmitter = this._register(new Emitter());
        this.publishedCoverage = new Map();
        /**
         * Fires when a test ends, and no more tests are left running.
         */
        this.onEnd = this.endEmitter.event;
        this.cts = this._register(new CancellationTokenSource(parentToken));
        const forciblyEnd = this._register(new RunOnceScheduler(() => this.forciblyEndTasks(), RUN_CANCEL_DEADLINE));
        this._register(this.cts.token.onCancellationRequested(() => forciblyEnd.schedule()));
        const didDisposeEmitter = new Emitter();
        this.onDidDispose = didDisposeEmitter.event;
        this._register(toDisposable(() => {
            didDisposeEmitter.fire();
            didDisposeEmitter.dispose();
        }));
    }
    /** Gets the task ID from a test run object. */
    getTaskIdForRun(run) {
        for (const [taskId, { run: r }] of this.tasks) {
            if (r === run) {
                return taskId;
            }
        }
        return undefined;
    }
    /** Requests cancellation of the run. On the second call, forces cancellation. */
    cancel(taskId) {
        if (taskId) {
            this.tasks.get(taskId)?.cts.cancel();
        }
        else if (this.state === 0 /* TestRunTrackerState.Running */) {
            this.cts.cancel();
            this.state = 1 /* TestRunTrackerState.Cancelling */;
        }
        else if (this.state === 1 /* TestRunTrackerState.Cancelling */) {
            this.forciblyEndTasks();
        }
    }
    /** Gets details for a previously-emitted coverage object. */
    async getCoverageDetails(id, testId, token) {
        const [, taskId] = TestId.fromString(id).path; /** runId, taskId, URI */
        const coverage = this.publishedCoverage.get(id);
        if (!coverage) {
            return [];
        }
        const { report, extIds } = coverage;
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('unreachable: run task was not found');
        }
        let testItem;
        if (testId && report instanceof FileCoverage) {
            const index = extIds.indexOf(testId);
            if (index === -1) {
                return []; // ??
            }
            testItem = report.includesTests[index];
        }
        const details = testItem
            ? this.profile?.loadDetailedCoverageForTest?.(task.run, report, testItem, token)
            : this.profile?.loadDetailedCoverage?.(task.run, report, token);
        return (await details) ?? [];
    }
    /** Creates the public test run interface to give to extensions. */
    createRun(name) {
        const runId = this.dto.id;
        const ctrlId = this.dto.controllerId;
        const taskId = generateUuid();
        const guardTestMutation = (fn) => (test, ...args) => {
            if (ended) {
                this.logService.warn(`Setting the state of test "${test.id}" is a no-op after the run ends.`);
                return;
            }
            this.ensureTestIsKnown(test);
            fn(test, ...args);
        };
        const appendMessages = (test, messages) => {
            const converted = messages instanceof Array
                ? messages.map(Convert.TestMessage.from)
                : [Convert.TestMessage.from(messages)];
            if (test.uri && test.range) {
                const defaultLocation = { range: Convert.Range.from(test.range), uri: test.uri };
                for (const message of converted) {
                    message.location = message.location || defaultLocation;
                }
            }
            this.proxy.$appendTestMessagesInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), converted);
        };
        let ended = false;
        // tasks are alive for as long as the tracker is alive, so simple this._register is fine:
        const cts = this._register(new CancellationTokenSource(this.cts.token));
        // one-off map used to associate test items with incrementing IDs in `addCoverage`.
        // There's no need to include their entire ID, we just want to make sure they're
        // stable and unique. Normal map is okay since TestRun lifetimes are limited.
        const run = {
            isPersisted: this.dto.isPersisted,
            token: cts.token,
            name,
            onDidDispose: this.onDidDispose,
            addCoverage: (coverage) => {
                if (ended) {
                    return;
                }
                const includesTests = coverage instanceof FileCoverage ? coverage.includesTests : [];
                if (includesTests.length) {
                    for (const test of includesTests) {
                        this.ensureTestIsKnown(test);
                    }
                }
                const uriStr = coverage.uri.toString();
                const id = new TestId([runId, taskId, uriStr]).toString();
                // it's a lil funky, but it's possible for a test item's ID to change after
                // it's been reported if it's rehomed under a different parent. Record its
                // ID at the time when the coverage report is generated so we can reference
                // it later if needeed.
                this.publishedCoverage.set(id, { report: coverage, extIds: includesTests.map(t => TestId.fromExtHostTestItem(t, ctrlId).toString()) });
                this.proxy.$appendCoverage(runId, taskId, Convert.TestCoverage.fromFile(ctrlId, id, coverage));
            },
            //#region state mutation
            enqueued: guardTestMutation(test => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 1 /* TestResultState.Queued */);
            }),
            skipped: guardTestMutation(test => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 5 /* TestResultState.Skipped */);
            }),
            started: guardTestMutation(test => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 2 /* TestResultState.Running */);
            }),
            errored: guardTestMutation((test, messages, duration) => {
                appendMessages(test, messages);
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 6 /* TestResultState.Errored */, duration);
            }),
            failed: guardTestMutation((test, messages, duration) => {
                appendMessages(test, messages);
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 4 /* TestResultState.Failed */, duration);
            }),
            passed: guardTestMutation((test, duration) => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, this.dto.controllerId).toString(), 3 /* TestResultState.Passed */, duration);
            }),
            //#endregion
            appendOutput: (output, location, test) => {
                if (ended) {
                    return;
                }
                if (test) {
                    this.ensureTestIsKnown(test);
                }
                this.proxy.$appendOutputToRun(runId, taskId, VSBuffer.fromString(output), location && Convert.location.from(location), test && TestId.fromExtHostTestItem(test, ctrlId).toString());
            },
            end: () => {
                if (ended) {
                    return;
                }
                ended = true;
                this.proxy.$finishedTestRunTask(runId, taskId);
                if (!--this.running) {
                    this.markEnded();
                }
            }
        };
        this.running++;
        this.tasks.set(taskId, { run, cts });
        this.proxy.$startedTestRunTask(runId, {
            id: taskId,
            ctrlId: this.dto.controllerId,
            name: name || this.extension.displayName || this.extension.identifier.value,
            running: true,
        });
        return run;
    }
    forciblyEndTasks() {
        for (const { run } of this.tasks.values()) {
            run.end();
        }
    }
    markEnded() {
        if (this.state !== 2 /* TestRunTrackerState.Ended */) {
            this.state = 2 /* TestRunTrackerState.Ended */;
            this.endEmitter.fire();
        }
    }
    ensureTestIsKnown(test) {
        if (!(test instanceof TestItemImpl)) {
            throw new InvalidTestItemError(test.id);
        }
        if (this.sharedTestIds.has(TestId.fromExtHostTestItem(test, this.dto.controllerId).toString())) {
            return;
        }
        const chain = [];
        const root = this.dto.colllection.root;
        while (true) {
            const converted = Convert.TestItem.from(test);
            chain.unshift(converted);
            if (this.sharedTestIds.has(converted.extId)) {
                break;
            }
            this.sharedTestIds.add(converted.extId);
            if (test === root) {
                break;
            }
            test = test.parent || root;
        }
        this.proxy.$addTestsToRun(this.dto.controllerId, this.dto.id, chain);
    }
    dispose() {
        this.markEnded();
        super.dispose();
    }
}
/**
 * Queues runs for a single extension and provides the currently-executing
 * run so that `createTestRun` can be properly correlated.
 */
export class TestRunCoordinator {
    get trackers() {
        return this.tracked.values();
    }
    constructor(proxy, logService) {
        this.proxy = proxy;
        this.logService = logService;
        this.tracked = new Map();
        this.trackedById = new Map();
    }
    /**
     * Gets a coverage report for a given run and task ID.
     */
    getCoverageDetails(id, testId, token) {
        const runId = TestId.root(id);
        return this.trackedById.get(runId)?.getCoverageDetails(id, testId, token) || [];
    }
    /**
     * Disposes the test run, called when the main thread is no longer interested
     * in associated data.
     */
    disposeTestRun(runId) {
        this.trackedById.get(runId)?.dispose();
        this.trackedById.delete(runId);
        for (const [req, { id }] of this.tracked) {
            if (id === runId) {
                this.tracked.delete(req);
            }
        }
    }
    /**
     * Registers a request as being invoked by the main thread, so
     * `$startedExtensionTestRun` is not invoked. The run must eventually
     * be cancelled manually.
     */
    prepareForMainThreadTestRun(extension, req, dto, profile, token) {
        return this.getTracker(req, dto, profile, extension, token);
    }
    /**
     * Cancels an existing test run via its cancellation token.
     */
    cancelRunById(runId, taskId) {
        this.trackedById.get(runId)?.cancel(taskId);
    }
    /**
     * Cancels an existing test run via its cancellation token.
     */
    cancelAllRuns() {
        for (const tracker of this.tracked.values()) {
            tracker.cancel();
        }
    }
    /**
     * Implements the public `createTestRun` API.
     */
    createTestRun(extension, controllerId, collection, request, name, persist) {
        const existing = this.tracked.get(request);
        if (existing) {
            return existing.createRun(name);
        }
        // If there is not an existing tracked extension for the request, start
        // a new, detached session.
        const dto = TestRunDto.fromPublic(controllerId, collection, request, persist);
        const profile = tryGetProfileFromTestRunReq(request);
        this.proxy.$startedExtensionTestRun({
            controllerId,
            continuous: !!request.continuous,
            profile: profile && { group: Convert.TestRunProfileKind.from(profile.kind), id: profile.profileId },
            exclude: request.exclude?.map(t => TestId.fromExtHostTestItem(t, collection.root.id).toString()) ?? [],
            id: dto.id,
            include: request.include?.map(t => TestId.fromExtHostTestItem(t, collection.root.id).toString()) ?? [collection.root.id],
            preserveFocus: request.preserveFocus ?? true,
            persist
        });
        const tracker = this.getTracker(request, dto, request.profile, extension);
        Event.once(tracker.onEnd)(() => {
            this.proxy.$finishedExtensionTestRun(dto.id);
        });
        return tracker.createRun(name);
    }
    getTracker(req, dto, profile, extension, token) {
        const tracker = new TestRunTracker(dto, this.proxy, this.logService, profile, extension, token);
        this.tracked.set(req, tracker);
        this.trackedById.set(tracker.id, tracker);
        return tracker;
    }
}
const tryGetProfileFromTestRunReq = (request) => {
    if (!request.profile) {
        return undefined;
    }
    if (!(request.profile instanceof TestRunProfileImpl)) {
        throw new Error(`TestRunRequest.profile is not an instance created from TestController.createRunProfile`);
    }
    return request.profile;
};
export class TestRunDto {
    static fromPublic(controllerId, collection, request, persist) {
        return new TestRunDto(controllerId, generateUuid(), persist, collection);
    }
    static fromInternal(request, collection) {
        return new TestRunDto(request.controllerId, request.runId, true, collection);
    }
    constructor(controllerId, id, isPersisted, colllection) {
        this.controllerId = controllerId;
        this.id = id;
        this.isPersisted = isPersisted;
        this.colllection = colllection;
    }
}
class MirroredChangeCollector {
    get isEmpty() {
        return this.added.size === 0 && this.removed.size === 0 && this.updated.size === 0;
    }
    constructor(emitter) {
        this.emitter = emitter;
        this.added = new Set();
        this.updated = new Set();
        this.removed = new Set();
        this.alreadyRemoved = new Set();
    }
    /**
     * @inheritdoc
     */
    add(node) {
        this.added.add(node);
    }
    /**
     * @inheritdoc
     */
    update(node) {
        Object.assign(node.revived, Convert.TestItem.toPlain(node.item));
        if (!this.added.has(node)) {
            this.updated.add(node);
        }
    }
    /**
     * @inheritdoc
     */
    remove(node) {
        if (this.added.has(node)) {
            this.added.delete(node);
            return;
        }
        this.updated.delete(node);
        const parentId = TestId.parentId(node.item.extId);
        if (parentId && this.alreadyRemoved.has(parentId.toString())) {
            this.alreadyRemoved.add(node.item.extId);
            return;
        }
        this.removed.add(node);
    }
    /**
     * @inheritdoc
     */
    getChangeEvent() {
        const { added, updated, removed } = this;
        return {
            get added() { return [...added].map(n => n.revived); },
            get updated() { return [...updated].map(n => n.revived); },
            get removed() { return [...removed].map(n => n.revived); },
        };
    }
    complete() {
        if (!this.isEmpty) {
            this.emitter.fire(this.getChangeEvent());
        }
    }
}
/**
 * Maintains tests in this extension host sent from the main thread.
 * @private
 */
class MirroredTestCollection extends AbstractIncrementalTestCollection {
    constructor() {
        super(...arguments);
        this.changeEmitter = new Emitter();
        /**
         * Change emitter that fires with the same semantics as `TestObserver.onDidChangeTests`.
         */
        this.onDidChangeTests = this.changeEmitter.event;
    }
    /**
     * Gets a list of root test items.
     */
    get rootTests() {
        return this.roots;
    }
    /**
     *
     * If the test ID exists, returns its underlying ID.
     */
    getMirroredTestDataById(itemId) {
        return this.items.get(itemId);
    }
    /**
     * If the test item is a mirrored test item, returns its underlying ID.
     */
    getMirroredTestDataByReference(item) {
        return this.items.get(item.id);
    }
    /**
     * @override
     */
    createItem(item, parent) {
        return {
            ...item,
            // todo@connor4312: make this work well again with children
            revived: Convert.TestItem.toPlain(item.item),
            depth: parent ? parent.depth + 1 : 0,
            children: new Set(),
        };
    }
    /**
     * @override
     */
    createChangeCollector() {
        return new MirroredChangeCollector(this.changeEmitter);
    }
}
class TestObservers {
    constructor(proxy) {
        this.proxy = proxy;
    }
    checkout() {
        if (!this.current) {
            this.current = this.createObserverData();
        }
        const current = this.current;
        current.observers++;
        return {
            onDidChangeTest: current.tests.onDidChangeTests,
            get tests() { return [...current.tests.rootTests].map(t => t.revived); },
            dispose: createSingleCallFunction(() => {
                if (--current.observers === 0) {
                    this.proxy.$unsubscribeFromDiffs();
                    this.current = undefined;
                }
            }),
        };
    }
    /**
     * Gets the internal test data by its reference.
     */
    getMirroredTestDataByReference(ref) {
        return this.current?.tests.getMirroredTestDataByReference(ref);
    }
    /**
     * Applies test diffs to the current set of observed tests.
     */
    applyDiff(diff) {
        this.current?.tests.apply(diff);
    }
    createObserverData() {
        const tests = new MirroredTestCollection({ asCanonicalUri: u => u });
        this.proxy.$subscribeToDiffs();
        return { observers: 0, tests, };
    }
}
const updateProfile = (impl, proxy, initial, update) => {
    if (initial) {
        Object.assign(initial, update);
    }
    else {
        proxy.$updateTestRunConfig(impl.controllerId, impl.profileId, update);
    }
};
export class TestRunProfileImpl extends TestRunProfileBase {
    #proxy;
    #activeProfiles;
    #onDidChangeDefaultProfiles;
    #initialPublish;
    #profiles;
    get label() {
        return this._label;
    }
    set label(label) {
        if (label !== this._label) {
            this._label = label;
            updateProfile(this, this.#proxy, this.#initialPublish, { label });
        }
    }
    get supportsContinuousRun() {
        return this._supportsContinuousRun;
    }
    set supportsContinuousRun(supports) {
        if (supports !== this._supportsContinuousRun) {
            this._supportsContinuousRun = supports;
            updateProfile(this, this.#proxy, this.#initialPublish, { supportsContinuousRun: supports });
        }
    }
    get isDefault() {
        return this.#activeProfiles.has(this.profileId);
    }
    set isDefault(isDefault) {
        if (isDefault !== this.isDefault) {
            // #activeProfiles is synced from the main thread, so we can make
            // provisional changes here that will get confirmed momentarily
            if (isDefault) {
                this.#activeProfiles.add(this.profileId);
            }
            else {
                this.#activeProfiles.delete(this.profileId);
            }
            updateProfile(this, this.#proxy, this.#initialPublish, { isDefault });
        }
    }
    get tag() {
        return this._tag;
    }
    set tag(tag) {
        if (tag?.id !== this._tag?.id) {
            this._tag = tag;
            updateProfile(this, this.#proxy, this.#initialPublish, {
                tag: tag ? Convert.TestTag.namespace(this.controllerId, tag.id) : null,
            });
        }
    }
    get configureHandler() {
        return this._configureHandler;
    }
    set configureHandler(handler) {
        if (handler !== this._configureHandler) {
            this._configureHandler = handler;
            updateProfile(this, this.#proxy, this.#initialPublish, { hasConfigurationHandler: !!handler });
        }
    }
    get onDidChangeDefault() {
        return Event.chain(this.#onDidChangeDefaultProfiles, $ => $
            .map(ev => ev.get(this.controllerId)?.get(this.profileId))
            .filter(isDefined));
    }
    constructor(proxy, profiles, activeProfiles, onDidChangeActiveProfiles, controllerId, profileId, _label, kind, runHandler, _isDefault = false, _tag = undefined, _supportsContinuousRun = false) {
        super(controllerId, profileId, kind);
        this._label = _label;
        this.runHandler = runHandler;
        this._tag = _tag;
        this._supportsContinuousRun = _supportsContinuousRun;
        this.#proxy = proxy;
        this.#profiles = profiles;
        this.#activeProfiles = activeProfiles;
        this.#onDidChangeDefaultProfiles = onDidChangeActiveProfiles;
        profiles.set(profileId, this);
        const groupBitset = Convert.TestRunProfileKind.from(kind);
        if (_isDefault) {
            activeProfiles.add(profileId);
        }
        this.#initialPublish = {
            profileId: profileId,
            controllerId,
            tag: _tag ? Convert.TestTag.namespace(this.controllerId, _tag.id) : null,
            label: _label,
            group: groupBitset,
            isDefault: _isDefault,
            hasConfigurationHandler: false,
            supportsContinuousRun: _supportsContinuousRun,
        };
        // we send the initial profile publish out on the next microtask so that
        // initially setting the isDefault value doesn't overwrite a user-configured value
        queueMicrotask(() => {
            if (this.#initialPublish) {
                this.#proxy.$publishTestRunProfile(this.#initialPublish);
                this.#initialPublish = undefined;
            }
        });
    }
    dispose() {
        if (this.#profiles?.delete(this.profileId)) {
            this.#profiles = undefined;
            this.#proxy.$removeTestProfile(this.controllerId, this.profileId);
        }
        this.#initialPublish = undefined;
    }
}
function findTestInResultSnapshot(extId, snapshot) {
    for (let i = 0; i < extId.path.length; i++) {
        const item = snapshot.find(s => s.id === extId.path[i]);
        if (!item) {
            return undefined;
        }
        if (i === extId.path.length - 1) {
            return item;
        }
        snapshot = item.children;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRlc3RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUc1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxNQUFNLEVBQWdCLE1BQU0sd0NBQXdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLGlDQUFpQyxF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