/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from '../../../base/common/process.js';
/**
 * @deprecated It is preferred that you use `IProductService` if you can. This
 * allows web embedders to override our defaults. But for things like `product.quality`,
 * the use is fine because that property is not overridable.
 */
let product;
// Native sandbox environment
const vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.context !== 'undefined') {
    const configuration = vscodeGlobal.context.configuration();
    if (configuration) {
        product = configuration.product;
    }
    else {
        throw new Error('Sandbox: unable to resolve product configuration from preload script.');
    }
}
// _VSCODE environment
else if (globalThis._VSCODE_PRODUCT_JSON && globalThis._VSCODE_PACKAGE_JSON) {
    // Obtain values from product.json and package.json-data
    product = globalThis._VSCODE_PRODUCT_JSON;
    // Running out of sources
    if (env['VSCODE_DEV']) {
        Object.assign(product, {
            nameShort: `${product.nameShort} Dev`,
            nameLong: `${product.nameLong} Dev`,
            dataFolderName: `${product.dataFolderName}-dev`,
            serverDataFolderName: product.serverDataFolderName ? `${product.serverDataFolderName}-dev` : undefined
        });
    }
    // Version is added during built time, but we still
    // want to have it running out of sources so we
    // read it from package.json only when we need it.
    if (!product.version) {
        const pkg = globalThis._VSCODE_PACKAGE_JSON;
        Object.assign(product, {
            version: pkg.version
        });
    }
}
// Web environment or unknown
else {
    // Built time configuration (do NOT modify)
    product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/};
    // Running out of sources
    if (Object.keys(product).length === 0) {
        Object.assign(product, {
            version: '1.95.0-dev',
            nameShort: 'Code - OSS Dev',
            nameLong: 'Code - OSS Dev',
            applicationName: 'code-oss',
            dataFolderName: '.vscode-oss',
            urlProtocol: 'code-oss',
            reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
            licenseName: 'MIT',
            licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
            serverLicenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt'
        });
    }
}
export default product;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9kdWN0L2NvbW1vbi9wcm9kdWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUl0RDs7OztHQUlHO0FBQ0gsSUFBSSxPQUE4QixDQUFDO0FBRW5DLDZCQUE2QjtBQUM3QixNQUFNLFlBQVksR0FBSSxVQUFrQixDQUFDLE1BQU0sQ0FBQztBQUNoRCxJQUFJLE9BQU8sWUFBWSxLQUFLLFdBQVcsSUFBSSxPQUFPLFlBQVksQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7SUFDeEYsTUFBTSxhQUFhLEdBQXNDLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDOUYsSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUNuQixPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztJQUNqQyxDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsdUVBQXVFLENBQUMsQ0FBQztJQUMxRixDQUFDO0FBQ0YsQ0FBQztBQUNELHNCQUFzQjtLQUNqQixJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsSUFBSSxVQUFVLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM3RSx3REFBd0Q7SUFDeEQsT0FBTyxHQUFHLFVBQVUsQ0FBQyxvQkFBd0QsQ0FBQztJQUU5RSx5QkFBeUI7SUFDekIsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUN2QixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0QixTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxNQUFNO1lBQ3JDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLE1BQU07WUFDbkMsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFDLGNBQWMsTUFBTTtZQUMvQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDdEcsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELG1EQUFtRDtJQUNuRCwrQ0FBK0M7SUFDL0Msa0RBQWtEO0lBQ2xELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLG9CQUEyQyxDQUFDO1FBRW5FLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ3RCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztTQUNwQixDQUFDLENBQUM7SUFDSixDQUFDO0FBQ0YsQ0FBQztBQUVELDZCQUE2QjtLQUN4QixDQUFDO0lBRUwsMkNBQTJDO0lBQzNDLE9BQU8sR0FBRyxFQUFFLHVDQUF1QyxDQUFTLENBQUM7SUFFN0QseUJBQXlCO0lBQ3pCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDdEIsT0FBTyxFQUFFLFlBQVk7WUFDckIsU0FBUyxFQUFFLGdCQUFnQjtZQUMzQixRQUFRLEVBQUUsZ0JBQWdCO1lBQzFCLGVBQWUsRUFBRSxVQUFVO1lBQzNCLGNBQWMsRUFBRSxhQUFhO1lBQzdCLFdBQVcsRUFBRSxVQUFVO1lBQ3ZCLGNBQWMsRUFBRSxnREFBZ0Q7WUFDaEUsV0FBVyxFQUFFLEtBQUs7WUFDbEIsVUFBVSxFQUFFLDJEQUEyRDtZQUN2RSxnQkFBZ0IsRUFBRSwyREFBMkQ7U0FDN0UsQ0FBQyxDQUFDO0lBQ0osQ0FBQztBQUNGLENBQUM7QUFFRCxlQUFlLE9BQU8sQ0FBQyJ9