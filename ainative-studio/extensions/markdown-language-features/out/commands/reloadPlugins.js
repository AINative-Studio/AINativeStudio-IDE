"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReloadPlugins = void 0;
class ReloadPlugins {
    constructor(_webviewManager, _engine) {
        this._webviewManager = _webviewManager;
        this._engine = _engine;
        this.id = 'markdown.api.reloadPlugins';
    }
    execute() {
        this._engine.reloadPlugins();
        this._engine.cleanCache();
        this._webviewManager.refresh();
    }
}
exports.ReloadPlugins = ReloadPlugins;
//# sourceMappingURL=reloadPlugins.js.map