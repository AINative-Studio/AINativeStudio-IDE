/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from './event.js';
const shortcutEvent = Object.freeze(function (callback, context) {
    const handle = setTimeout(callback.bind(context), 0);
    return { dispose() { clearTimeout(handle); } };
});
export var CancellationToken;
(function (CancellationToken) {
    function isCancellationToken(thing) {
        if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
            return true;
        }
        if (thing instanceof MutableToken) {
            return true;
        }
        if (!thing || typeof thing !== 'object') {
            return false;
        }
        return typeof thing.isCancellationRequested === 'boolean'
            && typeof thing.onCancellationRequested === 'function';
    }
    CancellationToken.isCancellationToken = isCancellationToken;
    CancellationToken.None = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: Event.None
    });
    CancellationToken.Cancelled = Object.freeze({
        isCancellationRequested: true,
        onCancellationRequested: shortcutEvent
    });
})(CancellationToken || (CancellationToken = {}));
class MutableToken {
    constructor() {
        this._isCancelled = false;
        this._emitter = null;
    }
    cancel() {
        if (!this._isCancelled) {
            this._isCancelled = true;
            if (this._emitter) {
                this._emitter.fire(undefined);
                this.dispose();
            }
        }
    }
    get isCancellationRequested() {
        return this._isCancelled;
    }
    get onCancellationRequested() {
        if (this._isCancelled) {
            return shortcutEvent;
        }
        if (!this._emitter) {
            this._emitter = new Emitter();
        }
        return this._emitter.event;
    }
    dispose() {
        if (this._emitter) {
            this._emitter.dispose();
            this._emitter = null;
        }
    }
}
export class CancellationTokenSource {
    constructor(parent) {
        this._token = undefined;
        this._parentListener = undefined;
        this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
    }
    get token() {
        if (!this._token) {
            // be lazy and create the token only when
            // actually needed
            this._token = new MutableToken();
        }
        return this._token;
    }
    cancel() {
        if (!this._token) {
            // save an object by returning the default
            // cancelled token when cancellation happens
            // before someone asks for the token
            this._token = CancellationToken.Cancelled;
        }
        else if (this._token instanceof MutableToken) {
            // actually cancel
            this._token.cancel();
        }
    }
    dispose(cancel = false) {
        if (cancel) {
            this.cancel();
        }
        this._parentListener?.dispose();
        if (!this._token) {
            // ensure to initialize with an empty token if we had none
            this._token = CancellationToken.None;
        }
        else if (this._token instanceof MutableToken) {
            // actually dispose
            this._token.dispose();
        }
    }
}
export function cancelOnDispose(store) {
    const source = new CancellationTokenSource();
    store.add({ dispose() { source.cancel(); } });
    return source.token;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsbGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NhbmNlbGxhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQXFCNUMsTUFBTSxhQUFhLEdBQWUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLFFBQVEsRUFBRSxPQUFRO0lBQzNFLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JELE9BQU8sRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLEtBQVcsaUJBQWlCLENBMEJqQztBQTFCRCxXQUFpQixpQkFBaUI7SUFFakMsU0FBZ0IsbUJBQW1CLENBQUMsS0FBYztRQUNqRCxJQUFJLEtBQUssS0FBSyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksS0FBSyxLQUFLLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9FLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxPQUFRLEtBQTJCLENBQUMsdUJBQXVCLEtBQUssU0FBUztlQUM1RSxPQUFRLEtBQTJCLENBQUMsdUJBQXVCLEtB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