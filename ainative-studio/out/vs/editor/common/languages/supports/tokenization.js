/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
export class ParsedTokenThemeRule {
    constructor(token, index, fontStyle, foreground, background) {
        this._parsedThemeRuleBrand = undefined;
        this.token = token;
        this.index = index;
        this.fontStyle = fontStyle;
        this.foreground = foreground;
        this.background = background;
    }
}
/**
 * Parse a raw theme into rules.
 */
export function parseTokenTheme(source) {
    if (!source || !Array.isArray(source)) {
        return [];
    }
    const result = [];
    let resultLen = 0;
    for (let i = 0, len = source.length; i < len; i++) {
        const entry = source[i];
        let fontStyle = -1 /* FontStyle.NotSet */;
        if (typeof entry.fontStyle === 'string') {
            fontStyle = 0 /* FontStyle.None */;
            const segments = entry.fontStyle.split(' ');
            for (let j = 0, lenJ = segments.length; j < lenJ; j++) {
                const segment = segments[j];
                switch (segment) {
                    case 'italic':
                        fontStyle = fontStyle | 1 /* FontStyle.Italic */;
                        break;
                    case 'bold':
                        fontStyle = fontStyle | 2 /* FontStyle.Bold */;
                        break;
                    case 'underline':
                        fontStyle = fontStyle | 4 /* FontStyle.Underline */;
                        break;
                    case 'strikethrough':
                        fontStyle = fontStyle | 8 /* FontStyle.Strikethrough */;
                        break;
                }
            }
        }
        let foreground = null;
        if (typeof entry.foreground === 'string') {
            foreground = entry.foreground;
        }
        let background = null;
        if (typeof entry.background === 'string') {
            background = entry.background;
        }
        result[resultLen++] = new ParsedTokenThemeRule(entry.token || '', i, fontStyle, foreground, background);
    }
    return result;
}
/**
 * Resolve rules (i.e. inheritance).
 */
