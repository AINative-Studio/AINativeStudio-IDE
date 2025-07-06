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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RlZFRva2VuQXR0cmlidXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9lbmNvZGVkVG9rZW5BdHRyaWJ1dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLFVBR2pCO0FBSEQsV0FBa0IsVUFBVTtJQUMzQiwyQ0FBUSxDQUFBO0lBQ1IscURBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsVUFBVSxLQUFWLFVBQVUsUUFHM0I7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixTQU9qQjtBQVBELFdBQWtCLFNBQVM7SUFDMUIsOENBQVcsQ0FBQTtJQUNYLHlDQUFRLENBQUE7SUFDUiw2Q0FBVSxDQUFBO0lBQ1YseUNBQVEsQ0FBQTtJQUNSLG1EQUFhLENBQUE7SUFDYiwyREFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBUGlCLFNBQVMsS0FBVCxTQUFTLFFBTzFCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsT0FJakI7QUFKRCxXQUFrQixPQUFPO0lBQ3hCLHFDQUFRLENBQUE7SUFDUiwrREFBcUIsQ0FBQTtJQUNyQiwrREFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBSmlCLE9BQU8sS0FBUCxPQUFPLFFBSXhCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsaUJBS2pCO0FBTEQsV0FBa0IsaUJBQWlCO0lBQ2xDLDJEQUFTLENBQUE7SUFDVCwrREFBVyxDQUFBO0lBQ1gsNkRBQVUsQ0FBQTtJQUNWLDJEQUFTLENBQUE7QUFDVixDQUFDLEVBTGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFLbEM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsTUFBTSxDQUFOLElBQWtC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