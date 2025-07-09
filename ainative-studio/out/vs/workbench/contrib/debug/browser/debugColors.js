/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerColor, foreground, editorInfoForeground, editorWarningForeground, errorForeground, badgeBackground, badgeForeground, listDeemphasizedForeground, contrastBorder, inputBorder, toolbarHoverBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Color } from '../../../../base/common/color.js';
import { localize } from '../../../../nls.js';
import * as icons from './debugIcons.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
export const debugToolBarBackground = registerColor('debugToolBar.background', {
    dark: '#333333',
    light: '#F3F3F3',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize('debugToolBarBackground', "Debug toolbar background color."));
export const debugToolBarBorder = registerColor('debugToolBar.border', null, localize('debugToolBarBorder', "Debug toolbar border color."));
export const debugIconStartForeground = registerColor('debugIcon.startForeground', {
    dark: '#89D185',
    light: '#388A34',
    hcDark: '#89D185',
    hcLight: '#388A34'
}, localize('debugIcon.startForeground', "Debug toolbar icon for start debugging."));
export function registerColors() {
    const debugTokenExpressionName = registerColor('debugTokenExpression.name', { dark: '#c586c0', light: '#9b46b0', hcDark: foreground, hcLight: foreground }, 'Foreground color for the token names shown in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionType = registerColor('debugTokenExpression.type', { dark: '#4A90E2', light: '#4A90E2', hcDark: foreground, hcLight: foreground }, 'Foreground color for the token types shown in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionValue = registerColor('debugTokenExpression.value', { dark: '#cccccc99', light: '#6c6c6ccc', hcDark: foreground, hcLight: foreground }, 'Foreground color for the token values shown in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionString = registerColor('debugTokenExpression.string', { dark: '#ce9178', light: '#a31515', hcDark: '#f48771', hcLight: '#a31515' }, 'Foreground color for strings in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionBoolean = registerColor('debugTokenExpression.boolean', { dark: '#4e94ce', light: '#0000ff', hcDark: '#75bdfe', hcLight: '#0000ff' }, 'Foreground color for booleans in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionNumber = registerColor('debugTokenExpression.number', { dark: '#b5cea8', light: '#098658', hcDark: '#89d185', hcLight: '#098658' }, 'Foreground color for numbers in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionError = registerColor('debugTokenExpression.error', { dark: '#f48771', light: '#e51400', hcDark: '#f48771', hcLight: '#e51400' }, 'Foreground color for expression errors in the debug views (ie. the Variables or Watch view) and for error logs shown in the debug console.');
    const debugViewExceptionLabelForeground = registerColor('debugView.exceptionLabelForeground', { dark: foreground, light: '#FFF', hcDark: foreground, hcLight: foreground }, 'Foreground color for a label shown in the CALL STACK view when the debugger breaks on an exception.');
    const debugViewExceptionLabelBackground = registerColor('debugView.exceptionLabelBackground', { dark: '#6C2022', light: '#A31515', hcDark: '#6C2022', hcLight: '#A31515' }, 'Background color for a label shown in the CALL STACK view when the debugger breaks on an exception.');
    const debugViewStateLabelForeground = registerColor('debugView.stateLabelForeground', foreground, 'Foreground color for a label in the CALL STACK view showing the current session\'s or thread\'s state.');
    const debugViewStateLabelBackground = registerColor('debugView.stateLabelBackground', '#88888844', 'Background color for a label in the CALL STACK view showing the current session\'s or thread\'s state.');
    const debugViewValueChangedHighlight = registerColor('debugView.valueChangedHighlight', '#569CD6', 'Color used to highlight value changes in the debug views (ie. in the Variables view).');
    const debugConsoleInfoForeground = registerColor('debugConsole.infoForeground', { dark: editorInfoForeground, light: editorInfoForeground, hcDark: foreground, hcLight: foreground }, 'Foreground color for info messages in debug REPL console.');
    const debugConsoleWarningForeground = registerColor('debugConsole.warningForeground', { dark: editorWarningForeground, light: editorWarningForeground, hcDark: '#008000', hcLight: editorWarningForeground }, 'Foreground color for warning messages in debug REPL console.');
    const debugConsoleErrorForeground = registerColor('debugConsole.errorForeground', errorForeground, 'Foreground color for error messages in debug REPL console.');
    const debugConsoleSourceForeground = registerColor('debugConsole.sourceForeground', foreground, 'Foreground color for source filenames in debug REPL console.');
    const debugConsoleInputIconForeground = registerColor('debugConsoleInputIcon.foreground', foreground, 'Foreground color for debug console input marker icon.');
    const debugIconPauseForeground = registerColor('debugIcon.pauseForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC'
    }, localize('debugIcon.pauseForeground', "Debug toolbar icon for pause."));
    const debugIconStopForeground = registerColor('debugIcon.stopForeground', {
        dark: '#F48771',
        light: '#A1260D',
        hcDark: '#F48771',
        hcLight: '#A1260D'
    }, localize('debugIcon.stopForeground', "Debug toolbar icon for stop."));
    const debugIconDisconnectForeground = registerColor('debugIcon.disconnectForeground', {
        dark: '#F48771',
        light: '#A1260D',
        hcDark: '#F48771',
        hcLight: '#A1260D'
    }, localize('debugIcon.disconnectForeground', "Debug toolbar icon for disconnect."));
    const debugIconRestartForeground = registerColor('debugIcon.restartForeground', {
        dark: '#89D185',
        light: '#388A34',
        hcDark: '#89D185',
        hcLight: '#388A34'
    }, localize('debugIcon.restartForeground', "Debug toolbar icon for restart."));
    const debugIconStepOverForeground = registerColor('debugIcon.stepOverForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC'
    }, localize('debugIcon.stepOverForeground', "Debug toolbar icon for step over."));
    const debugIconStepIntoForeground = registerColor('debugIcon.stepIntoForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC'
    }, localize('debugIcon.stepIntoForeground', "Debug toolbar icon for step into."));
    const debugIconStepOutForeground = registerColor('debugIcon.stepOutForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC'
    }, localize('debugIcon.stepOutForeground', "Debug toolbar icon for step over."));
    const debugIconContinueForeground = registerColor('debugIcon.continueForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC'
    }, localize('debugIcon.continueForeground', "Debug toolbar icon for continue."));
    const debugIconStepBackForeground = registerColor('debugIcon.stepBackForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC'
    }, localize('debugIcon.stepBackForeground', "Debug toolbar icon for step back."));
    registerThemingParticipant((theme, collector) => {
        // All these colours provide a default value so they will never be undefined, hence the `!`
        const badgeBackgroundColor = theme.getColor(badgeBackground);
        const badgeForegroundColor = theme.getColor(badgeForeground);
        const listDeemphasizedForegroundColor = theme.getColor(listDeemphasizedForeground);
        const debugViewExceptionLabelForegroundColor = theme.getColor(debugViewExceptionLabelForeground);
        const debugViewExceptionLabelBackgroundColor = theme.getColor(debugViewExceptionLabelBackground);
        const debugViewStateLabelForegroundColor = theme.getColor(debugViewStateLabelForeground);
        const debugViewStateLabelBackgroundColor = theme.getColor(debugViewStateLabelBackground);
        const debugViewValueChangedHighlightColor = theme.getColor(debugViewValueChangedHighlight);
        const toolbarHoverBackgroundColor = theme.getColor(toolbarHoverBackground);
        collector.addRule(`
			/* Text colour of the call stack row's filename */
			.debug-pane .debug-call-stack .monaco-list-row:not(.selected) .stack-frame > .file .file-name {
				color: ${listDeemphasizedForegroundColor}
			}

			/* Line & column number "badge" for selected call stack row */
			.debug-pane .monaco-list-row.selected .line-number {
				background-color: ${badgeBackgroundColor};
				color: ${badgeForegroundColor};
			}

			/* Line & column number "badge" for unselected call stack row (basically all other rows) */
			.debug-pane .line-number {
				background-color: ${badgeBackgroundColor.transparent(0.6)};
				color: ${badgeForegroundColor.transparent(0.6)};
			}

			/* State "badge" displaying the active session's current state.
			* Only visible when there are more active debug sessions/threads running.
			*/
			.debug-pane .debug-call-stack .thread > .state.label,
			.debug-pane .debug-call-stack .session > .state.label {
				background-color: ${debugViewStateLabelBackgroundColor};
				color: ${debugViewStateLabelForegroundColor};
			}

			/* State "badge" displaying the active session's current state.
			* Only visible when there are more active debug sessions/threads running
			* and thread paused due to a thrown exception.
			*/
			.debug-pane .debug-call-stack .thread > .state.label.exception,
			.debug-pane .debug-call-stack .session > .state.label.exception {
				background-color: ${debugViewExceptionLabelBackgroundColor};
				color: ${debugViewExceptionLabelForegroundColor};
			}

			/* Info "badge" shown when the debugger pauses due to a thrown exception. */
			.debug-pane .call-stack-state-message > .label.exception {
				background-color: ${debugViewExceptionLabelBackgroundColor};
				color: ${debugViewExceptionLabelForegroundColor};
			}

			/* Animation of changed values in Debug viewlet */
			@keyframes debugViewletValueChanged {
				0%   { background-color: ${debugViewValueChangedHighlightColor.transparent(0)} }
				5%   { background-color: ${debugViewValueChangedHighlightColor.transparent(0.9)} }
				100% { background-color: ${debugViewValueChangedHighlightColor.transparent(0.3)} }
			}

			.debug-pane .monaco-list-row .expression .value.changed {
				background-color: ${debugViewValueChangedHighlightColor.transparent(0.3)};
				animation-name: debugViewletValueChanged;
				animation-duration: 1s;
				animation-fill-mode: forwards;
			}

			.monaco-list-row .expression .lazy-button:hover {
				background-color: ${toolbarHoverBackgroundColor}
			}
		`);
        const contrastBorderColor = theme.getColor(contrastBorder);
        if (contrastBorderColor) {
            collector.addRule(`
			.debug-pane .line-number {
				border: 1px solid ${contrastBorderColor};
			}
			`);
        }
        // Use fully-opaque colors for line-number badges
        if (isHighContrast(theme.type)) {
            collector.addRule(`
			.debug-pane .line-number {
				background-color: ${badgeBackgroundColor};
				color: ${badgeForegroundColor};
			}`);
        }
        const tokenNameColor = theme.getColor(debugTokenExpressionName);
        const tokenTypeColor = theme.getColor(debugTokenExpressionType);
        const tokenValueColor = theme.getColor(debugTokenExpressionValue);
        const tokenStringColor = theme.getColor(debugTokenExpressionString);
        const tokenBooleanColor = theme.getColor(debugTokenExpressionBoolean);
        const tokenErrorColor = theme.getColor(debugTokenExpressionError);
        const tokenNumberColor = theme.getColor(debugTokenExpressionNumber);
        collector.addRule(`
			.monaco-workbench .monaco-list-row .expression .name {
				color: ${tokenNameColor};
			}

			.monaco-workbench .monaco-list-row .expression .type {
				color: ${tokenTypeColor};
			}

			.monaco-workbench .monaco-list-row .expression .value,
			.monaco-workbench .debug-hover-widget .value {
				color: ${tokenValueColor};
			}

			.monaco-workbench .monaco-list-row .expression .value.string,
			.monaco-workbench .debug-hover-widget .value.string {
				color: ${tokenStringColor};
			}

			.monaco-workbench .monaco-list-row .expression .value.boolean,
			.monaco-workbench .debug-hover-widget .value.boolean {
				color: ${tokenBooleanColor};
			}

			.monaco-workbench .monaco-list-row .expression .error,
			.monaco-workbench .debug-hover-widget .error,
			.monaco-workbench .debug-pane .debug-variables .scope .error {
				color: ${tokenErrorColor};
			}

			.monaco-workbench .monaco-list-row .expression .value.number,
			.monaco-workbench .debug-hover-widget .value.number {
				color: ${tokenNumberColor};
			}
		`);
        const debugConsoleInputBorderColor = theme.getColor(inputBorder) || Color.fromHex('#80808060');
        const debugConsoleInfoForegroundColor = theme.getColor(debugConsoleInfoForeground);
        const debugConsoleWarningForegroundColor = theme.getColor(debugConsoleWarningForeground);
        const debugConsoleErrorForegroundColor = theme.getColor(debugConsoleErrorForeground);
        const debugConsoleSourceForegroundColor = theme.getColor(debugConsoleSourceForeground);
        const debugConsoleInputIconForegroundColor = theme.getColor(debugConsoleInputIconForeground);
        collector.addRule(`
			.repl .repl-input-wrapper {
				border-top: 1px solid ${debugConsoleInputBorderColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .value.info {
				color: ${debugConsoleInfoForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .value.warn {
				color: ${debugConsoleWarningForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .value.error {
				color: ${debugConsoleErrorForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .source {
				color: ${debugConsoleSourceForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .monaco-tl-contents .arrow {
				color: ${debugConsoleInputIconForegroundColor};
			}
		`);
        if (!theme.defines(debugConsoleInputIconForeground)) {
            collector.addRule(`
				.monaco-workbench.vs .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 0.25;
				}

				.monaco-workbench.vs-dark .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 0.4;
				}

				.monaco-workbench.hc-black .repl .repl-tree .monaco-tl-contents .arrow,
				.monaco-workbench.hc-light .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 1;
				}
			`);
        }
        const debugIconStartColor = theme.getColor(debugIconStartForeground);
        if (debugIconStartColor) {
            collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStart)} { color: ${debugIconStartColor}; }`);
        }
        const debugIconPauseColor = theme.getColor(debugIconPauseForeground);
        if (debugIconPauseColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugPause)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugPause)} { color: ${debugIconPauseColor}; }`);
        }
        const debugIconStopColor = theme.getColor(debugIconStopForeground);
        if (debugIconStopColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStop)},.monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStop)} { color: ${debugIconStopColor}; }`);
        }
        const debugIconDisconnectColor = theme.getColor(debugIconDisconnectForeground);
        if (debugIconDisconnectColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugDisconnect)},.monaco-workbench .debug-view-content ${ThemeIcon.asCSSSelector(icons.debugDisconnect)}, .monaco-workbench .debug-toolbar ${ThemeIcon.asCSSSelector(icons.debugDisconnect)}, .monaco-workbench .command-center-center ${ThemeIcon.asCSSSelector(icons.debugDisconnect)} { color: ${debugIconDisconnectColor}; }`);
        }
        const debugIconRestartColor = theme.getColor(debugIconRestartForeground);
        if (debugIconRestartColor) {
            collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugRestart)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugRestartFrame)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugRestart)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugRestartFrame)} { color: ${debugIconRestartColor}; }`);
        }
        const debugIconStepOverColor = theme.getColor(debugIconStepOverForeground);
        if (debugIconStepOverColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepOver)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepOver)} { color: ${debugIconStepOverColor}; }`);
        }
        const debugIconStepIntoColor = theme.getColor(debugIconStepIntoForeground);
        if (debugIconStepIntoColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepInto)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepInto)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepInto)} { color: ${debugIconStepIntoColor}; }`);
        }
        const debugIconStepOutColor = theme.getColor(debugIconStepOutForeground);
        if (debugIconStepOutColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepOut)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepOut)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepOut)} { color: ${debugIconStepOutColor}; }`);
        }
        const debugIconContinueColor = theme.getColor(debugIconContinueForeground);
        if (debugIconContinueColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugContinue)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugContinue)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugReverseContinue)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugReverseContinue)} { color: ${debugIconContinueColor}; }`);
        }
        const debugIconStepBackColor = theme.getColor(debugIconStepBackForeground);
        if (debugIconStepBackColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepBack)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepBack)} { color: ${debugIconStepBackColor}; }`);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb2xvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0NvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSx1QkFBdUIsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSwwQkFBMEIsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbFIsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxLQUFLLEtBQUssTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFNUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsYUFBYSxDQUFDLHlCQUF5QixFQUFFO0lBQzlFLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUFDO0FBRTFFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixF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