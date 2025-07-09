/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { isLinux, isWindows } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { ITerminalInstanceService } from '../../browser/terminal.js';
import { TerminalProfileQuickpick } from '../../browser/terminalProfileQuickpick.js';
import { TerminalProfileService } from '../../browser/terminalProfileService.js';
import { ITerminalProfileService } from '../../common/terminal.js';
import { ITerminalContributionService } from '../../common/terminalExtensionPoints.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
class TestTerminalProfileService extends TerminalProfileService {
    refreshAvailableProfiles() {
        this.hasRefreshedProfiles = this._refreshAvailableProfilesNow();
    }
    refreshAndAwaitAvailableProfiles() {
        this.refreshAvailableProfiles();
        if (!this.hasRefreshedProfiles) {
            throw new Error('has not refreshed profiles yet');
        }
        return this.hasRefreshedProfiles;
    }
}
class MockTerminalProfileService {
    constructor() {
        this.availableProfiles = [];
        this.contributedProfiles = [];
    }
    async getPlatformKey() {
        return 'linux';
    }
    getDefaultProfileName() {
        return this._defaultProfileName;
    }
    setProfiles(profiles, contributed) {
        this.availableProfiles = profiles;
        this.contributedProfiles = contributed;
    }
    setDefaultProfileName(name) {
        this._defaultProfileName = name;
    }
}
class MockQuickInputService {
    constructor() {
        this._pick = powershellPick;
    }
    async pick(picks, options, token) {
        Promise.resolve(picks);
        return this._pick;
    }
    setPick(pick) {
        this._pick = pick;
    }
}
class TestTerminalProfileQuickpick extends TerminalProfileQuickpick {
}
class TestTerminalExtensionService extends TestExtensionService {
    constructor() {
        super(...arguments);
        this._onDidChangeExtensions = new Emitter();
    }
}
class TestTerminalContributionService {
    constructor() {
        this.terminalProfiles = [];
    }
    setProfiles(profiles) {
        this.terminalProfiles = profiles;
    }
}
class TestTerminalInstanceService {
    constructor() {
        this._profiles = new Map();
        this._hasReturnedNone = true;
    }
    async getBackend(remoteAuthority) {
        return {
            getProfiles: async () => {
                if (this._hasReturnedNone) {
                    return this._profiles.get(remoteAuthority ?? '') || [];
                }
                else {
                    this._hasReturnedNone = true;
                    return [];
                }
            }
        };
    }
    setProfiles(remoteAuthority, profiles) {
        this._profiles.set(remoteAuthority ?? '', profiles);
    }
    setReturnNone() {
        this._hasReturnedNone = false;
    }
}
class TestRemoteAgentService {
    setEnvironment(os) {
        this._os = os;
    }
    async getEnvironment() {
        return { os: this._os };
    }
}
const defaultTerminalConfig = { profiles: { windows: {}, linux: {}, osx: {} } };
let powershellProfile = {
    profileName: 'PowerShell',
    path: 'C:\\Powershell.exe',
    isDefault: true,
    icon: Codicon.terminalPowershell
};
let jsdebugProfile = {
    extensionIdentifier: 'ms-vscode.js-debug-nightly',
    icon: 'debug',
    id: 'extension.js-debug.debugTerminal',
    title: 'JavaScript Debug Terminal'
};
const powershellPick = { label: 'Powershell', profile: powershellProfile, profileName: powershellProfile.profileName };
const jsdebugPick = { label: 'Javascript Debug Terminal', profile: jsdebugProfile, profileName: jsdebugProfile.title };
suite('TerminalProfileService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let terminalInstanceService;
    let terminalProfileService;
    let remoteAgentService;
    let extensionService;
    let environmentService;
    let instantiationService;
    setup(async () => {
        configurationService = new TestConfigurationService({
            files: {},
            terminal: {
                integrated: defaultTerminalConfig
            }
        });
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService
        }, store);
        remoteAgentService = new TestRemoteAgentService();
        terminalInstanceService = new TestTerminalInstanceService();
        extensionService = new TestTerminalExtensionService();
        environmentService = { remoteAuthority: undefined };
        const themeService = new TestThemeService();
        const terminalContributionService = new TestTerminalContributionService();
        instantiationService.stub(IExtensionService, extensionService);
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        instantiationService.stub(ITerminalContributionService, terminalContributionService);
        instantiationService.stub(ITerminalInstanceService, terminalInstanceService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(IThemeService, themeService);
        terminalProfileService = store.add(instantiationService.createInstance(TestTerminalProfileService));
        //reset as these properties are changed in each test
        powershellProfile = {
            profileName: 'PowerShell',
            path: 'C:\\Powershell.exe',
            isDefault: true,
            icon: Codicon.terminalPowershell
        };
        jsdebugProfile = {
            extensionIdentifier: 'ms-vscode.js-debug-nightly',
            icon: 'debug',
            id: 'extension.js-debug.debugTerminal',
            title: 'JavaScript Debug Terminal'
        };
        terminalInstanceService.setProfiles(undefined, [powershellProfile]);
        terminalInstanceService.setProfiles('fakeremote', []);
        terminalContributionService.setProfiles([jsdebugProfile]);
        if (isWindows) {
            remoteAgentService.setEnvironment(1 /* OperatingSystem.Windows */);
        }
        else if (isLinux) {
            remoteAgentService.setEnvironment(3 /* OperatingSystem.Linux */);
        }
        else {
            remoteAgentService.setEnvironment(2 /* OperatingSystem.Macintosh */);
        }
        configurationService.setUserConfiguration('terminal', { integrated: defaultTerminalConfig });
    });
    suite('Contributed Profiles', () => {
        test('should filter out contributed profiles set to null (Linux)', async () => {
            remoteAgentService.setEnvironment(3 /* OperatingSystem.Linux */);
            await configurationService.setUserConfiguration('terminal', {
                integrated: {
                    profiles: {
                        linux: {
                            'JavaScript Debug Terminal': null
                        }
                    }
                }
            });
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true, source: 2 /* ConfigurationTarget.USER */ });
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, []);
        });
        test('should filter out contributed profiles set to null (Windows)', async () => {
            remoteAgentService.setEnvironment(1 /* OperatingSystem.Windows */);
            await configurationService.setUserConfiguration('terminal', {
                integrated: {
                    profiles: {
                        windows: {
                            'JavaScript Debug Terminal': null
                        }
                    }
                }
            });
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true, source: 2 /* ConfigurationTarget.USER */ });
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, []);
        });
        test('should filter out contributed profiles set to null (macOS)', async () => {
            remoteAgentService.setEnvironment(2 /* OperatingSystem.Macintosh */);
            await configurationService.setUserConfiguration('terminal', {
                integrated: {
                    profiles: {
                        osx: {
                            'JavaScript Debug Terminal': null
                        }
                    }
                }
            });
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true, source: 2 /* ConfigurationTarget.USER */ });
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, []);
        });
        test('should include contributed profiles', async () => {
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
        });
    });
    test('should get profiles from remoteTerminalService when there is a remote authority', async () => {
        environmentService = { remoteAuthority: 'fakeremote' };
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        terminalProfileService = store.add(instantiationService.createInstance(TestTerminalProfileService));
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(terminalProfileService.availableProfiles, []);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
        terminalInstanceService.setProfiles('fakeremote', [powershellProfile]);
        await terminalProfileService.refreshAndAwaitAvailableProfiles();
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
    });
    test('should fire onDidChangeAvailableProfiles only when available profiles have changed via user config', async () => {
        powershellProfile.icon = Codicon.lightBulb;
        let calls = [];
        store.add(terminalProfileService.onDidChangeAvailableProfiles(e => calls.push(e)));
        await configurationService.setUserConfiguration('terminal', {
            integrated: {
                profiles: {
                    windows: powershellProfile,
                    linux: powershellProfile,
                    osx: powershellProfile
                }
            }
        });
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(calls, [
            [powershellProfile]
        ]);
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
        calls = [];
        await terminalProfileService.refreshAndAwaitAvailableProfiles();
        deepStrictEqual(calls, []);
    });
    test('should fire onDidChangeAvailableProfiles when available or contributed profiles have changed via remote/localTerminalService', async () => {
        powershellProfile.isDefault = false;
        terminalInstanceService.setProfiles(undefined, [powershellProfile]);
        const calls = [];
        store.add(terminalProfileService.onDidChangeAvailableProfiles(e => calls.push(e)));
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(calls, [
            [powershellProfile]
        ]);
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
    });
    test('should call refreshAvailableProfiles _onDidChangeExtensions', async () => {
        extensionService._onDidChangeExtensions.fire();
        const calls = [];
        store.add(terminalProfileService.onDidChangeAvailableProfiles(e => calls.push(e)));
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(calls, [
            [powershellProfile]
        ]);
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
    });
    suite('Profiles Quickpick', () => {
        let quickInputService;
        let mockTerminalProfileService;
        let terminalProfileQuickpick;
        setup(async () => {
            quickInputService = new MockQuickInputService();
            mockTerminalProfileService = new MockTerminalProfileService();
            instantiationService.stub(IQuickInputService, quickInputService);
            instantiationService.stub(ITerminalProfileService, mockTerminalProfileService);
            terminalProfileQuickpick = instantiationService.createInstance(TestTerminalProfileQuickpick);
        });
        test('setDefault', async () => {
            powershellProfile.isDefault = false;
            mockTerminalProfileService.setProfiles([powershellProfile], [jsdebugProfile]);
            mockTerminalProfileService.setDefaultProfileName(jsdebugProfile.title);
            const result = await terminalProfileQuickpick.showAndGetResult('setDefault');
            deepStrictEqual(result, powershellProfile.profileName);
        });
        test('setDefault to contributed', async () => {
            mockTerminalProfileService.setDefaultProfileName(powershellProfile.profileName);
            quickInputService.setPick(jsdebugPick);
            const result = await terminalProfileQuickpick.showAndGetResult('setDefault');
            const expected = {
                config: {
                    extensionIdentifier: jsdebugProfile.extensionIdentifier,
                    id: jsdebugProfile.id,
                    options: { color: undefined, icon: 'debug' },
                    title: jsdebugProfile.title,
                },
                keyMods: undefined
            };
            deepStrictEqual(result, expected);
        });
        test('createInstance', async () => {
            mockTerminalProfileService.setDefaultProfileName(powershellProfile.profileName);
            const pick = { ...powershellPick, keyMods: { alt: true, ctrlCmd: false } };
            quickInputService.setPick(pick);
            const result = await terminalProfileQuickpick.showAndGetResult('createInstance');
            deepStrictEqual(result, { config: powershellProfile, keyMods: { alt: true, ctrlCmd: false } });
        });
        test('createInstance with contributed', async () => {
            const pick = { ...jsdebugPick, keyMods: { alt: true, ctrlCmd: false } };
            quickInputService.setPick(pick);
            const result = await terminalProfileQuickpick.showAndGetResult('createInstance');
            const expected = {
                config: {
                    extensionIdentifier: jsdebugProfile.extensionIdentifier,
                    id: jsdebugProfile.id,
                    options: { color: undefined, icon: 'debug' },
                    title: jsdebugProfile.title,
                },
                keyMods: { alt: true, ctrlCmd: false }
            };
            deepStrictEqual(result, expected);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlU2VydmljZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsUHJvZmlsZVNlcnZpY2UuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFFekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDM0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFFekgsT0FBTyxFQUFnQixrQkFBa0IsRUFBd0IsTUFBTSx5REFBeUQsQ0FBQztBQUdqSSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckUsT0FBTyxFQUF5Qix3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pGLE9BQU8sRUFBMEIsdUJBQXVCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMzRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMvRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUV4RixNQUFNLDBCQUEyQixTQUFRLHNCQUFzQjtJQUVyRCx3QkFBd0I7UUFDaEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFDRCxnQ0FBZ0M7UUFDL0IsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRUQsTUFBTSwwQkFBMEI7SUFBaEM7UUFHQyxzQkFBaUIsR0FBb0MsRUFBRSxDQUFDO1FBQ3hELHdCQUFtQixHQUE2QyxFQUFFLENBQUM7SUFjcEUsQ0FBQztJQWJBLEtBQUssQ0FBQyxjQUFjO1FBQ25CLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFDRCxxQkFBcUI7UUFDcEIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztJQUNELFdBQVcsQ0FBQyxRQUE0QixFQUFFLFdBQXdDO1FBQ2pGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUM7UUFDbEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFdBQVcsQ0FBQztJQUN4QyxDQUFDO0lBQ0QscUJBQXFCLENBQUMsSUFBWTtRQUNqQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0lBQ2pDLENBQUM7Q0FDRDtBQUdELE1BQU0scUJBQXFCO0lBQTNCO1FBQ0MsVUFBSyxHQUEwQixjQUFjLENBQUM7SUFZL0MsQ0FBQztJQVJBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBVSxFQUFFLE9BQWEsRUFBRSxLQUFXO1FBQ2hELE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBMkI7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSw0QkFBNkIsU0FBUSx3QkFBd0I7Q0FFbEU7QUFFRCxNQUFNLDRCQUE2QixTQUFRLG9CQUFvQjtJQUEvRDs7UUFDVSwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO0lBQ3ZELENBQUM7Q0FBQTtBQUVELE1BQU0sK0JBQStCO0lBQXJDO1FBRUMscUJBQWdCLEdBQXlDLEVBQUUsQ0FBQztJQUk3RCxDQUFDO0lBSEEsV0FBVyxDQUFDLFFBQXFDO1FBQ2hELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRUQsTUFBTSwyQkFBMkI7SUFBakM7UUFDUyxjQUFTLEdBQW9DLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdkQscUJBQWdCLEdBQUcsSUFBSSxDQUFDO0lBbUJqQyxDQUFDO0lBbEJBLEtBQUssQ0FBQyxVQUFVLENBQUMsZUFBbUM7UUFDbkQsT0FBTztZQUNOLFdBQVcsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDdkIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztvQkFDN0IsT0FBTyxFQUFFLENBQUM7Z0JBQ1gsQ0FBQztZQUNGLENBQUM7U0FDMEMsQ0FBQztJQUM5QyxDQUFDO0lBQ0QsV0FBVyxDQUFDLGVBQW1DLEVBQUUsUUFBNEI7UUFDNUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBQ0QsYUFBYTtRQUNaLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxzQkFBc0I7SUFFM0IsY0FBYyxDQUFDLEVBQW1CO1FBQ2pDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUNELEtBQUssQ0FBQyxjQUFjO1FBQ25CLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBb0QsQ0FBQztJQUMzRSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHFCQUFxQixHQUFvQyxFQUFFLFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUNqSCxJQUFJLGlCQUFpQixHQUFHO0lBQ3ZCLFdBQVcsRUFBRSxZQUFZO0lBQ3pCLElBQUksRUFBRSxvQkFBb0I7SUFDMUIsU0FBUyxFQUFFLElBQUk7SUFDZixJQUFJLEVBQUUsT0FBTyxDQUFDLGtCQUFrQjtDQUNoQyxDQUFDO0FBQ0YsSUFBSSxjQUFjLEdBQUc7SUFDcEIsbUJBQW1CLEVBQUUsNEJBQTRCO0lBQ2pELElBQUksRUFBRSxPQUFPO0lBQ2IsRUFBRSxFQUFFLGtDQUFrQztJQUN0QyxLQUFLLEVBQUUsMkJBQTJCO0NBQ2xDLENBQUM7QUFDRixNQUFNLGNBQWMsR0FBRyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN2SCxNQUFNLFdBQVcsR0FBRyxFQUFFLEtBQUssRUFBRSwyQkFBMkIsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7QUFFdkgsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSx1QkFBb0QsQ0FBQztJQUN6RCxJQUFJLHNCQUFrRCxDQUFDO0lBQ3ZELElBQUksa0JBQTBDLENBQUM7SUFDL0MsSUFBSSxnQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGtCQUFnRCxDQUFDO0lBQ3JELElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLENBQUM7WUFDbkQsS0FBSyxFQUFFLEVBQUU7WUFDVCxRQUFRLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLHFCQUFxQjthQUNqQztTQUNELENBQUMsQ0FBQztRQUNILG9CQUFvQixHQUFHLDZCQUE2QixDQUFDO1lBQ3BELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLG9CQUFvQjtTQUNoRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ1Ysa0JBQWtCLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1FBQ2xELHVCQUF1QixHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQztRQUM1RCxnQkFBZ0IsR0FBRyxJQUFJLDRCQUE0QixFQUFFLENBQUM7UUFDdEQsa0JBQWtCLEdBQUcsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUF5RCxDQUFDO1FBRTNHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QyxNQUFNLDJCQUEyQixHQUFHLElBQUksK0JBQStCLEVBQUUsQ0FBQztRQUUxRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMvRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNuRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUNyRixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUM3RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM1RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRXZELHNCQUFzQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUVwRyxvREFBb0Q7UUFDcEQsaUJBQWlCLEdBQUc7WUFDbkIsV0FBVyxFQUFFLFlBQVk7WUFDekIsSUFBSSxFQUFFLG9CQUFvQjtZQUMxQixTQUFTLEVBQUUsSUFBSTtZQUNmLElBQUksRUFBRSxPQUFPLENBQUMsa0JBQWtCO1NBQ2hDLENBQUM7UUFDRixjQUFjLEdBQUc7WUFDaEIsbUJBQW1CLEVBQUUsNEJBQTRCO1lBQ2pELElBQUksRUFBRSxPQUFPO1lBQ2IsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsMkJBQTJCO1NBQ2xDLENBQUM7UUFFRix1QkFBdUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEQsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUMxRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2Ysa0JBQWtCLENBQUMsY0FBYyxpQ0FBeUIsQ0FBQztRQUM1RCxDQUFDO2FBQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsQ0FBQyxjQUFjLCtCQUF1QixDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ1Asa0JBQWtCLENBQUMsY0FBYyxtQ0FBMkIsQ0FBQztRQUM5RCxDQUFDO1FBQ0Qsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQztJQUM5RixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDbEMsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdFLGtCQUFrQixDQUFDLGNBQWMsK0JBQXVCLENBQUM7WUFDekQsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNELFVBQVUsRUFBRTtvQkFDWCxRQUFRLEVBQUU7d0JBQ1QsS0FBSyxFQUFFOzRCQUNOLDJCQUEyQixFQUFFLElBQUk7eUJBQ2pDO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQyxDQUFDO1lBQ0gsb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sa0NBQTBCLEVBQVMsQ0FBQyxDQUFDO1lBQ3pJLE1BQU0sc0JBQXNCLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUNoRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDL0UsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDhEQUE4RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9FLGtCQUFrQixDQUFDLGNBQWMsaUNBQXlCLENBQUM7WUFDM0QsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNELFVBQVUsRUFBRTtvQkFDWCxRQUFRLEVBQUU7d0JBQ1QsT0FBTyxFQUFFOzRCQUNSLDJCQUEyQixFQUFFLElBQUk7eUJBQ2pDO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQyxDQUFDO1lBQ0gsb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sa0NBQTBCLEVBQVMsQ0FBQyxDQUFDO1lBQ3pJLE1BQU0sc0JBQXNCLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUNoRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDL0UsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdFLGtCQUFrQixDQUFDLGNBQWMsbUNBQTJCLENBQUM7WUFDN0QsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNELFVBQVUsRUFBRTtvQkFDWCxRQUFRLEVBQUU7d0JBQ1QsR0FBRyxFQUFFOzRCQUNKLDJCQUEyQixFQUFFLElBQUk7eUJBQ2pDO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQyxDQUFDO1lBQ0gsb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sa0NBQTBCLEVBQVMsQ0FBQyxDQUFDO1lBQ3pJLE1BQU0sc0JBQXNCLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUNoRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDL0UsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RELE1BQU0sc0JBQXNCLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUNoRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDL0UsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUMvRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlGQUFpRixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xHLGtCQUFrQixHQUFHLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBeUQsQ0FBQztRQUM5RyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM1RSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQztRQUNsRCxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUQsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUM5RSx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sc0JBQXNCLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztRQUNoRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDL0UsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvR0FBb0csRUFBRSxLQUFLLElBQUksRUFBRTtRQUNySCxpQkFBaUIsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUMzQyxJQUFJLEtBQUssR0FBeUIsRUFBRSxDQUFDO1FBQ3JDLEtBQUssQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUMzRCxVQUFVLEVBQUU7Z0JBQ1gsUUFBUSxFQUFFO29CQUNULE9BQU8sRUFBRSxpQkFBaUI7b0JBQzFCLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLEdBQUcsRUFBRSxpQkFBaUI7aUJBQ3RCO2FBQ0Q7U0FDRCxDQUFDLENBQUM7UUFDSCxNQUFNLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDO1FBQ2xELGVBQWUsQ0FBQyxLQUFLLEVBQUU7WUFDdEIsQ0FBQyxpQkFBaUIsQ0FBQztTQUNuQixDQUFDLENBQUM7UUFDSCxlQUFlLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDL0UsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUM5RSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ1gsTUFBTSxzQkFBc0IsQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1FBQ2hFLGVBQWUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEhBQThILEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0ksaUJBQWlCLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUNwQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sS0FBSyxHQUF5QixFQUFFLENBQUM7UUFDdkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUM7UUFDbEQsZUFBZSxDQUFDLEtBQUssRUFBRTtZQUN0QixDQUFDLGlCQUFpQixDQUFDO1NBQ25CLENBQUMsQ0FBQztRQUNILGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUMvRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQy9FLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZEQUE2RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlFLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9DLE1BQU0sS0FBSyxHQUF5QixFQUFFLENBQUM7UUFDdkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUM7UUFDbEQsZUFBZSxDQUFDLEtBQUssRUFBRTtZQUN0QixDQUFDLGlCQUFpQixDQUFDO1NBQ25CLENBQUMsQ0FBQztRQUNILGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUMvRSxlQUFlLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQy9FLENBQUMsQ0FBQyxDQUFDO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxJQUFJLGlCQUF3QyxDQUFDO1FBQzdDLElBQUksMEJBQXNELENBQUM7UUFDM0QsSUFBSSx3QkFBc0QsQ0FBQztRQUMzRCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDaEIsaUJBQWlCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQ2hELDBCQUEwQixHQUFHLElBQUksMEJBQTBCLEVBQUUsQ0FBQztZQUM5RCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUNqRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztZQUMvRSx3QkFBd0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUM5RixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0IsaUJBQWlCLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUNwQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUM5RSwwQkFBMEIsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkUsTUFBTSxNQUFNLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM3RSxlQUFlLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVDLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2hGLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN2QyxNQUFNLE1BQU0sR0FBRyxNQUFNLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdFLE1BQU0sUUFBUSxHQUFHO2dCQUNoQixNQUFNLEVBQUU7b0JBQ1AsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLG1CQUFtQjtvQkFDdkQsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUFFO29CQUNyQixPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7b0JBQzVDLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSztpQkFDM0I7Z0JBQ0QsT0FBTyxFQUFFLFNBQVM7YUFDbEIsQ0FBQztZQUNGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDakMsMEJBQTBCLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEYsTUFBTSxJQUFJLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzNFLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDakYsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEcsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbEQsTUFBTSxJQUFJLEdBQUcsRUFBRSxHQUFHLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3hFLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDakYsTUFBTSxRQUFRLEdBQUc7Z0JBQ2hCLE1BQU0sRUFBRTtvQkFDUCxtQkFBbUIsRUFBRSxjQUFjLENBQUMsbUJBQW1CO29CQUN2RCxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUU7b0JBQ3JCLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtvQkFDNUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO2lCQUMzQjtnQkFDRCxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7YUFDdEMsQ0FBQztZQUNGLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=