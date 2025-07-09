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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3RoZW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsNEJBQTRCLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMVYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHL0YsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsYUFBYSxDQUFDLG9CQUFvQixFQUFFO0lBQ3pFLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsbURBQW1ELENBQUMsQ0FBQyxDQUFDO0FBRXhGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRTtJQUMzRSxJQUFJLEVBQUUsU0FBUztJQUNmLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG9EQUFvRCxDQUFDLENBQUMsQ0FBQztBQUUxRixNQUFNLENB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