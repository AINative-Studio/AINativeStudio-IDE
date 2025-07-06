/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import * as net from 'net';
import * as objects from '../../../../base/common/objects.js';
import * as path from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { Promises } from '../../../../base/node/pfs.js';
import * as nls from '../../../../nls.js';
import { AbstractDebugAdapter } from '../common/abstractDebugAdapter.js';
/**
 * An implementation that communicates via two streams with the debug adapter.
 */
export class StreamDebugAdapter extends AbstractDebugAdapter {
    static { this.TWO_CRLF = '\r\n\r\n'; }
    static { this.HEADER_LINESEPARATOR = /\r?\n/; } // allow for non-RFC 2822 conforming line separators
    static { this.HEADER_FIELDSEPARATOR = /: */; }
    constructor() {
        super();
        this.rawData = Buffer.allocUnsafe(0);
        this.contentLength = -1;
    }
    connect(readable, writable) {
        this.outputStream = writable;
        this.rawData = Buffer.allocUnsafe(0);
        this.contentLength = -1;
        readable.on('data', (data) => this.handleData(data));
    }
    sendMessage(message) {
        if (this.outputStream) {
            const json = JSON.stringify(message);
            this.outputStream.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}${StreamDebugAdapter.TWO_CRLF}${json}`, 'utf8');
        }
    }
    handleData(data) {
        this.rawData = Buffer.concat([this.rawData, data]);
        while (true) {
            if (this.contentLength >= 0) {
                if (this.rawData.length >= this.contentLength) {
                    const message = this.rawData.toString('utf8', 0, this.contentLength);
                    this.rawData = this.rawData.slice(this.contentLength);
                    this.contentLength = -1;
                    if (message.length > 0) {
                        try {
                            this.acceptMessage(JSON.parse(message));
                        }
                        catch (e) {
                            this._onError.fire(new Error((e.message || e) + '\n' + message));
                        }
                    }
                    continue; // there may be more complete messages to process
                }
            }
            else {
                const idx = this.rawData.indexOf(StreamDebugAdapter.TWO_CRLF);
                if (idx !== -1) {
                    const header = this.rawData.toString('utf8', 0, idx);
                    const lines = header.split(StreamDebugAdapter.HEADER_LINESEPARATOR);
                    for (const h of lines) {
                        const kvPair = h.split(StreamDebugAdapter.HEADER_FIELDSEPARATOR);
                        if (kvPair[0] === 'Content-Length') {
                            this.contentLength = Number(kvPair[1]);
                        }
                    }
                    this.rawData = this.rawData.slice(idx + StreamDebugAdapter.TWO_CRLF.length);
                    continue;
                }
            }
            break;
        }
    }
}
export class NetworkDebugAdapter extends StreamDebugAdapter {
    startSession() {
        return new Promise((resolve, reject) => {
            let connected = false;
            this.socket = this.createConnection(() => {
                this.connect(this.socket, this.socket);
                resolve();
                connected = true;
            });
            this.socket.on('close', () => {
                if (connected) {
                    this._onError.fire(new Error('connection closed'));
                }
                else {
                    reject(new Error('connection closed'));
                }
            });
            this.socket.on('error', error => {
                // On ipv6 posix this can be an AggregateError which lacks a message. Use the first.
                if (error instanceof AggregateError) {
                    error = error.errors[0];
                }
                if (connected) {
                    this._onError.fire(error);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    async stopSession() {
        await this.cancelPendingRequests();
        if (this.socket) {
            this.socket.end();
            this.socket = undefined;
        }
    }
}
/**
 * An implementation that connects to a debug adapter via a socket.
*/
export class SocketDebugAdapter extends NetworkDebugAdapter {
    constructor(adapterServer) {
        super();
        this.adapterServer = adapterServer;
    }
    createConnection(connectionListener) {
        return net.createConnection(this.adapterServer.port, this.adapterServer.host || '127.0.0.1', connectionListener);
    }
}
/**
 * An implementation that connects to a debug adapter via a NamedPipe (on Windows)/UNIX Domain Socket (on non-Windows).
 */
export class NamedPipeDebugAdapter extends NetworkDebugAdapter {
    constructor(adapterServer) {
        super();
        this.adapterServer = adapterServer;
    }
    createConnection(connectionListener) {
        return net.createConnection(this.adapterServer.path, connectionListener);
    }
}
/**
 * An implementation that launches the debug adapter as a separate process and communicates via stdin/stdout.
*/
export class ExecutableDebugAdapter extends StreamDebugAdapter {
    constructor(adapterExecutable, debugType) {
        super();
        this.adapterExecutable = adapterExecutable;
        this.debugType = debugType;
    }
    async startSession() {
        const command = this.adapterExecutable.command;
        const args = this.adapterExecutable.args;
        const options = this.adapterExecutable.options || {};
        try {
            // verify executables asynchronously
            if (command) {
                if (path.isAbsolute(command)) {
                    const commandExists = await Promises.exists(command);
                    if (!commandExists) {
                        throw new Error(nls.localize('debugAdapterBinNotFound', "Debug adapter executable '{0}' does not exist.", command));
                    }
                }
                else {
                    // relative path
                    if (command.indexOf('/') < 0 && command.indexOf('\\') < 0) {
                        // no separators: command looks like a runtime name like 'node' or 'mono'
                        // TODO: check that the runtime is available on PATH
                    }
                }
            }
            else {
                throw new Error(nls.localize({ key: 'debugAdapterCannotDetermineExecutable', comment: ['Adapter executable file not found'] }, "Cannot determine executable for debug adapter '{0}'.", this.debugType));
            }
            let env = process.env;
            if (options.env && Object.keys(options.env).length > 0) {
                env = objects.mixin(objects.deepClone(process.env), options.env);
            }
            if (command === 'node') {
                if (Array.isArray(args) && args.length > 0) {
                    const isElectron = !!process.env['ELECTRON_RUN_AS_NODE'] || !!process.versions['electron'];
                    const forkOptions = {
                        env: env,
                        execArgv: isElectron ? ['-e', 'delete process.env.ELECTRON_RUN_AS_NODE;require(process.argv[1])'] : [],
                        silent: true
                    };
                    if (options.cwd) {
                        forkOptions.cwd = options.cwd;
                    }
                    const child = cp.fork(args[0], args.slice(1), forkOptions);
                    if (!child.pid) {
                        throw new Error(nls.localize('unableToLaunchDebugAdapter', "Unable to launch debug adapter from '{0}'.", args[0]));
                    }
                    this.serverProcess = child;
                }
                else {
                    throw new Error(nls.localize('unableToLaunchDebugAdapterNoArgs', "Unable to launch debug adapter."));
                }
            }
            else {
                let spawnCommand = command;
                let spawnArgs = args;
                const spawnOptions = {
                    env: env
                };
                if (options.cwd) {
                    spawnOptions.cwd = options.cwd;
                }
                if (platform.isWindows && (command.endsWith('.bat') || command.endsWith('.cmd'))) {
                    // https://github.com/microsoft/vscode/issues/224184
                    spawnOptions.shell = true;
                    spawnCommand = `"${command}"`;
                    spawnArgs = args.map(a => {
                        a = a.replace(/"/g, '\\"'); // Escape existing double quotes with \
                        // Wrap in double quotes
                        return `"${a}"`;
                    });
                }
                this.serverProcess = cp.spawn(spawnCommand, spawnArgs, spawnOptions);
            }
            this.serverProcess.on('error', err => {
                this._onError.fire(err);
            });
            this.serverProcess.on('exit', (code, signal) => {
                this._onExit.fire(code);
            });
            this.serverProcess.stdout.on('close', () => {
                this._onError.fire(new Error('read error'));
            });
            this.serverProcess.stdout.on('error', error => {
                this._onError.fire(error);
            });
            this.serverProcess.stdin.on('error', error => {
                this._onError.fire(error);
            });
            this.serverProcess.stderr.resume();
            // finally connect to the DA
            this.connect(this.serverProcess.stdout, this.serverProcess.stdin);
        }
        catch (err) {
            this._onError.fire(err);
        }
    }
    async stopSession() {
        if (!this.serverProcess) {
            return Promise.resolve(undefined);
        }
        // when killing a process in windows its child
        // processes are *not* killed but become root
        // processes. Therefore we use TASKKILL.EXE
        await this.cancelPendingRequests();
        if (platform.isWindows) {
            return new Promise((c, e) => {
                const killer = cp.exec(`taskkill /F /T /PID ${this.serverProcess.pid}`, function (err, stdout, stderr) {
                    if (err) {
                        return e(err);
                    }
                });
                killer.on('exit', c);
                killer.on('error', e);
            });
        }
        else {
            this.serverProcess.kill('SIGTERM');
            return Promise.resolve(undefined);
        }
    }
    static extract(platformContribution, extensionFolderPath) {
        if (!platformContribution) {
            return undefined;
        }
        const result = Object.create(null);
        if (platformContribution.runtime) {
            if (platformContribution.runtime.indexOf('./') === 0) { // TODO
                result.runtime = path.join(extensionFolderPath, platformContribution.runtime);
            }
            else {
                result.runtime = platformContribution.runtime;
            }
        }
        if (platformContribution.runtimeArgs) {
            result.runtimeArgs = platformContribution.runtimeArgs;
        }
        if (platformContribution.program) {
            if (!path.isAbsolute(platformContribution.program)) {
                result.program = path.join(extensionFolderPath, platformContribution.program);
            }
            else {
                result.program = platformContribution.program;
            }
        }
        if (platformContribution.args) {
            result.args = platformContribution.args;
        }
        const contribution = platformContribution;
        if (contribution.win) {
            result.win = ExecutableDebugAdapter.extract(contribution.win, extensionFolderPath);
        }
        if (contribution.winx86) {
            result.winx86 = ExecutableDebugAdapter.extract(contribution.winx86, extensionFolderPath);
        }
        if (contribution.windows) {
            result.windows = ExecutableDebugAdapter.extract(contribution.windows, extensionFolderPath);
        }
        if (contribution.osx) {
            result.osx = ExecutableDebugAdapter.extract(contribution.osx, extensionFolderPath);
        }
        if (contribution.linux) {
            result.linux = ExecutableDebugAdapter.extract(contribution.linux, extensionFolderPath);
        }
        return result;
    }
    static platformAdapterExecutable(extensionDescriptions, debugType) {
        let result = Object.create(null);
        debugType = debugType.toLowerCase();
        // merge all contributions into one
        for (const ed of extensionDescriptions) {
            if (ed.contributes) {
                const debuggers = ed.contributes['debuggers'];
                if (debuggers && debuggers.length > 0) {
                    debuggers.filter(dbg => typeof dbg.type === 'string' && strings.equalsIgnoreCase(dbg.type, debugType)).forEach(dbg => {
                        // extract relevant attributes and make them absolute where needed
                        const extractedDbg = ExecutableDebugAdapter.extract(dbg, ed.extensionLocation.fsPath);
                        // merge
                        result = objects.mixin(result, extractedDbg, ed.isBuiltin);
                    });
                }
            }
        }
        // select the right platform
        let platformInfo;
        if (platform.isWindows && !process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) {
            platformInfo = result.winx86 || result.win || result.windows;
        }
        else if (platform.isWindows) {
            platformInfo = result.win || result.windows;
        }
        else if (platform.isMacintosh) {
            platformInfo = result.osx;
        }
        else if (platform.isLinux) {
            platformInfo = result.linux;
        }
        platformInfo = platformInfo || result;
        // these are the relevant attributes
        const program = platformInfo.program || result.program;
        const args = platformInfo.args || result.args;
        const runtime = platformInfo.runtime || result.runtime;
        const runtimeArgs = platformInfo.runtimeArgs || result.runtimeArgs;
        if (runtime) {
            return {
                type: 'executable',
                command: runtime,
                args: (runtimeArgs || []).concat(typeof program === 'string' ? [program] : []).concat(args || [])
            };
        }
        else if (program) {
            return {
                type: 'executable',
                command: program,
                args: args || []
            };
        }
        // nothing found
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvbm9kZS9kZWJ1Z0FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFFM0IsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV6RTs7R0FFRztBQUNILE1BQU0sT0FBZ0Isa0JBQW1CLFNBQVEsb0JBQW9CO2FBRTVDLGFBQVEsR0FBRyxVQUFVLEFBQWIsQ0FBYzthQUN0Qix5QkFBb0IsR0FBRyxPQUFPLEFBQVYsQ0FBVyxHQUFDLG9EQUFvRDthQUNwRiwwQkFBcUIsR0FBRyxLQUFLLEFBQVIsQ0FBUztJQU10RDtRQUNDLEtBQUssRUFBRSxDQUFDO1FBSkQsWUFBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEMsa0JBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUkzQixDQUFDO0lBRVMsT0FBTyxDQUFDLFFBQXlCLEVBQUUsUUFBeUI7UUFFckUsSUFBSSxDQUFDLFlBQVksR0FBRyxR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