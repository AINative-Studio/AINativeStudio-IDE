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
exports.activate = activate;
exports.deactivate = deactivate;
const crypto_1 = require("crypto");
const os_1 = require("os");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const coverageProvider_1 = require("./coverageProvider");
const failingDeepStrictEqualAssertFixer_1 = require("./failingDeepStrictEqualAssertFixer");
const failureTracker_1 = require("./failureTracker");
const snapshot_1 = require("./snapshot");
const testOutputScanner_1 = require("./testOutputScanner");
const testTree_1 = require("./testTree");
const vscodeTestRunner_1 = require("./vscodeTestRunner");
const importGraph_1 = require("./importGraph");
const TEST_FILE_PATTERN = 'src/vs/**/*.{test,integrationTest}.ts';
const getWorkspaceFolderForTestFile = (uri) => (uri.path.endsWith('.test.ts') || uri.path.endsWith('.integrationTest.ts')) &&
    uri.path.includes('/src/vs/')
    ? vscode.workspace.getWorkspaceFolder(uri)
    : undefined;
const browserArgs = [
    ['Chrome', 'chromium'],
    ['Firefox', 'firefox'],
    ['Webkit', 'webkit'],
];
async function activate(context) {
    const ctrl = vscode.tests.createTestController('selfhost-test-controller', 'VS Code Tests');
    const fileChangedEmitter = new vscode.EventEmitter();
    context.subscriptions.push(vscode.tests.registerTestFollowupProvider({
        async provideFollowup(_result, test, taskIndex, messageIndex, _token) {
            return [{
                    title: '$(sparkle) Fix with Copilot',
                    command: 'github.copilot.tests.fixTestFailure',
                    arguments: [{ source: 'peekFollowup', test, message: test.taskStates[taskIndex].messages[messageIndex] }]
                }];
        },
    }));
    let initialWatchPromise;
    const resolveHandler = async (test) => {
        if (!test) {
            if (!initialWatchPromise) {
                initialWatchPromise = startWatchingWorkspace(ctrl, fileChangedEmitter);
                context.subscriptions.push(await initialWatchPromise);
            }
            else {
                await initialWatchPromise;
            }
            return;
        }
        const data = testTree_1.itemData.get(test);
        if (data instanceof testTree_1.TestFile) {
            // No need to watch this, updates will be triggered on file changes
            // either by the text document or file watcher.
            await data.updateFromDisk(ctrl, test);
        }
    };
    ctrl.resolveHandler = resolveHandler;
    (0, testTree_1.guessWorkspaceFolder)().then(folder => {
        if (!folder) {
            return;
        }
        const graph = new importGraph_1.ImportGraph(folder.uri, async () => {
            await resolveHandler();
            return [...ctrl.items].map(([, item]) => item);
        }, uri => ctrl.items.get(uri.toString().toLowerCase()));
        ctrl.relatedCodeProvider = graph;
        if (context.storageUri) {
            context.subscriptions.push(new failureTracker_1.FailureTracker(context.storageUri.fsPath, folder.uri.fsPath));
        }
        context.subscriptions.push(fileChangedEmitter.event(e => graph.didChange(e.uri, e.removed)));
    });
    const createRunHandler = (runnerCtor, kind, args = []) => {
        const doTestRun = async (req, cancellationToken) => {
            const folder = await (0, testTree_1.guessWorkspaceFolder)();
            if (!folder) {
                return;
            }
            const runner = new runnerCtor(folder);
            const map = await getPendingTestMap(ctrl, req.include ?? gatherTestItems(ctrl.items));
            const task = ctrl.createTestRun(req);
            for (const test of map.values()) {
                task.enqueued(test);
            }
            let coverageDir;
            let currentArgs = args;
            if (kind === vscode.TestRunProfileKind.Coverage) {
                // todo: browser runs currently don't support per-test coverage
                if (args.includes('--browser')) {
                    coverageDir = path.join((0, os_1.tmpdir)(), `vscode-test-coverage-${(0, crypto_1.randomBytes)(8).toString('hex')}`);
                    currentArgs = [
                        ...currentArgs,
                        '--coverage',
                        '--coveragePath',
                        coverageDir,
                        '--coverageFormats',
                        'json',
                    ];
                }
                else {
                    currentArgs = [...currentArgs, '--per-test-coverage'];
                }
            }
            return await (0, testOutputScanner_1.scanTestOutput)(map, task, kind === vscode.TestRunProfileKind.Debug
                ? await runner.debug(task, currentArgs, req.include)
                : await runner.run(currentArgs, req.include), coverageDir, cancellationToken);
        };
        return async (req, cancellationToken) => {
            if (!req.continuous) {
                return doTestRun(req, cancellationToken);
            }
            const queuedFiles = new Set();
            let debounced;
            const listener = fileChangedEmitter.event(({ uri, removed }) => {
                clearTimeout(debounced);
                if (req.include && !req.include.some(i => i.uri?.toString() === uri.toString())) {
                    return;
                }
                if (removed) {
                    queuedFiles.delete(uri.toString());
                }
                else {
                    queuedFiles.add(uri.toString());
                }
                debounced = setTimeout(() => {
                    const include = req.include?.filter(t => t.uri && queuedFiles.has(t.uri?.toString())) ??
                        [...queuedFiles]
                            .map(f => getOrCreateFile(ctrl, vscode.Uri.parse(f)))
                            .filter((f) => !!f);
                    queuedFiles.clear();
                    doTestRun(new vscode.TestRunRequest(include, req.exclude, req.profile, true), cancellationToken);
                }, 1000);
            });
            cancellationToken.onCancellationRequested(() => {
                clearTimeout(debounced);
                listener.dispose();
            });
        };
    };
    ctrl.createRunProfile('Run in Electron', vscode.TestRunProfileKind.Run, createRunHandler(vscodeTestRunner_1.PlatformTestRunner, vscode.TestRunProfileKind.Run), true, undefined, true);
    ctrl.createRunProfile('Debug in Electron', vscode.TestRunProfileKind.Debug, createRunHandler(vscodeTestRunner_1.PlatformTestRunner, vscode.TestRunProfileKind.Debug), true, undefined, true);
    const coverage = ctrl.createRunProfile('Coverage in Electron', vscode.TestRunProfileKind.Coverage, createRunHandler(vscodeTestRunner_1.PlatformTestRunner, vscode.TestRunProfileKind.Coverage), true, undefined, true);
    coverage.loadDetailedCoverage = async (_run, coverage) => coverage instanceof coverageProvider_1.V8CoverageFile ? coverage.details : [];
    coverage.loadDetailedCoverageForTest = async (_run, coverage, test) => coverage instanceof coverageProvider_1.V8CoverageFile ? coverage.testDetails(test) : [];
    for (const [name, arg] of browserArgs) {
        const cfg = ctrl.createRunProfile(`Run in ${name}`, vscode.TestRunProfileKind.Run, createRunHandler(vscodeTestRunner_1.BrowserTestRunner, vscode.TestRunProfileKind.Run, [' --browser', arg]), undefined, undefined, true);
        cfg.configureHandler = () => vscode.window.showInformationMessage(`Configuring ${name}`);
        ctrl.createRunProfile(`Debug in ${name}`, vscode.TestRunProfileKind.Debug, createRunHandler(vscodeTestRunner_1.BrowserTestRunner, vscode.TestRunProfileKind.Debug, [
            '--browser',
            arg,
            '--debug-browser',
        ]), undefined, undefined, true);
    }
    function updateNodeForDocument(e) {
        const node = getOrCreateFile(ctrl, e.uri);
        const data = node && testTree_1.itemData.get(node);
        if (data instanceof testTree_1.TestFile) {
            data.updateFromContents(ctrl, e.getText(), node);
        }
    }
    for (const document of vscode.workspace.textDocuments) {
        updateNodeForDocument(document);
    }
    context.subscriptions.push(ctrl, fileChangedEmitter.event(({ uri, removed }) => {
        if (!removed) {
            const node = getOrCreateFile(ctrl, uri);
            if (node) {
                ctrl.invalidateTestResults();
            }
        }
    }), vscode.workspace.onDidOpenTextDocument(updateNodeForDocument), vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(e.document)), (0, snapshot_1.registerSnapshotUpdate)(ctrl), new failingDeepStrictEqualAssertFixer_1.FailingDeepStrictEqualAssertFixer());
}
function deactivate() {
    // no-op
}
function getOrCreateFile(controller, uri) {
    const folder = getWorkspaceFolderForTestFile(uri);
    if (!folder) {
        return undefined;
    }
    const data = new testTree_1.TestFile(uri, folder);
    const existing = controller.items.get(data.getId());
    if (existing) {
        return existing;
    }
    const file = controller.createTestItem(data.getId(), data.getLabel(), uri);
    controller.items.add(file);
    file.canResolveChildren = true;
    testTree_1.itemData.set(file, data);
    return file;
}
function gatherTestItems(collection) {
    const items = [];
    collection.forEach(item => items.push(item));
    return items;
}
async function startWatchingWorkspace(controller, fileChangedEmitter) {
    const workspaceFolder = await (0, testTree_1.guessWorkspaceFolder)();
    if (!workspaceFolder) {
        return new vscode.Disposable(() => undefined);
    }
    const pattern = new vscode.RelativePattern(workspaceFolder, TEST_FILE_PATTERN);
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidCreate(uri => {
        getOrCreateFile(controller, uri);
        fileChangedEmitter.fire({ removed: false, uri });
    });
    watcher.onDidChange(uri => fileChangedEmitter.fire({ removed: false, uri }));
    watcher.onDidDelete(uri => {
        fileChangedEmitter.fire({ removed: true, uri });
        (0, testTree_1.clearFileDiagnostics)(uri);
        controller.items.delete(uri.toString());
    });
    for (const file of await vscode.workspace.findFiles(pattern)) {
        getOrCreateFile(controller, file);
    }
    return watcher;
}
async function getPendingTestMap(ctrl, tests) {
    const queue = [tests];
    const titleMap = new Map();
    while (queue.length) {
        for (const item of queue.pop()) {
            const data = testTree_1.itemData.get(item);
            if (data instanceof testTree_1.TestFile) {
                if (!data.hasBeenRead) {
                    await data.updateFromDisk(ctrl, item);
                }
                queue.push(gatherTestItems(item.children));
            }
            else if (data instanceof testTree_1.TestCase) {
                titleMap.set(data.fullName, item);
            }
            else {
                queue.push(gatherTestItems(item.children));
            }
        }
    }
    return titleMap;
}
//# sourceMappingURL=extension.js.map