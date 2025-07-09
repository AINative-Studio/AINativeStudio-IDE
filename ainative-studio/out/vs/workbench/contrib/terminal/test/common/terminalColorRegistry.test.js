/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Extensions as ThemeingExtensions } from '../../../../../platform/theme/common/colorRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ansiColorIdentifiers, registerColors } from '../../common/terminalColorRegistry.js';
import { Color } from '../../../../../base/common/color.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
registerColors();
const themingRegistry = Registry.as(ThemeingExtensions.ColorContribution);
function getMockTheme(type) {
    const theme = {
        selector: '',
        label: '',
        type: type,
        getColor: (colorId) => themingRegistry.resolveDefaultColor(colorId, theme),
        defines: () => true,
        getTokenStyleMetadata: () => undefined,
        tokenColorMap: [],
        semanticHighlighting: false
    };
    return theme;
}
suite('Workbench - TerminalColorRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('hc colors', function () {
        const theme = getMockTheme(ColorScheme.HIGH_CONTRAST_DARK);
        const colors = ansiColorIdentifiers.map(colorId => Color.Format.CSS.formatHexA(theme.getColor(colorId), true));
        assert.deepStrictEqual(colors, [
            '#000000',
            '#cd0000',
            '#00cd00',
            '#cdcd00',
            '#0000ee',
            '#cd00cd',
            '#00cdcd',
            '#e5e5e5',
            '#7f7f7f',
            '#ff0000',
            '#00ff00',
            '#ffff00',
            '#5c5cff',
            '#ff00ff',
            '#00ffff',
            '#ffffff'
        ], 'The high contrast terminal colors should be used when the hc theme is active');
    });
    test('light colors', function () {
        const theme = getMockTheme(ColorScheme.LIGHT);
        const colors = ansiColorIdentifiers.map(colorId => Color.Format.CSS.formatHexA(theme.getColor(colorId), true));
        assert.deepStrictEqual(colors, [
            '#000000',
            '#cd3131',
            '#107c10',
            '#949800',
            '#0451a5',
            '#bc05bc',
            '#0598bc',
            '#555555',
            '#666666',
            '#cd3131',
            '#14ce14',
            '#b5ba00',
            '#0451a5',
            '#bc05bc',
            '#0598bc',
            '#a5a5a5'
        ], 'The light terminal colors should be used when the light theme is active');
    });
    test('dark colors', function () {
        const theme = getMockTheme(ColorScheme.DARK);
        const colors = ansiColorIdentifiers.map(colorId => Color.Format.CSS.formatHexA(theme.getColor(colorId), true));
        assert.deepStrictEqual(colors, [
            '#000000',
            '#cd3131',
            '#0dbc79',
            '#e5e510',
            '#2472c8',
            '#bc3fbc',
            '#11a8cd',
            '#e5e5e5',
            '#666666',
            '#f14c4c',
            '#23d18b',
            '#f5f543',
            '#3b8eea',
            '#d670d6',
            '#29b8db',
            '#e5e5e5'
        ], 'The dark terminal colors should be used when a dark theme is active');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb2xvclJlZ2lzdHJ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9jb21tb24vdGVybWluYWxDb2xvclJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLElBQUksa0JBQWtCLEVBQW1DLE1BQU0sdURBQXVELENBQUM7QUFDMUksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLGNBQWMsRUFBRSxDQUFDO0FBRWpCLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWlCLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUYsU0FBUyxZQUFZLENBQUMsSUFBaUI7SUFDdEMsTUFBTSxLQUFLLEdBQUc7UUFDYixRQUFRLEVBQUUsRUFBRTtRQUNaLEtBQUssRUFBRSxFQUFFO1FBQ1QsSUFBSSxFQUFFLElBQUk7UUFDVixRQUFRLEVBQUUsQ0FBQyxPQUF3QixFQUFxQixFQUFFLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDOUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7UUFDbkIscUJB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