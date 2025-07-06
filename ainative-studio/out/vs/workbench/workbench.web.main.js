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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC53ZWIubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFHaEcsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUN2Qyx1Q0FBdUM7QUFDdkMsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUV2QyxnRUFBZ0U7QUFFaEUsQ0FBQztJQXlDQSxZQUFZO0lBRVosTUFBTSxNQUFNLEdBQW1CLFVBQWtCLENBQUMsTUFBTSxDQUFDO0lBQ3pELE1BQU0sT0FBTyxHQUF1QyxVQUFrQixDQUFDLE9BQU8sQ0FBQztJQUUvRSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUNwRSxNQUFNLElBQUksS0FBSyxDQUFDLG1HQUFtRyxDQUFDLENBQUM7SUFDdEgsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5RkFBeUYsQ0FBQyxDQUFDO0lBQzVHLENBQUM7SUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzVCLE9BQU8sR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQ3pCLENBQUM7SUFDRCxVQUFVLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDO0lBRXZDLE1BQU0sa0JBQWtCLEdBQWdILE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztJQUMvSyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDeEIsVUFBVSxDQUFDLHVCQUF1QixHQUFHLGtCQUFrQixDQUFDO0lBQ3pELENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNwQyxVQUFrQixDQUFDLHdCQUF3QixHQUFHLE9BQU8sQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEdBQWtCLEVBQUU7UUFDNUMsT0FBTztZQUNOLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUNyQyxNQUFNLE1BQU0sR0FBUSxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztnQkFDdkIsTUFBTSxDQUFDLEdBQUcsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLEdBQUcsT0FBTyw2Q0FBNkMsQ0FBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLDZDQUE2QyxDQUFDO2dCQUN6TSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFbEMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEMsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FDTCxpQ0FBaUMsRUFDakMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxFQUNyQyxVQUFVLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTTtRQUNsQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNoQyxDQUFDLENBQ0QsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMifQ==