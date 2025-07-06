/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var ChCode;
(function (ChCode) {
    ChCode[ChCode["BOM"] = 65279] = "BOM";
    ChCode[ChCode["SPACE"] = 32] = "SPACE";
    ChCode[ChCode["TAB"] = 9] = "TAB";
    ChCode[ChCode["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
    ChCode[ChCode["LINE_FEED"] = 10] = "LINE_FEED";
    ChCode[ChCode["SLASH"] = 47] = "SLASH";
    ChCode[ChCode["LESS_THAN"] = 60] = "LESS_THAN";
    ChCode[ChCode["QUESTION_MARK"] = 63] = "QUESTION_MARK";
    ChCode[ChCode["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
})(ChCode || (ChCode = {}));
var State;
(function (State) {
    State[State["ROOT_STATE"] = 0] = "ROOT_STATE";
    State[State["DICT_STATE"] = 1] = "DICT_STATE";
    State[State["ARR_STATE"] = 2] = "ARR_STATE";
})(State || (State = {}));
/**
 * A very fast plist parser
 */
export function parse(content) {
    return _parse(content, null, null);
}
function _parse(content, filename, locationKeyName) {
    const len = content.length;
    let pos = 0;
    let line = 1;
    let char = 0;
    // Skip UTF8 BOM
    if (len > 0 && content.charCodeAt(0) === 65279 /* ChCode.BOM */) {
        pos = 1;
    }
    function advancePosBy(by) {
        if (locationKeyName === null) {
            pos = pos + by;
        }
        else {
            while (by > 0) {
                const chCode = content.charCodeAt(pos);
                if (chCode === 10 /* ChCode.LINE_FEED */) {
                    pos++;
                    line++;
                    char = 0;
                }
                else {
                    pos++;
                    char++;
                }
                by--;
            }
        }
    }
    function advancePosTo(to) {
        if (locationKeyName === null) {
            pos = to;
        }
        else {
            advancePosBy(to - pos);
        }
    }
    function skipWhitespace() {
        while (pos < len) {
            const chCode = content.charCodeAt(pos);
            if (chCode !== 32 /* ChCode.SPACE */ && chCode !== 9 /* ChCode.TAB */ && chCode !== 13 /* ChCode.CARRIAGE_RETURN */ && chCode !== 10 /* ChCode.LINE_FEED */) {
                break;
            }
            advancePosBy(1);
        }
    }
    function advanceIfStartsWith(str) {
        if (content.substr(pos, str.length) === str) {
            advancePosBy(str.length);
            return true;
        }
        return false;
    }
    function advanceUntil(str) {
        const nextOccurence = content.indexOf(str, pos);
        if (nextOccurence !== -1) {
            advancePosTo(nextOccurence + str.length);
        }
        else {
            // EOF
            advancePosTo(len);
        }
    }
    function captureUntil(str) {
        const nextOccurence = content.indexOf(str, pos);
        if (nextOccurence !== -1) {
            const r = content.substring(pos, nextOccurence);
            advancePosTo(nextOccurence + str.length);
            return r;
        }
        else {
            // EOF
            const r = content.substr(pos);
            advancePosTo(len);
            return r;
        }
    }
    let state = 0 /* State.ROOT_STATE */;
    let cur = null;
    const stateStack = [];
    const objStack = [];
    let curKey = null;
    function pushState(newState, newCur) {
        stateStack.push(state);
        objStack.push(cur);
        state = newState;
        cur = newCur;
    }
    function popState() {
        if (stateStack.length === 0) {
            return fail('illegal state stack');
        }
        state = stateStack.pop();
        cur = objStack.pop();
    }
    function fail(msg) {
        throw new Error('Near offset ' + pos + ': ' + msg + ' ~~~' + content.substr(pos, 50) + '~~~');
    }
    const dictState = {
        enterDict: function () {
            if (curKey === null) {
                return fail('missing <key>');
            }
            const newDict = {};
            if (locationKeyName !== null) {
                newDict[locationKeyName] = {
                    filename: filename,
                    line: line,
                    char: char
                };
            }
            cur[curKey] = newDict;
            curKey = null;
            pushState(1 /* State.DICT_STATE */, newDict);
        },
        enterArray: function () {
            if (curKey === null) {
                return fail('missing <key>');
            }
            const newArr = [];
            cur[curKey] = newArr;
            curKey = null;
            pushState(2 /* State.ARR_STATE */, newArr);
        }
    };
    const arrState = {
        enterDict: function () {
            const newDict = {};
            if (locationKeyName !== null) {
                newDict[locationKeyName] = {
                    filename: filename,
                    line: line,
                    char: char
                };
            }
            cur.push(newDict);
            pushState(1 /* State.DICT_STATE */, newDict);
        },
        enterArray: function () {
            const newArr = [];
            cur.push(newArr);
            pushState(2 /* State.ARR_STATE */, newArr);
        }
    };
    function enterDict() {
        if (state === 1 /* State.DICT_STATE */) {
            dictState.enterDict();
        }
        else if (state === 2 /* State.ARR_STATE */) {
            arrState.enterDict();
        }
        else { // ROOT_STATE
            cur = {};
            if (locationKeyName !== null) {
                cur[locationKeyName] = {
                    filename: filename,
                    line: line,
                    char: char
                };
            }
            pushState(1 /* State.DICT_STATE */, cur);
        }
    }
    function leaveDict() {
        if (state === 1 /* State.DICT_STATE */) {
            popState();
        }
        else if (state === 2 /* State.ARR_STATE */) {
            return fail('unexpected </dict>');
        }
        else { // ROOT_STATE
            return fail('unexpected </dict>');
        }
    }
    function enterArray() {
        if (state === 1 /* State.DICT_STATE */) {
            dictState.enterArray();
        }
        else if (state === 2 /* State.ARR_STATE */) {
            arrState.enterArray();
        }
        else { // ROOT_STATE
            cur = [];
            pushState(2 /* State.ARR_STATE */, cur);
        }
    }
    function leaveArray() {
        if (state === 1 /* State.DICT_STATE */) {
            return fail('unexpected </array>');
        }
        else if (state === 2 /* State.ARR_STATE */) {
            popState();
        }
        else { // ROOT_STATE
            return fail('unexpected </array>');
        }
    }
    function acceptKey(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey !== null) {
                return fail('too many <key>');
            }
            curKey = val;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            return fail('unexpected <key>');
        }
        else { // ROOT_STATE
            return fail('unexpected <key>');
        }
    }
    function acceptString(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else { // ROOT_STATE
            cur = val;
        }
    }
    function acceptReal(val) {
        if (isNaN(val)) {
            return fail('cannot parse float');
        }
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else { // ROOT_STATE
            cur = val;
        }
    }
    function acceptInteger(val) {
        if (isNaN(val)) {
            return fail('cannot parse integer');
        }
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else { // ROOT_STATE
            cur = val;
        }
    }
    function acceptDate(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else { // ROOT_STATE
            cur = val;
        }
    }
    function acceptData(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else { // ROOT_STATE
            cur = val;
        }
    }
    function acceptBool(val) {
        if (state === 1 /* State.DICT_STATE */) {
            if (curKey === null) {
                return fail('missing <key>');
            }
            cur[curKey] = val;
            curKey = null;
        }
        else if (state === 2 /* State.ARR_STATE */) {
            cur.push(val);
        }
        else { // ROOT_STATE
            cur = val;
        }
    }
    function escapeVal(str) {
        return str.replace(/&#([0-9]+);/g, function (_, m0) {
            return String.fromCodePoint(parseInt(m0, 10));
        }).replace(/&#x([0-9a-f]+);/g, function (_, m0) {
            return String.fromCodePoint(parseInt(m0, 16));
        }).replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, function (_) {
            switch (_) {
                case '&amp;': return '&';
                case '&lt;': return '<';
                case '&gt;': return '>';
                case '&quot;': return '"';
                case '&apos;': return '\'';
            }
            return _;
        });
    }
    function parseOpenTag() {
        let r = captureUntil('>');
        let isClosed = false;
        if (r.charCodeAt(r.length - 1) === 47 /* ChCode.SLASH */) {
            isClosed = true;
            r = r.substring(0, r.length - 1);
        }
        return {
            name: r.trim(),
            isClosed: isClosed
        };
    }
    function parseTagValue(tag) {
        if (tag.isClosed) {
            return '';
        }
        const val = captureUntil('</');
        advanceUntil('>');
        return escapeVal(val);
    }
    while (pos < len) {
        skipWhitespace();
        if (pos >= len) {
            break;
        }
        const chCode = content.charCodeAt(pos);
        advancePosBy(1);
        if (chCode !== 60 /* ChCode.LESS_THAN */) {
            return fail('expected <');
        }
        if (pos >= len) {
            return fail('unexpected end of input');
        }
        const peekChCode = content.charCodeAt(pos);
        if (peekChCode === 63 /* ChCode.QUESTION_MARK */) {
            advancePosBy(1);
            advanceUntil('?>');
            continue;
        }
        if (peekChCode === 33 /* ChCode.EXCLAMATION_MARK */) {
            advancePosBy(1);
            if (advanceIfStartsWith('--')) {
                advanceUntil('-->');
                continue;
            }
            advanceUntil('>');
            continue;
        }
        if (peekChCode === 47 /* ChCode.SLASH */) {
            advancePosBy(1);
            skipWhitespace();
            if (advanceIfStartsWith('plist')) {
                advanceUntil('>');
                continue;
            }
            if (advanceIfStartsWith('dict')) {
                advanceUntil('>');
                leaveDict();
                continue;
            }
            if (advanceIfStartsWith('array')) {
                advanceUntil('>');
                leaveArray();
                continue;
            }
            return fail('unexpected closed tag');
        }
        const tag = parseOpenTag();
        switch (tag.name) {
            case 'dict':
                enterDict();
                if (tag.isClosed) {
                    leaveDict();
                }
                continue;
            case 'array':
                enterArray();
                if (tag.isClosed) {
                    leaveArray();
                }
                continue;
            case 'key':
                acceptKey(parseTagValue(tag));
                continue;
            case 'string':
                acceptString(parseTagValue(tag));
                continue;
            case 'real':
                acceptReal(parseFloat(parseTagValue(tag)));
                continue;
            case 'integer':
                acceptInteger(parseInt(parseTagValue(tag), 10));
                continue;
            case 'date':
                acceptDate(new Date(parseTagValue(tag)));
                continue;
            case 'data':
                acceptData(parseTagValue(tag));
                continue;
            case 'true':
                parseTagValue(tag);
                acceptBool(true);
                continue;
            case 'false':
                parseTagValue(tag);
                acceptBool(false);
                continue;
        }
        if (/^plist/.test(tag.name)) {
            continue;
        }
        return fail('unexpected opened tag ' + tag.name);
    }
    return cur;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxpc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3BsaXN0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLElBQVcsTUFhVjtBQWJELFdBQVcsTUFBTTtJQUNoQixxQ0FBVyxDQUFBO0lBRVgsc0NBQVUsQ0FBQTtJQUNWLGlDQUFPLENBQUE7SUFDUCwwREFBb0IsQ0FBQTtJQUNwQiw4Q0FBYyxDQUFBO0lBRWQsc0NBQVUsQ0FBQTtJQUVWLDhDQUFjLENBQUE7SUFDZCxzREFBa0IsQ0FBQTtJQUNsQiw0REFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBYlUsTUFBTSxLQUFOLE1BQU0sUUFhaEI7QUFFRCxJQUFXLEtBSVY7QUFKRCxXQUFXLEtBQUs7SUFDZiw2Q0FBYyxDQUFBO0lBQ2QsNkNBQWMsQ0FBQTtJQUNkLDJDQUFhLENBQUE7QUFDZCxDQUFDLEVBSlUsS0FBSyxLQUFMLEtBQUssUUFJZjtBQUNEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBQyxPQUFlO0lBQ3BDLE9BQU8sTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDcEMsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxRQUF1QixFQUFFLGVBQThCO0lBQ3ZGLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFFM0IsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ1osSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2IsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRWIsZ0JBQWdCO0lBQ2hCLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxD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