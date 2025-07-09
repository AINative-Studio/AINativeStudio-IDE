/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
export var AccessibilitySupport;
(function (AccessibilitySupport) {
    /**
     * This should be the browser case where it is not known if a screen reader is attached or no.
     */
    AccessibilitySupport[AccessibilitySupport["Unknown"] = 0] = "Unknown";
    AccessibilitySupport[AccessibilitySupport["Disabled"] = 1] = "Disabled";
    AccessibilitySupport[AccessibilitySupport["Enabled"] = 2] = "Enabled";
})(AccessibilitySupport || (AccessibilitySupport = {}));
export var CodeActionTriggerType;
(function (CodeActionTriggerType) {
    CodeActionTriggerType[CodeActionTriggerType["Invoke"] = 1] = "Invoke";
    CodeActionTriggerType[CodeActionTriggerType["Auto"] = 2] = "Auto";
})(CodeActionTriggerType || (CodeActionTriggerType = {}));
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
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
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
 * A positioning preference for rendering content widgets.
 */
export var ContentWidgetPositionPreference;
(function (ContentWidgetPositionPreference) {
    /**
     * Place the content widget exactly at a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["EXACT"] = 0] = "EXACT";
    /**
     * Place the content widget above a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["ABOVE"] = 1] = "ABOVE";
    /**
     * Place the content widget below a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["BELOW"] = 2] = "BELOW";
})(ContentWidgetPositionPreference || (ContentWidgetPositionPreference = {}));
/**
 * Describes the reason the cursor has changed its position.
 */
export var CursorChangeReason;
(function (CursorChangeReason) {
    /**
     * Unknown or not set.
     */
    CursorChangeReason[CursorChangeReason["NotSet"] = 0] = "NotSet";
    /**
     * A `model.setValue()` was called.
     */
    CursorChangeReason[CursorChangeReason["ContentFlush"] = 1] = "ContentFlush";
    /**
     * The `model` has been changed outside of this cursor and the cursor recovers its position from associated markers.
     */
    CursorChangeReason[CursorChangeReason["RecoverFromMarkers"] = 2] = "RecoverFromMarkers";
    /**
     * There was an explicit user gesture.
     */
    CursorChangeReason[CursorChangeReason["Explicit"] = 3] = "Explicit";
    /**
     * There was a Paste.
     */
    CursorChangeReason[CursorChangeReason["Paste"] = 4] = "Paste";
    /**
     * There was an Undo.
     */
    CursorChangeReason[CursorChangeReason["Undo"] = 5] = "Undo";
    /**
     * There was a Redo.
     */
    CursorChangeReason[CursorChangeReason["Redo"] = 6] = "Redo";
})(CursorChangeReason || (CursorChangeReason = {}));
/**
 * The default end of line to use when instantiating models.
 */
export var DefaultEndOfLine;
(function (DefaultEndOfLine) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["CRLF"] = 2] = "CRLF";
})(DefaultEndOfLine || (DefaultEndOfLine = {}));
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
 * Configuration options for auto indentation in the editor
 */
