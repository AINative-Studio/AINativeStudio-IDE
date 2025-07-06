/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createApiFactoryAndRegisterActors } from '../common/extHost.api.impl.js';
import { AbstractExtHostExtensionService } from '../common/extHostExtensionService.js';
import { URI } from '../../../base/common/uri.js';
import { RequireInterceptor } from '../common/extHostRequireInterceptor.js';
import { ExtensionRuntime } from '../common/extHostTypes.js';
import { timeout } from '../../../base/common/async.js';
import { ExtHostConsoleForwarder } from './extHostConsoleForwarder.js';
class WorkerRequireInterceptor extends RequireInterceptor {
    _installInterceptor() { }
    getModule(request, parent) {
        for (const alternativeModuleName of this._alternatives) {
            const alternative = alternativeModuleName(request);
            if (alternative) {
                request = alternative;
                break;
            }
        }
        if (this._factories.has(request)) {
            return this._factories.get(request).load(request, parent, () => { throw new Error('CANNOT LOAD MODULE from here.'); });
        }
        return undefined;
    }
}
export class ExtHostExtensionService extends AbstractExtHostExtensionService {
    constructor() {
        super(...arguments);
        this.extensionRuntime = ExtensionRuntime.Webworker;
    }
    async _beforeAlmostReadyToRunExtensions() {
        // make sure console.log calls make it to the render
        this._instaService.createInstance(ExtHostConsoleForwarder);
        // initialize API and register actors
        const apiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);
        this._fakeModules = this._instaService.createInstance(WorkerRequireInterceptor, apiFactory, { mine: this._myRegistry, all: this._globalRegistry });
        await this._fakeModules.install();
        performance.mark('code/extHost/didInitAPI');
        await this._waitForDebuggerAttachment();
    }
    _getEntryPoint(extensionDescription) {
        return extensionDescription.browser;
    }
    async _loadCommonJSModule(extension, module, activationTimesBuilder) {
        module = module.with({ path: ensureSuffix(module.path, '.js') });
        const extensionId = extension?.identifier.value;
        if (extensionId) {
            performance.mark(`code/extHost/willFetchExtensionCode/${extensionId}`);
        }
        // First resolve the extension entry point URI to something we can load using `fetch`
        // This needs to be done on the main thread due to a potential `resourceUriProvider` (workbench api)
        // which is only available in the main thread
        const browserUri = URI.revive(await this._mainThreadExtensionsProxy.$asBrowserUri(module));
        const response = await fetch(browserUri.toString(true));
        if (extensionId) {
            performance.mark(`code/extHost/didFetchExtensionCode/${extensionId}`);
        }
        if (response.status !== 200) {
            throw new Error(response.statusText);
        }
        // fetch JS sources as text and create a new function around it
        const source = await response.text();
        // Here we append #vscode-extension to serve as a marker, such that source maps
        // can be adjusted for the extra wrapping function.
        const sourceURL = `${module.toString(true)}#vscode-extension`;
        const fullSource = `${source}\n//# sourceURL=${sourceURL}`;
        let initFn;
        try {
            initFn = new Function('module', 'exports', 'require', fullSource); // CodeQL [SM01632] js/eval-call there is no alternative until we move to ESM
        }
        catch (err) {
            if (extensionId) {
                console.error(`Loading code for extension ${extensionId} failed: ${err.message}`);
            }
            else {
                console.error(`Loading code failed: ${err.message}`);
            }
            console.error(`${module.toString(true)}${typeof err.line === 'number' ? ` line ${err.line}` : ''}${typeof err.column === 'number' ? ` column ${err.column}` : ''}`);
            console.error(err);
            throw err;
        }
        if (extension) {
            await this._extHostLocalizationService.initializeLocalizedMessages(extension);
        }
        // define commonjs globals: `module`, `exports`, and `require`
        const _exports = {};
        const _module = { exports: _exports };
        const _require = (request) => {
            const result = this._fakeModules.getModule(request, module);
            if (result === undefined) {
                throw new Error(`Cannot load module '${request}'`);
            }
            return result;
        };
        try {
            activationTimesBuilder.codeLoadingStart();
            if (extensionId) {
                performance.mark(`code/extHost/willLoadExtensionCode/${extensionId}`);
            }
            initFn(_module, _exports, _require);
            return (_module.exports !== _exports ? _module.exports : _exports);
        }
        finally {
            if (extensionId) {
                performance.mark(`code/extHost/didLoadExtensionCode/${extensionId}`);
            }
            activationTimesBuilder.codeLoadingStop();
        }
    }
    async $setRemoteEnvironment(_env) {
        return;
    }
    async _waitForDebuggerAttachment(waitTimeout = 5000) {
        // debugger attaches async, waiting for it fixes #106698 and #99222
        if (!this._initData.environment.isExtensionDevelopmentDebug) {
            return;
        }
        const deadline = Date.now() + waitTimeout;
        while (Date.now() < deadline && !('__jsDebugIsReady' in globalThis)) {
            await timeout(10);
        }
    }
}
function ensureSuffix(path, suffix) {
    return path.endsWith(suffix) ? path : path + suffix;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3dvcmtlci9leHRIb3N0RXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVsRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXZFLE1BQU0sd0JBQXlCLFNBQVEsa0JBQWtCO0lBRTlDLG1CQUFtQixLQUFLLENBQUM7SUFFbkMsU0FBUyxDQUFDLE9BQWUsRUFBRSxNQUFXO1FBQ3JDLEtBQUssTUFBTSxxQkFBcUIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEQsTUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxHQUFHLFdBQVcsQ0FBQztnQkFDdEIsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FB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