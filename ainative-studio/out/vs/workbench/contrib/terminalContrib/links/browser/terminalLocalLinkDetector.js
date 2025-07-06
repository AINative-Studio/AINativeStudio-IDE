/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { convertLinkRangeToBuffer, getXtermLineContent, getXtermRangesByAttr, osPathModule, updateLinkWithRelativeCwd } from './terminalLinkHelpers.js';
import { detectLinks } from './terminalLinkParsing.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The max line length to try extract word links from.
     */
    Constants[Constants["MaxLineLength"] = 2000] = "MaxLineLength";
    /**
     * The maximum number of links in a line to resolve against the file system. This limit is put
     * in place to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinksInLine"] = 10] = "MaxResolvedLinksInLine";
    /**
     * The maximum length of a link to resolve against the file system. This limit is put in place
     * to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinkLength"] = 1024] = "MaxResolvedLinkLength";
})(Constants || (Constants = {}));
const fallbackMatchers = [
    // Python style error: File "<path>", line <line>
    /^ *File (?<link>"(?<path>.+)"(, line (?<line>\d+))?)/,
    // Unknown tool #200166: FILE  <path>:<line>:<col>
    /^ +FILE +(?<link>(?<path>.+)(?::(?<line>\d+)(?::(?<col>\d+))?)?)/,
    // Some C++ compile error formats:
    // C:\foo\bar baz(339) : error ...
    // C:\foo\bar baz(339,12) : error ...
    // C:\foo\bar baz(339, 12) : error ...
    // C:\foo\bar baz(339): error ...       [#178584, Visual Studio CL/NVIDIA CUDA compiler]
    // C:\foo\bar baz(339,12): ...
    // C:\foo\bar baz(339, 12): ...
    /^(?<link>(?<path>.+)\((?<line>\d+)(?:, ?(?<col>\d+))?\)) ?:/,
    // C:\foo/bar baz:339 : error ...
    // C:\foo/bar baz:339:12 : error ...
    // C:\foo/bar baz:339: error ...
    // C:\foo/bar baz:339:12: error ...     [#178584, Clang]
    /^(?<link>(?<path>.+):(?<line>\d+)(?::(?<col>\d+))?) ?:/,
    // Cmd prompt
    /^(?<link>(?<path>.+))>/,
    // The whole line is the path
    /^ *(?<link>(?<path>.+))/
];
let TerminalLocalLinkDetector = class TerminalLocalLinkDetector {
    static { this.id = 'local'; }
    constructor(xterm, _capabilities, _processManager, _linkResolver, _logService, _uriIdentityService, _workspaceContextService) {
        this.xterm = xterm;
        this._capabilities = _capabilities;
        this._processManager = _processManager;
        this._linkResolver = _linkResolver;
        this._logService = _logService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        // This was chosen as a reasonable maximum line length given the tradeoff between performance
        // and how likely it is to encounter such a large line length. Some useful reference points:
        // - Window old max length: 260 ($MAX_PATH)
        // - Linux max length: 4096 ($PATH_MAX)
        this.maxLinkLength = 500;
    }
    async detect(lines, startLine, endLine) {
        const links = [];
        // Get the text representation of the wrapped line
        const text = getXtermLineContent(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
        if (text === '' || text.length > 2000 /* Constants.MaxLineLength */) {
            return [];
        }
        let stringIndex = -1;
        let resolvedLinkCount = 0;
        const os = this._processManager.os || OS;
        const parsedLinks = detectLinks(text, os);
        this._logService.trace('terminalLocalLinkDetector#detect text', text);
        this._logService.trace('terminalLocalLinkDetector#detect parsedLinks', parsedLinks);
        for (const parsedLink of parsedLinks) {
            // Don't try resolve any links of excessive length
            if (parsedLink.path.text.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                continue;
            }
            // Convert the link text's string index into a wrapped buffer range
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                startColumn: (parsedLink.prefix?.index ?? parsedLink.path.index) + 1,
                startLineNumber: 1,
                endColumn: parsedLink.path.index + parsedLink.path.text.length + (parsedLink.suffix?.suffix.text.length ?? 0) + 1,
                endLineNumber: 1
            }, startLine);
            // Get a single link candidate if the cwd of the line is known
            const linkCandidates = [];
            const osPath = osPathModule(os);
            const isUri = parsedLink.path.text.startsWith('file://');
            if (osPath.isAbsolute(parsedLink.path.text) || parsedLink.path.text.startsWith('~') || isUri) {
                linkCandidates.push(parsedLink.path.text);
            }
            else {
                if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
                    const absolutePath = updateLinkWithRelativeCwd(this._capabilities, bufferRange.start.y, parsedLink.path.text, osPath, this._logService);
                    // Only add a single exact link candidate if the cwd is available, this may cause
                    // the link to not be resolved but that should only occur when the actual file does
                    // not exist. Doing otherwise could cause unexpected results where handling via the
                    // word link detector is preferable.
                    if (absolutePath) {
                        linkCandidates.push(...absolutePath);
                    }
                }
                // Fallback to resolving against the initial cwd, removing any relative directory prefixes
                if (linkCandidates.length === 0) {
                    linkCandidates.push(parsedLink.path.text);
                    if (parsedLink.path.text.match(/^(\.\.[\/\\])+/)) {
                        linkCandidates.push(parsedLink.path.text.replace(/^(\.\.[\/\\])+/, ''));
                    }
                }
            }
            // If any candidates end with special characters that are likely to not be part of the
            // link, add a candidate excluding them.
            const specialEndCharRegex = /[\[\]"'\.]$/;
            const trimRangeMap = new Map();
            const specialEndLinkCandidates = [];
            for (const candidate of linkCandidates) {
                let previous = candidate;
                let removed = previous.replace(specialEndCharRegex, '');
                let trimRange = 0;
                while (removed !== previous) {
                    // Only trim the link if there is no suffix, otherwise the underline would be incorrect
                    if (!parsedLink.suffix) {
                        trimRange++;
                    }
                    specialEndLinkCandidates.push(removed);
                    trimRangeMap.set(removed, trimRange);
                    previous = removed;
                    removed = removed.replace(specialEndCharRegex, '');
                }
            }
            linkCandidates.push(...specialEndLinkCandidates);
            this._logService.trace('terminalLocalLinkDetector#detect linkCandidates', linkCandidates);
            // Validate the path and convert to the outgoing type
            const simpleLink = await this._validateAndGetLink(undefined, bufferRange, linkCandidates, trimRangeMap);
            if (simpleLink) {
                simpleLink.parsedLink = parsedLink;
                simpleLink.text = text.substring(parsedLink.prefix?.index ?? parsedLink.path.index, parsedLink.suffix ? parsedLink.suffix.suffix.index + parsedLink.suffix.suffix.text.length : parsedLink.path.index + parsedLink.path.text.length);
                this._logService.trace('terminalLocalLinkDetector#detect verified link', simpleLink);
                links.push(simpleLink);
            }
            // Stop early if too many links exist in the line
            if (++resolvedLinkCount >= 10 /* Constants.MaxResolvedLinksInLine */) {
                break;
            }
        }
        // Match against the fallback matchers which are mainly designed to catch paths with spaces
        // that aren't possible using the regular mechanism.
        if (links.length === 0) {
            for (const matcher of fallbackMatchers) {
                const match = text.match(matcher);
                const group = match?.groups;
                if (!group) {
                    continue;
                }
                const link = group?.link;
                const path = group?.path;
                const line = group?.line;
                const col = group?.col;
                if (!link || !path) {
                    continue;
                }
                // Don't try resolve any links of excessive length
                if (link.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                    continue;
                }
                // Convert the link text's string index into a wrapped buffer range
                stringIndex = text.indexOf(link);
                const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                    startColumn: stringIndex + 1,
                    startLineNumber: 1,
                    endColumn: stringIndex + link.length + 1,
                    endLineNumber: 1
                }, startLine);
                // Validate and add link
                const suffix = line ? `:${line}${col ? `:${col}` : ''}` : '';
                const simpleLink = await this._validateAndGetLink(`${path}${suffix}`, bufferRange, [path]);
                if (simpleLink) {
                    links.push(simpleLink);
                }
                // Only match a single fallback matcher
                break;
            }
        }
        // Sometimes links are styled specially in the terminal like underlined or bolded, try split
        // the line by attributes and test whether it matches a path
        if (links.length === 0) {
            const rangeCandidates = getXtermRangesByAttr(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
            for (const rangeCandidate of rangeCandidates) {
                let text = '';
                for (let y = rangeCandidate.start.y; y <= rangeCandidate.end.y; y++) {
                    const line = this.xterm.buffer.active.getLine(y);
                    if (!line) {
                        break;
                    }
                    const lineStartX = y === rangeCandidate.start.y ? rangeCandidate.start.x : 0;
                    const lineEndX = y === rangeCandidate.end.y ? rangeCandidate.end.x : this.xterm.cols - 1;
                    text += line.translateToString(false, lineStartX, lineEndX);
                }
                // HACK: Adjust to 1-based for link API
                rangeCandidate.start.x++;
                rangeCandidate.start.y++;
                rangeCandidate.end.y++;
                // Validate and add link
                const simpleLink = await this._validateAndGetLink(text, rangeCandidate, [text]);
                if (simpleLink) {
                    links.push(simpleLink);
                }
                // Stop early if too many links exist in the line
                if (++resolvedLinkCount >= 10 /* Constants.MaxResolvedLinksInLine */) {
                    break;
                }
            }
        }
        return links;
    }
    _isDirectoryInsideWorkspace(uri) {
        const folders = this._workspaceContextService.getWorkspace().folders;
        for (let i = 0; i < folders.length; i++) {
            if (this._uriIdentityService.extUri.isEqualOrParent(uri, folders[i].uri)) {
                return true;
            }
        }
        return false;
    }
    async _validateLinkCandidates(linkCandidates) {
        for (const link of linkCandidates) {
            let uri;
            if (link.startsWith('file://')) {
                uri = URI.parse(link);
            }
            const result = await this._linkResolver.resolveLink(this._processManager, link, uri);
            if (result) {
                return result;
            }
        }
        return undefined;
    }
    /**
     * Validates a set of link candidates and returns a link if validated.
     * @param linkText The link text, this should be undefined to use the link stat value
     * @param trimRangeMap A map of link candidates to the amount of buffer range they need trimmed.
     */
    async _validateAndGetLink(linkText, bufferRange, linkCandidates, trimRangeMap) {
        const linkStat = await this._validateLinkCandidates(linkCandidates);
        if (linkStat) {
            let type;
            if (linkStat.isDirectory) {
                if (this._isDirectoryInsideWorkspace(linkStat.uri)) {
                    type = "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */;
                }
                else {
                    type = "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */;
                }
            }
            else {
                type = "LocalFile" /* TerminalBuiltinLinkType.LocalFile */;
            }
            // Offset the buffer range if the link range was trimmed
            const trimRange = trimRangeMap?.get(linkStat.link);
            if (trimRange) {
                bufferRange.end.x -= trimRange;
                if (bufferRange.end.x < 0) {
                    bufferRange.end.y--;
                    bufferRange.end.x += this.xterm.cols;
                }
            }
            return {
                text: linkText ?? linkStat.link,
                uri: linkStat.uri,
                bufferRange: bufferRange,
                type
            };
        }
        return undefined;
    }
};
TerminalLocalLinkDetector = __decorate([
    __param(4, ITerminalLogService),
    __param(5, IUriIdentityService),
    __param(6, IWorkspaceContextService)
], TerminalLocalLinkDetector);
export { TerminalLocalLinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTG9jYWxMaW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFJeEosT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUU1RyxJQUFXLFNBaUJWO0FBakJELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILDhEQUFvQixDQUFBO0lBRXBCOzs7T0FHRztJQUNILDhFQUEyQixDQUFBO0lBRTNCOzs7T0FHRztJQUNILDhFQUE0QixDQUFBO0FBQzdCLENBQUMsRUFqQlUsU0FBUyxLQUFULFNBQVMsUUFpQm5CO0FBRUQsTUFBTSxnQkFBZ0IsR0FBYTtJQUNsQyxpREFBaUQ7SUFDakQsc0RBQXNEO0lBQ3RELGtEQUFrRDtJQUNsRCxrRUFBa0U7SUFDbEUsa0NBQWtDO0lBQ2xDLGtDQUFrQztJQUNsQyxxQ0FBcUM7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