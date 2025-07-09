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
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { osPathModule, updateLinkWithRelativeCwd } from './terminalLinkHelpers.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { detectLinks, getLinkSuffix } from './terminalLinkParsing.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
let TerminalLocalFileLinkOpener = class TerminalLocalFileLinkOpener {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open file link without a resolved URI');
        }
        const linkSuffix = link.parsedLink ? link.parsedLink.suffix : getLinkSuffix(link.text);
        let selection = link.selection;
        if (!selection) {
            selection = linkSuffix?.row === undefined ? undefined : {
                startLineNumber: linkSuffix.row ?? 1,
                startColumn: linkSuffix.col ?? 1,
                endLineNumber: linkSuffix.rowEnd,
                endColumn: linkSuffix.colEnd
            };
        }
        await this._editorService.openEditor({
            resource: link.uri,
            options: { pinned: true, selection, revealIfOpened: true }
        });
    }
};
TerminalLocalFileLinkOpener = __decorate([
    __param(0, IEditorService)
], TerminalLocalFileLinkOpener);
export { TerminalLocalFileLinkOpener };
let TerminalLocalFolderInWorkspaceLinkOpener = class TerminalLocalFolderInWorkspaceLinkOpener {
    constructor(_commandService) {
        this._commandService = _commandService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open folder in workspace link without a resolved URI');
        }
        await this._commandService.executeCommand('revealInExplorer', link.uri);
    }
};
TerminalLocalFolderInWorkspaceLinkOpener = __decorate([
    __param(0, ICommandService)
], TerminalLocalFolderInWorkspaceLinkOpener);
export { TerminalLocalFolderInWorkspaceLinkOpener };
let TerminalLocalFolderOutsideWorkspaceLinkOpener = class TerminalLocalFolderOutsideWorkspaceLinkOpener {
    constructor(_hostService) {
        this._hostService = _hostService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open folder in workspace link without a resolved URI');
        }
        this._hostService.openWindow([{ folderUri: link.uri }], { forceNewWindow: true });
    }
};
TerminalLocalFolderOutsideWorkspaceLinkOpener = __decorate([
    __param(0, IHostService)
], TerminalLocalFolderOutsideWorkspaceLinkOpener);
export { TerminalLocalFolderOutsideWorkspaceLinkOpener };
let TerminalSearchLinkOpener = class TerminalSearchLinkOpener {
    constructor(_capabilities, _initialCwd, _localFileOpener, _localFolderInWorkspaceOpener, _getOS, _fileService, instantiationService, _quickInputService, _searchService, _logService, _workbenchEnvironmentService, _workspaceContextService) {
        this._capabilities = _capabilities;
        this._initialCwd = _initialCwd;
        this._localFileOpener = _localFileOpener;
        this._localFolderInWorkspaceOpener = _localFolderInWorkspaceOpener;
        this._getOS = _getOS;
        this._fileService = _fileService;
        this._quickInputService = _quickInputService;
        this._searchService = _searchService;
        this._logService = _logService;
        this._workbenchEnvironmentService = _workbenchEnvironmentService;
        this._workspaceContextService = _workspaceContextService;
        this._fileQueryBuilder = instantiationService.createInstance(QueryBuilder);
    }
    async open(link) {
        const osPath = osPathModule(this._getOS());
        const pathSeparator = osPath.sep;
        // Remove file:/// and any leading ./ or ../ since quick access doesn't understand that format
        let text = link.text.replace(/^file:\/\/\/?/, '');
        text = osPath.normalize(text).replace(/^(\.+[\\/])+/, '');
        // Try extract any trailing line and column numbers by matching the text against parsed
        // links. This will give a search link `foo` on a line like `"foo", line 10` to open the
        // quick pick with `foo:10` as the contents.
        //
        // This also normalizes the path to remove suffixes like :10 or :5.0-4
        if (link.contextLine) {
            const parsedLinks = detectLinks(link.contextLine, this._getOS());
            // Optimistically check that the link _starts with_ the parsed link text. If so,
            // continue to use the parsed link
            const matchingParsedLink = parsedLinks.find(parsedLink => parsedLink.suffix && link.text.startsWith(parsedLink.path.text));
            if (matchingParsedLink) {
                if (matchingParsedLink.suffix?.row !== undefined) {
                    // Normalize the path based on the parsed link
                    text = matchingParsedLink.path.text;
                    text += `:${matchingParsedLink.suffix.row}`;
                    if (matchingParsedLink.suffix?.col !== undefined) {
                        text += `:${matchingParsedLink.suffix.col}`;
                    }
                }
            }
        }
        // Remove `:<one or more non number characters>` from the end of the link.
        // Examples:
        // - Ruby stack traces: <link>:in ...
        // - Grep output: <link>:<result line>
        // This only happens when the colon is _not_ followed by a forward- or back-slash as that
        // would break absolute Windows paths (eg. `C:/Users/...`).
        text = text.replace(/:[^\\/\d][^\d]*$/, '');
        // Remove any trailing periods after the line/column numbers, to prevent breaking the search feature, #200257
        // Examples:
        // "Check your code Test.tsx:12:45." -> Test.tsx:12:45
        // "Check your code Test.tsx:12." -> Test.tsx:12
        text = text.replace(/\.$/, '');
        // If any of the names of the folders in the workspace matches
        // a prefix of the link, remove that prefix and continue
        this._workspaceContextService.getWorkspace().folders.forEach((folder) => {
            if (text.substring(0, folder.name.length + 1) === folder.name + pathSeparator) {
                text = text.substring(folder.name.length + 1);
                return;
            }
        });
        let cwdResolvedText = text;
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            cwdResolvedText = updateLinkWithRelativeCwd(this._capabilities, link.bufferRange.start.y, text, osPath, this._logService)?.[0] || text;
        }
        // Try open the cwd resolved link first
        if (await this._tryOpenExactLink(cwdResolvedText, link)) {
            return;
        }
        // If the cwd resolved text didn't match, try find the link without the cwd resolved, for
        // example when a command prints paths in a sub-directory of the current cwd
        if (text !== cwdResolvedText) {
            if (await this._tryOpenExactLink(text, link)) {
                return;
            }
        }
        // Fallback to searching quick access
        return this._quickInputService.quickAccess.show(text);
    }
    async _getExactMatch(sanitizedLink) {
        // Make the link relative to the cwd if it isn't absolute
        const os = this._getOS();
        const pathModule = osPathModule(os);
        const isAbsolute = pathModule.isAbsolute(sanitizedLink);
        let absolutePath = isAbsolute ? sanitizedLink : undefined;
        if (!isAbsolute && this._initialCwd.length > 0) {
            absolutePath = pathModule.join(this._initialCwd, sanitizedLink);
        }
        // Try open as an absolute link
        let resourceMatch;
        if (absolutePath) {
            let normalizedAbsolutePath = absolutePath;
            if (os === 1 /* OperatingSystem.Windows */) {
                normalizedAbsolutePath = absolutePath.replace(/\\/g, '/');
                if (normalizedAbsolutePath.match(/[a-z]:/i)) {
                    normalizedAbsolutePath = `/${normalizedAbsolutePath}`;
                }
            }
            let uri;
            if (this._workbenchEnvironmentService.remoteAuthority) {
                uri = URI.from({
                    scheme: Schemas.vscodeRemote,
                    authority: this._workbenchEnvironmentService.remoteAuthority,
                    path: normalizedAbsolutePath
                });
            }
            else {
                uri = URI.file(normalizedAbsolutePath);
            }
            try {
                const fileStat = await this._fileService.stat(uri);
                resourceMatch = { uri, isDirectory: fileStat.isDirectory };
            }
            catch {
                // File or dir doesn't exist, continue on
            }
        }
        // Search the workspace if an exact match based on the absolute path was not found
        if (!resourceMatch) {
            const results = await this._searchService.fileSearch(this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
                filePattern: sanitizedLink,
                maxResults: 2
            }));
            if (results.results.length > 0) {
                if (results.results.length === 1) {
                    // If there's exactly 1 search result, return it regardless of whether it's
                    // exact or partial.
                    resourceMatch = { uri: results.results[0].resource };
                }
                else if (!isAbsolute) {
                    // For non-absolute links, exact link matching is allowed only if there is a single an exact
                    // file match. For example searching for `foo.txt` when there is no cwd information
                    // available (ie. only the initial cwd) should open the file directly only if there is a
                    // single file names `foo.txt` anywhere within the folder. These same rules apply to
                    // relative paths with folders such as `src/foo.txt`.
                    const results = await this._searchService.fileSearch(this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
                        filePattern: `**/${sanitizedLink}`
                    }));
                    // Find an exact match if it exists
                    const exactMatches = results.results.filter(e => e.resource.toString().endsWith(sanitizedLink));
                    if (exactMatches.length === 1) {
                        resourceMatch = { uri: exactMatches[0].resource };
                    }
                }
            }
        }
        return resourceMatch;
    }
    async _tryOpenExactLink(text, link) {
        const sanitizedLink = text.replace(/:\d+(:\d+)?$/, '');
        try {
            const result = await this._getExactMatch(sanitizedLink);
            if (result) {
                const { uri, isDirectory } = result;
                const linkToOpen = {
                    // Use the absolute URI's path here so the optional line/col get detected
                    text: result.uri.path + (text.match(/:\d+(:\d+)?$/)?.[0] || ''),
                    uri,
                    bufferRange: link.bufferRange,
                    type: link.type
                };
                if (uri) {
                    await (isDirectory ? this._localFolderInWorkspaceOpener.open(linkToOpen) : this._localFileOpener.open(linkToOpen));
                    return true;
                }
            }
        }
        catch {
            return false;
        }
        return false;
    }
};
TerminalSearchLinkOpener = __decorate([
    __param(5, IFileService),
    __param(6, IInstantiationService),
    __param(7, IQuickInputService),
    __param(8, ISearchService),
    __param(9, ITerminalLogService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IWorkspaceContextService)
], TerminalSearchLinkOpener);
export { TerminalSearchLinkOpener };
let TerminalUrlLinkOpener = class TerminalUrlLinkOpener {
    constructor(_isRemote, _openerService, _configurationService) {
        this._isRemote = _isRemote;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open a url without a resolved URI');
        }
        // It's important to use the raw string value here to avoid converting pre-encoded values
        // from the URL like `%2B` -> `+`.
        this._openerService.open(link.text, {
            allowTunneling: this._isRemote && this._configurationService.getValue('remote.forwardOnOpen'),
            allowContributedOpeners: true,
            openExternal: true
        });
    }
};
TerminalUrlLinkOpener = __decorate([
    __param(1, IOpenerService),
    __param(2, IConfigurationService)
], TerminalUrlLinkOpener);
export { TerminalUrlLinkOpener };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rT3BlbmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtPcGVuZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRW5GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUscUJB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