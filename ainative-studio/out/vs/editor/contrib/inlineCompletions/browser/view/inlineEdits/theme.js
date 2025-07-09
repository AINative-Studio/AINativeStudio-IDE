/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { observableFromEventOpts } from '../../../../../../base/common/observableInternal/utils.js';
import { localize } from '../../../../../../nls.js';
import { diffRemoved, diffInsertedLine, diffInserted, buttonBackground, buttonForeground, buttonSecondaryBackground, buttonSecondaryForeground, editorBackground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { registerColor, transparent, darken } from '../../../../../../platform/theme/common/colorUtils.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
export const originalBackgroundColor = registerColor('inlineEdit.originalBackground', transparent(diffRemoved, 0.2), localize('inlineEdit.originalBackground', 'Background color for the original text in inline edits.'), true);
export const modifiedBackgroundColor = registerColor('inlineEdit.modifiedBackground', transparent(diffInserted, 0.3), localize('inlineEdit.modifiedBackground', 'Background color for the modified text in inline edits.'), true);
export const originalChangedLineBackgroundColor = registerColor('inlineEdit.originalChangedLineBackground', transparent(diffRemoved, 0.8), localize('inlineEdit.originalChangedLineBackground', 'Background color for the changed lines in the original text of inline edits.'), true);
export const originalChangedTextOverlayColor = registerColor('inlineEdit.originalChangedTextBackground', transparent(diffRemoved, 0.8), localize('inlineEdit.originalChangedTextBackground', 'Overlay color for the changed text in the original text of inline edits.'), true);
export const modifiedChangedLineBackgroundColor = registerColor('inlineEdit.modifiedChangedLineBackground', {
    light: transparent(diffInsertedLine, 0.7),
    dark: transparent(diffInsertedLine, 0.7),
    hcDark: diffInsertedLine,
    hcLight: diffInsertedLine
}, localize('inlineEdit.modifiedChangedLineBackground', 'Background color for the changed lines in the modified text of inline edits.'), true);
export const modifiedChangedTextOverlayColor = registerColor('inlineEdit.modifiedChangedTextBackground', transparent(diffInserted, 0.7), localize('inlineEdit.modifiedChangedTextBackground', 'Overlay color for the changed text in the modified text of inline edits.'), true);
// ------- GUTTER INDICATOR -------
export const inlineEditIndicatorPrimaryForeground = registerColor('inlineEdit.gutterIndicator.primaryForeground', buttonForeground, localize('inlineEdit.gutterIndicator.primaryForeground', 'Foreground color for the primary inline edit gutter indicator.'));
export const inlineEditIndicatorPrimaryBorder = registerColor('inlineEdit.gutterIndicator.primaryBorder', buttonBackground, localize('inlineEdit.gutterIndicator.primaryBorder', 'Border color for the primary inline edit gutter indicator.'));
export const inlineEditIndicatorPrimaryBackground = registerColor('inlineEdit.gutterIndicator.primaryBackground', {
    light: transparent(inlineEditIndicatorPrimaryBorder, 0.5),
    dark: transparent(inlineEditIndicatorPrimaryBorder, 0.4),
    hcDark: transparent(inlineEditIndicatorPrimaryBorder, 0.4),
    hcLight: transparent(inlineEditIndicatorPrimaryBorder, 0.5),
}, localize('inlineEdit.gutterIndicator.primaryBackground', 'Background color for the primary inline edit gutter indicator.'));
export const inlineEditIndicatorSecondaryForeground = registerColor('inlineEdit.gutterIndicator.secondaryForeground', buttonSecondaryForeground, localize('inlineEdit.gutterIndicator.secondaryForeground', 'Foreground color for the secondary inline edit gutter indicator.'));
export const inlineEditIndicatorSecondaryBorder = registerColor('inlineEdit.gutterIndicator.secondaryBorder', buttonSecondaryBackground, localize('inlineEdit.gutterIndicator.secondaryBorder', 'Border color for the secondary inline edit gutter indicator.'));
export const inlineEditIndicatorSecondaryBackground = registerColor('inlineEdit.gutterIndicator.secondaryBackground', inlineEditIndicatorSecondaryBorder, localize('inlineEdit.gutterIndicator.secondaryBackground', 'Background color for the secondary inline edit gutter indicator.'));
export const inlineEditIndicatorsuccessfulForeground = registerColor('inlineEdit.gutterIndicator.successfulForeground', buttonForeground, localize('inlineEdit.gutterIndicator.successfulForeground', 'Foreground color for the successful inline edit gutter indicator.'));
export const inlineEditIndicatorsuccessfulBorder = registerColor('inlineEdit.gutterIndicator.successfulBorder', buttonBackground, localize('inlineEdit.gutterIndicator.successfulBorder', 'Border color for the successful inline edit gutter indicator.'));
export const inlineEditIndicatorsuccessfulBackground = registerColor('inlineEdit.gutterIndicator.successfulBackground', inlineEditIndicatorsuccessfulBorder, localize('inlineEdit.gutterIndicator.successfulBackground', 'Background color for the successful inline edit gutter indicator.'));
export const inlineEditIndicatorBackground = registerColor('inlineEdit.gutterIndicator.background', {
    hcDark: transparent('tab.inactiveBackground', 0.5),
    hcLight: transparent('tab.inactiveBackground', 0.5),
    dark: transparent('tab.inactiveBackground', 0.5),
    light: '#5f5f5f18',
}, localize('inlineEdit.gutterIndicator.background', 'Background color for the inline edit gutter indicator.'));
// ------- BORDER COLORS -------
const originalBorder = registerColor('inlineEdit.originalBorder', {
    light: diffRemoved,
    dark: diffRemoved,
    hcDark: diffRemoved,
    hcLight: diffRemoved
}, localize('inlineEdit.originalBorder', 'Border color for the original text in inline edits.'));
const modifiedBorder = registerColor('inlineEdit.modifiedBorder', {
    light: darken(diffInserted, 0.6),
    dark: diffInserted,
    hcDark: diffInserted,
    hcLight: diffInserted
}, localize('inlineEdit.modifiedBorder', 'Border color for the modified text in inline edits.'));
const tabWillAcceptModifiedBorder = registerColor('inlineEdit.tabWillAcceptModifiedBorder', {
    light: darken(modifiedBorder, 0),
    dark: darken(modifiedBorder, 0),
    hcDark: darken(modifiedBorder, 0),
    hcLight: darken(modifiedBorder, 0)
}, localize('inlineEdit.tabWillAcceptModifiedBorder', 'Modified border color for the inline edits widget when tab will accept it.'));
const tabWillAcceptOriginalBorder = registerColor('inlineEdit.tabWillAcceptOriginalBorder', {
    light: darken(originalBorder, 0),
    dark: darken(originalBorder, 0),
    hcDark: darken(originalBorder, 0),
    hcLight: darken(originalBorder, 0)
}, localize('inlineEdit.tabWillAcceptOriginalBorder', 'Original border color for the inline edits widget over the original text when tab will accept it.'));
export function getModifiedBorderColor(tabAction) {
    return tabAction.map(a => a === InlineEditTabAction.Accept ? tabWillAcceptModifiedBorder : modifiedBorder);
}
export function getOriginalBorderColor(tabAction) {
    return tabAction.map(a => a === InlineEditTabAction.Accept ? tabWillAcceptOriginalBorder : originalBorder);
}
export function getEditorBlendedColor(colorIdentifier, themeService) {
    let color;
    if (typeof colorIdentifier === 'string') {
        color = observeColor(colorIdentifier, themeService);
    }
    else {
        color = colorIdentifier.map((identifier, reader) => observeColor(identifier, themeService).read(reader));
    }
    const backgroundColor = observeColor(editorBackground, themeService);
    return color.map((c, reader) => c.makeOpaque(backgroundColor.read(reader)));
}
export function observeColor(colorIdentifier, themeService) {
    return observableFromEventOpts({
        owner: { observeColor: colorIdentifier },
        equalsFn: (a, b) => a.equals(b),
    }, themeService.onDidColorThemeChange, () => {
        const color = themeService.getColorTheme().getColor(colorIdentifier);
        if (!color) {
            throw new BugIndicatingError(`Missing color: ${colorIdentifier}`);
        }
        return color;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL3RoZW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ25PLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBbUIsTUFBTSx1REFBdUQsQ0FBQztBQUU1SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVwRSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQ25ELCtCQUErQixFQUMvQixXQUFXLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUM3QixRQUFRLENBQUMsK0JBQStCLEVBQUUseURBQXlELENBQUMsRUFDcEcsSUFBSSxDQUNKLENBQUM7QUFDRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQ25ELCtCQUErQixFQUMvQixXQUFXLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxFQUM5QixRQUFRLENBQUMsK0JBQStCLEVBQUUseURBQXlELENBQUMsRUFDcEcsSUFBSSxDQUNKLENBQUM7QUFFRixN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