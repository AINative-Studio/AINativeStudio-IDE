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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JSZWdpc3RyeS5yZWxlYXNlVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RoZW1lcy90ZXN0L25vZGUvY29sb3JSZWdpc3RyeS5yZWxlYXNlVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0UsT0FBTyxFQUFrQixVQUFVLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILHNEQUFzRDtBQUN0RCxPQUFPLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBYW5FLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUMsQ0FBQyx1RUFBdUU7QUFHakgsTUFBTSxzQkFB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