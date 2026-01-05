"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSSHConfigPath = getSSHConfigPath;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ssh_config_1 = __importDefault(require("@jeanp413/ssh-config"));
const vscode = __importStar(require("vscode"));
const files_1 = require("../common/files");
const platform_1 = require("../common/platform");
const glob_1 = require("glob");
const systemSSHConfig = platform_1.isWindows ? path.resolve(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'ssh\\ssh_config') : '/etc/ssh/ssh_config';
const defaultSSHConfigPath = path.resolve(os.homedir(), '.ssh/config');
function getSSHConfigPath() {
    const sshConfigPath = vscode.workspace.getConfiguration('remote.SSH').get('configFile');
    return sshConfigPath ? (0, files_1.untildify)(sshConfigPath) : defaultSSHConfigPath;
}
function isDirective(line) {
    return line.type === ssh_config_1.default.DIRECTIVE;
}
function isHostSection(line) {
    return isDirective(line) && line.param === 'Host' && !!line.value && !!line.config;
}
function isIncludeDirective(line) {
    return isDirective(line) && line.param === 'Include' && !!line.value;
}
const SSH_CONFIG_PROPERTIES = {
    'host': 'Host',
    'hostname': 'HostName',
    'user': 'User',
    'port': 'Port',
    'identityagent': 'IdentityAgent',
    'identitiesonly': 'IdentitiesOnly',
    'identityfile': 'IdentityFile',
    'forwardagent': 'ForwardAgent',
    'preferredauthentications': 'PreferredAuthentications',
    'proxyjump': 'ProxyJump',
    'proxycommand': 'ProxyCommand',
    'include': 'Include',
};
function normalizeProp(prop) {
    prop.param = SSH_CONFIG_PROPERTIES[prop.param.toLowerCase()] || prop.param;
}
function normalizeSSHConfig(config) {
    for (const line of config) {
        if (isDirective(line)) {
            normalizeProp(line);
        }
        if (isHostSection(line)) {
            normalizeSSHConfig(line.config);
        }
    }
    return config;
}
async function parseSSHConfigFromFile(filePath, userConfig) {
    let content = '';
    if (await (0, files_1.exists)(filePath)) {
        content = (await fs.promises.readFile(filePath, 'utf8')).trim();
    }
    const config = normalizeSSHConfig(ssh_config_1.default.parse(content));
    const includedConfigs = [];
    for (let i = 0; i < config.length; i++) {
        const line = config[i];
        if (isIncludeDirective(line)) {
            const values = line.value.split(',').map(s => s.trim());
            const configs = [];
            for (const value of values) {
                const includePaths = await (0, glob_1.glob)((0, files_1.normalizeToSlash)((0, files_1.untildify)(value)), {
                    absolute: true,
                    cwd: (0, files_1.normalizeToSlash)(path.dirname(userConfig ? defaultSSHConfigPath : systemSSHConfig))
                });
                for (const p of includePaths) {
                    configs.push(await parseSSHConfigFromFile(p, userConfig));
                }
            }
            includedConfigs.push([i, configs]);
        }
    }
    for (const [idx, includeConfigs] of includedConfigs.reverse()) {
        config.splice(idx, 1, ...includeConfigs.flat());
    }
    return config;
}
class SSHConfiguration {
    static async loadFromFS() {
        const config = await parseSSHConfigFromFile(getSSHConfigPath(), true);
        config.push(...await parseSSHConfigFromFile(systemSSHConfig, false));
        return new SSHConfiguration(config);
    }
    constructor(sshConfig) {
        this.sshConfig = sshConfig;
    }
    getAllConfiguredHosts() {
        const hosts = new Set();
        for (const line of this.sshConfig) {
            if (isHostSection(line)) {
                const value = Array.isArray(line.value) ? line.value[0] : line.value;
                const isPattern = /^!/.test(value) || /[?*]/.test(value);
                if (!isPattern) {
                    hosts.add(value);
                }
            }
        }
        return [...hosts.keys()];
    }
    getHostConfiguration(host) {
        // Only a few directives return an array
        // https://github.com/jeanp413/ssh-config/blob/8d187bb8f1d83a51ff2b1d127e6b6269d24092b5/src/ssh-config.ts#L9C1-L9C118
        return this.sshConfig.compute(host);
    }
}
exports.default = SSHConfiguration;
//# sourceMappingURL=sshConfig.js.map