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
var FoldingController_1;
import { createCancelablePromise, Delayer, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, onUnexpectedError } from '../../../../base/common/errors.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import * as types from '../../../../base/common/types.js';
import './folding.css';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EditorAction, registerEditorAction, registerEditorContribution, registerInstantiatedEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { FoldingRangeKind } from '../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { FoldingModel, getNextFoldLine, getParentFoldLine as getParentFoldLine, getPreviousFoldLine, setCollapseStateAtLevel, setCollapseStateForMatchingLines, setCollapseStateForRest, setCollapseStateForType, setCollapseStateLevelsDown, setCollapseStateLevelsUp, setCollapseStateUp, toggleCollapseState } from './foldingModel.js';
import { HiddenRangeModel } from './hiddenRangeModel.js';
import { IndentRangeProvider } from './indentRangeProvider.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { FoldingDecorationProvider } from './foldingDecorations.js';
import { FoldingRegions } from './foldingRanges.js';
import { SyntaxRangeProvider } from './syntaxRangeProvider.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { Emitter } from '../../../../base/common/event.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../common/services/model.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const CONTEXT_FOLDING_ENABLED = new RawContextKey('foldingEnabled', false);
let FoldingController = class FoldingController extends Disposable {
    static { FoldingController_1 = this; }
    static { this.ID = 'editor.contrib.folding'; }
    static get(editor) {
        return editor.getContribution(FoldingController_1.ID);
    }
    static getFoldingRangeProviders(languageFeaturesService, model) {
        const foldingRangeProviders = languageFeaturesService.foldingRangeProvider.ordered(model);
        return (FoldingController_1._foldingRangeSelector?.(foldingRangeProviders, model)) ?? foldingRangeProviders;
    }
    static setFoldingRangeProviderSelector(foldingRangeSelector) {
        FoldingController_1._foldingRangeSelector = foldingRangeSelector;
        return { dispose: () => { FoldingController_1._foldingRangeSelector = undefined; } };
    }
    constructor(editor, contextKeyService, languageConfigurationService, notificationService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this.contextKeyService = contextKeyService;
        this.languageConfigurationService = languageConfigurationService;
        this.languageFeaturesService = languageFeaturesService;
        this.localToDispose = this._register(new DisposableStore());
        this.editor = editor;
        this._foldingLimitReporter = new RangesLimitReporter(editor);
        const options = this.editor.getOptions();
        this._isEnabled = options.get(45 /* EditorOption.folding */);
        this._useFoldingProviders = options.get(46 /* EditorOption.foldingStrategy */) !== 'indentation';
        this._unfoldOnClickAfterEndOfLine = options.get(50 /* EditorOption.unfoldOnClickAfterEndOfLine */);
        this._restoringViewState = false;
        this._currentModelHasFoldedImports = false;
        this._foldingImportsByDefault = options.get(48 /* EditorOption.foldingImportsByDefault */);
        this.updateDebounceInfo = languageFeatureDebounceService.for(languageFeaturesService.foldingRangeProvider, 'Folding', { min: 200 });
        this.foldingModel = null;
        this.hiddenRangeModel = null;
        this.rangeProvider = null;
        this.foldingRegionPromise = null;
        this.foldingModelPromise = null;
        this.updateScheduler = null;
        this.cursorChangedScheduler = null;
        this.mouseDownInfo = null;
        this.foldingDecorationProvider = new FoldingDecorationProvider(editor);
        this.foldingDecorationProvider.showFoldingControls = options.get(115 /* EditorOption.showFoldingControls */);
        this.foldingDecorationProvider.showFoldingHighlights = options.get(47 /* EditorOption.foldingHighlight */);
        this.foldingEnabled = CONTEXT_FOLDING_ENABLED.bindTo(this.contextKeyService);
        this.foldingEnabled.set(this._isEnabled);
        this._register(this.editor.onDidChangeModel(() => this.onModelChanged()));
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(45 /* EditorOption.folding */)) {
                this._isEnabled = this.editor.getOptions().get(45 /* EditorOption.folding */);
                this.foldingEnabled.set(this._isEnabled);
                this.onModelChanged();
            }
            if (e.hasChanged(49 /* EditorOption.foldingMaximumRegions */)) {
                this.onModelChanged();
            }
            if (e.hasChanged(115 /* EditorOption.showFoldingControls */) || e.hasChanged(47 /* EditorOption.foldingHighlight */)) {
                const options = this.editor.getOptions();
                this.foldingDecorationProvider.showFoldingControls = options.get(115 /* EditorOption.showFoldingControls */);
                this.foldingDecorationProvider.showFoldingHighlights = options.get(47 /* EditorOption.foldingHighlight */);
                this.triggerFoldingModelChanged();
            }
            if (e.hasChanged(46 /* EditorOption.foldingStrategy */)) {
                this._useFoldingProviders = this.editor.getOptions().get(46 /* EditorOption.foldingStrategy */) !== 'indentation';
                this.onFoldingStrategyChanged();
            }
            if (e.hasChanged(50 /* EditorOption.unfoldOnClickAfterEndOfLine */)) {
                this._unfoldOnClickAfterEndOfLine = this.editor.getOptions().get(50 /* EditorOption.unfoldOnClickAfterEndOfLine */);
            }
            if (e.hasChanged(48 /* EditorOption.foldingImportsByDefault */)) {
                this._foldingImportsByDefault = this.editor.getOptions().get(48 /* EditorOption.foldingImportsByDefault */);
            }
        }));
        this.onModelChanged();
    }
    get limitReporter() {
        return this._foldingLimitReporter;
    }
    /**
     * Store view state.
     */
    saveViewState() {
        const model = this.editor.getModel();
        if (!model || !this._isEnabled || model.isTooLargeForTokenization()) {
            return {};
        }
        if (this.foldingModel) { // disposed ?
            const collapsedRegions = this.foldingModel.getMemento();
            const provider = this.rangeProvider ? this.rangeProvider.id : undefined;
            return { collapsedRegions, lineCount: model.getLineCount(), provider, foldedImports: this._currentModelHasFoldedImports };
        }
        return undefined;
    }
    /**
     * Restore view state.
     */
    restoreViewState(state) {
        const model = this.editor.getModel();
        if (!model || !this._isEnabled || model.isTooLargeForTokenization() || !this.hiddenRangeModel) {
            return;
        }
        if (!state) {
            return;
        }
        this._currentModelHasFoldedImports = !!state.foldedImports;
        if (state.collapsedRegions && state.collapsedRegions.length > 0 && this.foldingModel) {
            this._restoringViewState = true;
            try {
                this.foldingModel.applyMemento(state.collapsedRegions);
            }
            finally {
                this._restoringViewState = false;
            }
        }
    }
    onModelChanged() {
        this.localToDispose.clear();
        const model = this.editor.getModel();
        if (!this._isEnabled || !model || model.isTooLargeForTokenization()) {
            // huge files get no view model, so they cannot support hidden areas
            return;
        }
        this._currentModelHasFoldedImports = false;
        this.foldingModel = new FoldingModel(model, this.foldingDecorationProvider);
        this.localToDispose.add(this.foldingModel);
        this.hiddenRangeModel = new HiddenRangeModel(this.foldingModel);
        this.localToDispose.add(this.hiddenRangeModel);
        this.localToDispose.add(this.hiddenRangeModel.onDidChange(hr => this.onHiddenRangesChanges(hr)));
        this.updateScheduler = new Delayer(this.updateDebounceInfo.get(model));
        this.cursorChangedScheduler = new RunOnceScheduler(() => this.revealCursor(), 200);
        this.localToDispose.add(this.cursorChangedScheduler);
        this.localToDispose.add(this.languageFeaturesService.foldingRangeProvider.onDidChange(() => this.onFoldingStrategyChanged()));
        this.localToDispose.add(this.editor.onDidChangeModelLanguageConfiguration(() => this.onFoldingStrategyChanged())); // covers model language changes as well
        this.localToDispose.add(this.editor.onDidChangeModelContent(e => this.onDidChangeModelContent(e)));
        this.localToDispose.add(this.editor.onDidChangeCursorPosition(() => this.onCursorPositionChanged()));
        this.localToDispose.add(this.editor.onMouseDown(e => this.onEditorMouseDown(e)));
        this.localToDispose.add(this.editor.onMouseUp(e => this.onEditorMouseUp(e)));
        this.localToDispose.add({
            dispose: () => {
                if (this.foldingRegionPromise) {
                    this.foldingRegionPromise.cancel();
                    this.foldingRegionPromise = null;
                }
                this.updateScheduler?.cancel();
                this.updateScheduler = null;
                this.foldingModel = null;
                this.foldingModelPromise = null;
                this.hiddenRangeModel = null;
                this.cursorChangedScheduler = null;
                this.rangeProvider?.dispose();
                this.rangeProvider = null;
            }
        });
        this.triggerFoldingModelChanged();
    }
    onFoldingStrategyChanged() {
        this.rangeProvider?.dispose();
        this.rangeProvider = null;
        this.triggerFoldingModelChanged();
    }
    getRangeProvider(editorModel) {
        if (this.rangeProvider) {
            return this.rangeProvider;
        }
        const indentRangeProvider = new IndentRangeProvider(editorModel, this.languageConfigurationService, this._foldingLimitReporter);
        this.rangeProvider = indentRangeProvider; // fallback
        if (this._useFoldingProviders && this.foldingModel) {
            const selectedProviders = FoldingController_1.getFoldingRangeProviders(this.languageFeaturesService, editorModel);
            if (selectedProviders.length > 0) {
                this.rangeProvider = new SyntaxRangeProvider(editorModel, selectedProviders, () => this.triggerFoldingModelChanged(), this._foldingLimitReporter, indentRangeProvider);
            }
        }
        return this.rangeProvider;
    }
    getFoldingModel() {
        return this.foldingModelPromise;
    }
    onDidChangeModelContent(e) {
        this.hiddenRangeModel?.notifyChangeModelContent(e);
        this.triggerFoldingModelChanged();
    }
    triggerFoldingModelChanged() {
        if (this.updateScheduler) {
            if (this.foldingRegionPromise) {
                this.foldingRegionPromise.cancel();
                this.foldingRegionPromise = null;
            }
            this.foldingModelPromise = this.updateScheduler.trigger(() => {
                const foldingModel = this.foldingModel;
                if (!foldingModel) { // null if editor has been disposed, or folding turned off
                    return null;
                }
                const sw = new StopWatch();
                const provider = this.getRangeProvider(foldingModel.textModel);
                const foldingRegionPromise = this.foldingRegionPromise = createCancelablePromise(token => provider.compute(token));
                return foldingRegionPromise.then(foldingRanges => {
                    if (foldingRanges && foldingRegionPromise === this.foldingRegionPromise) { // new request or cancelled in the meantime?
                        let scrollState;
                        if (this._foldingImportsByDefault && !this._currentModelHasFoldedImports) {
                            const hasChanges = foldingRanges.setCollapsedAllOfType(FoldingRangeKind.Imports.value, true);
                            if (hasChanges) {
                                scrollState = StableEditorScrollState.capture(this.editor);
                                this._currentModelHasFoldedImports = hasChanges;
                            }
                        }
                        // some cursors might have moved into hidden regions, make sure they are in expanded regions
                        const selections = this.editor.getSelections();
                        foldingModel.update(foldingRanges, toSelectedLines(selections));
                        scrollState?.restore(this.editor);
                        // update debounce info
                        const newValue = this.updateDebounceInfo.update(foldingModel.textModel, sw.elapsed());
                        if (this.updateScheduler) {
                            this.updateScheduler.defaultDelay = newValue;
                        }
                    }
                    return foldingModel;
                });
            }).then(undefined, (err) => {
                onUnexpectedError(err);
                return null;
            });
        }
    }
    onHiddenRangesChanges(hiddenRanges) {
        if (this.hiddenRangeModel && hiddenRanges.length && !this._restoringViewState) {
            const selections = this.editor.getSelections();
            if (selections) {
                if (this.hiddenRangeModel.adjustSelections(selections)) {
                    this.editor.setSelections(selections);
                }
            }
        }
        this.editor.setHiddenAreas(hiddenRanges, this);
    }
    onCursorPositionChanged() {
        if (this.hiddenRangeModel && this.hiddenRangeModel.hasRanges()) {
            this.cursorChangedScheduler.schedule();
        }
    }
    revealCursor() {
        const foldingModel = this.getFoldingModel();
        if (!foldingModel) {
            return;
        }
        foldingModel.then(foldingModel => {
            if (foldingModel) {
                const selections = this.editor.getSelections();
                if (selections && selections.length > 0) {
                    const toToggle = [];
                    for (const selection of selections) {
                        const lineNumber = selection.selectionStartLineNumber;
                        if (this.hiddenRangeModel && this.hiddenRangeModel.isHidden(lineNumber)) {
                            toToggle.push(...foldingModel.getAllRegionsAtLine(lineNumber, r => r.isCollapsed && lineNumber > r.startLineNumber));
                        }
                    }
                    if (toToggle.length) {
                        foldingModel.toggleCollapseState(toToggle);
                        this.reveal(selections[0].getPosition());
                    }
                }
            }
        }).then(undefined, onUnexpectedError);
    }
    onEditorMouseDown(e) {
        this.mouseDownInfo = null;
        if (!this.hiddenRangeModel || !e.target || !e.target.range) {
            return;
        }
        if (!e.event.leftButton && !e.event.middleButton) {
            return;
        }
        const range = e.target.range;
        let iconClicked = false;
        switch (e.target.type) {
            case 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */: {
                const data = e.target.detail;
                const offsetLeftInGutter = e.target.element.offsetLeft;
                const gutterOffsetX = data.offsetX - offsetLeftInGutter;
                // const gutterOffsetX = data.offsetX - data.glyphMarginWidth - data.lineNumbersWidth - data.glyphMarginLeft;
                // TODO@joao TODO@alex TODO@martin this is such that we don't collide with dirty diff
                if (gutterOffsetX < 4) { // the whitespace between the border and the real folding icon border is 4px
                    return;
                }
                iconClicked = true;
                break;
            }
            case 7 /* MouseTargetType.CONTENT_EMPTY */: {
                if (this._unfoldOnClickAfterEndOfLine && this.hiddenRangeModel.hasRanges()) {
                    const data = e.target.detail;
                    if (!data.isAfterLines) {
                        break;
                    }
                }
                return;
            }
            case 6 /* MouseTargetType.CONTENT_TEXT */: {
                if (this.hiddenRangeModel.hasRanges()) {
                    const model = this.editor.getModel();
                    if (model && range.startColumn === model.getLineMaxColumn(range.startLineNumber)) {
                        break;
                    }
                }
                return;
            }
            default:
                return;
        }
        this.mouseDownInfo = { lineNumber: range.startLineNumber, iconClicked };
    }
    onEditorMouseUp(e) {
        const foldingModel = this.foldingModel;
        if (!foldingModel || !this.mouseDownInfo || !e.target) {
            return;
        }
        const lineNumber = this.mouseDownInfo.lineNumber;
        const iconClicked = this.mouseDownInfo.iconClicked;
        const range = e.target.range;
        if (!range || range.startLineNumber !== lineNumber) {
            return;
        }
        if (iconClicked) {
            if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
                return;
            }
        }
        else {
            const model = this.editor.getModel();
            if (!model || range.startColumn !== model.getLineMaxColumn(lineNumber)) {
                return;
            }
        }
        const region = foldingModel.getRegionAtLine(lineNumber);
        if (region && region.startLineNumber === lineNumber) {
            const isCollapsed = region.isCollapsed;
            if (iconClicked || isCollapsed) {
                const surrounding = e.event.altKey;
                let toToggle = [];
                if (surrounding) {
                    const filter = (otherRegion) => !otherRegion.containedBy(region) && !region.containedBy(otherRegion);
                    const toMaybeToggle = foldingModel.getRegionsInside(null, filter);
                    for (const r of toMaybeToggle) {
                        if (r.isCollapsed) {
                            toToggle.push(r);
                        }
                    }
                    // if any surrounding regions are folded, unfold those. Otherwise, fold all surrounding
                    if (toToggle.length === 0) {
                        toToggle = toMaybeToggle;
                    }
                }
                else {
                    const recursive = e.event.middleButton || e.event.shiftKey;
                    if (recursive) {
                        for (const r of foldingModel.getRegionsInside(region)) {
                            if (r.isCollapsed === isCollapsed) {
                                toToggle.push(r);
                            }
                        }
                    }
                    // when recursive, first only collapse all children. If all are already folded or there are no children, also fold parent.
                    if (isCollapsed || !recursive || toToggle.length === 0) {
                        toToggle.push(region);
                    }
                }
                foldingModel.toggleCollapseState(toToggle);
                this.reveal({ lineNumber, column: 1 });
            }
        }
    }
    reveal(position) {
        this.editor.revealPositionInCenterIfOutsideViewport(position, 0 /* ScrollType.Smooth */);
    }
};
FoldingController = FoldingController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ILanguageConfigurationService),
    __param(3, INotificationService),
    __param(4, ILanguageFeatureDebounceService),
    __param(5, ILanguageFeaturesService)
], FoldingController);
export { FoldingController };
export class RangesLimitReporter {
    constructor(editor) {
        this.editor = editor;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._computed = 0;
        this._limited = false;
    }
    get limit() {
        return this.editor.getOptions().get(49 /* EditorOption.foldingMaximumRegions */);
    }
    get computed() {
        return this._computed;
    }
    get limited() {
        return this._limited;
    }
    update(computed, limited) {
        if (computed !== this._computed || limited !== this._limited) {
            this._computed = computed;
            this._limited = limited;
            this._onDidChange.fire();
        }
    }
}
class FoldingAction extends EditorAction {
    runEditorCommand(accessor, editor, args) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const foldingController = FoldingController.get(editor);
        if (!foldingController) {
            return;
        }
        const foldingModelPromise = foldingController.getFoldingModel();
        if (foldingModelPromise) {
            this.reportTelemetry(accessor, editor);
            return foldingModelPromise.then(foldingModel => {
                if (foldingModel) {
                    this.invoke(foldingController, foldingModel, editor, args, languageConfigurationService);
                    const selection = editor.getSelection();
                    if (selection) {
                        foldingController.reveal(selection.getStartPosition());
                    }
                }
            });
        }
    }
    getSelectedLines(editor) {
        const selections = editor.getSelections();
        return selections ? selections.map(s => s.startLineNumber) : [];
    }
    getLineNumbers(args, editor) {
        if (args && args.selectionLines) {
            return args.selectionLines.map(l => l + 1); // to 0-bases line numbers
        }
        return this.getSelectedLines(editor);
    }
    run(_accessor, _editor) {
    }
}
export function toSelectedLines(selections) {
    if (!selections || selections.length === 0) {
        return {
            startsInside: () => false
        };
    }
    return {
        startsInside(startLine, endLine) {
            for (const s of selections) {
                const line = s.startLineNumber;
                if (line >= startLine && line <= endLine) {
                    return true;
                }
            }
            return false;
        }
    };
}
function foldingArgumentsConstraint(args) {
    if (!types.isUndefined(args)) {
        if (!types.isObject(args)) {
            return false;
        }
        const foldingArgs = args;
        if (!types.isUndefined(foldingArgs.levels) && !types.isNumber(foldingArgs.levels)) {
            return false;
        }
        if (!types.isUndefined(foldingArgs.direction) && !types.isString(foldingArgs.direction)) {
            return false;
        }
        if (!types.isUndefined(foldingArgs.selectionLines) && (!Array.isArray(foldingArgs.selectionLines) || !foldingArgs.selectionLines.every(types.isNumber))) {
            return false;
        }
    }
    return true;
}
class UnfoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfold',
            label: nls.localize2('unfoldAction.label', "Unfold"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            metadata: {
                description: 'Unfold the content in the editor',
                args: [
                    {
                        name: 'Unfold editor argument',
                        description: `Property-value pairs that can be passed through this argument:
						* 'levels': Number of levels to unfold. If not set, defaults to 1.
						* 'direction': If 'up', unfold given number of levels up otherwise unfolds down.
						* 'selectionLines': Array of the start lines (0-based) of the editor selections to apply the unfold action to. If not set, the active selection(s) will be used.
						`,
                        constraint: foldingArgumentsConstraint,
                        schema: {
                            'type': 'object',
                            'properties': {
                                'levels': {
                                    'type': 'number',
                                    'default': 1
                                },
                                'direction': {
                                    'type': 'string',
                                    'enum': ['up', 'down'],
                                    'default': 'down'
                                },
                                'selectionLines': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'number'
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        });
    }
    invoke(_foldingController, foldingModel, editor, args) {
        const levels = args && args.levels || 1;
        const lineNumbers = this.getLineNumbers(args, editor);
        if (args && args.direction === 'up') {
            setCollapseStateLevelsUp(foldingModel, false, levels, lineNumbers);
        }
        else {
            setCollapseStateLevelsDown(foldingModel, false, levels, lineNumbers);
        }
    }
}
class UnFoldRecursivelyAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldRecursively',
            label: nls.localize2('unFoldRecursivelyAction.label', "Unfold Recursively"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor, _args) {
        setCollapseStateLevelsDown(foldingModel, false, Number.MAX_VALUE, this.getSelectedLines(editor));
    }
}
class FoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.fold',
            label: nls.localize2('foldAction.label', "Fold"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            metadata: {
                description: 'Fold the content in the editor',
                args: [
                    {
                        name: 'Fold editor argument',
                        description: `Property-value pairs that can be passed through this argument:
							* 'levels': Number of levels to fold.
							* 'direction': If 'up', folds given number of levels up otherwise folds down.
							* 'selectionLines': Array of the start lines (0-based) of the editor selections to apply the fold action to. If not set, the active selection(s) will be used.
							If no levels or direction is set, folds the region at the locations or if already collapsed, the first uncollapsed parent instead.
						`,
                        constraint: foldingArgumentsConstraint,
                        schema: {
                            'type': 'object',
                            'properties': {
                                'levels': {
                                    'type': 'number',
                                },
                                'direction': {
                                    'type': 'string',
                                    'enum': ['up', 'down'],
                                },
                                'selectionLines': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'number'
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        });
    }
    invoke(_foldingController, foldingModel, editor, args) {
        const lineNumbers = this.getLineNumbers(args, editor);
        const levels = args && args.levels;
        const direction = args && args.direction;
        if (typeof levels !== 'number' && typeof direction !== 'string') {
            // fold the region at the location or if already collapsed, the first uncollapsed parent instead.
            setCollapseStateUp(foldingModel, true, lineNumbers);
        }
        else {
            if (direction === 'up') {
                setCollapseStateLevelsUp(foldingModel, true, levels || 1, lineNumbers);
            }
            else {
                setCollapseStateLevelsDown(foldingModel, true, levels || 1, lineNumbers);
            }
        }
    }
}
class ToggleFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.toggleFold',
            label: nls.localize2('toggleFoldAction.label', "Toggle Fold"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        toggleCollapseState(foldingModel, 1, selectedLines);
    }
}
class FoldRecursivelyAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldRecursively',
            label: nls.localize2('foldRecursivelyAction.label', "Fold Recursively"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 92 /* KeyCode.BracketLeft */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        setCollapseStateLevelsDown(foldingModel, true, Number.MAX_VALUE, selectedLines);
    }
}
class ToggleFoldRecursivelyAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.toggleFoldRecursively',
            label: nls.localize2('toggleFoldRecursivelyAction.label', "Toggle Fold Recursively"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        toggleCollapseState(foldingModel, Number.MAX_VALUE, selectedLines);
    }
}
class FoldAllBlockCommentsAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAllBlockComments',
            label: nls.localize2('foldAllBlockComments.label', "Fold All Block Comments"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor, args, languageConfigurationService) {
        if (foldingModel.regions.hasTypes()) {
            setCollapseStateForType(foldingModel, FoldingRangeKind.Comment.value, true);
        }
        else {
            const editorModel = editor.getModel();
            if (!editorModel) {
                return;
            }
            const comments = languageConfigurationService.getLanguageConfiguration(editorModel.getLanguageId()).comments;
            if (comments && comments.blockCommentStartToken) {
                const regExp = new RegExp('^\\s*' + escapeRegExpCharacters(comments.blockCommentStartToken));
                setCollapseStateForMatchingLines(foldingModel, regExp, true);
            }
        }
    }
}
class FoldAllRegionsAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAllMarkerRegions',
            label: nls.localize2('foldAllMarkerRegions.label', "Fold All Regions"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 29 /* KeyCode.Digit8 */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor, args, languageConfigurationService) {
        if (foldingModel.regions.hasTypes()) {
            setCollapseStateForType(foldingModel, FoldingRangeKind.Region.value, true);
        }
        else {
            const editorModel = editor.getModel();
            if (!editorModel) {
                return;
            }
            const foldingRules = languageConfigurationService.getLanguageConfiguration(editorModel.getLanguageId()).foldingRules;
            if (foldingRules && foldingRules.markers && foldingRules.markers.start) {
                const regExp = new RegExp(foldingRules.markers.start);
                setCollapseStateForMatchingLines(foldingModel, regExp, true);
            }
        }
    }
}
class UnfoldAllRegionsAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldAllMarkerRegions',
            label: nls.localize2('unfoldAllMarkerRegions.label', "Unfold All Regions"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 30 /* KeyCode.Digit9 */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor, args, languageConfigurationService) {
        if (foldingModel.regions.hasTypes()) {
            setCollapseStateForType(foldingModel, FoldingRangeKind.Region.value, false);
        }
        else {
            const editorModel = editor.getModel();
            if (!editorModel) {
                return;
            }
            const foldingRules = languageConfigurationService.getLanguageConfiguration(editorModel.getLanguageId()).foldingRules;
            if (foldingRules && foldingRules.markers && foldingRules.markers.start) {
                const regExp = new RegExp(foldingRules.markers.start);
                setCollapseStateForMatchingLines(foldingModel, regExp, false);
            }
        }
    }
}
class FoldAllExceptAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAllExcept',
            label: nls.localize2('foldAllExcept.label', "Fold All Except Selected"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        setCollapseStateForRest(foldingModel, true, selectedLines);
    }
}
class UnfoldAllExceptAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldAllExcept',
            label: nls.localize2('unfoldAllExcept.label', "Unfold All Except Selected"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        setCollapseStateForRest(foldingModel, false, selectedLines);
    }
}
class FoldAllAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.foldAll',
            label: nls.localize2('foldAllAction.label', "Fold All"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 21 /* KeyCode.Digit0 */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, _editor) {
        setCollapseStateLevelsDown(foldingModel, true);
    }
}
class UnfoldAllAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.unfoldAll',
            label: nls.localize2('unfoldAllAction.label', "Unfold All"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 40 /* KeyCode.KeyJ */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, _editor) {
        setCollapseStateLevelsDown(foldingModel, false);
    }
}
class FoldLevelAction extends FoldingAction {
    static { this.ID_PREFIX = 'editor.foldLevel'; }
    static { this.ID = (level) => FoldLevelAction.ID_PREFIX + level; }
    getFoldingLevel() {
        return parseInt(this.id.substr(FoldLevelAction.ID_PREFIX.length));
    }
    invoke(_foldingController, foldingModel, editor) {
        setCollapseStateAtLevel(foldingModel, this.getFoldingLevel(), true, this.getSelectedLines(editor));
    }
}
/** Action to go to the parent fold of current line */
class GotoParentFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.gotoParentFold',
            label: nls.localize2('gotoParentFold.label', "Go to Parent Fold"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        if (selectedLines.length > 0) {
            const startLineNumber = getParentFoldLine(selectedLines[0], foldingModel);
            if (startLineNumber !== null) {
                editor.setSelection({
                    startLineNumber: startLineNumber,
                    startColumn: 1,
                    endLineNumber: startLineNumber,
                    endColumn: 1
                });
            }
        }
    }
}
/** Action to go to the previous fold of current line */
class GotoPreviousFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.gotoPreviousFold',
            label: nls.localize2('gotoPreviousFold.label', "Go to Previous Folding Range"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        if (selectedLines.length > 0) {
            const startLineNumber = getPreviousFoldLine(selectedLines[0], foldingModel);
            if (startLineNumber !== null) {
                editor.setSelection({
                    startLineNumber: startLineNumber,
                    startColumn: 1,
                    endLineNumber: startLineNumber,
                    endColumn: 1
                });
            }
        }
    }
}
/** Action to go to the next fold of current line */
class GotoNextFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.gotoNextFold',
            label: nls.localize2('gotoNextFold.label', "Go to Next Folding Range"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const selectedLines = this.getSelectedLines(editor);
        if (selectedLines.length > 0) {
            const startLineNumber = getNextFoldLine(selectedLines[0], foldingModel);
            if (startLineNumber !== null) {
                editor.setSelection({
                    startLineNumber: startLineNumber,
                    startColumn: 1,
                    endLineNumber: startLineNumber,
                    endColumn: 1
                });
            }
        }
    }
}
class FoldRangeFromSelectionAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.createFoldingRangeFromSelection',
            label: nls.localize2('createManualFoldRange.label', "Create Folding Range from Selection"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 87 /* KeyCode.Comma */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(_foldingController, foldingModel, editor) {
        const collapseRanges = [];
        const selections = editor.getSelections();
        if (selections) {
            for (const selection of selections) {
                let endLineNumber = selection.endLineNumber;
                if (selection.endColumn === 1) {
                    --endLineNumber;
                }
                if (endLineNumber > selection.startLineNumber) {
                    collapseRanges.push({
                        startLineNumber: selection.startLineNumber,
                        endLineNumber: endLineNumber,
                        type: undefined,
                        isCollapsed: true,
                        source: 1 /* FoldSource.userDefined */
                    });
                    editor.setSelection({
                        startLineNumber: selection.startLineNumber,
                        startColumn: 1,
                        endLineNumber: selection.startLineNumber,
                        endColumn: 1
                    });
                }
            }
            if (collapseRanges.length > 0) {
                collapseRanges.sort((a, b) => {
                    return a.startLineNumber - b.startLineNumber;
                });
                const newRanges = FoldingRegions.sanitizeAndMerge(foldingModel.regions, collapseRanges, editor.getModel()?.getLineCount());
                foldingModel.updatePost(FoldingRegions.fromFoldRanges(newRanges));
            }
        }
    }
}
class RemoveFoldRangeFromSelectionAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.removeManualFoldingRanges',
            label: nls.localize2('removeManualFoldingRanges.label', "Remove Manual Folding Ranges"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    invoke(foldingController, foldingModel, editor) {
        const selections = editor.getSelections();
        if (selections) {
            const ranges = [];
            for (const selection of selections) {
                const { startLineNumber, endLineNumber } = selection;
                ranges.push(endLineNumber >= startLineNumber ? { startLineNumber, endLineNumber } : { endLineNumber, startLineNumber });
            }
            foldingModel.removeManualRanges(ranges);
            foldingController.triggerFoldingModelChanged();
        }
    }
}
class ToggleImportFoldAction extends FoldingAction {
    constructor() {
        super({
            id: 'editor.toggleImportFold',
            label: nls.localize2('toggleImportFold.label', "Toggle Import Fold"),
            precondition: CONTEXT_FOLDING_ENABLED,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async invoke(foldingController, foldingModel) {
        const regionsToToggle = [];
        const regions = foldingModel.regions;
        for (let i = regions.length - 1; i >= 0; i--) {
            if (regions.getType(i) === FoldingRangeKind.Imports.value) {
                regionsToToggle.push(regions.toRegion(i));
            }
        }
        foldingModel.toggleCollapseState(regionsToToggle);
        foldingController.triggerFoldingModelChanged();
    }
}
registerEditorContribution(FoldingController.ID, FoldingController, 0 /* EditorContributionInstantiation.Eager */); // eager because it uses `saveViewState`/`restoreViewState`
registerEditorAction(UnfoldAction);
registerEditorAction(UnFoldRecursivelyAction);
registerEditorAction(FoldAction);
registerEditorAction(FoldRecursivelyAction);
registerEditorAction(ToggleFoldRecursivelyAction);
registerEditorAction(FoldAllAction);
registerEditorAction(UnfoldAllAction);
registerEditorAction(FoldAllBlockCommentsAction);
registerEditorAction(FoldAllRegionsAction);
registerEditorAction(UnfoldAllRegionsAction);
registerEditorAction(FoldAllExceptAction);
registerEditorAction(UnfoldAllExceptAction);
registerEditorAction(ToggleFoldAction);
registerEditorAction(GotoParentFoldAction);
registerEditorAction(GotoPreviousFoldAction);
registerEditorAction(GotoNextFoldAction);
registerEditorAction(FoldRangeFromSelectionAction);
registerEditorAction(RemoveFoldRangeFromSelectionAction);
registerEditorAction(ToggleImportFoldAction);
for (let i = 1; i <= 7; i++) {
    registerInstantiatedEditorAction(new FoldLevelAction({
        id: FoldLevelAction.ID(i),
        label: nls.localize2('foldLevelAction.label', "Fold Level {0}", i),
        precondition: CONTEXT_FOLDING_ENABLED,
        kbOpts: {
            kbExpr: EditorContextKeys.editorTextFocus,
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | (21 /* KeyCode.Digit0 */ + i)),
            weight: 100 /* KeybindingWeight.EditorContrib */
        }
    }));
}
CommandsRegistry.registerCommand('_executeFoldingRangeProvider', async function (accessor, ...args) {
    const [resource] = args;
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const configurationService = accessor.get(IConfigurationService);
    if (!configurationService.getValue('editor.folding', { resource })) {
        return [];
    }
    const languageConfigurationService = accessor.get(ILanguageConfigurationService);
    const strategy = configurationService.getValue('editor.foldingStrategy', { resource });
    const foldingLimitReporter = {
        get limit() {
            return configurationService.getValue('editor.foldingMaximumRegions', { resource });
        },
        update: (computed, limited) => { }
    };
    const indentRangeProvider = new IndentRangeProvider(model, languageConfigurationService, foldingLimitReporter);
    let rangeProvider = indentRangeProvider;
    if (strategy !== 'indentation') {
        const providers = FoldingController.getFoldingRangeProviders(languageFeaturesService, model);
        if (providers.length) {
            rangeProvider = new SyntaxRangeProvider(model, providers, () => { }, foldingLimitReporter, indentRangeProvider);
        }
    }
    const ranges = await rangeProvider.compute(CancellationToken.None);
    const result = [];
    try {
        if (ranges) {
            for (let i = 0; i < ranges.length; i++) {
                const type = ranges.getType(i);
                result.push({ start: ranges.getStartLineNumber(i), end: ranges.getEndLineNumber(i), kind: type ? FoldingRangeKind.fromValue(type) : undefined });
            }
        }
        return result;
    }
    finally {
        rangeProvider.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvZm9sZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakYsT0FBTyxFQUFFLFlBQVksRUFBbUMsb0JBQW9CLEVBQUUsMEJBQTBCLEVBQUUsZ0NBQWdDLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFNM00sT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHekUsT0FBTyxFQUFnQixnQkFBZ0IsRUFBd0IsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMzRyxPQUFPLEVBQW1CLFlBQVksRUFBRSxlQUFlLEVBQUUsaUJBQWlCLElBQUks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