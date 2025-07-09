/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let currentTest;
const snapshotsToAssert = [];
setup(function () {
    currentTest = this.currentTest;
});
suiteTeardown(async () => {
    await Promise.all(snapshotsToAssert.map(async (snap) => {
        const counts = await snap.counts;
        const asserts = Object.entries(snap.opts.classes);
        if (asserts.length !== counts.length) {
            throw new Error(`expected class counts to equal assertions length for ${snap.test}`);
        }
        for (const [i, [name, doAssert]] of asserts.entries()) {
            try {
                doAssert(counts[i]);
            }
            catch (e) {
                throw new Error(`Unexpected number of ${name} instances (${counts[i]}) after "${snap.test}":\n\n${e.message}\n\nSnapshot saved at: ${snap.file}`);
            }
        }
    }));
    snapshotsToAssert.length = 0;
});
const snapshotMinTime = 20_000;
/**
 * Takes a heap snapshot, and asserts the state of classes in memory. This
 * works in Node and the Electron sandbox, but is a no-op in the browser.
 * Snapshots are process asynchronously and will report failures at the end of
 * the suite.
 *
 * This method should be used sparingly (e.g. once at the end of a suite to
 * ensure nothing leaked before), as gathering a heap snapshot is fairly
 * slow, at least until V8 11.5.130 (https://v8.dev/blog/speeding-up-v8-heap-snapshots).
 *
 * Takes options containing a mapping of class names, and assertion functions
 * to run on the number of retained instances of that class. For example:
 *
 * ```ts
 * assertSnapshot({
 *	classes: {
 *		ShouldNeverLeak: count => assert.strictEqual(count, 0),
 *		SomeSingleton: count => assert(count <= 1),
 *	}
 *});
 * ```
 */
export async function assertHeap(opts) {
    if (!currentTest) {
        throw new Error('assertSnapshot can only be used when a test is running');
    }
    // snapshotting can take a moment, ensure the test timeout is decently long
    // so it doesn't immediately fail.
    if (currentTest.timeout() < snapshotMinTime) {
        currentTest.timeout(snapshotMinTime);
    }
    if (typeof __analyzeSnapshotInTests === 'undefined') {
        return; // running in browser, no-op
    }
    const { done, file } = await __analyzeSnapshotInTests(currentTest.fullTitle(), Object.keys(opts.classes));
    snapshotsToAssert.push({ counts: done, file, test: currentTest.fullTitle(), opts });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0SGVhcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2Fzc2VydEhlYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsSUFBSSxXQUFtQyxDQUFDO0FBRXhDLE1BQU0saUJBQWlCLEdBQWdHLEVBQUUsQ0FBQztBQUUxSCxLQUFLLENBQUM7SUFDTCxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQztBQUVILGFBQWEsQ0FBQyxLQUFLLElBQUksRUFBRTtJQUN4QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTtRQUNwRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFakMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQztnQkFDSixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckIsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxlQUFlLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxPQUFPLDBCQUEwQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNuSixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFSixpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDO0FBTUgsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDO0FBRS9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLFVBQVUsQ0FBQyxJQUE0QjtJQUM1RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCwyRUFBMkU7SUFDM0Usa0NBQWtDO0lBQ2xDLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLGVBQWUsRUFBRSxDQUFDO1FBQzdDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELElBQUksT0FBTyx3QkFBd0IsS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNyRCxPQUFPLENBQUMsNEJBQTRCO0lBQ3JDLENBQUM7SUFFRCxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sd0JBQXdCLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDMUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGLENBQUMifQ==