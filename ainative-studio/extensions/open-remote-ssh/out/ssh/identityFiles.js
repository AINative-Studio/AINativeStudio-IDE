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
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatherIdentityFiles = gatherIdentityFiles;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const ssh2 = __importStar(require("ssh2"));
const files_1 = require("../common/files");
const homeDir = os.homedir();
const PATH_SSH_CLIENT_ID_DSA = path.join(homeDir, '.ssh', '/id_dsa');
const PATH_SSH_CLIENT_ID_ECDSA = path.join(homeDir, '.ssh', '/id_ecdsa');
const PATH_SSH_CLIENT_ID_RSA = path.join(homeDir, '.ssh', '/id_rsa');
const PATH_SSH_CLIENT_ID_ED25519 = path.join(homeDir, '.ssh', '/id_ed25519');
const PATH_SSH_CLIENT_ID_XMSS = path.join(homeDir, '.ssh', '/id_xmss');
const PATH_SSH_CLIENT_ID_ECDSA_SK = path.join(homeDir, '.ssh', '/id_ecdsa_sk');
const PATH_SSH_CLIENT_ID_ED25519_SK = path.join(homeDir, '.ssh', '/id_ed25519_sk');
const DEFAULT_IDENTITY_FILES = [
    PATH_SSH_CLIENT_ID_RSA,
    PATH_SSH_CLIENT_ID_ECDSA,
    PATH_SSH_CLIENT_ID_ECDSA_SK,
    PATH_SSH_CLIENT_ID_ED25519,
    PATH_SSH_CLIENT_ID_ED25519_SK,
    PATH_SSH_CLIENT_ID_XMSS,
    PATH_SSH_CLIENT_ID_DSA,
];
// From https://github.com/openssh/openssh-portable/blob/acb2059febaddd71ee06c2ebf63dcf211d9ab9f2/sshconnect2.c#L1689-L1690
async function gatherIdentityFiles(identityFiles, sshAgentSock, identitiesOnly, logger) {
    identityFiles = identityFiles.map(files_1.untildify).map(i => i.replace(/\.pub$/, ''));
    if (identityFiles.length === 0) {
        identityFiles.push(...DEFAULT_IDENTITY_FILES);
    }
    const identityFileContentsResult = await Promise.allSettled(identityFiles.map(async (keyPath) => {
        keyPath = await (0, files_1.exists)(keyPath + '.pub') ? keyPath + '.pub' : keyPath;
        return fs.promises.readFile(keyPath);
    }));
    const fileKeys = identityFileContentsResult.map((result, i) => {
        if (result.status === 'rejected') {
            return undefined;
        }
        const parsedResult = ssh2.utils.parseKey(result.value);
        if (parsedResult instanceof Error || !parsedResult) {
            logger.error(`Error while parsing SSH public key ${identityFiles[i]}:`, parsedResult);
            return undefined;
        }
        const parsedKey = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;
        const fingerprint = crypto.createHash('sha256').update(parsedKey.getPublicSSH()).digest('base64');
        return {
            filename: identityFiles[i],
            parsedKey,
            fingerprint
        };
    }).filter((v) => !!v);
    let sshAgentParsedKeys = [];
    try {
        if (!sshAgentSock) {
            throw new Error(`SSH_AUTH_SOCK environment variable not defined`);
        }
        sshAgentParsedKeys = await new Promise((resolve, reject) => {
            const sshAgent = new ssh2.OpenSSHAgent(sshAgentSock);
            sshAgent.getIdentities((err, publicKeys) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(publicKeys || []);
                }
            });
        });
    }
    catch (e) {
        logger.error(`Couldn't get identities from OpenSSH agent`, e);
    }
    const sshAgentKeys = sshAgentParsedKeys.map(parsedKey => {
        const fingerprint = crypto.createHash('sha256').update(parsedKey.getPublicSSH()).digest('base64');
        return {
            filename: parsedKey.comment,
            parsedKey,
            fingerprint,
            agentSupport: true
        };
    });
    const agentKeys = [];
    const preferredIdentityKeys = [];
    for (const agentKey of sshAgentKeys) {
        const foundIdx = fileKeys.findIndex(k => agentKey.parsedKey.type === k.parsedKey.type && agentKey.fingerprint === k.fingerprint);
        if (foundIdx >= 0) {
            preferredIdentityKeys.push({ ...fileKeys[foundIdx], agentSupport: true });
            fileKeys.splice(foundIdx, 1);
        }
        else if (!identitiesOnly) {
            agentKeys.push(agentKey);
        }
    }
    preferredIdentityKeys.push(...agentKeys);
    preferredIdentityKeys.push(...fileKeys);
    logger.trace(`Identity keys:`, preferredIdentityKeys.length ? preferredIdentityKeys.map(k => `${k.filename} ${k.parsedKey.type} SHA256:${k.fingerprint}`).join('\n') : 'None');
    return preferredIdentityKeys;
}
//# sourceMappingURL=identityFiles.js.map