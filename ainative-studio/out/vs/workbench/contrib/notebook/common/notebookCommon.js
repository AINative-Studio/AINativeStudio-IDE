/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as glob from '../../../../base/common/glob.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { generateMetadataUri, generate as generateUri, extractCellOutputDetails, parseMetadataUri, parse as parseUri } from '../../../services/notebook/common/notebookDocumentService.js';
export const NOTEBOOK_EDITOR_ID = 'workbench.editor.notebook';
export const NOTEBOOK_DIFF_EDITOR_ID = 'workbench.editor.notebookTextDiffEditor';
export const NOTEBOOK_MULTI_DIFF_EDITOR_ID = 'workbench.editor.notebookMultiTextDiffEditor';
export const INTERACTIVE_WINDOW_EDITOR_ID = 'workbench.editor.interactive';
export const REPL_EDITOR_ID = 'workbench.editor.repl';
export const EXECUTE_REPL_COMMAND_ID = 'replNotebook.input.execute';
export var CellKind;
(function (CellKind) {
    CellKind[CellKind["Markup"] = 1] = "Markup";
    CellKind[CellKind["Code"] = 2] = "Code";
})(CellKind || (CellKind = {}));
export const NOTEBOOK_DISPLAY_ORDER = [
    'application/json',
    'application/javascript',
    'text/html',
    'image/svg+xml',
    Mimes.latex,
    Mimes.markdown,
    'image/png',
    'image/jpeg',
    Mimes.text
];
export const ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER = [
    Mimes.latex,
    Mimes.markdown,
    'application/json',
    'text/html',
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    Mimes.text,
];
/**
 * A mapping of extension IDs who contain renderers, to notebook ids who they
 * should be treated as the same in the renderer selection logic. This is used
 * to prefer the 1st party Jupyter renderers even though they're in a separate
 * extension, for instance. See #136247.
 */
