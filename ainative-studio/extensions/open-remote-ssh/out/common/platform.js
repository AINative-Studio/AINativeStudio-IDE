"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLinux = exports.isMacintosh = exports.isWindows = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
exports.isWindows = process.platform === 'win32';
exports.isMacintosh = process.platform === 'darwin';
exports.isLinux = process.platform === 'linux';
//# sourceMappingURL=platform.js.map