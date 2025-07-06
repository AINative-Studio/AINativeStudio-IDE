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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0SGVhcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9hc3NlcnRIZWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLElBQUksV0FBbUMsQ0FBQztBQUV4QyxNQUFNLGlCQUFpQixHQUFnRyxFQUFFLENBQUM7QUFFMUgsS0FBSyxDQUFDO0lBQ0wsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUM7QUFFSCxhQUFhLENBQUMsS0FBSyxJQUFJLEVBQUU7SUFDeEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUMsSUFBSSxFQUFDLEVBQUU7UUFDcEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRWpDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxJQUFJLENBQUM7Z0JBQ0osUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksZUFBZSxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsT0FBTywwQkFBMEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbkosQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRUosaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQztBQU1ILE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQztBQUUvQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxVQUFVLENBQUMsSUFBNEI7SUFDNUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRUQsMkVBQTJFO0lBQzNFLGtDQUFrQztJQUNsQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUM3QyxXQUFXLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxJQUFJLE9BQU8sd0JBQXdCLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDckQsT0FBTyxDQUFDLDRCQUE0QjtJQUNyQyxDQUFDO0lBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNyRixDQUFDIn0=