"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleLockCommand = void 0;
class ToggleLockCommand {
    constructor(_previewManager) {
        this._previewManager = _previewManager;
        this.id = 'markdown.preview.toggleLock';
    }
    execute() {
        this._previewManager.toggleLock();
    }
}
exports.ToggleLockCommand = ToggleLockCommand;
//# sourceMappingURL=toggleLock.js.map