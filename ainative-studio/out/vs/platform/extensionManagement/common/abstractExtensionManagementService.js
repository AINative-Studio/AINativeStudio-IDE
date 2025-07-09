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
import { distinct, isNonEmptyArray } from '../../../base/common/arrays.js';
import { Barrier, createCancelablePromise } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError, getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { isWeb } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { ExtensionManagementError, IExtensionGalleryService, isTargetPlatformCompatible, TargetPlatformToString, EXTENSION_INSTALL_DEP_PACK_CONTEXT, ExtensionGalleryError, EXTENSION_INSTALL_SOURCE_CONTEXT, ExtensionSignatureVerificationCode, IAllowedExtensionsService } from './extensionManagement.js';
import { areSameExtensions, ExtensionKey, getGalleryExtensionId, getGalleryExtensionTelemetryData, getLocalExtensionTelemetryData, isMalicious } from './extensionManagementUtil.js';
import { isApplicationScopedExtension } from '../../extensions/common/extensions.js';
import { areApiProposalsCompatible } from '../../extensions/common/extensionValidator.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
let CommontExtensionManagementService = class CommontExtensionManagementService extends Disposable {
    constructor(productService, allowedExtensionsService) {
        super();
        this.productService = productService;
        this.allowedExtensionsService = allowedExtensionsService;
    }
    async canInstall(extension) {
        const allowedToInstall = this.allowedExtensionsService.isAllowed({ id: extension.identifier.id, publisherDisplayName: extension.publisherDisplayName });
        if (allowedToInstall !== true) {
            return new MarkdownString(nls.localize('not allowed to install', "This extension cannot be installed because {0}", allowedToInstall.value));
        }
        if (!(await this.isExtensionPlatformCompatible(extension))) {
            const learnLink = isWeb ? 'https://aka.ms/vscode-web-extensions-guide' : 'https://aka.ms/vscode-platform-specific-extensions';
            return new MarkdownString(`${nls.localize('incompatible platform', "The '{0}' extension is not available in {1} for the {2}.", extension.displayName ?? extension.identifier.id, this.productService.nameLong, TargetPlatformToString(await this.getTargetPlatform()))} [${nls.localize('learn why', "Learn Why")}](${learnLink})`);
        }
        return true;
    }
    async isExtensionPlatformCompatible(extension) {
        const currentTargetPlatform = await this.getTargetPlatform();
        return extension.allTargetPlatforms.some(targetPlatform => isTargetPlatformCompatible(targetPlatform, extension.allTargetPlatforms, currentTargetPlatform));
    }
};
CommontExtensionManagementService = __decorate([
    __param(0, IProductService),
    __param(1, IAllowedExtensionsService)
], CommontExtensionManagementService);
export { CommontExtensionManagementService };
let AbstractExtensionManagementService = class AbstractExtensionManagementService extends CommontExtensionManagementService {
    get onInstallExtension() { return this._onInstallExtension.event; }
    get onDidInstallExtensions() { return this._onDidInstallExtensions.event; }
    get onUninstallExtension() { return this._onUninstallExtension.event; }
    get onDidUninstallExtension() { return this._onDidUninstallExtension.event; }
    get onDidUpdateExtensionMetadata() { return this._onDidUpdateExtensionMetadata.event; }
    constructor(galleryService, telemetryService, uriIdentityService, logService, productService, allowedExtensionsService, userDataProfilesService) {
        super(productService, allowedExtensionsService);
        this.galleryService = galleryService;
        this.telemetryService = telemetryService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.userDataProfilesService = userDataProfilesService;
        this.lastReportTimestamp = 0;
        this.installingExtensions = new Map();
        this.uninstallingExtensions = new Map();
        this._onInstallExtension = this._register(new Emitter());
        this._onDidInstallExtensions = this._register(new Emitter());
        this._onUninstallExtension = this._register(new Emitter());
        this._onDidUninstallExtension = this._register(new Emitter());
        this._onDidUpdateExtensionMetadata = this._register(new Emitter());
        this.participants = [];
        this._register(toDisposable(() => {
            this.installingExtensions.forEach(({ task }) => task.cancel());
            this.uninstallingExtensions.forEach(promise => promise.cancel());
            this.installingExtensions.clear();
            this.uninstallingExtensions.clear();
        }));
    }
    async installFromGallery(extension, options = {}) {
        try {
            const results = await this.installGalleryExtensions([{ extension, options }]);
            const result = results.find(({ identifier }) => areSameExtensions(identifier, extension.identifier));
            if (result?.local) {
                return result?.local;
            }
            if (result?.error) {
                throw result.error;
            }
            throw new ExtensionManagementError(`Unknown error while installing extension ${extension.identifier.id}`, "Unknown" /* ExtensionManagementErrorCode.Unknown */);
        }
        catch (error) {
            throw toExtensionManagementError(error);
        }
    }
    async installGalleryExtensions(extensions) {
        if (!this.galleryService.isEnabled()) {
            throw new ExtensionManagementError(nls.localize('MarketPlaceDisabled', "Marketplace is not enabled"), "NotAllowed" /* ExtensionManagementErrorCode.NotAllowed */);
        }
        const results = [];
        const installableExtensions = [];
        await Promise.allSettled(extensions.map(async ({ extension, options }) => {
            try {
                const compatible = await this.checkAndGetCompatibleVersion(extension, !!options?.installGivenVersion, !!options?.installPreReleaseVersion, options.productVersion ?? { version: this.productService.version, date: this.productService.date });
                installableExtensions.push({ ...compatible, options });
            }
            catch (error) {
                results.push({ identifier: extension.identifier, operation: 2 /* InstallOperation.Install */, source: extension, error, profileLocation: options.profileLocation ?? this.getCurrentExtensionsManifestLocation() });
            }
        }));
        if (installableExtensions.length) {
            results.push(...await this.installExtensions(installableExtensions));
        }
        return results;
    }
    async uninstall(extension, options) {
        this.logService.trace('ExtensionManagementService#uninstall', extension.identifier.id);
        return this.uninstallExtensions([{ extension, options }]);
    }
    async toggleAppliationScope(extension, fromProfileLocation) {
        if (isApplicationScopedExtension(extension.manifest) || extension.isBuiltin) {
            return extension;
        }
        if (extension.isApplicationScoped) {
            let local = await this.updateMetadata(extension, { isApplicationScoped: false }, this.userDataProfilesService.defaultProfile.extensionsResource);
            if (!this.uriIdentityService.extUri.isEqual(fromProfileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)) {
                local = await this.copyExtension(extension, this.userDataProfilesService.defaultProfile.extensionsResource, fromProfileLocation);
            }
            for (const profile of this.userDataProfilesService.profiles) {
                const existing = (await this.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource))
                    .find(e => areSameExtensions(e.identifier, extension.identifier));
                if (existing) {
                    this._onDidUpdateExtensionMetadata.fire({ local: existing, profileLocation: profile.extensionsResource });
                }
                else {
                    this._onDidUninstallExtension.fire({ identifier: extension.identifier, profileLocation: profile.extensionsResource });
                }
            }
            return local;
        }
        else {
            const local = this.uriIdentityService.extUri.isEqual(fromProfileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)
                ? await this.updateMetadata(extension, { isApplicationScoped: true }, this.userDataProfilesService.defaultProfile.extensionsResource)
                : await this.copyExtension(extension, fromProfileLocation, this.userDataProfilesService.defaultProfile.extensionsResource, { isApplicationScoped: true });
            this._onDidInstallExtensions.fire([{ identifier: local.identifier, operation: 2 /* InstallOperation.Install */, local, profileLocation: this.userDataProfilesService.defaultProfile.extensionsResource, applicationScoped: true }]);
            return local;
        }
    }
    getExtensionsControlManifest() {
        const now = new Date().getTime();
        if (!this.extensionsControlManifest || now - this.lastReportTimestamp > 1000 * 60 * 5) { // 5 minute cache freshness
            this.extensionsControlManifest = this.updateControlCache();
            this.lastReportTimestamp = now;
        }
        return this.extensionsControlManifest;
    }
    registerParticipant(participant) {
        this.participants.push(participant);
    }
    async resetPinnedStateForAllUserExtensions(pinned) {
        try {
            await this.joinAllSettled(this.userDataProfilesService.profiles.map(async (profile) => {
                const extensions = await this.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource);
                await this.joinAllSettled(extensions.map(async (extension) => {
                    if (extension.pinned !== pinned) {
                        await this.updateMetadata(extension, { pinned }, profile.extensionsResource);
                    }
                }));
            }));
        }
        catch (error) {
            this.logService.error('Error while resetting pinned state for all user extensions', getErrorMessage(error));
            throw error;
        }
    }
    async installExtensions(extensions) {
        const installExtensionResultsMap = new Map();
        const installingExtensionsMap = new Map();
        const alreadyRequestedInstallations = [];
        const getInstallExtensionTaskKey = (extension, profileLocation) => `${ExtensionKey.create(extension).toString()}-${profileLocation.toString()}`;
        const createInstallExtensionTask = (manifest, extension, options, root) => {
            if (!URI.isUri(extension)) {
                if (installingExtensionsMap.has(`${extension.identifier.id.toLowerCase()}-${options.profileLocation.toString()}`)) {
                    return;
                }
                const existingInstallingExtension = this.installingExtensions.get(getInstallExtensionTaskKey(extension, options.profileLocation));
                if (existingInstallingExtension) {
                    if (root && this.canWaitForTask(root, existingInstallingExtension.task)) {
                        const identifier = existingInstallingExtension.task.identifier;
                        this.logService.info('Waiting for already requested installing extension', identifier.id, root.identifier.id, options.profileLocation.toString());
                        existingInstallingExtension.waitingTasks.push(root);
                        // add promise that waits until the extension is completely installed, ie., onDidInstallExtensions event is triggered for this extension
                        alreadyRequestedInstallations.push(Event.toPromise(Event.filter(this.onDidInstallExtensions, results => results.some(result => areSameExtensions(result.identifier, identifier)))).then(results => {
                            this.logService.info('Finished waiting for already requested installing extension', identifier.id, root.identifier.id, options.profileLocation.toString());
                            const result = results.find(result => areSameExtensions(result.identifier, identifier));
                            if (!result?.local) {
                                // Extension failed to install
                                throw new Error(`Extension ${identifier.id} is not installed`);
                            }
                        }));
                    }
                    return;
                }
            }
            const installExtensionTask = this.createInstallExtensionTask(manifest, extension, options);
            const key = `${getGalleryExtensionId(manifest.publisher, manifest.name)}-${options.profileLocation.toString()}`;
            installingExtensionsMap.set(key, { task: installExtensionTask, root });
            this._onInstallExtension.fire({ identifier: installExtensionTask.identifier, source: extension, profileLocation: options.profileLocation });
            this.logService.info('Installing extension:', installExtensionTask.identifier.id, options);
            // only cache gallery extensions tasks
            if (!URI.isUri(extension)) {
                this.installingExtensions.set(getInstallExtensionTaskKey(extension, options.profileLocation), { task: installExtensionTask, waitingTasks: [] });
            }
        };
        try {
            // Start installing extensions
            for (const { manifest, extension, options } of extensions) {
                const isApplicationScoped = options.isApplicationScoped || options.isBuiltin || isApplicationScopedExtension(manifest);
                const installExtensionTaskOptions = {
                    ...options,
                    isApplicationScoped,
                    profileLocation: isApplicationScoped ? this.userDataProfilesService.defaultProfile.extensionsResource : options.profileLocation ?? this.getCurrentExtensionsManifestLocation(),
                    productVersion: options.productVersion ?? { version: this.productService.version, date: this.productService.date }
                };
                const existingInstallExtensionTask = !URI.isUri(extension) ? this.installingExtensions.get(getInstallExtensionTaskKey(extension, installExtensionTaskOptions.profileLocation)) : undefined;
                if (existingInstallExtensionTask) {
                    this.logService.info('Extension is already requested to install', existingInstallExtensionTask.task.identifier.id, installExtensionTaskOptions.profileLocation.toString());
                    alreadyRequestedInstallations.push(existingInstallExtensionTask.task.waitUntilTaskIsFinished());
                }
                else {
                    createInstallExtensionTask(manifest, extension, installExtensionTaskOptions, undefined);
                }
            }
            // collect and start installing all dependencies and pack extensions
            await Promise.all([...installingExtensionsMap.values()].map(async ({ task }) => {
                if (task.options.donotIncludePackAndDependencies) {
                    this.logService.info('Installing the extension without checking dependencies and pack', task.identifier.id);
                }
                else {
                    try {
                        const allDepsAndPackExtensionsToInstall = await this.getAllDepsAndPackExtensions(task.identifier, task.manifest, !!task.options.installPreReleaseVersion, task.options.productVersion);
                        const installed = await this.getInstalled(undefined, task.options.profileLocation, task.options.productVersion);
                        const options = { ...task.options, context: { ...task.options.context, [EXTENSION_INSTALL_DEP_PACK_CONTEXT]: true } };
                        for (const { gallery, manifest } of distinct(allDepsAndPackExtensionsToInstall, ({ gallery }) => gallery.identifier.id)) {
                            const existing = installed.find(e => areSameExtensions(e.identifier, gallery.identifier));
                            // Skip if the extension is already installed and has the same application scope
                            if (existing && existing.isApplicationScoped === !!options.isApplicationScoped) {
                                continue;
                            }
                            createInstallExtensionTask(manifest, gallery, options, task);
                        }
                    }
                    catch (error) {
                        // Installing through VSIX
                        if (URI.isUri(task.source)) {
                            // Ignore installing dependencies and packs
                            if (isNonEmptyArray(task.manifest.extensionDependencies)) {
                                this.logService.warn(`Cannot install dependencies of extension:`, task.identifier.id, error.message);
                            }
                            if (isNonEmptyArray(task.manifest.extensionPack)) {
                                this.logService.warn(`Cannot install packed extensions of extension:`, task.identifier.id, error.message);
                            }
                        }
                        else {
                            this.logService.error('Error while preparing to install dependencies and extension packs of the extension:', task.identifier.id);
                            throw error;
                        }
                    }
                }
            }));
            const otherProfilesToUpdate = await this.getOtherProfilesToUpdateExtension([...installingExtensionsMap.values()].map(({ task }) => task));
            for (const [profileLocation, task] of otherProfilesToUpdate) {
                createInstallExtensionTask(task.manifest, task.source, { ...task.options, profileLocation }, undefined);
            }
            // Install extensions in parallel and wait until all extensions are installed / failed
            await this.joinAllSettled([...installingExtensionsMap.entries()].map(async ([key, { task }]) => {
                const startTime = new Date().getTime();
                let local;
                try {
                    local = await task.run();
                    await this.joinAllSettled(this.participants.map(participant => participant.postInstall(local, task.source, task.options, CancellationToken.None)), "PostInstall" /* ExtensionManagementErrorCode.PostInstall */);
                }
                catch (e) {
                    const error = toExtensionManagementError(e);
                    if (!URI.isUri(task.source)) {
                        reportTelemetry(this.telemetryService, task.operation === 3 /* InstallOperation.Update */ ? 'extensionGallery:update' : 'extensionGallery:install', {
                            extensionData: getGalleryExtensionTelemetryData(task.source),
                            error,
                            source: task.options.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT]
                        });
                    }
                    installExtensionResultsMap.set(key, { error, identifier: task.identifier, operation: task.operation, source: task.source, context: task.options.context, profileLocation: task.options.profileLocation, applicationScoped: task.options.isApplicationScoped });
                    this.logService.error('Error while installing the extension', task.identifier.id, getErrorMessage(error), task.options.profileLocation.toString());
                    throw error;
                }
                if (!URI.isUri(task.source)) {
                    const isUpdate = task.operation === 3 /* InstallOperation.Update */;
                    const durationSinceUpdate = isUpdate ? undefined : (new Date().getTime() - task.source.lastUpdated) / 1000;
                    reportTelemetry(this.telemetryService, isUpdate ? 'extensionGallery:update' : 'extensionGallery:install', {
                        extensionData: getGalleryExtensionTelemetryData(task.source),
                        verificationStatus: task.verificationStatus,
                        duration: new Date().getTime() - startTime,
                        durationSinceUpdate,
                        source: task.options.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT]
                    });
                    // In web, report extension install statistics explicitly. In Desktop, statistics are automatically updated while downloading the VSIX.
                    if (isWeb && task.operation !== 3 /* InstallOperation.Update */) {
                        try {
                            await this.galleryService.reportStatistic(local.manifest.publisher, local.manifest.name, local.manifest.version, "install" /* StatisticType.Install */);
                        }
                        catch (error) { /* ignore */ }
                    }
                }
                installExtensionResultsMap.set(key, { local, identifier: task.identifier, operation: task.operation, source: task.source, context: task.options.context, profileLocation: task.options.profileLocation, applicationScoped: local.isApplicationScoped });
            }));
            if (alreadyRequestedInstallations.length) {
                await this.joinAllSettled(alreadyRequestedInstallations);
            }
        }
        catch (error) {
            const getAllDepsAndPacks = (extension, profileLocation, allDepsOrPacks) => {
                const depsOrPacks = [];
                if (extension.manifest.extensionDependencies?.length) {
                    depsOrPacks.push(...extension.manifest.extensionDependencies);
                }
                if (extension.manifest.extensionPack?.length) {
                    depsOrPacks.push(...extension.manifest.extensionPack);
                }
                for (const id of depsOrPacks) {
                    if (allDepsOrPacks.includes(id.toLowerCase())) {
                        continue;
                    }
                    allDepsOrPacks.push(id.toLowerCase());
                    const installed = installExtensionResultsMap.get(`${id.toLowerCase()}-${profileLocation.toString()}`);
                    if (installed?.local) {
                        allDepsOrPacks = getAllDepsAndPacks(installed.local, profileLocation, allDepsOrPacks);
                    }
                }
                return allDepsOrPacks;
            };
            const getErrorResult = (task) => ({ identifier: task.identifier, operation: 2 /* InstallOperation.Install */, source: task.source, context: task.options.context, profileLocation: task.options.profileLocation, error });
            const rollbackTasks = [];
            for (const [key, { task, root }] of installingExtensionsMap) {
                const result = installExtensionResultsMap.get(key);
                if (!result) {
                    task.cancel();
                    installExtensionResultsMap.set(key, getErrorResult(task));
                }
                // If the extension is installed by a root task and the root task is failed, then uninstall the extension
                else if (result.local && root && !installExtensionResultsMap.get(`${root.identifier.id.toLowerCase()}-${task.options.profileLocation.toString()}`)?.local) {
                    rollbackTasks.push(this.createUninstallExtensionTask(result.local, { versionOnly: true, profileLocation: task.options.profileLocation }));
                    installExtensionResultsMap.set(key, getErrorResult(task));
                }
            }
            for (const [key, { task }] of installingExtensionsMap) {
                const result = installExtensionResultsMap.get(key);
                if (!result?.local) {
                    continue;
                }
                if (task.options.donotIncludePackAndDependencies) {
                    continue;
                }
                const depsOrPacks = getAllDepsAndPacks(result.local, task.options.profileLocation, [result.local.identifier.id.toLowerCase()]).slice(1);
                if (depsOrPacks.some(depOrPack => installingExtensionsMap.has(`${depOrPack.toLowerCase()}-${task.options.profileLocation.toString()}`) && !installExtensionResultsMap.get(`${depOrPack.toLowerCase()}-${task.options.profileLocation.toString()}`)?.local)) {
                    rollbackTasks.push(this.createUninstallExtensionTask(result.local, { versionOnly: true, profileLocation: task.options.profileLocation }));
                    installExtensionResultsMap.set(key, getErrorResult(task));
                }
            }
            if (rollbackTasks.length) {
                await Promise.allSettled(rollbackTasks.map(async (rollbackTask) => {
                    try {
                        await rollbackTask.run();
                        this.logService.info('Rollback: Uninstalled extension', rollbackTask.extension.identifier.id);
                    }
                    catch (error) {
                        this.logService.warn('Rollback: Error while uninstalling extension', rollbackTask.extension.identifier.id, getErrorMessage(error));
                    }
                }));
            }
        }
        finally {
            // Finally, remove all the tasks from the cache
            for (const { task } of installingExtensionsMap.values()) {
                if (task.source && !URI.isUri(task.source)) {
                    this.installingExtensions.delete(getInstallExtensionTaskKey(task.source, task.options.profileLocation));
                }
            }
        }
        const results = [...installExtensionResultsMap.values()];
        for (const result of results) {
            if (result.local) {
                this.logService.info(`Extension installed successfully:`, result.identifier.id, result.profileLocation.toString());
            }
        }
        this._onDidInstallExtensions.fire(results);
        return results;
    }
    async getOtherProfilesToUpdateExtension(tasks) {
        const otherProfilesToUpdate = [];
        const profileExtensionsCache = new ResourceMap();
        for (const task of tasks) {
            if (task.operation !== 3 /* InstallOperation.Update */
                || task.options.isApplicationScoped
                || task.options.pinned
                || task.options.installGivenVersion
                || URI.isUri(task.source)) {
                continue;
            }
            for (const profile of this.userDataProfilesService.profiles) {
                if (this.uriIdentityService.extUri.isEqual(profile.extensionsResource, task.options.profileLocation)) {
                    continue;
                }
                let installedExtensions = profileExtensionsCache.get(profile.extensionsResource);
                if (!installedExtensions) {
                    installedExtensions = await this.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource);
                    profileExtensionsCache.set(profile.extensionsResource, installedExtensions);
                }
                const installedExtension = installedExtensions.find(e => areSameExtensions(e.identifier, task.identifier));
                if (installedExtension && !installedExtension.pinned) {
                    otherProfilesToUpdate.push([profile.extensionsResource, task]);
                }
            }
        }
        return otherProfilesToUpdate;
    }
    canWaitForTask(taskToWait, taskToWaitFor) {
        for (const [, { task, waitingTasks }] of this.installingExtensions.entries()) {
            if (task === taskToWait) {
                // Cannot be waited, If taskToWaitFor is waiting for taskToWait
                if (waitingTasks.includes(taskToWaitFor)) {
                    return false;
                }
                // Cannot be waited, If taskToWaitFor is waiting for tasks waiting for taskToWait
                if (waitingTasks.some(waitingTask => this.canWaitForTask(waitingTask, taskToWaitFor))) {
                    return false;
                }
            }
            // Cannot be waited, if the taskToWait cannot be waited for the task created the taskToWaitFor
            // Because, the task waits for the tasks it created
            if (task === taskToWaitFor && waitingTasks[0] && !this.canWaitForTask(taskToWait, waitingTasks[0])) {
                return false;
            }
        }
        return true;
    }
    async joinAllSettled(promises, errorCode) {
        const results = [];
        const errors = [];
        const promiseResults = await Promise.allSettled(promises);
        for (const r of promiseResults) {
            if (r.status === 'fulfilled') {
                results.push(r.value);
            }
            else {
                errors.push(toExtensionManagementError(r.reason, errorCode));
            }
        }
        if (!errors.length) {
            return results;
        }
        // Throw if there are errors
        if (errors.length === 1) {
            throw errors[0];
        }
        let error = new ExtensionManagementError('', "Unknown" /* ExtensionManagementErrorCode.Unknown */);
        for (const current of errors) {
            error = new ExtensionManagementError(error.message ? `${error.message}, ${current.message}` : current.message, current.code !== "Unknown" /* ExtensionManagementErrorCode.Unknown */ && current.code !== "Internal" /* ExtensionManagementErrorCode.Internal */ ? current.code : error.code);
        }
        throw error;
    }
    async getAllDepsAndPackExtensions(extensionIdentifier, manifest, installPreRelease, productVersion) {
        if (!this.galleryService.isEnabled()) {
            return [];
        }
        const knownIdentifiers = [];
        const allDependenciesAndPacks = [];
        const collectDependenciesAndPackExtensionsToInstall = async (extensionIdentifier, manifest) => {
            knownIdentifiers.push(extensionIdentifier);
            const dependecies = manifest.extensionDependencies || [];
            const dependenciesAndPackExtensions = [...dependecies];
            if (manifest.extensionPack) {
                for (const extension of manifest.extensionPack) {
                    if (dependenciesAndPackExtensions.every(e => !areSameExtensions({ id: e }, { id: extension }))) {
                        dependenciesAndPackExtensions.push(extension);
                    }
                }
            }
            if (dependenciesAndPackExtensions.length) {
                // filter out known extensions
                const ids = dependenciesAndPackExtensions.filter(id => knownIdentifiers.every(galleryIdentifier => !areSameExtensions(galleryIdentifier, { id })));
                if (ids.length) {
                    const galleryExtensions = await this.galleryService.getExtensions(ids.map(id => ({ id, preRelease: installPreRelease })), CancellationToken.None);
                    for (const galleryExtension of galleryExtensions) {
                        if (knownIdentifiers.find(identifier => areSameExtensions(identifier, galleryExtension.identifier))) {
                            continue;
                        }
                        const isDependency = dependecies.some(id => areSameExtensions({ id }, galleryExtension.identifier));
                        let compatible;
                        try {
                            compatible = await this.checkAndGetCompatibleVersion(galleryExtension, false, installPreRelease, productVersion);
                        }
                        catch (error) {
                            if (!isDependency) {
                                this.logService.info('Skipping the packed extension as it cannot be installed', galleryExtension.identifier.id, getErrorMessage(error));
                                continue;
                            }
                            else {
                                throw error;
                            }
                        }
                        allDependenciesAndPacks.push({ gallery: compatible.extension, manifest: compatible.manifest });
                        await collectDependenciesAndPackExtensionsToInstall(compatible.extension.identifier, compatible.manifest);
                    }
                }
            }
        };
        await collectDependenciesAndPackExtensionsToInstall(extensionIdentifier, manifest);
        return allDependenciesAndPacks;
    }
    async checkAndGetCompatibleVersion(extension, sameVersion, installPreRelease, productVersion) {
        let compatibleExtension;
        const extensionsControlManifest = await this.getExtensionsControlManifest();
        if (isMalicious(extension.identifier, extensionsControlManifest.malicious)) {
            throw new ExtensionManagementError(nls.localize('malicious extension', "Can't install '{0}' extension since it was reported to be problematic.", extension.identifier.id), "Malicious" /* ExtensionManagementErrorCode.Malicious */);
        }
        const deprecationInfo = extensionsControlManifest.deprecated[extension.identifier.id.toLowerCase()];
        if (deprecationInfo?.extension?.autoMigrate) {
            this.logService.info(`The '${extension.identifier.id}' extension is deprecated, fetching the compatible '${deprecationInfo.extension.id}' extension instead.`);
            compatibleExtension = (await this.galleryService.getExtensions([{ id: deprecationInfo.extension.id, preRelease: deprecationInfo.extension.preRelease }], { targetPlatform: await this.getTargetPlatform(), compatible: true, productVersion }, CancellationToken.None))[0];
            if (!compatibleExtension) {
                throw new ExtensionManagementError(nls.localize('notFoundDeprecatedReplacementExtension', "Can't install '{0}' extension since it was deprecated and the replacement extension '{1}' can't be found.", extension.identifier.id, deprecationInfo.extension.id), "Deprecated" /* ExtensionManagementErrorCode.Deprecated */);
            }
        }
        else {
            if (await this.canInstall(extension) !== true) {
                const targetPlatform = await this.getTargetPlatform();
                throw new ExtensionManagementError(nls.localize('incompatible platform', "The '{0}' extension is not available in {1} for the {2}.", extension.identifier.id, this.productService.nameLong, TargetPlatformToString(targetPlatform)), "IncompatibleTargetPlatform" /* ExtensionManagementErrorCode.IncompatibleTargetPlatform */);
            }
            compatibleExtension = await this.getCompatibleVersion(extension, sameVersion, installPreRelease, productVersion);
            if (!compatibleExtension) {
                const incompatibleApiProposalsMessages = [];
                if (!areApiProposalsCompatible(extension.properties.enabledApiProposals ?? [], incompatibleApiProposalsMessages)) {
                    throw new ExtensionManagementError(nls.localize('incompatibleAPI', "Can't install '{0}' extension. {1}", extension.displayName ?? extension.identifier.id, incompatibleApiProposalsMessages[0]), "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */);
                }
                /** If no compatible release version is found, check if the extension has a release version or not and throw relevant error */
                if (!installPreRelease && extension.properties.isPreReleaseVersion && (await this.galleryService.getExtensions([extension.identifier], CancellationToken.None))[0]) {
                    throw new ExtensionManagementError(nls.localize('notFoundReleaseExtension', "Can't install release version of '{0}' extension because it has no release version.", extension.displayName ?? extension.identifier.id), "ReleaseVersionNotFound" /* ExtensionManagementErrorCode.ReleaseVersionNotFound */);
                }
                throw new ExtensionManagementError(nls.localize('notFoundCompatibleDependency', "Can't install '{0}' extension because it is not compatible with the current version of {1} (version {2}).", extension.identifier.id, this.productService.nameLong, this.productService.version), "Incompatible" /* ExtensionManagementErrorCode.Incompatible */);
            }
        }
        this.logService.info('Getting Manifest...', compatibleExtension.identifier.id);
        const manifest = await this.galleryService.getManifest(compatibleExtension, CancellationToken.None);
        if (manifest === null) {
            throw new ExtensionManagementError(`Missing manifest for extension ${compatibleExtension.identifier.id}`, "Invalid" /* ExtensionManagementErrorCode.Invalid */);
        }
        if (manifest.version !== compatibleExtension.version) {
            throw new ExtensionManagementError(`Cannot install '${compatibleExtension.identifier.id}' extension because of version mismatch in Marketplace`, "Invalid" /* ExtensionManagementErrorCode.Invalid */);
        }
        return { extension: compatibleExtension, manifest };
    }
    async getCompatibleVersion(extension, sameVersion, includePreRelease, productVersion) {
        const targetPlatform = await this.getTargetPlatform();
        let compatibleExtension = null;
        if (!sameVersion && extension.hasPreReleaseVersion && extension.properties.isPreReleaseVersion !== includePreRelease) {
            compatibleExtension = (await this.galleryService.getExtensions([{ ...extension.identifier, preRelease: includePreRelease }], { targetPlatform, compatible: true, productVersion }, CancellationToken.None))[0] || null;
        }
        if (!compatibleExtension && await this.galleryService.isExtensionCompatible(extension, includePreRelease, targetPlatform, productVersion)) {
            compatibleExtension = extension;
        }
        if (!compatibleExtension) {
            if (sameVersion) {
                compatibleExtension = (await this.galleryService.getExtensions([{ ...extension.identifier, version: extension.version }], { targetPlatform, compatible: true, productVersion }, CancellationToken.None))[0] || null;
            }
            else {
                compatibleExtension = await this.galleryService.getCompatibleExtension(extension, includePreRelease, targetPlatform, productVersion);
            }
        }
        return compatibleExtension;
    }
    async uninstallExtensions(extensions) {
        const getUninstallExtensionTaskKey = (extension, uninstallOptions) => `${extension.identifier.id.toLowerCase()}${uninstallOptions.versionOnly ? `-${extension.manifest.version}` : ''}@${uninstallOptions.profileLocation.toString()}`;
        const createUninstallExtensionTask = (extension, uninstallOptions) => {
            const uninstallExtensionTask = this.createUninstallExtensionTask(extension, uninstallOptions);
            this.uninstallingExtensions.set(getUninstallExtensionTaskKey(uninstallExtensionTask.extension, uninstallOptions), uninstallExtensionTask);
            this.logService.info('Uninstalling extension from the profile:', `${extension.identifier.id}@${extension.manifest.version}`, uninstallOptions.profileLocation.toString());
            this._onUninstallExtension.fire({ identifier: extension.identifier, profileLocation: uninstallOptions.profileLocation, applicationScoped: extension.isApplicationScoped });
            return uninstallExtensionTask;
        };
        const postUninstallExtension = (extension, uninstallOptions, error) => {
            if (error) {
                this.logService.error('Failed to uninstall extension from the profile:', `${extension.identifier.id}@${extension.manifest.version}`, uninstallOptions.profileLocation.toString(), error.message);
            }
            else {
                this.logService.info('Successfully uninstalled extension from the profile', `${extension.identifier.id}@${extension.manifest.version}`, uninstallOptions.profileLocation.toString());
            }
            reportTelemetry(this.telemetryService, 'extensionGallery:uninstall', { extensionData: getLocalExtensionTelemetryData(extension), error });
            this._onDidUninstallExtension.fire({ identifier: extension.identifier, error: error?.code, profileLocation: uninstallOptions.profileLocation, applicationScoped: extension.isApplicationScoped });
        };
        const allTasks = [];
        const processedTasks = [];
        const alreadyRequestedUninstalls = [];
        const extensionsToRemove = [];
        const installedExtensionsMap = new ResourceMap();
        const getInstalledExtensions = async (profileLocation) => {
            let installed = installedExtensionsMap.get(profileLocation);
            if (!installed) {
                installedExtensionsMap.set(profileLocation, installed = await this.getInstalled(1 /* ExtensionType.User */, profileLocation));
            }
            return installed;
        };
        for (const { extension, options } of extensions) {
            const uninstallOptions = {
                ...options,
                profileLocation: extension.isApplicationScoped ? this.userDataProfilesService.defaultProfile.extensionsResource : options?.profileLocation ?? this.getCurrentExtensionsManifestLocation()
            };
            const uninstallExtensionTask = this.uninstallingExtensions.get(getUninstallExtensionTaskKey(extension, uninstallOptions));
            if (uninstallExtensionTask) {
                this.logService.info('Extensions is already requested to uninstall', extension.identifier.id);
                alreadyRequestedUninstalls.push(uninstallExtensionTask.waitUntilTaskIsFinished());
            }
            else {
                allTasks.push(createUninstallExtensionTask(extension, uninstallOptions));
            }
            if (uninstallOptions.remove) {
                extensionsToRemove.push(extension);
                for (const profile of this.userDataProfilesService.profiles) {
                    if (this.uriIdentityService.extUri.isEqual(profile.extensionsResource, uninstallOptions.profileLocation)) {
                        continue;
                    }
                    const installed = await getInstalledExtensions(profile.extensionsResource);
                    const profileExtension = installed.find(e => areSameExtensions(e.identifier, extension.identifier));
                    if (profileExtension) {
                        const uninstallOptionsWithProfile = { ...uninstallOptions, profileLocation: profile.extensionsResource };
                        const uninstallExtensionTask = this.uninstallingExtensions.get(getUninstallExtensionTaskKey(profileExtension, uninstallOptionsWithProfile));
                        if (uninstallExtensionTask) {
                            this.logService.info('Extensions is already requested to uninstall', profileExtension.identifier.id);
                            alreadyRequestedUninstalls.push(uninstallExtensionTask.waitUntilTaskIsFinished());
                        }
                        else {
                            allTasks.push(createUninstallExtensionTask(profileExtension, uninstallOptionsWithProfile));
                        }
                    }
                }
            }
        }
        try {
            for (const task of allTasks.slice(0)) {
                const installed = await getInstalledExtensions(task.options.profileLocation);
                if (task.options.donotIncludePack) {
                    this.logService.info('Uninstalling the extension without including packed extension', `${task.extension.identifier.id}@${task.extension.manifest.version}`);
                }
                else {
                    const packedExtensions = this.getAllPackExtensionsToUninstall(task.extension, installed);
                    for (const packedExtension of packedExtensions) {
                        if (this.uninstallingExtensions.has(getUninstallExtensionTaskKey(packedExtension, task.options))) {
                            this.logService.info('Extensions is already requested to uninstall', packedExtension.identifier.id);
                        }
                        else {
                            allTasks.push(createUninstallExtensionTask(packedExtension, task.options));
                        }
                    }
                }
                if (task.options.donotCheckDependents) {
                    this.logService.info('Uninstalling the extension without checking dependents', `${task.extension.identifier.id}@${task.extension.manifest.version}`);
                }
                else {
                    this.checkForDependents(allTasks.map(task => task.extension), installed, task.extension);
                }
            }
            // Uninstall extensions in parallel and wait until all extensions are uninstalled / failed
            await this.joinAllSettled(allTasks.map(async (task) => {
                try {
                    await task.run();
                    await this.joinAllSettled(this.participants.map(participant => participant.postUninstall(task.extension, task.options, CancellationToken.None)));
                    // only report if extension has a mapped gallery extension. UUID identifies the gallery extension.
                    if (task.extension.identifier.uuid) {
                        try {
                            await this.galleryService.reportStatistic(task.extension.manifest.publisher, task.extension.manifest.name, task.extension.manifest.version, "uninstall" /* StatisticType.Uninstall */);
                        }
                        catch (error) { /* ignore */ }
                    }
                }
                catch (e) {
                    const error = toExtensionManagementError(e);
                    postUninstallExtension(task.extension, task.options, error);
                    throw error;
                }
                finally {
                    processedTasks.push(task);
                }
            }));
            if (alreadyRequestedUninstalls.length) {
                await this.joinAllSettled(alreadyRequestedUninstalls);
            }
            for (const task of allTasks) {
                postUninstallExtension(task.extension, task.options);
            }
            if (extensionsToRemove.length) {
                await this.joinAllSettled(extensionsToRemove.map(extension => this.removeExtension(extension)));
            }
        }
        catch (e) {
            const error = toExtensionManagementError(e);
            for (const task of allTasks) {
                // cancel the tasks
                try {
                    task.cancel();
                }
                catch (error) { /* ignore */ }
                if (!processedTasks.includes(task)) {
                    postUninstallExtension(task.extension, task.options, error);
                }
            }
            throw error;
        }
        finally {
            // Remove tasks from cache
            for (const task of allTasks) {
                if (!this.uninstallingExtensions.delete(getUninstallExtensionTaskKey(task.extension, task.options))) {
                    this.logService.warn('Uninstallation task is not found in the cache', task.extension.identifier.id);
                }
            }
        }
    }
    checkForDependents(extensionsToUninstall, installed, extensionToUninstall) {
        for (const extension of extensionsToUninstall) {
            const dependents = this.getDependents(extension, installed);
            if (dependents.length) {
                const remainingDependents = dependents.filter(dependent => !extensionsToUninstall.some(e => areSameExtensions(e.identifier, dependent.identifier)));
                if (remainingDependents.length) {
                    throw new Error(this.getDependentsErrorMessage(extension, remainingDependents, extensionToUninstall));
                }
            }
        }
    }
    getDependentsErrorMessage(dependingExtension, dependents, extensionToUninstall) {
        if (extensionToUninstall === dependingExtension) {
            if (dependents.length === 1) {
                return nls.localize('singleDependentError', "Cannot uninstall '{0}' extension. '{1}' extension depends on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name);
            }
            if (dependents.length === 2) {
                return nls.localize('twoDependentsError', "Cannot uninstall '{0}' extension. '{1}' and '{2}' extensions depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
            }
            return nls.localize('multipleDependentsError', "Cannot uninstall '{0}' extension. '{1}', '{2}' and other extension depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
        }
        if (dependents.length === 1) {
            return nls.localize('singleIndirectDependentError', "Cannot uninstall '{0}' extension . It includes uninstalling '{1}' extension and '{2}' extension depends on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependingExtension.manifest.displayName
                || dependingExtension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name);
        }
        if (dependents.length === 2) {
            return nls.localize('twoIndirectDependentsError', "Cannot uninstall '{0}' extension. It includes uninstalling '{1}' extension and '{2}' and '{3}' extensions depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependingExtension.manifest.displayName
                || dependingExtension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
        }
        return nls.localize('multipleIndirectDependentsError', "Cannot uninstall '{0}' extension. It includes uninstalling '{1}' extension and '{2}', '{3}' and other extensions depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependingExtension.manifest.displayName
            || dependingExtension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
    }
    getAllPackExtensionsToUninstall(extension, installed, checked = []) {
        if (checked.indexOf(extension) !== -1) {
            return [];
        }
        checked.push(extension);
        const extensionsPack = extension.manifest.extensionPack ? extension.manifest.extensionPack : [];
        if (extensionsPack.length) {
            const packedExtensions = installed.filter(i => !i.isBuiltin && extensionsPack.some(id => areSameExtensions({ id }, i.identifier)));
            const packOfPackedExtensions = [];
            for (const packedExtension of packedExtensions) {
                packOfPackedExtensions.push(...this.getAllPackExtensionsToUninstall(packedExtension, installed, checked));
            }
            return [...packedExtensions, ...packOfPackedExtensions];
        }
        return [];
    }
    getDependents(extension, installed) {
        return installed.filter(e => e.manifest.extensionDependencies && e.manifest.extensionDependencies.some(id => areSameExtensions({ id }, extension.identifier)));
    }
    async updateControlCache() {
        try {
            this.logService.trace('ExtensionManagementService.updateControlCache');
            return await this.galleryService.getExtensionsControlManifest();
        }
        catch (err) {
            this.logService.trace('ExtensionManagementService.refreshControlCache - failed to get extension control manifest', getErrorMessage(err));
            return { malicious: [], deprecated: {}, search: [] };
        }
    }
};
AbstractExtensionManagementService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ITelemetryService),
    __param(2, IUriIdentityService),
    __param(3, ILogService),
    __param(4, IProductService),
    __param(5, IAllowedExtensionsService),
    __param(6, IUserDataProfilesService)
], AbstractExtensionManagementService);
export { AbstractExtensionManagementService };
export function toExtensionManagementError(error, code) {
    if (error instanceof ExtensionManagementError) {
        return error;
    }
    let extensionManagementError;
    if (error instanceof ExtensionGalleryError) {
        extensionManagementError = new ExtensionManagementError(error.message, error.code === "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */ ? "DownloadFailedWriting" /* ExtensionManagementErrorCode.DownloadFailedWriting */ : "Gallery" /* ExtensionManagementErrorCode.Gallery */);
    }
    else {
        extensionManagementError = new ExtensionManagementError(error.message, isCancellationError(error) ? "Cancelled" /* ExtensionManagementErrorCode.Cancelled */ : (code ?? "Internal" /* ExtensionManagementErrorCode.Internal */));
    }
    extensionManagementError.stack = error.stack;
    return extensionManagementError;
}
function reportTelemetry(telemetryService, eventName, { extensionData, verificationStatus, duration, error, source, durationSinceUpdate }) {
    /* __GDPR__
        "extensionGallery:install" : {
            "owner": "sandy081",
            "success": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "durationSinceUpdate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "errorcode": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "recommendationReason": { "retiredFromVersion": "1.23.0", "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "verificationStatus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
    */
    /* __GDPR__
        "extensionGallery:uninstall" : {
            "owner": "sandy081",
            "success": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "errorcode": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
    */
    /* __GDPR__
        "extensionGallery:update" : {
            "owner": "sandy081",
            "success": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "errorcode": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "verificationStatus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
    */
    telemetryService.publicLog(eventName, {
        ...extensionData,
        source,
        duration,
        durationSinceUpdate,
        success: !error,
        errorcode: error?.code,
        verificationStatus: verificationStatus === ExtensionSignatureVerificationCode.Success ? 'Verified' : (verificationStatus ?? 'Unverified')
    });
}
export class AbstractExtensionTask {
    constructor() {
        this.barrier = new Barrier();
    }
    async waitUntilTaskIsFinished() {
        await this.barrier.wait();
        return this.cancellablePromise;
    }
    run() {
        if (!this.cancellablePromise) {
            this.cancellablePromise = createCancelablePromise(token => this.doRun(token));
        }
        this.barrier.open();
        return this.cancellablePromise;
    }
    cancel() {
        if (!this.cancellablePromise) {
            this.cancellablePromise = createCancelablePromise(token => {
                return new Promise((c, e) => {
                    const disposable = token.onCancellationRequested(() => {
                        disposable.dispose();
                        e(new CancellationError());
                    });
                });
            });
            this.barrier.open();
        }
        this.cancellablePromise.cancel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9hYnN0cmFjdEV4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUNOLHdCQUF3QixFQUFFLHdCQUF3QixFQUNQLDBCQUEwQixFQUFFLHNCQUFzQixFQUNzRyxrQ0FBa0MsRUFBRSxxQkFBcUIsRUFFNVAsZ0NBQWdDLEVBR2hDLGtDQUFrQyxFQUNsQyx5QkFBeUIsRUFDekIs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