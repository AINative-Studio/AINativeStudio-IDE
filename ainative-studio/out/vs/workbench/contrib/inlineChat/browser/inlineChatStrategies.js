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
import { WindowIntervalTimer } from '../../../../base/browser/dom.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { themeColorFromId, ThemeIcon } from '../../../../base/common/themables.js';
import { StableEditorScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import { LineSource, RenderOptions, renderLines } from '../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { LineRange } from '../../../../editor/common/core/lineRange.js';
import { Range } from '../../../../editor/common/core/range.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { InlineDecoration } from '../../../../editor/common/viewModel.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { countWords } from '../../chat/common/chatWordCounter.js';
import { ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, minimapInlineChatDiffInserted, overviewRulerInlineChatDiffInserted } from '../common/inlineChat.js';
import { assertType } from '../../../../base/common/types.js';
import { performAsyncTextEdit, asProgressiveEdit } from './utils.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Schemas } from '../../../../base/common/network.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DefaultChatTextEditor } from '../../chat/browser/codeBlockPart.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { ConflictActionsFactory } from '../../mergeEditor/browser/view/conflictActions.js';
import { observableValue } from '../../../../base/common/observable.js';
import { IMenuService, MenuItemAction } from '../../../../platform/actions/common/actions.js';
export var HunkAction;
(function (HunkAction) {
    HunkAction[HunkAction["Accept"] = 0] = "Accept";
    HunkAction[HunkAction["Discard"] = 1] = "Discard";
    HunkAction[HunkAction["MoveNext"] = 2] = "MoveNext";
    HunkAction[HunkAction["MovePrev"] = 3] = "MovePrev";
    HunkAction[HunkAction["ToggleDiff"] = 4] = "ToggleDiff";
})(HunkAction || (HunkAction = {}));
let LiveStrategy = class LiveStrategy {
    constructor(_session, _editor, _zone, _showOverlayToolbar, contextKeyService, _editorWorkerService, _accessibilityService, _configService, _menuService, _contextService, _textFileService, _instaService) {
        this._session = _session;
        this._editor = _editor;
        this._zone = _zone;
        this._showOverlayToolbar = _showOverlayToolbar;
        this._editorWorkerService = _editorWorkerService;
        this._accessibilityService = _accessibilityService;
        this._configService = _configService;
        this._menuService = _menuService;
        this._contextService = _contextService;
        this._textFileService = _textFileService;
        this._instaService = _instaService;
        this._decoInsertedText = ModelDecorationOptions.register({
            description: 'inline-modified-line',
            className: 'inline-chat-inserted-range-linehighlight',
            isWholeLine: true,
            overviewRuler: {
                position: OverviewRulerLane.Full,
                color: themeColorFromId(overviewRulerInlineChatDiffInserted),
            },
            minimap: {
                position: 1 /* MinimapPosition.Inline */,
                color: themeColorFromId(minimapInlineChatDiffInserted),
            }
        });
        this._decoInsertedTextRange = ModelDecorationOptions.register({
            description: 'inline-chat-inserted-range-linehighlight',
            className: 'inline-chat-inserted-range',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        this._store = new DisposableStore();
        this._onDidAccept = this._store.add(new Emitter());
        this._onDidDiscard = this._store.add(new Emitter());
        this._editCount = 0;
        this._hunkData = new Map();
        this.onDidAccept = this._onDidAccept.event;
        this.onDidDiscard = this._onDidDiscard.event;
        this._ctxCurrentChangeHasDiff = CTX_INLINE_CHAT_CHANGE_HAS_DIFF.bindTo(contextKeyService);
        this._ctxCurrentChangeShowsDiff = CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF.bindTo(contextKeyService);
        this._progressiveEditingDecorations = this._editor.createDecorationsCollection();
        this._lensActionsFactory = this._store.add(new ConflictActionsFactory(this._editor));
    }
    dispose() {
        this._resetDiff();
        this._store.dispose();
    }
    _resetDiff() {
        this._ctxCurrentChangeHasDiff.reset();
        this._ctxCurrentChangeShowsDiff.reset();
        this._zone.widget.updateStatus('');
        this._progressiveEditingDecorations.clear();
        for (const data of this._hunkData.values()) {
            data.remove();
        }
    }
    async apply() {
        this._resetDiff();
        if (this._editCount > 0) {
            this._editor.pushUndoStop();
        }
        await this._doApplyChanges(true);
    }
    cancel() {
        this._resetDiff();
        return this._session.hunkData.discardAll();
    }
    async makeChanges(edits, obs, undoStopBefore) {
        return this._makeChanges(edits, obs, undefined, undefined, undoStopBefore);
    }
    async makeProgressiveChanges(edits, obs, opts, undoStopBefore) {
        // add decorations once per line that got edited
        const progress = new Progress(edits => {
            const newLines = new Set();
            for (const edit of edits) {
                LineRange.fromRange(edit.range).forEach(line => newLines.add(line));
            }
            const existingRanges = this._progressiveEditingDecorations.getRanges().map(LineRange.fromRange);
            for (const existingRange of existingRanges) {
                existingRange.forEach(line => newLines.delete(line));
            }
            const newDecorations = [];
            for (const line of newLines) {
                newDecorations.push({ range: new Range(line, 1, line, Number.MAX_VALUE), options: this._decoInsertedText });
            }
            this._progressiveEditingDecorations.append(newDecorations);
        });
        return this._makeChanges(edits, obs, opts, progress, undoStopBefore);
    }
    async _makeChanges(edits, obs, opts, progress, undoStopBefore) {
        // push undo stop before first edit
        if (undoStopBefore) {
            this._editor.pushUndoStop();
        }
        this._editCount++;
        if (opts) {
            // ASYNC
            const durationInSec = opts.duration / 1000;
            for (const edit of edits) {
                const wordCount = countWords(edit.text ?? '');
                const speed = wordCount / durationInSec;
                // console.log({ durationInSec, wordCount, speed: wordCount / durationInSec });
                const asyncEdit = asProgressiveEdit(new WindowIntervalTimer(this._zone.domNode), edit, speed, opts.token);
                await performAsyncTextEdit(this._session.textModelN, asyncEdit, progress, obs);
            }
        }
        else {
            // SYNC
            obs.start();
            this._session.textModelN.pushEditOperations(null, edits, (undoEdits) => {
                progress?.report(undoEdits);
                return null;
            });
            obs.stop();
        }
    }
    performHunkAction(hunk, action) {
        const displayData = this._findDisplayData(hunk);
        if (!displayData) {
            // no hunks (left or not yet) found, make sure to
            // finish the sessions
            if (action === 0 /* HunkAction.Accept */) {
                this._onDidAccept.fire();
            }
            else if (action === 1 /* HunkAction.Discard */) {
                this._onDidDiscard.fire();
            }
            return;
        }
        if (action === 0 /* HunkAction.Accept */) {
            displayData.acceptHunk();
        }
        else if (action === 1 /* HunkAction.Discard */) {
            displayData.discardHunk();
        }
        else if (action === 2 /* HunkAction.MoveNext */) {
            displayData.move(true);
        }
        else if (action === 3 /* HunkAction.MovePrev */) {
            displayData.move(false);
        }
        else if (action === 4 /* HunkAction.ToggleDiff */) {
            displayData.toggleDiff?.();
        }
    }
    _findDisplayData(hunkInfo) {
        let result;
        if (hunkInfo) {
            // use context hunk (from tool/buttonbar)
            result = this._hunkData.get(hunkInfo);
        }
        if (!result && this._zone.position) {
            // find nearest from zone position
            const zoneLine = this._zone.position.lineNumber;
            let distance = Number.MAX_SAFE_INTEGER;
            for (const candidate of this._hunkData.values()) {
                if (candidate.hunk.getState() !== 0 /* HunkState.Pending */) {
                    continue;
                }
                const hunkRanges = candidate.hunk.getRangesN();
                if (hunkRanges.length === 0) {
                    // bogous hunk
                    continue;
                }
                const myDistance = zoneLine <= hunkRanges[0].startLineNumber
                    ? hunkRanges[0].startLineNumber - zoneLine
                    : zoneLine - hunkRanges[0].endLineNumber;
                if (myDistance < distance) {
                    distance = myDistance;
                    result = candidate;
                }
            }
        }
        if (!result) {
            // fallback: first hunk that is pending
            result = Iterable.first(Iterable.filter(this._hunkData.values(), candidate => candidate.hunk.getState() === 0 /* HunkState.Pending */));
        }
        return result;
    }
    async renderChanges() {
        this._progressiveEditingDecorations.clear();
        const renderHunks = () => {
            let widgetData;
            changeDecorationsAndViewZones(this._editor, (decorationsAccessor, viewZoneAccessor) => {
                const keysNow = new Set(this._hunkData.keys());
                widgetData = undefined;
                for (const hunkData of this._session.hunkData.getInfo()) {
                    keysNow.delete(hunkData);
                    const hunkRanges = hunkData.getRangesN();
                    let data = this._hunkData.get(hunkData);
                    if (!data) {
                        // first time -> create decoration
                        const decorationIds = [];
                        for (let i = 0; i < hunkRanges.length; i++) {
                            decorationIds.push(decorationsAccessor.addDecoration(hunkRanges[i], i === 0
                                ? this._decoInsertedText
                                : this._decoInsertedTextRange));
                        }
                        const acceptHunk = () => {
                            hunkData.acceptChanges();
                            renderHunks();
                        };
                        const discardHunk = () => {
                            hunkData.discardChanges();
                            renderHunks();
                        };
                        // original view zone
                        const mightContainNonBasicASCII = this._session.textModel0.mightContainNonBasicASCII();
                        const mightContainRTL = this._session.textModel0.mightContainRTL();
                        const renderOptions = RenderOptions.fromEditor(this._editor);
                        const originalRange = hunkData.getRanges0()[0];
                        const source = new LineSource(LineRange.fromRangeInclusive(originalRange).mapToLineArray(l => this._session.textModel0.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                        const domNode = document.createElement('div');
                        domNode.className = 'inline-chat-original-zone2';
                        const result = renderLines(source, renderOptions, [new InlineDecoration(new Range(originalRange.startLineNumber, 1, originalRange.startLineNumber, 1), '', 0 /* InlineDecorationType.Regular */)], domNode);
                        const viewZoneData = {
                            afterLineNumber: -1,
                            heightInLines: result.heightInLines,
                            domNode,
                            ordinal: 50000 + 2 // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                        };
                        const toggleDiff = () => {
                            const scrollState = StableEditorScrollState.capture(this._editor);
                            changeDecorationsAndViewZones(this._editor, (_decorationsAccessor, viewZoneAccessor) => {
                                assertType(data);
                                if (!data.diffViewZoneId) {
                                    const [hunkRange] = hunkData.getRangesN();
                                    viewZoneData.afterLineNumber = hunkRange.startLineNumber - 1;
                                    data.diffViewZoneId = viewZoneAccessor.addZone(viewZoneData);
                                }
                                else {
                                    viewZoneAccessor.removeZone(data.diffViewZoneId);
                                    data.diffViewZoneId = undefined;
                                }
                            });
                            this._ctxCurrentChangeShowsDiff.set(typeof data?.diffViewZoneId === 'string');
                            scrollState.restore(this._editor);
                        };
                        let lensActions;
                        const lensActionsViewZoneIds = [];
                        if (this._showOverlayToolbar && hunkData.getState() === 0 /* HunkState.Pending */) {
                            lensActions = new DisposableStore();
                            const menu = this._menuService.createMenu(MENU_INLINE_CHAT_ZONE, this._contextService);
                            const makeActions = () => {
                                const actions = [];
                                const tuples = menu.getActions({ arg: hunkData });
                                for (const [, group] of tuples) {
                                    for (const item of group) {
                                        if (item instanceof MenuItemAction) {
                                            let text = item.label;
                                            if (item.id === ACTION_TOGGLE_DIFF) {
                                                text = item.checked ? 'Hide Changes' : 'Show Changes';
                                            }
                                            else if (ThemeIcon.isThemeIcon(item.item.icon)) {
                                                text = `$(${item.item.icon.id}) ${text}`;
                                            }
                                            actions.push({
                                                text,
                                                tooltip: item.tooltip,
                                                action: async () => item.run(),
                                            });
                                        }
                                    }
                                }
                                return actions;
                            };
                            const obs = observableValue(this, makeActions());
                            lensActions.add(menu.onDidChange(() => obs.set(makeActions(), undefined)));
                            lensActions.add(menu);
                            lensActions.add(this._lensActionsFactory.createWidget(viewZoneAccessor, hunkRanges[0].startLineNumber - 1, obs, lensActionsViewZoneIds));
                        }
                        const remove = () => {
                            changeDecorationsAndViewZones(this._editor, (decorationsAccessor, viewZoneAccessor) => {
                                assertType(data);
                                for (const decorationId of data.decorationIds) {
                                    decorationsAccessor.removeDecoration(decorationId);
                                }
                                if (data.diffViewZoneId) {
                                    viewZoneAccessor.removeZone(data.diffViewZoneId);
                                }
                                data.decorationIds = [];
                                data.diffViewZoneId = undefined;
                                data.lensActionsViewZoneIds?.forEach(viewZoneAccessor.removeZone);
                                data.lensActionsViewZoneIds = undefined;
                            });
                            lensActions?.dispose();
                        };
                        const move = (next) => {
                            const keys = Array.from(this._hunkData.keys());
                            const idx = keys.indexOf(hunkData);
                            const nextIdx = (idx + (next ? 1 : -1) + keys.length) % keys.length;
                            if (nextIdx !== idx) {
                                const nextData = this._hunkData.get(keys[nextIdx]);
                                this._zone.updatePositionAndHeight(nextData?.position);
                                renderHunks();
                            }
                        };
                        const zoneLineNumber = this._zone.position?.lineNumber ?? this._editor.getPosition().lineNumber;
                        const myDistance = zoneLineNumber <= hunkRanges[0].startLineNumber
                            ? hunkRanges[0].startLineNumber - zoneLineNumber
                            : zoneLineNumber - hunkRanges[0].endLineNumber;
                        data = {
                            hunk: hunkData,
                            decorationIds,
                            diffViewZoneId: '',
                            diffViewZone: viewZoneData,
                            lensActionsViewZoneIds,
                            distance: myDistance,
                            position: hunkRanges[0].getStartPosition().delta(-1),
                            acceptHunk,
                            discardHunk,
                            toggleDiff: !hunkData.isInsertion() ? toggleDiff : undefined,
                            remove,
                            move,
                        };
                        this._hunkData.set(hunkData, data);
                    }
                    else if (hunkData.getState() !== 0 /* HunkState.Pending */) {
                        data.remove();
                    }
                    else {
                        // update distance and position based on modifiedRange-decoration
                        const zoneLineNumber = this._zone.position?.lineNumber ?? this._editor.getPosition().lineNumber;
                        const modifiedRangeNow = hunkRanges[0];
                        data.position = modifiedRangeNow.getStartPosition().delta(-1);
                        data.distance = zoneLineNumber <= modifiedRangeNow.startLineNumber
                            ? modifiedRangeNow.startLineNumber - zoneLineNumber
                            : zoneLineNumber - modifiedRangeNow.endLineNumber;
                    }
                    if (hunkData.getState() === 0 /* HunkState.Pending */ && (!widgetData || data.distance < widgetData.distance)) {
                        widgetData = data;
                    }
                }
                for (const key of keysNow) {
                    const data = this._hunkData.get(key);
                    if (data) {
                        this._hunkData.delete(key);
                        data.remove();
                    }
                }
            });
            if (widgetData) {
                this._zone.reveal(widgetData.position);
                const mode = this._configService.getValue("inlineChat.accessibleDiffView" /* InlineChatConfigKeys.AccessibleDiffView */);
                if (mode === 'on' || mode === 'auto' && this._accessibilityService.isScreenReaderOptimized()) {
                    this._zone.widget.showAccessibleHunk(this._session, widgetData.hunk);
                }
                this._ctxCurrentChangeHasDiff.set(Boolean(widgetData.toggleDiff));
            }
            else if (this._hunkData.size > 0) {
                // everything accepted or rejected
                let oneAccepted = false;
                for (const hunkData of this._session.hunkData.getInfo()) {
                    if (hunkData.getState() === 1 /* HunkState.Accepted */) {
                        oneAccepted = true;
                        break;
                    }
                }
                if (oneAccepted) {
                    this._onDidAccept.fire();
                }
                else {
                    this._onDidDiscard.fire();
                }
            }
            return widgetData;
        };
        return renderHunks()?.position;
    }
    getWholeRangeDecoration() {
        // don't render the blue in live mode
        return [];
    }
    async _doApplyChanges(ignoreLocal) {
        const untitledModels = [];
        const editor = this._instaService.createInstance(DefaultChatTextEditor);
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response?.response) {
                continue;
            }
            for (const item of request.response.response.value) {
                if (item.kind !== 'textEditGroup') {
                    continue;
                }
                if (ignoreLocal && isEqual(item.uri, this._session.textModelN.uri)) {
                    continue;
                }
                await editor.apply(request.response, item, undefined);
                if (item.uri.scheme === Schemas.untitled) {
                    const untitled = this._textFileService.untitled.get(item.uri);
                    if (untitled) {
                        untitledModels.push(untitled);
                    }
                }
            }
        }
        for (const untitledModel of untitledModels) {
            if (!untitledModel.isDisposed()) {
                await untitledModel.resolve();
                await untitledModel.save({ reason: 1 /* SaveReason.EXPLICIT */ });
            }
        }
    }
};
LiveStrategy = __decorate([
    __param(4, IContextKeyService),
    __param(5, IEditorWorkerService),
    __param(6, IAccessibilityService),
    __param(7, IConfigurationService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, ITextFileService),
    __param(11, IInstantiationService)
], LiveStrategy);
export { LiveStrategy };
function changeDecorationsAndViewZones(editor, callback) {
    editor.changeDecorations(decorationsAccessor => {
        editor.changeViewZones(viewZoneAccessor => {
            callback(decorationsAccessor, viewZoneAccessor);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFN0cmF0ZWdpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRTdHJhdGVnaWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLDRGQUE0RixDQUFDO0FBRXBKLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFaEUsT0FBTyxFQUFnRyxpQkFBaUIsRUFBMEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3TCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sd0NBQXdDLENBQUM7QUFDaEcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFD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