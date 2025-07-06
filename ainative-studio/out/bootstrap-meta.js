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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLW1ldGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtbWV0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRzVDLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBRS9DLElBQUksVUFBVSxHQUFxRixFQUFFLGtDQUFrQyxFQUFFLG9DQUFvQyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7QUFDdk4sSUFBSSxVQUFVLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDO0lBQ3RELFVBQVUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtBQUNuRSxDQUFDO0FBRUQsSUFBSSxNQUFNLEdBQUcsRUFBRSxrQ0FBa0MsRUFBRSxvQ0FBb0MsRUFBRSxDQUFDLENBQUMsc0NBQXNDO0FBQ2pJLElBQUksTUFBTSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQztJQUNsRCxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyx5QkFBeUI7QUFDL0QsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUM7QUFDbEMsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyJ9