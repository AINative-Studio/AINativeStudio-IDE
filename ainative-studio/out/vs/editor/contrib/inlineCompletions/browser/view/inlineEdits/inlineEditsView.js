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
var InlineEditsView_1;
import { equalsIfDefined, itemEquals } from '../../../../../../base/common/equals.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, derivedOpts, derivedWithStore, mapObservableArrayCached, observableValue } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { LineRange } from '../../../../../common/core/lineRange.js';
import { Range } from '../../../../../common/core/range.js';
import { SingleTextEdit, StringText } from '../../../../../common/core/textEdit.js';
import { TextLength } from '../../../../../common/core/textLength.js';
import { lineRangeMappingFromRangeMappings, RangeMapping } from '../../../../../common/diff/rangeMapping.js';
import { TextModel } from '../../../../../common/model/textModel.js';
import { InlineEditsGutterIndicator } from './components/gutterIndicatorView.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditsCollapsedView } from './inlineEditsViews/inlineEditsCollapsedView.js';
import { InlineEditsDeletionView } from './inlineEditsViews/inlineEditsDeletionView.js';
import { InlineEditsInsertionView } from './inlineEditsViews/inlineEditsInsertionView.js';
import { InlineEditsLineReplacementView } from './inlineEditsViews/inlineEditsLineReplacementView.js';
import { InlineEditsSideBySideView } from './inlineEditsViews/inlineEditsSideBySideView.js';
import { InlineEditsWordReplacementView } from './inlineEditsViews/inlineEditsWordReplacementView.js';
import { OriginalEditorInlineDiffView } from './inlineEditsViews/originalEditorInlineDiffView.js';
import { applyEditToModifiedRangeMappings, createReindentEdit } from './utils/utils.js';
import './view.css';
let InlineEditsView = InlineEditsView_1 = class InlineEditsView extends Disposable {
    constructor(_editor, _host, _model, _ghostTextIndicator, _focusIsInMenu, _instantiationService) {
        super();
        this._editor = _editor;
        this._host = _host;
        this._model = _model;
        this._ghostTextIndicator = _ghostTextIndicator;
        this._focusIsInMenu = _focusIsInMenu;
        this._instantiationService = _instantiationService;
        this._editorObs = observableCodeEditor(this._editor);
        this._tabAction = derived(reader => this._model.read(reader)?.tabAction.read(reader) ?? InlineEditTabAction.Inactive);
        this._constructorDone = observableValue(this, false);
        this._uiState = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model || !this._constructorDone.read(reader)) {
                return undefined;
            }
            model.handleInlineEditShown();
            const inlineEdit = model.inlineEdit;
            let mappings = RangeMapping.fromEdit(inlineEdit.edit);
            let newText = inlineEdit.edit.apply(inlineEdit.originalText);
            let diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, new StringText(newText));
            const originalDisplayRange = inlineEdit.originalText.lineRange.intersect(inlineEdit.originalLineRange.join(LineRange.ofLength(inlineEdit.originalLineRange.startLineNumber, inlineEdit.lineEdit.newLines.length)));
            let state = this.determineRenderState(model, reader, diff, new StringText(newText), originalDisplayRange);
            if (!state) {
                model.abort(`unable to determine view: tried to render ${this._previousView?.view}`);
                return undefined;
            }
            if (state.kind === 'sideBySide') {
                const indentationAdjustmentEdit = createReindentEdit(newText, inlineEdit.modifiedLineRange);
                newText = indentationAdjustmentEdit.applyToString(newText);
                mappings = applyEditToModifiedRangeMappings(mappings, indentationAdjustmentEdit);
                diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, new StringText(newText));
            }
            this._previewTextModel.setLanguage(this._editor.getModel().getLanguageId());
            const previousNewText = this._previewTextModel.getValue();
            if (previousNewText !== newText) {
                // Only update the model if the text has changed to avoid flickering
                this._previewTextModel.setValue(newText);
            }
            if (model.showCollapsed.read(reader) && !this._indicator.read(reader)?.isHoverVisible.read(reader)) {
                state = { kind: 'collapsed' };
            }
            return {
                state,
                diff,
                edit: inlineEdit,
                newText,
                newTextLineCount: inlineEdit.modifiedLineRange.length,
                originalDisplayRange: originalDisplayRange,
            };
        });
        this._previewTextModel = this._register(this._instantiationService.createInstance(TextModel, '', this._editor.getModel().getLanguageId(), { ...TextModel.DEFAULT_CREATION_OPTIONS, bracketPairColorizationOptions: { enabled: true, independentColorPoolPerBracketType: false } }, null));
        this._indicatorCyclicDependencyCircuitBreaker = observableValue(this, false);
        this._indicator = derivedWithStore(this, (reader, store) => {
            if (!this._indicatorCyclicDependencyCircuitBreaker.read(reader)) {
                return undefined;
            }
            const indicatorDisplayRange = derivedOpts({ owner: this, equalsFn: equalsIfDefined(itemEquals()) }, reader => {
                const ghostTextIndicator = this._ghostTextIndicator.read(reader);
                if (ghostTextIndicator) {
                    return ghostTextIndicator.lineRange;
                }
                const state = this._uiState.read(reader);
                if (state?.state?.kind === 'insertionMultiLine') {
                    return this._insertion.originalLines.read(reader);
                }
                return state?.originalDisplayRange;
            });
            const modelWithGhostTextSupport = derived(this, reader => {
                const model = this._model.read(reader);
                if (model) {
                    return model;
                }
                const ghostTextIndicator = this._ghostTextIndicator.read(reader);
                if (ghostTextIndicator) {
                    return ghostTextIndicator.model;
                }
                return model;
            });
            return store.add(this._instantiationService.createInstance(InlineEditsGutterIndicator, this._editorObs, indicatorDisplayRange, this._gutterIndicatorOffset, this._host, modelWithGhostTextSupport, this._inlineEditsIsHovered, this._focusIsInMenu));
        });
        this._inlineEditsIsHovered = derived(this, reader => {
            return this._sideBySide.isHovered.read(reader)
                || this._wordReplacementViews.read(reader).some(v => v.isHovered.read(reader))
                || this._deletion.isHovered.read(reader)
                || this._inlineDiffView.isHovered.read(reader)
                || this._lineReplacementView.isHovered.read(reader)
                || this._insertion.isHovered.read(reader);
        });
        this._gutterIndicatorOffset = derived(this, reader => {
            // TODO: have a better way to tell the gutter indicator view where the edit is inside a viewzone
            if (this._uiState.read(reader)?.state?.kind === 'insertionMultiLine') {
                return this._insertion.startLineOffset.read(reader);
            }
            return 0;
        });
        this._sideBySide = this._register(this._instantiationService.createInstance(InlineEditsSideBySideView, this._editor, this._model.map(m => m?.inlineEdit), this._previewTextModel, this._uiState.map(s => s && s.state?.kind === 'sideBySide' ? ({
            newTextLineCount: s.newTextLineCount,
            originalDisplayRange: s.originalDisplayRange,
        }) : undefined), this._tabAction));
        this._deletion = this._register(this._instantiationService.createInstance(InlineEditsDeletionView, this._editor, this._model.map(m => m?.inlineEdit), this._uiState.map(s => s && s.state?.kind === 'deletion' ? ({
            originalRange: s.state.originalRange,
            deletions: s.state.deletions,
        }) : undefined), this._tabAction));
        this._insertion = this._register(this._instantiationService.createInstance(InlineEditsInsertionView, this._editor, this._uiState.map(s => s && s.state?.kind === 'insertionMultiLine' ? ({
            lineNumber: s.state.lineNumber,
            startColumn: s.state.column,
            text: s.state.text,
        }) : undefined), this._tabAction));
        this._inlineDiffViewState = derived(this, reader => {
            const e = this._uiState.read(reader);
            if (!e || !e.state) {
                return undefined;
            }
            if (e.state.kind === 'wordReplacements' || e.state.kind === 'lineReplacement' || e.state.kind === 'insertionMultiLine' || e.state.kind === 'collapsed') {
                return undefined;
            }
            return {
                modifiedText: new StringText(e.newText),
                diff: e.diff,
                mode: e.state.kind,
                modifiedCodeEditor: this._sideBySide.previewEditor,
            };
        });
        this._inlineCollapsedView = this._register(this._instantiationService.createInstance(InlineEditsCollapsedView, this._editor, this._model.map((m, reader) => this._uiState.read(reader)?.state?.kind === 'collapsed' ? m?.inlineEdit : undefined)));
        this._inlineDiffView = this._register(new OriginalEditorInlineDiffView(this._editor, this._inlineDiffViewState, this._previewTextModel));
        this._wordReplacementViews = mapObservableArrayCached(this, this._uiState.map(s => s?.state?.kind === 'wordReplacements' ? s.state.replacements : []), (e, store) => {
            return store.add(this._instantiationService.createInstance(InlineEditsWordReplacementView, this._editorObs, e, this._tabAction));
        });
        this._lineReplacementView = this._register(this._instantiationService.createInstance(InlineEditsLineReplacementView, this._editorObs, this._uiState.map(s => s?.state?.kind === 'lineReplacement' ? ({
            originalRange: s.state.originalRange,
            modifiedRange: s.state.modifiedRange,
            modifiedLines: s.state.modifiedLines,
            replacements: s.state.replacements,
        }) : undefined), this._tabAction));
        this._useCodeShifting = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(s => s.edits.allowCodeShifting);
        this._renderSideBySide = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(s => s.edits.renderSideBySide);
        this._useMultiLineGhostText = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(s => s.edits.useMultiLineGhostText);
        this._register(autorunWithStore((reader, store) => {
            const model = this._model.read(reader);
            if (!model) {
                return;
            }
            store.add(Event.any(this._sideBySide.onDidClick, this._deletion.onDidClick, this._lineReplacementView.onDidClick, this._insertion.onDidClick, ...this._wordReplacementViews.read(reader).map(w => w.onDidClick), this._inlineDiffView.onDidClick)(e => {
                if (this._viewHasBeenShownLongerThan(350)) {
                    e.preventDefault();
                    model.accept();
                }
            }));
        }));
        this._indicator.recomputeInitiallyAndOnChange(this._store);
        this._wordReplacementViews.recomputeInitiallyAndOnChange(this._store);
        this._indicatorCyclicDependencyCircuitBreaker.set(true, undefined);
        this._constructorDone.set(true, undefined); // TODO: remove and use correct initialization order
    }
    getCacheId(model) {
        const inlineEdit = model.inlineEdit;
        if (this._host.get()?.inPartialAcceptFlow.get()) {
            return `${inlineEdit.inlineCompletion.id}_${inlineEdit.edit.edits.map(innerEdit => innerEdit.range.toString() + innerEdit.text).join(',')}`;
        }
        return inlineEdit.inlineCompletion.id;
    }
    determineView(model, reader, diff, newText, originalDisplayRange) {
        // Check if we can use the previous view if it is the same InlineCompletion as previously shown
        const inlineEdit = model.inlineEdit;
        const canUseCache = this._previousView?.id === this.getCacheId(model);
        const reconsiderViewEditorWidthChange = this._previousView?.editorWidth !== this._editorObs.layoutInfoWidth.read(reader) &&
            (this._previousView?.view === 'sideBySide' ||
                this._previousView?.view === 'lineReplacement');
        if (canUseCache && !reconsiderViewEditorWidthChange) {
            return this._previousView.view;
        }
        // Determine the view based on the edit / diff
        const inner = diff.flatMap(d => d.innerChanges ?? []);
        const isSingleInnerEdit = inner.length === 1;
        if (isSingleInnerEdit
            && this._useCodeShifting.read(reader) !== 'never'
            && isSingleLineInsertionAfterPosition(diff, inlineEdit.cursorPosition)) {
            return 'insertionInline';
        }
        const innerValues = inner.map(m => ({ original: inlineEdit.originalText.getValueOfRange(m.originalRange), modified: newText.getValueOfRange(m.modifiedRange) }));
        if (innerValues.every(({ original, modified }) => modified.trim() === '' && original.length > 0 && (original.length > modified.length || original.trim() !== ''))) {
            return 'deletion';
        }
        if (isSingleMultiLineInsertion(diff) && this._useMultiLineGhostText.read(reader) && this._useCodeShifting.read(reader) === 'always') {
            return 'insertionMultiLine';
        }
        const numOriginalLines = inlineEdit.originalLineRange.length;
        const numModifiedLines = inlineEdit.modifiedLineRange.length;
        const allInnerChangesNotTooLong = inner.every(m => TextLength.ofRange(m.originalRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH && TextLength.ofRange(m.modifiedRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH);
        if (allInnerChangesNotTooLong && isSingleInnerEdit && numOriginalLines === 1 && numModifiedLines === 1) {
            // Make sure there is no insertion, even if we grow them
            if (!inner.some(m => m.originalRange.isEmpty()) ||
                !growEditsUntilWhitespace(inner.map(m => new SingleTextEdit(m.originalRange, '')), inlineEdit.originalText).some(e => e.range.isEmpty() && TextLength.ofRange(e.range).columnCount < InlineEditsWordReplacementView.MAX_LENGTH)) {
                return 'wordReplacements';
            }
        }
        if (numOriginalLines > 0 && numModifiedLines > 0) {
            if (this._renderSideBySide.read(reader) !== 'never' && InlineEditsSideBySideView.fitsInsideViewport(this._editor, this._previewTextModel, inlineEdit, originalDisplayRange, reader)) {
                return 'sideBySide';
            }
            return 'lineReplacement';
        }
        return 'sideBySide';
    }
    determineRenderState(model, reader, diff, newText, originalDisplayRange) {
        const inlineEdit = model.inlineEdit;
        const view = this.determineView(model, reader, diff, newText, originalDisplayRange);
        this._previousView = { id: this.getCacheId(model), view, editorWidth: this._editor.getLayoutInfo().width, timestamp: Date.now() };
        switch (view) {
            case 'insertionInline': return { kind: 'insertionInline' };
            case 'sideBySide': return { kind: 'sideBySide' };
            case 'collapsed': return { kind: 'collapsed' };
        }
        const inner = diff.flatMap(d => d.innerChanges ?? []);
        if (view === 'deletion') {
            return {
                kind: 'deletion',
                originalRange: inlineEdit.originalLineRange,
                deletions: inner.map(m => m.originalRange),
            };
        }
        if (view === 'insertionMultiLine') {
            const change = inner[0];
            return {
                kind: 'insertionMultiLine',
                lineNumber: change.originalRange.startLineNumber,
                column: change.originalRange.startColumn,
                text: newText.getValueOfRange(change.modifiedRange),
            };
        }
        const replacements = inner.map(m => new SingleTextEdit(m.originalRange, newText.getValueOfRange(m.modifiedRange)));
        if (replacements.length === 0) {
            return undefined;
        }
        if (view === 'wordReplacements') {
            let grownEdits = growEditsToEntireWord(replacements, inlineEdit.originalText);
            if (grownEdits.some(e => e.range.isEmpty())) {
                grownEdits = growEditsUntilWhitespace(replacements, inlineEdit.originalText);
            }
            return {
                kind: 'wordReplacements',
                replacements: grownEdits,
            };
        }
        if (view === 'lineReplacement') {
            return {
                kind: 'lineReplacement',
                originalRange: inlineEdit.originalLineRange,
                modifiedRange: inlineEdit.modifiedLineRange,
                modifiedLines: inlineEdit.modifiedLineRange.mapToLineArray(line => newText.getLineAt(line)),
                replacements: inner.map(m => ({ originalRange: m.originalRange, modifiedRange: m.modifiedRange })),
            };
        }
        return undefined;
    }
    _viewHasBeenShownLongerThan(durationMs) {
        const viewCreationTime = this._previousView?.timestamp;
        if (!viewCreationTime) {
            throw new BugIndicatingError('viewHasBeenShownLongThan called before a view has been shown');
        }
        const currentTime = Date.now();
        return (currentTime - viewCreationTime) >= durationMs;
    }
};
InlineEditsView = InlineEditsView_1 = __decorate([
    __param(5, IInstantiationService)
], InlineEditsView);
export { InlineEditsView };
function isSingleLineInsertionAfterPosition(diff, position) {
    if (!position) {
        return false;
    }
    const pos = position;
    return diff.every(m => m.innerChanges.every(r => isStableWordInsertion(r)));
    function isStableWordInsertion(r) {
        if (!r.originalRange.isEmpty()) {
            return false;
        }
        const isInsertionWithinLine = r.modifiedRange.startLineNumber === r.modifiedRange.endLineNumber;
        if (!isInsertionWithinLine) {
            return false;
        }
        const insertPosition = r.originalRange.getStartPosition();
        if (pos.isBeforeOrEqual(insertPosition)) {
            return true;
        }
        if (insertPosition.lineNumber < pos.lineNumber) {
            return true;
        }
        return false;
    }
}
function isSingleMultiLineInsertion(diff) {
    const inner = diff.flatMap(d => d.innerChanges ?? []);
    if (inner.length !== 1) {
        return false;
    }
    const change = inner[0];
    if (!change.originalRange.isEmpty()) {
        return false;
    }
    if (change.modifiedRange.startLineNumber === change.modifiedRange.endLineNumber) {
        return false;
    }
    return true;
}
function growEditsToEntireWord(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => /^[a-zA-Z]$/.test(char));
}
function growEditsUntilWhitespace(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => !(/^\s$/.test(char)));
}
function _growEdits(replacements, originalText, fn) {
    const result = [];
    replacements.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
    for (const edit of replacements) {
        let startIndex = edit.range.startColumn - 1;
        let endIndex = edit.range.endColumn - 2;
        let prefix = '';
        let suffix = '';
        const startLineContent = originalText.getLineAt(edit.range.startLineNumber);
        const endLineContent = originalText.getLineAt(edit.range.endLineNumber);
        if (isIncluded(startLineContent[startIndex])) {
            // grow to the left
            while (isIncluded(startLineContent[startIndex - 1])) {
                prefix = startLineContent[startIndex - 1] + prefix;
                startIndex--;
            }
        }
        if (isIncluded(endLineContent[endIndex]) || endIndex < startIndex) {
            // grow to the right
            while (isIncluded(endLineContent[endIndex + 1])) {
                suffix += endLineContent[endIndex + 1];
                endIndex++;
            }
        }
        // create new edit and merge together if they are touching
        let newEdit = new SingleTextEdit(new Range(edit.range.startLineNumber, startIndex + 1, edit.range.endLineNumber, endIndex + 2), prefix + edit.text + suffix);
        if (result.length > 0 && Range.areIntersectingOrTouching(result[result.length - 1].range, newEdit.range)) {
            newEdit = SingleTextEdit.joinEdits([result.pop(), newEdit], originalText);
        }
        result.push(newEdit);
    }
    function isIncluded(c) {
        if (c === undefined) {
            return false;
        }
        return fn(c);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBNkMsd0JBQXdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN00sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTVHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFnQixjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RFLE9BQU8sRUFBNEIsaUNBQWlDLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkksT0FBTyxFQUFFLFNBQVMsRUFB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