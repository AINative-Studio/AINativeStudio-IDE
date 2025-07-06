/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce, isNonEmptyArray } from '../../../base/common/arrays.js';
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { UriList } from '../../../base/common/dataTransfer.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import * as htmlContent from '../../../base/common/htmlContent.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import * as marked from '../../../base/common/marked/marked.js';
import { parse, revive } from '../../../base/common/marshalling.js';
import { Mimes } from '../../../base/common/mime.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { isWindows } from '../../../base/common/platform.js';
import { WellDefinedPrefixTree } from '../../../base/common/prefixTree.js';
import { basename } from '../../../base/common/resources.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { isDefined, isEmptyObject, isNumber, isString, isUndefinedOrNull } from '../../../base/common/types.js';
import { URI, isUriComponents } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as editorRange from '../../../editor/common/core/range.js';
import * as languages from '../../../editor/common/languages.js';
import { MarkerSeverity } from '../../../platform/markers/common/markers.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../common/editor.js';
import * as notebooks from '../../contrib/notebook/common/notebookCommon.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { denamespaceTestTag, namespaceTestTag } from '../../contrib/testing/common/testTypes.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { getPrivateApiFor } from './extHostTestingPrivateApi.js';
import * as types from './extHostTypes.js';
import { LanguageModelTextPart } from './extHostTypes.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
export var Selection;
(function (Selection) {
    function to(selection) {
        const { selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn } = selection;
        const start = new types.Position(selectionStartLineNumber - 1, selectionStartColumn - 1);
        const end = new types.Position(positionLineNumber - 1, positionColumn - 1);
        return new types.Selection(start, end);
    }
    Selection.to = to;
    function from(selection) {
        const { anchor, active } = selection;
        return {
            selectionStartLineNumber: anchor.line + 1,
            selectionStartColumn: anchor.character + 1,
            positionLineNumber: active.line + 1,
            positionColumn: active.character + 1
        };
    }
    Selection.from = from;
})(Selection || (Selection = {}));
export var Range;
(function (Range) {
    function from(range) {
        if (!range) {
            return undefined;
        }
        const { start, end } = range;
        return {
            startLineNumber: start.line + 1,
            startColumn: start.character + 1,
            endLineNumber: end.line + 1,
            endColumn: end.character + 1
        };
    }
    Range.from = from;
    function to(range) {
        if (!range) {
            return undefined;
        }
        const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
        return new types.Range(startLineNumber - 1, startColumn - 1, endLineNumber - 1, endColumn - 1);
    }
    Range.to = to;
})(Range || (Range = {}));
export var Location;
(function (Location) {
    function from(location) {
        return {
            uri: location.uri,
            range: Range.from(location.range)
        };
    }
    Location.from = from;
    function to(location) {
        return new types.Location(URI.revive(location.uri), Range.to(location.range));
    }
    Location.to = to;
})(Location || (Location = {}));
export var TokenType;
(function (TokenType) {
    function to(type) {
        switch (type) {
            case 1 /* encodedTokenAttributes.StandardTokenType.Comment */: return types.StandardTokenType.Comment;
            case 0 /* encodedTokenAttributes.StandardTokenType.Other */: return types.StandardTokenType.Other;
            case 3 /* encodedTokenAttributes.StandardTokenType.RegEx */: return types.StandardTokenType.RegEx;
            case 2 /* encodedTokenAttributes.StandardTokenType.String */: return types.StandardTokenType.String;
        }
    }
    TokenType.to = to;
})(TokenType || (TokenType = {}));
export var Position;
(function (Position) {
    function to(position) {
        return new types.Position(position.lineNumber - 1, position.column - 1);
    }
    Position.to = to;
    function from(position) {
        return { lineNumber: position.line + 1, column: position.character + 1 };
    }
    Position.from = from;
})(Position || (Position = {}));
export var DocumentSelector;
(function (DocumentSelector) {
    function from(value, uriTransformer, extension) {
        return coalesce(asArray(value).map(sel => _doTransformDocumentSelector(sel, uriTransformer, extension)));
    }
    DocumentSelector.from = from;
    function _doTransformDocumentSelector(selector, uriTransformer, extension) {
        if (typeof selector === 'string') {
            return {
                $serialized: true,
                language: selector,
                isBuiltin: extension?.isBuiltin,
            };
        }
        if (selector) {
            return {
                $serialized: true,
                language: selector.language,
                scheme: _transformScheme(selector.scheme, uriTransformer),
                pattern: GlobPattern.from(selector.pattern) ?? undefined,
                exclusive: selector.exclusive,
                notebookType: selector.notebookType,
                isBuiltin: extension?.isBuiltin
            };
        }
        return undefined;
    }
    function _transformScheme(scheme, uriTransformer) {
        if (uriTransformer && typeof scheme === 'string') {
            return uriTransformer.transformOutgoingScheme(scheme);
        }
        return scheme;
    }
})(DocumentSelector || (DocumentSelector = {}));
export var DiagnosticTag;
(function (DiagnosticTag) {
    function from(value) {
        switch (value) {
            case types.DiagnosticTag.Unnecessary:
                return 1 /* MarkerTag.Unnecessary */;
            case types.DiagnosticTag.Deprecated:
                return 2 /* MarkerTag.Deprecated */;
        }
        return undefined;
    }
    DiagnosticTag.from = from;
    function to(value) {
        switch (value) {
            case 1 /* MarkerTag.Unnecessary */:
                return types.DiagnosticTag.Unnecessary;
            case 2 /* MarkerTag.Deprecated */:
                return types.DiagnosticTag.Deprecated;
            default:
                return undefined;
        }
    }
    DiagnosticTag.to = to;
})(DiagnosticTag || (DiagnosticTag = {}));
export var Diagnostic;
(function (Diagnostic) {
    function from(value) {
        let code;
        if (value.code) {
            if (isString(value.code) || isNumber(value.code)) {
                code = String(value.code);
            }
            else {
                code = {
                    value: String(value.code.value),
                    target: value.code.target,
                };
            }
        }
        return {
            ...Range.from(value.range),
            message: value.message,
            source: value.source,
            code,
            severity: DiagnosticSeverity.from(value.severity),
            relatedInformation: value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.from),
            tags: Array.isArray(value.tags) ? coalesce(value.tags.map(DiagnosticTag.from)) : undefined,
        };
    }
    Diagnostic.from = from;
    function to(value) {
        const res = new types.Diagnostic(Range.to(value), value.message, DiagnosticSeverity.to(value.severity));
        res.source = value.source;
        res.code = isString(value.code) ? value.code : value.code?.value;
        res.relatedInformation = value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.to);
        res.tags = value.tags && coalesce(value.tags.map(DiagnosticTag.to));
        return res;
    }
    Diagnostic.to = to;
})(Diagnostic || (Diagnostic = {}));
export var DiagnosticRelatedInformation;
(function (DiagnosticRelatedInformation) {
    function from(value) {
        return {
            ...Range.from(value.location.range),
            message: value.message,
            resource: value.location.uri
        };
    }
    DiagnosticRelatedInformation.from = from;
    function to(value) {
        return new types.DiagnosticRelatedInformation(new types.Location(value.resource, Range.to(value)), value.message);
    }
    DiagnosticRelatedInformation.to = to;
})(DiagnosticRelatedInformation || (DiagnosticRelatedInformation = {}));
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    function from(value) {
        switch (value) {
            case types.DiagnosticSeverity.Error:
                return MarkerSeverity.Error;
            case types.DiagnosticSeverity.Warning:
                return MarkerSeverity.Warning;
            case types.DiagnosticSeverity.Information:
                return MarkerSeverity.Info;
            case types.DiagnosticSeverity.Hint:
                return MarkerSeverity.Hint;
        }
        return MarkerSeverity.Error;
    }
    DiagnosticSeverity.from = from;
    function to(value) {
        switch (value) {
            case MarkerSeverity.Info:
                return types.DiagnosticSeverity.Information;
            case MarkerSeverity.Warning:
                return types.DiagnosticSeverity.Warning;
            case MarkerSeverity.Error:
                return types.DiagnosticSeverity.Error;
            case MarkerSeverity.Hint:
                return types.DiagnosticSeverity.Hint;
            default:
                return types.DiagnosticSeverity.Error;
        }
    }
    DiagnosticSeverity.to = to;
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
export var ViewColumn;
(function (ViewColumn) {
    function from(column) {
        if (typeof column === 'number' && column >= types.ViewColumn.One) {
            return column - 1; // adjust zero index (ViewColumn.ONE => 0)
        }
        if (column === types.ViewColumn.Beside) {
            return SIDE_GROUP;
        }
        return ACTIVE_GROUP; // default is always the active group
    }
    ViewColumn.from = from;
    function to(position) {
        if (typeof position === 'number' && position >= 0) {
            return position + 1; // adjust to index (ViewColumn.ONE => 1)
        }
        throw new Error(`invalid 'EditorGroupColumn'`);
    }
    ViewColumn.to = to;
})(ViewColumn || (ViewColumn = {}));
function isDecorationOptions(something) {
    return (typeof something.range !== 'undefined');
}
export function isDecorationOptionsArr(something) {
    if (something.length === 0) {
        return true;
    }
    return isDecorationOptions(something[0]) ? true : false;
}
export var MarkdownString;
(function (MarkdownString) {
    function fromMany(markup) {
        return markup.map(MarkdownString.from);
    }
    MarkdownString.fromMany = fromMany;
    function isCodeblock(thing) {
        return thing && typeof thing === 'object'
            && typeof thing.language === 'string'
            && typeof thing.value === 'string';
    }
    function from(markup) {
        let res;
        if (isCodeblock(markup)) {
            const { language, value } = markup;
            res = { value: '```' + language + '\n' + value + '\n```\n' };
        }
        else if (types.MarkdownString.isMarkdownString(markup)) {
            res = { value: markup.value, isTrusted: markup.isTrusted, supportThemeIcons: markup.supportThemeIcons, supportHtml: markup.supportHtml, baseUri: markup.baseUri };
        }
        else if (typeof markup === 'string') {
            res = { value: markup };
        }
        else {
            res = { value: '' };
        }
        // extract uris into a separate object
        const resUris = Object.create(null);
        res.uris = resUris;
        const collectUri = ({ href }) => {
            try {
                let uri = URI.parse(href, true);
                uri = uri.with({ query: _uriMassage(uri.query, resUris) });
                resUris[href] = uri;
            }
            catch (e) {
                // ignore
            }
            return '';
        };
        marked.marked.walkTokens(marked.marked.lexer(res.value), token => {
            if (token.type === 'link') {
                collectUri({ href: token.href });
            }
            else if (token.type === 'image') {
                if (typeof token.href === 'string') {
                    collectUri(htmlContent.parseHrefAndDimensions(token.href));
                }
            }
        });
        return res;
    }
    MarkdownString.from = from;
    function _uriMassage(part, bucket) {
        if (!part) {
            return part;
        }
        let data;
        try {
            data = parse(part);
        }
        catch (e) {
            // ignore
        }
        if (!data) {
            return part;
        }
        let changed = false;
        data = cloneAndChange(data, value => {
            if (URI.isUri(value)) {
                const key = `__uri_${Math.random().toString(16).slice(2, 8)}`;
                bucket[key] = value;
                changed = true;
                return key;
            }
            else {
                return undefined;
            }
        });
        if (!changed) {
            return part;
        }
        return JSON.stringify(data);
    }
    function to(value) {
        const result = new types.MarkdownString(value.value, value.supportThemeIcons);
        result.isTrusted = value.isTrusted;
        result.supportHtml = value.supportHtml;
        result.baseUri = value.baseUri ? URI.from(value.baseUri) : undefined;
        return result;
    }
    MarkdownString.to = to;
    function fromStrict(value) {
        if (!value) {
            return undefined;
        }
        return typeof value === 'string' ? value : MarkdownString.from(value);
    }
    MarkdownString.fromStrict = fromStrict;
})(MarkdownString || (MarkdownString = {}));
export function fromRangeOrRangeWithMessage(ranges) {
    if (isDecorationOptionsArr(ranges)) {
        return ranges.map((r) => {
            return {
                range: Range.from(r.range),
                hoverMessage: Array.isArray(r.hoverMessage)
                    ? MarkdownString.fromMany(r.hoverMessage)
                    : (r.hoverMessage ? MarkdownString.from(r.hoverMessage) : undefined),
                renderOptions: /* URI vs Uri */ r.renderOptions
            };
        });
    }
    else {
        return ranges.map((r) => {
            return {
                range: Range.from(r)
            };
        });
    }
}
export function pathOrURIToURI(value) {
    if (typeof value === 'undefined') {
        return value;
    }
    if (typeof value === 'string') {
        return URI.file(value);
    }
    else {
        return value;
    }
}
export var ThemableDecorationAttachmentRenderOptions;
(function (ThemableDecorationAttachmentRenderOptions) {
    function from(options) {
        if (typeof options === 'undefined') {
            return options;
        }
        return {
            contentText: options.contentText,
            contentIconPath: options.contentIconPath ? pathOrURIToURI(options.contentIconPath) : undefined,
            border: options.border,
            borderColor: options.borderColor,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            color: options.color,
            backgroundColor: options.backgroundColor,
            margin: options.margin,
            width: options.width,
            height: options.height,
        };
    }
    ThemableDecorationAttachmentRenderOptions.from = from;
})(ThemableDecorationAttachmentRenderOptions || (ThemableDecorationAttachmentRenderOptions = {}));
export var ThemableDecorationRenderOptions;
(function (ThemableDecorationRenderOptions) {
    function from(options) {
        if (typeof options === 'undefined') {
            return options;
        }
        return {
            backgroundColor: options.backgroundColor,
            outline: options.outline,
            outlineColor: options.outlineColor,
            outlineStyle: options.outlineStyle,
            outlineWidth: options.outlineWidth,
            border: options.border,
            borderColor: options.borderColor,
            borderRadius: options.borderRadius,
            borderSpacing: options.borderSpacing,
            borderStyle: options.borderStyle,
            borderWidth: options.borderWidth,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            cursor: options.cursor,
            color: options.color,
            opacity: options.opacity,
            letterSpacing: options.letterSpacing,
            gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
            gutterIconSize: options.gutterIconSize,
            overviewRulerColor: options.overviewRulerColor,
            before: options.before ? ThemableDecorationAttachmentRenderOptions.from(options.before) : undefined,
            after: options.after ? ThemableDecorationAttachmentRenderOptions.from(options.after) : undefined,
        };
    }
    ThemableDecorationRenderOptions.from = from;
})(ThemableDecorationRenderOptions || (ThemableDecorationRenderOptions = {}));
export var DecorationRangeBehavior;
(function (DecorationRangeBehavior) {
    function from(value) {
        if (typeof value === 'undefined') {
            return value;
        }
        switch (value) {
            case types.DecorationRangeBehavior.OpenOpen:
                return 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */;
            case types.DecorationRangeBehavior.ClosedClosed:
                return 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
            case types.DecorationRangeBehavior.OpenClosed:
                return 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
            case types.DecorationRangeBehavior.ClosedOpen:
                return 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
        }
    }
    DecorationRangeBehavior.from = from;
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
export var DecorationRenderOptions;
(function (DecorationRenderOptions) {
    function from(options) {
        return {
            isWholeLine: options.isWholeLine,
            rangeBehavior: options.rangeBehavior ? DecorationRangeBehavior.from(options.rangeBehavior) : undefined,
            overviewRulerLane: options.overviewRulerLane,
            light: options.light ? ThemableDecorationRenderOptions.from(options.light) : undefined,
            dark: options.dark ? ThemableDecorationRenderOptions.from(options.dark) : undefined,
            backgroundColor: options.backgroundColor,
            outline: options.outline,
            outlineColor: options.outlineColor,
            outlineStyle: options.outlineStyle,
            outlineWidth: options.outlineWidth,
            border: options.border,
            borderColor: options.borderColor,
            borderRadius: options.borderRadius,
            borderSpacing: options.borderSpacing,
            borderStyle: options.borderStyle,
            borderWidth: options.borderWidth,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            cursor: options.cursor,
            color: options.color,
            opacity: options.opacity,
            letterSpacing: options.letterSpacing,
            gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
            gutterIconSize: options.gutterIconSize,
            overviewRulerColor: options.overviewRulerColor,
            before: options.before ? ThemableDecorationAttachmentRenderOptions.from(options.before) : undefined,
            after: options.after ? ThemableDecorationAttachmentRenderOptions.from(options.after) : undefined,
        };
    }
    DecorationRenderOptions.from = from;
})(DecorationRenderOptions || (DecorationRenderOptions = {}));
export var TextEdit;
(function (TextEdit) {
    function from(edit) {
        return {
            text: edit.newText,
            eol: edit.newEol && EndOfLine.from(edit.newEol),
            range: Range.from(edit.range)
        };
    }
    TextEdit.from = from;
    function to(edit) {
        const result = new types.TextEdit(Range.to(edit.range), edit.text);
        result.newEol = (typeof edit.eol === 'undefined' ? undefined : EndOfLine.to(edit.eol));
        return result;
    }
    TextEdit.to = to;
})(TextEdit || (TextEdit = {}));
export var WorkspaceEdit;
(function (WorkspaceEdit) {
    function from(value, versionInfo) {
        const result = {
            edits: []
        };
        if (value instanceof types.WorkspaceEdit) {
            // collect all files that are to be created so that their version
            // information (in case they exist as text model already) can be ignored
            const toCreate = new ResourceSet();
            for (const entry of value._allEntries()) {
                if (entry._type === 1 /* types.FileEditType.File */ && URI.isUri(entry.to) && entry.from === undefined) {
                    toCreate.add(entry.to);
                }
            }
            for (const entry of value._allEntries()) {
                if (entry._type === 1 /* types.FileEditType.File */) {
                    let contents;
                    if (entry.options?.contents) {
                        if (ArrayBuffer.isView(entry.options.contents)) {
                            contents = { type: 'base64', value: encodeBase64(VSBuffer.wrap(entry.options.contents)) };
                        }
                        else {
                            contents = { type: 'dataTransferItem', id: entry.options.contents._itemId };
                        }
                    }
                    // file operation
                    result.edits.push({
                        oldResource: entry.from,
                        newResource: entry.to,
                        options: { ...entry.options, contents },
                        metadata: entry.metadata
                    });
                }
                else if (entry._type === 2 /* types.FileEditType.Text */) {
                    // text edits
                    result.edits.push({
                        resource: entry.uri,
                        textEdit: TextEdit.from(entry.edit),
                        versionId: !toCreate.has(entry.uri) ? versionInfo?.getTextDocumentVersion(entry.uri) : undefined,
                        metadata: entry.metadata
                    });
                }
                else if (entry._type === 6 /* types.FileEditType.Snippet */) {
                    result.edits.push({
                        resource: entry.uri,
                        textEdit: {
                            range: Range.from(entry.range),
                            text: entry.edit.value,
                            insertAsSnippet: true,
                            keepWhitespace: entry.keepWhitespace
                        },
                        versionId: !toCreate.has(entry.uri) ? versionInfo?.getTextDocumentVersion(entry.uri) : undefined,
                        metadata: entry.metadata
                    });
                }
                else if (entry._type === 3 /* types.FileEditType.Cell */) {
                    // cell edit
                    result.edits.push({
                        metadata: entry.metadata,
                        resource: entry.uri,
                        cellEdit: entry.edit,
                        notebookVersionId: versionInfo?.getNotebookDocumentVersion(entry.uri)
                    });
                }
                else if (entry._type === 5 /* types.FileEditType.CellReplace */) {
                    // cell replace
                    result.edits.push({
                        metadata: entry.metadata,
                        resource: entry.uri,
                        notebookVersionId: versionInfo?.getNotebookDocumentVersion(entry.uri),
                        cellEdit: {
                            editType: 1 /* notebooks.CellEditType.Replace */,
                            index: entry.index,
                            count: entry.count,
                            cells: entry.cells.map(NotebookCellData.from)
                        }
                    });
                }
            }
        }
        return result;
    }
    WorkspaceEdit.from = from;
    function to(value) {
        const result = new types.WorkspaceEdit();
        const edits = new ResourceMap();
        for (const edit of value.edits) {
            if (edit.textEdit) {
                const item = edit;
                const uri = URI.revive(item.resource);
                const range = Range.to(item.textEdit.range);
                const text = item.textEdit.text;
                const isSnippet = item.textEdit.insertAsSnippet;
                let editOrSnippetTest;
                if (isSnippet) {
                    editOrSnippetTest = types.SnippetTextEdit.replace(range, new types.SnippetString(text));
                }
                else {
                    editOrSnippetTest = types.TextEdit.replace(range, text);
                }
                const array = edits.get(uri);
                if (!array) {
                    edits.set(uri, [editOrSnippetTest]);
                }
                else {
                    array.push(editOrSnippetTest);
                }
            }
            else {
                result.renameFile(URI.revive(edit.oldResource), URI.revive(edit.newResource), edit.options);
            }
        }
        for (const [uri, array] of edits) {
            result.set(uri, array);
        }
        return result;
    }
    WorkspaceEdit.to = to;
})(WorkspaceEdit || (WorkspaceEdit = {}));
export var SymbolKind;
(function (SymbolKind) {
    const _fromMapping = Object.create(null);
    _fromMapping[types.SymbolKind.File] = 0 /* languages.SymbolKind.File */;
    _fromMapping[types.SymbolKind.Module] = 1 /* languages.SymbolKind.Module */;
    _fromMapping[types.SymbolKind.Namespace] = 2 /* languages.SymbolKind.Namespace */;
    _fromMapping[types.SymbolKind.Package] = 3 /* languages.SymbolKind.Package */;
    _fromMapping[types.SymbolKind.Class] = 4 /* languages.SymbolKind.Class */;
    _fromMapping[types.SymbolKind.Method] = 5 /* languages.SymbolKind.Method */;
    _fromMapping[types.SymbolKind.Property] = 6 /* languages.SymbolKind.Property */;
    _fromMapping[types.SymbolKind.Field] = 7 /* languages.SymbolKind.Field */;
    _fromMapping[types.SymbolKind.Constructor] = 8 /* languages.SymbolKind.Constructor */;
    _fromMapping[types.SymbolKind.Enum] = 9 /* languages.SymbolKind.Enum */;
    _fromMapping[types.SymbolKind.Interface] = 10 /* languages.SymbolKind.Interface */;
    _fromMapping[types.SymbolKind.Function] = 11 /* languages.SymbolKind.Function */;
    _fromMapping[types.SymbolKind.Variable] = 12 /* languages.SymbolKind.Variable */;
    _fromMapping[types.SymbolKind.Constant] = 13 /* languages.SymbolKind.Constant */;
    _fromMapping[types.SymbolKind.String] = 14 /* languages.SymbolKind.String */;
    _fromMapping[types.SymbolKind.Number] = 15 /* languages.SymbolKind.Number */;
    _fromMapping[types.SymbolKind.Boolean] = 16 /* languages.SymbolKind.Boolean */;
    _fromMapping[types.SymbolKind.Array] = 17 /* languages.SymbolKind.Array */;
    _fromMapping[types.SymbolKind.Object] = 18 /* languages.SymbolKind.Object */;
    _fromMapping[types.SymbolKind.Key] = 19 /* languages.SymbolKind.Key */;
    _fromMapping[types.SymbolKind.Null] = 20 /* languages.SymbolKind.Null */;
    _fromMapping[types.SymbolKind.EnumMember] = 21 /* languages.SymbolKind.EnumMember */;
    _fromMapping[types.SymbolKind.Struct] = 22 /* languages.SymbolKind.Struct */;
    _fromMapping[types.SymbolKind.Event] = 23 /* languages.SymbolKind.Event */;
    _fromMapping[types.SymbolKind.Operator] = 24 /* languages.SymbolKind.Operator */;
    _fromMapping[types.SymbolKind.TypeParameter] = 25 /* languages.SymbolKind.TypeParameter */;
    function from(kind) {
        return typeof _fromMapping[kind] === 'number' ? _fromMapping[kind] : 6 /* languages.SymbolKind.Property */;
    }
    SymbolKind.from = from;
    function to(kind) {
        for (const k in _fromMapping) {
            if (_fromMapping[k] === kind) {
                return Number(k);
            }
        }
        return types.SymbolKind.Property;
    }
    SymbolKind.to = to;
})(SymbolKind || (SymbolKind = {}));
export var SymbolTag;
(function (SymbolTag) {
    function from(kind) {
        switch (kind) {
            case types.SymbolTag.Deprecated: return 1 /* languages.SymbolTag.Deprecated */;
        }
    }
    SymbolTag.from = from;
    function to(kind) {
        switch (kind) {
            case 1 /* languages.SymbolTag.Deprecated */: return types.SymbolTag.Deprecated;
        }
    }
    SymbolTag.to = to;
})(SymbolTag || (SymbolTag = {}));
export var WorkspaceSymbol;
(function (WorkspaceSymbol) {
    function from(info) {
        return {
            name: info.name,
            kind: SymbolKind.from(info.kind),
            tags: info.tags && info.tags.map(SymbolTag.from),
            containerName: info.containerName,
            location: location.from(info.location)
        };
    }
    WorkspaceSymbol.from = from;
    function to(info) {
        const result = new types.SymbolInformation(info.name, SymbolKind.to(info.kind), info.containerName, location.to(info.location));
        result.tags = info.tags && info.tags.map(SymbolTag.to);
        return result;
    }
    WorkspaceSymbol.to = to;
})(WorkspaceSymbol || (WorkspaceSymbol = {}));
export var DocumentSymbol;
(function (DocumentSymbol) {
    function from(info) {
        const result = {
            name: info.name || '!!MISSING: name!!',
            detail: info.detail,
            range: Range.from(info.range),
            selectionRange: Range.from(info.selectionRange),
            kind: SymbolKind.from(info.kind),
            tags: info.tags?.map(SymbolTag.from) ?? []
        };
        if (info.children) {
            result.children = info.children.map(from);
        }
        return result;
    }
    DocumentSymbol.from = from;
    function to(info) {
        const result = new types.DocumentSymbol(info.name, info.detail, SymbolKind.to(info.kind), Range.to(info.range), Range.to(info.selectionRange));
        if (isNonEmptyArray(info.tags)) {
            result.tags = info.tags.map(SymbolTag.to);
        }
        if (info.children) {
            result.children = info.children.map(to);
        }
        return result;
    }
    DocumentSymbol.to = to;
})(DocumentSymbol || (DocumentSymbol = {}));
export var CallHierarchyItem;
(function (CallHierarchyItem) {
    function to(item) {
        const result = new types.CallHierarchyItem(SymbolKind.to(item.kind), item.name, item.detail || '', URI.revive(item.uri), Range.to(item.range), Range.to(item.selectionRange));
        result._sessionId = item._sessionId;
        result._itemId = item._itemId;
        return result;
    }
    CallHierarchyItem.to = to;
    function from(item, sessionId, itemId) {
        sessionId = sessionId ?? item._sessionId;
        itemId = itemId ?? item._itemId;
        if (sessionId === undefined || itemId === undefined) {
            throw new Error('invalid item');
        }
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            name: item.name,
            detail: item.detail,
            kind: SymbolKind.from(item.kind),
            uri: item.uri,
            range: Range.from(item.range),
            selectionRange: Range.from(item.selectionRange),
            tags: item.tags?.map(SymbolTag.from)
        };
    }
    CallHierarchyItem.from = from;
})(CallHierarchyItem || (CallHierarchyItem = {}));
export var CallHierarchyIncomingCall;
(function (CallHierarchyIncomingCall) {
    function to(item) {
        return new types.CallHierarchyIncomingCall(CallHierarchyItem.to(item.from), item.fromRanges.map(r => Range.to(r)));
    }
    CallHierarchyIncomingCall.to = to;
})(CallHierarchyIncomingCall || (CallHierarchyIncomingCall = {}));
export var CallHierarchyOutgoingCall;
(function (CallHierarchyOutgoingCall) {
    function to(item) {
        return new types.CallHierarchyOutgoingCall(CallHierarchyItem.to(item.to), item.fromRanges.map(r => Range.to(r)));
    }
    CallHierarchyOutgoingCall.to = to;
})(CallHierarchyOutgoingCall || (CallHierarchyOutgoingCall = {}));
export var location;
(function (location) {
    function from(value) {
        return {
            range: value.range && Range.from(value.range),
            uri: value.uri
        };
    }
    location.from = from;
    function to(value) {
        return new types.Location(URI.revive(value.uri), Range.to(value.range));
    }
    location.to = to;
})(location || (location = {}));
export var DefinitionLink;
(function (DefinitionLink) {
    function from(value) {
        const definitionLink = value;
        const location = value;
        return {
            originSelectionRange: definitionLink.originSelectionRange
                ? Range.from(definitionLink.originSelectionRange)
                : undefined,
            uri: definitionLink.targetUri ? definitionLink.targetUri : location.uri,
            range: Range.from(definitionLink.targetRange ? definitionLink.targetRange : location.range),
            targetSelectionRange: definitionLink.targetSelectionRange
                ? Range.from(definitionLink.targetSelectionRange)
                : undefined,
        };
    }
    DefinitionLink.from = from;
    function to(value) {
        return {
            targetUri: URI.revive(value.uri),
            targetRange: Range.to(value.range),
            targetSelectionRange: value.targetSelectionRange
                ? Range.to(value.targetSelectionRange)
                : undefined,
            originSelectionRange: value.originSelectionRange
                ? Range.to(value.originSelectionRange)
                : undefined
        };
    }
    DefinitionLink.to = to;
})(DefinitionLink || (DefinitionLink = {}));
export var Hover;
(function (Hover) {
    function from(hover) {
        const convertedHover = {
            range: Range.from(hover.range),
            contents: MarkdownString.fromMany(hover.contents),
            canIncreaseVerbosity: hover.canIncreaseVerbosity,
            canDecreaseVerbosity: hover.canDecreaseVerbosity,
        };
        return convertedHover;
    }
    Hover.from = from;
    function to(info) {
        const contents = info.contents.map(MarkdownString.to);
        const range = Range.to(info.range);
        const canIncreaseVerbosity = info.canIncreaseVerbosity;
        const canDecreaseVerbosity = info.canDecreaseVerbosity;
        return new types.VerboseHover(contents, range, canIncreaseVerbosity, canDecreaseVerbosity);
    }
    Hover.to = to;
})(Hover || (Hover = {}));
export var EvaluatableExpression;
(function (EvaluatableExpression) {
    function from(expression) {
        return {
            range: Range.from(expression.range),
            expression: expression.expression
        };
    }
    EvaluatableExpression.from = from;
    function to(info) {
        return new types.EvaluatableExpression(Range.to(info.range), info.expression);
    }
    EvaluatableExpression.to = to;
})(EvaluatableExpression || (EvaluatableExpression = {}));
export var InlineValue;
(function (InlineValue) {
    function from(inlineValue) {
        if (inlineValue instanceof types.InlineValueText) {
            return {
                type: 'text',
                range: Range.from(inlineValue.range),
                text: inlineValue.text
            };
        }
        else if (inlineValue instanceof types.InlineValueVariableLookup) {
            return {
                type: 'variable',
                range: Range.from(inlineValue.range),
                variableName: inlineValue.variableName,
                caseSensitiveLookup: inlineValue.caseSensitiveLookup
            };
        }
        else if (inlineValue instanceof types.InlineValueEvaluatableExpression) {
            return {
                type: 'expression',
                range: Range.from(inlineValue.range),
                expression: inlineValue.expression
            };
        }
        else {
            throw new Error(`Unknown 'InlineValue' type`);
        }
    }
    InlineValue.from = from;
    function to(inlineValue) {
        switch (inlineValue.type) {
            case 'text':
                return {
                    range: Range.to(inlineValue.range),
                    text: inlineValue.text
                };
            case 'variable':
                return {
                    range: Range.to(inlineValue.range),
                    variableName: inlineValue.variableName,
                    caseSensitiveLookup: inlineValue.caseSensitiveLookup
                };
            case 'expression':
                return {
                    range: Range.to(inlineValue.range),
                    expression: inlineValue.expression
                };
        }
    }
    InlineValue.to = to;
})(InlineValue || (InlineValue = {}));
export var InlineValueContext;
(function (InlineValueContext) {
    function from(inlineValueContext) {
        return {
            frameId: inlineValueContext.frameId,
            stoppedLocation: Range.from(inlineValueContext.stoppedLocation)
        };
    }
    InlineValueContext.from = from;
    function to(inlineValueContext) {
        return new types.InlineValueContext(inlineValueContext.frameId, Range.to(inlineValueContext.stoppedLocation));
    }
    InlineValueContext.to = to;
})(InlineValueContext || (InlineValueContext = {}));
export var DocumentHighlight;
(function (DocumentHighlight) {
    function from(documentHighlight) {
        return {
            range: Range.from(documentHighlight.range),
            kind: documentHighlight.kind
        };
    }
    DocumentHighlight.from = from;
    function to(occurrence) {
        return new types.DocumentHighlight(Range.to(occurrence.range), occurrence.kind);
    }
    DocumentHighlight.to = to;
})(DocumentHighlight || (DocumentHighlight = {}));
export var MultiDocumentHighlight;
(function (MultiDocumentHighlight) {
    function from(multiDocumentHighlight) {
        return {
            uri: multiDocumentHighlight.uri,
            highlights: multiDocumentHighlight.highlights.map(DocumentHighlight.from)
        };
    }
    MultiDocumentHighlight.from = from;
    function to(multiDocumentHighlight) {
        return new types.MultiDocumentHighlight(URI.revive(multiDocumentHighlight.uri), multiDocumentHighlight.highlights.map(DocumentHighlight.to));
    }
    MultiDocumentHighlight.to = to;
})(MultiDocumentHighlight || (MultiDocumentHighlight = {}));
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    function to(kind) {
        switch (kind) {
            case 1 /* languages.CompletionTriggerKind.TriggerCharacter */:
                return types.CompletionTriggerKind.TriggerCharacter;
            case 2 /* languages.CompletionTriggerKind.TriggerForIncompleteCompletions */:
                return types.CompletionTriggerKind.TriggerForIncompleteCompletions;
            case 0 /* languages.CompletionTriggerKind.Invoke */:
            default:
                return types.CompletionTriggerKind.Invoke;
        }
    }
    CompletionTriggerKind.to = to;
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var CompletionContext;
(function (CompletionContext) {
    function to(context) {
        return {
            triggerKind: CompletionTriggerKind.to(context.triggerKind),
            triggerCharacter: context.triggerCharacter
        };
    }
    CompletionContext.to = to;
})(CompletionContext || (CompletionContext = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    function from(kind) {
        switch (kind) {
            case types.CompletionItemTag.Deprecated: return 1 /* languages.CompletionItemTag.Deprecated */;
        }
    }
    CompletionItemTag.from = from;
    function to(kind) {
        switch (kind) {
            case 1 /* languages.CompletionItemTag.Deprecated */: return types.CompletionItemTag.Deprecated;
        }
    }
    CompletionItemTag.to = to;
})(CompletionItemTag || (CompletionItemTag = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    const _from = new Map([
        [types.CompletionItemKind.Method, 0 /* languages.CompletionItemKind.Method */],
        [types.CompletionItemKind.Function, 1 /* languages.CompletionItemKind.Function */],
        [types.CompletionItemKind.Constructor, 2 /* languages.CompletionItemKind.Constructor */],
        [types.CompletionItemKind.Field, 3 /* languages.CompletionItemKind.Field */],
        [types.CompletionItemKind.Variable, 4 /* languages.CompletionItemKind.Variable */],
        [types.CompletionItemKind.Class, 5 /* languages.CompletionItemKind.Class */],
        [types.CompletionItemKind.Interface, 7 /* languages.CompletionItemKind.Interface */],
        [types.CompletionItemKind.Struct, 6 /* languages.CompletionItemKind.Struct */],
        [types.CompletionItemKind.Module, 8 /* languages.CompletionItemKind.Module */],
        [types.CompletionItemKind.Property, 9 /* languages.CompletionItemKind.Property */],
        [types.CompletionItemKind.Unit, 12 /* languages.CompletionItemKind.Unit */],
        [types.CompletionItemKind.Value, 13 /* languages.CompletionItemKind.Value */],
        [types.CompletionItemKind.Constant, 14 /* languages.CompletionItemKind.Constant */],
        [types.CompletionItemKind.Enum, 15 /* languages.CompletionItemKind.Enum */],
        [types.CompletionItemKind.EnumMember, 16 /* languages.CompletionItemKind.EnumMember */],
        [types.CompletionItemKind.Keyword, 17 /* languages.CompletionItemKind.Keyword */],
        [types.CompletionItemKind.Snippet, 27 /* languages.CompletionItemKind.Snippet */],
        [types.CompletionItemKind.Text, 18 /* languages.CompletionItemKind.Text */],
        [types.CompletionItemKind.Color, 19 /* languages.CompletionItemKind.Color */],
        [types.CompletionItemKind.File, 20 /* languages.CompletionItemKind.File */],
        [types.CompletionItemKind.Reference, 21 /* languages.CompletionItemKind.Reference */],
        [types.CompletionItemKind.Folder, 23 /* languages.CompletionItemKind.Folder */],
        [types.CompletionItemKind.Event, 10 /* languages.CompletionItemKind.Event */],
        [types.CompletionItemKind.Operator, 11 /* languages.CompletionItemKind.Operator */],
        [types.CompletionItemKind.TypeParameter, 24 /* languages.CompletionItemKind.TypeParameter */],
        [types.CompletionItemKind.Issue, 26 /* languages.CompletionItemKind.Issue */],
        [types.CompletionItemKind.User, 25 /* languages.CompletionItemKind.User */],
    ]);
    function from(kind) {
        return _from.get(kind) ?? 9 /* languages.CompletionItemKind.Property */;
    }
    CompletionItemKind.from = from;
    const _to = new Map([
        [0 /* languages.CompletionItemKind.Method */, types.CompletionItemKind.Method],
        [1 /* languages.CompletionItemKind.Function */, types.CompletionItemKind.Function],
        [2 /* languages.CompletionItemKind.Constructor */, types.CompletionItemKind.Constructor],
        [3 /* languages.CompletionItemKind.Field */, types.CompletionItemKind.Field],
        [4 /* languages.CompletionItemKind.Variable */, types.CompletionItemKind.Variable],
        [5 /* languages.CompletionItemKind.Class */, types.CompletionItemKind.Class],
        [7 /* languages.CompletionItemKind.Interface */, types.CompletionItemKind.Interface],
        [6 /* languages.CompletionItemKind.Struct */, types.CompletionItemKind.Struct],
        [8 /* languages.CompletionItemKind.Module */, types.CompletionItemKind.Module],
        [9 /* languages.CompletionItemKind.Property */, types.CompletionItemKind.Property],
        [12 /* languages.CompletionItemKind.Unit */, types.CompletionItemKind.Unit],
        [13 /* languages.CompletionItemKind.Value */, types.CompletionItemKind.Value],
        [14 /* languages.CompletionItemKind.Constant */, types.CompletionItemKind.Constant],
        [15 /* languages.CompletionItemKind.Enum */, types.CompletionItemKind.Enum],
        [16 /* languages.CompletionItemKind.EnumMember */, types.CompletionItemKind.EnumMember],
        [17 /* languages.CompletionItemKind.Keyword */, types.CompletionItemKind.Keyword],
        [27 /* languages.CompletionItemKind.Snippet */, types.CompletionItemKind.Snippet],
        [18 /* languages.CompletionItemKind.Text */, types.CompletionItemKind.Text],
        [19 /* languages.CompletionItemKind.Color */, types.CompletionItemKind.Color],
        [20 /* languages.CompletionItemKind.File */, types.CompletionItemKind.File],
        [21 /* languages.CompletionItemKind.Reference */, types.CompletionItemKind.Reference],
        [23 /* languages.CompletionItemKind.Folder */, types.CompletionItemKind.Folder],
        [10 /* languages.CompletionItemKind.Event */, types.CompletionItemKind.Event],
        [11 /* languages.CompletionItemKind.Operator */, types.CompletionItemKind.Operator],
        [24 /* languages.CompletionItemKind.TypeParameter */, types.CompletionItemKind.TypeParameter],
        [25 /* languages.CompletionItemKind.User */, types.CompletionItemKind.User],
        [26 /* languages.CompletionItemKind.Issue */, types.CompletionItemKind.Issue],
    ]);
    function to(kind) {
        return _to.get(kind) ?? types.CompletionItemKind.Property;
    }
    CompletionItemKind.to = to;
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItem;
(function (CompletionItem) {
    function to(suggestion, converter) {
        const result = new types.CompletionItem(suggestion.label);
        result.insertText = suggestion.insertText;
        result.kind = CompletionItemKind.to(suggestion.kind);
        result.tags = suggestion.tags?.map(CompletionItemTag.to);
        result.detail = suggestion.detail;
        result.documentation = htmlContent.isMarkdownString(suggestion.documentation) ? MarkdownString.to(suggestion.documentation) : suggestion.documentation;
        result.sortText = suggestion.sortText;
        result.filterText = suggestion.filterText;
        result.preselect = suggestion.preselect;
        result.commitCharacters = suggestion.commitCharacters;
        // range
        if (editorRange.Range.isIRange(suggestion.range)) {
            result.range = Range.to(suggestion.range);
        }
        else if (typeof suggestion.range === 'object') {
            result.range = { inserting: Range.to(suggestion.range.insert), replacing: Range.to(suggestion.range.replace) };
        }
        result.keepWhitespace = typeof suggestion.insertTextRules === 'undefined' ? false : Boolean(suggestion.insertTextRules & 1 /* languages.CompletionItemInsertTextRule.KeepWhitespace */);
        // 'insertText'-logic
        if (typeof suggestion.insertTextRules !== 'undefined' && suggestion.insertTextRules & 4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */) {
            result.insertText = new types.SnippetString(suggestion.insertText);
        }
        else {
            result.insertText = suggestion.insertText;
            result.textEdit = result.range instanceof types.Range ? new types.TextEdit(result.range, result.insertText) : undefined;
        }
        if (suggestion.additionalTextEdits && suggestion.additionalTextEdits.length > 0) {
            result.additionalTextEdits = suggestion.additionalTextEdits.map(e => TextEdit.to(e));
        }
        result.command = converter && suggestion.command ? converter.fromInternal(suggestion.command) : undefined;
        return result;
    }
    CompletionItem.to = to;
})(CompletionItem || (CompletionItem = {}));
export var ParameterInformation;
(function (ParameterInformation) {
    function from(info) {
        if (typeof info.label !== 'string' && !Array.isArray(info.label)) {
            throw new TypeError('Invalid label');
        }
        return {
            label: info.label,
            documentation: MarkdownString.fromStrict(info.documentation)
        };
    }
    ParameterInformation.from = from;
    function to(info) {
        return {
            label: info.label,
            documentation: htmlContent.isMarkdownString(info.documentation) ? MarkdownString.to(info.documentation) : info.documentation
        };
    }
    ParameterInformation.to = to;
})(ParameterInformation || (ParameterInformation = {}));
export var SignatureInformation;
(function (SignatureInformation) {
    function from(info) {
        return {
            label: info.label,
            documentation: MarkdownString.fromStrict(info.documentation),
            parameters: Array.isArray(info.parameters) ? info.parameters.map(ParameterInformation.from) : [],
            activeParameter: info.activeParameter,
        };
    }
    SignatureInformation.from = from;
    function to(info) {
        return {
            label: info.label,
            documentation: htmlContent.isMarkdownString(info.documentation) ? MarkdownString.to(info.documentation) : info.documentation,
            parameters: Array.isArray(info.parameters) ? info.parameters.map(ParameterInformation.to) : [],
            activeParameter: info.activeParameter,
        };
    }
    SignatureInformation.to = to;
})(SignatureInformation || (SignatureInformation = {}));
export var SignatureHelp;
(function (SignatureHelp) {
    function from(help) {
        return {
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
            signatures: Array.isArray(help.signatures) ? help.signatures.map(SignatureInformation.from) : [],
        };
    }
    SignatureHelp.from = from;
    function to(help) {
        return {
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
            signatures: Array.isArray(help.signatures) ? help.signatures.map(SignatureInformation.to) : [],
        };
    }
    SignatureHelp.to = to;
})(SignatureHelp || (SignatureHelp = {}));
export var InlayHint;
(function (InlayHint) {
    function to(converter, hint) {
        const res = new types.InlayHint(Position.to(hint.position), typeof hint.label === 'string' ? hint.label : hint.label.map(InlayHintLabelPart.to.bind(undefined, converter)), hint.kind && InlayHintKind.to(hint.kind));
        res.textEdits = hint.textEdits && hint.textEdits.map(TextEdit.to);
        res.tooltip = htmlContent.isMarkdownString(hint.tooltip) ? MarkdownString.to(hint.tooltip) : hint.tooltip;
        res.paddingLeft = hint.paddingLeft;
        res.paddingRight = hint.paddingRight;
        return res;
    }
    InlayHint.to = to;
})(InlayHint || (InlayHint = {}));
export var InlayHintLabelPart;
(function (InlayHintLabelPart) {
    function to(converter, part) {
        const result = new types.InlayHintLabelPart(part.label);
        result.tooltip = htmlContent.isMarkdownString(part.tooltip)
            ? MarkdownString.to(part.tooltip)
            : part.tooltip;
        if (languages.Command.is(part.command)) {
            result.command = converter.fromInternal(part.command);
        }
        if (part.location) {
            result.location = location.to(part.location);
        }
        return result;
    }
    InlayHintLabelPart.to = to;
})(InlayHintLabelPart || (InlayHintLabelPart = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    function from(kind) {
        return kind;
    }
    InlayHintKind.from = from;
    function to(kind) {
        return kind;
    }
    InlayHintKind.to = to;
})(InlayHintKind || (InlayHintKind = {}));
export var DocumentLink;
(function (DocumentLink) {
    function from(link) {
        return {
            range: Range.from(link.range),
            url: link.target,
            tooltip: link.tooltip
        };
    }
    DocumentLink.from = from;
    function to(link) {
        let target = undefined;
        if (link.url) {
            try {
                target = typeof link.url === 'string' ? URI.parse(link.url, true) : URI.revive(link.url);
            }
            catch (err) {
                // ignore
            }
        }
        const result = new types.DocumentLink(Range.to(link.range), target);
        result.tooltip = link.tooltip;
        return result;
    }
    DocumentLink.to = to;
})(DocumentLink || (DocumentLink = {}));
export var ColorPresentation;
(function (ColorPresentation) {
    function to(colorPresentation) {
        const cp = new types.ColorPresentation(colorPresentation.label);
        if (colorPresentation.textEdit) {
            cp.textEdit = TextEdit.to(colorPresentation.textEdit);
        }
        if (colorPresentation.additionalTextEdits) {
            cp.additionalTextEdits = colorPresentation.additionalTextEdits.map(value => TextEdit.to(value));
        }
        return cp;
    }
    ColorPresentation.to = to;
    function from(colorPresentation) {
        return {
            label: colorPresentation.label,
            textEdit: colorPresentation.textEdit ? TextEdit.from(colorPresentation.textEdit) : undefined,
            additionalTextEdits: colorPresentation.additionalTextEdits ? colorPresentation.additionalTextEdits.map(value => TextEdit.from(value)) : undefined
        };
    }
    ColorPresentation.from = from;
})(ColorPresentation || (ColorPresentation = {}));
export var Color;
(function (Color) {
    function to(c) {
        return new types.Color(c[0], c[1], c[2], c[3]);
    }
    Color.to = to;
    function from(color) {
        return [color.red, color.green, color.blue, color.alpha];
    }
    Color.from = from;
})(Color || (Color = {}));
export var SelectionRange;
(function (SelectionRange) {
    function from(obj) {
        return { range: Range.from(obj.range) };
    }
    SelectionRange.from = from;
    function to(obj) {
        return new types.SelectionRange(Range.to(obj.range));
    }
    SelectionRange.to = to;
})(SelectionRange || (SelectionRange = {}));
export var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    function to(reason) {
        switch (reason) {
            case 2 /* SaveReason.AUTO */:
                return types.TextDocumentSaveReason.AfterDelay;
            case 1 /* SaveReason.EXPLICIT */:
                return types.TextDocumentSaveReason.Manual;
            case 3 /* SaveReason.FOCUS_CHANGE */:
            case 4 /* SaveReason.WINDOW_CHANGE */:
                return types.TextDocumentSaveReason.FocusOut;
        }
    }
    TextDocumentSaveReason.to = to;
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
export var TextEditorLineNumbersStyle;
(function (TextEditorLineNumbersStyle) {
    function from(style) {
        switch (style) {
            case types.TextEditorLineNumbersStyle.Off:
                return 0 /* RenderLineNumbersType.Off */;
            case types.TextEditorLineNumbersStyle.Relative:
                return 2 /* RenderLineNumbersType.Relative */;
            case types.TextEditorLineNumbersStyle.Interval:
                return 3 /* RenderLineNumbersType.Interval */;
            case types.TextEditorLineNumbersStyle.On:
            default:
                return 1 /* RenderLineNumbersType.On */;
        }
    }
    TextEditorLineNumbersStyle.from = from;
    function to(style) {
        switch (style) {
            case 0 /* RenderLineNumbersType.Off */:
                return types.TextEditorLineNumbersStyle.Off;
            case 2 /* RenderLineNumbersType.Relative */:
                return types.TextEditorLineNumbersStyle.Relative;
            case 3 /* RenderLineNumbersType.Interval */:
                return types.TextEditorLineNumbersStyle.Interval;
            case 1 /* RenderLineNumbersType.On */:
            default:
                return types.TextEditorLineNumbersStyle.On;
        }
    }
    TextEditorLineNumbersStyle.to = to;
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
export var EndOfLine;
(function (EndOfLine) {
    function from(eol) {
        if (eol === types.EndOfLine.CRLF) {
            return 1 /* EndOfLineSequence.CRLF */;
        }
        else if (eol === types.EndOfLine.LF) {
            return 0 /* EndOfLineSequence.LF */;
        }
        return undefined;
    }
    EndOfLine.from = from;
    function to(eol) {
        if (eol === 1 /* EndOfLineSequence.CRLF */) {
            return types.EndOfLine.CRLF;
        }
        else if (eol === 0 /* EndOfLineSequence.LF */) {
            return types.EndOfLine.LF;
        }
        return undefined;
    }
    EndOfLine.to = to;
})(EndOfLine || (EndOfLine = {}));
export var ProgressLocation;
(function (ProgressLocation) {
    function from(loc) {
        if (typeof loc === 'object') {
            return loc.viewId;
        }
        switch (loc) {
            case types.ProgressLocation.SourceControl: return 3 /* MainProgressLocation.Scm */;
            case types.ProgressLocation.Window: return 10 /* MainProgressLocation.Window */;
            case types.ProgressLocation.Notification: return 15 /* MainProgressLocation.Notification */;
        }
        throw new Error(`Unknown 'ProgressLocation'`);
    }
    ProgressLocation.from = from;
})(ProgressLocation || (ProgressLocation = {}));
export var FoldingRange;
(function (FoldingRange) {
    function from(r) {
        const range = { start: r.start + 1, end: r.end + 1 };
        if (r.kind) {
            range.kind = FoldingRangeKind.from(r.kind);
        }
        return range;
    }
    FoldingRange.from = from;
    function to(r) {
        const range = { start: r.start - 1, end: r.end - 1 };
        if (r.kind) {
            range.kind = FoldingRangeKind.to(r.kind);
        }
        return range;
    }
    FoldingRange.to = to;
})(FoldingRange || (FoldingRange = {}));
export var FoldingRangeKind;
(function (FoldingRangeKind) {
    function from(kind) {
        if (kind) {
            switch (kind) {
                case types.FoldingRangeKind.Comment:
                    return languages.FoldingRangeKind.Comment;
                case types.FoldingRangeKind.Imports:
                    return languages.FoldingRangeKind.Imports;
                case types.FoldingRangeKind.Region:
                    return languages.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    FoldingRangeKind.from = from;
    function to(kind) {
        if (kind) {
            switch (kind.value) {
                case languages.FoldingRangeKind.Comment.value:
                    return types.FoldingRangeKind.Comment;
                case languages.FoldingRangeKind.Imports.value:
                    return types.FoldingRangeKind.Imports;
                case languages.FoldingRangeKind.Region.value:
                    return types.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    FoldingRangeKind.to = to;
})(FoldingRangeKind || (FoldingRangeKind = {}));
export var TextEditorOpenOptions;
(function (TextEditorOpenOptions) {
    function from(options) {
        if (options) {
            return {
                pinned: typeof options.preview === 'boolean' ? !options.preview : undefined,
                inactive: options.background,
                preserveFocus: options.preserveFocus,
                selection: typeof options.selection === 'object' ? Range.from(options.selection) : undefined,
                override: typeof options.override === 'boolean' ? DEFAULT_EDITOR_ASSOCIATION.id : undefined
            };
        }
        return undefined;
    }
    TextEditorOpenOptions.from = from;
})(TextEditorOpenOptions || (TextEditorOpenOptions = {}));
export var GlobPattern;
(function (GlobPattern) {
    function from(pattern) {
        if (pattern instanceof types.RelativePattern) {
            return pattern.toJSON();
        }
        if (typeof pattern === 'string') {
            return pattern;
        }
        // This is slightly bogus because we declare this method to accept
        // `vscode.GlobPattern` which can be `vscode.RelativePattern` class,
        // but given we cannot enforce classes from our vscode.d.ts, we have
        // to probe for objects too
        // Refs: https://github.com/microsoft/vscode/issues/140771
        if (isRelativePatternShape(pattern) || isLegacyRelativePatternShape(pattern)) {
            return new types.RelativePattern(pattern.baseUri ?? pattern.base, pattern.pattern).toJSON();
        }
        return pattern; // preserve `undefined` and `null`
    }
    GlobPattern.from = from;
    function isRelativePatternShape(obj) {
        const rp = obj;
        if (!rp) {
            return false;
        }
        return URI.isUri(rp.baseUri) && typeof rp.pattern === 'string';
    }
    function isLegacyRelativePatternShape(obj) {
        // Before 1.64.x, `RelativePattern` did not have any `baseUri: Uri`
        // property. To preserve backwards compatibility with older extensions
        // we allow this old format when creating the `vscode.RelativePattern`.
        const rp = obj;
        if (!rp) {
            return false;
        }
        return typeof rp.base === 'string' && typeof rp.pattern === 'string';
    }
    function to(pattern) {
        if (typeof pattern === 'string') {
            return pattern;
        }
        return new types.RelativePattern(URI.revive(pattern.baseUri), pattern.pattern);
    }
    GlobPattern.to = to;
})(GlobPattern || (GlobPattern = {}));
export var LanguageSelector;
(function (LanguageSelector) {
    function from(selector) {
        if (!selector) {
            return undefined;
        }
        else if (Array.isArray(selector)) {
            return selector.map(from);
        }
        else if (typeof selector === 'string') {
            return selector;
        }
        else {
            const filter = selector; // TODO: microsoft/TypeScript#42768
            return {
                language: filter.language,
                scheme: filter.scheme,
                pattern: GlobPattern.from(filter.pattern) ?? undefined,
                exclusive: filter.exclusive,
                notebookType: filter.notebookType
            };
        }
    }
    LanguageSelector.from = from;
})(LanguageSelector || (LanguageSelector = {}));
export var NotebookRange;
(function (NotebookRange) {
    function from(range) {
        return { start: range.start, end: range.end };
    }
    NotebookRange.from = from;
    function to(range) {
        return new types.NotebookRange(range.start, range.end);
    }
    NotebookRange.to = to;
})(NotebookRange || (NotebookRange = {}));
export var NotebookCellExecutionSummary;
(function (NotebookCellExecutionSummary) {
    function to(data) {
        return {
            timing: typeof data.runStartTime === 'number' && typeof data.runEndTime === 'number' ? { startTime: data.runStartTime, endTime: data.runEndTime } : undefined,
            executionOrder: data.executionOrder,
            success: data.lastRunSuccess
        };
    }
    NotebookCellExecutionSummary.to = to;
    function from(data) {
        return {
            lastRunSuccess: data.success,
            runStartTime: data.timing?.startTime,
            runEndTime: data.timing?.endTime,
            executionOrder: data.executionOrder
        };
    }
    NotebookCellExecutionSummary.from = from;
})(NotebookCellExecutionSummary || (NotebookCellExecutionSummary = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    function to(state) {
        if (state === notebooks.NotebookCellExecutionState.Unconfirmed) {
            return types.NotebookCellExecutionState.Pending;
        }
        else if (state === notebooks.NotebookCellExecutionState.Pending) {
            // Since the (proposed) extension API doesn't have the distinction between Unconfirmed and Pending, we don't want to fire an update for Pending twice
            return undefined;
        }
        else if (state === notebooks.NotebookCellExecutionState.Executing) {
            return types.NotebookCellExecutionState.Executing;
        }
        else {
            throw new Error(`Unknown state: ${state}`);
        }
    }
    NotebookCellExecutionState.to = to;
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookCellKind;
(function (NotebookCellKind) {
    function from(data) {
        switch (data) {
            case types.NotebookCellKind.Markup:
                return notebooks.CellKind.Markup;
            case types.NotebookCellKind.Code:
            default:
                return notebooks.CellKind.Code;
        }
    }
    NotebookCellKind.from = from;
    function to(data) {
        switch (data) {
            case notebooks.CellKind.Markup:
                return types.NotebookCellKind.Markup;
            case notebooks.CellKind.Code:
            default:
                return types.NotebookCellKind.Code;
        }
    }
    NotebookCellKind.to = to;
})(NotebookCellKind || (NotebookCellKind = {}));
export var NotebookData;
(function (NotebookData) {
    function from(data) {
        const res = {
            metadata: data.metadata ?? Object.create(null),
            cells: [],
        };
        for (const cell of data.cells) {
            types.NotebookCellData.validate(cell);
            res.cells.push(NotebookCellData.from(cell));
        }
        return res;
    }
    NotebookData.from = from;
    function to(data) {
        const res = new types.NotebookData(data.cells.map(NotebookCellData.to));
        if (!isEmptyObject(data.metadata)) {
            res.metadata = data.metadata;
        }
        return res;
    }
    NotebookData.to = to;
})(NotebookData || (NotebookData = {}));
export var NotebookCellData;
(function (NotebookCellData) {
    function from(data) {
        return {
            cellKind: NotebookCellKind.from(data.kind),
            language: data.languageId,
            mime: data.mime,
            source: data.value,
            metadata: data.metadata,
            internalMetadata: NotebookCellExecutionSummary.from(data.executionSummary ?? {}),
            outputs: data.outputs ? data.outputs.map(NotebookCellOutput.from) : []
        };
    }
    NotebookCellData.from = from;
    function to(data) {
        return new types.NotebookCellData(NotebookCellKind.to(data.cellKind), data.source, data.language, data.mime, data.outputs ? data.outputs.map(NotebookCellOutput.to) : undefined, data.metadata, data.internalMetadata ? NotebookCellExecutionSummary.to(data.internalMetadata) : undefined);
    }
    NotebookCellData.to = to;
})(NotebookCellData || (NotebookCellData = {}));
export var NotebookCellOutputItem;
(function (NotebookCellOutputItem) {
    function from(item) {
        return {
            mime: item.mime,
            valueBytes: VSBuffer.wrap(item.data),
        };
    }
    NotebookCellOutputItem.from = from;
    function to(item) {
        return new types.NotebookCellOutputItem(item.valueBytes.buffer, item.mime);
    }
    NotebookCellOutputItem.to = to;
})(NotebookCellOutputItem || (NotebookCellOutputItem = {}));
export var NotebookCellOutput;
(function (NotebookCellOutput) {
    function from(output) {
        return {
            outputId: output.id,
            items: output.items.map(NotebookCellOutputItem.from),
            metadata: output.metadata
        };
    }
    NotebookCellOutput.from = from;
    function to(output) {
        const items = output.items.map(NotebookCellOutputItem.to);
        return new types.NotebookCellOutput(items, output.outputId, output.metadata);
    }
    NotebookCellOutput.to = to;
})(NotebookCellOutput || (NotebookCellOutput = {}));
export var NotebookExclusiveDocumentPattern;
(function (NotebookExclusiveDocumentPattern) {
    function from(pattern) {
        if (isExclusivePattern(pattern)) {
            return {
                include: GlobPattern.from(pattern.include) ?? undefined,
                exclude: GlobPattern.from(pattern.exclude) ?? undefined,
            };
        }
        return GlobPattern.from(pattern) ?? undefined;
    }
    NotebookExclusiveDocumentPattern.from = from;
    function to(pattern) {
        if (isExclusivePattern(pattern)) {
            return {
                include: GlobPattern.to(pattern.include),
                exclude: GlobPattern.to(pattern.exclude)
            };
        }
        return GlobPattern.to(pattern);
    }
    NotebookExclusiveDocumentPattern.to = to;
    function isExclusivePattern(obj) {
        const ep = obj;
        if (!ep) {
            return false;
        }
        return !isUndefinedOrNull(ep.include) && !isUndefinedOrNull(ep.exclude);
    }
})(NotebookExclusiveDocumentPattern || (NotebookExclusiveDocumentPattern = {}));
export var NotebookStatusBarItem;
(function (NotebookStatusBarItem) {
    function from(item, commandsConverter, disposables) {
        const command = typeof item.command === 'string' ? { title: '', command: item.command } : item.command;
        return {
            alignment: item.alignment === types.NotebookCellStatusBarAlignment.Left ? 1 /* notebooks.CellStatusbarAlignment.Left */ : 2 /* notebooks.CellStatusbarAlignment.Right */,
            command: commandsConverter.toInternal(command, disposables), // TODO@roblou
            text: item.text,
            tooltip: item.tooltip,
            accessibilityInformation: item.accessibilityInformation,
            priority: item.priority
        };
    }
    NotebookStatusBarItem.from = from;
})(NotebookStatusBarItem || (NotebookStatusBarItem = {}));
export var NotebookKernelSourceAction;
(function (NotebookKernelSourceAction) {
    function from(item, commandsConverter, disposables) {
        const command = typeof item.command === 'string' ? { title: '', command: item.command } : item.command;
        return {
            command: commandsConverter.toInternal(command, disposables),
            label: item.label,
            description: item.description,
            detail: item.detail,
            documentation: item.documentation
        };
    }
    NotebookKernelSourceAction.from = from;
})(NotebookKernelSourceAction || (NotebookKernelSourceAction = {}));
export var NotebookDocumentContentOptions;
(function (NotebookDocumentContentOptions) {
    function from(options) {
        return {
            transientOutputs: options?.transientOutputs ?? false,
            transientCellMetadata: options?.transientCellMetadata ?? {},
            transientDocumentMetadata: options?.transientDocumentMetadata ?? {},
            cellContentMetadata: options?.cellContentMetadata ?? {}
        };
    }
    NotebookDocumentContentOptions.from = from;
})(NotebookDocumentContentOptions || (NotebookDocumentContentOptions = {}));
export var NotebookRendererScript;
(function (NotebookRendererScript) {
    function from(preload) {
        return {
            uri: preload.uri,
            provides: preload.provides
        };
    }
    NotebookRendererScript.from = from;
    function to(preload) {
        return new types.NotebookRendererScript(URI.revive(preload.uri), preload.provides);
    }
    NotebookRendererScript.to = to;
})(NotebookRendererScript || (NotebookRendererScript = {}));
export var TestMessage;
(function (TestMessage) {
    function from(message) {
        return {
            message: MarkdownString.fromStrict(message.message) || '',
            type: 0 /* TestMessageType.Error */,
            expected: message.expectedOutput,
            actual: message.actualOutput,
            contextValue: message.contextValue,
            location: message.location && ({ range: Range.from(message.location.range), uri: message.location.uri }),
            stackTrace: message.stackTrace?.map(s => ({
                label: s.label,
                position: s.position && Position.from(s.position),
                uri: s.uri && URI.revive(s.uri).toJSON(),
            })),
        };
    }
    TestMessage.from = from;
    function to(item) {
        const message = new types.TestMessage(typeof item.message === 'string' ? item.message : MarkdownString.to(item.message));
        message.actualOutput = item.actual;
        message.expectedOutput = item.expected;
        message.contextValue = item.contextValue;
        message.location = item.location ? location.to(item.location) : undefined;
        return message;
    }
    TestMessage.to = to;
})(TestMessage || (TestMessage = {}));
export var TestTag;
(function (TestTag) {
    TestTag.namespace = namespaceTestTag;
    TestTag.denamespace = denamespaceTestTag;
})(TestTag || (TestTag = {}));
export var TestRunProfile;
(function (TestRunProfile) {
    function from(item) {
        return {
            controllerId: item.controllerId,
            profileId: item.profileId,
            group: TestRunProfileKind.from(item.kind),
        };
    }
    TestRunProfile.from = from;
})(TestRunProfile || (TestRunProfile = {}));
export var TestRunProfileKind;
(function (TestRunProfileKind) {
    const profileGroupToBitset = {
        [types.TestRunProfileKind.Coverage]: 8 /* TestRunProfileBitset.Coverage */,
        [types.TestRunProfileKind.Debug]: 4 /* TestRunProfileBitset.Debug */,
        [types.TestRunProfileKind.Run]: 2 /* TestRunProfileBitset.Run */,
    };
    function from(kind) {
        return profileGroupToBitset.hasOwnProperty(kind) ? profileGroupToBitset[kind] : 2 /* TestRunProfileBitset.Run */;
    }
    TestRunProfileKind.from = from;
})(TestRunProfileKind || (TestRunProfileKind = {}));
export var TestItem;
(function (TestItem) {
    function from(item) {
        const ctrlId = getPrivateApiFor(item).controllerId;
        return {
            extId: TestId.fromExtHostTestItem(item, ctrlId).toString(),
            label: item.label,
            uri: URI.revive(item.uri),
            busy: item.busy,
            tags: item.tags.map(t => TestTag.namespace(ctrlId, t.id)),
            range: editorRange.Range.lift(Range.from(item.range)),
            description: item.description || null,
            sortText: item.sortText || null,
            error: item.error ? (MarkdownString.fromStrict(item.error) || null) : null,
        };
    }
    TestItem.from = from;
    function toPlain(item) {
        return {
            parent: undefined,
            error: undefined,
            id: TestId.fromString(item.extId).localId,
            label: item.label,
            uri: URI.revive(item.uri),
            tags: (item.tags || []).map(t => {
                const { tagId } = TestTag.denamespace(t);
                return new types.TestTag(tagId);
            }),
            children: {
                add: () => { },
                delete: () => { },
                forEach: () => { },
                *[Symbol.iterator]() { },
                get: () => undefined,
                replace: () => { },
                size: 0,
            },
            range: Range.to(item.range || undefined),
            canResolveChildren: false,
            busy: item.busy,
            description: item.description || undefined,
            sortText: item.sortText || undefined,
        };
    }
    TestItem.toPlain = toPlain;
})(TestItem || (TestItem = {}));
(function (TestTag) {
    function from(tag) {
        return { id: tag.id };
    }
    TestTag.from = from;
    function to(tag) {
        return new types.TestTag(tag.id);
    }
    TestTag.to = to;
})(TestTag || (TestTag = {}));
export var TestResults;
(function (TestResults) {
    const convertTestResultItem = (node, parent) => {
        const item = node.value;
        if (!item) {
            return undefined; // should be unreachable
        }
        const snapshot = ({
            ...TestItem.toPlain(item.item),
            parent,
            taskStates: item.tasks.map(t => ({
                state: t.state,
                duration: t.duration,
                messages: t.messages
                    .filter((m) => m.type === 0 /* TestMessageType.Error */)
                    .map(TestMessage.to),
            })),
            children: [],
        });
        if (node.children) {
            for (const child of node.children.values()) {
                const c = convertTestResultItem(child, snapshot);
                if (c) {
                    snapshot.children.push(c);
                }
            }
        }
        return snapshot;
    };
    function to(serialized) {
        const tree = new WellDefinedPrefixTree();
        for (const item of serialized.items) {
            tree.insert(TestId.fromString(item.item.extId).path, item);
        }
        // Get the first node with a value in each subtree of IDs.
        const queue = [tree.nodes];
        const roots = [];
        while (queue.length) {
            for (const node of queue.pop()) {
                if (node.value) {
                    roots.push(node);
                }
                else if (node.children) {
                    queue.push(node.children.values());
                }
            }
        }
        return {
            completedAt: serialized.completedAt,
            results: roots.map(r => convertTestResultItem(r)).filter(isDefined),
        };
    }
    TestResults.to = to;
})(TestResults || (TestResults = {}));
export var TestCoverage;
(function (TestCoverage) {
    function fromCoverageCount(count) {
        return { covered: count.covered, total: count.total };
    }
    function fromLocation(location) {
        return 'line' in location ? Position.from(location) : Range.from(location);
    }
    function toLocation(location) {
        if (!location) {
            return undefined;
        }
        return 'endLineNumber' in location ? Range.to(location) : Position.to(location);
    }
    function to(serialized) {
        if (serialized.type === 1 /* DetailType.Statement */) {
            const branches = [];
            if (serialized.branches) {
                for (const branch of serialized.branches) {
                    branches.push({
                        executed: branch.count,
                        location: toLocation(branch.location),
                        label: branch.label
                    });
                }
            }
            return new types.StatementCoverage(serialized.count, toLocation(serialized.location), serialized.branches?.map(b => new types.BranchCoverage(b.count, toLocation(b.location), b.label)));
        }
        else {
            return new types.DeclarationCoverage(serialized.name, serialized.count, toLocation(serialized.location));
        }
    }
    TestCoverage.to = to;
    function fromDetails(coverage) {
        if (typeof coverage.executed === 'number' && coverage.executed < 0) {
            throw new Error(`Invalid coverage count ${coverage.executed}`);
        }
        if ('branches' in coverage) {
            return {
                count: coverage.executed,
                location: fromLocation(coverage.location),
                type: 1 /* DetailType.Statement */,
                branches: coverage.branches.length
                    ? coverage.branches.map(b => ({ count: b.executed, location: b.location && fromLocation(b.location), label: b.label }))
                    : undefined,
            };
        }
        else {
            return {
                type: 0 /* DetailType.Declaration */,
                name: coverage.name,
                count: coverage.executed,
                location: fromLocation(coverage.location),
            };
        }
    }
    TestCoverage.fromDetails = fromDetails;
    function fromFile(controllerId, id, coverage) {
        types.validateTestCoverageCount(coverage.statementCoverage);
        types.validateTestCoverageCount(coverage.branchCoverage);
        types.validateTestCoverageCount(coverage.declarationCoverage);
        return {
            id,
            uri: coverage.uri,
            statement: fromCoverageCount(coverage.statementCoverage),
            branch: coverage.branchCoverage && fromCoverageCount(coverage.branchCoverage),
            declaration: coverage.declarationCoverage && fromCoverageCount(coverage.declarationCoverage),
            testIds: coverage instanceof types.FileCoverage && coverage.includesTests.length ?
                coverage.includesTests.map(t => TestId.fromExtHostTestItem(t, controllerId).toString()) : undefined,
        };
    }
    TestCoverage.fromFile = fromFile;
})(TestCoverage || (TestCoverage = {}));
export var CodeActionTriggerKind;
(function (CodeActionTriggerKind) {
    function to(value) {
        switch (value) {
            case 1 /* languages.CodeActionTriggerType.Invoke */:
                return types.CodeActionTriggerKind.Invoke;
            case 2 /* languages.CodeActionTriggerType.Auto */:
                return types.CodeActionTriggerKind.Automatic;
        }
    }
    CodeActionTriggerKind.to = to;
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
export var TypeHierarchyItem;
(function (TypeHierarchyItem) {
    function to(item) {
        const result = new types.TypeHierarchyItem(SymbolKind.to(item.kind), item.name, item.detail || '', URI.revive(item.uri), Range.to(item.range), Range.to(item.selectionRange));
        result._sessionId = item._sessionId;
        result._itemId = item._itemId;
        return result;
    }
    TypeHierarchyItem.to = to;
    function from(item, sessionId, itemId) {
        sessionId = sessionId ?? item._sessionId;
        itemId = itemId ?? item._itemId;
        if (sessionId === undefined || itemId === undefined) {
            throw new Error('invalid item');
        }
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            kind: SymbolKind.from(item.kind),
            name: item.name,
            detail: item.detail ?? '',
            uri: item.uri,
            range: Range.from(item.range),
            selectionRange: Range.from(item.selectionRange),
            tags: item.tags?.map(SymbolTag.from)
        };
    }
    TypeHierarchyItem.from = from;
})(TypeHierarchyItem || (TypeHierarchyItem = {}));
export var ViewBadge;
(function (ViewBadge) {
    function from(badge) {
        if (!badge) {
            return undefined;
        }
        return {
            value: badge.value,
            tooltip: badge.tooltip
        };
    }
    ViewBadge.from = from;
})(ViewBadge || (ViewBadge = {}));
export var DataTransferItem;
(function (DataTransferItem) {
    function to(mime, item, resolveFileData) {
        const file = item.fileData;
        if (file) {
            return new types.InternalFileDataTransferItem(new types.DataTransferFile(file.name, URI.revive(file.uri), file.id, createSingleCallFunction(() => resolveFileData(file.id))));
        }
        if (mime === Mimes.uriList && item.uriListData) {
            return new types.InternalDataTransferItem(reviveUriList(item.uriListData));
        }
        return new types.InternalDataTransferItem(item.asString);
    }
    DataTransferItem.to = to;
    async function from(mime, item, id = generateUuid()) {
        const stringValue = await item.asString();
        if (mime === Mimes.uriList) {
            return {
                id,
                asString: stringValue,
                fileData: undefined,
                uriListData: serializeUriList(stringValue),
            };
        }
        const fileValue = item.asFile();
        return {
            id,
            asString: stringValue,
            fileData: fileValue ? {
                name: fileValue.name,
                uri: fileValue.uri,
                id: fileValue._itemId ?? fileValue.id,
            } : undefined,
        };
    }
    DataTransferItem.from = from;
    function serializeUriList(stringValue) {
        return UriList.split(stringValue).map(part => {
            if (part.startsWith('#')) {
                return part;
            }
            try {
                return URI.parse(part);
            }
            catch {
                // noop
            }
            return part;
        });
    }
    function reviveUriList(parts) {
        return UriList.create(parts.map(part => {
            return typeof part === 'string' ? part : URI.revive(part);
        }));
    }
})(DataTransferItem || (DataTransferItem = {}));
export var DataTransfer;
(function (DataTransfer) {
    function toDataTransfer(value, resolveFileData) {
        const init = value.items.map(([type, item]) => {
            return [type, DataTransferItem.to(type, item, resolveFileData)];
        });
        return new types.DataTransfer(init);
    }
    DataTransfer.toDataTransfer = toDataTransfer;
    async function from(dataTransfer) {
        const items = await Promise.all(Array.from(dataTransfer, async ([mime, value]) => {
            return [mime, await DataTransferItem.from(mime, value)];
        }));
        return { items };
    }
    DataTransfer.from = from;
    async function fromList(dataTransfer) {
        const items = await Promise.all(Array.from(dataTransfer, async ([mime, value]) => {
            return [mime, await DataTransferItem.from(mime, value, value.id)];
        }));
        return { items };
    }
    DataTransfer.fromList = fromList;
})(DataTransfer || (DataTransfer = {}));
export var ChatFollowup;
(function (ChatFollowup) {
    function from(followup, request) {
        return {
            kind: 'reply',
            agentId: followup.participant ?? request?.agentId ?? '',
            subCommand: followup.command ?? request?.command,
            message: followup.prompt,
            title: followup.label
        };
    }
    ChatFollowup.from = from;
    function to(followup) {
        return {
            prompt: followup.message,
            label: followup.title,
            participant: followup.agentId,
            command: followup.subCommand,
        };
    }
    ChatFollowup.to = to;
})(ChatFollowup || (ChatFollowup = {}));
export var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    function to(role) {
        switch (role) {
            case 0 /* chatProvider.ChatMessageRole.System */: return types.LanguageModelChatMessageRole.System;
            case 1 /* chatProvider.ChatMessageRole.User */: return types.LanguageModelChatMessageRole.User;
            case 2 /* chatProvider.ChatMessageRole.Assistant */: return types.LanguageModelChatMessageRole.Assistant;
        }
    }
    LanguageModelChatMessageRole.to = to;
    function from(role) {
        switch (role) {
            case types.LanguageModelChatMessageRole.System: return 0 /* chatProvider.ChatMessageRole.System */;
            case types.LanguageModelChatMessageRole.User: return 1 /* chatProvider.ChatMessageRole.User */;
            case types.LanguageModelChatMessageRole.Assistant: return 2 /* chatProvider.ChatMessageRole.Assistant */;
        }
        return 1 /* chatProvider.ChatMessageRole.User */;
    }
    LanguageModelChatMessageRole.from = from;
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
export var LanguageModelChatMessage;
(function (LanguageModelChatMessage) {
    function to(message) {
        const content = message.content.map(c => {
            if (c.type === 'text') {
                return new LanguageModelTextPart(c.value);
            }
            else if (c.type === 'tool_result') {
                const content = c.value.map(part => {
                    if (part.type === 'text') {
                        return new types.LanguageModelTextPart(part.value);
                    }
                    else {
                        return new types.LanguageModelPromptTsxPart(part.value);
                    }
                });
                return new types.LanguageModelToolResultPart(c.toolCallId, content, c.isError);
            }
            else if (c.type === 'image_url') {
                // No image support for LanguageModelChatMessage
                return undefined;
            }
            else {
                return new types.LanguageModelToolCallPart(c.toolCallId, c.name, c.parameters);
            }
        }).filter(c => c !== undefined);
        const role = LanguageModelChatMessageRole.to(message.role);
        const result = new types.LanguageModelChatMessage(role, content, message.name);
        return result;
    }
    LanguageModelChatMessage.to = to;
    function from(message) {
        const role = LanguageModelChatMessageRole.from(message.role);
        const name = message.name;
        let messageContent = message.content;
        if (typeof messageContent === 'string') {
            messageContent = [new types.LanguageModelTextPart(messageContent)];
        }
        const content = messageContent.map((c) => {
            if (c instanceof types.LanguageModelToolResultPart) {
                return {
                    type: 'tool_result',
                    toolCallId: c.callId,
                    value: coalesce(c.content.map(part => {
                        if (part instanceof types.LanguageModelTextPart) {
                            return {
                                type: 'text',
                                value: part.value
                            };
                        }
                        else if (part instanceof types.LanguageModelPromptTsxPart) {
                            return {
                                type: 'prompt_tsx',
                                value: part.value,
                            };
                        }
                        else {
                            // Strip unknown parts
                            return undefined;
                        }
                    })),
                    isError: c.isError
                };
            }
            else if (c instanceof types.LanguageModelToolCallPart) {
                return {
                    type: 'tool_use',
                    toolCallId: c.callId,
                    name: c.name,
                    parameters: c.input
                };
            }
            else if (c instanceof types.LanguageModelTextPart) {
                return {
                    type: 'text',
                    value: c.value
                };
            }
            else {
                if (typeof c !== 'string') {
                    throw new Error('Unexpected chat message content type');
                }
                return {
                    type: 'text',
                    value: c
                };
            }
        });
        return {
            role,
            name,
            content
        };
    }
    LanguageModelChatMessage.from = from;
})(LanguageModelChatMessage || (LanguageModelChatMessage = {}));
export var LanguageModelChatMessage2;
(function (LanguageModelChatMessage2) {
    function to(message) {
        const content = message.content.map(c => {
            if (c.type === 'text') {
                return new LanguageModelTextPart(c.value);
            }
            else if (c.type === 'tool_result') {
                const content = c.value.map(part => {
                    if (part.type === 'text') {
                        return new types.LanguageModelTextPart(part.value);
                    }
                    else {
                        return new types.LanguageModelPromptTsxPart(part.value);
                    }
                });
                return new types.LanguageModelToolResultPart(c.toolCallId, content, c.isError);
            }
            else if (c.type === 'image_url') {
                const value = {
                    mimeType: c.value.mimeType,
                    data: c.value.data.buffer,
                };
                return new types.LanguageModelDataPart(value);
            }
            else {
                return new types.LanguageModelToolCallPart(c.toolCallId, c.name, c.parameters);
            }
        });
        const role = LanguageModelChatMessageRole.to(message.role);
        const result = new types.LanguageModelChatMessage2(role, content, message.name);
        return result;
    }
    LanguageModelChatMessage2.to = to;
    function from(message) {
        const role = LanguageModelChatMessageRole.from(message.role);
        const name = message.name;
        let messageContent = message.content;
        if (typeof messageContent === 'string') {
            messageContent = [new types.LanguageModelTextPart(messageContent)];
        }
        const content = messageContent.map((c) => {
            if (c instanceof types.LanguageModelToolResultPart) {
                return {
                    type: 'tool_result',
                    toolCallId: c.callId,
                    value: coalesce(c.content.map(part => {
                        if (part instanceof types.LanguageModelTextPart) {
                            return {
                                type: 'text',
                                value: part.value
                            };
                        }
                        else if (part instanceof types.LanguageModelPromptTsxPart) {
                            return {
                                type: 'prompt_tsx',
                                value: part.value,
                            };
                        }
                        else {
                            // Strip unknown parts
                            return undefined;
                        }
                    })),
                    isError: c.isError
                };
            }
            else if (c instanceof types.LanguageModelDataPart) {
                const value = {
                    mimeType: c.value.mimeType,
                    data: VSBuffer.wrap(c.value.data),
                };
                return {
                    type: 'image_url',
                    value: value
                };
            }
            else if (c instanceof types.LanguageModelToolCallPart) {
                return {
                    type: 'tool_use',
                    toolCallId: c.callId,
                    name: c.name,
                    parameters: c.input
                };
            }
            else if (c instanceof types.LanguageModelTextPart) {
                return {
                    type: 'text',
                    value: c.value
                };
            }
            else {
                if (typeof c !== 'string') {
                    throw new Error('Unexpected chat message content type');
                }
                return {
                    type: 'text',
                    value: c
                };
            }
        });
        return {
            role,
            name,
            content
        };
    }
    LanguageModelChatMessage2.from = from;
})(LanguageModelChatMessage2 || (LanguageModelChatMessage2 = {}));
export var ChatResponseMarkdownPart;
(function (ChatResponseMarkdownPart) {
    function from(part) {
        return {
            kind: 'markdownContent',
            content: MarkdownString.from(part.value)
        };
    }
    ChatResponseMarkdownPart.from = from;
    function to(part) {
        return new types.ChatResponseMarkdownPart(MarkdownString.to(part.content));
    }
    ChatResponseMarkdownPart.to = to;
})(ChatResponseMarkdownPart || (ChatResponseMarkdownPart = {}));
export var ChatResponseCodeblockUriPart;
(function (ChatResponseCodeblockUriPart) {
    function from(part) {
        return {
            kind: 'codeblockUri',
            uri: part.value,
            isEdit: part.isEdit,
        };
    }
    ChatResponseCodeblockUriPart.from = from;
    function to(part) {
        return new types.ChatResponseCodeblockUriPart(URI.revive(part.uri), part.isEdit);
    }
    ChatResponseCodeblockUriPart.to = to;
})(ChatResponseCodeblockUriPart || (ChatResponseCodeblockUriPart = {}));
export var ChatResponseMarkdownWithVulnerabilitiesPart;
(function (ChatResponseMarkdownWithVulnerabilitiesPart) {
    function from(part) {
        return {
            kind: 'markdownVuln',
            content: MarkdownString.from(part.value),
            vulnerabilities: part.vulnerabilities,
        };
    }
    ChatResponseMarkdownWithVulnerabilitiesPart.from = from;
    function to(part) {
        return new types.ChatResponseMarkdownWithVulnerabilitiesPart(MarkdownString.to(part.content), part.vulnerabilities);
    }
    ChatResponseMarkdownWithVulnerabilitiesPart.to = to;
})(ChatResponseMarkdownWithVulnerabilitiesPart || (ChatResponseMarkdownWithVulnerabilitiesPart = {}));
export var ChatResponseConfirmationPart;
(function (ChatResponseConfirmationPart) {
    function from(part) {
        return {
            kind: 'confirmation',
            title: part.title,
            message: part.message,
            data: part.data,
            buttons: part.buttons
        };
    }
    ChatResponseConfirmationPart.from = from;
})(ChatResponseConfirmationPart || (ChatResponseConfirmationPart = {}));
export var ChatResponseFilesPart;
(function (ChatResponseFilesPart) {
    function from(part) {
        const { value, baseUri } = part;
        function convert(items, baseUri) {
            return items.map(item => {
                const myUri = URI.joinPath(baseUri, item.name);
                return {
                    label: item.name,
                    uri: myUri,
                    children: item.children && convert(item.children, myUri)
                };
            });
        }
        return {
            kind: 'treeData',
            treeData: {
                label: basename(baseUri),
                uri: baseUri,
                children: convert(value, baseUri)
            }
        };
    }
    ChatResponseFilesPart.from = from;
    function to(part) {
        const treeData = revive(part.treeData);
        function convert(items) {
            return items.map(item => {
                return {
                    name: item.label,
                    children: item.children && convert(item.children)
                };
            });
        }
        const baseUri = treeData.uri;
        const items = treeData.children ? convert(treeData.children) : [];
        return new types.ChatResponseFileTreePart(items, baseUri);
    }
    ChatResponseFilesPart.to = to;
})(ChatResponseFilesPart || (ChatResponseFilesPart = {}));
export var ChatResponseAnchorPart;
(function (ChatResponseAnchorPart) {
    function from(part) {
        // Work around type-narrowing confusion between vscode.Uri and URI
        const isUri = (thing) => URI.isUri(thing);
        const isSymbolInformation = (thing) => 'name' in thing;
        return {
            kind: 'inlineReference',
            name: part.title,
            inlineReference: isUri(part.value)
                ? part.value
                : isSymbolInformation(part.value)
                    ? WorkspaceSymbol.from(part.value)
                    : Location.from(part.value)
        };
    }
    ChatResponseAnchorPart.from = from;
    function to(part) {
        const value = revive(part);
        return new types.ChatResponseAnchorPart(URI.isUri(value.inlineReference)
            ? value.inlineReference
            : 'location' in value.inlineReference
                ? WorkspaceSymbol.to(value.inlineReference)
                : Location.to(value.inlineReference), part.name);
    }
    ChatResponseAnchorPart.to = to;
})(ChatResponseAnchorPart || (ChatResponseAnchorPart = {}));
export var ChatResponseProgressPart;
(function (ChatResponseProgressPart) {
    function from(part) {
        return {
            kind: 'progressMessage',
            content: MarkdownString.from(part.value)
        };
    }
    ChatResponseProgressPart.from = from;
    function to(part) {
        return new types.ChatResponseProgressPart(part.content.value);
    }
    ChatResponseProgressPart.to = to;
})(ChatResponseProgressPart || (ChatResponseProgressPart = {}));
export var ChatResponseWarningPart;
(function (ChatResponseWarningPart) {
    function from(part) {
        return {
            kind: 'warning',
            content: MarkdownString.from(part.value)
        };
    }
    ChatResponseWarningPart.from = from;
    function to(part) {
        return new types.ChatResponseWarningPart(part.content.value);
    }
    ChatResponseWarningPart.to = to;
})(ChatResponseWarningPart || (ChatResponseWarningPart = {}));
export var ChatResponseMovePart;
(function (ChatResponseMovePart) {
    function from(part) {
        return {
            kind: 'move',
            uri: part.uri,
            range: Range.from(part.range),
        };
    }
    ChatResponseMovePart.from = from;
    function to(part) {
        return new types.ChatResponseMovePart(URI.revive(part.uri), Range.to(part.range));
    }
    ChatResponseMovePart.to = to;
})(ChatResponseMovePart || (ChatResponseMovePart = {}));
export var ChatTask;
(function (ChatTask) {
    function from(part) {
        return {
            kind: 'progressTask',
            content: MarkdownString.from(part.value),
        };
    }
    ChatTask.from = from;
})(ChatTask || (ChatTask = {}));
export var ChatTaskResult;
(function (ChatTaskResult) {
    function from(part) {
        return {
            kind: 'progressTaskResult',
            content: typeof part === 'string' ? MarkdownString.from(part) : undefined
        };
    }
    ChatTaskResult.from = from;
})(ChatTaskResult || (ChatTaskResult = {}));
export var ChatResponseCommandButtonPart;
(function (ChatResponseCommandButtonPart) {
    function from(part, commandsConverter, commandDisposables) {
        // If the command isn't in the converter, then this session may have been restored, and the command args don't exist anymore
        const command = commandsConverter.toInternal(part.value, commandDisposables) ?? { command: part.value.command, title: part.value.title };
        return {
            kind: 'command',
            command
        };
    }
    ChatResponseCommandButtonPart.from = from;
    function to(part, commandsConverter) {
        // If the command isn't in the converter, then this session may have been restored, and the command args don't exist anymore
        return new types.ChatResponseCommandButtonPart(commandsConverter.fromInternal(part.command) ?? { command: part.command.id, title: part.command.title });
    }
    ChatResponseCommandButtonPart.to = to;
})(ChatResponseCommandButtonPart || (ChatResponseCommandButtonPart = {}));
export var ChatResponseTextEditPart;
(function (ChatResponseTextEditPart) {
    function from(part) {
        return {
            kind: 'textEdit',
            uri: part.uri,
            edits: part.edits.map(e => TextEdit.from(e)),
            done: part.isDone
        };
    }
    ChatResponseTextEditPart.from = from;
    function to(part) {
        const result = new types.ChatResponseTextEditPart(URI.revive(part.uri), part.edits.map(e => TextEdit.to(e)));
        result.isDone = part.done;
        return result;
    }
    ChatResponseTextEditPart.to = to;
})(ChatResponseTextEditPart || (ChatResponseTextEditPart = {}));
export var NotebookEdit;
(function (NotebookEdit) {
    function from(edit) {
        if (edit.newCellMetadata) {
            return {
                editType: 3 /* CellEditType.Metadata */,
                index: edit.range.start,
                metadata: edit.newCellMetadata
            };
        }
        else if (edit.newNotebookMetadata) {
            return {
                editType: 5 /* CellEditType.DocumentMetadata */,
                metadata: edit.newNotebookMetadata
            };
        }
        else {
            return {
                editType: 1 /* CellEditType.Replace */,
                index: edit.range.start,
                count: edit.range.end - edit.range.start,
                cells: edit.newCells.map(NotebookCellData.from)
            };
        }
    }
    NotebookEdit.from = from;
})(NotebookEdit || (NotebookEdit = {}));
export var ChatResponseNotebookEditPart;
(function (ChatResponseNotebookEditPart) {
    function from(part) {
        return {
            kind: 'notebookEdit',
            uri: part.uri,
            edits: part.edits.map(NotebookEdit.from),
            done: part.isDone
        };
    }
    ChatResponseNotebookEditPart.from = from;
})(ChatResponseNotebookEditPart || (ChatResponseNotebookEditPart = {}));
export var ChatResponseReferencePart;
(function (ChatResponseReferencePart) {
    function from(part) {
        const iconPath = ThemeIcon.isThemeIcon(part.iconPath) ? part.iconPath
            : URI.isUri(part.iconPath) ? { light: URI.revive(part.iconPath) }
                : (part.iconPath && 'light' in part.iconPath && 'dark' in part.iconPath && URI.isUri(part.iconPath.light) && URI.isUri(part.iconPath.dark) ? { light: URI.revive(part.iconPath.light), dark: URI.revive(part.iconPath.dark) }
                    : undefined);
        if (typeof part.value === 'object' && 'variableName' in part.value) {
            return {
                kind: 'reference',
                reference: {
                    variableName: part.value.variableName,
                    value: URI.isUri(part.value.value) || !part.value.value ?
                        part.value.value :
                        Location.from(part.value.value)
                },
                iconPath,
                options: part.options
            };
        }
        return {
            kind: 'reference',
            reference: URI.isUri(part.value) || typeof part.value === 'string' ?
                part.value :
                Location.from(part.value),
            iconPath,
            options: part.options
        };
    }
    ChatResponseReferencePart.from = from;
    function to(part) {
        const value = revive(part);
        const mapValue = (value) => URI.isUri(value) ?
            value :
            Location.to(value);
        return new types.ChatResponseReferencePart(typeof value.reference === 'string' ? value.reference : 'variableName' in value.reference ? {
            variableName: value.reference.variableName,
            value: value.reference.value && mapValue(value.reference.value)
        } :
            mapValue(value.reference)); // 'value' is extended with variableName
    }
    ChatResponseReferencePart.to = to;
})(ChatResponseReferencePart || (ChatResponseReferencePart = {}));
export var ChatResponseCodeCitationPart;
(function (ChatResponseCodeCitationPart) {
    function from(part) {
        return {
            kind: 'codeCitation',
            value: part.value,
            license: part.license,
            snippet: part.snippet
        };
    }
    ChatResponseCodeCitationPart.from = from;
})(ChatResponseCodeCitationPart || (ChatResponseCodeCitationPart = {}));
export var ChatResponsePart;
(function (ChatResponsePart) {
    function from(part, commandsConverter, commandDisposables) {
        if (part instanceof types.ChatResponseMarkdownPart) {
            return ChatResponseMarkdownPart.from(part);
        }
        else if (part instanceof types.ChatResponseAnchorPart) {
            return ChatResponseAnchorPart.from(part);
        }
        else if (part instanceof types.ChatResponseReferencePart) {
            return ChatResponseReferencePart.from(part);
        }
        else if (part instanceof types.ChatResponseProgressPart) {
            return ChatResponseProgressPart.from(part);
        }
        else if (part instanceof types.ChatResponseFileTreePart) {
            return ChatResponseFilesPart.from(part);
        }
        else if (part instanceof types.ChatResponseCommandButtonPart) {
            return ChatResponseCommandButtonPart.from(part, commandsConverter, commandDisposables);
        }
        else if (part instanceof types.ChatResponseTextEditPart) {
            return ChatResponseTextEditPart.from(part);
        }
        else if (part instanceof types.ChatResponseNotebookEditPart) {
            return ChatResponseNotebookEditPart.from(part);
        }
        else if (part instanceof types.ChatResponseMarkdownWithVulnerabilitiesPart) {
            return ChatResponseMarkdownWithVulnerabilitiesPart.from(part);
        }
        else if (part instanceof types.ChatResponseCodeblockUriPart) {
            return ChatResponseCodeblockUriPart.from(part);
        }
        else if (part instanceof types.ChatResponseWarningPart) {
            return ChatResponseWarningPart.from(part);
        }
        else if (part instanceof types.ChatResponseConfirmationPart) {
            return ChatResponseConfirmationPart.from(part);
        }
        else if (part instanceof types.ChatResponseCodeCitationPart) {
            return ChatResponseCodeCitationPart.from(part);
        }
        else if (part instanceof types.ChatResponseMovePart) {
            return ChatResponseMovePart.from(part);
        }
        return {
            kind: 'markdownContent',
            content: MarkdownString.from('')
        };
    }
    ChatResponsePart.from = from;
    function to(part, commandsConverter) {
        switch (part.kind) {
            case 'reference': return ChatResponseReferencePart.to(part);
            case 'markdownContent':
            case 'inlineReference':
            case 'progressMessage':
            case 'treeData':
            case 'command':
                return toContent(part, commandsConverter);
        }
        return undefined;
    }
    ChatResponsePart.to = to;
    function toContent(part, commandsConverter) {
        switch (part.kind) {
            case 'markdownContent': return ChatResponseMarkdownPart.to(part);
            case 'inlineReference': return ChatResponseAnchorPart.to(part);
            case 'progressMessage': return undefined;
            case 'treeData': return ChatResponseFilesPart.to(part);
            case 'command': return ChatResponseCommandButtonPart.to(part, commandsConverter);
        }
        return undefined;
    }
    ChatResponsePart.toContent = toContent;
})(ChatResponsePart || (ChatResponsePart = {}));
export var ChatAgentRequest;
(function (ChatAgentRequest) {
    function to(request, location2, model, diagnostics, tools) {
        const toolReferences = request.variables.variables.filter(v => v.isTool);
        const variableReferences = request.variables.variables.filter(v => !v.isTool);
        const requestWithoutId = {
            prompt: request.message,
            command: request.command,
            attempt: request.attempt ?? 0,
            enableCommandDetection: request.enableCommandDetection ?? true,
            isParticipantDetected: request.isParticipantDetected ?? false,
            references: variableReferences.map(v => ChatPromptReference.to(v, diagnostics)),
            toolReferences: toolReferences.map(ChatLanguageModelToolReference.to),
            location: ChatLocation.to(request.location),
            acceptedConfirmationData: request.acceptedConfirmationData,
            rejectedConfirmationData: request.rejectedConfirmationData,
            location2,
            toolInvocationToken: Object.freeze({ sessionId: request.sessionId }),
            tools,
            model
        };
        if (request.requestId) {
            return {
                ...requestWithoutId,
                id: request.requestId
            };
        }
        // This cast is done to allow sending the stabl version of ChatRequest which does not have an id property
        return requestWithoutId;
    }
    ChatAgentRequest.to = to;
})(ChatAgentRequest || (ChatAgentRequest = {}));
export var ChatRequestDraft;
(function (ChatRequestDraft) {
    function to(request) {
        return {
            prompt: request.prompt,
            files: request.files.map((uri) => URI.revive(uri))
        };
    }
    ChatRequestDraft.to = to;
})(ChatRequestDraft || (ChatRequestDraft = {}));
export var ChatLocation;
(function (ChatLocation) {
    function to(loc) {
        switch (loc) {
            case ChatAgentLocation.Notebook: return types.ChatLocation.Notebook;
            case ChatAgentLocation.Terminal: return types.ChatLocation.Terminal;
            case ChatAgentLocation.Panel: return types.ChatLocation.Panel;
            case ChatAgentLocation.Editor: return types.ChatLocation.Editor;
            case ChatAgentLocation.EditingSession: return types.ChatLocation.EditingSession;
        }
    }
    ChatLocation.to = to;
    function from(loc) {
        switch (loc) {
            case types.ChatLocation.Notebook: return ChatAgentLocation.Notebook;
            case types.ChatLocation.Terminal: return ChatAgentLocation.Terminal;
            case types.ChatLocation.Panel: return ChatAgentLocation.Panel;
            case types.ChatLocation.Editor: return ChatAgentLocation.Editor;
            case types.ChatLocation.EditingSession: return ChatAgentLocation.EditingSession;
        }
    }
    ChatLocation.from = from;
})(ChatLocation || (ChatLocation = {}));
export var ChatPromptReference;
(function (ChatPromptReference) {
    function to(variable, diagnostics) {
        let value = variable.value;
        if (!value) {
            throw new Error('Invalid value reference');
        }
        if (isUriComponents(value)) {
            value = URI.revive(value);
        }
        else if (value && typeof value === 'object' && 'uri' in value && 'range' in value && isUriComponents(value.uri)) {
            value = Location.to(revive(value));
        }
        else if (variable.isImage) {
            const ref = variable.references?.[0]?.reference;
            value = new types.ChatReferenceBinaryData(variable.mimeType ?? 'image/png', () => Promise.resolve(new Uint8Array(Object.values(variable.value))), ref && URI.isUri(ref) ? ref : undefined);
        }
        else if (variable.kind === 'diagnostic') {
            const filterSeverity = variable.filterSeverity && DiagnosticSeverity.to(variable.filterSeverity);
            const filterUri = variable.filterUri && URI.revive(variable.filterUri).toString();
            value = new types.ChatReferenceDiagnostic(diagnostics.map(([uri, d]) => {
                if (variable.filterUri && uri.toString() !== filterUri) {
                    return [uri, []];
                }
                return [uri, d.filter(d => {
                        if (filterSeverity && d.severity > filterSeverity) {
                            return false;
                        }
                        if (variable.filterRange && !editorRange.Range.areIntersectingOrTouching(variable.filterRange, Range.from(d.range))) {
                            return false;
                        }
                        return true;
                    })];
            }).filter(([, d]) => d.length > 0));
        }
        return {
            id: variable.id,
            name: variable.name,
            range: variable.range && [variable.range.start, variable.range.endExclusive],
            value,
            modelDescription: variable.modelDescription,
        };
    }
    ChatPromptReference.to = to;
})(ChatPromptReference || (ChatPromptReference = {}));
export var ChatLanguageModelToolReference;
(function (ChatLanguageModelToolReference) {
    function to(variable) {
        const value = variable.value;
        if (value) {
            throw new Error('Invalid tool reference');
        }
        return {
            name: variable.id,
            range: variable.range && [variable.range.start, variable.range.endExclusive],
        };
    }
    ChatLanguageModelToolReference.to = to;
})(ChatLanguageModelToolReference || (ChatLanguageModelToolReference = {}));
export var ChatAgentCompletionItem;
(function (ChatAgentCompletionItem) {
    function from(item, commandsConverter, disposables) {
        return {
            id: item.id,
            label: item.label,
            fullName: item.fullName,
            icon: item.icon?.id,
            value: item.values[0].value,
            insertText: item.insertText,
            detail: item.detail,
            documentation: item.documentation,
            command: commandsConverter.toInternal(item.command, disposables),
        };
    }
    ChatAgentCompletionItem.from = from;
})(ChatAgentCompletionItem || (ChatAgentCompletionItem = {}));
export var ChatAgentResult;
(function (ChatAgentResult) {
    function to(result) {
        return {
            errorDetails: result.errorDetails,
            metadata: reviveMetadata(result.metadata),
            nextQuestion: result.nextQuestion,
        };
    }
    ChatAgentResult.to = to;
    function from(result) {
        return {
            errorDetails: result.errorDetails,
            metadata: result.metadata,
            nextQuestion: result.nextQuestion,
        };
    }
    ChatAgentResult.from = from;
    function reviveMetadata(metadata) {
        return cloneAndChange(metadata, value => {
            if (value.$mid === 20 /* MarshalledId.LanguageModelToolResult */) {
                return new types.LanguageModelToolResult(cloneAndChange(value.content, reviveMetadata));
            }
            else if (value.$mid === 21 /* MarshalledId.LanguageModelTextPart */) {
                return new types.LanguageModelTextPart(value.value);
            }
            else if (value.$mid === 22 /* MarshalledId.LanguageModelPromptTsxPart */) {
                return new types.LanguageModelPromptTsxPart(value.value);
            }
            return undefined;
        });
    }
})(ChatAgentResult || (ChatAgentResult = {}));
export var ChatAgentUserActionEvent;
(function (ChatAgentUserActionEvent) {
    function to(result, event, commandsConverter) {
        if (event.action.kind === 'vote') {
            // Is the "feedback" type
            return;
        }
        const ehResult = ChatAgentResult.to(result);
        if (event.action.kind === 'command') {
            const command = event.action.commandButton.command;
            const commandButton = {
                command: commandsConverter.fromInternal(command) ?? { command: command.id, title: command.title },
            };
            const commandAction = { kind: 'command', commandButton };
            return { action: commandAction, result: ehResult };
        }
        else if (event.action.kind === 'followUp') {
            const followupAction = { kind: 'followUp', followup: ChatFollowup.to(event.action.followup) };
            return { action: followupAction, result: ehResult };
        }
        else if (event.action.kind === 'inlineChat') {
            return { action: { kind: 'editor', accepted: event.action.action === 'accepted' }, result: ehResult };
        }
        else if (event.action.kind === 'chatEditingSessionAction') {
            const outcomes = new Map([
                ['accepted', types.ChatEditingSessionActionOutcome.Accepted],
                ['rejected', types.ChatEditingSessionActionOutcome.Rejected],
                ['saved', types.ChatEditingSessionActionOutcome.Saved],
            ]);
            return {
                action: {
                    kind: 'chatEditingSessionAction',
                    outcome: outcomes.get(event.action.outcome) ?? types.ChatEditingSessionActionOutcome.Rejected,
                    uri: URI.revive(event.action.uri),
                    hasRemainingEdits: event.action.hasRemainingEdits
                }, result: ehResult
            };
        }
        else {
            return { action: event.action, result: ehResult };
        }
    }
    ChatAgentUserActionEvent.to = to;
})(ChatAgentUserActionEvent || (ChatAgentUserActionEvent = {}));
export var TerminalQuickFix;
(function (TerminalQuickFix) {
    function from(quickFix, converter, disposables) {
        if ('terminalCommand' in quickFix) {
            return { terminalCommand: quickFix.terminalCommand, shouldExecute: quickFix.shouldExecute };
        }
        if ('uri' in quickFix) {
            return { uri: quickFix.uri };
        }
        return converter.toInternal(quickFix, disposables);
    }
    TerminalQuickFix.from = from;
})(TerminalQuickFix || (TerminalQuickFix = {}));
export var TerminalCompletionItemDto;
(function (TerminalCompletionItemDto) {
    function from(item) {
        return {
            ...item,
            documentation: MarkdownString.fromStrict(item.documentation),
        };
    }
    TerminalCompletionItemDto.from = from;
})(TerminalCompletionItemDto || (TerminalCompletionItemDto = {}));
export var TerminalCompletionList;
(function (TerminalCompletionList) {
    function from(completions) {
        if (Array.isArray(completions)) {
            return {
                items: completions.map(i => TerminalCompletionItemDto.from(i)),
            };
        }
        return {
            items: completions.items.map(i => TerminalCompletionItemDto.from(i)),
            resourceRequestConfig: completions.resourceRequestConfig ? TerminalResourceRequestConfig.from(completions.resourceRequestConfig) : undefined,
        };
    }
    TerminalCompletionList.from = from;
})(TerminalCompletionList || (TerminalCompletionList = {}));
export var TerminalResourceRequestConfig;
(function (TerminalResourceRequestConfig) {
    function from(resourceRequestConfig) {
        return {
            ...resourceRequestConfig,
            pathSeparator: isWindows ? '\\' : '/',
            cwd: resourceRequestConfig.cwd ? URI.revive(resourceRequestConfig.cwd) : undefined,
        };
    }
    TerminalResourceRequestConfig.from = from;
})(TerminalResourceRequestConfig || (TerminalResourceRequestConfig = {}));
export var PartialAcceptInfo;
(function (PartialAcceptInfo) {
    function to(info) {
        return {
            kind: PartialAcceptTriggerKind.to(info.kind),
            acceptedLength: info.acceptedLength,
        };
    }
    PartialAcceptInfo.to = to;
})(PartialAcceptInfo || (PartialAcceptInfo = {}));
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    function to(kind) {
        switch (kind) {
            case 0 /* languages.PartialAcceptTriggerKind.Word */:
                return types.PartialAcceptTriggerKind.Word;
            case 1 /* languages.PartialAcceptTriggerKind.Line */:
                return types.PartialAcceptTriggerKind.Line;
            case 2 /* languages.PartialAcceptTriggerKind.Suggest */:
                return types.PartialAcceptTriggerKind.Suggest;
            default:
                return types.PartialAcceptTriggerKind.Unknown;
        }
    }
    PartialAcceptTriggerKind.to = to;
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var DebugTreeItem;
(function (DebugTreeItem) {
    function from(item, id) {
        return {
            id,
            label: item.label,
            description: item.description,
            canEdit: item.canEdit,
            collapsibleState: (item.collapsibleState || 0 /* DebugTreeItemCollapsibleState.None */),
            contextValue: item.contextValue,
        };
    }
    DebugTreeItem.from = from;
})(DebugTreeItem || (DebugTreeItem = {}));
export var LanguageModelToolDescription;
(function (LanguageModelToolDescription) {
    function to(item) {
        return {
            // Note- the reason this is a unique 'name' is just to avoid confusion with the toolCallId
            name: item.id,
            description: item.modelDescription,
            inputSchema: item.inputSchema,
            tags: item.tags ?? [],
        };
    }
    LanguageModelToolDescription.to = to;
})(LanguageModelToolDescription || (LanguageModelToolDescription = {}));
export var LanguageModelToolResult;
(function (LanguageModelToolResult) {
    function to(result) {
        return new types.LanguageModelToolResult(result.content.map(item => {
            if (item.kind === 'text') {
                return new types.LanguageModelTextPart(item.value);
            }
            else {
                return new types.LanguageModelPromptTsxPart(item.value);
            }
        }));
    }
    LanguageModelToolResult.to = to;
    function from(result, extension) {
        if (result.toolResultMessage) {
            checkProposedApiEnabled(extension, 'chatParticipantPrivate');
        }
        return {
            content: result.content.map(item => {
                if (item instanceof types.LanguageModelTextPart) {
                    return {
                        kind: 'text',
                        value: item.value
                    };
                }
                else if (item instanceof types.LanguageModelPromptTsxPart) {
                    return {
                        kind: 'promptTsx',
                        value: item.value,
                    };
                }
                else {
                    throw new Error('Unknown LanguageModelToolResult part type');
                }
            }),
            toolResultMessage: MarkdownString.fromStrict(result.toolResultMessage),
            toolResultDetails: result.toolResultDetails?.map(detail => URI.isUri(detail) ? detail : Location.from(detail)),
        };
    }
    LanguageModelToolResult.from = from;
})(LanguageModelToolResult || (LanguageModelToolResult = {}));
export var IconPath;
(function (IconPath) {
    function fromThemeIcon(iconPath) {
        return iconPath;
    }
    IconPath.fromThemeIcon = fromThemeIcon;
})(IconPath || (IconPath = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEUsT0FBTyxFQUF3QyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RSxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUs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QyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxnREFBd0M7UUFDMUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw2Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxpREFBeUM7UUFDNUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSw4Q0FBc0M7UUFDdEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSw4Q0FBc0M7UUFDdEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxnREFBd0M7UUFDMUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw4Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxpREFBd0M7UUFDMUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsVUFBVSxtREFBMEM7UUFDOUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxnREFBdUM7UUFDeEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxnREFBdUM7UUFDeEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw4Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxrREFBeUM7UUFDNUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSwrQ0FBc0M7UUFDdEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw4Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxpREFBd0M7UUFDMUUsQ0FB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