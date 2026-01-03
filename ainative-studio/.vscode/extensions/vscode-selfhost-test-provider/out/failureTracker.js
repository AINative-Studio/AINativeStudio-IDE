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
exports.FailureTracker = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const MAX_FAILURES = 10;
class FailureTracker {
    constructor(storageLocation, rootDir) {
        this.rootDir = rootDir;
        this.disposables = [];
        this.lastFailed = new Map();
        this.logFile = (0, path_1.join)(storageLocation, '.build/vscode-test-failures.json');
        (0, fs_1.mkdirSync)((0, path_1.dirname)(this.logFile), { recursive: true });
        const oldLogFile = (0, path_1.join)(rootDir, '.build/vscode-test-failures.json');
        if ((0, fs_1.existsSync)(oldLogFile)) {
            try {
                (0, fs_1.renameSync)(oldLogFile, this.logFile);
            }
            catch {
                // ignore
            }
        }
        this.disposables.push(vscode.commands.registerCommand('selfhost-test-provider.openFailureLog', async () => {
            const doc = await vscode.workspace.openTextDocument(this.logFile);
            await vscode.window.showTextDocument(doc);
        }));
        this.disposables.push(vscode.tests.onDidChangeTestResults(() => {
            const last = vscode.tests.testResults[0];
            if (!last) {
                return;
            }
            let gitState;
            const getGitState = () => gitState ?? (gitState = this.captureGitState());
            const queue = [last.results];
            for (let i = 0; i < queue.length; i++) {
                for (const snapshot of queue[i]) {
                    // only interested in states of leaf tests
                    if (snapshot.children.length) {
                        queue.push(snapshot.children);
                        continue;
                    }
                    const key = `${snapshot.uri}/${snapshot.id}`;
                    const prev = this.lastFailed.get(key);
                    if (snapshot.taskStates.some(s => s.state === vscode.TestResultState.Failed)) {
                        // unset the parent to avoid a circular JSON structure:
                        getGitState().then(s => this.lastFailed.set(key, {
                            snapshot: { ...snapshot, parent: undefined },
                            failing: s,
                        }));
                    }
                    else if (prev) {
                        this.lastFailed.delete(key);
                        getGitState().then(s => this.append({ ...prev, passing: s }));
                    }
                }
            }
        }));
    }
    async append(log) {
        if (!this.logs) {
            try {
                this.logs = JSON.parse(await (0, promises_1.readFile)(this.logFile, 'utf-8'));
            }
            catch {
                this.logs = [];
            }
        }
        const logs = this.logs;
        logs.push(log);
        if (logs.length > MAX_FAILURES) {
            logs.splice(0, logs.length - MAX_FAILURES);
        }
        await (0, promises_1.writeFile)(this.logFile, JSON.stringify(logs, undefined, 2));
    }
    async captureGitState() {
        const [commitId, tracked, untracked] = await Promise.all([
            this.exec('git', ['rev-parse', 'HEAD']),
            this.exec('git', ['diff', 'HEAD']),
            this.exec('git', ['ls-files', '--others', '--exclude-standard']).then(async (output) => {
                const mapping = {};
                await Promise.all(output
                    .trim()
                    .split('\n')
                    .map(async (f) => {
                    mapping[f] = await (0, promises_1.readFile)((0, path_1.join)(this.rootDir, f), 'utf-8');
                }));
                return mapping;
            }),
        ]);
        return { commitId, tracked, untracked };
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
    exec(command, args) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, { stdio: 'pipe', cwd: this.rootDir });
            let output = '';
            child.stdout.setEncoding('utf-8').on('data', b => (output += b));
            child.stderr.setEncoding('utf-8').on('data', b => (output += b));
            child.on('error', reject);
            child.on('exit', code => code === 0
                ? resolve(output)
                : reject(new Error(`Failed with error code ${code}\n${output}`)));
        });
    }
}
exports.FailureTracker = FailureTracker;
//# sourceMappingURL=failureTracker.js.map