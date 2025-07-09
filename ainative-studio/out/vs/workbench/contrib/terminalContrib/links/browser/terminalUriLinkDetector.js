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
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { LinkComputer } from '../../../../../editor/common/languages/linkComputer.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The maximum number of links in a line to resolve against the file system. This limit is put
     * in place to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinksInLine"] = 10] = "MaxResolvedLinksInLine";
})(Constants || (Constants = {}));
let TerminalUriLinkDetector = class TerminalUriLinkDetector {
    static { this.id = 'uri'; }
    constructor(xterm, _processManager, _linkResolver, _logService, _uriIdentityService, _workspaceContextService) {
        this.xterm = xterm;
        this._processManager = _processManager;
        this._linkResolver = _linkResolver;
        this._logService = _logService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        // 2048 is the maximum URL length
        this.maxLinkLength = 2048;
    }
    async detect(lines, startLine, endLine) {
        const links = [];
        const linkComputerTarget = new TerminalLinkAdapter(this.xterm, startLine, endLine);
        const computedLinks = LinkComputer.computeLinks(linkComputerTarget);
        let resolvedLinkCount = 0;
        this._logService.trace('terminalUriLinkDetector#detect computedLinks', computedLinks);
        for (const computedLink of computedLinks) {
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, computedLink.range, startLine);
            // Check if the link is within the mouse position
            const uri = computedLink.url
                ? (typeof computedLink.url === 'string' ? URI.parse(this._excludeLineAndColSuffix(computedLink.url)) : computedLink.url)
                : undefined;
            if (!uri) {
                continue;
            }
            const text = computedLink.url?.toString() || '';
            // Don't try resolve any links of excessive length
            if (text.length > this.maxLinkLength) {
                continue;
            }
            // Handle non-file scheme links
            if (uri.scheme !== Schemas.file) {
                links.push({
                    text,
                    uri,
                    bufferRange,
                    type: "Url" /* TerminalBuiltinLinkType.Url */
                });
                continue;
            }
            // Filter out URI with unrecognized authorities
            if (uri.authority.length !== 2 && uri.authority.endsWith(':')) {
                continue;
            }
            // As a fallback URI, treat the authority as local to the workspace. This is required
            // for `ls --hyperlink` support for example which includes the hostname in the URI like
            // `file://Some-Hostname/mnt/c/foo/bar`.
            const uriCandidates = [uri];
            if (uri.authority.length > 0) {
                uriCandidates.push(URI.from({ ...uri, authority: undefined }));
            }
            // Iterate over all candidates, pushing the candidate on the first that's verified
            this._logService.trace('terminalUriLinkDetector#detect uriCandidates', uriCandidates);
            for (const uriCandidate of uriCandidates) {
                const linkStat = await this._linkResolver.resolveLink(this._processManager, text, uriCandidate);
                // Create the link if validated
                if (linkStat) {
                    let type;
                    if (linkStat.isDirectory) {
                        if (this._isDirectoryInsideWorkspace(uriCandidate)) {
                            type = "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */;
                        }
                        else {
                            type = "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */;
                        }
                    }
                    else {
                        type = "LocalFile" /* TerminalBuiltinLinkType.LocalFile */;
                    }
                    const simpleLink = {
                        // Use computedLink.url if it's a string to retain the line/col suffix
                        text: typeof computedLink.url === 'string' ? computedLink.url : linkStat.link,
                        uri: uriCandidate,
                        bufferRange,
                        type
                    };
                    this._logService.trace('terminalUriLinkDetector#detect verified link', simpleLink);
                    links.push(simpleLink);
                    resolvedLinkCount++;
                    break;
                }
            }
            // Stop early if too many links exist in the line
            if (++resolvedLinkCount >= 10 /* Constants.MaxResolvedLinksInLine */) {
                break;
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
    _excludeLineAndColSuffix(path) {
        return path.replace(/:\d+(:\d+)?$/, '');
    }
};
TerminalUriLinkDetector = __decorate([
    __param(3, ITerminalLogService),
    __param(4, IUriIdentityService),
    __param(5, IWorkspaceContextService)
], TerminalUriLinkDetector);
export { TerminalUriLinkDetector };
class TerminalLinkAdapter {
    constructor(_xterm, _lineStart, _lineEnd) {
        this._xterm = _xterm;
        this._lineStart = _lineStart;
        this._lineEnd = _lineEnd;
    }
    getLineCount() {
        return 1;
    }
    getLineContent() {
        return getXtermLineContent(this._xterm.buffer.active, this._lineStart, this._lineEnd, this._xterm.cols);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmlMaW5rRGV0ZWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxVcmlMaW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQXVCLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBR3pGLE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUU1RyxJQUFXLFNBTVY7QUFORCxXQUFXLFNBQVM7SUFDbkI7OztPQUdHO0lBQ0gsOEVBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQU5VLFNBQVMsS0FBVCxTQUFTLFFBTW5CO0FBRU0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7YUFDNUIsT0FBRSxHQUFHLEtBQUssQUFBUixDQUFTO0lBS2xCLFlBQ1UsS0FBZSxFQUNQLGVBQXlKLEVBQ3pKLGFBQW9DLEVBQ2hDLFdBQWlELEVBQ2pELG1CQUF5RCxFQUNwRCx3QkFBbUU7UUFMcEYsVUFBSyxHQUFMLEtBQUssQ0FBVTtRQUNQLG9CQUFlLEdBQWYsZUFBZSxDQUEwSTtRQUN6SixrQkFBYSxHQUFi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