/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from '../../common/lazy.js';
import { FileAccess } from '../../common/network.js';
import { URI } from '../../common/uri.js';
// setup on import so assertSnapshot has the current context without explicit passing
let context;
const sanitizeName = (name) => name.replace(/[^a-z0-9_-]/gi, '_');
const normalizeCrlf = (str) => str.replace(/\r\n/g, '\n');
/**
 * This is exported only for tests against the snapshotting itself! Use
 * {@link assertSnapshot} as a consumer!
 */
export class SnapshotContext {
    constructor(test) {
        this.test = test;
        this.nextIndex = 0;
        this.usedNames = new Set();
        if (!test) {
            throw new Error('assertSnapshot can only be used in a test');
        }
        if (!test.file) {
            throw new Error('currentTest.file is not set, please open an issue with the test you\'re trying to run');
        }
        const src = URI.joinPath(FileAccess.asFileUri(''), '../src');
        const parts = test.file.split(/[/\\]/g);
        this.namePrefix = sanitizeName(test.fullTitle()) + '.';
        this.snapshotsDir = URI.joinPath(src, ...[...parts.slice(0, -1), '__snapshots__']);
    }
    async assert(value, options) {
        const originalStack = new Error().stack; // save to make the stack nicer on failure
        const nameOrIndex = (options?.name ? sanitizeName(options.name) : this.nextIndex++);
        const fileName = this.namePrefix + nameOrIndex + '.' + (options?.extension || 'snap');
        this.usedNames.add(fileName);
        const fpath = URI.joinPath(this.snapshotsDir, fileName).fsPath;
        const actual = formatValue(value);
        let expected;
        try {
            expected = await __readFileInTests(fpath);
        }
        catch {
            console.info(`Creating new snapshot in: ${fpath}`);
            await __mkdirPInTests(this.snapshotsDir.fsPath);
            await __writeFileInTests(fpath, actual);
            return;
        }
        if (normalizeCrlf(expected) !== normalizeCrlf(actual)) {
            await __writeFileInTests(fpath + '.actual', actual);
            const err = new Error(`Snapshot #${nameOrIndex} does not match expected output`);
            err.expected = expected;
            err.actual = actual;
            err.snapshotPath = fpath;
            err.stack = err.stack
                .split('\n')
                // remove all frames from the async stack and keep the original caller's frame
                .slice(0, 1)
                .concat(originalStack.split('\n').slice(3))
                .join('\n');
            throw err;
        }
    }
    async removeOldSnapshots() {
        const contents = await __readDirInTests(this.snapshotsDir.fsPath);
        const toDelete = contents.filter(f => f.startsWith(this.namePrefix) && !this.usedNames.has(f));
        if (toDelete.length) {
            console.info(`Deleting ${toDelete.length} old snapshots for ${this.test?.fullTitle()}`);
        }
        await Promise.all(toDelete.map(f => __unlinkInTests(URI.joinPath(this.snapshotsDir, f).fsPath)));
    }
}
const debugDescriptionSymbol = Symbol.for('debug.description');
function formatValue(value, level = 0, seen = []) {
    switch (typeof value) {
        case 'bigint':
        case 'boolean':
        case 'number':
        case 'symbol':
        case 'undefined':
            return String(value);
        case 'string':
            return level === 0 ? value : JSON.stringify(value);
        case 'function':
            return `[Function ${value.name}]`;
        case 'object': {
            if (value === null) {
                return 'null';
            }
            if (value instanceof RegExp) {
                return String(value);
            }
            if (seen.includes(value)) {
                return '[Circular]';
            }
            if (debugDescriptionSymbol in value && typeof value[debugDescriptionSymbol] === 'function') {
                return value[debugDescriptionSymbol]();
            }
            const oi = '  '.repeat(level);
            const ci = '  '.repeat(level + 1);
            if (Array.isArray(value)) {
                const children = value.map(v => formatValue(v, level + 1, [...seen, value]));
                const multiline = children.some(c => c.includes('\n')) || children.join(', ').length > 80;
                return multiline ? `[\n${ci}${children.join(`,\n${ci}`)}\n${oi}]` : `[ ${children.join(', ')} ]`;
            }
            let entries;
            let prefix = '';
            if (value instanceof Map) {
                prefix = 'Map ';
                entries = [...value.entries()];
            }
            else if (value instanceof Set) {
                prefix = 'Set ';
                entries = [...value.entries()];
            }
            else {
                entries = Object.entries(value);
            }
            const lines = entries.map(([k, v]) => `${k}: ${formatValue(v, level + 1, [...seen, value])}`);
            return prefix + (lines.length > 1
                ? `{\n${ci}${lines.join(`,\n${ci}`)}\n${oi}}`
                : `{ ${lines.join(',\n')} }`);
        }
        default:
            throw new Error(`Unknown type ${value}`);
    }
}
setup(function () {
    const currentTest = this.currentTest;
    context = new Lazy(() => new SnapshotContext(currentTest));
});
teardown(async function () {
    if (this.currentTest?.state === 'passed') {
        await context?.rawValue?.removeOldSnapshots();
    }
    context = undefined;
});
/**
 * Implements a snapshot testing utility. ⚠️ This is async! ⚠️
 *
 * The first time a snapshot test is run, it'll record the value it's called
 * with as the expected value. Subsequent runs will fail if the value differs,
 * but the snapshot can be regenerated by hand or using the Selfhost Test
 * Provider Extension which'll offer to update it.
 *
 * The snapshot will be associated with the currently running test and stored
 * in a `__snapshots__` directory next to the test file, which is expected to
 * be the first `.test.js` file in the callstack.
 */
export function assertSnapshot(value, options) {
    if (!context) {
        throw new Error('assertSnapshot can only be used in a test');
    }
    return context.value.assert(value, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9zbmFwc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQVExQyxxRkFBcUY7QUFDckYsSUFBSSxPQUEwQyxDQUFDO0FBQy9DLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMxRSxNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFTbEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFNM0IsWUFBNkIsSUFBNEI7UUFBNUIsU0FBSSxHQUFKLElBQUksQ0FBd0I7UUFMakQsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUdMLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBR3RDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHVGQUF1RixDQUFDLENBQUM7UUFDMUcsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMs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