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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQVF4RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDBCQUEwQixDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0seUJBQXlCLENBQUM7QUFFOUUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBS2hELE9BQU8sRUFBRSxvQkFBb0IsSUFBSSx3QkFBd0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFpQnhDLE1BQU0sT0FBTyxLQUFLO0lBR2pCLFlBQ2lCLE1BQWMsRUFDZCxJQUFZLEVBQ1osUUFBZ0I7UUFGaEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBTGpDLGdCQUFXLEdBQVMsU0FBUyxDQUFDO0lBTzlCLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7SUFDbkQsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBRzlCLFlBQ2lCLE1BQWUsRUFDZixRQUFnQjtRQURoQixXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQ2YsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUpqQyw2QkFBd0IsR0FBUyxTQUFTLENBQUM7SUFNM0MsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8seUJBQXlCO0lBR3JDO0lBQ0M7Ozs7O09BS0c7SUFDYSxNQUFtQixFQUNuQixRQUFnQjtRQURoQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLGFBQVEsR0FBUixRQUFRLENBQVE7UUFWakMsb0NBQStCLEdBQVMsU0FBUyxDQUFDO0lBWWxELENBQUM7Q0FDRDtBQW1LRCxNQUFNLENBQU4sSUFBWSxvQkFTWDtBQVRELFdBQVksb0JBQW9CO0lBQy9COztPQUVHO0lBQ0gsdUVBQVEsQ0FBQTtJQUNSOztPQUVHO0lBQ0gsdUVBQVEsQ0FBQTtBQUNULENBQUMsRUFUVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBUy9CO0FBb0dELE1BQU0sQ0FBTixJQUFrQixrQkE2QmpCO0FBN0JELFdBQWtCLGtCQUFrQjtJQUNuQywrREFBTSxDQUFBO0lBQ04sbUVBQVEsQ0FBQTtJQUNSLHlFQUFXLENBQUE7SUFDWCw2REFBSyxDQUFBO0lBQ0wsbUVBQVEsQ0FBQTtJQUNSLDZEQUFLLENBQUE7SUFDTCwrREFBTSxDQUFBO0lBQ04scUVBQVMsQ0FBQTtJQUNULCtEQUFNLENBQUE7SUFDTixtRUFBUSxDQUFBO0lBQ1IsOERBQUssQ0FBQTtJQUNMLG9FQUFRLENBQUE7SUFDUiw0REFBSSxDQUFBO0lBQ0osOERBQUssQ0FBQTtJQUNMLG9FQUFRLENBQUE7SUFDUiw0REFBSSxDQUFBO0lBQ0osd0VBQVUsQ0FBQTtJQUNWLGtFQUFPLENBQUE7SUFDUCw0REFBSSxDQUFBO0lBQ0osOERBQUssQ0FBQTtJQUNMLDREQUFJLENBQUE7SUFDSixzRUFBUyxDQUFBO0lBQ1QsMEVBQVcsQ0FBQTtJQUNYLGdFQUFNLENBQUE7SUFDTiw4RUFBYSxDQUFBO0lBQ2IsNERBQUksQ0FBQTtJQUNKLDhEQUFLLENBQUE7SUFDTCxrRUFBTyxDQUFBO0FBQ1IsQ0FBQyxFQTdCaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQTZCbkM7QUFFRDs7R0FFRztBQUNILE1BQU0sS0FBVyxtQkFBbUIsQ0FvSW5DO0FBcElELFdBQWlCLG1CQUFtQjtJQUVuQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztJQUN4RCxNQUFNLENBQUMsR0FBRyxvQ0FBNEIsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVELE1BQU0sQ0FBQyxHQUFHLHNDQUE4QixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsTUFBTSxDQUFDLEdBQUcseUNBQWlDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sQ0FBQyxHQUFHLG1DQUEyQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUQsTUFBTSxDQUFDLEdBQUcsc0NBQThCLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNoRSxNQUFNLENBQUMsR0FBRyxtQ0FBMkIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxHQUFHLG9DQUE0QixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUQsTUFBTSxDQUFDLEdBQUcsdUNBQStCLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsRSxNQUFNLENBQUMsR0FBRyxvQ0FBNEIsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVELE1BQU0sQ0FBQyxHQUFHLHNDQUE4QixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsR0FBRyx1Q0FBOEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2hFLE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEQsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxHQUFHLHVDQUE4QixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsTUFBTSxDQUFDLEdBQUcsbUNBQTBCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN4RCxNQUFNLENBQUMsR0FBRyx5Q0FBZ0MsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDcEUsTUFBTSxDQUFDLEdBQUcsc0NBQTZCLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM5RCxNQUFNLENBQUMsR0FBRyxzQ0FBNkIsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzlELE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEQsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxHQUFHLHdDQUErQixPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEUsTUFBTSxDQUFDLEdBQUcsMENBQWlDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sQ0FBQyxHQUFHLHFDQUE0QixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUQsTUFBTSxDQUFDLEdBQUcsNENBQW1DLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzFFLE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckQsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVyRDs7T0FFRztJQUNILFNBQWdCLE1BQU0sQ0FBQyxJQUF3QjtRQUM5QyxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsMENBQTBDLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDaEUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDbEMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFQZSwwQkFBTSxTQU9yQixDQUFBO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixPQUFPLENBQUMsSUFBd0I7UUFDL0MsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLHNDQUE4QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYsd0NBQWdDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM3RiwyQ0FBbUMsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3RHLHFDQUE2QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDcEYsd0NBQWdDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM3RixxQ0FBNkIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3BGLHNDQUE4QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYseUNBQWlDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNoRyxzQ0FBOEIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZGLHdDQUFnQyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDN0Ysc0NBQTZCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNwRix5Q0FBZ0MsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzdGLHFDQUE0QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMseUJBQXlCLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakYsc0NBQTZCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNwRix5Q0FBZ0MsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzdGLHFDQUE0QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMseUJBQXlCLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakYsMkNBQWtDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNwRyx3Q0FBK0IsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDRCQUE0QixFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFGLHFDQUE0QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMseUJBQXlCLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakYsc0NBQTZCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNwRixxQ0FBNEIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2pGLDBDQUFpQyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsOEJBQThCLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDaEcsNENBQW1DLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUN2Ryx1Q0FBOEIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZGLDhDQUFxQyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsa0NBQWtDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUM3RyxxQ0FBNEIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2pGLHNDQUE2QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDcEYsd0NBQStCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxRixPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQWhDZSwyQkFBTyxVQWdDdEIsQ0FBQTtJQUVELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO0lBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxvQ0FBNEIsQ0FBQztJQUM5QyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsc0NBQThCLENBQUM7SUFDbEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsc0NBQW1DLENBQUMsQ0FBQztJQUM3RCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sbUNBQTJCLENBQUM7SUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLHNDQUE4QixDQUFDO0lBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxtQ0FBMkIsQ0FBQztJQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsb0NBQTRCLENBQUM7SUFDOUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLHVDQUErQixDQUFDO0lBQ3BELElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxvQ0FBNEIsQ0FBQztJQUM5QyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsc0NBQThCLENBQUM7SUFDbEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLG9DQUEyQixDQUFDO0lBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSx1Q0FBOEIsQ0FBQztJQUNsRCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sbUNBQTBCLENBQUM7SUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLG9DQUEyQixDQUFDO0lBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSx1Q0FBOEIsQ0FBQztJQUNsRCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sbUNBQTBCLENBQUM7SUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLHlDQUFnQyxDQUFDO0lBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSx5Q0FBZ0MsQ0FBQztJQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsc0NBQTZCLENBQUM7SUFDaEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLHNDQUE2QixDQUFDO0lBQ2hELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxtQ0FBMEIsQ0FBQztJQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sb0NBQTJCLENBQUM7SUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLG1DQUEwQixDQUFDO0lBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyx3Q0FBK0IsQ0FBQztJQUNwRCxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsMENBQWlDLENBQUM7SUFDeEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLHFDQUE0QixDQUFDO0lBQzlDLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLDRDQUFtQyxDQUFDO0lBQzdELElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSw0Q0FBbUMsQ0FBQztJQUM1RCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsbUNBQTBCLENBQUM7SUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLG9DQUEyQixDQUFDO0lBVTVDOztPQUVHO0lBQ0gsU0FBZ0IsVUFBVSxDQUFDLEtBQWEsRUFBRSxNQUFnQjtRQUN6RCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLElBQUksT0FBTyxHQUFHLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsR0FBRyxzQ0FBOEIsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBTmUsOEJBQVUsYUFNekIsQ0FBQTtBQUNGLENBQUMsRUFwSWdCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFvSW5DO0FBUUQsTUFBTSxDQUFOLElBQWtCLGlCQUVqQjtBQUZELFdBQWtCLGlCQUFpQjtJQUNsQyxxRUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUZpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBRWxDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDRCQWFqQjtBQWJELFdBQWtCLDRCQUE0QjtJQUM3QywrRUFBUSxDQUFBO0lBRVI7OztPQUdHO0lBQ0gsbUdBQXNCLENBQUE7SUFFdEI7O09BRUc7SUFDSCxxR0FBdUIsQ0FBQTtBQUN4QixDQUFDLEVBYmlCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFhN0M7QUEwSEQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0Isd0JBSWpCO0FBSkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHVFQUFRLENBQUE7SUFDUix1RUFBUSxDQUFBO0lBQ1IsNkVBQVcsQ0FBQTtBQUNaLENBQUMsRUFKaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUl6QztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0QyxxRUFBVSxDQUFBO0lBQ1YseUZBQW9CLENBQUE7SUFDcEIsdUhBQW1DLENBQUE7QUFDcEMsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBcUREOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksMkJBWVg7QUFaRCxXQUFZLDJCQUEyQjtJQUN0Qzs7O09BR0c7SUFDSCx1RkFBYSxDQUFBO0lBRWI7OztPQUdHO0lBQ0gscUZBQVksQ0FBQTtBQUNiLENBQUMsRUFaVywyQkFBMkIsS0FBM0IsMkJBQTJCLFFBWXRDO0FBd0JELE1BQU0sT0FBTyxzQkFBc0I7SUFDbEMsWUFDaUIsS0FBYSxFQUNiLElBQVksRUFDWixjQUFrQyxFQUNsQyxhQUFzQjtRQUh0QixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtRQUNsQyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztJQUV2QyxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQTZCO1FBQzFDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7ZUFDbEQsSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSTtlQUN4QixJQUFJLENBQUMsY0FBYyxLQUFLLEtBQUssQ0FBQyxjQUFjO2VBQzVDLElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FBQztJQUNoRCxDQUFDO0NBQ0Q7QUE4SUQsTUFBTSxDQUFOLElBQWtCLHFCQUdqQjtBQUhELFdBQWtCLHFCQUFxQjtJQUN0QyxxRUFBVSxDQUFBO0lBQ1YsaUVBQVEsQ0FBQTtBQUNULENBQUMsRUFIaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUd0QztBQTRERDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHdCQUdYO0FBSEQsV0FBWSx3QkFBd0I7SUFDbkMsaUZBQWEsQ0FBQTtJQUNiLDZFQUFXLENBQUE7QUFDWixDQUFDLEVBSFcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUduQztBQXFHRCxNQUFNLENBQU4sSUFBWSx3QkFJWDtBQUpELFdBQVksd0JBQXdCO0lBQ25DLDJFQUFVLENBQUE7SUFDViwrRkFBb0IsQ0FBQTtJQUNwQix5RkFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSlcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUluQztBQXdCRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHFCQWFYO0FBYkQsV0FBWSxxQkFBcUI7SUFDaEM7O09BRUc7SUFDSCxpRUFBSSxDQUFBO0lBQ0o7O09BRUc7SUFDSCxpRUFBSSxDQUFBO0lBQ0o7O09BRUc7SUFDSCxtRUFBSyxDQUFBO0FBQ04sQ0FBQyxFQWJXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFhaEM7QUEwSkQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLEtBQVU7SUFDeEMsT0FBTyxLQUFLO1dBQ1IsR0FBRyxDQUFDLEtBQUssQ0FBRSxLQUFzQixDQUFDLEdBQUcsQ0FBQztXQUN0QyxLQUFLLENBQUMsUUFBUSxDQUFFLEtBQXNCLENBQUMsS0FBSyxDQUFDO1dBQzdDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBRSxLQUFzQixDQUFDLG9CQUFvQixDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBRSxLQUFzQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztBQUNwSSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFDLEtBQVU7SUFDcEMsT0FBTyxLQUFLO1dBQ1IsR0FBRyxDQUFDLEtBQUssQ0FBRSxLQUFrQixDQUFDLEdBQUcsQ0FBQztXQUNsQyxLQUFLLENBQUMsUUFBUSxDQUFFLEtBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDL0MsQ0FBQztBQW1ERDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixVQTJCakI7QUEzQkQsV0FBa0IsVUFBVTtJQUMzQiwyQ0FBUSxDQUFBO0lBQ1IsK0NBQVUsQ0FBQTtJQUNWLHFEQUFhLENBQUE7SUFDYixpREFBVyxDQUFBO0lBQ1gsNkNBQVMsQ0FBQTtJQUNULCtDQUFVLENBQUE7SUFDVixtREFBWSxDQUFBO0lBQ1osNkNBQVMsQ0FBQTtJQUNULHlEQUFlLENBQUE7SUFDZiwyQ0FBUSxDQUFBO0lBQ1Isc0RBQWMsQ0FBQTtJQUNkLG9EQUFhLENBQUE7SUFDYixvREFBYSxDQUFBO0lBQ2Isb0RBQWEsQ0FBQTtJQUNiLGdEQUFXLENBQUE7SUFDWCxnREFBVyxDQUFBO0lBQ1gsa0RBQVksQ0FBQTtJQUNaLDhDQUFVLENBQUE7SUFDVixnREFBVyxDQUFBO0lBQ1gsMENBQVEsQ0FBQTtJQUNSLDRDQUFTLENBQUE7SUFDVCx3REFBZSxDQUFBO0lBQ2YsZ0RBQVcsQ0FBQTtJQUNYLDhDQUFVLENBQUE7SUFDVixvREFBYSxDQUFBO0lBQ2IsOERBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQTNCaUIsVUFBVSxLQUFWLFVBQVUsUUEyQjNCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQWlDO0lBQzVELDJCQUFrQixFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0lBQzlDLDZCQUFvQixFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO0lBQ3BELDBCQUFrQixFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0lBQzlDLDhCQUFxQixFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0lBQ3ZELGdDQUF3QixFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO0lBQ2hFLHlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDO0lBQ2xELGdDQUF1QixFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsb0JBQW9CLENBQUM7SUFDckUsMkJBQWtCLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDOUMsMEJBQWtCLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDOUMseUJBQWlCLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFDM0MsOEJBQXFCLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7SUFDdkQsK0JBQXNCLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUM7SUFDMUQseUJBQWdCLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7SUFDeEMsMkJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDakQsMkJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDakQsOEJBQXNCLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUM7SUFDMUQsMEJBQWlCLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFDM0MsNEJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDakQsNEJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDakQsOEJBQXFCLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7SUFDdkQsNEJBQW9CLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7SUFDcEQsNkJBQXFCLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7SUFDdkQsNEJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDakQsNEJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDakQsbUNBQTBCLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztJQUN2RSw4QkFBcUIsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztDQUN2RCxDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsVUFBa0IsRUFBRSxJQUFnQjtJQUN6RSxPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsU0FFakI7QUFGRCxXQUFrQixTQUFTO0lBQzFCLHFEQUFjLENBQUE7QUFDZixDQUFDLEVBRmlCLFNBQVMsS0FBVCxTQUFTLFFBRTFCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLEtBQVcsV0FBVyxDQStFM0I7QUEvRUQsV0FBaUIsV0FBVztJQUUzQixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztJQUNoRCxNQUFNLENBQUMsR0FBRywwQkFBa0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxHQUFHLDRCQUFvQixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEQsTUFBTSxDQUFDLEdBQUcsK0JBQXVCLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsR0FBRyw2QkFBcUIsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RELE1BQU0sQ0FBQyxHQUFHLDJCQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEQsTUFBTSxDQUFDLEdBQUcsNEJBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNwRCxNQUFNLENBQUMsR0FBRyw4QkFBc0IsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxHQUFHLDJCQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEQsTUFBTSxDQUFDLEdBQUcsaUNBQXlCLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlELE1BQU0sQ0FBQyxHQUFHLDBCQUFrQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDaEQsTUFBTSxDQUFDLEdBQUcsZ0NBQXVCLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsR0FBRywrQkFBc0IsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxHQUFHLCtCQUFzQixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDeEQsTUFBTSxDQUFDLEdBQUcsK0JBQXNCLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN4RCxNQUFNLENBQUMsR0FBRyw2QkFBb0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BELE1BQU0sQ0FBQyxHQUFHLDZCQUFvQixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEQsTUFBTSxDQUFDLEdBQUcsOEJBQXFCLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0RCxNQUFNLENBQUMsR0FBRyw0QkFBbUIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxHQUFHLDZCQUFvQixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEQsTUFBTSxDQUFDLEdBQUcsMEJBQWlCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM5QyxNQUFNLENBQUMsR0FBRywyQkFBa0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxHQUFHLGlDQUF3QixPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM1RCxNQUFNLENBQUMsR0FBRyw2QkFBb0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BELE1BQU0sQ0FBQyxHQUFHLDRCQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEQsTUFBTSxDQUFDLEdBQUcsK0JBQXNCLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN4RCxNQUFNLENBQUMsR0FBRyxvQ0FBMkIsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEU7O09BRUc7SUFDSCxTQUFnQixNQUFNLENBQUMsSUFBZ0I7UUFDdEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3hELElBQUksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQy9CLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFQZSxrQkFBTSxTQU9yQixDQUFBO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztJQUNuRSxnQkFBZ0IsQ0FBQyxHQUFHLDJEQUEwQyxDQUFDO0lBQy9ELGdCQUFnQixDQUFDLEdBQUcsOERBQThDLENBQUM7SUFDbkUsZ0JBQWdCLENBQUMsR0FBRyxpRUFBaUQsQ0FBQztJQUN0RSxnQkFBZ0IsQ0FBQyxHQUFHLCtEQUErQyxDQUFDO0lBQ3BFLGdCQUFnQixDQUFDLEdBQUcsNERBQTRDLENBQUM7SUFDakUsZ0JBQWdCLENBQUMsR0FBRyw4REFBOEMsQ0FBQztJQUNuRSxnQkFBZ0IsQ0FBQyxHQUFHLGtFQUFrRCxDQUFDO0lBQ3ZFLGdCQUFnQixDQUFDLEdBQUcsNERBQTRDLENBQUM7SUFDakUsZ0JBQWdCLENBQUMsR0FBRyx3RUFBd0QsQ0FBQztJQUM3RSxnQkFBZ0IsQ0FBQyxHQUFHLDJEQUEwQyxDQUFDO0lBQy9ELGdCQUFnQixDQUFDLEdBQUcscUVBQW9ELENBQUM7SUFDekUsZ0JBQWdCLENBQUMsR0FBRyxtRUFBa0QsQ0FBQztJQUN2RSxnQkFBZ0IsQ0FBQyxHQUFHLG1FQUFrRCxDQUFDO0lBQ3ZFLGdCQUFnQixDQUFDLEdBQUcsb0VBQWtELENBQUM7SUFDdkUsZ0JBQWdCLENBQUMsR0FBRyw4REFBNEMsQ0FBQztJQUNqRSxnQkFBZ0IsQ0FBQyxHQUFHLCtEQUE2QyxDQUFDO0lBQ2xFLGdCQUFnQixDQUFDLEdBQUcsZ0VBQThDLENBQUM7SUFDbkUsZ0JBQWdCLENBQUMsR0FBRyw4REFBNEMsQ0FBQztJQUNqRSxnQkFBZ0IsQ0FBQyxHQUFHLCtEQUE2QyxDQUFDO0lBQ2xFLGdCQUFnQixDQUFDLEdBQUcsOERBQTRDLENBQUM7SUFDakUsZ0JBQWdCLENBQUMsR0FBRyw2REFBMkMsQ0FBQztJQUNoRSxnQkFBZ0IsQ0FBQyxHQUFHLHdFQUFzRCxDQUFDO0lBQzNFLGdCQUFnQixDQUFDLEdBQUcsK0RBQThDLENBQUM7SUFDbkUsZ0JBQWdCLENBQUMsR0FBRyw4REFBNEMsQ0FBQztJQUNqRSxnQkFBZ0IsQ0FBQyxHQUFHLG9FQUFrRCxDQUFDO0lBQ3ZFLGdCQUFnQixDQUFDLEdBQUcsOEVBQTRELENBQUM7SUFDakY7O09BRUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFnQjtRQUNoRCxJQUFJLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEQsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNoRSxjQUFjLG1DQUEwQixDQUFDO1FBQzFDLENBQUM7UUFDRCxPQUFPLGNBQWMsQ0FBQztJQUN2QixDQUFDO0lBUGUsNEJBQWdCLG1CQU8vQixDQUFBO0FBQ0YsQ0FBQyxFQS9FZ0IsV0FBVyxLQUFYLFdBQVcsUUErRTNCO0FBaUNELGdCQUFnQjtBQUNoQixNQUFNLE9BQWdCLFFBQVE7SUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFjO1FBQ3BDLE9BQU8sYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBVTtRQUMzQixNQUFNLGdCQUFnQixHQUFHLEtBQWlCLENBQUM7UUFDM0MsT0FBTyxPQUFPLGdCQUFnQixDQUFDLElBQUksS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1RixDQUFDO0NBQ0Q7QUFpUEQsTUFBTSxPQUFPLGdCQUFnQjtJQUM1Qjs7T0FFRzthQUNhLFlBQU8sR0FBRyxJQUFJLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFEOztPQUVHO2FBQ2EsWUFBTyxHQUFHLElBQUksZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUQ7OztPQUdHO2FBQ2EsV0FBTSxHQUFHLElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFeEQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBYTtRQUM3QixRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxTQUFTLENBQUMsQ0FBQyxPQUFPLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztZQUNoRCxLQUFLLFNBQVMsQ0FBQyxDQUFDLE9BQU8sZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1lBQ2hELEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7UUFDL0MsQ0FBQztRQUNELE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFlBQTBCLEtBQWE7UUFBYixVQUFLLEdBQUwsS0FBSyxDQUFRO0lBQ3ZDLENBQUM7O0FBb0VGLE1BQU0sQ0FBTixJQUFZLGdCQUVYO0FBRkQsV0FBWSxnQkFBZ0I7SUFDM0IscUVBQWUsQ0FBQTtBQUNoQixDQUFDLEVBRlcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUUzQjtBQUVELE1BQU0sQ0FBTixJQUFZLHdCQUdYO0FBSEQsV0FBWSx3QkFBd0I7SUFDbkMsMkVBQVUsQ0FBQTtJQUNWLGlGQUFhLENBQUE7QUFDZCxDQUFDLEVBSFcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUduQztBQW1CRDs7R0FFRztBQUNILE1BQU0sS0FBVyxPQUFPLENBWXZCO0FBWkQsV0FBaUIsT0FBTztJQUV2Qjs7T0FFRztJQUNILFNBQWdCLEVBQUUsQ0FBQyxHQUFRO1FBQzFCLElBQUksQ0FBQyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxPQUFpQixHQUFJLENBQUMsRUFBRSxLQUFLLFFBQVE7WUFDM0MsT0FBaUIsR0FBSSxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUM7SUFDM0MsQ0FBQztJQU5lLFVBQUUsS0FNakIsQ0FBQTtBQUNGLENBQUMsRUFaZ0IsT0FBTyxLQUFQLE9BQU8sUUFZdkI7QUErQkQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSw2QkFTWDtBQVRELFdBQVksNkJBQTZCO0lBQ3hDOztPQUVHO0lBQ0gsMkZBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gseUZBQVksQ0FBQTtBQUNiLENBQUMsRUFUVyw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBU3hDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxrQkFHWDtBQUhELFdBQVksa0JBQWtCO0lBQzdCLHVFQUFjLENBQUE7SUFDZCxtRUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUhXLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHN0I7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLDBCQUdYO0FBSEQsV0FBWSwwQkFBMEI7SUFDckMsaUZBQVcsQ0FBQTtJQUNYLG1GQUFZLENBQUE7QUFDYixDQUFDLEVBSFcsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUdyQztBQTBHRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFdBR1g7QUFIRCxXQUFZLFdBQVc7SUFDdEIsbURBQVcsQ0FBQTtJQUNYLG1EQUFXLENBQUE7QUFDWixDQUFDLEVBSFcsV0FBVyxLQUFYLFdBQVcsUUFHdEI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFlBR1g7QUFIRCxXQUFZLFlBQVk7SUFDdkIseURBQWEsQ0FBQTtJQUNiLGlEQUFTLENBQUE7QUFDVixDQUFDLEVBSFcsWUFBWSxLQUFaLFlBQVksUUFHdkI7QUF5RUQsTUFBTSxDQUFOLElBQVksYUFHWDtBQUhELFdBQVksYUFBYTtJQUN4QixpREFBUSxDQUFBO0lBQ1IsMkRBQWEsQ0FBQTtBQUNkLENBQUMsRUFIVyxhQUFhLEtBQWIsYUFBYSxRQUd4QjtBQWdGRDs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsWUFBNkIsYUFBMkQ7UUFBM0Qsa0JBQWEsR0FBYixhQUFhLENBQThDO1FBRmhGLHlCQUFvQixHQUFrRCxJQUFJLENBQUM7SUFHbkYsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDMUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxtQkFBbUI7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ2xDLENBQUM7Q0FDRDtBQXlERDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFnRCxJQUFJLHdCQUF3QixFQUFFLENBQUM7QUFFaEg7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBMEQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO0FBRXBJOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVkseUJBS1g7QUFMRCxXQUFZLHlCQUF5QjtJQUNwQyx5RUFBUSxDQUFBO0lBQ1IsNkVBQVUsQ0FBQTtJQUNWLCtFQUFXLENBQUE7SUFDWCxtRkFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUxXLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFLcEM7QUE0REQsTUFBTSxDQUFOLElBQVkscUJBR1g7QUFIRCxXQUFZLHFCQUFxQjtJQUNoQyxxRUFBVSxDQUFBO0lBQ1YsMkVBQWEsQ0FBQTtBQUNkLENBQUMsRUFIVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBR2hDIn0=