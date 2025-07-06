/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorStateCancellationTokenSource, TextModelCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { isCodeEditor } from '../../../browser/editorBrowser.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { FormattingEdit } from './formattingEdit.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
export function getRealAndSyntheticDocumentFormattersOrdered(documentFormattingEditProvider, documentRangeFormattingEditProvider, model) {
    const result = [];
    const seen = new ExtensionIdentifierSet();
    // (1) add all document formatter
    const docFormatter = documentFormattingEditProvider.ordered(model);
    for (const formatter of docFormatter) {
        result.push(formatter);
        if (formatter.extensionId) {
            seen.add(formatter.extensionId);
        }
    }
    // (2) add all range formatter as document formatter (unless the same extension already did that)
    const rangeFormatter = documentRangeFormattingEditProvider.ordered(model);
    for (const formatter of rangeFormatter) {
        if (formatter.extensionId) {
            if (seen.has(formatter.extensionId)) {
                continue;
            }
            seen.add(formatter.extensionId);
        }
        result.push({
            displayName: formatter.displayName,
            extensionId: formatter.extensionId,
            provideDocumentFormattingEdits(model, options, token) {
                return formatter.provideDocumentRangeFormattingEdits(model, model.getFullModelRange(), options, token);
            }
        });
    }
    return result;
}
export var FormattingKind;
(function (FormattingKind) {
    FormattingKind[FormattingKind["File"] = 1] = "File";
    FormattingKind[FormattingKind["Selection"] = 2] = "Selection";
})(FormattingKind || (FormattingKind = {}));
export var FormattingMode;
(function (FormattingMode) {
    FormattingMode[FormattingMode["Explicit"] = 1] = "Explicit";
    FormattingMode[FormattingMode["Silent"] = 2] = "Silent";
})(FormattingMode || (FormattingMode = {}));
export class FormattingConflicts {
    static { this._selectors = new LinkedList(); }
    static setFormatterSelector(selector) {
        const remove = FormattingConflicts._selectors.unshift(selector);
        return { dispose: remove };
    }
    static async select(formatter, document, mode, kind) {
        if (formatter.length === 0) {
            return undefined;
        }
        const selector = Iterable.first(FormattingConflicts._selectors);
        if (selector) {
            return await selector(formatter, document, mode, kind);
        }
        return undefined;
    }
}
export async function formatDocumentRangesWithSelectedProvider(accessor, editorOrModel, rangeOrRanges, mode, progress, token, userGesture) {
    const instaService = accessor.get(IInstantiationService);
    const { documentRangeFormattingEditProvider: documentRangeFormattingEditProviderRegistry } = accessor.get(ILanguageFeaturesService);
    const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
    const provider = documentRangeFormattingEditProviderRegistry.ordered(model);
    const selected = await FormattingConflicts.select(provider, model, mode, 2 /* FormattingKind.Selection */);
    if (selected) {
        progress.report(selected);
        await instaService.invokeFunction(formatDocumentRangesWithProvider, selected, editorOrModel, rangeOrRanges, token, userGesture);
    }
}
export async function formatDocumentRangesWithProvider(accessor, provider, editorOrModel, rangeOrRanges, token, userGesture) {
    const workerService = accessor.get(IEditorWorkerService);
    const logService = accessor.get(ILogService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    let model;
    let cts;
    if (isCodeEditor(editorOrModel)) {
        model = editorOrModel.getModel();
        cts = new EditorStateCancellationTokenSource(editorOrModel, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */, undefined, token);
    }
    else {
        model = editorOrModel;
        cts = new TextModelCancellationTokenSource(editorOrModel, token);
    }
    // make sure that ranges don't overlap nor touch each other
    const ranges = [];
    let len = 0;
    for (const range of asArray(rangeOrRanges).sort(Range.compareRangesUsingStarts)) {
        if (len > 0 && Range.areIntersectingOrTouching(ranges[len - 1], range)) {
            ranges[len - 1] = Range.fromPositions(ranges[len - 1].getStartPosition(), range.getEndPosition());
        }
        else {
            len = ranges.push(range);
        }
    }
    const computeEdits = async (range) => {
        logService.trace(`[format][provideDocumentRangeFormattingEdits] (request)`, provider.extensionId?.value, range);
        const result = (await provider.provideDocumentRangeFormattingEdits(model, range, model.getFormattingOptions(), cts.token)) || [];
        logService.trace(`[format][provideDocumentRangeFormattingEdits] (response)`, provider.extensionId?.value, result);
        return result;
    };
    const hasIntersectingEdit = (a, b) => {
        if (!a.length || !b.length) {
            return false;
        }
        // quick exit if the list of ranges are completely unrelated [O(n)]
        const mergedA = a.reduce((acc, val) => { return Range.plusRange(acc, val.range); }, a[0].range);
        if (!b.some(x => { return Range.intersectRanges(mergedA, x.range); })) {
            return false;
        }
        // fallback to a complete check [O(n^2)]
        for (const edit of a) {
            for (const otherEdit of b) {
                if (Range.intersectRanges(edit.range, otherEdit.range)) {
                    return true;
                }
            }
        }
        return false;
    };
    const allEdits = [];
    const rawEditsList = [];
    try {
        if (typeof provider.provideDocumentRangesFormattingEdits === 'function') {
            logService.trace(`[format][provideDocumentRangeFormattingEdits] (request)`, provider.extensionId?.value, ranges);
            const result = (await provider.provideDocumentRangesFormattingEdits(model, ranges, model.getFormattingOptions(), cts.token)) || [];
            logService.trace(`[format][provideDocumentRangeFormattingEdits] (response)`, provider.extensionId?.value, result);
            rawEditsList.push(result);
        }
        else {
            for (const range of ranges) {
                if (cts.token.isCancellationRequested) {
                    return true;
                }
                rawEditsList.push(await computeEdits(range));
            }
            for (let i = 0; i < ranges.length; ++i) {
                for (let j = i + 1; j < ranges.length; ++j) {
                    if (cts.token.isCancellationRequested) {
                        return true;
                    }
                    if (hasIntersectingEdit(rawEditsList[i], rawEditsList[j])) {
                        // Merge ranges i and j into a single range, recompute the associated edits
                        const mergedRange = Range.plusRange(ranges[i], ranges[j]);
                        const edits = await computeEdits(mergedRange);
                        ranges.splice(j, 1);
                        ranges.splice(i, 1);
                        ranges.push(mergedRange);
                        rawEditsList.splice(j, 1);
                        rawEditsList.splice(i, 1);
                        rawEditsList.push(edits);
                        // Restart scanning
                        i = 0;
                        j = 0;
                    }
                }
            }
        }
        for (const rawEdits of rawEditsList) {
            if (cts.token.isCancellationRequested) {
                return true;
            }
            const minimalEdits = await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
            if (minimalEdits) {
                allEdits.push(...minimalEdits);
            }
        }
    }
    finally {
        cts.dispose();
    }
    if (allEdits.length === 0) {
        return false;
    }
    if (isCodeEditor(editorOrModel)) {
        // use editor to apply edits
        FormattingEdit.execute(editorOrModel, allEdits, true);
        editorOrModel.revealPositionInCenterIfOutsideViewport(editorOrModel.getPosition(), 1 /* ScrollType.Immediate */);
    }
    else {
        // use model to apply edits
        const [{ range }] = allEdits;
        const initialSelection = new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        model.pushEditOperations([initialSelection], allEdits.map(edit => {
            return {
                text: edit.text,
                range: Range.lift(edit.range),
                forceMoveMarkers: true
            };
        }), undoEdits => {
            for (const { range } of undoEdits) {
                if (Range.areIntersectingOrTouching(range, initialSelection)) {
                    return [new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn)];
                }
            }
            return null;
        });
    }
    accessibilitySignalService.playSignal(AccessibilitySignal.format, { userGesture });
    return true;
}
export async function formatDocumentWithSelectedProvider(accessor, editorOrModel, mode, progress, token, userGesture) {
    const instaService = accessor.get(IInstantiationService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
    const provider = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
    const selected = await FormattingConflicts.select(provider, model, mode, 1 /* FormattingKind.File */);
    if (selected) {
        progress.report(selected);
        await instaService.invokeFunction(formatDocumentWithProvider, selected, editorOrModel, mode, token, userGesture);
    }
}
export async function formatDocumentWithProvider(accessor, provider, editorOrModel, mode, token, userGesture) {
    const workerService = accessor.get(IEditorWorkerService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    let model;
    let cts;
    if (isCodeEditor(editorOrModel)) {
        model = editorOrModel.getModel();
        cts = new EditorStateCancellationTokenSource(editorOrModel, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */, undefined, token);
    }
    else {
        model = editorOrModel;
        cts = new TextModelCancellationTokenSource(editorOrModel, token);
    }
    let edits;
    try {
        const rawEdits = await provider.provideDocumentFormattingEdits(model, model.getFormattingOptions(), cts.token);
        edits = await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
        if (cts.token.isCancellationRequested) {
            return true;
        }
    }
    finally {
        cts.dispose();
    }
    if (!edits || edits.length === 0) {
        return false;
    }
    if (isCodeEditor(editorOrModel)) {
        // use editor to apply edits
        FormattingEdit.execute(editorOrModel, edits, mode !== 2 /* FormattingMode.Silent */);
        if (mode !== 2 /* FormattingMode.Silent */) {
            editorOrModel.revealPositionInCenterIfOutsideViewport(editorOrModel.getPosition(), 1 /* ScrollType.Immediate */);
        }
    }
    else {
        // use model to apply edits
        const [{ range }] = edits;
        const initialSelection = new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        model.pushEditOperations([initialSelection], edits.map(edit => {
            return {
                text: edit.text,
                range: Range.lift(edit.range),
                forceMoveMarkers: true
            };
        }), undoEdits => {
            for (const { range } of undoEdits) {
                if (Range.areIntersectingOrTouching(range, initialSelection)) {
                    return [new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn)];
                }
            }
            return null;
        });
    }
    accessibilitySignalService.playSignal(AccessibilitySignal.format, { userGesture });
    return true;
}
export async function getDocumentRangeFormattingEditsUntilResult(workerService, languageFeaturesService, model, range, options, token) {
    const providers = languageFeaturesService.documentRangeFormattingEditProvider.ordered(model);
    for (const provider of providers) {
        const rawEdits = await Promise.resolve(provider.provideDocumentRangeFormattingEdits(model, range, options, token)).catch(onUnexpectedExternalError);
        if (isNonEmptyArray(rawEdits)) {
            return await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
        }
    }
    return undefined;
}
export async function getDocumentFormattingEditsUntilResult(workerService, languageFeaturesService, model, options, token) {
    const providers = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
    for (const provider of providers) {
        const rawEdits = await Promise.resolve(provider.provideDocumentFormattingEdits(model, options, token)).catch(onUnexpectedExternalError);
        if (isNonEmptyArray(rawEdits)) {
            return await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
        }
    }
    return undefined;
}
export async function getDocumentFormattingEditsWithSelectedProvider(workerService, languageFeaturesService, editorOrModel, mode, token) {
    const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
    const provider = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
    const selected = await FormattingConflicts.select(provider, model, mode, 1 /* FormattingKind.File */);
    if (selected) {
        const rawEdits = await Promise.resolve(selected.provideDocumentFormattingEdits(model, model.getOptions(), token)).catch(onUnexpectedExternalError);
        return await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
    }
    return undefined;
}
export function getOnTypeFormattingEdits(workerService, languageFeaturesService, model, position, ch, options, token) {
    const providers = languageFeaturesService.onTypeFormattingEditProvider.ordered(model);
    if (providers.length === 0) {
        return Promise.resolve(undefined);
    }
    if (providers[0].autoFormatTriggerCharacters.indexOf(ch) < 0) {
        return Promise.resolve(undefined);
    }
    return Promise.resolve(providers[0].provideOnTypeFormattingEdits(model, position, ch, options, token)).catch(onUnexpectedExternalError).then(edits => {
        return workerService.computeMoreMinimalEdits(model.uri, edits);
    });
}
CommandsRegistry.registerCommand('_executeFormatRangeProvider', async function (accessor, ...args) {
    const [resource, range, options] = args;
    assertType(URI.isUri(resource));
    assertType(Range.isIRange(range));
    const resolverService = accessor.get(ITextModelService);
    const workerService = accessor.get(IEditorWorkerService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const reference = await resolverService.createModelReference(resource);
    try {
        return getDocumentRangeFormattingEditsUntilResult(workerService, languageFeaturesService, reference.object.textEditorModel, Range.lift(range), options, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
CommandsRegistry.registerCommand('_executeFormatDocumentProvider', async function (accessor, ...args) {
    const [resource, options] = args;
    assertType(URI.isUri(resource));
    const resolverService = accessor.get(ITextModelService);
    const workerService = accessor.get(IEditorWorkerService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const reference = await resolverService.createModelReference(resource);
    try {
        return getDocumentFormattingEditsUntilResult(workerService, languageFeaturesService, reference.object.textEditorModel, options, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
CommandsRegistry.registerCommand('_executeFormatOnTypeProvider', async function (accessor, ...args) {
    const [resource, position, ch, options] = args;
    assertType(URI.isUri(resource));
    assertType(Position.isIPosition(position));
    assertType(typeof ch === 'string');
    const resolverService = accessor.get(ITextModelService);
    const workerService = accessor.get(IEditorWorkerService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const reference = await resolverService.createModelReference(resource);
    try {
        return getOnTypeFormattingEdits(workerService, languageFeaturesService, reference.object.textEditorModel, Position.lift(position), ch, options, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9ybWF0L2Jyb3dzZXIvZm9ybWF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUEyQixNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQXVCLGtDQUFrQyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDckosT0FBTyxFQUFxQixZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUk5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFF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