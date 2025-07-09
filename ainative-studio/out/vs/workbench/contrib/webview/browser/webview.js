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
import { equals } from '../../../../base/common/arrays.js';
import { isEqual } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
/**
 * Set when the find widget in a webview in a webview is visible.
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE = new RawContextKey('webviewFindWidgetVisible', false);
/**
 * Set when the find widget in a webview is focused.
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED = new RawContextKey('webviewFindWidgetFocused', false);
/**
 * Set when the find widget in a webview is enabled in a webview
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED = new RawContextKey('webviewFindWidgetEnabled', false);
export const IWebviewService = createDecorator('webviewService');
export var WebviewContentPurpose;
(function (WebviewContentPurpose) {
    WebviewContentPurpose["NotebookRenderer"] = "notebookRenderer";
    WebviewContentPurpose["CustomEditor"] = "customEditor";
    WebviewContentPurpose["WebviewView"] = "webviewView";
})(WebviewContentPurpose || (WebviewContentPurpose = {}));
/**
 * Check if two {@link WebviewContentOptions} are equal.
 */
export function areWebviewContentOptionsEqual(a, b) {
    return (a.allowMultipleAPIAcquire === b.allowMultipleAPIAcquire
        && a.allowScripts === b.allowScripts
        && a.allowForms === b.allowForms
        && equals(a.localResourceRoots, b.localResourceRoots, isEqual)
        && equals(a.portMapping, b.portMapping, (a, b) => a.extensionHostPort === b.extensionHostPort && a.webviewPort === b.webviewPort)
        && areEnableCommandUrisEqual(a, b));
}
function areEnableCommandUrisEqual(a, b) {
    if (a.enableCommandUris === b.enableCommandUris) {
        return true;
    }
    if (Array.isArray(a.enableCommandUris) && Array.isArray(b.enableCommandUris)) {
        return equals(a.enableCommandUris, b.enableCommandUris);
    }
    return false;
}
/**
 * Stores the unique origins for a webview.
 *
 * These are randomly generated
 */
let WebviewOriginStore = class WebviewOriginStore {
    constructor(rootStorageKey, storageService) {
        this._memento = new Memento(rootStorageKey, storageService);
        this._state = this._memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getOrigin(viewType, additionalKey) {
        const key = this._getKey(viewType, additionalKey);
        const existing = this._state[key];
        if (existing && typeof existing === 'string') {
            return existing;
        }
        const newOrigin = generateUuid();
        this._state[key] = newOrigin;
        this._memento.saveMemento();
        return newOrigin;
    }
    _getKey(viewType, additionalKey) {
        return JSON.stringify({ viewType, key: additionalKey });
    }
};
WebviewOriginStore = __decorate([
    __param(1, IStorageService)
], WebviewOriginStore);
export { WebviewOriginStore };
/**
 * Stores the unique origins for a webview.
 *
 * These are randomly generated, but keyed on extension and webview viewType.
 */
let ExtensionKeyedWebviewOriginStore = class ExtensionKeyedWebviewOriginStore {
    constructor(rootStorageKey, storageService) {
        this._store = new WebviewOriginStore(rootStorageKey, storageService);
    }
    getOrigin(viewType, extId) {
        return this._store.getOrigin(viewType, extId.value);
    }
};
ExtensionKeyedWebviewOriginStore = __decorate([
    __param(1, IStorageService)
], ExtensionKeyedWebviewOriginStore);
export { ExtensionKeyedWebviewOriginStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvd2Vidmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQXNCLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXpHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sNEJBQTRCLENBQUM7QUFFcEU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxJQUFJLGFBQWEsQ0FBVSwwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUU1SDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDhDQUE4QyxHQUFHLElBQUksYUFBYSxDQUFVLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRTVIOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sOENBQThDLEdBQUcsSUFBSSxhQUFhLENBQVUsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFNUgsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQztBQThDbEYsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0Qyw4REFB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