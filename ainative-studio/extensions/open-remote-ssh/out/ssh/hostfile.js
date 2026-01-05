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
exports.checkNewHostInHostkeys = checkNewHostInHostkeys;
exports.addHostToHostFile = addHostToHostFile;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const files_1 = require("../common/files");
const PATH_SSH_USER_DIR = path.join(os.homedir(), '.ssh');
const KNOW_HOST_FILE = path.join(PATH_SSH_USER_DIR, 'known_hosts');
const HASH_MAGIC = '|1|';
const HASH_DELIM = '|';
async function checkNewHostInHostkeys(host) {
    const fileContent = await fs.promises.readFile(KNOW_HOST_FILE, { encoding: 'utf8' });
    const lines = fileContent.split(/\r?\n/);
    for (let line of lines) {
        line = line.trim();
        if (!line.startsWith(HASH_MAGIC)) {
            continue;
        }
        const [hostEncripted_] = line.split(' ');
        const [salt_, hostHash_] = hostEncripted_.substring(HASH_MAGIC.length).split(HASH_DELIM);
        const hostHash = crypto.createHmac('sha1', Buffer.from(salt_, 'base64')).update(host).digest();
        if (hostHash.toString('base64') === hostHash_) {
            return false;
        }
    }
    return true;
}
async function addHostToHostFile(host, hostKey, type) {
    if (!(0, files_1.exists)(PATH_SSH_USER_DIR)) {
        await fs.promises.mkdir(PATH_SSH_USER_DIR, 0o700);
    }
    const salt = crypto.randomBytes(20);
    const hostHash = crypto.createHmac('sha1', salt).update(host).digest();
    const entry = `${HASH_MAGIC}${salt.toString('base64')}${HASH_DELIM}${hostHash.toString('base64')} ${type} ${hostKey.toString('base64')}\n`;
    await fs.promises.appendFile(KNOW_HOST_FILE, entry);
}
//# sourceMappingURL=hostfile.js.map