/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../base/common/codicons.js';
import { URI } from '../../base/common/uri.js';
import { EditOperation } from './core/editOperation.js';
import { Range } from './core/range.js';
import { TokenizationRegistry as TokenizationRegistryImpl } from './tokenizationRegistry.js';
import { localize } from '../../nls.js';
export class Token {
    constructor(offset, type, language) {
        this.offset = offset;
        this.type = type;
        this.language = language;
        this._tokenBrand = undefined;
    }
    toString() {
        return '(' + this.offset + ', ' + this.type + ')';
    }
}
/**
 * @internal
 */
export class TokenizationResult {
    constructor(tokens, endState) {
        this.tokens = tokens;
        this.endState = endState;
        this._tokenizationResultBrand = undefined;
    }
}
/**
 * @internal
 */
export class EncodedTokenizationResult {
    constructor(
    /**
     * The tokens in binary format. Each token occupies two array indices. For token i:
     *  - at offset 2*i => startIndex
     *  - at offset 2*i + 1 => metadata
     *
     */
    tokens, endState) {
        this.tokens = tokens;
        this.endState = endState;
        this._encodedTokenizationResultBrand = undefined;
    }
}
export var HoverVerbosityAction;
(function (HoverVerbosityAction) {
    /**
     * Increase the verbosity of the hover
     */
    HoverVerbosityAction[HoverVerbosityAction["Increase"] = 0] = "Increase";
    /**
     * Decrease the verbosity of the hover
     */
    HoverVerbosityAction[HoverVerbosityAction["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Method"] = 0] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 1] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 2] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 3] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 4] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 5] = "Class";
    CompletionItemKind[CompletionItemKind["Struct"] = 6] = "Struct";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Event"] = 10] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 11] = "Operator";
    CompletionItemKind[CompletionItemKind["Unit"] = 12] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 13] = "Value";
    CompletionItemKind[CompletionItemKind["Constant"] = 14] = "Constant";
    CompletionItemKind[CompletionItemKind["Enum"] = 15] = "Enum";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 16] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Keyword"] = 17] = "Keyword";
    CompletionItemKind[CompletionItemKind["Text"] = 18] = "Text";
    CompletionItemKind[CompletionItemKind["Color"] = 19] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 20] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 21] = "Reference";
    CompletionItemKind[CompletionItemKind["Customcolor"] = 22] = "Customcolor";
    CompletionItemKind[CompletionItemKind["Folder"] = 23] = "Folder";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
    CompletionItemKind[CompletionItemKind["User"] = 25] = "User";
    CompletionItemKind[CompletionItemKind["Issue"] = 26] = "Issue";
    CompletionItemKind[CompletionItemKind["Snippet"] = 27] = "Snippet";
})(CompletionItemKind || (CompletionItemKind = {}));
/**
 * @internal
 */
