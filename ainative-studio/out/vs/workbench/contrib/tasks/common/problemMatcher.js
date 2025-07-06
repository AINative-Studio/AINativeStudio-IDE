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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vcHJvYmxlbU1hdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxnQkFBZ0IsRUFBcUMsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFakgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLElBQUksY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFL0UsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBNkIsTUFBTSwyREFBMkQsQ0FBQztBQUMxSCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtD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