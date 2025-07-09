/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import * as Strings from '../../../../base/common/strings.js';
import * as Assert from '../../../../base/common/assert.js';
import { join, normalize } from '../../../../base/common/path.js';
import * as Types from '../../../../base/common/types.js';
import * as UUID from '../../../../base/common/uuid.js';
import * as Platform from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { ValidationStatus, Parser } from '../../../../base/common/parsers.js';
import { asArray } from '../../../../base/common/arrays.js';
import { Schemas as NetworkSchemas } from '../../../../base/common/network.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { Emitter } from '../../../../base/common/event.js';
import { FileType } from '../../../../platform/files/common/files.js';
export var FileLocationKind;
(function (FileLocationKind) {
    FileLocationKind[FileLocationKind["Default"] = 0] = "Default";
    FileLocationKind[FileLocationKind["Relative"] = 1] = "Relative";
    FileLocationKind[FileLocationKind["Absolute"] = 2] = "Absolute";
    FileLocationKind[FileLocationKind["AutoDetect"] = 3] = "AutoDetect";
    FileLocationKind[FileLocationKind["Search"] = 4] = "Search";
})(FileLocationKind || (FileLocationKind = {}));
(function (FileLocationKind) {
    function fromString(value) {
        value = value.toLowerCase();
        if (value === 'absolute') {
            return FileLocationKind.Absolute;
        }
        else if (value === 'relative') {
            return FileLocationKind.Relative;
        }
        else if (value === 'autodetect') {
            return FileLocationKind.AutoDetect;
        }
        else if (value === 'search') {
            return FileLocationKind.Search;
        }
        else {
            return undefined;
        }
    }
    FileLocationKind.fromString = fromString;
})(FileLocationKind || (FileLocationKind = {}));
export var ProblemLocationKind;
(function (ProblemLocationKind) {
    ProblemLocationKind[ProblemLocationKind["File"] = 0] = "File";
    ProblemLocationKind[ProblemLocationKind["Location"] = 1] = "Location";
})(ProblemLocationKind || (ProblemLocationKind = {}));
(function (ProblemLocationKind) {
    function fromString(value) {
        value = value.toLowerCase();
        if (value === 'file') {
            return ProblemLocationKind.File;
        }
        else if (value === 'location') {
            return ProblemLocationKind.Location;
        }
        else {
            return undefined;
        }
    }
    ProblemLocationKind.fromString = fromString;
})(ProblemLocationKind || (ProblemLocationKind = {}));
export var ApplyToKind;
(function (ApplyToKind) {
    ApplyToKind[ApplyToKind["allDocuments"] = 0] = "allDocuments";
    ApplyToKind[ApplyToKind["openDocuments"] = 1] = "openDocuments";
    ApplyToKind[ApplyToKind["closedDocuments"] = 2] = "closedDocuments";
})(ApplyToKind || (ApplyToKind = {}));
(function (ApplyToKind) {
    function fromString(value) {
        value = value.toLowerCase();
        if (value === 'alldocuments') {
            return ApplyToKind.allDocuments;
        }
        else if (value === 'opendocuments') {
            return ApplyToKind.openDocuments;
        }
        else if (value === 'closeddocuments') {
            return ApplyToKind.closedDocuments;
        }
        else {
            return undefined;
        }
    }
    ApplyToKind.fromString = fromString;
})(ApplyToKind || (ApplyToKind = {}));
export function isNamedProblemMatcher(value) {
    return value && Types.isString(value.name) ? true : false;
}
export async function getResource(filename, matcher, fileService) {
    const kind = matcher.fileLocation;
    let fullPath;
    if (kind === FileLocationKind.Absolute) {
        fullPath = filename;
    }
    else if ((kind === FileLocationKind.Relative) && matcher.filePrefix && Types.isString(matcher.filePrefix)) {
        fullPath = join(matcher.filePrefix, filename);
    }
    else if (kind === FileLocationKind.AutoDetect) {
        const matcherClone = Objects.deepClone(matcher);
        matcherClone.fileLocation = FileLocationKind.Relative;
        if (fileService) {
            const relative = await getResource(filename, matcherClone);
            let stat = undefined;
            try {
                stat = await fileService.stat(relative);
            }
            catch (ex) {
                // Do nothing, we just need to catch file resolution errors.
            }
            if (stat) {
                return relative;
            }
        }
        matcherClone.fileLocation = FileLocationKind.Absolute;
        return getResource(filename, matcherClone);
    }
    else if (kind === FileLocationKind.Search && fileService) {
        const fsProvider = fileService.getProvider(NetworkSchemas.file);
        if (fsProvider) {
            const uri = await searchForFileLocation(filename, fsProvider, matcher.filePrefix);
            fullPath = uri?.path;
        }
        if (!fullPath) {
            const absoluteMatcher = Objects.deepClone(matcher);
            absoluteMatcher.fileLocation = FileLocationKind.Absolute;
            return getResource(filename, absoluteMatcher);
        }
    }
    if (fullPath === undefined) {
        throw new Error('FileLocationKind is not actionable. Does the matcher have a filePrefix? This should never happen.');
    }
    fullPath = normalize(fullPath);
    fullPath = fullPath.replace(/\\/g, '/');
    if (fullPath[0] !== '/') {
        fullPath = '/' + fullPath;
    }
    if (matcher.uriProvider !== undefined) {
        return matcher.uriProvider(fullPath);
    }
    else {
        return URI.file(fullPath);
    }
}
async function searchForFileLocation(filename, fsProvider, args) {
    const exclusions = new Set(asArray(args.exclude || []).map(x => URI.file(x).path));
    async function search(dir) {
        if (exclusions.has(dir.path)) {
            return undefined;
        }
        const entries = await fsProvider.readdir(dir);
        const subdirs = [];
        for (const [name, fileType] of entries) {
            if (fileType === FileType.Directory) {
                subdirs.push(URI.joinPath(dir, name));
                continue;
            }
            if (fileType === FileType.File) {
                /**
                 * Note that sometimes the given `filename` could be a relative
                 * path (not just the "name.ext" part). For example, the
                 * `filename` can be "/subdir/name.ext". So, just comparing
                 * `name` as `filename` is not sufficient. The workaround here
                 * is to form the URI with `dir` and `name` and check if it ends
                 * with the given `filename`.
                 */
                const fullUri = URI.joinPath(dir, name);
                if (fullUri.path.endsWith(filename)) {
                    return fullUri;
                }
            }
        }
        for (const subdir of subdirs) {
            const result = await search(subdir);
            if (result) {
                return result;
            }
        }
        return undefined;
    }
    for (const dir of asArray(args.include || [])) {
        const hit = await search(URI.file(dir));
        if (hit) {
            return hit;
        }
    }
    return undefined;
}
export function createLineMatcher(matcher, fileService) {
    const pattern = matcher.pattern;
    if (Array.isArray(pattern)) {
        return new MultiLineMatcher(matcher, fileService);
    }
    else {
        return new SingleLineMatcher(matcher, fileService);
    }
}
const endOfLine = Platform.OS === 1 /* Platform.OperatingSystem.Windows */ ? '\r\n' : '\n';
class AbstractLineMatcher {
    constructor(matcher, fileService) {
        this.matcher = matcher;
        this.fileService = fileService;
    }
    handle(lines, start = 0) {
        return { match: null, continue: false };
    }
    next(line) {
        return null;
    }
    fillProblemData(data, pattern, matches) {
        if (data) {
            this.fillProperty(data, 'file', pattern, matches, true);
            this.appendProperty(data, 'message', pattern, matches, true);
            this.fillProperty(data, 'code', pattern, matches, true);
            this.fillProperty(data, 'severity', pattern, matches, true);
            this.fillProperty(data, 'location', pattern, matches, true);
            this.fillProperty(data, 'line', pattern, matches);
            this.fillProperty(data, 'character', pattern, matches);
            this.fillProperty(data, 'endLine', pattern, matches);
            this.fillProperty(data, 'endCharacter', pattern, matches);
            return true;
        }
        else {
            return false;
        }
    }
    appendProperty(data, property, pattern, matches, trim = false) {
        const patternProperty = pattern[property];
        if (Types.isUndefined(data[property])) {
            this.fillProperty(data, property, pattern, matches, trim);
        }
        else if (!Types.isUndefined(patternProperty) && patternProperty < matches.length) {
            let value = matches[patternProperty];
            if (trim) {
                value = Strings.trim(value);
            }
            data[property] += endOfLine + value;
        }
    }
    fillProperty(data, property, pattern, matches, trim = false) {
        const patternAtProperty = pattern[property];
        if (Types.isUndefined(data[property]) && !Types.isUndefined(patternAtProperty) && patternAtProperty < matches.length) {
            let value = matches[patternAtProperty];
            if (value !== undefined) {
                if (trim) {
                    value = Strings.trim(value);
                }
                data[property] = value;
            }
        }
    }
    getMarkerMatch(data) {
        try {
            const location = this.getLocation(data);
            if (data.file && location && data.message) {
                const marker = {
                    severity: this.getSeverity(data),
                    startLineNumber: location.startLineNumber,
                    startColumn: location.startCharacter,
                    endLineNumber: location.endLineNumber,
                    endColumn: location.endCharacter,
                    message: data.message
                };
                if (data.code !== undefined) {
                    marker.code = data.code;
                }
                if (this.matcher.source !== undefined) {
                    marker.source = this.matcher.source;
                }
                return {
                    description: this.matcher,
                    resource: this.getResource(data.file),
                    marker: marker
                };
            }
        }
        catch (err) {
            console.error(`Failed to convert problem data into match: ${JSON.stringify(data)}`);
        }
        return undefined;
    }
    getResource(filename) {
        return getResource(filename, this.matcher, this.fileService);
    }
    getLocation(data) {
        if (data.kind === ProblemLocationKind.File) {
            return this.createLocation(0, 0, 0, 0);
        }
        if (data.location) {
            return this.parseLocationInfo(data.location);
        }
        if (!data.line) {
            return null;
        }
        const startLine = parseInt(data.line);
        const startColumn = data.character ? parseInt(data.character) : undefined;
        const endLine = data.endLine ? parseInt(data.endLine) : undefined;
        const endColumn = data.endCharacter ? parseInt(data.endCharacter) : undefined;
        return this.createLocation(startLine, startColumn, endLine, endColumn);
    }
    parseLocationInfo(value) {
        if (!value || !value.match(/(\d+|\d+,\d+|\d+,\d+,\d+,\d+)/)) {
            return null;
        }
        const parts = value.split(',');
        const startLine = parseInt(parts[0]);
        const startColumn = parts.length > 1 ? parseInt(parts[1]) : undefined;
        if (parts.length > 3) {
            return this.createLocation(startLine, startColumn, parseInt(parts[2]), parseInt(parts[3]));
        }
        else {
            return this.createLocation(startLine, startColumn, undefined, undefined);
        }
    }
    createLocation(startLine, startColumn, endLine, endColumn) {
        if (startColumn !== undefined && endColumn !== undefined) {
            return { startLineNumber: startLine, startCharacter: startColumn, endLineNumber: endLine || startLine, endCharacter: endColumn };
        }
        if (startColumn !== undefined) {
            return { startLineNumber: startLine, startCharacter: startColumn, endLineNumber: startLine, endCharacter: startColumn };
        }
        return { startLineNumber: startLine, startCharacter: 1, endLineNumber: startLine, endCharacter: 2 ** 31 - 1 }; // See https://github.com/microsoft/vscode/issues/80288#issuecomment-650636442 for discussion
    }
    getSeverity(data) {
        let result = null;
        if (data.severity) {
            const value = data.severity;
            if (value) {
                result = Severity.fromValue(value);
                if (result === Severity.Ignore) {
                    if (value === 'E') {
                        result = Severity.Error;
                    }
                    else if (value === 'W') {
                        result = Severity.Warning;
                    }
                    else if (value === 'I') {
                        result = Severity.Info;
                    }
                    else if (Strings.equalsIgnoreCase(value, 'hint')) {
                        result = Severity.Info;
                    }
                    else if (Strings.equalsIgnoreCase(value, 'note')) {
                        result = Severity.Info;
                    }
                }
            }
        }
        if (result === null || result === Severity.Ignore) {
            result = this.matcher.severity || Severity.Error;
        }
        return MarkerSeverity.fromSeverity(result);
    }
}
class SingleLineMatcher extends AbstractLineMatcher {
    constructor(matcher, fileService) {
        super(matcher, fileService);
        this.pattern = matcher.pattern;
    }
    get matchLength() {
        return 1;
    }
    handle(lines, start = 0) {
        Assert.ok(lines.length - start === 1);
        const data = Object.create(null);
        if (this.pattern.kind !== undefined) {
            data.kind = this.pattern.kind;
        }
        const matches = this.pattern.regexp.exec(lines[start]);
        if (matches) {
            this.fillProblemData(data, this.pattern, matches);
            const match = this.getMarkerMatch(data);
            if (match) {
                return { match: match, continue: false };
            }
        }
        return { match: null, continue: false };
    }
    next(line) {
        return null;
    }
}
class MultiLineMatcher extends AbstractLineMatcher {
    constructor(matcher, fileService) {
        super(matcher, fileService);
        this.patterns = matcher.pattern;
    }
    get matchLength() {
        return this.patterns.length;
    }
    handle(lines, start = 0) {
        Assert.ok(lines.length - start === this.patterns.length);
        this.data = Object.create(null);
        let data = this.data;
        data.kind = this.patterns[0].kind;
        for (let i = 0; i < this.patterns.length; i++) {
            const pattern = this.patterns[i];
            const matches = pattern.regexp.exec(lines[i + start]);
            if (!matches) {
                return { match: null, continue: false };
            }
            else {
                // Only the last pattern can loop
                if (pattern.loop && i === this.patterns.length - 1) {
                    data = Objects.deepClone(data);
                }
                this.fillProblemData(data, pattern, matches);
            }
        }
        const loop = !!this.patterns[this.patterns.length - 1].loop;
        if (!loop) {
            this.data = undefined;
        }
        const markerMatch = data ? this.getMarkerMatch(data) : null;
        return { match: markerMatch ? markerMatch : null, continue: loop };
    }
    next(line) {
        const pattern = this.patterns[this.patterns.length - 1];
        Assert.ok(pattern.loop === true && this.data !== null);
        const matches = pattern.regexp.exec(line);
        if (!matches) {
            this.data = undefined;
            return null;
        }
        const data = Objects.deepClone(this.data);
        let problemMatch;
        if (this.fillProblemData(data, pattern, matches)) {
            problemMatch = this.getMarkerMatch(data);
        }
        return problemMatch ? problemMatch : null;
    }
}
export var Config;
(function (Config) {
    let CheckedProblemPattern;
    (function (CheckedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && Types.isString(candidate.regexp);
        }
        CheckedProblemPattern.is = is;
    })(CheckedProblemPattern = Config.CheckedProblemPattern || (Config.CheckedProblemPattern = {}));
    let NamedProblemPattern;
    (function (NamedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && Types.isString(candidate.name);
        }
        NamedProblemPattern.is = is;
    })(NamedProblemPattern = Config.NamedProblemPattern || (Config.NamedProblemPattern = {}));
    let NamedCheckedProblemPattern;
    (function (NamedCheckedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && NamedProblemPattern.is(candidate) && Types.isString(candidate.regexp);
        }
        NamedCheckedProblemPattern.is = is;
    })(NamedCheckedProblemPattern = Config.NamedCheckedProblemPattern || (Config.NamedCheckedProblemPattern = {}));
    let MultiLineProblemPattern;
    (function (MultiLineProblemPattern) {
        function is(value) {
            return value && Array.isArray(value);
        }
        MultiLineProblemPattern.is = is;
    })(MultiLineProblemPattern = Config.MultiLineProblemPattern || (Config.MultiLineProblemPattern = {}));
    let MultiLineCheckedProblemPattern;
    (function (MultiLineCheckedProblemPattern) {
        function is(value) {
            if (!MultiLineProblemPattern.is(value)) {
                return false;
            }
            for (const element of value) {
                if (!Config.CheckedProblemPattern.is(element)) {
                    return false;
                }
            }
            return true;
        }
        MultiLineCheckedProblemPattern.is = is;
    })(MultiLineCheckedProblemPattern = Config.MultiLineCheckedProblemPattern || (Config.MultiLineCheckedProblemPattern = {}));
    let NamedMultiLineCheckedProblemPattern;
    (function (NamedMultiLineCheckedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && Types.isString(candidate.name) && Array.isArray(candidate.patterns) && MultiLineCheckedProblemPattern.is(candidate.patterns);
        }
        NamedMultiLineCheckedProblemPattern.is = is;
    })(NamedMultiLineCheckedProblemPattern = Config.NamedMultiLineCheckedProblemPattern || (Config.NamedMultiLineCheckedProblemPattern = {}));
    function isNamedProblemMatcher(value) {
        return Types.isString(value.name);
    }
    Config.isNamedProblemMatcher = isNamedProblemMatcher;
})(Config || (Config = {}));
export class ProblemPatternParser extends Parser {
    constructor(logger) {
        super(logger);
    }
    parse(value) {
        if (Config.NamedMultiLineCheckedProblemPattern.is(value)) {
            return this.createNamedMultiLineProblemPattern(value);
        }
        else if (Config.MultiLineCheckedProblemPattern.is(value)) {
            return this.createMultiLineProblemPattern(value);
        }
        else if (Config.NamedCheckedProblemPattern.is(value)) {
            const result = this.createSingleProblemPattern(value);
            result.name = value.name;
            return result;
        }
        else if (Config.CheckedProblemPattern.is(value)) {
            return this.createSingleProblemPattern(value);
        }
        else {
            this.error(localize('ProblemPatternParser.problemPattern.missingRegExp', 'The problem pattern is missing a regular expression.'));
            return null;
        }
    }
    createSingleProblemPattern(value) {
        const result = this.doCreateSingleProblemPattern(value, true);
        if (result === undefined) {
            return null;
        }
        else if (result.kind === undefined) {
            result.kind = ProblemLocationKind.Location;
        }
        return this.validateProblemPattern([result]) ? result : null;
    }
    createNamedMultiLineProblemPattern(value) {
        const validPatterns = this.createMultiLineProblemPattern(value.patterns);
        if (!validPatterns) {
            return null;
        }
        const result = {
            name: value.name,
            label: value.label ? value.label : value.name,
            patterns: validPatterns
        };
        return result;
    }
    createMultiLineProblemPattern(values) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            const pattern = this.doCreateSingleProblemPattern(values[i], false);
            if (pattern === undefined) {
                return null;
            }
            if (i < values.length - 1) {
                if (!Types.isUndefined(pattern.loop) && pattern.loop) {
                    pattern.loop = false;
                    this.error(localize('ProblemPatternParser.loopProperty.notLast', 'The loop property is only supported on the last line matcher.'));
                }
            }
            result.push(pattern);
        }
        if (result[0].kind === undefined) {
            result[0].kind = ProblemLocationKind.Location;
        }
        return this.validateProblemPattern(result) ? result : null;
    }
    doCreateSingleProblemPattern(value, setDefaults) {
        const regexp = this.createRegularExpression(value.regexp);
        if (regexp === undefined) {
            return undefined;
        }
        let result = { regexp };
        if (value.kind) {
            result.kind = ProblemLocationKind.fromString(value.kind);
        }
        function copyProperty(result, source, resultKey, sourceKey) {
            const value = source[sourceKey];
            if (typeof value === 'number') {
                result[resultKey] = value;
            }
        }
        copyProperty(result, value, 'file', 'file');
        copyProperty(result, value, 'location', 'location');
        copyProperty(result, value, 'line', 'line');
        copyProperty(result, value, 'character', 'column');
        copyProperty(result, value, 'endLine', 'endLine');
        copyProperty(result, value, 'endCharacter', 'endColumn');
        copyProperty(result, value, 'severity', 'severity');
        copyProperty(result, value, 'code', 'code');
        copyProperty(result, value, 'message', 'message');
        if (value.loop === true || value.loop === false) {
            result.loop = value.loop;
        }
        if (setDefaults) {
            if (result.location || result.kind === ProblemLocationKind.File) {
                const defaultValue = {
                    file: 1,
                    message: 0
                };
                result = Objects.mixin(result, defaultValue, false);
            }
            else {
                const defaultValue = {
                    file: 1,
                    line: 2,
                    character: 3,
                    message: 0
                };
                result = Objects.mixin(result, defaultValue, false);
            }
        }
        return result;
    }
    validateProblemPattern(values) {
        let file = false, message = false, location = false, line = false;
        const locationKind = (values[0].kind === undefined) ? ProblemLocationKind.Location : values[0].kind;
        values.forEach((pattern, i) => {
            if (i !== 0 && pattern.kind) {
                this.error(localize('ProblemPatternParser.problemPattern.kindProperty.notFirst', 'The problem pattern is invalid. The kind property must be provided only in the first element'));
            }
            file = file || !Types.isUndefined(pattern.file);
            message = message || !Types.isUndefined(pattern.message);
            location = location || !Types.isUndefined(pattern.location);
            line = line || !Types.isUndefined(pattern.line);
        });
        if (!(file && message)) {
            this.error(localize('ProblemPatternParser.problemPattern.missingProperty', 'The problem pattern is invalid. It must have at least have a file and a message.'));
            return false;
        }
        if (locationKind === ProblemLocationKind.Location && !(location || line)) {
            this.error(localize('ProblemPatternParser.problemPattern.missingLocation', 'The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
            return false;
        }
        return true;
    }
    createRegularExpression(value) {
        let result;
        try {
            result = new RegExp(value);
        }
        catch (err) {
            this.error(localize('ProblemPatternParser.invalidRegexp', 'Error: The string {0} is not a valid regular expression.\n', value));
        }
        return result;
    }
}
export class ExtensionRegistryReporter {
    constructor(_collector, _validationStatus = new ValidationStatus()) {
        this._collector = _collector;
        this._validationStatus = _validationStatus;
    }
    info(message) {
        this._validationStatus.state = 1 /* ValidationState.Info */;
        this._collector.info(message);
    }
    warn(message) {
        this._validationStatus.state = 2 /* ValidationState.Warning */;
        this._collector.warn(message);
    }
    error(message) {
        this._validationStatus.state = 3 /* ValidationState.Error */;
        this._collector.error(message);
    }
    fatal(message) {
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
        this._collector.error(message);
    }
    get status() {
        return this._validationStatus;
    }
}
export var Schemas;
(function (Schemas) {
    Schemas.ProblemPattern = {
        default: {
            regexp: '^([^\\\\s].*)\\\\((\\\\d+,\\\\d+)\\\\):\\\\s*(.*)$',
            file: 1,
            location: 2,
            message: 3
        },
        type: 'object',
        additionalProperties: false,
        properties: {
            regexp: {
                type: 'string',
                description: localize('ProblemPatternSchema.regexp', 'The regular expression to find an error, warning or info in the output.')
            },
            kind: {
                type: 'string',
                description: localize('ProblemPatternSchema.kind', 'whether the pattern matches a location (file and line) or only a file.')
            },
            file: {
                type: 'integer',
                description: localize('ProblemPatternSchema.file', 'The match group index of the filename. If omitted 1 is used.')
            },
            location: {
                type: 'integer',
                description: localize('ProblemPatternSchema.location', 'The match group index of the problem\'s location. Valid location patterns are: (line), (line,column) and (startLine,startColumn,endLine,endColumn). If omitted (line,column) is assumed.')
            },
            line: {
                type: 'integer',
                description: localize('ProblemPatternSchema.line', 'The match group index of the problem\'s line. Defaults to 2')
            },
            column: {
                type: 'integer',
                description: localize('ProblemPatternSchema.column', 'The match group index of the problem\'s line character. Defaults to 3')
            },
            endLine: {
                type: 'integer',
                description: localize('ProblemPatternSchema.endLine', 'The match group index of the problem\'s end line. Defaults to undefined')
            },
            endColumn: {
                type: 'integer',
                description: localize('ProblemPatternSchema.endColumn', 'The match group index of the problem\'s end line character. Defaults to undefined')
            },
            severity: {
                type: 'integer',
                description: localize('ProblemPatternSchema.severity', 'The match group index of the problem\'s severity. Defaults to undefined')
            },
            code: {
                type: 'integer',
                description: localize('ProblemPatternSchema.code', 'The match group index of the problem\'s code. Defaults to undefined')
            },
            message: {
                type: 'integer',
                description: localize('ProblemPatternSchema.message', 'The match group index of the message. If omitted it defaults to 4 if location is specified. Otherwise it defaults to 5.')
            },
            loop: {
                type: 'boolean',
                description: localize('ProblemPatternSchema.loop', 'In a multi line matcher loop indicated whether this pattern is executed in a loop as long as it matches. Can only specified on a last pattern in a multi line pattern.')
            }
        }
    };
    Schemas.NamedProblemPattern = Objects.deepClone(Schemas.ProblemPattern);
    Schemas.NamedProblemPattern.properties = Objects.deepClone(Schemas.NamedProblemPattern.properties) || {};
    Schemas.NamedProblemPattern.properties['name'] = {
        type: 'string',
        description: localize('NamedProblemPatternSchema.name', 'The name of the problem pattern.')
    };
    Schemas.MultiLineProblemPattern = {
        type: 'array',
        items: Schemas.ProblemPattern
    };
    Schemas.NamedMultiLineProblemPattern = {
        type: 'object',
        additionalProperties: false,
        properties: {
            name: {
                type: 'string',
                description: localize('NamedMultiLineProblemPatternSchema.name', 'The name of the problem multi line problem pattern.')
            },
            patterns: {
                type: 'array',
                description: localize('NamedMultiLineProblemPatternSchema.patterns', 'The actual patterns.'),
                items: Schemas.ProblemPattern
            }
        }
    };
    Schemas.WatchingPattern = {
        type: 'object',
        additionalProperties: false,
        properties: {
            regexp: {
                type: 'string',
                description: localize('WatchingPatternSchema.regexp', 'The regular expression to detect the begin or end of a background task.')
            },
            file: {
                type: 'integer',
                description: localize('WatchingPatternSchema.file', 'The match group index of the filename. Can be omitted.')
            },
        }
    };
    Schemas.PatternType = {
        anyOf: [
            {
                type: 'string',
                description: localize('PatternTypeSchema.name', 'The name of a contributed or predefined pattern')
            },
            Schemas.ProblemPattern,
            Schemas.MultiLineProblemPattern
        ],
        description: localize('PatternTypeSchema.description', 'A problem pattern or the name of a contributed or predefined problem pattern. Can be omitted if base is specified.')
    };
    Schemas.ProblemMatcher = {
        type: 'object',
        additionalProperties: false,
        properties: {
            base: {
                type: 'string',
                description: localize('ProblemMatcherSchema.base', 'The name of a base problem matcher to use.')
            },
            owner: {
                type: 'string',
                description: localize('ProblemMatcherSchema.owner', 'The owner of the problem inside Code. Can be omitted if base is specified. Defaults to \'external\' if omitted and base is not specified.')
            },
            source: {
                type: 'string',
                description: localize('ProblemMatcherSchema.source', 'A human-readable string describing the source of this diagnostic, e.g. \'typescript\' or \'super lint\'.')
            },
            severity: {
                type: 'string',
                enum: ['error', 'warning', 'info'],
                description: localize('ProblemMatcherSchema.severity', 'The default severity for captures problems. Is used if the pattern doesn\'t define a match group for severity.')
            },
            applyTo: {
                type: 'string',
                enum: ['allDocuments', 'openDocuments', 'closedDocuments'],
                description: localize('ProblemMatcherSchema.applyTo', 'Controls if a problem reported on a text document is applied only to open, closed or all documents.')
            },
            pattern: Schemas.PatternType,
            fileLocation: {
                oneOf: [
                    {
                        type: 'string',
                        enum: ['absolute', 'relative', 'autoDetect', 'search']
                    },
                    {
                        type: 'array',
                        prefixItems: [
                            {
                                type: 'string',
                                enum: ['absolute', 'relative', 'autoDetect', 'search']
                            },
                        ],
                        minItems: 1,
                        maxItems: 1,
                        additionalItems: false
                    },
                    {
                        type: 'array',
                        prefixItems: [
                            { type: 'string', enum: ['relative', 'autoDetect'] },
                            { type: 'string' },
                        ],
                        minItems: 2,
                        maxItems: 2,
                        additionalItems: false,
                        examples: [
                            ['relative', '${workspaceFolder}'],
                            ['autoDetect', '${workspaceFolder}'],
                        ]
                    },
                    {
                        type: 'array',
                        prefixItems: [
                            { type: 'string', enum: ['search'] },
                            {
                                type: 'object',
                                properties: {
                                    'include': {
                                        oneOf: [
                                            { type: 'string' },
                                            { type: 'array', items: { type: 'string' } }
                                        ]
                                    },
                                    'exclude': {
                                        oneOf: [
                                            { type: 'string' },
                                            { type: 'array', items: { type: 'string' } }
                                        ]
                                    },
                                },
                                required: ['include']
                            }
                        ],
                        minItems: 2,
                        maxItems: 2,
                        additionalItems: false,
                        examples: [
                            ['search', { 'include': ['${workspaceFolder}'] }],
                            ['search', { 'include': ['${workspaceFolder}'], 'exclude': [] }]
                        ],
                    }
                ],
                description: localize('ProblemMatcherSchema.fileLocation', 'Defines how file names reported in a problem pattern should be interpreted. A relative fileLocation may be an array, where the second element of the array is the path of the relative file location. The search fileLocation mode, performs a deep (and, possibly, heavy) file system search within the directories specified by the include/exclude properties of the second element (or the current workspace directory if not specified).')
            },
            background: {
                type: 'object',
                additionalProperties: false,
                description: localize('ProblemMatcherSchema.background', 'Patterns to track the begin and end of a matcher active on a background task.'),
                properties: {
                    activeOnStart: {
                        type: 'boolean',
                        description: localize('ProblemMatcherSchema.background.activeOnStart', 'If set to true the background monitor starts in active mode. This is the same as outputting a line that matches beginsPattern when the task starts.')
                    },
                    beginsPattern: {
                        oneOf: [
                            {
                                type: 'string'
                            },
                            Schemas.WatchingPattern
                        ],
                        description: localize('ProblemMatcherSchema.background.beginsPattern', 'If matched in the output the start of a background task is signaled.')
                    },
                    endsPattern: {
                        oneOf: [
                            {
                                type: 'string'
                            },
                            Schemas.WatchingPattern
                        ],
                        description: localize('ProblemMatcherSchema.background.endsPattern', 'If matched in the output the end of a background task is signaled.')
                    }
                }
            },
            watching: {
                type: 'object',
                additionalProperties: false,
                deprecationMessage: localize('ProblemMatcherSchema.watching.deprecated', 'The watching property is deprecated. Use background instead.'),
                description: localize('ProblemMatcherSchema.watching', 'Patterns to track the begin and end of a watching matcher.'),
                properties: {
                    activeOnStart: {
                        type: 'boolean',
                        description: localize('ProblemMatcherSchema.watching.activeOnStart', 'If set to true the watcher starts in active mode. This is the same as outputting a line that matches beginsPattern when the task starts.')
                    },
                    beginsPattern: {
                        oneOf: [
                            {
                                type: 'string'
                            },
                            Schemas.WatchingPattern
                        ],
                        description: localize('ProblemMatcherSchema.watching.beginsPattern', 'If matched in the output the start of a watching task is signaled.')
                    },
                    endsPattern: {
                        oneOf: [
                            {
                                type: 'string'
                            },
                            Schemas.WatchingPattern
                        ],
                        description: localize('ProblemMatcherSchema.watching.endsPattern', 'If matched in the output the end of a watching task is signaled.')
                    }
                }
            }
        }
    };
    Schemas.LegacyProblemMatcher = Objects.deepClone(Schemas.ProblemMatcher);
    Schemas.LegacyProblemMatcher.properties = Objects.deepClone(Schemas.LegacyProblemMatcher.properties) || {};
    Schemas.LegacyProblemMatcher.properties['watchedTaskBeginsRegExp'] = {
        type: 'string',
        deprecationMessage: localize('LegacyProblemMatcherSchema.watchedBegin.deprecated', 'This property is deprecated. Use the watching property instead.'),
        description: localize('LegacyProblemMatcherSchema.watchedBegin', 'A regular expression signaling that a watched tasks begins executing triggered through file watching.')
    };
    Schemas.LegacyProblemMatcher.properties['watchedTaskEndsRegExp'] = {
        type: 'string',
        deprecationMessage: localize('LegacyProblemMatcherSchema.watchedEnd.deprecated', 'This property is deprecated. Use the watching property instead.'),
        description: localize('LegacyProblemMatcherSchema.watchedEnd', 'A regular expression signaling that a watched tasks ends executing.')
    };
    Schemas.NamedProblemMatcher = Objects.deepClone(Schemas.ProblemMatcher);
    Schemas.NamedProblemMatcher.properties = Objects.deepClone(Schemas.NamedProblemMatcher.properties) || {};
    Schemas.NamedProblemMatcher.properties.name = {
        type: 'string',
        description: localize('NamedProblemMatcherSchema.name', 'The name of the problem matcher used to refer to it.')
    };
    Schemas.NamedProblemMatcher.properties.label = {
        type: 'string',
        description: localize('NamedProblemMatcherSchema.label', 'A human readable label of the problem matcher.')
    };
})(Schemas || (Schemas = {}));
const problemPatternExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'problemPatterns',
    jsonSchema: {
        description: localize('ProblemPatternExtPoint', 'Contributes problem patterns'),
        type: 'array',
        items: {
            anyOf: [
                Schemas.NamedProblemPattern,
                Schemas.NamedMultiLineProblemPattern
            ]
        }
    }
});
class ProblemPatternRegistryImpl {
    constructor() {
        this.patterns = Object.create(null);
        this.fillDefaults();
        this.readyPromise = new Promise((resolve, reject) => {
            problemPatternExtPoint.setHandler((extensions, delta) => {
                // We get all statically know extension during startup in one batch
                try {
                    delta.removed.forEach(extension => {
                        const problemPatterns = extension.value;
                        for (const pattern of problemPatterns) {
                            if (this.patterns[pattern.name]) {
                                delete this.patterns[pattern.name];
                            }
                        }
                    });
                    delta.added.forEach(extension => {
                        const problemPatterns = extension.value;
                        const parser = new ProblemPatternParser(new ExtensionRegistryReporter(extension.collector));
                        for (const pattern of problemPatterns) {
                            if (Config.NamedMultiLineCheckedProblemPattern.is(pattern)) {
                                const result = parser.parse(pattern);
                                if (parser.problemReporter.status.state < 3 /* ValidationState.Error */) {
                                    this.add(result.name, result.patterns);
                                }
                                else {
                                    extension.collector.error(localize('ProblemPatternRegistry.error', 'Invalid problem pattern. The pattern will be ignored.'));
                                    extension.collector.error(JSON.stringify(pattern, undefined, 4));
                                }
                            }
                            else if (Config.NamedProblemPattern.is(pattern)) {
                                const result = parser.parse(pattern);
                                if (parser.problemReporter.status.state < 3 /* ValidationState.Error */) {
                                    this.add(pattern.name, result);
                                }
                                else {
                                    extension.collector.error(localize('ProblemPatternRegistry.error', 'Invalid problem pattern. The pattern will be ignored.'));
                                    extension.collector.error(JSON.stringify(pattern, undefined, 4));
                                }
                            }
                            parser.reset();
                        }
                    });
                }
                catch (error) {
                    // Do nothing
                }
                resolve(undefined);
            });
        });
    }
    onReady() {
        return this.readyPromise;
    }
    add(key, value) {
        this.patterns[key] = value;
    }
    get(key) {
        return this.patterns[key];
    }
    fillDefaults() {
        this.add('msCompile', {
            regexp: /^(?:\s*\d+>)?(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\)\s*:\s+((?:fatal +)?error|warning|info)\s+(\w+\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5
        });
        this.add('gulp-tsc', {
            regexp: /^([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(\d+)\s+(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            code: 3,
            message: 4
        });
        this.add('cpp', {
            regexp: /^(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(C\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5
        });
        this.add('csc', {
            regexp: /^(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(CS\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5
        });
        this.add('vb', {
            regexp: /^(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(BC\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5
        });
        this.add('lessCompile', {
            regexp: /^\s*(.*) in file (.*) line no. (\d+)$/,
            kind: ProblemLocationKind.Location,
            message: 1,
            file: 2,
            line: 3
        });
        this.add('jshint', {
            regexp: /^(.*):\s+line\s+(\d+),\s+col\s+(\d+),\s(.+?)(?:\s+\((\w)(\d+)\))?$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            line: 2,
            character: 3,
            message: 4,
            severity: 5,
            code: 6
        });
        this.add('jshint-stylish', [
            {
                regexp: /^(.+)$/,
                kind: ProblemLocationKind.Location,
                file: 1
            },
            {
                regexp: /^\s+line\s+(\d+)\s+col\s+(\d+)\s+(.+?)(?:\s+\((\w)(\d+)\))?$/,
                line: 1,
                character: 2,
                message: 3,
                severity: 4,
                code: 5,
                loop: true
            }
        ]);
        this.add('eslint-compact', {
            regexp: /^(.+):\sline\s(\d+),\scol\s(\d+),\s(Error|Warning|Info)\s-\s(.+)\s\((.+)\)$/,
            file: 1,
            kind: ProblemLocationKind.Location,
            line: 2,
            character: 3,
            severity: 4,
            message: 5,
            code: 6
        });
        this.add('eslint-stylish', [
            {
                regexp: /^((?:[a-zA-Z]:)*[./\\]+.*?)$/,
                kind: ProblemLocationKind.Location,
                file: 1
            },
            {
                regexp: /^\s+(\d+):(\d+)\s+(error|warning|info)\s+(.+?)(?:\s\s+(.*))?$/,
                line: 1,
                character: 2,
                severity: 3,
                message: 4,
                code: 5,
                loop: true
            }
        ]);
        this.add('go', {
            regexp: /^([^:]*: )?((.:)?[^:]*):(\d+)(:(\d+))?: (.*)$/,
            kind: ProblemLocationKind.Location,
            file: 2,
            line: 4,
            character: 6,
            message: 7
        });
    }
}
export const ProblemPatternRegistry = new ProblemPatternRegistryImpl();
export class ProblemMatcherParser extends Parser {
    constructor(logger) {
        super(logger);
    }
    parse(json) {
        const result = this.createProblemMatcher(json);
        if (!this.checkProblemMatcherValid(json, result)) {
            return undefined;
        }
        this.addWatchingMatcher(json, result);
        return result;
    }
    checkProblemMatcherValid(externalProblemMatcher, problemMatcher) {
        if (!problemMatcher) {
            this.error(localize('ProblemMatcherParser.noProblemMatcher', 'Error: the description can\'t be converted into a problem matcher:\n{0}\n', JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        if (!problemMatcher.pattern) {
            this.error(localize('ProblemMatcherParser.noProblemPattern', 'Error: the description doesn\'t define a valid problem pattern:\n{0}\n', JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        if (!problemMatcher.owner) {
            this.error(localize('ProblemMatcherParser.noOwner', 'Error: the description doesn\'t define an owner:\n{0}\n', JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        if (Types.isUndefined(problemMatcher.fileLocation)) {
            this.error(localize('ProblemMatcherParser.noFileLocation', 'Error: the description doesn\'t define a file location:\n{0}\n', JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        return true;
    }
    createProblemMatcher(description) {
        let result = null;
        const owner = Types.isString(description.owner) ? description.owner : UUID.generateUuid();
        const source = Types.isString(description.source) ? description.source : undefined;
        let applyTo = Types.isString(description.applyTo) ? ApplyToKind.fromString(description.applyTo) : ApplyToKind.allDocuments;
        if (!applyTo) {
            applyTo = ApplyToKind.allDocuments;
        }
        let fileLocation = undefined;
        let filePrefix = undefined;
        let kind;
        if (Types.isUndefined(description.fileLocation)) {
            fileLocation = FileLocationKind.Relative;
            filePrefix = '${workspaceFolder}';
        }
        else if (Types.isString(description.fileLocation)) {
            kind = FileLocationKind.fromString(description.fileLocation);
            if (kind) {
                fileLocation = kind;
                if ((kind === FileLocationKind.Relative) || (kind === FileLocationKind.AutoDetect)) {
                    filePrefix = '${workspaceFolder}';
                }
                else if (kind === FileLocationKind.Search) {
                    filePrefix = { include: ['${workspaceFolder}'] };
                }
            }
        }
        else if (Types.isStringArray(description.fileLocation)) {
            const values = description.fileLocation;
            if (values.length > 0) {
                kind = FileLocationKind.fromString(values[0]);
                if (values.length === 1 && kind === FileLocationKind.Absolute) {
                    fileLocation = kind;
                }
                else if (values.length === 2 && (kind === FileLocationKind.Relative || kind === FileLocationKind.AutoDetect) && values[1]) {
                    fileLocation = kind;
                    filePrefix = values[1];
                }
            }
        }
        else if (Array.isArray(description.fileLocation)) {
            const kind = FileLocationKind.fromString(description.fileLocation[0]);
            if (kind === FileLocationKind.Search) {
                fileLocation = FileLocationKind.Search;
                filePrefix = description.fileLocation[1] ?? { include: ['${workspaceFolder}'] };
            }
        }
        const pattern = description.pattern ? this.createProblemPattern(description.pattern) : undefined;
        let severity = description.severity ? Severity.fromValue(description.severity) : undefined;
        if (severity === Severity.Ignore) {
            this.info(localize('ProblemMatcherParser.unknownSeverity', 'Info: unknown severity {0}. Valid values are error, warning and info.\n', description.severity));
            severity = Severity.Error;
        }
        if (Types.isString(description.base)) {
            const variableName = description.base;
            if (variableName.length > 1 && variableName[0] === '$') {
                const base = ProblemMatcherRegistry.get(variableName.substring(1));
                if (base) {
                    result = Objects.deepClone(base);
                    if (description.owner !== undefined && owner !== undefined) {
                        result.owner = owner;
                    }
                    if (description.source !== undefined && source !== undefined) {
                        result.source = source;
                    }
                    if (description.fileLocation !== undefined && fileLocation !== undefined) {
                        result.fileLocation = fileLocation;
                        result.filePrefix = filePrefix;
                    }
                    if (description.pattern !== undefined && pattern !== undefined && pattern !== null) {
                        result.pattern = pattern;
                    }
                    if (description.severity !== undefined && severity !== undefined) {
                        result.severity = severity;
                    }
                    if (description.applyTo !== undefined && applyTo !== undefined) {
                        result.applyTo = applyTo;
                    }
                }
            }
        }
        else if (fileLocation && pattern) {
            result = {
                owner: owner,
                applyTo: applyTo,
                fileLocation: fileLocation,
                pattern: pattern,
            };
            if (source) {
                result.source = source;
            }
            if (filePrefix) {
                result.filePrefix = filePrefix;
            }
            if (severity) {
                result.severity = severity;
            }
        }
        if (Config.isNamedProblemMatcher(description)) {
            result.name = description.name;
            result.label = Types.isString(description.label) ? description.label : description.name;
        }
        return result;
    }
    createProblemPattern(value) {
        if (Types.isString(value)) {
            const variableName = value;
            if (variableName.length > 1 && variableName[0] === '$') {
                const result = ProblemPatternRegistry.get(variableName.substring(1));
                if (!result) {
                    this.error(localize('ProblemMatcherParser.noDefinedPatter', 'Error: the pattern with the identifier {0} doesn\'t exist.', variableName));
                }
                return result;
            }
            else {
                if (variableName.length === 0) {
                    this.error(localize('ProblemMatcherParser.noIdentifier', 'Error: the pattern property refers to an empty identifier.'));
                }
                else {
                    this.error(localize('ProblemMatcherParser.noValidIdentifier', 'Error: the pattern property {0} is not a valid pattern variable name.', variableName));
                }
            }
        }
        else if (value) {
            const problemPatternParser = new ProblemPatternParser(this.problemReporter);
            if (Array.isArray(value)) {
                return problemPatternParser.parse(value);
            }
            else {
                return problemPatternParser.parse(value);
            }
        }
        return null;
    }
    addWatchingMatcher(external, internal) {
        const oldBegins = this.createRegularExpression(external.watchedTaskBeginsRegExp);
        const oldEnds = this.createRegularExpression(external.watchedTaskEndsRegExp);
        if (oldBegins && oldEnds) {
            internal.watching = {
                activeOnStart: false,
                beginsPattern: { regexp: oldBegins },
                endsPattern: { regexp: oldEnds }
            };
            return;
        }
        const backgroundMonitor = external.background || external.watching;
        if (Types.isUndefinedOrNull(backgroundMonitor)) {
            return;
        }
        const begins = this.createWatchingPattern(backgroundMonitor.beginsPattern);
        const ends = this.createWatchingPattern(backgroundMonitor.endsPattern);
        if (begins && ends) {
            internal.watching = {
                activeOnStart: Types.isBoolean(backgroundMonitor.activeOnStart) ? backgroundMonitor.activeOnStart : false,
                beginsPattern: begins,
                endsPattern: ends
            };
            return;
        }
        if (begins || ends) {
            this.error(localize('ProblemMatcherParser.problemPattern.watchingMatcher', 'A problem matcher must define both a begin pattern and an end pattern for watching.'));
        }
    }
    createWatchingPattern(external) {
        if (Types.isUndefinedOrNull(external)) {
            return null;
        }
        let regexp;
        let file;
        if (Types.isString(external)) {
            regexp = this.createRegularExpression(external);
        }
        else {
            regexp = this.createRegularExpression(external.regexp);
            if (Types.isNumber(external.file)) {
                file = external.file;
            }
        }
        if (!regexp) {
            return null;
        }
        return file ? { regexp, file } : { regexp, file: 1 };
    }
    createRegularExpression(value) {
        let result = null;
        if (!value) {
            return result;
        }
        try {
            result = new RegExp(value);
        }
        catch (err) {
            this.error(localize('ProblemMatcherParser.invalidRegexp', 'Error: The string {0} is not a valid regular expression.\n', value));
        }
        return result;
    }
}
const problemMatchersExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'problemMatchers',
    deps: [problemPatternExtPoint],
    jsonSchema: {
        description: localize('ProblemMatcherExtPoint', 'Contributes problem matchers'),
        type: 'array',
        items: Schemas.NamedProblemMatcher
    }
});
class ProblemMatcherRegistryImpl {
    constructor() {
        this._onMatchersChanged = new Emitter();
        this.onMatcherChanged = this._onMatchersChanged.event;
        this.matchers = Object.create(null);
        this.fillDefaults();
        this.readyPromise = new Promise((resolve, reject) => {
            problemMatchersExtPoint.setHandler((extensions, delta) => {
                try {
                    delta.removed.forEach(extension => {
                        const problemMatchers = extension.value;
                        for (const matcher of problemMatchers) {
                            if (this.matchers[matcher.name]) {
                                delete this.matchers[matcher.name];
                            }
                        }
                    });
                    delta.added.forEach(extension => {
                        const problemMatchers = extension.value;
                        const parser = new ProblemMatcherParser(new ExtensionRegistryReporter(extension.collector));
                        for (const matcher of problemMatchers) {
                            const result = parser.parse(matcher);
                            if (result && isNamedProblemMatcher(result)) {
                                this.add(result);
                            }
                        }
                    });
                    if ((delta.removed.length > 0) || (delta.added.length > 0)) {
                        this._onMatchersChanged.fire();
                    }
                }
                catch (error) {
                }
                const matcher = this.get('tsc-watch');
                if (matcher) {
                    matcher.tscWatch = true;
                }
                resolve(undefined);
            });
        });
    }
    onReady() {
        ProblemPatternRegistry.onReady();
        return this.readyPromise;
    }
    add(matcher) {
        this.matchers[matcher.name] = matcher;
    }
    get(name) {
        return this.matchers[name];
    }
    keys() {
        return Object.keys(this.matchers);
    }
    fillDefaults() {
        this.add({
            name: 'msCompile',
            label: localize('msCompile', 'Microsoft compiler problems'),
            owner: 'msCompile',
            source: 'cpp',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('msCompile')
        });
        this.add({
            name: 'lessCompile',
            label: localize('lessCompile', 'Less problems'),
            deprecated: true,
            owner: 'lessCompile',
            source: 'less',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('lessCompile'),
            severity: Severity.Error
        });
        this.add({
            name: 'gulp-tsc',
            label: localize('gulp-tsc', 'Gulp TSC Problems'),
            owner: 'typescript',
            source: 'ts',
            applyTo: ApplyToKind.closedDocuments,
            fileLocation: FileLocationKind.Relative,
            filePrefix: '${workspaceFolder}',
            pattern: ProblemPatternRegistry.get('gulp-tsc')
        });
        this.add({
            name: 'jshint',
            label: localize('jshint', 'JSHint problems'),
            owner: 'jshint',
            source: 'jshint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('jshint')
        });
        this.add({
            name: 'jshint-stylish',
            label: localize('jshint-stylish', 'JSHint stylish problems'),
            owner: 'jshint',
            source: 'jshint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('jshint-stylish')
        });
        this.add({
            name: 'eslint-compact',
            label: localize('eslint-compact', 'ESLint compact problems'),
            owner: 'eslint',
            source: 'eslint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            filePrefix: '${workspaceFolder}',
            pattern: ProblemPatternRegistry.get('eslint-compact')
        });
        this.add({
            name: 'eslint-stylish',
            label: localize('eslint-stylish', 'ESLint stylish problems'),
            owner: 'eslint',
            source: 'eslint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('eslint-stylish')
        });
        this.add({
            name: 'go',
            label: localize('go', 'Go problems'),
            owner: 'go',
            source: 'go',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Relative,
            filePrefix: '${workspaceFolder}',
            pattern: ProblemPatternRegistry.get('go')
        });
    }
}
export const ProblemMatcherRegistry = new ProblemMatcherRegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Byb2JsZW1NYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQXFDLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWpILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxJQUFJLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRS9FLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQTZCLE1BQU0sMkRBQTJELENBQUM7QUFDMUgsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFr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