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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RSZXN1bHRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRWxHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBb0QsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNwSyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQXNCLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFB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SUFBSSxhQUFhLEVBQUUsQ0FBQztZQUVqQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUUxQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM3RSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNyRCxNQUFNLElBQUksR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBRWpDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMseUVBQXlFLENBQUMsQ0FBQyxDQUFDO1lBQzVKLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLCtFQUErRSxDQUFDLENBQUMsQ0FBQztZQUNsSyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxxRkFBcUYsQ0FBQyxDQUFDLENBQUM7UUFDekssQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=