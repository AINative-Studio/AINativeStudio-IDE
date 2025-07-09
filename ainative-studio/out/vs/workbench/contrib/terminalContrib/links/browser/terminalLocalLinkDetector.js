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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExvY2FsTGlua0RldGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBSXhKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLEVBQW9CLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFNUcsSUFBVyxTQWlCVjtBQWpCRCxXQUFXLFNBQVM7SUFDbkI7O09BRUc7SUFDSCw4REFBb0IsQ0FBQTtJQUVwQjs7O09BR0c7SUFDSCw4RUFBMkIsQ0FBQTtJQUUzQjs7O09BR0c7SUFDSCw4RUFBNEIsQ0FBQTtBQUM3QixDQUFDLEVBakJVLFNBQVMsS0FBVCxTQUFTLFFBaUJuQjtBQUVELE1BQU0sZ0JBQWdCLEdBQWE7SUFDbEMsaURBQWlEO0lBQ2pELHNEQUFzRDtJQUN0RCxrREFBa0Q7SUFDbEQsa0VBQWtFO0lBQ2xFLGtDQUFrQztJQUNsQyxrQ0FBa0M7SUFDbEMscUNBQXFD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