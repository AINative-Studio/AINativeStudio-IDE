/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { EditSessionsContribution } from '../../browser/editSessions.contribution.js';
import { ProgressService } from '../../../../services/progress/browser/progressService.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ISCMService } from '../../../scm/common/scm.js';
import { SCMService } from '../../../scm/common/scmService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { mock } from '../../../../../base/test/common/mock.js';
import * as sinon from 'sinon';
import assert from 'assert';
import { ChangeType, FileType, IEditSessionsLogService, IEditSessionsStorageService } from '../../common/editSessions.js';
import { URI } from '../../../../../base/common/uri.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { Event } from '../../../../../base/common/event.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IEditSessionIdentityService } from '../../../../../platform/workspace/common/editSessions.js';
import { IUserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IWorkspaceIdentityService, WorkspaceIdentityService } from '../../../../services/workspaces/common/workspaceIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const folderName = 'test-folder';
const folderUri = URI.file(`/${folderName}`);
suite('Edit session sync', () => {
    let instantiationService;
    let editSessionsContribution;
    let fileService;
    let sandbox;
    const disposables = new DisposableStore();
    suiteSetup(() => {
        sandbox = sinon.createSandbox();
        instantiationService = new TestInstantiationService();
        // Set up filesystem
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        fileService.registerProvider(Schemas.file, fileSystemProvider);
        // Stub out all services
        instantiationService.stub(IEditSessionsLogService, logService);
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ILifecycleService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillShutdown = Event.None;
            }
        });
        instantiationService.stub(INotificationService, new TestNotificationService());
        instantiationService.stub(IProductService, { 'editSessions.store': { url: 'https://test.com', canSwitch: true, authenticationProviders: {} } });
        instantiationService.stub(IStorageService, new TestStorageService());
        instantiationService.stub(IUriIdentityService, new UriIdentityService(fileService));
        instantiationService.stub(IEditSessionsStorageService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidSignIn = Event.None;
                this.onDidSignOut = Event.None;
            }
        });
        instantiationService.stub(IExtensionService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeExtensions = Event.None;
            }
        });
        instantiationService.stub(IProgressService, ProgressService);
        instantiationService.stub(ISCMService, SCMService);
        instantiationService.stub(IEnvironmentService, TestEnvironmentService);
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IDialogService, new class extends mock() {
            async prompt(prompt) {
                const result = prompt.buttons?.[0].run({ checkboxChecked: false });
                return { result };
            }
            async confirm() {
                return { confirmed: false };
            }
        });
        instantiationService.stub(IRemoteAgentService, new class extends mock() {
            async getEnvironment() {
                return null;
            }
        });
        instantiationService.stub(IConfigurationService, new TestConfigurationService({ workbench: { experimental: { editSessions: { enabled: true } } } }));
        instantiationService.stub(IWorkspaceContextService, new class extends mock() {
            getWorkspace() {
                return {
                    id: 'workspace-id',
                    folders: [{
                            uri: folderUri,
                            name: folderName,
                            index: 0,
                            toResource: (relativePath) => joinPath(folderUri, relativePath)
                        }]
                };
            }
            getWorkbenchState() {
                return 2 /* WorkbenchState.FOLDER */;
            }
        });
        // Stub repositories
        instantiationService.stub(ISCMService, '_repositories', new Map());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IThemeService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidColorThemeChange = Event.None;
                this.onDidFileIconThemeChange = Event.None;
            }
        });
        instantiationService.stub(IViewDescriptorService, {
            onDidChangeLocation: Event.None
        });
        instantiationService.stub(ITextModelService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.registerTextModelContentProvider = () => ({ dispose: () => { } });
            }
        });
        instantiationService.stub(IEditorService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.saveAll = async (_options) => { return { success: true, editors: [] }; };
            }
        });
        instantiationService.stub(IEditSessionIdentityService, new class extends mock() {
            async getEditSessionIdentifier() {
                return 'test-identity';
            }
        });
        instantiationService.set(IWorkspaceIdentityService, instantiationService.createInstance(WorkspaceIdentityService));
        instantiationService.stub(IUserDataProfilesService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.defaultProfile = {
                    id: 'default',
                    name: 'Default',
                    isDefault: true,
                    location: URI.file('location'),
                    globalStorageHome: URI.file('globalStorageHome'),
                    settingsResource: URI.file('settingsResource'),
                    keybindingsResource: URI.file('keybindingsResource'),
                    tasksResource: URI.file('tasksResource'),
                    snippetsHome: URI.file('snippetsHome'),
                    promptsHome: URI.file('promptsHome'),
                    extensionsResource: URI.file('extensionsResource'),
                    cacheHome: URI.file('cacheHome'),
                };
            }
        });
        editSessionsContribution = instantiationService.createInstance(EditSessionsContribution);
    });
    teardown(() => {
        sinon.restore();
        disposables.clear();
    });
    suiteTeardown(() => {
        disposables.dispose();
    });
    test('Can apply edit session', async function () {
        const fileUri = joinPath(folderUri, 'dir1', 'README.md');
        const fileContents = '# readme';
        const editSession = {
            version: 1,
            folders: [
                {
                    name: folderName,
                    workingChanges: [
                        {
                            relativeFilePath: 'dir1/README.md',
                            fileType: FileType.File,
                            contents: fileContents,
                            type: ChangeType.Addition
                        }
                    ]
                }
            ]
        };
        // Stub sync service to return edit session data
        const readStub = sandbox.stub().returns({ content: JSON.stringify(editSession), ref: '0' });
        instantiationService.stub(IEditSessionsStorageService, 'read', readStub);
        // Create root folder
        await fileService.createFolder(folderUri);
        // Resume edit session
        await editSessionsContribution.resumeEditSession();
        // Verify edit session was correctly applied
        assert.equal((await fileService.readFile(fileUri)).value.toString(), fileContents);
    });
    test('Edit session not stored if there are no edits', async function () {
        const writeStub = sandbox.stub();
        instantiationService.stub(IEditSessionsStorageService, 'write', writeStub);
        // Create root folder
        await fileService.createFolder(folderUri);
        await editSessionsContribution.storeEditSession(true, CancellationToken.None);
        // Verify that we did not attempt to write the edit session
        assert.equal(writeStub.called, false);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFNlc3Npb25zL3Rlc3QvYnJvd3Nlci9lZGl0U2Vzc2lvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDaEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSx1REFBdUQsQ0FB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