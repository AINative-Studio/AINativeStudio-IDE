/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess, nodeModulesAsarPath, nodeModulesPath, Schemas, VSCODE_AUTHORITY } from './base/common/network.js';
import * as platform from './base/common/platform.js';
import { URI } from './base/common/uri.js';
import { generateUuid } from './base/common/uuid.js';
export const canASAR = false; // TODO@esm: ASAR disabled in ESM
class DefineCall {
    constructor(id, dependencies, callback) {
        this.id = id;
        this.dependencies = dependencies;
        this.callback = callback;
    }
}
var AMDModuleImporterState;
(function (AMDModuleImporterState) {
    AMDModuleImporterState[AMDModuleImporterState["Uninitialized"] = 1] = "Uninitialized";
    AMDModuleImporterState[AMDModuleImporterState["InitializedInternal"] = 2] = "InitializedInternal";
    AMDModuleImporterState[AMDModuleImporterState["InitializedExternal"] = 3] = "InitializedExternal";
})(AMDModuleImporterState || (AMDModuleImporterState = {}));
class AMDModuleImporter {
    static { this.INSTANCE = new AMDModuleImporter(); }
    constructor() {
        this._isWebWorker = (typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope');
        this._isRenderer = typeof document === 'object';
        this._defineCalls = [];
        this._state = AMDModuleImporterState.Uninitialized;
    }
    _initialize() {
        if (this._state === AMDModuleImporterState.Uninitialized) {
            if (globalThis.define) {
                this._state = AMDModuleImporterState.InitializedExternal;
                return;
            }
        }
        else {
            return;
        }
        this._state = AMDModuleImporterState.InitializedInternal;
        globalThis.define = (id, dependencies, callback) => {
            if (typeof id !== 'string') {
                callback = dependencies;
                dependencies = id;
                id = null;
            }
            if (typeof dependencies !== 'object' || !Array.isArray(dependencies)) {
                callback = dependencies;
                dependencies = null;
            }
            // if (!dependencies) {
            // 	dependencies = ['require', 'exports', 'module'];
            // }
            this._defineCalls.push(new DefineCall(id, dependencies, callback));
        };
        globalThis.define.amd = true;
        if (this._isRenderer) {
            this._amdPolicy = globalThis._VSCODE_WEB_PACKAGE_TTP ?? window.trustedTypes?.createPolicy('amdLoader', {
                createScriptURL(value) {
                    if (value.startsWith(window.location.origin)) {
                        return value;
                    }
                    if (value.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}`)) {
                        return value;
                    }
                    throw new Error(`[trusted_script_src] Invalid script url: ${value}`);
                }
            });
        }
        else if (this._isWebWorker) {
            this._amdPolicy = globalThis._VSCODE_WEB_PACKAGE_TTP ?? globalThis.trustedTypes?.createPolicy('amdLoader', {
                createScriptURL(value) {
                    return value;
                }
            });
        }
    }
    async load(scriptSrc) {
        this._initialize();
        if (this._state === AMDModuleImporterState.InitializedExternal) {
            return new Promise(resolve => {
                const tmpModuleId = generateUuid();
                globalThis.define(tmpModuleId, [scriptSrc], function (moduleResult) {
                    resolve(moduleResult);
                });
            });
        }
        const defineCall = await (this._isWebWorker ? this._workerLoadScript(scriptSrc) : this._isRenderer ? this._rendererLoadScript(scriptSrc) : this._nodeJSLoadScript(scriptSrc));
        if (!defineCall) {
            console.warn(`Did not receive a define call from script ${scriptSrc}`);
            return undefined;
        }
        // TODO@esm require, module
        const exports = {};
        const dependencyObjs = [];
        const dependencyModules = [];
        if (Array.isArray(defineCall.dependencies)) {
            for (const mod of defineCall.dependencies) {
                if (mod === 'exports') {
                    dependencyObjs.push(exports);
                }
                else {
                    dependencyModules.push(mod);
                }
            }
        }
        if (dependencyModules.length > 0) {
            throw new Error(`Cannot resolve dependencies for script ${scriptSrc}. The dependencies are: ${dependencyModules.join(', ')}`);
        }
        if (typeof defineCall.callback === 'function') {
            return defineCall.callback(...dependencyObjs) ?? exports;
        }
        else {
            return defineCall.callback;
        }
    }
    _rendererLoadScript(scriptSrc) {
        return new Promise((resolve, reject) => {
            const scriptElement = document.createElement('script');
            scriptElement.setAttribute('async', 'async');
            scriptElement.setAttribute('type', 'text/javascript');
            const unbind = () => {
                scriptElement.removeEventListener('load', loadEventListener);
                scriptElement.removeEventListener('error', errorEventListener);
            };
            const loadEventListener = (e) => {
                unbind();
                resolve(this._defineCalls.pop());
            };
            const errorEventListener = (e) => {
                unbind();
                reject(e);
            };
            scriptElement.addEventListener('load', loadEventListener);
            scriptElement.addEventListener('error', errorEventListener);
            if (this._amdPolicy) {
                scriptSrc = this._amdPolicy.createScriptURL(scriptSrc);
            }
            scriptElement.setAttribute('src', scriptSrc);
            window.document.getElementsByTagName('head')[0].appendChild(scriptElement);
        });
    }
    async _workerLoadScript(scriptSrc) {
        if (this._amdPolicy) {
            scriptSrc = this._amdPolicy.createScriptURL(scriptSrc);
        }
        await import(scriptSrc);
        return this._defineCalls.pop();
    }
    async _nodeJSLoadScript(scriptSrc) {
        try {
            const fs = (await import(`${'fs'}`)).default;
            const vm = (await import(`${'vm'}`)).default;
            const module = (await import(`${'module'}`)).default;
            const filePath = URI.parse(scriptSrc).fsPath;
            const content = fs.readFileSync(filePath).toString();
            const scriptSource = module.wrap(content.replace(/^#!.*/, ''));
            const script = new vm.Script(scriptSource);
            const compileWrapper = script.runInThisContext();
            compileWrapper.apply();
            return this._defineCalls.pop();
        }
        catch (error) {
            throw error;
        }
    }
}
const cache = new Map();
/**
 * Utility for importing an AMD node module. This util supports AMD and ESM contexts and should be used while the ESM adoption
 * is on its way.
 *
 * e.g. pass in `vscode-textmate/release/main.js`
 */
export async function importAMDNodeModule(nodeModuleName, pathInsideNodeModule, isBuilt) {
    if (isBuilt === undefined) {
        const product = globalThis._VSCODE_PRODUCT_JSON;
        isBuilt = Boolean((product ?? globalThis.vscode?.context?.configuration()?.product)?.commit);
    }
    const nodeModulePath = pathInsideNodeModule ? `${nodeModuleName}/${pathInsideNodeModule}` : nodeModuleName;
    if (cache.has(nodeModulePath)) {
        return cache.get(nodeModulePath);
    }
    let scriptSrc;
    if (/^\w[\w\d+.-]*:\/\//.test(nodeModulePath)) {
        // looks like a URL
        // bit of a special case for: src/vs/workbench/services/languageDetection/browser/languageDetectionWebWorker.ts
        scriptSrc = nodeModulePath;
    }
    else {
        const useASAR = (canASAR && isBuilt && !platform.isWeb);
        const actualNodeModulesPath = (useASAR ? nodeModulesAsarPath : nodeModulesPath);
        const resourcePath = `${actualNodeModulesPath}/${nodeModulePath}`;
        scriptSrc = FileAccess.asBrowserUri(resourcePath).toString(true);
    }
    const result = AMDModuleImporter.INSTANCE.load(scriptSrc);
    cache.set(nodeModulePath, result);
    return result;
}
export function resolveAmdNodeModulePath(nodeModuleName, pathInsideNodeModule) {
    const product = globalThis._VSCODE_PRODUCT_JSON;
    const isBuilt = Boolean((product ?? globalThis.vscode?.context?.configuration()?.product)?.commit);
    const useASAR = (canASAR && isBuilt && !platform.isWeb);
    const nodeModulePath = `${nodeModuleName}/${pathInsideNodeModule}`;
    const actualNodeModulesPath = (useASAR ? nodeModulesAsarPath : nodeModulesPath);
    const resourcePath = `${actualNodeModulesPath}/${nodeModulePath}`;
    return FileAccess.asBrowserUri(resourcePath).toString(true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1kWC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9hbWRYLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUIsVUFBVSxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4SSxPQUFPLEtBQUssUUFBUSxNQUFNLDJCQUEyQixDQUFDO0FBRXRELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFckQsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLGlDQUFpQztBQUUvRCxNQUFNLFVBQVU7SUFDZixZQUNpQixFQUE2QixFQUM3QixZQUF5QyxFQUN6QyxRQUFhO1FBRmIsT0FBRSxHQUFGLEVBQUUsQ0FBMkI7UUFDN0IsaUJBQVksR0FBWixZQUFZLENBQTZCO1FBQ3pDLGFBQVEsR0FBUixRQUFRLENBQUs7SUFDMUIsQ0FBQztDQUNMO0FBRUQsSUFBSyxzQkFJSjtBQUpELFdBQUssc0JBQXNCO0lBQzFCLHFGQUFpQixDQUFBO0lBQ2pCLGlHQUFtQixDQUFBO0lBQ25CLGlHQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFKSSxzQkFBc0IsS0FBdEIsc0JBQXNCLFFBSTFCO0FBRUQsTUFBTSxpQkFBaUI7YUFDUixhQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxBQUExQixDQUEyQjtJQVdqRDtRQVRpQixpQkFBWSxHQUFHLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssNEJBQTRCLENBQUMsQ0FBQztR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