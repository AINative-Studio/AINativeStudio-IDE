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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci93ZWJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUczRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBc0IsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFekcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSw0QkFBNEIsQ0FBQztBQUVwRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDhDQUE4QyxHQUFHLElBQUksYUFBYSxDQUFVLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRTVIOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sOENBQThDLEdBQUcsSUFBSSxhQUFhLENBQVUsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFNUg7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxJQUFJLGFBQWEsQ0FBVSwwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUU1SCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFrQixnQkFBZ0IsQ0FBQyxDQUFDO0FBOENsRixNQUFNLENBQU4sSUFBa0IscUJBSWpCO0FBSkQsV0FBa0IscUJBQXFCO0lBQ3RDLDhEQUFx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