/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { notStrictEqual, strictEqual } from 'assert';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { OPTIONS, parseArgs } from '../../../environment/node/argv.js';
import { NativeEnvironmentService } from '../../../environment/node/environmentService.js';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { StateService } from '../../../state/node/stateService.js';
import { IS_NEW_KEY } from '../../common/storage.js';
import { StorageMainService } from '../../electron-main/storageMainService.js';
import { currentSessionDateStorageKey, firstSessionDateStorageKey } from '../../../telemetry/common/telemetry.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesMainService } from '../../../userDataProfile/electron-main/userDataProfile.js';
import { TestLifecycleMainService } from '../../../test/electron-main/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
suite('StorageMainService', function () {
    const disposables = new DisposableStore();
    const productService = { _serviceBrand: undefined, ...product };
    const inMemoryProfileRoot = URI.file('/location').with({ scheme: Schemas.inMemory });
    const inMemoryProfile = {
        id: 'id',
        name: 'inMemory',
        isDefault: false,
        location: inMemoryProfileRoot,
        globalStorageHome: joinPath(inMemoryProfileRoot, 'globalStorageHome'),
        settingsResource: joinPath(inMemoryProfileRoot, 'settingsResource'),
        keybindingsResource: joinPath(inMemoryProfileRoot, 'keybindingsResource'),
        tasksResource: joinPath(inMemoryProfileRoot, 'tasksResource'),
        snippetsHome: joinPath(inMemoryProfileRoot, 'snippetsHome'),
        promptsHome: joinPath(inMemoryProfileRoot, 'promptsHome'),
        extensionsResource: joinPath(inMemoryProfileRoot, 'extensionsResource'),
        cacheHome: joinPath(inMemoryProfileRoot, 'cache'),
    };
    class TestStorageMainService extends StorageMainService {
        getStorageOptions() {
            return {
                useInMemoryStorage: true
            };
        }
    }
    async function testStorage(storage, scope) {
        strictEqual(storage.isInMemory(), true);
        // Telemetry: added after init unless workspace/profile scoped
        if (scope === -1 /* StorageScope.APPLICATION */) {
            strictEqual(storage.items.size, 0);
            await storage.init();
            strictEqual(typeof storage.get(firstSessionDateStorageKey), 'string');
            strictEqual(typeof storage.get(currentSessionDateStorageKey), 'string');
        }
        else {
            await storage.init();
        }
        let storageChangeEvent = undefined;
        disposables.add(storage.onDidChangeStorage(e => {
            storageChangeEvent = e;
        }));
        let storageDidClose = false;
        disposables.add(storage.onDidCloseStorage(() => storageDidClose = true));
        // Basic store/get/remove
        const size = storage.items.size;
        storage.set('bar', 'foo');
        strictEqual(storageChangeEvent.key, 'bar');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        strictEqual(storage.get('bar'), 'foo');
        strictEqual(storage.get('barNumber'), '55');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.items.size, size + 3);
        storage.delete('bar');
        strictEqual(storage.get('bar'), undefined);
        strictEqual(storage.items.size, size + 2);
        // IS_NEW
        strictEqual(storage.get(IS_NEW_KEY), 'true');
        // Close
        await storage.close();
        strictEqual(storageDidClose, true);
    }
    teardown(() => {
        disposables.clear();
    });
    function createStorageService(lifecycleMainService = new TestLifecycleMainService()) {
        const environmentService = new NativeEnvironmentService(parseArgs(process.argv, OPTIONS), productService);
        const fileService = disposables.add(new FileService(new NullLogService()));
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const testStorageService = disposables.add(new TestStorageMainService(new NullLogService(), environmentService, disposables.add(new UserDataProfilesMainService(disposables.add(new StateService(1 /* SaveStrategy.DELAYED */, environmentService, new NullLogService(), fileService)), disposables.add(uriIdentityService), environmentService, fileService, new NullLogService())), lifecycleMainService, fileService, uriIdentityService));
        disposables.add(testStorageService.applicationStorage);
        return testStorageService;
    }
    test('basics (application)', function () {
        const storageMainService = createStorageService();
        return testStorage(storageMainService.applicationStorage, -1 /* StorageScope.APPLICATION */);
    });
    test('basics (profile)', function () {
        const storageMainService = createStorageService();
        const profile = inMemoryProfile;
        return testStorage(storageMainService.profileStorage(profile), 0 /* StorageScope.PROFILE */);
    });
    test('basics (workspace)', function () {
        const workspace = { id: generateUuid() };
        const storageMainService = createStorageService();
        return testStorage(storageMainService.workspaceStorage(workspace), 1 /* StorageScope.WORKSPACE */);
    });
    test('storage closed onWillShutdown', async function () {
        const lifecycleMainService = new TestLifecycleMainService();
        const storageMainService = createStorageService(lifecycleMainService);
        const profile = inMemoryProfile;
        const workspace = { id: generateUuid() };
        const workspaceStorage = storageMainService.workspaceStorage(workspace);
        let didCloseWorkspaceStorage = false;
        disposables.add(workspaceStorage.onDidCloseStorage(() => {
            didCloseWorkspaceStorage = true;
        }));
        const profileStorage = storageMainService.profileStorage(profile);
        let didCloseProfileStorage = false;
        disposables.add(profileStorage.onDidCloseStorage(() => {
            didCloseProfileStorage = true;
        }));
        const applicationStorage = storageMainService.applicationStorage;
        let didCloseApplicationStorage = false;
        disposables.add(applicationStorage.onDidCloseStorage(() => {
            didCloseApplicationStorage = true;
        }));
        strictEqual(applicationStorage, storageMainService.applicationStorage); // same instance as long as not closed
        strictEqual(profileStorage, storageMainService.profileStorage(profile)); // same instance as long as not closed
        strictEqual(workspaceStorage, storageMainService.workspaceStorage(workspace)); // same instance as long as not closed
        await applicationStorage.init();
        await profileStorage.init();
        await workspaceStorage.init();
        await lifecycleMainService.fireOnWillShutdown();
        strictEqual(didCloseApplicationStorage, true);
        strictEqual(didCloseProfileStorage, true);
        strictEqual(didCloseWorkspaceStorage, true);
        const profileStorage2 = storageMainService.profileStorage(profile);
        notStrictEqual(profileStorage, profileStorage2);
        const workspaceStorage2 = storageMainService.workspaceStorage(workspace);
        notStrictEqual(workspaceStorage, workspaceStorage2);
        await workspaceStorage2.close();
    });
    test('storage closed before init works', async function () {
        const storageMainService = createStorageService();
        const profile = inMemoryProfile;
        const workspace = { id: generateUuid() };
        const workspaceStorage = storageMainService.workspaceStorage(workspace);
        let didCloseWorkspaceStorage = false;
        disposables.add(workspaceStorage.onDidCloseStorage(() => {
            didCloseWorkspaceStorage = true;
        }));
        const profileStorage = storageMainService.profileStorage(profile);
        let didCloseProfileStorage = false;
        disposables.add(profileStorage.onDidCloseStorage(() => {
            didCloseProfileStorage = true;
        }));
        const applicationStorage = storageMainService.applicationStorage;
        let didCloseApplicationStorage = false;
        disposables.add(applicationStorage.onDidCloseStorage(() => {
            didCloseApplicationStorage = true;
        }));
        await applicationStorage.close();
        await profileStorage.close();
        await workspaceStorage.close();
        strictEqual(didCloseApplicationStorage, true);
        strictEqual(didCloseProfileStorage, true);
        strictEqual(didCloseWorkspaceStorage, true);
    });
    test('storage closed before init awaits works', async function () {
        const storageMainService = createStorageService();
        const profile = inMemoryProfile;
        const workspace = { id: generateUuid() };
        const workspaceStorage = storageMainService.workspaceStorage(workspace);
        let didCloseWorkspaceStorage = false;
        disposables.add(workspaceStorage.onDidCloseStorage(() => {
            didCloseWorkspaceStorage = true;
        }));
        const profileStorage = storageMainService.profileStorage(profile);
        let didCloseProfileStorage = false;
        disposables.add(profileStorage.onDidCloseStorage(() => {
            didCloseProfileStorage = true;
        }));
        const applicationtorage = storageMainService.applicationStorage;
        let didCloseApplicationStorage = false;
        disposables.add(applicationtorage.onDidCloseStorage(() => {
            didCloseApplicationStorage = true;
        }));
        applicationtorage.init();
        profileStorage.init();
        workspaceStorage.init();
        await applicationtorage.close();
        await profileStorage.close();
        await workspaceStorage.close();
        strictEqual(didCloseApplicationStorage, true);
        strictEqual(didCloseProfileStorage, true);
        strictEqual(didCloseWorkspaceStorage, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RvcmFnZS90ZXN0L2VsZWN0cm9uLW1haW4vc3RvcmFnZU1haW5TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUV6RCxPQUFPLEVBQWdCLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQWdCLE1BQU0seUJBQXlCLENBQUM7QUFFbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDL0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEgsT0FBTyxFQUFFLGtCQUFrQixF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