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
var WorkingCopyHistoryService_1, NativeWorkingCopyHistoryService_1;
import { localize } from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { WorkingCopyHistoryTracker } from './workingCopyHistoryTracker.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MAX_PARALLEL_HISTORY_IO_OPS } from './workingCopyHistory.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { URI } from '../../../../base/common/uri.js';
import { DeferredPromise, Limiter, RunOnceScheduler } from '../../../../base/common/async.js';
import { dirname, extname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { hash } from '../../../../base/common/hash.js';
import { indexOfPath, randomPath } from '../../../../base/common/extpath.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { distinct } from '../../../../base/common/arrays.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
export class WorkingCopyHistoryModel {
    static { this.ENTRIES_FILE = 'entries.json'; }
    static { this.FILE_SAVED_SOURCE = SaveSourceRegistry.registerSource('default.source', localize('default.source', "File Saved")); }
    static { this.SETTINGS = {
        MAX_ENTRIES: 'workbench.localHistory.maxFileEntries',
        MERGE_PERIOD: 'workbench.localHistory.mergeWindow'
    }; }
    constructor(workingCopyResource, historyHome, entryAddedEmitter, entryChangedEmitter, entryReplacedEmitter, entryRemovedEmitter, options, fileService, labelService, logService, configurationService) {
        this.historyHome = historyHome;
        this.entryAddedEmitter = entryAddedEmitter;
        this.entryChangedEmitter = entryChangedEmitter;
        this.entryReplacedEmitter = entryReplacedEmitter;
        this.entryRemovedEmitter = entryRemovedEmitter;
        this.options = options;
        this.fileService = fileService;
        this.labelService = labelService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.entries = [];
        this.whenResolved = undefined;
        this.workingCopyResource = undefined;
        this.workingCopyName = undefined;
        this.historyEntriesFolder = undefined;
        this.historyEntriesListingFile = undefined;
        this.historyEntriesNameMatcher = undefined;
        this.versionId = 0;
        this.storedVersionId = this.versionId;
        this.storeLimiter = new Limiter(1);
        this.setWorkingCopy(workingCopyResource);
    }
    setWorkingCopy(workingCopyResource) {
        // Update working copy
        this.workingCopyResource = workingCopyResource;
        this.workingCopyName = this.labelService.getUriBasenameLabel(workingCopyResource);
        this.historyEntriesNameMatcher = new RegExp(`[A-Za-z0-9]{4}${escapeRegExpCharacters(extname(workingCopyResource))}`);
        // Update locations
        this.historyEntriesFolder = this.toHistoryEntriesFolder(this.historyHome, workingCopyResource);
        this.historyEntriesListingFile = joinPath(this.historyEntriesFolder, WorkingCopyHistoryModel.ENTRIES_FILE);
        // Reset entries and resolved cache
        this.entries = [];
        this.whenResolved = undefined;
    }
    toHistoryEntriesFolder(historyHome, workingCopyResource) {
        return joinPath(historyHome, hash(workingCopyResource.toString()).toString(16));
    }
    async addEntry(source = WorkingCopyHistoryModel.FILE_SAVED_SOURCE, sourceDescription = undefined, timestamp = Date.now(), token) {
        let entryToReplace = undefined;
        // Figure out if the last entry should be replaced based
        // on settings that can define a interval for when an
        // entry is not added as new entry but should replace.
        // However, when save source is different, never replace.
        const lastEntry = this.entries.at(-1);
        if (lastEntry && lastEntry.source === source) {
            const configuredReplaceInterval = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MERGE_PERIOD, { resource: this.workingCopyResource });
            if (timestamp - lastEntry.timestamp <= (configuredReplaceInterval * 1000 /* convert to millies */)) {
                entryToReplace = lastEntry;
            }
        }
        let entry;
        // Replace lastest entry in history
        if (entryToReplace) {
            entry = await this.doReplaceEntry(entryToReplace, source, sourceDescription, timestamp, token);
        }
        // Add entry to history
        else {
            entry = await this.doAddEntry(source, sourceDescription, timestamp, token);
        }
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
        return entry;
    }
    async doAddEntry(source, sourceDescription = undefined, timestamp, token) {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        const workingCopyName = assertIsDefined(this.workingCopyName);
        const historyEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        // Perform a fast clone operation with minimal overhead to a new random location
        const id = `${randomPath(undefined, undefined, 4)}${extname(workingCopyResource)}`;
        const location = joinPath(historyEntriesFolder, id);
        await this.fileService.cloneFile(workingCopyResource, location);
        // Add to list of entries
        const entry = {
            id,
            workingCopy: { resource: workingCopyResource, name: workingCopyName },
            location,
            timestamp,
            source,
            sourceDescription
        };
        this.entries.push(entry);
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryAddedEmitter.fire({ entry });
        return entry;
    }
    async doReplaceEntry(entry, source, sourceDescription = undefined, timestamp, token) {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        // Perform a fast clone operation with minimal overhead to the existing location
        await this.fileService.cloneFile(workingCopyResource, entry.location);
        // Update entry
        entry.source = source;
        entry.sourceDescription = sourceDescription;
        entry.timestamp = timestamp;
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryReplacedEmitter.fire({ entry });
        return entry;
    }
    async removeEntry(entry, token) {
        // Make sure to await resolving when removing entries
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return false;
        }
        const index = this.entries.indexOf(entry);
        if (index === -1) {
            return false;
        }
        // Delete from disk
        await this.deleteEntry(entry);
        // Remove from model
        this.entries.splice(index, 1);
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryRemovedEmitter.fire({ entry });
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
        return true;
    }
    async updateEntry(entry, properties, token) {
        // Make sure to await resolving when updating entries
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return;
        }
        const index = this.entries.indexOf(entry);
        if (index === -1) {
            return;
        }
        // Update entry
        entry.source = properties.source;
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryChangedEmitter.fire({ entry });
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
    }
    async getEntries() {
        // Make sure to await resolving when all entries are asked for
        await this.resolveEntriesOnce();
        // Return as many entries as configured by user settings
        const configuredMaxEntries = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MAX_ENTRIES, { resource: this.workingCopyResource });
        if (this.entries.length > configuredMaxEntries) {
            return this.entries.slice(this.entries.length - configuredMaxEntries);
        }
        return this.entries;
    }
    async hasEntries(skipResolve) {
        // Make sure to await resolving unless explicitly skipped
        if (!skipResolve) {
            await this.resolveEntriesOnce();
        }
        return this.entries.length > 0;
    }
    resolveEntriesOnce() {
        if (!this.whenResolved) {
            this.whenResolved = this.doResolveEntries();
        }
        return this.whenResolved;
    }
    async doResolveEntries() {
        // Resolve from disk
        const entries = await this.resolveEntriesFromDisk();
        // We now need to merge our in-memory entries with the
        // entries we have found on disk because it is possible
        // that new entries have been added before the entries
        // listing file was updated
        for (const entry of this.entries) {
            entries.set(entry.id, entry);
        }
        // Set as entries, sorted by timestamp
        this.entries = Array.from(entries.values()).sort((entryA, entryB) => entryA.timestamp - entryB.timestamp);
    }
    async resolveEntriesFromDisk() {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        const workingCopyName = assertIsDefined(this.workingCopyName);
        const [entryListing, entryStats] = await Promise.all([
            // Resolve entries listing file
            this.readEntriesFile(),
            // Resolve children of history folder
            this.readEntriesFolder()
        ]);
        // Add from raw folder children
        const entries = new Map();
        if (entryStats) {
            for (const entryStat of entryStats) {
                entries.set(entryStat.name, {
                    id: entryStat.name,
                    workingCopy: { resource: workingCopyResource, name: workingCopyName },
                    location: entryStat.resource,
                    timestamp: entryStat.mtime,
                    source: WorkingCopyHistoryModel.FILE_SAVED_SOURCE,
                    sourceDescription: undefined
                });
            }
        }
        // Update from listing (to have more specific metadata)
        if (entryListing) {
            for (const entry of entryListing.entries) {
                const existingEntry = entries.get(entry.id);
                if (existingEntry) {
                    entries.set(entry.id, {
                        ...existingEntry,
                        timestamp: entry.timestamp,
                        source: entry.source ?? existingEntry.source,
                        sourceDescription: entry.sourceDescription ?? existingEntry.sourceDescription
                    });
                }
            }
        }
        return entries;
    }
    async moveEntries(target, source, token) {
        const timestamp = Date.now();
        const sourceDescription = this.labelService.getUriLabel(assertIsDefined(this.workingCopyResource));
        // Move all entries into the target folder so that we preserve
        // any existing history entries that might already be present
        const sourceHistoryEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        const targetHistoryEntriesFolder = assertIsDefined(target.historyEntriesFolder);
        try {
            for (const entry of this.entries) {
                await this.fileService.move(entry.location, joinPath(targetHistoryEntriesFolder, entry.id), true);
            }
            await this.fileService.del(sourceHistoryEntriesFolder, { recursive: true });
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                try {
                    // In case of an error (unless not found), fallback to moving the entire folder
                    await this.fileService.move(sourceHistoryEntriesFolder, targetHistoryEntriesFolder, true);
                }
                catch (error) {
                    if (!this.isFileNotFound(error)) {
                        this.traceError(error);
                    }
                }
            }
        }
        // Merge our entries with target entries before updating associated working copy
        const allEntries = distinct([...this.entries, ...target.entries], entry => entry.id).sort((entryA, entryB) => entryA.timestamp - entryB.timestamp);
        // Update our associated working copy
        const targetWorkingCopyResource = assertIsDefined(target.workingCopyResource);
        this.setWorkingCopy(targetWorkingCopyResource);
        // Restore our entries and ensure correct metadata
        const targetWorkingCopyName = assertIsDefined(target.workingCopyName);
        for (const entry of allEntries) {
            this.entries.push({
                id: entry.id,
                location: joinPath(targetHistoryEntriesFolder, entry.id),
                source: entry.source,
                sourceDescription: entry.sourceDescription,
                timestamp: entry.timestamp,
                workingCopy: {
                    resource: targetWorkingCopyResource,
                    name: targetWorkingCopyName
                }
            });
        }
        // Add entry for the move
        await this.addEntry(source, sourceDescription, timestamp, token);
        // Store model again to updated location
        await this.store(token);
    }
    async store(token) {
        if (!this.shouldStore()) {
            return;
        }
        // Use a `Limiter` to prevent multiple `store` operations
        // potentially running at the same time
        await this.storeLimiter.queue(async () => {
            if (token.isCancellationRequested || !this.shouldStore()) {
                return;
            }
            return this.doStore(token);
        });
    }
    shouldStore() {
        return this.storedVersionId !== this.versionId;
    }
    async doStore(token) {
        const historyEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        // Make sure to await resolving when persisting
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Cleanup based on max-entries setting
        await this.cleanUpEntries();
        // Without entries, remove the history folder
        const storedVersion = this.versionId;
        if (this.entries.length === 0) {
            try {
                await this.fileService.del(historyEntriesFolder, { recursive: true });
            }
            catch (error) {
                this.traceError(error);
            }
        }
        // If we still have entries, update the entries meta file
        else {
            await this.writeEntriesFile();
        }
        // Mark as stored version
        this.storedVersionId = storedVersion;
    }
    async cleanUpEntries() {
        const configuredMaxEntries = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MAX_ENTRIES, { resource: this.workingCopyResource });
        if (this.entries.length <= configuredMaxEntries) {
            return; // nothing to cleanup
        }
        const entriesToDelete = this.entries.slice(0, this.entries.length - configuredMaxEntries);
        const entriesToKeep = this.entries.slice(this.entries.length - configuredMaxEntries);
        // Delete entries from disk as instructed
        for (const entryToDelete of entriesToDelete) {
            await this.deleteEntry(entryToDelete);
        }
        // Make sure to update our in-memory model as well
        // because it will be persisted right after
        this.entries = entriesToKeep;
        // Events
        for (const entry of entriesToDelete) {
            this.entryRemovedEmitter.fire({ entry });
        }
    }
    async deleteEntry(entry) {
        try {
            await this.fileService.del(entry.location);
        }
        catch (error) {
            this.traceError(error);
        }
    }
    async writeEntriesFile() {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        const historyEntriesListingFile = assertIsDefined(this.historyEntriesListingFile);
        const serializedModel = {
            version: 1,
            resource: workingCopyResource.toString(),
            entries: this.entries.map(entry => {
                return {
                    id: entry.id,
                    source: entry.source !== WorkingCopyHistoryModel.FILE_SAVED_SOURCE ? entry.source : undefined,
                    sourceDescription: entry.sourceDescription,
                    timestamp: entry.timestamp
                };
            })
        };
        await this.fileService.writeFile(historyEntriesListingFile, VSBuffer.fromString(JSON.stringify(serializedModel)));
    }
    async readEntriesFile() {
        const historyEntriesListingFile = assertIsDefined(this.historyEntriesListingFile);
        let serializedModel = undefined;
        try {
            serializedModel = JSON.parse((await this.fileService.readFile(historyEntriesListingFile)).value.toString());
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                this.traceError(error);
            }
        }
        return serializedModel;
    }
    async readEntriesFolder() {
        const historyEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        const historyEntriesNameMatcher = assertIsDefined(this.historyEntriesNameMatcher);
        let rawEntries = undefined;
        // Resolve children of folder on disk
        try {
            rawEntries = (await this.fileService.resolve(historyEntriesFolder, { resolveMetadata: true })).children;
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                this.traceError(error);
            }
        }
        if (!rawEntries) {
            return undefined;
        }
        // Skip entries that do not seem to have valid file name
        return rawEntries.filter(entry => !isEqual(entry.resource, this.historyEntriesListingFile) && // not the listings file
            historyEntriesNameMatcher.test(entry.name) // matching our expected file pattern for entries
        );
    }
    isFileNotFound(error) {
        return error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
    }
    traceError(error) {
        this.logService.trace('[Working Copy History Service]', error);
    }
}
let WorkingCopyHistoryService = class WorkingCopyHistoryService extends Disposable {
    static { WorkingCopyHistoryService_1 = this; }
    static { this.FILE_MOVED_SOURCE = SaveSourceRegistry.registerSource('moved.source', localize('moved.source', "File Moved")); }
    static { this.FILE_RENAMED_SOURCE = SaveSourceRegistry.registerSource('renamed.source', localize('renamed.source', "File Renamed")); }
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService) {
        super();
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
        this.labelService = labelService;
        this.logService = logService;
        this.configurationService = configurationService;
        this._onDidAddEntry = this._register(new Emitter());
        this.onDidAddEntry = this._onDidAddEntry.event;
        this._onDidChangeEntry = this._register(new Emitter());
        this.onDidChangeEntry = this._onDidChangeEntry.event;
        this._onDidReplaceEntry = this._register(new Emitter());
        this.onDidReplaceEntry = this._onDidReplaceEntry.event;
        this._onDidMoveEntries = this._register(new Emitter());
        this.onDidMoveEntries = this._onDidMoveEntries.event;
        this._onDidRemoveEntry = this._register(new Emitter());
        this.onDidRemoveEntry = this._onDidRemoveEntry.event;
        this._onDidRemoveEntries = this._register(new Emitter());
        this.onDidRemoveEntries = this._onDidRemoveEntries.event;
        this.localHistoryHome = new DeferredPromise();
        this.models = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.resolveLocalHistoryHome();
    }
    async resolveLocalHistoryHome() {
        let historyHome = undefined;
        // Prefer history to be stored in the remote if we are connected to a remote
        try {
            const remoteEnv = await this.remoteAgentService.getEnvironment();
            if (remoteEnv) {
                historyHome = remoteEnv.localHistoryHome;
            }
        }
        catch (error) {
            this.logService.trace(error); // ignore and fallback to local
        }
        // But fallback to local if there is no remote
        if (!historyHome) {
            historyHome = this.environmentService.localHistoryHome;
        }
        this.localHistoryHome.complete(historyHome);
    }
    async moveEntries(source, target) {
        const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
        const promises = [];
        for (const [resource, model] of this.models) {
            if (!this.uriIdentityService.extUri.isEqualOrParent(resource, source)) {
                continue; // model does not match moved resource
            }
            // Determine new resulting target resource
            let targetResource;
            if (this.uriIdentityService.extUri.isEqual(source, resource)) {
                targetResource = target; // file got moved
            }
            else {
                const index = indexOfPath(resource.path, source.path);
                targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
            }
            // Figure out save source
            let saveSource;
            if (this.uriIdentityService.extUri.isEqual(dirname(resource), dirname(targetResource))) {
                saveSource = WorkingCopyHistoryService_1.FILE_RENAMED_SOURCE;
            }
            else {
                saveSource = WorkingCopyHistoryService_1.FILE_MOVED_SOURCE;
            }
            // Move entries to target queued
            promises.push(limiter.queue(() => this.doMoveEntries(model, saveSource, resource, targetResource)));
        }
        if (!promises.length) {
            return [];
        }
        // Await move operations
        const resources = await Promise.all(promises);
        // Events
        this._onDidMoveEntries.fire();
        return resources;
    }
    async doMoveEntries(source, saveSource, sourceWorkingCopyResource, targetWorkingCopyResource) {
        // Move to target via model
        const target = await this.getModel(targetWorkingCopyResource);
        await source.moveEntries(target, saveSource, CancellationToken.None);
        // Update model in our map
        this.models.delete(sourceWorkingCopyResource);
        this.models.set(targetWorkingCopyResource, source);
        return targetWorkingCopyResource;
    }
    async addEntry({ resource, source, timestamp }, token) {
        if (!this.fileService.hasProvider(resource)) {
            return undefined; // we require the working copy resource to be file service accessible
        }
        // Resolve history model for working copy
        const model = await this.getModel(resource);
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Add to model
        return model.addEntry(source, undefined, timestamp, token);
    }
    async updateEntry(entry, properties, token) {
        // Resolve history model for working copy
        const model = await this.getModel(entry.workingCopy.resource);
        if (token.isCancellationRequested) {
            return;
        }
        // Rename in model
        return model.updateEntry(entry, properties, token);
    }
    async removeEntry(entry, token) {
        // Resolve history model for working copy
        const model = await this.getModel(entry.workingCopy.resource);
        if (token.isCancellationRequested) {
            return false;
        }
        // Remove from model
        return model.removeEntry(entry, token);
    }
    async removeAll(token) {
        const historyHome = await this.localHistoryHome.p;
        if (token.isCancellationRequested) {
            return;
        }
        // Clear models
        this.models.clear();
        // Remove from disk
        await this.fileService.del(historyHome, { recursive: true });
        // Events
        this._onDidRemoveEntries.fire();
    }
    async getEntries(resource, token) {
        const model = await this.getModel(resource);
        if (token.isCancellationRequested) {
            return [];
        }
        const entries = await model.getEntries();
        return entries ?? [];
    }
    async getAll(token) {
        const historyHome = await this.localHistoryHome.p;
        if (token.isCancellationRequested) {
            return [];
        }
        const all = new ResourceMap();
        // Fill in all known model resources (they might not have yet persisted to disk)
        for (const [resource, model] of this.models) {
            const hasInMemoryEntries = await model.hasEntries(true /* skip resolving because we resolve below from disk */);
            if (hasInMemoryEntries) {
                all.set(resource, true);
            }
        }
        // Resolve all other resources by iterating the history home folder
        try {
            const resolvedHistoryHome = await this.fileService.resolve(historyHome);
            if (resolvedHistoryHome.children) {
                const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
                const promises = [];
                for (const child of resolvedHistoryHome.children) {
                    promises.push(limiter.queue(async () => {
                        if (token.isCancellationRequested) {
                            return;
                        }
                        try {
                            const serializedModel = JSON.parse((await this.fileService.readFile(joinPath(child.resource, WorkingCopyHistoryModel.ENTRIES_FILE))).value.toString());
                            if (serializedModel.entries.length > 0) {
                                all.set(URI.parse(serializedModel.resource), true);
                            }
                        }
                        catch (error) {
                            // ignore - model might be missing or corrupt, but we need it
                        }
                    }));
                }
                await Promise.all(promises);
            }
        }
        catch (error) {
            // ignore - history might be entirely empty
        }
        return Array.from(all.keys());
    }
    async getModel(resource) {
        const historyHome = await this.localHistoryHome.p;
        let model = this.models.get(resource);
        if (!model) {
            model = new WorkingCopyHistoryModel(resource, historyHome, this._onDidAddEntry, this._onDidChangeEntry, this._onDidReplaceEntry, this._onDidRemoveEntry, this.getModelOptions(), this.fileService, this.labelService, this.logService, this.configurationService);
            this.models.set(resource, model);
        }
        return model;
    }
};
WorkingCopyHistoryService = WorkingCopyHistoryService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IConfigurationService)
], WorkingCopyHistoryService);
export { WorkingCopyHistoryService };
let NativeWorkingCopyHistoryService = class NativeWorkingCopyHistoryService extends WorkingCopyHistoryService {
    static { NativeWorkingCopyHistoryService_1 = this; }
    static { this.STORE_ALL_INTERVAL = 5 * 60 * 1000; } // 5min
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, lifecycleService, logService, configurationService) {
        super(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService);
        this.lifecycleService = lifecycleService;
        this.isRemotelyStored = typeof this.environmentService.remoteAuthority === 'string';
        this.storeAllCts = this._register(new CancellationTokenSource());
        this.storeAllScheduler = this._register(new RunOnceScheduler(() => this.storeAll(this.storeAllCts.token), NativeWorkingCopyHistoryService_1.STORE_ALL_INTERVAL));
        this.registerListeners();
    }
    registerListeners() {
        if (!this.isRemotelyStored) {
            // Local: persist all on shutdown
            this._register(this.lifecycleService.onWillShutdown(e => this.onWillShutdown(e)));
            // Local: schedule persist on change
            this._register(Event.any(this.onDidAddEntry, this.onDidChangeEntry, this.onDidReplaceEntry, this.onDidRemoveEntry)(() => this.onDidChangeModels()));
        }
    }
    getModelOptions() {
        return { flushOnChange: this.isRemotelyStored /* because the connection might drop anytime */ };
    }
    onWillShutdown(e) {
        // Dispose the scheduler...
        this.storeAllScheduler.dispose();
        this.storeAllCts.dispose(true);
        // ...because we now explicitly store all models
        e.join(this.storeAll(e.token), { id: 'join.workingCopyHistory', label: localize('join.workingCopyHistory', "Saving local history") });
    }
    onDidChangeModels() {
        if (!this.storeAllScheduler.isScheduled()) {
            this.storeAllScheduler.schedule();
        }
    }
    async storeAll(token) {
        const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
        const promises = [];
        const models = Array.from(this.models.values());
        for (const model of models) {
            promises.push(limiter.queue(async () => {
                if (token.isCancellationRequested) {
                    return;
                }
                try {
                    await model.store(token);
                }
                catch (error) {
                    this.logService.trace(error);
                }
            }));
        }
        await Promise.all(promises);
    }
};
NativeWorkingCopyHistoryService = NativeWorkingCopyHistoryService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILifecycleService),
    __param(6, ILogService),
    __param(7, IConfigurationService)
], NativeWorkingCopyHistoryService);
export { NativeWorkingCopyHistoryService };
// Register History Tracker
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkingCopyHistoryTracker, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5SGlzdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFtQyxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFDLE1BQU0scUNBQXFDLENBQUM7QUFDM0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBc0gsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMxTCxPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLFlBQVksRUFBeUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RixPQUFP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