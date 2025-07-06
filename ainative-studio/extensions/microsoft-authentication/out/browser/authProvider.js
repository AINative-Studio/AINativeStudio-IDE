"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsalAuthProvider = void 0;
const vscode_1 = require("vscode");
class MsalAuthProvider {
    constructor() {
        this._onDidChangeSessions = new vscode_1.EventEmitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    initialize() {
        throw new Error('Method not implemented.');
    }
    getSessions() {
        throw new Error('Method not implemented.');
    }
    createSession() {
        throw new Error('Method not implemented.');
    }
    removeSession() {
        throw new Error('Method not implemented.');
    }
    dispose() {
        this._onDidChangeSessions.dispose();
    }
}
exports.MsalAuthProvider = MsalAuthProvider;
//# sourceMappingURL=authProvider.js.map