export var CompletionItemKinds;
(function (CompletionItemKinds) {
    const byKind = new Map();
    byKind.set(0 /* CompletionItemKind.Method */, Codicon.symbolMethod);
    byKind.set(1 /* CompletionItemKind.Function */, Codicon.symbolFunction);
    byKind.set(2 /* CompletionItemKind.Constructor */, Codicon.symbolConstructor);
    byKind.set(3 /* CompletionItemKind.Field */, Codicon.symbolField);
    byKind.set(4 /* CompletionItemKind.Variable */, Codicon.symbolVariable);
    byKind.set(5 /* CompletionItemKind.Class */, Codicon.symbolClass);
    byKind.set(6 /* CompletionItemKind.Struct */, Codicon.symbolStruct);
    byKind.set(7 /* CompletionItemKind.Interface */, Codicon.symbolInterface);
    byKind.set(8 /* CompletionItemKind.Module */, Codicon.symbolModule);
    byKind.set(9 /* CompletionItemKind.Property */, Codicon.symbolProperty);
    byKind.set(10 /* CompletionItemKind.Event */, Codicon.symbolEvent);
    byKind.set(11 /* CompletionItemKind.Operator */, Codicon.symbolOperator);
    byKind.set(12 /* CompletionItemKind.Unit */, Codicon.symbolUnit);
    byKind.set(13 /* CompletionItemKind.Value */, Codicon.symbolValue);
    byKind.set(15 /* CompletionItemKind.Enum */, Codicon.symbolEnum);
    byKind.set(14 /* CompletionItemKind.Constant */, Codicon.symbolConstant);
    byKind.set(15 /* CompletionItemKind.Enum */, Codicon.symbolEnum);
    byKind.set(16 /* CompletionItemKind.EnumMember */, Codicon.symbolEnumMember);
    byKind.set(17 /* CompletionItemKind.Keyword */, Codicon.symbolKeyword);
    byKind.set(27 /* CompletionItemKind.Snippet */, Codicon.symbolSnippet);
    byKind.set(18 /* CompletionItemKind.Text */, Codicon.symbolText);
    byKind.set(19 /* CompletionItemKind.Color */, Codicon.symbolColor);
    byKind.set(20 /* CompletionItemKind.File */, Codicon.symbolFile);
    byKind.set(21 /* CompletionItemKind.Reference */, Codicon.symbolReference);
    byKind.set(22 /* CompletionItemKind.Customcolor */, Codicon.symbolCustomColor);
    byKind.set(23 /* CompletionItemKind.Folder */, Codicon.symbolFolder);
    byKind.set(24 /* CompletionItemKind.TypeParameter */, Codicon.symbolTypeParameter);
    byKind.set(25 /* CompletionItemKind.User */, Codicon.account);
    byKind.set(26 /* CompletionItemKind.Issue */, Codicon.issues);
    /**
     * @internal
     */
    function toIcon(kind) {
        let codicon = byKind.get(kind);
        if (!codicon) {
            console.info('No codicon found for CompletionItemKind ' + kind);
            codicon = Codicon.symbolProperty;
        }
        return codicon;
    }
    CompletionItemKinds.toIcon = toIcon;
    /**
     * @internal
     */
    function toLabel(kind) {
        switch (kind) {
            case 0 /* CompletionItemKind.Method */: return localize('suggestWidget.kind.method', 'Method');
            case 1 /* CompletionItemKind.Function */: return localize('suggestWidget.kind.function', 'Function');
            case 2 /* CompletionItemKind.Constructor */: return localize('suggestWidget.kind.constructor', 'Constructor');
            case 3 /* CompletionItemKind.Field */: return localize('suggestWidget.kind.field', 'Field');
            case 4 /* CompletionItemKind.Variable */: return localize('suggestWidget.kind.variable', 'Variable');
            case 5 /* CompletionItemKind.Class */: return localize('suggestWidget.kind.class', 'Class');
            case 6 /* CompletionItemKind.Struct */: return localize('suggestWidget.kind.struct', 'Struct');
            case 7 /* CompletionItemKind.Interface */: return localize('suggestWidget.kind.interface', 'Interface');
            case 8 /* CompletionItemKind.Module */: return localize('suggestWidget.kind.module', 'Module');
            case 9 /* CompletionItemKind.Property */: return localize('suggestWidget.kind.property', 'Property');
            case 10 /* CompletionItemKind.Event */: return localize('suggestWidget.kind.event', 'Event');
            case 11 /* CompletionItemKind.Operator */: return localize('suggestWidget.kind.operator', 'Operator');
            case 12 /* CompletionItemKind.Unit */: return localize('suggestWidget.kind.unit', 'Unit');
            case 13 /* CompletionItemKind.Value */: return localize('suggestWidget.kind.value', 'Value');
            case 14 /* CompletionItemKind.Constant */: return localize('suggestWidget.kind.constant', 'Constant');
            case 15 /* CompletionItemKind.Enum */: return localize('suggestWidget.kind.enum', 'Enum');
            case 16 /* CompletionItemKind.EnumMember */: return localize('suggestWidget.kind.enumMember', 'Enum Member');
            case 17 /* CompletionItemKind.Keyword */: return localize('suggestWidget.kind.keyword', 'Keyword');
            case 18 /* CompletionItemKind.Text */: return localize('suggestWidget.kind.text', 'Text');
            case 19 /* CompletionItemKind.Color */: return localize('suggestWidget.kind.color', 'Color');
            case 20 /* CompletionItemKind.File */: return localize('suggestWidget.kind.file', 'File');
            case 21 /* CompletionItemKind.Reference */: return localize('suggestWidget.kind.reference', 'Reference');
            case 22 /* CompletionItemKind.Customcolor */: return localize('suggestWidget.kind.customcolor', 'Custom Color');
            case 23 /* CompletionItemKind.Folder */: return localize('suggestWidget.kind.folder', 'Folder');
            case 24 /* CompletionItemKind.TypeParameter */: return localize('suggestWidget.kind.typeParameter', 'Type Parameter');
            case 25 /* CompletionItemKind.User */: return localize('suggestWidget.kind.user', 'User');
            case 26 /* CompletionItemKind.Issue */: return localize('suggestWidget.kind.issue', 'Issue');
            case 27 /* CompletionItemKind.Snippet */: return localize('suggestWidget.kind.snippet', 'Snippet');
            default: return '';
        }
    }
    CompletionItemKinds.toLabel = toLabel;
    const data = new Map();
    data.set('method', 0 /* CompletionItemKind.Method */);
    data.set('function', 1 /* CompletionItemKind.Function */);
    data.set('constructor', 2 /* CompletionItemKind.Constructor */);
    data.set('field', 3 /* CompletionItemKind.Field */);
    data.set('variable', 4 /* CompletionItemKind.Variable */);
    data.set('class', 5 /* CompletionItemKind.Class */);
    data.set('struct', 6 /* CompletionItemKind.Struct */);
    data.set('interface', 7 /* CompletionItemKind.Interface */);
    data.set('module', 8 /* CompletionItemKind.Module */);
    data.set('property', 9 /* CompletionItemKind.Property */);
    data.set('event', 10 /* CompletionItemKind.Event */);
    data.set('operator', 11 /* CompletionItemKind.Operator */);
    data.set('unit', 12 /* CompletionItemKind.Unit */);
    data.set('value', 13 /* CompletionItemKind.Value */);
    data.set('constant', 14 /* CompletionItemKind.Constant */);
    data.set('enum', 15 /* CompletionItemKind.Enum */);
    data.set('enum-member', 16 /* CompletionItemKind.EnumMember */);
    data.set('enumMember', 16 /* CompletionItemKind.EnumMember */);
    data.set('keyword', 17 /* CompletionItemKind.Keyword */);
    data.set('snippet', 27 /* CompletionItemKind.Snippet */);
    data.set('text', 18 /* CompletionItemKind.Text */);
    data.set('color', 19 /* CompletionItemKind.Color */);
    data.set('file', 20 /* CompletionItemKind.File */);
    data.set('reference', 21 /* CompletionItemKind.Reference */);
    data.set('customcolor', 22 /* CompletionItemKind.Customcolor */);
    data.set('folder', 23 /* CompletionItemKind.Folder */);
    data.set('type-parameter', 24 /* CompletionItemKind.TypeParameter */);
    data.set('typeParameter', 24 /* CompletionItemKind.TypeParameter */);
    data.set('account', 25 /* CompletionItemKind.User */);
    data.set('issue', 26 /* CompletionItemKind.Issue */);
    /**
     * @internal
     */
    function fromString(value, strict) {
        let res = data.get(value);
        if (typeof res === 'undefined' && !strict) {
            res = 9 /* CompletionItemKind.Property */;
        }
        return res;
    }
    CompletionItemKinds.fromString = fromString;
})(CompletionItemKinds || (CompletionItemKinds = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
export var CompletionItemInsertTextRule;
(function (CompletionItemInsertTextRule) {
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["None"] = 0] = "None";
    /**
     * Adjust whitespace/indentation of multiline insert texts to
     * match the current line indentation.
     */
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["KeepWhitespace"] = 1] = "KeepWhitespace";
    /**
     * `insertText` is a snippet.
     */
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["InsertAsSnippet"] = 4] = "InsertAsSnippet";
})(CompletionItemInsertTextRule || (CompletionItemInsertTextRule = {}));
/**
 * How a partial acceptance was triggered.
 */
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 0] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 1] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 2] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
/**
 * How a suggest provider was triggered.
 */
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
/**
 * How an {@link InlineCompletionsProvider inline completion provider} was triggered.
 */
