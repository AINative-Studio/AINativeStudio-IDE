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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWVzbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1lc20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUNwQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ25ELE9BQU8scUJBQXFCLENBQUM7QUFDN0IsT0FBTyxLQUFLLFdBQVcsTUFBTSxpQ0FBaUMsQ0FBQztBQUcvRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMvQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFL0QsbUVBQW1FO0FBQ25FLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztJQUN6RSxNQUFNLE1BQU0sR0FBRzs7Ozs7Ozs7Ozs7OztHQWFiLENBQUM7SUFDSCxRQUFRLENBQUMsK0JBQStCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwRyxDQUFDO0FB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