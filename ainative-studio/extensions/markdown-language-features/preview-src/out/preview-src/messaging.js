"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPosterForVsCode = void 0;
const createPosterForVsCode = (vscode, settingsManager) => {
    return {
        postMessage(type, body) {
            vscode.postMessage({
                type,
                source: settingsManager.settings.source,
                ...body
            });
        }
    };
};
exports.createPosterForVsCode = createPosterForVsCode;
//# sourceMappingURL=messaging.js.map