export var InlineCompletionTriggerKind;
(function (InlineCompletionTriggerKind) {
    /**
     * Completion was triggered automatically while editing.
     * It is sufficient to return a single completion item in this case.
     */
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Automatic"] = 0] = "Automatic";
    /**
     * Completion was triggered explicitly by a user gesture.
     * Return multiple completion items to enable cycling through them.
     */
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Explicit"] = 1] = "Explicit";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
export class SelectedSuggestionInfo {
    constructor(range, text, completionKind, isSnippetText) {
        this.range = range;
        this.text = text;
        this.completionKind = completionKind;
        this.isSnippetText = isSnippetText;
    }
    equals(other) {
        return Range.lift(this.range).equalsRange(other.range)
            && this.text === other.text
            && this.completionKind === other.completionKind
            && this.isSnippetText === other.isSnippetText;
    }
}
export var CodeActionTriggerType;
(function (CodeActionTriggerType) {
    CodeActionTriggerType[CodeActionTriggerType["Invoke"] = 1] = "Invoke";
    CodeActionTriggerType[CodeActionTriggerType["Auto"] = 2] = "Auto";
})(CodeActionTriggerType || (CodeActionTriggerType = {}));
/**
 * @internal
 */
export var DocumentPasteTriggerKind;
(function (DocumentPasteTriggerKind) {
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["Automatic"] = 0] = "Automatic";
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
/**
 * A document highlight kind.
 */
export var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    /**
     * A textual occurrence.
     */
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    /**
     * Read-access of a symbol, like reading a variable.
     */
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    /**
     * Write-access of a symbol, like writing to a variable.
     */
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
/**
 * @internal
 */
export function isLocationLink(thing) {
    return thing
        && URI.isUri(thing.uri)
        && Range.isIRange(thing.range)
        && (Range.isIRange(thing.originSelectionRange) || Range.isIRange(thing.targetSelectionRange));
}
/**
 * @internal
 */
export function isLocation(thing) {
    return thing
        && URI.isUri(thing.uri)
        && Range.isIRange(thing.range);
}
/**
 * A symbol kind.
 */
export var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
/**
 * @internal
 */
export const symbolKindNames = {
    [17 /* SymbolKind.Array */]: localize('Array', "array"),
    [16 /* SymbolKind.Boolean */]: localize('Boolean', "boolean"),
    [4 /* SymbolKind.Class */]: localize('Class', "class"),
    [13 /* SymbolKind.Constant */]: localize('Constant', "constant"),
    [8 /* SymbolKind.Constructor */]: localize('Constructor', "constructor"),
    [9 /* SymbolKind.Enum */]: localize('Enum', "enumeration"),
    [21 /* SymbolKind.EnumMember */]: localize('EnumMember', "enumeration member"),
    [23 /* SymbolKind.Event */]: localize('Event', "event"),
    [7 /* SymbolKind.Field */]: localize('Field', "field"),
    [0 /* SymbolKind.File */]: localize('File', "file"),
    [11 /* SymbolKind.Function */]: localize('Function', "function"),
    [10 /* SymbolKind.Interface */]: localize('Interface', "interface"),
    [19 /* SymbolKind.Key */]: localize('Key', "key"),
    [5 /* SymbolKind.Method */]: localize('Method', "method"),
    [1 /* SymbolKind.Module */]: localize('Module', "module"),
    [2 /* SymbolKind.Namespace */]: localize('Namespace', "namespace"),
    [20 /* SymbolKind.Null */]: localize('Null', "null"),
    [15 /* SymbolKind.Number */]: localize('Number', "number"),
    [18 /* SymbolKind.Object */]: localize('Object', "object"),
    [24 /* SymbolKind.Operator */]: localize('Operator', "operator"),
    [3 /* SymbolKind.Package */]: localize('Package', "package"),
    [6 /* SymbolKind.Property */]: localize('Property', "property"),
    [14 /* SymbolKind.String */]: localize('String', "string"),
    [22 /* SymbolKind.Struct */]: localize('Struct', "struct"),
    [25 /* SymbolKind.TypeParameter */]: localize('TypeParameter', "type parameter"),
    [12 /* SymbolKind.Variable */]: localize('Variable', "variable"),
};
/**
 * @internal
 */
export function getAriaLabelForSymbol(symbolName, kind) {
    return localize('symbolAriaLabel', '{0} ({1})', symbolName, symbolKindNames[kind]);
}
export var SymbolTag;
(function (SymbolTag) {
    SymbolTag[SymbolTag["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
/**
 * @internal
 */
export var SymbolKinds;
(function (SymbolKinds) {
    const byKind = new Map();
    byKind.set(0 /* SymbolKind.File */, Codicon.symbolFile);
    byKind.set(1 /* SymbolKind.Module */, Codicon.symbolModule);
    byKind.set(2 /* SymbolKind.Namespace */, Codicon.symbolNamespace);
    byKind.set(3 /* SymbolKind.Package */, Codicon.symbolPackage);
    byKind.set(4 /* SymbolKind.Class */, Codicon.symbolClass);
    byKind.set(5 /* SymbolKind.Method */, Codicon.symbolMethod);
    byKind.set(6 /* SymbolKind.Property */, Codicon.symbolProperty);
    byKind.set(7 /* SymbolKind.Field */, Codicon.symbolField);
    byKind.set(8 /* SymbolKind.Constructor */, Codicon.symbolConstructor);
    byKind.set(9 /* SymbolKind.Enum */, Codicon.symbolEnum);
    byKind.set(10 /* SymbolKind.Interface */, Codicon.symbolInterface);
    byKind.set(11 /* SymbolKind.Function */, Codicon.symbolFunction);
    byKind.set(12 /* SymbolKind.Variable */, Codicon.symbolVariable);
    byKind.set(13 /* SymbolKind.Constant */, Codicon.symbolConstant);
    byKind.set(14 /* SymbolKind.String */, Codicon.symbolString);
    byKind.set(15 /* SymbolKind.Number */, Codicon.symbolNumber);
    byKind.set(16 /* SymbolKind.Boolean */, Codicon.symbolBoolean);
    byKind.set(17 /* SymbolKind.Array */, Codicon.symbolArray);
    byKind.set(18 /* SymbolKind.Object */, Codicon.symbolObject);
    byKind.set(19 /* SymbolKind.Key */, Codicon.symbolKey);
    byKind.set(20 /* SymbolKind.Null */, Codicon.symbolNull);
    byKind.set(21 /* SymbolKind.EnumMember */, Codicon.symbolEnumMember);
    byKind.set(22 /* SymbolKind.Struct */, Codicon.symbolStruct);
    byKind.set(23 /* SymbolKind.Event */, Codicon.symbolEvent);
    byKind.set(24 /* SymbolKind.Operator */, Codicon.symbolOperator);
    byKind.set(25 /* SymbolKind.TypeParameter */, Codicon.symbolTypeParameter);
    /**
     * @internal
     */
    function toIcon(kind) {
        let icon = byKind.get(kind);
        if (!icon) {
            console.info('No codicon found for SymbolKind ' + kind);
            icon = Codicon.symbolProperty;
        }
        return icon;
    }
    SymbolKinds.toIcon = toIcon;
    const byCompletionKind = new Map();
    byCompletionKind.set(0 /* SymbolKind.File */, 20 /* CompletionItemKind.File */);
    byCompletionKind.set(1 /* SymbolKind.Module */, 8 /* CompletionItemKind.Module */);
    byCompletionKind.set(2 /* SymbolKind.Namespace */, 8 /* CompletionItemKind.Module */);
    byCompletionKind.set(3 /* SymbolKind.Package */, 8 /* CompletionItemKind.Module */);
    byCompletionKind.set(4 /* SymbolKind.Class */, 5 /* CompletionItemKind.Class */);
    byCompletionKind.set(5 /* SymbolKind.Method */, 0 /* CompletionItemKind.Method */);
    byCompletionKind.set(6 /* SymbolKind.Property */, 9 /* CompletionItemKind.Property */);
    byCompletionKind.set(7 /* SymbolKind.Field */, 3 /* CompletionItemKind.Field */);
    byCompletionKind.set(8 /* SymbolKind.Constructor */, 2 /* CompletionItemKind.Constructor */);
    byCompletionKind.set(9 /* SymbolKind.Enum */, 15 /* CompletionItemKind.Enum */);
    byCompletionKind.set(10 /* SymbolKind.Interface */, 7 /* CompletionItemKind.Interface */);
    byCompletionKind.set(11 /* SymbolKind.Function */, 1 /* CompletionItemKind.Function */);
    byCompletionKind.set(12 /* SymbolKind.Variable */, 4 /* CompletionItemKind.Variable */);
    byCompletionKind.set(13 /* SymbolKind.Constant */, 14 /* CompletionItemKind.Constant */);
    byCompletionKind.set(14 /* SymbolKind.String */, 18 /* CompletionItemKind.Text */);
    byCompletionKind.set(15 /* SymbolKind.Number */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(16 /* SymbolKind.Boolean */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(17 /* SymbolKind.Array */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(18 /* SymbolKind.Object */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(19 /* SymbolKind.Key */, 17 /* CompletionItemKind.Keyword */);
    byCompletionKind.set(20 /* SymbolKind.Null */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(21 /* SymbolKind.EnumMember */, 16 /* CompletionItemKind.EnumMember */);
    byCompletionKind.set(22 /* SymbolKind.Struct */, 6 /* CompletionItemKind.Struct */);
    byCompletionKind.set(23 /* SymbolKind.Event */, 10 /* CompletionItemKind.Event */);
    byCompletionKind.set(24 /* SymbolKind.Operator */, 11 /* CompletionItemKind.Operator */);
    byCompletionKind.set(25 /* SymbolKind.TypeParameter */, 24 /* CompletionItemKind.TypeParameter */);
    /**
     * @internal
     */
    function toCompletionKind(kind) {
        let completionKind = byCompletionKind.get(kind);
        if (completionKind === undefined) {
            console.info('No completion kind found for SymbolKind ' + kind);
            completionKind = 20 /* CompletionItemKind.File */;
        }
        return completionKind;
    }
    SymbolKinds.toCompletionKind = toCompletionKind;
})(SymbolKinds || (SymbolKinds = {}));
/** @internal */
export class TextEdit {
    static asEditOperation(edit) {
        return EditOperation.replace(Range.lift(edit.range), edit.text);
    }
    static isTextEdit(thing) {
        const possibleTextEdit = thing;
        return typeof possibleTextEdit.text === 'string' && Range.isIRange(possibleTextEdit.range);
    }
}
export class FoldingRangeKind {
    /**
     * Kind for folding range representing a comment. The value of the kind is 'comment'.
     */
    static { this.Comment = new FoldingRangeKind('comment'); }
    /**
     * Kind for folding range representing a import. The value of the kind is 'imports'.
     */
    static { this.Imports = new FoldingRangeKind('imports'); }
    /**
     * Kind for folding range representing regions (for example marked by `#region`, `#endregion`).
     * The value of the kind is 'region'.
     */
    static { this.Region = new FoldingRangeKind('region'); }
    /**
     * Returns a {@link FoldingRangeKind} for the given value.
     *
     * @param value of the kind.
     */
    static fromValue(value) {
        switch (value) {
            case 'comment': return FoldingRangeKind.Comment;
            case 'imports': return FoldingRangeKind.Imports;
            case 'region': return FoldingRangeKind.Region;
        }
        return new FoldingRangeKind(value);
    }
    /**
     * Creates a new {@link FoldingRangeKind}.
     *
     * @param value of the kind.
     */
    constructor(value) {
        this.value = value;
    }
}
export var NewSymbolNameTag;
(function (NewSymbolNameTag) {
    NewSymbolNameTag[NewSymbolNameTag["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
export var NewSymbolNameTriggerKind;
(function (NewSymbolNameTriggerKind) {
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Invoke"] = 0] = "Invoke";
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
/**
 * @internal
 */
export var Command;
(function (Command) {
    /**
     * @internal
     */
    function is(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        return typeof obj.id === 'string' &&
            typeof obj.title === 'string';
    }
    Command.is = is;
})(Command || (Command = {}));
/**
 * @internal
 */
export var CommentThreadCollapsibleState;
(function (CommentThreadCollapsibleState) {
    /**
     * Determines an item is collapsed
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Collapsed"] = 0] = "Collapsed";
    /**
     * Determines an item is expanded
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
/**
 * @internal
 */
export var CommentThreadState;
(function (CommentThreadState) {
    CommentThreadState[CommentThreadState["Unresolved"] = 0] = "Unresolved";
    CommentThreadState[CommentThreadState["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
/**
 * @internal
 */
export var CommentThreadApplicability;
(function (CommentThreadApplicability) {
    CommentThreadApplicability[CommentThreadApplicability["Current"] = 0] = "Current";
    CommentThreadApplicability[CommentThreadApplicability["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
/**
 * @internal
 */
export var CommentMode;
(function (CommentMode) {
    CommentMode[CommentMode["Editing"] = 0] = "Editing";
    CommentMode[CommentMode["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
/**
 * @internal
 */
export var CommentState;
(function (CommentState) {
    CommentState[CommentState["Published"] = 0] = "Published";
    CommentState[CommentState["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
/**
 * @internal
 */
export class LazyTokenizationSupport {
    constructor(createSupport) {
        this.createSupport = createSupport;
        this._tokenizationSupport = null;
    }
    dispose() {
        if (this._tokenizationSupport) {
            this._tokenizationSupport.then((support) => {
                if (support) {
                    support.dispose();
                }
            });
        }
    }
    get tokenizationSupport() {
        if (!this._tokenizationSupport) {
            this._tokenizationSupport = this.createSupport();
        }
        return this._tokenizationSupport;
    }
}
/**
 * @internal
 */
export const TokenizationRegistry = new TokenizationRegistryImpl();
/**
 * @internal
 */
export const TreeSitterTokenizationRegistry = new TokenizationRegistryImpl();
/**
 * @internal
 */
export var ExternalUriOpenerPriority;
(function (ExternalUriOpenerPriority) {
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["None"] = 0] = "None";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Option"] = 1] = "Option";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Default"] = 2] = "Default";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));
export var InlineEditTriggerKind;
(function (InlineEditTriggerKind) {
    InlineEditTriggerKind[InlineEditTriggerKind["Invoke"] = 0] = "Invoke";
    InlineEditTriggerKind[InlineEditTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineEditTriggerKind || (InlineEditTriggerKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBUXhELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sMEJBQTBCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx5QkFBeUIsQ0FBQztBQUU5RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFLaEQsT0FBTyxFQUFFLG9CQUFvQixJQUFJLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQWlCeEMsTUFBTSxPQUFPLEtBQUs7SUFHakIsWUFDaUIsTUFBYyxFQUNkLElBQVksRUFDWixRQUFnQjtRQUZoQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLGFBQVEsR0FBUixRQUFRLENBQVE7UUFMakMsZ0JBQVcsR0FBUyxTQUFTLENBQUM7SUFPOUIsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztJQUNuRCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFHOUIsWUFDaUIsTUFBZSxFQUNmLFFBQWdCO1FBRGhCLFdBQU0sR0FBTixNQUFNLENBQVM7UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBSmpDLDZCQUF3QixHQUFTLFNBQVMsQ0FBQztJQU0zQyxDQUFDO0NB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