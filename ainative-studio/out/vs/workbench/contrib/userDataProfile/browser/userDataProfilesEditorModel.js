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
var UserDataProfilesEditorModel_1;
import { Action, Separator, toAction } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isUserDataProfile, IUserDataProfilesService, toUserDataProfile } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { isProfileURL, IUserDataProfileImportExportService, IUserDataProfileManagementService, IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import * as arrays from '../../../../base/common/arrays.js';
import { equals } from '../../../../base/common/objects.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { ExtensionsResourceExportTreeItem, ExtensionsResourceImportTreeItem } from '../../../services/userDataProfile/browser/extensionsResource.js';
import { SettingsResource, SettingsResourceTreeItem } from '../../../services/userDataProfile/browser/settingsResource.js';
import { KeybindingsResource, KeybindingsResourceTreeItem } from '../../../services/userDataProfile/browser/keybindingsResource.js';
import { TasksResource, TasksResourceTreeItem } from '../../../services/userDataProfile/browser/tasksResource.js';
import { SnippetsResource, SnippetsResourceTreeItem } from '../../../services/userDataProfile/browser/snippetsResource.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { InMemoryFileSystemProvider } from '../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { createCancelablePromise, RunOnceScheduler } from '../../../../base/common/async.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { CONFIG_NEW_WINDOW_PROFILE } from '../../../common/configuration.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IWorkspaceContextService, WORKSPACE_SUFFIX } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isString } from '../../../../base/common/types.js';
import { IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
export function isProfileResourceTypeElement(element) {
    return element.resourceType !== undefined;
}
export function isProfileResourceChildElement(element) {
    return element.label !== undefined;
}
let AbstractUserDataProfileElement = class AbstractUserDataProfileElement extends Disposable {
    constructor(name, icon, flags, workspaces, isActive, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService) {
        super();
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfilesService = userDataProfilesService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.hostService = hostService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.extensionManagementService = extensionManagementService;
        this.instantiationService = instantiationService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.saveScheduler = this._register(new RunOnceScheduler(() => this.doSave(), 500));
        this._name = '';
        this._active = false;
        this._disabled = false;
        this._name = name;
        this._icon = icon;
        this._flags = flags;
        this._workspaces = workspaces;
        this._active = isActive;
        this._register(this.onDidChange(e => {
            if (!e.message) {
                this.validate();
            }
            this.save();
        }));
        this._register(this.extensionManagementService.onProfileAwareDidInstallExtensions(results => {
            const profile = this.getProfileToWatch();
            if (profile && results.some(r => !r.error && (r.applicationScoped || this.uriIdentityService.extUri.isEqual(r.profileLocation, profile.extensionsResource)))) {
                this._onDidChange.fire({ extensions: true });
            }
        }));
        this._register(this.extensionManagementService.onProfileAwareDidUninstallExtension(e => {
            const profile = this.getProfileToWatch();
            if (profile && !e.error && (e.applicationScoped || this.uriIdentityService.extUri.isEqual(e.profileLocation, profile.extensionsResource))) {
                this._onDidChange.fire({ extensions: true });
            }
        }));
        this._register(this.extensionManagementService.onProfileAwareDidUpdateExtensionMetadata(e => {
            const profile = this.getProfileToWatch();
            if (profile && e.local.isApplicationScoped || this.uriIdentityService.extUri.isEqual(e.profileLocation, profile?.extensionsResource)) {
                this._onDidChange.fire({ extensions: true });
            }
        }));
    }
    get name() { return this._name; }
    set name(name) {
        name = name.trim();
        if (this._name !== name) {
            this._name = name;
            this._onDidChange.fire({ name: true });
        }
    }
    get icon() { return this._icon; }
    set icon(icon) {
        if (this._icon !== icon) {
            this._icon = icon;
            this._onDidChange.fire({ icon: true });
        }
    }
    get workspaces() { return this._workspaces; }
    set workspaces(workspaces) {
        if (!arrays.equals(this._workspaces, workspaces, (a, b) => a.toString() === b.toString())) {
            this._workspaces = workspaces;
            this._onDidChange.fire({ workspaces: true });
        }
    }
    get flags() { return this._flags; }
    set flags(flags) {
        if (!equals(this._flags, flags)) {
            this._flags = flags;
            this._onDidChange.fire({ flags: true });
        }
    }
    get active() { return this._active; }
    set active(active) {
        if (this._active !== active) {
            this._active = active;
            this._onDidChange.fire({ active: true });
        }
    }
    get message() { return this._message; }
    set message(message) {
        if (this._message !== message) {
            this._message = message;
            this._onDidChange.fire({ message: true });
        }
    }
    get disabled() { return this._disabled; }
    set disabled(saving) {
        if (this._disabled !== saving) {
            this._disabled = saving;
            this._onDidChange.fire({ disabled: true });
        }
    }
    getFlag(key) {
        return this.flags?.[key] ?? false;
    }
    setFlag(key, value) {
        const flags = this.flags ? { ...this.flags } : {};
        if (value) {
            flags[key] = true;
        }
        else {
            delete flags[key];
        }
        this.flags = flags;
    }
    validate() {
        if (!this.name) {
            this.message = localize('name required', "Profile name is required and must be a non-empty value.");
            return;
        }
        if (this.shouldValidateName() && this.name !== this.getInitialName() && this.userDataProfilesService.profiles.some(p => p.name === this.name)) {
            this.message = localize('profileExists', "Profile with name {0} already exists.", this.name);
            return;
        }
        if (this.flags && this.flags.settings && this.flags.keybindings && this.flags.tasks && this.flags.snippets && this.flags.extensions) {
            this.message = localize('invalid configurations', "The profile should contain at least one configuration.");
            return;
        }
        this.message = undefined;
    }
    async getChildren(resourceType) {
        if (resourceType === undefined) {
            const resourceTypes = [
                "settings" /* ProfileResourceType.Settings */,
                "keybindings" /* ProfileResourceType.Keybindings */,
                "tasks" /* ProfileResourceType.Tasks */,
                "snippets" /* ProfileResourceType.Snippets */,
                "extensions" /* ProfileResourceType.Extensions */
            ];
            return Promise.all(resourceTypes.map(async (r) => {
                const children = (r === "settings" /* ProfileResourceType.Settings */
                    || r === "keybindings" /* ProfileResourceType.Keybindings */
                    || r === "tasks" /* ProfileResourceType.Tasks */) ? await this.getChildrenForResourceType(r) : [];
                return {
                    handle: r,
                    checkbox: undefined,
                    resourceType: r,
                    openAction: children.length
                        ? toAction({
                            id: '_open',
                            label: localize('open', "Open to the Side"),
                            class: ThemeIcon.asClassName(Codicon.goToFile),
                            run: () => children[0]?.openAction?.run()
                        })
                        : undefined
                };
            }));
        }
        return this.getChildrenForResourceType(resourceType);
    }
    async getChildrenForResourceType(resourceType) {
        return [];
    }
    async getChildrenFromProfile(profile, resourceType) {
        profile = this.getFlag(resourceType) ? this.userDataProfilesService.defaultProfile : profile;
        let children = [];
        switch (resourceType) {
            case "settings" /* ProfileResourceType.Settings */:
                children = await this.instantiationService.createInstance(SettingsResourceTreeItem, profile).getChildren();
                break;
            case "keybindings" /* ProfileResourceType.Keybindings */:
                children = await this.instantiationService.createInstance(KeybindingsResourceTreeItem, profile).getChildren();
                break;
            case "snippets" /* ProfileResourceType.Snippets */:
                children = (await this.instantiationService.createInstance(SnippetsResourceTreeItem, profile).getChildren()) ?? [];
                break;
            case "tasks" /* ProfileResourceType.Tasks */:
                children = await this.instantiationService.createInstance(TasksResourceTreeItem, profile).getChildren();
                break;
            case "extensions" /* ProfileResourceType.Extensions */:
                children = await this.instantiationService.createInstance(ExtensionsResourceExportTreeItem, profile).getChildren();
                break;
        }
        return children.map(child => this.toUserDataProfileResourceChildElement(child));
    }
    toUserDataProfileResourceChildElement(child, primaryActions, contextMenuActions) {
        return {
            handle: child.handle,
            checkbox: child.checkbox,
            label: child.label?.label ?? '',
            description: isString(child.description) ? child.description : undefined,
            resource: URI.revive(child.resourceUri),
            icon: child.themeIcon,
            openAction: toAction({
                id: '_openChild',
                label: localize('open', "Open to the Side"),
                class: ThemeIcon.asClassName(Codicon.goToFile),
                run: async () => {
                    if (child.parent.type === "extensions" /* ProfileResourceType.Extensions */) {
                        await this.commandService.executeCommand('extension.open', child.handle, undefined, true, undefined, true);
                    }
                    else if (child.resourceUri) {
                        await this.commandService.executeCommand(API_OPEN_EDITOR_COMMAND_ID, child.resourceUri, [SIDE_GROUP], undefined);
                    }
                }
            }),
            actions: {
                primary: primaryActions,
                contextMenu: contextMenuActions,
            }
        };
    }
    getInitialName() {
        return '';
    }
    shouldValidateName() {
        return true;
    }
    getCurrentWorkspace() {
        const workspace = this.workspaceContextService.getWorkspace();
        return workspace.configuration ?? workspace.folders[0]?.uri;
    }
    openWorkspace(workspace) {
        if (this.uriIdentityService.extUri.extname(workspace) === WORKSPACE_SUFFIX) {
            this.hostService.openWindow([{ workspaceUri: workspace }], { forceNewWindow: true });
        }
        else {
            this.hostService.openWindow([{ folderUri: workspace }], { forceNewWindow: true });
        }
    }
    save() {
        this.saveScheduler.schedule();
    }
    hasUnsavedChanges(profile) {
        if (this.name !== profile.name) {
            return true;
        }
        if (this.icon !== profile.icon) {
            return true;
        }
        if (!equals(this.flags ?? {}, profile.useDefaultFlags ?? {})) {
            return true;
        }
        if (!arrays.equals(this.workspaces ?? [], profile.workspaces ?? [], (a, b) => a.toString() === b.toString())) {
            return true;
        }
        return false;
    }
    async saveProfile(profile) {
        if (!this.hasUnsavedChanges(profile)) {
            return;
        }
        this.validate();
        if (this.message) {
            return;
        }
        const useDefaultFlags = this.flags
            ? this.flags.settings && this.flags.keybindings && this.flags.tasks && this.flags.globalState && this.flags.extensions ? undefined : this.flags
            : undefined;
        return await this.userDataProfileManagementService.updateProfile(profile, {
            name: this.name,
            icon: this.icon,
            useDefaultFlags: profile.useDefaultFlags && !useDefaultFlags ? {} : useDefaultFlags,
            workspaces: this.workspaces
        });
    }
};
AbstractUserDataProfileElement = __decorate([
    __param(5, IUserDataProfileManagementService),
    __param(6, IUserDataProfilesService),
    __param(7, ICommandService),
    __param(8, IWorkspaceContextService),
    __param(9, IHostService),
    __param(10, IUriIdentityService),
    __param(11, IFileService),
    __param(12, IWorkbenchExtensionManagementService),
    __param(13, IInstantiationService)
], AbstractUserDataProfileElement);
export { AbstractUserDataProfileElement };
let UserDataProfileElement = class UserDataProfileElement extends AbstractUserDataProfileElement {
    get profile() { return this._profile; }
    constructor(_profile, titleButtons, actions, userDataProfileService, configurationService, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService) {
        super(_profile.name, _profile.icon, _profile.useDefaultFlags, _profile.workspaces, userDataProfileService.currentProfile.id === _profile.id, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService);
        this._profile = _profile;
        this.titleButtons = titleButtons;
        this.actions = actions;
        this.userDataProfileService = userDataProfileService;
        this.configurationService = configurationService;
        this._isNewWindowProfile = false;
        this._isNewWindowProfile = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE) === this.profile.name;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(CONFIG_NEW_WINDOW_PROFILE)) {
                this.isNewWindowProfile = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE) === this.profile.name;
            }
        }));
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(() => this.active = this.userDataProfileService.currentProfile.id === this.profile.id));
        this._register(this.userDataProfilesService.onDidChangeProfiles(({ updated }) => {
            const profile = updated.find(p => p.id === this.profile.id);
            if (profile) {
                this._profile = profile;
                this.reset();
                this._onDidChange.fire({ profile: true });
            }
        }));
        this._register(fileService.watch(this.profile.snippetsHome));
        this._register(fileService.onDidFilesChange(e => {
            if (e.affects(this.profile.snippetsHome)) {
                this._onDidChange.fire({ snippets: true });
            }
        }));
    }
    getProfileToWatch() {
        return this.profile;
    }
    reset() {
        this.name = this._profile.name;
        this.icon = this._profile.icon;
        this.flags = this._profile.useDefaultFlags;
        this.workspaces = this._profile.workspaces;
    }
    updateWorkspaces(toAdd, toRemove) {
        const workspaces = new ResourceSet(this.workspaces ?? []);
        for (const workspace of toAdd) {
            workspaces.add(workspace);
        }
        for (const workspace of toRemove) {
            workspaces.delete(workspace);
        }
        this.workspaces = [...workspaces.values()];
    }
    async toggleNewWindowProfile() {
        if (this._isNewWindowProfile) {
            await this.configurationService.updateValue(CONFIG_NEW_WINDOW_PROFILE, null);
        }
        else {
            await this.configurationService.updateValue(CONFIG_NEW_WINDOW_PROFILE, this.profile.name);
        }
    }
    get isNewWindowProfile() { return this._isNewWindowProfile; }
    set isNewWindowProfile(isNewWindowProfile) {
        if (this._isNewWindowProfile !== isNewWindowProfile) {
            this._isNewWindowProfile = isNewWindowProfile;
            this._onDidChange.fire({ newWindowProfile: true });
        }
    }
    async toggleCurrentWindowProfile() {
        if (this.userDataProfileService.currentProfile.id === this.profile.id) {
            await this.userDataProfileManagementService.switchProfile(this.userDataProfilesService.defaultProfile);
        }
        else {
            await this.userDataProfileManagementService.switchProfile(this.profile);
        }
    }
    async doSave() {
        await this.saveProfile(this.profile);
    }
    async getChildrenForResourceType(resourceType) {
        if (resourceType === "extensions" /* ProfileResourceType.Extensions */) {
            const children = await this.instantiationService.createInstance(ExtensionsResourceExportTreeItem, this.profile).getChildren();
            return children.map(child => this.toUserDataProfileResourceChildElement(child, undefined, [{
                    id: 'applyToAllProfiles',
                    label: localize('applyToAllProfiles', "Apply Extension to all Profiles"),
                    checked: child.applicationScoped,
                    enabled: true,
                    class: '',
                    tooltip: '',
                    run: async () => {
                        const extensions = await this.extensionManagementService.getInstalled(undefined, this.profile.extensionsResource);
                        const extension = extensions.find(e => areSameExtensions(e.identifier, child.identifier));
                        if (extension) {
                            await this.extensionManagementService.toggleAppliationScope(extension, this.profile.extensionsResource);
                        }
                    }
                }]));
        }
        return this.getChildrenFromProfile(this.profile, resourceType);
    }
    getInitialName() {
        return this.profile.name;
    }
};
UserDataProfileElement = __decorate([
    __param(3, IUserDataProfileService),
    __param(4, IConfigurationService),
    __param(5, IUserDataProfileManagementService),
    __param(6, IUserDataProfilesService),
    __param(7, ICommandService),
    __param(8, IWorkspaceContextService),
    __param(9, IHostService),
    __param(10, IUriIdentityService),
    __param(11, IFileService),
    __param(12, IWorkbenchExtensionManagementService),
    __param(13, IInstantiationService)
], UserDataProfileElement);
export { UserDataProfileElement };
const USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME = 'userdataprofiletemplatepreview';
let NewProfileElement = class NewProfileElement extends AbstractUserDataProfileElement {
    get copyFromTemplates() { return this._copyFromTemplates; }
    constructor(name, copyFrom, titleButtons, actions, userDataProfileImportExportService, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService) {
        super(name, undefined, undefined, undefined, false, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService);
        this.titleButtons = titleButtons;
        this.actions = actions;
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this._copyFromTemplates = new ResourceMap();
        this.template = null;
        this.previewProfileWatchDisposables = this._register(new DisposableStore());
        this.defaultName = name;
        this._copyFrom = copyFrom;
        this._copyFlags = this.getCopyFlagsFrom(copyFrom);
        this.initialize();
        this._register(this.fileService.registerProvider(USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME, this._register(new InMemoryFileSystemProvider())));
        this._register(toDisposable(() => {
            if (this.previewProfile) {
                this.userDataProfilesService.removeProfile(this.previewProfile);
            }
        }));
    }
    get copyFrom() { return this._copyFrom; }
    set copyFrom(copyFrom) {
        if (this._copyFrom !== copyFrom) {
            this._copyFrom = copyFrom;
            this._onDidChange.fire({ copyFrom: true });
            this.flags = undefined;
            this.copyFlags = this.getCopyFlagsFrom(copyFrom);
            if (copyFrom instanceof URI) {
                this.templatePromise?.cancel();
                this.templatePromise = undefined;
            }
            this.initialize();
        }
    }
    get copyFlags() { return this._copyFlags; }
    set copyFlags(flags) {
        if (!equals(this._copyFlags, flags)) {
            this._copyFlags = flags;
            this._onDidChange.fire({ copyFlags: true });
        }
    }
    get previewProfile() { return this._previewProfile; }
    set previewProfile(profile) {
        if (this._previewProfile !== profile) {
            this._previewProfile = profile;
            this._onDidChange.fire({ preview: true });
            this.previewProfileWatchDisposables.clear();
            if (this._previewProfile) {
                this.previewProfileWatchDisposables.add(this.fileService.watch(this._previewProfile.snippetsHome));
                this.previewProfileWatchDisposables.add(this.fileService.onDidFilesChange(e => {
                    if (!this._previewProfile) {
                        return;
                    }
                    if (e.affects(this._previewProfile.snippetsHome)) {
                        this._onDidChange.fire({ snippets: true });
                    }
                }));
            }
        }
    }
    getProfileToWatch() {
        return this.previewProfile;
    }
    getCopyFlagsFrom(copyFrom) {
        return copyFrom ? {
            settings: true,
            keybindings: true,
            snippets: true,
            tasks: true,
            extensions: true
        } : undefined;
    }
    async initialize() {
        this.disabled = true;
        try {
            if (this.copyFrom instanceof URI) {
                await this.resolveTemplate(this.copyFrom);
                if (this.template) {
                    this.copyFromTemplates.set(this.copyFrom, this.template.name);
                    if (this.defaultName === this.name) {
                        this.name = this.defaultName = this.template.name ?? '';
                    }
                    if (this.defaultIcon === this.icon) {
                        this.icon = this.defaultIcon = this.template.icon;
                    }
                    this.setCopyFlag("settings" /* ProfileResourceType.Settings */, !!this.template.settings);
                    this.setCopyFlag("keybindings" /* ProfileResourceType.Keybindings */, !!this.template.keybindings);
                    this.setCopyFlag("tasks" /* ProfileResourceType.Tasks */, !!this.template.tasks);
                    this.setCopyFlag("snippets" /* ProfileResourceType.Snippets */, !!this.template.snippets);
                    this.setCopyFlag("extensions" /* ProfileResourceType.Extensions */, !!this.template.extensions);
                    this._onDidChange.fire({ copyFromInfo: true });
                }
                return;
            }
            if (isUserDataProfile(this.copyFrom)) {
                if (this.defaultName === this.name) {
                    this.name = this.defaultName = localize('copy from', "{0} (Copy)", this.copyFrom.name);
                }
                if (this.defaultIcon === this.icon) {
                    this.icon = this.defaultIcon = this.copyFrom.icon;
                }
                this.setCopyFlag("settings" /* ProfileResourceType.Settings */, true);
                this.setCopyFlag("keybindings" /* ProfileResourceType.Keybindings */, true);
                this.setCopyFlag("tasks" /* ProfileResourceType.Tasks */, true);
                this.setCopyFlag("snippets" /* ProfileResourceType.Snippets */, true);
                this.setCopyFlag("extensions" /* ProfileResourceType.Extensions */, true);
                this._onDidChange.fire({ copyFromInfo: true });
                return;
            }
            if (this.defaultName === this.name) {
                this.name = this.defaultName = localize('untitled', "Untitled");
            }
            if (this.defaultIcon === this.icon) {
                this.icon = this.defaultIcon = undefined;
            }
            this.setCopyFlag("settings" /* ProfileResourceType.Settings */, false);
            this.setCopyFlag("keybindings" /* ProfileResourceType.Keybindings */, false);
            this.setCopyFlag("tasks" /* ProfileResourceType.Tasks */, false);
            this.setCopyFlag("snippets" /* ProfileResourceType.Snippets */, false);
            this.setCopyFlag("extensions" /* ProfileResourceType.Extensions */, false);
            this._onDidChange.fire({ copyFromInfo: true });
        }
        finally {
            this.disabled = false;
        }
    }
    async resolveTemplate(uri) {
        if (!this.templatePromise) {
            this.templatePromise = createCancelablePromise(async (token) => {
                const template = await this.userDataProfileImportExportService.resolveProfileTemplate(uri);
                if (!token.isCancellationRequested) {
                    this.template = template;
                }
            });
        }
        await this.templatePromise;
        return this.template;
    }
    hasResource(resourceType) {
        if (this.template) {
            switch (resourceType) {
                case "settings" /* ProfileResourceType.Settings */:
                    return !!this.template.settings;
                case "keybindings" /* ProfileResourceType.Keybindings */:
                    return !!this.template.keybindings;
                case "snippets" /* ProfileResourceType.Snippets */:
                    return !!this.template.snippets;
                case "tasks" /* ProfileResourceType.Tasks */:
                    return !!this.template.tasks;
                case "extensions" /* ProfileResourceType.Extensions */:
                    return !!this.template.extensions;
            }
        }
        return true;
    }
    getCopyFlag(key) {
        return this.copyFlags?.[key] ?? false;
    }
    setCopyFlag(key, value) {
        const flags = this.copyFlags ? { ...this.copyFlags } : {};
        flags[key] = value;
        this.copyFlags = flags;
    }
    getCopyFromName() {
        if (isUserDataProfile(this.copyFrom)) {
            return this.copyFrom.name;
        }
        if (this.copyFrom instanceof URI) {
            return this.copyFromTemplates.get(this.copyFrom);
        }
        return undefined;
    }
    async getChildrenForResourceType(resourceType) {
        if (this.getFlag(resourceType)) {
            return this.getChildrenFromProfile(this.userDataProfilesService.defaultProfile, resourceType);
        }
        if (!this.getCopyFlag(resourceType)) {
            return [];
        }
        if (this.previewProfile) {
            return this.getChildrenFromProfile(this.previewProfile, resourceType);
        }
        if (this.copyFrom instanceof URI) {
            await this.resolveTemplate(this.copyFrom);
            if (!this.template) {
                return [];
            }
            return this.getChildrenFromProfileTemplate(this.template, resourceType);
        }
        if (this.copyFrom) {
            return this.getChildrenFromProfile(this.copyFrom, resourceType);
        }
        return [];
    }
    async getChildrenFromProfileTemplate(profileTemplate, resourceType) {
        const location = URI.from({ scheme: USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME, path: `/root/profiles/${profileTemplate.name}` });
        const cacheLocation = URI.from({ scheme: USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME, path: `/root/cache/${profileTemplate.name}` });
        const profile = toUserDataProfile(generateUuid(), this.name, location, cacheLocation);
        switch (resourceType) {
            case "settings" /* ProfileResourceType.Settings */:
                if (profileTemplate.settings) {
                    await this.instantiationService.createInstance(SettingsResource).apply(profileTemplate.settings, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "keybindings" /* ProfileResourceType.Keybindings */:
                if (profileTemplate.keybindings) {
                    await this.instantiationService.createInstance(KeybindingsResource).apply(profileTemplate.keybindings, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "snippets" /* ProfileResourceType.Snippets */:
                if (profileTemplate.snippets) {
                    await this.instantiationService.createInstance(SnippetsResource).apply(profileTemplate.snippets, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "tasks" /* ProfileResourceType.Tasks */:
                if (profileTemplate.tasks) {
                    await this.instantiationService.createInstance(TasksResource).apply(profileTemplate.tasks, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "extensions" /* ProfileResourceType.Extensions */:
                if (profileTemplate.extensions) {
                    const children = await this.instantiationService.createInstance(ExtensionsResourceImportTreeItem, profileTemplate.extensions).getChildren();
                    return children.map(child => this.toUserDataProfileResourceChildElement(child));
                }
                return [];
        }
        return [];
    }
    shouldValidateName() {
        return !this.copyFrom;
    }
    getInitialName() {
        return this.previewProfile?.name ?? '';
    }
    async doSave() {
        if (this.previewProfile) {
            const profile = await this.saveProfile(this.previewProfile);
            if (profile) {
                this.previewProfile = profile;
            }
        }
    }
};
NewProfileElement = __decorate([
    __param(4, IUserDataProfileImportExportService),
    __param(5, IUserDataProfileManagementService),
    __param(6, IUserDataProfilesService),
    __param(7, ICommandService),
    __param(8, IWorkspaceContextService),
    __param(9, IHostService),
    __param(10, IUriIdentityService),
    __param(11, IFileService),
    __param(12, IWorkbenchExtensionManagementService),
    __param(13, IInstantiationService)
], NewProfileElement);
export { NewProfileElement };
let UserDataProfilesEditorModel = class UserDataProfilesEditorModel extends EditorModel {
    static { UserDataProfilesEditorModel_1 = this; }
    static getInstance(instantiationService) {
        if (!UserDataProfilesEditorModel_1.INSTANCE) {
            UserDataProfilesEditorModel_1.INSTANCE = instantiationService.createInstance(UserDataProfilesEditorModel_1);
        }
        return UserDataProfilesEditorModel_1.INSTANCE;
    }
    get profiles() {
        return this._profiles
            .map(([profile]) => profile)
            .sort((a, b) => {
            if (a instanceof NewProfileElement) {
                return 1;
            }
            if (b instanceof NewProfileElement) {
                return -1;
            }
            if (a instanceof UserDataProfileElement && a.profile.isDefault) {
                return -1;
            }
            if (b instanceof UserDataProfileElement && b.profile.isDefault) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });
    }
    constructor(userDataProfileService, userDataProfilesService, userDataProfileManagementService, userDataProfileImportExportService, dialogService, telemetryService, hostService, productService, openerService, instantiationService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this.dialogService = dialogService;
        this.telemetryService = telemetryService;
        this.hostService = hostService;
        this.productService = productService;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this._profiles = [];
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        for (const profile of userDataProfilesService.profiles) {
            if (!profile.isTransient) {
                this._profiles.push(this.createProfileElement(profile));
            }
        }
        this._register(toDisposable(() => this._profiles.splice(0, this._profiles.length).map(([, disposables]) => disposables.dispose())));
        this._register(userDataProfilesService.onDidChangeProfiles(e => this.onDidChangeProfiles(e)));
    }
    onDidChangeProfiles(e) {
        let changed = false;
        for (const profile of e.added) {
            if (!profile.isTransient && profile.name !== this.newProfileElement?.name) {
                changed = true;
                this._profiles.push(this.createProfileElement(profile));
            }
        }
        for (const profile of e.removed) {
            if (profile.id === this.newProfileElement?.previewProfile?.id) {
                this.newProfileElement.previewProfile = undefined;
            }
            const index = this._profiles.findIndex(([p]) => p instanceof UserDataProfileElement && p.profile.id === profile.id);
            if (index !== -1) {
                changed = true;
                this._profiles.splice(index, 1).map(([, disposables]) => disposables.dispose());
            }
        }
        if (changed) {
            this._onDidChange.fire(undefined);
        }
    }
    getTemplates() {
        if (!this.templates) {
            this.templates = this.userDataProfileManagementService.getBuiltinProfileTemplates();
        }
        return this.templates;
    }
    createProfileElement(profile) {
        const disposables = new DisposableStore();
        const activateAction = disposables.add(new Action('userDataProfile.activate', localize('active', "Use this Profile for Current Window"), ThemeIcon.asClassName(Codicon.check), true, () => this.userDataProfileManagementService.switchProfile(profileElement.profile)));
        const copyFromProfileAction = disposables.add(new Action('userDataProfile.copyFromProfile', localize('copyFromProfile', "Duplicate..."), ThemeIcon.asClassName(Codicon.copy), true, () => this.createNewProfile(profileElement.profile)));
        const exportAction = disposables.add(new Action('userDataProfile.export', localize('export', "Export..."), ThemeIcon.asClassName(Codicon.export), true, () => this.userDataProfileImportExportService.exportProfile(profile)));
        const deleteAction = disposables.add(new Action('userDataProfile.delete', localize('delete', "Delete"), ThemeIcon.asClassName(Codicon.trash), true, () => this.removeProfile(profileElement.profile)));
        const newWindowAction = disposables.add(new Action('userDataProfile.newWindow', localize('open new window', "Open New Window with this Profile"), ThemeIcon.asClassName(Codicon.emptyWindow), true, () => this.openWindow(profileElement.profile)));
        const primaryActions = [];
        primaryActions.push(activateAction);
        primaryActions.push(newWindowAction);
        const secondaryActions = [];
        secondaryActions.push(copyFromProfileAction);
        secondaryActions.push(exportAction);
        if (!profile.isDefault) {
            secondaryActions.push(new Separator());
            secondaryActions.push(deleteAction);
        }
        const profileElement = disposables.add(this.instantiationService.createInstance(UserDataProfileElement, profile, [[], []], [primaryActions, secondaryActions]));
        activateAction.enabled = this.userDataProfileService.currentProfile.id !== profileElement.profile.id;
        disposables.add(this.userDataProfileService.onDidChangeCurrentProfile(() => activateAction.enabled = this.userDataProfileService.currentProfile.id !== profileElement.profile.id));
        return [profileElement, disposables];
    }
    async createNewProfile(copyFrom) {
        if (this.newProfileElement) {
            const result = await this.dialogService.confirm({
                type: 'info',
                message: localize('new profile exists', "A new profile is already being created. Do you want to discard it and create a new one?"),
                primaryButton: localize('discard', "Discard & Create"),
                cancelButton: localize('cancel', "Cancel")
            });
            if (!result.confirmed) {
                return;
            }
            this.revert();
        }
        if (copyFrom instanceof URI) {
            try {
                await this.userDataProfileImportExportService.resolveProfileTemplate(copyFrom);
            }
            catch (error) {
                this.dialogService.error(getErrorMessage(error));
                return;
            }
        }
        if (!this.newProfileElement) {
            const disposables = new DisposableStore();
            const cancellationTokenSource = new CancellationTokenSource();
            disposables.add(toDisposable(() => cancellationTokenSource.dispose(true)));
            const primaryActions = [];
            const secondaryActions = [];
            const createAction = disposables.add(new Action('userDataProfile.create', localize('create', "Create"), undefined, true, () => this.saveNewProfile(false, cancellationTokenSource.token)));
            primaryActions.push(createAction);
            if (isWeb && copyFrom instanceof URI && isProfileURL(copyFrom)) {
                primaryActions.push(disposables.add(new Action('userDataProfile.createInDesktop', localize('import in desktop', "Create in {0}", this.productService.nameLong), undefined, true, () => this.openerService.open(copyFrom, { openExternal: true }))));
            }
            const cancelAction = disposables.add(new Action('userDataProfile.cancel', localize('cancel', "Cancel"), ThemeIcon.asClassName(Codicon.trash), true, () => this.discardNewProfile()));
            secondaryActions.push(cancelAction);
            const previewProfileAction = disposables.add(new Action('userDataProfile.preview', localize('preview', "Preview"), ThemeIcon.asClassName(Codicon.openPreview), true, () => this.previewNewProfile(cancellationTokenSource.token)));
            secondaryActions.push(previewProfileAction);
            const exportAction = disposables.add(new Action('userDataProfile.export', localize('export', "Export..."), ThemeIcon.asClassName(Codicon.export), isUserDataProfile(copyFrom), () => this.exportNewProfile(cancellationTokenSource.token)));
            this.newProfileElement = disposables.add(this.instantiationService.createInstance(NewProfileElement, copyFrom ? '' : localize('untitled', "Untitled"), copyFrom, [primaryActions, secondaryActions], [[cancelAction], [exportAction]]));
            const updateCreateActionLabel = () => {
                if (createAction.enabled) {
                    if (this.newProfileElement?.copyFrom && this.userDataProfilesService.profiles.some(p => !p.isTransient && p.name === this.newProfileElement?.name)) {
                        createAction.label = localize('replace', "Replace");
                    }
                    else {
                        createAction.label = localize('create', "Create");
                    }
                }
            };
            updateCreateActionLabel();
            disposables.add(this.newProfileElement.onDidChange(e => {
                if (e.preview || e.disabled || e.message) {
                    createAction.enabled = !this.newProfileElement?.disabled && !this.newProfileElement?.message;
                    previewProfileAction.enabled = !this.newProfileElement?.previewProfile && !this.newProfileElement?.disabled && !this.newProfileElement?.message;
                }
                if (e.name || e.copyFrom) {
                    updateCreateActionLabel();
                    exportAction.enabled = isUserDataProfile(this.newProfileElement?.copyFrom);
                }
            }));
            disposables.add(this.userDataProfilesService.onDidChangeProfiles((e) => {
                updateCreateActionLabel();
                this.newProfileElement?.validate();
            }));
            this._profiles.push([this.newProfileElement, disposables]);
            this._onDidChange.fire(this.newProfileElement);
        }
        return this.newProfileElement;
    }
    revert() {
        this.removeNewProfile();
        this._onDidChange.fire(undefined);
    }
    removeNewProfile() {
        if (this.newProfileElement) {
            const index = this._profiles.findIndex(([p]) => p === this.newProfileElement);
            if (index !== -1) {
                this._profiles.splice(index, 1).map(([, disposables]) => disposables.dispose());
            }
            this.newProfileElement = undefined;
        }
    }
    async previewNewProfile(token) {
        if (!this.newProfileElement) {
            return;
        }
        if (this.newProfileElement.previewProfile) {
            return;
        }
        const profile = await this.saveNewProfile(true, token);
        if (profile) {
            this.newProfileElement.previewProfile = profile;
            if (isWeb) {
                await this.userDataProfileManagementService.switchProfile(profile);
            }
            else {
                await this.openWindow(profile);
            }
        }
    }
    async exportNewProfile(token) {
        if (!this.newProfileElement) {
            return;
        }
        if (!isUserDataProfile(this.newProfileElement.copyFrom)) {
            return;
        }
        const profile = toUserDataProfile(generateUuid(), this.newProfileElement.name, this.newProfileElement.copyFrom.location, this.newProfileElement.copyFrom.cacheHome, {
            icon: this.newProfileElement.icon,
            useDefaultFlags: this.newProfileElement.flags,
        }, this.userDataProfilesService.defaultProfile);
        await this.userDataProfileImportExportService.exportProfile(profile, this.newProfileElement.copyFlags);
    }
    async saveNewProfile(transient, token) {
        if (!this.newProfileElement) {
            return undefined;
        }
        this.newProfileElement.validate();
        if (this.newProfileElement.message) {
            return undefined;
        }
        this.newProfileElement.disabled = true;
        let profile;
        try {
            if (this.newProfileElement.previewProfile) {
                if (!transient) {
                    profile = await this.userDataProfileManagementService.updateProfile(this.newProfileElement.previewProfile, { transient: false });
                }
            }
            else {
                const { flags, icon, name, copyFrom } = this.newProfileElement;
                const useDefaultFlags = flags
                    ? flags.settings && flags.keybindings && flags.tasks && flags.globalState && flags.extensions ? undefined : flags
                    : undefined;
                const createProfileTelemetryData = { source: copyFrom instanceof URI ? 'template' : isUserDataProfile(copyFrom) ? 'profile' : copyFrom ? 'external' : undefined };
                if (copyFrom instanceof URI) {
                    const template = await this.newProfileElement.resolveTemplate(copyFrom);
                    if (template) {
                        this.telemetryService.publicLog2('userDataProfile.createFromTemplate', createProfileTelemetryData);
                        profile = await this.userDataProfileImportExportService.createProfileFromTemplate(template, {
                            name,
                            useDefaultFlags,
                            icon,
                            resourceTypeFlags: this.newProfileElement.copyFlags,
                            transient
                        }, token ?? CancellationToken.None);
                    }
                }
                else if (isUserDataProfile(copyFrom)) {
                    profile = await this.userDataProfileImportExportService.createFromProfile(copyFrom, {
                        name,
                        useDefaultFlags,
                        icon: icon,
                        resourceTypeFlags: this.newProfileElement.copyFlags,
                        transient
                    }, token ?? CancellationToken.None);
                }
                else {
                    profile = await this.userDataProfileManagementService.createProfile(name, { useDefaultFlags, icon, transient });
                }
            }
        }
        finally {
            if (this.newProfileElement) {
                this.newProfileElement.disabled = false;
            }
        }
        if (token?.isCancellationRequested) {
            if (profile) {
                try {
                    await this.userDataProfileManagementService.removeProfile(profile);
                }
                catch (error) {
                    // ignore
                }
            }
            return;
        }
        if (profile && !profile.isTransient && this.newProfileElement) {
            this.removeNewProfile();
            const existing = this._profiles.find(([p]) => p.name === profile.name);
            if (existing) {
                this._onDidChange.fire(existing[0]);
            }
            else {
                this.onDidChangeProfiles({ added: [profile], removed: [], updated: [], all: this.userDataProfilesService.profiles });
            }
        }
        return profile;
    }
    async discardNewProfile() {
        if (!this.newProfileElement) {
            return;
        }
        if (this.newProfileElement.previewProfile) {
            await this.userDataProfileManagementService.removeProfile(this.newProfileElement.previewProfile);
            return;
        }
        this.removeNewProfile();
        this._onDidChange.fire(undefined);
    }
    async removeProfile(profile) {
        const result = await this.dialogService.confirm({
            type: 'info',
            message: localize('deleteProfile', "Are you sure you want to delete the profile '{0}'?", profile.name),
            primaryButton: localize('delete', "Delete"),
            cancelButton: localize('cancel', "Cancel")
        });
        if (result.confirmed) {
            await this.userDataProfileManagementService.removeProfile(profile);
        }
    }
    async openWindow(profile) {
        await this.hostService.openWindow({ forceProfile: profile.name });
    }
};
UserDataProfilesEditorModel = UserDataProfilesEditorModel_1 = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IUserDataProfileManagementService),
    __param(3, IUserDataProfileImportExportService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, IHostService),
    __param(7, IProductService),
    __param(8, IOpenerService),
    __param(9, IInstantiationService)
], UserDataProfilesEditorModel);
export { UserDataProfilesEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0VkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZXNFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUEwQixpQkFBaUIsRUFBb0Isd0JBQXdCLEVBQWlELGlCQUFpQixFQUEwQixNQUFNLGdFQUFnRSxDQUFDO0FBQ2pRLE9BQU8sRUFBdUQsWUFBWSxFQUFFLG1DQUFtQyxFQUFFLGlDQUFpQyxFQUFFLHVCQUF1QixFQUE0QixNQUFNLDZEQUE2RCxDQUFDO0FBQzNRLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxP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