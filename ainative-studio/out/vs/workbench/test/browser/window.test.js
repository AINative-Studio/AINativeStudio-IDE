/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mainWindow } from '../../../base/browser/window.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { BaseWindow } from '../../browser/window.js';
import { TestEnvironmentService, TestHostService } from './workbenchTestServices.js';
suite('Window', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestWindow extends BaseWindow {
        constructor(window, dom) {
            super(window, dom, new TestHostService(), TestEnvironmentService);
        }
        enableWindowFocusOnElementFocus() { }
    }
    test('multi window aware setTimeout()', async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const disposables = new DisposableStore();
            let windows = [];
            const dom = {
                getWindowsCount: () => windows.length,
                getWindows: () => windows
            };
            const setTimeoutCalls = [];
            const clearTimeoutCalls = [];
            function createWindow(id, slow) {
                const res = {
                    setTimeout: function (callback, delay, ...args) {
                        setTimeoutCalls.push(id);
                        return mainWindow.setTimeout(() => callback(id), slow ? delay * 2 : delay, ...args);
                    },
                    clearTimeout: function (timeoutId) {
                        clearTimeoutCalls.push(id);
                        return mainWindow.clearTimeout(timeoutId);
                    }
                };
                disposables.add(new TestWindow(res, dom));
                return res;
            }
            const window1 = createWindow(1);
            windows = [{ window: window1, disposables }];
            // Window Count: 1
            let called = false;
            await new Promise((resolve, reject) => {
                window1.setTimeout(() => {
                    if (!called) {
                        called = true;
                        resolve();
                    }
                    else {
                        reject(new Error('timeout called twice'));
                    }
                }, 1);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [1]);
            assert.deepStrictEqual(clearTimeoutCalls, []);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            await new Promise((resolve, reject) => {
                window1.setTimeout(() => {
                    if (!called) {
                        called = true;
                        resolve();
                    }
                    else {
                        reject(new Error('timeout called twice'));
                    }
                }, 0);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [1]);
            assert.deepStrictEqual(clearTimeoutCalls, []);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            // Window Count: 3
            let window2 = createWindow(2);
            const window3 = createWindow(3);
            windows = [
                { window: window2, disposables },
                { window: window1, disposables },
                { window: window3, disposables }
            ];
            await new Promise((resolve, reject) => {
                window1.setTimeout(() => {
                    if (!called) {
                        called = true;
                        resolve();
                    }
                    else {
                        reject(new Error('timeout called twice'));
                    }
                }, 1);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [2, 1, 3]);
            assert.deepStrictEqual(clearTimeoutCalls, [2, 1, 3]);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            // Window Count: 2 (1 fast, 1 slow)
            window2 = createWindow(2, true);
            windows = [
                { window: window2, disposables },
                { window: window1, disposables },
            ];
            await new Promise((resolve, reject) => {
                window1.setTimeout((windowId) => {
                    if (!called && windowId === 1) {
                        called = true;
                        resolve();
                    }
                    else if (called) {
                        reject(new Error('timeout called twice'));
                    }
                    else {
                        reject(new Error('timeout called for wrong window'));
                    }
                }, 1);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [2, 1]);
            assert.deepStrictEqual(clearTimeoutCalls, [2, 1]);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            disposables.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci93aW5kb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFjLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXJGLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBRXBCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxVQUFXLFNBQVEsVUFBVTtRQUVsQyxZQUFZLE1BQWtCLEVBQUUsR0FBeUY7WUFDeEgsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxlQUFlLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFa0IsK0JBQStCLEtBQVcsQ0FBQztLQUM5RDtJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLO1FBQzVDLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUUxQyxJQUFJLE9BQU8sR0FB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