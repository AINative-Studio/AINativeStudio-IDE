/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdENvZGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9lZGl0Q29kZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUduRyx1RkFBdUY7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsb0VBQW9FO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUduRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFvQixnQkFBZ0IsRUFBdUIsTUFBTSxrREFBa0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEZBQTRGLENBQUM7QUFDM0gsK0VBQStFO0FBRS9FLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBRSwyQ0FBMkMsRUFBRSx5Q0FBeUMsRUFBRSxVQUFVLEdBQUcsTUFBTSw2QkFBNkIs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