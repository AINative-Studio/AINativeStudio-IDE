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
import assert from 'assert';
import * as sinon from 'sinon';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService, IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspacesService } from '../../../../../platform/workspaces/common/workspaces.js';
import { FileDialogService } from '../../electron-sandbox/fileDialogService.js';
import { IEditorService } from '../../../editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IHistoryService } from '../../../history/common/history.js';
import { IHostService } from '../../../host/browser/host.js';
import { IPathService } from '../../../path/common/pathService.js';
import { BrowserWorkspaceEditingService } from '../../../workspaces/browser/workspaceEditingService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
let TestFileDialogService = class TestFileDialogService extends FileDialogService {
    constructor(simple, hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, nativeHostService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService) {
        super(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, nativeHostService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService);
        this.simple = simple;
    }
    getSimpleFileDialog() {
        if (this.simple) {
            return this.simple;
        }
        else {
            return super.getSimpleFileDialog();
        }
    }
};
TestFileDialogService = __decorate([
    __param(1, IHostService),
    __param(2, IWorkspaceContextService),
    __param(3, IHistoryService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, IFileService),
    __param(8, IOpenerService),
    __param(9, INativeHostService),
    __param(10, IDialogService),
    __param(11, ILanguageService),
    __param(12, IWorkspacesService),
    __param(13, ILabelService),
    __param(14, IPathService),
    __param(15, ICommandService),
    __param(16, IEditorService),
    __param(17, ICodeEditorService),
    __param(18, ILogService)
], TestFileDialogService);
suite('FileDialogService', function () {
    let instantiationService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const testFile = URI.file('/test/file');
    setup(async function () {
        disposables.add(instantiationService = workbenchInstantiationService(undefined, disposables));
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('files', { simpleDialog: { enable: true } });
        instantiationService.stub(IConfigurationService, configurationService);
    });
    test('Local - open/save workspaces availableFilesystems', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            async showSaveDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            dispose() { }
        }
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        instantiationService.set(IFileDialogService, dialogService);
        const workspaceService = disposables.add(instantiationService.createInstance(BrowserWorkspaceEditingService));
        assert.strictEqual((await workspaceService.pickNewWorkspacePath())?.path.startsWith(testFile.path), true);
        assert.strictEqual(await dialogService.pickWorkspaceAndOpen({}), undefined);
    });
    test('Virtual - open/save workspaces availableFilesystems', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            async showSaveDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            dispose() { }
        }
        instantiationService.stub(IPathService, new class {
            constructor() {
                this.defaultUriScheme = 'vscode-virtual-test';
                this.userHome = async () => URI.file('/user/home');
            }
        });
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        instantiationService.set(IFileDialogService, dialogService);
        const workspaceService = disposables.add(instantiationService.createInstance(BrowserWorkspaceEditingService));
        assert.strictEqual((await workspaceService.pickNewWorkspacePath())?.path.startsWith(testFile.path), true);
        assert.strictEqual(await dialogService.pickWorkspaceAndOpen({}), undefined);
    });
    test('Remote - open/save workspaces availableFilesystems', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 2);
                assert.strictEqual(options.availableFileSystems[0], Schemas.vscodeRemote);
                assert.strictEqual(options.availableFileSystems[1], Schemas.file);
                return testFile;
            }
            async showSaveDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 2);
                assert.strictEqual(options.availableFileSystems[0], Schemas.vscodeRemote);
                assert.strictEqual(options.availableFileSystems[1], Schemas.file);
                return testFile;
            }
            dispose() { }
        }
        instantiationService.set(IWorkbenchEnvironmentService, new class extends mock() {
            get remoteAuthority() {
                return 'testRemote';
            }
        });
        instantiationService.stub(IPathService, new class {
            constructor() {
                this.defaultUriScheme = Schemas.vscodeRemote;
                this.userHome = async () => URI.file('/user/home');
            }
        });
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        instantiationService.set(IFileDialogService, dialogService);
        const workspaceService = disposables.add(instantiationService.createInstance(BrowserWorkspaceEditingService));
        assert.strictEqual((await workspaceService.pickNewWorkspacePath())?.path.startsWith(testFile.path), true);
        assert.strictEqual(await dialogService.pickWorkspaceAndOpen({}), undefined);
    });
    test('Remote - filters default files/folders to RA (#195938)', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog() {
                return testFile;
            }
            async showSaveDialog() {
                return testFile;
            }
            dispose() { }
        }
        instantiationService.set(IWorkbenchEnvironmentService, new class extends mock() {
            get remoteAuthority() {
                return 'testRemote';
            }
        });
        instantiationService.stub(IPathService, new class {
            constructor() {
                this.defaultUriScheme = Schemas.vscodeRemote;
                this.userHome = async () => URI.file('/user/home');
            }
        });
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        const historyService = instantiationService.get(IHistoryService);
        const getLastActiveWorkspaceRoot = sinon.spy(historyService, 'getLastActiveWorkspaceRoot');
        const getLastActiveFile = sinon.spy(historyService, 'getLastActiveFile');
        await dialogService.defaultFilePath();
        assert.deepStrictEqual(getLastActiveFile.args, [[Schemas.vscodeRemote, 'testRemote']]);
        assert.deepStrictEqual(getLastActiveWorkspaceRoot.args, [[Schemas.vscodeRemote, 'testRemote']]);
        await dialogService.defaultFolderPath();
        assert.deepStrictEqual(getLastActiveWorkspaceRoot.args[1], [Schemas.vscodeRemote, 'testRemote']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGlhbG9ncy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZmlsZURpYWxvZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQTBDLE1BQU0sbURBQW1ELENBQUM7QUFDL0ksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxhQUFhLEVBQUUs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