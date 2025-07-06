/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
// import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
// import { throttle } from '../../../../base/common/decorators.js';
import { findDiffs } from './helpers/findDiffs.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { RenderOptions } from '../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
// import { IModelService } from '../../../../editor/common/services/model.js';
import * as dom from '../../../../base/browser/dom.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { IConsistentEditorItemService, IConsistentItemService } from './helperServices/consistentItemService.js';
import { voidPrefixAndSuffix, ctrlKStream_userMessage, ctrlKStream_systemMessage, defaultQuickEditFimTags, rewriteCode_systemMessage, rewriteCode_userMessage, searchReplaceGivenDescription_systemMessage, searchReplaceGivenDescription_userMessage, tripleTick, } from '../common/prompt/prompts.js';
import { IVoidCommandBarService } from './voidCommandBarService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { VOID_ACCEPT_DIFF_ACTION_ID, VOID_REJECT_DIFF_ACTION_ID } from './actionIDs.js';
import { mountCtrlK } from './react/out/quick-edit-tsx/index.js';
import { extractCodeFromFIM, extractCodeFromRegular, extractSearchReplaceBlocks } from '../common/helpers/extractCodeFromResult.js';
import { INotificationService, } from '../../../../platform/notification/common/notification.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { IMetricsService } from '../common/metricsService.js';
import { IEditCodeService, } from './editCodeServiceInterface.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { deepClone } from '../../../../base/common/objects.js';
import { acceptBg, acceptBorder, buttonFontSize, buttonTextColor, rejectBg, rejectBorder } from '../common/helpers/colors.js';
import { diffAreaSnapshotKeys } from '../common/editCodeServiceTypes.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
// import { isMacintosh } from '../../../../base/common/platform.js';
// import { VOID_OPEN_SETTINGS_ACTION_ID } from './voidSettingsPane.js';
const numLinesOfStr = (str) => str.split('\n').length;
export const getLengthOfTextPx = ({ tabWidth, spaceWidth, content }) => {
    let lengthOfTextPx = 0;
    for (const char of content) {
        if (char === '\t') {
            lengthOfTextPx += tabWidth;
        }
        else {
            lengthOfTextPx += spaceWidth;
        }
    }
    return lengthOfTextPx;
};
const getLeadingWhitespacePx = (editor, startLine) => {
    const model = editor.getModel();
    if (!model) {
        return 0;
    }
    // Get the line content, defaulting to empty string if line doesn't exist
    const lineContent = model.getLineContent(startLine) || '';
    // Find the first non-whitespace character
    const firstNonWhitespaceIndex = lineContent.search(/\S/);
    // Extract leading whitespace, handling case where line is all whitespace
    const leadingWhitespace = firstNonWhitespaceIndex === -1
        ? lineContent
        : lineContent.slice(0, firstNonWhitespaceIndex);
    // Get font information from editor render options
    const { tabSize: numSpacesInTab } = model.getFormattingOptions();
    const spaceWidth = editor.getOption(52 /* EditorOption.fontInfo */).spaceWidth;
    const tabWidth = numSpacesInTab * spaceWidth;
    const leftWhitespacePx = getLengthOfTextPx({
        tabWidth,
        spaceWidth,
        content: leadingWhitespace
    });
    return leftWhitespacePx;
};
// Helper function to remove whitespace except newlines
const removeWhitespaceExceptNewlines = (str) => {
    return str.replace(/[^\S\n]+/g, '');
};
// finds block.orig in fileContents and return its range in file
// startingAtLine is 1-indexed and inclusive
// returns 1-indexed lines
const findTextInCode = (text, fileContents, canFallbackToRemoveWhitespace, opts) => {
    const returnAns = (fileContents, idx) => {
        const startLine = numLinesOfStr(fileContents.substring(0, idx + 1));
        const numLines = numLinesOfStr(text);
        const endLine = startLine + numLines - 1;
        return [startLine, endLine];
    };
    const startingAtLineIdx = (fileContents) => opts?.startingAtLine !== undefined ?
        fileContents.split('\n').slice(0, opts.startingAtLine).join('\n').length // num characters in all lines before startingAtLine
        : 0;
    // idx = starting index in fileContents
    let idx = fileContents.indexOf(text, startingAtLineIdx(fileContents));
    // if idx was found
    if (idx !== -1) {
        return returnAns(fileContents, idx);
    }
    if (!canFallbackToRemoveWhitespace)
        return 'Not found';
    // try to find it ignoring all whitespace this time
    text = removeWhitespaceExceptNewlines(text);
    fileContents = removeWhitespaceExceptNewlines(fileContents);
    idx = fileContents.indexOf(text, startingAtLineIdx(fileContents));
    if (idx === -1)
        return 'Not found';
    const lastIdx = fileContents.lastIndexOf(text);
    if (lastIdx !== idx)
        return 'Not unique';
    return returnAns(fileContents, idx);
};
let EditCodeService = class EditCodeService extends Disposable {
    constructor(_codeEditorService, _modelService, _undoRedoService, _llmMessageService, _consistentItemService, _instantiationService, _consistentEditorItemService, _metricsService, _notificationService, _settingsService, _voidModelService, _convertToLLMMessageService) {
        super();
        this._codeEditorService = _codeEditorService;
        this._modelService = _modelService;
        this._undoRedoService = _undoRedoService;
        this._llmMessageService = _llmMessageService;
        this._consistentItemService = _consistentItemService;
        this._instantiationService = _instantiationService;
        this._consistentEditorItemService = _consistentEditorItemService;
        this._metricsService = _metricsService;
        this._notificationService = _notificationService;
        this._settingsService = _settingsService;
        this._voidModelService = _voidModelService;
        this._convertToLLMMessageService = _convertToLLMMessageService;
        // URI <--> model
        this.diffAreasOfURI = {}; // uri -> diffareaId
        this.diffAreaOfId = {}; // diffareaId -> diffArea
        this.diffOfId = {}; // diffid -> diff (redundant with diffArea._diffOfId)
        // events
        // uri: diffZones  // listen on change diffZones
        this._onDidAddOrDeleteDiffZones = new Emitter();
        this.onDidAddOrDeleteDiffZones = this._onDidAddOrDeleteDiffZones.event;
        // diffZone: [uri], diffs, isStreaming  // listen on change diffs, change streaming (uri is const)
        this._onDidChangeDiffsInDiffZoneNotStreaming = new Emitter();
        this._onDidChangeStreamingInDiffZone = new Emitter();
        this.onDidChangeDiffsInDiffZoneNotStreaming = this._onDidChangeDiffsInDiffZoneNotStreaming.event;
        this.onDidChangeStreamingInDiffZone = this._onDidChangeStreamingInDiffZone.event;
        // ctrlKZone: [uri], isStreaming  // listen on change streaming
        this._onDidChangeStreamingInCtrlKZone = new Emitter();
        this.onDidChangeStreamingInCtrlKZone = this._onDidChangeStreamingInCtrlKZone.event;
        // private _notifyError = (e: Parameters<OnError>[0]) => {
        // 	const details = errorDetails(e.fullError)
        // 	this._notificationService.notify({
        // 		severity: Severity.Warning,
        // 		message: `Void Error: ${e.message}`,
        // 		actions: {
        // 			secondary: [{
        // 				id: 'void.onerror.opensettings',
        // 				enabled: true,
        // 				label: `Open Void's settings`,
        // 				tooltip: '',
        // 				class: undefined,
        // 				run: () => { this._commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID) }
        // 			}]
        // 		},
        // 		source: details ? `(Hold ${isMacintosh ? 'Option' : 'Alt'} to hover) - ${details}\n\nIf this persists, feel free to [report](https://github.com/voideditor/void/issues/new) it.` : undefined
        // 	})
        // }
        // highlight the region
        this._addLineDecoration = (model, startLine, endLine, className, options) => {
            if (model === null)
                return;
            const id = model.changeDecorations(accessor => accessor.addDecoration({ startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: Number.MAX_SAFE_INTEGER }, {
                className: className,
                description: className,
                isWholeLine: true,
                ...options
            }));
            const disposeHighlight = () => {
                if (id && !model.isDisposed())
                    model.changeDecorations(accessor => accessor.removeDecoration(id));
            };
            return disposeHighlight;
        };
        this._addDiffAreaStylesToURI = (uri) => {
            const { model } = this._voidModelService.getModel(uri);
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type === 'DiffZone') {
                    // add sweep styles to the diffZone
                    if (diffArea._streamState.isStreaming) {
                        // sweepLine ... sweepLine
                        const fn1 = this._addLineDecoration(model, diffArea._streamState.line, diffArea._streamState.line, 'void-sweepIdxBG');
                        // sweepLine+1 ... endLine
                        const fn2 = diffArea._streamState.line + 1 <= diffArea.endLine ?
                            this._addLineDecoration(model, diffArea._streamState.line + 1, diffArea.endLine, 'void-sweepBG')
                            : null;
                        diffArea._removeStylesFns.add(() => { fn1?.(); fn2?.(); });
                    }
                }
                else if (diffArea.type === 'CtrlKZone' && diffArea._linkedStreamingDiffZone === null) {
                    // highlight zone's text
                    const fn = this._addLineDecoration(model, diffArea.startLine, diffArea.endLine, 'void-highlightBG');
                    diffArea._removeStylesFns.add(() => fn?.());
                }
            }
        };
        this._computeDiffsAndAddStylesToURI = (uri) => {
            const { model } = this._voidModelService.getModel(uri);
            if (model === null)
                return;
            const fullFileText = model.getValue(1 /* EndOfLinePreference.LF */);
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type !== 'DiffZone')
                    continue;
                const newDiffAreaCode = fullFileText.split('\n').slice((diffArea.startLine - 1), (diffArea.endLine - 1) + 1).join('\n');
                const computedDiffs = findDiffs(diffArea.originalCode, newDiffAreaCode);
                for (let computedDiff of computedDiffs) {
                    if (computedDiff.type === 'deletion') {
                        computedDiff.startLine += diffArea.startLine - 1;
                    }
                    if (computedDiff.type === 'edit' || computedDiff.type === 'insertion') {
                        computedDiff.startLine += diffArea.startLine - 1;
                        computedDiff.endLine += diffArea.startLine - 1;
                    }
                    this._addDiff(computedDiff, diffArea);
                }
            }
        };
        this.mostRecentTextOfCtrlKZoneId = {};
        this._addCtrlKZoneInput = (ctrlKZone) => {
            const { editorId } = ctrlKZone;
            const editor = this._codeEditorService.listCodeEditors().find(e => e.getId() === editorId);
            if (!editor) {
                return null;
            }
            let zoneId = null;
            let viewZone_ = null;
            const textAreaRef = { current: null };
            const paddingLeft = getLeadingWhitespacePx(editor, ctrlKZone.startLine);
            const itemId = this._consistentEditorItemService.addToEditor(editor, () => {
                const domNode = document.createElement('div');
                domNode.style.zIndex = '1';
                domNode.style.height = 'auto';
                domNode.style.paddingLeft = `${paddingLeft}px`;
                const viewZone = {
                    afterLineNumber: ctrlKZone.startLine - 1,
                    domNode: domNode,
                    // heightInPx: 80,
                    suppressMouseDown: false,
                    showInHiddenAreas: true,
                };
                viewZone_ = viewZone;
                // mount zone
                editor.changeViewZones(accessor => {
                    zoneId = accessor.addZone(viewZone);
                });
                // mount react
                let disposeFn = undefined;
                this._instantiationService.invokeFunction(accessor => {
                    disposeFn = mountCtrlK(domNode, accessor, {
                        diffareaid: ctrlKZone.diffareaid,
                        textAreaRef: (r) => {
                            textAreaRef.current = r;
                            if (!textAreaRef.current)
                                return;
                            if (!(ctrlKZone.diffareaid in this.mostRecentTextOfCtrlKZoneId)) { // detect first mount this way (a hack)
                                this.mostRecentTextOfCtrlKZoneId[ctrlKZone.diffareaid] = undefined;
                                setTimeout(() => textAreaRef.current?.focus(), 100);
                            }
                        },
                        onChangeHeight(height) {
                            if (height === 0)
                                return; // the viewZone sets this height to the container if it's out of view, ignore it
                            viewZone.heightInPx = height;
                            // re-render with this new height
                            editor.changeViewZones(accessor => {
                                if (zoneId)
                                    accessor.layoutZone(zoneId);
                            });
                        },
                        onChangeText: (text) => {
                            this.mostRecentTextOfCtrlKZoneId[ctrlKZone.diffareaid] = text;
                        },
                        initText: this.mostRecentTextOfCtrlKZoneId[ctrlKZone.diffareaid] ?? null,
                    })?.dispose;
                });
                // cleanup
                return () => {
                    editor.changeViewZones(accessor => { if (zoneId)
                        accessor.removeZone(zoneId); });
                    disposeFn?.();
                };
            });
            return {
                textAreaRef,
                refresh: () => editor.changeViewZones(accessor => {
                    if (zoneId && viewZone_) {
                        viewZone_.afterLineNumber = ctrlKZone.startLine - 1;
                        accessor.layoutZone(zoneId);
                    }
                }),
                dispose: () => {
                    this._consistentEditorItemService.removeFromEditor(itemId);
                },
            };
        };
        this._refreshCtrlKInputs = async (uri) => {
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type !== 'CtrlKZone')
                    continue;
                if (!diffArea._mountInfo) {
                    diffArea._mountInfo = this._addCtrlKZoneInput(diffArea);
                    console.log('MOUNTED CTRLK', diffArea.diffareaid);
                }
                else {
                    diffArea._mountInfo.refresh();
                }
            }
        };
        this._addDiffStylesToURI = (uri, diff) => {
            const { type, diffid } = diff;
            const disposeInThisEditorFns = [];
            const { model } = this._voidModelService.getModel(uri);
            // green decoration and minimap decoration
            if (type !== 'deletion') {
                const fn = this._addLineDecoration(model, diff.startLine, diff.endLine, 'void-greenBG', {
                    minimap: { color: { id: 'minimapGutter.addedBackground' }, position: 2 },
                    overviewRuler: { color: { id: 'editorOverviewRuler.addedForeground' }, position: 7 }
                });
                disposeInThisEditorFns.push(() => { fn?.(); });
            }
            // red in a view zone
            if (type !== 'insertion') {
                const consistentZoneId = this._consistentItemService.addConsistentItemToURI({
                    uri,
                    fn: (editor) => {
                        const domNode = document.createElement('div');
                        domNode.className = 'void-redBG';
                        const renderOptions = RenderOptions.fromEditor(editor);
                        const processedText = diff.originalCode.replace(/\t/g, ' '.repeat(renderOptions.tabSize));
                        const lines = processedText.split('\n');
                        const linesContainer = document.createElement('div');
                        linesContainer.style.fontFamily = renderOptions.fontInfo.fontFamily;
                        linesContainer.style.fontSize = `${renderOptions.fontInfo.fontSize}px`;
                        linesContainer.style.lineHeight = `${renderOptions.fontInfo.lineHeight}px`;
                        // linesContainer.style.tabSize = `${tabWidth}px` // \t
                        linesContainer.style.whiteSpace = 'pre';
                        linesContainer.style.position = 'relative';
                        linesContainer.style.width = '100%';
                        lines.forEach(line => {
                            // div for current line
                            const lineDiv = document.createElement('div');
                            lineDiv.className = 'view-line';
                            lineDiv.style.whiteSpace = 'pre';
                            lineDiv.style.position = 'relative';
                            lineDiv.style.height = `${renderOptions.fontInfo.lineHeight}px`;
                            // span (this is just how vscode does it)
                            const span = document.createElement('span');
                            span.textContent = line || '\u00a0';
                            span.style.whiteSpace = 'pre';
                            span.style.display = 'inline-block';
                            lineDiv.appendChild(span);
                            linesContainer.appendChild(lineDiv);
                        });
                        domNode.appendChild(linesContainer);
                        // Calculate height based on number of lines and line height
                        const heightInLines = lines.length;
                        const minWidthInPx = Math.max(...lines.map(line => Math.ceil(renderOptions.fontInfo.typicalFullwidthCharacterWidth * line.length)));
                        const viewZone = {
                            afterLineNumber: diff.startLine - 1,
                            heightInLines,
                            minWidthInPx,
                            domNode,
                            marginDomNode: document.createElement('div'),
                            suppressMouseDown: false,
                            showInHiddenAreas: false,
                        };
                        let zoneId = null;
                        editor.changeViewZones(accessor => { zoneId = accessor.addZone(viewZone); });
                        return () => editor.changeViewZones(accessor => { if (zoneId)
                            accessor.removeZone(zoneId); });
                    },
                });
                disposeInThisEditorFns.push(() => { this._consistentItemService.removeConsistentItemFromURI(consistentZoneId); });
            }
            const diffZone = this.diffAreaOfId[diff.diffareaid];
            if (diffZone.type === 'DiffZone' && !diffZone._streamState.isStreaming) {
                // Accept | Reject widget
                const consistentWidgetId = this._consistentItemService.addConsistentItemToURI({
                    uri,
                    fn: (editor) => {
                        let startLine;
                        let offsetLines;
                        if (diff.type === 'insertion' || diff.type === 'edit') {
                            startLine = diff.startLine; // green start
                            offsetLines = 0;
                        }
                        else if (diff.type === 'deletion') {
                            // if diff.startLine is out of bounds
                            if (diff.startLine === 1) {
                                const numRedLines = diff.originalEndLine - diff.originalStartLine + 1;
                                startLine = diff.startLine;
                                offsetLines = -numRedLines;
                            }
                            else {
                                startLine = diff.startLine - 1;
                                offsetLines = 1;
                            }
                        }
                        else {
                            throw new Error('Void 1');
                        }
                        const buttonsWidget = this._instantiationService.createInstance(AcceptRejectInlineWidget, {
                            editor,
                            onAccept: () => {
                                this.acceptDiff({ diffid });
                                this._metricsService.capture('Accept Diff', { diffid });
                            },
                            onReject: () => {
                                this.rejectDiff({ diffid });
                                this._metricsService.capture('Reject Diff', { diffid });
                            },
                            diffid: diffid.toString(),
                            startLine,
                            offsetLines
                        });
                        return () => { buttonsWidget.dispose(); };
                    }
                });
                disposeInThisEditorFns.push(() => { this._consistentItemService.removeConsistentItemFromURI(consistentWidgetId); });
            }
            const disposeInEditor = () => { disposeInThisEditorFns.forEach(f => f()); };
            return disposeInEditor;
        };
        this.weAreWriting = false;
        this._getCurrentVoidFileSnapshot = (uri) => {
            const { model } = this._voidModelService.getModel(uri);
            const snapshottedDiffAreaOfId = {};
            for (const diffareaid in this.diffAreaOfId) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea._URI.fsPath !== uri.fsPath)
                    continue;
                snapshottedDiffAreaOfId[diffareaid] = deepClone(Object.fromEntries(diffAreaSnapshotKeys.map(key => [key, diffArea[key]])));
            }
            const entireFileCode = model ? model.getValue(1 /* EndOfLinePreference.LF */) : '';
            // this._noLongerNeedModelReference(uri)
            return {
                snapshottedDiffAreaOfId,
                entireFileCode, // the whole file's code
            };
        };
        this._restoreVoidFileSnapshot = async (uri, snapshot) => {
            // for each diffarea in this uri, stop streaming if currently streaming
            for (const diffareaid in this.diffAreaOfId) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type === 'DiffZone')
                    this._stopIfStreaming(diffArea);
            }
            // delete all diffareas on this uri (clearing their styles)
            this._deleteAllDiffAreas(uri);
            const { snapshottedDiffAreaOfId, entireFileCode: entireModelCode } = deepClone(snapshot); // don't want to destroy the snapshot
            // restore diffAreaOfId and diffAreasOfModelId
            for (const diffareaid in snapshottedDiffAreaOfId) {
                const snapshottedDiffArea = snapshottedDiffAreaOfId[diffareaid];
                if (snapshottedDiffArea.type === 'DiffZone') {
                    this.diffAreaOfId[diffareaid] = {
                        ...snapshottedDiffArea,
                        type: 'DiffZone',
                        _diffOfId: {},
                        _URI: uri,
                        _streamState: { isStreaming: false }, // when restoring, we will never be streaming
                        _removeStylesFns: new Set(),
                    };
                }
                else if (snapshottedDiffArea.type === 'CtrlKZone') {
                    this.diffAreaOfId[diffareaid] = {
                        ...snapshottedDiffArea,
                        _URI: uri,
                        _removeStylesFns: new Set(),
                        _mountInfo: null,
                        _linkedStreamingDiffZone: null, // when restoring, we will never be streaming
                    };
                }
                this._addOrInitializeDiffAreaAtURI(uri, diffareaid);
            }
            this._onDidAddOrDeleteDiffZones.fire({ uri });
            // restore file content
            this._writeURIText(uri, entireModelCode, 'wholeFileRange', { shouldRealignDiffAreas: false });
            // this._noLongerNeedModelReference(uri)
        };
        this._addOrInitializeDiffAreaAtURI = (uri, diffareaid) => {
            if (!(uri.fsPath in this.diffAreasOfURI))
                this.diffAreasOfURI[uri.fsPath] = new Set();
            this.diffAreasOfURI[uri.fsPath]?.add(diffareaid.toString());
        };
        this._diffareaidPool = 0; // each diffarea has an id
        this._diffidPool = 0; // each diff has an id
        /**
         * Generates a human-readable error message for an invalid ORIGINAL search block.
         */
        this._errContentOfInvalidStr = (str, blockOrig) => {
            const problematicCode = `${tripleTick[0]}\n${JSON.stringify(blockOrig)}\n${tripleTick[1]}`;
            // use a switch for better readability / exhaustiveness check
            let descStr;
            switch (str) {
                case 'Not found':
                    descStr = `The edit was not applied. The text in ORIGINAL must EXACTLY match lines of code in the file, but there was no match for:\n${problematicCode}. Ensure you have the latest version of the file, and ensure the ORIGINAL code matches a code excerpt exactly.`;
                    break;
                case 'Not unique':
                    descStr = `The edit was not applied. The text in ORIGINAL must be unique in the file being edited, but the following ORIGINAL code appears multiple times in the file:\n${problematicCode}. Ensure you have the latest version of the file, and ensure the ORIGINAL code is unique.`;
                    break;
                case 'Has overlap':
                    descStr = `The edit was not applied. The text in the ORIGINAL blocks must not overlap, but the following ORIGINAL code had overlap with another ORIGINAL string:\n${problematicCode}. Ensure you have the latest version of the file, and ensure the ORIGINAL code blocks do not overlap.`;
                    break;
                default:
                    descStr = '';
            }
            return descStr;
        };
        // remove a batch of diffareas all at once (and handle accept/reject of their diffs)
        this.acceptOrRejectAllDiffAreas = async ({ uri, behavior, removeCtrlKs, _addToHistory }) => {
            const diffareaids = this.diffAreasOfURI[uri.fsPath];
            if ((diffareaids?.size ?? 0) === 0)
                return; // do nothing
            const { onFinishEdit } = _addToHistory === false ? { onFinishEdit: () => { } } : this._addToHistory(uri);
            for (const diffareaid of diffareaids ?? []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (!diffArea)
                    continue;
                if (diffArea.type === 'DiffZone') {
                    if (behavior === 'reject') {
                        this._revertDiffZone(diffArea);
                        this._deleteDiffZone(diffArea);
                    }
                    else if (behavior === 'accept')
                        this._deleteDiffZone(diffArea);
                }
                else if (diffArea.type === 'CtrlKZone' && removeCtrlKs) {
                    this._deleteCtrlKZone(diffArea);
                }
            }
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
        };
        // this function initializes data structures and listens for changes
        const registeredModelURIs = new Set();
        const initializeModel = async (model) => {
            await this._voidModelService.initializeModel(model.uri);
            // do not add listeners to the same model twice - important, or will see duplicates
            if (registeredModelURIs.has(model.uri.fsPath))
                return;
            registeredModelURIs.add(model.uri.fsPath);
            if (!(model.uri.fsPath in this.diffAreasOfURI)) {
                this.diffAreasOfURI[model.uri.fsPath] = new Set();
            }
            // when the user types, realign diff areas and re-render them
            this._register(model.onDidChangeContent(e => {
                // it's as if we just called _write, now all we need to do is realign and refresh
                if (this.weAreWriting)
                    return;
                const uri = model.uri;
                this._onUserChangeContent(uri, e);
            }));
            // when the model first mounts, refresh any diffs that might be on it (happens if diffs were added in the BG)
            this._refreshStylesAndDiffsInURI(model.uri);
        };
        // initialize all existing models + initialize when a new model mounts
        for (let model of this._modelService.getModels()) {
            initializeModel(model);
        }
        this._register(this._modelService.onModelAdded(model => { initializeModel(model); }));
        // this function adds listeners to refresh styles when editor changes tab
        let initializeEditor = (editor) => {
            const uri = editor.getModel()?.uri ?? null;
            if (uri)
                this._refreshStylesAndDiffsInURI(uri);
        };
        // add listeners for all existing editors + listen for editor being added
        for (let editor of this._codeEditorService.listCodeEditors()) {
            initializeEditor(editor);
        }
        this._register(this._codeEditorService.onCodeEditorAdd(editor => { initializeEditor(editor); }));
    }
    _onUserChangeContent(uri, e) {
        for (const change of e.changes) {
            this._realignAllDiffAreasLines(uri, change.text, change.range);
        }
        this._refreshStylesAndDiffsInURI(uri);
        // if diffarea has no diffs after a user edit, delete it
        const diffAreasToDelete = [];
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] ?? []) {
            const diffArea = this.diffAreaOfId[diffareaid] ?? null;
            const shouldDelete = diffArea?.type === 'DiffZone' && Object.keys(diffArea._diffOfId).length === 0;
            if (shouldDelete) {
                diffAreasToDelete.push(diffArea);
            }
        }
        if (diffAreasToDelete.length !== 0) {
            const { onFinishEdit } = this._addToHistory(uri);
            diffAreasToDelete.forEach(da => this._deleteDiffZone(da));
            onFinishEdit();
        }
    }
    processRawKeybindingText(keybindingStr) {
        return keybindingStr
            .replace(/Enter/g, '↵') // ⏎
            .replace(/Backspace/g, '⌫');
    }
    _getActiveEditorURI() {
        const editor = this._codeEditorService.getActiveCodeEditor();
        if (!editor)
            return null;
        const uri = editor.getModel()?.uri;
        if (!uri)
            return null;
        return uri;
    }
    _writeURIText(uri, text, range_, { shouldRealignDiffAreas, }) {
        const { model } = this._voidModelService.getModel(uri);
        if (!model) {
            this._refreshStylesAndDiffsInURI(uri); // at the end of a write, we still expect to refresh all styles. e.g. sometimes we expect to restore all the decorations even if no edits were made when _writeText is used
            return;
        }
        const range = range_ === 'wholeFileRange' ?
            { startLineNumber: 1, startColumn: 1, endLineNumber: model.getLineCount(), endColumn: Number.MAX_SAFE_INTEGER } // whole file
            : range_;
        // realign is 100% independent from written text (diffareas are nonphysical), can do this first
        if (shouldRealignDiffAreas) {
            const newText = text;
            const oldRange = range;
            this._realignAllDiffAreasLines(uri, newText, oldRange);
        }
        const uriStr = model.getValue(1 /* EndOfLinePreference.LF */);
        // heuristic check
        const dontNeedToWrite = uriStr === text;
        if (dontNeedToWrite) {
            this._refreshStylesAndDiffsInURI(uri); // at the end of a write, we still expect to refresh all styles. e.g. sometimes we expect to restore all the decorations even if no edits were made when _writeText is used
            return;
        }
        this.weAreWriting = true;
        model.applyEdits([{ range, text }]);
        this.weAreWriting = false;
        this._refreshStylesAndDiffsInURI(uri);
    }
    _addToHistory(uri, opts) {
        const beforeSnapshot = this._getCurrentVoidFileSnapshot(uri);
        let afterSnapshot = null;
        const elt = {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: uri,
            label: 'Void Agent',
            code: 'undoredo.editCode',
            undo: async () => { opts?.onWillUndo?.(); await this._restoreVoidFileSnapshot(uri, beforeSnapshot); },
            redo: async () => { if (afterSnapshot)
                await this._restoreVoidFileSnapshot(uri, afterSnapshot); }
        };
        this._undoRedoService.pushElement(elt);
        const onFinishEdit = async () => {
            afterSnapshot = this._getCurrentVoidFileSnapshot(uri);
            await this._voidModelService.saveModel(uri);
        };
        return { onFinishEdit };
    }
    getVoidFileSnapshot(uri) {
        return this._getCurrentVoidFileSnapshot(uri);
    }
    restoreVoidFileSnapshot(uri, snapshot) {
        this._restoreVoidFileSnapshot(uri, snapshot);
    }
    // delete diffOfId and diffArea._diffOfId
    _deleteDiff(diff) {
        const diffArea = this.diffAreaOfId[diff.diffareaid];
        if (diffArea.type !== 'DiffZone')
            return;
        delete diffArea._diffOfId[diff.diffid];
        delete this.diffOfId[diff.diffid];
    }
    _deleteDiffs(diffZone) {
        for (const diffid in diffZone._diffOfId) {
            const diff = diffZone._diffOfId[diffid];
            this._deleteDiff(diff);
        }
    }
    _clearAllDiffAreaEffects(diffArea) {
        // clear diffZone effects (diffs)
        if (diffArea.type === 'DiffZone')
            this._deleteDiffs(diffArea);
        diffArea._removeStylesFns?.forEach(removeStyles => removeStyles());
        diffArea._removeStylesFns?.clear();
    }
    // clears all Diffs (and their styles) and all styles of DiffAreas, etc
    _clearAllEffects(uri) {
        for (let diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            this._clearAllDiffAreaEffects(diffArea);
        }
    }
    // delete all diffs, update diffAreaOfId, update diffAreasOfModelId
    _deleteDiffZone(diffZone) {
        this._clearAllDiffAreaEffects(diffZone);
        delete this.diffAreaOfId[diffZone.diffareaid];
        this.diffAreasOfURI[diffZone._URI.fsPath]?.delete(diffZone.diffareaid.toString());
        this._onDidAddOrDeleteDiffZones.fire({ uri: diffZone._URI });
    }
    _deleteTrackingZone(trackingZone) {
        delete this.diffAreaOfId[trackingZone.diffareaid];
        this.diffAreasOfURI[trackingZone._URI.fsPath]?.delete(trackingZone.diffareaid.toString());
    }
    _deleteCtrlKZone(ctrlKZone) {
        this._clearAllEffects(ctrlKZone._URI);
        ctrlKZone._mountInfo?.dispose();
        delete this.diffAreaOfId[ctrlKZone.diffareaid];
        this.diffAreasOfURI[ctrlKZone._URI.fsPath]?.delete(ctrlKZone.diffareaid.toString());
    }
    _deleteAllDiffAreas(uri) {
        const diffAreas = this.diffAreasOfURI[uri.fsPath];
        diffAreas?.forEach(diffareaid => {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea.type === 'DiffZone')
                this._deleteDiffZone(diffArea);
            else if (diffArea.type === 'CtrlKZone')
                this._deleteCtrlKZone(diffArea);
        });
        this.diffAreasOfURI[uri.fsPath]?.clear();
    }
    _addDiffArea(diffArea) {
        const diffareaid = this._diffareaidPool++;
        const diffArea2 = { ...diffArea, diffareaid };
        this._addOrInitializeDiffAreaAtURI(diffArea._URI, diffareaid);
        this.diffAreaOfId[diffareaid] = diffArea2;
        return diffArea2;
    }
    _addDiff(computedDiff, diffZone) {
        const uri = diffZone._URI;
        const diffid = this._diffidPool++;
        // create a Diff of it
        const newDiff = {
            ...computedDiff,
            diffid: diffid,
            diffareaid: diffZone.diffareaid,
        };
        const fn = this._addDiffStylesToURI(uri, newDiff);
        if (fn)
            diffZone._removeStylesFns.add(fn);
        this.diffOfId[diffid] = newDiff;
        diffZone._diffOfId[diffid] = newDiff;
        return newDiff;
    }
    // changes the start/line locations of all DiffAreas on the page (adjust their start/end based on the change) based on the change that was recently made
    _realignAllDiffAreasLines(uri, text, recentChange) {
        // console.log('recent change', recentChange)
        // compute net number of newlines lines that were added/removed
        const startLine = recentChange.startLineNumber;
        const endLine = recentChange.endLineNumber;
        const newTextHeight = (text.match(/\n/g) || []).length + 1; // number of newlines is number of \n's + 1, e.g. "ab\ncd"
        // compute overlap with each diffArea and shrink/elongate each diffArea accordingly
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            // if the diffArea is entirely above the range, it is not affected
            if (diffArea.endLine < startLine) {
                // console.log('CHANGE FULLY BELOW DA (doing nothing)')
                continue;
            }
            // if a diffArea is entirely below the range, shift the diffArea up/down by the delta amount of newlines
            else if (endLine < diffArea.startLine) {
                // console.log('CHANGE FULLY ABOVE DA')
                const changedRangeHeight = endLine - startLine + 1;
                const deltaNewlines = newTextHeight - changedRangeHeight;
                diffArea.startLine += deltaNewlines;
                diffArea.endLine += deltaNewlines;
            }
            // if the diffArea fully contains the change, elongate it by the delta amount of newlines
            else if (startLine >= diffArea.startLine && endLine <= diffArea.endLine) {
                // console.log('DA FULLY CONTAINS CHANGE')
                const changedRangeHeight = endLine - startLine + 1;
                const deltaNewlines = newTextHeight - changedRangeHeight;
                diffArea.endLine += deltaNewlines;
            }
            // if the change fully contains the diffArea, make the diffArea have the same range as the change
            else if (diffArea.startLine > startLine && diffArea.endLine < endLine) {
                // console.log('CHANGE FULLY CONTAINS DA')
                diffArea.startLine = startLine;
                diffArea.endLine = startLine + newTextHeight;
            }
            // if the change contains only the diffArea's top
            else if (startLine < diffArea.startLine && diffArea.startLine <= endLine) {
                // console.log('CHANGE CONTAINS TOP OF DA ONLY')
                const numOverlappingLines = endLine - diffArea.startLine + 1;
                const numRemainingLinesInDA = diffArea.endLine - diffArea.startLine + 1 - numOverlappingLines;
                const newHeight = (numRemainingLinesInDA - 1) + (newTextHeight - 1) + 1;
                diffArea.startLine = startLine;
                diffArea.endLine = startLine + newHeight;
            }
            // if the change contains only the diffArea's bottom
            else if (startLine <= diffArea.endLine && diffArea.endLine < endLine) {
                // console.log('CHANGE CONTAINS BOTTOM OF DA ONLY')
                const numOverlappingLines = diffArea.endLine - startLine + 1;
                diffArea.endLine += newTextHeight - numOverlappingLines;
            }
        }
    }
    _fireChangeDiffsIfNotStreaming(uri) {
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea?.type !== 'DiffZone')
                continue;
            // fire changed diffs (this is the only place Diffs are added)
            if (!diffArea._streamState.isStreaming) {
                this._onDidChangeDiffsInDiffZoneNotStreaming.fire({ uri, diffareaid: diffArea.diffareaid });
            }
        }
    }
    _refreshStylesAndDiffsInURI(uri) {
        // 1. clear DiffArea styles and Diffs
        this._clearAllEffects(uri);
        // 2. style DiffAreas (sweep, etc)
        this._addDiffAreaStylesToURI(uri);
        // 3. add Diffs
        this._computeDiffsAndAddStylesToURI(uri);
        // 4. refresh ctrlK zones
        this._refreshCtrlKInputs(uri);
        // 5. this is the only place where diffs are changed, so can fire here only
        this._fireChangeDiffsIfNotStreaming(uri);
    }
    // @throttle(100)
    _writeStreamedDiffZoneLLMText(uri, originalCode, llmTextSoFar, deltaText, latestMutable) {
        let numNewLines = 0;
        // ----------- 1. Write the new code to the document -----------
        // figure out where to highlight based on where the AI is in the stream right now, use the last diff to figure that out
        const computedDiffs = findDiffs(originalCode, llmTextSoFar);
        // if streaming, use diffs to figure out where to write new code
        // these are two different coordinate systems - new and old line number
        let endLineInLlmTextSoFar; // get file[diffArea.startLine...newFileEndLine] with line=newFileEndLine highlighted
        let startLineInOriginalCode; // get original[oldStartingPoint...] (line in the original code, so starts at 1)
        const lastDiff = computedDiffs.pop();
        if (!lastDiff) {
            // console.log('!lastDiff')
            // if the writing is identical so far, display no changes
            startLineInOriginalCode = 1;
            endLineInLlmTextSoFar = 1;
        }
        else {
            startLineInOriginalCode = lastDiff.originalStartLine;
            if (lastDiff.type === 'insertion' || lastDiff.type === 'edit')
                endLineInLlmTextSoFar = lastDiff.endLine;
            else if (lastDiff.type === 'deletion')
                endLineInLlmTextSoFar = lastDiff.startLine;
            else
                throw new Error(`Void: diff.type not recognized on: ${lastDiff}`);
        }
        // at the start, add a newline between the stream and originalCode to make reasoning easier
        if (!latestMutable.addedSplitYet) {
            this._writeURIText(uri, '\n', { startLineNumber: latestMutable.line, startColumn: latestMutable.col, endLineNumber: latestMutable.line, endColumn: latestMutable.col, }, { shouldRealignDiffAreas: true });
            latestMutable.addedSplitYet = true;
            numNewLines += 1;
        }
        // insert deltaText at latest line and col
        this._writeURIText(uri, deltaText, { startLineNumber: latestMutable.line, startColumn: latestMutable.col, endLineNumber: latestMutable.line, endColumn: latestMutable.col }, { shouldRealignDiffAreas: true });
        const deltaNumNewLines = deltaText.split('\n').length - 1;
        latestMutable.line += deltaNumNewLines;
        const lastNewlineIdx = deltaText.lastIndexOf('\n');
        latestMutable.col = lastNewlineIdx === -1 ? latestMutable.col + deltaText.length : deltaText.length - lastNewlineIdx;
        numNewLines += deltaNumNewLines;
        // delete or insert to get original up to speed
        if (latestMutable.originalCodeStartLine < startLineInOriginalCode) {
            // moved up, delete
            const numLinesDeleted = startLineInOriginalCode - latestMutable.originalCodeStartLine;
            this._writeURIText(uri, '', { startLineNumber: latestMutable.line, startColumn: latestMutable.col, endLineNumber: latestMutable.line + numLinesDeleted, endColumn: Number.MAX_SAFE_INTEGER, }, { shouldRealignDiffAreas: true });
            numNewLines -= numLinesDeleted;
        }
        else if (latestMutable.originalCodeStartLine > startLineInOriginalCode) {
            const newText = '\n' + originalCode.split('\n').slice((startLineInOriginalCode - 1), (latestMutable.originalCodeStartLine - 1) - 1 + 1).join('\n');
            this._writeURIText(uri, newText, { startLineNumber: latestMutable.line, startColumn: latestMutable.col, endLineNumber: latestMutable.line, endColumn: latestMutable.col }, { shouldRealignDiffAreas: true });
            numNewLines += newText.split('\n').length - 1;
        }
        latestMutable.originalCodeStartLine = startLineInOriginalCode;
        return { endLineInLlmTextSoFar, numNewLines }; // numNewLines here might not be correct....
    }
    // called first, then call startApplying
    addCtrlKZone({ startLine, endLine, editor }) {
        // don't need to await this, because in order to add a ctrl+K zone must already have the model open on your screen
        // await this._ensureModelExists(uri)
        const uri = editor.getModel()?.uri;
        if (!uri)
            return;
        // check if there's overlap with any other ctrlKZone and if so, focus it
        const overlappingCtrlKZone = this._findOverlappingDiffArea({ startLine, endLine, uri, filter: (diffArea) => diffArea.type === 'CtrlKZone' });
        if (overlappingCtrlKZone) {
            editor.revealLine(overlappingCtrlKZone.startLine); // important
            setTimeout(() => overlappingCtrlKZone._mountInfo?.textAreaRef.current?.focus(), 100);
            return;
        }
        const overlappingDiffZone = this._findOverlappingDiffArea({ startLine, endLine, uri, filter: (diffArea) => diffArea.type === 'DiffZone' });
        if (overlappingDiffZone)
            return;
        editor.revealLine(startLine);
        editor.setSelection({ startLineNumber: startLine, endLineNumber: startLine, startColumn: 1, endColumn: 1 });
        const { onFinishEdit } = this._addToHistory(uri);
        const adding = {
            type: 'CtrlKZone',
            startLine: startLine,
            endLine: endLine,
            editorId: editor.getId(),
            _URI: uri,
            _removeStylesFns: new Set(),
            _mountInfo: null,
            _linkedStreamingDiffZone: null,
        };
        const ctrlKZone = this._addDiffArea(adding);
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
        return ctrlKZone.diffareaid;
    }
    // _remove means delete and also add to history
    removeCtrlKZone({ diffareaid }) {
        const ctrlKZone = this.diffAreaOfId[diffareaid];
        if (!ctrlKZone)
            return;
        if (ctrlKZone.type !== 'CtrlKZone')
            return;
        const uri = ctrlKZone._URI;
        const { onFinishEdit } = this._addToHistory(uri);
        this._deleteCtrlKZone(ctrlKZone);
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
    }
    _getURIBeforeStartApplying(opts) {
        // SR
        if (opts.from === 'ClickApply') {
            const uri = this._uriOfGivenURI(opts.uri);
            if (!uri)
                return;
            return uri;
        }
        else if (opts.from === 'QuickEdit') {
            const { diffareaid } = opts;
            const ctrlKZone = this.diffAreaOfId[diffareaid];
            if (ctrlKZone?.type !== 'CtrlKZone')
                return;
            const { _URI: uri } = ctrlKZone;
            return uri;
        }
        return;
    }
    async callBeforeApplyOrEdit(givenURI) {
        const uri = this._uriOfGivenURI(givenURI);
        if (!uri)
            return;
        await this._voidModelService.initializeModel(uri);
        await this._voidModelService.saveModel(uri); // save the URI
    }
    // the applyDonePromise this returns can reject, and should be caught with .catch
    startApplying(opts) {
        let res = undefined;
        if (opts.from === 'QuickEdit') {
            res = this._initializeWriteoverStream(opts); // rewrite
        }
        else if (opts.from === 'ClickApply') {
            if (this._settingsService.state.globalSettings.enableFastApply) {
                const numCharsInFile = this._fileLengthOfGivenURI(opts.uri);
                if (numCharsInFile === null)
                    return null;
                if (numCharsInFile < 1000) { // slow apply for short files (especially important for empty files)
                    res = this._initializeWriteoverStream(opts);
                }
                else {
                    res = this._initializeSearchAndReplaceStream(opts); // fast apply
                }
            }
            else {
                res = this._initializeWriteoverStream(opts); // rewrite
            }
        }
        if (!res)
            return null;
        const [diffZone, applyDonePromise] = res;
        return [diffZone._URI, applyDonePromise];
    }
    instantlyApplySearchReplaceBlocks({ uri, searchReplaceBlocks }) {
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef: { current: null },
            startBehavior: 'keep-conflicts',
            linkedCtrlKZone: null,
            onWillUndo: () => { },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        const onDone = () => {
            diffZone._streamState = { isStreaming: false, };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        const onError = (e) => {
            // this._notifyError(e)
            onDone();
            this._undoHistory(uri);
            throw e.fullError || new Error(e.message);
        };
        try {
            this._instantlyApplySRBlocks(uri, searchReplaceBlocks);
        }
        catch (e) {
            onError({ message: e + '', fullError: null });
        }
        onDone();
    }
    instantlyRewriteFile({ uri, newContent }) {
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef: { current: null },
            startBehavior: 'keep-conflicts',
            linkedCtrlKZone: null,
            onWillUndo: () => { },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        const onDone = () => {
            diffZone._streamState = { isStreaming: false, };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        this._writeURIText(uri, newContent, 'wholeFileRange', { shouldRealignDiffAreas: true });
        onDone();
    }
    _findOverlappingDiffArea({ startLine, endLine, uri, filter }) {
        // check if there's overlap with any other diffAreas and return early if there is
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (!diffArea)
                continue;
            if (!filter?.(diffArea))
                continue;
            const noOverlap = diffArea.startLine > endLine || diffArea.endLine < startLine;
            if (!noOverlap) {
                return diffArea;
            }
        }
        return null;
    }
    _startStreamingDiffZone({ uri, startBehavior, streamRequestIdRef, linkedCtrlKZone, onWillUndo, }) {
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return;
        // treat like full file, unless linkedCtrlKZone was provided in which case use its diff's range
        const startLine = linkedCtrlKZone ? linkedCtrlKZone.startLine : 1;
        const endLine = linkedCtrlKZone ? linkedCtrlKZone.endLine : model.getLineCount();
        const range = { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: Number.MAX_SAFE_INTEGER };
        const originalFileStr = model.getValue(1 /* EndOfLinePreference.LF */);
        let originalCode = model.getValueInRange(range, 1 /* EndOfLinePreference.LF */);
        // add to history as a checkpoint, before we start modifying
        const { onFinishEdit } = this._addToHistory(uri, { onWillUndo });
        // clear diffZones so no conflict
        if (startBehavior === 'keep-conflicts') {
            if (linkedCtrlKZone) {
                // ctrlkzone should never have any conflicts
            }
            else {
                // keep conflict on whole file - to keep conflict, revert the change and use those contents as original, then un-revert the file
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: 'reject', _addToHistory: false });
                const oldFileStr = model.getValue(1 /* EndOfLinePreference.LF */); // use this as original code
                this._writeURIText(uri, originalFileStr, 'wholeFileRange', { shouldRealignDiffAreas: true }); // un-revert
                originalCode = oldFileStr;
            }
        }
        else if (startBehavior === 'accept-conflicts' || startBehavior === 'reject-conflicts') {
            const behavior = startBehavior === 'accept-conflicts' ? 'accept' : 'reject';
            this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior, _addToHistory: false });
        }
        const adding = {
            type: 'DiffZone',
            originalCode,
            startLine,
            endLine,
            _URI: uri,
            _streamState: {
                isStreaming: true,
                streamRequestIdRef,
                line: startLine,
            },
            _diffOfId: {}, // added later
            _removeStylesFns: new Set(),
        };
        const diffZone = this._addDiffArea(adding);
        this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
        this._onDidAddOrDeleteDiffZones.fire({ uri });
        // a few items related to the ctrlKZone that started streaming this diffZone
        if (linkedCtrlKZone) {
            const ctrlKZone = linkedCtrlKZone;
            ctrlKZone._linkedStreamingDiffZone = diffZone.diffareaid;
            this._onDidChangeStreamingInCtrlKZone.fire({ uri, diffareaid: ctrlKZone.diffareaid });
        }
        return { diffZone, onFinishEdit };
    }
    _uriIsStreaming(uri) {
        const diffAreas = this.diffAreasOfURI[uri.fsPath];
        if (!diffAreas)
            return false;
        for (const diffareaid of diffAreas) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea?.type !== 'DiffZone')
                continue;
            if (diffArea._streamState.isStreaming)
                return true;
        }
        return false;
    }
    _initializeWriteoverStream(opts) {
        const { from, } = opts;
        const featureName = opts.from === 'ClickApply' ? 'Apply' : 'Ctrl+K';
        const overridesOfModel = this._settingsService.state.overridesOfModel;
        const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
        const modelSelectionOptions = modelSelection ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName] : undefined;
        const uri = this._getURIBeforeStartApplying(opts);
        if (!uri)
            return;
        let startRange;
        let ctrlKZoneIfQuickEdit = null;
        if (from === 'ClickApply') {
            startRange = 'fullFile';
        }
        else if (from === 'QuickEdit') {
            const { diffareaid } = opts;
            const ctrlKZone = this.diffAreaOfId[diffareaid];
            if (ctrlKZone?.type !== 'CtrlKZone')
                return;
            ctrlKZoneIfQuickEdit = ctrlKZone;
            const { startLine: startLine_, endLine: endLine_ } = ctrlKZone;
            startRange = [startLine_, endLine_];
        }
        else {
            throw new Error(`Void: diff.type not recognized on: ${from}`);
        }
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return;
        let streamRequestIdRef = { current: null }; // can use this as a proxy to set the diffArea's stream state requestId
        // build messages
        const quickEditFIMTags = defaultQuickEditFimTags; // TODO can eventually let users customize modelFimTags
        const originalFileCode = model.getValue(1 /* EndOfLinePreference.LF */);
        const originalCode = startRange === 'fullFile' ? originalFileCode : originalFileCode.split('\n').slice((startRange[0] - 1), (startRange[1] - 1) + 1).join('\n');
        const language = model.getLanguageId();
        let messages;
        let separateSystemMessage;
        if (from === 'ClickApply') {
            const { messages: a, separateSystemMessage: b } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
                systemMessage: rewriteCode_systemMessage,
                simpleMessages: [{ role: 'user', content: rewriteCode_userMessage({ originalCode, applyStr: opts.applyStr, language }), }],
                featureName,
                modelSelection,
            });
            messages = a;
            separateSystemMessage = b;
        }
        else if (from === 'QuickEdit') {
            if (!ctrlKZoneIfQuickEdit)
                return;
            const { _mountInfo } = ctrlKZoneIfQuickEdit;
            const instructions = _mountInfo?.textAreaRef.current?.value ?? '';
            const startLine = startRange === 'fullFile' ? 1 : startRange[0];
            const endLine = startRange === 'fullFile' ? model.getLineCount() : startRange[1];
            const { prefix, suffix } = voidPrefixAndSuffix({ fullFileStr: originalFileCode, startLine, endLine });
            const userContent = ctrlKStream_userMessage({ selection: originalCode, instructions: instructions, prefix, suffix, fimTags: quickEditFIMTags, language });
            const { messages: a, separateSystemMessage: b } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
                systemMessage: ctrlKStream_systemMessage({ quickEditFIMTags: quickEditFIMTags }),
                simpleMessages: [{ role: 'user', content: userContent, }],
                featureName,
                modelSelection,
            });
            messages = a;
            separateSystemMessage = b;
        }
        else {
            throw new Error(`featureName ${from} is invalid`);
        }
        // if URI is already streaming, return (should never happen, caller is responsible for checking)
        if (this._uriIsStreaming(uri))
            return;
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef,
            startBehavior: opts.startBehavior,
            linkedCtrlKZone: ctrlKZoneIfQuickEdit,
            onWillUndo: () => {
                if (streamRequestIdRef.current) {
                    this._llmMessageService.abort(streamRequestIdRef.current);
                }
            },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit, } = res;
        // helpers
        const onDone = () => {
            console.log('called onDone');
            diffZone._streamState = { isStreaming: false, };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            if (ctrlKZoneIfQuickEdit) {
                const ctrlKZone = ctrlKZoneIfQuickEdit;
                ctrlKZone._linkedStreamingDiffZone = null;
                this._onDidChangeStreamingInCtrlKZone.fire({ uri, diffareaid: ctrlKZone.diffareaid });
                this._deleteCtrlKZone(ctrlKZone);
            }
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        // throws
        const onError = (e) => {
            // this._notifyError(e)
            onDone();
            this._undoHistory(uri);
            throw e.fullError || new Error(e.message);
        };
        const extractText = (fullText, recentlyAddedTextLen) => {
            if (from === 'QuickEdit') {
                return extractCodeFromFIM({ text: fullText, recentlyAddedTextLen, midTag: quickEditFIMTags.midTag });
            }
            else if (from === 'ClickApply') {
                return extractCodeFromRegular({ text: fullText, recentlyAddedTextLen });
            }
            throw new Error('Void 1');
        };
        // refresh now in case onText takes a while to get 1st message
        this._refreshStylesAndDiffsInURI(uri);
        const latestStreamLocationMutable = { line: diffZone.startLine, addedSplitYet: false, col: 1, originalCodeStartLine: 1 };
        // allowed to throw errors - this is called inside a promise that handles everything
        const runWriteover = async () => {
            let shouldSendAnotherMessage = true;
            while (shouldSendAnotherMessage) {
                shouldSendAnotherMessage = false;
                let resMessageDonePromise = () => { };
                const messageDonePromise = new Promise((res_) => { resMessageDonePromise = res_; });
                // state used in onText:
                let fullTextSoFar = ''; // so far (INCLUDING ignored suffix)
                let prevIgnoredSuffix = '';
                let aborted = false;
                let weAreAborting = false;
                streamRequestIdRef.current = this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    logging: { loggingName: `Edit (Writeover) - ${from}` },
                    messages,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    separateSystemMessage,
                    chatMode: null, // not chat
                    onText: (params) => {
                        const { fullText: fullText_ } = params;
                        const newText_ = fullText_.substring(fullTextSoFar.length, Infinity);
                        const newText = prevIgnoredSuffix + newText_; // add the previously ignored suffix because it's no longer the suffix!
                        fullTextSoFar += newText; // full text, including ```, etc
                        const [croppedText, deltaCroppedText, croppedSuffix] = extractText(fullTextSoFar, newText.length);
                        const { endLineInLlmTextSoFar } = this._writeStreamedDiffZoneLLMText(uri, originalCode, croppedText, deltaCroppedText, latestStreamLocationMutable);
                        diffZone._streamState.line = (diffZone.startLine - 1) + endLineInLlmTextSoFar; // change coordinate systems from originalCode to full file
                        this._refreshStylesAndDiffsInURI(uri);
                        prevIgnoredSuffix = croppedSuffix;
                    },
                    onFinalMessage: (params) => {
                        const { fullText } = params;
                        // console.log('DONE! FULL TEXT\n', extractText(fullText), diffZone.startLine, diffZone.endLine)
                        // at the end, re-write whole thing to make sure no sync errors
                        const [croppedText, _1, _2] = extractText(fullText, 0);
                        this._writeURIText(uri, croppedText, { startLineNumber: diffZone.startLine, startColumn: 1, endLineNumber: diffZone.endLine, endColumn: Number.MAX_SAFE_INTEGER }, // 1-indexed
                        { shouldRealignDiffAreas: true });
                        onDone();
                        resMessageDonePromise();
                    },
                    onError: (e) => {
                        onError(e);
                    },
                    onAbort: () => {
                        if (weAreAborting)
                            return;
                        // stop the loop to free up the promise, but don't modify state (already handled by whatever stopped it)
                        aborted = true;
                        resMessageDonePromise();
                    },
                });
                // should never happen, just for safety
                if (streamRequestIdRef.current === null) {
                    return;
                }
                await messageDonePromise;
                if (aborted) {
                    throw new Error(`Edit was interrupted by the user.`);
                }
            } // end while
        }; // end writeover
        const applyDonePromise = new Promise((res, rej) => { runWriteover().then(res).catch(rej); });
        return [diffZone, applyDonePromise];
    }
    _uriOfGivenURI(givenURI) {
        if (givenURI === 'current') {
            const uri_ = this._getActiveEditorURI();
            if (!uri_)
                return;
            return uri_;
        }
        return givenURI;
    }
    _fileLengthOfGivenURI(givenURI) {
        const uri = this._uriOfGivenURI(givenURI);
        if (!uri)
            return null;
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return null;
        const numCharsInFile = model.getValueLength(1 /* EndOfLinePreference.LF */);
        return numCharsInFile;
    }
    _instantlyApplySRBlocks(uri, blocksStr) {
        const blocks = extractSearchReplaceBlocks(blocksStr);
        if (blocks.length === 0)
            throw new Error(`No Search/Replace blocks were received!`);
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            throw new Error(`Error applying Search/Replace blocks: File does not exist.`);
        const modelStr = model.getValue(1 /* EndOfLinePreference.LF */);
        // .split('\n').map(l => '\t' + l).join('\n') // for testing purposes only, remember to remove this
        const modelStrLines = modelStr.split('\n');
        const replacements = [];
        for (const b of blocks) {
            const res = findTextInCode(b.orig, modelStr, true, { returnType: 'lines' });
            if (typeof res === 'string')
                throw new Error(this._errContentOfInvalidStr(res, b.orig));
            let [startLine, endLine] = res;
            startLine -= 1; // 0-index
            endLine -= 1;
            // including newline before start
            const origStart = (startLine !== 0 ?
                modelStrLines.slice(0, startLine).join('\n') + '\n'
                : '').length;
            // including endline at end
            const origEnd = modelStrLines.slice(0, endLine + 1).join('\n').length - 1;
            replacements.push({ origStart, origEnd, block: b });
        }
        // sort in increasing order
        replacements.sort((a, b) => a.origStart - b.origStart);
        // ensure no overlap
        for (let i = 1; i < replacements.length; i++) {
            if (replacements[i].origStart <= replacements[i - 1].origEnd) {
                throw new Error(this._errContentOfInvalidStr('Has overlap', replacements[i]?.block?.orig));
            }
        }
        // apply each replacement from right to left (so indexes don't shift)
        let newCode = modelStr;
        for (let i = replacements.length - 1; i >= 0; i--) {
            const { origStart, origEnd, block } = replacements[i];
            newCode = newCode.slice(0, origStart) + block.final + newCode.slice(origEnd + 1, Infinity);
        }
        this._writeURIText(uri, newCode, 'wholeFileRange', { shouldRealignDiffAreas: true });
    }
    _initializeSearchAndReplaceStream(opts) {
        const { from, applyStr, } = opts;
        const featureName = 'Apply';
        const overridesOfModel = this._settingsService.state.overridesOfModel;
        const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
        const modelSelectionOptions = modelSelection ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName] : undefined;
        const uri = this._getURIBeforeStartApplying(opts);
        if (!uri)
            return;
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return;
        let streamRequestIdRef = { current: null }; // can use this as a proxy to set the diffArea's stream state requestId
        // build messages - ask LLM to generate search/replace block text
        const originalFileCode = model.getValue(1 /* EndOfLinePreference.LF */);
        const userMessageContent = searchReplaceGivenDescription_userMessage({ originalCode: originalFileCode, applyStr: applyStr });
        const { messages, separateSystemMessage: separateSystemMessage } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
            systemMessage: searchReplaceGivenDescription_systemMessage,
            simpleMessages: [{ role: 'user', content: userMessageContent, }],
            featureName,
            modelSelection,
        });
        // if URI is already streaming, return (should never happen, caller is responsible for checking)
        if (this._uriIsStreaming(uri))
            return;
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef,
            startBehavior: opts.startBehavior,
            linkedCtrlKZone: null,
            onWillUndo: () => {
                if (streamRequestIdRef.current) {
                    this._llmMessageService.abort(streamRequestIdRef.current); // triggers onAbort()
                }
            },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        const convertOriginalRangeToFinalRange = (originalRange) => {
            // adjust based on the changes by computing line offset
            const [originalStart, originalEnd] = originalRange;
            let lineOffset = 0;
            for (const blockDiffArea of addedTrackingZoneOfBlockNum) {
                const { startLine, endLine, metadata: { originalBounds: [originalStart2, originalEnd2], }, } = blockDiffArea;
                if (originalStart2 >= originalEnd)
                    continue;
                const numNewLines = endLine - startLine + 1;
                const numOldLines = originalEnd2 - originalStart2 + 1;
                lineOffset += numNewLines - numOldLines;
            }
            return [originalStart + lineOffset, originalEnd + lineOffset];
        };
        const onDone = () => {
            diffZone._streamState = { isStreaming: false, };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            this._refreshStylesAndDiffsInURI(uri);
            // delete the tracking zones
            for (const trackingZone of addedTrackingZoneOfBlockNum)
                this._deleteTrackingZone(trackingZone);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        const onError = (e) => {
            // this._notifyError(e)
            onDone();
            this._undoHistory(uri);
            throw e.fullError || new Error(e.message);
        };
        // refresh now in case onText takes a while to get 1st message
        this._refreshStylesAndDiffsInURI(uri);
        // stream style related - TODO replace these with whatever block we're on initially if already started (if add caching of apply S/R blocks)
        let latestStreamLocationMutable = null;
        let shouldUpdateOrigStreamStyle = true;
        let oldBlocks = [];
        const addedTrackingZoneOfBlockNum = [];
        diffZone._streamState.line = 1;
        const N_RETRIES = 4;
        // allowed to throw errors - this is called inside a promise that handles everything
        const runSearchReplace = async () => {
            // this generates >>>>>>> ORIGINAL <<<<<<< REPLACE blocks and and simultaneously applies it
            let shouldSendAnotherMessage = true;
            let nMessagesSent = 0;
            let currStreamingBlockNum = 0;
            let aborted = false;
            let weAreAborting = false;
            while (shouldSendAnotherMessage) {
                shouldSendAnotherMessage = false;
                nMessagesSent += 1;
                if (nMessagesSent >= N_RETRIES) {
                    const e = {
                        message: `Tried to Fast Apply ${N_RETRIES} times but failed. This may be related to model intelligence, or it may an edit that's too complex. Please retry or disable Fast Apply.`,
                        fullError: null
                    };
                    onError(e);
                    break;
                }
                let resMessageDonePromise = () => { };
                const messageDonePromise = new Promise((res, rej) => { resMessageDonePromise = res; });
                const onText = (params) => {
                    const { fullText } = params;
                    // blocks are [done done done ... {writingFinal|writingOriginal}]
                    //               ^
                    //              currStreamingBlockNum
                    const blocks = extractSearchReplaceBlocks(fullText);
                    for (let blockNum = currStreamingBlockNum; blockNum < blocks.length; blockNum += 1) {
                        const block = blocks[blockNum];
                        if (block.state === 'writingOriginal') {
                            // update stream state to the first line of original if some portion of original has been written
                            if (shouldUpdateOrigStreamStyle && block.orig.trim().length >= 20) {
                                const startingAtLine = diffZone._streamState.line ?? 1; // dont go backwards if already have a stream line
                                const originalRange = findTextInCode(block.orig, originalFileCode, false, { startingAtLine, returnType: 'lines' });
                                if (typeof originalRange !== 'string') {
                                    const [startLine, _] = convertOriginalRangeToFinalRange(originalRange);
                                    diffZone._streamState.line = startLine;
                                    shouldUpdateOrigStreamStyle = false;
                                }
                            }
                            // // starting line is at least the number of lines in the generated code minus 1
                            // const numLinesInOrig = numLinesOfStr(block.orig)
                            // const newLine = Math.max(numLinesInOrig - 1, 1, diffZone._streamState.line ?? 1)
                            // if (newLine !== diffZone._streamState.line) {
                            // 	diffZone._streamState.line = newLine
                            // 	this._refreshStylesAndDiffsInURI(uri)
                            // }
                            // must be done writing original to move on to writing streamed content
                            continue;
                        }
                        shouldUpdateOrigStreamStyle = true;
                        // if this is the first time we're seeing this block, add it as a diffarea so we can start streaming in it
                        if (!(blockNum in addedTrackingZoneOfBlockNum)) {
                            const originalBounds = findTextInCode(block.orig, originalFileCode, true, { returnType: 'lines' });
                            // if error
                            // Check for overlap with existing modified ranges
                            const hasOverlap = addedTrackingZoneOfBlockNum.some(trackingZone => {
                                const [existingStart, existingEnd] = trackingZone.metadata.originalBounds;
                                const hasNoOverlap = endLine < existingStart || startLine > existingEnd;
                                return !hasNoOverlap;
                            });
                            if (typeof originalBounds === 'string' || hasOverlap) {
                                const errorMessage = typeof originalBounds === 'string' ? originalBounds : 'Has overlap';
                                console.log('--------------Error finding text in code:');
                                console.log('originalFileCode', { originalFileCode });
                                console.log('fullText', { fullText });
                                console.log('error:', errorMessage);
                                console.log('block.orig:', block.orig);
                                console.log('---------');
                                const content = this._errContentOfInvalidStr(errorMessage, block.orig);
                                const retryMsg = 'All of your previous outputs have been ignored. Please re-output ALL SEARCH/REPLACE blocks starting from the first one, and avoid the error this time.';
                                messages.push({ role: 'assistant', content: fullText }, // latest output
                                { role: 'user', content: content + '\n' + retryMsg } // user explanation of what's wrong
                                );
                                // REVERT ALL BLOCKS
                                currStreamingBlockNum = 0;
                                latestStreamLocationMutable = null;
                                shouldUpdateOrigStreamStyle = true;
                                oldBlocks = [];
                                for (const trackingZone of addedTrackingZoneOfBlockNum)
                                    this._deleteTrackingZone(trackingZone);
                                addedTrackingZoneOfBlockNum.splice(0, Infinity);
                                this._writeURIText(uri, originalFileCode, 'wholeFileRange', { shouldRealignDiffAreas: true });
                                // abort and resolve
                                shouldSendAnotherMessage = true;
                                if (streamRequestIdRef.current) {
                                    weAreAborting = true;
                                    this._llmMessageService.abort(streamRequestIdRef.current);
                                    weAreAborting = false;
                                }
                                diffZone._streamState.line = 1;
                                resMessageDonePromise();
                                this._refreshStylesAndDiffsInURI(uri);
                                return;
                            }
                            const [startLine, endLine] = convertOriginalRangeToFinalRange(originalBounds);
                            // console.log('---------adding-------')
                            // console.log('CURRENT TEXT!!!', { current: model?.getValue(EndOfLinePreference.LF) })
                            // console.log('block', deepClone(block))
                            // console.log('origBounds', originalBounds)
                            // console.log('start end', startLine, endLine)
                            // otherwise if no error, add the position as a diffarea
                            const adding = {
                                type: 'TrackingZone',
                                startLine: startLine,
                                endLine: endLine,
                                _URI: uri,
                                metadata: {
                                    originalBounds: [...originalBounds],
                                    originalCode: block.orig,
                                },
                            };
                            const trackingZone = this._addDiffArea(adding);
                            addedTrackingZoneOfBlockNum.push(trackingZone);
                            latestStreamLocationMutable = { line: startLine, addedSplitYet: false, col: 1, originalCodeStartLine: 1 };
                        } // end adding diffarea
                        // should always be in streaming state here
                        if (!diffZone._streamState.isStreaming) {
                            console.error('DiffZone was not in streaming state in _initializeSearchAndReplaceStream');
                            continue;
                        }
                        // if a block is done, finish it by writing all
                        if (block.state === 'done') {
                            const { startLine: finalStartLine, endLine: finalEndLine } = addedTrackingZoneOfBlockNum[blockNum];
                            this._writeURIText(uri, block.final, { startLineNumber: finalStartLine, startColumn: 1, endLineNumber: finalEndLine, endColumn: Number.MAX_SAFE_INTEGER }, // 1-indexed
                            { shouldRealignDiffAreas: true });
                            diffZone._streamState.line = finalEndLine + 1;
                            currStreamingBlockNum = blockNum + 1;
                            continue;
                        }
                        // write the added text to the file
                        if (!latestStreamLocationMutable)
                            continue;
                        const oldBlock = oldBlocks[blockNum];
                        const oldFinalLen = (oldBlock?.final ?? '').length;
                        const deltaFinalText = block.final.substring(oldFinalLen, Infinity);
                        this._writeStreamedDiffZoneLLMText(uri, block.orig, block.final, deltaFinalText, latestStreamLocationMutable);
                        oldBlocks = blocks; // oldblocks is only used if writingFinal
                        // const { endLine: currentEndLine } = addedTrackingZoneOfBlockNum[blockNum] // would be bad to do this because a lot of the bottom lines might be the same. more accurate to go with latestStreamLocationMutable
                        // diffZone._streamState.line = currentEndLine
                        diffZone._streamState.line = latestStreamLocationMutable.line;
                    } // end for
                    this._refreshStylesAndDiffsInURI(uri);
                };
                streamRequestIdRef.current = this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    logging: { loggingName: `Edit (Search/Replace) - ${from}` },
                    messages,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    separateSystemMessage,
                    chatMode: null, // not chat
                    onText: (params) => {
                        onText(params);
                    },
                    onFinalMessage: async (params) => {
                        const { fullText } = params;
                        onText(params);
                        const blocks = extractSearchReplaceBlocks(fullText);
                        if (blocks.length === 0) {
                            this._notificationService.info(`Void: We ran Fast Apply, but the LLM didn't output any changes.`);
                        }
                        this._writeURIText(uri, originalFileCode, 'wholeFileRange', { shouldRealignDiffAreas: true });
                        try {
                            this._instantlyApplySRBlocks(uri, fullText);
                            onDone();
                            resMessageDonePromise();
                        }
                        catch (e) {
                            onError(e);
                        }
                    },
                    onError: (e) => {
                        onError(e);
                    },
                    onAbort: () => {
                        if (weAreAborting)
                            return;
                        // stop the loop to free up the promise, but don't modify state (already handled by whatever stopped it)
                        aborted = true;
                        resMessageDonePromise();
                    },
                });
                // should never happen, just for safety
                if (streamRequestIdRef.current === null) {
                    break;
                }
                await messageDonePromise;
                if (aborted) {
                    throw new Error(`Edit was interrupted by the user.`);
                }
            } // end while
        }; // end retryLoop
        const applyDonePromise = new Promise((res, rej) => { runSearchReplace().then(res).catch(rej); });
        return [diffZone, applyDonePromise];
    }
    _undoHistory(uri) {
        this._undoRedoService.undo(uri);
    }
    isCtrlKZoneStreaming({ diffareaid }) {
        const ctrlKZone = this.diffAreaOfId[diffareaid];
        if (!ctrlKZone)
            return false;
        if (ctrlKZone.type !== 'CtrlKZone')
            return false;
        return !!ctrlKZone._linkedStreamingDiffZone;
    }
    _stopIfStreaming(diffZone) {
        const uri = diffZone._URI;
        const streamRequestId = diffZone._streamState.streamRequestIdRef?.current;
        if (!streamRequestId)
            return;
        this._llmMessageService.abort(streamRequestId);
        diffZone._streamState = { isStreaming: false, };
        this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
    }
    // diffareaid of the ctrlKZone (even though the stream state is dictated by the linked diffZone)
    interruptCtrlKStreaming({ diffareaid }) {
        const ctrlKZone = this.diffAreaOfId[diffareaid];
        if (ctrlKZone?.type !== 'CtrlKZone')
            return;
        if (!ctrlKZone._linkedStreamingDiffZone)
            return;
        const linkedStreamingDiffZone = this.diffAreaOfId[ctrlKZone._linkedStreamingDiffZone];
        if (!linkedStreamingDiffZone)
            return;
        if (linkedStreamingDiffZone.type !== 'DiffZone')
            return;
        this._stopIfStreaming(linkedStreamingDiffZone);
        this._undoHistory(linkedStreamingDiffZone._URI);
    }
    interruptURIStreaming({ uri }) {
        if (!this._uriIsStreaming(uri))
            return;
        this._undoHistory(uri);
        // brute force for now is OK
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea?.type !== 'DiffZone')
                continue;
            if (!diffArea._streamState.isStreaming)
                continue;
            this._stopIfStreaming(diffArea);
        }
    }
    // public removeDiffZone(diffZone: DiffZone, behavior: 'reject' | 'accept') {
    // 	const uri = diffZone._URI
    // 	const { onFinishEdit } = this._addToHistory(uri)
    // 	if (behavior === 'reject') this._revertAndDeleteDiffZone(diffZone)
    // 	else if (behavior === 'accept') this._deleteDiffZone(diffZone)
    // 	this._refreshStylesAndDiffsInURI(uri)
    // 	onFinishEdit()
    // }
    _revertDiffZone(diffZone) {
        const uri = diffZone._URI;
        const writeText = diffZone.originalCode;
        const toRange = { startLineNumber: diffZone.startLine, startColumn: 1, endLineNumber: diffZone.endLine, endColumn: Number.MAX_SAFE_INTEGER };
        this._writeURIText(uri, writeText, toRange, { shouldRealignDiffAreas: true });
    }
    // called on void.acceptDiff
    async acceptDiff({ diffid }) {
        // TODO could use an ITextModelto do this instead, would be much simpler
        const diff = this.diffOfId[diffid];
        if (!diff)
            return;
        const { diffareaid } = diff;
        const diffArea = this.diffAreaOfId[diffareaid];
        if (!diffArea)
            return;
        if (diffArea.type !== 'DiffZone')
            return;
        const uri = diffArea._URI;
        // add to history
        const { onFinishEdit } = this._addToHistory(uri);
        const originalLines = diffArea.originalCode.split('\n');
        let newOriginalCode;
        if (diff.type === 'deletion') {
            newOriginalCode = [
                ...originalLines.slice(0, (diff.originalStartLine - 1)), // everything before startLine
                // <-- deletion has nothing here
                ...originalLines.slice((diff.originalEndLine - 1) + 1, Infinity) // everything after endLine
            ].join('\n');
        }
        else if (diff.type === 'insertion') {
            newOriginalCode = [
                ...originalLines.slice(0, (diff.originalStartLine - 1)), // everything before startLine
                diff.code, // code
                ...originalLines.slice((diff.originalStartLine - 1), Infinity) // startLine (inclusive) and on (no +1)
            ].join('\n');
        }
        else if (diff.type === 'edit') {
            newOriginalCode = [
                ...originalLines.slice(0, (diff.originalStartLine - 1)), // everything before startLine
                diff.code, // code
                ...originalLines.slice((diff.originalEndLine - 1) + 1, Infinity) // everything after endLine
            ].join('\n');
        }
        else {
            throw new Error(`Void error: ${diff}.type not recognized`);
        }
        // console.log('DIFF', diff)
        // console.log('DIFFAREA', diffArea)
        // console.log('ORIGINAL', diffArea.originalCode)
        // console.log('new original Code', newOriginalCode)
        // update code now accepted as original
        diffArea.originalCode = newOriginalCode;
        // delete the diff
        this._deleteDiff(diff);
        // diffArea should be removed if it has no more diffs in it
        if (Object.keys(diffArea._diffOfId).length === 0) {
            this._deleteDiffZone(diffArea);
        }
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
    }
    // called on void.rejectDiff
    async rejectDiff({ diffid }) {
        const diff = this.diffOfId[diffid];
        if (!diff)
            return;
        const { diffareaid } = diff;
        const diffArea = this.diffAreaOfId[diffareaid];
        if (!diffArea)
            return;
        if (diffArea.type !== 'DiffZone')
            return;
        const uri = diffArea._URI;
        // add to history
        const { onFinishEdit } = this._addToHistory(uri);
        let writeText;
        let toRange;
        // if it was a deletion, need to re-insert
        // (this image applies to writeText and toRange, not newOriginalCode)
        //  A
        // |B   <-- deleted here, diff.startLine == diff.endLine
        //  C
        if (diff.type === 'deletion') {
            // if startLine is out of bounds (deleted lines past the diffarea), applyEdit will do a weird rounding thing, to account for that we apply the edit the line before
            if (diff.startLine - 1 === diffArea.endLine) {
                writeText = '\n' + diff.originalCode;
                toRange = { startLineNumber: diff.startLine - 1, startColumn: Number.MAX_SAFE_INTEGER, endLineNumber: diff.startLine - 1, endColumn: Number.MAX_SAFE_INTEGER };
            }
            else {
                writeText = diff.originalCode + '\n';
                toRange = { startLineNumber: diff.startLine, startColumn: 1, endLineNumber: diff.startLine, endColumn: 1 };
            }
        }
        // if it was an insertion, need to delete all the lines
        // (this image applies to writeText and toRange, not newOriginalCode)
        // |A   <-- startLine
        //  B|  <-- endLine (we want to delete this whole line)
        //  C
        else if (diff.type === 'insertion') {
            // console.log('REJECTING:', diff)
            // handle the case where the insertion was a newline at end of diffarea (applying to the next line doesnt work because it doesnt exist, vscode just doesnt delete the correct # of newlines)
            if (diff.endLine === diffArea.endLine) {
                // delete the line before instead of after
                writeText = '';
                toRange = { startLineNumber: diff.startLine - 1, startColumn: Number.MAX_SAFE_INTEGER, endLineNumber: diff.endLine, endColumn: 1 }; // 1-indexed
            }
            else {
                writeText = '';
                toRange = { startLineNumber: diff.startLine, startColumn: 1, endLineNumber: diff.endLine + 1, endColumn: 1 }; // 1-indexed
            }
        }
        // if it was an edit, just edit the range
        // (this image applies to writeText and toRange, not newOriginalCode)
        // |A    <-- startLine
        //  B|   <-- endLine (just swap out these lines for the originalCode)
        //  C
        else if (diff.type === 'edit') {
            writeText = diff.originalCode;
            toRange = { startLineNumber: diff.startLine, startColumn: 1, endLineNumber: diff.endLine, endColumn: Number.MAX_SAFE_INTEGER }; // 1-indexed
        }
        else {
            throw new Error(`Void error: ${diff}.type not recognized`);
        }
        // update the file
        this._writeURIText(uri, writeText, toRange, { shouldRealignDiffAreas: true });
        // originalCode does not change!
        // delete the diff
        this._deleteDiff(diff);
        // diffArea should be removed if it has no more diffs in it
        if (Object.keys(diffArea._diffOfId).length === 0) {
            this._deleteDiffZone(diffArea);
        }
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
    }
};
EditCodeService = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IModelService),
    __param(2, IUndoRedoService),
    __param(3, ILLMMessageService),
    __param(4, IConsistentItemService),
    __param(5, IInstantiationService),
    __param(6, IConsistentEditorItemService),
    __param(7, IMetricsService),
    __param(8, INotificationService),
    __param(9, IVoidSettingsService),
    __param(10, IVoidModelService),
    __param(11, IConvertToLLMMessageService)
], EditCodeService);
registerSingleton(IEditCodeService, EditCodeService, 0 /* InstantiationType.Eager */);
let AcceptRejectInlineWidget = class AcceptRejectInlineWidget extends Widget {
    getId() {
        return this.ID || ''; // Ensure we always return a string
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return null;
    }
    constructor({ editor, onAccept, onReject, diffid, startLine, offsetLines }, _voidCommandBarService, _keybindingService, _editCodeService) {
        super();
        this._voidCommandBarService = _voidCommandBarService;
        this._keybindingService = _keybindingService;
        this._editCodeService = _editCodeService;
        const uri = editor.getModel()?.uri;
        // Initialize with default values
        this.ID = '';
        this.editor = editor;
        this.startLine = startLine;
        if (!uri) {
            const { dummyDiv } = dom.h('div@dummyDiv');
            this._domNode = dummyDiv;
            return;
        }
        this.ID = uri.fsPath + diffid;
        const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
        const getAcceptRejectText = () => {
            const acceptKeybinding = this._keybindingService.lookupKeybinding(VOID_ACCEPT_DIFF_ACTION_ID);
            const rejectKeybinding = this._keybindingService.lookupKeybinding(VOID_REJECT_DIFF_ACTION_ID);
            // Use the standalone function directly since we're in a nested class that
            // can't access EditCodeService's methods
            const acceptKeybindLabel = this._editCodeService.processRawKeybindingText(acceptKeybinding && acceptKeybinding.getLabel() || '');
            const rejectKeybindLabel = this._editCodeService.processRawKeybindingText(rejectKeybinding && rejectKeybinding.getLabel() || '');
            const commandBarStateAtUri = this._voidCommandBarService.stateOfURI[uri.fsPath];
            const selectedDiffIdx = commandBarStateAtUri?.diffIdx ?? 0; // 0th item is selected by default
            const thisDiffIdx = commandBarStateAtUri?.sortedDiffIds.indexOf(diffid) ?? null;
            const showLabel = thisDiffIdx === selectedDiffIdx;
            const acceptText = `Accept${showLabel ? ` ` + acceptKeybindLabel : ''}`;
            const rejectText = `Reject${showLabel ? ` ` + rejectKeybindLabel : ''}`;
            return { acceptText, rejectText };
        };
        const { acceptText, rejectText } = getAcceptRejectText();
        // Create container div with buttons
        const { acceptButton, rejectButton, buttons } = dom.h('div@buttons', [
            dom.h('button@acceptButton', []),
            dom.h('button@rejectButton', [])
        ]);
        // Style the container
        buttons.style.display = 'flex';
        buttons.style.position = 'absolute';
        buttons.style.gap = '4px';
        buttons.style.paddingRight = '4px';
        buttons.style.zIndex = '1';
        buttons.style.transform = `translateY(${offsetLines * lineHeight}px)`;
        buttons.style.justifyContent = 'flex-end';
        buttons.style.width = '100%';
        buttons.style.pointerEvents = 'none';
        // Style accept button
        acceptButton.onclick = onAccept;
        acceptButton.textContent = acceptText;
        acceptButton.style.backgroundColor = acceptBg;
        acceptButton.style.border = acceptBorder;
        acceptButton.style.color = buttonTextColor;
        acceptButton.style.fontSize = buttonFontSize;
        acceptButton.style.borderTop = 'none';
        acceptButton.style.padding = '1px 4px';
        acceptButton.style.borderBottomLeftRadius = '6px';
        acceptButton.style.borderBottomRightRadius = '6px';
        acceptButton.style.borderTopLeftRadius = '0';
        acceptButton.style.borderTopRightRadius = '0';
        acceptButton.style.cursor = 'pointer';
        acceptButton.style.height = '100%';
        acceptButton.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
        acceptButton.style.pointerEvents = 'auto';
        // Style reject button
        rejectButton.onclick = onReject;
        rejectButton.textContent = rejectText;
        rejectButton.style.backgroundColor = rejectBg;
        rejectButton.style.border = rejectBorder;
        rejectButton.style.color = buttonTextColor;
        rejectButton.style.fontSize = buttonFontSize;
        rejectButton.style.borderTop = 'none';
        rejectButton.style.padding = '1px 4px';
        rejectButton.style.borderBottomLeftRadius = '6px';
        rejectButton.style.borderBottomRightRadius = '6px';
        rejectButton.style.borderTopLeftRadius = '0';
        rejectButton.style.borderTopRightRadius = '0';
        rejectButton.style.cursor = 'pointer';
        rejectButton.style.height = '100%';
        rejectButton.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
        rejectButton.style.pointerEvents = 'auto';
        this._domNode = buttons;
        const updateTop = () => {
            const topPx = editor.getTopForLineNumber(this.startLine) - editor.getScrollTop();
            this._domNode.style.top = `${topPx}px`;
        };
        const updateLeft = () => {
            const layoutInfo = editor.getLayoutInfo();
            const minimapWidth = layoutInfo.minimap.minimapWidth;
            const verticalScrollbarWidth = layoutInfo.verticalScrollbarWidth;
            const buttonWidth = this._domNode.offsetWidth;
            const leftPx = layoutInfo.width - minimapWidth - verticalScrollbarWidth - buttonWidth;
            this._domNode.style.left = `${leftPx}px`;
        };
        // Mount first, then update positions
        setTimeout(() => {
            updateTop();
            updateLeft();
        }, 0);
        this._register(editor.onDidScrollChange(e => { updateTop(); }));
        this._register(editor.onDidChangeModelContent(e => { updateTop(); }));
        this._register(editor.onDidLayoutChange(e => { updateTop(); updateLeft(); }));
        // Listen for state changes in the command bar service
        this._register(this._voidCommandBarService.onDidChangeState(e => {
            if (uri && e.uri.fsPath === uri.fsPath) {
                const { acceptText, rejectText } = getAcceptRejectText();
                acceptButton.textContent = acceptText;
                rejectButton.textContent = rejectText;
            }
        }));
        // mount this widget
        editor.addOverlayWidget(this);
        // console.log('created elt', this._domNode)
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
};
AcceptRejectInlineWidget = __decorate([
    __param(1, IVoidCommandBarService),
    __param(2, IKeybindingService),
    __param(3, IEditCodeService)
], AcceptRejectInlineWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdENvZGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2VkaXRDb2RlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLHVGQUF1RjtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixvRUFBb0U7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBR25ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQW9CLGdCQUFnQixFQUF1QixNQUFNLGtEQUFrRCxDQUFDO0FBQzNILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0RkFBNEYsQ0FBQztBQUMzSCwrRUFBK0U7QUFFL0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFL0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUFFLDJDQUEyQyxFQUFFLHlDQUF5QyxFQUFFLFVBQVUsR0FBRyxNQUFNLDZCQUE2QixD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