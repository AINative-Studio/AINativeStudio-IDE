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
import { URI } from '../../../../../base/common/uri.js';
import { IEditorService } from '../../../editor/common/editorService.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { IWorkingCopyBackupService } from '../../common/workingCopyBackup.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { IFilesConfigurationService } from '../../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../common/workingCopyService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { createEditorPart, InMemoryTestWorkingCopyBackupService, registerTestResourceEditor, TestServiceAccessor, toTypedWorkingCopyId, toUntypedWorkingCopyId, workbenchInstantiationService, workbenchTeardown } from '../../../../test/browser/workbenchTestServices.js';
import { TestWorkingCopy } from '../../../../test/common/workbenchTestServices.js';
import { timeout } from '../../../../../base/common/async.js';
import { BrowserWorkingCopyBackupTracker } from '../../browser/workingCopyBackupTracker.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IWorkingCopyEditorService } from '../../common/workingCopyEditorService.js';
import { bufferToReadable, VSBuffer } from '../../../../../base/common/buffer.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Schemas } from '../../../../../base/common/network.js';
suite('WorkingCopyBackupTracker (browser)', function () {
    let accessor;
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestResourceEditor());
    });
    teardown(async () => {
        await workbenchTeardown(accessor.instantiationService);
        disposables.clear();
    });
    let TestWorkingCopyBackupTracker = class TestWorkingCopyBackupTracker extends BrowserWorkingCopyBackupTracker {
        constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, logService, workingCopyEditorService, editorService, editorGroupService) {
            super(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, logService, workingCopyEditorService, editorService, editorGroupService);
        }
        getBackupScheduleDelay() {
            return 10; // Reduce timeout for tests
        }
        get pendingBackupOperationCount() { return this.pendingBackupOperations.size; }
        getUnrestoredBackups() {
            return this.unrestoredBackups;
        }
        async testRestoreBackups(handler) {
            return super.restoreBackups(handler);
        }
    };
    TestWorkingCopyBackupTracker = __decorate([
        __param(0, IWorkingCopyBackupService),
        __param(1, IFilesConfigurationService),
        __param(2, IWorkingCopyService),
        __param(3, ILifecycleService),
        __param(4, ILogService),
        __param(5, IWorkingCopyEditorService),
        __param(6, IEditorService),
        __param(7, IEditorGroupsService)
    ], TestWorkingCopyBackupTracker);
    class TestUntitledTextEditorInput extends UntitledTextEditorInput {
        constructor() {
            super(...arguments);
            this.resolved = false;
        }
        resolve() {
            this.resolved = true;
            return super.resolve();
        }
    }
    async function createTracker() {
        const workingCopyBackupService = disposables.add(new InMemoryTestWorkingCopyBackupService());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IWorkingCopyBackupService, workingCopyBackupService);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        disposables.add(registerTestResourceEditor());
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const tracker = disposables.add(instantiationService.createInstance(TestWorkingCopyBackupTracker));
        return { accessor, part, tracker, workingCopyBackupService: workingCopyBackupService, instantiationService };
    }
    async function untitledBackupTest(untitled = { resource: undefined }) {
        const { accessor, workingCopyBackupService } = await createTracker();
        const untitledTextEditor = disposables.add((await accessor.editorService.openEditor(untitled))?.input);
        const untitledTextModel = disposables.add(await untitledTextEditor.resolve());
        if (!untitled?.contents) {
            untitledTextModel.textEditorModel?.setValue('Super Good');
        }
        await workingCopyBackupService.joinBackupResource();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(untitledTextModel), true);
        untitledTextModel.dispose();
        await workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(untitledTextModel), false);
    }
    test('Track backups (untitled)', function () {
        return untitledBackupTest();
    });
    test('Track backups (untitled with initial contents)', function () {
        return untitledBackupTest({ resource: undefined, contents: 'Foo Bar' });
    });
    test('Track backups (custom)', async function () {
        const { accessor, tracker, workingCopyBackupService } = await createTracker();
        class TestBackupWorkingCopy extends TestWorkingCopy {
            constructor(resource) {
                super(resource);
                this.backupDelay = 10;
                disposables.add(accessor.workingCopyService.registerWorkingCopy(this));
            }
            async backup(token) {
                await timeout(0);
                return {};
            }
        }
        const resource = toResource.call(this, '/path/custom.txt');
        const customWorkingCopy = disposables.add(new TestBackupWorkingCopy(resource));
        // Normal
        customWorkingCopy.setDirty(true);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinBackupResource();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), true);
        customWorkingCopy.setDirty(false);
        customWorkingCopy.setDirty(true);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinBackupResource();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), true);
        customWorkingCopy.setDirty(false);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), false);
        // Cancellation
        customWorkingCopy.setDirty(true);
        await timeout(0);
        customWorkingCopy.setDirty(false);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), false);
    });
    async function restoreBackupsInit() {
        const fooFile = URI.file(isWindows ? 'c:\\Foo' : '/Foo');
        const barFile = URI.file(isWindows ? 'c:\\Bar' : '/Bar');
        const untitledFile1 = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
        const untitledFile2 = URI.from({ scheme: Schemas.untitled, path: 'Untitled-2' });
        const workingCopyBackupService = disposables.add(new InMemoryTestWorkingCopyBackupService());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IWorkingCopyBackupService, workingCopyBackupService);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        // Backup 2 normal files and 2 untitled files
        const untitledFile1WorkingCopyId = toUntypedWorkingCopyId(untitledFile1);
        const untitledFile2WorkingCopyId = toTypedWorkingCopyId(untitledFile2);
        await workingCopyBackupService.backup(untitledFile1WorkingCopyId, bufferToReadable(VSBuffer.fromString('untitled-1')));
        await workingCopyBackupService.backup(untitledFile2WorkingCopyId, bufferToReadable(VSBuffer.fromString('untitled-2')));
        const fooFileWorkingCopyId = toUntypedWorkingCopyId(fooFile);
        const barFileWorkingCopyId = toTypedWorkingCopyId(barFile);
        await workingCopyBackupService.backup(fooFileWorkingCopyId, bufferToReadable(VSBuffer.fromString('fooFile')));
        await workingCopyBackupService.backup(barFileWorkingCopyId, bufferToReadable(VSBuffer.fromString('barFile')));
        const tracker = disposables.add(instantiationService.createInstance(TestWorkingCopyBackupTracker));
        accessor.lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
        return [tracker, accessor];
    }
    test('Restore backups (basics, some handled)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        assert.strictEqual(tracker.getUnrestoredBackups().size, 0);
        let handlesCounter = 0;
        let isOpenCounter = 0;
        let createEditorCounter = 0;
        await tracker.testRestoreBackups({
            handles: workingCopy => {
                handlesCounter++;
                return workingCopy.typeId === 'testBackupTypeId';
            },
            isOpen: (workingCopy, editor) => {
                isOpenCounter++;
                return false;
            },
            createEditor: workingCopy => {
                createEditorCounter++;
                return disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
            }
        });
        assert.strictEqual(handlesCounter, 4);
        assert.strictEqual(isOpenCounter, 0);
        assert.strictEqual(createEditorCounter, 2);
        assert.strictEqual(accessor.editorService.count, 2);
        assert.ok(accessor.editorService.editors.every(editor => editor.isDirty()));
        assert.strictEqual(tracker.getUnrestoredBackups().size, 2);
        for (const editor of accessor.editorService.editors) {
            assert.ok(editor instanceof TestUntitledTextEditorInput);
            assert.strictEqual(editor.resolved, true);
        }
    });
    test('Restore backups (basics, none handled)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        await tracker.testRestoreBackups({
            handles: workingCopy => false,
            isOpen: (workingCopy, editor) => { throw new Error('unexpected'); },
            createEditor: workingCopy => { throw new Error('unexpected'); }
        });
        assert.strictEqual(accessor.editorService.count, 0);
        assert.strictEqual(tracker.getUnrestoredBackups().size, 4);
    });
    test('Restore backups (basics, error case)', async function () {
        const [tracker] = await restoreBackupsInit();
        try {
            await tracker.testRestoreBackups({
                handles: workingCopy => true,
                isOpen: (workingCopy, editor) => { throw new Error('unexpected'); },
                createEditor: workingCopy => { throw new Error('unexpected'); }
            });
        }
        catch (error) {
            // ignore
        }
        assert.strictEqual(tracker.getUnrestoredBackups().size, 4);
    });
    test('Restore backups (multiple handlers)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        const firstHandler = tracker.testRestoreBackups({
            handles: workingCopy => {
                return workingCopy.typeId === 'testBackupTypeId';
            },
            isOpen: (workingCopy, editor) => {
                return false;
            },
            createEditor: workingCopy => {
                return disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
            }
        });
        const secondHandler = tracker.testRestoreBackups({
            handles: workingCopy => {
                return workingCopy.typeId.length === 0;
            },
            isOpen: (workingCopy, editor) => {
                return false;
            },
            createEditor: workingCopy => {
                return disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
            }
        });
        await Promise.all([firstHandler, secondHandler]);
        assert.strictEqual(accessor.editorService.count, 4);
        assert.ok(accessor.editorService.editors.every(editor => editor.isDirty()));
        assert.strictEqual(tracker.getUnrestoredBackups().size, 0);
        for (const editor of accessor.editorService.editors) {
            assert.ok(editor instanceof TestUntitledTextEditorInput);
            assert.strictEqual(editor.resolved, true);
        }
    });
    test('Restore backups (editors already opened)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        assert.strictEqual(tracker.getUnrestoredBackups().size, 0);
        let handlesCounter = 0;
        let isOpenCounter = 0;
        const editor1 = disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
        const editor2 = disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
        await accessor.editorService.openEditors([{ editor: editor1 }, { editor: editor2 }]);
        editor1.resolved = false;
        editor2.resolved = false;
        await tracker.testRestoreBackups({
            handles: workingCopy => {
                handlesCounter++;
                return workingCopy.typeId === 'testBackupTypeId';
            },
            isOpen: (workingCopy, editor) => {
                isOpenCounter++;
                return true;
            },
            createEditor: workingCopy => { throw new Error('unexpected'); }
        });
        assert.strictEqual(handlesCounter, 4);
        assert.strictEqual(isOpenCounter, 4);
        assert.strictEqual(accessor.editorService.count, 2);
        assert.strictEqual(tracker.getUnrestoredBackups().size, 2);
        for (const editor of accessor.editorService.editors) {
            assert.ok(editor instanceof TestUntitledTextEditorInput);
            // assert that we only call `resolve` on inactive editors
            if (accessor.editorService.isVisible(editor)) {
                assert.strictEqual(editor.resolved, false);
            }
            else {
                assert.strictEqual(editor.resolved, true);
            }
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci93b3JraW5nQ29weUJhY2t1cFRyYWNrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFekUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0sd0NBQXdDLENBQUM7QUFFM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9DQUFvQyxFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLDZCQUE2QixF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