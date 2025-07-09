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
import { mapFindFirst } from '../../../../../base/common/arraysFind.js';
import { itemsEquals } from '../../../../../base/common/equals.js';
import { BugIndicatingError, onUnexpectedError, onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedHandleChanges, derivedOpts, observableSignal, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction } from '../../../../../base/common/observable.js';
import { commonPrefixLength, firstNonWhitespaceIndex } from '../../../../../base/common/strings.js';
import { isDefined } from '../../../../../base/common/types.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { CursorColumns } from '../../../../common/core/cursorColumns.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { LineRange } from '../../../../common/core/lineRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { SingleTextEdit, TextEdit } from '../../../../common/core/textEdit.js';
import { TextLength } from '../../../../common/core/textLength.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { addPositions, getEndPositionsAfterApplying, getModifiedRangesAfterApplying, substringPos, subtractPositions } from '../utils.js';
import { AnimatedValue, easeOutCubic, ObservableAnimatedValue } from './animation.js';
import { computeGhostText } from './computeGhostText.js';
import { GhostText, ghostTextOrReplacementEquals, ghostTextsOrReplacementsEqual } from './ghostText.js';
import { InlineCompletionsSource } from './inlineCompletionsSource.js';
import { InlineEdit } from './inlineEdit.js';
import { singleTextEditAugments, singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
let InlineCompletionsModel = class InlineCompletionsModel extends Disposable {
    get isAcceptingPartially() { return this._isAcceptingPartially; }
    constructor(textModel, _selectedSuggestItem, _textModelVersionId, _positions, _debounceValue, _enabled, _editor, _instantiationService, _commandService, _languageConfigurationService, _accessibilityService) {
        super();
        this.textModel = textModel;
        this._selectedSuggestItem = _selectedSuggestItem;
        this._textModelVersionId = _textModelVersionId;
        this._positions = _positions;
        this._debounceValue = _debounceValue;
        this._enabled = _enabled;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._languageConfigurationService = _languageConfigurationService;
        this._accessibilityService = _accessibilityService;
        this._source = this._register(this._instantiationService.createInstance(InlineCompletionsSource, this.textModel, this._textModelVersionId, this._debounceValue));
        this._isActive = observableValue(this, false);
        this._onlyRequestInlineEditsSignal = observableSignal(this);
        this._forceUpdateExplicitlySignal = observableSignal(this);
        this._noDelaySignal = observableSignal(this);
        // We use a semantic id to keep the same inline completion selected even if the provider reorders the completions.
        this._selectedInlineCompletionId = observableValue(this, undefined);
        this.primaryPosition = derived(this, reader => this._positions.read(reader)[0] ?? new Position(1, 1));
        this._isAcceptingPartially = false;
        this._onDidAccept = new Emitter();
        this.onDidAccept = this._onDidAccept.event;
        this._editorObs = observableCodeEditor(this._editor);
        this._suggestPreviewEnabled = this._editorObs.getOption(123 /* EditorOption.suggest */).map(v => v.preview);
        this._suggestPreviewMode = this._editorObs.getOption(123 /* EditorOption.suggest */).map(v => v.previewMode);
        this._inlineSuggestMode = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(v => v.mode);
        this._inlineEditsEnabled = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(v => !!v.edits.enabled);
        this._inlineEditsShowCollapsedEnabled = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(s => s.edits.showCollapsed);
        this._lastShownInlineCompletionInfo = undefined;
        this._lastAcceptedInlineCompletionInfo = undefined;
        this._didUndoInlineEdits = derivedHandleChanges({
            owner: this,
            createEmptyChangeSummary: () => ({ didUndo: false }),
            handleChange: (ctx, changeSummary) => {
                changeSummary.didUndo = ctx.didChange(this._textModelVersionId) && !!ctx.change?.isUndoing;
                return true;
            }
        }, (reader, changeSummary) => {
            const versionId = this._textModelVersionId.read(reader);
            if (versionId !== null
                && this._lastAcceptedInlineCompletionInfo
                && this._lastAcceptedInlineCompletionInfo.textModelVersionIdAfter === versionId - 1
                && this._lastAcceptedInlineCompletionInfo.inlineCompletion.isInlineEdit
                && changeSummary.didUndo) {
                this._lastAcceptedInlineCompletionInfo = undefined;
                return true;
            }
            return false;
        });
        this._preserveCurrentCompletionReasons = new Set([
            VersionIdChangeReason.Redo,
            VersionIdChangeReason.Undo,
            VersionIdChangeReason.AcceptWord,
        ]);
        this.dontRefetchSignal = observableSignal(this);
        this._fetchInlineCompletionsPromise = derivedHandleChanges({
            owner: this,
            createEmptyChangeSummary: () => ({
                dontRefetch: false,
                preserveCurrentCompletion: false,
                inlineCompletionTriggerKind: InlineCompletionTriggerKind.Automatic,
                onlyRequestInlineEdits: false,
                shouldDebounce: true,
            }),
            handleChange: (ctx, changeSummary) => {
                /** @description fetch inline completions */
                if (ctx.didChange(this._textModelVersionId) && this._preserveCurrentCompletionReasons.has(this._getReason(ctx.change))) {
                    changeSummary.preserveCurrentCompletion = true;
                }
                else if (ctx.didChange(this._forceUpdateExplicitlySignal)) {
                    changeSummary.inlineCompletionTriggerKind = InlineCompletionTriggerKind.Explicit;
                }
                else if (ctx.didChange(this.dontRefetchSignal)) {
                    changeSummary.dontRefetch = true;
                }
                else if (ctx.didChange(this._onlyRequestInlineEditsSignal)) {
                    changeSummary.onlyRequestInlineEdits = true;
                }
                else if (ctx.didChange(this._noDelaySignal)) {
                    changeSummary.shouldDebounce = false;
                }
                return true;
            },
        }, (reader, changeSummary) => {
            this._source.clearOperationOnTextModelChange.read(reader); // Make sure the clear operation runs before the fetch operation
            this._noDelaySignal.read(reader);
            this.dontRefetchSignal.read(reader);
            this._onlyRequestInlineEditsSignal.read(reader);
            this._forceUpdateExplicitlySignal.read(reader);
            const shouldUpdate = (this._enabled.read(reader) && this._selectedSuggestItem.read(reader)) || this._isActive.read(reader);
            if (!shouldUpdate) {
                this._source.cancelUpdate();
                return undefined;
            }
            this._textModelVersionId.read(reader); // Refetch on text change
            const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.get();
            const suggestItem = this._selectedSuggestItem.read(reader);
            if (suggestWidgetInlineCompletions && !suggestItem) {
                const inlineCompletions = this._source.inlineCompletions.get();
                transaction(tx => {
                    /** @description Seed inline completions with (newer) suggest widget inline completions */
                    if (!inlineCompletions || suggestWidgetInlineCompletions.request.versionId > inlineCompletions.request.versionId) {
                        this._source.inlineCompletions.set(suggestWidgetInlineCompletions.clone(), tx);
                    }
                    this._source.clearSuggestWidgetInlineCompletions(tx);
                });
            }
            const cursorPosition = this.primaryPosition.get();
            if (changeSummary.dontRefetch) {
                return Promise.resolve(true);
            }
            if (this._didUndoInlineEdits.read(reader)) {
                transaction(tx => {
                    this._source.clear(tx);
                });
                return undefined;
            }
            let context = {
                triggerKind: changeSummary.inlineCompletionTriggerKind,
                selectedSuggestionInfo: suggestItem?.toSelectedSuggestionInfo(),
                includeInlineCompletions: !changeSummary.onlyRequestInlineEdits,
                includeInlineEdits: this._inlineEditsEnabled.read(reader),
            };
            if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                if (this.textModel.getAlternativeVersionId() === this._lastShownInlineCompletionInfo?.alternateTextModelVersionId) {
                    // When undoing back to a version where an inline edit/completion was shown,
                    // we want to show an inline edit (or completion) again if it was originally an inline edit (or completion).
                    context = {
                        ...context,
                        includeInlineCompletions: !this._lastShownInlineCompletionInfo.inlineCompletion.isInlineEdit,
                        includeInlineEdits: this._lastShownInlineCompletionInfo.inlineCompletion.isInlineEdit,
                    };
                }
            }
            const itemToPreserveCandidate = this.selectedInlineCompletion.get() ?? this._inlineCompletionItems.get()?.inlineEdit;
            const itemToPreserve = changeSummary.preserveCurrentCompletion || itemToPreserveCandidate?.forwardStable
                ? itemToPreserveCandidate : undefined;
            const userJumpedToActiveCompletion = this._jumpedToId.map(jumpedTo => !!jumpedTo && jumpedTo === this._inlineCompletionItems.get()?.inlineEdit?.semanticId);
            return this._source.fetch(cursorPosition, context, itemToPreserve, changeSummary.shouldDebounce, userJumpedToActiveCompletion);
        });
        this._inlineCompletionItems = derivedOpts({ owner: this }, reader => {
            const c = this._source.inlineCompletions.read(reader);
            if (!c) {
                return undefined;
            }
            const cursorPosition = this.primaryPosition.read(reader);
            let inlineEdit = undefined;
            const visibleCompletions = [];
            for (const completion of c.inlineCompletions) {
                if (!completion.sourceInlineCompletion.isInlineEdit) {
                    if (completion.isVisible(this.textModel, cursorPosition, reader)) {
                        visibleCompletions.push(completion);
                    }
                }
                else {
                    inlineEdit = completion;
                }
            }
            if (visibleCompletions.length !== 0) {
                // Don't show the inline edit if there is a visible completion
                inlineEdit = undefined;
            }
            return {
                inlineCompletions: visibleCompletions,
                inlineEdit,
            };
        });
        this._filteredInlineCompletionItems = derivedOpts({ owner: this, equalsFn: itemsEquals() }, reader => {
            const c = this._inlineCompletionItems.read(reader);
            return c?.inlineCompletions ?? [];
        });
        this.selectedInlineCompletionIndex = derived(this, (reader) => {
            const selectedInlineCompletionId = this._selectedInlineCompletionId.read(reader);
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this._selectedInlineCompletionId === undefined ? -1
                : filteredCompletions.findIndex(v => v.semanticId === selectedInlineCompletionId);
            if (idx === -1) {
                // Reset the selection so that the selection does not jump back when it appears again
                this._selectedInlineCompletionId.set(undefined, undefined);
                return 0;
            }
            return idx;
        });
        this.selectedInlineCompletion = derived(this, (reader) => {
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this.selectedInlineCompletionIndex.read(reader);
            return filteredCompletions[idx];
        });
        this.activeCommands = derivedOpts({ owner: this, equalsFn: itemsEquals() }, r => this.selectedInlineCompletion.read(r)?.source.inlineCompletions.commands ?? []);
        this.lastTriggerKind = this._source.inlineCompletions.map(this, v => v?.request.context.triggerKind);
        this.inlineCompletionsCount = derived(this, reader => {
            if (this.lastTriggerKind.read(reader) === InlineCompletionTriggerKind.Explicit) {
                return this._filteredInlineCompletionItems.read(reader).length;
            }
            else {
                return undefined;
            }
        });
        this._hasVisiblePeekWidgets = derived(this, reader => this._editorObs.openedPeekWidgets.read(reader) > 0);
        this.state = derivedOpts({
            owner: this,
            equalsFn: (a, b) => {
                if (!a || !b) {
                    return a === b;
                }
                if (a.kind === 'ghostText' && b.kind === 'ghostText') {
                    return ghostTextsOrReplacementsEqual(a.ghostTexts, b.ghostTexts)
                        && a.inlineCompletion === b.inlineCompletion
                        && a.suggestItem === b.suggestItem;
                }
                else if (a.kind === 'inlineEdit' && b.kind === 'inlineEdit') {
                    return a.inlineEdit.equals(b.inlineEdit) && a.cursorAtInlineEdit === b.cursorAtInlineEdit;
                }
                return false;
            }
        }, (reader) => {
            const model = this.textModel;
            const item = this._inlineCompletionItems.read(reader);
            const inlineEditResult = item?.inlineEdit;
            if (inlineEditResult) {
                if (this._hasVisiblePeekWidgets.read(reader)) {
                    return undefined;
                }
                let edit = inlineEditResult.toSingleTextEdit(reader);
                edit = singleTextRemoveCommonPrefix(edit, model);
                const cursorPos = this.primaryPosition.read(reader);
                const cursorAtInlineEdit = LineRange.fromRangeInclusive(edit.range).addMargin(1, 1).contains(cursorPos.lineNumber);
                const cursorInsideShowRange = cursorAtInlineEdit || (inlineEditResult.inlineCompletion.cursorShowRange?.containsPosition(cursorPos) ?? true);
                if (!cursorInsideShowRange && !this._inAcceptFlow.read(reader)) {
                    return undefined;
                }
                const commands = inlineEditResult.inlineCompletion.source.inlineCompletions.commands;
                const inlineEdit = new InlineEdit(edit, commands ?? [], inlineEditResult.inlineCompletion);
                const edits = inlineEditResult.updatedEdit.read(reader);
                const e = edits ? TextEdit.fromOffsetEdit(edits, new TextModelText(this.textModel)).edits : [edit];
                return { kind: 'inlineEdit', inlineEdit, inlineCompletion: inlineEditResult, edits: e, cursorAtInlineEdit };
            }
            const suggestItem = this._selectedSuggestItem.read(reader);
            if (suggestItem) {
                const suggestCompletionEdit = singleTextRemoveCommonPrefix(suggestItem.toSingleTextEdit(), model);
                const augmentation = this._computeAugmentation(suggestCompletionEdit, reader);
                const isSuggestionPreviewEnabled = this._suggestPreviewEnabled.read(reader);
                if (!isSuggestionPreviewEnabled && !augmentation) {
                    return undefined;
                }
                const fullEdit = augmentation?.edit ?? suggestCompletionEdit;
                const fullEditPreviewLength = augmentation ? augmentation.edit.text.length - suggestCompletionEdit.text.length : 0;
                const mode = this._suggestPreviewMode.read(reader);
                const positions = this._positions.read(reader);
                const edits = [fullEdit, ...getSecondaryEdits(this.textModel, positions, fullEdit)];
                const ghostTexts = edits
                    .map((edit, idx) => computeGhostText(edit, model, mode, positions[idx], fullEditPreviewLength))
                    .filter(isDefined);
                const primaryGhostText = ghostTexts[0] ?? new GhostText(fullEdit.range.endLineNumber, []);
                return { kind: 'ghostText', edits, primaryGhostText, ghostTexts, inlineCompletion: augmentation?.completion, suggestItem };
            }
            else {
                if (!this._isActive.read(reader)) {
                    return undefined;
                }
                const inlineCompletion = this.selectedInlineCompletion.read(reader);
                if (!inlineCompletion) {
                    return undefined;
                }
                const replacement = inlineCompletion.toSingleTextEdit(reader);
                const mode = this._inlineSuggestMode.read(reader);
                const positions = this._positions.read(reader);
                const edits = [replacement, ...getSecondaryEdits(this.textModel, positions, replacement)];
                const ghostTexts = edits
                    .map((edit, idx) => computeGhostText(edit, model, mode, positions[idx], 0))
                    .filter(isDefined);
                if (!ghostTexts[0]) {
                    return undefined;
                }
                return { kind: 'ghostText', edits, primaryGhostText: ghostTexts[0], ghostTexts, inlineCompletion, suggestItem: undefined };
            }
        });
        this.status = derived(this, reader => {
            if (this._source.loading.read(reader)) {
                return 'loading';
            }
            const s = this.state.read(reader);
            if (s?.kind === 'ghostText') {
                return 'ghostText';
            }
            if (s?.kind === 'inlineEdit') {
                return 'inlineEdit';
            }
            return 'noSuggestion';
        });
        this.inlineCompletionState = derived(this, reader => {
            const s = this.state.read(reader);
            if (!s || s.kind !== 'ghostText') {
                return undefined;
            }
            if (this._editorObs.inComposition.read(reader)) {
                return undefined;
            }
            return s;
        });
        this.inlineEditState = derived(this, reader => {
            const s = this.state.read(reader);
            if (!s || s.kind !== 'inlineEdit') {
                return undefined;
            }
            return s;
        });
        this.inlineEditAvailable = derived(this, reader => {
            const s = this.inlineEditState.read(reader);
            return !!s;
        });
        this.warning = derived(this, reader => {
            return this.inlineCompletionState.read(reader)?.inlineCompletion?.sourceInlineCompletion.warning;
        });
        this.ghostTexts = derivedOpts({ owner: this, equalsFn: ghostTextsOrReplacementsEqual }, reader => {
            const v = this.inlineCompletionState.read(reader);
            if (!v) {
                return undefined;
            }
            return v.ghostTexts;
        });
        this.primaryGhostText = derivedOpts({ owner: this, equalsFn: ghostTextOrReplacementEquals }, reader => {
            const v = this.inlineCompletionState.read(reader);
            if (!v) {
                return undefined;
            }
            return v?.primaryGhostText;
        });
        this.showCollapsed = derived(this, reader => {
            const state = this.state.read(reader);
            if (!state || state.kind !== 'inlineEdit') {
                return false;
            }
            const isCurrentModelVersion = state.inlineCompletion.updatedEditModelVersion === this._textModelVersionId.read(reader);
            return (this._inlineEditsShowCollapsedEnabled.read(reader) || !isCurrentModelVersion)
                && this._jumpedToId.read(reader) !== state.inlineCompletion.semanticId
                && !this._inAcceptFlow.read(reader);
        });
        this._tabShouldIndent = derived(this, reader => {
            if (this._inAcceptFlow.read(reader)) {
                return false;
            }
            function isMultiLine(range) {
                return range.startLineNumber !== range.endLineNumber;
            }
            function getNonIndentationRange(model, lineNumber) {
                const columnStart = model.getLineIndentColumn(lineNumber);
                const lastNonWsColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
                const columnEnd = Math.max(lastNonWsColumn, columnStart);
                return new Range(lineNumber, columnStart, lineNumber, columnEnd);
            }
            const selections = this._editorObs.selections.read(reader);
            return selections?.some(s => {
                if (s.isEmpty()) {
                    return this.textModel.getLineLength(s.startLineNumber) === 0;
                }
                else {
                    return isMultiLine(s) || s.containsRange(getNonIndentationRange(this.textModel, s.startLineNumber));
                }
            });
        });
        this.tabShouldJumpToInlineEdit = derived(this, reader => {
            if (this._tabShouldIndent.read(reader)) {
                return false;
            }
            const s = this.inlineEditState.read(reader);
            if (!s) {
                return false;
            }
            if (this.showCollapsed.read(reader)) {
                return true;
            }
            return !s.cursorAtInlineEdit;
        });
        this.tabShouldAcceptInlineEdit = derived(this, reader => {
            const s = this.inlineEditState.read(reader);
            if (!s) {
                return false;
            }
            if (this.showCollapsed.read(reader)) {
                return false;
            }
            if (s.inlineEdit.range.startLineNumber === this._editorObs.cursorLineNumber.read(reader)) {
                return true;
            }
            if (this._jumpedToId.read(reader) === s.inlineCompletion.semanticId) {
                return true;
            }
            if (this._tabShouldIndent.read(reader)) {
                return false;
            }
            return s.cursorAtInlineEdit;
        });
        // TODO: clean this up if we keep it
        this._inAcceptPartialFlow = observableValue(this, false);
        this.inPartialAcceptFlow = this._inAcceptPartialFlow;
        this._jumpedToId = observableValue(this, undefined);
        this._inAcceptFlow = observableValue(this, false);
        this.inAcceptFlow = this._inAcceptFlow;
        this._register(recomputeInitiallyAndOnChange(this._fetchInlineCompletionsPromise));
        let lastItem = undefined;
        this._register(autorun(reader => {
            /** @description call handleItemDidShow */
            const item = this.inlineCompletionState.read(reader);
            const completion = item?.inlineCompletion;
            if (completion?.semanticId !== lastItem?.semanticId) {
                lastItem = completion;
                if (completion) {
                    const i = completion.inlineCompletion;
                    const src = i.source;
                    src.provider.handleItemDidShow?.(src.inlineCompletions, i.sourceInlineCompletion, i.insertText);
                }
            }
        }));
        this._register(autorun(reader => {
            /** @description handle text edits collapsing */
            const inlineCompletions = this._source.inlineCompletions.read(reader);
            if (!inlineCompletions) {
                return;
            }
            for (const inlineCompletion of inlineCompletions.inlineCompletions) {
                if (inlineCompletion.updatedEdit.read(reader) === undefined) {
                    this.stop();
                    break;
                }
            }
        }));
        this._register(autorun(reader => {
            this._editorObs.versionId.read(reader);
            this._inAcceptFlow.set(false, undefined);
        }));
        this._register(autorun(reader => {
            const jumpToReset = this.state.map(s => !s || s.kind === 'inlineEdit' && !s.cursorAtInlineEdit).read(reader);
            if (jumpToReset) {
                this._jumpedToId.set(undefined, undefined);
            }
        }));
        const inlineEditSemanticId = this.inlineEditState.map(s => s?.inlineCompletion.semanticId);
        this._register(autorun(reader => {
            const id = inlineEditSemanticId.read(reader);
            if (id) {
                this._editor.pushUndoStop();
                this._lastShownInlineCompletionInfo = {
                    alternateTextModelVersionId: this.textModel.getAlternativeVersionId(),
                    inlineCompletion: this.state.get().inlineCompletion.inlineCompletion,
                };
            }
        }));
        this._didUndoInlineEdits.recomputeInitiallyAndOnChange(this._store);
    }
    debugGetSelectedSuggestItem() {
        return this._selectedSuggestItem;
    }
    getIndentationInfo(reader) {
        let startsWithIndentation = false;
        let startsWithIndentationLessThanTabSize = true;
        const ghostText = this?.primaryGhostText.read(reader);
        if (!!this?._selectedSuggestItem && ghostText && ghostText.parts.length > 0) {
            const { column, lines } = ghostText.parts[0];
            const firstLine = lines[0].line;
            const indentationEndColumn = this.textModel.getLineIndentColumn(ghostText.lineNumber);
            const inIndentation = column <= indentationEndColumn;
            if (inIndentation) {
                let firstNonWsIdx = firstNonWhitespaceIndex(firstLine);
                if (firstNonWsIdx === -1) {
                    firstNonWsIdx = firstLine.length - 1;
                }
                startsWithIndentation = firstNonWsIdx > 0;
                const tabSize = this.textModel.getOptions().tabSize;
                const visibleColumnIndentation = CursorColumns.visibleColumnFromColumn(firstLine, firstNonWsIdx + 1, tabSize);
                startsWithIndentationLessThanTabSize = visibleColumnIndentation < tabSize;
            }
        }
        return {
            startsWithIndentation,
            startsWithIndentationLessThanTabSize,
        };
    }
    _getReason(e) {
        if (e?.isUndoing) {
            return VersionIdChangeReason.Undo;
        }
        if (e?.isRedoing) {
            return VersionIdChangeReason.Redo;
        }
        if (this.isAcceptingPartially) {
            return VersionIdChangeReason.AcceptWord;
        }
        return VersionIdChangeReason.Other;
    }
    async trigger(tx, options) {
        subtransaction(tx, tx => {
            if (options?.onlyFetchInlineEdits) {
                this._onlyRequestInlineEditsSignal.trigger(tx);
            }
            if (options?.noDelay) {
                this._noDelaySignal.trigger(tx);
            }
            this._isActive.set(true, tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    async triggerExplicitly(tx, onlyFetchInlineEdits = false) {
        subtransaction(tx, tx => {
            if (onlyFetchInlineEdits) {
                this._onlyRequestInlineEditsSignal.trigger(tx);
            }
            this._isActive.set(true, tx);
            this._inAcceptFlow.set(true, tx);
            this._forceUpdateExplicitlySignal.trigger(tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    stop(stopReason = 'automatic', tx) {
        subtransaction(tx, tx => {
            if (stopReason === 'explicitCancel') {
                const inlineCompletion = this.state.get()?.inlineCompletion;
                const source = inlineCompletion?.source;
                const sourceInlineCompletion = inlineCompletion?.sourceInlineCompletion;
                if (sourceInlineCompletion && source?.provider.handleRejection) {
                    source.provider.handleRejection(source.inlineCompletions, sourceInlineCompletion);
                }
            }
            this._inAcceptPartialFlow.set(false, tx);
            this._isActive.set(false, tx);
            this._source.clear(tx);
        });
    }
    _computeAugmentation(suggestCompletion, reader) {
        const model = this.textModel;
        const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.read(reader);
        const candidateInlineCompletions = suggestWidgetInlineCompletions
            ? suggestWidgetInlineCompletions.inlineCompletions
            : [this.selectedInlineCompletion.read(reader)].filter(isDefined);
        const augmentedCompletion = mapFindFirst(candidateInlineCompletions, completion => {
            let r = completion.toSingleTextEdit(reader);
            r = singleTextRemoveCommonPrefix(r, model, Range.fromPositions(r.range.getStartPosition(), suggestCompletion.range.getEndPosition()));
            return singleTextEditAugments(r, suggestCompletion) ? { completion, edit: r } : undefined;
        });
        return augmentedCompletion;
    }
    async _deltaSelectedInlineCompletionIndex(delta) {
        await this.triggerExplicitly();
        const completions = this._filteredInlineCompletionItems.get() || [];
        if (completions.length > 0) {
            const newIdx = (this.selectedInlineCompletionIndex.get() + delta + completions.length) % completions.length;
            this._selectedInlineCompletionId.set(completions[newIdx].semanticId, undefined);
        }
        else {
            this._selectedInlineCompletionId.set(undefined, undefined);
        }
    }
    async next() { await this._deltaSelectedInlineCompletionIndex(1); }
    async previous() { await this._deltaSelectedInlineCompletionIndex(-1); }
    async accept(editor = this._editor) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        if (this._inAcceptPartialFlow.get()) {
            this._inAcceptPartialFlow.set(false, undefined);
            this.jump();
            return;
        }
        let completionWithUpdatedRange;
        const state = this.state.get();
        if (state?.kind === 'ghostText') {
            if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
                return;
            }
            completionWithUpdatedRange = state.inlineCompletion;
        }
        else if (state?.kind === 'inlineEdit') {
            completionWithUpdatedRange = state.inlineCompletion;
        }
        else {
            return;
        }
        const completion = completionWithUpdatedRange.toInlineCompletion(undefined);
        if (completion.command) {
            // Make sure the completion list will not be disposed.
            completion.source.addRef();
        }
        editor.pushUndoStop();
        if (completion.snippetInfo) {
            editor.executeEdits('inlineSuggestion.accept', [
                EditOperation.replace(completion.range, ''),
                ...completion.additionalTextEdits
            ]);
            editor.setPosition(completion.snippetInfo.range.getStartPosition(), 'inlineCompletionAccept');
            SnippetController2.get(editor)?.insert(completion.snippetInfo.snippet, { undoStopBefore: false });
        }
        else {
            const edits = state.edits;
            const selections = getEndPositionsAfterApplying(edits).map(p => Selection.fromPositions(p));
            editor.executeEdits('inlineSuggestion.accept', [
                ...edits.map(edit => EditOperation.replace(edit.range, edit.text)),
                ...completion.additionalTextEdits
            ]);
            editor.setSelections(state.kind === 'inlineEdit' ? selections.slice(-1) : selections, 'inlineCompletionAccept');
            if (state.kind === 'inlineEdit' && !this._accessibilityService.isMotionReduced()) {
                // we can assume that edits is sorted!
                const editRanges = new TextEdit(edits).getNewRanges();
                const dec = this._store.add(new FadeoutDecoration(editor, editRanges, () => {
                    this._store.delete(dec);
                }));
            }
        }
        this._onDidAccept.fire();
        // Reset before invoking the command, as the command might cause a follow up trigger (which we don't want to reset).
        this.stop();
        if (completion.command) {
            await this._commandService
                .executeCommand(completion.command.id, ...(completion.command.arguments || []))
                .then(undefined, onUnexpectedExternalError);
            completion.source.removeRef();
        }
        this._inAcceptFlow.set(true, undefined);
        this._lastAcceptedInlineCompletionInfo = { textModelVersionIdAfter: this.textModel.getVersionId(), inlineCompletion: completion };
    }
    async acceptNextWord(editor) {
        await this._acceptNext(editor, (pos, text) => {
            const langId = this.textModel.getLanguageIdAtPosition(pos.lineNumber, pos.column);
            const config = this._languageConfigurationService.getLanguageConfiguration(langId);
            const wordRegExp = new RegExp(config.wordDefinition.source, config.wordDefinition.flags.replace('g', ''));
            const m1 = text.match(wordRegExp);
            let acceptUntilIndexExclusive = 0;
            if (m1 && m1.index !== undefined) {
                if (m1.index === 0) {
                    acceptUntilIndexExclusive = m1[0].length;
                }
                else {
                    acceptUntilIndexExclusive = m1.index;
                }
            }
            else {
                acceptUntilIndexExclusive = text.length;
            }
            const wsRegExp = /\s+/g;
            const m2 = wsRegExp.exec(text);
            if (m2 && m2.index !== undefined) {
                if (m2.index + m2[0].length < acceptUntilIndexExclusive) {
                    acceptUntilIndexExclusive = m2.index + m2[0].length;
                }
            }
            return acceptUntilIndexExclusive;
        }, 0 /* PartialAcceptTriggerKind.Word */);
    }
    async acceptNextLine(editor) {
        await this._acceptNext(editor, (pos, text) => {
            const m = text.match(/\n/);
            if (m && m.index !== undefined) {
                return m.index + 1;
            }
            return text.length;
        }, 1 /* PartialAcceptTriggerKind.Line */);
    }
    async _acceptNext(editor, getAcceptUntilIndex, kind) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.inlineCompletionState.get();
        if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
            return;
        }
        const ghostText = state.primaryGhostText;
        const completion = state.inlineCompletion.toInlineCompletion(undefined);
        if (completion.snippetInfo || completion.filterText !== completion.insertText) {
            // not in WYSIWYG mode, partial commit might change completion, thus it is not supported
            await this.accept(editor);
            return;
        }
        const firstPart = ghostText.parts[0];
        const ghostTextPos = new Position(ghostText.lineNumber, firstPart.column);
        const ghostTextVal = firstPart.text;
        const acceptUntilIndexExclusive = getAcceptUntilIndex(ghostTextPos, ghostTextVal);
        if (acceptUntilIndexExclusive === ghostTextVal.length && ghostText.parts.length === 1) {
            this.accept(editor);
            return;
        }
        const partialGhostTextVal = ghostTextVal.substring(0, acceptUntilIndexExclusive);
        const positions = this._positions.get();
        const cursorPosition = positions[0];
        // Executing the edit might free the completion, so we have to hold a reference on it.
        completion.source.addRef();
        try {
            this._isAcceptingPartially = true;
            try {
                editor.pushUndoStop();
                const replaceRange = Range.fromPositions(cursorPosition, ghostTextPos);
                const newText = editor.getModel().getValueInRange(replaceRange) + partialGhostTextVal;
                const primaryEdit = new SingleTextEdit(replaceRange, newText);
                const edits = [primaryEdit, ...getSecondaryEdits(this.textModel, positions, primaryEdit)];
                const selections = getEndPositionsAfterApplying(edits).map(p => Selection.fromPositions(p));
                editor.executeEdits('inlineSuggestion.accept', edits.map(edit => EditOperation.replace(edit.range, edit.text)));
                editor.setSelections(selections, 'inlineCompletionPartialAccept');
                editor.revealPositionInCenterIfOutsideViewport(editor.getPosition(), 1 /* ScrollType.Immediate */);
            }
            finally {
                this._isAcceptingPartially = false;
            }
            if (completion.source.provider.handlePartialAccept) {
                const acceptedRange = Range.fromPositions(completion.range.getStartPosition(), TextLength.ofText(partialGhostTextVal).addToPosition(ghostTextPos));
                // This assumes that the inline completion and the model use the same EOL style.
                const text = editor.getModel().getValueInRange(acceptedRange, 1 /* EndOfLinePreference.LF */);
                const acceptedLength = text.length;
                completion.source.provider.handlePartialAccept(completion.source.inlineCompletions, completion.sourceInlineCompletion, acceptedLength, { kind, acceptedLength: acceptedLength, });
            }
        }
        finally {
            completion.source.removeRef();
        }
    }
    async acceptNextInlineEditPart(editor) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.inlineEditState.get();
        const updatedEdit = state?.inlineCompletion.updatedEdit.get();
        const completion = state?.inlineCompletion.toInlineCompletion(undefined);
        if (!updatedEdit || updatedEdit.isEmpty || !completion) {
            return;
        }
        const nextPart = updatedEdit.edits[0];
        const edit = new SingleTextEdit(Range.fromPositions(this.textModel.getPositionAt(nextPart.replaceRange.start), this.textModel.getPositionAt(nextPart.replaceRange.endExclusive)), nextPart.newText);
        const cursorAtStartPosition = this._editor.getSelection()?.getStartPosition().equals(edit.range.getStartPosition());
        if (!cursorAtStartPosition || !this._inAcceptPartialFlow.get()) {
            this._inAcceptPartialFlow.set(true, undefined);
            this.jump();
            return;
        }
        const partToJumpToNext = updatedEdit.edits[1] ?? undefined;
        const editToJumpToNext = partToJumpToNext ? new SingleTextEdit(Range.fromPositions(this.textModel.getPositionAt(partToJumpToNext.replaceRange.start), this.textModel.getPositionAt(partToJumpToNext.replaceRange.endExclusive)), partToJumpToNext.newText) : undefined;
        // Executing the edit might free the completion, so we have to hold a reference on it.
        completion.source.addRef();
        try {
            this._isAcceptingPartially = true;
            try {
                editor.pushUndoStop();
                let selections;
                if (editToJumpToNext) {
                    const [_, rangeOfEditToJumpTo] = getModifiedRangesAfterApplying([edit, editToJumpToNext]);
                    selections = [Selection.fromPositions(rangeOfEditToJumpTo.getStartPosition())];
                }
                else {
                    selections = getEndPositionsAfterApplying([edit]).map(p => Selection.fromPositions(p));
                }
                const edits = [edit];
                editor.executeEdits('inlineSuggestion.accept', edits.map(edit => EditOperation.replace(edit.range, edit.text)));
                editor.setSelections(selections, 'inlineCompletionPartialAccept');
                editor.revealPositionInCenterIfOutsideViewport(editor.getPosition(), 1 /* ScrollType.Immediate */);
            }
            finally {
                this._isAcceptingPartially = false;
            }
        }
        finally {
            completion.source.removeRef();
        }
    }
    handleSuggestAccepted(item) {
        const itemEdit = singleTextRemoveCommonPrefix(item.toSingleTextEdit(), this.textModel);
        const augmentedCompletion = this._computeAugmentation(itemEdit, undefined);
        if (!augmentedCompletion) {
            return;
        }
        const source = augmentedCompletion.completion.source;
        const sourceInlineCompletion = augmentedCompletion.completion.sourceInlineCompletion;
        const completion = augmentedCompletion.completion.toInlineCompletion(undefined);
        // This assumes that the inline completion and the model use the same EOL style.
        const alreadyAcceptedLength = this.textModel.getValueInRange(completion.range, 1 /* EndOfLinePreference.LF */).length;
        const acceptedLength = alreadyAcceptedLength + itemEdit.text.length;
        source.provider.handlePartialAccept?.(source.inlineCompletions, sourceInlineCompletion, itemEdit.text.length, {
            kind: 2 /* PartialAcceptTriggerKind.Suggest */,
            acceptedLength,
        });
    }
    extractReproSample() {
        const value = this.textModel.getValue();
        const item = this.state.get()?.inlineCompletion?.toInlineCompletion(undefined);
        return {
            documentValue: value,
            inlineCompletion: item?.sourceInlineCompletion,
        };
    }
    jump() {
        const s = this.inlineEditState.get();
        if (!s) {
            return;
        }
        transaction(tx => {
            this._jumpedToId.set(s.inlineCompletion.semanticId, tx);
            this.dontRefetchSignal.trigger(tx);
            const edit = s.inlineCompletion.toSingleTextEdit(undefined);
            this._editor.setPosition(edit.range.getStartPosition(), 'inlineCompletions.jump');
            // TODO: consider using view information to reveal it
            const isSingleLineChange = edit.range.startLineNumber === edit.range.endLineNumber && !edit.text.includes('\n');
            if (isSingleLineChange) {
                this._editor.revealPosition(edit.range.getStartPosition());
            }
            else {
                const revealRange = new Range(edit.range.startLineNumber - 1, 1, edit.range.endLineNumber + 1, 1);
                this._editor.revealRange(revealRange, 1 /* ScrollType.Immediate */);
            }
            this._editor.focus();
        });
    }
    async handleInlineEditShown(inlineCompletion) {
        if (inlineCompletion.didShow) {
            return;
        }
        inlineCompletion.markAsShown();
        inlineCompletion.source.provider.handleItemDidShow?.(inlineCompletion.source.inlineCompletions, inlineCompletion.sourceInlineCompletion, inlineCompletion.insertText);
        if (inlineCompletion.shownCommand) {
            await this._commandService.executeCommand(inlineCompletion.shownCommand.id, ...(inlineCompletion.shownCommand.arguments || []));
        }
    }
};
InlineCompletionsModel = __decorate([
    __param(7, IInstantiationService),
    __param(8, ICommandService),
    __param(9, ILanguageConfigurationService),
    __param(10, IAccessibilityService)
], InlineCompletionsModel);
export { InlineCompletionsModel };
export var VersionIdChangeReason;
(function (VersionIdChangeReason) {
    VersionIdChangeReason[VersionIdChangeReason["Undo"] = 0] = "Undo";
    VersionIdChangeReason[VersionIdChangeReason["Redo"] = 1] = "Redo";
    VersionIdChangeReason[VersionIdChangeReason["AcceptWord"] = 2] = "AcceptWord";
    VersionIdChangeReason[VersionIdChangeReason["Other"] = 3] = "Other";
})(VersionIdChangeReason || (VersionIdChangeReason = {}));
export function getSecondaryEdits(textModel, positions, primaryEdit) {
    if (positions.length === 1) {
        // No secondary cursor positions
        return [];
    }
    const primaryPosition = positions[0];
    const secondaryPositions = positions.slice(1);
    const primaryEditStartPosition = primaryEdit.range.getStartPosition();
    const primaryEditEndPosition = primaryEdit.range.getEndPosition();
    const replacedTextAfterPrimaryCursor = textModel.getValueInRange(Range.fromPositions(primaryPosition, primaryEditEndPosition));
    const positionWithinTextEdit = subtractPositions(primaryPosition, primaryEditStartPosition);
    if (positionWithinTextEdit.lineNumber < 1) {
        onUnexpectedError(new BugIndicatingError(`positionWithinTextEdit line number should be bigger than 0.
			Invalid subtraction between ${primaryPosition.toString()} and ${primaryEditStartPosition.toString()}`));
        return [];
    }
    const secondaryEditText = substringPos(primaryEdit.text, positionWithinTextEdit);
    return secondaryPositions.map(pos => {
        const posEnd = addPositions(subtractPositions(pos, primaryEditStartPosition), primaryEditEndPosition);
        const textAfterSecondaryCursor = textModel.getValueInRange(Range.fromPositions(pos, posEnd));
        const l = commonPrefixLength(replacedTextAfterPrimaryCursor, textAfterSecondaryCursor);
        const range = Range.fromPositions(pos, pos.delta(0, l));
        return new SingleTextEdit(range, secondaryEditText);
    });
}
class FadeoutDecoration extends Disposable {
    constructor(editor, ranges, onDispose) {
        super();
        if (onDispose) {
            this._register({ dispose: () => onDispose() });
        }
        this._register(observableCodeEditor(editor).setDecorations(constObservable(ranges.map(range => ({
            range: range,
            options: {
                description: 'animation',
                className: 'edits-fadeout-decoration',
                zIndex: 1,
            }
        })))));
        const animation = new AnimatedValue(1, 0, 1000, easeOutCubic);
        const val = new ObservableAnimatedValue(animation);
        this._register(autorun(reader => {
            const opacity = val.getValue(reader);
            editor.getContainerDomNode().style.setProperty('--animation-opacity', opacity.toString());
            if (animation.isFinished()) {
                this.dispose();
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2lubGluZUNvbXBsZXRpb25zTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBNkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDMVIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVuRSxPQUFPLEVBQXNELDJCQUEyQixFQUE0QixNQUFNLGlDQUFpQyxDQUFDO0FBQzVKLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUcxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLDRCQUE0QixFQUFFLDhCQUE4QixFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMxSSxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQTBCLDRCQUE0QixFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEksT0FBTyxFQUFvQyx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUczRixJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFZckQsSUFBVyxvQkFBb0IsS0FBSyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFheEUsWUFDaUIsU0FBcUIsRUFDcEIsb0JBQThELEVBQy9ELG1CQUFnRyxFQUMvRixVQUE0QyxFQUM1QyxjQUEyQyxFQUMzQyxRQUE4QixFQUM5QixPQUFvQixFQUNkLHFCQUE2RCxFQUNuRSxlQUFpRCxFQUNuQyw2QkFBNkUsRUFDckYscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBWlEsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUNwQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTBDO1FBQy9ELHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBNkU7UUFDL0YsZUFBVSxHQUFWLFVBQVUsQ0FBa0M7UUFDNUMsbUJBQWMsR0FBZCxjQUFjLENBQTZCO1FBQzNDLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBQzlCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDRywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2xELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNsQixrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBQ3BFLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFuQ3BFLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDNUosY0FBUyxHQUFHLGVBQWUsQ0FBVSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsa0NBQTZCLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkQsaUNBQTRCLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsbUJBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6RCxrSEFBa0g7UUFDakcsZ0NBQTJCLEdBQUcsZUFBZSxDQUFxQixJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEYsb0JBQWUsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekcsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBR3JCLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNwQyxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBRXJDLGVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFaEQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLGdDQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3Rix3QkFBbUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsZ0NBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlGLHVCQUFrQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxxQ0FBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUYsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLHFDQUE0QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hHLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxxQ0FBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBMkVsSSxtQ0FBOEIsR0FBcUgsU0FBUyxDQUFDO1FBQzdKLHNDQUFpQyxHQUFpSCxTQUFTLENBQUM7UUFDbkosd0JBQW1CLEdBQUcsb0JBQW9CLENBQUM7WUFDM0QsS0FBSyxFQUFFLElBQUk7WUFDWCx3QkFBd0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ3BELFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsRUFBRTtnQkFDcEMsYUFBYSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztnQkFDM0YsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1NBQ0QsRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsRUFBRTtZQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELElBQUksU0FBUyxLQUFLLElBQUk7bUJBQ2xCLElBQUksQ0FBQyxpQ0FBaUM7bUJBQ3RDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyx1QkFBdUIsS0FBSyxTQUFTLEdBQUcsQ0FBQzttQkFDaEYsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLGdCQUFnQixDQUFDLFlBQVk7bUJBQ3BFLGFBQWEsQ0FBQyxPQUFPLEVBQ3ZCLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLFNBQVMsQ0FBQztnQkFDbkQsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQW9DYyxzQ0FBaUMsR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUM1RCxxQkFBcUIsQ0FBQyxJQUFJO1lBQzFCLHFCQUFxQixDQUFDLElBQUk7WUFDMUIscUJBQXFCLENBQUMsVUFBVTtTQUNoQyxDQUFDLENBQUM7UUFTYSxzQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxQyxtQ0FBOEIsR0FBRyxvQkFBb0IsQ0FBQztZQUN0RSxLQUFLLEVBQUUsSUFBSTtZQUNYLHdCQUF3QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLFdBQVcsRUFBRSxLQUFLO2dCQUNsQix5QkFBeUIsRUFBRSxLQUFLO2dCQUNoQywyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQyxTQUFTO2dCQUNsRSxzQkFBc0IsRUFBRSxLQUFLO2dCQUM3QixjQUFjLEVBQUUsSUFBSTthQUNwQixDQUFDO1lBQ0YsWUFBWSxFQUFFLENBQUMsR0FBRyxFQUFFLGFBQWEsRUFBRSxFQUFFO2dCQUNwQyw0Q0FBNEM7Z0JBQzVDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxJQUFJLENBQUMsaUNBQWlDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDeEgsYUFBYSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQztnQkFDaEQsQ0FBQztxQkFBTSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztvQkFDN0QsYUFBYSxDQUFDLDJCQUEyQixHQUFHLDJCQUEyQixDQUFDLFFBQVEsQ0FBQztnQkFDbEYsQ0FBQztxQkFBTSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztvQkFDbEQsYUFBYSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7Z0JBQ2xDLENBQUM7cUJBQU0sSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLENBQUM7b0JBQzlELGFBQWEsQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUM7Z0JBQzdDLENBQUM7cUJBQU0sSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO29CQUMvQyxhQUFhLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDdEMsQ0FBQztnQkFDRCxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7U0FDRCxFQUFFLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxFQUFFO1lBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0VBQWdFO1lBQzNILElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNILElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyx5QkFBeUI7WUFFaEUsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3pGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0QsSUFBSSw4QkFBOEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQy9ELFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDaEIsMEZBQTBGO29CQUMxRixJQUFJLENBQUMsaUJBQWlCLElBQUksOEJBQThCLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2xILElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNoRixDQUFDO29CQUNELElBQUksQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RELENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDbEQsSUFBSSxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzNDLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxDQUFDO2dCQUNILE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxJQUFJLE9BQU8sR0FBNEI7Z0JBQ3RDLFdBQVcsRUFBRSxhQUFhLENBQUMsMkJBQTJCO2dCQUN0RCxzQkFBc0IsRUFBRSxXQUFXLEVBQUUsd0JBQXdCLEVBQUU7Z0JBQy9ELHdCQUF3QixFQUFFLENBQUMsYUFBYSxDQUFDLHNCQUFzQjtnQkFDL0Qsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7YUFDekQsQ0FBQztZQUVGLElBQUksT0FBTyxDQUFDLFdBQVcsS0FBSywyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxDQUFDLDhCQUE4QixFQUFFLDJCQUEyQixFQUFFLENBQUM7b0JBQ25ILDRFQUE0RTtvQkFDNUUsNEdBQTRHO29CQUM1RyxPQUFPLEdBQUc7d0JBQ1QsR0FBRyxPQUFPO3dCQUNWLHdCQUF3QixFQUFFLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLGdCQUFnQixDQUFDLFlBQVk7d0JBQzVGLGtCQUFrQixFQUFFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZO3FCQUNyRixDQUFDO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxFQUFFLFVBQVUsQ0FBQztZQUNySCxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMseUJBQXlCLElBQUksdUJBQXVCLEVBQUUsYUFBYTtnQkFDdkcsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDdkMsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFNUosT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLENBQUMsY0FBYyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDaEksQ0FBQyxDQUFDLENBQUM7UUE0Q2MsMkJBQXNCLEdBQUcsV0FBVyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQy9FLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFDN0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekQsSUFBSSxVQUFVLEdBQWlELFNBQVMsQ0FBQztZQUN6RSxNQUFNLGtCQUFrQixHQUF1QyxFQUFFLENBQUM7WUFDbEUsS0FBSyxNQUFNLFVBQVUsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDckQsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7d0JBQ2xFLGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDckMsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsVUFBVSxHQUFHLFVBQVUsQ0FBQztnQkFDekIsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsOERBQThEO2dCQUM5RCxVQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3hCLENBQUM7WUFFRCxPQUFPO2dCQUNOLGlCQUFpQixFQUFFLGtCQUFrQjtnQkFDckMsVUFBVTthQUNWLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVjLG1DQUE4QixHQUFHLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDaEgsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRCxPQUFPLENBQUMsRUFBRSxpQkFBaUIsSUFBSSxFQUFFLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFFYSxrQ0FBNkIsR0FBRyxPQUFPLENBQVMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEYsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsMkJBQTJCLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLDBCQUEwQixDQUFDLENBQUM7WUFDbkYsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIscUZBQXFGO2dCQUNyRixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztRQUVhLDZCQUF3QixHQUFHLE9BQU8sQ0FBK0MsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakgsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUQsT0FBTyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVhLG1CQUFjLEdBQUcsV0FBVyxDQUFZLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFDL0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUNuRixDQUFDO1FBRWMsb0JBQWUsR0FDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFakUsMkJBQXNCLEdBQUcsT0FBTyxDQUFxQixJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDbkYsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDaEYsT0FBTyxJQUFJLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNoRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRWMsMkJBQXNCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXRHLFVBQUssR0FBRyxXQUFXLENBYXBCO1lBQ2QsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2xCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQUMsQ0FBQztnQkFFakMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO29CQUN0RCxPQUFPLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQzsyQkFDNUQsQ0FBQyxDQUFDLGdCQUFnQixLQUFLLENBQUMsQ0FBQyxnQkFBZ0I7MkJBQ3pDLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQztnQkFDckMsQ0FBQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssWUFBWSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQy9ELE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsS0FBSyxDQUFDLENBQUMsa0JBQWtCLENBQUM7Z0JBQzNGLENBQUM7Z0JBQ0QsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1NBQ0QsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUU3QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxFQUFFLFVBQVUsQ0FBQztZQUMxQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3RCLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM5QyxPQUFPLFNBQVMsQ0FBQztnQkFDbEIsQ0FBQztnQkFDRCxJQUFJLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDckQsSUFBSSxHQUFHLDRCQUE0QixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFFakQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ25ILE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUM7Z0JBRTdJLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ2hFLE9BQU8sU0FBUyxDQUFDO2dCQUNsQixDQUFDO2dCQUVELE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JGLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLElBQUksRUFBRSxFQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBRTNGLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hELE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUVuRyxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxDQUFDO1lBQzdHLENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0scUJBQXFCLEdBQUcsNEJBQTRCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2xHLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFFOUUsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1RSxJQUFJLENBQUMsMEJBQTBCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFBQyxPQUFPLFNBQVMsQ0FBQztnQkFBQyxDQUFDO2dCQUV2RSxNQUFNLFFBQVEsR0FBRyxZQUFZLEVBQUUsSUFBSSxJQUFJLHFCQUFxQixDQUFDO2dCQUM3RCxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFbkgsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sS0FBSyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDcEYsTUFBTSxVQUFVLEdBQUcsS0FBSztxQkFDdEIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUM7cUJBQzlGLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFGLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsQ0FBQztZQUM1SCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQUMsT0FBTyxTQUFTLENBQUM7Z0JBQUMsQ0FBQztnQkFDdkQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFBQyxPQUFPLFNBQVMsQ0FBQztnQkFBQyxDQUFDO2dCQUU1QyxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sS0FBSyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDMUYsTUFBTSxVQUFVLEdBQUcsS0FBSztxQkFDdEIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUMxRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFBQyxPQUFPLFNBQVMsQ0FBQztnQkFBQyxDQUFDO2dCQUN6QyxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDNUgsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRWEsV0FBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDL0MsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLEVBQUUsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUFDLE9BQU8sV0FBVyxDQUFDO1lBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsRUFBRSxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQUMsT0FBTyxZQUFZLENBQUM7WUFBQyxDQUFDO1lBQ3RELE9BQU8sY0FBYyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBRWEsMEJBQXFCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUM5RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQztRQUVhLG9CQUFlLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUN4RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxDQUFDO1FBRWEsd0JBQW1CLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUM1RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztRQXNCYSxZQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNoRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUMsT0FBTyxDQUFDO1FBQ2xHLENBQUMsQ0FBQyxDQUFDO1FBRWEsZUFBVSxHQUFHLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLDZCQUE2QixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDM0csTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1IsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUVhLHFCQUFnQixHQUFHLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLDRCQUE0QixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDaEgsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1IsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELE9BQU8sQ0FBQyxFQUFFLGdCQUFnQixDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRWEsa0JBQWEsR0FBRyxPQUFPLENBQVUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQy9ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDM0MsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBRUQsTUFBTSxxQkFBcUIsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLEtBQUssSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2SCxPQUFPLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDO21CQUNqRixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVTttQkFDbkUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztRQUVjLHFCQUFnQixHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDMUQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFZO2dCQUNoQyxPQUFPLEtBQUssQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUN0RCxDQUFDO1lBRUQsU0FBUyxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLFVBQWtCO2dCQUNwRSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDekUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ3pELE9BQU8sSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbEUsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQ2pCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFDckcsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFYSw4QkFBeUIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ2xFLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1IsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBRWEsOEJBQXlCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNsRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1IsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMxRixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDckUsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO1FBd01ILG9DQUFvQztRQUNuQix5QkFBb0IsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELHdCQUFtQixHQUF5QixJQUFJLENBQUMsb0JBQW9CLENBQUM7UUE2RnJFLGdCQUFXLEdBQUcsZUFBZSxDQUFxQixJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkUsa0JBQWEsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlDLGlCQUFZLEdBQXlCLElBQUksQ0FBQyxhQUFhLENBQUM7UUFqMkJ2RSxJQUFJLENBQUMsU0FBUyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUM7UUFFbkYsSUFBSSxRQUFRLEdBQWlELFNBQVMsQ0FBQztRQUN2RSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQiwwQ0FBMEM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRCxNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7WUFDMUMsSUFBSSxVQUFVLEVBQUUsVUFBVSxLQUFLLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQztnQkFDckQsUUFBUSxHQUFHLFVBQVUsQ0FBQztnQkFDdEIsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDO29CQUN0QyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO29CQUNyQixHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2pHLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLGdEQUFnRDtZQUNoRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN4QixPQUFPO1lBQ1IsQ0FBQztZQUNELEtBQUssTUFBTSxnQkFBZ0IsSUFBSSxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUNwRSxJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQzdELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDWixNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0csSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUUzRixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixNQUFNLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0MsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDUixJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsOEJBQThCLEdBQUc7b0JBQ3JDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLEVBQUU7b0JBQ3JFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUMsZ0JBQWlCLENBQUMsZ0JBQWdCO2lCQUN0RSxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUF5Qk0sMkJBQTJCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ2xDLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxNQUFlO1FBQ3hDLElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLElBQUksb0NBQW9DLEdBQUcsSUFBSSxDQUFDO1FBQ2hELE1BQU0sU0FBUyxHQUFHLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLG9CQUFvQixJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3RSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFN0MsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUVoQyxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxvQkFBb0IsQ0FBQztZQUVyRCxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixJQUFJLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxhQUFhLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDMUIsYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO2dCQUNELHFCQUFxQixHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0JBRTFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDO2dCQUNwRCxNQUFNLHdCQUF3QixHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsYUFBYSxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDOUcsb0NBQW9DLEdBQUcsd0JBQXdCLEdBQUcsT0FBTyxDQUFDO1lBQzNFLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTztZQUNOLHFCQUFxQjtZQUNyQixvQ0FBb0M7U0FDcEMsQ0FBQztJQUNILENBQUM7SUFRTyxVQUFVLENBQUMsQ0FBd0M7UUFDMUQsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFBQyxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQztRQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFBQyxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQztRQUFDLENBQUM7UUFDeEQsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUFDLE9BQU8scUJBQXFCLENBQUMsVUFBVSxDQUFDO1FBQUMsQ0FBQztRQUMzRSxPQUFPLHFCQUFxQixDQUFDLEtBQUssQ0FBQztJQUNwQyxDQUFDO0lBOEZNLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBaUIsRUFBRSxPQUErRDtRQUN0RyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZCLElBQUksT0FBTyxFQUFFLG9CQUFvQixFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUNELElBQUksT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUN0QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVNLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFpQixFQUFFLHVCQUFnQyxLQUFLO1FBQ3RGLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDdkIsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0lBRU0sSUFBSSxDQUFDLGFBQTZDLFdBQVcsRUFBRSxFQUFpQjtRQUN0RixjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZCLElBQUksVUFBVSxLQUFLLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDNUQsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDO2dCQUN4QyxNQUFNLHNCQUFzQixHQUFHLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO2dCQUN4RSxJQUFJLHNCQUFzQixJQUFJLE1BQU0sRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ2hFLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNuRixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFrTU8sb0JBQW9CLENBQUMsaUJBQWlDLEVBQUUsTUFBMkI7UUFDMUYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUM3QixNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sMEJBQTBCLEdBQUcsOEJBQThCO1lBQ2hFLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxpQkFBaUI7WUFDbEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVsRSxNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxVQUFVLENBQUMsRUFBRTtZQUNqRixJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUMsQ0FBQyxHQUFHLDRCQUE0QixDQUMvQixDQUFDLEVBQ0QsS0FBSyxFQUNMLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUN6RixDQUFDO1lBQ0YsT0FBTyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDM0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLG1CQUFtQixDQUFDO0lBQzVCLENBQUM7SUFrR08sS0FBSyxDQUFDLG1DQUFtQyxDQUFDLEtBQWE7UUFDOUQsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUUvQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ3BFLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7WUFDNUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsSUFBSSxLQUFvQixNQUFNLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbEYsS0FBSyxDQUFDLFFBQVEsS0FBb0IsTUFBTSxJQUFJLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdkYsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFzQixJQUFJLENBQUMsT0FBTztRQUNyRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDaEMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLDBCQUE0RCxDQUFDO1FBRWpFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDL0IsSUFBSSxLQUFLLEVBQUUsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzNFLE9BQU87WUFDUixDQUFDO1lBQ0QsMEJBQTBCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1FBQ3JELENBQUM7YUFBTSxJQUFJLEtBQUssRUFBRSxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDekMsMEJBQTBCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1FBQ3JELENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU1RSxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixzREFBc0Q7WUFDdEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBRUQsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RCLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxZQUFZLENBQ2xCLHlCQUF5QixFQUN6QjtnQkFDQyxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUMzQyxHQUFHLFVBQVUsQ0FBQyxtQkFBbUI7YUFDakMsQ0FDRCxDQUFDO1lBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFDOUYsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25HLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztZQUMxQixNQUFNLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUYsTUFBTSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsRUFBRTtnQkFDOUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEUsR0FBRyxVQUFVLENBQUMsbUJBQW1CO2FBQ2pDLENBQUMsQ0FBQztZQUNILE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFFaEgsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO2dCQUNsRixzQ0FBc0M7Z0JBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFO29CQUMxRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUV6QixvSEFBb0g7UUFDcEgsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVosSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLENBQUMsZUFBZTtpQkFDeEIsY0FBYyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQztpQkFDOUUsSUFBSSxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1lBQzdDLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDL0IsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQ25JLENBQUM7SUFFTSxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQW1CO1FBQzlDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkYsTUFBTSxVQUFVLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRTFHLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbEMsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUM7WUFDbEMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxFQUFFLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNwQix5QkFBeUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUMxQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AseUJBQXlCLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDdEMsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCx5QkFBeUIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3pDLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUM7WUFDeEIsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyx5QkFBeUIsRUFBRSxDQUFDO29CQUN6RCx5QkFBeUIsR0FBRyxFQUFFLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ3JELENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyx5QkFBeUIsQ0FBQztRQUNsQyxDQUFDLHdDQUFnQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQW1CO1FBQzlDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQyx3Q0FBZ0MsQ0FBQztJQUNuQyxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFtQixFQUFFLG1CQUFpRSxFQUFFLElBQThCO1FBQy9JLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUNoQyxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDM0UsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7UUFDekMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhFLElBQUksVUFBVSxDQUFDLFdBQVcsSUFBSSxVQUFVLENBQUMsVUFBVSxLQUFLLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMvRSx3RkFBd0Y7WUFDeEYsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLFlBQVksR0FBRyxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxRSxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3BDLE1BQU0seUJBQXlCLEdBQUcsbUJBQW1CLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2xGLElBQUkseUJBQXlCLEtBQUssWUFBWSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2RixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBRWpGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEMsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBDLHNGQUFzRjtRQUN0RixVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUM7WUFDbEMsSUFBSSxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ3ZGLE1BQU0sV0FBVyxHQUFHLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUMxRixNQUFNLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVGLE1BQU0sQ0FBQyxZQUFZLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoSCxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO2dCQUNsRSxNQUFNLENBQUMsdUNBQXVDLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRywrQkFBdUIsQ0FBQztZQUM3RixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEtBQUssQ0FBQztZQUNwQyxDQUFDO1lBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ25KLGdGQUFnRjtnQkFDaEYsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLGlDQUF5QixDQUFDO2dCQUN2RixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNuQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FDN0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFDbkMsVUFBVSxDQUFDLHNCQUFzQixFQUNqQyxjQUFjLEVBQ2QsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGNBQWMsR0FBRyxDQUN6QyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFLTSxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBbUI7UUFDeEQsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ2hDLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDOUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUFFLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxXQUFXLElBQUksV0FBVyxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3hELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0QyxNQUFNLElBQUksR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUNsRCxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUN6RCxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUNoRSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVyQixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO1FBQzNELE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQ2pGLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFDakUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUN4RSxFQUFFLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFFekMsc0ZBQXNGO1FBQ3RGLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQztZQUNsQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUV0QixJQUFJLFVBQVUsQ0FBQztnQkFDZixJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3RCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsR0FBRyw4QkFBOEIsQ0FBQyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQzFGLFVBQVUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLEdBQUcsNEJBQTRCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEYsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixNQUFNLENBQUMsWUFBWSxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEgsTUFBTSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsK0JBQStCLENBQUMsQ0FBQztnQkFDbEUsTUFBTSxDQUFDLHVDQUF1QyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUcsK0JBQXVCLENBQUM7WUFDN0YsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUM7WUFDcEMsQ0FBQztRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxJQUFxQjtRQUNqRCxNQUFNLFFBQVEsR0FBRyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQUMsT0FBTztRQUFDLENBQUM7UUFFckMsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUNyRCxNQUFNLHNCQUFzQixHQUFHLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQztRQUVyRixNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEYsZ0ZBQWdGO1FBQ2hGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssaUNBQXlCLENBQUMsTUFBTSxDQUFDO1FBQzlHLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRXBFLE1BQU0sQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FDcEMsTUFBTSxDQUFDLGlCQUFpQixFQUN4QixzQkFBc0IsRUFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQ3BCO1lBQ0MsSUFBSSwwQ0FBa0M7WUFDdEMsY0FBYztTQUNkLENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxrQkFBa0I7UUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9FLE9BQU87WUFDTixhQUFhLEVBQUUsS0FBSztZQUNwQixnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsc0JBQXNCO1NBQzlDLENBQUM7SUFDSCxDQUFDO0lBTU0sSUFBSTtRQUNWLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQUMsT0FBTztRQUFDLENBQUM7UUFFbkIsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLHdCQUF3QixDQUFDLENBQUM7WUFFbEYscURBQXFEO1lBQ3JELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoSCxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsV0FBVywrQkFBdUIsQ0FBQztZQUM3RCxDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxLQUFLLENBQUMscUJBQXFCLENBQUMsZ0JBQXNDO1FBQ3hFLElBQUksZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFDRCxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUUvQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLHNCQUFzQixFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXRLLElBQUksZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakksQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBOTZCWSxzQkFBc0I7SUFpQ2hDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLDZCQUE2QixDQUFBO0lBQzdCLFlBQUEscUJBQXFCLENBQUE7R0FwQ1gsc0JBQXNCLENBODZCbEM7O0FBT0QsTUFBTSxDQUFOLElBQVkscUJBS1g7QUFMRCxXQUFZLHFCQUFxQjtJQUNoQyxpRUFBSSxDQUFBO0lBQ0osaUVBQUksQ0FBQTtJQUNKLDZFQUFVLENBQUE7SUFDVixtRUFBSyxDQUFBO0FBQ04sQ0FBQyxFQUxXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFLaEM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsU0FBcUIsRUFBRSxTQUE4QixFQUFFLFdBQTJCO0lBQ25ILElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM1QixnQ0FBZ0M7UUFDaEMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBQ0QsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5QyxNQUFNLHdCQUF3QixHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN0RSxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDbEUsTUFBTSw4QkFBOEIsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUMvRCxLQUFLLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxDQUM1RCxDQUFDO0lBQ0YsTUFBTSxzQkFBc0IsR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztJQUM1RixJQUFJLHNCQUFzQixDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMzQyxpQkFBaUIsQ0FBQyxJQUFJLGtCQUFrQixDQUN2QztpQ0FDOEIsZUFBZSxDQUFDLFFBQVEsRUFBRSxRQUFRLHdCQUF3QixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3JHLENBQUMsQ0FBQztRQUNILE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUNELE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUNqRixPQUFPLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNuQyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLHdCQUF3QixDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUN0RyxNQUFNLHdCQUF3QixHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQ3pELEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUNoQyxDQUFDO1FBQ0YsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsOEJBQThCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN2RixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sSUFBSSxjQUFjLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDckQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBQ3pDLFlBQ0MsTUFBbUIsRUFDbkIsTUFBZSxFQUNmLFNBQXNCO1FBRXRCLEtBQUssRUFBRSxDQUFDO1FBRVIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBd0IsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3RILEtBQUssRUFBRSxLQUFLO1lBQ1osT0FBTyxFQUFFO2dCQUNSLFdBQVcsRUFBRSxXQUFXO2dCQUN4QixTQUFTLEVBQUUsMEJBQTBCO2dCQUNyQyxNQUFNLEVBQUUsQ0FBQzthQUNUO1NBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFUCxNQUFNLFNBQVMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRW5ELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMxRixJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QifQ==