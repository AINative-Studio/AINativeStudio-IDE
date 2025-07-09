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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvZWxlY3Ryb24tc2FuZGJveC93b3JraW5nQ29weUJhY2t1cFRyYWNrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3JGLE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQWlCLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXJGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0IsRUFBRSx1QkFBdUIsRUFBRSxzQkFBc0IsRUFBRSw2QkFBNkIsRUFBRSxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2USxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUVoSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUcxSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV0RyxLQUFLLENBQUMsbUNBQW1DLEVBQUU7SUFFMUMsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSw4QkFBOEI7UUFFeEUsWUFDNEIsd0JBQW1ELEVBQ2xELHlCQUFxRCxFQUM1RCxrQkFBdUMsRUFDekMsZ0JBQW1DLEVBQ2xDLGlCQUFxQyxFQUN6QyxhQUE2QixFQUNuQixjQUF3QyxFQUM5QyxpQkFBcUMsRUFDNUMsVUFBdUIsRUFDcEIsYUFBNkIsRUFDeEIsa0JBQXVDLEVBQzFDLGVBQWlDLEVBQ3hCLHdCQUFtRCxFQUN4RCxrQkFBd0M7WUFFOUQsS0FBSyxDQUFDLHdCQUF3QixFQUFFLHlCQUF5QixFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSx3QkFBd0IsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQXNCcFEsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztZQUMzRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1lBRTlCLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7WUFDNUQsaUJBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztRQXpCakQsQ0FBQztRQUVrQixzQkFBc0I7WUFDeEMsT0FBTyxFQUFFLENBQUMsQ0FBQywyQkFBMkI7UUFDdkMsQ0FBQztRQUVELFlBQVk7WUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDdkIsQ0FBQztRQUVELElBQUksMkJBQTJCLEtBQWEsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUU5RSxPQUFPO1lBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRWhCLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDekQsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNqQixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBUWtCLHVCQUF1QjtZQUN6QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFFbkQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUUxQixPQUFPO2dCQUNOLE1BQU0sRUFBRSxHQUFHLEVBQUU7b0JBQ1osTUFBTSxFQUFFLENBQUM7b0JBRVQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDMUIsQ0FBQzthQUNELENBQUM7UUFDSCxDQUFDO0tBQ0QsQ0FBQTtJQTNESyw0QkFBNEI7UUFHL0IsV0FBQSx5QkFBeUIsQ0FBQTtRQUN6QixXQUFBLDBCQUEwQixDQUFBO1FBQzFCLFdBQUEsbUJBQW1CLENBQUE7UUFDbkIsV0FBQSxpQkFBaUIsQ0FBQTtRQUNqQixXQUFBLGtCQUFrQixDQUFBO1FBQ2xCLFdBQUEsY0FBYyxDQUFBO1FBQ2QsV0FBQSx3QkFBd0IsQ0FBQTtRQUN4QixXQUFBLGtCQUFrQixDQUFBO1FBQ2xCLFdBQUEsV0FBVyxDQUFBO1FBQ1gsV0FBQSxjQUFjLENBQUE7UUFDZCxZQUFBLG1CQUFtQixDQUFBO1FBQ25CLFlBQUEsZ0JBQWdCLENBQUE7UUFDaEIsWUFBQSx5QkFBeUIsQ0FBQTtRQUN6QixZQUFBLG9CQUFvQixDQUFBO09BaEJqQiw0QkFBNEIsQ0EyRGpDO0lBRUQsSUFBSSxPQUFZLENBQUM7SUFDakIsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxtQkFBd0IsQ0FBQztJQUU3QixJQUFJLFFBQTZCLENBQUM7SUFFbEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BILFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5FLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2xILG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUYsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbkYsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BFLFdBQVcsQ0FBQyxHQUFHLENBQThCLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLENBQUM7UUFFOUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFMUMsTUFBTSxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwRCxNQUFNLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFN0QsT0FBTyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxVQUFVLGFBQWEsQ0FBQyxlQUFlLEdBQUcsS0FBSztRQUNuRCxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVuRixNQUFNLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUM1RCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEcsQ0FBQzthQUFNLENBQUM7WUFDUCxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUV2RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDZCQUE2QixDQUNsRixvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsRUFDOUUsb0JBQW9CLEVBQ3BCLElBQUksa0JBQWtCLENBQUMsYUFBYSxDQUFDLEVBQ3JDLHNCQUFzQixFQUN0QixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUMvRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsRUFDdEMsSUFBSSxpQkFBaUIsRUFBRSxFQUN2QixJQUFJLG9DQUFvQyxDQUFDLG9CQUFvQixDQUFDLENBQzlELENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN2RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFdEQsTUFBTSxhQUFhLEdBQWtCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3BILG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFekQsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXBFLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBRWxGLE1BQU0sT0FBTyxHQUFHLEtBQUssSUFBSSxFQUFFO1lBQzFCLE1BQU0sUUFBUSxDQUFDLHdCQUF3QixDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxnSEFBZ0g7WUFFN0ssTUFBTSxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBRTlDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUM7UUFFRixPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQyxxQ0FBcUMsRUFBRTtRQUMzQyxPQUFPLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUU7UUFDMUMsT0FBTyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFFBQWEsRUFBRSxRQUFpQjtRQUMvRCxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVELE1BQU0sUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqRixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyQixTQUFTLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVsRCxNQUFNLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBRTdELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVyRixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFcEIsTUFBTSxRQUFRLENBQUMsd0JBQXdCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUU1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEYsTUFBTSxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUs7UUFDdkQsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1FBRXBELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDMUQsTUFBTSxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpGLE1BQU0sS0FBSyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUM1QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQixNQUFNLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUs7UUFDbEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1FBRXBELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDMUQsTUFBTSxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpGLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzRCxRQUFRLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLDhCQUFzQixDQUFDO1FBQ2xFLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakcsTUFBTSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDdkIsS0FBSyxFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlELE1BQU0sS0FBSyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUM1QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEIsTUFBTSxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLO1FBQ3hELE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFaEYsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMxRCxNQUFNLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNELE1BQU0sS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLEtBQUssRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5RCxNQUFNLEtBQUssR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDNUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBELE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlELE1BQU0sT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0ZBQStGLEVBQUUsS0FBSztRQUMxRyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUM7UUFFcEQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMxRCxNQUFNLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNELFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsaUNBQXlCLENBQUM7UUFDckUsUUFBUSxDQUFDLHlCQUF5QixDQUFDLDhCQUE4QixDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqRyxNQUFNLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN2QixLQUFLLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxLQUFLLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQzVDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV6RSxNQUFNLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlGQUF5RixFQUFFLEtBQUs7UUFDcEcsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1FBRXBELE1BQU0sS0FBSyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUM1QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFbEUsTUFBTSxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxLQUFLO1FBQzNFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUM7UUFFN0QsTUFBTSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFN0IsTUFBTSxLQUFLLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQzVDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFakUsTUFBTSxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLO1FBQ2xELE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxhQUFhLEVBQUUsQ0FBQztRQUVwRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzFELE1BQU0sUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqRixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFM0QsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQiw0QkFBb0IsQ0FBQztRQUNoRSxRQUFRLENBQUMseUJBQXlCLENBQUMsOEJBQThCLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpHLE1BQU0sS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLEtBQUssRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxNQUFNLEtBQUssR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDNUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBELE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRTdCLE1BQU0sT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsS0FBSztRQUNsRCxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUM7UUFFcEQsTUFBTSxxQkFBc0IsU0FBUSxlQUFlO1lBRWxELFlBQVksUUFBYTtnQkFDeEIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUVoQixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7WUFFUSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQXdCO2dCQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDckMsQ0FBQztTQUNEO1FBRUQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQy9FLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQyxNQUFNLEtBQUssR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDNUMsS0FBSyxDQUFDLE1BQU0sOEJBQXNCLENBQUM7UUFDbkMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBELE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhCLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7UUFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLHFEQUFxRDtRQUUzRSxNQUFNLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUs7UUFDaEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1FBRXBELE1BQU0scUJBQXNCLFNBQVEsZUFBZTtZQUVsRCxZQUFZLFFBQWE7Z0JBQ3hCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFLUixpQkFBWSxHQUFHLHFGQUFxRSxDQUFDO2dCQUg3RixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7WUFJUSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQXdCO2dCQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDckMsQ0FBQztZQUVRLE9BQU87Z0JBQ2YsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBRVEsVUFBVTtnQkFDbEIsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1NBQ0Q7UUFFRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXJELE1BQU0sS0FBSyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUM1QyxLQUFLLENBQUMsTUFBTSw4QkFBc0IsQ0FBQztRQUNuQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztRQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMscURBQXFEO1FBRTNFLE1BQU0sT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0ZBQW9GLEVBQUUsS0FBSztRQUMvRixNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1FBRTdELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDMUQsTUFBTSxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpGLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzRCxNQUFNLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN2QixLQUFLLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFeEQsTUFBTSxLQUFLLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQzVDLEtBQUssQ0FBQyxNQUFNLDhCQUFzQixDQUFDO1FBQ25DLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCxNQUFNLFNBQVMsQ0FBQztRQUVoQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCxxQ0FBcUM7UUFDckMsS0FBSyxFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUVsQixrQ0FBa0M7UUFDbEMsS0FBSyxFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxRQUFRLENBQUM7UUFDZixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCxNQUFNLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDdEIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtZQUM5QixJQUFJLENBQUMsd0VBQXdFLEVBQUU7Z0JBQzlFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxnQ0FBd0IsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDL0csQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOEVBQThFLEVBQUU7Z0JBQ3BGLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxnQ0FBd0IsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsbUVBQW1FLEVBQUU7Z0JBQ3pFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxnQ0FBd0IsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNyRyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyx5RUFBeUUsRUFBRTtnQkFDL0UsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLGdDQUF3QixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3RHLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLDREQUE0RCxFQUFFO2dCQUNsRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sK0JBQXVCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEcsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsa0VBQWtFLEVBQUU7Z0JBQ3hFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTywrQkFBdUIsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyw4REFBOEQsRUFBRTtnQkFDcEUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLCtCQUF1QixJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3JHLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLG9FQUFvRSxFQUFFO2dCQUMxRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sK0JBQXVCLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEcsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOERBQThELEVBQUU7Z0JBQ3BFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxpQ0FBeUIsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4RyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxvRUFBb0UsRUFBRTtnQkFDMUUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLGlDQUF5QixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pHLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGdFQUFnRSxFQUFFO2dCQUN0RSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8saUNBQXlCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkcsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsc0VBQXNFLEVBQUU7Z0JBQzVFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxpQ0FBeUIsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4RyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxnRUFBZ0UsRUFBRTtnQkFDdEUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLCtCQUF1QixLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JHLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLHNFQUFzRSxFQUFFO2dCQUM1RSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sK0JBQXVCLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEcsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsa0VBQWtFLEVBQUU7Z0JBQ3hFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTywrQkFBdUIsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwRyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyx3RUFBd0UsRUFBRTtnQkFDOUUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLCtCQUF1QixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JHLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1lBQzVDLElBQUksQ0FBQyw2REFBNkQsRUFBRTtnQkFDbkUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsZ0NBQXdCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsbUVBQW1FLEVBQUU7Z0JBQ3pFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsd0JBQXdCLGdDQUF3QixLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNqSSxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQywrREFBK0QsRUFBRTtnQkFDckUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsZ0NBQXdCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMseUVBQXlFLEVBQUU7Z0JBQy9FLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsd0JBQXdCLGdDQUF3QixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLDREQUE0RCxFQUFFO2dCQUNsRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLHdCQUF3QiwrQkFBdUIsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2SCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxrRUFBa0UsRUFBRTtnQkFDeEUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOERBQThELEVBQUU7Z0JBQ3BFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsd0JBQXdCLCtCQUF1QixJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLG9FQUFvRSxFQUFFO2dCQUMxRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLHdCQUF3QiwrQkFBdUIsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2SCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyw4REFBOEQsRUFBRTtnQkFDcEUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsaUNBQXlCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsb0VBQW9FLEVBQUU7Z0JBQzFFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsd0JBQXdCLGlDQUF5QixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGdFQUFnRSxFQUFFO2dCQUN0RSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLHdCQUF3QixpQ0FBeUIsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4SCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxzRUFBc0UsRUFBRTtnQkFDNUUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsaUNBQXlCLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsNERBQTRELEVBQUU7Z0JBQ2xFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsd0JBQXdCLCtCQUF1QixLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLHNFQUFzRSxFQUFFO2dCQUM1RSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLHdCQUF3QiwrQkFBdUIsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2SCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyw4REFBOEQsRUFBRTtnQkFDcEUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsd0VBQXdFLEVBQUU7Z0JBQzlFLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsd0JBQXdCLCtCQUF1QixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3RILENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyw2REFBNkQsRUFBRTtnQkFDbkUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sZ0NBQXdCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsbUVBQW1FLEVBQUU7Z0JBQ3pFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLGdDQUF3QixLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMxSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQywrREFBK0QsRUFBRTtnQkFDckUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sZ0NBQXdCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMseUVBQXlFLEVBQUU7Z0JBQy9FLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLGdDQUF3QixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLDREQUE0RCxFQUFFO2dCQUNsRSxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTywrQkFBdUIsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNoSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxrRUFBa0UsRUFBRTtnQkFDeEUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sK0JBQXVCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOERBQThELEVBQUU7Z0JBQ3BFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLCtCQUF1QixJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9HLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLG9FQUFvRSxFQUFFO2dCQUMxRSxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTywrQkFBdUIsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNoSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyw4REFBOEQsRUFBRTtnQkFDcEUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8saUNBQXlCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsb0VBQW9FLEVBQUU7Z0JBQzFFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLGlDQUF5QixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25ILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGdFQUFnRSxFQUFFO2dCQUN0RSxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxpQ0FBeUIsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxzRUFBc0UsRUFBRTtnQkFDNUUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8saUNBQXlCLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEgsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsNERBQTRELEVBQUU7Z0JBQ2xFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLCtCQUF1QixLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLHNFQUFzRSxFQUFFO2dCQUM1RSxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsT0FBTywrQkFBdUIsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyw4REFBOEQsRUFBRTtnQkFDcEUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sK0JBQXVCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0csQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsd0VBQXdFLEVBQUU7Z0JBQzlFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLCtCQUF1QixJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9HLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1lBQ3pELElBQUksQ0FBQyw2REFBNkQsRUFBRTtnQkFDbkUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLHdCQUF3QixnQ0FBd0IsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsSSxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxtRUFBbUUsRUFBRTtnQkFDekUsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLHdCQUF3QixnQ0FBd0IsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0ksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsK0RBQStELEVBQUU7Z0JBQ3JFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsZ0NBQXdCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMseUVBQXlFLEVBQUU7Z0JBQy9FLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsZ0NBQXdCLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsNERBQTRELEVBQUU7Z0JBQ2xFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsa0VBQWtFLEVBQUU7Z0JBQ3hFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOERBQThELEVBQUU7Z0JBQ3BFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsb0VBQW9FLEVBQUU7Z0JBQzFFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOERBQThELEVBQUU7Z0JBQ3BFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsaUNBQXlCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsb0VBQW9FLEVBQUU7Z0JBQzFFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsaUNBQXlCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDcEksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUU7Z0JBQ3RFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsaUNBQXlCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsc0VBQXNFLEVBQUU7Z0JBQzVFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsaUNBQXlCLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsNERBQTRELEVBQUU7Z0JBQ2xFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsc0VBQXNFLEVBQUU7Z0JBQzVFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsOERBQThELEVBQUU7Z0JBQ3BFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEksQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsd0VBQXdFLEVBQUU7Z0JBQzlFLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyx3QkFBd0IsK0JBQXVCLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEksQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUdILEtBQUssVUFBVSxXQUFXLENBQVksT0FBZSxFQUFFLGNBQThCLEVBQUUsZUFBd0IsRUFBRSxTQUFrQixFQUFFLFVBQW1CO1lBQ3ZKLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxhQUFhLEVBQUUsQ0FBQztZQUVwRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQzFELE1BQU0sUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztZQUVqRixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFM0Qsc0JBQXNCO1lBQ3RCLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFbkcsa0NBQWtDO1lBQ2xDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7WUFFRCxtQ0FBbUM7WUFDbkMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDckIsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFFRCwwREFBMEQ7WUFDMUQsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQiw4QkFBc0IsQ0FBQztZQUVsRSxNQUFNLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUN2QixLQUFLLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFOUQsTUFBTSxLQUFLLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzVDLEtBQUssQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDO1lBQzlCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwRCxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEtBQUssQ0FBQyxVQUFVLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxxREFBcUQ7WUFDeEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsMkZBQTJGO1lBQzdLLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXJDLE1BQU0sT0FBTyxFQUFFLENBQUM7UUFDakIsQ0FBQztRQUVELEtBQUssVUFBVSxxQkFBcUIsQ0FBWSxPQUFlLEVBQUUsY0FBOEIsRUFBRSxlQUF3QixFQUFFLFNBQWtCLEVBQUUsVUFBbUI7WUFDakssTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFDO1lBRXBELE1BQU0scUJBQXNCLFNBQVEsZUFBZTtnQkFFbEQsWUFBWSxRQUFhO29CQUN4QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBS1IsaUJBQVksR0FBRyxxRkFBcUUsQ0FBQztvQkFIN0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdkUsQ0FBQztnQkFJUSxPQUFPO29CQUNmLE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7Z0JBRVEsVUFBVTtvQkFDbEIsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQzthQUNEO1lBRUQsc0JBQXNCO1lBQ3RCLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFbkcsa0NBQWtDO1lBQ2xDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7WUFFRCxtQ0FBbUM7WUFDbkMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDckIsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFFRCwwREFBMEQ7WUFDMUQsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQiw4QkFBc0IsQ0FBQztZQUVsRSxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQzNELFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRXJELE1BQU0sS0FBSyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztZQUM1QyxLQUFLLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQztZQUM5QixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLENBQUMsVUFBVSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMscURBQXFEO1lBQ3hHLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLDJGQUEyRjtZQUM3SyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztZQUVyQyxNQUFNLE9BQU8sRUFBRSxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==