export const RENDERER_EQUIVALENT_EXTENSIONS = new Map([
    ['ms-toolsai.jupyter', new Set(['jupyter-notebook', 'interactive'])],
    ['ms-toolsai.jupyter-renderers', new Set(['jupyter-notebook', 'interactive'])],
]);
export const RENDERER_NOT_AVAILABLE = '_notAvailable';
export var NotebookRunState;
(function (NotebookRunState) {
    NotebookRunState[NotebookRunState["Running"] = 1] = "Running";
    NotebookRunState[NotebookRunState["Idle"] = 2] = "Idle";
})(NotebookRunState || (NotebookRunState = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    NotebookCellExecutionState[NotebookCellExecutionState["Unconfirmed"] = 1] = "Unconfirmed";
    NotebookCellExecutionState[NotebookCellExecutionState["Pending"] = 2] = "Pending";
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookExecutionState;
(function (NotebookExecutionState) {
    NotebookExecutionState[NotebookExecutionState["Unconfirmed"] = 1] = "Unconfirmed";
    NotebookExecutionState[NotebookExecutionState["Pending"] = 2] = "Pending";
    NotebookExecutionState[NotebookExecutionState["Executing"] = 3] = "Executing";
})(NotebookExecutionState || (NotebookExecutionState = {}));
/** Note: enum values are used for sorting */
export var NotebookRendererMatch;
(function (NotebookRendererMatch) {
    /** Renderer has a hard dependency on an available kernel */
    NotebookRendererMatch[NotebookRendererMatch["WithHardKernelDependency"] = 0] = "WithHardKernelDependency";
    /** Renderer works better with an available kernel */
    NotebookRendererMatch[NotebookRendererMatch["WithOptionalKernelDependency"] = 1] = "WithOptionalKernelDependency";
    /** Renderer is kernel-agnostic */
    NotebookRendererMatch[NotebookRendererMatch["Pure"] = 2] = "Pure";
    /** Renderer is for a different mimeType or has a hard dependency which is unsatisfied */
    NotebookRendererMatch[NotebookRendererMatch["Never"] = 3] = "Never";
})(NotebookRendererMatch || (NotebookRendererMatch = {}));
/**
 * Renderer messaging requirement. While this allows for 'optional' messaging,
 * VS Code effectively treats it the same as true right now. "Partial
 * activation" of extensions is a very tricky problem, which could allow
 * solving this. But for now, optional is mostly only honored for aznb.
 */
export var RendererMessagingSpec;
(function (RendererMessagingSpec) {
    RendererMessagingSpec["Always"] = "always";
    RendererMessagingSpec["Never"] = "never";
    RendererMessagingSpec["Optional"] = "optional";
})(RendererMessagingSpec || (RendererMessagingSpec = {}));
export var NotebookCellsChangeType;
(function (NotebookCellsChangeType) {
    NotebookCellsChangeType[NotebookCellsChangeType["ModelChange"] = 1] = "ModelChange";
    NotebookCellsChangeType[NotebookCellsChangeType["Move"] = 2] = "Move";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellLanguage"] = 5] = "ChangeCellLanguage";
    NotebookCellsChangeType[NotebookCellsChangeType["Initialize"] = 6] = "Initialize";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellMetadata"] = 7] = "ChangeCellMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["Output"] = 8] = "Output";
    NotebookCellsChangeType[NotebookCellsChangeType["OutputItem"] = 9] = "OutputItem";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellContent"] = 10] = "ChangeCellContent";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeDocumentMetadata"] = 11] = "ChangeDocumentMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellInternalMetadata"] = 12] = "ChangeCellInternalMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellMime"] = 13] = "ChangeCellMime";
    NotebookCellsChangeType[NotebookCellsChangeType["Unknown"] = 100] = "Unknown";
})(NotebookCellsChangeType || (NotebookCellsChangeType = {}));
export var SelectionStateType;
(function (SelectionStateType) {
    SelectionStateType[SelectionStateType["Handle"] = 0] = "Handle";
    SelectionStateType[SelectionStateType["Index"] = 1] = "Index";
})(SelectionStateType || (SelectionStateType = {}));
export var CellEditType;
(function (CellEditType) {
    CellEditType[CellEditType["Replace"] = 1] = "Replace";
    CellEditType[CellEditType["Output"] = 2] = "Output";
    CellEditType[CellEditType["Metadata"] = 3] = "Metadata";
    CellEditType[CellEditType["CellLanguage"] = 4] = "CellLanguage";
    CellEditType[CellEditType["DocumentMetadata"] = 5] = "DocumentMetadata";
    CellEditType[CellEditType["Move"] = 6] = "Move";
    CellEditType[CellEditType["OutputItems"] = 7] = "OutputItems";
    CellEditType[CellEditType["PartialMetadata"] = 8] = "PartialMetadata";
    CellEditType[CellEditType["PartialInternalMetadata"] = 9] = "PartialInternalMetadata";
})(CellEditType || (CellEditType = {}));
export var NotebookMetadataUri;
(function (NotebookMetadataUri) {
    NotebookMetadataUri.scheme = Schemas.vscodeNotebookMetadata;
    function generate(notebook) {
        return generateMetadataUri(notebook);
    }
    NotebookMetadataUri.generate = generate;
    function parse(metadata) {
        return parseMetadataUri(metadata);
    }
    NotebookMetadataUri.parse = parse;
})(NotebookMetadataUri || (NotebookMetadataUri = {}));
export var CellUri;
(function (CellUri) {
    CellUri.scheme = Schemas.vscodeNotebookCell;
    function generate(notebook, handle) {
        return generateUri(notebook, handle);
    }
    CellUri.generate = generate;
    function parse(cell) {
        return parseUri(cell);
    }
    CellUri.parse = parse;
    /**
     * Generates a URI for a cell output in a notebook using the output ID.
     * Used when URI should be opened as text in the editor.
     */
    function generateCellOutputUriWithId(notebook, outputId) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            query: new URLSearchParams({
                openIn: 'editor',
                outputId: outputId ?? '',
                notebookScheme: notebook.scheme !== Schemas.file ? notebook.scheme : '',
            }).toString()
        });
    }
    CellUri.generateCellOutputUriWithId = generateCellOutputUriWithId;
    /**
     * Generates a URI for a cell output in a notebook using the output index.
     * Used when URI should be opened in notebook editor.
     */
    function generateCellOutputUriWithIndex(notebook, cellUri, outputIndex) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            fragment: cellUri.fragment,
            query: new URLSearchParams({
                openIn: 'notebook',
                outputIndex: String(outputIndex),
            }).toString()
        });
    }
    CellUri.generateCellOutputUriWithIndex = generateCellOutputUriWithIndex;
    function parseCellOutputUri(uri) {
        return extractCellOutputDetails(uri);
    }
    CellUri.parseCellOutputUri = parseCellOutputUri;
    function generateCellPropertyUri(notebook, handle, scheme) {
        return CellUri.generate(notebook, handle).with({ scheme: scheme });
    }
    CellUri.generateCellPropertyUri = generateCellPropertyUri;
    function parseCellPropertyUri(uri, propertyScheme) {
        if (uri.scheme !== propertyScheme) {
            return undefined;
        }
        return CellUri.parse(uri.with({ scheme: CellUri.scheme }));
    }
    CellUri.parseCellPropertyUri = parseCellPropertyUri;
})(CellUri || (CellUri = {}));
const normalizeSlashes = (str) => isWindows ? str.replace(/\//g, '\\') : str;
export class MimeTypeDisplayOrder {
    constructor(initialValue = [], defaultOrder = NOTEBOOK_DISPLAY_ORDER) {
        this.defaultOrder = defaultOrder;
        this.order = [...new Set(initialValue)].map(pattern => ({
            pattern,
            matches: glob.parse(normalizeSlashes(pattern))
        }));
    }
    /**
     * Returns a sorted array of the input mimetypes.
     */
    sort(mimetypes) {
        const remaining = new Map(Iterable.map(mimetypes, m => [m, normalizeSlashes(m)]));
        let sorted = [];
        for (const { matches } of this.order) {
            for (const [original, normalized] of remaining) {
                if (matches(normalized)) {
                    sorted.push(original);
                    remaining.delete(original);
                    break;
                }
            }
        }
        if (remaining.size) {
            sorted = sorted.concat([...remaining.keys()].sort((a, b) => this.defaultOrder.indexOf(a) - this.defaultOrder.indexOf(b)));
        }
        return sorted;
    }
    /**
     * Records that the user selected the given mimetype over the other
     * possible mimetypes, prioritizing it for future reference.
     */
    prioritize(chosenMimetype, otherMimetypes) {
        const chosenIndex = this.findIndex(chosenMimetype);
        if (chosenIndex === -1) {
            // always first, nothing more to do
            this.order.unshift({ pattern: chosenMimetype, matches: glob.parse(normalizeSlashes(chosenMimetype)) });
            return;
        }
        // Get the other mimetypes that are before the chosenMimetype. Then, move
        // them after it, retaining order.
        const uniqueIndicies = new Set(otherMimetypes.map(m => this.findIndex(m, chosenIndex)));
        uniqueIndicies.delete(-1);
        const otherIndices = Array.from(uniqueIndicies).sort();
        this.order.splice(chosenIndex + 1, 0, ...otherIndices.map(i => this.order[i]));
        for (let oi = otherIndices.length - 1; oi >= 0; oi--) {
            this.order.splice(otherIndices[oi], 1);
        }
    }
    /**
     * Gets an array of in-order mimetype preferences.
     */
    toArray() {
        return this.order.map(o => o.pattern);
    }
    findIndex(mimeType, maxIndex = this.order.length) {
        const normalized = normalizeSlashes(mimeType);
        for (let i = 0; i < maxIndex; i++) {
            if (this.order[i].matches(normalized)) {
                return i;
            }
        }
        return -1;
    }
}
export function diff(before, after, contains, equal = (a, b) => a === b) {
    const result = [];
    function pushSplice(start, deleteCount, toInsert) {
        if (deleteCount === 0 && toInsert.length === 0) {
            return;
        }
        const latest = result[result.length - 1];
        if (latest && latest.start + latest.deleteCount === start) {
            latest.deleteCount += deleteCount;
            latest.toInsert.push(...toInsert);
        }
        else {
            result.push({ start, deleteCount, toInsert });
        }
    }
    let beforeIdx = 0;
    let afterIdx = 0;
    while (true) {
        if (beforeIdx === before.length) {
            pushSplice(beforeIdx, 0, after.slice(afterIdx));
            break;
        }
        if (afterIdx === after.length) {
            pushSplice(beforeIdx, before.length - beforeIdx, []);
            break;
        }
        const beforeElement = before[beforeIdx];
        const afterElement = after[afterIdx];
        if (equal(beforeElement, afterElement)) {
            // equal
            beforeIdx += 1;
            afterIdx += 1;
            continue;
        }
        if (contains(afterElement)) {
            // `afterElement` exists before, which means some elements before `afterElement` are deleted
            pushSplice(beforeIdx, 1, []);
            beforeIdx += 1;
        }
        else {
            // `afterElement` added
            pushSplice(beforeIdx, 0, [afterElement]);
            afterIdx += 1;
        }
    }
    return result;
}
export const NOTEBOOK_EDITOR_CURSOR_BOUNDARY = new RawContextKey('notebookEditorCursorAtBoundary', 'none');
export const NOTEBOOK_EDITOR_CURSOR_LINE_BOUNDARY = new RawContextKey('notebookEditorCursorAtLineBoundary', 'none');
export var NotebookEditorPriority;
(function (NotebookEditorPriority) {
    NotebookEditorPriority["default"] = "default";
    NotebookEditorPriority["option"] = "option";
})(NotebookEditorPriority || (NotebookEditorPriority = {}));
export var NotebookFindScopeType;
(function (NotebookFindScopeType) {
    NotebookFindScopeType["Cells"] = "cells";
    NotebookFindScopeType["Text"] = "text";
    NotebookFindScopeType["None"] = "none";
})(NotebookFindScopeType || (NotebookFindScopeType = {}));
//TODO@rebornix test
export function isDocumentExcludePattern(filenamePattern) {
    const arg = filenamePattern;
    if ((typeof arg.include === 'string' || glob.isRelativePattern(arg.include))
        && (typeof arg.exclude === 'string' || glob.isRelativePattern(arg.exclude))) {
        return true;
    }
    return false;
}
export function notebookDocumentFilterMatch(filter, viewType, resource) {
    if (Array.isArray(filter.viewType) && filter.viewType.indexOf(viewType) >= 0) {
        return true;
    }
    if (filter.viewType === viewType) {
        return true;
    }
    if (filter.filenamePattern) {
        const filenamePattern = isDocumentExcludePattern(filter.filenamePattern) ? filter.filenamePattern.include : filter.filenamePattern;
        const excludeFilenamePattern = isDocumentExcludePattern(filter.filenamePattern) ? filter.filenamePattern.exclude : undefined;
        if (glob.match(filenamePattern, basename(resource.fsPath).toLowerCase())) {
            if (excludeFilenamePattern) {
                if (glob.match(excludeFilenamePattern, basename(resource.fsPath).toLowerCase())) {
                    // should exclude
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
export const NotebookSetting = {
    displayOrder: 'notebook.displayOrder',
    cellToolbarLocation: 'notebook.cellToolbarLocation',
    cellToolbarVisibility: 'notebook.cellToolbarVisibility',
    showCellStatusBar: 'notebook.showCellStatusBar',
    cellExecutionTimeVerbosity: 'notebook.cellExecutionTimeVerbosity',
    textDiffEditorPreview: 'notebook.diff.enablePreview',
    diffOverviewRuler: 'notebook.diff.overviewRuler',
    experimentalInsertToolbarAlignment: 'notebook.experimental.insertToolbarAlignment',
    compactView: 'notebook.compactView',
    focusIndicator: 'notebook.cellFocusIndicator',
    insertToolbarLocation: 'notebook.insertToolbarLocation',
    globalToolbar: 'notebook.globalToolbar',
    stickyScrollEnabled: 'notebook.stickyScroll.enabled',
    stickyScrollMode: 'notebook.stickyScroll.mode',
    undoRedoPerCell: 'notebook.undoRedoPerCell',
    consolidatedOutputButton: 'notebook.consolidatedOutputButton',
    showFoldingControls: 'notebook.showFoldingControls',
    dragAndDropEnabled: 'notebook.dragAndDropEnabled',
    cellEditorOptionsCustomizations: 'notebook.editorOptionsCustomizations',
    consolidatedRunButton: 'notebook.consolidatedRunButton',
    openGettingStarted: 'notebook.experimental.openGettingStarted',
    globalToolbarShowLabel: 'notebook.globalToolbarShowLabel',
    markupFontSize: 'notebook.markup.fontSize',
    markdownLineHeight: 'notebook.markdown.lineHeight',
    interactiveWindowCollapseCodeCells: 'interactiveWindow.collapseCellInputCode',
    outputScrollingDeprecated: 'notebook.experimental.outputScrolling',
    outputScrolling: 'notebook.output.scrolling',
    textOutputLineLimit: 'notebook.output.textLineLimit',
    LinkifyOutputFilePaths: 'notebook.output.linkifyFilePaths',
    minimalErrorRendering: 'notebook.output.minimalErrorRendering',
    formatOnSave: 'notebook.formatOnSave.enabled',
    insertFinalNewline: 'notebook.insertFinalNewline',
    defaultFormatter: 'notebook.defaultFormatter',
    formatOnCellExecution: 'notebook.formatOnCellExecution',
    codeActionsOnSave: 'notebook.codeActionsOnSave',
    outputWordWrap: 'notebook.output.wordWrap',
    outputLineHeightDeprecated: 'notebook.outputLineHeight',
    outputLineHeight: 'notebook.output.lineHeight',
    outputFontSizeDeprecated: 'notebook.outputFontSize',
    outputFontSize: 'notebook.output.fontSize',
    outputFontFamilyDeprecated: 'notebook.outputFontFamily',
    outputFontFamily: 'notebook.output.fontFamily',
    findFilters: 'notebook.find.filters',
    logging: 'notebook.logging',
    confirmDeleteRunningCell: 'notebook.confirmDeleteRunningCell',
    remoteSaving: 'notebook.experimental.remoteSave',
    gotoSymbolsAllSymbols: 'notebook.gotoSymbols.showAllSymbols',
    outlineShowMarkdownHeadersOnly: 'notebook.outline.showMarkdownHeadersOnly',
    outlineShowCodeCells: 'notebook.outline.showCodeCells',
    outlineShowCodeCellSymbols: 'notebook.outline.showCodeCellSymbols',
    breadcrumbsShowCodeCells: 'notebook.breadcrumbs.showCodeCells',
    scrollToRevealCell: 'notebook.scrolling.revealNextCellOnExecute',
    cellChat: 'notebook.experimental.cellChat',
    cellGenerate: 'notebook.experimental.generate',
    notebookVariablesView: 'notebook.variablesView',
    notebookInlineValues: 'notebook.inlineValues',
    InteractiveWindowPromptToSave: 'interactiveWindow.promptToSaveOnClose',
    cellFailureDiagnostics: 'notebook.cellFailureDiagnostics',
    outputBackupSizeLimit: 'notebook.backup.sizeLimit',
    multiCursor: 'notebook.multiCursor.enabled',
    markupFontFamily: 'notebook.markup.fontFamily',
};
export var CellStatusbarAlignment;
(function (CellStatusbarAlignment) {
    CellStatusbarAlignment[CellStatusbarAlignment["Left"] = 1] = "Left";
    CellStatusbarAlignment[CellStatusbarAlignment["Right"] = 2] = "Right";
})(CellStatusbarAlignment || (CellStatusbarAlignment = {}));
export class NotebookWorkingCopyTypeIdentifier {
    static { this._prefix = 'notebook/'; }
    static create(notebookType, viewType) {
        return `${NotebookWorkingCopyTypeIdentifier._prefix}${notebookType}/${viewType ?? notebookType}`;
    }
    static parse(candidate) {
        if (candidate.startsWith(NotebookWorkingCopyTypeIdentifier._prefix)) {
            const split = candidate.substring(NotebookWorkingCopyTypeIdentifier._prefix.length).split('/');
            if (split.length === 2) {
                return { notebookType: split[0], viewType: split[1] };
            }
        }
        return undefined;
    }
}
/**
 * Whether the provided mime type is a text stream like `stdout`, `stderr`.
 */
export function isTextStreamMime(mimeType) {
    return ['application/vnd.code.notebook.stdout', 'application/vnd.code.notebook.stderr'].includes(mimeType);
}
const textDecoder = new TextDecoder();
/**
 * Given a stream of individual stdout outputs, this function will return the compressed lines, escaping some of the common terminal escape codes.
 * E.g. some terminal escape codes would result in the previous line getting cleared, such if we had 3 lines and
 * last line contained such a code, then the result string would be just the first two lines.
 * @returns a single VSBuffer with the concatenated and compressed data, and whether any compression was done.
 */
export function compressOutputItemStreams(outputs) {
    const buffers = [];
    let startAppending = false;
    // Pick the first set of outputs with the same mime type.
    for (const output of outputs) {
        if ((buffers.length === 0 || startAppending)) {
            buffers.push(output);
            startAppending = true;
        }
    }
    let didCompression = compressStreamBuffer(buffers);
    const concatenated = VSBuffer.concat(buffers.map(buffer => VSBuffer.wrap(buffer)));
    const data = formatStreamText(concatenated);
    didCompression = didCompression || data.byteLength !== concatenated.byteLength;
    return { data, didCompression };
}
export const MOVE_CURSOR_1_LINE_COMMAND = `${String.fromCharCode(27)}[A`;
const MOVE_CURSOR_1_LINE_COMMAND_BYTES = MOVE_CURSOR_1_LINE_COMMAND.split('').map(c => c.charCodeAt(0));
const LINE_FEED = 10;
function compressStreamBuffer(streams) {
    let didCompress = false;
    streams.forEach((stream, index) => {
        if (index === 0 || stream.length < MOVE_CURSOR_1_LINE_COMMAND.length) {
            return;
        }
        const previousStream = streams[index - 1];
        // Remove the previous line if required.
        const command = stream.subarray(0, MOVE_CURSOR_1_LINE_COMMAND.length);
        if (command[0] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[0] && command[1] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[1] && command[2] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[2]) {
            const lastIndexOfLineFeed = previousStream.lastIndexOf(LINE_FEED);
            if (lastIndexOfLineFeed === -1) {
                return;
            }
            didCompress = true;
            streams[index - 1] = previousStream.subarray(0, lastIndexOfLineFeed);
            streams[index] = stream.subarray(MOVE_CURSOR_1_LINE_COMMAND.length);
        }
    });
    return didCompress;
}
/**
 * Took this from jupyter/notebook
 * https://github.com/jupyter/notebook/blob/b8b66332e2023e83d2ee04f83d8814f567e01a4e/notebook/static/base/js/utils.js
 * Remove characters that are overridden by backspace characters
 */
function fixBackspace(txt) {
    let tmp = txt;
    do {
        txt = tmp;
        // Cancel out anything-but-newline followed by backspace
        tmp = txt.replace(/[^\n]\x08/gm, '');
    } while (tmp.length < txt.length);
    return txt;
}
/**
 * Remove chunks that should be overridden by the effect of carriage return characters
 * From https://github.com/jupyter/notebook/blob/master/notebook/static/base/js/utils.js
 */
function fixCarriageReturn(txt) {
    txt = txt.replace(/\r+\n/gm, '\n'); // \r followed by \n --> newline
    while (txt.search(/\r[^$]/g) > -1) {
        const base = txt.match(/^(.*)\r+/m)[1];
        let insert = txt.match(/\r+(.*)$/m)[1];
        insert = insert + base.slice(insert.length, base.length);
        txt = txt.replace(/\r+.*$/m, '\r').replace(/^.*\r/m, insert);
    }
    return txt;
}
const BACKSPACE_CHARACTER = '\b'.charCodeAt(0);
const CARRIAGE_RETURN_CHARACTER = '\r'.charCodeAt(0);
function formatStreamText(buffer) {
    // We have special handling for backspace and carriage return characters.
    // Don't unnecessary decode the bytes if we don't need to perform any processing.
    if (!buffer.buffer.includes(BACKSPACE_CHARACTER) && !buffer.buffer.includes(CARRIAGE_RETURN_CHARACTER)) {
        return buffer;
    }
    // Do the same thing jupyter is doing
    return VSBuffer.fromString(fixCarriageReturn(fixBackspace(textDecoder.decode(buffer.buffer))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL25vdGVib29rQ29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUk3RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFTaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBVXJGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLElBQUksV0FBVyxFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLEtBQUssSUFBSSxRQUFRLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUkzTCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRywyQkFBMkIsQ0FBQztBQUM5RCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyx5Q0FBeUMsQ0FBQztBQUNqRixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyw4Q0FBOEMsQ0FBQztBQUM1RixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyw4QkFBOEIsQ0FBQztBQUMzRSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFF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