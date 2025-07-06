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
import { URI } from '../../../../base/common/uri.js';
import { isEqual } from '../../../../base/common/extpath.js';
import { posix } from '../../../../base/common/path.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { rtrim, startsWithIgnoreCase, equalsIgnoreCase } from '../../../../base/common/strings.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { joinPath, isEqualOrParent, basenameOrAuthority } from '../../../../base/common/resources.js';
import { ExplorerFileNestingTrie } from './explorerFileNestingTrie.js';
import { assertIsDefined } from '../../../../base/common/types.js';
export class ExplorerModel {
    constructor(contextService, uriIdentityService, fileService, configService, filesConfigService) {
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeRoots = new Emitter();
        const setRoots = () => this._roots = this.contextService.getWorkspace().folders
            .map(folder => new ExplorerItem(folder.uri, fileService, configService, filesConfigService, undefined, true, false, false, false, folder.name));
        setRoots();
        this._listener = this.contextService.onDidChangeWorkspaceFolders(() => {
            setRoots();
            this._onDidChangeRoots.fire();
        });
    }
    get roots() {
        return this._roots;
    }
    get onDidChangeRoots() {
        return this._onDidChangeRoots.event;
    }
    /**
     * Returns an array of child stat from this stat that matches with the provided path.
     * Starts matching from the first root.
     * Will return empty array in case the FileStat does not exist.
     */
    findAll(resource) {
        return coalesce(this.roots.map(root => root.find(resource)));
    }
    /**
     * Returns a FileStat that matches the passed resource.
     * In case multiple FileStat are matching the resource (same folder opened multiple times) returns the FileStat that has the closest root.
     * Will return undefined in case the FileStat does not exist.
     */
    findClosest(resource) {
        const folder = this.contextService.getWorkspaceFolder(resource);
        if (folder) {
            const root = this.roots.find(r => this.uriIdentityService.extUri.isEqual(r.resource, folder.uri));
            if (root) {
                return root.find(resource);
            }
        }
        return null;
    }
    dispose() {
        dispose(this._listener);
    }
}
export class ExplorerItem {
    constructor(resource, fileService, configService, filesConfigService, _parent, _isDirectory, _isSymbolicLink, _readonly, _locked, _name = basenameOrAuthority(resource), _mtime, _unknown = false) {
        this.resource = resource;
        this.fileService = fileService;
        this.configService = configService;
        this.filesConfigService = filesConfigService;
        this._parent = _parent;
        this._isDirectory = _isDirectory;
        this._isSymbolicLink = _isSymbolicLink;
        this._readonly = _readonly;
        this._locked = _locked;
        this._name = _name;
        this._mtime = _mtime;
        this._unknown = _unknown;
        this.error = undefined;
        this._isExcluded = false;
        // Find
        this.markedAsFindResult = false;
        this._isDirectoryResolved = false;
    }
    get isExcluded() {
        if (this._isExcluded) {
            return true;
        }
        if (!this._parent) {
            return false;
        }
        return this._parent.isExcluded;
    }
    set isExcluded(value) {
        this._isExcluded = value;
    }
    hasChildren(filter) {
        if (this.hasNests) {
            return this.nestedChildren?.some(c => filter(c)) ?? false;
        }
        else {
            return this.isDirectory;
        }
    }
    get hasNests() {
        return !!(this.nestedChildren?.length);
    }
    get isDirectoryResolved() {
        return this._isDirectoryResolved;
    }
    get isSymbolicLink() {
        return !!this._isSymbolicLink;
    }
    get isDirectory() {
        return !!this._isDirectory;
    }
    get isReadonly() {
        return this.filesConfigService.isReadonly(this.resource, { resource: this.resource, name: this.name, readonly: this._readonly, locked: this._locked });
    }
    get mtime() {
        return this._mtime;
    }
    get name() {
        return this._name;
    }
    get isUnknown() {
        return this._unknown;
    }
    get parent() {
        return this._parent;
    }
    get root() {
        if (!this._parent) {
            return this;
        }
        return this._parent.root;
    }
    get children() {
        return new Map();
    }
    updateName(value) {
        // Re-add to parent since the parent has a name map to children and the name might have changed
        this._parent?.removeChild(this);
        this._name = value;
        this._parent?.addChild(this);
    }
    getId() {
        let id = this.root.resource.toString() + '::' + this.resource.toString();
        if (this.isMarkedAsFiltered()) {
            id += '::findFilterResult';
        }
        return id;
    }
    toString() {
        return `ExplorerItem: ${this.name}`;
    }
    get isRoot() {
        return this === this.root;
    }
    static create(fileService, configService, filesConfigService, raw, parent, resolveTo) {
        const stat = new ExplorerItem(raw.resource, fileService, configService, filesConfigService, parent, raw.isDirectory, raw.isSymbolicLink, raw.readonly, raw.locked, raw.name, raw.mtime, !raw.isFile && !raw.isDirectory);
        // Recursively add children if present
        if (stat.isDirectory) {
            // isDirectoryResolved is a very important indicator in the stat model that tells if the folder was fully resolved
            // the folder is fully resolved if either it has a list of children or the client requested this by using the resolveTo
            // array of resource path to resolve.
            stat._isDirectoryResolved = !!raw.children || (!!resolveTo && resolveTo.some((r) => {
                return isEqualOrParent(r, stat.resource);
            }));
            // Recurse into children
            if (raw.children) {
                for (let i = 0, len = raw.children.length; i < len; i++) {
                    const child = ExplorerItem.create(fileService, configService, filesConfigService, raw.children[i], stat, resolveTo);
                    stat.addChild(child);
                }
            }
        }
        return stat;
    }
    /**
     * Merges the stat which was resolved from the disk with the local stat by copying over properties
     * and children. The merge will only consider resolved stat elements to avoid overwriting data which
     * exists locally.
     */
    static mergeLocalWithDisk(disk, local) {
        if (disk.resource.toString() !== local.resource.toString()) {
            return; // Merging only supported for stats with the same resource
        }
        // Stop merging when a folder is not resolved to avoid loosing local data
        const mergingDirectories = disk.isDirectory || local.isDirectory;
        if (mergingDirectories && local._isDirectoryResolved && !disk._isDirectoryResolved) {
            return;
        }
        // Properties
        local.resource = disk.resource;
        if (!local.isRoot) {
            local.updateName(disk.name);
        }
        local._isDirectory = disk.isDirectory;
        local._mtime = disk.mtime;
        local._isDirectoryResolved = disk._isDirectoryResolved;
        local._isSymbolicLink = disk.isSymbolicLink;
        local.error = disk.error;
        // Merge Children if resolved
        if (mergingDirectories && disk._isDirectoryResolved) {
            // Map resource => stat
            const oldLocalChildren = new ResourceMap();
            local.children.forEach(child => {
                oldLocalChildren.set(child.resource, child);
            });
            // Clear current children
            local.children.clear();
            // Merge received children
            disk.children.forEach(diskChild => {
                const formerLocalChild = oldLocalChildren.get(diskChild.resource);
                // Existing child: merge
                if (formerLocalChild) {
                    ExplorerItem.mergeLocalWithDisk(diskChild, formerLocalChild);
                    local.addChild(formerLocalChild);
                    oldLocalChildren.delete(diskChild.resource);
                }
                // New child: add
                else {
                    local.addChild(diskChild);
                }
            });
            oldLocalChildren.forEach(oldChild => {
                if (oldChild instanceof NewExplorerItem) {
                    local.addChild(oldChild);
                }
            });
        }
    }
    /**
     * Adds a child element to this folder.
     */
    addChild(child) {
        // Inherit some parent properties to child
        child._parent = this;
        child.updateResource(false);
        this.children.set(this.getPlatformAwareName(child.name), child);
    }
    getChild(name) {
        return this.children.get(this.getPlatformAwareName(name));
    }
    fetchChildren(sortOrder) {
        const nestingConfig = this.configService.getValue({ resource: this.root.resource }).explorer.fileNesting;
        // fast path when the children can be resolved sync
        if (nestingConfig.enabled && this.nestedChildren) {
            return this.nestedChildren;
        }
        return (async () => {
            if (!this._isDirectoryResolved) {
                // Resolve metadata only when the mtime is needed since this can be expensive
                // Mtime is only used when the sort order is 'modified'
                const resolveMetadata = sortOrder === "modified" /* SortOrder.Modified */;
                this.error = undefined;
                try {
                    const stat = await this.fileService.resolve(this.resource, { resolveSingleChildDescendants: true, resolveMetadata });
                    const resolved = ExplorerItem.create(this.fileService, this.configService, this.filesConfigService, stat, this);
                    ExplorerItem.mergeLocalWithDisk(resolved, this);
                }
                catch (e) {
                    this.error = e;
                    throw e;
                }
                this._isDirectoryResolved = true;
            }
            const items = [];
            if (nestingConfig.enabled) {
                const fileChildren = [];
                const dirChildren = [];
                for (const child of this.children.entries()) {
                    child[1].nestedParent = undefined;
                    if (child[1].isDirectory) {
                        dirChildren.push(child);
                    }
                    else {
                        fileChildren.push(child);
                    }
                }
                const nested = this.fileNester.nest(fileChildren.map(([name]) => name), this.getPlatformAwareName(this.name));
                for (const [fileEntryName, fileEntryItem] of fileChildren) {
                    const nestedItems = nested.get(fileEntryName);
                    if (nestedItems !== undefined) {
                        fileEntryItem.nestedChildren = [];
                        for (const name of nestedItems.keys()) {
                            const child = assertIsDefined(this.children.get(name));
                            fileEntryItem.nestedChildren.push(child);
                            child.nestedParent = fileEntryItem;
                        }
                        items.push(fileEntryItem);
                    }
                    else {
                        fileEntryItem.nestedChildren = undefined;
                    }
                }
                for (const [_, dirEntryItem] of dirChildren.values()) {
                    items.push(dirEntryItem);
                }
            }
            else {
                this.children.forEach(child => {
                    items.push(child);
                });
            }
            return items;
        })();
    }
    get fileNester() {
        if (!this.root._fileNester) {
            const nestingConfig = this.configService.getValue({ resource: this.root.resource }).explorer.fileNesting;
            const patterns = Object.entries(nestingConfig.patterns)
                .filter(entry => typeof (entry[0]) === 'string' && typeof (entry[1]) === 'string' && entry[0] && entry[1])
                .map(([parentPattern, childrenPatterns]) => [
                this.getPlatformAwareName(parentPattern.trim()),
                childrenPatterns.split(',').map(p => this.getPlatformAwareName(p.trim().replace(/\u200b/g, '').trim()))
                    .filter(p => p !== '')
            ]);
            this.root._fileNester = new ExplorerFileNestingTrie(patterns);
        }
        return this.root._fileNester;
    }
    /**
     * Removes a child element from this folder.
     */
    removeChild(child) {
        this.nestedChildren = undefined;
        this.children.delete(this.getPlatformAwareName(child.name));
    }
    forgetChildren() {
        this.children.clear();
        this.nestedChildren = undefined;
        this._isDirectoryResolved = false;
        this._fileNester = undefined;
    }
    getPlatformAwareName(name) {
        return this.fileService.hasCapability(this.resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */) ? name : name.toLowerCase();
    }
    /**
     * Moves this element under a new parent element.
     */
    move(newParent) {
        this.nestedParent?.removeChild(this);
        this._parent?.removeChild(this);
        newParent.removeChild(this); // make sure to remove any previous version of the file if any
        newParent.addChild(this);
        this.updateResource(true);
    }
    updateResource(recursive) {
        if (this._parent) {
            this.resource = joinPath(this._parent.resource, this.name);
        }
        if (recursive) {
            if (this.isDirectory) {
                this.children.forEach(child => {
                    child.updateResource(true);
                });
            }
        }
    }
    /**
     * Tells this stat that it was renamed. This requires changes to all children of this stat (if any)
     * so that the path property can be updated properly.
     */
    rename(renamedStat) {
        // Merge a subset of Properties that can change on rename
        this.updateName(renamedStat.name);
        this._mtime = renamedStat.mtime;
        // Update Paths including children
        this.updateResource(true);
    }
    /**
     * Returns a child stat from this stat that matches with the provided path.
     * Will return "null" in case the child does not exist.
     */
    find(resource) {
        // Return if path found
        // For performance reasons try to do the comparison as fast as possible
        const ignoreCase = !this.fileService.hasCapability(resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (resource && this.resource.scheme === resource.scheme && equalsIgnoreCase(this.resource.authority, resource.authority) &&
            (ignoreCase ? startsWithIgnoreCase(resource.path, this.resource.path) : resource.path.startsWith(this.resource.path))) {
            return this.findByPath(rtrim(resource.path, posix.sep), this.resource.path.length, ignoreCase);
        }
        return null; //Unable to find
    }
    findByPath(path, index, ignoreCase) {
        if (isEqual(rtrim(this.resource.path, posix.sep), path, ignoreCase)) {
            return this;
        }
        if (this.isDirectory) {
            // Ignore separtor to more easily deduct the next name to search
            while (index < path.length && path[index] === posix.sep) {
                index++;
            }
            let indexOfNextSep = path.indexOf(posix.sep, index);
            if (indexOfNextSep === -1) {
                // If there is no separator take the remainder of the path
                indexOfNextSep = path.length;
            }
            // The name to search is between two separators
            const name = path.substring(index, indexOfNextSep);
            const child = this.children.get(this.getPlatformAwareName(name));
            if (child) {
                // We found a child with the given name, search inside it
                return child.findByPath(path, indexOfNextSep, ignoreCase);
            }
        }
        return null;
    }
    isMarkedAsFiltered() {
        return this.markedAsFindResult;
    }
    markItemAndParentsAsFiltered() {
        this.markedAsFindResult = true;
        this.parent?.markItemAndParentsAsFiltered();
    }
    unmarkItemAndChildren() {
        this.markedAsFindResult = false;
        this.children.forEach(child => child.unmarkItemAndChildren());
    }
}
__decorate([
    memoize
], ExplorerItem.prototype, "children", null);
export class NewExplorerItem extends ExplorerItem {
    constructor(fileService, configService, filesConfigService, parent, isDirectory) {
        super(URI.file(''), fileService, configService, filesConfigService, parent, isDirectory);
        this._isDirectoryResolved = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2NvbW1vbi9leHBsb3Jlck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSW5FLE1BQU0sT0FBTyxhQUFhO0lBTXpCLFlBQ2tCLGNBQXdDLEVBQ3hDLGtCQUF1QyxFQUN4RCxXQUF5QixFQUN6QixhQUFvQyxFQUNwQyxrQkFBOEM7UUFKN0IsbUJBQWMsR0FBZCxjQUFj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