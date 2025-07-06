"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceMapStore = exports.TestOutputScanner = void 0;
exports.scanTestOutput = scanTestOutput;
const trace_mapping_1 = require("@jridgewell/trace-mapping");
const styles = __importStar(require("ansi-styles"));
const vscode = __importStar(require("vscode"));
const coverageProvider_1 = require("./coverageProvider");
const metadata_1 = require("./metadata");
const snapshot_1 = require("./snapshot");
const stackTraceParser_1 = require("./stackTraceParser");
const streamSplitter_1 = require("./streamSplitter");
const testTree_1 = require("./testTree");
const LF = '\n'.charCodeAt(0);
class TestOutputScanner {
    constructor(process, args) {
        this.process = process;
        this.args = args;
        this.mochaEventEmitter = new vscode.EventEmitter();
        this.outputEventEmitter = new vscode.EventEmitter();
        this.onExitEmitter = new vscode.EventEmitter();
        /**
         * Fired when a mocha event comes in.
         */
        this.onMochaEvent = this.mochaEventEmitter.event;
        /**
         * Fired when other output from the process comes in.
         */
        this.onOtherOutput = this.outputEventEmitter.event;
        /**
         * Fired when the process encounters an error, or exits.
         */
        this.onRunnerExit = this.onExitEmitter.event;
        this.processData = (data) => {
            if (this.args) {
                this.outputEventEmitter.fire(`./scripts/test ${this.args.join(' ')}`);
                this.args = undefined;
            }
            data = data.toString();
            try {
                const parsed = JSON.parse(data.trim());
                if (parsed instanceof Array && parsed.length === 2 && typeof parsed[0] === 'string') {
                    this.mochaEventEmitter.fire(parsed);
                }
                else {
                    this.outputEventEmitter.fire(data);
                }
            }
            catch {
                this.outputEventEmitter.fire(data);
            }
        };
        process.stdout.pipe(new streamSplitter_1.StreamSplitter(LF)).on('data', this.processData);
        process.stderr.pipe(new streamSplitter_1.StreamSplitter(LF)).on('data', this.processData);
        process.on('error', e => this.onExitEmitter.fire(e.message));
        process.on('exit', code => this.onExitEmitter.fire(code ? `Test process exited with code ${code}` : undefined));
    }
    /**
     * @override
     */
    dispose() {
        try {
            this.process.kill();
        }
        catch {
            // ignored
        }
    }
}
exports.TestOutputScanner = TestOutputScanner;
async function scanTestOutput(tests, task, scanner, coverageDir, cancellation) {
    const exitBlockers = new Set();
    const skippedTests = new Set(tests.values());
    const store = new SourceMapStore();
    let outputQueue = Promise.resolve();
    const enqueueOutput = (fn) => {
        exitBlockers.delete(outputQueue);
        outputQueue = outputQueue.finally(async () => {
            const r = typeof fn === 'function' ? await fn() : fn;
            typeof r === 'string' ? task.appendOutput(r) : task.appendOutput(...r);
        });
        exitBlockers.add(outputQueue);
        return outputQueue;
    };
    const enqueueExitBlocker = (prom) => {
        exitBlockers.add(prom);
        prom.finally(() => exitBlockers.delete(prom));
        return prom;
    };
    let perTestCoverage;
    let lastTest;
    let ranAnyTest = false;
    try {
        if (cancellation.isCancellationRequested) {
            return;
        }
        await new Promise(resolve => {
            cancellation.onCancellationRequested(() => {
                resolve();
            });
            let currentTest;
            scanner.onRunnerExit(err => {
                if (err) {
                    enqueueOutput(err + crlf);
                }
                resolve();
            });
            scanner.onOtherOutput(str => {
                const match = spdlogRe.exec(str);
                if (!match) {
                    enqueueOutput(str + crlf);
                    return;
                }
                const logLocation = store.getSourceLocation(match[2], Number(match[3]) - 1);
                const logContents = replaceAllLocations(store, match[1]);
                const test = currentTest;
                enqueueOutput(() => Promise.all([logLocation, logContents]).then(([location, contents]) => [
                    contents + crlf,
                    location,
                    test,
                ]));
            });
            scanner.onMochaEvent(evt => {
                switch (evt[0]) {
                    case "start" /* MochaEvent.Start */:
                        break; // no-op
                    case "testStart" /* MochaEvent.TestStart */:
                        currentTest = tests.get(evt[1].fullTitle);
                        if (!currentTest) {
                            console.warn(`Could not find test ${evt[1].fullTitle}`);
                            return;
                        }
                        skippedTests.delete(currentTest);
                        task.started(currentTest);
                        ranAnyTest = true;
                        break;
                    case "pass" /* MochaEvent.Pass */:
                        {
                            const title = evt[1].fullTitle;
                            const tcase = tests.get(title);
                            enqueueOutput(` ${styles.green.open}√${styles.green.close} ${title}\r\n`);
                            if (tcase) {
                                lastTest = tcase;
                                task.passed(tcase, evt[1].duration);
                            }
                        }
                        break;
                    case "fail" /* MochaEvent.Fail */:
                        {
                            const { err, stack, duration, expected, expectedJSON, actual, actualJSON, snapshotPath, fullTitle: id, } = evt[1];
                            let tcase = tests.get(id);
                            // report failures on hook to the last-seen test, or first test if none run yet
                            if (!tcase && (id.includes('hook for') || id.includes('hook in'))) {
                                tcase = lastTest ?? tests.values().next().value;
                            }
                            enqueueOutput(`${styles.red.open} x ${id}${styles.red.close}\r\n`);
                            const rawErr = stack || err;
                            const locationsReplaced = replaceAllLocations(store, forceCRLF(rawErr));
                            if (rawErr) {
                                enqueueOutput(async () => [await locationsReplaced, undefined, tcase]);
                            }
                            if (!tcase) {
                                return;
                            }
                            const hasDiff = actual !== undefined &&
                                expected !== undefined &&
                                (expected !== '[undefined]' || actual !== '[undefined]');
                            const testFirstLine = tcase.range &&
                                new vscode.Location(tcase.uri, new vscode.Range(tcase.range.start, new vscode.Position(tcase.range.start.line, 100)));
                            enqueueExitBlocker((async () => {
                                const stackInfo = await deriveStackLocations(store, rawErr, tcase);
                                let message;
                                if (hasDiff) {
                                    message = new vscode.TestMessage(tryMakeMarkdown(err));
                                    message.actualOutput = outputToString(actual);
                                    message.expectedOutput = outputToString(expected);
                                    if (snapshotPath) {
                                        message.contextValue = 'isSelfhostSnapshotMessage';
                                        message.expectedOutput += snapshot_1.snapshotComment + snapshotPath;
                                    }
                                    (0, metadata_1.attachTestMessageMetadata)(message, {
                                        expectedValue: expectedJSON,
                                        actualValue: actualJSON,
                                    });
                                }
                                else {
                                    message = new vscode.TestMessage(stack ? await sourcemapStack(store, stack) : await locationsReplaced);
                                }
                                message.location = stackInfo.primary ?? testFirstLine;
                                message.stackTrace = stackInfo.stack;
                                task.failed(tcase, message, duration);
                            })());
                        }
                        break;
                    case "end" /* MochaEvent.End */:
                        // no-op, we wait until the process exits to ensure coverage is written out
                        break;
                    case "coverageInit" /* MochaEvent.CoverageInit */:
                        perTestCoverage ?? (perTestCoverage = new coverageProvider_1.PerTestCoverageTracker(store));
                        for (const result of evt[1].result) {
                            perTestCoverage.add(result);
                        }
                        break;
                    case "coverageIncrement" /* MochaEvent.CoverageIncrement */: {
                        const { fullTitle, coverage } = evt[1];
                        const tcase = tests.get(fullTitle);
                        if (tcase) {
                            perTestCoverage ?? (perTestCoverage = new coverageProvider_1.PerTestCoverageTracker(store));
                            for (const result of coverage.result) {
                                perTestCoverage.add(result, tcase);
                            }
                        }
                        break;
                    }
                }
            });
        });
        if (perTestCoverage) {
            enqueueExitBlocker(perTestCoverage.report(task));
        }
        await Promise.all([...exitBlockers]);
        if (coverageDir) {
            try {
                await coverageProvider_1.istanbulCoverageContext.apply(task, coverageDir, {
                    mapFileUri: uri => store.getSourceFile(uri.toString()),
                    mapLocation: (uri, position) => store.getSourceLocation(uri.toString(), position.line, position.character),
                });
            }
            catch (e) {
                const msg = `Error loading coverage:\n\n${e}\n`;
                task.appendOutput(msg.replace(/\n/g, crlf));
            }
        }
        // no tests? Possible crash, show output:
        if (!ranAnyTest) {
            await vscode.commands.executeCommand('testing.showMostRecentOutput');
        }
    }
    catch (e) {
        task.appendOutput(e.stack || e.message);
    }
    finally {
        scanner.dispose();
        for (const test of skippedTests) {
            task.skipped(test);
        }
        task.end();
    }
}
const spdlogRe = /"(.+)", source: (file:\/\/\/.*?)+ \(([0-9]+)\)/;
const crlf = '\r\n';
const forceCRLF = (str) => str.replace(/(?<!\r)\n/gm, '\r\n');
const sourcemapStack = async (store, str) => {
    locationRe.lastIndex = 0;
    const replacements = await Promise.all([...str.matchAll(locationRe)].map(async (match) => {
        const location = await deriveSourceLocation(store, match);
        if (!location) {
            return;
        }
        return {
            from: match[0],
            to: location?.uri.with({
                fragment: `L${location.range.start.line + 1}:${location.range.start.character + 1}`,
            }),
        };
    }));
    for (const replacement of replacements) {
        if (replacement) {
            str = str.replace(replacement.from, replacement.to.toString(true));
        }
    }
    return str;
};
const outputToString = (output) => typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);
const tryMakeMarkdown = (message) => {
    const lines = message.split('\n');
    const start = lines.findIndex(l => l.includes('+ actual'));
    if (start === -1) {
        return message;
    }
    lines.splice(start, 1, '```diff');
    lines.push('```');
    return new vscode.MarkdownString(lines.join('\n'));
};
const inlineSourcemapRe = /^\/\/# sourceMappingURL=data:application\/json;base64,(.+)/m;
const sourceMapBiases = [trace_mapping_1.GREATEST_LOWER_BOUND, trace_mapping_1.LEAST_UPPER_BOUND];
class SourceMapStore {
    constructor() {
        this.cache = new Map();
    }
    async getSourceLocationMapper(fileUri) {
        const sourceMap = await this.loadSourceMap(fileUri);
        return (line, col, strategy) => {
            if (!sourceMap) {
                return undefined;
            }
            // 1. Look for the ideal position on this line if it exists
            const idealPosition = (0, trace_mapping_1.originalPositionFor)(sourceMap, { column: col, line: line + 1, bias: 1 /* SearchStrategy.FirstAfter */ ? trace_mapping_1.GREATEST_LOWER_BOUND : trace_mapping_1.LEAST_UPPER_BOUND });
            if (idealPosition.line !== null && idealPosition.column !== null && idealPosition.source !== null) {
                return new vscode.Location(this.completeSourceMapUrl(sourceMap, idealPosition.source), new vscode.Position(idealPosition.line - 1, idealPosition.column));
            }
            // Otherwise get the first/last valid mapping on another line.
            const decoded = (0, trace_mapping_1.decodedMappings)(sourceMap);
            do {
                line += strategy;
                const segments = decoded[line];
                if (!segments?.length) {
                    continue;
                }
                const index = strategy === -1 /* SearchStrategy.FirstBefore */
                    ? findLastIndex(segments, s => s.length !== 1)
                    : segments.findIndex(s => s.length !== 1);
                const segment = segments[index];
                if (!segment || segment.length === 1) {
                    continue;
                }
                return new vscode.Location(this.completeSourceMapUrl(sourceMap, sourceMap.sources[segment[1 /* MapField.SOURCES_INDEX */]]), new vscode.Position(segment[2 /* MapField.SOURCE_LINE */] - 1, segment[3 /* MapField.SOURCE_COLUMN */]));
            } while (strategy === -1 /* SearchStrategy.FirstBefore */ ? line > 0 : line < decoded.length);
            return undefined;
        };
    }
    /** Gets an original location from a base 0 line and column */
    async getSourceLocation(fileUri, line, col = 0) {
        const sourceMap = await this.loadSourceMap(fileUri);
        if (!sourceMap) {
            return undefined;
        }
        let smLine = line + 1;
        // if the range is after the end of mappings, adjust it to the last mapped line
        const decoded = (0, trace_mapping_1.decodedMappings)(sourceMap);
        if (decoded.length <= line) {
            smLine = decoded.length; // base 1, no -1 needed
            col = Number.MAX_SAFE_INTEGER;
        }
        for (const bias of sourceMapBiases) {
            const position = (0, trace_mapping_1.originalPositionFor)(sourceMap, { column: col, line: smLine, bias });
            if (position.line !== null && position.column !== null && position.source !== null) {
                return new vscode.Location(this.completeSourceMapUrl(sourceMap, position.source), new vscode.Position(position.line - 1, position.column));
            }
        }
        return undefined;
    }
    async getSourceFile(compiledUri) {
        const sourceMap = await this.loadSourceMap(compiledUri);
        if (!sourceMap) {
            return undefined;
        }
        if (sourceMap.sources[0]) {
            return this.completeSourceMapUrl(sourceMap, sourceMap.sources[0]);
        }
        for (const bias of sourceMapBiases) {
            const position = (0, trace_mapping_1.originalPositionFor)(sourceMap, { column: 0, line: 1, bias });
            if (position.source !== null) {
                return this.completeSourceMapUrl(sourceMap, position.source);
            }
        }
        return undefined;
    }
    completeSourceMapUrl(sm, source) {
        if (sm.sourceRoot) {
            try {
                return vscode.Uri.parse(new URL(source, sm.sourceRoot).toString());
            }
            catch {
                // ignored
            }
        }
        return vscode.Uri.parse(source);
    }
    loadSourceMap(fileUri) {
        const existing = this.cache.get(fileUri);
        if (existing) {
            return existing;
        }
        const promise = (async () => {
            try {
                const contents = await (0, testTree_1.getContentFromFilesystem)(vscode.Uri.parse(fileUri));
                const sourcemapMatch = inlineSourcemapRe.exec(contents);
                if (!sourcemapMatch) {
                    return;
                }
                const decoded = Buffer.from(sourcemapMatch[1], 'base64').toString();
                return new trace_mapping_1.TraceMap(decoded, fileUri);
            }
            catch (e) {
                console.warn(`Error parsing sourcemap for ${fileUri}: ${e.stack}`);
                return;
            }
        })();
        this.cache.set(fileUri, promise);
        return promise;
    }
}
exports.SourceMapStore = SourceMapStore;
const locationRe = /(file:\/{3}.+):([0-9]+):([0-9]+)/g;
async function replaceAllLocations(store, str) {
    const output = [];
    let lastIndex = 0;
    for (const match of str.matchAll(locationRe)) {
        const locationPromise = deriveSourceLocation(store, match);
        const startIndex = match.index || 0;
        const endIndex = startIndex + match[0].length;
        if (startIndex > lastIndex) {
            output.push(str.substring(lastIndex, startIndex));
        }
        output.push(locationPromise.then(location => location
            ? `${location.uri}:${location.range.start.line + 1}:${location.range.start.character + 1}`
            : match[0]));
        lastIndex = endIndex;
    }
    // Preserve the remaining string after the last match
    if (lastIndex < str.length) {
        output.push(str.substring(lastIndex));
    }
    const values = await Promise.all(output);
    return values.join('');
}
async function deriveStackLocations(store, stack, tcase) {
    locationRe.lastIndex = 0;
    const locationsRaw = [...new stackTraceParser_1.StackTraceParser(stack)].filter(t => t instanceof stackTraceParser_1.StackTraceLocation);
    const locationsMapped = await Promise.all(locationsRaw.map(async (location) => {
        const mapped = location.path.startsWith('file:') ? await store.getSourceLocation(location.path, location.lineBase1 - 1, location.columnBase1 - 1) : undefined;
        const stack = new vscode.TestMessageStackFrame(location.label || '<anonymous>', mapped?.uri, mapped?.range.start || new vscode.Position(location.lineBase1 - 1, location.columnBase1 - 1));
        return { location: mapped, stack };
    }));
    let best;
    for (const { location } of locationsMapped) {
        if (!location) {
            continue;
        }
        let score = 0;
        if (tcase.uri && tcase.uri.toString() === location.uri.toString()) {
            score = 1;
            if (tcase.range && tcase.range.contains(location?.range)) {
                score = 2;
            }
        }
        if (!best || score > best.score) {
            best = { location, score };
        }
    }
    return { stack: locationsMapped.map(s => s.stack), primary: best?.location };
}
async function deriveSourceLocation(store, parts) {
    const [, fileUri, line, col] = parts;
    return store.getSourceLocation(fileUri, Number(line) - 1, Number(col));
}
function findLastIndex(arr, predicate) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i])) {
            return i;
        }
    }
    return -1;
}
//# sourceMappingURL=testOutputScanner.js.map