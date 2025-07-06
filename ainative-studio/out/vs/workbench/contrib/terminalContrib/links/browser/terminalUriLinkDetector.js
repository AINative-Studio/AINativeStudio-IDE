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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmlMaW5rRGV0ZWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbFVyaUxpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBdUIsWUFBWSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDM0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHekYsT0FBTyxFQUFvQixtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTVHLElBQVcsU0FNVjtBQU5ELFdBQVcsU0FBUztJQUNuQjs7O09BR0c7SUFDSCw4RUFBMkIsQ0FBQTtBQUM1QixDQUFDLEVBTlUsU0FBUyxLQUFULFNBQVMsUUFNbkI7QUFFTSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjthQUM1QixPQUFFLEdBQUcsS0FBSyxBQUFSLENBQVM7SUFLbEIsWUFDVSxLQUFlLEVBQ1AsZUFBeUosRUFDekosYUFBb0MsRUFDaEMsV0FBaUQsRUFDakQsbUJBQXlELEVBQ3BELHdCQUFtRTtRQUxwRixVQUFLLEdBQUwsS0FBSyxDQUFVO1FBQ1Asb0JBQWUsR0FBZixlQUFlLENBQTBJO1FBQ3pKLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtRQUNmLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUNoQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ25DLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFUOUYsaUNBQWlDO1FBQ3hCLGtCQUFhLEdBQUcsSUFBSSxDQUFDO0lBVTlCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQW9CLEVBQUUsU0FBaUIsRUFBRSxPQUFlO1FBQ3BFLE1BQU0sS0FBSyxHQUEwQixFQUFFLENBQUM7UUFFeEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25GLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVwRSxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN0RixLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQzFDLE1BQU0sV0FBVyxHQUFHLHdCQUF3QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRXBHLGlEQUFpRDtZQUNqRCxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRztnQkFDM0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLENBQUMsR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7Z0JBQ3hILENBQUMsQ0FBQyxTQUFTLENBQUM7WUFFYixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1YsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUVoRCxrREFBa0Q7WUFDbEQsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdEMsU0FBUztZQUNWLENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDakMsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDVixJQUFJO29CQUNKLEdBQUc7b0JBQ0gsV0FBVztvQkFDWCxJQUFJLHlDQUE2QjtpQkFDakMsQ0FBQyxDQUFDO2dCQUNILFNBQVM7WUFDVixDQUFDO1lBRUQsK0NBQStDO1lBQy9DLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELFNBQVM7WUFDVixDQUFDO1lBRUQscUZBQXFGO1lBQ3JGLHVGQUF1RjtZQUN2Rix3Q0FBd0M7WUFDeEMsTUFBTSxhQUFhLEdBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5QixhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLENBQUM7WUFFRCxrRkFBa0Y7WUFDbEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsOENBQThDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDdEYsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFFaEcsK0JBQStCO2dCQUMvQixJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLElBQUksSUFBNkIsQ0FBQztvQkFDbEMsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQzFCLElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7NEJBQ3BELElBQUksZ0ZBQWlELENBQUM7d0JBQ3ZELENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxJQUFJLDBGQUFzRCxDQUFDO3dCQUM1RCxDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLHNEQUFvQyxDQUFDO29CQUMxQyxDQUFDO29CQUNELE1BQU0sVUFBVSxHQUF3Qjt3QkFDdkMsc0VBQXNFO3dCQUN0RSxJQUFJLEVBQUUsT0FBTyxZQUFZLENBQUMsR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUk7d0JBQzdFLEdBQUcsRUFBRSxZQUFZO3dCQUNqQixXQUFXO3dCQUNYLElBQUk7cUJBQ0osQ0FBQztvQkFDRixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsRUFBRSxVQUFVLENBQUMsQ0FBQztvQkFDbkYsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztvQkFDcEIsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUVELGlEQUFpRDtZQUNqRCxJQUFJLEVBQUUsaUJBQWlCLDZDQUFvQyxFQUFFLENBQUM7Z0JBQzdELE1BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLDJCQUEyQixDQUFDLEdBQVE7UUFDM0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQztRQUNyRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sd0JBQXdCLENBQUMsSUFBWTtRQUM1QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7O0FBdkhXLHVCQUF1QjtJQVVqQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx3QkFBd0IsQ0FBQTtHQVpkLHVCQUF1QixDQXdIbkM7O0FBRUQsTUFBTSxtQkFBbUI7SUFDeEIsWUFDUyxNQUFnQixFQUNoQixVQUFrQixFQUNsQixRQUFnQjtRQUZoQixXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ2hCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUNyQixDQUFDO0lBRUwsWUFBWTtRQUNYLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6RyxDQUFDO0NBQ0QifQ==