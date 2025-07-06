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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9maWxlRGlhbG9nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBMEMsTUFBTSxtREFBbUQsQ0FBQztBQUMvSSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxN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