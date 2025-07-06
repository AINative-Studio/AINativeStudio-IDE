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
exports.PlatformTestRunner = exports.DarwinTestRunner = exports.PosixTestRunner = exports.WindowsTestRunner = exports.BrowserTestRunner = exports.VSCodeTestRunner = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const net_1 = require("net");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const testOutputScanner_1 = require("./testOutputScanner");
const testTree_1 = require("./testTree");
/**
 * From MDN
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
 */
const escapeRe = (s) => s.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
const TEST_ELECTRON_SCRIPT_PATH = 'test/unit/electron/index.js';
const TEST_BROWSER_SCRIPT_PATH = 'test/unit/browser/index.js';
const ATTACH_CONFIG_NAME = 'Attach to VS Code';
const DEBUG_TYPE = 'pwa-chrome';
class VSCodeTestRunner {
    constructor(repoLocation) {
        this.repoLocation = repoLocation;
    }
    async run(baseArgs, filter) {
        const args = this.prepareArguments(baseArgs, filter);
        const cp = (0, child_process_1.spawn)(await this.binaryPath(), args, {
            cwd: this.repoLocation.uri.fsPath,
            stdio: 'pipe',
            env: this.getEnvironment(),
        });
        return new testOutputScanner_1.TestOutputScanner(cp, args);
    }
    async debug(testRun, baseArgs, filter) {
        const port = await this.findOpenPort();
        const baseConfiguration = vscode.workspace
            .getConfiguration('launch', this.repoLocation)
            .get('configurations', [])
            .find(c => c.name === ATTACH_CONFIG_NAME);
        if (!baseConfiguration) {
            throw new Error(`Could not find launch configuration ${ATTACH_CONFIG_NAME}`);
        }
        const server = this.createWaitServer();
        const args = [
            ...this.prepareArguments(baseArgs, filter),
            `--remote-debugging-port=${port}`,
            // for breakpoint freeze: https://github.com/microsoft/vscode/issues/122225#issuecomment-885377304
            '--js-flags="--regexp_interpret_all"',
            // for general runtime freezes: https://github.com/microsoft/vscode/issues/127861#issuecomment-904144910
            '--disable-features=CalculateNativeWinOcclusion',
            '--timeout=0',
            `--waitServer=${server.port}`,
        ];
        const cp = (0, child_process_1.spawn)(await this.binaryPath(), args, {
            cwd: this.repoLocation.uri.fsPath,
            stdio: 'pipe',
            env: this.getEnvironment(port),
        });
        // Register a descriptor factory that signals the server when any
        // breakpoint set requests on the debugee have been completed.
        const factory = vscode.debug.registerDebugAdapterTrackerFactory(DEBUG_TYPE, {
            createDebugAdapterTracker(session) {
                if (!session.parentSession || session.parentSession !== rootSession) {
                    return;
                }
                let initRequestId;
                return {
                    onDidSendMessage(message) {
                        if (message.type === 'response' && message.request_seq === initRequestId) {
                            server.ready();
                        }
                    },
                    onWillReceiveMessage(message) {
                        if (initRequestId !== undefined) {
                            return;
                        }
                        if (message.command === 'launch' || message.command === 'attach') {
                            initRequestId = message.seq;
                        }
                    },
                };
            },
        });
        vscode.debug.startDebugging(this.repoLocation, { ...baseConfiguration, port }, { testRun });
        let exited = false;
        let rootSession;
        cp.once('exit', () => {
            exited = true;
            server.dispose();
            listener.dispose();
            factory.dispose();
            if (rootSession) {
                vscode.debug.stopDebugging(rootSession);
            }
        });
        const listener = vscode.debug.onDidStartDebugSession(s => {
            if (s.name === ATTACH_CONFIG_NAME && !rootSession) {
                if (exited) {
                    vscode.debug.stopDebugging(rootSession);
                }
                else {
                    rootSession = s;
                }
            }
        });
        return new testOutputScanner_1.TestOutputScanner(cp, args);
    }
    findOpenPort() {
        return new Promise((resolve, reject) => {
            const server = (0, net_1.createServer)();
            server.listen(0, () => {
                const address = server.address();
                const port = address.port;
                server.close(() => {
                    resolve(port);
                });
            });
            server.on('error', (error) => {
                reject(error);
            });
        });
    }
    getEnvironment(_remoteDebugPort) {
        return {
            ...process.env,
            ELECTRON_RUN_AS_NODE: undefined,
            ELECTRON_ENABLE_LOGGING: '1',
        };
    }
    prepareArguments(baseArgs, filter) {
        const args = [...this.getDefaultArgs(), ...baseArgs, '--reporter', 'full-json-stream'];
        if (!filter) {
            return args;
        }
        const grepRe = [];
        const runPaths = new Set();
        const addTestFileRunPath = (data) => runPaths.add(path.relative(data.workspaceFolder.uri.fsPath, data.uri.fsPath).replace(/\\/g, '/'));
        const itemDatas = filter.map(f => testTree_1.itemData.get(f));
        /** If true, we have to be careful with greps, as a grep for one test file affects the run of the other test file. */
        const hasBothTestCaseOrTestSuiteAndTestFileFilters = itemDatas.some(d => (d instanceof testTree_1.TestCase) || (d instanceof testTree_1.TestSuite)) &&
            itemDatas.some(d => d instanceof testTree_1.TestFile);
        function addTestCaseOrSuite(data, test) {
            grepRe.push(escapeRe(data.fullName) + (data instanceof testTree_1.TestCase ? '$' : ' '));
            for (let p = test.parent; p; p = p.parent) {
                const parentData = testTree_1.itemData.get(p);
                if (parentData instanceof testTree_1.TestFile) {
                    addTestFileRunPath(parentData);
                }
            }
        }
        for (const test of filter) {
            const data = testTree_1.itemData.get(test);
            if (data instanceof testTree_1.TestCase || data instanceof testTree_1.TestSuite) {
                addTestCaseOrSuite(data, test);
            }
            else if (data instanceof testTree_1.TestFile) {
                if (!hasBothTestCaseOrTestSuiteAndTestFileFilters) {
                    addTestFileRunPath(data);
                }
                else {
                    // We add all the items individually so they get their own grep expressions.
                    for (const [_id, nestedTest] of test.children) {
                        const childData = testTree_1.itemData.get(nestedTest);
                        if (childData instanceof testTree_1.TestCase || childData instanceof testTree_1.TestSuite) {
                            addTestCaseOrSuite(childData, nestedTest);
                        }
                        else {
                            console.error('Unexpected test item in test file', nestedTest.id, nestedTest.label);
                        }
                    }
                }
            }
        }
        if (grepRe.length) {
            args.push('--grep', `/^(${grepRe.join('|')})/`);
        }
        if (runPaths.size) {
            args.push(...[...runPaths].flatMap(p => ['--run', p]));
        }
        return args;
    }
    async readProductJson() {
        const projectJson = await fs_1.promises.readFile(path.join(this.repoLocation.uri.fsPath, 'product.json'), 'utf-8');
        try {
            return JSON.parse(projectJson);
        }
        catch (e) {
            throw new Error(`Error parsing product.json: ${e.message}`);
        }
    }
    createWaitServer() {
        const onReady = new vscode.EventEmitter();
        let ready = false;
        const server = (0, net_1.createServer)(socket => {
            if (ready) {
                socket.end();
            }
            else {
                onReady.event(() => socket.end());
            }
        });
        server.listen(0);
        return {
            port: server.address().port,
            ready: () => {
                ready = true;
                onReady.fire();
            },
            dispose: () => {
                server.close();
            },
        };
    }
}
exports.VSCodeTestRunner = VSCodeTestRunner;
class BrowserTestRunner extends VSCodeTestRunner {
    /** @override */
    binaryPath() {
        return Promise.resolve(process.execPath);
    }
    /** @override */
    getEnvironment(remoteDebugPort) {
        return {
            ...super.getEnvironment(remoteDebugPort),
            PLAYWRIGHT_CHROMIUM_DEBUG_PORT: remoteDebugPort ? String(remoteDebugPort) : undefined,
            ELECTRON_RUN_AS_NODE: '1',
        };
    }
    /** @override */
    getDefaultArgs() {
        return [TEST_BROWSER_SCRIPT_PATH];
    }
}
exports.BrowserTestRunner = BrowserTestRunner;
class WindowsTestRunner extends VSCodeTestRunner {
    /** @override */
    async binaryPath() {
        const { nameShort } = await this.readProductJson();
        return path.join(this.repoLocation.uri.fsPath, `.build/electron/${nameShort}.exe`);
    }
    /** @override */
    getDefaultArgs() {
        return [TEST_ELECTRON_SCRIPT_PATH];
    }
}
exports.WindowsTestRunner = WindowsTestRunner;
class PosixTestRunner extends VSCodeTestRunner {
    /** @override */
    async binaryPath() {
        const { applicationName } = await this.readProductJson();
        return path.join(this.repoLocation.uri.fsPath, `.build/electron/${applicationName}`);
    }
    /** @override */
    getDefaultArgs() {
        return [TEST_ELECTRON_SCRIPT_PATH];
    }
}
exports.PosixTestRunner = PosixTestRunner;
class DarwinTestRunner extends PosixTestRunner {
    /** @override */
    getDefaultArgs() {
        return [
            TEST_ELECTRON_SCRIPT_PATH,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=swiftshader',
        ];
    }
    /** @override */
    async binaryPath() {
        const { nameLong } = await this.readProductJson();
        return path.join(this.repoLocation.uri.fsPath, `.build/electron/${nameLong}.app/Contents/MacOS/Electron`);
    }
}
exports.DarwinTestRunner = DarwinTestRunner;
exports.PlatformTestRunner = process.platform === 'win32'
    ? WindowsTestRunner
    : process.platform === 'darwin'
        ? DarwinTestRunner
        : PosixTestRunner;
//# sourceMappingURL=vscodeTestRunner.js.map