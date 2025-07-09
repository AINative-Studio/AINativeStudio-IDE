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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVDb21wbGV0aW9uc1NvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQTZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN00sT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztB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