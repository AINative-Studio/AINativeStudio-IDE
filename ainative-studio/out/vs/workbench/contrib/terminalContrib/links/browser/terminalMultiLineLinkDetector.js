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
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The max line length to try extract word links from.
     */
    Constants[Constants["MaxLineLength"] = 2000] = "MaxLineLength";
    /**
     * The maximum length of a link to resolve against the file system. This limit is put in place
     * to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinkLength"] = 1024] = "MaxResolvedLinkLength";
})(Constants || (Constants = {}));
const lineNumberPrefixMatchers = [
    // Ripgrep:
    //   /some/file
    //   16:searchresult
    //   16:    searchresult
    // Eslint:
    //   /some/file
    //     16:5  error ...
    /^ *(?<link>(?<line>\d+):(?<col>\d+)?)/
];
const gitDiffMatchers = [
    // --- a/some/file
    // +++ b/some/file
    // @@ -8,11 +8,11 @@ file content...
    /^(?<link>@@ .+ \+(?<toFileLine>\d+),(?<toFileCount>\d+) @@)/
];
let TerminalMultiLineLinkDetector = class TerminalMultiLineLinkDetector {
    static { this.id = 'multiline'; }
    constructor(xterm, _processManager, _linkResolver, _logService, _uriIdentityService, _workspaceContextService) {
        this.xterm = xterm;
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
        this._logService.trace('terminalMultiLineLinkDetector#detect text', text);
        // Match against the fallback matchers which are mainly designed to catch paths with spaces
        // that aren't possible using the regular mechanism.
        for (const matcher of lineNumberPrefixMatchers) {
            const match = text.match(matcher);
            const group = match?.groups;
            if (!group) {
                continue;
            }
            const link = group?.link;
            const line = group?.line;
            const col = group?.col;
            if (!link || line === undefined) {
                continue;
            }
            // Don't try resolve any links of excessive length
            if (link.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                continue;
            }
            this._logService.trace('terminalMultiLineLinkDetector#detect candidate', link);
            // Scan up looking for the first line that could be a path
            let possiblePath;
            for (let index = startLine - 1; index >= 0; index--) {
                // Ignore lines that aren't at the beginning of a wrapped line
                if (this.xterm.buffer.active.getLine(index).isWrapped) {
                    continue;
                }
                const text = getXtermLineContent(this.xterm.buffer.active, index, index, this.xterm.cols);
                if (!text.match(/^\s*\d/)) {
                    possiblePath = text;
                    break;
                }
            }
            if (!possiblePath) {
                continue;
            }
            // Check if the first non-matching line is an absolute or relative link
            const linkStat = await this._linkResolver.resolveLink(this._processManager, possiblePath);
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
                // Convert the entire line's text string index into a wrapped buffer range
                const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                    startColumn: 1,
                    startLineNumber: 1,
                    endColumn: 1 + text.length,
                    endLineNumber: 1
                }, startLine);
                const simpleLink = {
                    text: link,
                    uri: linkStat.uri,
                    selection: {
                        startLineNumber: parseInt(line),
                        startColumn: col ? parseInt(col) : 1
                    },
                    disableTrimColon: true,
                    bufferRange: bufferRange,
                    type
                };
                this._logService.trace('terminalMultiLineLinkDetector#detect verified link', simpleLink);
                links.push(simpleLink);
                // Break on the first match
                break;
            }
        }
        if (links.length === 0) {
            for (const matcher of gitDiffMatchers) {
                const match = text.match(matcher);
                const group = match?.groups;
                if (!group) {
                    continue;
                }
                const link = group?.link;
                const toFileLine = group?.toFileLine;
                const toFileCount = group?.toFileCount;
                if (!link || toFileLine === undefined) {
                    continue;
                }
                // Don't try resolve any links of excessive length
                if (link.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                    continue;
                }
                this._logService.trace('terminalMultiLineLinkDetector#detect candidate', link);
                // Scan up looking for the first line that could be a path
                let possiblePath;
                for (let index = startLine - 1; index >= 0; index--) {
                    // Ignore lines that aren't at the beginning of a wrapped line
                    if (this.xterm.buffer.active.getLine(index).isWrapped) {
                        continue;
                    }
                    const text = getXtermLineContent(this.xterm.buffer.active, index, index, this.xterm.cols);
                    const match = text.match(/\+\+\+ b\/(?<path>.+)/);
                    if (match) {
                        possiblePath = match.groups?.path;
                        break;
                    }
                }
                if (!possiblePath) {
                    continue;
                }
                // Check if the first non-matching line is an absolute or relative link
                const linkStat = await this._linkResolver.resolveLink(this._processManager, possiblePath);
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
                    // Convert the link to the buffer range
                    const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                        startColumn: 1,
                        startLineNumber: 1,
                        endColumn: 1 + link.length,
                        endLineNumber: 1
                    }, startLine);
                    const simpleLink = {
                        text: link,
                        uri: linkStat.uri,
                        selection: {
                            startLineNumber: parseInt(toFileLine),
                            startColumn: 1,
                            endLineNumber: parseInt(toFileLine) + parseInt(toFileCount)
                        },
                        bufferRange: bufferRange,
                        type
                    };
                    this._logService.trace('terminalMultiLineLinkDetector#detect verified link', simpleLink);
                    links.push(simpleLink);
                    // Break on the first match
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
};
TerminalMultiLineLinkDetector = __decorate([
    __param(3, ITerminalLogService),
    __param(4, IUriIdentityService),
    __param(5, IWorkspaceContextService)
], TerminalMultiLineLinkDetector);
export { TerminalMultiLineLinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNdWx0aUxpbmVMaW5rRGV0ZWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxNdWx0aUxpbmVMaW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHekYsT0FBTyxFQUFvQixtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTVHLElBQVcsU0FXVjtBQVhELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILDhEQUFvQixDQUFBO0lBRXBCOzs7T0FHRztJQUNILDhFQUE0QixDQUFBO0FBQzdCLENBQUMsRUFYVSxTQUFTLEtBQVQsU0FBUyxRQVduQjtBQUVELE1BQU0sd0JBQXdCLEdBQUc7SUFDaEMsV0FBVztJQUNYLGVBQWU7SUFDZixvQkFBb0I7SUFDcEIsd0JBQXdCO0lBQ3hCLFVBQVU7SUFDVixlQUFlO0lBQ2Ysc0JBQXNCO0lBQ3RCLHVDQUF1QztDQUN2QyxDQUFDO0FBRUYsTUFBTSxlQUFlLEdBQUc7SUFDdkIsa0JBQWtCO0lBQ2xCLGtCQUFrQjtJQUNsQixvQ0FBb0M7SUFDcEMsNkRBQTZEO0NBQzdELENBQUM7QUFFSyxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjthQUNsQyxPQUFFLEdBQUcsV0FBVyxBQUFkLENBQWU7SUFReEIsWUFDVSxLQUFlLEVBQ1AsZUFBeUos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