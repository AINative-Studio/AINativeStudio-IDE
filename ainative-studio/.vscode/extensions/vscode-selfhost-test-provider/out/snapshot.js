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
exports.registerSnapshotUpdate = exports.snapshotComment = void 0;
const fs_1 = require("fs");
const vscode = __importStar(require("vscode"));
exports.snapshotComment = '\n\n// Snapshot file: ';
const registerSnapshotUpdate = (ctrl) => vscode.commands.registerCommand('selfhost-test-provider.updateSnapshot', async (args) => {
    const message = args.message;
    const index = message.expectedOutput?.indexOf(exports.snapshotComment);
    if (!message.expectedOutput || !message.actualOutput || !index || index === -1) {
        vscode.window.showErrorMessage('Could not find snapshot comment in message');
        return;
    }
    const file = message.expectedOutput.slice(index + exports.snapshotComment.length);
    await fs_1.promises.writeFile(file, message.actualOutput);
    ctrl.invalidateTestResults(args.test);
});
exports.registerSnapshotUpdate = registerSnapshotUpdate;
//# sourceMappingURL=snapshot.js.map