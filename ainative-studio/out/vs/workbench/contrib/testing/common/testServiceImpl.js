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
import { groupBy } from '../../../../base/common/arrays.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { getTestingConfiguration } from './configuration.js';
import { MainThreadTestCollection } from './mainThreadTestCollection.js';
import { MutableObservableValue } from './observableValue.js';
import { StoredValue } from './storedValue.js';
import { TestExclusions } from './testExclusions.js';
import { TestId } from './testId.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { canUseProfileWithTest, ITestProfileService } from './testProfileService.js';
import { ITestResultService } from './testResultService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let TestService = class TestService extends Disposable {
    constructor(contextKeyService, instantiationService, uriIdentityService, storage, editorService, testProfiles, notificationService, configurationService, testResults, workspaceTrustRequestService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.storage = storage;
        this.editorService = editorService;
        this.testProfiles = testProfiles;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.testResults = testResults;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.testControllers = observableValue('testControllers', new Map());
        this.testExtHosts = new Set();
        this.cancelExtensionTestRunEmitter = new Emitter();
        this.willProcessDiffEmitter = new Emitter();
        this.didProcessDiffEmitter = new Emitter();
        this.testRefreshCancellations = new Set();
        /**
         * Cancellation for runs requested by the user being managed by the UI.
         * Test runs initiated by extensions are not included here.
         */
        this.uiRunningTests = new Map();
        /**
         * @inheritdoc
         */
        this.onWillProcessDiff = this.willProcessDiffEmitter.event;
        /**
         * @inheritdoc
         */
        this.onDidProcessDiff = this.didProcessDiffEmitter.event;
        /**
         * @inheritdoc
         */
        this.onDidCancelTestRun = this.cancelExtensionTestRunEmitter.event;
        /**
         * @inheritdoc
         */
        this.collection = new MainThreadTestCollection(this.uriIdentityService, this.expandTest.bind(this));
        /**
         * @inheritdoc
         */
        this.showInlineOutput = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'inlineTestOutputVisible',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 0 /* StorageTarget.USER */
        }, this.storage), true));
        this.excluded = instantiationService.createInstance(TestExclusions);
        this.isRefreshingTests = TestingContextKeys.isRefreshingTests.bindTo(contextKeyService);
        this.activeEditorHasTests = TestingContextKeys.activeEditorHasTests.bindTo(contextKeyService);
        this._register(bindContextKey(TestingContextKeys.providerCount, contextKeyService, reader => this.testControllers.read(reader).size));
        const bindCapability = (key, capability) => this._register(bindContextKey(key, contextKeyService, reader => Iterable.some(this.testControllers.read(reader).values(), ctrl => !!(ctrl.capabilities.read(reader) & capability))));
        bindCapability(TestingContextKeys.canRefreshTests, 2 /* TestControllerCapability.Refresh */);
        bindCapability(TestingContextKeys.canGoToRelatedCode, 4 /* TestControllerCapability.CodeRelatedToTest */);
        bindCapability(TestingContextKeys.canGoToRelatedTest, 8 /* TestControllerCapability.TestRelatedToCode */);
        this._register(editorService.onDidActiveEditorChange(() => this.updateEditorContextKeys()));
    }
    /**
     * @inheritdoc
     */
    async expandTest(id, levels) {
        await this.testControllers.get().get(TestId.fromString(id).controllerId)?.expandTest(id, levels);
    }
    /**
     * @inheritdoc
     */
    cancelTestRun(runId, taskId) {
        this.cancelExtensionTestRunEmitter.fire({ runId, taskId });
        if (runId === undefined) {
            for (const runCts of this.uiRunningTests.values()) {
                runCts.cancel();
            }
        }
        else if (!taskId) {
            this.uiRunningTests.get(runId)?.cancel();
        }
    }
    /**
     * @inheritdoc
     */
    async runTests(req, token = CancellationToken.None) {
        // We try to ensure that all tests in the request will be run, preferring
        // to use default profiles for each controller when possible.
        const byProfile = [];
        for (const test of req.tests) {
            const existing = byProfile.find(p => canUseProfileWithTest(p.profile, test));
            if (existing) {
                existing.tests.push(test);
                continue;
            }
            const bestProfile = this.testProfiles.getDefaultProfileForTest(req.group, test);
            if (!bestProfile) {
                continue;
            }
            byProfile.push({ profile: bestProfile, tests: [test] });
        }
        const resolved = {
            targets: byProfile.map(({ profile, tests }) => ({
                profileId: profile.profileId,
                controllerId: tests[0].controllerId,
                testIds: tests.map(t => t.item.extId),
            })),
            group: req.group,
            exclude: req.exclude?.map(t => t.item.extId),
            continuous: req.continuous,
        };
        // If no tests are covered by the defaults, just use whatever the defaults
        // for their controller are. This can happen if the user chose specific
        // profiles for the run button, but then asked to run a single test from the
        // explorer or decoration. We shouldn't no-op.
        if (resolved.targets.length === 0) {
            for (const byController of groupBy(req.tests, (a, b) => a.controllerId === b.controllerId ? 0 : 1)) {
                const profiles = this.testProfiles.getControllerProfiles(byController[0].controllerId);
                const withControllers = byController.map(test => ({
                    profile: profiles.find(p => p.group === req.group && canUseProfileWithTest(p, test)),
                    test,
                }));
                for (const byProfile of groupBy(withControllers, (a, b) => a.profile === b.profile ? 0 : 1)) {
                    const profile = byProfile[0].profile;
                    if (profile) {
                        resolved.targets.push({
                            testIds: byProfile.map(t => t.test.item.extId),
                            profileId: profile.profileId,
                            controllerId: profile.controllerId,
                        });
                    }
                }
            }
        }
        return this.runResolvedTests(resolved, token);
    }
    /** @inheritdoc */
    async startContinuousRun(req, token) {
        if (!req.exclude) {
            req.exclude = [...this.excluded.all];
        }
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('testTrust', "Running tests may execute code in your workspace."),
        });
        if (!trust) {
            return;
        }
        const byController = groupBy(req.targets, (a, b) => a.controllerId.localeCompare(b.controllerId));
        const requests = byController.map(group => this.getTestController(group[0].controllerId)?.startContinuousRun(group.map(controlReq => ({
            excludeExtIds: req.exclude.filter(t => !controlReq.testIds.includes(t)),
            profileId: controlReq.profileId,
            controllerId: controlReq.controllerId,
            testIds: controlReq.testIds,
        })), token).then(result => {
            const errs = result.map(r => r.error).filter(isDefined);
            if (errs.length) {
                this.notificationService.error(localize('testError', 'An error occurred attempting to run tests: {0}', errs.join(' ')));
            }
        }));
        await Promise.all(requests);
    }
    /**
     * @inheritdoc
     */
    async runResolvedTests(req, token = CancellationToken.None) {
        if (!req.exclude) {
            req.exclude = [...this.excluded.all];
        }
        const result = this.testResults.createLiveResult(req);
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('testTrust', "Running tests may execute code in your workspace."),
        });
        if (!trust) {
            result.markComplete();
            return result;
        }
        try {
            const cancelSource = new CancellationTokenSource(token);
            this.uiRunningTests.set(result.id, cancelSource);
            const byController = groupBy(req.targets, (a, b) => a.controllerId.localeCompare(b.controllerId));
            const requests = byController.map(group => this.getTestController(group[0].controllerId)?.runTests(group.map(controlReq => ({
                runId: result.id,
                excludeExtIds: req.exclude.filter(t => !controlReq.testIds.includes(t)),
                profileId: controlReq.profileId,
                controllerId: controlReq.controllerId,
                testIds: controlReq.testIds,
            })), cancelSource.token).then(result => {
                const errs = result.map(r => r.error).filter(isDefined);
                if (errs.length) {
                    this.notificationService.error(localize('testError', 'An error occurred attempting to run tests: {0}', errs.join(' ')));
                }
            }));
            await this.saveAllBeforeTest(req);
            await Promise.all(requests);
            return result;
        }
        finally {
            this.uiRunningTests.delete(result.id);
            result.markComplete();
        }
    }
    /**
     * @inheritdoc
     */
    async provideTestFollowups(req, token) {
        const reqs = await Promise.all([...this.testExtHosts].map(async (ctrl) => ({ ctrl, followups: await ctrl.provideTestFollowups(req, token) })));
        const followups = {
            followups: reqs.flatMap(({ ctrl, followups }) => followups.map(f => ({
                message: f.title,
                execute: () => ctrl.executeTestFollowup(f.id)
            }))),
            dispose: () => {
                for (const { ctrl, followups } of reqs) {
                    ctrl.disposeTestFollowups(followups.map(f => f.id));
                }
            }
        };
        if (token.isCancellationRequested) {
            followups.dispose();
        }
        return followups;
    }
    /**
     * @inheritdoc
     */
    publishDiff(_controllerId, diff) {
        this.willProcessDiffEmitter.fire(diff);
        this.collection.apply(diff);
        this.updateEditorContextKeys();
        this.didProcessDiffEmitter.fire(diff);
    }
    /**
     * @inheritdoc
     */
    getTestController(id) {
        return this.testControllers.get().get(id);
    }
    /**
     * @inheritdoc
     */
    async syncTests() {
        const cts = new CancellationTokenSource();
        try {
            await Promise.all([...this.testControllers.get().values()].map(c => c.syncTests(cts.token)));
        }
        finally {
            cts.dispose(true);
        }
    }
    /**
     * @inheritdoc
     */
    async refreshTests(controllerId) {
        const cts = new CancellationTokenSource();
        this.testRefreshCancellations.add(cts);
        this.isRefreshingTests.set(true);
        try {
            if (controllerId) {
                await this.getTestController(controllerId)?.refreshTests(cts.token);
            }
            else {
                await Promise.all([...this.testControllers.get().values()].map(c => c.refreshTests(cts.token)));
            }
        }
        finally {
            this.testRefreshCancellations.delete(cts);
            this.isRefreshingTests.set(this.testRefreshCancellations.size > 0);
            cts.dispose(true);
        }
    }
    /**
     * @inheritdoc
     */
    cancelRefreshTests() {
        for (const cts of this.testRefreshCancellations) {
            cts.cancel();
        }
        this.testRefreshCancellations.clear();
        this.isRefreshingTests.set(false);
    }
    /**
     * @inheritdoc
     */
    registerExtHost(controller) {
        this.testExtHosts.add(controller);
        return toDisposable(() => this.testExtHosts.delete(controller));
    }
    /**
     * @inheritdoc
     */
    async getTestsRelatedToCode(uri, position, token = CancellationToken.None) {
        const testIds = await Promise.all([...this.testExtHosts.values()].map(v => v.getTestsRelatedToCode(uri, position, token)));
        // ext host will flush diffs before returning, so we should have everything here:
        return testIds.flatMap(ids => ids.map(id => this.collection.getNodeById(id))).filter(isDefined);
    }
    /**
     * @inheritdoc
     */
    registerTestController(id, controller) {
        this.testControllers.set(new Map(this.testControllers.get()).set(id, controller), undefined);
        return toDisposable(() => {
            const diff = [];
            for (const root of this.collection.rootItems) {
                if (root.controllerId === id) {
                    diff.push({ op: 3 /* TestDiffOpType.Remove */, itemId: root.item.extId });
                }
            }
            this.publishDiff(id, diff);
            const next = new Map(this.testControllers.get());
            next.delete(id);
            this.testControllers.set(next, undefined);
        });
    }
    /**
     * @inheritdoc
     */
    async getCodeRelatedToTest(test, token = CancellationToken.None) {
        return (await this.testControllers.get().get(test.controllerId)?.getRelatedCode(test.item.extId, token)) || [];
    }
    updateEditorContextKeys() {
        const uri = this.editorService.activeEditor?.resource;
        if (uri) {
            this.activeEditorHasTests.set(!Iterable.isEmpty(this.collection.getNodeByUrl(uri)));
        }
        else {
            this.activeEditorHasTests.set(false);
        }
    }
    async saveAllBeforeTest(req, configurationService = this.configurationService, editorService = this.editorService) {
        if (req.preserveFocus === true) {
            return;
        }
        const saveBeforeTest = getTestingConfiguration(this.configurationService, "testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */);
        if (saveBeforeTest) {
            await editorService.saveAll();
        }
        return;
    }
};
TestService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IStorageService),
    __param(4, IEditorService),
    __param(5, ITestProfileService),
    __param(6, INotificationService),
    __param(7, IConfigurationService),
    __param(8, ITestResultService),
    __param(9, IWorkspaceTrustRequestService)
], TestService);
export { TestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBZSxrQkFBa0IsRUFBaUIsTUFBTSxzREFBc0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUs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