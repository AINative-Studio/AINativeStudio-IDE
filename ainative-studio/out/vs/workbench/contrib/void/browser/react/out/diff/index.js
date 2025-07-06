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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvcmVhY3Qvb3V0L2RpZmYvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsdURBQXVEO0FBQ3ZELFNBQVMsSUFBSTtBQUNiLENBQUM7QUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHO0lBQ2YsSUFBSSxFQUFFLFNBQVMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTO1FBQ3RDLElBQUksZ0JBQWdCLENBQUM7UUFDckIsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNsRixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ2hDLElBQUksT0FBTyxPQUFPLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDbEMsUUFBUSxHQUFHLE9BQU8sQ0FBQztZQUNuQixPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2YsQ0FBQztRQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUNoQixTQUFTLElBQUksQ0FBQyxLQUFLO1lBQ2pCLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN6QyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNiLFVBQVUsQ0FBQztvQkFDVCxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2xCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDTixPQUFPLElBQUksQ0FBQztZQUNkLENBQUM7aUJBQU0sQ0FBQztnQkFDTixPQUFP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