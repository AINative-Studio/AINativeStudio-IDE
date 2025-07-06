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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUVudW1zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zdGFuZGFsb25lL3N0YW5kYWxvbmVFbnVtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxrREFBa0Q7QUFHbEQsTUFBTSxDQUFOLElBQVksb0JBT1g7QUFQRCxXQUFZLG9CQUFvQjtJQUMvQjs7T0FFRztJQUNILHFFQUFXLENBQUE7SUFDWCx1RUFBWSxDQUFBO0lBQ1oscUVBQVcsQ0FBQTtBQUNaLENBQUMsRUFQVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBTy9CO0FBRUQsTUFBTSxDQUFOLElBQVkscUJBR1g7QUFIRCxXQUFZLHFCQUFxQjtJQUNoQyxxRUFBVSxDQUFBO0lBQ1YsaUVBQVEsQ0FBQTtBQUNULENBQUMsRUFIVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBR2hDO0FBRUQsTUFBTSxDQUFOLElBQVksNEJBV1g7QUFYRCxXQUFZLDRCQUE0QjtJQUN2QywrRUFBUSxDQUFBO0lBQ1I7OztPQUdHO0lBQ0gsbUdBQWtCLENBQUE7SUFDbEI7O09BRUc7SUFDSCxxR0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBWFcsNEJBQTRCLEtBQTVCLDRCQUE0QixRQVd2QztBQUVELE1BQU0sQ0FBTixJQUFZLGtCQTZCWDtBQTdCRCxXQUFZLGtCQUFrQjtJQUM3QiwrREFBVSxDQUFBO0lBQ1YsbUVBQVksQ0FBQTtJQUNaLHlFQUFlLENBQUE7SUFDZiw2REFBUyxDQUFBO0lBQ1QsbUVBQVksQ0FBQTtJQUNaLDZEQUFTLENBQUE7SUFDVCwrREFBVSxDQUFBO0lBQ1YscUVBQWEsQ0FBQTtJQUNiLCtEQUFVLENBQUE7SUFDVixtRUFBWSxDQUFBO0lBQ1osOERBQVUsQ0FBQTtJQUNWLG9FQUFhLENBQUE7SUFDYiw0REFB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