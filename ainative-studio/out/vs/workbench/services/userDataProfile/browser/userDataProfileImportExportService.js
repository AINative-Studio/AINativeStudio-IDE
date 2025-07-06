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
import './media/userDataProfileView.css';
import { localize } from '../../../../nls.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { IUserDataProfileImportExportService, PROFILE_FILTER, PROFILE_EXTENSION, IUserDataProfileService, PROFILES_CATEGORY, IUserDataProfileManagementService, PROFILE_URL_AUTHORITY, toUserDataProfileUri, isProfileURL, PROFILE_URL_AUTHORITY_PREFIX } from '../common/userDataProfile.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { SettingsResource, SettingsResourceTreeItem } from './settingsResource.js';
import { KeybindingsResource, KeybindingsResourceTreeItem } from './keybindingsResource.js';
import { SnippetsResource, SnippetsResourceTreeItem } from './snippetsResource.js';
import { TasksResource, TasksResourceTreeItem } from './tasksResource.js';
import { ExtensionsResource, ExtensionsResourceExportTreeItem, ExtensionsResourceTreeItem } from './extensionsResource.js';
import { GlobalStateResource, GlobalStateResourceExportTreeItem, GlobalStateResourceTreeItem } from './globalStateResource.js';
import { InMemoryFileSystemProvider } from '../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { Schemas } from '../../../../base/common/network.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import Severity from '../../../../base/common/severity.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { isUndefined } from '../../../../base/common/types.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
function isUserDataProfileTemplate(thing) {
    const candidate = thing;
    return !!(candidate && typeof candidate === 'object'
        && (candidate.name && typeof candidate.name === 'string')
        && (isUndefined(candidate.icon) || typeof candidate.icon === 'string')
        && (isUndefined(candidate.settings) || typeof candidate.settings === 'string')
        && (isUndefined(candidate.globalState) || typeof candidate.globalState === 'string')
        && (isUndefined(candidate.extensions) || typeof candidate.extensions === 'string'));
}
let UserDataProfileImportExportService = class UserDataProfileImportExportService extends Disposable {
    constructor(instantiationService, userDataProfileService, userDataProfileManagementService, userDataProfilesService, extensionService, quickInputService, progressService, dialogService, clipboardService, openerService, requestService, productService, uriIdentityService) {
        super();
        this.instantiationService = instantiationService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionService = extensionService;
        this.quickInputService = quickInputService;
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.clipboardService = clipboardService;
        this.openerService = openerService;
        this.requestService = requestService;
        this.productService = productService;
        this.uriIdentityService = uriIdentityService;
        this.profileContentHandlers = new Map();
        this.registerProfileContentHandler(Schemas.file, this.fileUserDataProfileContentHandler = instantiationService.createInstance(FileUserDataProfileContentHandler));
    }
    registerProfileContentHandler(id, profileContentHandler) {
        if (this.profileContentHandlers.has(id)) {
            throw new Error(`Profile content handler with id '${id}' already registered.`);
        }
        this.profileContentHandlers.set(id, profileContentHandler);
        return toDisposable(() => this.unregisterProfileContentHandler(id));
    }
    unregisterProfileContentHandler(id) {
        this.profileContentHandlers.delete(id);
    }
    async createFromProfile(from, options, token) {
        const disposables = new DisposableStore();
        let creationPromise;
        disposables.add(token.onCancellationRequested(() => creationPromise.cancel()));
        let profile;
        return this.progressService.withProgress({
            location: 15 /* ProgressLocation.Notification */,
            delay: 500,
            sticky: true,
            cancellable: true,
        }, async (progress) => {
            const reportProgress = (message) => progress.report({ message: localize('create from profile', "Create Profile: {0}", message) });
            creationPromise = createCancelablePromise(async (token) => {
                const userDataProfilesExportState = disposables.add(this.instantiationService.createInstance(UserDataProfileExportState, from, { ...options?.resourceTypeFlags, extensions: false }));
                const profileTemplate = await userDataProfilesExportState.getProfileTemplate(options.name ?? from.name, options?.icon);
                profile = await this.getProfileToImport({ ...profileTemplate, name: options.name ?? profileTemplate.name }, !!options.transient, options);
                if (!profile) {
                    return;
                }
                if (token.isCancellationRequested) {
                    return;
                }
                await this.applyProfileTemplate(profileTemplate, profile, options, reportProgress, token);
            });
            try {
                await creationPromise;
                if (profile && (options?.resourceTypeFlags?.extensions ?? true)) {
                    reportProgress(localize('installing extensions', "Installing Extensions..."));
                    await this.instantiationService.createInstance(ExtensionsResource).copy(from, profile, false);
                }
            }
            catch (error) {
                if (profile) {
                    await this.userDataProfilesService.removeProfile(profile);
                    profile = undefined;
                }
            }
            return profile;
        }, () => creationPromise.cancel()).finally(() => disposables.dispose());
    }
    async createProfileFromTemplate(profileTemplate, options, token) {
        const disposables = new DisposableStore();
        let creationPromise;
        disposables.add(token.onCancellationRequested(() => creationPromise.cancel()));
        let profile;
        return this.progressService.withProgress({
            location: 15 /* ProgressLocation.Notification */,
            delay: 500,
            sticky: true,
            cancellable: true,
        }, async (progress) => {
            const reportProgress = (message) => progress.report({ message: localize('create from profile', "Create Profile: {0}", message) });
            creationPromise = createCancelablePromise(async (token) => {
                profile = await this.getProfileToImport({ ...profileTemplate, name: options.name ?? profileTemplate.name }, !!options.transient, options);
                if (!profile) {
                    return;
                }
                if (token.isCancellationRequested) {
                    return;
                }
                await this.applyProfileTemplate(profileTemplate, profile, options, reportProgress, token);
            });
            try {
                await creationPromise;
            }
            catch (error) {
                if (profile) {
                    await this.userDataProfilesService.removeProfile(profile);
                    profile = undefined;
                }
            }
            return profile;
        }, () => creationPromise.cancel()).finally(() => disposables.dispose());
    }
    async applyProfileTemplate(profileTemplate, profile, options, reportProgress, token) {
        if (profileTemplate.settings && (options.resourceTypeFlags?.settings ?? true) && !profile.useDefaultFlags?.settings) {
            reportProgress(localize('creating settings', "Creating Settings..."));
            await this.instantiationService.createInstance(SettingsResource).apply(profileTemplate.settings, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.keybindings && (options.resourceTypeFlags?.keybindings ?? true) && !profile.useDefaultFlags?.keybindings) {
            reportProgress(localize('create keybindings', "Creating Keyboard Shortcuts..."));
            await this.instantiationService.createInstance(KeybindingsResource).apply(profileTemplate.keybindings, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.tasks && (options.resourceTypeFlags?.tasks ?? true) && !profile.useDefaultFlags?.tasks) {
            reportProgress(localize('create tasks', "Creating Tasks..."));
            await this.instantiationService.createInstance(TasksResource).apply(profileTemplate.tasks, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.snippets && (options.resourceTypeFlags?.snippets ?? true) && !profile.useDefaultFlags?.snippets) {
            reportProgress(localize('create snippets', "Creating Snippets..."));
            await this.instantiationService.createInstance(SnippetsResource).apply(profileTemplate.snippets, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.globalState && !profile.useDefaultFlags?.globalState) {
            reportProgress(localize('applying global state', "Applying UI State..."));
            await this.instantiationService.createInstance(GlobalStateResource).apply(profileTemplate.globalState, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.extensions && (options.resourceTypeFlags?.extensions ?? true) && !profile.useDefaultFlags?.extensions) {
            reportProgress(localize('installing extensions', "Installing Extensions..."));
            await this.instantiationService.createInstance(ExtensionsResource).apply(profileTemplate.extensions, profile, reportProgress, token);
        }
    }
    async exportProfile(profile, exportFlags) {
        const disposables = new DisposableStore();
        try {
            const userDataProfilesExportState = disposables.add(this.instantiationService.createInstance(UserDataProfileExportState, profile, exportFlags));
            await this.doExportProfile(userDataProfilesExportState, 15 /* ProgressLocation.Notification */);
        }
        finally {
            disposables.dispose();
        }
    }
    async createTroubleshootProfile() {
        const userDataProfilesExportState = this.instantiationService.createInstance(UserDataProfileExportState, this.userDataProfileService.currentProfile, undefined);
        try {
            const profileTemplate = await userDataProfilesExportState.getProfileTemplate(localize('troubleshoot issue', "Troubleshoot Issue"), undefined);
            await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                delay: 1000,
                sticky: true,
            }, async (progress) => {
                const reportProgress = (message) => progress.report({ message: localize('troubleshoot profile progress', "Setting up Troubleshoot Profile: {0}", message) });
                const profile = await this.doCreateProfile(profileTemplate, true, false, { useDefaultFlags: this.userDataProfileService.currentProfile.useDefaultFlags }, reportProgress);
                if (profile) {
                    reportProgress(localize('progress extensions', "Applying Extensions..."));
                    await this.instantiationService.createInstance(ExtensionsResource).copy(this.userDataProfileService.currentProfile, profile, true);
                    reportProgress(localize('switching profile', "Switching Profile..."));
                    await this.userDataProfileManagementService.switchProfile(profile);
                }
            });
        }
        finally {
            userDataProfilesExportState.dispose();
        }
    }
    async doExportProfile(userDataProfilesExportState, location) {
        const profile = await userDataProfilesExportState.getProfileToExport();
        if (!profile) {
            return;
        }
        const disposables = new DisposableStore();
        try {
            await this.progressService.withProgress({
                location,
                title: localize('profiles.exporting', "{0}: Exporting...", PROFILES_CATEGORY.value),
            }, async (progress) => {
                const id = await this.pickProfileContentHandler(profile.name);
                if (!id) {
                    return;
                }
                const profileContentHandler = this.profileContentHandlers.get(id);
                if (!profileContentHandler) {
                    return;
                }
                const saveResult = await profileContentHandler.saveProfile(profile.name.replace('/', '-'), JSON.stringify(profile), CancellationToken.None);
                if (!saveResult) {
                    return;
                }
                const message = localize('export success', "Profile '{0}' was exported successfully.", profile.name);
                if (profileContentHandler.extensionId) {
                    const buttons = [];
                    const link = this.productService.webUrl ? `${this.productService.webUrl}/${PROFILE_URL_AUTHORITY}/${id}/${saveResult.id}` : toUserDataProfileUri(`/${id}/${saveResult.id}`, this.productService).toString();
                    buttons.push({
                        label: localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, "&&Copy Link"),
                        run: () => this.clipboardService.writeText(link)
                    });
                    if (this.productService.webUrl) {
                        buttons.push({
                            label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, "&&Open Link"),
                            run: async () => {
                                await this.openerService.open(link);
                            }
                        });
                    }
                    else {
                        buttons.push({
                            label: localize({ key: 'open in', comment: ['&& denotes a mnemonic'] }, "&&Open in {0}", profileContentHandler.name),
                            run: async () => {
                                await this.openerService.open(saveResult.link.toString());
                            }
                        });
                    }
                    await this.dialogService.prompt({
                        type: Severity.Info,
                        message,
                        buttons,
                        cancelButton: localize('close', "Close")
                    });
                }
                else {
                    await this.dialogService.info(message);
                }
            });
        }
        finally {
            disposables.dispose();
        }
    }
    async resolveProfileTemplate(uri, options) {
        const profileContent = await this.resolveProfileContent(uri);
        if (profileContent === null) {
            return null;
        }
        let profileTemplate;
        try {
            profileTemplate = JSON.parse(profileContent);
        }
        catch (error) {
            throw new Error(localize('invalid profile content', "This profile is not valid."));
        }
        if (!isUserDataProfileTemplate(profileTemplate)) {
            throw new Error(localize('invalid profile content', "This profile is not valid."));
        }
        if (options?.name) {
            profileTemplate.name = options.name;
        }
        if (options?.icon) {
            profileTemplate.icon = options.icon;
        }
        if (options?.resourceTypeFlags?.settings === false) {
            profileTemplate.settings = undefined;
        }
        if (options?.resourceTypeFlags?.keybindings === false) {
            profileTemplate.keybindings = undefined;
        }
        if (options?.resourceTypeFlags?.snippets === false) {
            profileTemplate.snippets = undefined;
        }
        if (options?.resourceTypeFlags?.tasks === false) {
            profileTemplate.tasks = undefined;
        }
        if (options?.resourceTypeFlags?.globalState === false) {
            profileTemplate.globalState = undefined;
        }
        if (options?.resourceTypeFlags?.extensions === false) {
            profileTemplate.extensions = undefined;
        }
        return profileTemplate;
    }
    async doCreateProfile(profileTemplate, temporaryProfile, extensions, options, progress) {
        const profile = await this.getProfileToImport(profileTemplate, temporaryProfile, options);
        if (!profile) {
            return undefined;
        }
        if (profileTemplate.settings && !profile.useDefaultFlags?.settings) {
            progress(localize('progress settings', "Applying Settings..."));
            await this.instantiationService.createInstance(SettingsResource).apply(profileTemplate.settings, profile);
        }
        if (profileTemplate.keybindings && !profile.useDefaultFlags?.keybindings) {
            progress(localize('progress keybindings', "Applying Keyboard Shortcuts..."));
            await this.instantiationService.createInstance(KeybindingsResource).apply(profileTemplate.keybindings, profile);
        }
        if (profileTemplate.tasks && !profile.useDefaultFlags?.tasks) {
            progress(localize('progress tasks', "Applying Tasks..."));
            await this.instantiationService.createInstance(TasksResource).apply(profileTemplate.tasks, profile);
        }
        if (profileTemplate.snippets && !profile.useDefaultFlags?.snippets) {
            progress(localize('progress snippets', "Applying Snippets..."));
            await this.instantiationService.createInstance(SnippetsResource).apply(profileTemplate.snippets, profile);
        }
        if (profileTemplate.globalState && !profile.useDefaultFlags?.globalState) {
            progress(localize('progress global state', "Applying State..."));
            await this.instantiationService.createInstance(GlobalStateResource).apply(profileTemplate.globalState, profile);
        }
        if (profileTemplate.extensions && extensions && !profile.useDefaultFlags?.extensions) {
            progress(localize('progress extensions', "Applying Extensions..."));
            await this.instantiationService.createInstance(ExtensionsResource).apply(profileTemplate.extensions, profile);
        }
        return profile;
    }
    async resolveProfileContent(resource) {
        if (await this.fileUserDataProfileContentHandler.canHandle(resource)) {
            return this.fileUserDataProfileContentHandler.readProfile(resource, CancellationToken.None);
        }
        if (isProfileURL(resource)) {
            let handlerId, idOrUri;
            if (resource.authority === PROFILE_URL_AUTHORITY) {
                idOrUri = this.uriIdentityService.extUri.basename(resource);
                handlerId = this.uriIdentityService.extUri.basename(this.uriIdentityService.extUri.dirname(resource));
            }
            else {
                handlerId = resource.authority.substring(PROFILE_URL_AUTHORITY_PREFIX.length);
                idOrUri = URI.parse(resource.path.substring(1));
            }
            await this.extensionService.activateByEvent(`onProfile:${handlerId}`);
            const profileContentHandler = this.profileContentHandlers.get(handlerId);
            if (profileContentHandler) {
                return profileContentHandler.readProfile(idOrUri, CancellationToken.None);
            }
        }
        await this.extensionService.activateByEvent('onProfile');
        for (const profileContentHandler of this.profileContentHandlers.values()) {
            const content = await profileContentHandler.readProfile(resource, CancellationToken.None);
            if (content !== null) {
                return content;
            }
        }
        const context = await this.requestService.request({ type: 'GET', url: resource.toString(true) }, CancellationToken.None);
        if (context.res.statusCode === 200) {
            return await asText(context);
        }
        else {
            const message = await asText(context);
            throw new Error(`Failed to get profile from URL: ${resource.toString()}. Status code: ${context.res.statusCode}. Message: ${message}`);
        }
    }
    async pickProfileContentHandler(name) {
        await this.extensionService.activateByEvent('onProfile');
        if (this.profileContentHandlers.size === 1) {
            return this.profileContentHandlers.keys().next().value;
        }
        const options = [];
        for (const [id, profileContentHandler] of this.profileContentHandlers) {
            options.push({ id, label: profileContentHandler.name, description: profileContentHandler.description });
        }
        const result = await this.quickInputService.pick(options.reverse(), {
            title: localize('select profile content handler', "Export '{0}' profile as...", name),
            hideInput: true
        });
        return result?.id;
    }
    async getProfileToImport(profileTemplate, temp, options) {
        const profileName = profileTemplate.name;
        const profile = this.userDataProfilesService.profiles.find(p => p.name === profileName);
        if (profile) {
            if (temp) {
                return this.userDataProfilesService.createNamedProfile(`${profileName} ${this.getProfileNameIndex(profileName)}`, { ...options, transient: temp });
            }
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Info,
                message: localize('profile already exists', "Profile with name '{0}' already exists. Do you want to replace its contents?", profileName),
                primaryButton: localize({ key: 'overwrite', comment: ['&& denotes a mnemonic'] }, "&&Replace")
            });
            if (!confirmed) {
                return undefined;
            }
            return profile.isDefault ? profile : this.userDataProfilesService.updateProfile(profile, options);
        }
        else {
            return this.userDataProfilesService.createNamedProfile(profileName, { ...options, transient: temp });
        }
    }
    getProfileNameIndex(name) {
        const nameRegEx = new RegExp(`${escapeRegExpCharacters(name)}\\s(\\d+)`);
        let nameIndex = 0;
        for (const profile of this.userDataProfilesService.profiles) {
            const matches = nameRegEx.exec(profile.name);
            const index = matches ? parseInt(matches[1]) : 0;
            nameIndex = index > nameIndex ? index : nameIndex;
        }
        return nameIndex + 1;
    }
};
UserDataProfileImportExportService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IUserDataProfileService),
    __param(2, IUserDataProfileManagementService),
    __param(3, IUserDataProfilesService),
    __param(4, IExtensionService),
    __param(5, IQuickInputService),
    __param(6, IProgressService),
    __param(7, IDialogService),
    __param(8, IClipboardService),
    __param(9, IOpenerService),
    __param(10, IRequestService),
    __param(11, IProductService),
    __param(12, IUriIdentityService)
], UserDataProfileImportExportService);
export { UserDataProfileImportExportService };
let FileUserDataProfileContentHandler = class FileUserDataProfileContentHandler {
    constructor(fileDialogService, uriIdentityService, fileService, productService, textFileService) {
        this.fileDialogService = fileDialogService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.productService = productService;
        this.textFileService = textFileService;
        this.name = localize('local', "Local");
        this.description = localize('file', "file");
    }
    async saveProfile(name, content, token) {
        const link = await this.fileDialogService.showSaveDialog({
            title: localize('export profile dialog', "Save Profile"),
            filters: PROFILE_FILTER,
            defaultUri: this.uriIdentityService.extUri.joinPath(await this.fileDialogService.defaultFilePath(), `${name}.${PROFILE_EXTENSION}`),
        });
        if (!link) {
            return null;
        }
        await this.textFileService.create([{ resource: link, value: content, options: { overwrite: true } }]);
        return { link, id: link.toString() };
    }
    async canHandle(uri) {
        return uri.scheme !== Schemas.http && uri.scheme !== Schemas.https && uri.scheme !== this.productService.urlProtocol && await this.fileService.canHandleResource(uri);
    }
    async readProfile(uri, token) {
        if (await this.canHandle(uri)) {
            return (await this.fileService.readFile(uri, undefined, token)).value.toString();
        }
        return null;
    }
    async selectProfile() {
        const profileLocation = await this.fileDialogService.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: PROFILE_FILTER,
            title: localize('select profile', "Select Profile"),
        });
        return profileLocation ? profileLocation[0] : null;
    }
};
FileUserDataProfileContentHandler = __decorate([
    __param(0, IFileDialogService),
    __param(1, IUriIdentityService),
    __param(2, IFileService),
    __param(3, IProductService),
    __param(4, ITextFileService)
], FileUserDataProfileContentHandler);
const USER_DATA_PROFILE_EXPORT_SCHEME = 'userdataprofileexport';
const USER_DATA_PROFILE_EXPORT_PREVIEW_SCHEME = 'userdataprofileexportpreview';
let UserDataProfileImportExportState = class UserDataProfileImportExportState extends Disposable {
    constructor(quickInputService) {
        super();
        this.quickInputService = quickInputService;
        this._onDidChangeRoots = this._register(new Emitter());
        this.onDidChangeRoots = this._onDidChangeRoots.event;
        this.roots = [];
    }
    async getChildren(element) {
        if (element) {
            const children = await element.getChildren();
            if (children) {
                for (const child of children) {
                    if (child.parent.checkbox && child.checkbox) {
                        child.checkbox.isChecked = child.parent.checkbox.isChecked && child.checkbox.isChecked;
                    }
                }
            }
            return children;
        }
        else {
            this.rootsPromise = undefined;
            this._onDidChangeRoots.fire();
            return this.getRoots();
        }
    }
    getRoots() {
        if (!this.rootsPromise) {
            this.rootsPromise = (async () => {
                this.roots = await this.fetchRoots();
                for (const root of this.roots) {
                    root.checkbox = {
                        isChecked: !root.isFromDefaultProfile(),
                        tooltip: localize('select', "Select {0}", root.label.label),
                        accessibilityInformation: {
                            label: localize('select', "Select {0}", root.label.label),
                        }
                    };
                    if (root.isFromDefaultProfile()) {
                        root.description = localize('from default', "From Default Profile");
                    }
                }
                return this.roots;
            })();
        }
        return this.rootsPromise;
    }
    isEnabled(resourceType) {
        if (resourceType !== undefined) {
            return this.roots.some(root => root.type === resourceType && this.isSelected(root));
        }
        return this.roots.some(root => this.isSelected(root));
    }
    async getProfileTemplate(name, icon) {
        const roots = await this.getRoots();
        let settings;
        let keybindings;
        let tasks;
        let snippets;
        let extensions;
        let globalState;
        for (const root of roots) {
            if (!this.isSelected(root)) {
                continue;
            }
            if (root instanceof SettingsResourceTreeItem) {
                settings = await root.getContent();
            }
            else if (root instanceof KeybindingsResourceTreeItem) {
                keybindings = await root.getContent();
            }
            else if (root instanceof TasksResourceTreeItem) {
                tasks = await root.getContent();
            }
            else if (root instanceof SnippetsResourceTreeItem) {
                snippets = await root.getContent();
            }
            else if (root instanceof ExtensionsResourceTreeItem) {
                extensions = await root.getContent();
            }
            else if (root instanceof GlobalStateResourceTreeItem) {
                globalState = await root.getContent();
            }
        }
        return {
            name,
            icon,
            settings,
            keybindings,
            tasks,
            snippets,
            extensions,
            globalState
        };
    }
    isSelected(treeItem) {
        if (treeItem.checkbox) {
            return treeItem.checkbox.isChecked || !!treeItem.children?.some(child => child.checkbox?.isChecked);
        }
        return true;
    }
};
UserDataProfileImportExportState = __decorate([
    __param(0, IQuickInputService)
], UserDataProfileImportExportState);
let UserDataProfileExportState = class UserDataProfileExportState extends UserDataProfileImportExportState {
    constructor(profile, exportFlags, quickInputService, fileService, instantiationService) {
        super(quickInputService);
        this.profile = profile;
        this.exportFlags = exportFlags;
        this.fileService = fileService;
        this.instantiationService = instantiationService;
        this.disposables = this._register(new DisposableStore());
    }
    async fetchRoots() {
        this.disposables.clear();
        this.disposables.add(this.fileService.registerProvider(USER_DATA_PROFILE_EXPORT_SCHEME, this._register(new InMemoryFileSystemProvider())));
        const previewFileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this.disposables.add(this.fileService.registerProvider(USER_DATA_PROFILE_EXPORT_PREVIEW_SCHEME, previewFileSystemProvider));
        const roots = [];
        const exportPreviewProfle = this.createExportPreviewProfile(this.profile);
        if (this.exportFlags?.settings ?? true) {
            const settingsResource = this.instantiationService.createInstance(SettingsResource);
            const settingsContent = await settingsResource.getContent(this.profile);
            await settingsResource.apply(settingsContent, exportPreviewProfle);
            const settingsResourceTreeItem = this.instantiationService.createInstance(SettingsResourceTreeItem, exportPreviewProfle);
            if (await settingsResourceTreeItem.hasContent()) {
                roots.push(settingsResourceTreeItem);
            }
        }
        if (this.exportFlags?.keybindings ?? true) {
            const keybindingsResource = this.instantiationService.createInstance(KeybindingsResource);
            const keybindingsContent = await keybindingsResource.getContent(this.profile);
            await keybindingsResource.apply(keybindingsContent, exportPreviewProfle);
            const keybindingsResourceTreeItem = this.instantiationService.createInstance(KeybindingsResourceTreeItem, exportPreviewProfle);
            if (await keybindingsResourceTreeItem.hasContent()) {
                roots.push(keybindingsResourceTreeItem);
            }
        }
        if (this.exportFlags?.snippets ?? true) {
            const snippetsResource = this.instantiationService.createInstance(SnippetsResource);
            const snippetsContent = await snippetsResource.getContent(this.profile);
            await snippetsResource.apply(snippetsContent, exportPreviewProfle);
            const snippetsResourceTreeItem = this.instantiationService.createInstance(SnippetsResourceTreeItem, exportPreviewProfle);
            if (await snippetsResourceTreeItem.hasContent()) {
                roots.push(snippetsResourceTreeItem);
            }
        }
        if (this.exportFlags?.tasks ?? true) {
            const tasksResource = this.instantiationService.createInstance(TasksResource);
            const tasksContent = await tasksResource.getContent(this.profile);
            await tasksResource.apply(tasksContent, exportPreviewProfle);
            const tasksResourceTreeItem = this.instantiationService.createInstance(TasksResourceTreeItem, exportPreviewProfle);
            if (await tasksResourceTreeItem.hasContent()) {
                roots.push(tasksResourceTreeItem);
            }
        }
        if (this.exportFlags?.globalState ?? true) {
            const globalStateResource = joinPath(exportPreviewProfle.globalStorageHome, 'globalState.json').with({ scheme: USER_DATA_PROFILE_EXPORT_PREVIEW_SCHEME });
            const globalStateResourceTreeItem = this.instantiationService.createInstance(GlobalStateResourceExportTreeItem, exportPreviewProfle, globalStateResource);
            const content = await globalStateResourceTreeItem.getContent();
            if (content) {
                await this.fileService.writeFile(globalStateResource, VSBuffer.fromString(JSON.stringify(JSON.parse(content), null, '\t')));
                roots.push(globalStateResourceTreeItem);
            }
        }
        if (this.exportFlags?.extensions ?? true) {
            const extensionsResourceTreeItem = this.instantiationService.createInstance(ExtensionsResourceExportTreeItem, exportPreviewProfle);
            if (await extensionsResourceTreeItem.hasContent()) {
                roots.push(extensionsResourceTreeItem);
            }
        }
        previewFileSystemProvider.setReadOnly(true);
        return roots;
    }
    createExportPreviewProfile(profile) {
        return {
            id: profile.id,
            name: profile.name,
            location: profile.location,
            isDefault: profile.isDefault,
            icon: profile.icon,
            globalStorageHome: profile.globalStorageHome,
            settingsResource: profile.settingsResource.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            keybindingsResource: profile.keybindingsResource.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            tasksResource: profile.tasksResource.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            snippetsHome: profile.snippetsHome.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            promptsHome: profile.promptsHome.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            extensionsResource: profile.extensionsResource,
            cacheHome: profile.cacheHome,
            useDefaultFlags: profile.useDefaultFlags,
            isTransient: profile.isTransient
        };
    }
    async getProfileToExport() {
        let name = this.profile.name;
        if (this.profile.isDefault) {
            name = await this.quickInputService.input({
                placeHolder: localize('export profile name', "Name the profile"),
                title: localize('export profile title', "Export Profile"),
                async validateInput(input) {
                    if (!input.trim()) {
                        return localize('profile name required', "Profile name must be provided.");
                    }
                    return undefined;
                },
            });
            if (!name) {
                return null;
            }
        }
        return super.getProfileTemplate(name, this.profile.icon);
    }
};
UserDataProfileExportState = __decorate([
    __param(2, IQuickInputService),
    __param(3, IFileService),
    __param(4, IInstantiationService)
], UserDataProfileExportState);
registerSingleton(IUserDataProfileImportExportService, UserDataProfileImportExportService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSW1wb3J0RXhwb3J0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVJbXBvcnRFeHBvcnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBa0MsdUJBQXVCLEVBQTRCLGlCQUFpQixFQUFFLGlDQUFpQyxFQUE2QyxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBaUMsWUFBWSxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbGEsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBaUIsTUFBTSxnREFBZ0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxF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