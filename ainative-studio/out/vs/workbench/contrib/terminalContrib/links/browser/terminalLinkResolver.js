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
import { removeLinkSuffix, removeLinkQueryString, winDrivePrefix } from './terminalLinkParsing.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isWindows, OS } from '../../../../../base/common/platform.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { posix, win32 } from '../../../../../base/common/path.js';
import { mainWindow } from '../../../../../base/browser/window.js';
let TerminalLinkResolver = class TerminalLinkResolver {
    constructor(_fileService) {
        this._fileService = _fileService;
        // Link cache could be shared across all terminals, but that could lead to weird results when
        // both local and remote terminals are present
        this._resolvedLinkCaches = new Map();
    }
    async resolveLink(processManager, link, uri) {
        // Correct scheme and authority for remote terminals
        if (uri && uri.scheme === Schemas.file && processManager.remoteAuthority) {
            uri = uri.with({
                scheme: Schemas.vscodeRemote,
                authority: processManager.remoteAuthority
            });
        }
        // Get the link cache
        let cache = this._resolvedLinkCaches.get(processManager.remoteAuthority ?? '');
        if (!cache) {
            cache = new LinkCache();
            this._resolvedLinkCaches.set(processManager.remoteAuthority ?? '', cache);
        }
        // Check resolved link cache first
        const cached = cache.get(uri || link);
        if (cached !== undefined) {
            return cached;
        }
        if (uri) {
            try {
                const stat = await this._fileService.stat(uri);
                const result = { uri, link, isDirectory: stat.isDirectory };
                cache.set(uri, result);
                return result;
            }
            catch (e) {
                // Does not exist
                cache.set(uri, null);
                return null;
            }
        }
        // Remove any line/col suffix
        let linkUrl = removeLinkSuffix(link);
        // Remove any query string
        linkUrl = removeLinkQueryString(linkUrl);
        // Exit early if the link is determines as not valid already
        if (linkUrl.length === 0) {
            cache.set(link, null);
            return null;
        }
        // If the link looks like a /mnt/ WSL path and this is a Windows frontend, use the backend
        // to get the resolved path from the wslpath util.
        if (isWindows && link.match(/^\/mnt\/[a-z]/i) && processManager.backend) {
            linkUrl = await processManager.backend.getWslPath(linkUrl, 'unix-to-win');
        }
        // Skip preprocessing if it looks like a special Windows -> WSL link
        else if (isWindows && link.match(/^(?:\/\/|\\\\)wsl(?:\$|\.localhost)(\/|\\)/)) {
            // No-op, it's already the right format
        }
        // Handle all non-WSL links
        else {
            const preprocessedLink = this._preprocessPath(linkUrl, processManager.initialCwd, processManager.os, processManager.userHome);
            if (!preprocessedLink) {
                cache.set(link, null);
                return null;
            }
            linkUrl = preprocessedLink;
        }
        try {
            let uri;
            if (processManager.remoteAuthority) {
                uri = URI.from({
                    scheme: Schemas.vscodeRemote,
                    authority: processManager.remoteAuthority,
                    path: linkUrl
                });
            }
            else {
                uri = URI.file(linkUrl);
            }
            try {
                const stat = await this._fileService.stat(uri);
                const result = { uri, link, isDirectory: stat.isDirectory };
                cache.set(link, result);
                return result;
            }
            catch (e) {
                // Does not exist
                cache.set(link, null);
                return null;
            }
        }
        catch {
            // Errors in parsing the path
            cache.set(link, null);
            return null;
        }
    }
    _preprocessPath(link, initialCwd, os, userHome) {
        const osPath = this._getOsPath(os);
        if (link.charAt(0) === '~') {
            // Resolve ~ -> userHome
            if (!userHome) {
                return null;
            }
            link = osPath.join(userHome, link.substring(1));
        }
        else if (link.charAt(0) !== '/' && link.charAt(0) !== '~') {
            // Resolve workspace path . | .. | <relative_path> -> <path>/. | <path>/.. | <path>/<relative_path>
            if (os === 1 /* OperatingSystem.Windows */) {
                if (!link.match('^' + winDrivePrefix) && !link.startsWith('\\\\?\\')) {
                    if (!initialCwd) {
                        // Abort if no workspace is open
                        return null;
                    }
                    link = osPath.join(initialCwd, link);
                }
                else {
                    // Remove \\?\ from paths so that they share the same underlying
                    // uri and don't open multiple tabs for the same file
                    link = link.replace(/^\\\\\?\\/, '');
                }
            }
            else {
                if (!initialCwd) {
                    // Abort if no workspace is open
                    return null;
                }
                link = osPath.join(initialCwd, link);
            }
        }
        link = osPath.normalize(link);
        return link;
    }
    _getOsPath(os) {
        return (os ?? OS) === 1 /* OperatingSystem.Windows */ ? win32 : posix;
    }
};
TerminalLinkResolver = __decorate([
    __param(0, IFileService)
], TerminalLinkResolver);
export { TerminalLinkResolver };
var LinkCacheConstants;
(function (LinkCacheConstants) {
    /**
     * How long to cache links for in milliseconds, the TTL resets whenever a new value is set in
     * the cache.
     */
    LinkCacheConstants[LinkCacheConstants["TTL"] = 10000] = "TTL";
})(LinkCacheConstants || (LinkCacheConstants = {}));
class LinkCache {
    constructor() {
        this._cache = new Map();
        this._cacheTilTimeout = 0;
    }
    set(link, value) {
        // Reset cached link TTL on any set
        if (this._cacheTilTimeout) {
            mainWindow.clearTimeout(this._cacheTilTimeout);
        }
        this._cacheTilTimeout = mainWindow.setTimeout(() => this._cache.clear(), 10000 /* LinkCacheConstants.TTL */);
        this._cache.set(this._getKey(link), value);
    }
    get(link) {
        return this._cache.get(this._getKey(link));
    }
    _getKey(link) {
        if (URI.isUri(link)) {
            return link.toString();
        }
        return link;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25HLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBbUIsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBUyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTVELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBS2hDLFlBQ2UsWUFBMkM7UUFBMUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFMMUQsNkZBQTZGO1FBQzdGLDhDQUE4QztRQUM3Qix3QkFBbUIsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUt6RSxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxjQUF3SixFQUFFLElBQVksRUFBRSxHQUFTO1FBQ2xNLG9EQUFvRDtRQUNwRCxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDLGVB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