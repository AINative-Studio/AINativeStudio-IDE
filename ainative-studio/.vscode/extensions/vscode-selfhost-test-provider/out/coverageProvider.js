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
exports.V8CoverageFile = exports.PerTestCoverageTracker = exports.istanbulCoverageContext = void 0;
const istanbul_to_vscode_1 = require("istanbul-to-vscode");
const vscode = __importStar(require("vscode"));
const v8CoverageWrangling_1 = require("./v8CoverageWrangling");
exports.istanbulCoverageContext = new istanbul_to_vscode_1.IstanbulCoverageContext();
/**
 * Tracks coverage in per-script coverage mode. There are two modes of coverage
 * in this extension: generic istanbul reports, and reports from the runtime
 * sent before and after each test case executes. This handles the latter.
 */
class PerTestCoverageTracker {
    constructor(maps) {
        this.maps = maps;
        this.scripts = new Map();
    }
    add(coverage, test) {
        const script = this.scripts.get(coverage.scriptId);
        if (script) {
            return script.add(coverage, test);
        }
        // ignore internals and node_modules
        if (!coverage.url.startsWith('file://') || coverage.url.includes('node_modules')) {
            return;
        }
        if (!coverage.source) {
            throw new Error('expected to have source the first time a script is seen');
        }
        const src = new Script(vscode.Uri.parse(coverage.url), coverage.source, this.maps);
        this.scripts.set(coverage.scriptId, src);
        src.add(coverage, test);
    }
    async report(run) {
        await Promise.all(Array.from(this.scripts.values()).map(s => s.report(run)));
    }
}
exports.PerTestCoverageTracker = PerTestCoverageTracker;
class Script {
    constructor(uri, source, maps) {
        this.uri = uri;
        this.maps = maps;
        /** Tracking the overall coverage for the file */
        this.overall = new ScriptCoverageTracker();
        /** Range tracking per-test item */
        this.perItem = new Map();
        this.converter = new v8CoverageWrangling_1.OffsetToPosition(source);
    }
    add(coverage, test) {
        this.overall.add(coverage);
        if (test) {
            const p = new ScriptCoverageTracker();
            p.add(coverage);
            this.perItem.set(test, p);
        }
    }
    async report(run) {
        const mapper = await this.maps.getSourceLocationMapper(this.uri.toString());
        const originalUri = (await this.maps.getSourceFile(this.uri.toString())) || this.uri;
        run.addCoverage(this.overall.report(originalUri, this.converter, mapper, this.perItem));
    }
}
class ScriptCoverageTracker {
    constructor() {
        this.coverage = new v8CoverageWrangling_1.RangeCoverageTracker();
    }
    add(coverage) {
        for (const range of v8CoverageWrangling_1.RangeCoverageTracker.initializeBlocks(coverage.functions)) {
            this.coverage.setCovered(range.start, range.end, range.covered);
        }
    }
    *toDetails(uri, convert, mapper) {
        for (const range of this.coverage) {
            if (range.start === range.end) {
                continue;
            }
            const startCov = convert.toLineColumn(range.start);
            let start = new vscode.Position(startCov.line, startCov.column);
            const endCov = convert.toLineColumn(range.end);
            let end = new vscode.Position(endCov.line, endCov.column);
            if (mapper) {
                const startMap = mapper(start.line, start.character, 1 /* SearchStrategy.FirstAfter */);
                const endMap = startMap && mapper(end.line, end.character, -1 /* SearchStrategy.FirstBefore */);
                if (!endMap || uri.toString().toLowerCase() !== endMap.uri.toString().toLowerCase()) {
                    continue;
                }
                start = startMap.range.start;
                end = endMap.range.end;
            }
            for (let i = start.line; i <= end.line; i++) {
                yield new vscode.StatementCoverage(range.covered, new vscode.Range(new vscode.Position(i, i === start.line ? start.character : 0), new vscode.Position(i, i === end.line ? end.character : Number.MAX_SAFE_INTEGER)));
            }
        }
    }
    /**
     * Generates the script's coverage for the test run.
     *
     * If a source location mapper is given, it assumes the `uri` is the mapped
     * URI, and that any unmapped locations/outside the URI should be ignored.
     */
    report(uri, convert, mapper, items) {
        const file = new V8CoverageFile(uri, items, convert, mapper);
        for (const detail of this.toDetails(uri, convert, mapper)) {
            file.add(detail);
        }
        return file;
    }
}
class V8CoverageFile extends vscode.FileCoverage {
    constructor(uri, perTest, convert, mapper) {
        super(uri, { covered: 0, total: 0 }, undefined, undefined, [...perTest.keys()]);
        this.perTest = perTest;
        this.convert = convert;
        this.mapper = mapper;
        this.details = [];
    }
    add(detail) {
        this.details.push(detail);
        this.statementCoverage.total++;
        if (detail.executed) {
            this.statementCoverage.covered++;
        }
    }
    testDetails(test) {
        const t = this.perTest.get(test);
        return t ? [...t.toDetails(this.uri, this.convert, this.mapper)] : [];
    }
}
exports.V8CoverageFile = V8CoverageFile;
//# sourceMappingURL=coverageProvider.js.map