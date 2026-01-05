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
import { ainativePrefixAndSuffix, ctrlKStream_userMessage, ctrlKStream_systemMessage, defaultQuickEditFimTags, rewriteCode_systemMessage, rewriteCode_userMessage, searchReplaceGivenDescription_systemMessage, searchReplaceGivenDescription_userMessage, tripleTick, } from '../common/prompt/prompts.js';
import { IAINativeCommandBarService } from './ainativeCommandBarService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { VOID_ACCEPT_DIFF_ACTION_ID, VOID_REJECT_DIFF_ACTION_ID } from './actionIDs.js';
import { mountCtrlK } from './react/out/quick-edit-tsx/index.js';
import { extractCodeFromFIM, extractCodeFromRegular, extractSearchReplaceBlocks } from '../common/helpers/extractCodeFromResult.js';
import { INotificationService, } from '../../../../platform/notification/common/notification.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { IMetricsService } from '../common/metricsService.js';
import { IEditCodeService, } from './editCodeServiceInterface.js';
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { IAINativeModelService } from '../common/ainativeModelService.js';
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
    constructor(_codeEditorService, _modelService, _undoRedoService, _llmMessageService, _consistentItemService, _instantiationService, _consistentEditorItemService, _metricsService, _notificationService, _settingsService, _ainativeModelService, _convertToLLMMessageService) {
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
        this._ainativeModelService = _ainativeModelService;
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
        // 		message: `AINative Studio Error: ${e.message}`,
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
        // 		source: details ? `(Hold ${isMacintosh ? 'Option' : 'Alt'} to hover) - ${details}\n\nIf this persists, feel free to [report](https://github.com/AINative-Studio/AINativeStudio-IDE/issues/new) it.` : undefined
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
            const { model } = this._ainativeModelService.getModel(uri);
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type === 'DiffZone') {
                    // add sweep styles to the diffZone
                    if (diffArea._streamState.isStreaming) {
                        // sweepLine ... sweepLine
                        const fn1 = this._addLineDecoration(model, diffArea._streamState.line, diffArea._streamState.line, 'ainative-sweepIdxBG');
                        // sweepLine+1 ... endLine
                        const fn2 = diffArea._streamState.line + 1 <= diffArea.endLine ?
                            this._addLineDecoration(model, diffArea._streamState.line + 1, diffArea.endLine, 'ainative-sweepBG')
                            : null;
                        diffArea._removeStylesFns.add(() => { fn1?.(); fn2?.(); });
                    }
                }
                else if (diffArea.type === 'CtrlKZone' && diffArea._linkedStreamingDiffZone === null) {
                    // highlight zone's text
                    const fn = this._addLineDecoration(model, diffArea.startLine, diffArea.endLine, 'ainative-highlightBG');
                    diffArea._removeStylesFns.add(() => fn?.());
                }
            }
        };
        this._computeDiffsAndAddStylesToURI = (uri) => {
            const { model } = this._ainativeModelService.getModel(uri);
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
            const { model } = this._ainativeModelService.getModel(uri);
            // green decoration and minimap decoration
            if (type !== 'deletion') {
                const fn = this._addLineDecoration(model, diff.startLine, diff.endLine, 'ainative-greenBG', {
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
                        domNode.className = 'ainative-redBG';
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
        this._getCurrentAINativeFileSnapshot = (uri) => {
            const { model } = this._ainativeModelService.getModel(uri);
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
        this._restoreAINativeFileSnapshot = async (uri, snapshot) => {
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
            await this._ainativeModelService.initializeModel(model.uri);
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
        const { model } = this._ainativeModelService.getModel(uri);
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
        const beforeSnapshot = this._getCurrentAINativeFileSnapshot(uri);
        let afterSnapshot = null;
        const elt = {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: uri,
            label: 'AINative Agent',
            code: 'undoredo.editCode',
            undo: async () => { opts?.onWillUndo?.(); await this._restoreAINativeFileSnapshot(uri, beforeSnapshot); },
            redo: async () => { if (afterSnapshot)
                await this._restoreAINativeFileSnapshot(uri, afterSnapshot); }
        };
        this._undoRedoService.pushElement(elt);
        const onFinishEdit = async () => {
            afterSnapshot = this._getCurrentAINativeFileSnapshot(uri);
            await this._ainativeModelService.saveModel(uri);
        };
        return { onFinishEdit };
    }
    getAINativeFileSnapshot(uri) {
        return this._getCurrentAINativeFileSnapshot(uri);
    }
    restoreAINativeFileSnapshot(uri, snapshot) {
        this._restoreAINativeFileSnapshot(uri, snapshot);
    }
    /** @deprecated Legacy alias for backward compatibility. Use getAINativeFileSnapshot instead. */
    getVoidFileSnapshot(uri) {
        return this.getAINativeFileSnapshot(uri);
    }
    /** @deprecated Legacy alias for backward compatibility. Use restoreAINativeFileSnapshot instead. */
    restoreVoidFileSnapshot(uri, snapshot) {
        this.restoreAINativeFileSnapshot(uri, snapshot);
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
                throw new Error(`AINative Studio: diff.type not recognized on: ${lastDiff}`);
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
        await this._ainativeModelService.initializeModel(uri);
        await this._ainativeModelService.saveModel(uri); // save the URI
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
        const { model } = this._ainativeModelService.getModel(uri);
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
            throw new Error(`AINative Studio: diff.type not recognized on: ${from}`);
        }
        const { model } = this._ainativeModelService.getModel(uri);
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
            const { prefix, suffix } = ainativePrefixAndSuffix({ fullFileStr: originalFileCode, startLine, endLine });
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
        const { model } = this._ainativeModelService.getModel(uri);
        if (!model)
            return null;
        const numCharsInFile = model.getValueLength(1 /* EndOfLinePreference.LF */);
        return numCharsInFile;
    }
    _instantlyApplySRBlocks(uri, blocksStr) {
        const blocks = extractSearchReplaceBlocks(blocksStr);
        if (blocks.length === 0)
            throw new Error(`No Search/Replace blocks were received!`);
        const { model } = this._ainativeModelService.getModel(uri);
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
        const { model } = this._ainativeModelService.getModel(uri);
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
                            this._notificationService.info(`AINative Studio: We ran Fast Apply, but the LLM didn't output any changes.`);
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
    __param(9, IAINativeSettingsService),
    __param(10, IAINativeModelService),
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
    constructor({ editor, onAccept, onReject, diffid, startLine, offsetLines }, _ainativeCommandBarService, _keybindingService, _editCodeService) {
        super();
        this._ainativeCommandBarService = _ainativeCommandBarService;
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
            const commandBarStateAtUri = this._ainativeCommandBarService.stateOfURI[uri.fsPath];
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
        this._register(this._ainativeCommandBarService.onDidChangeState(e => {
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
    __param(1, IAINativeCommandBarService),
    __param(2, IKeybindingService),
    __param(3, IEditCodeService)
], AcceptRejectInlineWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdENvZGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2VkaXRDb2RlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLHVGQUF1RjtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixvRUFBb0U7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBR25ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQW9CLGdCQUFnQixFQUF1QixNQUFNLGtEQUFrRCxDQUFDO0FBQzNILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0RkFBNEYsQ0FBQztBQUMzSCwrRUFBK0U7QUFFL0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFL0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUFFLDJDQUEyQyxFQUFFLHlDQUF5QyxFQUFFLFVBQVUsR0FBRyxNQUFNLDZC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