export var EditorAutoIndentStrategy;
(function (EditorAutoIndentStrategy) {
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["None"] = 0] = "None";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Keep"] = 1] = "Keep";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Brackets"] = 2] = "Brackets";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Advanced"] = 3] = "Advanced";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Full"] = 4] = "Full";
})(EditorAutoIndentStrategy || (EditorAutoIndentStrategy = {}));
export var EditorOption;
(function (EditorOption) {
    EditorOption[EditorOption["acceptSuggestionOnCommitCharacter"] = 0] = "acceptSuggestionOnCommitCharacter";
    EditorOption[EditorOption["acceptSuggestionOnEnter"] = 1] = "acceptSuggestionOnEnter";
    EditorOption[EditorOption["accessibilitySupport"] = 2] = "accessibilitySupport";
    EditorOption[EditorOption["accessibilityPageSize"] = 3] = "accessibilityPageSize";
    EditorOption[EditorOption["ariaLabel"] = 4] = "ariaLabel";
    EditorOption[EditorOption["ariaRequired"] = 5] = "ariaRequired";
    EditorOption[EditorOption["autoClosingBrackets"] = 6] = "autoClosingBrackets";
    EditorOption[EditorOption["autoClosingComments"] = 7] = "autoClosingComments";
    EditorOption[EditorOption["screenReaderAnnounceInlineSuggestion"] = 8] = "screenReaderAnnounceInlineSuggestion";
    EditorOption[EditorOption["autoClosingDelete"] = 9] = "autoClosingDelete";
    EditorOption[EditorOption["autoClosingOvertype"] = 10] = "autoClosingOvertype";
    EditorOption[EditorOption["autoClosingQuotes"] = 11] = "autoClosingQuotes";
    EditorOption[EditorOption["autoIndent"] = 12] = "autoIndent";
    EditorOption[EditorOption["automaticLayout"] = 13] = "automaticLayout";
    EditorOption[EditorOption["autoSurround"] = 14] = "autoSurround";
    EditorOption[EditorOption["bracketPairColorization"] = 15] = "bracketPairColorization";
    EditorOption[EditorOption["guides"] = 16] = "guides";
    EditorOption[EditorOption["codeLens"] = 17] = "codeLens";
    EditorOption[EditorOption["codeLensFontFamily"] = 18] = "codeLensFontFamily";
    EditorOption[EditorOption["codeLensFontSize"] = 19] = "codeLensFontSize";
    EditorOption[EditorOption["colorDecorators"] = 20] = "colorDecorators";
    EditorOption[EditorOption["colorDecoratorsLimit"] = 21] = "colorDecoratorsLimit";
    EditorOption[EditorOption["columnSelection"] = 22] = "columnSelection";
    EditorOption[EditorOption["comments"] = 23] = "comments";
    EditorOption[EditorOption["contextmenu"] = 24] = "contextmenu";
    EditorOption[EditorOption["copyWithSyntaxHighlighting"] = 25] = "copyWithSyntaxHighlighting";
    EditorOption[EditorOption["cursorBlinking"] = 26] = "cursorBlinking";
    EditorOption[EditorOption["cursorSmoothCaretAnimation"] = 27] = "cursorSmoothCaretAnimation";
    EditorOption[EditorOption["cursorStyle"] = 28] = "cursorStyle";
    EditorOption[EditorOption["cursorSurroundingLines"] = 29] = "cursorSurroundingLines";
    EditorOption[EditorOption["cursorSurroundingLinesStyle"] = 30] = "cursorSurroundingLinesStyle";
    EditorOption[EditorOption["cursorWidth"] = 31] = "cursorWidth";
    EditorOption[EditorOption["disableLayerHinting"] = 32] = "disableLayerHinting";
    EditorOption[EditorOption["disableMonospaceOptimizations"] = 33] = "disableMonospaceOptimizations";
    EditorOption[EditorOption["domReadOnly"] = 34] = "domReadOnly";
    EditorOption[EditorOption["dragAndDrop"] = 35] = "dragAndDrop";
    EditorOption[EditorOption["dropIntoEditor"] = 36] = "dropIntoEditor";
    EditorOption[EditorOption["experimentalEditContextEnabled"] = 37] = "experimentalEditContextEnabled";
    EditorOption[EditorOption["emptySelectionClipboard"] = 38] = "emptySelectionClipboard";
    EditorOption[EditorOption["experimentalGpuAcceleration"] = 39] = "experimentalGpuAcceleration";
    EditorOption[EditorOption["experimentalWhitespaceRendering"] = 40] = "experimentalWhitespaceRendering";
    EditorOption[EditorOption["extraEditorClassName"] = 41] = "extraEditorClassName";
    EditorOption[EditorOption["fastScrollSensitivity"] = 42] = "fastScrollSensitivity";
    EditorOption[EditorOption["find"] = 43] = "find";
    EditorOption[EditorOption["fixedOverflowWidgets"] = 44] = "fixedOverflowWidgets";
    EditorOption[EditorOption["folding"] = 45] = "folding";
    EditorOption[EditorOption["foldingStrategy"] = 46] = "foldingStrategy";
    EditorOption[EditorOption["foldingHighlight"] = 47] = "foldingHighlight";
    EditorOption[EditorOption["foldingImportsByDefault"] = 48] = "foldingImportsByDefault";
    EditorOption[EditorOption["foldingMaximumRegions"] = 49] = "foldingMaximumRegions";
    EditorOption[EditorOption["unfoldOnClickAfterEndOfLine"] = 50] = "unfoldOnClickAfterEndOfLine";
    EditorOption[EditorOption["fontFamily"] = 51] = "fontFamily";
    EditorOption[EditorOption["fontInfo"] = 52] = "fontInfo";
    EditorOption[EditorOption["fontLigatures"] = 53] = "fontLigatures";
    EditorOption[EditorOption["fontSize"] = 54] = "fontSize";
    EditorOption[EditorOption["fontWeight"] = 55] = "fontWeight";
    EditorOption[EditorOption["fontVariations"] = 56] = "fontVariations";
    EditorOption[EditorOption["formatOnPaste"] = 57] = "formatOnPaste";
    EditorOption[EditorOption["formatOnType"] = 58] = "formatOnType";
    EditorOption[EditorOption["glyphMargin"] = 59] = "glyphMargin";
    EditorOption[EditorOption["gotoLocation"] = 60] = "gotoLocation";
    EditorOption[EditorOption["hideCursorInOverviewRuler"] = 61] = "hideCursorInOverviewRuler";
    EditorOption[EditorOption["hover"] = 62] = "hover";
    EditorOption[EditorOption["inDiffEditor"] = 63] = "inDiffEditor";
    EditorOption[EditorOption["inlineSuggest"] = 64] = "inlineSuggest";
    EditorOption[EditorOption["letterSpacing"] = 65] = "letterSpacing";
    EditorOption[EditorOption["lightbulb"] = 66] = "lightbulb";
    EditorOption[EditorOption["lineDecorationsWidth"] = 67] = "lineDecorationsWidth";
    EditorOption[EditorOption["lineHeight"] = 68] = "lineHeight";
    EditorOption[EditorOption["lineNumbers"] = 69] = "lineNumbers";
    EditorOption[EditorOption["lineNumbersMinChars"] = 70] = "lineNumbersMinChars";
    EditorOption[EditorOption["linkedEditing"] = 71] = "linkedEditing";
    EditorOption[EditorOption["links"] = 72] = "links";
    EditorOption[EditorOption["matchBrackets"] = 73] = "matchBrackets";
    EditorOption[EditorOption["minimap"] = 74] = "minimap";
    EditorOption[EditorOption["mouseStyle"] = 75] = "mouseStyle";
    EditorOption[EditorOption["mouseWheelScrollSensitivity"] = 76] = "mouseWheelScrollSensitivity";
    EditorOption[EditorOption["mouseWheelZoom"] = 77] = "mouseWheelZoom";
    EditorOption[EditorOption["multiCursorMergeOverlapping"] = 78] = "multiCursorMergeOverlapping";
    EditorOption[EditorOption["multiCursorModifier"] = 79] = "multiCursorModifier";
    EditorOption[EditorOption["multiCursorPaste"] = 80] = "multiCursorPaste";
    EditorOption[EditorOption["multiCursorLimit"] = 81] = "multiCursorLimit";
    EditorOption[EditorOption["occurrencesHighlight"] = 82] = "occurrencesHighlight";
    EditorOption[EditorOption["occurrencesHighlightDelay"] = 83] = "occurrencesHighlightDelay";
    EditorOption[EditorOption["overtypeCursorStyle"] = 84] = "overtypeCursorStyle";
    EditorOption[EditorOption["overtypeOnPaste"] = 85] = "overtypeOnPaste";
    EditorOption[EditorOption["overviewRulerBorder"] = 86] = "overviewRulerBorder";
    EditorOption[EditorOption["overviewRulerLanes"] = 87] = "overviewRulerLanes";
    EditorOption[EditorOption["padding"] = 88] = "padding";
    EditorOption[EditorOption["pasteAs"] = 89] = "pasteAs";
    EditorOption[EditorOption["parameterHints"] = 90] = "parameterHints";
    EditorOption[EditorOption["peekWidgetDefaultFocus"] = 91] = "peekWidgetDefaultFocus";
    EditorOption[EditorOption["placeholder"] = 92] = "placeholder";
    EditorOption[EditorOption["definitionLinkOpensInPeek"] = 93] = "definitionLinkOpensInPeek";
    EditorOption[EditorOption["quickSuggestions"] = 94] = "quickSuggestions";
    EditorOption[EditorOption["quickSuggestionsDelay"] = 95] = "quickSuggestionsDelay";
    EditorOption[EditorOption["readOnly"] = 96] = "readOnly";
    EditorOption[EditorOption["readOnlyMessage"] = 97] = "readOnlyMessage";
    EditorOption[EditorOption["renameOnType"] = 98] = "renameOnType";
    EditorOption[EditorOption["renderControlCharacters"] = 99] = "renderControlCharacters";
    EditorOption[EditorOption["renderFinalNewline"] = 100] = "renderFinalNewline";
    EditorOption[EditorOption["renderLineHighlight"] = 101] = "renderLineHighlight";
    EditorOption[EditorOption["renderLineHighlightOnlyWhenFocus"] = 102] = "renderLineHighlightOnlyWhenFocus";
    EditorOption[EditorOption["renderValidationDecorations"] = 103] = "renderValidationDecorations";
    EditorOption[EditorOption["renderWhitespace"] = 104] = "renderWhitespace";
    EditorOption[EditorOption["revealHorizontalRightPadding"] = 105] = "revealHorizontalRightPadding";
    EditorOption[EditorOption["roundedSelection"] = 106] = "roundedSelection";
    EditorOption[EditorOption["rulers"] = 107] = "rulers";
    EditorOption[EditorOption["scrollbar"] = 108] = "scrollbar";
    EditorOption[EditorOption["scrollBeyondLastColumn"] = 109] = "scrollBeyondLastColumn";
    EditorOption[EditorOption["scrollBeyondLastLine"] = 110] = "scrollBeyondLastLine";
    EditorOption[EditorOption["scrollPredominantAxis"] = 111] = "scrollPredominantAxis";
    EditorOption[EditorOption["selectionClipboard"] = 112] = "selectionClipboard";
    EditorOption[EditorOption["selectionHighlight"] = 113] = "selectionHighlight";
    EditorOption[EditorOption["selectOnLineNumbers"] = 114] = "selectOnLineNumbers";
    EditorOption[EditorOption["showFoldingControls"] = 115] = "showFoldingControls";
    EditorOption[EditorOption["showUnused"] = 116] = "showUnused";
    EditorOption[EditorOption["snippetSuggestions"] = 117] = "snippetSuggestions";
    EditorOption[EditorOption["smartSelect"] = 118] = "smartSelect";
    EditorOption[EditorOption["smoothScrolling"] = 119] = "smoothScrolling";
    EditorOption[EditorOption["stickyScroll"] = 120] = "stickyScroll";
    EditorOption[EditorOption["stickyTabStops"] = 121] = "stickyTabStops";
    EditorOption[EditorOption["stopRenderingLineAfter"] = 122] = "stopRenderingLineAfter";
    EditorOption[EditorOption["suggest"] = 123] = "suggest";
    EditorOption[EditorOption["suggestFontSize"] = 124] = "suggestFontSize";
    EditorOption[EditorOption["suggestLineHeight"] = 125] = "suggestLineHeight";
    EditorOption[EditorOption["suggestOnTriggerCharacters"] = 126] = "suggestOnTriggerCharacters";
    EditorOption[EditorOption["suggestSelection"] = 127] = "suggestSelection";
    EditorOption[EditorOption["tabCompletion"] = 128] = "tabCompletion";
    EditorOption[EditorOption["tabIndex"] = 129] = "tabIndex";
    EditorOption[EditorOption["unicodeHighlighting"] = 130] = "unicodeHighlighting";
    EditorOption[EditorOption["unusualLineTerminators"] = 131] = "unusualLineTerminators";
    EditorOption[EditorOption["useShadowDOM"] = 132] = "useShadowDOM";
    EditorOption[EditorOption["useTabStops"] = 133] = "useTabStops";
    EditorOption[EditorOption["wordBreak"] = 134] = "wordBreak";
    EditorOption[EditorOption["wordSegmenterLocales"] = 135] = "wordSegmenterLocales";
    EditorOption[EditorOption["wordSeparators"] = 136] = "wordSeparators";
    EditorOption[EditorOption["wordWrap"] = 137] = "wordWrap";
    EditorOption[EditorOption["wordWrapBreakAfterCharacters"] = 138] = "wordWrapBreakAfterCharacters";
    EditorOption[EditorOption["wordWrapBreakBeforeCharacters"] = 139] = "wordWrapBreakBeforeCharacters";
    EditorOption[EditorOption["wordWrapColumn"] = 140] = "wordWrapColumn";
    EditorOption[EditorOption["wordWrapOverride1"] = 141] = "wordWrapOverride1";
    EditorOption[EditorOption["wordWrapOverride2"] = 142] = "wordWrapOverride2";
    EditorOption[EditorOption["wrappingIndent"] = 143] = "wrappingIndent";
    EditorOption[EditorOption["wrappingStrategy"] = 144] = "wrappingStrategy";
    EditorOption[EditorOption["showDeprecated"] = 145] = "showDeprecated";
    EditorOption[EditorOption["inlayHints"] = 146] = "inlayHints";
    EditorOption[EditorOption["effectiveCursorStyle"] = 147] = "effectiveCursorStyle";
    EditorOption[EditorOption["editorClassName"] = 148] = "editorClassName";
    EditorOption[EditorOption["pixelRatio"] = 149] = "pixelRatio";
    EditorOption[EditorOption["tabFocusMode"] = 150] = "tabFocusMode";
    EditorOption[EditorOption["layoutInfo"] = 151] = "layoutInfo";
    EditorOption[EditorOption["wrappingInfo"] = 152] = "wrappingInfo";
    EditorOption[EditorOption["defaultColorDecorators"] = 153] = "defaultColorDecorators";
    EditorOption[EditorOption["colorDecoratorsActivatedOn"] = 154] = "colorDecoratorsActivatedOn";
    EditorOption[EditorOption["inlineCompletionsAccessibilityVerbose"] = 155] = "inlineCompletionsAccessibilityVerbose";
    EditorOption[EditorOption["effectiveExperimentalEditContextEnabled"] = 156] = "effectiveExperimentalEditContextEnabled";
})(EditorOption || (EditorOption = {}));
/**
 * End of line character preference.
 */
