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
const assert = __importStar(require("assert"));
const flows_1 = require("../flows");
const config_1 = require("../config");
suite('getFlows', () => {
    let lastClientSecret = undefined;
    suiteSetup(() => {
        lastClientSecret = config_1.Config.gitHubClientSecret;
        config_1.Config.gitHubClientSecret = 'asdf';
    });
    suiteTeardown(() => {
        config_1.Config.gitHubClientSecret = lastClientSecret;
    });
    const testCases = [
        {
            label: 'VS Code Desktop. Local filesystem. GitHub.com',
            query: {
                extensionHost: 2 /* ExtensionHost.Local */,
                isSupportedClient: true,
                target: 0 /* GitHubTarget.DotCom */
            },
            expectedFlows: [
                "url handler" /* Flows.UrlHandlerFlow */,
                "local server" /* Flows.LocalServerFlow */,
                "device code" /* Flows.DeviceCodeFlow */
            ]
        },
        {
            label: 'VS Code Desktop. Local filesystem. GitHub Hosted Enterprise',
            query: {
                extensionHost: 2 /* ExtensionHost.Local */,
                isSupportedClient: true,
                target: 2 /* GitHubTarget.HostedEnterprise */
            },
            expectedFlows: [
                "url handler" /* Flows.UrlHandlerFlow */,
                "local server" /* Flows.LocalServerFlow */,
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'VS Code Desktop. Local filesystem. GitHub Enterprise Server',
            query: {
                extensionHost: 2 /* ExtensionHost.Local */,
                isSupportedClient: true,
                target: 1 /* GitHubTarget.Enterprise */
            },
            expectedFlows: [
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'vscode.dev. serverful. GitHub.com',
            query: {
                extensionHost: 1 /* ExtensionHost.Remote */,
                isSupportedClient: true,
                target: 0 /* GitHubTarget.DotCom */
            },
            expectedFlows: [
                "url handler" /* Flows.UrlHandlerFlow */,
                "device code" /* Flows.DeviceCodeFlow */
            ]
        },
        {
            label: 'vscode.dev. serverful. GitHub Hosted Enterprise',
            query: {
                extensionHost: 1 /* ExtensionHost.Remote */,
                isSupportedClient: true,
                target: 2 /* GitHubTarget.HostedEnterprise */
            },
            expectedFlows: [
                "url handler" /* Flows.UrlHandlerFlow */,
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'vscode.dev. serverful. GitHub Enterprise',
            query: {
                extensionHost: 1 /* ExtensionHost.Remote */,
                isSupportedClient: true,
                target: 1 /* GitHubTarget.Enterprise */
            },
            expectedFlows: [
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'vscode.dev. serverless. GitHub.com',
            query: {
                extensionHost: 0 /* ExtensionHost.WebWorker */,
                isSupportedClient: true,
                target: 0 /* GitHubTarget.DotCom */
            },
            expectedFlows: [
                "url handler" /* Flows.UrlHandlerFlow */
            ]
        },
        {
            label: 'vscode.dev. serverless. GitHub Hosted Enterprise',
            query: {
                extensionHost: 0 /* ExtensionHost.WebWorker */,
                isSupportedClient: true,
                target: 2 /* GitHubTarget.HostedEnterprise */
            },
            expectedFlows: [
                "url handler" /* Flows.UrlHandlerFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'vscode.dev. serverless. GitHub Enterprise Server',
            query: {
                extensionHost: 0 /* ExtensionHost.WebWorker */,
                isSupportedClient: true,
                target: 1 /* GitHubTarget.Enterprise */
            },
            expectedFlows: [
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'Code - OSS. Local filesystem. GitHub.com',
            query: {
                extensionHost: 2 /* ExtensionHost.Local */,
                isSupportedClient: false,
                target: 0 /* GitHubTarget.DotCom */
            },
            expectedFlows: [
                "local server" /* Flows.LocalServerFlow */,
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'Code - OSS. Local filesystem. GitHub Hosted Enterprise',
            query: {
                extensionHost: 2 /* ExtensionHost.Local */,
                isSupportedClient: false,
                target: 2 /* GitHubTarget.HostedEnterprise */
            },
            expectedFlows: [
                "local server" /* Flows.LocalServerFlow */,
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
        {
            label: 'Code - OSS. Local filesystem. GitHub Enterprise Server',
            query: {
                extensionHost: 2 /* ExtensionHost.Local */,
                isSupportedClient: false,
                target: 1 /* GitHubTarget.Enterprise */
            },
            expectedFlows: [
                "device code" /* Flows.DeviceCodeFlow */,
                "personal access token" /* Flows.PatFlow */
            ]
        },
    ];
    for (const testCase of testCases) {
        test(`gives the correct flows - ${testCase.label}`, () => {
            const flows = (0, flows_1.getFlows)(testCase.query);
            assert.strictEqual(flows.length, testCase.expectedFlows.length, `Unexpected number of flows: ${flows.map(f => f.label).join(',')}`);
            for (let i = 0; i < flows.length; i++) {
                const flow = flows[i];
                assert.strictEqual(flow.label, testCase.expectedFlows[i]);
            }
        });
    }
});
//# sourceMappingURL=flows.test.js.map