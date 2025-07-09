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
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { observableValue, transaction } from '../../../base/common/observable.js';
import { WellDefinedPrefixTree } from '../../../base/common/prefixTree.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { TestCoverage } from '../../contrib/testing/common/testCoverage.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { ITestProfileService } from '../../contrib/testing/common/testProfileService.js';
import { LiveTestResult } from '../../contrib/testing/common/testResult.js';
import { ITestResultService } from '../../contrib/testing/common/testResultService.js';
import { ITestService } from '../../contrib/testing/common/testService.js';
import { CoverageDetails, IFileCoverage, ITestItem, ITestMessage, TestsDiffOp } from '../../contrib/testing/common/testTypes.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadTesting = class MainThreadTesting extends Disposable {
    constructor(extHostContext, uriIdentityService, testService, testProfiles, resultService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.testService = testService;
        this.testProfiles = testProfiles;
        this.resultService = resultService;
        this.diffListener = this._register(new MutableDisposable());
        this.testProviderRegistrations = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostTesting);
        this._register(this.testService.registerExtHost({
            provideTestFollowups: (req, token) => this.proxy.$provideTestFollowups(req, token),
            executeTestFollowup: id => this.proxy.$executeTestFollowup(id),
            disposeTestFollowups: ids => this.proxy.$disposeTestFollowups(ids),
            getTestsRelatedToCode: (uri, position, token) => this.proxy.$getTestsRelatedToCode(uri, position, token),
        }));
        this._register(this.testService.onDidCancelTestRun(({ runId, taskId }) => {
            this.proxy.$cancelExtensionTestRun(runId, taskId);
        }));
        this._register(Event.debounce(testProfiles.onDidChange, (_last, e) => e)(() => {
            const obj = {};
            for (const group of [2 /* TestRunProfileBitset.Run */, 4 /* TestRunProfileBitset.Debug */, 8 /* TestRunProfileBitset.Coverage */]) {
                for (const profile of this.testProfiles.getGroupDefaultProfiles(group)) {
                    obj[profile.controllerId] ??= [];
                    obj[profile.controllerId].push(profile.profileId);
                }
            }
            this.proxy.$setDefaultRunProfiles(obj);
        }));
        this._register(resultService.onResultsChanged(evt => {
            if ('completed' in evt) {
                const serialized = evt.completed.toJSONWithMessages();
                if (serialized) {
                    this.proxy.$publishTestResults([serialized]);
                }
            }
            else if ('removed' in evt) {
                evt.removed.forEach(r => {
                    if (r instanceof LiveTestResult) {
                        this.proxy.$disposeRun(r.id);
                    }
                });
            }
        }));
    }
    /**
     * @inheritdoc
     */
    $markTestRetired(testIds) {
        let tree;
        if (testIds) {
            tree = new WellDefinedPrefixTree();
            for (const id of testIds) {
                tree.insert(TestId.fromString(id).path, undefined);
            }
        }
        for (const result of this.resultService.results) {
            // all non-live results are already entirely outdated
            if (result instanceof LiveTestResult) {
                result.markRetired(tree);
            }
        }
    }
    /**
     * @inheritdoc
     */
    $publishTestRunProfile(profile) {
        const controller = this.testProviderRegistrations.get(profile.controllerId);
        if (controller) {
            this.testProfiles.addProfile(controller.instance, profile);
        }
    }
    /**
     * @inheritdoc
     */
    $updateTestRunConfig(controllerId, profileId, update) {
        this.testProfiles.updateProfile(controllerId, profileId, update);
    }
    /**
     * @inheritdoc
     */
    $removeTestProfile(controllerId, profileId) {
        this.testProfiles.removeProfile(controllerId, profileId);
    }
    /**
     * @inheritdoc
     */
    $addTestsToRun(controllerId, runId, tests) {
        this.withLiveRun(runId, r => r.addTestChainToRun(controllerId, tests.map(t => ITestItem.deserialize(this.uriIdentityService, t))));
    }
    /**
     * @inheritdoc
     */
    $appendCoverage(runId, taskId, coverage) {
        this.withLiveRun(runId, run => {
            const task = run.tasks.find(t => t.id === taskId);
            if (!task) {
                return;
            }
            const deserialized = IFileCoverage.deserialize(this.uriIdentityService, coverage);
            transaction(tx => {
                let value = task.coverage.read(undefined);
                if (!value) {
                    value = new TestCoverage(run, taskId, this.uriIdentityService, {
                        getCoverageDetails: (id, testId, token) => this.proxy.$getCoverageDetails(id, testId, token)
                            .then(r => r.map(CoverageDetails.deserialize)),
                    });
                    value.append(deserialized, tx);
                    task.coverage.set(value, tx);
                }
                else {
                    value.append(deserialized, tx);
                }
            });
        });
    }
    /**
     * @inheritdoc
     */
    $startedExtensionTestRun(req) {
        this.resultService.createLiveResult(req);
    }
    /**
     * @inheritdoc
     */
    $startedTestRunTask(runId, task) {
        this.withLiveRun(runId, r => r.addTask(task));
    }
    /**
     * @inheritdoc
     */
    $finishedTestRunTask(runId, taskId) {
        this.withLiveRun(runId, r => r.markTaskComplete(taskId));
    }
    /**
     * @inheritdoc
     */
    $finishedExtensionTestRun(runId) {
        this.withLiveRun(runId, r => r.markComplete());
    }
    /**
     * @inheritdoc
     */
    $updateTestStateInRun(runId, taskId, testId, state, duration) {
        this.withLiveRun(runId, r => r.updateState(testId, taskId, state, duration));
    }
    /**
     * @inheritdoc
     */
    $appendOutputToRun(runId, taskId, output, locationDto, testId) {
        const location = locationDto && {
            uri: URI.revive(locationDto.uri),
            range: Range.lift(locationDto.range)
        };
        this.withLiveRun(runId, r => r.appendOutput(output, taskId, location, testId));
    }
    /**
     * @inheritdoc
     */
    $appendTestMessagesInRun(runId, taskId, testId, messages) {
        const r = this.resultService.getResult(runId);
        if (r && r instanceof LiveTestResult) {
            for (const message of messages) {
                r.appendMessage(testId, taskId, ITestMessage.deserialize(this.uriIdentityService, message));
            }
        }
    }
    /**
     * @inheritdoc
     */
    $registerTestController(controllerId, _label, _capabilities) {
        const disposable = new DisposableStore();
        const label = observableValue(`${controllerId}.label`, _label);
        const capabilities = observableValue(`${controllerId}.cap`, _capabilities);
        const controller = {
            id: controllerId,
            label,
            capabilities,
            syncTests: () => this.proxy.$syncTests(),
            refreshTests: token => this.proxy.$refreshTests(controllerId, token),
            configureRunProfile: id => this.proxy.$configureRunProfile(controllerId, id),
            runTests: (reqs, token) => this.proxy.$runControllerTests(reqs, token),
            startContinuousRun: (reqs, token) => this.proxy.$startContinuousRun(reqs, token),
            expandTest: (testId, levels) => this.proxy.$expandTest(testId, isFinite(levels) ? levels : -1),
            getRelatedCode: (testId, token) => this.proxy.$getCodeRelatedToTest(testId, token).then(locations => locations.map(l => ({
                uri: URI.revive(l.uri),
                range: Range.lift(l.range)
            }))),
        };
        disposable.add(toDisposable(() => this.testProfiles.removeProfile(controllerId)));
        disposable.add(this.testService.registerTestController(controllerId, controller));
        this.testProviderRegistrations.set(controllerId, {
            instance: controller,
            label,
            capabilities,
            disposable
        });
    }
    /**
     * @inheritdoc
     */
    $updateController(controllerId, patch) {
        const controller = this.testProviderRegistrations.get(controllerId);
        if (!controller) {
            return;
        }
        transaction(tx => {
            if (patch.label !== undefined) {
                controller.label.set(patch.label, tx);
            }
            if (patch.capabilities !== undefined) {
                controller.capabilities.set(patch.capabilities, tx);
            }
        });
    }
    /**
     * @inheritdoc
     */
    $unregisterTestController(controllerId) {
        this.testProviderRegistrations.get(controllerId)?.disposable.dispose();
        this.testProviderRegistrations.delete(controllerId);
    }
    /**
     * @inheritdoc
     */
    $subscribeToDiffs() {
        this.proxy.$acceptDiff(this.testService.collection.getReviverDiff().map(TestsDiffOp.serialize));
        this.diffListener.value = this.testService.onDidProcessDiff(this.proxy.$acceptDiff, this.proxy);
    }
    /**
     * @inheritdoc
     */
    $unsubscribeFromDiffs() {
        this.diffListener.clear();
    }
    /**
     * @inheritdoc
     */
    $publishDiff(controllerId, diff) {
        this.testService.publishDiff(controllerId, diff.map(d => TestsDiffOp.deserialize(this.uriIdentityService, d)));
    }
    /**
     * @inheritdoc
     */
    async $runTests(req, token) {
        const result = await this.testService.runResolvedTests(req, token);
        return result.id;
    }
    /**
     * @inheritdoc
     */
    async $getCoverageDetails(resultId, taskIndex, uri, token) {
        const details = await this.resultService.getResult(resultId)
            ?.tasks[taskIndex]
            ?.coverage.get()
            ?.getUri(URI.from(uri))
            ?.details(token);
        // Return empty if nothing. Some failure is always possible here because
        // results might be cleared in the meantime.
        return details || [];
    }
    dispose() {
        super.dispose();
        for (const subscription of this.testProviderRegistrations.values()) {
            subscription.disposable.dispose();
        }
        this.testProviderRegistrations.clear();
    }
    withLiveRun(runId, fn) {
        const r = this.resultService.getResult(runId);
        return r && r instanceof LiveTestResult ? fn(r) : undefined;
    }
};
MainThreadTesting = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTesting),
    __param(1, IUriIdentityService),
    __param(2, ITestService),
    __param(3, ITestProfileService),
    __param(4, ITestResultService)
], MainThreadTesting);
export { MainThreadTesting };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUZXN0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5SCxPQUFPLEVBQXVCLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQTZCLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQTRCLGFBQWEsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUEwSCxX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