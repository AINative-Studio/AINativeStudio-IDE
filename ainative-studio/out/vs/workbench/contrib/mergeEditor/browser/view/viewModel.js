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
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived, derivedObservableWithWritableCache, observableValue, transaction } from '../../../../../base/common/observable.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { LineRange } from '../model/lineRange.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
let MergeEditorViewModel = class MergeEditorViewModel extends Disposable {
    constructor(model, inputCodeEditorView1, inputCodeEditorView2, resultCodeEditorView, baseCodeEditorView, showNonConflictingChanges, configurationService, notificationService) {
        super();
        this.model = model;
        this.inputCodeEditorView1 = inputCodeEditorView1;
        this.inputCodeEditorView2 = inputCodeEditorView2;
        this.resultCodeEditorView = resultCodeEditorView;
        this.baseCodeEditorView = baseCodeEditorView;
        this.showNonConflictingChanges = showNonConflictingChanges;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.manuallySetActiveModifiedBaseRange = observableValue(this, { range: undefined, counter: 0 });
        this.attachedHistory = this._register(new AttachedHistory(this.model.resultTextModel));
        this.shouldUseAppendInsteadOfAccept = observableConfigValue('mergeEditor.shouldUseAppendInsteadOfAccept', false, this.configurationService);
        this.counter = 0;
        this.lastFocusedEditor = derivedObservableWithWritableCache(this, (reader, lastValue) => {
            const editors = [
                this.inputCodeEditorView1,
                this.inputCodeEditorView2,
                this.resultCodeEditorView,
                this.baseCodeEditorView.read(reader),
            ];
            const view = editors.find((e) => e && e.isFocused.read(reader));
            return view ? { view, counter: this.counter++ } : lastValue || { view: undefined, counter: this.counter++ };
        });
        this.baseShowDiffAgainst = derived(this, reader => {
            const lastFocusedEditor = this.lastFocusedEditor.read(reader);
            if (lastFocusedEditor.view === this.inputCodeEditorView1) {
                return 1;
            }
            else if (lastFocusedEditor.view === this.inputCodeEditorView2) {
                return 2;
            }
            return undefined;
        });
        this.selectionInBase = derived(this, reader => {
            const sourceEditor = this.lastFocusedEditor.read(reader).view;
            if (!sourceEditor) {
                return undefined;
            }
            const selections = sourceEditor.selection.read(reader) || [];
            const rangesInBase = selections.map((selection) => {
                if (sourceEditor === this.inputCodeEditorView1) {
                    return this.model.translateInputRangeToBase(1, selection);
                }
                else if (sourceEditor === this.inputCodeEditorView2) {
                    return this.model.translateInputRangeToBase(2, selection);
                }
                else if (sourceEditor === this.resultCodeEditorView) {
                    return this.model.translateResultRangeToBase(selection);
                }
                else if (sourceEditor === this.baseCodeEditorView.read(reader)) {
                    return selection;
                }
                else {
                    return selection;
                }
            });
            return {
                rangesInBase,
                sourceEditor
            };
        });
        this.activeModifiedBaseRange = derived(this, (reader) => {
            /** @description activeModifiedBaseRange */
            const focusedEditor = this.lastFocusedEditor.read(reader);
            const manualRange = this.manuallySetActiveModifiedBaseRange.read(reader);
            if (manualRange.counter > focusedEditor.counter) {
                return manualRange.range;
            }
            if (!focusedEditor.view) {
                return;
            }
            const cursorLineNumber = focusedEditor.view.cursorLineNumber.read(reader);
            if (!cursorLineNumber) {
                return undefined;
            }
            const modifiedBaseRanges = this.model.modifiedBaseRanges.read(reader);
            return modifiedBaseRanges.find((r) => {
                const range = this.getRangeOfModifiedBaseRange(focusedEditor.view, r, reader);
                return range.isEmpty
                    ? range.startLineNumber === cursorLineNumber
                    : range.contains(cursorLineNumber);
            });
        });
        this._register(resultCodeEditorView.editor.onDidChangeModelContent(e => {
            if (this.model.isApplyingEditInResult || e.isRedoing || e.isUndoing) {
                return;
            }
            const baseRangeStates = [];
            for (const change of e.changes) {
                const rangeInBase = this.model.translateResultRangeToBase(Range.lift(change.range));
                const baseRanges = this.model.findModifiedBaseRangesInRange(new LineRange(rangeInBase.startLineNumber, rangeInBase.endLineNumber - rangeInBase.startLineNumber));
                if (baseRanges.length === 1) {
                    const isHandled = this.model.isHandled(baseRanges[0]).get();
                    if (!isHandled) {
                        baseRangeStates.push(baseRanges[0]);
                    }
                }
            }
            if (baseRangeStates.length === 0) {
                return;
            }
            const element = {
                model: this.model,
                redo() {
                    transaction(tx => {
                        /** @description Mark conflicts touched by manual edits as handled */
                        for (const r of baseRangeStates) {
                            this.model.setHandled(r, true, tx);
                        }
                    });
                },
                undo() {
                    transaction(tx => {
                        /** @description Mark conflicts touched by manual edits as handled */
                        for (const r of baseRangeStates) {
                            this.model.setHandled(r, false, tx);
                        }
                    });
                },
            };
            this.attachedHistory.pushAttachedHistoryElement(element);
            element.redo();
        }));
    }
    getRangeOfModifiedBaseRange(editor, modifiedBaseRange, reader) {
        if (editor === this.resultCodeEditorView) {
            return this.model.getLineRangeInResult(modifiedBaseRange.baseRange, reader);
        }
        else if (editor === this.baseCodeEditorView.get()) {
            return modifiedBaseRange.baseRange;
        }
        else {
            const input = editor === this.inputCodeEditorView1 ? 1 : 2;
            return modifiedBaseRange.getInputRange(input);
        }
    }
    setActiveModifiedBaseRange(range, tx) {
        this.manuallySetActiveModifiedBaseRange.set({ range, counter: this.counter++ }, tx);
    }
    setState(baseRange, state, tx, inputNumber) {
        this.manuallySetActiveModifiedBaseRange.set({ range: baseRange, counter: this.counter++ }, tx);
        this.model.setState(baseRange, state, inputNumber, tx);
        this.lastFocusedEditor.clearCache(tx);
    }
    goToConflict(getModifiedBaseRange) {
        let editor = this.lastFocusedEditor.get().view;
        if (!editor) {
            editor = this.resultCodeEditorView;
        }
        const curLineNumber = editor.editor.getPosition()?.lineNumber;
        if (curLineNumber === undefined) {
            return;
        }
        const modifiedBaseRange = getModifiedBaseRange(editor, curLineNumber);
        if (modifiedBaseRange) {
            const range = this.getRangeOfModifiedBaseRange(editor, modifiedBaseRange, undefined);
            editor.editor.focus();
            let startLineNumber = range.startLineNumber;
            let endLineNumberExclusive = range.endLineNumberExclusive;
            if (range.startLineNumber > editor.editor.getModel().getLineCount()) {
                transaction(tx => {
                    this.setActiveModifiedBaseRange(modifiedBaseRange, tx);
                });
                startLineNumber = endLineNumberExclusive = editor.editor.getModel().getLineCount();
            }
            editor.editor.setPosition({
                lineNumber: startLineNumber,
                column: editor.editor.getModel().getLineFirstNonWhitespaceColumn(startLineNumber),
            });
            editor.editor.revealLinesNearTop(startLineNumber, endLineNumberExclusive, 0 /* ScrollType.Smooth */);
        }
    }
    goToNextModifiedBaseRange(predicate) {
        this.goToConflict((e, l) => this.model.modifiedBaseRanges
            .get()
            .find((r) => predicate(r) &&
            this.getRangeOfModifiedBaseRange(e, r, undefined).startLineNumber > l) ||
            this.model.modifiedBaseRanges
                .get()
                .find((r) => predicate(r)));
    }
    goToPreviousModifiedBaseRange(predicate) {
        this.goToConflict((e, l) => findLast(this.model.modifiedBaseRanges.get(), (r) => predicate(r) &&
            this.getRangeOfModifiedBaseRange(e, r, undefined).endLineNumberExclusive < l) ||
            findLast(this.model.modifiedBaseRanges.get(), (r) => predicate(r)));
    }
    toggleActiveConflict(inputNumber) {
        const activeModifiedBaseRange = this.activeModifiedBaseRange.get();
        if (!activeModifiedBaseRange) {
            this.notificationService.error(localize('noConflictMessage', "There is currently no conflict focused that can be toggled."));
            return;
        }
        transaction(tx => {
            /** @description Toggle Active Conflict */
            this.setState(activeModifiedBaseRange, this.model.getState(activeModifiedBaseRange).get().toggle(inputNumber), tx, inputNumber);
        });
    }
    acceptAll(inputNumber) {
        transaction(tx => {
            /** @description Toggle Active Conflict */
            for (const range of this.model.modifiedBaseRanges.get()) {
                this.setState(range, this.model.getState(range).get().withInputValue(inputNumber, true), tx, inputNumber);
            }
        });
    }
};
MergeEditorViewModel = __decorate([
    __param(6, IConfigurationService),
    __param(7, INotificationService)
], MergeEditorViewModel);
export { MergeEditorViewModel };
class AttachedHistory extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this.attachedHistory = [];
        this.previousAltId = this.model.getAlternativeVersionId();
        this._register(model.onDidChangeContent((e) => {
            const currentAltId = model.getAlternativeVersionId();
            if (e.isRedoing) {
                for (const item of this.attachedHistory) {
                    if (this.previousAltId < item.altId && item.altId <= currentAltId) {
                        item.element.redo();
                    }
                }
            }
            else if (e.isUndoing) {
                for (let i = this.attachedHistory.length - 1; i >= 0; i--) {
                    const item = this.attachedHistory[i];
                    if (currentAltId < item.altId && item.altId <= this.previousAltId) {
                        item.element.undo();
                    }
                }
            }
            else {
                // The user destroyed the redo stack by performing a non redo/undo operation.
                // Thus we also need to remove all history elements after the last version id.
                while (this.attachedHistory.length > 0
                    && this.attachedHistory[this.attachedHistory.length - 1].altId > this.previousAltId) {
                    this.attachedHistory.pop();
                }
            }
            this.previousAltId = currentAltId;
        }));
    }
    /**
     * Pushes an history item that is tied to the last text edit (or an extension of it).
     * When the last text edit is undone/redone, so is is this history item.
     */
    pushAttachedHistoryElement(element) {
        this.attachedHistory.push({ altId: this.model.getAlternativeVersionId(), element });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy92aWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFzQyxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekssT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBR25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFNdEcsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBT25ELFlBQ2lCLEtBQXVCLEVBQ3ZCLG9CQUF5QyxFQUN6QyxvQkFBeUMsRUFDekMsb0JBQTBDLEVBQzFDLGtCQUErRCxFQUMvRCx5QkFBK0MsRUFDeEMsb0JBQTRELEVBQzdELG1CQUEwRDtRQUVoRixLQUFLLEVBQUUsQ0FBQztRQVRRLFVBQUssR0FBTCxLQUFLLENBQWtCO1FBQ3ZCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBcUI7UUFDekMs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