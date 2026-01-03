"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = debounce;
/**
 * Debounces the function call for an interval.
 */
function debounce(duration, fn) {
    let timeout;
    const debounced = () => {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            timeout = undefined;
            fn();
        }, duration);
    };
    debounced.clear = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
    };
    return debounced;
}
//# sourceMappingURL=debounce.js.map