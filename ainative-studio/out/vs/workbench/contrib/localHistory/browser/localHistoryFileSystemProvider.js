/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { FileType, hasReadWriteCapability } from '../../../../platform/files/common/files.js';
import { isEqual } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
/**
 * A wrapper around a standard file system provider
 * that is entirely readonly.
 */
export class LocalHistoryFileSystemProvider {
    static { this.SCHEMA = 'vscode-local-history'; }
    static toLocalHistoryFileSystem(resource) {
        const serializedLocalHistoryResource = {
            location: resource.location.toString(true),
            associatedResource: resource.associatedResource.toString(true)
        };
        // Try to preserve the associated resource as much as possible
        // and only keep the `query` part dynamic. This enables other
        // components (e.g. other timeline providers) to continue
        // providing timeline entries even when our resource is active.
        return resource.associatedResource.with({
            scheme: LocalHistoryFileSystemProvider.SCHEMA,
            query: JSON.stringify(serializedLocalHistoryResource)
        });
    }
    static fromLocalHistoryFileSystem(resource) {
        const serializedLocalHistoryResource = JSON.parse(resource.query);
        return {
            location: URI.parse(serializedLocalHistoryResource.location),
            associatedResource: URI.parse(serializedLocalHistoryResource.associatedResource)
        };
    }
    static { this.EMPTY_RESOURCE = URI.from({ scheme: LocalHistoryFileSystemProvider.SCHEMA, path: '/empty' }); }
    static { this.EMPTY = {
        location: LocalHistoryFileSystemProvider.EMPTY_RESOURCE,
        associatedResource: LocalHistoryFileSystemProvider.EMPTY_RESOURCE
    }; }
    get capabilities() {
        return 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 2048 /* FileSystemProviderCapabilities.Readonly */;
    }
    constructor(fileService) {
        this.fileService = fileService;
        this.mapSchemeToProvider = new Map();
        //#endregion
        //#region Unsupported File Operations
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    async withProvider(resource) {
        const scheme = resource.scheme;
        let providerPromise = this.mapSchemeToProvider.get(scheme);
        if (!providerPromise) {
            // Resolve early when provider already exists
            const provider = this.fileService.getProvider(scheme);
            if (provider) {
                providerPromise = Promise.resolve(provider);
            }
            // Otherwise wait for registration
            else {
                providerPromise = new Promise(resolve => {
                    const disposable = this.fileService.onDidChangeFileSystemProviderRegistrations(e => {
                        if (e.added && e.provider && e.scheme === scheme) {
                            disposable.dispose();
                            resolve(e.provider);
                        }
                    });
                });
            }
            this.mapSchemeToProvider.set(scheme, providerPromise);
        }
        return providerPromise;
    }
    //#region Supported File Operations
    async stat(resource) {
        const location = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(resource).location;
        // Special case: empty resource
        if (isEqual(LocalHistoryFileSystemProvider.EMPTY_RESOURCE, location)) {
            return { type: FileType.File, ctime: 0, mtime: 0, size: 0 };
        }
        // Otherwise delegate to provider
        return (await this.withProvider(location)).stat(location);
    }
    async readFile(resource) {
        const location = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(resource).location;
        // Special case: empty resource
        if (isEqual(LocalHistoryFileSystemProvider.EMPTY_RESOURCE, location)) {
            return VSBuffer.fromString('').buffer;
        }
        // Otherwise delegate to provider
        const provider = await this.withProvider(location);
        if (hasReadWriteCapability(provider)) {
            return provider.readFile(location);
        }
        throw new Error('Unsupported');
    }
    async writeFile(resource, content, opts) { }
    async mkdir(resource) { }
    async readdir(resource) { return []; }
    async rename(from, to, opts) { }
    async delete(resource, opts) { }
    watch(resource, opts) { return Disposable.None; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5RmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsSGlzdG9yeS9icm93c2VyL2xvY2FsSGlzdG9yeUZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQTZFLFFBQVEsRUFBcUIsc0JBQXNCLEVBQTJHLE1BQU0sNENBQTRDLENBQUM7QUFDclMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQW9CN0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjthQUUxQixXQUFNLEdBQUcsc0JBQXNCLEFBQXpCLENBQTBCO0lBRWhELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxRQUErQjtRQUM5RCxNQUFNLDhCQUE4QixHQUFvQztZQUN2RSxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQzFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQzlELENBQUM7UUFFRiw4REFBOEQ7UUFDOUQsNkRBQTZEO1FBQzdELHlEQUF5RDtRQUN6RCwrREFBK0Q7UUFDL0QsT0FBTyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLE1BQU0sRUFB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