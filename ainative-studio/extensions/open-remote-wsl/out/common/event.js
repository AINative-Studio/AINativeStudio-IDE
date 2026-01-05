"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = exports.once = void 0;
exports.toPromise = toPromise;
function toPromise(event, signal) {
    if (!signal) {
        return new Promise((resolve) => (0, exports.once)(event, resolve));
    }
    if (signal.aborted) {
        return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
        const d2 = (0, exports.once)(event, (data) => {
            signal.removeEventListener('abort', d1);
            resolve(data);
        });
        const d1 = () => {
            d2.dispose();
            signal.removeEventListener('abort', d1);
            resolve(undefined);
        };
        signal.addEventListener('abort', d1);
    });
}
/**
 * Adds a handler that handles one event on the emitter, then disposes itself.
 */
const once = (event, listener) => {
    const disposable = event((value) => {
        listener(value);
        disposable.dispose();
    });
    return disposable;
};
exports.once = once;
/**
 * Base event emitter. Calls listeners when data is emitted.
 */
class EventEmitter {
    constructor() {
        /**
         * Event<T> function.
         */
        this.event = (listener, thisArgs, disposables) => {
            const d = this.add(thisArgs ? listener.bind(thisArgs) : listener);
            disposables?.push(d);
            return d;
        };
    }
    /**
     * Gets the number of event listeners.
     */
    get size() {
        if (!this.listeners) {
            return 0;
        }
        else if (typeof this.listeners === 'function') {
            return 1;
        }
        else {
            return this.listeners.length;
        }
    }
    /**
     * Emits event data.
     */
    fire(value) {
        if (!this.listeners) {
            // no-op
        }
        else if (typeof this.listeners === 'function') {
            this.listeners(value);
        }
        else {
            for (const listener of this.listeners) {
                listener(value);
            }
        }
    }
    /**
     * Disposes of the emitter.
     */
    dispose() {
        this.listeners = undefined;
    }
    add(listener) {
        if (!this.listeners) {
            this.listeners = listener;
        }
        else if (typeof this.listeners === 'function') {
            this.listeners = [this.listeners, listener];
        }
        else {
            this.listeners.push(listener);
        }
        return { dispose: () => this.rm(listener) };
    }
    rm(listener) {
        if (!this.listeners) {
            return;
        }
        if (typeof this.listeners === 'function') {
            if (this.listeners === listener) {
                this.listeners = undefined;
            }
            return;
        }
        const index = this.listeners.indexOf(listener);
        if (index === -1) {
            return;
        }
        if (this.listeners.length === 2) {
            this.listeners = index === 0 ? this.listeners[1] : this.listeners[0];
        }
        else {
            this.listeners = this.listeners.slice(0, index).concat(this.listeners.slice(index + 1));
        }
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=event.js.map