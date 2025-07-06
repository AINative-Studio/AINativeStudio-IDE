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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWltcG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1pbXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsd0VBQXdFO0FBQ3hFLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFDeEUsd0VBQXdFO0FBQ3hFLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFFeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUNuQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRWpDLGdFQUFnRTtBQUVoRSxNQUFNLGVBQWUsR0FBMkIsRUFBRSxDQUFDO0FBRW5ELE1BQU0sQ0FBQyxLQUFLLFVBQVUsVUFBVSxDQUFDLFVBQWtCO0lBQ2xELG9CQUFvQjtJQUVwQixNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25HLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2RixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQy9ELElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsSUFBSSxlQUFlLENBQUMsQ0FBQztZQUNqRixJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUNuQixDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxJQUFJLEtBQUssQ0FBQztZQUNmLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2hGLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRXRELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywrREFBK0QsVUFBVSxFQUFFLENBQUMsQ0FBQztBQUMxRixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxPQUFPLENBQUMsU0FBMEIsRUFBRSxPQUFZLEVBQUUsV0FBMEM7SUFFakgsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ2hDLE9BQU87WUFDTixNQUFNLEVBQUUsVUFBVTtZQUNsQixZQUFZLEVBQUUsSUFBSTtZQUNsQixHQUFHLEVBQUUsWUFBWTtTQUNqQixDQUFDO0lBQ0gsQ0FBQztJQUVELDBEQUEwRDtJQUMxRCxxRUFBcUU7SUFDckUsT0FBTyxXQUFXLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hDLENBQUMifQ==