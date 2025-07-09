/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { parseEnvFile } from '../../../base/common/envfile.js';
import { URI } from '../../../base/common/uri.js';
import { StreamSplitter } from '../../../base/node/nodeStreams.js';
import { LogLevel } from '../../../platform/log/common/log.js';
import { ExtHostMcpService } from '../common/extHostMcp.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { findExecutable } from '../../../base/node/processes.js';
let NodeExtHostMpcService = class NodeExtHostMpcService extends ExtHostMcpService {
    constructor(extHostRpc) {
        super(extHostRpc);
        this.nodeServers = new Map();
    }
    _startMcp(id, launch) {
        if (launch.type === 1 /* McpServerTransportType.Stdio */) {
            this.startNodeMpc(id, launch);
        }
        else {
            super._startMcp(id, launch);
        }
    }
    $stopMcp(id) {
        const nodeServer = this.nodeServers.get(id);
        if (nodeServer) {
            nodeServer.abortCtrl.abort();
            this.nodeServers.delete(id);
        }
        else {
            super.$stopMcp(id);
        }
    }
    $sendMessage(id, message) {
        const nodeServer = this.nodeServers.get(id);
        if (nodeServer) {
            nodeServer.child.stdin.write(message + '\n');
        }
        else {
            super.$sendMessage(id, message);
        }
    }
    async startNodeMpc(id, launch) {
        const onError = (err) => this._proxy.$onDidChangeState(id, {
            state: 3 /* McpConnectionState.Kind.Error */,
            message: typeof err === 'string' ? err : err.message,
        });
        // MCP servers are run on the same authority where they are defined, so
        // reading the envfile based on its path off the filesystem here is fine.
        const env = { ...process.env };
        if (launch.envFile) {
            try {
                for (const [key, value] of parseEnvFile(await readFile(launch.envFile, 'utf-8'))) {
                    env[key] = value;
                }
            }
            catch (e) {
                onError(`Failed to read envFile '${launch.envFile}': ${e.message}`);
                return;
            }
        }
        for (const [key, value] of Object.entries(launch.env)) {
            env[key] = value === null ? undefined : String(value);
        }
        const abortCtrl = new AbortController();
        let child;
        try {
            const cwd = launch.cwd ? URI.revive(launch.cwd).fsPath : homedir();
            const { executable, args, shell } = await formatSubprocessArguments(launch.command, launch.args, cwd, env);
            this._proxy.$onDidPublishLog(id, LogLevel.Debug, `Server command line: ${executable} ${args.join(' ')}`);
            child = spawn(executable, args, {
                stdio: 'pipe',
                cwd: launch.cwd ? URI.revive(launch.cwd).fsPath : homedir(),
                signal: abortCtrl.signal,
                env,
                shell,
            });
        }
        catch (e) {
            onError(e);
            abortCtrl.abort();
            return;
        }
        this._proxy.$onDidChangeState(id, { state: 1 /* McpConnectionState.Kind.Starting */ });
        child.stdout.pipe(new StreamSplitter('\n')).on('data', line => this._proxy.$onDidReceiveMessage(id, line.toString()));
        child.stdin.on('error', onError);
        child.stdout.on('error', onError);
        // Stderr handling is not currently specified https://github.com/modelcontextprotocol/specification/issues/177
        // Just treat it as generic log data for now
        child.stderr.pipe(new StreamSplitter('\n')).on('data', line => this._proxy.$onDidPublishLog(id, LogLevel.Warning, `[server stderr] ${line.toString().trimEnd()}`));
        child.on('spawn', () => this._proxy.$onDidChangeState(id, { state: 2 /* McpConnectionState.Kind.Running */ }));
        child.on('error', e => {
            if (abortCtrl.signal.aborted) {
                this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
            }
            else {
                onError(e);
            }
        });
        child.on('exit', code => code === 0 || abortCtrl.signal.aborted
            ? this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ })
            : this._proxy.$onDidChangeState(id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `Process exited with code ${code}`,
            }));
        this.nodeServers.set(id, { abortCtrl, child });
    }
};
NodeExtHostMpcService = __decorate([
    __param(0, IExtHostRpcService)
], NodeExtHostMpcService);
export { NodeExtHostMpcService };
const windowsShellScriptRe = /\.(bat|cmd)$/i;
/**
 * Formats arguments to avoid issues on Windows for CVE-2024-27980.
 */
export const formatSubprocessArguments = async (executable, args, cwd, env) => {
    if (process.platform !== 'win32') {
        return { executable, args, shell: false };
    }
    const found = await findExecutable(executable, cwd, undefined, env);
    if (found && windowsShellScriptRe.test(found)) {
        const quote = (s) => s.includes(' ') ? `"${s}"` : s;
        return {
            executable: quote(found),
            args: args.map(quote),
            shell: true,
        };
    }
    return { executable, args, shell: false };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1wY05vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RNcGNOb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBa0MsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM3QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsaUJBQWlCO0lBQzNELFlBQ3FCLFVBQThCO1FBRWxELEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUdYLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBR3pCLENBQUM7SUFMTCxDQUFDO0lBT2tCLFNBQVMsQ0FBQyxFQUFVLEVBQUUsTUFBdUI7UUFDL0QsSUFBSSxNQUFNLENBQUMsSUFBSSx5Q0FBaUMsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxF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