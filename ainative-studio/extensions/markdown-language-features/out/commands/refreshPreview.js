"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshPreviewCommand = void 0;
class RefreshPreviewCommand {
    constructor(_webviewManager, _engine) {
        this._webviewManager = _webviewManager;
        this._engine = _engine;
        this.id = 'markdown.preview.refresh';
    }
    execute() {
        this._engine.cleanCache();
        this._webviewManager.refresh();
    }
}
exports.RefreshPreviewCommand = RefreshPreviewCommand;
//# sourceMappingURL=refreshPreview.js.map