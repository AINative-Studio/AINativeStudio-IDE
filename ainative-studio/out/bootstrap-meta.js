/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let productObj = { BUILD_INSERT_PRODUCT_CONFIGURATION: 'BUILD_INSERT_PRODUCT_CONFIGURATION' }; // DO NOT MODIFY, PATCHED DURING BUILD
if (productObj['BUILD_INSERT_PRODUCT_CONFIGURATION']) {
    productObj = require('../product.json'); // Running out of sources
}
let pkgObj = { BUILD_INSERT_PACKAGE_CONFIGURATION: 'BUILD_INSERT_PACKAGE_CONFIGURATION' }; // DO NOT MODIFY, PATCHED DURING BUILD
if (pkgObj['BUILD_INSERT_PACKAGE_CONFIGURATION']) {
    pkgObj = require('../package.json'); // Running out of sources
}
export const product = productObj;
export const pkg = pkgObj;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLW1ldGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1tZXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFHNUMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFFL0MsSUFBSSxVQUFVLEdBQXFGLEVBQUUsa0NBQWtDLEVBQUUsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQztBQUN2TixJQUFJLFVBQVUsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLENBQUM7SUFDdEQsVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMseUJBQXlCO0FBQ25FLENBQUM7QUFFRCxJQUFJLE1BQU0sR0FBRyxFQUFFLGtDQUFrQyxFQUFFLG9DQUFvQyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7QUFDakksSUFBSSxNQUFNLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDO0lBQ2xELE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtBQUMvRCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQztBQUNsQyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDIn0=