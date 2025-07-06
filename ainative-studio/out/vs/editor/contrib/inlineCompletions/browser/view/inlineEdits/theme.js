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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvdGhlbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFN0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDbk8sT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFtQixNQUFNLHVEQUF1RCxDQUFDO0FBRTVILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXBFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FDbkQsK0JBQStCLEVBQy9CLFdBQVcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQzdCLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx5REFBeUQsQ0FBQyxFQUNwRyxJQUFJLENBQ0osQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FDbkQsK0JBQStCLEVBQy9CLFdBQVcsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLEVBQzlCLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx5REFBeUQsQ0FBQyxFQUNwRyxJQUFJLENBQ0osQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLGFBQWEsQ0FDOUQsMENBQTBDLEVBQzFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQzdCLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSw4RUFBOEUsQ0FBQyxFQUNwSSxJQUFJLENBQ0osQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGFBQWEsQ0FDM0QsMENBQTBDLEVBQzFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQzdCLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSwwRUFBMEUsQ0FBQyxFQUNoSSxJQUFJLENBQ0osQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLGFBQWEsQ0FDOUQsMENBQTBDLEVBQzFDO0lBQ0MsS0FBSyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUM7SUFDekMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUM7SUFDeEMsTUFBTSxFQUFFLGdCQUFnQjtJQUN4QixPQUFPLEVBQUUsZ0JBQWdCO0NBQ3pCLEVBQ0QsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLDhFQUE4RSxDQUFDLEVBQ3BJLElBQUksQ0FDSixDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUMzRCwwQ0FBMEMsRUFDMUMsV0FBVyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsRUFDOUIsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLDBFQUEwRSxDQUFDLEVBQ2hJLElBQUksQ0FDSixDQUFDO0FBRUYsbUNBQW1DO0FBRW5DLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLGFBQWEsQ0FDaEUsOENBQThDLEVBQzlDLGdCQUFnQixFQUNoQixRQUFRLENBQUMsOENBQThDLEVBQUUsZ0VBQWdFLENBQUMsQ0FDMUgsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGFBQWEsQ0FDNUQsMENBQTBDLEVBQzFDLGdCQUFnQixFQUNoQixRQUFRLENBQUMsMENBQTBDLEVBQUUsNERBQTRELENBQUMsQ0FDbEgsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLGFBQWEsQ0FDaEUsOENBQThDLEVBQzlDO0lBQ0MsS0FBSyxFQUFFLFdBQVcsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLENBQUM7SUFDekQsSUFBSSxFQUFFLFdBQVcsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLENBQUM7SUFDeEQsTUFBTSxFQUFFLFdBQVcsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLENBQUM7SUFDMUQsT0FBTyxFQUFFLFdBQVcsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLENBQUM7Q0FDM0QsRUFDRCxRQUFRLENBQUMsOENBQThDLEVBQUUsZ0VBQWdFLENBQUMsQ0FDMUgsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLGFBQWEsQ0FDbEUsZ0RBQWdELEVBQ2hELHlCQUF5QixFQUN6QixRQUFRLENBQUMsZ0RBQWdELEVBQUUsa0VBQWtFLENBQUMsQ0FDOUgsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLGFBQWEsQ0FDOUQsNENBQTRDLEVBQzVDLHlCQUF5QixFQUN6QixRQUFRLENBQUMsNENBQTRDLEVBQUUsOERBQThELENBQUMsQ0FDdEgsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLGFBQWEsQ0FDbEUsZ0RBQWdELEVBQ2hELGtDQUFrQyxFQUNsQyxRQUFRLENBQUMsZ0RBQWdELEVBQUUsa0VBQWtFLENBQUMsQ0FDOUgsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLGFBQWEsQ0FDbkUsaURBQWlELEVBQ2pELGdCQUFnQixFQUNoQixRQUFRLENBQUMsaURBQWlELEVBQUUsbUVBQW1FLENBQUMsQ0FDaEksQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLGFBQWEsQ0FDL0QsNkNBQTZDLEVBQzdDLGdCQUFnQixFQUNoQixRQUFRLENBQUMsNkNBQTZDLEVBQUUsK0RBQStELENBQUMsQ0FDeEgsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLGFBQWEsQ0FDbkUsaURBQWlELEVBQ2pELG1DQUFtQyxFQUNuQyxRQUFRLENBQUMsaURBQWlELEVBQUUsbUVBQW1FLENBQUMsQ0FDaEksQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGFBQWEsQ0FDekQsdUNBQXVDLEVBQ3ZDO0lBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUM7SUFDbEQsT0FBTyxFQUFFLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUM7SUFDbkQsSUFBSSxFQUFFLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUM7SUFDaEQsS0FBSyxFQUFFLFdBQVc7Q0FDbEIsRUFDRCxRQUFRLENBQUMsdUNBQXVDLEVBQUUsd0RBQXdELENBQUMsQ0FDM0csQ0FBQztBQUVGLGdDQUFnQztBQUVoQyxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQ25DLDJCQUEyQixFQUMzQjtJQUNDLEtBQUssRUFBRSxXQUFXO0lBQ2xCLElBQUksRUFBRSxXQUFXO0lBQ2pCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE9BQU8sRUFBRSxXQUFXO0NBQ3BCLEVBQ0QsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHFEQUFxRCxDQUFDLENBQzVGLENBQUM7QUFFRixNQUFNLGNBQWMsR0FBRyxhQUFhLENBQ25DLDJCQUEyQixFQUMzQjtJQUNDLEtBQUssRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQztJQUNoQyxJQUFJLEVBQUUsWUFBWTtJQUNsQixNQUFNLEVBQUUsWUFBWTtJQUNwQixPQUFPLEVBQUUsWUFBWTtDQUNyQixFQUNELFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxxREFBcUQsQ0FBQyxDQUM1RixDQUFDO0FBRUYsTUFBTSwyQkFBMkIsR0FBRyxhQUFhLENBQ2hELHdDQUF3QyxFQUN4QztJQUNDLEtBQUssRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUNoQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDL0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLE9BQU8sRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztDQUNsQyxFQUNELFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSw0RUFBNEUsQ0FBQyxDQUNoSSxDQUFDO0FBRUYsTUFBTSwyQkFBMkIsR0FBRyxhQUFhLENBQ2hELHdDQUF3QyxFQUN4QztJQUNDLEtBQUssRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUNoQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDL0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLE9BQU8sRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztDQUNsQyxFQUNELFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxtR0FBbUcsQ0FBQyxDQUN2SixDQUFDO0FBRUYsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFNBQTJDO0lBQ2pGLE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM1RyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFNBQTJDO0lBQ2pGLE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM1RyxDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLGVBQStELEVBQUUsWUFBMkI7SUFDakksSUFBSSxLQUF5QixDQUFDO0lBQzlCLElBQUksT0FBTyxlQUFlLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDekMsS0FBSyxHQUFHLFlBQVksQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDckQsQ0FBQztTQUFNLENBQUM7UUFDUCxLQUFLLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDMUcsQ0FBQztJQUVELE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUVyRSxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLGVBQWdDLEVBQUUsWUFBMkI7SUFDekYsT0FBTyx1QkFBdUIsQ0FDN0I7UUFDQyxLQUFLLEVBQUUsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFO1FBQ3hDLFFBQVEsRUFBRSxDQUFDLENBQVEsRUFBRSxDQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0tBQzdDLEVBQ0QsWUFBWSxDQUFDLHFCQUFxQixFQUNsQyxHQUFHLEVBQUU7UUFDSixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxrQkFBa0IsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDLENBQ0QsQ0FBQztBQUNILENBQUMifQ==