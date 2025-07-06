/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { TestId } from '../../common/testId.js';
import { TestProfileService } from '../../common/testProfileService.js';
import { HydratedTestResult, LiveTestResult, TaskRawOutput, resultItemParents } from '../../common/testResult.js';
import { TestResultService } from '../../common/testResultService.js';
import { InMemoryResultStorage } from '../../common/testResultStorage.js';
import { makeEmptyCounts } from '../../common/testingStates.js';
import { getInitializedMainTestCollection, testStubs } from './testStubs.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('Workbench - Test Results Service', () => {
    const getLabelsIn = (it) => [...it].map(t => t.item.label).sort();
    const getChangeSummary = () => [...changed]
        .map(c => ({ reason: c.reason, label: c.item.item.label }));
    let r;
    let changed = new Set();
    let tests;
    const defaultOpts = (testIds) => ({
        group: 2 /* TestRunProfileBitset.Run */,
        targets: [{
                profileId: 0,
                controllerId: 'ctrlId',
                testIds,
            }]
    });
    let insertCounter = 0;
    class TestLiveTestResult extends LiveTestResult {
        constructor(id, persist, request) {
            super(id, persist, request, insertCounter++, NullTelemetryService);
            ds.add(this);
        }
        setAllToStatePublic(state, taskId, when) {
            this.setAllToState(state, taskId, when);
        }
    }
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        changed = new Set();
        r = ds.add(new TestLiveTestResult('foo', true, defaultOpts(['id-a'])));
        ds.add(r.onChange(e => changed.add(e)));
        r.addTask({ id: 't', name: 'n', running: true, ctrlId: 'ctrl' });
        tests = ds.add(testStubs.nested());
        const cts = ds.add(new CancellationTokenSource());
        const ok = await Promise.race([
            Promise.resolve(tests.expand(tests.root.id, Infinity)).then(() => true),
            timeout(1000, cts.token).then(() => false),
        ]);
        cts.cancel();
        // todo@connor4312: debug for tests #137853:
        if (!ok) {
            throw new Error('timed out while expanding, diff: ' + JSON.stringify(tests.collectDiff()));
        }
        r.addTestChainToRun('ctrlId', [
            tests.root.toTestItem(),
            tests.root.children.get('id-a').toTestItem(),
            tests.root.children.get('id-a').children.get('id-aa').toTestItem(),
        ]);
        r.addTestChainToRun('ctrlId', [
            tests.root.children.get('id-a').toTestItem(),
            tests.root.children.get('id-a').children.get('id-ab').toTestItem(),
        ]);
    });
    // ensureNoDisposablesAreLeakedInTestSuite(); todo@connor4312
    suite('LiveTestResult', () => {
        test('is empty if no tests are yet present', async () => {
            assert.deepStrictEqual(getLabelsIn(new TestLiveTestResult('foo', false, defaultOpts(['id-a'])).tests), []);
        });
        test('initially queues nothing', () => {
            assert.deepStrictEqual(getChangeSummary(), []);
        });
        test('initializes with the subtree of requested tests', () => {
            assert.deepStrictEqual(getLabelsIn(r.tests), ['a', 'aa', 'ab', 'root']);
        });
        test('initializes with valid counts', () => {
            const c = makeEmptyCounts();
            c[0 /* TestResultState.Unset */] = 4;
            assert.deepStrictEqual(r.counts, c);
        });
        test('setAllToState', () => {
            changed.clear();
            r.setAllToStatePublic(1 /* TestResultState.Queued */, 't', (_, t) => t.item.label !== 'root');
            const c = makeEmptyCounts();
            c[0 /* TestResultState.Unset */] = 1;
            c[1 /* TestResultState.Queued */] = 3;
            assert.deepStrictEqual(r.counts, c);
            r.setAllToStatePublic(4 /* TestResultState.Failed */, 't', (_, t) => t.item.label !== 'root');
            const c2 = makeEmptyCounts();
            c2[0 /* TestResultState.Unset */] = 1;
            c2[4 /* TestResultState.Failed */] = 3;
            assert.deepStrictEqual(r.counts, c2);
            assert.deepStrictEqual(r.getStateById(new TestId(['ctrlId', 'id-a']).toString())?.ownComputedState, 4 /* TestResultState.Failed */);
            assert.deepStrictEqual(r.getStateById(new TestId(['ctrlId', 'id-a']).toString())?.tasks[0].state, 4 /* TestResultState.Failed */);
            assert.deepStrictEqual(getChangeSummary(), [
                { label: 'a', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
                { label: 'root', reason: 0 /* TestResultItemChangeReason.ComputedStateChange */ },
                { label: 'aa', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
                { label: 'ab', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
                { label: 'a', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
                { label: 'root', reason: 0 /* TestResultItemChangeReason.ComputedStateChange */ },
                { label: 'aa', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
                { label: 'ab', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
            ]);
        });
        test('updateState', () => {
            changed.clear();
            const testId = new TestId(['ctrlId', 'id-a', 'id-aa']).toString();
            r.updateState(testId, 't', 2 /* TestResultState.Running */);
            const c = makeEmptyCounts();
            c[2 /* TestResultState.Running */] = 1;
            c[0 /* TestResultState.Unset */] = 3;
            assert.deepStrictEqual(r.counts, c);
            assert.deepStrictEqual(r.getStateById(testId)?.ownComputedState, 2 /* TestResultState.Running */);
            // update computed state:
            assert.deepStrictEqual(r.getStateById(tests.root.id)?.computedState, 2 /* TestResultState.Running */);
            assert.deepStrictEqual(getChangeSummary(), [
                { label: 'aa', reason: 1 /* TestResultItemChangeReason.OwnStateChange */ },
                { label: 'a', reason: 0 /* TestResultItemChangeReason.ComputedStateChange */ },
                { label: 'root', reason: 0 /* TestResultItemChangeReason.ComputedStateChange */ },
            ]);
            r.updateState(testId, 't', 3 /* TestResultState.Passed */);
            assert.deepStrictEqual(r.getStateById(testId)?.ownComputedState, 3 /* TestResultState.Passed */);
            r.updateState(testId, 't', 6 /* TestResultState.Errored */);
            assert.deepStrictEqual(r.getStateById(testId)?.ownComputedState, 6 /* TestResultState.Errored */);
            r.updateState(testId, 't', 3 /* TestResultState.Passed */);
            assert.deepStrictEqual(r.getStateById(testId)?.ownComputedState, 6 /* TestResultState.Errored */);
        });
        test('ignores outside run', () => {
            changed.clear();
            r.updateState(new TestId(['ctrlId', 'id-b']).toString(), 't', 2 /* TestResultState.Running */);
            const c = makeEmptyCounts();
            c[0 /* TestResultState.Unset */] = 4;
            assert.deepStrictEqual(r.counts, c);
            assert.deepStrictEqual(r.getStateById(new TestId(['ctrlId', 'id-b']).toString()), undefined);
        });
        test('markComplete', () => {
            r.setAllToStatePublic(1 /* TestResultState.Queued */, 't', () => true);
            r.updateState(new TestId(['ctrlId', 'id-a', 'id-aa']).toString(), 't', 3 /* TestResultState.Passed */);
            changed.clear();
            r.markComplete();
            const c = makeEmptyCounts();
            c[0 /* TestResultState.Unset */] = 3;
            c[3 /* TestResultState.Passed */] = 1;
            assert.deepStrictEqual(r.counts, c);
            assert.deepStrictEqual(r.getStateById(tests.root.id)?.ownComputedState, 0 /* TestResultState.Unset */);
            assert.deepStrictEqual(r.getStateById(new TestId(['ctrlId', 'id-a', 'id-aa']).toString())?.ownComputedState, 3 /* TestResultState.Passed */);
        });
    });
    suite('service', () => {
        let storage;
        let results;
        class TestTestResultService extends TestResultService {
            constructor() {
                super(...arguments);
                this.persistScheduler = { schedule: () => this.persistImmediately() };
            }
        }
        setup(() => {
            storage = ds.add(new InMemoryResultStorage({
                asCanonicalUri(uri) {
                    return uri;
                },
            }, ds.add(new TestStorageService()), new NullLogService()));
            results = ds.add(new TestTestResultService(new MockContextKeyService(), storage, ds.add(new TestProfileService(new MockContextKeyService(), ds.add(new TestStorageService()))), NullTelemetryService));
        });
        test('pushes new result', () => {
            results.push(r);
            assert.deepStrictEqual(results.results, [r]);
        });
        test('serializes and re-hydrates', async () => {
            results.push(r);
            r.updateState(new TestId(['ctrlId', 'id-a', 'id-aa']).toString(), 't', 3 /* TestResultState.Passed */, 42);
            r.markComplete();
            await timeout(10); // allow persistImmediately async to happen
            results = ds.add(new TestResultService(new MockContextKeyService(), storage, ds.add(new TestProfileService(new MockContextKeyService(), ds.add(new TestStorageService()))), NullTelemetryService));
            assert.strictEqual(0, results.results.length);
            await timeout(10); // allow load promise to resolve
            assert.strictEqual(1, results.results.length);
            const [rehydrated, actual] = results.getStateById(tests.root.id);
            const expected = { ...r.getStateById(tests.root.id) };
            expected.item.uri = actual.item.uri;
            expected.item.children = undefined;
            expected.retired = true;
            delete expected.children;
            assert.deepStrictEqual(actual, { ...expected });
            assert.deepStrictEqual(rehydrated.counts, r.counts);
            assert.strictEqual(typeof rehydrated.completedAt, 'number');
        });
        test('clears results but keeps ongoing tests', async () => {
            results.push(r);
            r.markComplete();
            const r2 = results.push(new LiveTestResult('', false, defaultOpts([]), insertCounter++, NullTelemetryService));
            results.clear();
            assert.deepStrictEqual(results.results, [r2]);
        });
        test('keeps ongoing tests on top, restored order when done', async () => {
            results.push(r);
            const r2 = results.push(new LiveTestResult('', false, defaultOpts([]), insertCounter++, NullTelemetryService));
            assert.deepStrictEqual(results.results, [r2, r]);
            r2.markComplete();
            assert.deepStrictEqual(results.results, [r, r2]);
            r.markComplete();
            assert.deepStrictEqual(results.results, [r2, r]);
        });
        const makeHydrated = async (completedAt = 42, state = 3 /* TestResultState.Passed */) => new HydratedTestResult({
            asCanonicalUri(uri) {
                return uri;
            },
        }, {
            completedAt,
            id: 'some-id',
            tasks: [{ id: 't', name: undefined, ctrlId: 'ctrl', hasCoverage: false }],
            name: 'hello world',
            request: defaultOpts([]),
            items: [{
                    ...(await getInitializedMainTestCollection()).getNodeById(new TestId(['ctrlId', 'id-a']).toString()),
                    tasks: [{ state, duration: 0, messages: [] }],
                    computedState: state,
                    ownComputedState: state,
                }]
        });
        test('pushes hydrated results', async () => {
            results.push(r);
            const hydrated = await makeHydrated();
            results.push(hydrated);
            assert.deepStrictEqual(results.results, [r, hydrated]);
        });
        test('inserts in correct order', async () => {
            results.push(r);
            const hydrated1 = await makeHydrated();
            results.push(hydrated1);
            assert.deepStrictEqual(results.results, [r, hydrated1]);
        });
        test('inserts in correct order 2', async () => {
            results.push(r);
            const hydrated1 = await makeHydrated();
            results.push(hydrated1);
            const hydrated2 = await makeHydrated(30);
            results.push(hydrated2);
            assert.deepStrictEqual(results.results, [r, hydrated1, hydrated2]);
        });
    });
    test('resultItemParents', function () {
        assert.deepStrictEqual([...resultItemParents(r, r.getStateById(new TestId(['ctrlId', 'id-a', 'id-aa']).toString()))], [
            r.getStateById(new TestId(['ctrlId', 'id-a', 'id-aa']).toString()),
            r.getStateById(new TestId(['ctrlId', 'id-a']).toString()),
            r.getStateById(new TestId(['ctrlId']).toString()),
        ]);
        assert.deepStrictEqual([...resultItemParents(r, r.getStateById(tests.root.id))], [
            r.getStateById(tests.root.id),
        ]);
    });
    suite('output controller', () => {
        test('reads live output ranges', async () => {
            const ctrl = new TaskRawOutput();
            ctrl.append(VSBuffer.fromString('12345'));
            ctrl.append(VSBuffer.fromString('67890'));
            ctrl.append(VSBuffer.fromString('12345'));
            ctrl.append(VSBuffer.fromString('67890'));
            assert.deepStrictEqual(ctrl.getRange(0, 5), VSBuffer.fromString('12345'));
            assert.deepStrictEqual(ctrl.getRange(5, 5), VSBuffer.fromString('67890'));
            assert.deepStrictEqual(ctrl.getRange(7, 6), VSBuffer.fromString('890123'));
            assert.deepStrictEqual(ctrl.getRange(15, 5), VSBuffer.fromString('67890'));
            assert.deepStrictEqual(ctrl.getRange(15, 10), VSBuffer.fromString('67890'));
        });
        test('corrects offsets for marked ranges', async () => {
            const ctrl = new TaskRawOutput();
            const a1 = ctrl.append(VSBuffer.fromString('12345'), 1);
            const a2 = ctrl.append(VSBuffer.fromString('67890'), 1234);
            const a3 = ctrl.append(VSBuffer.fromString('with new line\r\n'), 4);
            assert.deepStrictEqual(ctrl.getRange(a1.offset, a1.length), VSBuffer.fromString('\x1b]633;SetMark;Id=s1;Hidden\x0712345\x1b]633;SetMark;Id=e1;Hidden\x07'));
            assert.deepStrictEqual(ctrl.getRange(a2.offset, a2.length), VSBuffer.fromString('\x1b]633;SetMark;Id=s1234;Hidden\x0767890\x1b]633;SetMark;Id=e1234;Hidden\x07'));
            assert.deepStrictEqual(ctrl.getRange(a3.offset, a3.length), VSBuffer.fromString('\x1b]633;SetMark;Id=s4;Hidden\x07with new line\x1b]633;SetMark;Id=e4;Hidden\x07\r\n'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdFJlc3VsdFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFvRCxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3BLLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBc0IscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFz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QUFJLGFBQWEsRUFBRSxDQUFDO1lBRWpDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzdFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JELE1BQU0sSUFBSSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7WUFFakMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVwRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyx5RUFBeUUsQ0FBQyxDQUFDLENBQUM7WUFDNUosTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsK0VBQStFLENBQUMsQ0FBQyxDQUFDO1lBQ2xLLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLHFGQUFxRixDQUFDLENBQUMsQ0FBQztRQUN6SyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==