/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { getRandomTestPath } from './testUtils.js';
import { Promises } from '../../node/pfs.js';
import { SnapshotContext, assertSnapshot } from '../common/snapshot.js';
import { URI } from '../../common/uri.js';
import * as path from 'path';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
// tests for snapshot are in Node so that we can use native FS operations to
// set up and validate things.
//
// Uses snapshots for testing snapshots. It's snapception!
suite('snapshot', () => {
    let testDir;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'snapshot');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(function () {
        return Promises.rm(testDir);
    });
    const makeContext = (test) => {
        return new class extends SnapshotContext {
            constructor() {
                super(test);
                this.snapshotsDir = URI.file(testDir);
            }
        };
    };
    const snapshotFileTree = async () => {
        let str = '';
        const printDir = async (dir, indent) => {
            const children = await Promises.readdir(dir);
            for (const child of children) {
                const p = path.join(dir, child);
                if ((await fs.promises.stat(p)).isFile()) {
                    const content = await fs.promises.readFile(p, 'utf-8');
                    str += `${' '.repeat(indent)}${child}:\n`;
                    for (const line of content.split('\n')) {
                        str += `${' '.repeat(indent + 2)}${line}\n`;
                    }
                }
                else {
                    str += `${' '.repeat(indent)}${child}/\n`;
                    await printDir(p, indent + 2);
                }
            }
        };
        await printDir(testDir, 0);
        await assertSnapshot(str);
    };
    test('creates a snapshot', async () => {
        const ctx = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx.assert({ cool: true });
        await snapshotFileTree();
    });
    test('validates a snapshot', async () => {
        const ctx1 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx1.assert({ cool: true });
        const ctx2 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        // should pass:
        await ctx2.assert({ cool: true });
        const ctx3 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        // should fail:
        await assertThrowsAsync(() => ctx3.assert({ cool: false }));
    });
    test('cleans up old snapshots', async () => {
        const ctx1 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx1.assert({ cool: true });
        await ctx1.assert({ nifty: true });
        await ctx1.assert({ customName: 1 }, { name: 'thirdTest', extension: 'txt' });
        await ctx1.assert({ customName: 2 }, { name: 'fourthTest' });
        await snapshotFileTree();
        const ctx2 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx2.assert({ cool: true });
        await ctx2.assert({ customName: 1 }, { name: 'thirdTest' });
        await ctx2.removeOldSnapshots();
        await snapshotFileTree();
    });
    test('formats object nicely', async () => {
        const circular = {};
        circular.a = circular;
        await assertSnapshot([
            1,
            true,
            undefined,
            null,
            123n,
            Symbol('heyo'),
            'hello',
            { hello: 'world' },
            circular,
            new Map([['hello', 1], ['goodbye', 2]]),
            new Set([1, 2, 3]),
            function helloWorld() { },
            /hello/g,
            new Array(10).fill('long string'.repeat(10)),
            { [Symbol.for('debug.description')]() { return `Range [1 -> 5]`; } },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9zbmFwc2hvdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRWhHLDRFQUE0RTtBQUM1RSw4QkFBOEI7QUFDOUIsRUFBRTtBQUNGLDBEQUEwRDtBQUUxRCxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUN0QixJQUFJLE9BQWUsQ0FBQztJQUVwQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQztRQUNMLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUQsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQztRQUNSLE9B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