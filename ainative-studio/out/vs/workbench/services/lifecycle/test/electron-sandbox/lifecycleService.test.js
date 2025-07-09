/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { WillShutdownJoinerOrder } from '../../common/lifecycle.js';
import { NativeLifecycleService } from '../../electron-sandbox/lifecycleService.js';
import { workbenchInstantiationService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
suite('Lifecycleservice', function () {
    let lifecycleService;
    const disposables = new DisposableStore();
    class TestLifecycleService extends NativeLifecycleService {
        testHandleBeforeShutdown(reason) {
            return super.handleBeforeShutdown(reason);
        }
        testHandleWillShutdown(reason) {
            return super.handleWillShutdown(reason);
        }
    }
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        lifecycleService = disposables.add(instantiationService.createInstance(TestLifecycleService));
    });
    teardown(async () => {
        disposables.clear();
    });
    test('onBeforeShutdown - final veto called after other vetos', async function () {
        let vetoCalled = false;
        let finalVetoCalled = false;
        const order = [];
        disposables.add(lifecycleService.onBeforeShutdown(e => {
            e.veto(new Promise(resolve => {
                vetoCalled = true;
                order.push(1);
                resolve(false);
            }), 'test');
        }));
        disposables.add(lifecycleService.onBeforeShutdown(e => {
            e.finalVeto(() => {
                return new Promise(resolve => {
                    finalVetoCalled = true;
                    order.push(2);
                    resolve(true);
                });
            }, 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
        assert.strictEqual(vetoCalled, true);
        assert.strictEqual(finalVetoCalled, true);
        assert.strictEqual(order[0], 1);
        assert.strictEqual(order[1], 2);
    });
    test('onBeforeShutdown - final veto not called when veto happened before', async function () {
        let vetoCalled = false;
        let finalVetoCalled = false;
        disposables.add(lifecycleService.onBeforeShutdown(e => {
            e.veto(new Promise(resolve => {
                vetoCalled = true;
                resolve(true);
            }), 'test');
        }));
        disposables.add(lifecycleService.onBeforeShutdown(e => {
            e.finalVeto(() => {
                return new Promise(resolve => {
                    finalVetoCalled = true;
                    resolve(true);
                });
            }, 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
        assert.strictEqual(vetoCalled, true);
        assert.strictEqual(finalVetoCalled, false);
    });
    test('onBeforeShutdown - veto with error is treated as veto', async function () {
        disposables.add(lifecycleService.onBeforeShutdown(e => {
            e.veto(new Promise((resolve, reject) => {
                reject(new Error('Fail'));
            }), 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
    });
    test('onBeforeShutdown - final veto with error is treated as veto', async function () {
        disposables.add(lifecycleService.onBeforeShutdown(e => {
            e.finalVeto(() => new Promise((resolve, reject) => {
                reject(new Error('Fail'));
            }), 'test');
        }));
        const veto = await lifecycleService.testHandleBeforeShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(veto, true);
    });
    test('onWillShutdown - join', async function () {
        let joinCalled = false;
        disposables.add(lifecycleService.onWillShutdown(e => {
            e.join(new Promise(resolve => {
                joinCalled = true;
                resolve();
            }), { id: 'test', label: 'test' });
        }));
        await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(joinCalled, true);
    });
    test('onWillShutdown - join with error is handled', async function () {
        let joinCalled = false;
        disposables.add(lifecycleService.onWillShutdown(e => {
            e.join(new Promise((resolve, reject) => {
                joinCalled = true;
                reject(new Error('Fail'));
            }), { id: 'test', label: 'test' });
        }));
        await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(joinCalled, true);
    });
    test('onWillShutdown - join order', async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const order = [];
            disposables.add(lifecycleService.onWillShutdown(e => {
                e.join(async () => {
                    order.push('disconnect start');
                    await timeout(1);
                    order.push('disconnect end');
                }, { id: 'test', label: 'test', order: WillShutdownJoinerOrder.Last });
                e.join((async () => {
                    order.push('default start');
                    await timeout(1);
                    order.push('default end');
                })(), { id: 'test', label: 'test', order: WillShutdownJoinerOrder.Default });
            }));
            await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
            assert.deepStrictEqual(order, [
                'default start',
                'default end',
                'disconnect start',
                'disconnect end'
            ]);
        });
    });
    test('willShutdown is set when shutting down', async function () {
        let willShutdownSet = false;
        disposables.add(lifecycleService.onWillShutdown(e => {
            e.join(new Promise(resolve => {
                if (lifecycleService.willShutdown) {
                    willShutdownSet = true;
                    resolve();
                }
            }), { id: 'test', label: 'test' });
        }));
        await lifecycleService.testHandleWillShutdown(2 /* ShutdownReason.QUIT */);
        assert.strictEqual(willShutdownSet, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9saWZlY3ljbGUvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2xpZmVjeWNsZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQWtCLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFM0csS0FBSyxDQUFDLGtCQUFrQixFQUFFO0lBRXpCLElBQUksZ0JBQXNDLENBQUM7SUFDM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyxNQUFNLG9CQUFxQixTQUFRLHNCQUFzQjtRQUV4RCx3QkFBd0IsQ0FBQyxNQUFzQjtZQUM5QyxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsc0JBQXNCLENBQUMsTUFBc0I7WUFDNUMsT0FBTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsQ0FBQztLQUNEO0lBRUQsS0FB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