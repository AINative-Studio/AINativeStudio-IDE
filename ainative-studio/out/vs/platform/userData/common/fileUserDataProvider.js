/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { hasFileFolderCopyCapability, hasFileCloneCapability } from '../../files/common/files.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { ResourceSet } from '../../../base/common/map.js';
/**
 * This is a wrapper on top of the local filesystem provider which will
 * 	- Convert the user data resources to file system scheme and vice-versa
 *  - Enforces atomic reads for user data
 */
export class FileUserDataProvider extends Disposable {
    constructor(fileSystemScheme, fileSystemProvider, userDataScheme, userDataProfilesService, uriIdentityService, logService) {
        super();
        this.fileSystemScheme = fileSystemScheme;
        this.fileSystemProvider = fileSystemProvider;
        this.userDataScheme = userDataScheme;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.capabilities = this.fileSystemProvider.capabilities;
        this.onDidChangeCapabilities = this.fileSystemProvider.onDidChangeCapabilities;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.watchResources = TernarySearchTree.forUris(() => !(this.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */));
        this.atomicReadWriteResources = new ResourceSet((uri) => this.uriIdentityService.extUri.getComparisonKey(this.toFileSystemResource(uri)));
        this.updateAtomicReadWritesResources();
        this._register(userDataProfilesService.onDidChangeProfiles(() => this.updateAtomicReadWritesResources()));
        this._register(this.fileSystemProvider.onDidChangeFile(e => this.handleFileChanges(e)));
    }
    updateAtomicReadWritesResources() {
        this.atomicReadWriteResources.clear();
        for (const profile of this.userDataProfilesService.profiles) {
            this.atomicReadWriteResources.add(profile.settingsResource);
            this.atomicReadWriteResources.add(profile.keybindingsResource);
            this.atomicReadWriteResources.add(profile.tasksResource);
            this.atomicReadWriteResources.add(profile.extensionsResource);
        }
    }
    open(resource, opts) {
        return this.fileSystemProvider.open(this.toFileSystemResource(resource), opts);
    }
    close(fd) {
        return this.fileSystemProvider.close(fd);
    }
    read(fd, pos, data, offset, length) {
        return this.fileSystemProvider.read(fd, pos, data, offset, length);
    }
    write(fd, pos, data, offset, length) {
        return this.fileSystemProvider.write(fd, pos, data, offset, length);
    }
    watch(resource, opts) {
        this.watchResources.set(resource, resource);
        const disposable = this.fileSystemProvider.watch(this.toFileSystemResource(resource), opts);
        return toDisposable(() => {
            this.watchResources.delete(resource);
            disposable.dispose();
        });
    }
    stat(resource) {
        return this.fileSystemProvider.stat(this.toFileSystemResource(resource));
    }
    mkdir(resource) {
        return this.fileSystemProvider.mkdir(this.toFileSystemResource(resource));
    }
    rename(from, to, opts) {
        return this.fileSystemProvider.rename(this.toFileSystemResource(from), this.toFileSystemResource(to), opts);
    }
    readFile(resource, opts) {
        return this.fileSystemProvider.readFile(this.toFileSystemResource(resource), opts);
    }
    readFileStream(resource, opts, token) {
        return this.fileSystemProvider.readFileStream(this.toFileSystemResource(resource), opts, token);
    }
    readdir(resource) {
        return this.fileSystemProvider.readdir(this.toFileSystemResource(resource));
    }
    enforceAtomicReadFile(resource) {
        return this.atomicReadWriteResources.has(resource);
    }
    writeFile(resource, content, opts) {
        return this.fileSystemProvider.writeFile(this.toFileSystemResource(resource), content, opts);
    }
    enforceAtomicWriteFile(resource) {
        if (this.atomicReadWriteResources.has(resource)) {
            return { postfix: '.vsctmp' };
        }
        return false;
    }
    delete(resource, opts) {
        return this.fileSystemProvider.delete(this.toFileSystemResource(resource), opts);
    }
    copy(from, to, opts) {
        if (hasFileFolderCopyCapability(this.fileSystemProvider)) {
            return this.fileSystemProvider.copy(this.toFileSystemResource(from), this.toFileSystemResource(to), opts);
        }
        throw new Error('copy not supported');
    }
    cloneFile(from, to) {
        if (hasFileCloneCapability(this.fileSystemProvider)) {
            return this.fileSystemProvider.cloneFile(this.toFileSystemResource(from), this.toFileSystemResource(to));
        }
        throw new Error('clone not supported');
    }
    handleFileChanges(changes) {
        const userDataChanges = [];
        for (const change of changes) {
            if (change.resource.scheme !== this.fileSystemScheme) {
                continue; // only interested in file schemes
            }
            const userDataResource = this.toUserDataResource(change.resource);
            if (this.watchResources.findSubstr(userDataResource)) {
                userDataChanges.push({
                    resource: userDataResource,
                    type: change.type,
                    cId: change.cId
                });
            }
        }
        if (userDataChanges.length) {
            this.logService.debug('User data changed');
            this._onDidChangeFile.fire(userDataChanges);
        }
    }
    toFileSystemResource(userDataResource) {
        return userDataResource.with({ scheme: this.fileSystemScheme });
    }
    toUserDataResource(fileSystemResource) {
        return fileSystemResource.with({ scheme: this.userDataScheme });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVVzZXJEYXRhUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGEvY29tbW9uL2ZpbGVVc2VyRGF0YVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFGLE9BQU8sRUFBdVQsMkJBQTJCLEVBQTJRLHNCQUFzQixFQUE4QyxNQUFNLDZCQUE2QixDQUFDO0FBSzVzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHMUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUFVO0lBbUJuRCxZQUNrQixnQkFBd0IsRUFDeEIsa0JBQW1VLEVBQ25VLGNBQXNCLEVBQ3RCLHVCQUFpRCxFQUNqRCxrQkFBdUMsRUFDdkMsVUFBdUI7UUFFeEMsS0FBSyxFQUFFLENBQUM7UUFQUyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7UUFDeEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFpVDtRQUNuVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUN0Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ2pELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUd4QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7UUFDekQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxr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