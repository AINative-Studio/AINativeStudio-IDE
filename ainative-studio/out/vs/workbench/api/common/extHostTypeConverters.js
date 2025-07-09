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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUeXBlQ29udmVydGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hFLE9BQU8sRUFBd0MsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUUsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZFLE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFF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QUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsZ0RBQXdDO1FBQzFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssNkNBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsaURBQXlDO1FBQzVFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sOENBQXNDO1FBQ3RFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sOENBQXNDO1FBQ3RFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsZ0RBQXdDO1FBQzFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssOENBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsaURBQXdDO1FBQzFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsbURBQTBDO1FBQzlFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sZ0RBQXVDO1FBQ3hFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sZ0RBQXVDO1FBQ3hFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssOENBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsa0RBQXlDO1FBQzVFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sK0NBQXNDO1FBQ3RFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssOENBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsaURBQXdDO1FBQzFFLENB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