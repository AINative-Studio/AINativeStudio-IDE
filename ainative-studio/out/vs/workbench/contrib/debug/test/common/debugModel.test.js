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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9jb21tb24vZGVidWdNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBVSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXRGLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUN4QixNQUFNLEdBQUcsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUs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