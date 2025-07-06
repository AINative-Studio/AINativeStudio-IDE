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
import { isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { join } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { hash } from '../../../../../base/common/hash.js';
import { NativeWorkingCopyBackupTracker } from '../../electron-sandbox/workingCopyBackupTracker.js';
import { IEditorService } from '../../../editor/common/editorService.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { IWorkingCopyBackupService } from '../../common/workingCopyBackup.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { IFilesConfigurationService } from '../../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../common/workingCopyService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { HotExitConfiguration } from '../../../../../platform/files/common/files.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { IFileDialogService, IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { createEditorPart, registerTestFileEditor, TestBeforeShutdownEvent, TestEnvironmentService, TestFilesConfigurationService, TestFileService, TestTextResourceConfigurationService, workbenchTeardown } from '../../../../test/browser/workbenchTestServices.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { TestWorkspace, Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IWorkingCopyEditorService } from '../../common/workingCopyEditorService.js';
import { TestContextService, TestMarkerService, TestWorkingCopy } from '../../../../test/common/workbenchTestServices.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { Schemas } from '../../../../../base/common/network.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { TestServiceAccessor, workbenchInstantiationService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
suite('WorkingCopyBackupTracker (native)', function () {
    let TestWorkingCopyBackupTracker = class TestWorkingCopyBackupTracker extends NativeWorkingCopyBackupTracker {
        constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, fileDialogService, dialogService, contextService, nativeHostService, logService, editorService, environmentService, progressService, workingCopyEditorService, editorGroupService) {
            super(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, fileDialogService, dialogService, contextService, nativeHostService, logService, environmentService, progressService, workingCopyEditorService, editorService, editorGroupService);
            this._onDidResume = this._register(new Emitter());
            this.onDidResume = this._onDidResume.event;
            this._onDidSuspend = this._register(new Emitter());
            this.onDidSuspend = this._onDidSuspend.event;
        }
        getBackupScheduleDelay() {
            return 10; // Reduce timeout for tests
        }
        waitForReady() {
            return this.whenReady;
        }
        get pendingBackupOperationCount() { return this.pendingBackupOperations.size; }
        dispose() {
            super.dispose();
            for (const [_, pending] of this.pendingBackupOperations) {
                pending.cancel();
                pending.disposable.dispose();
            }
        }
        suspendBackupOperations() {
            const { resume } = super.suspendBackupOperations();
            this._onDidSuspend.fire();
            return {
                resume: () => {
                    resume();
                    this._onDidResume.fire();
                }
            };
        }
    };
    TestWorkingCopyBackupTracker = __decorate([
        __param(0, IWorkingCopyBackupService),
        __param(1, IFilesConfigurationService),
        __param(2, IWorkingCopyService),
        __param(3, ILifecycleService),
        __param(4, IFileDialogService),
        __param(5, IDialogService),
        __param(6, IWorkspaceContextService),
        __param(7, INativeHostService),
        __param(8, ILogService),
        __param(9, IEditorService),
        __param(10, IEnvironmentService),
        __param(11, IProgressService),
        __param(12, IWorkingCopyEditorService),
        __param(13, IEditorGroupsService)
    ], TestWorkingCopyBackupTracker);
    let testDir;
    let backupHome;
    let workspaceBackupPath;
    let accessor;
    const disposables = new DisposableStore();
    setup(async () => {
        testDir = URI.file(join(generateUuid(), 'vsctests', 'workingcopybackuptracker')).with({ scheme: Schemas.inMemory });
        backupHome = joinPath(testDir, 'Backups');
        const workspacesJsonPath = joinPath(backupHome, 'workspaces.json');
        const workspaceResource = URI.file(isWindows ? 'c:\\workspace' : '/workspace').with({ scheme: Schemas.inMemory });
        workspaceBackupPath = joinPath(backupHome, hash(workspaceResource.toString()).toString(16));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
        disposables.add(registerTestFileEditor());
        await accessor.fileService.createFolder(backupHome);
        await accessor.fileService.createFolder(workspaceBackupPath);
        return accessor.fileService.writeFile(workspacesJsonPath, VSBuffer.fromString(''));
    });
    teardown(() => {
        disposables.clear();
    });
    async function createTracker(autoSaveEnabled = false) {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        if (autoSaveEnabled) {
            configurationService.setUserConfiguration('files', { autoSave: 'afterDelay', autoSaveDelay: 1 });
        }
        else {
            configurationService.setUserConfiguration('files', { autoSave: 'off', autoSaveDelay: 1 });
        }
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFilesConfigurationService, disposables.add(new TestFilesConfigurationService(instantiationService.createInstance(MockContextKeyService), configurationService, new TestContextService(TestWorkspace), TestEnvironmentService, disposables.add(new UriIdentityService(disposables.add(new TestFileService()))), disposables.add(new TestFileService()), new TestMarkerService(), new TestTextResourceConfigurationService(configurationService))));
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const tracker = instantiationService.createInstance(TestWorkingCopyBackupTracker);
        const cleanup = async () => {
            await accessor.workingCopyBackupService.waitForAllBackups(); // File changes could also schedule some backup operations so we need to wait for them before finishing the test
            await workbenchTeardown(instantiationService);
            part.dispose();
            tracker.dispose();
        };
        return { accessor, part, tracker, instantiationService, cleanup };
    }
    test('Track backups (file, auto save off)', function () {
        return trackBackupsTest(toResource.call(this, '/path/index.txt'), false);
    });
    test('Track backups (file, auto save on)', function () {
        return trackBackupsTest(toResource.call(this, '/path/index.txt'), true);
    });
    async function trackBackupsTest(resource, autoSave) {
        const { accessor, cleanup } = await createTracker(autoSave);
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const fileModel = accessor.textFileService.files.get(resource);
        assert.ok(fileModel);
        fileModel.textEditorModel?.setValue('Super Good');
        await accessor.workingCopyBackupService.joinBackupResource();
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(fileModel), true);
        fileModel.dispose();
        await accessor.workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(fileModel), false);
        await cleanup();
    }
    test('onWillShutdown - no veto if no dirty files', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        await cleanup();
    });
    test('onWillShutdown - veto if user cancels (hot.exit: off)', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: 'off' } });
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(veto);
        await cleanup();
    });
    test('onWillShutdown - no veto if auto save is on', async function () {
        const { accessor, cleanup } = await createTracker(true /* auto save enabled */);
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        await cleanup();
    });
    test('onWillShutdown - no veto and backups cleaned up if user does not want to save (hot.exit: off)', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: 'off' } });
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(accessor.workingCopyBackupService.discardedBackups.length > 0);
        await cleanup();
    });
    test('onWillShutdown - no backups discarded when shutdown without dirty but tracker not ready', async function () {
        const { accessor, cleanup } = await createTracker();
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(!accessor.workingCopyBackupService.discardedAllBackups);
        await cleanup();
    });
    test('onWillShutdown - backups discarded when shutdown without dirty', async function () {
        const { accessor, tracker, cleanup } = await createTracker();
        await tracker.waitForReady();
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(accessor.workingCopyBackupService.discardedAllBackups);
        await cleanup();
    });
    test('onWillShutdown - save (hot.exit: off)', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        accessor.fileDialogService.setConfirmResult(0 /* ConfirmResult.SAVE */);
        accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: 'off' } });
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(!model?.isDirty());
        await cleanup();
    });
    test('onWillShutdown - veto if backup fails', async function () {
        const { accessor, cleanup } = await createTracker();
        class TestBackupWorkingCopy extends TestWorkingCopy {
            constructor(resource) {
                super(resource);
                this._register(accessor.workingCopyService.registerWorkingCopy(this));
            }
            async backup(token) {
                throw new Error('unable to backup');
            }
        }
        const resource = toResource.call(this, '/path/custom.txt');
        const customWorkingCopy = disposables.add(new TestBackupWorkingCopy(resource));
        customWorkingCopy.setDirty(true);
        const event = new TestBeforeShutdownEvent();
        event.reason = 2 /* ShutdownReason.QUIT */;
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(veto);
        const finalVeto = await event.finalValue?.();
        assert.ok(finalVeto); // assert the tracker uses the internal finalVeto API
        await cleanup();
    });
    test('onWillShutdown - scratchpads - veto if backup fails', async function () {
        const { accessor, cleanup } = await createTracker();
        class TestBackupWorkingCopy extends TestWorkingCopy {
            constructor(resource) {
                super(resource);
                this.capabilities = 2 /* WorkingCopyCapabilities.Untitled */ | 4 /* WorkingCopyCapabilities.Scratchpad */;
                this._register(accessor.workingCopyService.registerWorkingCopy(this));
            }
            async backup(token) {
                throw new Error('unable to backup');
            }
            isDirty() {
                return false;
            }
            isModified() {
                return true;
            }
        }
        const resource = toResource.call(this, '/path/custom.txt');
        disposables.add(new TestBackupWorkingCopy(resource));
        const event = new TestBeforeShutdownEvent();
        event.reason = 2 /* ShutdownReason.QUIT */;
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(veto);
        const finalVeto = await event.finalValue?.();
        assert.ok(finalVeto); // assert the tracker uses the internal finalVeto API
        await cleanup();
    });
    test('onWillShutdown - pending backup operations canceled and tracker suspended/resumsed', async function () {
        const { accessor, tracker, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        const onSuspend = Event.toPromise(tracker.onDidSuspend);
        const event = new TestBeforeShutdownEvent();
        event.reason = 2 /* ShutdownReason.QUIT */;
        accessor.lifecycleService.fireBeforeShutdown(event);
        await onSuspend;
        assert.strictEqual(tracker.pendingBackupOperationCount, 0);
        // Ops are suspended during shutdown!
        model?.textEditorModel?.setValue('bar');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(tracker.pendingBackupOperationCount, 0);
        const onResume = Event.toPromise(tracker.onDidResume);
        await event.value;
        // Ops are resumed after shutdown!
        model?.textEditorModel?.setValue('foo');
        await onResume;
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await cleanup();
    });
    suite('Hot Exit', () => {
        suite('"onExit" setting', () => {
            test('should hot exit on non-Mac (reason: CLOSE, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, true, !!isMacintosh);
            });
            test('should hot exit on non-Mac (reason: CLOSE, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, true, true);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, true, true);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, true, true);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        suite('"onExitAndWindowClose" setting', () => {
            test('should hot exit (reason: CLOSE, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, true, false);
            });
            test('should hot exit (reason: CLOSE, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, true, false);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should hot exit (reason: LOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        suite('"onExit" setting - scratchpad', () => {
            test('should hot exit (reason: CLOSE, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, true, false);
            });
            test('should hot exit (reason: CLOSE, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, true, false);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should hot exit (reason: LOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        suite('"onExitAndWindowClose" setting - scratchpad', () => {
            test('should hot exit (reason: CLOSE, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, true, false);
            });
            test('should hot exit (reason: CLOSE, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, true, false);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should hot exit (reason: LOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        async function hotExitTest(setting, shutdownReason, multipleWindows, workspace, shouldVeto) {
            const { accessor, cleanup } = await createTracker();
            const resource = toResource.call(this, '/path/index.txt');
            await accessor.editorService.openEditor({ resource, options: { pinned: true } });
            const model = accessor.textFileService.files.get(resource);
            // Set hot exit config
            accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: setting } });
            // Set empty workspace if required
            if (!workspace) {
                accessor.contextService.setWorkspace(new Workspace('empty:1508317022751'));
            }
            // Set multiple windows if required
            if (multipleWindows) {
                accessor.nativeHostService.windowCount = Promise.resolve(2);
            }
            // Set cancel to force a veto if hot exit does not trigger
            accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
            await model?.resolve();
            model?.textEditorModel?.setValue('foo');
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            const event = new TestBeforeShutdownEvent();
            event.reason = shutdownReason;
            accessor.lifecycleService.fireBeforeShutdown(event);
            const veto = await event.value;
            assert.ok(typeof event.finalValue === 'function'); // assert the tracker uses the internal finalVeto API
            assert.strictEqual(accessor.workingCopyBackupService.discardedBackups.length, 0); // When hot exit is set, backups should never be cleaned since the confirm result is cancel
            assert.strictEqual(veto, shouldVeto);
            await cleanup();
        }
        async function scratchpadHotExitTest(setting, shutdownReason, multipleWindows, workspace, shouldVeto) {
            const { accessor, cleanup } = await createTracker();
            class TestBackupWorkingCopy extends TestWorkingCopy {
                constructor(resource) {
                    super(resource);
                    this.capabilities = 2 /* WorkingCopyCapabilities.Untitled */ | 4 /* WorkingCopyCapabilities.Scratchpad */;
                    this._register(accessor.workingCopyService.registerWorkingCopy(this));
                }
                isDirty() {
                    return false;
                }
                isModified() {
                    return true;
                }
            }
            // Set hot exit config
            accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: setting } });
            // Set empty workspace if required
            if (!workspace) {
                accessor.contextService.setWorkspace(new Workspace('empty:1508317022751'));
            }
            // Set multiple windows if required
            if (multipleWindows) {
                accessor.nativeHostService.windowCount = Promise.resolve(2);
            }
            // Set cancel to force a veto if hot exit does not trigger
            accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
            const resource = toResource.call(this, '/path/custom.txt');
            disposables.add(new TestBackupWorkingCopy(resource));
            const event = new TestBeforeShutdownEvent();
            event.reason = shutdownReason;
            accessor.lifecycleService.fireBeforeShutdown(event);
            const veto = await event.value;
            assert.ok(typeof event.finalValue === 'function'); // assert the tracker uses the internal finalVeto API
            assert.strictEqual(accessor.workingCopyBackupService.discardedBackups.length, 0); // When hot exit is set, backups should never be cleaned since the confirm result is cancel
            assert.strictEqual(veto, shouldVeto);
            await cleanup();
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5QmFja3VwVHJhY2tlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0Ms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