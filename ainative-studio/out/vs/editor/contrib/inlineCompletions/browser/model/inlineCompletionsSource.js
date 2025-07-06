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
var InlineCompletionsSource_1;
import { compareUndefinedSmallest, numberComparator } from '../../../../../base/common/arrays.js';
import { findLastMax } from '../../../../../base/common/arraysFind.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { equalsIfDefined, itemEquals } from '../../../../../base/common/equals.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { matchesSubString } from '../../../../../base/common/filters.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { derived, derivedHandleChanges, disposableObservableValue, observableValue, transaction } from '../../../../../base/common/observable.js';
import { commonPrefixLength, commonSuffixLength, splitLines } from '../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { applyEditsToRanges, OffsetEdit, SingleOffsetEdit } from '../../../../common/core/offsetEdit.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit, StringText } from '../../../../common/core/textEdit.js';
import { TextLength } from '../../../../common/core/textLength.js';
import { linesDiffComputers } from '../../../../common/diff/linesDiffComputers.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { OffsetEdits } from '../../../../common/model/textModelOffsetEdit.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { provideInlineCompletions } from './provideInlineCompletions.js';
import { singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
import { StructuredLogger, formatRecordableLogEntry } from '../structuredLogger.js';
let InlineCompletionsSource = class InlineCompletionsSource extends Disposable {
    static { InlineCompletionsSource_1 = this; }
    static { this._requestId = 0; }
    constructor(_textModel, _versionId, _debounceValue, _languageFeaturesService, _languageConfigurationService, _logService, _configurationService, _instantiationService) {
        super();
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._debounceValue = _debounceValue;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._updateOperation = this._register(new MutableDisposable());
        this.inlineCompletions = this._register(disposableObservableValue('inlineCompletions', undefined));
        this.suggestWidgetInlineCompletions = this._register(disposableObservableValue('suggestWidgetInlineCompletions', undefined));
        this._loggingEnabled = observableConfigValue('editor.inlineSuggest.logFetch', false, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._structuredFetchLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logFetch.commandId'));
        this.clearOperationOnTextModelChange = derived(this, reader => {
            this._versionId.read(reader);
            this._updateOperation.clear();
            return undefined; // always constant
        });
        this._loadingCount = observableValue(this, 0);
        this.loading = this._loadingCount.map(this, v => v > 0);
        this.clearOperationOnTextModelChange.recomputeInitiallyAndOnChange(this._store);
    }
    _log(entry) {
        if (this._loggingEnabled.get()) {
            this._logService.info(formatRecordableLogEntry(entry));
        }
        this._structuredFetchLogger.log(entry);
    }
    fetch(position, context, activeInlineCompletion, withDebounce, userJumpedToActiveCompletion) {
        const request = new UpdateRequest(position, context, this._textModel.getVersionId());
        const target = context.selectedSuggestionInfo ? this.suggestWidgetInlineCompletions : this.inlineCompletions;
        if (this._updateOperation.value?.request.satisfies(request)) {
            return this._updateOperation.value.promise;
        }
        else if (target.get()?.request.satisfies(request)) {
            return Promise.resolve(true);
        }
        const updateOngoing = !!this._updateOperation.value;
        this._updateOperation.clear();
        const source = new CancellationTokenSource();
        const promise = (async () => {
            this._loadingCount.set(this._loadingCount.get() + 1, undefined);
            try {
                const recommendedDebounceValue = this._debounceValue.get(this._textModel);
                const debounceValue = findLastMax(this._languageFeaturesService.inlineCompletionsProvider.all(this._textModel).map(p => p.debounceDelayMs), compareUndefinedSmallest(numberComparator)) ?? recommendedDebounceValue;
                // Debounce in any case if update is ongoing
                const shouldDebounce = updateOngoing || (withDebounce && context.triggerKind === InlineCompletionTriggerKind.Automatic);
                if (shouldDebounce) {
                    // This debounces the operation
                    await wait(debounceValue, source.token);
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                    return false;
                }
                const requestId = InlineCompletionsSource_1._requestId++;
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    this._log({ sourceId: 'InlineCompletions.fetch', kind: 'start', requestId, modelUri: this._textModel.uri.toString(), modelVersion: this._textModel.getVersionId(), context: { triggerKind: context.triggerKind }, time: Date.now() });
                }
                const startTime = new Date();
                let updatedCompletions = undefined;
                let error = undefined;
                try {
                    updatedCompletions = await provideInlineCompletions(this._languageFeaturesService.inlineCompletionsProvider, position, this._textModel, context, source.token, this._languageConfigurationService);
                }
                catch (e) {
                    error = e;
                    throw e;
                }
                finally {
                    if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                        if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                            error = 'canceled';
                        }
                        const result = updatedCompletions?.completions.map(c => ({
                            range: c.range.toString(),
                            text: c.insertText,
                            isInlineEdit: !!c.isInlineEdit,
                            source: c.source.provider.groupId,
                        }));
                        this._log({ sourceId: 'InlineCompletions.fetch', kind: 'end', requestId, durationMs: (Date.now() - startTime.getTime()), error, result, time: Date.now() });
                    }
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId || userJumpedToActiveCompletion.get() /* In the meantime the user showed interest for the active completion so dont hide it */) {
                    updatedCompletions.dispose();
                    return false;
                }
                // Reuse Inline Edit if possible
                if (activeInlineCompletion && activeInlineCompletion.isInlineEdit && activeInlineCompletion.updatedEditModelVersion === this._textModel.getVersionId() && (activeInlineCompletion.canBeReused(this._textModel, position)
                    || updatedCompletions.has(activeInlineCompletion.inlineCompletion) /* Inline Edit wins over completions if it's already been shown*/
                    || updatedCompletions.isEmpty() /* Incoming completion is empty, keep the current one alive */)) {
                    activeInlineCompletion.reuse();
                    updatedCompletions.dispose();
                    return false;
                }
                const endTime = new Date();
                this._debounceValue.update(this._textModel, endTime.getTime() - startTime.getTime());
                // Reuse Inline Completion if possible
                const completions = new UpToDateInlineCompletions(updatedCompletions, request, this._textModel, this._versionId);
                if (activeInlineCompletion && !activeInlineCompletion.isInlineEdit && activeInlineCompletion.canBeReused(this._textModel, position)) {
                    const asInlineCompletion = activeInlineCompletion.toInlineCompletion(undefined);
                    if (!updatedCompletions.has(asInlineCompletion)) {
                        completions.prepend(activeInlineCompletion.inlineCompletion, asInlineCompletion.range, true);
                    }
                }
                this._updateOperation.clear();
                transaction(tx => {
                    /** @description Update completions with provider result */
                    target.set(completions, tx);
                });
            }
            finally {
                this._loadingCount.set(this._loadingCount.get() - 1, undefined);
            }
            return true;
        })();
        const updateOperation = new UpdateOperation(request, source, promise);
        this._updateOperation.value = updateOperation;
        return promise;
    }
    clear(tx) {
        this._updateOperation.clear();
        this.inlineCompletions.set(undefined, tx);
        this.suggestWidgetInlineCompletions.set(undefined, tx);
    }
    clearSuggestWidgetInlineCompletions(tx) {
        if (this._updateOperation.value?.request.context.selectedSuggestionInfo) {
            this._updateOperation.clear();
        }
        this.suggestWidgetInlineCompletions.set(undefined, tx);
    }
    cancelUpdate() {
        this._updateOperation.clear();
    }
};
InlineCompletionsSource = InlineCompletionsSource_1 = __decorate([
    __param(3, ILanguageFeaturesService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILogService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService)
], InlineCompletionsSource);
export { InlineCompletionsSource };
function wait(ms, cancellationToken) {
    return new Promise(resolve => {
        let d = undefined;
        const handle = setTimeout(() => {
            if (d) {
                d.dispose();
            }
            resolve();
        }, ms);
        if (cancellationToken) {
            d = cancellationToken.onCancellationRequested(() => {
                clearTimeout(handle);
                if (d) {
                    d.dispose();
                }
                resolve();
            });
        }
    });
}
class UpdateRequest {
    constructor(position, context, versionId) {
        this.position = position;
        this.context = context;
        this.versionId = versionId;
    }
    satisfies(other) {
        return this.position.equals(other.position)
            && equalsIfDefined(this.context.selectedSuggestionInfo, other.context.selectedSuggestionInfo, itemEquals())
            && (other.context.triggerKind === InlineCompletionTriggerKind.Automatic
                || this.context.triggerKind === InlineCompletionTriggerKind.Explicit)
            && this.versionId === other.versionId;
    }
    get isExplicitRequest() {
        return this.context.triggerKind === InlineCompletionTriggerKind.Explicit;
    }
}
class UpdateOperation {
    constructor(request, cancellationTokenSource, promise) {
        this.request = request;
        this.cancellationTokenSource = cancellationTokenSource;
        this.promise = promise;
    }
    dispose() {
        this.cancellationTokenSource.cancel();
    }
}
export class UpToDateInlineCompletions {
    get inlineCompletions() { return this._inlineCompletions; }
    constructor(inlineCompletionProviderResult, request, _textModel, _versionId) {
        this.inlineCompletionProviderResult = inlineCompletionProviderResult;
        this.request = request;
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._refCount = 1;
        this._prependedInlineCompletionItems = [];
        this._inlineCompletions = inlineCompletionProviderResult.completions.map(completion => new InlineCompletionWithUpdatedRange(completion, undefined, this._textModel, this._versionId, this.request));
    }
    clone() {
        this._refCount++;
        return this;
    }
    dispose() {
        this._refCount--;
        if (this._refCount === 0) {
            this.inlineCompletionProviderResult.dispose();
            for (const i of this._prependedInlineCompletionItems) {
                i.source.removeRef();
            }
            this._inlineCompletions.forEach(i => i.dispose());
        }
    }
    prepend(inlineCompletion, range, addRefToSource) {
        if (addRefToSource) {
            inlineCompletion.source.addRef();
        }
        this._inlineCompletions.unshift(new InlineCompletionWithUpdatedRange(inlineCompletion, range, this._textModel, this._versionId, this.request));
        this._prependedInlineCompletionItems.push(inlineCompletion);
    }
}
export class InlineCompletionWithUpdatedRange extends Disposable {
    get forwardStable() {
        return this.source.inlineCompletions.enableForwardStability ?? false;
    }
    get updatedEdit() { return this._updatedEditObj.offsetEdit; }
    get updatedEditModelVersion() { return this._updatedEditObj.modelVersion; }
    get source() { return this.inlineCompletion.source; }
    get sourceInlineCompletion() { return this.inlineCompletion.sourceInlineCompletion; }
    get isInlineEdit() { return this.inlineCompletion.isInlineEdit; }
    constructor(inlineCompletion, updatedRange, _textModel, _modelVersion, request) {
        super();
        this.inlineCompletion = inlineCompletion;
        this._textModel = _textModel;
        this._modelVersion = _modelVersion;
        this.request = request;
        this.semanticId = JSON.stringify([
            this.inlineCompletion.filterText,
            this.inlineCompletion.insertText,
            this.inlineCompletion.range.getStartPosition().toString()
        ]);
        this._updatedRange = derived(reader => {
            const edit = this.updatedEdit.read(reader);
            if (!edit || edit.edits.length === 0) {
                return undefined;
            }
            return Range.fromPositions(this._textModel.getPositionAt(edit.edits[0].replaceRange.start), this._textModel.getPositionAt(edit.edits[edit.edits.length - 1].replaceRange.endExclusive));
        });
        this._updatedEditObj = this._register(this._toUpdatedEdit(updatedRange ?? this.inlineCompletion.range, this.inlineCompletion.insertText));
    }
    toInlineCompletion(reader) {
        const singleTextEdit = this.toSingleTextEdit(reader);
        return this.inlineCompletion.withRangeInsertTextAndFilterText(singleTextEdit.range, singleTextEdit.text, singleTextEdit.text);
    }
    toSingleTextEdit(reader) {
        this._modelVersion.read(reader);
        const offsetEdit = this.updatedEdit.read(reader);
        if (!offsetEdit) {
            return new SingleTextEdit(this._updatedRange.read(reader) ?? emptyRange, this.inlineCompletion.insertText);
        }
        const startOffset = offsetEdit.edits[0].replaceRange.start;
        const endOffset = offsetEdit.edits[offsetEdit.edits.length - 1].replaceRange.endExclusive;
        const overallOffsetRange = new OffsetRange(startOffset, endOffset);
        const overallLnColRange = Range.fromPositions(this._textModel.getPositionAt(overallOffsetRange.start), this._textModel.getPositionAt(overallOffsetRange.endExclusive));
        let text = this._textModel.getValueInRange(overallLnColRange);
        for (let i = offsetEdit.edits.length - 1; i >= 0; i--) {
            const edit = offsetEdit.edits[i];
            const relativeStartOffset = edit.replaceRange.start - startOffset;
            const relativeEndOffset = edit.replaceRange.endExclusive - startOffset;
            text = text.substring(0, relativeStartOffset) + edit.newText + text.substring(relativeEndOffset);
        }
        return new SingleTextEdit(overallLnColRange, text);
    }
    isVisible(model, cursorPosition, reader) {
        const minimizedReplacement = singleTextRemoveCommonPrefix(this.toSingleTextEdit(reader), model);
        const updatedRange = this._updatedRange.read(reader);
        if (!updatedRange
            || !this.inlineCompletion.range.getStartPosition().equals(updatedRange.getStartPosition())
            || cursorPosition.lineNumber !== minimizedReplacement.range.startLineNumber
            || minimizedReplacement.isEmpty // if the completion is empty after removing the common prefix of the completion and the model, the completion item would not be visible
        ) {
            return false;
        }
        // We might consider comparing by .toLowerText, but this requires GhostTextReplacement
        const originalValue = model.getValueInRange(minimizedReplacement.range, 1 /* EndOfLinePreference.LF */);
        const filterText = minimizedReplacement.text;
        const cursorPosIndex = Math.max(0, cursorPosition.column - minimizedReplacement.range.startColumn);
        let filterTextBefore = filterText.substring(0, cursorPosIndex);
        let filterTextAfter = filterText.substring(cursorPosIndex);
        let originalValueBefore = originalValue.substring(0, cursorPosIndex);
        let originalValueAfter = originalValue.substring(cursorPosIndex);
        const originalValueIndent = model.getLineIndentColumn(minimizedReplacement.range.startLineNumber);
        if (minimizedReplacement.range.startColumn <= originalValueIndent) {
            // Remove indentation
            originalValueBefore = originalValueBefore.trimStart();
            if (originalValueBefore.length === 0) {
                originalValueAfter = originalValueAfter.trimStart();
            }
            filterTextBefore = filterTextBefore.trimStart();
            if (filterTextBefore.length === 0) {
                filterTextAfter = filterTextAfter.trimStart();
            }
        }
        return filterTextBefore.startsWith(originalValueBefore)
            && !!matchesSubString(originalValueAfter, filterTextAfter);
    }
    reuse() {
        this._updatedEditObj.reuse();
    }
    canBeReused(model, position) {
        if (!this.updatedEdit.get()) {
            return false;
        }
        if (this.sourceInlineCompletion.isInlineEdit) {
            return this._updatedEditObj.lastChangePartOfInlineEdit;
        }
        const updatedRange = this._updatedRange.read(undefined);
        const result = !!updatedRange
            && updatedRange.containsPosition(position)
            && this.isVisible(model, position, undefined)
            && TextLength.ofRange(updatedRange).isGreaterThanOrEqualTo(TextLength.ofRange(this.inlineCompletion.range));
        return result;
    }
    _toUpdatedEdit(editRange, replaceText) {
        return this.isInlineEdit
            ? this._toInlineEditEdit(editRange, replaceText)
            : this._toInlineCompletionEdit(editRange, replaceText);
    }
    _toInlineCompletionEdit(editRange, replaceText) {
        const startOffset = this._textModel.getOffsetAt(editRange.getStartPosition());
        const endOffset = this._textModel.getOffsetAt(editRange.getEndPosition());
        const originalRange = OffsetRange.ofStartAndLength(startOffset, endOffset - startOffset);
        const offsetEdit = new OffsetEdit([new SingleOffsetEdit(originalRange, replaceText)]);
        return new UpdatedEdit(offsetEdit, this._textModel, this._modelVersion, false);
    }
    _toInlineEditEdit(editRange, replaceText) {
        const eol = this._textModel.getEOL();
        const editOriginalText = this._textModel.getValueInRange(editRange);
        const editReplaceText = replaceText.replace(/\r\n|\r|\n/g, eol);
        const diffAlgorithm = linesDiffComputers.getDefault();
        const lineDiffs = diffAlgorithm.computeDiff(splitLines(editOriginalText), splitLines(editReplaceText), {
            ignoreTrimWhitespace: false,
            computeMoves: false,
            extendToSubwords: true,
            maxComputationTimeMs: 500,
        });
        const innerChanges = lineDiffs.changes.flatMap(c => c.innerChanges ?? []);
        function addRangeToPos(pos, range) {
            const start = TextLength.fromPosition(range.getStartPosition());
            return TextLength.ofRange(range).createRange(start.addToPosition(pos));
        }
        const modifiedText = new StringText(editReplaceText);
        const offsetEdit = new OffsetEdit(innerChanges.map(c => {
            const range = addRangeToPos(editRange.getStartPosition(), c.originalRange);
            const startOffset = this._textModel.getOffsetAt(range.getStartPosition());
            const endOffset = this._textModel.getOffsetAt(range.getEndPosition());
            const originalRange = OffsetRange.ofStartAndLength(startOffset, endOffset - startOffset);
            const replaceText = modifiedText.getValueOfRange(c.modifiedRange);
            const originalText = this._textModel.getValueInRange(range);
            const edit = new SingleOffsetEdit(originalRange, replaceText);
            return reshapeEdit(edit, originalText, innerChanges.length, this._textModel);
        }));
        return new UpdatedEdit(offsetEdit, this._textModel, this._modelVersion, true);
    }
}
class UpdatedEdit extends Disposable {
    get modelVersion() { return this._inlineEditModelVersion; }
    get lastChangePartOfInlineEdit() { return this._lastChangePartOfInlineEdit; }
    get offsetEdit() { return this._updatedEdit.map(e => e ?? undefined); }
    constructor(offsetEdit, _textModel, _modelVersion, isInlineEdit) {
        super();
        this._textModel = _textModel;
        this._modelVersion = _modelVersion;
        this._lastChangePartOfInlineEdit = false;
        this._updatedEdit = derivedHandleChanges({
            owner: this,
            equalityComparer: equalsIfDefined((a, b) => a?.equals(b)),
            createEmptyChangeSummary: () => [],
            handleChange: (context, changeSummary) => {
                if (context.didChange(this._modelVersion) && context.change) {
                    changeSummary.push(OffsetEdits.fromContentChanges(context.change.changes));
                }
                return true;
            }
        }, (reader, changeSummary) => {
            this._modelVersion.read(reader);
            for (const change of changeSummary) {
                this._innerEdits = this._applyTextModelChanges(change, this._innerEdits);
            }
            if (this._innerEdits.length === 0) {
                return undefined;
            }
            if (this._innerEdits.some(e => e.edit === undefined)) {
                throw new BugIndicatingError('UpdatedEdit: Invalid state');
            }
            return new OffsetEdit(this._innerEdits.map(edit => edit.edit));
        });
        this._inlineEditModelVersion = this._modelVersion.get() ?? -1;
        this._innerEdits = offsetEdit.edits.map(edit => {
            if (isInlineEdit) {
                const replacedRange = Range.fromPositions(this._textModel.getPositionAt(edit.replaceRange.start), this._textModel.getPositionAt(edit.replaceRange.endExclusive));
                const replacedText = this._textModel.getValueInRange(replacedRange);
                return new SingleUpdatedNextEdit(edit, replacedText);
            }
            return new SingleUpdatedCompletion(edit);
        });
        this._updatedEdit.recomputeInitiallyAndOnChange(this._store); // make sure to call this after setting `_lastEdit`
    }
    _applyTextModelChanges(textModelChanges, edits) {
        for (const innerEdit of edits) {
            innerEdit.applyTextModelChanges(textModelChanges);
        }
        if (edits.some(edit => edit.edit === undefined)) {
            return []; // change is invalid, so we will have to drop the completion
        }
        const currentModelVersion = this._modelVersion.get();
        this._lastChangePartOfInlineEdit = edits.some(edit => edit.lastChangeUpdatedEdit);
        if (this._lastChangePartOfInlineEdit) {
            this._inlineEditModelVersion = currentModelVersion ?? -1;
        }
        if (currentModelVersion === null || this._inlineEditModelVersion + 20 < currentModelVersion) {
            return []; // the completion has been ignored for a while, remove it
        }
        edits = edits.filter(innerEdit => !innerEdit.edit.isEmpty);
        if (edits.length === 0) {
            return []; // the completion has been typed by the user
        }
        return edits;
    }
    reuse() {
        this._inlineEditModelVersion = this._modelVersion.get() ?? -1;
    }
}
class SingleUpdatedEdit {
    get edit() { return this._edit; }
    get lastChangeUpdatedEdit() { return this._lastChangeUpdatedEdit; }
    constructor(edit) {
        this._lastChangeUpdatedEdit = false;
        this._edit = edit;
    }
    applyTextModelChanges(textModelChanges) {
        this._lastChangeUpdatedEdit = false;
        if (!this._edit) {
            throw new BugIndicatingError('UpdatedInnerEdits: No edit to apply changes to');
        }
        const result = this.applyChanges(this._edit, textModelChanges);
        if (!result) {
            this._edit = undefined;
            return;
        }
        this._edit = result.edit;
        this._lastChangeUpdatedEdit = result.editHasChanged;
    }
}
class SingleUpdatedCompletion extends SingleUpdatedEdit {
    constructor(edit) {
        super(edit);
    }
    applyChanges(edit, textModelChanges) {
        const newEditRange = applyEditsToRanges([edit.replaceRange], textModelChanges)[0];
        return { edit: new SingleOffsetEdit(newEditRange, edit.newText), editHasChanged: !newEditRange.equals(edit.replaceRange) };
    }
}
class SingleUpdatedNextEdit extends SingleUpdatedEdit {
    constructor(edit, replacedText) {
        super(edit);
        this._prefixLength = commonPrefixLength(edit.newText, replacedText);
        this._suffixLength = commonSuffixLength(edit.newText, replacedText);
        this._trimmedNewText = edit.newText.substring(this._prefixLength, edit.newText.length - this._suffixLength);
    }
    applyChanges(edit, textModelChanges) {
        let editStart = edit.replaceRange.start;
        let editEnd = edit.replaceRange.endExclusive;
        let editReplaceText = edit.newText;
        let editHasChanged = false;
        const shouldPreserveEditShape = this._prefixLength > 0 || this._suffixLength > 0;
        for (let i = textModelChanges.edits.length - 1; i >= 0; i--) {
            const change = textModelChanges.edits[i];
            // INSERTIONS (only support inserting at start of edit)
            const isInsertion = change.newText.length > 0 && change.replaceRange.isEmpty;
            if (isInsertion && !shouldPreserveEditShape && change.replaceRange.start === editStart && editReplaceText.startsWith(change.newText)) {
                editStart += change.newText.length;
                editReplaceText = editReplaceText.substring(change.newText.length);
                editEnd = Math.max(editStart, editEnd);
                editHasChanged = true;
                continue;
            }
            if (isInsertion && shouldPreserveEditShape && change.replaceRange.start === editStart + this._prefixLength && this._trimmedNewText.startsWith(change.newText)) {
                editEnd += change.newText.length;
                editHasChanged = true;
                this._prefixLength += change.newText.length;
                this._trimmedNewText = this._trimmedNewText.substring(change.newText.length);
                continue;
            }
            // DELETIONS
            const isDeletion = change.newText.length === 0 && change.replaceRange.length > 0;
            if (isDeletion && change.replaceRange.start >= editStart + this._prefixLength && change.replaceRange.endExclusive <= editEnd - this._suffixLength) {
                // user deleted text IN-BETWEEN the deletion range
                editEnd -= change.replaceRange.length;
                editHasChanged = true;
                continue;
            }
            // user did exactly the edit
            if (change.equals(edit)) {
                editHasChanged = true;
                editStart = change.replaceRange.endExclusive;
                editReplaceText = '';
                continue;
            }
            // MOVE EDIT
            if (change.replaceRange.start > editEnd) {
                // the change happens after the completion range
                continue;
            }
            if (change.replaceRange.endExclusive < editStart) {
                // the change happens before the completion range
                editStart += change.newText.length - change.replaceRange.length;
                editEnd += change.newText.length - change.replaceRange.length;
                continue;
            }
            // The change intersects the completion, so we will have to drop the completion
            return undefined;
        }
        // the resulting edit is a noop as the original and new text are the same
        if (this._trimmedNewText.length === 0 && editStart + this._prefixLength === editEnd - this._suffixLength) {
            return { edit: new SingleOffsetEdit(new OffsetRange(editStart + this._prefixLength, editStart + this._prefixLength), ''), editHasChanged: true };
        }
        return { edit: new SingleOffsetEdit(new OffsetRange(editStart, editEnd), editReplaceText), editHasChanged };
    }
}
const emptyRange = new Range(1, 1, 1, 1);
function reshapeEdit(edit, originalText, totalInnerEdits, textModel) {
    // TODO: EOL are not properly trimmed by the diffAlgorithm #12680
    const eol = textModel.getEOL();
    if (edit.newText.endsWith(eol) && originalText.endsWith(eol)) {
        edit = new SingleOffsetEdit(edit.replaceRange.deltaEnd(-eol.length), edit.newText.slice(0, -eol.length));
    }
    // INSERTION
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (totalInnerEdits === 1 && edit.replaceRange.isEmpty && edit.newText.includes(eol)) {
        edit = reshapeMultiLineInsertion(edit, textModel);
    }
    // The diff algorithm extended a simple edit to the entire word
    // shrink it back to a simple edit if it is deletion/insertion only
    if (totalInnerEdits === 1) {
        const prefixLength = commonPrefixLength(originalText, edit.newText);
        const suffixLength = commonSuffixLength(originalText.slice(prefixLength), edit.newText.slice(prefixLength));
        // reshape it back to an insertion
        if (prefixLength + suffixLength === originalText.length) {
            return new SingleOffsetEdit(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), edit.newText.substring(prefixLength, edit.newText.length - suffixLength));
        }
        // reshape it back to a deletion
        if (prefixLength + suffixLength === edit.newText.length) {
            return new SingleOffsetEdit(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), '');
        }
    }
    return edit;
}
function reshapeMultiLineInsertion(edit, textModel) {
    if (!edit.replaceRange.isEmpty) {
        throw new BugIndicatingError('Unexpected original range');
    }
    if (edit.replaceRange.start === 0) {
        return edit;
    }
    const eol = textModel.getEOL();
    const startPosition = textModel.getPositionAt(edit.replaceRange.start);
    const startColumn = startPosition.column;
    const startLineNumber = startPosition.lineNumber;
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (startColumn === 1 && startLineNumber > 1 && textModel.getLineLength(startLineNumber) !== 0 && edit.newText.endsWith(eol) && !edit.newText.startsWith(eol)) {
        return new SingleOffsetEdit(edit.replaceRange.delta(-1), eol + edit.newText.slice(0, -eol.length));
    }
    return edit;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2lubGluZUNvbXBsZXRpb25zU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBNkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3TSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FB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