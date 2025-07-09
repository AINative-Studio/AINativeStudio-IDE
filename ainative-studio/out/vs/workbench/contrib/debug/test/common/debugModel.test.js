/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DebugModel, ExceptionBreakpoint, FunctionBreakpoint } from '../../common/debugModel.js';
import { MockDebugStorage } from './mockDebug.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('DebugModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('FunctionBreakpoint', () => {
        test('Id is saved', () => {
            const fbp = new FunctionBreakpoint({ name: 'function', enabled: true, hitCondition: 'hit condition', condition: 'condition', logMessage: 'log message' });
            const strigified = JSON.stringify(fbp);
            const parsed = JSON.parse(strigified);
            assert.equal(parsed.id, fbp.getId());
        });
    });
    suite('ExceptionBreakpoint', () => {
        test('Restored matches new', () => {
            const ebp = new ExceptionBreakpoint({
                conditionDescription: 'condition description',
                description: 'description',
                filter: 'condition',
                label: 'label',
                supportsCondition: true,
                enabled: true,
            }, 'id');
            const strigified = JSON.stringify(ebp);
            const parsed = JSON.parse(strigified);
            const newEbp = new ExceptionBreakpoint(parsed);
            assert.ok(ebp.matches(newEbp));
        });
    });
    suite('DebugModel', () => {
        test('refreshTopOfCallstack resolves all returned promises when called multiple times', async () => {
            const topFrameDeferred = new DeferredPromise();
            const wholeStackDeferred = new DeferredPromise();
            const fakeThread = mockObject()({
                session: { capabilities: { supportsDelayedStackTraceLoading: true } },
                getCallStack: () => [],
                getStaleCallStack: () => [],
            });
            fakeThread.fetchCallStack.callsFake((levels) => {
                return levels === 1 ? topFrameDeferred.p : wholeStackDeferred.p;
            });
            fakeThread.getId.returns(1);
            const disposable = new DisposableStore();
            const storage = disposable.add(new TestStorageService());
            const model = new DebugModel(disposable.add(new MockDebugStorage(storage)), { isDirty: (e) => false }, undefined, new NullLogService());
            disposable.add(model);
            let top1Resolved = false;
            let whole1Resolved = false;
            let top2Resolved = false;
            let whole2Resolved = false;
            const result1 = model.refreshTopOfCallstack(fakeThread);
            result1.topCallStack.then(() => top1Resolved = true);
            result1.wholeCallStack.then(() => whole1Resolved = true);
            const result2 = model.refreshTopOfCallstack(fakeThread);
            result2.topCallStack.then(() => top2Resolved = true);
            result2.wholeCallStack.then(() => whole2Resolved = true);
            assert.ok(!top1Resolved);
            assert.ok(!whole1Resolved);
            assert.ok(!top2Resolved);
            assert.ok(!whole2Resolved);
            await topFrameDeferred.complete();
            await result1.topCallStack;
            await result2.topCallStack;
            assert.ok(!whole1Resolved);
            assert.ok(!whole2Resolved);
            await wholeStackDeferred.complete();
            await result1.wholeCallStack;
            await result2.wholeCallStack;
            disposable.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvY29tbW9uL2RlYnVnTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQVUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUV0RixLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDaEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFF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