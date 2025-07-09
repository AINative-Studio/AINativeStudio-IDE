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
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { CURRENT_PROFILE_CONTEXT, HAS_PROFILES_CONTEXT, IS_CURRENT_PROFILE_TRANSIENT_CONTEXT, IUserDataProfileManagementService, IUserDataProfileService, PROFILES_CATEGORY, PROFILES_TITLE, isProfileURL } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { URI } from '../../../../base/common/uri.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTagsService } from '../../tags/common/workspaceTags.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { UserDataProfilesEditor, UserDataProfilesEditorInput, UserDataProfilesEditorInputSerializer } from './userDataProfilesEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
export const OpenProfileMenu = new MenuId('OpenProfile');
const ProfilesMenu = new MenuId('Profiles');
let UserDataProfilesWorkbenchContribution = class UserDataProfilesWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.userDataProfiles'; }
    constructor(userDataProfileService, userDataProfilesService, userDataProfileManagementService, telemetryService, workspaceContextService, workspaceTagsService, contextKeyService, editorGroupsService, instantiationService, lifecycleService, urlService, environmentService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTagsService = workspaceTagsService;
        this.editorGroupsService = editorGroupsService;
        this.instantiationService = instantiationService;
        this.lifecycleService = lifecycleService;
        this.urlService = urlService;
        this.profilesDisposable = this._register(new MutableDisposable());
        this.currentProfileContext = CURRENT_PROFILE_CONTEXT.bindTo(contextKeyService);
        this.isCurrentProfileTransientContext = IS_CURRENT_PROFILE_TRANSIENT_CONTEXT.bindTo(contextKeyService);
        this.currentProfileContext.set(this.userDataProfileService.currentProfile.id);
        this.isCurrentProfileTransientContext.set(!!this.userDataProfileService.currentProfile.isTransient);
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(e => {
            this.currentProfileContext.set(this.userDataProfileService.currentProfile.id);
            this.isCurrentProfileTransientContext.set(!!this.userDataProfileService.currentProfile.isTransient);
        }));
        this.hasProfilesContext = HAS_PROFILES_CONTEXT.bindTo(contextKeyService);
        this.hasProfilesContext.set(this.userDataProfilesService.profiles.length > 1);
        this._register(this.userDataProfilesService.onDidChangeProfiles(e => this.hasProfilesContext.set(this.userDataProfilesService.profiles.length > 1)));
        this.registerEditor();
        this.registerActions();
        this._register(this.urlService.registerHandler(this));
        if (isWeb) {
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(() => userDataProfilesService.cleanUp());
        }
        this.reportWorkspaceProfileInfo();
        if (environmentService.options?.profileToPreview) {
            lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => this.handleURL(URI.revive(environmentService.options.profileToPreview)));
        }
    }
    async handleURL(uri) {
        if (isProfileURL(uri)) {
            const editor = await this.openProfilesEditor();
            if (editor) {
                editor.createNewProfile(uri);
                return true;
            }
        }
        return false;
    }
    async openProfilesEditor() {
        const editor = await this.editorGroupsService.activeGroup.openEditor(new UserDataProfilesEditorInput(this.instantiationService));
        return editor;
    }
    registerEditor() {
        Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(UserDataProfilesEditor, UserDataProfilesEditor.ID, localize('userdataprofilesEditor', "Profiles Editor")), [
            new SyncDescriptor(UserDataProfilesEditorInput)
        ]);
        Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(UserDataProfilesEditorInput.ID, UserDataProfilesEditorInputSerializer);
    }
    registerActions() {
        this.registerProfileSubMenu();
        this._register(this.registerManageProfilesAction());
        this._register(this.registerSwitchProfileAction());
        this.registerOpenProfileSubMenu();
        this.registerNewWindowWithProfileAction();
        this.registerProfilesActions();
        this._register(this.userDataProfilesService.onDidChangeProfiles(() => this.registerProfilesActions()));
        this._register(this.registerExportCurrentProfileAction());
        this.registerCreateFromCurrentProfileAction();
        this.registerNewProfileAction();
        this.registerDeleteProfileAction();
        this.registerHelpAction();
    }
    registerProfileSubMenu() {
        const getProfilesTitle = () => {
            return localize('profiles', "Profile ({0})", this.userDataProfileService.currentProfile.name);
        };
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            get title() {
                return getProfilesTitle();
            },
            submenu: ProfilesMenu,
            group: '2_configuration',
            order: 1,
            when: HAS_PROFILES_CONTEXT
        });
        MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            get title() {
                return getProfilesTitle();
            },
            submenu: ProfilesMenu,
            group: '2_configuration',
            order: 1,
            when: HAS_PROFILES_CONTEXT
        });
    }
    registerOpenProfileSubMenu() {
        MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
            title: localize('New Profile Window', "New Window with Profile"),
            submenu: OpenProfileMenu,
            group: '1_new',
            order: 4,
        });
    }
    registerProfilesActions() {
        this.profilesDisposable.value = new DisposableStore();
        for (const profile of this.userDataProfilesService.profiles) {
            if (!profile.isTransient) {
                this.profilesDisposable.value.add(this.registerProfileEntryAction(profile));
                this.profilesDisposable.value.add(this.registerNewWindowAction(profile));
            }
        }
    }
    registerProfileEntryAction(profile) {
        const that = this;
        return registerAction2(class ProfileEntryAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.profileEntry.${profile.id}`,
                    title: profile.name,
                    metadata: {
                        description: localize2('change profile', "Switch to {0} profile", profile.name),
                    },
                    toggled: ContextKeyExpr.equals(CURRENT_PROFILE_CONTEXT.key, profile.id),
                    menu: [
                        {
                            id: ProfilesMenu,
                            group: '0_profiles',
                        }
                    ]
                });
            }
            async run(accessor) {
                if (that.userDataProfileService.currentProfile.id !== profile.id) {
                    return that.userDataProfileManagementService.switchProfile(profile);
                }
            }
        });
    }
    registerNewWindowWithProfileAction() {
        return registerAction2(class NewWindowWithProfileAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.newWindowWithProfile`,
                    title: localize2('newWindowWithProfile', "New Window with Profile..."),
                    category: PROFILES_CATEGORY,
                    precondition: HAS_PROFILES_CONTEXT,
                    f1: true,
                });
            }
            async run(accessor) {
                const quickInputService = accessor.get(IQuickInputService);
                const userDataProfilesService = accessor.get(IUserDataProfilesService);
                const hostService = accessor.get(IHostService);
                const pick = await quickInputService.pick(userDataProfilesService.profiles.map(profile => ({
                    label: profile.name,
                    profile
                })), {
                    title: localize('new window with profile', "New Window with Profile"),
                    placeHolder: localize('pick profile', "Select Profile"),
                    canPickMany: false
                });
                if (pick) {
                    return hostService.openWindow({ remoteAuthority: null, forceProfile: pick.profile.name });
                }
            }
        });
    }
    registerNewWindowAction(profile) {
        const disposables = new DisposableStore();
        const id = `workbench.action.openProfile.${profile.name.replace('/\s+/', '_')}`;
        disposables.add(registerAction2(class NewWindowAction extends Action2 {
            constructor() {
                super({
                    id,
                    title: localize2('openShort', "{0}", profile.name),
                    metadata: {
                        description: localize2('open profile', "Open New Window with {0} Profile", profile.name),
                    },
                    menu: {
                        id: OpenProfileMenu,
                        group: '0_profiles',
                        when: HAS_PROFILES_CONTEXT
                    }
                });
            }
            run(accessor) {
                const hostService = accessor.get(IHostService);
                return hostService.openWindow({ remoteAuthority: null, forceProfile: profile.name });
            }
        }));
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id,
                category: PROFILES_CATEGORY,
                title: localize2('open', "Open {0} Profile", profile.name),
                precondition: HAS_PROFILES_CONTEXT
            },
        }));
        return disposables;
    }
    registerSwitchProfileAction() {
        const that = this;
        return registerAction2(class SwitchProfileAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.switchProfile`,
                    title: localize2('switchProfile', 'Switch Profile...'),
                    category: PROFILES_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor) {
                const quickInputService = accessor.get(IQuickInputService);
                const items = [];
                for (const profile of that.userDataProfilesService.profiles) {
                    items.push({
                        id: profile.id,
                        label: profile.id === that.userDataProfileService.currentProfile.id ? `$(check) ${profile.name}` : profile.name,
                        profile,
                    });
                }
                const result = await quickInputService.pick(items.sort((a, b) => a.profile.name.localeCompare(b.profile.name)), {
                    placeHolder: localize('selectProfile', "Select Profile")
                });
                if (result) {
                    await that.userDataProfileManagementService.switchProfile(result.profile);
                }
            }
        });
    }
    registerManageProfilesAction() {
        const disposables = new DisposableStore();
        disposables.add(registerAction2(class ManageProfilesAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.manageProfiles`,
                    title: {
                        ...localize2('manage profiles', "Profiles"),
                        mnemonicTitle: localize({ key: 'miOpenProfiles', comment: ['&& denotes a mnemonic'] }, "&&Profiles"),
                    },
                    menu: [
                        {
                            id: MenuId.GlobalActivity,
                            group: '2_configuration',
                            order: 1,
                            when: HAS_PROFILES_CONTEXT.negate()
                        },
                        {
                            id: MenuId.MenubarPreferencesMenu,
                            group: '2_configuration',
                            order: 1,
                            when: HAS_PROFILES_CONTEXT.negate()
                        },
                        {
                            id: ProfilesMenu,
                            group: '1_manage',
                            order: 1,
                        },
                    ]
                });
            }
            run(accessor) {
                const editorGroupsService = accessor.get(IEditorGroupsService);
                const instantiationService = accessor.get(IInstantiationService);
                return editorGroupsService.activeGroup.openEditor(new UserDataProfilesEditorInput(instantiationService));
            }
        }));
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id: 'workbench.profiles.actions.manageProfiles',
                category: Categories.Preferences,
                title: localize2('open profiles', "Open Profiles (UI)"),
            },
        }));
        return disposables;
    }
    registerExportCurrentProfileAction() {
        const that = this;
        const disposables = new DisposableStore();
        const id = 'workbench.profiles.actions.exportProfile';
        disposables.add(registerAction2(class ExportProfileAction extends Action2 {
            constructor() {
                super({
                    id,
                    title: localize2('export profile', "Export Profile..."),
                    category: PROFILES_CATEGORY,
                    f1: true,
                });
            }
            async run() {
                const editor = await that.openProfilesEditor();
                editor?.selectProfile(that.userDataProfileService.currentProfile);
            }
        }));
        disposables.add(MenuRegistry.appendMenuItem(MenuId.MenubarShare, {
            command: {
                id,
                title: localize2('export profile in share', "Export Profile ({0})...", that.userDataProfileService.currentProfile.name),
            },
        }));
        return disposables;
    }
    registerCreateFromCurrentProfileAction() {
        const that = this;
        this._register(registerAction2(class CreateFromCurrentProfileAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.createFromCurrentProfile',
                    title: localize2('save profile as', "Save Current Profile As..."),
                    category: PROFILES_CATEGORY,
                    f1: true,
                });
            }
            async run() {
                const editor = await that.openProfilesEditor();
                editor?.createNewProfile(that.userDataProfileService.currentProfile);
            }
        }));
    }
    registerNewProfileAction() {
        const that = this;
        this._register(registerAction2(class CreateProfileAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.createProfile',
                    title: localize2('create profile', "New Profile..."),
                    category: PROFILES_CATEGORY,
                    f1: true,
                    menu: [
                        {
                            id: OpenProfileMenu,
                            group: '1_manage_profiles',
                            order: 1
                        }
                    ]
                });
            }
            async run(accessor) {
                const editor = await that.openProfilesEditor();
                return editor?.createNewProfile();
            }
        }));
    }
    registerDeleteProfileAction() {
        this._register(registerAction2(class DeleteProfileAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.deleteProfile',
                    title: localize2('delete profile', "Delete Profile..."),
                    category: PROFILES_CATEGORY,
                    f1: true,
                    precondition: HAS_PROFILES_CONTEXT,
                });
            }
            async run(accessor) {
                const quickInputService = accessor.get(IQuickInputService);
                const userDataProfileService = accessor.get(IUserDataProfileService);
                const userDataProfilesService = accessor.get(IUserDataProfilesService);
                const userDataProfileManagementService = accessor.get(IUserDataProfileManagementService);
                const notificationService = accessor.get(INotificationService);
                const profiles = userDataProfilesService.profiles.filter(p => !p.isDefault && !p.isTransient);
                if (profiles.length) {
                    const picks = await quickInputService.pick(profiles.map(profile => ({
                        label: profile.name,
                        description: profile.id === userDataProfileService.currentProfile.id ? localize('current', "Current") : undefined,
                        profile
                    })), {
                        title: localize('delete specific profile', "Delete Profile..."),
                        placeHolder: localize('pick profile to delete', "Select Profiles to Delete"),
                        canPickMany: true
                    });
                    if (picks) {
                        try {
                            await Promise.all(picks.map(pick => userDataProfileManagementService.removeProfile(pick.profile)));
                        }
                        catch (error) {
                            notificationService.error(error);
                        }
                    }
                }
            }
        }));
    }
    registerHelpAction() {
        this._register(registerAction2(class HelpAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.help',
                    title: PROFILES_TITLE,
                    category: Categories.Help,
                    menu: [{
                            id: MenuId.CommandPalette,
                        }],
                });
            }
            run(accessor) {
                return accessor.get(IOpenerService).open(URI.parse('https://aka.ms/vscode-profiles-help'));
            }
        }));
    }
    async reportWorkspaceProfileInfo() {
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        if (this.userDataProfilesService.profiles.length > 1) {
            this.telemetryService.publicLog2('profiles:count', { count: this.userDataProfilesService.profiles.length - 1 });
        }
        const workspaceId = await this.workspaceTagsService.getTelemetryWorkspaceId(this.workspaceContextService.getWorkspace(), this.workspaceContextService.getWorkbenchState());
        this.telemetryService.publicLog2('workspaceProfileInfo', {
            workspaceId,
            defaultProfile: this.userDataProfileService.currentProfile.isDefault
        });
    }
};
UserDataProfilesWorkbenchContribution = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IUserDataProfileManagementService),
    __param(3, ITelemetryService),
    __param(4, IWorkspaceContextService),
    __param(5, IWorkspaceTagsService),
    __param(6, IContextKeyService),
    __param(7, IEditorGroupsService),
    __param(8, IInstantiationService),
    __param(9, ILifecycleService),
    __param(10, IURLService),
    __param(11, IBrowserWorkbenchEnvironmentService)
], UserDataProfilesWorkbenchContribution);
export { UserDataProfilesWorkbenchContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkgsT0FBTyxFQUFvQix3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTVILE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsb0NBQW9DLEVBQUUsaUNBQWlDLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQy9RLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFF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