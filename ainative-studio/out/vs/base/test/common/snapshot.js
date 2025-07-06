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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vc25hcHNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFRMUMscUZBQXFGO0FBQ3JGLElBQUksT0FBMEMsQ0FBQztBQUMvQyxNQUFNLFlBQVksR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDMUUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBU2xFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFlO0lBTTNCLFlBQTZCLElBQTRCO1FBQTVCLFNBQUksR0FBSixJQUFJLENBQXdCO1FBTGpELGNBQVMsR0FBRyxDQUFDLENBQUM7UUFHTCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUd0QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1RkFBdUYsQ0FBQyxDQUFDO1FBQzFHLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxD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