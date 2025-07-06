"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.base64Encode = base64Encode;
exports.base64Decode = base64Decode;
function base64Encode(text) {
    return btoa(text);
}
function base64Decode(text) {
    // modification of https://stackoverflow.com/a/38552302
    const replacedCharacters = text.replace(/-/g, '+').replace(/_/g, '/');
    const decodedText = decodeURIComponent(atob(replacedCharacters).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return decodedText;
}
//# sourceMappingURL=buffer.js.map