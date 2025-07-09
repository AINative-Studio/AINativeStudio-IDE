// ../../../../../../../node_modules/diff/lib/index.mjs
function Diff() {
}
Diff.prototype = {
    diff: function diff(oldString, newString) {
        var _options$timeout;
        var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        var callback = options.callback;
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        var self = this;
        function done(value) {
            value = self.postProcess(value, options);
            if (callback) {
                setTimeout(function () {
                    callback(value);
                }, 0);
                return true;
            }
            else {
                return value;
            }
        }
        oldString = this.castInput(oldString, options);
        newString = this.castInput(newString, options);
        oldString = this.removeEmpty(this.tokenize(oldString, options));
        newString = this.removeEmpty(this.tokenize(newString, options));
        var newLen = newString.length, oldLen = oldString.length;
        var editLength = 1;
        var maxEditLength = newLen + oldLen;
        if (options.maxEditLength != null) {
            maxEditLength = Math.min(maxEditLength, options.maxEditLength);
        }
        var maxExecutionTime = (_options$timeout = options.timeout) !== null && _options$timeout !== void 0 ? _options$timeout : Infinity;
        var abortAfterTimestamp = Date.now() + maxExecutionTime;
        var bestPath = [{
                oldPos: -1,
                lastComponent: void 0
            }];
        var newPos = this.extractCommon(bestPath[0], newString, oldString, 0, options);
        if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
            return done(buildValues(self, bestPath[0].lastComponent, newString, oldString, self.useLongestToken));
        }
        var minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
        function execEditLength() {
            for (var diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
                var basePath = void 0;
                var removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
                if (removePath) {
                    bestPath[diagonalPath - 1] = void 0;
                }
                var canAdd = false;
                if (addPath) {
                    var addPathNewPos = addPath.oldPos - diagonalPath;
                    canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
                }
                var canRemove = removePath && removePath.oldPos + 1 < oldLen;
                if (!canAdd && !canRemove) {
                    bestPath[diagonalPath] = void 0;
                    continue;
                }
                if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
                    basePath = self.addToPath(addPath, true, false, 0, options);
                }
                else {
                    basePath = self.addToPath(removePath, false, true, 1, options);
                }
                newPos = self.extractCommon(basePath, newString, oldString, diagonalPath, options);
                if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
                    return done(buildValues(self, basePath.lastComponent, newString, oldString, self.useLongestToken));
                }
                else {
                    bestPath[diagonalPath] = basePath;
                    if (basePath.oldPos + 1 >= oldLen) {
                        maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
                    }
                    if (newPos + 1 >= newLen) {
                        minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
                    }
                }
            }
            editLength++;
        }
        if (callback) {
            (function exec() {
                setTimeout(function () {
                    if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
                        return callback();
                    }
                    if (!execEditLength()) {
                        exec();
                    }
                }, 0);
            })();
        }
        else {
            while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
                var ret = execEditLength();
                if (ret) {
                    return ret;
                }
            }
        }
    },
    addToPath: function addToPath(path, added, removed, oldPosInc, options) {
        var last = path.lastComponent;
        if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
            return {
                oldPos: path.oldPos + oldPosInc,
                lastComponent: {
                    count: last.count + 1,
                    added,
                    removed,
                    previousComponent: last.previousComponent
                }
            };
        }
        else {
            return {
                oldPos: path.oldPos + oldPosInc,
                lastComponent: {
                    count: 1,
                    added,
                    removed,
                    previousComponent: last
                }
            };
        }
    },
    extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath, options) {
        var newLen = newString.length, oldLen = oldString.length, oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
        while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldString[oldPos + 1], newString[newPos + 1], options)) {
            newPos++;
            oldPos++;
            commonCount++;
            if (options.oneChangePerToken) {
                basePath.lastComponent = {
                    count: 1,
                    previousComponent: basePath.lastComponent,
                    added: false,
                    removed: false
                };
            }
        }
        if (commonCount && !options.oneChangePerToken) {
            basePath.lastComponent = {
                count: commonCount,
                previousComponent: basePath.lastComponent,
                added: false,
                removed: false
            };
        }
        basePath.oldPos = oldPos;
        return newPos;
    },
    equals: function equals(left, right, options) {
        if (options.comparator) {
            return options.comparator(left, right);
        }
        else {
            return left === right || options.ignoreCase && left.toLowerCase() === right.toLowerCase();
        }
    },
    removeEmpty: function removeEmpty(array) {
        var ret = [];
        for (var i = 0; i < array.length; i++) {
            if (array[i]) {
                ret.push(array[i]);
            }
        }
        return ret;
    },
    castInput: function castInput(value) {
        return value;
    },
    tokenize: function tokenize(value) {
        return Array.from(value);
    },
    join: function join(chars) {
        return chars.join("");
    },
    postProcess: function postProcess(changeObjects) {
        return changeObjects;
    }
};
function buildValues(diff2, lastComponent, newString, oldString, useLongestToken) {
    var components = [];
    var nextComponent;
    while (lastComponent) {
        components.push(lastComponent);
        nextComponent = lastComponent.previousComponent;
        delete lastComponent.previousComponent;
        lastComponent = nextComponent;
    }
    components.reverse();
    var componentPos = 0, componentLen = components.length, newPos = 0, oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
        var component = components[componentPos];
        if (!component.removed) {
            if (!component.added && useLongestToken) {
                var value = newString.slice(newPos, newPos + component.count);
                value = value.map(function (value2, i) {
                    var oldValue = oldString[oldPos + i];
                    return oldValue.length > value2.length ? oldValue : value2;
                });
                component.value = diff2.join(value);
            }
            else {
                component.value = diff2.join(newString.slice(newPos, newPos + component.count));
            }
            newPos += component.count;
            if (!component.added) {
                oldPos += component.count;
            }
        }
        else {
            component.value = diff2.join(oldString.slice(oldPos, oldPos + component.count));
            oldPos += component.count;
        }
    }
    return components;
}
function longestCommonPrefix(str1, str2) {
    var i;
    for (i = 0; i < str1.length && i < str2.length; i++) {
        if (str1[i] != str2[i]) {
            return str1.slice(0, i);
        }
    }
    return str1.slice(0, i);
}
function longestCommonSuffix(str1, str2) {
    var i;
    if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
        return "";
    }
    for (i = 0; i < str1.length && i < str2.length; i++) {
        if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) {
            return str1.slice(-i);
        }
    }
    return str1.slice(-i);
}
function replacePrefix(string, oldPrefix, newPrefix) {
    if (string.slice(0, oldPrefix.length) != oldPrefix) {
        throw Error("string ".concat(JSON.stringify(string), " doesn't start with prefix ").concat(JSON.stringify(oldPrefix), "; this is a bug"));
    }
    return newPrefix + string.slice(oldPrefix.length);
}
function replaceSuffix(string, oldSuffix, newSuffix) {
    if (!oldSuffix) {
        return string + newSuffix;
    }
    if (string.slice(-oldSuffix.length) != oldSuffix) {
        throw Error("string ".concat(JSON.stringify(string), " doesn't end with suffix ").concat(JSON.stringify(oldSuffix), "; this is a bug"));
    }
    return string.slice(0, -oldSuffix.length) + newSuffix;
}
function removePrefix(string, oldPrefix) {
    return replacePrefix(string, oldPrefix, "");
}
function removeSuffix(string, oldSuffix) {
    return replaceSuffix(string, oldSuffix, "");
}
function maximumOverlap(string1, string2) {
    return string2.slice(0, overlapCount(string1, string2));
}
function overlapCount(a, b) {
    var startA = 0;
    if (a.length > b.length) {
        startA = a.length - b.length;
    }
    var endB = b.length;
    if (a.length < b.length) {
        endB = a.length;
    }
    var map = Array(endB);
    var k = 0;
    map[0] = 0;
    for (var j = 1; j < endB; j++) {
        if (b[j] == b[k]) {
            map[j] = map[k];
        }
        else {
            map[j] = k;
        }
        while (k > 0 && b[j] != b[k]) {
            k = map[k];
        }
        if (b[j] == b[k]) {
            k++;
        }
    }
    k = 0;
    for (var i = startA; i < a.length; i++) {
        while (k > 0 && a[i] != b[k]) {
            k = map[k];
        }
        if (a[i] == b[k]) {
            k++;
        }
    }
    return k;
}
var extendedWordChars = "a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
var tokenizeIncludingWhitespace = new RegExp("[".concat(extendedWordChars, "]+|\\s+|[^").concat(extendedWordChars, "]"), "ug");
var wordDiff = new Diff();
wordDiff.equals = function (left, right, options) {
    if (options.ignoreCase) {
        left = left.toLowerCase();
        right = right.toLowerCase();
    }
    return left.trim() === right.trim();
};
wordDiff.tokenize = function (value) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var parts;
    if (options.intlSegmenter) {
        if (options.intlSegmenter.resolvedOptions().granularity != "word") {
            throw new Error('The segmenter passed must have a granularity of "word"');
        }
        parts = Array.from(options.intlSegmenter.segment(value), function (segment) {
            return segment.segment;
        });
    }
    else {
        parts = value.match(tokenizeIncludingWhitespace) || [];
    }
    var tokens = [];
    var prevPart = null;
    parts.forEach(function (part) {
        if (/\s/.test(part)) {
            if (prevPart == null) {
                tokens.push(part);
            }
            else {
                tokens.push(tokens.pop() + part);
            }
        }
        else if (/\s/.test(prevPart)) {
            if (tokens[tokens.length - 1] == prevPart) {
                tokens.push(tokens.pop() + part);
            }
            else {
                tokens.push(prevPart + part);
            }
        }
        else {
            tokens.push(part);
        }
        prevPart = part;
    });
    return tokens;
};
wordDiff.join = function (tokens) {
    return tokens.map(function (token, i) {
        if (i == 0) {
            return token;
        }
        else {
            return token.replace(/^\s+/, "");
        }
    }).join("");
};
wordDiff.postProcess = function (changes, options) {
    if (!changes || options.oneChangePerToken) {
        return changes;
    }
    var lastKeep = null;
    var insertion = null;
    var deletion = null;
    changes.forEach(function (change) {
        if (change.added) {
            insertion = change;
        }
        else if (change.removed) {
            deletion = change;
        }
        else {
            if (insertion || deletion) {
                dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change);
            }
            lastKeep = change;
            insertion = null;
            deletion = null;
        }
    });
    if (insertion || deletion) {
        dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null);
    }
    return changes;
};
function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep) {
    if (deletion && insertion) {
        var oldWsPrefix = deletion.value.match(/^\s*/)[0];
        var oldWsSuffix = deletion.value.match(/\s*$/)[0];
        var newWsPrefix = insertion.value.match(/^\s*/)[0];
        var newWsSuffix = insertion.value.match(/\s*$/)[0];
        if (startKeep) {
            var commonWsPrefix = longestCommonPrefix(oldWsPrefix, newWsPrefix);
            startKeep.value = replaceSuffix(startKeep.value, newWsPrefix, commonWsPrefix);
            deletion.value = removePrefix(deletion.value, commonWsPrefix);
            insertion.value = removePrefix(insertion.value, commonWsPrefix);
        }
        if (endKeep) {
            var commonWsSuffix = longestCommonSuffix(oldWsSuffix, newWsSuffix);
            endKeep.value = replacePrefix(endKeep.value, newWsSuffix, commonWsSuffix);
            deletion.value = removeSuffix(deletion.value, commonWsSuffix);
            insertion.value = removeSuffix(insertion.value, commonWsSuffix);
        }
    }
    else if (insertion) {
        if (startKeep) {
            insertion.value = insertion.value.replace(/^\s*/, "");
        }
        if (endKeep) {
            endKeep.value = endKeep.value.replace(/^\s*/, "");
        }
    }
    else if (startKeep && endKeep) {
        var newWsFull = endKeep.value.match(/^\s*/)[0], delWsStart = deletion.value.match(/^\s*/)[0], delWsEnd = deletion.value.match(/\s*$/)[0];
        var newWsStart = longestCommonPrefix(newWsFull, delWsStart);
        deletion.value = removePrefix(deletion.value, newWsStart);
        var newWsEnd = longestCommonSuffix(removePrefix(newWsFull, newWsStart), delWsEnd);
        deletion.value = removeSuffix(deletion.value, newWsEnd);
        endKeep.value = replacePrefix(endKeep.value, newWsFull, newWsEnd);
        startKeep.value = replaceSuffix(startKeep.value, newWsFull, newWsFull.slice(0, newWsFull.length - newWsEnd.length));
    }
    else if (endKeep) {
        var endKeepWsPrefix = endKeep.value.match(/^\s*/)[0];
        var deletionWsSuffix = deletion.value.match(/\s*$/)[0];
        var overlap = maximumOverlap(deletionWsSuffix, endKeepWsPrefix);
        deletion.value = removeSuffix(deletion.value, overlap);
    }
    else if (startKeep) {
        var startKeepWsSuffix = startKeep.value.match(/\s*$/)[0];
        var deletionWsPrefix = deletion.value.match(/^\s*/)[0];
        var _overlap = maximumOverlap(startKeepWsSuffix, deletionWsPrefix);
        deletion.value = removePrefix(deletion.value, _overlap);
    }
}
var wordWithSpaceDiff = new Diff();
wordWithSpaceDiff.tokenize = function (value) {
    var regex = new RegExp("(\\r?\\n)|[".concat(extendedWordChars, "]+|[^\\S\\n\\r]+|[^").concat(extendedWordChars, "]"), "ug");
    return value.match(regex) || [];
};
var lineDiff = new Diff();
lineDiff.tokenize = function (value, options) {
    if (options.stripTrailingCr) {
        value = value.replace(/\r\n/g, "\n");
    }
    var retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
    if (!linesAndNewlines[linesAndNewlines.length - 1]) {
        linesAndNewlines.pop();
    }
    for (var i = 0; i < linesAndNewlines.length; i++) {
        var line = linesAndNewlines[i];
        if (i % 2 && !options.newlineIsToken) {
            retLines[retLines.length - 1] += line;
        }
        else {
            retLines.push(line);
        }
    }
    return retLines;
};
lineDiff.equals = function (left, right, options) {
    if (options.ignoreWhitespace) {
        if (!options.newlineIsToken || !left.includes("\n")) {
            left = left.trim();
        }
        if (!options.newlineIsToken || !right.includes("\n")) {
            right = right.trim();
        }
    }
    else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
        if (left.endsWith("\n")) {
            left = left.slice(0, -1);
        }
        if (right.endsWith("\n")) {
            right = right.slice(0, -1);
        }
    }
    return Diff.prototype.equals.call(this, left, right, options);
};
function diffLines(oldStr, newStr, callback) {
    return lineDiff.diff(oldStr, newStr, callback);
}
var sentenceDiff = new Diff();
sentenceDiff.tokenize = function (value) {
    return value.split(/(\S.+?[.!?])(?=\s+|$)/);
};
var cssDiff = new Diff();
cssDiff.tokenize = function (value) {
    return value.split(/([{}:;,]|\s+)/);
};
function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o2) {
        return typeof o2;
    } : function (o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
}
var jsonDiff = new Diff();
jsonDiff.useLongestToken = true;
jsonDiff.tokenize = lineDiff.tokenize;
jsonDiff.castInput = function (value, options) {
    var undefinedReplacement = options.undefinedReplacement, _options$stringifyRep = options.stringifyReplacer, stringifyReplacer = _options$stringifyRep === void 0 ? function (k, v) {
        return typeof v === "undefined" ? undefinedReplacement : v;
    } : _options$stringifyRep;
    return typeof value === "string" ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, "  ");
};
jsonDiff.equals = function (left, right, options) {
    return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"), options);
};
function canonicalize(obj, stack, replacementStack, replacer, key) {
    stack = stack || [];
    replacementStack = replacementStack || [];
    if (replacer) {
        obj = replacer(key, obj);
    }
    var i;
    for (i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
            return replacementStack[i];
        }
    }
    var canonicalizedObj;
    if ("[object Array]" === Object.prototype.toString.call(obj)) {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (i = 0; i < obj.length; i += 1) {
            canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, key);
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
    }
    if (obj && obj.toJSON) {
        obj = obj.toJSON();
    }
    if (_typeof(obj) === "object" && obj !== null) {
        stack.push(obj);
        canonicalizedObj = {};
        replacementStack.push(canonicalizedObj);
        var sortedKeys = [], _key;
        for (_key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, _key)) {
                sortedKeys.push(_key);
            }
        }
        sortedKeys.sort();
        for (i = 0; i < sortedKeys.length; i += 1) {
            _key = sortedKeys[i];
            canonicalizedObj[_key] = canonicalize(obj[_key], stack, replacementStack, replacer, _key);
        }
        stack.pop();
        replacementStack.pop();
    }
    else {
        canonicalizedObj = obj;
    }
    return canonicalizedObj;
}
var arrayDiff = new Diff();
arrayDiff.tokenize = function (value) {
    return value.slice();
};
arrayDiff.join = arrayDiff.removeEmpty = function (value) {
    return value;
};
export { diffLines };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3JlYWN0L291dC9kaWZmL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHVEQUF1RDtBQUN2RCxTQUFTLElBQUk7QUFDYixDQUFDO0FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRztJQUNmLElBQUksRUFBRSxTQUFTLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUztRQUN0QyxJQUFJLGdCQUFnQixDQUFDO1FBQ3JCLElBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbEYsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUNoQyxJQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLFFBQVEsR0FBRyxPQUFPLENBQUM7WUFDbkIsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNmLENBQUM7UUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsU0FBUyxJQUFJLENBQUMsS0FBSztZQUNqQixLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDYixVQUFVLENBQUM7b0JBQ1QsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ04sT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sT0FB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