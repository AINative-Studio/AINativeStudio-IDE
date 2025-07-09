/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Open ended enum at runtime
 */
export var LanguageId;
(function (LanguageId) {
    LanguageId[LanguageId["Null"] = 0] = "Null";
    LanguageId[LanguageId["PlainText"] = 1] = "PlainText";
})(LanguageId || (LanguageId = {}));
/**
 * A font style. Values are 2^x such that a bit mask can be used.
 */
export var FontStyle;
(function (FontStyle) {
    FontStyle[FontStyle["NotSet"] = -1] = "NotSet";
    FontStyle[FontStyle["None"] = 0] = "None";
    FontStyle[FontStyle["Italic"] = 1] = "Italic";
    FontStyle[FontStyle["Bold"] = 2] = "Bold";
    FontStyle[FontStyle["Underline"] = 4] = "Underline";
    FontStyle[FontStyle["Strikethrough"] = 8] = "Strikethrough";
})(FontStyle || (FontStyle = {}));
/**
 * Open ended enum at runtime
 */
export var ColorId;
(function (ColorId) {
    ColorId[ColorId["None"] = 0] = "None";
    ColorId[ColorId["DefaultForeground"] = 1] = "DefaultForeground";
    ColorId[ColorId["DefaultBackground"] = 2] = "DefaultBackground";
})(ColorId || (ColorId = {}));
/**
 * A standard token type.
 */
export var StandardTokenType;
(function (StandardTokenType) {
    StandardTokenType[StandardTokenType["Other"] = 0] = "Other";
    StandardTokenType[StandardTokenType["Comment"] = 1] = "Comment";
    StandardTokenType[StandardTokenType["String"] = 2] = "String";
    StandardTokenType[StandardTokenType["RegEx"] = 3] = "RegEx";
})(StandardTokenType || (StandardTokenType = {}));
/**
 * Helpers to manage the "collapsed" metadata of an entire StackElement stack.
 * The following assumptions have been made:
 *  - languageId < 256 => needs 8 bits
 *  - unique color count < 512 => needs 9 bits
 *
 * The binary format is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     bbbb bbbb ffff ffff fFFF FBTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LanguageId (8 bits)
 *  - T = StandardTokenType (2 bits)
 *  - B = Balanced bracket (1 bit)
 *  - F = FontStyle (4 bits)
 *  - f = foreground color (9 bits)
 *  - b = background color (8 bits)
 *
 */
export var MetadataConsts;
(function (MetadataConsts) {
    MetadataConsts[MetadataConsts["LANGUAGEID_MASK"] = 255] = "LANGUAGEID_MASK";
    MetadataConsts[MetadataConsts["TOKEN_TYPE_MASK"] = 768] = "TOKEN_TYPE_MASK";
    MetadataConsts[MetadataConsts["BALANCED_BRACKETS_MASK"] = 1024] = "BALANCED_BRACKETS_MASK";
    MetadataConsts[MetadataConsts["FONT_STYLE_MASK"] = 30720] = "FONT_STYLE_MASK";
    MetadataConsts[MetadataConsts["FOREGROUND_MASK"] = 16744448] = "FOREGROUND_MASK";
    MetadataConsts[MetadataConsts["BACKGROUND_MASK"] = 4278190080] = "BACKGROUND_MASK";
    MetadataConsts[MetadataConsts["ITALIC_MASK"] = 2048] = "ITALIC_MASK";
    MetadataConsts[MetadataConsts["BOLD_MASK"] = 4096] = "BOLD_MASK";
    MetadataConsts[MetadataConsts["UNDERLINE_MASK"] = 8192] = "UNDERLINE_MASK";
    MetadataConsts[MetadataConsts["STRIKETHROUGH_MASK"] = 16384] = "STRIKETHROUGH_MASK";
    // Semantic tokens cannot set the language id, so we can
    // use the first 8 bits for control purposes
    MetadataConsts[MetadataConsts["SEMANTIC_USE_ITALIC"] = 1] = "SEMANTIC_USE_ITALIC";
    MetadataConsts[MetadataConsts["SEMANTIC_USE_BOLD"] = 2] = "SEMANTIC_USE_BOLD";
    MetadataConsts[MetadataConsts["SEMANTIC_USE_UNDERLINE"] = 4] = "SEMANTIC_USE_UNDERLINE";
    MetadataConsts[MetadataConsts["SEMANTIC_USE_STRIKETHROUGH"] = 8] = "SEMANTIC_USE_STRIKETHROUGH";
    MetadataConsts[MetadataConsts["SEMANTIC_USE_FOREGROUND"] = 16] = "SEMANTIC_USE_FOREGROUND";
    MetadataConsts[MetadataConsts["SEMANTIC_USE_BACKGROUND"] = 32] = "SEMANTIC_USE_BACKGROUND";
    MetadataConsts[MetadataConsts["LANGUAGEID_OFFSET"] = 0] = "LANGUAGEID_OFFSET";
    MetadataConsts[MetadataConsts["TOKEN_TYPE_OFFSET"] = 8] = "TOKEN_TYPE_OFFSET";
    MetadataConsts[MetadataConsts["BALANCED_BRACKETS_OFFSET"] = 10] = "BALANCED_BRACKETS_OFFSET";
    MetadataConsts[MetadataConsts["FONT_STYLE_OFFSET"] = 11] = "FONT_STYLE_OFFSET";
    MetadataConsts[MetadataConsts["FOREGROUND_OFFSET"] = 15] = "FOREGROUND_OFFSET";
    MetadataConsts[MetadataConsts["BACKGROUND_OFFSET"] = 24] = "BACKGROUND_OFFSET";
})(MetadataConsts || (MetadataConsts = {}));
/**
 */
