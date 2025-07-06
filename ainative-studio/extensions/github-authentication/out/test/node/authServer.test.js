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
const authServer_1 = require("../../node/authServer");
suite('LoopbackAuthServer', () => {
    let server;
    let port;
    setup(async () => {
        server = new authServer_1.LoopbackAuthServer(__dirname, 'http://localhost:8080');
        port = await server.start();
    });
    teardown(async () => {
        await server.stop();
    });
    test('should redirect to starting redirect on /signin', async () => {
        const response = await fetch(`http://localhost:${port}/signin?nonce=${server.nonce}`, {
            redirect: 'manual'
        });
        // Redirect
        assert.strictEqual(response.status, 302);
        // Check location
        const location = response.headers.get('location');
        assert.ok(location);
        const locationUrl = new URL(location);
        assert.strictEqual(locationUrl.origin, 'http://localhost:8080');
        // Check state
        const state = locationUrl.searchParams.get('state');
        assert.ok(state);
        const stateLocation = new URL(state);
        assert.strictEqual(stateLocation.origin, `http://127.0.0.1:${port}`);
        assert.strictEqual(stateLocation.pathname, '/callback');
        assert.strictEqual(stateLocation.searchParams.get('nonce'), server.nonce);
    });
    test('should return 400 on /callback with missing parameters', async () => {
        const response = await fetch(`http://localhost:${port}/callback`);
        assert.strictEqual(response.status, 400);
    });
    test('should resolve with code and state on /callback with valid parameters', async () => {
        server.state = 'valid-state';
        const response = await fetch(`http://localhost:${port}/callback?code=valid-code&state=${server.state}&nonce=${server.nonce}`, { redirect: 'manual' });
        assert.strictEqual(response.status, 302);
        assert.strictEqual(response.headers.get('location'), '/');
        await Promise.race([
            server.waitForOAuthResponse().then(result => {
                assert.strictEqual(result.code, 'valid-code');
                assert.strictEqual(result.state, server.state);
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
    });
});
//# sourceMappingURL=authServer.test.js.map