/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextFileEditorModel } from '../../../textfile/common/textFileEditorModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { TestWorkingCopy } from '../../../../test/common/workbenchTestServices.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('WorkingCopyFileService', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('create - dirty file', async function () {
        await testCreate(toResource.call(this, '/path/file.txt'), VSBuffer.fromString('Hello World'));
    });
    test('delete - dirty file', async function () {
        await testDelete([toResource.call(this, '/path/file.txt')]);
    });
    test('delete multiple - dirty files', async function () {
        await testDelete([
            toResource.call(this, '/path/file1.txt'),
            toResource.call(this, '/path/file2.txt'),
            toResource.call(this, '/path/file3.txt'),
            toResource.call(this, '/path/file4.txt')
        ]);
    });
    test('move - dirty file', async function () {
        await testMoveOrCopy([{ source: toResource.call(this, '/path/file.txt'), target: toResource.call(this, '/path/file_target.txt') }], true);
    });
    test('move - source identical to target', async function () {
        const sourceModel = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel.resource, sourceModel);
        const eventCounter = await testEventsMoveOrCopy([{ file: { source: sourceModel.resource, target: sourceModel.resource }, overwrite: true }], true);
        sourceModel.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('move - one source == target and another source != target', async function () {
        const sourceModel1 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file1.txt'), 'utf8', undefined);
        const sourceModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file2.txt'), 'utf8', undefined);
        const targetModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_target2.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel1.resource, sourceModel1);
        accessor.textFileService.files.add(sourceModel2.resource, sourceModel2);
        accessor.textFileService.files.add(targetModel2.resource, targetModel2);
        const eventCounter = await testEventsMoveOrCopy([
            { file: { source: sourceModel1.resource, target: sourceModel1.resource }, overwrite: true },
            { file: { source: sourceModel2.resource, target: targetModel2.resource }, overwrite: true }
        ], true);
        sourceModel1.dispose();
        sourceModel2.dispose();
        targetModel2.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('move multiple - dirty file', async function () {
        await testMoveOrCopy([
            { source: toResource.call(this, '/path/file1.txt'), target: toResource.call(this, '/path/file1_target.txt') },
            { source: toResource.call(this, '/path/file2.txt'), target: toResource.call(this, '/path/file2_target.txt') }
        ], true);
    });
    test('move - dirty file (target exists and is dirty)', async function () {
        await testMoveOrCopy([{ source: toResource.call(this, '/path/file.txt'), target: toResource.call(this, '/path/file_target.txt') }], true, true);
    });
    test('copy - dirty file', async function () {
        await testMoveOrCopy([{ source: toResource.call(this, '/path/file.txt'), target: toResource.call(this, '/path/file_target.txt') }], false);
    });
    test('copy - source identical to target', async function () {
        const sourceModel = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel.resource, sourceModel);
        const eventCounter = await testEventsMoveOrCopy([{ file: { source: sourceModel.resource, target: sourceModel.resource }, overwrite: true }]);
        sourceModel.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('copy - one source == target and another source != target', async function () {
        const sourceModel1 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file1.txt'), 'utf8', undefined);
        const sourceModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file2.txt'), 'utf8', undefined);
        const targetModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_target2.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel1.resource, sourceModel1);
        accessor.textFileService.files.add(sourceModel2.resource, sourceModel2);
        accessor.textFileService.files.add(targetModel2.resource, targetModel2);
        const eventCounter = await testEventsMoveOrCopy([
            { file: { source: sourceModel1.resource, target: sourceModel1.resource }, overwrite: true },
            { file: { source: sourceModel2.resource, target: targetModel2.resource }, overwrite: true }
        ]);
        sourceModel1.dispose();
        sourceModel2.dispose();
        targetModel2.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('copy multiple - dirty file', async function () {
        await testMoveOrCopy([
            { source: toResource.call(this, '/path/file1.txt'), target: toResource.call(this, '/path/file_target1.txt') },
            { source: toResource.call(this, '/path/file2.txt'), target: toResource.call(this, '/path/file_target2.txt') },
            { source: toResource.call(this, '/path/file3.txt'), target: toResource.call(this, '/path/file_target3.txt') }
        ], false);
    });
    test('copy - dirty file (target exists and is dirty)', async function () {
        await testMoveOrCopy([{ source: toResource.call(this, '/path/file.txt'), target: toResource.call(this, '/path/file_target.txt') }], false, true);
    });
    test('getDirty', async function () {
        const model1 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file-1.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(model1.resource, model1);
        const model2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file-2.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(model2.resource, model2);
        let dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 0);
        await model1.resolve();
        model1.textEditorModel.setValue('foo');
        dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 1);
        assert.strictEqual(dirty[0], model1);
        dirty = accessor.workingCopyFileService.getDirty(toResource.call(this, '/path'));
        assert.strictEqual(dirty.length, 1);
        assert.strictEqual(dirty[0], model1);
        await model2.resolve();
        model2.textEditorModel.setValue('bar');
        dirty = accessor.workingCopyFileService.getDirty(toResource.call(this, '/path'));
        assert.strictEqual(dirty.length, 2);
        model1.dispose();
        model2.dispose();
    });
    test('registerWorkingCopyProvider', async function () {
        const model1 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file-1.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model1.resource, model1);
        await model1.resolve();
        model1.textEditorModel.setValue('foo');
        const testWorkingCopy = disposables.add(new TestWorkingCopy(toResource.call(this, '/path/file-2.txt'), true));
        const registration = accessor.workingCopyFileService.registerWorkingCopyProvider(() => {
            return [model1, testWorkingCopy];
        });
        let dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 2, 'Should return default working copy + working copy from provider');
        assert.strictEqual(dirty[0], model1);
        assert.strictEqual(dirty[1], testWorkingCopy);
        registration.dispose();
        dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 1, 'Should have unregistered our provider');
        assert.strictEqual(dirty[0], model1);
    });
    test('createFolder', async function () {
        let eventCounter = 0;
        let correlationId = undefined;
        const resource = toResource.call(this, '/path/folder');
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                assert.strictEqual(files.length, 1);
                const file = files[0];
                assert.strictEqual(file.target.toString(), resource.toString());
                assert.strictEqual(operation, 0 /* FileOperation.CREATE */);
                eventCounter++;
            }
        }));
        disposables.add(accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            correlationId = e.correlationId;
            eventCounter++;
        }));
        disposables.add(accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            assert.strictEqual(e.correlationId, correlationId);
            eventCounter++;
        }));
        await accessor.workingCopyFileService.createFolder([{ resource }], CancellationToken.None);
        assert.strictEqual(eventCounter, 3);
    });
    test('cancellation of participants', async function () {
        const resource = toResource.call(this, '/path/folder');
        let canceled = false;
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation, info, t, token) => {
                await timeout(0);
                canceled = token.isCancellationRequested;
            }
        }));
        // Create
        let cts = new CancellationTokenSource();
        let promise = accessor.workingCopyFileService.create([{ resource }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Create Folder
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.createFolder([{ resource }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Move
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.move([{ file: { source: resource, target: resource } }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Copy
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.copy([{ file: { source: resource, target: resource } }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Delete
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.delete([{ resource }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
    });
    async function testEventsMoveOrCopy(files, move) {
        let eventCounter = 0;
        const participant = accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files) => {
                eventCounter++;
            }
        });
        const listener1 = accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => {
            eventCounter++;
        });
        const listener2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            eventCounter++;
        });
        if (move) {
            await accessor.workingCopyFileService.move(files, CancellationToken.None);
        }
        else {
            await accessor.workingCopyFileService.copy(files, CancellationToken.None);
        }
        participant.dispose();
        listener1.dispose();
        listener2.dispose();
        return eventCounter;
    }
    async function testMoveOrCopy(files, move, targetDirty) {
        let eventCounter = 0;
        const models = await Promise.all(files.map(async ({ source, target }, i) => {
            const sourceModel = instantiationService.createInstance(TextFileEditorModel, source, 'utf8', undefined);
            const targetModel = instantiationService.createInstance(TextFileEditorModel, target, 'utf8', undefined);
            accessor.textFileService.files.add(sourceModel.resource, sourceModel);
            accessor.textFileService.files.add(targetModel.resource, targetModel);
            await sourceModel.resolve();
            sourceModel.textEditorModel.setValue('foo' + i);
            assert.ok(accessor.textFileService.isDirty(sourceModel.resource));
            if (targetDirty) {
                await targetModel.resolve();
                targetModel.textEditorModel.setValue('bar' + i);
                assert.ok(accessor.textFileService.isDirty(targetModel.resource));
            }
            return { sourceModel, targetModel };
        }));
        const participant = accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                for (let i = 0; i < files.length; i++) {
                    const { target, source } = files[i];
                    const { targetModel, sourceModel } = models[i];
                    assert.strictEqual(target.toString(), targetModel.resource.toString());
                    assert.strictEqual(source?.toString(), sourceModel.resource.toString());
                }
                eventCounter++;
                assert.strictEqual(operation, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */);
            }
        });
        let correlationId;
        const listener1 = accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => {
            for (let i = 0; i < e.files.length; i++) {
                const { target, source } = files[i];
                const { targetModel, sourceModel } = models[i];
                assert.strictEqual(target.toString(), targetModel.resource.toString());
                assert.strictEqual(source?.toString(), sourceModel.resource.toString());
            }
            eventCounter++;
            correlationId = e.correlationId;
            assert.strictEqual(e.operation, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */);
        });
        const listener2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            for (let i = 0; i < e.files.length; i++) {
                const { target, source } = files[i];
                const { targetModel, sourceModel } = models[i];
                assert.strictEqual(target.toString(), targetModel.resource.toString());
                assert.strictEqual(source?.toString(), sourceModel.resource.toString());
            }
            eventCounter++;
            assert.strictEqual(e.operation, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */);
            assert.strictEqual(e.correlationId, correlationId);
        });
        if (move) {
            await accessor.workingCopyFileService.move(models.map(model => ({ file: { source: model.sourceModel.resource, target: model.targetModel.resource }, options: { overwrite: true } })), CancellationToken.None);
        }
        else {
            await accessor.workingCopyFileService.copy(models.map(model => ({ file: { source: model.sourceModel.resource, target: model.targetModel.resource }, options: { overwrite: true } })), CancellationToken.None);
        }
        for (let i = 0; i < models.length; i++) {
            const { sourceModel, targetModel } = models[i];
            assert.strictEqual(targetModel.textEditorModel.getValue(), 'foo' + i);
            if (move) {
                assert.ok(!accessor.textFileService.isDirty(sourceModel.resource));
            }
            else {
                assert.ok(accessor.textFileService.isDirty(sourceModel.resource));
            }
            assert.ok(accessor.textFileService.isDirty(targetModel.resource));
            sourceModel.dispose();
            targetModel.dispose();
        }
        assert.strictEqual(eventCounter, 3);
        participant.dispose();
        listener1.dispose();
        listener2.dispose();
    }
    async function testDelete(resources) {
        const models = await Promise.all(resources.map(async (resource) => {
            const model = instantiationService.createInstance(TextFileEditorModel, resource, 'utf8', undefined);
            accessor.textFileService.files.add(model.resource, model);
            await model.resolve();
            model.textEditorModel.setValue('foo');
            assert.ok(accessor.workingCopyService.isDirty(model.resource));
            return model;
        }));
        let eventCounter = 0;
        let correlationId = undefined;
        const participant = accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                for (let i = 0; i < models.length; i++) {
                    const model = models[i];
                    const file = files[i];
                    assert.strictEqual(file.target.toString(), model.resource.toString());
                }
                assert.strictEqual(operation, 1 /* FileOperation.DELETE */);
                eventCounter++;
            }
        });
        const listener1 = accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => {
            for (let i = 0; i < models.length; i++) {
                const model = models[i];
                const file = e.files[i];
                assert.strictEqual(file.target.toString(), model.resource.toString());
            }
            assert.strictEqual(e.operation, 1 /* FileOperation.DELETE */);
            correlationId = e.correlationId;
            eventCounter++;
        });
        const listener2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            for (let i = 0; i < models.length; i++) {
                const model = models[i];
                const file = e.files[i];
                assert.strictEqual(file.target.toString(), model.resource.toString());
            }
            assert.strictEqual(e.operation, 1 /* FileOperation.DELETE */);
            assert.strictEqual(e.correlationId, correlationId);
            eventCounter++;
        });
        await accessor.workingCopyFileService.delete(models.map(model => ({ resource: model.resource })), CancellationToken.None);
        for (const model of models) {
            assert.ok(!accessor.workingCopyService.isDirty(model.resource));
            model.dispose();
        }
        assert.strictEqual(eventCounter, 3);
        participant.dispose();
        listener1.dispose();
        listener2.dispose();
    }
    async function testCreate(resource, contents) {
        const model = instantiationService.createInstance(TextFileEditorModel, resource, 'utf8', undefined);
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.workingCopyService.isDirty(model.resource));
        let eventCounter = 0;
        let correlationId = undefined;
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                assert.strictEqual(files.length, 1);
                const file = files[0];
                assert.strictEqual(file.target.toString(), model.resource.toString());
                assert.strictEqual(operation, 0 /* FileOperation.CREATE */);
                eventCounter++;
            }
        }));
        disposables.add(accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation(e => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), model.resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            correlationId = e.correlationId;
            eventCounter++;
        }));
        disposables.add(accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), model.resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            assert.strictEqual(e.correlationId, correlationId);
            eventCounter++;
        }));
        await accessor.workingCopyFileService.create([{ resource, contents }], CancellationToken.None);
        assert.ok(!accessor.workingCopyService.isDirty(model.resource));
        model.dispose();
        assert.strictEqual(eventCounter, 3);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvd29ya2luZ0NvcHlGaWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUd0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0csT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFtQyxNQUFNLG1EQUFtRCxDQUFDO0FBR3hKLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBRXBDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxvQkFBMkMsQ0FBQztJQUNoRCxJQUFJLFFBQTZCLENBQUM7SUFFbEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM3RSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDcEUsV0FBVyxDQUFDLEdBQUcsQ0FBNkIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3RSxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSztRQUNoQyxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUMvRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxLQUFLO1FBQ2hDLE1BQU0sVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSztRQUMxQyxNQUFNLFVBQVUsQ0FBQztZQUNoQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztZQUN4QyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztZQUN4QyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztZQUN4QyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztTQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLO1FBQzlCLE1BQU0sY0FBYyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0ksQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSztRQUM5QyxNQUFNLFdBQVcsR0FBd0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVILFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXpHLE1BQU0sWUFBWSxHQUFHLE1BQU0sb0JBQW9CLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbkosV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUs7UUFDckUsTUFBTSxZQUFZLEdBQXdCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoSyxNQUFNLFlBQVksR0FBd0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hLLE1BQU0sWUFBWSxHQUF3QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckksUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFM0csTUFBTSxZQUFZLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztZQUMvQyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtZQUMzRixFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtTQUMzRixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRVQsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSztRQUN2QyxNQUFNLGNBQWMsQ0FBQztZQUNwQixFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxFQUFFO1lBQzdHLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLEVBQUU7U0FBQyxFQUM5RyxJQUFJLENBQUMsQ0FBQztJQUNSLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUs7UUFDM0QsTUFBTSxjQUFjLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakosQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSztRQUM5QixNQUFNLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVJLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUs7UUFDOUMsTUFBTSxXQUFXLEdBQXdCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1SCxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV6RyxNQUFNLFlBQVksR0FBRyxNQUFNLG9CQUFvQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0ksV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUs7UUFDckUsTUFBTSxZQUFZLEdBQXdCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoSyxNQUFNLFlBQVksR0FBd0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hLLE1BQU0sWUFBWSxHQUF3QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckksUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFM0csTUFBTSxZQUFZLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztZQUMvQyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtZQUMzRixFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtTQUMzRixDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLO1FBQ3ZDLE1BQU0sY0FBYyxDQUFDO1lBQ3BCLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLEVBQUU7WUFDN0csRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUMsRUFBRTtZQUM3RyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxFQUFFO1NBQUMsRUFDOUcsS0FBSyxDQUFDLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLO1FBQzNELE1BQU0sY0FBYyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwRyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUvRixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFL0YsSUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV4QyxLQUFLLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXJDLEtBQUssR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXJDLE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV4QyxLQUFLLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUs7UUFDeEMsTUFBTSxNQUFNLEdBQXdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDMUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0YsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLGVBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhDLE1BQU0sZUFBZSxHQUFvQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvSCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFO1lBQ3JGLE9BQU8sQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGlFQUFpRSxDQUFDLENBQUM7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFOUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXZCLEtBQUssR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLHVDQUF1QyxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUs7UUFDekIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksYUFBYSxHQUF1QixTQUFTLENBQUM7UUFFbEQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFdkQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUM7WUFDM0UsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUywrQkFBdUIsQ0FBQztnQkFDcEQsWUFBWSxFQUFFLENBQUM7WUFDaEIsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLCtCQUF1QixDQUFDO1lBQ3RELGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQ2hDLFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsK0JBQXVCLENBQUM7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ25ELFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUV2RCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDckIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUM7WUFDM0UsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3ZELE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixRQUFRLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQzFDLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLFNBQVM7UUFDVCxJQUFJLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDeEMsSUFBSSxPQUFPLEdBQXFCLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE1BQU0sT0FBTyxDQUFDO1FBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUVqQixnQkFBZ0I7UUFDaEIsR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEYsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsTUFBTSxPQUFPLENBQUM7UUFDZCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBRWpCLE9BQU87UUFDUCxHQUFHLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE1BQU0sT0FBTyxDQUFDO1FBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUVqQixPQUFPO1FBQ1AsR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5RyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixNQUFNLE9BQU8sQ0FBQztRQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25DLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFFakIsU0FBUztRQUNULEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDcEMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE1BQU0sT0FBTyxDQUFDO1FBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkMsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxLQUF1QixFQUFFLElBQWM7UUFDMUUsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRXJCLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQywyQkFBMkIsQ0FBQztZQUMvRSxXQUFXLEVBQUUsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO2dCQUMxQixZQUFZLEVBQUUsQ0FBQztZQUNoQixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZGLFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RGLFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0UsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBRUQsS0FBSyxVQUFVLGNBQWMsQ0FBQyxLQUFxQyxFQUFFLElBQWEsRUFBRSxXQUFxQjtRQUV4RyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDckIsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFFLE1BQU0sV0FBVyxHQUF3QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3SCxNQUFNLFdBQVcsR0FBd0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0YsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdkUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFFekcsTUFBTSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsV0FBVyxDQUFDLGVBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM1QixXQUFXLENBQUMsZUFBZ0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUM7WUFFRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUM7WUFDL0UsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7Z0JBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3ZDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNwQyxNQUFNLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3pFLENBQUM7Z0JBRUQsWUFBWSxFQUFFLENBQUM7Z0JBRWYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsNEJBQW9CLENBQUMsMkJBQW1CLENBQUMsQ0FBQztZQUMvRSxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxhQUFxQixDQUFDO1FBRTFCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN6RSxDQUFDO1lBRUQsWUFBWSxFQUFFLENBQUM7WUFFZixhQUFhLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsNEJBQW9CLENBQUMsMkJBQW1CLENBQUMsQ0FBQztRQUNqRixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN6RSxDQUFDO1lBRUQsWUFBWSxFQUFFLENBQUM7WUFFZixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsNEJBQW9CLENBQUMsMkJBQW1CLENBQUMsQ0FBQztZQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvTSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL00sQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEMsTUFBTSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsZUFBZ0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFdkUsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDcEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbkUsQ0FBQztZQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFFbEUsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVELEtBQUssVUFBVSxVQUFVLENBQUMsU0FBZ0I7UUFFekMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLFFBQVEsRUFBQyxFQUFFO1lBQy9ELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xFLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTdGLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLEtBQUssQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDL0QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksYUFBYSxHQUF1QixTQUFTLENBQUM7UUFFbEQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDO1lBQy9FLFdBQVcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUN4QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDdkUsQ0FBQztnQkFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsK0JBQXVCLENBQUM7Z0JBQ3BELFlBQVksRUFBRSxDQUFDO1lBQ2hCLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLCtCQUF1QixDQUFDO1lBQ3RELGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQ2hDLFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN2RSxDQUFDO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUywrQkFBdUIsQ0FBQztZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDbkQsWUFBWSxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxSCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQixDQUFDO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVELEtBQUssVUFBVSxVQUFVLENBQUMsUUFBYSxFQUFFLFFBQWtCO1FBQzFELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xFLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdGLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxlQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFL0QsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksYUFBYSxHQUF1QixTQUFTLENBQUM7UUFFbEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUM7WUFDM0UsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7Z0JBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsK0JBQXVCLENBQUM7Z0JBQ3BELFlBQVksRUFBRSxDQUFDO1lBQ2hCLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsK0JBQXVCLENBQUM7WUFDdEQsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUM7WUFDaEMsWUFBWSxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsK0JBQXVCLENBQUM7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ25ELFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVoQixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsdUNBQXVDLEVBQUUsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyJ9