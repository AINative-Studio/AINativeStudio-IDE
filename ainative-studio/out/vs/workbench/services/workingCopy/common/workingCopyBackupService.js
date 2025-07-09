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
var WorkingCopyBackupServiceImpl_1;
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { equals, deepClone } from '../../../../base/common/objects.js';
import { Promises, ResourceQueue } from '../../../../base/common/async.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { isReadableStream, peekStream } from '../../../../base/common/stream.js';
import { bufferToStream, prefixedBufferReadable, prefixedBufferStream, readableToBuffer, streamToBuffer, VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Schemas } from '../../../../base/common/network.js';
import { hash } from '../../../../base/common/hash.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { NO_TYPE_ID } from './workingCopy.js';
export class WorkingCopyBackupsModel {
    static async create(backupRoot, fileService) {
        const model = new WorkingCopyBackupsModel(backupRoot, fileService);
        await model.resolve();
        return model;
    }
    constructor(backupRoot, fileService) {
        this.backupRoot = backupRoot;
        this.fileService = fileService;
        this.cache = new ResourceMap();
    }
    async resolve() {
        try {
            const backupRootStat = await this.fileService.resolve(this.backupRoot);
            if (backupRootStat.children) {
                await Promises.settled(backupRootStat.children
                    .filter(child => child.isDirectory)
                    .map(async (backupSchemaFolder) => {
                    // Read backup directory for backups
                    const backupSchemaFolderStat = await this.fileService.resolve(backupSchemaFolder.resource);
                    // Remember known backups in our caches
                    //
                    // Note: this does NOT account for resolving
                    // associated meta data because that requires
                    // opening the backup and reading the meta
                    // preamble. Instead, when backups are actually
                    // resolved, the meta data will be added via
                    // additional `update` calls.
                    if (backupSchemaFolderStat.children) {
                        for (const backupForSchema of backupSchemaFolderStat.children) {
                            if (!backupForSchema.isDirectory) {
                                this.add(backupForSchema.resource);
                            }
                        }
                    }
                }));
            }
        }
        catch (error) {
            // ignore any errors
        }
    }
    add(resource, versionId = 0, meta) {
        this.cache.set(resource, {
            versionId,
            meta: deepClone(meta)
        });
    }
    update(resource, meta) {
        const entry = this.cache.get(resource);
        if (entry) {
            entry.meta = deepClone(meta);
        }
    }
    count() {
        return this.cache.size;
    }
    has(resource, versionId, meta) {
        const entry = this.cache.get(resource);
        if (!entry) {
            return false; // unknown resource
        }
        if (typeof versionId === 'number' && versionId !== entry.versionId) {
            return false; // different versionId
        }
        if (meta && !equals(meta, entry.meta)) {
            return false; // different metadata
        }
        return true;
    }
    get() {
        return Array.from(this.cache.keys());
    }
    remove(resource) {
        this.cache.delete(resource);
    }
    clear() {
        this.cache.clear();
    }
}
let WorkingCopyBackupService = class WorkingCopyBackupService extends Disposable {
    constructor(backupWorkspaceHome, fileService, logService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this.impl = this._register(this.initialize(backupWorkspaceHome));
    }
    initialize(backupWorkspaceHome) {
        if (backupWorkspaceHome) {
            return new WorkingCopyBackupServiceImpl(backupWorkspaceHome, this.fileService, this.logService);
        }
        return new InMemoryWorkingCopyBackupService();
    }
    reinitialize(backupWorkspaceHome) {
        // Re-init implementation (unless we are running in-memory)
        if (this.impl instanceof WorkingCopyBackupServiceImpl) {
            if (backupWorkspaceHome) {
                this.impl.initialize(backupWorkspaceHome);
            }
            else {
                this.impl = new InMemoryWorkingCopyBackupService();
            }
        }
    }
    hasBackups() {
        return this.impl.hasBackups();
    }
    hasBackupSync(identifier, versionId, meta) {
        return this.impl.hasBackupSync(identifier, versionId, meta);
    }
    backup(identifier, content, versionId, meta, token) {
        return this.impl.backup(identifier, content, versionId, meta, token);
    }
    discardBackup(identifier, token) {
        return this.impl.discardBackup(identifier, token);
    }
    discardBackups(filter) {
        return this.impl.discardBackups(filter);
    }
    getBackups() {
        return this.impl.getBackups();
    }
    resolve(identifier) {
        return this.impl.resolve(identifier);
    }
    toBackupResource(identifier) {
        return this.impl.toBackupResource(identifier);
    }
    joinBackups() {
        return this.impl.joinBackups();
    }
};
WorkingCopyBackupService = __decorate([
    __param(1, IFileService),
    __param(2, ILogService)
], WorkingCopyBackupService);
export { WorkingCopyBackupService };
let WorkingCopyBackupServiceImpl = class WorkingCopyBackupServiceImpl extends Disposable {
    static { WorkingCopyBackupServiceImpl_1 = this; }
    static { this.PREAMBLE_END_MARKER = '\n'; }
    static { this.PREAMBLE_END_MARKER_CHARCODE = '\n'.charCodeAt(0); }
    static { this.PREAMBLE_META_SEPARATOR = ' '; } // using a character that is know to be escaped in a URI as separator
    static { this.PREAMBLE_MAX_LENGTH = 10000; }
    constructor(backupWorkspaceHome, fileService, logService) {
        super();
        this.backupWorkspaceHome = backupWorkspaceHome;
        this.fileService = fileService;
        this.logService = logService;
        this.ioOperationQueues = this._register(new ResourceQueue()); // queue IO operations to ensure write/delete file order
        this.model = undefined;
        this.initialize(backupWorkspaceHome);
    }
    initialize(backupWorkspaceResource) {
        this.backupWorkspaceHome = backupWorkspaceResource;
        this.ready = this.doInitialize();
    }
    async doInitialize() {
        // Create backup model
        this.model = await WorkingCopyBackupsModel.create(this.backupWorkspaceHome, this.fileService);
        return this.model;
    }
    async hasBackups() {
        const model = await this.ready;
        // Ensure to await any pending backup operations
        await this.joinBackups();
        return model.count() > 0;
    }
    hasBackupSync(identifier, versionId, meta) {
        if (!this.model) {
            return false;
        }
        const backupResource = this.toBackupResource(identifier);
        return this.model.has(backupResource, versionId, meta);
    }
    async backup(identifier, content, versionId, meta, token) {
        const model = await this.ready;
        if (token?.isCancellationRequested) {
            return;
        }
        const backupResource = this.toBackupResource(identifier);
        if (model.has(backupResource, versionId, meta)) {
            // return early if backup version id matches requested one
            return;
        }
        return this.ioOperationQueues.queueFor(backupResource, async () => {
            if (token?.isCancellationRequested) {
                return;
            }
            if (model.has(backupResource, versionId, meta)) {
                // return early if backup version id matches requested one
                // this can happen when multiple backup IO operations got
                // scheduled, racing against each other.
                return;
            }
            // Encode as: Resource + META-START + Meta + END
            // and respect max length restrictions in case
            // meta is too large.
            let preamble = this.createPreamble(identifier, meta);
            if (preamble.length >= WorkingCopyBackupServiceImpl_1.PREAMBLE_MAX_LENGTH) {
                preamble = this.createPreamble(identifier);
            }
            // Update backup with value
            const preambleBuffer = VSBuffer.fromString(preamble);
            let backupBuffer;
            if (isReadableStream(content)) {
                backupBuffer = prefixedBufferStream(preambleBuffer, content);
            }
            else if (content) {
                backupBuffer = prefixedBufferReadable(preambleBuffer, content);
            }
            else {
                backupBuffer = VSBuffer.concat([preambleBuffer, VSBuffer.fromString('')]);
            }
            // Write backup via file service
            await this.fileService.writeFile(backupResource, backupBuffer);
            //
            // Update model
            //
            // Note: not checking for cancellation here because a successful
            // write into the backup file should be noted in the model to
            // prevent the model being out of sync with the backup file
            model.add(backupResource, versionId, meta);
        });
    }
    createPreamble(identifier, meta) {
        return `${identifier.resource.toString()}${WorkingCopyBackupServiceImpl_1.PREAMBLE_META_SEPARATOR}${JSON.stringify({ ...meta, typeId: identifier.typeId })}${WorkingCopyBackupServiceImpl_1.PREAMBLE_END_MARKER}`;
    }
    async discardBackups(filter) {
        const model = await this.ready;
        // Discard all but some backups
        const except = filter?.except;
        if (Array.isArray(except) && except.length > 0) {
            const exceptMap = new ResourceMap();
            for (const exceptWorkingCopy of except) {
                exceptMap.set(this.toBackupResource(exceptWorkingCopy), true);
            }
            await Promises.settled(model.get().map(async (backupResource) => {
                if (!exceptMap.has(backupResource)) {
                    await this.doDiscardBackup(backupResource);
                }
            }));
        }
        // Discard all backups
        else {
            await this.deleteIgnoreFileNotFound(this.backupWorkspaceHome);
            model.clear();
        }
    }
    discardBackup(identifier, token) {
        const backupResource = this.toBackupResource(identifier);
        return this.doDiscardBackup(backupResource, token);
    }
    async doDiscardBackup(backupResource, token) {
        const model = await this.ready;
        if (token?.isCancellationRequested) {
            return;
        }
        return this.ioOperationQueues.queueFor(backupResource, async () => {
            if (token?.isCancellationRequested) {
                return;
            }
            // Delete backup file ignoring any file not found errors
            await this.deleteIgnoreFileNotFound(backupResource);
            //
            // Update model
            //
            // Note: not checking for cancellation here because a successful
            // delete of the backup file should be noted in the model to
            // prevent the model being out of sync with the backup file
            model.remove(backupResource);
        });
    }
    async deleteIgnoreFileNotFound(backupResource) {
        try {
            await this.fileService.del(backupResource, { recursive: true });
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error; // re-throw any other error than file not found which is OK
            }
        }
    }
    async getBackups() {
        const model = await this.ready;
        // Ensure to await any pending backup operations
        await this.joinBackups();
        const backups = await Promise.all(model.get().map(backupResource => this.resolveIdentifier(backupResource, model)));
        return coalesce(backups);
    }
    async resolveIdentifier(backupResource, model) {
        let res = undefined;
        await this.ioOperationQueues.queueFor(backupResource, async () => {
            if (!model.has(backupResource)) {
                return; // require backup to be present
            }
            // Read the entire backup preamble by reading up to
            // `PREAMBLE_MAX_LENGTH` in the backup file until
            // the `PREAMBLE_END_MARKER` is found
            const backupPreamble = await this.readToMatchingString(backupResource, WorkingCopyBackupServiceImpl_1.PREAMBLE_END_MARKER, WorkingCopyBackupServiceImpl_1.PREAMBLE_MAX_LENGTH);
            if (!backupPreamble) {
                return;
            }
            // Figure out the offset in the preamble where meta
            // information possibly starts. This can be `-1` for
            // older backups without meta.
            const metaStartIndex = backupPreamble.indexOf(WorkingCopyBackupServiceImpl_1.PREAMBLE_META_SEPARATOR);
            // Extract the preamble content for resource and meta
            let resourcePreamble;
            let metaPreamble;
            if (metaStartIndex > 0) {
                resourcePreamble = backupPreamble.substring(0, metaStartIndex);
                metaPreamble = backupPreamble.substr(metaStartIndex + 1);
            }
            else {
                resourcePreamble = backupPreamble;
                metaPreamble = undefined;
            }
            // Try to parse the meta preamble for figuring out
            // `typeId` and `meta` if defined.
            const { typeId, meta } = this.parsePreambleMeta(metaPreamble);
            // Update model entry with now resolved meta
            model.update(backupResource, meta);
            res = {
                typeId: typeId ?? NO_TYPE_ID,
                resource: URI.parse(resourcePreamble)
            };
        });
        return res;
    }
    async readToMatchingString(backupResource, matchingString, maximumBytesToRead) {
        const contents = (await this.fileService.readFile(backupResource, { length: maximumBytesToRead })).value.toString();
        const matchingStringIndex = contents.indexOf(matchingString);
        if (matchingStringIndex >= 0) {
            return contents.substr(0, matchingStringIndex);
        }
        // Unable to find matching string in file
        return undefined;
    }
    async resolve(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const model = await this.ready;
        let res = undefined;
        await this.ioOperationQueues.queueFor(backupResource, async () => {
            if (!model.has(backupResource)) {
                return; // require backup to be present
            }
            // Load the backup content and peek into the first chunk
            // to be able to resolve the meta data
            const backupStream = await this.fileService.readFileStream(backupResource);
            const peekedBackupStream = await peekStream(backupStream.value, 1);
            const firstBackupChunk = VSBuffer.concat(peekedBackupStream.buffer);
            // We have seen reports (e.g. https://github.com/microsoft/vscode/issues/78500) where
            // if VSCode goes down while writing the backup file, the file can turn empty because
            // it always first gets truncated and then written to. In this case, we will not find
            // the meta-end marker ('\n') and as such the backup can only be invalid. We bail out
            // here if that is the case.
            const preambleEndIndex = firstBackupChunk.buffer.indexOf(WorkingCopyBackupServiceImpl_1.PREAMBLE_END_MARKER_CHARCODE);
            if (preambleEndIndex === -1) {
                this.logService.trace(`Backup: Could not find meta end marker in ${backupResource}. The file is probably corrupt (filesize: ${backupStream.size}).`);
                return undefined;
            }
            const preambelRaw = firstBackupChunk.slice(0, preambleEndIndex).toString();
            // Extract meta data (if any)
            let meta;
            const metaStartIndex = preambelRaw.indexOf(WorkingCopyBackupServiceImpl_1.PREAMBLE_META_SEPARATOR);
            if (metaStartIndex !== -1) {
                meta = this.parsePreambleMeta(preambelRaw.substr(metaStartIndex + 1)).meta;
            }
            // Update model entry with now resolved meta
            model.update(backupResource, meta);
            // Build a new stream without the preamble
            const firstBackupChunkWithoutPreamble = firstBackupChunk.slice(preambleEndIndex + 1);
            let value;
            if (peekedBackupStream.ended) {
                value = bufferToStream(firstBackupChunkWithoutPreamble);
            }
            else {
                value = prefixedBufferStream(firstBackupChunkWithoutPreamble, peekedBackupStream.stream);
            }
            res = { value, meta };
        });
        return res;
    }
    parsePreambleMeta(preambleMetaRaw) {
        let typeId = undefined;
        let meta = undefined;
        if (preambleMetaRaw) {
            try {
                meta = JSON.parse(preambleMetaRaw);
                typeId = meta?.typeId;
                // `typeId` is a property that we add so we
                // remove it when returning to clients.
                if (typeof meta?.typeId === 'string') {
                    delete meta.typeId;
                    if (isEmptyObject(meta)) {
                        meta = undefined;
                    }
                }
            }
            catch (error) {
                // ignore JSON parse errors
            }
        }
        return { typeId, meta };
    }
    toBackupResource(identifier) {
        return joinPath(this.backupWorkspaceHome, identifier.resource.scheme, hashIdentifier(identifier));
    }
    joinBackups() {
        return this.ioOperationQueues.whenDrained();
    }
};
WorkingCopyBackupServiceImpl = WorkingCopyBackupServiceImpl_1 = __decorate([
    __param(1, IFileService),
    __param(2, ILogService)
], WorkingCopyBackupServiceImpl);
export class InMemoryWorkingCopyBackupService extends Disposable {
    constructor() {
        super();
        this.backups = new ResourceMap();
    }
    async hasBackups() {
        return this.backups.size > 0;
    }
    hasBackupSync(identifier, versionId) {
        const backupResource = this.toBackupResource(identifier);
        return this.backups.has(backupResource);
    }
    async backup(identifier, content, versionId, meta, token) {
        const backupResource = this.toBackupResource(identifier);
        this.backups.set(backupResource, {
            typeId: identifier.typeId,
            content: content instanceof VSBuffer ? content : content ? isReadableStream(content) ? await streamToBuffer(content) : readableToBuffer(content) : VSBuffer.fromString(''),
            meta
        });
    }
    async resolve(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const backup = this.backups.get(backupResource);
        if (backup) {
            return { value: bufferToStream(backup.content), meta: backup.meta };
        }
        return undefined;
    }
    async getBackups() {
        return Array.from(this.backups.entries()).map(([resource, backup]) => ({ typeId: backup.typeId, resource }));
    }
    async discardBackup(identifier) {
        this.backups.delete(this.toBackupResource(identifier));
    }
    async discardBackups(filter) {
        const except = filter?.except;
        if (Array.isArray(except) && except.length > 0) {
            const exceptMap = new ResourceMap();
            for (const exceptWorkingCopy of except) {
                exceptMap.set(this.toBackupResource(exceptWorkingCopy), true);
            }
            for (const backup of await this.getBackups()) {
                if (!exceptMap.has(this.toBackupResource(backup))) {
                    await this.discardBackup(backup);
                }
            }
        }
        else {
            this.backups.clear();
        }
    }
    toBackupResource(identifier) {
        return URI.from({ scheme: Schemas.inMemory, path: hashIdentifier(identifier) });
    }
    async joinBackups() {
        return;
    }
}
/*
 * Exported only for testing
 */
export function hashIdentifier(identifier) {
    // IMPORTANT: for backwards compatibility, ensure that
    // we ignore the `typeId` unless a value is provided.
    // To preserve previous backups without type id, we
    // need to just hash the resource. Otherwise we use
    // the type id as a seed to the resource path.
    let resource;
    if (identifier.typeId.length > 0) {
        const typeIdHash = hashString(identifier.typeId);
        if (identifier.resource.path) {
            resource = joinPath(identifier.resource, typeIdHash);
        }
        else {
            resource = identifier.resource.with({ path: typeIdHash });
        }
    }
    else {
        resource = identifier.resource;
    }
    return hashPath(resource);
}
function hashPath(resource) {
    const str = resource.scheme === Schemas.file || resource.scheme === Schemas.untitled ? resource.fsPath : resource.toString();
    return hashString(str);
}
function hashString(str) {
    return hash(str).toString(16);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vd29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFlBQVksRUFBMkMsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBNEMsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2TSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNB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