export class TokenMetadata {
    static getLanguageId(metadata) {
        return (metadata & 255 /* MetadataConsts.LANGUAGEID_MASK */) >>> 0 /* MetadataConsts.LANGUAGEID_OFFSET */;
    }
    static getTokenType(metadata) {
        return (metadata & 768 /* MetadataConsts.TOKEN_TYPE_MASK */) >>> 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */;
    }
    static containsBalancedBrackets(metadata) {
        return (metadata & 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) !== 0;
    }
    static getFontStyle(metadata) {
        return (metadata & 30720 /* MetadataConsts.FONT_STYLE_MASK */) >>> 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
    }
    static getForeground(metadata) {
        return (metadata & 16744448 /* MetadataConsts.FOREGROUND_MASK */) >>> 15 /* MetadataConsts.FOREGROUND_OFFSET */;
    }
    static getBackground(metadata) {
        return (metadata & 4278190080 /* MetadataConsts.BACKGROUND_MASK */) >>> 24 /* MetadataConsts.BACKGROUND_OFFSET */;
    }
    static getClassNameFromMetadata(metadata) {
        const foreground = this.getForeground(metadata);
        let className = 'mtk' + foreground;
        const fontStyle = this.getFontStyle(metadata);
        if (fontStyle & 1 /* FontStyle.Italic */) {
            className += ' mtki';
        }
        if (fontStyle & 2 /* FontStyle.Bold */) {
            className += ' mtkb';
        }
        if (fontStyle & 4 /* FontStyle.Underline */) {
            className += ' mtku';
        }
        if (fontStyle & 8 /* FontStyle.Strikethrough */) {
            className += ' mtks';
        }
        return className;
    }
    static getInlineStyleFromMetadata(metadata, colorMap) {
        const foreground = this.getForeground(metadata);
        const fontStyle = this.getFontStyle(metadata);
        let result = `color: ${colorMap[foreground]};`;
        if (fontStyle & 1 /* FontStyle.Italic */) {
            result += 'font-style: italic;';
        }
        if (fontStyle & 2 /* FontStyle.Bold */) {
            result += 'font-weight: bold;';
        }
        let textDecoration = '';
        if (fontStyle & 4 /* FontStyle.Underline */) {
            textDecoration += ' underline';
        }
        if (fontStyle & 8 /* FontStyle.Strikethrough */) {
            textDecoration += ' line-through';
        }
        if (textDecoration) {
            result += `text-decoration:${textDecoration};`;
        }
        return result;
    }
    static getPresentationFromMetadata(metadata) {
        const foreground = this.getForeground(metadata);
        const fontStyle = this.getFontStyle(metadata);
        return {
            foreground: foreground,
            italic: Boolean(fontStyle & 1 /* FontStyle.Italic */),
            bold: Boolean(fontStyle & 2 /* FontStyle.Bold */),
            underline: Boolean(fontStyle & 4 /* FontStyle.Underline */),
            strikethrough: Boolean(fontStyle & 8 /* FontStyle.Strikethrough */),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RlZFRva2VuQXR0cmlidXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2VuY29kZWRUb2tlbkF0dHJpYnV0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsVUFHakI7QUFIRCxXQUFrQixVQUFVO0lBQzNCLDJDQUFRLENBQUE7SUFDUixxREFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixVQUFVLEtBQVYsVUFBVSxRQUczQjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLFNBT2pCO0FBUEQsV0FBa0IsU0FBUztJQUMxQiw4Q0FBVyxDQUFBO0lBQ1gseUNBQVEsQ0FBQTtJQUNSLDZDQUFVLENBQUE7SUFDVix5Q0FBUSxDQUFBO0lBQ1IsbURBQWEsQ0FBQTtJQUNiLDJEQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFQaUIsU0FBUyxLQUFULFNBQVMsUUFPMUI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixPQUlqQjtBQUpELFdBQWtCLE9BQU87SUFDeEIscUNBQVEsQ0FBQTtJQUNSLCtEQUFxQixDQUFBO0lBQ3JCLCtEQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFKaUIsT0FBTyxLQUFQLE9BQU8sUUFJeEI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixpQkFLakI7QUFMRCxXQUFrQixpQkFBaUI7SUFDbEMsMkRBQVMsQ0FBQTtJQUNULCtEQUFXLENBQUE7SUFDWCw2REFBVSxDQUFBO0lBQ1YsMkRBQVMsQ0FBQTtBQUNWLENBQUMsRUFMaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUtsQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSCxNQUFNLENBQU4sSUFBa0IsY0E0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