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
exports.AuthenticationError = void 0;
exports.getSession = getSession;
exports.getOctokit = getOctokit;
exports.getOctokitGraphql = getOctokitGraphql;
const vscode_1 = require("vscode");
const https_1 = require("https");
const tunnel_1 = require("tunnel");
const url_1 = require("url");
class AuthenticationError extends Error {
}
exports.AuthenticationError = AuthenticationError;
function getAgent(url = process.env.HTTPS_PROXY) {
    if (!url) {
        return https_1.globalAgent;
    }
    try {
        const { hostname, port, username, password } = new url_1.URL(url);
        const auth = username && password && `${username}:${password}`;
        return (0, tunnel_1.httpsOverHttp)({ proxy: { host: hostname, port, proxyAuth: auth } });
    }
    catch (e) {
        vscode_1.window.showErrorMessage(`HTTPS_PROXY environment variable ignored: ${e.message}`);
        return https_1.globalAgent;
    }
}
const scopes = ['repo', 'workflow', 'user:email', 'read:user'];
async function getSession() {
    return await vscode_1.authentication.getSession('github', scopes, { createIfNone: true });
}
let _octokit;
function getOctokit() {
    if (!_octokit) {
        _octokit = getSession().then(async (session) => {
            const token = session.accessToken;
            const agent = getAgent();
            const { Octokit } = await Promise.resolve().then(() => __importStar(require('@octokit/rest')));
            return new Octokit({
                request: { agent },
                userAgent: 'GitHub VSCode',
                auth: `token ${token}`
            });
        }).then(null, async (err) => {
            _octokit = undefined;
            throw err;
        });
    }
    return _octokit;
}
let _octokitGraphql;
async function getOctokitGraphql() {
    if (!_octokitGraphql) {
        try {
            const session = await vscode_1.authentication.getSession('github', scopes, { silent: true });
            if (!session) {
                throw new AuthenticationError('No GitHub authentication session available.');
            }
            const token = session.accessToken;
            const { graphql } = await Promise.resolve().then(() => __importStar(require('@octokit/graphql')));
            return graphql.defaults({
                headers: {
                    authorization: `token ${token}`
                },
                request: {
                    agent: getAgent()
                }
            });
        }
        catch (err) {
            _octokitGraphql = undefined;
            throw err;
        }
    }
    return _octokitGraphql;
}
//# sourceMappingURL=auth.js.map