/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, DisposableTracker, setDisposableTracker } from '../../common/lifecycle.js';
import { join } from '../../common/path.js';
import { isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
export function toResource(path) {
    if (isWindows) {
        return URI.file(join('C:\\', btoa(this.test.fullTitle()), path));
    }
    return URI.file(join('/', btoa(this.test.fullTitle()), path));
}
export function suiteRepeat(n, description, callback) {
    for (let i = 0; i < n; i++) {
        suite(`${description} (iteration ${i})`, callback);
    }
}
export function testRepeat(n, description, callback) {
    for (let i = 0; i < n; i++) {
        test(`${description} (iteration ${i})`, callback);
    }
}
export async function assertThrowsAsync(block, message = 'Missing expected exception') {
    try {
        await block();
    }
    catch {
        return;
    }
    const err = message instanceof Error ? message : new Error(message);
    throw err;
}
/**
 * Use this function to ensure that all disposables are cleaned up at the end of each test in the current suite.
 *
 * Use `markAsSingleton` if disposable singletons are created lazily that are allowed to outlive the test.
 * Make sure that the singleton properly registers all child disposables so that they are excluded too.
 *
 * @returns A {@link DisposableStore} that can optionally be used to track disposables in the test.
 * This will be automatically disposed on test teardown.
*/
export function ensureNoDisposablesAreLeakedInTestSuite() {
    let tracker;
    let store;
    setup(() => {
        store = new DisposableStore();
        tracker = new DisposableTracker();
        setDisposableTracker(tracker);
    });
    teardown(function () {
        store.dispose();
        setDisposableTracker(null);
        if (this.currentTest?.state !== 'failed') {
            const result = tracker.computeLeakingDisposables();
            if (result) {
                console.error(result.details);
                throw new Error(`There are ${result.leaks.length} undisposed disposables!${result.details}`);
            }
        }
    });
    // Wrap store as the suite function is called before it's initialized
    const testContext = {
        add(o) {
            return store.add(o);
        }
    };
    return testContext;
}
export function throwIfDisposablesAreLeaked(body, logToConsole = true) {
    const tracker = new DisposableTracker();
    setDisposableTracker(tracker);
    body();
    setDisposableTracker(null);
    computeLeakingDisposables(tracker, logToConsole);
}
export async function throwIfDisposablesAreLeakedAsync(body) {
    const tracker = new DisposableTracker();
    setDisposableTracker(tracker);
    await body();
    setDisposableTracker(null);
    computeLeakingDisposables(tracker);
}
function computeLeakingDisposables(tracker, logToConsole = true) {
    const result = tracker.computeLeakingDisposables();
    if (result) {
        if (logToConsole) {
            console.error(result.details);
        }
        throw new Error(`There are ${result.leaks.length} undisposed disposables!${result.details}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFlLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEgsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFJMUMsTUFBTSxVQUFVLFVBQVUsQ0FBWSxJQUFZO0lBQ2pELElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FBQyxDQUFTLEVBQUUsV0FBbUIsRUFBRSxRQUE2QjtJQUN4RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUIsS0FBSyxDQUFDLEdBQUcsV0FBVyxlQUFlLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BE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