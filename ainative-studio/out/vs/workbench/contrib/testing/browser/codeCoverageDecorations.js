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
import * as dom from '../../../../base/browser/dom.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action } from '../../../../base/common/actions.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { assert, assertNever } from '../../../../base/common/assert.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isUriComponents, URI } from '../../../../base/common/uri.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { InjectedTextCursorStops } from '../../../../editor/common/model.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { bindContextKey, observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { FileCoverage } from '../common/testCoverage.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { ITestService } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { testingCoverageMissingBranch, testingCoverageReport, testingFilterIcon, testingRerunIcon } from './icons.js';
import { ManagedTestCoverageBars } from './testCoverageBars.js';
const CLASS_HIT = 'coverage-deco-hit';
const CLASS_MISS = 'coverage-deco-miss';
const TOGGLE_INLINE_COMMAND_TEXT = localize('testing.toggleInlineCoverage', 'Toggle Inline');
const TOGGLE_INLINE_COMMAND_ID = 'testing.toggleInlineCoverage';
const BRANCH_MISS_INDICATOR_CHARS = 4;
let CodeCoverageDecorations = class CodeCoverageDecorations extends Disposable {
    constructor(editor, instantiationService, coverage, configurationService, log, contextKeyService) {
        super();
        this.editor = editor;
        this.coverage = coverage;
        this.log = log;
        this.displayedStore = this._register(new DisposableStore());
        this.hoveredStore = this._register(new DisposableStore());
        this.decorationIds = new Map();
        this.summaryWidget = new Lazy(() => this._register(instantiationService.createInstance(CoverageToolbarWidget, this.editor)));
        const modelObs = observableFromEvent(this, editor.onDidChangeModel, () => editor.getModel());
        const configObs = observableFromEvent(this, editor.onDidChangeConfiguration, i => i);
        const fileCoverage = derived(reader => {
            const report = coverage.selected.read(reader);
            if (!report) {
                return;
            }
            const model = modelObs.read(reader);
            if (!model) {
                return;
            }
            const file = report.getUri(model.uri);
            if (!file) {
                return;
            }
            report.didAddCoverage.read(reader); // re-read if changes when there's no report
            return { file, testId: coverage.filterToTest.read(reader) };
        });
        this._register(bindContextKey(TestingContextKeys.hasPerTestCoverage, contextKeyService, reader => !!fileCoverage.read(reader)?.file.perTestData?.size));
        this._register(autorun(reader => {
            const c = fileCoverage.read(reader);
            if (c) {
                this.apply(editor.getModel(), c.file, c.testId, coverage.showInline.read(reader));
            }
            else {
                this.clear();
            }
        }));
        const toolbarEnabled = observableConfigValue("testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */, true, configurationService);
        this._register(autorun(reader => {
            const c = fileCoverage.read(reader);
            if (c && toolbarEnabled.read(reader)) {
                this.summaryWidget.value.setCoverage(c.file, c.testId);
            }
            else {
                this.summaryWidget.rawValue?.clearCoverage();
            }
        }));
        this._register(autorun(reader => {
            const c = fileCoverage.read(reader);
            if (c) {
                const evt = configObs.read(reader);
                if (evt?.hasChanged(68 /* EditorOption.lineHeight */) !== false) {
                    this.updateEditorStyles();
                }
            }
        }));
        this._register(editor.onMouseMove(e => {
            const model = editor.getModel();
            if (e.target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ && model) {
                this.hoverLineNumber(editor.getModel());
            }
            else if (coverage.showInline.get() && e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && model) {
                this.hoverInlineDecoration(model, e.target.position);
            }
            else {
                this.hoveredStore.clear();
            }
        }));
        this._register(editor.onWillChangeModel(() => {
            const model = editor.getModel();
            if (!this.details || !model) {
                return;
            }
            // Decorations adjust to local changes made in-editor, keep them synced in case the file is reopened:
            for (const decoration of model.getAllDecorations()) {
                const own = this.decorationIds.get(decoration.id);
                if (own) {
                    own.detail.range = decoration.range;
                }
            }
        }));
    }
    updateEditorStyles() {
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const { style } = this.editor.getContainerDomNode();
        style.setProperty('--vscode-testing-coverage-lineHeight', `${lineHeight}px`);
    }
    hoverInlineDecoration(model, position) {
        const allDecorations = model.getDecorationsInRange(Range.fromPositions(position));
        const decoration = mapFindFirst(allDecorations, ({ id }) => this.decorationIds.has(id) ? { id, deco: this.decorationIds.get(id) } : undefined);
        if (decoration === this.hoveredSubject) {
            return;
        }
        this.hoveredStore.clear();
        this.hoveredSubject = decoration;
        if (!decoration) {
            return;
        }
        model.changeDecorations(e => {
            e.changeDecorationOptions(decoration.id, {
                ...decoration.deco.options,
                className: `${decoration.deco.options.className} coverage-deco-hovered`,
            });
        });
        this.hoveredStore.add(toDisposable(() => {
            this.hoveredSubject = undefined;
            model.changeDecorations(e => {
                e.changeDecorationOptions(decoration.id, decoration.deco.options);
            });
        }));
    }
    hoverLineNumber(model) {
        if (this.hoveredSubject === 'lineNo' || !this.details || this.coverage.showInline.get()) {
            return;
        }
        this.hoveredStore.clear();
        this.hoveredSubject = 'lineNo';
        model.changeDecorations(e => {
            for (const [id, decoration] of this.decorationIds) {
                const { applyHoverOptions, options } = decoration;
                const dup = { ...options };
                applyHoverOptions(dup);
                e.changeDecorationOptions(id, dup);
            }
        });
        this.hoveredStore.add(this.editor.onMouseLeave(() => {
            this.hoveredStore.clear();
        }));
        this.hoveredStore.add(toDisposable(() => {
            this.hoveredSubject = undefined;
            model.changeDecorations(e => {
                for (const [id, decoration] of this.decorationIds) {
                    e.changeDecorationOptions(id, decoration.options);
                }
            });
        }));
    }
    async apply(model, coverage, testId, showInlineByDefault) {
        const details = this.details = await this.loadDetails(coverage, testId, model);
        if (!details) {
            return this.clear();
        }
        this.displayedStore.clear();
        model.changeDecorations(e => {
            for (const detailRange of details.ranges) {
                const { metadata: { detail, description }, range, primary } = detailRange;
                if (detail.type === 2 /* DetailType.Branch */) {
                    const hits = detail.detail.branches[detail.branch].count;
                    const cls = hits ? CLASS_HIT : CLASS_MISS;
                    // don't bother showing the miss indicator if the condition wasn't executed at all:
                    const showMissIndicator = !hits && range.isEmpty() && detail.detail.branches.some(b => b.count);
                    const options = {
                        showIfCollapsed: showMissIndicator, // only avoid collapsing if we want to show the miss indicator
                        description: 'coverage-gutter',
                        lineNumberClassName: `coverage-deco-gutter ${cls}`,
                    };
                    const applyHoverOptions = (target) => {
                        target.hoverMessage = description;
                        if (showMissIndicator) {
                            target.after = {
                                content: '\xa0'.repeat(BRANCH_MISS_INDICATOR_CHARS), // nbsp
                                inlineClassName: `coverage-deco-branch-miss-indicator ${ThemeIcon.asClassName(testingCoverageMissingBranch)}`,
                                inlineClassNameAffectsLetterSpacing: true,
                                cursorStops: InjectedTextCursorStops.None,
                            };
                        }
                        else {
                            target.className = `coverage-deco-inline ${cls}`;
                            if (primary && typeof hits === 'number') {
                                target.before = countBadge(hits);
                            }
                        }
                    };
                    if (showInlineByDefault) {
                        applyHoverOptions(options);
                    }
                    this.decorationIds.set(e.addDecoration(range, options), { options, applyHoverOptions, detail: detailRange });
                }
                else if (detail.type === 1 /* DetailType.Statement */) {
                    const cls = detail.count ? CLASS_HIT : CLASS_MISS;
                    const options = {
                        showIfCollapsed: false,
                        description: 'coverage-inline',
                        lineNumberClassName: `coverage-deco-gutter ${cls}`,
                    };
                    const applyHoverOptions = (target) => {
                        target.className = `coverage-deco-inline ${cls}`;
                        target.hoverMessage = description;
                        if (primary && typeof detail.count === 'number') {
                            target.before = countBadge(detail.count);
                        }
                    };
                    if (showInlineByDefault) {
                        applyHoverOptions(options);
                    }
                    this.decorationIds.set(e.addDecoration(range, options), { options, applyHoverOptions, detail: detailRange });
                }
            }
        });
        this.displayedStore.add(toDisposable(() => {
            model.changeDecorations(e => {
                for (const decoration of this.decorationIds.keys()) {
                    e.removeDecoration(decoration);
                }
                this.decorationIds.clear();
            });
        }));
    }
    clear() {
        this.loadingCancellation?.cancel();
        this.loadingCancellation = undefined;
        this.displayedStore.clear();
        this.hoveredStore.clear();
    }
    async loadDetails(coverage, testId, textModel) {
        const cts = this.loadingCancellation = new CancellationTokenSource();
        this.displayedStore.add(this.loadingCancellation);
        try {
            const details = testId
                ? await coverage.detailsForTest(testId, this.loadingCancellation.token)
                : await coverage.details(this.loadingCancellation.token);
            if (cts.token.isCancellationRequested) {
                return;
            }
            return new CoverageDetailsModel(details, textModel);
        }
        catch (e) {
            this.log.error('Error loading coverage details', e);
        }
        return undefined;
    }
};
CodeCoverageDecorations = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITestCoverageService),
    __param(3, IConfigurationService),
    __param(4, ILogService),
    __param(5, IContextKeyService)
], CodeCoverageDecorations);
export { CodeCoverageDecorations };
const countBadge = (count) => {
    if (count === 0) {
        return undefined;
    }
    return {
        content: `${count > 99 ? '99+' : count}x`,
        cursorStops: InjectedTextCursorStops.None,
        inlineClassName: `coverage-deco-inline-count`,
        inlineClassNameAffectsLetterSpacing: true,
    };
};
export class CoverageDetailsModel {
    constructor(details, textModel) {
        this.details = details;
        this.ranges = [];
        //#region decoration generation
        // Coverage from a provider can have a range that contains smaller ranges,
        // such as a function declaration that has nested statements. In this we
        // make sequential, non-overlapping ranges for each detail for display in
        // the editor without ugly overlaps.
        const detailRanges = details.map(detail => ({
            range: tidyLocation(detail.location),
            primary: true,
            metadata: { detail, description: this.describe(detail, textModel) }
        }));
        for (const { range, metadata: { detail } } of detailRanges) {
            if (detail.type === 1 /* DetailType.Statement */ && detail.branches) {
                for (let i = 0; i < detail.branches.length; i++) {
                    const branch = { type: 2 /* DetailType.Branch */, branch: i, detail };
                    detailRanges.push({
                        range: tidyLocation(detail.branches[i].location || Range.fromPositions(range.getEndPosition())),
                        primary: true,
                        metadata: {
                            detail: branch,
                            description: this.describe(branch, textModel),
                        },
                    });
                }
            }
        }
        // type ordering is done so that function declarations come first on a tie so that
        // single-statement functions (`() => foo()` for example) get inline decorations.
        detailRanges.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range) || a.metadata.detail.type - b.metadata.detail.type);
        const stack = [];
        const result = this.ranges = [];
        const pop = () => {
            const next = stack.pop();
            const prev = stack[stack.length - 1];
            if (prev) {
                prev.range = prev.range.setStartPosition(next.range.endLineNumber, next.range.endColumn);
            }
            result.push(next);
        };
        for (const item of detailRanges) {
            // 1. Ensure that any ranges in the stack that ended before this are flushed
            const start = item.range.getStartPosition();
            while (stack[stack.length - 1]?.range.containsPosition(start) === false) {
                pop();
            }
            // Empty ranges (usually representing missing branches) can be added
            // without worry about overlay.
            if (item.range.isEmpty()) {
                result.push(item);
                continue;
            }
            // 2. Take the last (overlapping) item in the stack, push range before
            // the `item.range` into the result and modify its stack to push the start
            // until after the `item.range` ends.
            const prev = stack[stack.length - 1];
            if (prev) {
                const primary = prev.primary;
                const si = prev.range.setEndPosition(start.lineNumber, start.column);
                prev.range = prev.range.setStartPosition(item.range.endLineNumber, item.range.endColumn);
                prev.primary = false;
                // discard the previous range if it became empty, e.g. a nested statement
                if (prev.range.isEmpty()) {
                    stack.pop();
                }
                result.push({ range: si, primary, metadata: prev.metadata });
            }
            stack.push(item);
        }
        while (stack.length) {
            pop();
        }
        //#endregion
    }
    /** Gets the markdown description for the given detail */
    describe(detail, model) {
        if (detail.type === 0 /* DetailType.Declaration */) {
            return namedDetailLabel(detail.name, detail);
        }
        else if (detail.type === 1 /* DetailType.Statement */) {
            const text = wrapName(model.getValueInRange(tidyLocation(detail.location)).trim() || `<empty statement>`);
            if (detail.branches?.length) {
                const covered = detail.branches.filter(b => !!b.count).length;
                return new MarkdownString().appendMarkdown(localize('coverage.branches', '{0} of {1} of branches in {2} were covered.', covered, detail.branches.length, text));
            }
            else {
                return namedDetailLabel(text, detail);
            }
        }
        else if (detail.type === 2 /* DetailType.Branch */) {
            const text = wrapName(model.getValueInRange(tidyLocation(detail.detail.location)).trim() || `<empty statement>`);
            const { count, label } = detail.detail.branches[detail.branch];
            const label2 = label ? wrapInBackticks(label) : `#${detail.branch + 1}`;
            if (!count) {
                return new MarkdownString().appendMarkdown(localize('coverage.branchNotCovered', 'Branch {0} in {1} was not covered.', label2, text));
            }
            else if (count === true) {
                return new MarkdownString().appendMarkdown(localize('coverage.branchCoveredYes', 'Branch {0} in {1} was executed.', label2, text));
            }
            else {
                return new MarkdownString().appendMarkdown(localize('coverage.branchCovered', 'Branch {0} in {1} was executed {2} time(s).', label2, text, count));
            }
        }
        assertNever(detail);
    }
}
function namedDetailLabel(name, detail) {
    return new MarkdownString().appendMarkdown(!detail.count // 0 or false
        ? localize('coverage.declExecutedNo', '`{0}` was not executed.', name)
        : typeof detail.count === 'number'
            ? localize('coverage.declExecutedCount', '`{0}` was executed {1} time(s).', name, detail.count)
            : localize('coverage.declExecutedYes', '`{0}` was executed.', name));
}
// 'tidies' the range by normalizing it into a range and removing leading
// and trailing whitespace.
function tidyLocation(location) {
    if (location instanceof Position) {
        return Range.fromPositions(location, new Position(location.lineNumber, 0x7FFFFFFF));
    }
    return location;
}
function wrapInBackticks(str) {
    return '`' + str.replace(/[\n\r`]/g, '') + '`';
}
function wrapName(functionNameOrCode) {
    if (functionNameOrCode.length > 50) {
        functionNameOrCode = functionNameOrCode.slice(0, 40) + '...';
    }
    return wrapInBackticks(functionNameOrCode);
}
let CoverageToolbarWidget = class CoverageToolbarWidget extends Disposable {
    constructor(editor, configurationService, contextMenuService, testService, keybindingService, commandService, coverage, instaService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.contextMenuService = contextMenuService;
        this.testService = testService;
        this.keybindingService = keybindingService;
        this.commandService = commandService;
        this.coverage = coverage;
        this.registered = false;
        this.isRunning = false;
        this.showStore = this._register(new DisposableStore());
        this._domNode = dom.h('div.coverage-summary-widget', [
            dom.h('div', [
                dom.h('span.bars@bars'),
                dom.h('span.toolbar@toolbar'),
            ]),
        ]);
        this.bars = this._register(instaService.createInstance(ManagedTestCoverageBars, {
            compact: false,
            overall: false,
            container: this._domNode.bars,
        }));
        this.actionBar = this._register(instaService.createInstance(ActionBar, this._domNode.toolbar, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                const vm = new CodiconActionViewItem(undefined, action, options);
                if (action instanceof ActionWithIcon) {
                    vm.themeIcon = action.icon;
                }
                return vm;
            }
        }));
        this._register(autorun(reader => {
            coverage.showInline.read(reader);
            this.setActions();
        }));
        this._register(dom.addStandardDisposableListener(this._domNode.root, dom.EventType.CONTEXT_MENU, e => {
            this.contextMenuService.showContextMenu({
                menuId: MenuId.StickyScrollContext,
                getAnchor: () => e,
            });
        }));
    }
    /** @inheritdoc */
    getId() {
        return 'coverage-summary-widget';
    }
    /** @inheritdoc */
    getDomNode() {
        return this._domNode.root;
    }
    /** @inheritdoc */
    getPosition() {
        return {
            preference: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */,
            stackOridinal: 9,
        };
    }
    clearCoverage() {
        this.current = undefined;
        this.bars.setCoverageInfo(undefined);
        this.hide();
    }
    setCoverage(coverage, testId) {
        this.current = { coverage, testId };
        this.bars.setCoverageInfo(coverage);
        if (!coverage) {
            this.hide();
        }
        else {
            this.setActions();
            this.show();
        }
    }
    setActions() {
        this.actionBar.clear();
        const current = this.current;
        if (!current) {
            return;
        }
        const toggleAction = new ActionWithIcon('toggleInline', this.coverage.showInline.get()
            ? localize('testing.hideInlineCoverage', 'Hide Inline Coverage')
            : localize('testing.showInlineCoverage', 'Show Inline Coverage'), testingCoverageReport, undefined, () => this.coverage.showInline.set(!this.coverage.showInline.get(), undefined));
        const kb = this.keybindingService.lookupKeybinding(TOGGLE_INLINE_COMMAND_ID);
        if (kb) {
            toggleAction.tooltip = `${TOGGLE_INLINE_COMMAND_TEXT} (${kb.getLabel()})`;
        }
        this.actionBar.push(toggleAction);
        if (current.testId) {
            const testItem = current.coverage.fromResult.getTestById(current.testId.toString());
            assert(!!testItem, 'got coverage for an unreported test');
            this.actionBar.push(new ActionWithIcon('perTestFilter', coverUtils.labels.showingFilterFor(testItem.label), testingFilterIcon, undefined, () => this.commandService.executeCommand("testing.coverageFilterToTestInEditor" /* TestCommandId.CoverageFilterToTestInEditor */, this.current, this.editor)));
        }
        else if (current.coverage.perTestData?.size) {
            this.actionBar.push(new ActionWithIcon('perTestFilter', localize('testing.coverageForTestAvailable', "{0} test(s) ran code in this file", current.coverage.perTestData.size), testingFilterIcon, undefined, () => this.commandService.executeCommand("testing.coverageFilterToTestInEditor" /* TestCommandId.CoverageFilterToTestInEditor */, this.current, this.editor)));
        }
        this.actionBar.push(new ActionWithIcon('rerun', localize('testing.rerun', 'Rerun'), testingRerunIcon, !this.isRunning, () => this.rerunTest()));
    }
    show() {
        if (this.registered) {
            return;
        }
        this.registered = true;
        let viewZoneId;
        const ds = this.showStore;
        this.editor.addOverlayWidget(this);
        this.editor.changeViewZones(accessor => {
            viewZoneId = accessor.addZone({
                afterLineNumber: 0,
                afterColumn: 0,
                domNode: document.createElement('div'),
                heightInPx: 30,
                ordinal: -1, // show before code lenses
            });
        });
        ds.add(toDisposable(() => {
            this.registered = false;
            this.editor.removeOverlayWidget(this);
            this.editor.changeViewZones(accessor => {
                accessor.removeZone(viewZoneId);
            });
        }));
        ds.add(this.configurationService.onDidChangeConfiguration(e => {
            if (this.current && (e.affectsConfiguration("testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */) || e.affectsConfiguration("testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */))) {
                this.setCoverage(this.current.coverage, this.current.testId);
            }
        }));
    }
    rerunTest() {
        const current = this.current;
        if (current) {
            this.isRunning = true;
            this.setActions();
            this.testService.runResolvedTests(current.coverage.fromResult.request).finally(() => {
                this.isRunning = false;
                this.setActions();
            });
        }
    }
    hide() {
        this.showStore.clear();
    }
};
CoverageToolbarWidget = __decorate([
    __param(1, IConfigurationService),
    __param(2, IContextMenuService),
    __param(3, ITestService),
    __param(4, IKeybindingService),
    __param(5, ICommandService),
    __param(6, ITestCoverageService),
    __param(7, IInstantiationService)
], CoverageToolbarWidget);
registerAction2(class ToggleInlineCoverage extends Action2 {
    constructor() {
        super({
            id: TOGGLE_INLINE_COMMAND_ID,
            // note: ideally this would be "show inline", but the command palette does
            // not use the 'toggled' titles, so we need to make this generic.
            title: localize2('coverage.toggleInline', "Toggle Inline Coverage"),
            category: Categories.Test,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */),
            },
            toggled: {
                condition: TestingContextKeys.inlineCoverageEnabled,
                title: localize('coverage.hideInline', "Hide Inline Coverage"),
            },
            icon: testingCoverageReport,
            menu: [
                { id: MenuId.CommandPalette, when: TestingContextKeys.isTestCoverageOpen },
                { id: MenuId.EditorTitle, when: ContextKeyExpr.and(TestingContextKeys.isTestCoverageOpen, TestingContextKeys.coverageToolbarEnabled.notEqualsTo(true)), group: 'navigation' },
            ]
        });
    }
    run(accessor) {
        const coverage = accessor.get(ITestCoverageService);
        coverage.showInline.set(!coverage.showInline.get(), undefined);
    }
});
registerAction2(class ToggleCoverageToolbar extends Action2 {
    constructor() {
        super({
            id: "testing.coverageToggleToolbar" /* TestCommandId.CoverageToggleToolbar */,
            title: localize2('testing.toggleToolbarTitle', "Test Coverage Toolbar"),
            metadata: {
                description: localize2('testing.toggleToolbarDesc', 'Toggle the sticky coverage bar in the editor.')
            },
            category: Categories.Test,
            toggled: {
                condition: TestingContextKeys.coverageToolbarEnabled,
            },
            menu: [
                { id: MenuId.CommandPalette, when: TestingContextKeys.isTestCoverageOpen },
                { id: MenuId.StickyScrollContext, when: TestingContextKeys.isTestCoverageOpen },
                { id: MenuId.EditorTitle, when: TestingContextKeys.isTestCoverageOpen, group: 'coverage@1' },
            ]
        });
    }
    run(accessor) {
        const config = accessor.get(IConfigurationService);
        const value = getTestingConfiguration(config, "testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */);
        config.updateValue("testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */, !value);
    }
});
registerAction2(class FilterCoverageToTestInEditor extends Action2 {
    constructor() {
        super({
            id: "testing.coverageFilterToTestInEditor" /* TestCommandId.CoverageFilterToTestInEditor */,
            title: localize2('testing.filterActionLabel', "Filter Coverage to Test"),
            category: Categories.Test,
            icon: Codicon.filter,
            toggled: {
                icon: Codicon.filterFilled,
                condition: TestingContextKeys.isCoverageFilteredToTest,
            },
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(TestingContextKeys.isTestCoverageOpen, TestingContextKeys.coverageToolbarEnabled.notEqualsTo(true), TestingContextKeys.hasPerTestCoverage, ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID)),
                    group: 'navigation',
                },
            ]
        });
    }
    run(accessor, coverageOrUri, editor) {
        const testCoverageService = accessor.get(ITestCoverageService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeEditor = isCodeEditor(editor) ? editor : accessor.get(ICodeEditorService).getActiveCodeEditor();
        let coverage;
        if (coverageOrUri instanceof FileCoverage) {
            coverage = coverageOrUri;
        }
        else if (isUriComponents(coverageOrUri)) {
            coverage = testCoverageService.selected.get()?.getUri(URI.from(coverageOrUri));
        }
        else {
            const uri = activeEditor?.getModel()?.uri;
            coverage = uri && testCoverageService.selected.get()?.getUri(uri);
        }
        if (!coverage || !coverage.perTestData?.size) {
            return;
        }
        const tests = [...coverage.perTestData].map(TestId.fromString);
        const commonPrefix = TestId.getLengthOfCommonPrefix(tests.length, i => tests[i]);
        const result = coverage.fromResult;
        const previousSelection = testCoverageService.filterToTest.get();
        const items = [
            { label: coverUtils.labels.allTests, testId: undefined },
            { type: 'separator' },
            ...tests.map(id => ({ label: coverUtils.getLabelForItem(result, id, commonPrefix), testId: id })),
        ];
        // These handle the behavior that reveals the start of coverage when the
        // user picks from the quickpick. Scroll position is restored if the user
        // exits without picking an item, or picks "all tets".
        const scrollTop = activeEditor?.getScrollTop() || 0;
        const revealScrollCts = new MutableDisposable();
        quickInputService.pick(items, {
            activeItem: items.find((item) => 'item' in item && item.item === coverage),
            placeHolder: coverUtils.labels.pickShowCoverage,
            onDidFocus: (entry) => {
                if (!entry.testId) {
                    revealScrollCts.clear();
                    activeEditor?.setScrollTop(scrollTop);
                    testCoverageService.filterToTest.set(undefined, undefined);
                }
                else {
                    const cts = revealScrollCts.value = new CancellationTokenSource();
                    coverage.detailsForTest(entry.testId, cts.token).then(details => {
                        const first = details.find(d => d.type === 1 /* DetailType.Statement */);
                        if (!cts.token.isCancellationRequested && first) {
                            activeEditor?.revealLineNearTop(first.location instanceof Position ? first.location.lineNumber : first.location.startLineNumber);
                        }
                    }, () => { });
                    testCoverageService.filterToTest.set(entry.testId, undefined);
                }
            },
        }).then(selected => {
            if (!selected) {
                activeEditor?.setScrollTop(scrollTop);
            }
            revealScrollCts.dispose();
            testCoverageService.filterToTest.set(selected ? selected.testId : previousSelection, undefined);
        });
    }
});
class ActionWithIcon extends Action {
    constructor(id, title, icon, enabled, run) {
        super(id, title, undefined, enabled, run);
        this.icon = icon;
    }
}
class CodiconActionViewItem extends ActionViewItem {
    updateLabel() {
        if (this.options.label && this.label && this.themeIcon) {
            dom.reset(this.label, renderIcon(this.themeIcon), this.action.label);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2NvZGVDb3ZlcmFnZURlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxTQUFTLEVBQXNCLE1BQU0sb0RBQW9ELENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFB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