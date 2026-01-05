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
exports.WSLManager = void 0;
const cp = __importStar(require("child_process"));
const event_1 = require("../common/event");
const wslBinary = 'wsl.exe';
class WSLManager {
    constructor(logger) {
        this.logger = logger;
    }
    async listDistros() {
        const resp = this._runWSLCommand(['--list', '--verbose'], 'utf16le');
        const { exitCode } = await resp.exitPromise;
        const { stdout, stderr } = resp;
        if (exitCode) {
            this.logger.trace(`Command wsl listDistros exited with code ${exitCode}`, stdout + '\n\n' + stderr);
            throw new Error(`Command wsl listDistros exited with code ${exitCode}`);
        }
        const regex = /(?<default>\*|\s)\s+(?<name>[\w\.-]+)\s+(?<state>[\w]+)\s+(?<version>\d)/;
        const distros = [];
        for (const line of stdout.split(/\r?\n/)) {
            const matches = line.match(regex);
            if (matches && matches.groups) {
                distros.push({
                    isDefault: matches.groups.default === '*',
                    name: matches.groups.name,
                    state: matches.groups.state,
                    version: matches.groups.version,
                });
            }
        }
        return distros;
    }
    async listOnlineDistros() {
        const resp = this._runWSLCommand(['--list', '--online'], 'utf16le');
        const { exitCode } = await resp.exitPromise;
        const { stdout, stderr } = resp;
        if (exitCode) {
            this.logger.trace(`Command wsl listOnlineDistros exited with code ${exitCode}`, stdout + '\n\n' + stderr);
            throw new Error(`Command wsl listOnlineDistros exited with code ${exitCode}`);
        }
        let lines = stdout.split(/\r?\n/);
        const idx = lines.findIndex(l => /\s*NAME\s+FRIENDLY NAME\s*/.test(l));
        lines = lines.slice(idx + 1);
        const regex = /(?<name>[\w\.-]+)\s+(?<friendlyName>\w.+\w)/;
        const distros = [];
        for (const line of lines) {
            const matches = line.match(regex);
            if (matches && matches.groups) {
                distros.push({
                    name: matches.groups.name,
                    friendlyName: matches.groups.friendlyName,
                });
            }
        }
        return distros;
    }
    async setDefaultDistro(distroName) {
        const resp = this._runWSLCommand(['--set-default', distroName], 'utf16le');
        const { exitCode } = await resp.exitPromise;
        const { stdout, stderr } = resp;
        if (exitCode) {
            this.logger.trace(`Command wsl setDefaultDistro exited with code ${exitCode}`, stdout + '\n\n' + stderr);
            throw new Error(`Command wsl setDefaultDistro exited with code ${exitCode}`);
        }
    }
    async deleteDistro(distroName) {
        const resp = this._runWSLCommand(['--unregister', distroName], 'utf16le');
        const { exitCode } = await resp.exitPromise;
        const { stdout, stderr } = resp;
        if (exitCode) {
            this.logger.trace(`Command wsl deleteDistro exited with code ${exitCode}`, stdout + '\n\n' + stderr);
            throw new Error(`Command wsl deleteDistro exited with code ${exitCode}`);
        }
    }
    async exec(cmd, args, distro) {
        return this._runWSLCommand(['--distribution', distro, '--', cmd, ...args], 'utf8');
    }
    _runWSLCommand(args, encoding) {
        this.logger.trace(`Running WSL command: ${wslBinary} ${args.join(' ')}`);
        const cmd = cp.spawn(wslBinary, args, { windowsHide: true, windowsVerbatimArguments: true });
        const stdoutDataEmitter = new event_1.EventEmitter();
        const stdoutData = [];
        const stderrDataEmitter = new event_1.EventEmitter();
        const stderrData = [];
        cmd.stdout.on('data', (data) => {
            stdoutData.push(data);
            stdoutDataEmitter.fire(data);
        });
        cmd.stderr.on('data', (data) => {
            stderrData.push(data);
            stderrDataEmitter.fire(data);
        });
        const exitPromise = new Promise((resolve, reject) => {
            cmd.on('error', (err) => {
                this.logger.error(`Error running WSL command: ${wslBinary} ${args.join(' ')}`, err);
                reject(err);
            });
            cmd.on('exit', (code, _signal) => {
                resolve({ exitCode: code ?? 0 });
            });
        });
        return {
            get stdout() {
                return Buffer.concat(stdoutData).toString(encoding);
            },
            get stderr() {
                return Buffer.concat(stderrData).toString(encoding);
            },
            get onStdoutData() {
                return stdoutDataEmitter.event;
            },
            get onStderrData() {
                return stderrDataEmitter.event;
            },
            exitPromise
        };
    }
}
exports.WSLManager = WSLManager;
//# sourceMappingURL=wslManager.js.map