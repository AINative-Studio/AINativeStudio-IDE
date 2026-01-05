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
const events_1 = require("events");
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const ssh2_1 = require("ssh2");
const simple_socks_1 = require("simple-socks");
const defaultOptions = {
    reconnect: false,
    port: 22,
    reconnectTries: 3,
    reconnectDelay: 5000
};
const SSHConstants = {
    'CHANNEL': {
        SSH: 'ssh',
        TUNNEL: 'tunnel',
        X11: 'x11'
    },
    'STATUS': {
        BEFORECONNECT: 'beforeconnect',
        CONNECT: 'connect',
        BEFOREDISCONNECT: 'beforedisconnect',
        DISCONNECT: 'disconnect'
    }
};
class SSHConnection extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.activeTunnels = {};
        this.__$connectPromise = null;
        this.__retries = 0;
        this.__err = null;
        this.sshConnection = null;
        this.config = Object.assign({}, defaultOptions, options);
        this.config.uniqueId = this.config.uniqueId || `${this.config.username}@${this.config.host}`;
    }
    /**
      * Emit message on this channel
      */
    emit(channel, status, payload) {
        super.emit(channel, status, this, payload);
        return super.emit(`${channel}:${status}`, this, payload);
    }
    /**
     * Get shell socket
     */
    shell(options = {}) {
        return this.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.sshConnection.shell(options, (err, stream) => err ? reject(err) : resolve(stream));
            });
        });
    }
    /**
     * Exec a command
     */
    exec(cmd, params, options = {}) {
        cmd += (Array.isArray(params) ? (' ' + params.join(' ')) : '');
        return this.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.sshConnection.exec(cmd, options, (err, stream) => {
                    if (err) {
                        return reject(err);
                    }
                    let stdout = '';
                    let stderr = '';
                    stream.on('close', function () {
                        return resolve({ stdout, stderr });
                    }).on('data', function (data) {
                        stdout += data.toString();
                    }).stderr.on('data', function (data) {
                        stderr += data.toString();
                    });
                });
            });
        });
    }
    /**
     * Exec a command
     */
    execPartial(cmd, tester, params, options = {}) {
        cmd += (Array.isArray(params) ? (' ' + params.join(' ')) : '');
        return this.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.sshConnection.exec(cmd, options, (err, stream) => {
                    if (err) {
                        return reject(err);
                    }
                    let stdout = '';
                    let stderr = '';
                    let resolved = false;
                    stream.on('close', function () {
                        if (!resolved) {
                            return resolve({ stdout, stderr });
                        }
                    }).on('data', function (data) {
                        stdout += data.toString();
                        if (tester(stdout, stderr)) {
                            resolved = true;
                            return resolve({ stdout, stderr });
                        }
                    }).stderr.on('data', function (data) {
                        stderr += data.toString();
                        if (tester(stdout, stderr)) {
                            resolved = true;
                            return resolve({ stdout, stderr });
                        }
                    });
                });
            });
        });
    }
    /**
     * Forward out
     */
    forwardOut(srcIP, srcPort, destIP, destPort) {
        return this.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.sshConnection.forwardOut(srcIP, srcPort, destIP, destPort, (err, stream) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(stream);
                });
            });
        });
    }
    /**
     * Get a Socks Port
     */
    getSocksPort(localPort) {
        return this.addTunnel({ name: '__socksServer', socks: true, localPort: localPort }).then((tunnel) => {
            return tunnel.localPort;
        });
    }
    /**
     * Close SSH Connection
     */
    close() {
        this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.BEFOREDISCONNECT);
        return this.closeTunnel().then(() => {
            if (this.sshConnection) {
                this.sshConnection.end();
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT);
            }
        });
    }
    /**
     * Connect the SSH Connection
     */
    connect(c) {
        this.config = Object.assign(this.config, c);
        ++this.__retries;
        if (this.__$connectPromise) {
            return this.__$connectPromise;
        }
        this.__$connectPromise = new Promise((resolve, reject) => {
            this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.BEFORECONNECT);
            if (!this.config || typeof this.config === 'function' || !(this.config.host || this.config.sock) || !this.config.username) {
                reject(`Invalid SSH connection configuration host/username can't be empty`);
                this.__$connectPromise = null;
                return;
            }
            if (this.config.identity) {
                if (fs.existsSync(this.config.identity)) {
                    this.config.privateKey = fs.readFileSync(this.config.identity);
                }
                delete this.config.identity;
            }
            //Start ssh server connection
            this.sshConnection = new ssh2_1.Client();
            this.sshConnection.on('ready', (err) => {
                if (err) {
                    this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT, { err: err });
                    this.__$connectPromise = null;
                    return reject(err);
                }
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.CONNECT);
                this.__retries = 0;
                this.__err = null;
                resolve(this);
            }).on('error', (err) => {
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT, { err: err });
                this.__err = err;
            }).on('close', () => {
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT, { err: this.__err });
                if (this.config.reconnect && this.__retries <= this.config.reconnectTries && this.__err && this.__err.level !== 'client-authentication' && this.__err.code !== 'ENOTFOUND') {
                    setTimeout(() => {
                        this.__$connectPromise = null;
                        resolve(this.connect());
                    }, this.config.reconnectDelay);
                }
                else {
                    reject(this.__err);
                }
            }).connect(this.config);
        });
        return this.__$connectPromise;
    }
    /**
     * Get existing tunnel by name
     */
    getTunnel(name) {
        return this.activeTunnels[name];
    }
    /**
     * Add new tunnel if not exist
     */
    addTunnel(SSHTunnelConfig) {
        SSHTunnelConfig.name = SSHTunnelConfig.name || `${SSHTunnelConfig.remoteAddr}@${SSHTunnelConfig.remotePort || SSHTunnelConfig.remoteSocketPath}`;
        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.BEFORECONNECT, { SSHTunnelConfig: SSHTunnelConfig });
        if (this.getTunnel(SSHTunnelConfig.name)) {
            this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.CONNECT, { SSHTunnelConfig: SSHTunnelConfig });
            return Promise.resolve(this.getTunnel(SSHTunnelConfig.name));
        }
        else {
            return new Promise((resolve, reject) => {
                let server;
                if (SSHTunnelConfig.socks) {
                    server = (0, simple_socks_1.createServer)({
                        connectionFilter: (destination, origin, callback) => {
                            this.connect().then(() => {
                                this.sshConnection.forwardOut(origin.address, origin.port, destination.address, destination.port, (err, stream) => {
                                    if (err) {
                                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, { SSHTunnelConfig: SSHTunnelConfig, err: err });
                                        return callback(err);
                                    }
                                    return callback(null, stream);
                                });
                            });
                        }
                    }).on('proxyError', (err) => {
                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, { SSHTunnelConfig: SSHTunnelConfig, err: err });
                    });
                }
                else {
                    server = net.createServer()
                        .on('connection', (socket) => {
                        this.connect().then(() => {
                            if (SSHTunnelConfig.remotePort) {
                                this.sshConnection.forwardOut('127.0.0.1', 0, SSHTunnelConfig.remoteAddr, SSHTunnelConfig.remotePort, (err, stream) => {
                                    if (err) {
                                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, { SSHTunnelConfig: SSHTunnelConfig, err: err });
                                        return;
                                    }
                                    stream.pipe(socket);
                                    socket.pipe(stream);
                                });
                            }
                            else {
                                this.sshConnection.openssh_forwardOutStreamLocal(SSHTunnelConfig.remoteSocketPath, (err, stream) => {
                                    if (err) {
                                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, { SSHTunnelConfig: SSHTunnelConfig, err: err });
                                        return;
                                    }
                                    stream.pipe(socket);
                                    socket.pipe(stream);
                                });
                            }
                        });
                    });
                }
                SSHTunnelConfig.localPort = SSHTunnelConfig.localPort || 0;
                server.on('listening', () => {
                    SSHTunnelConfig.localPort = server.address().port;
                    this.activeTunnels[SSHTunnelConfig.name] = Object.assign({}, { server }, SSHTunnelConfig);
                    this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.CONNECT, { SSHTunnelConfig: SSHTunnelConfig });
                    resolve(this.activeTunnels[SSHTunnelConfig.name]);
                }).on('error', (err) => {
                    this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, { SSHTunnelConfig: SSHTunnelConfig, err: err });
                    server.close();
                    reject(err);
                    delete this.activeTunnels[SSHTunnelConfig.name];
                }).listen(SSHTunnelConfig.localPort);
            });
        }
    }
    /**
     * Close the tunnel
     */
    closeTunnel(name) {
        if (name && this.activeTunnels[name]) {
            return new Promise((resolve) => {
                const tunnel = this.activeTunnels[name];
                this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.BEFOREDISCONNECT, { SSHTunnelConfig: tunnel });
                tunnel.server.close(() => {
                    this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, { SSHTunnelConfig: this.activeTunnels[name] });
                    delete this.activeTunnels[name];
                    resolve();
                });
            });
        }
        else if (!name) {
            const tunnels = Object.keys(this.activeTunnels).map((key) => this.closeTunnel(key));
            return Promise.all(tunnels).then(() => { });
        }
        return Promise.resolve();
    }
}
exports.default = SSHConnection;
//# sourceMappingURL=sshConnection.js.map