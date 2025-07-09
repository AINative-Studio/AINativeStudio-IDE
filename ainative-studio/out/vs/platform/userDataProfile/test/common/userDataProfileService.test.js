/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { AbstractNativeEnvironmentService } from '../../../environment/common/environmentService.js';
import product from '../../../product/common/product.js';
import { InMemoryUserDataProfilesService } from '../../common/userDataProfile.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Event } from '../../../../base/common/event.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(_appSettingsHome) {
        super(Object.create(null), Object.create(null), { _serviceBrand: undefined, ...product });
        this._appSettingsHome = _appSettingsHome;
    }
    get userRoamingDataHome() { return this._appSettingsHome.with({ scheme: Schemas.vscodeUserData }); }
    get cacheHome() { return this.userRoamingDataHome; }
}
suite('UserDataProfileService (Common)', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let testObject;
    let environmentService;
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, fileSystemProvider));
        environmentService = new TestEnvironmentService(joinPath(ROOT, 'User'));
        testObject = disposables.add(new InMemoryUserDataProfilesService(environmentService, fileService, disposables.add(new UriIdentityService(fileService)), logService));
    });
    test('default profile', () => {
        assert.strictEqual(testObject.defaultProfile.isDefault, true);
        assert.strictEqual(testObject.defaultProfile.useDefaultFlags, undefined);
        assert.strictEqual(testObject.defaultProfile.location.toString(), environmentService.userRoamingDataHome.toString());
        assert.strictEqual(testObject.defaultProfile.globalStorageHome.toString(), joinPath(environmentService.userRoamingDataHome, 'globalStorage').toString());
        assert.strictEqual(testObject.defaultProfile.keybindingsResource.toString(), joinPath(environmentService.userRoamingDataHome, 'keybindings.json').toString());
        assert.strictEqual(testObject.defaultProfile.settingsResource.toString(), joinPath(environmentService.userRoamingDataHome, 'settings.json').toString());
        assert.strictEqual(testObject.defaultProfile.snippetsHome.toString(), joinPath(environmentService.userRoamingDataHome, 'snippets').toString());
        assert.strictEqual(testObject.defaultProfile.tasksResource.toString(), joinPath(environmentService.userRoamingDataHome, 'tasks.json').toString());
        assert.strictEqual(testObject.defaultProfile.extensionsResource.toString(), joinPath(environmentService.userRoamingDataHome, 'extensions.json').toString());
    });
    test('profiles always include default profile', () => {
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('create profile with id', async () => {
        const profile = await testObject.createProfile('id', 'name');
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(profile.id, 'id');
        assert.deepStrictEqual(profile.name, 'name');
        assert.deepStrictEqual(!!profile.isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
        assert.deepStrictEqual(testObject.profiles[1].name, profile.name);
    });
    test('create profile with id, name and transient', async () => {
        const profile = await testObject.createProfile('id', 'name', { transient: true });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(profile.id, 'id');
        assert.deepStrictEqual(profile.name, 'name');
        assert.deepStrictEqual(!!profile.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('create transient profiles', async () => {
        const profile1 = await testObject.createTransientProfile();
        const profile2 = await testObject.createTransientProfile();
        const profile3 = await testObject.createTransientProfile();
        const profile4 = await testObject.createProfile('id', 'name', { transient: true });
        assert.deepStrictEqual(testObject.profiles.length, 5);
        assert.deepStrictEqual(profile1.name, 'Temp 1');
        assert.deepStrictEqual(profile1.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[1].id, profile1.id);
        assert.deepStrictEqual(profile2.name, 'Temp 2');
        assert.deepStrictEqual(profile2.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[2].id, profile2.id);
        assert.deepStrictEqual(profile3.name, 'Temp 3');
        assert.deepStrictEqual(profile3.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[3].id, profile3.id);
        assert.deepStrictEqual(profile4.name, 'name');
        assert.deepStrictEqual(profile4.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[4].id, profile4.id);
    });
    test('create transient profile when a normal profile with Temp is already created', async () => {
        await testObject.createNamedProfile('Temp 1');
        const profile1 = await testObject.createTransientProfile();
        assert.deepStrictEqual(profile1.name, 'Temp 2');
        assert.deepStrictEqual(profile1.isTransient, true);
    });
    test('profiles include default profile with extension resource defined when transiet prrofile is created', async () => {
        await testObject.createTransientProfile();
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('profiles include default profile with extension resource undefined when transiet prrofile is removed', async () => {
        const profile = await testObject.createTransientProfile();
        await testObject.removeProfile(profile);
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('update named profile', async () => {
        const profile = await testObject.createNamedProfile('name');
        await testObject.updateProfile(profile, { name: 'name changed' });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'name changed');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('persist transient profile', async () => {
        const profile = await testObject.createTransientProfile();
        await testObject.updateProfile(profile, { name: 'saved', transient: false });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'saved');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('persist transient profile (2)', async () => {
        const profile = await testObject.createProfile('id', 'name', { transient: true });
        await testObject.updateProfile(profile, { name: 'saved', transient: false });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'saved');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('save transient profile', async () => {
        const profile = await testObject.createTransientProfile();
        await testObject.updateProfile(profile, { name: 'saved' });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'saved');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, true);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('profile using default profile for settings', async () => {
        const profile = await testObject.createNamedProfile('name', { useDefaultFlags: { settings: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { settings: true });
        assert.strictEqual(profile.settingsResource.toString(), testObject.defaultProfile.settingsResource.toString());
    });
    test('profile using default profile for keybindings', async () => {
        const profile = await testObject.createNamedProfile('name', { useDefaultFlags: { keybindings: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { keybindings: true });
        assert.strictEqual(profile.keybindingsResource.toString(), testObject.defaultProfile.keybindingsResource.toString());
    });
    test('profile using default profile for snippets', async () => {
        const profile = await testObject.createNamedProfile('name', { useDefaultFlags: { snippets: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { snippets: true });
        assert.strictEqual(profile.snippetsHome.toString(), testObject.defaultProfile.snippetsHome.toString());
    });
    test('profile using default profile for tasks', async () => {
        const profile = await testObject.createNamedProfile('name', { useDefaultFlags: { tasks: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { tasks: true });
        assert.strictEqual(profile.tasksResource.toString(), testObject.defaultProfile.tasksResource.toString());
    });
    test('profile using default profile for global state', async () => {
        const profile = await testObject.createNamedProfile('name', { useDefaultFlags: { globalState: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { globalState: true });
        assert.strictEqual(profile.globalStorageHome.toString(), testObject.defaultProfile.globalStorageHome.toString());
    });
    test('profile using default profile for extensions', async () => {
        const profile = await testObject.createNamedProfile('name', { useDefaultFlags: { extensions: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { extensions: true });
        assert.strictEqual(profile.extensionsResource.toString(), testObject.defaultProfile.extensionsResource.toString());
    });
    test('update profile using default profile for keybindings', async () => {
        let profile = await testObject.createNamedProfile('name');
        profile = await testObject.updateProfile(profile, { useDefaultFlags: { keybindings: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { keybindings: true });
        assert.strictEqual(profile.keybindingsResource.toString(), testObject.defaultProfile.keybindingsResource.toString());
    });
    test('create profile with a workspace associates it to the profile', async () => {
        const workspace = URI.file('/workspace1');
        const profile = await testObject.createProfile('id', 'name', {}, { id: workspace.path, uri: workspace });
        assert.deepStrictEqual(profile.workspaces?.length, 1);
        assert.deepStrictEqual(profile.workspaces?.[0].toString(), workspace.toString());
    });
    test('associate workspace to a profile should update workspaces', async () => {
        const profile = await testObject.createProfile('id', 'name', {});
        const workspace = URI.file('/workspace1');
        const promise = Event.toPromise(testObject.onDidChangeProfiles);
        await testObject.setProfileForWorkspace({ id: workspace.path, uri: workspace }, profile);
        const actual = await promise;
        assert.deepStrictEqual(actual.added.length, 0);
        assert.deepStrictEqual(actual.removed.length, 0);
        assert.deepStrictEqual(actual.updated.length, 1);
        assert.deepStrictEqual(actual.updated[0].id, profile.id);
        assert.deepStrictEqual(actual.updated[0].workspaces?.length, 1);
        assert.deepStrictEqual(actual.updated[0].workspaces[0].toString(), workspace.toString());
    });
    test('associate same workspace to a profile should not duplicate', async () => {
        const workspace = URI.file('/workspace1');
        const profile = await testObject.createProfile('id', 'name', { workspaces: [workspace] });
        await testObject.setProfileForWorkspace({ id: workspace.path, uri: workspace }, profile);
        assert.deepStrictEqual(testObject.profiles[1].workspaces?.length, 1);
        assert.deepStrictEqual(testObject.profiles[1].workspaces[0].toString(), workspace.toString());
    });
    test('associate workspace to another profile should update workspaces', async () => {
        const workspace = URI.file('/workspace1');
        const profile1 = await testObject.createProfile('id', 'name', {}, { id: workspace.path, uri: workspace });
        const profile2 = await testObject.createProfile('id1', 'name1');
        const promise = Event.toPromise(testObject.onDidChangeProfiles);
        await testObject.setProfileForWorkspace({ id: workspace.path, uri: workspace }, profile2);
        const actual = await promise;
        assert.deepStrictEqual(actual.added.length, 0);
        assert.deepStrictEqual(actual.removed.length, 0);
        assert.deepStrictEqual(actual.updated.length, 2);
        assert.deepStrictEqual(actual.updated[0].id, profile1.id);
        assert.deepStrictEqual(actual.updated[0].workspaces, undefined);
        assert.deepStrictEqual(actual.updated[1].id, profile2.id);
        assert.deepStrictEqual(actual.updated[1].workspaces?.length, 1);
        assert.deepStrictEqual(actual.updated[1].workspaces[0].toString(), workspace.toString());
    });
    test('unassociate workspace to a profile should update workspaces', async () => {
        const workspace = URI.file('/workspace1');
        const profile = await testObject.createProfile('id', 'name', {}, { id: workspace.path, uri: workspace });
        const promise = Event.toPromise(testObject.onDidChangeProfiles);
        testObject.unsetWorkspace({ id: workspace.path, uri: workspace });
        const actual = await promise;
        assert.deepStrictEqual(actual.added.length, 0);
        assert.deepStrictEqual(actual.removed.length, 0);
        assert.deepStrictEqual(actual.updated.length, 1);
        assert.deepStrictEqual(actual.updated[0].id, profile.id);
        assert.deepStrictEqual(actual.updated[0].workspaces, undefined);
    });
    test('update profile workspaces - add workspace', async () => {
        let profile = await testObject.createNamedProfile('name');
        const workspace = URI.file('/workspace1');
        profile = await testObject.updateProfile(profile, { workspaces: [workspace] });
        assert.deepStrictEqual(profile.workspaces?.length, 1);
        assert.deepStrictEqual(profile.workspaces[0].toString(), workspace.toString());
    });
    test('update profile workspaces - remove workspace', async () => {
        let profile = await testObject.createNamedProfile('name');
        const workspace = URI.file('/workspace1');
        profile = await testObject.updateProfile(profile, { workspaces: [workspace] });
        profile = await testObject.updateProfile(profile, { workspaces: [] });
        assert.deepStrictEqual(profile.workspaces, undefined);
    });
    test('update profile workspaces - replace workspace', async () => {
        let profile = await testObject.createNamedProfile('name');
        profile = await testObject.updateProfile(profile, { workspaces: [URI.file('/workspace1')] });
        const workspace = URI.file('/workspace2');
        profile = await testObject.updateProfile(profile, { workspaces: [workspace] });
        assert.deepStrictEqual(profile.workspaces?.length, 1);
        assert.deepStrictEqual(profile.workspaces[0].toString(), workspace.toString());
    });
    test('update default profile workspaces - add workspace', async () => {
        const workspace = URI.file('/workspace1');
        await testObject.updateProfile(testObject.defaultProfile, { workspaces: [workspace] });
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0], testObject.defaultProfile);
        assert.deepStrictEqual(testObject.defaultProfile.isDefault, true);
        assert.deepStrictEqual(testObject.defaultProfile.workspaces?.length, 1);
        assert.deepStrictEqual(testObject.defaultProfile.workspaces[0].toString(), workspace.toString());
    });
    test('can create transient and persistent profiles with same name', async () => {
        const profile1 = await testObject.createNamedProfile('name', { transient: true });
        const profile2 = await testObject.createNamedProfile('name', { transient: true });
        const profile3 = await testObject.createNamedProfile('name');
        assert.deepStrictEqual(profile1.name, 'name');
        assert.deepStrictEqual(!!profile1.isTransient, true);
        assert.deepStrictEqual(profile2.name, 'name');
        assert.deepStrictEqual(!!profile2.isTransient, true);
        assert.deepStrictEqual(profile3.name, 'name');
        assert.deepStrictEqual(!!profile3.isTransient, false);
        assert.deepStrictEqual(testObject.profiles.length, 4);
        assert.deepStrictEqual(testObject.profiles[1].id, profile3.id);
        assert.deepStrictEqual(testObject.profiles[2].id, profile1.id);
        assert.deepStrictEqual(testObject.profiles[3].id, profile2.id);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS90ZXN0L2NvbW1vbi91c2VyRGF0YVByb2ZpbGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDekQsT0FBTyxFQUFFLCtCQUErQixFQUEyQixNQUFNLGlDQUFpQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQyxD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LENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDeEcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVsRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDMUcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakUsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxFQUFF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