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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxpc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vcGxpc3RQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsSUFBVyxNQWFWO0FBYkQsV0FBVyxNQUFNO0lBQ2hCLHFDQUFXLENBQUE7SUFFWCxzQ0FBVSxDQUFBO0lBQ1YsaUNBQU8sQ0FBQTtJQUNQLDBEQUFvQixDQUFBO0lBQ3BCLDhDQUFjLENBQUE7SUFFZCxzQ0FBVSxDQUFBO0lBRVYsOENBQWMsQ0FBQTtJQUNkLHNEQUFrQixDQUFBO0lBQ2xCLDREQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFiVSxNQUFNLEtBQU4sTUFBTSxRQWFoQjtBQUVELElBQVcsS0FJVjtBQUpELFdBQVcsS0FBSztJQUNmLDZDQUFjLENBQUE7SUFDZCw2Q0FBYyxDQUFBO0lBQ2QsMkNBQWEsQ0FBQTtBQUNkLENBQUMsRUFKVSxLQUFLLEtBQUwsS0FBSyxRQUlmO0FBQ0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLE9BQWU7SUFDcEMsT0FBTyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsT0FBZSxFQUFFLFFBQXVCLEVBQUUsZUFBOEI7SUFDdkYsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUUzQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFFYixnQkFBZ0I7SUFDaEIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMs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