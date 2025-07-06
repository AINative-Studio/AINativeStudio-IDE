/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from './process.js';
export function isHotReloadEnabled() {
    return env && !!env['VSCODE_DEV_DEBUG'];
}
export function registerHotReloadHandler(handler) {
    if (!isHotReloadEnabled()) {
        return { dispose() { } };
    }
    else {
        const handlers = registerGlobalHotReloadHandler();
        handlers.add(handler);
        return {
            dispose() { handlers.delete(handler); }
        };
    }
}
function registerGlobalHotReloadHandler() {
    if (!hotReloadHandlers) {
        hotReloadHandlers = new Set();
    }
    const g = globalThis;
    if (!g.$hotReload_applyNewExports) {
        g.$hotReload_applyNewExports = args => {
            const args2 = { config: { mode: undefined }, ...args };
            const results = [];
            for (const h of hotReloadHandlers) {
                const result = h(args2);
                if (result) {
                    results.push(result);
                }
            }
            if (results.length > 0) {
                return newExports => {
                    let result = false;
                    for (const r of results) {
                        if (r(newExports)) {
                            result = true;
                        }
                    }
                    return result;
                };
            }
            return undefined;
        };
    }
    return hotReloadHandlers;
}
let hotReloadHandlers = undefined;
if (isHotReloadEnabled()) {
    // This code does not run in production.
    registerHotReloadHandler(({ oldExports, newSrc, config }) => {
        if (config.mode !== 'patch-prototype') {
            return undefined;
        }
        return newExports => {
            for (const key in newExports) {
                const exportedItem = newExports[key];
                console.log(`[hot-reload] Patching prototype methods of '${key}'`, { exportedItem });
                if (typeof exportedItem === 'function' && exportedItem.prototype) {
                    const oldExportedItem = oldExports[key];
                    if (oldExportedItem) {
                        for (const prop of Object.getOwnPropertyNames(exportedItem.prototype)) {
                            const descriptor = Object.getOwnPropertyDescriptor(exportedItem.prototype, prop);
                            const oldDescriptor = Object.getOwnPropertyDescriptor(oldExportedItem.prototype, prop);
                            if (descriptor?.value?.toString() !== oldDescriptor?.value?.toString()) {
                                console.log(`[hot-reload] Patching prototype method '${key}.${prop}'`);
                            }
                            Object.defineProperty(oldExportedItem.prototype, prop, descriptor);
                        }
                        newExports[key] = oldExportedItem;
                    }
                }
            }
            return true;
        };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG90UmVsb2FkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vaG90UmVsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFbkMsTUFBTSxVQUFVLGtCQUFrQjtJQUNqQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDekMsQ0FBQztBQUNELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxPQUF5QjtJQUNqRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1FBQzNCLE9BQU8sRUFBRSxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDMUIsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyw4QkFBOEIsRUFBRSxDQUFDO1FBQ2xELFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEIsT0FBTztZQUNOLE9BQU8sS0FBSyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN2QyxDQUFDO0lBQ0gsQ0FBQztBQUNGLENBQUM7QUFZRCxTQUFTLDhCQUE4QjtJQUN0QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN4QixpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBRyxVQUEyQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxDQUFDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLEVBQUU7WUFDckMsTUFBTSxLQUFLLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJ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