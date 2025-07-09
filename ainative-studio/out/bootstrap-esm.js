/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire, register } from 'node:module';
import { product, pkg } from './bootstrap-meta.js';
import './bootstrap-node.js';
import * as performance from './vs/base/common/performance.js';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Install a hook to module resolution to map 'fs' to 'original-fs'
if (process.env['ELECTRON_RUN_AS_NODE'] || process.versions['electron']) {
    const jsCode = `
	export async function resolve(specifier, context, nextResolve) {
		if (specifier === 'fs') {
			return {
				format: 'builtin',
				shortCircuit: true,
				url: 'node:original-fs'
			};
		}

		// Defer to the next hook in the chain, which would be the
		// Node.js default resolve if this is the last user-specified loader.
		return nextResolve(specifier, context);
	}`;
    register(`data:text/javascript;base64,${Buffer.from(jsCode).toString('base64')}`, import.meta.url);
}
// Prepare globals that are needed for running
globalThis._VSCODE_PRODUCT_JSON = { ...product };
if (process.env['VSCODE_DEV']) {
    try {
        const overrides = require('../product.overrides.json');
        globalThis._VSCODE_PRODUCT_JSON = Object.assign(globalThis._VSCODE_PRODUCT_JSON, overrides);
    }
    catch (error) { /* ignore */ }
}
globalThis._VSCODE_PACKAGE_JSON = { ...pkg };
globalThis._VSCODE_FILE_ROOT = __dirname;
//#region NLS helpers
let setupNLSResult = undefined;
function setupNLS() {
    if (!setupNLSResult) {
        setupNLSResult = doSetupNLS();
    }
    return setupNLSResult;
}
async function doSetupNLS() {
    performance.mark('code/willLoadNls');
    let nlsConfig = undefined;
    let messagesFile;
    if (process.env['VSCODE_NLS_CONFIG']) {
        try {
            nlsConfig = JSON.parse(process.env['VSCODE_NLS_CONFIG']);
            if (nlsConfig?.languagePack?.messagesFile) {
                messagesFile = nlsConfig.languagePack.messagesFile;
            }
            else if (nlsConfig?.defaultMessagesFile) {
                messagesFile = nlsConfig.defaultMessagesFile;
            }
            globalThis._VSCODE_NLS_LANGUAGE = nlsConfig?.resolvedLanguage;
        }
        catch (e) {
            console.error(`Error reading VSCODE_NLS_CONFIG from environment: ${e}`);
        }
    }
    if (process.env['VSCODE_DEV'] || // no NLS support in dev mode
        !messagesFile // no NLS messages file
    ) {
        return undefined;
    }
    try {
        globalThis._VSCODE_NLS_MESSAGES = JSON.parse((await fs.promises.readFile(messagesFile)).toString());
    }
    catch (error) {
        console.error(`Error reading NLS messages file ${messagesFile}: ${error}`);
        // Mark as corrupt: this will re-create the language pack cache next startup
        if (nlsConfig?.languagePack?.corruptMarkerFile) {
            try {
                await fs.promises.writeFile(nlsConfig.languagePack.corruptMarkerFile, 'corrupted');
            }
            catch (error) {
                console.error(`Error writing corrupted NLS marker file: ${error}`);
            }
        }
        // Fallback to the default message file to ensure english translation at least
        if (nlsConfig?.defaultMessagesFile && nlsConfig.defaultMessagesFile !== messagesFile) {
            try {
                globalThis._VSCODE_NLS_MESSAGES = JSON.parse((await fs.promises.readFile(nlsConfig.defaultMessagesFile)).toString());
            }
            catch (error) {
                console.error(`Error reading default NLS messages file ${nlsConfig.defaultMessagesFile}: ${error}`);
            }
        }
    }
    performance.mark('code/didLoadNls');
    return nlsConfig;
}
//#endregion
export async function bootstrapESM() {
    // NLS
    await setupNLS();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWVzbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtZXNtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFDcEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRCxPQUFPLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sS0FBSyxXQUFXLE1BQU0saUNBQWlDLENBQUM7QUFHL0QsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRS9ELG1FQUFtRTtBQUNuRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7SUFDekUsTUFBTSxNQUFNLEdBQUc7Ozs7Ozs7Ozs7Ozs7R0FhYixDQUFDO0lBQ0gsUUFBUSxDQUFDLCtCQUErQixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEcsQ0FBQztBQUVELDhDQUE4QztBQUM5QyxVQUFVLENBQUMsb0JBQW9CLEdBQUcsRUFBRSxHQUFHLE9BQU8sRUFBRSxDQUFDO0FBQ2pELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO0lBQy9CLElBQUksQ0FBQztRQUNKLE1BQU0sU0FBUyxHQUFZLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ2hFLFVBQVUsQ0FBQyxvQkFBb0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFDRCxVQUFVLENBQUMsb0JBQW9CLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQzdDLFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFFekMscUJBQXFCO0FBRXJCLElBQUksY0FBYyxHQUF1RCxTQUFTLENBQUM7QUFFbkYsU0FBUyxRQUFRO0lBQ2hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQixjQUFjLEdBQUcsVUFBVSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVELE9BQU8sY0FBYyxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxLQUFLLFVBQVUsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFckMsSUFBSSxTQUFTLEdBQWtDLFNBQVMsQ0FBQztJQUV6RCxJQUFJLFlBQWdDLENBQUM7SUFDckMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUM7WUFDSixTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUN6RCxJQUFJLFNBQVMsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLENBQUM7Z0JBQzNDLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUNwRCxDQUFDO2lCQUFNLElBQUksU0FBUyxFQUFFLG1CQUFtQixFQUFFLENBQUM7Z0JBQzNDLFlBQVksR0FBRyxTQUFTLENBQUMsbUJBQW1CLENBQUM7WUFDOUMsQ0FBQztZQUVELFVBQVUsQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLEVBQUUsZ0JBQWdCLENBQUM7UUFDL0QsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7SUFDRixDQUFDO0lBRUQsSUFDQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLDZCQUE2QjtRQUMxRCxDQUFDLFlBQVksQ0FBSyx1QkFBdUI7TUFDeEMsQ0FBQztRQUNGLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSixVQUFVLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ3JHLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLFlBQVksS0FBSyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTNFLDRFQUE0RTtRQUM1RSxJQUFJLFNBQVMsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3BGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLENBQUM7UUFDRixDQUFDO1FBRUQsOEVBQThFO1FBQzlFLElBQUksU0FBUyxFQUFFLG1CQUFtQixJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN0RixJQUFJLENBQUM7Z0JBQ0osVUFBVSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN0SCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsU0FBUyxDQUFDLG1CQUFtQixLQUFLLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDckcsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRXBDLE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxZQUFZO0FBRVosTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZO0lBRWpDLE1BQU07SUFDTixNQUFNLFFBQVEsRUFBRSxDQUFDO0FBQ2xCLENBQUMifQ==