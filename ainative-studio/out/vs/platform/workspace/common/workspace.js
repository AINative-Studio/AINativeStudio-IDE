/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { basename, extname } from '../../../base/common/path.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { extname as resourceExtname, basenameOrAuthority, joinPath, extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
export const IWorkspaceContextService = createDecorator('contextService');
export function isSingleFolderWorkspaceIdentifier(obj) {
    const singleFolderIdentifier = obj;
    return typeof singleFolderIdentifier?.id === 'string' && URI.isUri(singleFolderIdentifier.uri);
}
export function isEmptyWorkspaceIdentifier(obj) {
    const emptyWorkspaceIdentifier = obj;
    return typeof emptyWorkspaceIdentifier?.id === 'string'
        && !isSingleFolderWorkspaceIdentifier(obj)
        && !isWorkspaceIdentifier(obj);
}
export const EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE = { id: 'ext-dev' };
export const UNKNOWN_EMPTY_WINDOW_WORKSPACE = { id: 'empty-window' };
export function toWorkspaceIdentifier(arg0, isExtensionDevelopment) {
    // Empty workspace
    if (typeof arg0 === 'string' || typeof arg0 === 'undefined') {
        // With a backupPath, the basename is the empty workspace identifier
        if (typeof arg0 === 'string') {
            return {
                id: basename(arg0)
            };
        }
        // Extension development empty windows have backups disabled
        // so we return a constant workspace identifier for extension
        // authors to allow to restore their workspace state even then.
        if (isExtensionDevelopment) {
            return EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE;
        }
        return UNKNOWN_EMPTY_WINDOW_WORKSPACE;
    }
    // Multi root
    const workspace = arg0;
    if (workspace.configuration) {
        return {
            id: workspace.id,
            configPath: workspace.configuration
        };
    }
    // Single folder
    if (workspace.folders.length === 1) {
        return {
            id: workspace.id,
            uri: workspace.folders[0].uri
        };
    }
    // Empty window
    return {
        id: workspace.id
    };
}
export function isWorkspaceIdentifier(obj) {
    const workspaceIdentifier = obj;
    return typeof workspaceIdentifier?.id === 'string' && URI.isUri(workspaceIdentifier.configPath);
}
export function reviveIdentifier(identifier) {
    // Single Folder
    const singleFolderIdentifierCandidate = identifier;
    if (singleFolderIdentifierCandidate?.uri) {
        return { id: singleFolderIdentifierCandidate.id, uri: URI.revive(singleFolderIdentifierCandidate.uri) };
    }
    // Multi folder
    const workspaceIdentifierCandidate = identifier;
    if (workspaceIdentifierCandidate?.configPath) {
        return { id: workspaceIdentifierCandidate.id, configPath: URI.revive(workspaceIdentifierCandidate.configPath) };
    }
    // Empty
    if (identifier?.id) {
        return { id: identifier.id };
    }
    return undefined;
}
export var WorkbenchState;
(function (WorkbenchState) {
    WorkbenchState[WorkbenchState["EMPTY"] = 1] = "EMPTY";
    WorkbenchState[WorkbenchState["FOLDER"] = 2] = "FOLDER";
    WorkbenchState[WorkbenchState["WORKSPACE"] = 3] = "WORKSPACE";
})(WorkbenchState || (WorkbenchState = {}));
export function isWorkspace(thing) {
    const candidate = thing;
    return !!(candidate && typeof candidate === 'object'
        && typeof candidate.id === 'string'
        && Array.isArray(candidate.folders));
}
export function isWorkspaceFolder(thing) {
    const candidate = thing;
    return !!(candidate && typeof candidate === 'object'
        && URI.isUri(candidate.uri)
        && typeof candidate.name === 'string'
        && typeof candidate.toResource === 'function');
}
export class Workspace {
    get folders() { return this._folders; }
    set folders(folders) {
        this._folders = folders;
        this.updateFoldersMap();
    }
    constructor(_id, folders, _transient, _configuration, ignorePathCasing) {
        this._id = _id;
        this._transient = _transient;
        this._configuration = _configuration;
        this.ignorePathCasing = ignorePathCasing;
        this.foldersMap = TernarySearchTree.forUris(this.ignorePathCasing, () => true);
        this.folders = folders;
    }
    update(workspace) {
        this._id = workspace.id;
        this._configuration = workspace.configuration;
        this._transient = workspace.transient;
        this.ignorePathCasing = workspace.ignorePathCasing;
        this.folders = workspace.folders;
    }
    get id() {
        return this._id;
    }
    get transient() {
        return this._transient;
    }
    get configuration() {
        return this._configuration;
    }
    set configuration(configuration) {
        this._configuration = configuration;
    }
    getFolder(resource) {
        if (!resource) {
            return null;
        }
        return this.foldersMap.findSubstr(resource) || null;
    }
    updateFoldersMap() {
        this.foldersMap = TernarySearchTree.forUris(this.ignorePathCasing, () => true);
        for (const folder of this.folders) {
            this.foldersMap.set(folder.uri, folder);
        }
    }
    toJSON() {
        return { id: this.id, folders: this.folders, transient: this.transient, configuration: this.configuration };
    }
}
export class WorkspaceFolder {
    constructor(data, 
    /**
     * Provides access to the original metadata for this workspace
     * folder. This can be different from the metadata provided in
     * this class:
     * - raw paths can be relative
     * - raw paths are not normalized
     */
    raw) {
        this.raw = raw;
        this.uri = data.uri;
        this.index = data.index;
        this.name = data.name;
    }
    toResource(relativePath) {
        return joinPath(this.uri, relativePath);
    }
    toJSON() {
        return { uri: this.uri, name: this.name, index: this.index };
    }
}
export function toWorkspaceFolder(resource) {
    return new WorkspaceFolder({ uri: resource, index: 0, name: basenameOrAuthority(resource) }, { uri: resource.toString() });
}
export const WORKSPACE_EXTENSION = 'code-workspace';
export const WORKSPACE_SUFFIX = `.${WORKSPACE_EXTENSION}`;
export const WORKSPACE_FILTER = [{ name: localize('codeWorkspace', "Code Workspace"), extensions: [WORKSPACE_EXTENSION] }];
export const UNTITLED_WORKSPACE_NAME = 'workspace.json';
export function isUntitledWorkspace(path, environmentService) {
    return extUriBiasedIgnorePathCase.isEqualOrParent(path, environmentService.untitledWorkspacesHome);
}
export function isTemporaryWorkspace(arg1) {
    let path;
    if (URI.isUri(arg1)) {
        path = arg1;
    }
    else {
        path = arg1.configuration;
    }
    return path?.scheme === Schemas.tmp;
}
export const STANDALONE_EDITOR_WORKSPACE_ID = '4064f6ec-cb38-4ad0-af64-ee6467e63c82';
export function isStandaloneEditorWorkspace(workspace) {
    return workspace.id === STANDALONE_EDITOR_WORKSPACE_ID;
}
export function isSavedWorkspace(path, environmentService) {
    return !isUntitledWorkspace(path, environmentService) && !isTemporaryWorkspace(path);
}
export function hasWorkspaceFileExtension(path) {
    const ext = (typeof path === 'string') ? extname(path) : resourceExtname(path);
    return ext === WORKSPACE_SUFFIX;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZS9jb21tb24vd29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLElBQUksZUFBZSxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFJLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUxRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLGdCQUFnQixDQUFDLENBQUM7QUF5SHBHLE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxHQUFZO0lBQzdELE1BQU0sc0JBQXNCLEdBQUcsR0FBbUQsQ0FBQztJQUVuRixPQUFPLE9BQU8sc0JBQXNCLEVBQUUsRUFBRSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsR0FBWTtJQUN0RCxNQUFNLHdCQUF3QixHQUFHLEdBQTRDLENBQUM7SUFDOUUsT0FBTyxPQUFPLHdCQUF3QixFQUFFLEVBQUUs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