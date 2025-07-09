/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["Dollar"] = 0] = "Dollar";
    TokenType[TokenType["Colon"] = 1] = "Colon";
    TokenType[TokenType["Comma"] = 2] = "Comma";
    TokenType[TokenType["CurlyOpen"] = 3] = "CurlyOpen";
    TokenType[TokenType["CurlyClose"] = 4] = "CurlyClose";
    TokenType[TokenType["Backslash"] = 5] = "Backslash";
    TokenType[TokenType["Forwardslash"] = 6] = "Forwardslash";
    TokenType[TokenType["Pipe"] = 7] = "Pipe";
    TokenType[TokenType["Int"] = 8] = "Int";
    TokenType[TokenType["VariableName"] = 9] = "VariableName";
    TokenType[TokenType["Format"] = 10] = "Format";
    TokenType[TokenType["Plus"] = 11] = "Plus";
    TokenType[TokenType["Dash"] = 12] = "Dash";
    TokenType[TokenType["QuestionMark"] = 13] = "QuestionMark";
    TokenType[TokenType["EOF"] = 14] = "EOF";
})(TokenType || (TokenType = {}));
export class Scanner {
    constructor() {
        this.value = '';
        this.pos = 0;
    }
    static { this._table = {
        [36 /* CharCode.DollarSign */]: 0 /* TokenType.Dollar */,
        [58 /* CharCode.Colon */]: 1 /* TokenType.Colon */,
        [44 /* CharCode.Comma */]: 2 /* TokenType.Comma */,
        [123 /* CharCode.OpenCurlyBrace */]: 3 /* TokenType.CurlyOpen */,
        [125 /* CharCode.CloseCurlyBrace */]: 4 /* TokenType.CurlyClose */,
        [92 /* CharCode.Backslash */]: 5 /* TokenType.Backslash */,
        [47 /* CharCode.Slash */]: 6 /* TokenType.Forwardslash */,
        [124 /* CharCode.Pipe */]: 7 /* TokenType.Pipe */,
        [43 /* CharCode.Plus */]: 11 /* TokenType.Plus */,
        [45 /* CharCode.Dash */]: 12 /* TokenType.Dash */,
        [63 /* CharCode.QuestionMark */]: 13 /* TokenType.QuestionMark */,
    }; }
    static isDigitCharacter(ch) {
        return ch >= 48 /* CharCode.Digit0 */ && ch <= 57 /* CharCode.Digit9 */;
    }
    static isVariableCharacter(ch) {
        return ch === 95 /* CharCode.Underline */
            || (ch >= 97 /* CharCode.a */ && ch <= 122 /* CharCode.z */)
            || (ch >= 65 /* CharCode.A */ && ch <= 90 /* CharCode.Z */);
    }
    text(value) {
        this.value = value;
        this.pos = 0;
    }
    tokenText(token) {
        return this.value.substr(token.pos, token.len);
    }
    next() {
        if (this.pos >= this.value.length) {
            return { type: 14 /* TokenType.EOF */, pos: this.pos, len: 0 };
        }
        const pos = this.pos;
        let len = 0;
        let ch = this.value.charCodeAt(pos);
        let type;
        // static types
        type = Scanner._table[ch];
        if (typeof type === 'number') {
            this.pos += 1;
            return { type, pos, len: 1 };
        }
        // number
        if (Scanner.isDigitCharacter(ch)) {
            type = 8 /* TokenType.Int */;
            do {
                len += 1;
                ch = this.value.charCodeAt(pos + len);
            } while (Scanner.isDigitCharacter(ch));
            this.pos += len;
            return { type, pos, len };
        }
        // variable name
        if (Scanner.isVariableCharacter(ch)) {
            type = 9 /* TokenType.VariableName */;
            do {
                ch = this.value.charCodeAt(pos + (++len));
            } while (Scanner.isVariableCharacter(ch) || Scanner.isDigitCharacter(ch));
            this.pos += len;
            return { type, pos, len };
        }
        // format
        type = 10 /* TokenType.Format */;
        do {
            len += 1;
            ch = this.value.charCodeAt(pos + len);
        } while (!isNaN(ch)
            && typeof Scanner._table[ch] === 'undefined' // not static token
            && !Scanner.isDigitCharacter(ch) // not number
            && !Scanner.isVariableCharacter(ch) // not variable
        );
        this.pos += len;
        return { type, pos, len };
    }
}
export class Marker {
    constructor() {
        this._children = [];
    }
    appendChild(child) {
        if (child instanceof Text && this._children[this._children.length - 1] instanceof Text) {
            // this and previous child are text -> merge them
            this._children[this._children.length - 1].value += child.value;
        }
        else {
            // normal adoption of child
            child.parent = this;
            this._children.push(child);
        }
        return this;
    }
    replace(child, others) {
        const { parent } = child;
        const idx = parent.children.indexOf(child);
        const newChildren = parent.children.slice(0);
        newChildren.splice(idx, 1, ...others);
        parent._children = newChildren;
        (function _fixParent(children, parent) {
            for (const child of children) {
                child.parent = parent;
                _fixParent(child.children, child);
            }
        })(others, parent);
    }
    get children() {
        return this._children;
    }
    get rightMostDescendant() {
        if (this._children.length > 0) {
            return this._children[this._children.length - 1].rightMostDescendant;
        }
        return this;
    }
    get snippet() {
        let candidate = this;
        while (true) {
            if (!candidate) {
                return undefined;
            }
            if (candidate instanceof TextmateSnippet) {
                return candidate;
            }
            candidate = candidate.parent;
        }
    }
    toString() {
        return this.children.reduce((prev, cur) => prev + cur.toString(), '');
    }
    len() {
        return 0;
    }
}
export class Text extends Marker {
    static escape(value) {
        return value.replace(/\$|}|\\/g, '\\$&');
    }
    constructor(value) {
        super();
        this.value = value;
    }
    toString() {
        return this.value;
    }
    toTextmateString() {
        return Text.escape(this.value);
    }
    len() {
        return this.value.length;
    }
    clone() {
        return new Text(this.value);
    }
}
export class TransformableMarker extends Marker {
}
export class Placeholder extends TransformableMarker {
    static compareByIndex(a, b) {
        if (a.index === b.index) {
            return 0;
        }
        else if (a.isFinalTabstop) {
            return 1;
        }
        else if (b.isFinalTabstop) {
            return -1;
        }
        else if (a.index < b.index) {
            return -1;
        }
        else if (a.index > b.index) {
            return 1;
        }
        else {
            return 0;
        }
    }
    constructor(index) {
        super();
        this.index = index;
    }
    get isFinalTabstop() {
        return this.index === 0;
    }
    get choice() {
        return this._children.length === 1 && this._children[0] instanceof Choice
            ? this._children[0]
            : undefined;
    }
    toTextmateString() {
        let transformString = '';
        if (this.transform) {
            transformString = this.transform.toTextmateString();
        }
        if (this.children.length === 0 && !this.transform) {
            return `\$${this.index}`;
        }
        else if (this.children.length === 0) {
            return `\${${this.index}${transformString}}`;
        }
        else if (this.choice) {
            return `\${${this.index}|${this.choice.toTextmateString()}|${transformString}}`;
        }
        else {
            return `\${${this.index}:${this.children.map(child => child.toTextmateString()).join('')}${transformString}}`;
        }
    }
    clone() {
        const ret = new Placeholder(this.index);
        if (this.transform) {
            ret.transform = this.transform.clone();
        }
        ret._children = this.children.map(child => child.clone());
        return ret;
    }
}
export class Choice extends Marker {
    constructor() {
        super(...arguments);
        this.options = [];
    }
    appendChild(marker) {
        if (marker instanceof Text) {
            marker.parent = this;
            this.options.push(marker);
        }
        return this;
    }
    toString() {
        return this.options[0].value;
    }
    toTextmateString() {
        return this.options
            .map(option => option.value.replace(/\||,|\\/g, '\\$&'))
            .join(',');
    }
    len() {
        return this.options[0].len();
    }
    clone() {
        const ret = new Choice();
        this.options.forEach(ret.appendChild, ret);
        return ret;
    }
}
export class Transform extends Marker {
    constructor() {
        super(...arguments);
        this.regexp = new RegExp('');
    }
    resolve(value) {
        const _this = this;
        let didMatch = false;
        let ret = value.replace(this.regexp, function () {
            didMatch = true;
            return _this._replace(Array.prototype.slice.call(arguments, 0, -2));
        });
        // when the regex didn't match and when the transform has
        // else branches, then run those
        if (!didMatch && this._children.some(child => child instanceof FormatString && Boolean(child.elseValue))) {
            ret = this._replace([]);
        }
        return ret;
    }
    _replace(groups) {
        let ret = '';
        for (const marker of this._children) {
            if (marker instanceof FormatString) {
                let value = groups[marker.index] || '';
                value = marker.resolve(value);
                ret += value;
            }
            else {
                ret += marker.toString();
            }
        }
        return ret;
    }
    toString() {
        return '';
    }
    toTextmateString() {
        return `/${this.regexp.source}/${this.children.map(c => c.toTextmateString())}/${(this.regexp.ignoreCase ? 'i' : '') + (this.regexp.global ? 'g' : '')}`;
    }
    clone() {
        const ret = new Transform();
        ret.regexp = new RegExp(this.regexp.source, '' + (this.regexp.ignoreCase ? 'i' : '') + (this.regexp.global ? 'g' : ''));
        ret._children = this.children.map(child => child.clone());
        return ret;
    }
}
export class FormatString extends Marker {
    constructor(index, shorthandName, ifValue, elseValue) {
        super();
        this.index = index;
        this.shorthandName = shorthandName;
        this.ifValue = ifValue;
        this.elseValue = elseValue;
    }
    resolve(value) {
        if (this.shorthandName === 'upcase') {
            return !value ? '' : value.toLocaleUpperCase();
        }
        else if (this.shorthandName === 'downcase') {
            return !value ? '' : value.toLocaleLowerCase();
        }
        else if (this.shorthandName === 'capitalize') {
            return !value ? '' : (value[0].toLocaleUpperCase() + value.substr(1));
        }
        else if (this.shorthandName === 'pascalcase') {
            return !value ? '' : this._toPascalCase(value);
        }
        else if (this.shorthandName === 'camelcase') {
            return !value ? '' : this._toCamelCase(value);
        }
        else if (Boolean(value) && typeof this.ifValue === 'string') {
            return this.ifValue;
        }
        else if (!Boolean(value) && typeof this.elseValue === 'string') {
            return this.elseValue;
        }
        else {
            return value || '';
        }
    }
    _toPascalCase(value) {
        const match = value.match(/[a-z0-9]+/gi);
        if (!match) {
            return value;
        }
        return match.map(word => {
            return word.charAt(0).toUpperCase() + word.substr(1);
        })
            .join('');
    }
    _toCamelCase(value) {
        const match = value.match(/[a-z0-9]+/gi);
        if (!match) {
            return value;
        }
        return match.map((word, index) => {
            if (index === 0) {
                return word.charAt(0).toLowerCase() + word.substr(1);
            }
            return word.charAt(0).toUpperCase() + word.substr(1);
        })
            .join('');
    }
    toTextmateString() {
        let value = '${';
        value += this.index;
        if (this.shorthandName) {
            value += `:/${this.shorthandName}`;
        }
        else if (this.ifValue && this.elseValue) {
            value += `:?${this.ifValue}:${this.elseValue}`;
        }
        else if (this.ifValue) {
            value += `:+${this.ifValue}`;
        }
        else if (this.elseValue) {
            value += `:-${this.elseValue}`;
        }
        value += '}';
        return value;
    }
    clone() {
        const ret = new FormatString(this.index, this.shorthandName, this.ifValue, this.elseValue);
        return ret;
    }
}
export class Variable extends TransformableMarker {
    constructor(name) {
        super();
        this.name = name;
    }
    resolve(resolver) {
        let value = resolver.resolve(this);
        if (this.transform) {
            value = this.transform.resolve(value || '');
        }
        if (value !== undefined) {
            this._children = [new Text(value)];
            return true;
        }
        return false;
    }
    toTextmateString() {
        let transformString = '';
        if (this.transform) {
            transformString = this.transform.toTextmateString();
        }
        if (this.children.length === 0) {
            return `\${${this.name}${transformString}}`;
        }
        else {
            return `\${${this.name}:${this.children.map(child => child.toTextmateString()).join('')}${transformString}}`;
        }
    }
    clone() {
        const ret = new Variable(this.name);
        if (this.transform) {
            ret.transform = this.transform.clone();
        }
        ret._children = this.children.map(child => child.clone());
        return ret;
    }
}
function walk(marker, visitor) {
    const stack = [...marker];
    while (stack.length > 0) {
        const marker = stack.shift();
        const recurse = visitor(marker);
        if (!recurse) {
            break;
        }
        stack.unshift(...marker.children);
    }
}
export class TextmateSnippet extends Marker {
    get placeholderInfo() {
        if (!this._placeholders) {
            // fill in placeholders
            const all = [];
            let last;
            this.walk(function (candidate) {
                if (candidate instanceof Placeholder) {
                    all.push(candidate);
                    last = !last || last.index < candidate.index ? candidate : last;
                }
                return true;
            });
            this._placeholders = { all, last };
        }
        return this._placeholders;
    }
    get placeholders() {
        const { all } = this.placeholderInfo;
        return all;
    }
    offset(marker) {
        let pos = 0;
        let found = false;
        this.walk(candidate => {
            if (candidate === marker) {
                found = true;
                return false;
            }
            pos += candidate.len();
            return true;
        });
        if (!found) {
            return -1;
        }
        return pos;
    }
    fullLen(marker) {
        let ret = 0;
        walk([marker], marker => {
            ret += marker.len();
            return true;
        });
        return ret;
    }
    enclosingPlaceholders(placeholder) {
        const ret = [];
        let { parent } = placeholder;
        while (parent) {
            if (parent instanceof Placeholder) {
                ret.push(parent);
            }
            parent = parent.parent;
        }
        return ret;
    }
    resolveVariables(resolver) {
        this.walk(candidate => {
            if (candidate instanceof Variable) {
                if (candidate.resolve(resolver)) {
                    this._placeholders = undefined;
                }
            }
            return true;
        });
        return this;
    }
    appendChild(child) {
        this._placeholders = undefined;
        return super.appendChild(child);
    }
    replace(child, others) {
        this._placeholders = undefined;
        return super.replace(child, others);
    }
    toTextmateString() {
        return this.children.reduce((prev, cur) => prev + cur.toTextmateString(), '');
    }
    clone() {
        const ret = new TextmateSnippet();
        this._children = this.children.map(child => child.clone());
        return ret;
    }
    walk(visitor) {
        walk(this.children, visitor);
    }
}
export class SnippetParser {
    constructor() {
        this._scanner = new Scanner();
        this._token = { type: 14 /* TokenType.EOF */, pos: 0, len: 0 };
    }
    static escape(value) {
        return value.replace(/\$|}|\\/g, '\\$&');
    }
    /**
     * Takes a snippet and returns the insertable string, e.g return the snippet-string
     * without any placeholder, tabstop, variables etc...
     */
    static asInsertText(value) {
        return new SnippetParser().parse(value).toString();
    }
    static guessNeedsClipboard(template) {
        return /\${?CLIPBOARD/.test(template);
    }
    parse(value, insertFinalTabstop, enforceFinalTabstop) {
        const snippet = new TextmateSnippet();
        this.parseFragment(value, snippet);
        this.ensureFinalTabstop(snippet, enforceFinalTabstop ?? false, insertFinalTabstop ?? false);
        return snippet;
    }
    parseFragment(value, snippet) {
        const offset = snippet.children.length;
        this._scanner.text(value);
        this._token = this._scanner.next();
        while (this._parse(snippet)) {
            // nothing
        }
        // fill in values for placeholders. the first placeholder of an index
        // that has a value defines the value for all placeholders with that index
        const placeholderDefaultValues = new Map();
        const incompletePlaceholders = [];
        snippet.walk(marker => {
            if (marker instanceof Placeholder) {
                if (marker.isFinalTabstop) {
                    placeholderDefaultValues.set(0, undefined);
                }
                else if (!placeholderDefaultValues.has(marker.index) && marker.children.length > 0) {
                    placeholderDefaultValues.set(marker.index, marker.children);
                }
                else {
                    incompletePlaceholders.push(marker);
                }
            }
            return true;
        });
        const fillInIncompletePlaceholder = (placeholder, stack) => {
            const defaultValues = placeholderDefaultValues.get(placeholder.index);
            if (!defaultValues) {
                return;
            }
            const clone = new Placeholder(placeholder.index);
            clone.transform = placeholder.transform;
            for (const child of defaultValues) {
                const newChild = child.clone();
                clone.appendChild(newChild);
                // "recurse" on children that are again placeholders
                if (newChild instanceof Placeholder && placeholderDefaultValues.has(newChild.index) && !stack.has(newChild.index)) {
                    stack.add(newChild.index);
                    fillInIncompletePlaceholder(newChild, stack);
                    stack.delete(newChild.index);
                }
            }
            snippet.replace(placeholder, [clone]);
        };
        const stack = new Set();
        for (const placeholder of incompletePlaceholders) {
            fillInIncompletePlaceholder(placeholder, stack);
        }
        return snippet.children.slice(offset);
    }
    ensureFinalTabstop(snippet, enforceFinalTabstop, insertFinalTabstop) {
        if (enforceFinalTabstop || insertFinalTabstop && snippet.placeholders.length > 0) {
            const finalTabstop = snippet.placeholders.find(p => p.index === 0);
            if (!finalTabstop) {
                // the snippet uses placeholders but has no
                // final tabstop defined -> insert at the end
                snippet.appendChild(new Placeholder(0));
            }
        }
    }
    _accept(type, value) {
        if (type === undefined || this._token.type === type) {
            const ret = !value ? true : this._scanner.tokenText(this._token);
            this._token = this._scanner.next();
            return ret;
        }
        return false;
    }
    _backTo(token) {
        this._scanner.pos = token.pos + token.len;
        this._token = token;
        return false;
    }
    _until(type) {
        const start = this._token;
        while (this._token.type !== type) {
            if (this._token.type === 14 /* TokenType.EOF */) {
                return false;
            }
            else if (this._token.type === 5 /* TokenType.Backslash */) {
                const nextToken = this._scanner.next();
                if (nextToken.type !== 0 /* TokenType.Dollar */
                    && nextToken.type !== 4 /* TokenType.CurlyClose */
                    && nextToken.type !== 5 /* TokenType.Backslash */) {
                    return false;
                }
            }
            this._token = this._scanner.next();
        }
        const value = this._scanner.value.substring(start.pos, this._token.pos).replace(/\\(\$|}|\\)/g, '$1');
        this._token = this._scanner.next();
        return value;
    }
    _parse(marker) {
        return this._parseEscaped(marker)
            || this._parseTabstopOrVariableName(marker)
            || this._parseComplexPlaceholder(marker)
            || this._parseComplexVariable(marker)
            || this._parseAnything(marker);
    }
    // \$, \\, \} -> just text
    _parseEscaped(marker) {
        let value;
        if (value = this._accept(5 /* TokenType.Backslash */, true)) {
            // saw a backslash, append escaped token or that backslash
            value = this._accept(0 /* TokenType.Dollar */, true)
                || this._accept(4 /* TokenType.CurlyClose */, true)
                || this._accept(5 /* TokenType.Backslash */, true)
                || value;
            marker.appendChild(new Text(value));
            return true;
        }
        return false;
    }
    // $foo -> variable, $1 -> tabstop
    _parseTabstopOrVariableName(parent) {
        let value;
        const token = this._token;
        const match = this._accept(0 /* TokenType.Dollar */)
            && (value = this._accept(9 /* TokenType.VariableName */, true) || this._accept(8 /* TokenType.Int */, true));
        if (!match) {
            return this._backTo(token);
        }
        parent.appendChild(/^\d+$/.test(value)
            ? new Placeholder(Number(value))
            : new Variable(value));
        return true;
    }
    // ${1:<children>}, ${1} -> placeholder
    _parseComplexPlaceholder(parent) {
        let index;
        const token = this._token;
        const match = this._accept(0 /* TokenType.Dollar */)
            && this._accept(3 /* TokenType.CurlyOpen */)
            && (index = this._accept(8 /* TokenType.Int */, true));
        if (!match) {
            return this._backTo(token);
        }
        const placeholder = new Placeholder(Number(index));
        if (this._accept(1 /* TokenType.Colon */)) {
            // ${1:<children>}
            while (true) {
                // ...} -> done
                if (this._accept(4 /* TokenType.CurlyClose */)) {
                    parent.appendChild(placeholder);
                    return true;
                }
                if (this._parse(placeholder)) {
                    continue;
                }
                // fallback
                parent.appendChild(new Text('${' + index + ':'));
                placeholder.children.forEach(parent.appendChild, parent);
                return true;
            }
        }
        else if (placeholder.index > 0 && this._accept(7 /* TokenType.Pipe */)) {
            // ${1|one,two,three|}
            const choice = new Choice();
            while (true) {
                if (this._parseChoiceElement(choice)) {
                    if (this._accept(2 /* TokenType.Comma */)) {
                        // opt, -> more
                        continue;
                    }
                    if (this._accept(7 /* TokenType.Pipe */)) {
                        placeholder.appendChild(choice);
                        if (this._accept(4 /* TokenType.CurlyClose */)) {
                            // ..|} -> done
                            parent.appendChild(placeholder);
                            return true;
                        }
                    }
                }
                this._backTo(token);
                return false;
            }
        }
        else if (this._accept(6 /* TokenType.Forwardslash */)) {
            // ${1/<regex>/<format>/<options>}
            if (this._parseTransform(placeholder)) {
                parent.appendChild(placeholder);
                return true;
            }
            this._backTo(token);
            return false;
        }
        else if (this._accept(4 /* TokenType.CurlyClose */)) {
            // ${1}
            parent.appendChild(placeholder);
            return true;
        }
        else {
            // ${1 <- missing curly or colon
            return this._backTo(token);
        }
    }
    _parseChoiceElement(parent) {
        const token = this._token;
        const values = [];
        while (true) {
            if (this._token.type === 2 /* TokenType.Comma */ || this._token.type === 7 /* TokenType.Pipe */) {
                break;
            }
            let value;
            if (value = this._accept(5 /* TokenType.Backslash */, true)) {
                // \, \|, or \\
                value = this._accept(2 /* TokenType.Comma */, true)
                    || this._accept(7 /* TokenType.Pipe */, true)
                    || this._accept(5 /* TokenType.Backslash */, true)
                    || value;
            }
            else {
                value = this._accept(undefined, true);
            }
            if (!value) {
                // EOF
                this._backTo(token);
                return false;
            }
            values.push(value);
        }
        if (values.length === 0) {
            this._backTo(token);
            return false;
        }
        parent.appendChild(new Text(values.join('')));
        return true;
    }
    // ${foo:<children>}, ${foo} -> variable
    _parseComplexVariable(parent) {
        let name;
        const token = this._token;
        const match = this._accept(0 /* TokenType.Dollar */)
            && this._accept(3 /* TokenType.CurlyOpen */)
            && (name = this._accept(9 /* TokenType.VariableName */, true));
        if (!match) {
            return this._backTo(token);
        }
        const variable = new Variable(name);
        if (this._accept(1 /* TokenType.Colon */)) {
            // ${foo:<children>}
            while (true) {
                // ...} -> done
                if (this._accept(4 /* TokenType.CurlyClose */)) {
                    parent.appendChild(variable);
                    return true;
                }
                if (this._parse(variable)) {
                    continue;
                }
                // fallback
                parent.appendChild(new Text('${' + name + ':'));
                variable.children.forEach(parent.appendChild, parent);
                return true;
            }
        }
        else if (this._accept(6 /* TokenType.Forwardslash */)) {
            // ${foo/<regex>/<format>/<options>}
            if (this._parseTransform(variable)) {
                parent.appendChild(variable);
                return true;
            }
            this._backTo(token);
            return false;
        }
        else if (this._accept(4 /* TokenType.CurlyClose */)) {
            // ${foo}
            parent.appendChild(variable);
            return true;
        }
        else {
            // ${foo <- missing curly or colon
            return this._backTo(token);
        }
    }
    _parseTransform(parent) {
        // ...<regex>/<format>/<options>}
        const transform = new Transform();
        let regexValue = '';
        let regexOptions = '';
        // (1) /regex
        while (true) {
            if (this._accept(6 /* TokenType.Forwardslash */)) {
                break;
            }
            let escaped;
            if (escaped = this._accept(5 /* TokenType.Backslash */, true)) {
                escaped = this._accept(6 /* TokenType.Forwardslash */, true) || escaped;
                regexValue += escaped;
                continue;
            }
            if (this._token.type !== 14 /* TokenType.EOF */) {
                regexValue += this._accept(undefined, true);
                continue;
            }
            return false;
        }
        // (2) /format
        while (true) {
            if (this._accept(6 /* TokenType.Forwardslash */)) {
                break;
            }
            let escaped;
            if (escaped = this._accept(5 /* TokenType.Backslash */, true)) {
                escaped = this._accept(5 /* TokenType.Backslash */, true) || this._accept(6 /* TokenType.Forwardslash */, true) || escaped;
                transform.appendChild(new Text(escaped));
                continue;
            }
            if (this._parseFormatString(transform) || this._parseAnything(transform)) {
                continue;
            }
            return false;
        }
        // (3) /option
        while (true) {
            if (this._accept(4 /* TokenType.CurlyClose */)) {
                break;
            }
            if (this._token.type !== 14 /* TokenType.EOF */) {
                regexOptions += this._accept(undefined, true);
                continue;
            }
            return false;
        }
        try {
            transform.regexp = new RegExp(regexValue, regexOptions);
        }
        catch (e) {
            // invalid regexp
            return false;
        }
        parent.transform = transform;
        return true;
    }
    _parseFormatString(parent) {
        const token = this._token;
        if (!this._accept(0 /* TokenType.Dollar */)) {
            return false;
        }
        let complex = false;
        if (this._accept(3 /* TokenType.CurlyOpen */)) {
            complex = true;
        }
        const index = this._accept(8 /* TokenType.Int */, true);
        if (!index) {
            this._backTo(token);
            return false;
        }
        else if (!complex) {
            // $1
            parent.appendChild(new FormatString(Number(index)));
            return true;
        }
        else if (this._accept(4 /* TokenType.CurlyClose */)) {
            // ${1}
            parent.appendChild(new FormatString(Number(index)));
            return true;
        }
        else if (!this._accept(1 /* TokenType.Colon */)) {
            this._backTo(token);
            return false;
        }
        if (this._accept(6 /* TokenType.Forwardslash */)) {
            // ${1:/upcase}
            const shorthand = this._accept(9 /* TokenType.VariableName */, true);
            if (!shorthand || !this._accept(4 /* TokenType.CurlyClose */)) {
                this._backTo(token);
                return false;
            }
            else {
                parent.appendChild(new FormatString(Number(index), shorthand));
                return true;
            }
        }
        else if (this._accept(11 /* TokenType.Plus */)) {
            // ${1:+<if>}
            const ifValue = this._until(4 /* TokenType.CurlyClose */);
            if (ifValue) {
                parent.appendChild(new FormatString(Number(index), undefined, ifValue, undefined));
                return true;
            }
        }
        else if (this._accept(12 /* TokenType.Dash */)) {
            // ${2:-<else>}
            const elseValue = this._until(4 /* TokenType.CurlyClose */);
            if (elseValue) {
                parent.appendChild(new FormatString(Number(index), undefined, undefined, elseValue));
                return true;
            }
        }
        else if (this._accept(13 /* TokenType.QuestionMark */)) {
            // ${2:?<if>:<else>}
            const ifValue = this._until(1 /* TokenType.Colon */);
            if (ifValue) {
                const elseValue = this._until(4 /* TokenType.CurlyClose */);
                if (elseValue) {
                    parent.appendChild(new FormatString(Number(index), undefined, ifValue, elseValue));
                    return true;
                }
            }
        }
        else {
            // ${1:<else>}
            const elseValue = this._until(4 /* TokenType.CurlyClose */);
            if (elseValue) {
                parent.appendChild(new FormatString(Number(index), undefined, undefined, elseValue));
                return true;
            }
        }
        this._backTo(token);
        return false;
    }
    _parseAnything(marker) {
        if (this._token.type !== 14 /* TokenType.EOF */) {
            marker.appendChild(new Text(this._scanner.tokenText(this._token)));
            this._accept(undefined);
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L2Jyb3dzZXIvc25pcHBldFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLENBQU4sSUFBa0IsU0FnQmpCO0FBaEJELFdBQWtCLFNBQVM7SUFDMUIsNkNBQU0sQ0FBQTtJQUNOLDJDQUFLLENBQUE7SUFDTCwyQ0FBSyxDQUFBO0lBQ0wsbURBQVMsQ0FBQTtJQUNULHFEQUFVLENBQUE7SUFDVixtREFBUyxDQUFBO0lBQ1QseURBQVksQ0FBQTtJQUNaLHlDQUFJLENBQUE7SUFDSix1Q0FBRyxDQUFBO0lBQ0gseURBQVksQ0FBQTtJQUNaLDhDQUFNLENBQUE7SUFDTiwwQ0FBSSxDQUFBO0lBQ0osMENBQUksQ0FBQTtJQUNKLDBEQUFZLENBQUE7SUFDWix3Q0FBRyxDQUFBO0FBQ0osQ0FBQyxFQWhCaUIsU0FBUyxLQUFULFNBQVMsUUFnQjFCO0FBU0QsTUFBTSxPQUFPLE9BQU87SUFBcEI7UUEwQkMsVUFBSyxHQUFXLEVBQUUsQ0FBQztRQUNuQixRQUFHLEdBQVcsQ0FBQyxDQUFDO0lBb0VqQixDQUFDO2FBN0ZlLFdBQU0sR0FBZ0M7UUFDcEQsOEJBQXFCLDBCQUFrQjtRQUN2Qyx5QkFBZ0IseUJBQWlCO1FBQ2pDLHlCQUFnQix5QkFBaUI7UUFDakMsbUNBQXlCLDZCQUFxQjtRQUM5QyxvQ0FBMEIsOEJBQXNCO1FBQ2hELDZCQUFvQiw2QkFBcUI7UUFDekMseUJBQWdCLGdDQUF3QjtRQUN4Qyx5QkFBZSx3QkFBZ0I7UUFDL0Isd0JBQWUseUJBQWdCO1FBQy9CLHdCQUFlLHlCQUFnQjtRQUMvQixnQ0FBdUIsaUNBQXdCO0tBQy9DLEFBWm9CLENBWW5CO0lBRUYsTUFBTSxD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