export var EndOfLinePreference;
(function (EndOfLinePreference) {
    /**
     * Use the end of line character identified in the text buffer.
     */
    EndOfLinePreference[EndOfLinePreference["TextDefined"] = 0] = "TextDefined";
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["CRLF"] = 2] = "CRLF";
})(EndOfLinePreference || (EndOfLinePreference = {}));
/**
 * End of line character preference.
 */
export var EndOfLineSequence;
(function (EndOfLineSequence) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["LF"] = 0] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["CRLF"] = 1] = "CRLF";
})(EndOfLineSequence || (EndOfLineSequence = {}));
/**
 * Vertical Lane in the glyph margin of the editor.
 */
export var GlyphMarginLane;
(function (GlyphMarginLane) {
    GlyphMarginLane[GlyphMarginLane["Left"] = 1] = "Left";
    GlyphMarginLane[GlyphMarginLane["Center"] = 2] = "Center";
    GlyphMarginLane[GlyphMarginLane["Right"] = 3] = "Right";
})(GlyphMarginLane || (GlyphMarginLane = {}));
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
/**
 * Describes what to do with the indentation when pressing Enter.
 */
export var IndentAction;
(function (IndentAction) {
    /**
     * Insert new line and copy the previous line's indentation.
     */
    IndentAction[IndentAction["None"] = 0] = "None";
    /**
     * Insert new line and indent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Indent"] = 1] = "Indent";
    /**
     * Insert two new lines:
     *  - the first one indented which will hold the cursor
     *  - the second one at the same indentation level
     */
    IndentAction[IndentAction["IndentOutdent"] = 2] = "IndentOutdent";
    /**
     * Insert new line and outdent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Outdent"] = 3] = "Outdent";
})(IndentAction || (IndentAction = {}));
export var InjectedTextCursorStops;
(function (InjectedTextCursorStops) {
    InjectedTextCursorStops[InjectedTextCursorStops["Both"] = 0] = "Both";
    InjectedTextCursorStops[InjectedTextCursorStops["Right"] = 1] = "Right";
    InjectedTextCursorStops[InjectedTextCursorStops["Left"] = 2] = "Left";
    InjectedTextCursorStops[InjectedTextCursorStops["None"] = 3] = "None";
})(InjectedTextCursorStops || (InjectedTextCursorStops = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
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
export var InlineEditTriggerKind;
(function (InlineEditTriggerKind) {
    InlineEditTriggerKind[InlineEditTriggerKind["Invoke"] = 0] = "Invoke";
    InlineEditTriggerKind[InlineEditTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineEditTriggerKind || (InlineEditTriggerKind = {}));
/**
 * Virtual Key Codes, the value does not hold any inherent meaning.
 * Inspired somewhat from https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
 * But these are "more general", as they should work across browsers & OS`s.
 */
export var KeyCode;
(function (KeyCode) {
    KeyCode[KeyCode["DependsOnKbLayout"] = -1] = "DependsOnKbLayout";
    /**
     * Placed first to cover the 0 value of the enum.
     */
    KeyCode[KeyCode["Unknown"] = 0] = "Unknown";
    KeyCode[KeyCode["Backspace"] = 1] = "Backspace";
    KeyCode[KeyCode["Tab"] = 2] = "Tab";
    KeyCode[KeyCode["Enter"] = 3] = "Enter";
    KeyCode[KeyCode["Shift"] = 4] = "Shift";
    KeyCode[KeyCode["Ctrl"] = 5] = "Ctrl";
    KeyCode[KeyCode["Alt"] = 6] = "Alt";
    KeyCode[KeyCode["PauseBreak"] = 7] = "PauseBreak";
    KeyCode[KeyCode["CapsLock"] = 8] = "CapsLock";
    KeyCode[KeyCode["Escape"] = 9] = "Escape";
    KeyCode[KeyCode["Space"] = 10] = "Space";
    KeyCode[KeyCode["PageUp"] = 11] = "PageUp";
    KeyCode[KeyCode["PageDown"] = 12] = "PageDown";
    KeyCode[KeyCode["End"] = 13] = "End";
    KeyCode[KeyCode["Home"] = 14] = "Home";
    KeyCode[KeyCode["LeftArrow"] = 15] = "LeftArrow";
    KeyCode[KeyCode["UpArrow"] = 16] = "UpArrow";
    KeyCode[KeyCode["RightArrow"] = 17] = "RightArrow";
    KeyCode[KeyCode["DownArrow"] = 18] = "DownArrow";
    KeyCode[KeyCode["Insert"] = 19] = "Insert";
    KeyCode[KeyCode["Delete"] = 20] = "Delete";
    KeyCode[KeyCode["Digit0"] = 21] = "Digit0";
    KeyCode[KeyCode["Digit1"] = 22] = "Digit1";
    KeyCode[KeyCode["Digit2"] = 23] = "Digit2";
    KeyCode[KeyCode["Digit3"] = 24] = "Digit3";
    KeyCode[KeyCode["Digit4"] = 25] = "Digit4";
    KeyCode[KeyCode["Digit5"] = 26] = "Digit5";
    KeyCode[KeyCode["Digit6"] = 27] = "Digit6";
    KeyCode[KeyCode["Digit7"] = 28] = "Digit7";
    KeyCode[KeyCode["Digit8"] = 29] = "Digit8";
    KeyCode[KeyCode["Digit9"] = 30] = "Digit9";
    KeyCode[KeyCode["KeyA"] = 31] = "KeyA";
    KeyCode[KeyCode["KeyB"] = 32] = "KeyB";
    KeyCode[KeyCode["KeyC"] = 33] = "KeyC";
    KeyCode[KeyCode["KeyD"] = 34] = "KeyD";
    KeyCode[KeyCode["KeyE"] = 35] = "KeyE";
    KeyCode[KeyCode["KeyF"] = 36] = "KeyF";
    KeyCode[KeyCode["KeyG"] = 37] = "KeyG";
    KeyCode[KeyCode["KeyH"] = 38] = "KeyH";
    KeyCode[KeyCode["KeyI"] = 39] = "KeyI";
    KeyCode[KeyCode["KeyJ"] = 40] = "KeyJ";
    KeyCode[KeyCode["KeyK"] = 41] = "KeyK";
    KeyCode[KeyCode["KeyL"] = 42] = "KeyL";
    KeyCode[KeyCode["KeyM"] = 43] = "KeyM";
    KeyCode[KeyCode["KeyN"] = 44] = "KeyN";
    KeyCode[KeyCode["KeyO"] = 45] = "KeyO";
    KeyCode[KeyCode["KeyP"] = 46] = "KeyP";
    KeyCode[KeyCode["KeyQ"] = 47] = "KeyQ";
    KeyCode[KeyCode["KeyR"] = 48] = "KeyR";
    KeyCode[KeyCode["KeyS"] = 49] = "KeyS";
    KeyCode[KeyCode["KeyT"] = 50] = "KeyT";
    KeyCode[KeyCode["KeyU"] = 51] = "KeyU";
    KeyCode[KeyCode["KeyV"] = 52] = "KeyV";
    KeyCode[KeyCode["KeyW"] = 53] = "KeyW";
    KeyCode[KeyCode["KeyX"] = 54] = "KeyX";
    KeyCode[KeyCode["KeyY"] = 55] = "KeyY";
    KeyCode[KeyCode["KeyZ"] = 56] = "KeyZ";
    KeyCode[KeyCode["Meta"] = 57] = "Meta";
    KeyCode[KeyCode["ContextMenu"] = 58] = "ContextMenu";
    KeyCode[KeyCode["F1"] = 59] = "F1";
    KeyCode[KeyCode["F2"] = 60] = "F2";
    KeyCode[KeyCode["F3"] = 61] = "F3";
    KeyCode[KeyCode["F4"] = 62] = "F4";
    KeyCode[KeyCode["F5"] = 63] = "F5";
    KeyCode[KeyCode["F6"] = 64] = "F6";
    KeyCode[KeyCode["F7"] = 65] = "F7";
    KeyCode[KeyCode["F8"] = 66] = "F8";
    KeyCode[KeyCode["F9"] = 67] = "F9";
    KeyCode[KeyCode["F10"] = 68] = "F10";
    KeyCode[KeyCode["F11"] = 69] = "F11";
    KeyCode[KeyCode["F12"] = 70] = "F12";
    KeyCode[KeyCode["F13"] = 71] = "F13";
    KeyCode[KeyCode["F14"] = 72] = "F14";
    KeyCode[KeyCode["F15"] = 73] = "F15";
    KeyCode[KeyCode["F16"] = 74] = "F16";
    KeyCode[KeyCode["F17"] = 75] = "F17";
    KeyCode[KeyCode["F18"] = 76] = "F18";
    KeyCode[KeyCode["F19"] = 77] = "F19";
    KeyCode[KeyCode["F20"] = 78] = "F20";
    KeyCode[KeyCode["F21"] = 79] = "F21";
    KeyCode[KeyCode["F22"] = 80] = "F22";
    KeyCode[KeyCode["F23"] = 81] = "F23";
    KeyCode[KeyCode["F24"] = 82] = "F24";
    KeyCode[KeyCode["NumLock"] = 83] = "NumLock";
    KeyCode[KeyCode["ScrollLock"] = 84] = "ScrollLock";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ';:' key
     */
    KeyCode[KeyCode["Semicolon"] = 85] = "Semicolon";
    /**
     * For any country/region, the '+' key
     * For the US standard keyboard, the '=+' key
     */
    KeyCode[KeyCode["Equal"] = 86] = "Equal";
    /**
     * For any country/region, the ',' key
     * For the US standard keyboard, the ',<' key
     */
    KeyCode[KeyCode["Comma"] = 87] = "Comma";
    /**
     * For any country/region, the '-' key
     * For the US standard keyboard, the '-_' key
     */
    KeyCode[KeyCode["Minus"] = 88] = "Minus";
    /**
     * For any country/region, the '.' key
     * For the US standard keyboard, the '.>' key
     */
    KeyCode[KeyCode["Period"] = 89] = "Period";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '/?' key
     */
    KeyCode[KeyCode["Slash"] = 90] = "Slash";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '`~' key
     */
    KeyCode[KeyCode["Backquote"] = 91] = "Backquote";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '[{' key
     */
    KeyCode[KeyCode["BracketLeft"] = 92] = "BracketLeft";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '\|' key
     */
    KeyCode[KeyCode["Backslash"] = 93] = "Backslash";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ']}' key
     */
    KeyCode[KeyCode["BracketRight"] = 94] = "BracketRight";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ''"' key
     */
    KeyCode[KeyCode["Quote"] = 95] = "Quote";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     */
    KeyCode[KeyCode["OEM_8"] = 96] = "OEM_8";
    /**
     * Either the angle bracket key or the backslash key on the RT 102-key keyboard.
     */
    KeyCode[KeyCode["IntlBackslash"] = 97] = "IntlBackslash";
    KeyCode[KeyCode["Numpad0"] = 98] = "Numpad0";
    KeyCode[KeyCode["Numpad1"] = 99] = "Numpad1";
    KeyCode[KeyCode["Numpad2"] = 100] = "Numpad2";
    KeyCode[KeyCode["Numpad3"] = 101] = "Numpad3";
    KeyCode[KeyCode["Numpad4"] = 102] = "Numpad4";
    KeyCode[KeyCode["Numpad5"] = 103] = "Numpad5";
    KeyCode[KeyCode["Numpad6"] = 104] = "Numpad6";
    KeyCode[KeyCode["Numpad7"] = 105] = "Numpad7";
    KeyCode[KeyCode["Numpad8"] = 106] = "Numpad8";
    KeyCode[KeyCode["Numpad9"] = 107] = "Numpad9";
    KeyCode[KeyCode["NumpadMultiply"] = 108] = "NumpadMultiply";
    KeyCode[KeyCode["NumpadAdd"] = 109] = "NumpadAdd";
    KeyCode[KeyCode["NUMPAD_SEPARATOR"] = 110] = "NUMPAD_SEPARATOR";
    KeyCode[KeyCode["NumpadSubtract"] = 111] = "NumpadSubtract";
    KeyCode[KeyCode["NumpadDecimal"] = 112] = "NumpadDecimal";
    KeyCode[KeyCode["NumpadDivide"] = 113] = "NumpadDivide";
    /**
     * Cover all key codes when IME is processing input.
     */
    KeyCode[KeyCode["KEY_IN_COMPOSITION"] = 114] = "KEY_IN_COMPOSITION";
    KeyCode[KeyCode["ABNT_C1"] = 115] = "ABNT_C1";
    KeyCode[KeyCode["ABNT_C2"] = 116] = "ABNT_C2";
    KeyCode[KeyCode["AudioVolumeMute"] = 117] = "AudioVolumeMute";
    KeyCode[KeyCode["AudioVolumeUp"] = 118] = "AudioVolumeUp";
    KeyCode[KeyCode["AudioVolumeDown"] = 119] = "AudioVolumeDown";
    KeyCode[KeyCode["BrowserSearch"] = 120] = "BrowserSearch";
    KeyCode[KeyCode["BrowserHome"] = 121] = "BrowserHome";
    KeyCode[KeyCode["BrowserBack"] = 122] = "BrowserBack";
    KeyCode[KeyCode["BrowserForward"] = 123] = "BrowserForward";
    KeyCode[KeyCode["MediaTrackNext"] = 124] = "MediaTrackNext";
    KeyCode[KeyCode["MediaTrackPrevious"] = 125] = "MediaTrackPrevious";
    KeyCode[KeyCode["MediaStop"] = 126] = "MediaStop";
    KeyCode[KeyCode["MediaPlayPause"] = 127] = "MediaPlayPause";
    KeyCode[KeyCode["LaunchMediaPlayer"] = 128] = "LaunchMediaPlayer";
    KeyCode[KeyCode["LaunchMail"] = 129] = "LaunchMail";
    KeyCode[KeyCode["LaunchApp2"] = 130] = "LaunchApp2";
    /**
     * VK_CLEAR, 0x0C, CLEAR key
     */
    KeyCode[KeyCode["Clear"] = 131] = "Clear";
    /**
     * Placed last to cover the length of the enum.
     * Please do not depend on this value!
     */
    KeyCode[KeyCode["MAX_VALUE"] = 132] = "MAX_VALUE";
})(KeyCode || (KeyCode = {}));
export var MarkerSeverity;
(function (MarkerSeverity) {
    MarkerSeverity[MarkerSeverity["Hint"] = 1] = "Hint";
    MarkerSeverity[MarkerSeverity["Info"] = 2] = "Info";
    MarkerSeverity[MarkerSeverity["Warning"] = 4] = "Warning";
    MarkerSeverity[MarkerSeverity["Error"] = 8] = "Error";
})(MarkerSeverity || (MarkerSeverity = {}));
export var MarkerTag;
(function (MarkerTag) {
    MarkerTag[MarkerTag["Unnecessary"] = 1] = "Unnecessary";
    MarkerTag[MarkerTag["Deprecated"] = 2] = "Deprecated";
})(MarkerTag || (MarkerTag = {}));
/**
 * Position in the minimap to render the decoration.
 */
export var MinimapPosition;
(function (MinimapPosition) {
    MinimapPosition[MinimapPosition["Inline"] = 1] = "Inline";
    MinimapPosition[MinimapPosition["Gutter"] = 2] = "Gutter";
})(MinimapPosition || (MinimapPosition = {}));
/**
 * Section header style.
 */
export var MinimapSectionHeaderStyle;
(function (MinimapSectionHeaderStyle) {
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Normal"] = 1] = "Normal";
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Underlined"] = 2] = "Underlined";
})(MinimapSectionHeaderStyle || (MinimapSectionHeaderStyle = {}));
/**
 * Type of hit element with the mouse in the editor.
 */
export var MouseTargetType;
(function (MouseTargetType) {
    /**
     * Mouse is on top of an unknown element.
     */
    MouseTargetType[MouseTargetType["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * Mouse is on top of the textarea used for input.
     */
    MouseTargetType[MouseTargetType["TEXTAREA"] = 1] = "TEXTAREA";
    /**
     * Mouse is on top of the glyph margin
     */
    MouseTargetType[MouseTargetType["GUTTER_GLYPH_MARGIN"] = 2] = "GUTTER_GLYPH_MARGIN";
    /**
     * Mouse is on top of the line numbers
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_NUMBERS"] = 3] = "GUTTER_LINE_NUMBERS";
    /**
     * Mouse is on top of the line decorations
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_DECORATIONS"] = 4] = "GUTTER_LINE_DECORATIONS";
    /**
     * Mouse is on top of the whitespace left in the gutter by a view zone.
     */
    MouseTargetType[MouseTargetType["GUTTER_VIEW_ZONE"] = 5] = "GUTTER_VIEW_ZONE";
    /**
     * Mouse is on top of text in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_TEXT"] = 6] = "CONTENT_TEXT";
    /**
     * Mouse is on top of empty space in the content (e.g. after line text or below last line)
     */
    MouseTargetType[MouseTargetType["CONTENT_EMPTY"] = 7] = "CONTENT_EMPTY";
    /**
     * Mouse is on top of a view zone in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_VIEW_ZONE"] = 8] = "CONTENT_VIEW_ZONE";
    /**
     * Mouse is on top of a content widget.
     */
    MouseTargetType[MouseTargetType["CONTENT_WIDGET"] = 9] = "CONTENT_WIDGET";
    /**
     * Mouse is on top of the decorations overview ruler.
     */
    MouseTargetType[MouseTargetType["OVERVIEW_RULER"] = 10] = "OVERVIEW_RULER";
    /**
     * Mouse is on top of a scrollbar.
     */
    MouseTargetType[MouseTargetType["SCROLLBAR"] = 11] = "SCROLLBAR";
    /**
     * Mouse is on top of an overlay widget.
     */
    MouseTargetType[MouseTargetType["OVERLAY_WIDGET"] = 12] = "OVERLAY_WIDGET";
    /**
     * Mouse is outside of the editor.
     */
    MouseTargetType[MouseTargetType["OUTSIDE_EDITOR"] = 13] = "OUTSIDE_EDITOR";
})(MouseTargetType || (MouseTargetType = {}));
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
 * A positioning preference for rendering overlay widgets.
 */
export var OverlayWidgetPositionPreference;
(function (OverlayWidgetPositionPreference) {
    /**
     * Position the overlay widget in the top right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_RIGHT_CORNER"] = 0] = "TOP_RIGHT_CORNER";
    /**
     * Position the overlay widget in the bottom right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["BOTTOM_RIGHT_CORNER"] = 1] = "BOTTOM_RIGHT_CORNER";
    /**
     * Position the overlay widget in the top center
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_CENTER"] = 2] = "TOP_CENTER";
})(OverlayWidgetPositionPreference || (OverlayWidgetPositionPreference = {}));
/**
 * Vertical Lane in the overview ruler of the editor.
 */
export var OverviewRulerLane;
(function (OverviewRulerLane) {
    OverviewRulerLane[OverviewRulerLane["Left"] = 1] = "Left";
    OverviewRulerLane[OverviewRulerLane["Center"] = 2] = "Center";
    OverviewRulerLane[OverviewRulerLane["Right"] = 4] = "Right";
    OverviewRulerLane[OverviewRulerLane["Full"] = 7] = "Full";
})(OverviewRulerLane || (OverviewRulerLane = {}));
/**
 * How a partial acceptance was triggered.
 */
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 0] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 1] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 2] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var PositionAffinity;
(function (PositionAffinity) {
    /**
     * Prefers the left most position.
    */
    PositionAffinity[PositionAffinity["Left"] = 0] = "Left";
    /**
     * Prefers the right most position.
    */
    PositionAffinity[PositionAffinity["Right"] = 1] = "Right";
    /**
     * No preference.
    */
    PositionAffinity[PositionAffinity["None"] = 2] = "None";
    /**
     * If the given position is on injected text, prefers the position left of it.
    */
    PositionAffinity[PositionAffinity["LeftOfInjectedText"] = 3] = "LeftOfInjectedText";
    /**
     * If the given position is on injected text, prefers the position right of it.
    */
    PositionAffinity[PositionAffinity["RightOfInjectedText"] = 4] = "RightOfInjectedText";
})(PositionAffinity || (PositionAffinity = {}));
export var RenderLineNumbersType;
(function (RenderLineNumbersType) {
    RenderLineNumbersType[RenderLineNumbersType["Off"] = 0] = "Off";
    RenderLineNumbersType[RenderLineNumbersType["On"] = 1] = "On";
    RenderLineNumbersType[RenderLineNumbersType["Relative"] = 2] = "Relative";
    RenderLineNumbersType[RenderLineNumbersType["Interval"] = 3] = "Interval";
    RenderLineNumbersType[RenderLineNumbersType["Custom"] = 4] = "Custom";
})(RenderLineNumbersType || (RenderLineNumbersType = {}));
export var RenderMinimap;
(function (RenderMinimap) {
    RenderMinimap[RenderMinimap["None"] = 0] = "None";
    RenderMinimap[RenderMinimap["Text"] = 1] = "Text";
    RenderMinimap[RenderMinimap["Blocks"] = 2] = "Blocks";
})(RenderMinimap || (RenderMinimap = {}));
export var ScrollType;
(function (ScrollType) {
    ScrollType[ScrollType["Smooth"] = 0] = "Smooth";
    ScrollType[ScrollType["Immediate"] = 1] = "Immediate";
})(ScrollType || (ScrollType = {}));
export var ScrollbarVisibility;
(function (ScrollbarVisibility) {
    ScrollbarVisibility[ScrollbarVisibility["Auto"] = 1] = "Auto";
    ScrollbarVisibility[ScrollbarVisibility["Hidden"] = 2] = "Hidden";
    ScrollbarVisibility[ScrollbarVisibility["Visible"] = 3] = "Visible";
})(ScrollbarVisibility || (ScrollbarVisibility = {}));
/**
 * The direction of a selection.
 */
export var SelectionDirection;
(function (SelectionDirection) {
    /**
     * The selection starts above where it ends.
     */
    SelectionDirection[SelectionDirection["LTR"] = 0] = "LTR";
    /**
     * The selection starts below where it ends.
     */
    SelectionDirection[SelectionDirection["RTL"] = 1] = "RTL";
})(SelectionDirection || (SelectionDirection = {}));
export var ShowLightbulbIconMode;
(function (ShowLightbulbIconMode) {
    ShowLightbulbIconMode["Off"] = "off";
    ShowLightbulbIconMode["OnCode"] = "onCode";
    ShowLightbulbIconMode["On"] = "on";
})(ShowLightbulbIconMode || (ShowLightbulbIconMode = {}));
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
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
export var SymbolTag;
(function (SymbolTag) {
    SymbolTag[SymbolTag["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
/**
 * The kind of animation in which the editor's cursor should be rendered.
 */
export var TextEditorCursorBlinkingStyle;
(function (TextEditorCursorBlinkingStyle) {
    /**
     * Hidden
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Hidden"] = 0] = "Hidden";
    /**
     * Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Blink"] = 1] = "Blink";
    /**
     * Blinking with smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Smooth"] = 2] = "Smooth";
    /**
     * Blinking with prolonged filled state and smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Phase"] = 3] = "Phase";
    /**
     * Expand collapse animation on the y axis
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Expand"] = 4] = "Expand";
    /**
     * No-Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Solid"] = 5] = "Solid";
})(TextEditorCursorBlinkingStyle || (TextEditorCursorBlinkingStyle = {}));
/**
 * The style in which the editor's cursor should be rendered.
 */
export var TextEditorCursorStyle;
(function (TextEditorCursorStyle) {
    /**
     * As a vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Line"] = 1] = "Line";
    /**
     * As a block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Block"] = 2] = "Block";
    /**
     * As a horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Underline"] = 3] = "Underline";
    /**
     * As a thin vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["LineThin"] = 4] = "LineThin";
    /**
     * As an outlined block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["BlockOutline"] = 5] = "BlockOutline";
    /**
     * As a thin horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["UnderlineThin"] = 6] = "UnderlineThin";
})(TextEditorCursorStyle || (TextEditorCursorStyle = {}));
/**
 * Describes the behavior of decorations when typing/editing near their edges.
 * Note: Please do not edit the values, as they very carefully match `DecorationRangeBehavior`
 */
export var TrackedRangeStickiness;
(function (TrackedRangeStickiness) {
    TrackedRangeStickiness[TrackedRangeStickiness["AlwaysGrowsWhenTypingAtEdges"] = 0] = "AlwaysGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["NeverGrowsWhenTypingAtEdges"] = 1] = "NeverGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingBefore"] = 2] = "GrowsOnlyWhenTypingBefore";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingAfter"] = 3] = "GrowsOnlyWhenTypingAfter";
})(TrackedRangeStickiness || (TrackedRangeStickiness = {}));
/**
 * Describes how to indent wrapped lines.
 */
export var WrappingIndent;
(function (WrappingIndent) {
    /**
     * No indentation => wrapped lines begin at column 1.
     */
    WrappingIndent[WrappingIndent["None"] = 0] = "None";
    /**
     * Same => wrapped lines get the same indentation as the parent.
     */
    WrappingIndent[WrappingIndent["Same"] = 1] = "Same";
    /**
     * Indent => wrapped lines get +1 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["Indent"] = 2] = "Indent";
    /**
     * DeepIndent => wrapped lines get +2 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["DeepIndent"] = 3] = "DeepIndent";
})(WrappingIndent || (WrappingIndent = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUVudW1zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc3RhbmRhbG9uZS9zdGFuZGFsb25lRW51bXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsa0RBQWtEO0FBR2xELE1BQU0sQ0FBTixJQUFZLG9CQU9YO0FBUEQsV0FBWSxvQkFBb0I7SUFDL0I7O09BRUc7SUFDSCxxRUFBVyxDQUFBO0lBQ1gsdUVBQVksQ0FBQTtJQUNaLHFFQUFXLENBQUE7QUFDWixDQUFDLEVBUFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQU8vQjtBQUVELE1BQU0sQ0FBTixJQUFZLHFCQUdYO0FBSEQsV0FBWSxxQkFBcUI7SUFDaEMscUVBQVUsQ0FBQTtJQUNWLGlFQUFRLENBQUE7QUFDVCxDQUFDLEVBSFcscUJBQXFCLEtBQXJCLHFCQUFxQixRQUdoQztBQUVELE1BQU0sQ0FBTixJQUFZLDRCQVdYO0FBWEQsV0FBWSw0QkFBNEI7SUFDdkMsK0VBQVEsQ0FBQTtJQUNSOzs7T0FHRztJQUNILG1HQUFrQixDQUFBO0lBQ2xCOztPQUVHO0lBQ0gscUdBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQVhXLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFXdkM7QUFFRCxNQUFNLENBQU4sSUFBWSxrQkE2Qlg7QUE3QkQsV0FBWSxrQkFBa0I7SUFDN0IsK0RBQVUsQ0FBQTtJQUNWLG1FQUFZLENBQUE7SUFDWix5RUFBZSxDQUFBO0lBQ2YsNkRBQVMsQ0FBQTtJQUNULG1FQUFZLENBQUE7SUFDWiw2REFBUyxDQUFBO0lBQ1QsK0RBQVUsQ0FBQTtJQUNWLHFFQUFhLENBQUE7SUFDYiwrREFBVSxDQUFBO0lBQ1YsbUVBQVksQ0FBQTtJQUNaLDhEQUFVLENBQUE7SUFDVixvRUFBYSxDQUFBO0lBQ2IsNERB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