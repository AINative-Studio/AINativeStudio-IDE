/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { activityErrorBadgeBackground, activityErrorBadgeForeground, badgeBackground, badgeForeground, chartsGreen, chartsRed, contrastBorder, diffInserted, diffRemoved, editorBackground, editorErrorForeground, editorForeground, editorInfoForeground, opaque, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
export const testingColorIconFailed = registerColor('testing.iconFailed', {
    dark: '#f14c4c',
    light: '#f14c4c',
    hcDark: '#f14c4c',
    hcLight: '#B5200D'
}, localize('testing.iconFailed', "Color for the 'failed' icon in the test explorer."));
export const testingColorIconErrored = registerColor('testing.iconErrored', {
    dark: '#f14c4c',
    light: '#f14c4c',
    hcDark: '#f14c4c',
    hcLight: '#B5200D'
}, localize('testing.iconErrored', "Color for the 'Errored' icon in the test explorer."));
export const testingColorIconPassed = registerColor('testing.iconPassed', {
    dark: '#73c991',
    light: '#73c991',
    hcDark: '#73c991',
    hcLight: '#007100'
}, localize('testing.iconPassed', "Color for the 'passed' icon in the test explorer."));
export const testingColorRunAction = registerColor('testing.runAction', testingColorIconPassed, localize('testing.runAction', "Color for 'run' icons in the editor."));
export const testingColorIconQueued = registerColor('testing.iconQueued', '#cca700', localize('testing.iconQueued', "Color for the 'Queued' icon in the test explorer."));
export const testingColorIconUnset = registerColor('testing.iconUnset', '#848484', localize('testing.iconUnset', "Color for the 'Unset' icon in the test explorer."));
export const testingColorIconSkipped = registerColor('testing.iconSkipped', '#848484', localize('testing.iconSkipped', "Color for the 'Skipped' icon in the test explorer."));
export const testingPeekBorder = registerColor('testing.peekBorder', {
    dark: editorErrorForeground,
    light: editorErrorForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.peekBorder', 'Color of the peek view borders and arrow.'));
export const testingMessagePeekBorder = registerColor('testing.messagePeekBorder', {
    dark: editorInfoForeground,
    light: editorInfoForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.messagePeekBorder', 'Color of the peek view borders and arrow when peeking a logged message.'));
export const testingPeekHeaderBackground = registerColor('testing.peekHeaderBackground', {
    dark: transparent(editorErrorForeground, 0.1),
    light: transparent(editorErrorForeground, 0.1),
    hcDark: null,
    hcLight: null
}, localize('testing.peekBorder', 'Color of the peek view borders and arrow.'));
export const testingPeekMessageHeaderBackground = registerColor('testing.messagePeekHeaderBackground', {
    dark: transparent(editorInfoForeground, 0.1),
    light: transparent(editorInfoForeground, 0.1),
    hcDark: null,
    hcLight: null
}, localize('testing.messagePeekHeaderBackground', 'Color of the peek view borders and arrow when peeking a logged message.'));
export const testingCoveredBackground = registerColor('testing.coveredBackground', {
    dark: diffInserted,
    light: diffInserted,
    hcDark: null,
    hcLight: null
}, localize('testing.coveredBackground', 'Background color of text that was covered.'));
export const testingCoveredBorder = registerColor('testing.coveredBorder', {
    dark: transparent(testingCoveredBackground, 0.75),
    light: transparent(testingCoveredBackground, 0.75),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.coveredBorder', 'Border color of text that was covered.'));
export const testingCoveredGutterBackground = registerColor('testing.coveredGutterBackground', {
    dark: transparent(diffInserted, 0.6),
    light: transparent(diffInserted, 0.6),
    hcDark: chartsGreen,
    hcLight: chartsGreen
}, localize('testing.coveredGutterBackground', 'Gutter color of regions where code was covered.'));
export const testingUncoveredBranchBackground = registerColor('testing.uncoveredBranchBackground', {
    dark: opaque(transparent(diffRemoved, 2), editorBackground),
    light: opaque(transparent(diffRemoved, 2), editorBackground),
    hcDark: null,
    hcLight: null
}, localize('testing.uncoveredBranchBackground', 'Background of the widget shown for an uncovered branch.'));
export const testingUncoveredBackground = registerColor('testing.uncoveredBackground', {
    dark: diffRemoved,
    light: diffRemoved,
    hcDark: null,
    hcLight: null
}, localize('testing.uncoveredBackground', 'Background color of text that was not covered.'));
export const testingUncoveredBorder = registerColor('testing.uncoveredBorder', {
    dark: transparent(testingUncoveredBackground, 0.75),
    light: transparent(testingUncoveredBackground, 0.75),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.uncoveredBorder', 'Border color of text that was not covered.'));
export const testingUncoveredGutterBackground = registerColor('testing.uncoveredGutterBackground', {
    dark: transparent(diffRemoved, 1.5),
    light: transparent(diffRemoved, 1.5),
    hcDark: chartsRed,
    hcLight: chartsRed
}, localize('testing.uncoveredGutterBackground', 'Gutter color of regions where code not covered.'));
export const testingCoverCountBadgeBackground = registerColor('testing.coverCountBadgeBackground', badgeBackground, localize('testing.coverCountBadgeBackground', 'Background for the badge indicating execution count'));
export const testingCoverCountBadgeForeground = registerColor('testing.coverCountBadgeForeground', badgeForeground, localize('testing.coverCountBadgeForeground', 'Foreground for the badge indicating execution count'));
const messageBadgeBackground = registerColor('testing.message.error.badgeBackground', activityErrorBadgeBackground, localize('testing.message.error.badgeBackground', 'Background color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.badgeBorder', messageBadgeBackground, localize('testing.message.error.badgeBorder', 'Border color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.badgeForeground', activityErrorBadgeForeground, localize('testing.message.error.badgeForeground', 'Text color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.lineBackground', null, localize('testing.message.error.marginBackground', 'Margin color beside error messages shown inline in the editor.'));
registerColor('testing.message.info.decorationForeground', transparent(editorForeground, 0.5), localize('testing.message.info.decorationForeground', 'Text color of test info messages shown inline in the editor.'));
registerColor('testing.message.info.lineBackground', null, localize('testing.message.info.marginBackground', 'Margin color beside info messages shown inline in the editor.'));
export const testStatesToIconColors = {
    [6 /* TestResultState.Errored */]: testingColorIconErrored,
    [4 /* TestResultState.Failed */]: testingColorIconFailed,
    [3 /* TestResultState.Passed */]: testingColorIconPassed,
    [1 /* TestResultState.Queued */]: testingColorIconQueued,
    [0 /* TestResultState.Unset */]: testingColorIconUnset,
    [5 /* TestResultState.Skipped */]: testingColorIconSkipped,
};
export const testingRetiredColorIconErrored = registerColor('testing.iconErrored.retired', transparent(testingColorIconErrored, 0.7), localize('testing.iconErrored.retired', "Retired color for the 'Errored' icon in the test explorer."));
export const testingRetiredColorIconFailed = registerColor('testing.iconFailed.retired', transparent(testingColorIconFailed, 0.7), localize('testing.iconFailed.retired', "Retired color for the 'failed' icon in the test explorer."));
export const testingRetiredColorIconPassed = registerColor('testing.iconPassed.retired', transparent(testingColorIconPassed, 0.7), localize('testing.iconPassed.retired', "Retired color for the 'passed' icon in the test explorer."));
export const testingRetiredColorIconQueued = registerColor('testing.iconQueued.retired', transparent(testingColorIconQueued, 0.7), localize('testing.iconQueued.retired', "Retired color for the 'Queued' icon in the test explorer."));
export const testingRetiredColorIconUnset = registerColor('testing.iconUnset.retired', transparent(testingColorIconUnset, 0.7), localize('testing.iconUnset.retired', "Retired color for the 'Unset' icon in the test explorer."));
export const testingRetiredColorIconSkipped = registerColor('testing.iconSkipped.retired', transparent(testingColorIconSkipped, 0.7), localize('testing.iconSkipped.retired', "Retired color for the 'Skipped' icon in the test explorer."));
export const testStatesToRetiredIconColors = {
    [6 /* TestResultState.Errored */]: testingRetiredColorIconErrored,
    [4 /* TestResultState.Failed */]: testingRetiredColorIconFailed,
    [3 /* TestResultState.Passed */]: testingRetiredColorIconPassed,
    [1 /* TestResultState.Queued */]: testingRetiredColorIconQueued,
    [0 /* TestResultState.Unset */]: testingRetiredColorIconUnset,
    [5 /* TestResultState.Skipped */]: testingRetiredColorIconSkipped,
};
registerThemingParticipant((theme, collector) => {
    const editorBg = theme.getColor(editorBackground);
    collector.addRule(`
	.coverage-deco-inline.coverage-deco-hit.coverage-deco-hovered {
		background: ${theme.getColor(testingCoveredBackground)?.transparent(1.3)};
		outline-color: ${theme.getColor(testingCoveredBorder)?.transparent(2)};
	}
	.coverage-deco-inline.coverage-deco-miss.coverage-deco-hovered {
		background: ${theme.getColor(testingUncoveredBackground)?.transparent(1.3)};
		outline-color: ${theme.getColor(testingUncoveredBorder)?.transparent(2)};
	}
		`);
    if (editorBg) {
        const missBadgeBackground = theme.getColor(testingUncoveredBackground)?.transparent(2).makeOpaque(editorBg);
        const errorBadgeBackground = theme.getColor(messageBadgeBackground)?.makeOpaque(editorBg);
        collector.addRule(`
			.coverage-deco-branch-miss-indicator::before {
				border-color: ${missBadgeBackground?.transparent(1.3)};
				background-color: ${missBadgeBackground};
			}
			.monaco-workbench .test-error-content-widget .inner{
				background: ${errorBadgeBackground};
			}
			.monaco-workbench .test-error-content-widget .inner .arrow svg {
				fill: ${errorBadgeBackground};
			}
		`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGhlbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxVixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUcvRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxhQUFhLENBQUMsb0JBQW9CLEVBQUU7SUFDekUsSUFBSSxFQUFFLFNBQVM7SUFDZixLQUFLLEVBQUUsU0FBUztJQUNoQixNQUFNLEVBQUUsU0FBUztJQUNqQixPQUFPLEVBQUUsU0FBUztDQUNsQixFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxtREFBbUQsQ0FBQyxDQUFDLENBQUM7QUFFeEYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLHFCQUFxQixFQUFFO0lBQzNFLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsb0RBQW9ELENBQUMsQ0FBQyxDQUFDO0FBRTFGLE1BQU0sQ0FB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