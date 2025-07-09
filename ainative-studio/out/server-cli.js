/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './bootstrap-server.js'; // this MUST come before other imports as it changes global state
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { devInjectNodeModuleLookupPath } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { product } from './bootstrap-meta.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
// NLS
const nlsConfiguration = await resolveNLSConfiguration({ userLocale: 'en', osLocale: 'en', commit: product.commit, userDataPath: '', nlsMetadataPath: __dirname });
process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfiguration); // required for `bootstrap-esm` to pick up NLS messages
if (process.env['VSCODE_DEV']) {
    // When running out of sources, we need to load node modules from remote/node_modules,
    // which are compiled against nodejs, not electron
    process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] = process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] || join(__dirname, '..', 'remote', 'node_modules');
    devInjectNodeModuleLookupPath(process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']);
}
else {
    delete process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'];
}
// Bootstrap ESM
await bootstrapESM();
// Load Server
await import('./vs/server/node/server.cli.js');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLWNsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJzZXJ2ZXItY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sdUJBQXVCLENBQUMsQ0FBQyxpRUFBaUU7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDckMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUNwQyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRTlDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRTFELE1BQU07QUFDTixNQUFNLGdCQUFnQixHQUFHLE1BQU0sdUJBQXVCLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUNuSyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsdURBQXVEO0FBRTVILElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO0lBQy9CLHNGQUFzRjtJQUN0RixrREFBa0Q7SUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDdkssNkJBQTZCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7QUFDekYsQ0FBQztLQUFNLENBQUM7SUFDUCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsQ0FBQztBQUNqRSxDQUFDO0FBRUQsZ0JBQWdCO0FBQ2hCLE1BQU0sWUFBWSxFQUFFLENBQUM7QUFFckIsY0FBYztBQUNkLE1BQU0sTUFBTSxDQUFDLGdDQUFnQyxDQUFDLENBQUMifQ==