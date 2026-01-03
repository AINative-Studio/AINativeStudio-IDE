"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Delayer = void 0;
class Delayer {
    constructor(defaultDelay) {
        this.defaultDelay = defaultDelay;
        this._timeout = null;
        this._cancelTimeout = null;
        this._onSuccess = null;
        this._task = null;
    }
    dispose() {
        this._doCancelTimeout();
    }
    trigger(task, delay = this.defaultDelay) {
        this._task = task;
        if (delay >= 0) {
            this._doCancelTimeout();
        }
        if (!this._cancelTimeout) {
            this._cancelTimeout = new Promise((resolve) => {
                this._onSuccess = resolve;
            }).then(() => {
                this._cancelTimeout = null;
                this._onSuccess = null;
                const result = this._task && this._task?.();
                this._task = null;
                return result;
            });
        }
        if (delay >= 0 || this._timeout === null) {
            this._timeout = setTimeout(() => {
                this._timeout = null;
                this._onSuccess?.(undefined);
            }, delay >= 0 ? delay : this.defaultDelay);
        }
        return this._cancelTimeout;
    }
    _doCancelTimeout() {
        if (this._timeout !== null) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }
}
exports.Delayer = Delayer;
//# sourceMappingURL=async.js.map