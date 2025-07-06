"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveLineMarker = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const scroll_sync_1 = require("./scroll-sync");
class ActiveLineMarker {
    onDidChangeTextEditorSelection(line, documentVersion) {
        const { previous } = (0, scroll_sync_1.getElementsForSourceLine)(line, documentVersion);
        this._update(previous && (previous.codeElement || previous.element));
    }
    _update(before) {
        this._unmarkActiveElement(this._current);
        this._markActiveElement(before);
        this._current = before;
    }
    _unmarkActiveElement(element) {
        if (!element) {
            return;
        }
        element.classList.toggle('code-active-line', false);
    }
    _markActiveElement(element) {
        if (!element) {
            return;
        }
        element.classList.toggle('code-active-line', true);
    }
}
exports.ActiveLineMarker = ActiveLineMarker;
//# sourceMappingURL=activeLineMarker.js.map