function resolveParsedTokenThemeRules(parsedThemeRules, customTokenColors) {
    // Sort rules lexicographically, and then by index if necessary
    parsedThemeRules.sort((a, b) => {
        const r = strcmp(a.token, b.token);
        if (r !== 0) {
            return r;
        }
        return a.index - b.index;
    });
    // Determine defaults
    let defaultFontStyle = 0 /* FontStyle.None */;
    let defaultForeground = '000000';
    let defaultBackground = 'ffffff';
    while (parsedThemeRules.length >= 1 && parsedThemeRules[0].token === '') {
        const incomingDefaults = parsedThemeRules.shift();
        if (incomingDefaults.fontStyle !== -1 /* FontStyle.NotSet */) {
            defaultFontStyle = incomingDefaults.fontStyle;
        }
        if (incomingDefaults.foreground !== null) {
            defaultForeground = incomingDefaults.foreground;
        }
        if (incomingDefaults.background !== null) {
            defaultBackground = incomingDefaults.background;
        }
    }
    const colorMap = new ColorMap();
    // start with token colors from custom token themes
    for (const color of customTokenColors) {
        colorMap.getId(color);
    }
    const foregroundColorId = colorMap.getId(defaultForeground);
    const backgroundColorId = colorMap.getId(defaultBackground);
    const defaults = new ThemeTrieElementRule(defaultFontStyle, foregroundColorId, backgroundColorId);
    const root = new ThemeTrieElement(defaults);
    for (let i = 0, len = parsedThemeRules.length; i < len; i++) {
        const rule = parsedThemeRules[i];
        root.insert(rule.token, rule.fontStyle, colorMap.getId(rule.foreground), colorMap.getId(rule.background));
    }
    return new TokenTheme(colorMap, root);
}
const colorRegExp = /^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/;
export class ColorMap {
    constructor() {
        this._lastColorId = 0;
        this._id2color = [];
        this._color2id = new Map();
    }
    getId(color) {
        if (color === null) {
            return 0;
        }
        const match = color.match(colorRegExp);
        if (!match) {
            throw new Error('Illegal value for token color: ' + color);
        }
        color = match[1].toUpperCase();
        let value = this._color2id.get(color);
        if (value) {
            return value;
        }
        value = ++this._lastColorId;
        this._color2id.set(color, value);
        this._id2color[value] = Color.fromHex('#' + color);
        return value;
    }
    getColorMap() {
        return this._id2color.slice(0);
    }
}
export class TokenTheme {
    static createFromRawTokenTheme(source, customTokenColors) {
        return this.createFromParsedTokenTheme(parseTokenTheme(source), customTokenColors);
    }
    static createFromParsedTokenTheme(source, customTokenColors) {
        return resolveParsedTokenThemeRules(source, customTokenColors);
    }
    constructor(colorMap, root) {
        this._colorMap = colorMap;
        this._root = root;
        this._cache = new Map();
    }
    getColorMap() {
        return this._colorMap.getColorMap();
    }
    /**
     * used for testing purposes
     */
    getThemeTrieElement() {
        return this._root.toExternalThemeTrieElement();
    }
    _match(token) {
        return this._root.match(token);
    }
    match(languageId, token) {
        // The cache contains the metadata without the language bits set.
        let result = this._cache.get(token);
        if (typeof result === 'undefined') {
            const rule = this._match(token);
            const standardToken = toStandardTokenType(token);
            result = (rule.metadata
                | (standardToken << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>> 0;
            this._cache.set(token, result);
        }
        return (result
            | (languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)) >>> 0;
    }
}
const STANDARD_TOKEN_TYPE_REGEXP = /\b(comment|string|regex|regexp)\b/;
export function toStandardTokenType(tokenType) {
    const m = tokenType.match(STANDARD_TOKEN_TYPE_REGEXP);
    if (!m) {
        return 0 /* StandardTokenType.Other */;
    }
    switch (m[1]) {
        case 'comment':
            return 1 /* StandardTokenType.Comment */;
        case 'string':
            return 2 /* StandardTokenType.String */;
        case 'regex':
            return 3 /* StandardTokenType.RegEx */;
        case 'regexp':
            return 3 /* StandardTokenType.RegEx */;
    }
    throw new Error('Unexpected match for standard token type!');
}
export function strcmp(a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}
export class ThemeTrieElementRule {
    constructor(fontStyle, foreground, background) {
        this._themeTrieElementRuleBrand = undefined;
        this._fontStyle = fontStyle;
        this._foreground = foreground;
        this._background = background;
        this.metadata = ((this._fontStyle << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)
            | (this._foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
            | (this._background << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>> 0;
    }
    clone() {
        return new ThemeTrieElementRule(this._fontStyle, this._foreground, this._background);
    }
    acceptOverwrite(fontStyle, foreground, background) {
        if (fontStyle !== -1 /* FontStyle.NotSet */) {
            this._fontStyle = fontStyle;
        }
        if (foreground !== 0 /* ColorId.None */) {
            this._foreground = foreground;
        }
        if (background !== 0 /* ColorId.None */) {
            this._background = background;
        }
        this.metadata = ((this._fontStyle << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)
            | (this._foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
            | (this._background << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>> 0;
    }
}
export class ExternalThemeTrieElement {
    constructor(mainRule, children = new Map()) {
        this.mainRule = mainRule;
        if (children instanceof Map) {
            this.children = children;
        }
        else {
            this.children = new Map();
            for (const key in children) {
                this.children.set(key, children[key]);
            }
        }
    }
}
export class ThemeTrieElement {
    constructor(mainRule) {
        this._themeTrieElementBrand = undefined;
        this._mainRule = mainRule;
        this._children = new Map();
    }
    /**
     * used for testing purposes
     */
    toExternalThemeTrieElement() {
        const children = new Map();
        this._children.forEach((element, index) => {
            children.set(index, element.toExternalThemeTrieElement());
        });
        return new ExternalThemeTrieElement(this._mainRule, children);
    }
    match(token) {
        if (token === '') {
            return this._mainRule;
        }
        const dotIndex = token.indexOf('.');
        let head;
        let tail;
        if (dotIndex === -1) {
            head = token;
            tail = '';
        }
        else {
            head = token.substring(0, dotIndex);
            tail = token.substring(dotIndex + 1);
        }
        const child = this._children.get(head);
        if (typeof child !== 'undefined') {
            return child.match(tail);
        }
        return this._mainRule;
    }
    insert(token, fontStyle, foreground, background) {
        if (token === '') {
            // Merge into the main rule
            this._mainRule.acceptOverwrite(fontStyle, foreground, background);
            return;
        }
        const dotIndex = token.indexOf('.');
        let head;
        let tail;
        if (dotIndex === -1) {
            head = token;
            tail = '';
        }
        else {
            head = token.substring(0, dotIndex);
            tail = token.substring(dotIndex + 1);
        }
        let child = this._children.get(head);
        if (typeof child === 'undefined') {
            child = new ThemeTrieElement(this._mainRule.clone());
            this._children.set(head, child);
        }
        child.insert(tail, fontStyle, foreground, background);
    }
}
export function generateTokensCSSForColorMap(colorMap) {
    const rules = [];
    for (let i = 1, len = colorMap.length; i < len; i++) {
        const color = colorMap[i];
        rules[i] = `.mtk${i} { color: ${color}; }`;
    }
    rules.push('.mtki { font-style: italic; }');
    rules.push('.mtkb { font-weight: bold; }');
    rules.push('.mtku { text-decoration: underline; text-underline-position: under; }');
    rules.push('.mtks { text-decoration: line-through; }');
    rules.push('.mtks.mtku { text-decoration: underline line-through; text-underline-position: under; }');
    return rules.join('\n');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL3Rva2VuaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFVekQsTUFBTSxPQUFPLG9CQUFvQjtJQWFoQyxZQUNDLEtBQWEsRUFDYixLQUFhLEVBQ2IsU0FBaUIsRUFDakIsVUFBeUIsRUFDekIsVUFBeUI7UUFqQjFCLDBCQUFxQixHQUFTLFNBQVMsQ0FBQztRQW1CdkMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUFDLE1BQXlCO0lBQ3hELElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDdkMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBQ0QsTUFBTSxNQUFNLEdBQTJCLEVBQUUsQ0FBQztJQUMxQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25ELE1BQU0sS0FB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