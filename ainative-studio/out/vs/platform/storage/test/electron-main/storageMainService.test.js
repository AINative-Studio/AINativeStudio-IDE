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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvdGVzdC9lbGVjdHJvbi1tYWluL3N0b3JhZ2VNYWluU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFFekQsT0FBTyxFQUFnQixZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFnQixNQUFNLHlCQUF5QixDQUFDO0FBRW5FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xILE9BQU8sRUFBRSxrQkFB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