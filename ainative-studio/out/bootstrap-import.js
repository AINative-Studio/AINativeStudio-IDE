/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// *********************************************************************
// *                                                                   *
// *  We need this to redirect to node_modules from the remote-folder. *
// *  This ONLY applies  when running out of source.                   *
// *                                                                   *
// *********************************************************************
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promises } from 'node:fs';
import { join } from 'node:path';
// SEE https://nodejs.org/docs/latest/api/module.html#initialize
const _specifierToUrl = {};
export async function initialize(injectPath) {
    // populate mappings
    const injectPackageJSONPath = fileURLToPath(new URL('../package.json', pathToFileURL(injectPath)));
    const packageJSON = JSON.parse(String(await promises.readFile(injectPackageJSONPath)));
    for (const [name] of Object.entries(packageJSON.dependencies)) {
        try {
            const path = join(injectPackageJSONPath, `../node_modules/${name}/package.json`);
            let { main } = JSON.parse(String(await promises.readFile(path)));
            if (!main) {
                main = 'index.js';
            }
            if (!main.endsWith('.js')) {
                main += '.js';
            }
            const mainPath = join(injectPackageJSONPath, `../node_modules/${name}/${main}`);
            _specifierToUrl[name] = pathToFileURL(mainPath).href;
        }
        catch (err) {
            console.error(name);
            console.error(err);
        }
    }
    console.log(`[bootstrap-import] Initialized node_modules redirector for: ${injectPath}`);
}
export async function resolve(specifier, context, nextResolve) {
    const newSpecifier = _specifierToUrl[specifier];
    if (newSpecifier !== undefined) {
        return {
            format: 'commonjs',
            shortCircuit: true,
            url: newSpecifier
        };
    }
    // Defer to the next hook in the chain, which would be the
    // Node.js default resolve if this is the last user-specified loader.
    return nextResolve(specifier, context);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWltcG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtaW1wb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFDeEUsd0VBQXdFO0FBQ3hFLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFDeEUsd0VBQXdFO0FBRXhFLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDbkMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVqQyxnRUFBZ0U7QUFFaEUsTUFBTSxlQUFlLEdBQTJCLEVBQUUsQ0FBQztBQUVuRCxNQUFNLENBQUMsS0FBSyxVQUFVLFVBQVUsQ0FBQyxVQUFrQjtJQUNsRCxvQkFBb0I7SUFFcEIsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQUMsSUFBSSxHQUFHLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdkYsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUMvRCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLElBQUksZUFBZSxDQUFDLENBQUM7WUFDakYsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLElBQUksR0FBRyxVQUFVLENBQUM7WUFDbkIsQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLElBQUksSUFBSSxLQUFLLENBQUM7WUFDZixDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG1CQUFtQixJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNoRixlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUV0RCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsK0RBQStELFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDMUYsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsT0FBTyxDQUFDLFNBQTBCLEVBQUUsT0FBWSxFQUFFLFdBQTBDO0lBRWpILE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoRCxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNoQyxPQUFPO1lBQ04sTUFBTSxFQUFFLFVBQVU7WUFDbEIsWUFBWSxFQUFFLElBQUk7WUFDbEIsR0FBRyxFQUFFLFlBQVk7U0FDakIsQ0FBQztJQUNILENBQUM7SUFFRCwwREFBMEQ7SUFDMUQscUVBQXFFO0lBQ3JFLE9BQU8sV0FBVyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN4QyxDQUFDIn0=