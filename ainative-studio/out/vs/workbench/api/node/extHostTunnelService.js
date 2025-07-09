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
import * as fs from 'fs';
import { exec } from 'child_process';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { MovingAverage } from '../../../base/common/numbers.js';
import { isLinux } from '../../../base/common/platform.js';
import * as resources from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import * as pfs from '../../../base/node/pfs.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ManagedSocket, connectManagedSocket } from '../../../platform/remote/common/managedSocket.js';
import { ManagedRemoteConnection } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { isAllInterfaces, isLocalhost } from '../../../platform/tunnel/common/tunnel.js';
import { NodeRemoteTunnel } from '../../../platform/tunnel/node/tunnelService.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { ExtHostTunnelService } from '../common/extHostTunnelService.js';
import { parseAddress } from '../../services/remote/common/tunnelModel.js';
export function getSockets(stdout) {
    const lines = stdout.trim().split('\n');
    const mapped = [];
    lines.forEach(line => {
        const match = /\/proc\/(\d+)\/fd\/\d+ -> socket:\[(\d+)\]/.exec(line);
        if (match && match.length >= 3) {
            mapped.push({
                pid: parseInt(match[1], 10),
                socket: parseInt(match[2], 10)
            });
        }
    });
    const socketMap = mapped.reduce((m, socket) => {
        m[socket.socket] = socket;
        return m;
    }, {});
    return socketMap;
}
export function loadListeningPorts(...stdouts) {
    const table = [].concat(...stdouts.map(loadConnectionTable));
    return [
        ...new Map(table.filter(row => row.st === '0A')
            .map(row => {
            const address = row.local_address.split(':');
            return {
                socket: parseInt(row.inode, 10),
                ip: parseIpAddress(address[0]),
                port: parseInt(address[1], 16)
            };
        }).map(port => [port.ip + ':' + port.port, port])).values()
    ];
}
export function parseIpAddress(hex) {
    let result = '';
    if (hex.length === 8) {
        for (let i = hex.length - 2; i >= 0; i -= 2) {
            result += parseInt(hex.substr(i, 2), 16);
            if (i !== 0) {
                result += '.';
            }
        }
    }
    else {
        // Nice explanation of host format in tcp6 file: https://serverfault.com/questions/592574/why-does-proc-net-tcp6-represents-1-as-1000
        for (let i = 0; i < hex.length; i += 8) {
            const word = hex.substring(i, i + 8);
            let subWord = '';
            for (let j = 8; j >= 2; j -= 2) {
                subWord += word.substring(j - 2, j);
                if ((j === 6) || (j === 2)) {
                    // Trim leading zeros
                    subWord = parseInt(subWord, 16).toString(16);
                    result += `${subWord}`;
                    subWord = '';
                    if (i + j !== hex.length - 6) {
                        result += ':';
                    }
                }
            }
        }
    }
    return result;
}
export function loadConnectionTable(stdout) {
    const lines = stdout.trim().split('\n');
    const names = lines.shift().trim().split(/\s+/)
        .filter(name => name !== 'rx_queue' && name !== 'tm->when');
    const table = lines.map(line => line.trim().split(/\s+/).reduce((obj, value, i) => {
        obj[names[i] || i] = value;
        return obj;
    }, {}));
    return table;
}
function knownExcludeCmdline(command) {
    if (command.length > 500) {
        return false;
    }
    return !!command.match(/.*\.vscode-server-[a-zA-Z]+\/bin.*/)
        || (command.indexOf('out/server-main.js') !== -1)
        || (command.indexOf('_productName=VSCode') !== -1);
}
export function getRootProcesses(stdout) {
    const lines = stdout.trim().split('\n');
    const mapped = [];
    lines.forEach(line => {
        const match = /^\d+\s+\D+\s+root\s+(\d+)\s+(\d+).+\d+\:\d+\:\d+\s+(.+)$/.exec(line);
        if (match && match.length >= 4) {
            mapped.push({
                pid: parseInt(match[1], 10),
                ppid: parseInt(match[2]),
                cmd: match[3]
            });
        }
    });
    return mapped;
}
export async function findPorts(connections, socketMap, processes) {
    const processMap = processes.reduce((m, process) => {
        m[process.pid] = process;
        return m;
    }, {});
    const ports = [];
    connections.forEach(({ socket, ip, port }) => {
        const pid = socketMap[socket] ? socketMap[socket].pid : undefined;
        const command = pid ? processMap[pid]?.cmd : undefined;
        if (pid && command && !knownExcludeCmdline(command)) {
            ports.push({ host: ip, port, detail: command, pid });
        }
    });
    return ports;
}
export function tryFindRootPorts(connections, rootProcessesStdout, previousPorts) {
    const ports = new Map();
    const rootProcesses = getRootProcesses(rootProcessesStdout);
    for (const connection of connections) {
        const previousPort = previousPorts.get(connection.port);
        if (previousPort) {
            ports.set(connection.port, previousPort);
            continue;
        }
        const rootProcessMatch = rootProcesses.find((value) => value.cmd.includes(`${connection.port}`));
        if (rootProcessMatch) {
            let bestMatch = rootProcessMatch;
            // There are often several processes that "look" like they could match the port.
            // The one we want is usually the child of the other. Find the most child process.
            let mostChild;
            do {
                mostChild = rootProcesses.find(value => value.ppid === bestMatch.pid);
                if (mostChild) {
                    bestMatch = mostChild;
                }
            } while (mostChild);
            ports.set(connection.port, { host: connection.ip, port: connection.port, pid: bestMatch.pid, detail: bestMatch.cmd, ppid: bestMatch.ppid });
        }
        else {
            ports.set(connection.port, { host: connection.ip, port: connection.port, ppid: Number.MAX_VALUE });
        }
    }
    return ports;
}
let NodeExtHostTunnelService = class NodeExtHostTunnelService extends ExtHostTunnelService {
    constructor(extHostRpc, initData, logService, signService) {
        super(extHostRpc, initData, logService);
        this.initData = initData;
        this.signService = signService;
        this._initialCandidates = undefined;
        this._foundRootPorts = new Map();
        this._candidateFindingEnabled = false;
        if (isLinux && initData.remote.isRemote && initData.remote.authority) {
            this._proxy.$setRemoteTunnelService(process.pid);
            this.setInitialCandidates();
        }
    }
    async $registerCandidateFinder(enable) {
        if (enable && this._candidateFindingEnabled) {
            // already enabled
            return;
        }
        this._candidateFindingEnabled = enable;
        let oldPorts = undefined;
        // If we already have found initial candidates send those immediately.
        if (this._initialCandidates) {
            oldPorts = this._initialCandidates;
            await this._proxy.$onFoundNewCandidates(this._initialCandidates);
        }
        // Regularly scan to see if the candidate ports have changed.
        const movingAverage = new MovingAverage();
        let scanCount = 0;
        while (this._candidateFindingEnabled) {
            const startTime = new Date().getTime();
            const newPorts = (await this.findCandidatePorts()).filter(candidate => (isLocalhost(candidate.host) || isAllInterfaces(candidate.host)));
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) found candidate ports ${newPorts.map(port => port.port).join(', ')}`);
            const timeTaken = new Date().getTime() - startTime;
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) candidate port scan took ${timeTaken} ms.`);
            // Do not count the first few scans towards the moving average as they are likely to be slower.
            if (scanCount++ > 3) {
                movingAverage.update(timeTaken);
            }
            if (!oldPorts || (JSON.stringify(oldPorts) !== JSON.stringify(newPorts))) {
                oldPorts = newPorts;
                await this._proxy.$onFoundNewCandidates(oldPorts);
            }
            const delay = this.calculateDelay(movingAverage.value);
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) next candidate port scan in ${delay} ms.`);
            await (new Promise(resolve => setTimeout(() => resolve(), delay)));
        }
    }
    calculateDelay(movingAverage) {
        // Some local testing indicated that the moving average might be between 50-100 ms.
        return Math.max(movingAverage * 20, 2000);
    }
    async setInitialCandidates() {
        this._initialCandidates = await this.findCandidatePorts();
        this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) Initial candidates found: ${this._initialCandidates.map(c => c.port).join(', ')}`);
    }
    async findCandidatePorts() {
        let tcp = '';
        let tcp6 = '';
        try {
            tcp = await fs.promises.readFile('/proc/net/tcp', 'utf8');
            tcp6 = await fs.promises.readFile('/proc/net/tcp6', 'utf8');
        }
        catch (e) {
            // File reading error. No additional handling needed.
        }
        const connections = loadListeningPorts(tcp, tcp6);
        const procSockets = await (new Promise(resolve => {
            exec('ls -l /proc/[0-9]*/fd/[0-9]* | grep socket:', (error, stdout, stderr) => {
                resolve(stdout);
            });
        }));
        const socketMap = getSockets(procSockets);
        const procChildren = await pfs.Promises.readdir('/proc');
        const processes = [];
        for (const childName of procChildren) {
            try {
                const pid = Number(childName);
                const childUri = resources.joinPath(URI.file('/proc'), childName);
                const childStat = await fs.promises.stat(childUri.fsPath);
                if (childStat.isDirectory() && !isNaN(pid)) {
                    const cwd = await fs.promises.readlink(resources.joinPath(childUri, 'cwd').fsPath);
                    const cmd = await fs.promises.readFile(resources.joinPath(childUri, 'cmdline').fsPath, 'utf8');
                    processes.push({ pid, cwd, cmd });
                }
            }
            catch (e) {
                //
            }
        }
        const unFoundConnections = [];
        const filteredConnections = connections.filter((connection => {
            const foundConnection = socketMap[connection.socket];
            if (!foundConnection) {
                unFoundConnections.push(connection);
            }
            return foundConnection;
        }));
        const foundPorts = findPorts(filteredConnections, socketMap, processes);
        let heuristicPorts;
        this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) number of possible root ports ${unFoundConnections.length}`);
        if (unFoundConnections.length > 0) {
            const rootProcesses = await (new Promise(resolve => {
                exec('ps -F -A -l | grep root', (error, stdout, stderr) => {
                    resolve(stdout);
                });
            }));
            this._foundRootPorts = tryFindRootPorts(unFoundConnections, rootProcesses, this._foundRootPorts);
            heuristicPorts = Array.from(this._foundRootPorts.values());
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) heuristic ports ${heuristicPorts.map(heuristicPort => heuristicPort.port).join(', ')}`);
        }
        return foundPorts.then(foundCandidates => {
            if (heuristicPorts) {
                return foundCandidates.concat(heuristicPorts);
            }
            else {
                return foundCandidates;
            }
        });
    }
    makeManagedTunnelFactory(authority) {
        return async (tunnelOptions) => {
            const t = new NodeRemoteTunnel({
                commit: this.initData.commit,
                quality: this.initData.quality,
                logService: this.logService,
                ipcLogger: null,
                // services and address providers have stubs since we don't need
                // the connection identification that the renderer process uses
                remoteSocketFactoryService: {
                    _serviceBrand: undefined,
                    async connect(_connectTo, path, query, debugLabel) {
                        const result = await authority.makeConnection();
                        return ExtHostManagedSocket.connect(result, path, query, debugLabel);
                    },
                    register() {
                        throw new Error('not implemented');
                    },
                },
                addressProvider: {
                    getAddress() {
                        return Promise.resolve({
                            connectTo: new ManagedRemoteConnection(0),
                            connectionToken: authority.connectionToken,
                        });
                    },
                },
                signService: this.signService,
            }, 'localhost', tunnelOptions.remoteAddress.host || 'localhost', tunnelOptions.remoteAddress.port, tunnelOptions.localAddressPort);
            await t.waitForReady();
            const disposeEmitter = new Emitter();
            return {
                localAddress: parseAddress(t.localAddress) ?? t.localAddress,
                remoteAddress: { port: t.tunnelRemotePort, host: t.tunnelRemoteHost },
                onDidDispose: disposeEmitter.event,
                dispose: () => {
                    t.dispose();
                    disposeEmitter.fire();
                    disposeEmitter.dispose();
                },
            };
        };
    }
};
NodeExtHostTunnelService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, ILogService),
    __param(3, ISignService)
], NodeExtHostTunnelService);
export { NodeExtHostTunnelService };
class ExtHostManagedSocket extends ManagedSocket {
    static connect(passing, path, query, debugLabel) {
        const d = new DisposableStore();
        const half = {
            onClose: d.add(new Emitter()),
            onData: d.add(new Emitter()),
            onEnd: d.add(new Emitter()),
        };
        d.add(passing.onDidReceiveMessage(d => half.onData.fire(VSBuffer.wrap(d))));
        d.add(passing.onDidEnd(() => half.onEnd.fire()));
        d.add(passing.onDidClose(error => half.onClose.fire({
            type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
            error,
            hadError: !!error
        })));
        const socket = new ExtHostManagedSocket(passing, debugLabel, half);
        socket._register(d);
        return connectManagedSocket(socket, path, query, debugLabel, half);
    }
    constructor(passing, debugLabel, half) {
        super(debugLabel, half);
        this.passing = passing;
    }
    write(buffer) {
        this.passing.send(buffer.buffer);
    }
    closeRemote() {
        this.passing.end();
    }
    async drain() {
        await this.passing.drain?.();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RUdW5uZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEtBQUssU0FBUyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEtBQUssR0FBRyxNQUFNLDJCQUEyQixDQUFDO0FBRWpELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFvQixvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxn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