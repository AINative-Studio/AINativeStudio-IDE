/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { isSafari } from '../../../../base/browser/browser.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { memoize } from '../../../../base/common/decorators.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { dispose, disposeIfDisposable } from '../../../../base/common/lifecycle.js';
import * as env from '../../../../base/common/platform.js';
import severity from '../../../../base/common/severity.js';
import { noBreakWhitespace } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { GlyphMarginLane, OverviewRulerLane } from '../../../../editor/common/model.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant, themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { GutterActionsRegistry } from '../../codeEditor/browser/editorLineNumberMenu.js';
import { getBreakpointMessageAndIcon } from './breakpointsView.js';
import { BreakpointWidget } from './breakpointWidget.js';
import * as icons from './debugIcons.js';
import { BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, DebuggerString, IDebugService } from '../common/debug.js';
const $ = dom.$;
const breakpointHelperDecoration = {
    description: 'breakpoint-helper-decoration',
    glyphMarginClassName: ThemeIcon.asClassName(icons.debugBreakpointHint),
    glyphMargin: { position: GlyphMarginLane.Right },
    glyphMarginHoverMessage: new MarkdownString().appendText(nls.localize('breakpointHelper', "Click to add a breakpoint")),
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
};
export function createBreakpointDecorations(accessor, model, breakpoints, state, breakpointsActivated, showBreakpointsInOverviewRuler) {
    const result = [];
    breakpoints.forEach((breakpoint) => {
        if (breakpoint.lineNumber > model.getLineCount()) {
            return;
        }
        const hasOtherBreakpointsOnLine = breakpoints.some(bp => bp !== breakpoint && bp.lineNumber === breakpoint.lineNumber);
        const column = model.getLineFirstNonWhitespaceColumn(breakpoint.lineNumber);
        const range = model.validateRange(breakpoint.column ? new Range(breakpoint.lineNumber, breakpoint.column, breakpoint.lineNumber, breakpoint.column + 1)
            : new Range(breakpoint.lineNumber, column, breakpoint.lineNumber, column + 1) // Decoration has to have a width #20688
        );
        result.push({
            options: getBreakpointDecorationOptions(accessor, model, breakpoint, state, breakpointsActivated, showBreakpointsInOverviewRuler, hasOtherBreakpointsOnLine),
            range
        });
    });
    return result;
}
function getBreakpointDecorationOptions(accessor, model, breakpoint, state, breakpointsActivated, showBreakpointsInOverviewRuler, hasOtherBreakpointsOnLine) {
    const debugService = accessor.get(IDebugService);
    const languageService = accessor.get(ILanguageService);
    const labelService = accessor.get(ILabelService);
    const { icon, message, showAdapterUnverifiedMessage } = getBreakpointMessageAndIcon(state, breakpointsActivated, breakpoint, labelService, debugService.getModel());
    let glyphMarginHoverMessage;
    let unverifiedMessage;
    if (showAdapterUnverifiedMessage) {
        let langId;
        unverifiedMessage = debugService.getModel().getSessions().map(s => {
            const dbg = debugService.getAdapterManager().getDebugger(s.configuration.type);
            const message = dbg?.strings?.[DebuggerString.UnverifiedBreakpoints];
            if (message) {
                if (!langId) {
                    // Lazily compute this, only if needed for some debug adapter
                    langId = languageService.guessLanguageIdByFilepathOrFirstLine(breakpoint.uri) ?? undefined;
                }
                return langId && dbg.interestedInLanguage(langId) ? message : undefined;
            }
            return undefined;
        })
            .find(messages => !!messages);
    }
    if (message) {
        glyphMarginHoverMessage = new MarkdownString(undefined, { isTrusted: true, supportThemeIcons: true });
        if (breakpoint.condition || breakpoint.hitCondition) {
            const languageId = model.getLanguageId();
            glyphMarginHoverMessage.appendCodeblock(languageId, message);
            if (unverifiedMessage) {
                glyphMarginHoverMessage.appendMarkdown('$(warning) ' + unverifiedMessage);
            }
        }
        else {
            glyphMarginHoverMessage.appendText(message);
            if (unverifiedMessage) {
                glyphMarginHoverMessage.appendMarkdown('\n\n$(warning) ' + unverifiedMessage);
            }
        }
    }
    else if (unverifiedMessage) {
        glyphMarginHoverMessage = new MarkdownString(undefined, { isTrusted: true, supportThemeIcons: true }).appendMarkdown(unverifiedMessage);
    }
    let overviewRulerDecoration = null;
    if (showBreakpointsInOverviewRuler) {
        overviewRulerDecoration = {
            color: themeColorFromId(debugIconBreakpointForeground),
            position: OverviewRulerLane.Left
        };
    }
    const renderInline = breakpoint.column && (hasOtherBreakpointsOnLine || breakpoint.column > model.getLineFirstNonWhitespaceColumn(breakpoint.lineNumber));
    return {
        description: 'breakpoint-decoration',
        glyphMargin: { position: GlyphMarginLane.Right },
        glyphMarginClassName: ThemeIcon.asClassName(icon),
        glyphMarginHoverMessage,
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        before: renderInline ? {
            content: noBreakWhitespace,
            inlineClassName: `debug-breakpoint-placeholder`,
            inlineClassNameAffectsLetterSpacing: true
        } : undefined,
        overviewRuler: overviewRulerDecoration,
        zIndex: 9999
    };
}
async function requestBreakpointCandidateLocations(model, lineNumbers, session) {
    if (!session.capabilities.supportsBreakpointLocationsRequest) {
        return [];
    }
    return await Promise.all(distinct(lineNumbers, l => l).map(async (lineNumber) => {
        try {
            return { lineNumber, positions: await session.breakpointsLocations(model.uri, lineNumber) };
        }
        catch {
            return { lineNumber, positions: [] };
        }
    }));
}
function createCandidateDecorations(model, breakpointDecorations, lineBreakpoints) {
    const result = [];
    for (const { positions, lineNumber } of lineBreakpoints) {
        if (positions.length === 0) {
            continue;
        }
        // Do not render candidates if there is only one, since it is already covered by the line breakpoint
        const firstColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        const lastColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
        positions.forEach(p => {
            const range = new Range(p.lineNumber, p.column, p.lineNumber, p.column + 1);
            if ((p.column <= firstColumn && !breakpointDecorations.some(bp => bp.range.startColumn > firstColumn && bp.range.startLineNumber === p.lineNumber)) || p.column > lastColumn) {
                // Do not render candidates on the start of the line if there's no other breakpoint on the line.
                return;
            }
            const breakpointAtPosition = breakpointDecorations.find(bpd => bpd.range.equalsRange(range));
            if (breakpointAtPosition && breakpointAtPosition.inlineWidget) {
                // Space already occupied, do not render candidate.
                return;
            }
            result.push({
                range,
                options: {
                    description: 'breakpoint-placeholder-decoration',
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                    before: breakpointAtPosition ? undefined : {
                        content: noBreakWhitespace,
                        inlineClassName: `debug-breakpoint-placeholder`,
                        inlineClassNameAffectsLetterSpacing: true
                    },
                },
                breakpoint: breakpointAtPosition ? breakpointAtPosition.breakpoint : undefined
            });
        });
    }
    return result;
}
let BreakpointEditorContribution = class BreakpointEditorContribution {
    constructor(editor, debugService, contextMenuService, instantiationService, contextKeyService, dialogService, configurationService, labelService) {
        this.editor = editor;
        this.debugService = debugService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.labelService = labelService;
        this.breakpointHintDecoration = null;
        this.toDispose = [];
        this.ignoreDecorationsChangedEvent = false;
        this.ignoreBreakpointsChangeEvent = false;
        this.breakpointDecorations = [];
        this.candidateDecorations = [];
        this.breakpointWidgetVisible = CONTEXT_BREAKPOINT_WIDGET_VISIBLE.bindTo(contextKeyService);
        this.setDecorationsScheduler = new RunOnceScheduler(() => this.setDecorations(), 30);
        this.setDecorationsScheduler.schedule();
        this.registerListeners();
    }
    /**
     * Returns context menu actions at the line number if breakpoints can be
     * set. This is used by the {@link TestingDecorations} to allow breakpoint
     * setting on lines where breakpoint "run" actions are present.
     */
    getContextMenuActionsAtPosition(lineNumber, model) {
        if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
            return [];
        }
        if (!this.debugService.canSetBreakpointsIn(model)) {
            return [];
        }
        const breakpoints = this.debugService.getModel().getBreakpoints({ lineNumber, uri: model.uri });
        return this.getContextMenuActions(breakpoints, model.uri, lineNumber);
    }
    registerListeners() {
        this.toDispose.push(this.editor.onMouseDown(async (e) => {
            if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
                return;
            }
            const model = this.editor.getModel();
            if (!e.target.position
                || !model
                || e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */
                || e.target.detail.isAfterLines
                || !this.marginFreeFromNonDebugDecorations(e.target.position.lineNumber)
                    // don't return early if there's a breakpoint
                    && !e.target.element?.className.includes('breakpoint')) {
                return;
            }
            const canSetBreakpoints = this.debugService.canSetBreakpointsIn(model);
            const lineNumber = e.target.position.lineNumber;
            const uri = model.uri;
            if (e.event.rightButton || (env.isMacintosh && e.event.leftButton && e.event.ctrlKey)) {
                // handled by editor gutter context menu
                return;
            }
            else {
                const breakpoints = this.debugService.getModel().getBreakpoints({ uri, lineNumber });
                if (breakpoints.length) {
                    const isShiftPressed = e.event.shiftKey;
                    const enabled = breakpoints.some(bp => bp.enabled);
                    if (isShiftPressed) {
                        breakpoints.forEach(bp => this.debugService.enableOrDisableBreakpoints(!enabled, bp));
                    }
                    else if (!env.isLinux && breakpoints.some(bp => !!bp.condition || !!bp.logMessage || !!bp.hitCondition || !!bp.triggeredBy)) {
                        // Show the dialog if there is a potential condition to be accidently lost.
                        // Do not show dialog on linux due to electron issue freezing the mouse #50026
                        const logPoint = breakpoints.every(bp => !!bp.logMessage);
                        const breakpointType = logPoint ? nls.localize('logPoint', "Logpoint") : nls.localize('breakpoint', "Breakpoint");
                        const disabledBreakpointDialogMessage = nls.localize('breakpointHasConditionDisabled', "This {0} has a {1} that will get lost on remove. Consider enabling the {0} instead.", breakpointType.toLowerCase(), logPoint ? nls.localize('message', "message") : nls.localize('condition', "condition"));
                        const enabledBreakpointDialogMessage = nls.localize('breakpointHasConditionEnabled', "This {0} has a {1} that will get lost on remove. Consider disabling the {0} instead.", breakpointType.toLowerCase(), logPoint ? nls.localize('message', "message") : nls.localize('condition', "condition"));
                        await this.dialogService.prompt({
                            type: severity.Info,
                            message: enabled ? enabledBreakpointDialogMessage : disabledBreakpointDialogMessage,
                            buttons: [
                                {
                                    label: nls.localize({ key: 'removeLogPoint', comment: ['&& denotes a mnemonic'] }, "&&Remove {0}", breakpointType),
                                    run: () => breakpoints.forEach(bp => this.debugService.removeBreakpoints(bp.getId()))
                                },
                                {
                                    label: nls.localize('disableLogPoint', "{0} {1}", enabled ? nls.localize({ key: 'disable', comment: ['&& denotes a mnemonic'] }, "&&Disable") : nls.localize({ key: 'enable', comment: ['&& denotes a mnemonic'] }, "&&Enable"), breakpointType),
                                    run: () => breakpoints.forEach(bp => this.debugService.enableOrDisableBreakpoints(!enabled, bp))
                                }
                            ],
                            cancelButton: true
                        });
                    }
                    else {
                        if (!enabled) {
                            breakpoints.forEach(bp => this.debugService.enableOrDisableBreakpoints(!enabled, bp));
                        }
                        else {
                            breakpoints.forEach(bp => this.debugService.removeBreakpoints(bp.getId()));
                        }
                    }
                }
                else if (canSetBreakpoints) {
                    if (e.event.middleButton) {
                        const action = this.configurationService.getValue('debug').gutterMiddleClickAction;
                        if (action !== 'none') {
                            let context;
                            switch (action) {
                                case 'logpoint':
                                    context = 2 /* BreakpointWidgetContext.LOG_MESSAGE */;
                                    break;
                                case 'conditionalBreakpoint':
                                    context = 0 /* BreakpointWidgetContext.CONDITION */;
                                    break;
                                case 'triggeredBreakpoint':
                                    context = 3 /* BreakpointWidgetContext.TRIGGER_POINT */;
                            }
                            this.showBreakpointWidget(lineNumber, undefined, context);
                        }
                    }
                    else {
                        this.debugService.addBreakpoints(uri, [{ lineNumber }]);
                    }
                }
            }
        }));
        if (!(BrowserFeatures.pointerEvents && isSafari)) {
            /**
             * We disable the hover feature for Safari on iOS as
             * 1. Browser hover events are handled specially by the system (it treats first click as hover if there is `:hover` css registered). Below hover behavior will confuse users with inconsistent expeirence.
             * 2. When users click on line numbers, the breakpoint hint displays immediately, however it doesn't create the breakpoint unless users click on the left gutter. On a touch screen, it's hard to click on that small area.
             */
            this.toDispose.push(this.editor.onMouseMove((e) => {
                if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
                    return;
                }
                let showBreakpointHintAtLineNumber = -1;
                const model = this.editor.getModel();
                if (model && e.target.position && (e.target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ || e.target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) && this.debugService.canSetBreakpointsIn(model) &&
                    this.marginFreeFromNonDebugDecorations(e.target.position.lineNumber)) {
                    const data = e.target.detail;
                    if (!data.isAfterLines) {
                        showBreakpointHintAtLineNumber = e.target.position.lineNumber;
                    }
                }
                this.ensureBreakpointHintDecoration(showBreakpointHintAtLineNumber);
            }));
            this.toDispose.push(this.editor.onMouseLeave(() => {
                this.ensureBreakpointHintDecoration(-1);
            }));
        }
        this.toDispose.push(this.editor.onDidChangeModel(async () => {
            this.closeBreakpointWidget();
            await this.setDecorations();
        }));
        this.toDispose.push(this.debugService.getModel().onDidChangeBreakpoints(() => {
            if (!this.ignoreBreakpointsChangeEvent && !this.setDecorationsScheduler.isScheduled()) {
                this.setDecorationsScheduler.schedule();
            }
        }));
        this.toDispose.push(this.debugService.onDidChangeState(() => {
            // We need to update breakpoint decorations when state changes since the top stack frame and breakpoint decoration might change
            if (!this.setDecorationsScheduler.isScheduled()) {
                this.setDecorationsScheduler.schedule();
            }
        }));
        this.toDispose.push(this.editor.onDidChangeModelDecorations(() => this.onModelDecorationsChanged()));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('debug.showBreakpointsInOverviewRuler') || e.affectsConfiguration('debug.showInlineBreakpointCandidates')) {
                await this.setDecorations();
            }
        }));
    }
    getContextMenuActions(breakpoints, uri, lineNumber, column) {
        const actions = [];
        if (breakpoints.length === 1) {
            const breakpointType = breakpoints[0].logMessage ? nls.localize('logPoint', "Logpoint") : nls.localize('breakpoint', "Breakpoint");
            actions.push(new Action('debug.removeBreakpoint', nls.localize('removeBreakpoint', "Remove {0}", breakpointType), undefined, true, async () => {
                await this.debugService.removeBreakpoints(breakpoints[0].getId());
            }));
            actions.push(new Action('workbench.debug.action.editBreakpointAction', nls.localize('editBreakpoint', "Edit {0}...", breakpointType), undefined, true, () => Promise.resolve(this.showBreakpointWidget(breakpoints[0].lineNumber, breakpoints[0].column))));
            actions.push(new Action(`workbench.debug.viewlet.action.toggleBreakpoint`, breakpoints[0].enabled ? nls.localize('disableBreakpoint', "Disable {0}", breakpointType) : nls.localize('enableBreakpoint', "Enable {0}", breakpointType), undefined, true, () => this.debugService.enableOrDisableBreakpoints(!breakpoints[0].enabled, breakpoints[0])));
        }
        else if (breakpoints.length > 1) {
            const sorted = breakpoints.slice().sort((first, second) => (first.column && second.column) ? first.column - second.column : 1);
            actions.push(new SubmenuAction('debug.removeBreakpoints', nls.localize('removeBreakpoints', "Remove Breakpoints"), sorted.map(bp => new Action('removeInlineBreakpoint', bp.column ? nls.localize('removeInlineBreakpointOnColumn', "Remove Inline Breakpoint on Column {0}", bp.column) : nls.localize('removeLineBreakpoint', "Remove Line Breakpoint"), undefined, true, () => this.debugService.removeBreakpoints(bp.getId())))));
            actions.push(new SubmenuAction('debug.editBreakpoints', nls.localize('editBreakpoints', "Edit Breakpoints"), sorted.map(bp => new Action('editBreakpoint', bp.column ? nls.localize('editInlineBreakpointOnColumn', "Edit Inline Breakpoint on Column {0}", bp.column) : nls.localize('editLineBreakpoint', "Edit Line Breakpoint"), undefined, true, () => Promise.resolve(this.showBreakpointWidget(bp.lineNumber, bp.column))))));
            actions.push(new SubmenuAction('debug.enableDisableBreakpoints', nls.localize('enableDisableBreakpoints', "Enable/Disable Breakpoints"), sorted.map(bp => new Action(bp.enabled ? 'disableColumnBreakpoint' : 'enableColumnBreakpoint', bp.enabled ? (bp.column ? nls.localize('disableInlineColumnBreakpoint', "Disable Inline Breakpoint on Column {0}", bp.column) : nls.localize('disableBreakpointOnLine', "Disable Line Breakpoint"))
                : (bp.column ? nls.localize('enableBreakpoints', "Enable Inline Breakpoint on Column {0}", bp.column) : nls.localize('enableBreakpointOnLine', "Enable Line Breakpoint")), undefined, true, () => this.debugService.enableOrDisableBreakpoints(!bp.enabled, bp)))));
        }
        else {
            actions.push(new Action('addBreakpoint', nls.localize('addBreakpoint', "Add Breakpoint"), undefined, true, () => this.debugService.addBreakpoints(uri, [{ lineNumber, column }])));
            actions.push(new Action('addConditionalBreakpoint', nls.localize('addConditionalBreakpoint', "Add Conditional Breakpoint..."), undefined, true, () => Promise.resolve(this.showBreakpointWidget(lineNumber, column, 0 /* BreakpointWidgetContext.CONDITION */))));
            actions.push(new Action('addLogPoint', nls.localize('addLogPoint', "Add Logpoint..."), undefined, true, () => Promise.resolve(this.showBreakpointWidget(lineNumber, column, 2 /* BreakpointWidgetContext.LOG_MESSAGE */))));
            actions.push(new Action('addTriggeredBreakpoint', nls.localize('addTriggeredBreakpoint', "Add Triggered Breakpoint..."), undefined, true, () => Promise.resolve(this.showBreakpointWidget(lineNumber, column, 3 /* BreakpointWidgetContext.TRIGGER_POINT */))));
        }
        if (this.debugService.state === 2 /* State.Stopped */) {
            actions.push(new Separator());
            actions.push(new Action('runToLine', nls.localize('runToLine', "Run to Line"), undefined, true, () => this.debugService.runTo(uri, lineNumber).catch(onUnexpectedError)));
        }
        return actions;
    }
    marginFreeFromNonDebugDecorations(line) {
        const decorations = this.editor.getLineDecorations(line);
        if (decorations) {
            for (const { options } of decorations) {
                const clz = options.glyphMarginClassName;
                if (!clz) {
                    continue;
                }
                const hasSomeActionableCodicon = !(clz.includes('codicon-') || clz.startsWith('coverage-deco-')) || clz.includes('codicon-testing-') || clz.includes('codicon-merge-') || clz.includes('codicon-arrow-') || clz.includes('codicon-loading') || clz.includes('codicon-fold') || clz.includes('codicon-gutter-lightbulb') || clz.includes('codicon-lightbulb-sparkle');
                if (hasSomeActionableCodicon) {
                    return false;
                }
            }
        }
        return true;
    }
    ensureBreakpointHintDecoration(showBreakpointHintAtLineNumber) {
        this.editor.changeDecorations((accessor) => {
            if (this.breakpointHintDecoration) {
                accessor.removeDecoration(this.breakpointHintDecoration);
                this.breakpointHintDecoration = null;
            }
            if (showBreakpointHintAtLineNumber !== -1) {
                this.breakpointHintDecoration = accessor.addDecoration({
                    startLineNumber: showBreakpointHintAtLineNumber,
                    startColumn: 1,
                    endLineNumber: showBreakpointHintAtLineNumber,
                    endColumn: 1
                }, breakpointHelperDecoration);
            }
        });
    }
    async setDecorations() {
        if (!this.editor.hasModel()) {
            return;
        }
        const setCandidateDecorations = (changeAccessor, desiredCandidatePositions) => {
            const desiredCandidateDecorations = createCandidateDecorations(model, this.breakpointDecorations, desiredCandidatePositions);
            const candidateDecorationIds = changeAccessor.deltaDecorations(this.candidateDecorations.map(c => c.decorationId), desiredCandidateDecorations);
            this.candidateDecorations.forEach(candidate => {
                candidate.inlineWidget.dispose();
            });
            this.candidateDecorations = candidateDecorationIds.map((decorationId, index) => {
                const candidate = desiredCandidateDecorations[index];
                // Candidate decoration has a breakpoint attached when a breakpoint is already at that location and we did not yet set a decoration there
                // In practice this happens for the first breakpoint that was set on a line
                // We could have also rendered this first decoration as part of desiredBreakpointDecorations however at that moment we have no location information
                const icon = candidate.breakpoint ? getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), candidate.breakpoint, this.labelService, this.debugService.getModel()).icon : icons.breakpoint.disabled;
                const contextMenuActions = () => this.getContextMenuActions(candidate.breakpoint ? [candidate.breakpoint] : [], activeCodeEditor.getModel().uri, candidate.range.startLineNumber, candidate.range.startColumn);
                const inlineWidget = new InlineBreakpointWidget(activeCodeEditor, decorationId, ThemeIcon.asClassName(icon), candidate.breakpoint, this.debugService, this.contextMenuService, contextMenuActions);
                return {
                    decorationId,
                    inlineWidget
                };
            });
        };
        const activeCodeEditor = this.editor;
        const model = activeCodeEditor.getModel();
        const breakpoints = this.debugService.getModel().getBreakpoints({ uri: model.uri });
        const debugSettings = this.configurationService.getValue('debug');
        const desiredBreakpointDecorations = this.instantiationService.invokeFunction(accessor => createBreakpointDecorations(accessor, model, breakpoints, this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), debugSettings.showBreakpointsInOverviewRuler));
        // try to set breakpoint location candidates in the same changeDecorations()
        // call to avoid flickering, if the DA responds reasonably quickly.
        const session = this.debugService.getViewModel().focusedSession;
        const desiredCandidatePositions = debugSettings.showInlineBreakpointCandidates && session ? requestBreakpointCandidateLocations(this.editor.getModel(), desiredBreakpointDecorations.map(bp => bp.range.startLineNumber), session) : Promise.resolve([]);
        const desiredCandidatePositionsRaced = await Promise.race([desiredCandidatePositions, timeout(500).then(() => undefined)]);
        if (desiredCandidatePositionsRaced === undefined) { // the timeout resolved first
            desiredCandidatePositions.then(v => activeCodeEditor.changeDecorations(d => setCandidateDecorations(d, v)));
        }
        try {
            this.ignoreDecorationsChangedEvent = true;
            // Set breakpoint decorations
            activeCodeEditor.changeDecorations((changeAccessor) => {
                const decorationIds = changeAccessor.deltaDecorations(this.breakpointDecorations.map(bpd => bpd.decorationId), desiredBreakpointDecorations);
                this.breakpointDecorations.forEach(bpd => {
                    bpd.inlineWidget?.dispose();
                });
                this.breakpointDecorations = decorationIds.map((decorationId, index) => {
                    let inlineWidget = undefined;
                    const breakpoint = breakpoints[index];
                    if (desiredBreakpointDecorations[index].options.before) {
                        const contextMenuActions = () => this.getContextMenuActions([breakpoint], activeCodeEditor.getModel().uri, breakpoint.lineNumber, breakpoint.column);
                        inlineWidget = new InlineBreakpointWidget(activeCodeEditor, decorationId, desiredBreakpointDecorations[index].options.glyphMarginClassName, breakpoint, this.debugService, this.contextMenuService, contextMenuActions);
                    }
                    return {
                        decorationId,
                        breakpoint,
                        range: desiredBreakpointDecorations[index].range,
                        inlineWidget
                    };
                });
                if (desiredCandidatePositionsRaced) {
                    setCandidateDecorations(changeAccessor, desiredCandidatePositionsRaced);
                }
            });
        }
        finally {
            this.ignoreDecorationsChangedEvent = false;
        }
        for (const d of this.breakpointDecorations) {
            if (d.inlineWidget) {
                this.editor.layoutContentWidget(d.inlineWidget);
            }
        }
    }
    async onModelDecorationsChanged() {
        if (this.breakpointDecorations.length === 0 || this.ignoreDecorationsChangedEvent || !this.editor.hasModel()) {
            // I have no decorations
            return;
        }
        let somethingChanged = false;
        const model = this.editor.getModel();
        this.breakpointDecorations.forEach(breakpointDecoration => {
            if (somethingChanged) {
                return;
            }
            const newBreakpointRange = model.getDecorationRange(breakpointDecoration.decorationId);
            if (newBreakpointRange && (!breakpointDecoration.range.equalsRange(newBreakpointRange))) {
                somethingChanged = true;
                breakpointDecoration.range = newBreakpointRange;
            }
        });
        if (!somethingChanged) {
            // nothing to do, my decorations did not change.
            return;
        }
        const data = new Map();
        for (let i = 0, len = this.breakpointDecorations.length; i < len; i++) {
            const breakpointDecoration = this.breakpointDecorations[i];
            const decorationRange = model.getDecorationRange(breakpointDecoration.decorationId);
            // check if the line got deleted.
            if (decorationRange) {
                // since we know it is collapsed, it cannot grow to multiple lines
                if (breakpointDecoration.breakpoint) {
                    data.set(breakpointDecoration.breakpoint.getId(), {
                        lineNumber: decorationRange.startLineNumber,
                        column: breakpointDecoration.breakpoint.column ? decorationRange.startColumn : undefined,
                    });
                }
            }
        }
        try {
            this.ignoreBreakpointsChangeEvent = true;
            await this.debugService.updateBreakpoints(model.uri, data, true);
        }
        finally {
            this.ignoreBreakpointsChangeEvent = false;
        }
    }
    // breakpoint widget
    showBreakpointWidget(lineNumber, column, context) {
        this.breakpointWidget?.dispose();
        this.breakpointWidget = this.instantiationService.createInstance(BreakpointWidget, this.editor, lineNumber, column, context);
        this.breakpointWidget.show({ lineNumber, column: 1 });
        this.breakpointWidgetVisible.set(true);
    }
    closeBreakpointWidget() {
        if (this.breakpointWidget) {
            this.breakpointWidget.dispose();
            this.breakpointWidget = undefined;
            this.breakpointWidgetVisible.reset();
            this.editor.focus();
        }
    }
    dispose() {
        this.breakpointWidget?.dispose();
        this.editor.removeDecorations(this.breakpointDecorations.map(bpd => bpd.decorationId));
        dispose(this.toDispose);
    }
};
BreakpointEditorContribution = __decorate([
    __param(1, IDebugService),
    __param(2, IContextMenuService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IDialogService),
    __param(6, IConfigurationService),
    __param(7, ILabelService)
], BreakpointEditorContribution);
export { BreakpointEditorContribution };
GutterActionsRegistry.registerGutterActionsGenerator(({ lineNumber, editor, accessor }, result) => {
    const model = editor.getModel();
    const debugService = accessor.get(IDebugService);
    if (!model || !debugService.getAdapterManager().hasEnabledDebuggers() || !debugService.canSetBreakpointsIn(model)) {
        return;
    }
    const breakpointEditorContribution = editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID);
    if (!breakpointEditorContribution) {
        return;
    }
    const actions = breakpointEditorContribution.getContextMenuActionsAtPosition(lineNumber, model);
    for (const action of actions) {
        result.push(action, '2_debug');
    }
});
class InlineBreakpointWidget {
    constructor(editor, decorationId, cssClass, breakpoint, debugService, contextMenuService, getContextMenuActions) {
        this.editor = editor;
        this.decorationId = decorationId;
        this.breakpoint = breakpoint;
        this.debugService = debugService;
        this.contextMenuService = contextMenuService;
        this.getContextMenuActions = getContextMenuActions;
        // editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = false;
        this.suppressMouseDown = true;
        this.toDispose = [];
        this.range = this.editor.getModel().getDecorationRange(decorationId);
        this.toDispose.push(this.editor.onDidChangeModelDecorations(() => {
            const model = this.editor.getModel();
            const range = model.getDecorationRange(this.decorationId);
            if (this.range && !this.range.equalsRange(range)) {
                this.range = range;
                this.editor.layoutContentWidget(this);
            }
        }));
        this.create(cssClass);
        this.editor.addContentWidget(this);
        this.editor.layoutContentWidget(this);
    }
    create(cssClass) {
        this.domNode = $('.inline-breakpoint-widget');
        if (cssClass) {
            this.domNode.classList.add(...cssClass.split(' '));
        }
        this.toDispose.push(dom.addDisposableListener(this.domNode, dom.EventType.CLICK, async (e) => {
            switch (this.breakpoint?.enabled) {
                case undefined:
                    await this.debugService.addBreakpoints(this.editor.getModel().uri, [{ lineNumber: this.range.startLineNumber, column: this.range.startColumn }]);
                    break;
                case true:
                    await this.debugService.removeBreakpoints(this.breakpoint.getId());
                    break;
                case false:
                    this.debugService.enableOrDisableBreakpoints(true, this.breakpoint);
                    break;
            }
        }));
        this.toDispose.push(dom.addDisposableListener(this.domNode, dom.EventType.CONTEXT_MENU, e => {
            const event = new StandardMouseEvent(dom.getWindow(this.domNode), e);
            const actions = this.getContextMenuActions();
            this.contextMenuService.showContextMenu({
                getAnchor: () => event,
                getActions: () => actions,
                getActionsContext: () => this.breakpoint,
                onHide: () => disposeIfDisposable(actions)
            });
        }));
        const updateSize = () => {
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            this.domNode.style.height = `${lineHeight}px`;
            this.domNode.style.width = `${Math.ceil(0.8 * lineHeight)}px`;
            this.domNode.style.marginLeft = `4px`;
        };
        updateSize();
        this.toDispose.push(this.editor.onDidChangeConfiguration(c => {
            if (c.hasChanged(54 /* EditorOption.fontSize */) || c.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateSize();
            }
        }));
    }
    getId() {
        return generateUuid();
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        if (!this.range) {
            return null;
        }
        // Workaround: since the content widget can not be placed before the first column we need to force the left position
        this.domNode.classList.toggle('line-start', this.range.startColumn === 1);
        return {
            position: { lineNumber: this.range.startLineNumber, column: this.range.startColumn - 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */]
        };
    }
    dispose() {
        this.editor.removeContentWidget(this);
        dispose(this.toDispose);
    }
}
__decorate([
    memoize
], InlineBreakpointWidget.prototype, "getId", null);
registerThemingParticipant((theme, collector) => {
    const scope = '.monaco-editor .glyph-margin-widgets, .monaco-workbench .debug-breakpoints, .monaco-workbench .disassembly-view, .monaco-editor .contentWidgets';
    const debugIconBreakpointColor = theme.getColor(debugIconBreakpointForeground);
    if (debugIconBreakpointColor) {
        collector.addRule(`${scope} {
			${icons.allBreakpoints.map(b => `${ThemeIcon.asCSSSelector(b.regular)}`).join(',\n		')},
			${ThemeIcon.asCSSSelector(icons.debugBreakpointUnsupported)},
			${ThemeIcon.asCSSSelector(icons.debugBreakpointHint)}:not([class*='codicon-debug-breakpoint']):not([class*='codicon-debug-stackframe']),
			${ThemeIcon.asCSSSelector(icons.breakpoint.regular)}${ThemeIcon.asCSSSelector(icons.debugStackframeFocused)}::after,
			${ThemeIcon.asCSSSelector(icons.breakpoint.regular)}${ThemeIcon.asCSSSelector(icons.debugStackframe)}::after {
				color: ${debugIconBreakpointColor} !important;
			}
		}`);
        collector.addRule(`${scope} {
			${ThemeIcon.asCSSSelector(icons.breakpoint.pending)} {
				color: ${debugIconBreakpointColor} !important;
				font-size: 12px !important;
			}
		}`);
    }
    const debugIconBreakpointDisabledColor = theme.getColor(debugIconBreakpointDisabledForeground);
    if (debugIconBreakpointDisabledColor) {
        collector.addRule(`${scope} {
			${icons.allBreakpoints.map(b => ThemeIcon.asCSSSelector(b.disabled)).join(',\n		')} {
				color: ${debugIconBreakpointDisabledColor};
			}
		}`);
    }
    const debugIconBreakpointUnverifiedColor = theme.getColor(debugIconBreakpointUnverifiedForeground);
    if (debugIconBreakpointUnverifiedColor) {
        collector.addRule(`${scope} {
			${icons.allBreakpoints.map(b => ThemeIcon.asCSSSelector(b.unverified)).join(',\n		')} {
				color: ${debugIconBreakpointUnverifiedColor};
			}
		}`);
    }
    const debugIconBreakpointCurrentStackframeForegroundColor = theme.getColor(debugIconBreakpointCurrentStackframeForeground);
    if (debugIconBreakpointCurrentStackframeForegroundColor) {
        collector.addRule(`
		.monaco-editor .debug-top-stack-frame-column {
			color: ${debugIconBreakpointCurrentStackframeForegroundColor} !important;
		}
		${scope} {
			${ThemeIcon.asCSSSelector(icons.debugStackframe)} {
				color: ${debugIconBreakpointCurrentStackframeForegroundColor} !important;
			}
		}
		`);
    }
    const debugIconBreakpointStackframeFocusedColor = theme.getColor(debugIconBreakpointStackframeForeground);
    if (debugIconBreakpointStackframeFocusedColor) {
        collector.addRule(`${scope} {
			${ThemeIcon.asCSSSelector(icons.debugStackframeFocused)} {
				color: ${debugIconBreakpointStackframeFocusedColor} !important;
			}
		}`);
    }
});
export const debugIconBreakpointForeground = registerColor('debugIcon.breakpointForeground', '#E51400', nls.localize('debugIcon.breakpointForeground', 'Icon color for breakpoints.'));
const debugIconBreakpointDisabledForeground = registerColor('debugIcon.breakpointDisabledForeground', '#848484', nls.localize('debugIcon.breakpointDisabledForeground', 'Icon color for disabled breakpoints.'));
const debugIconBreakpointUnverifiedForeground = registerColor('debugIcon.breakpointUnverifiedForeground', '#848484', nls.localize('debugIcon.breakpointUnverifiedForeground', 'Icon color for unverified breakpoints.'));
const debugIconBreakpointCurrentStackframeForeground = registerColor('debugIcon.breakpointCurrentStackframeForeground', { dark: '#FFCC00', light: '#BE8700', hcDark: '#FFCC00', hcLight: '#BE8700' }, nls.localize('debugIcon.breakpointCurrentStackframeForeground', 'Icon color for the current breakpoint stack frame.'));
const debugIconBreakpointStackframeForeground = registerColor('debugIcon.breakpointStackframeForeground', '#89D185', nls.localize('debugIcon.breakpointStackframeForeground', 'Icon color for all breakpoint stack frames.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludEVkaXRvckNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvYnJlYWtwb2ludEVkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRyxPQUFPLEtBQUssR0FBRyxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZFLE9B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