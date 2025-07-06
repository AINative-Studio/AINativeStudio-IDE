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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZHVjdC9jb21tb24vcHJvZHVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFJdEQ7Ozs7R0FJRztBQUNILElBQUksT0FBOEIsQ0FBQztBQUVuQyw2QkFBNkI7QUFDN0IsTUFBTSxZQUFZLEdBQUksVUFBa0IsQ0FBQyxNQUFNLENBQUM7QUFDaEQsSUFBSSxPQUFPLFlBQVksS0FBSyxXQUFXLElBQUksT0FBTyxZQUFZLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRSxDQUFDO0lBQ3hGLE1BQU0sYUFBYSxHQUFzQyxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzlGLElBQUksYUFBYSxFQUFFLENBQUM7UUFDbkIsT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7SUFDakMsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLHVFQUF1RSxDQUFDLENBQUM7SUFDMUYsQ0FBQztBQUNGLENBQUM7QUFDRCxzQkFBc0I7S0FDakIsSUFBSSxVQUFVLENBQUMsb0JBQW9CLElBQUksVUFBVSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDN0Usd0RBQXdEO0lBQ3hELE9BQU8sR0FBRyxVQUFVLENBQUMsb0JBQXdELENBQUM7SUFFOUUseUJBQXlCO0lBQ3pCLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDdEIsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsTUFBTTtZQUNyQyxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsUUFBUSxNQUFNO1lBQ25DLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLE1BQU07WUFDL0Msb0JBQW9CLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3RHLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxtREFBbUQ7SUFDbkQsK0NBQStDO0lBQy9DLGtEQUFrRDtJQUNsRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxvQkFBMkMsQ0FBQztRQUVuRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0QixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87U0FDcEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztBQUNGLENBQUM7QUFFRCw2QkFBNkI7S0FDeEIsQ0FBQztJQUVMLDJDQUEyQztJQUMzQyxPQUFPLEdBQUcsRUFBRSx1Q0FBdUMsQ0FBUyxDQUFDO0lBRTdELHlCQUF5QjtJQUN6QixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ3RCLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLFNBQVMsRUFBRSxnQkFBZ0I7WUFDM0IsUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixlQUFlLEVBQUUsVUFBVTtZQUMzQixjQUFjLEVBQUUsYUFBYTtZQUM3QixXQUFXLEVBQUUsVUFBVTtZQUN2QixjQUFjLEVBQUUsZ0RBQWdEO1lBQ2hFLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFVBQVUsRUFBRSwyREFBMkQ7WUFDdkUsZ0JBQWdCLEVBQUUsMkRBQTJEO1NBQzdFLENBQUMsQ0FBQztJQUNKLENBQUM7QUFDRixDQUFDO0FBRUQsZUFBZSxPQUFPLENBQUMifQ==