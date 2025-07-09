"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ####################################
// ###                              ###
// ### !!! PLEASE DO NOT MODIFY !!! ###
// ###                              ###
// ####################################
// TODO@esm remove me once we stop supporting our web-esm-bridge
(function () {
    //#endregion
    const define = globalThis.define;
    const require = globalThis.require;
    if (!define || !require || typeof require.getConfig !== 'function') {
        throw new Error('Expected global define() and require() functions. Please only load this module in an AMD context!');
    }
    let baseUrl = require?.getConfig().baseUrl;
    if (!baseUrl) {
        throw new Error('Failed to determine baseUrl for loading AMD modules (tried require.getConfig().baseUrl)');
    }
    if (!baseUrl.endsWith('/')) {
        baseUrl = baseUrl + '/';
    }
    globalThis._VSCODE_FILE_ROOT = baseUrl;
    const trustedTypesPolicy = require.getConfig().trustedTypesPolicy;
    if (trustedTypesPolicy) {
        globalThis._VSCODE_WEB_PACKAGE_TTP = trustedTypesPolicy;
    }
    const promise = new Promise(resolve => {
        globalThis.__VSCODE_WEB_ESM_PROMISE = resolve;
    });
    define('vs/web-api', [], () => {
        return {
            load: (_name, _req, _load, _config) => {
                const script = document.createElement('script');
                script.type = 'module';
                script.src = trustedTypesPolicy ? trustedTypesPolicy.createScriptURL(`${baseUrl}vs/workbench/workbench.web.main.internal.js`) : `${baseUrl}vs/workbench/workbench.web.main.internal.js`;
                document.head.appendChild(script);
                return promise.then(mod => _load(mod));
            }
        };
    });
    define('vs/workbench/workbench.web.main', ['require', 'exports', 'vs/web-api!'], function (_require, exports, webApi) {
        Object.assign(exports, webApi);
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC93b3JrYmVuY2gud2ViLm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBR2hHLHVDQUF1QztBQUN2Qyx1Q0FBdUM7QUFDdkMsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUN2Qyx1Q0FBdUM7QUFFdkMsZ0VBQWdFO0FBRWhFLENBQUM7SUF5Q0EsWUFBWTtJQUVaLE1BQU0sTUFBTSxHQUFtQixVQUFrQixDQUFDLE1BQU0sQ0FBQztJQUN6RCxNQUFNLE9BQU8sR0FBdUMsVUFBa0IsQ0FBQyxPQUFPLENBQUM7SUFFL0UsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDcEUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtR0FBbUcsQ0FBQyxDQUFDO0lBQ3RILENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDO0lBQzNDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMseUZBQXlGLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM1QixPQUFPLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUN6QixDQUFDO0lBQ0QsVUFBVSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQztJQUV2QyxNQUFNLGtCQUFrQixHQUFnSCxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsa0JBQWtCLENBQUM7SUFDL0ssSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyx1QkFBdUIsR0FBRyxrQkFBa0IsQ0FBQztJQUN6RCxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDcEMsVUFBa0IsQ0FBQyx3QkFBd0IsR0FBRyxPQUFPLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxHQUFrQixFQUFFO1FBQzVDLE9BQU87WUFDTixJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxNQUFNLEdBQVEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7Z0JBQ3ZCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxHQUFHLE9BQU8sNkNBQTZDLENBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyw2Q0FBNkMsQ0FBQztnQkFDek0sUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWxDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQ0wsaUNBQWlDLEVBQ2pDLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsRUFDckMsVUFBVSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU07UUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUNELENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIn0=