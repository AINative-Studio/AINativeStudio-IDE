/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions, asCssVariableName } from '../../../../../platform/theme/common/colorRegistry.js';
import { asTextOrError } from '../../../../../platform/request/common/request.js';
import * as pfs from '../../../../../base/node/pfs.js';
import * as path from '../../../../../base/common/path.js';
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { RequestService } from '../../../../../platform/request/node/requestService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
// eslint-disable-next-line local/code-import-patterns
import '../../../../workbench.desktop.main.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { FileAccess } from '../../../../../base/common/network.js';
export const experimental = []; // 'settings.modifiedItemForeground', 'editorUnnecessary.foreground' ];
const knwonVariablesFileName = 'vscode-known-variables.json';
suite('Color Registry', function () {
    test(`update colors in ${knwonVariablesFileName}`, async function () {
        const varFilePath = FileAccess.asFileUri(`vs/../../build/lib/stylelint/${knwonVariablesFileName}`).fsPath;
        const content = (await fs.promises.readFile(varFilePath)).toString();
        const variablesInfo = JSON.parse(content);
        const colorsArray = variablesInfo.colors;
        assert.ok(colorsArray && colorsArray.length > 0, '${knwonVariablesFileName} contains no color descriptions');
        const colors = new Set(colorsArray);
        const updatedColors = [];
        const missing = [];
        const themingRegistry = Registry.as(Extensions.ColorContribution);
        for (const color of themingRegistry.getColors()) {
            const id = asCssVariableName(color.id);
            if (!colors.has(id)) {
                if (!color.deprecationMessage) {
                    missing.push(id);
                }
            }
            else {
                colors.delete(id);
            }
            updatedColors.push(id);
        }
        const superfluousKeys = [...colors.keys()];
        let errorText = '';
        if (missing.length > 0) {
            errorText += `\n\Adding the following colors:\n\n${JSON.stringify(missing, undefined, '\t')}\n`;
        }
        if (superfluousKeys.length > 0) {
            errorText += `\n\Removing the following colors:\n\n${superfluousKeys.join('\n')}\n`;
        }
        if (errorText.length > 0) {
            updatedColors.sort();
            variablesInfo.colors = updatedColors;
            await pfs.Promises.writeFile(varFilePath, JSON.stringify(variablesInfo, undefined, '\t'));
            assert.fail(`\n\Updating ${path.normalize(varFilePath)}.\nPlease verify and commit.\n\n${errorText}\n`);
        }
    });
    test('all colors listed in theme-color.md', async function () {
        // avoid importing the TestEnvironmentService as it brings in a duplicate registration of the file editor input factory.
        const environmentService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.args = { _: [] };
            }
        };
        const docUrl = 'https://raw.githubusercontent.com/microsoft/vscode-docs/main/api/references/theme-color.md';
        const reqContext = await new RequestService('local', new TestConfigurationService(), environmentService, new NullLogService()).request({ url: docUrl }, CancellationToken.None);
        const content = (await asTextOrError(reqContext));
        const expression = /-\s*\`([\w\.]+)\`: (.*)/g;
        let m;
        const colorsInDoc = Object.create(null);
        let nColorsInDoc = 0;
        while (m = expression.exec(content)) {
            colorsInDoc[m[1]] = { description: m[2], offset: m.index, length: m.length };
            nColorsInDoc++;
        }
        assert.ok(nColorsInDoc > 0, 'theme-color.md contains to color descriptions');
        const missing = Object.create(null);
        const descriptionDiffs = Object.create(null);
        const themingRegistry = Registry.as(Extensions.ColorContribution);
        for (const color of themingRegistry.getColors()) {
            if (!colorsInDoc[color.id]) {
                if (!color.deprecationMessage) {
                    missing[color.id] = getDescription(color);
                }
            }
            else {
                const docDescription = colorsInDoc[color.id].description;
                const specDescription = getDescription(color);
                if (docDescription !== specDescription) {
                    descriptionDiffs[color.id] = { docDescription, specDescription };
                }
                delete colorsInDoc[color.id];
            }
        }
        const colorsInExtensions = await getColorsFromExtension();
        for (const colorId in colorsInExtensions) {
            if (!colorsInDoc[colorId]) {
                missing[colorId] = colorsInExtensions[colorId];
            }
            else {
                delete colorsInDoc[colorId];
            }
        }
        for (const colorId of experimental) {
            if (missing[colorId]) {
                delete missing[colorId];
            }
            if (colorsInDoc[colorId]) {
                assert.fail(`Color ${colorId} found in doc but marked experimental. Please remove from experimental list.`);
            }
        }
        const superfluousKeys = Object.keys(colorsInDoc);
        const undocumentedKeys = Object.keys(missing).map(k => `\`${k}\`: ${missing[k]}`);
        let errorText = '';
        if (undocumentedKeys.length > 0) {
            errorText += `\n\nAdd the following colors:\n\n${undocumentedKeys.join('\n')}\n`;
        }
        if (superfluousKeys.length > 0) {
            errorText += `\n\Remove the following colors:\n\n${superfluousKeys.join('\n')}\n`;
        }
        if (errorText.length > 0) {
            assert.fail(`\n\nOpen https://github.dev/microsoft/vscode-docs/blob/vnext/api/references/theme-color.md#50${errorText}`);
        }
    });
});
function getDescription(color) {
    let specDescription = color.description;
    if (color.deprecationMessage) {
        specDescription = specDescription + ' ' + color.deprecationMessage;
    }
    return specDescription;
}
async function getColorsFromExtension() {
    const extPath = FileAccess.asFileUri('vs/../../extensions').fsPath;
    const extFolders = await pfs.Promises.readDirsInDir(extPath);
    const result = Object.create(null);
    for (const folder of extFolders) {
        try {
            const packageJSON = JSON.parse((await fs.promises.readFile(path.join(extPath, folder, 'package.json'))).toString());
            const contributes = packageJSON['contributes'];
            if (contributes) {
                const colors = contributes['colors'];
                if (colors) {
                    for (const color of colors) {
                        const colorId = color['id'];
                        if (colorId) {
                            result[colorId] = colorId['description'];
                        }
                    }
                }
            }
        }
        catch (e) {
            // ignore
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JSZWdpc3RyeS5yZWxlYXNlVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90aGVtZXMvdGVzdC9ub2RlL2NvbG9yUmVnaXN0cnkucmVsZWFzZVRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBa0IsVUFBVSxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxzREFBc0Q7QUFDdEQsT0FBTyx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQWFuRSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDLENBQUMsdUVBQXVFO0FBR2pILE1BQU0sc0JB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