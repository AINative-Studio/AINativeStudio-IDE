/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExtHostWindow_1;
import { Emitter } from '../../../base/common/event.js';
import { Schemas } from '../../../base/common/network.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { decodeBase64 } from '../../../base/common/buffer.js';
let ExtHostWindow = class ExtHostWindow {
    static { ExtHostWindow_1 = this; }
    static { this.InitialState = {
        focused: true,
        active: true,
    }; }
    getState() {
        // todo@connor4312: this can be changed to just return this._state after proposed api is finalized
        const state = this._state;
        return {
            get focused() {
                return state.focused;
            },
            get active() {
                return state.active;
            },
        };
    }
    constructor(initData, extHostRpc) {
        this._onDidChangeWindowState = new Emitter();
        this.onDidChangeWindowState = this._onDidChangeWindowState.event;
        this._state = ExtHostWindow_1.InitialState;
        if (initData.handle) {
            this._nativeHandle = decodeBase64(initData.handle).buffer;
        }
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadWindow);
        this._proxy.$getInitialState().then(({ isFocused, isActive }) => {
            this.onDidChangeWindowProperty('focused', isFocused);
            this.onDidChangeWindowProperty('active', isActive);
        });
    }
    get nativeHandle() {
        return this._nativeHandle;
    }
    $onDidChangeActiveNativeWindowHandle(handle) {
        this._nativeHandle = handle ? decodeBase64(handle).buffer : undefined;
    }
    $onDidChangeWindowFocus(value) {
        this.onDidChangeWindowProperty('focused', value);
    }
    $onDidChangeWindowActive(value) {
        this.onDidChangeWindowProperty('active', value);
    }
    onDidChangeWindowProperty(property, value) {
        if (value === this._state[property]) {
            return;
        }
        this._state = { ...this._state, [property]: value };
        this._onDidChangeWindowState.fire(this._state);
    }
    openUri(stringOrUri, options) {
        let uriAsString;
        if (typeof stringOrUri === 'string') {
            uriAsString = stringOrUri;
            try {
                stringOrUri = URI.parse(stringOrUri);
            }
            catch (e) {
                return Promise.reject(`Invalid uri - '${stringOrUri}'`);
            }
        }
        if (isFalsyOrWhitespace(stringOrUri.scheme)) {
            return Promise.reject('Invalid scheme - cannot be empty');
        }
        else if (stringOrUri.scheme === Schemas.command) {
            return Promise.reject(`Invalid scheme '${stringOrUri.scheme}'`);
        }
        return this._proxy.$openUri(stringOrUri, uriAsString, options);
    }
    async asExternalUri(uri, options) {
        if (isFalsyOrWhitespace(uri.scheme)) {
            return Promise.reject('Invalid scheme - cannot be empty');
        }
        const result = await this._proxy.$asExternalUri(uri, options);
        return URI.from(result);
    }
};
ExtHostWindow = ExtHostWindow_1 = __decorate([
    __param(0, IExtHostInitDataService),
    __param(1, IExtHostRpcService)
], ExtHostWindow);
export { ExtHostWindow };
export const IExtHostWindow = createDecorator('IExtHostWindow');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQsT0FBTyxFQUF1QyxXQUFXLEVBQXlCLE1BQU0sdUJBQXVCLENBQUM7QUFDaEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXZELElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWE7O2FBRVYsaUJBQVksR0FBZ0I7UUFDMUMsT0FBTyxFQUFFLElBQUk7UUFDYixNQUFNLEVBQUUsSUFBSTtLQUNaLEFBSDBCLENBR3pCO0lBVUYsUUFBUTtRQUNQLGtHQUFrRztRQUNsRyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRTFCLE9BQU87WUFDTixJQUFJLE9BQU87Z0JBQ1YsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQ3RCLENBQUM7WUFDRCxJQUFJLE1BQU07Z0JBQ1QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFD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