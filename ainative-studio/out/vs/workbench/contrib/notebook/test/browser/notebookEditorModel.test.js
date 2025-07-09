/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { CellKind, NotebookSetting } from '../../common/notebookCommon.js';
import { NotebookFileWorkingCopyModel } from '../../common/notebookEditorModel.js';
import { SimpleNotebookProviderInfo } from '../../common/notebookService.js';
import { setupInstantiationService } from './testNotebookEditor.js';
suite('NotebookFileWorkingCopyModel', function () {
    let disposables;
    let instantiationService;
    const configurationService = new TestConfigurationService();
    const telemetryService = new class extends mock() {
        publicLogError2() { }
    };
    const logservice = new class extends mock() {
    };
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
    });
    test('no transient output is send to serializer', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [{ cellKind: CellKind.Code, language: 'foo', mime: 'foo', source: 'foo', outputs: [{ outputId: 'id', outputs: [{ mime: Mimes.text, data: VSBuffer.fromString('Hello Out') }] }] }], {}, { transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {}, transientOutputs: false });
        { // transient output
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = { transientOutputs: true, transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {} };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells.length, 1);
                    assert.strictEqual(notebook.cells[0].outputs.length, 0);
                    return VSBuffer.fromString('');
                }
            }), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
        { // NOT transient output
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = { transientOutputs: false, transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {} };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells.length, 1);
                    assert.strictEqual(notebook.cells[0].outputs.length, 1);
                    return VSBuffer.fromString('');
                }
            }), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
    });
    test('no transient metadata is send to serializer', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [{ cellKind: CellKind.Code, language: 'foo', mime: 'foo', source: 'foo', outputs: [] }], { foo: 123, bar: 456 }, { transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {}, transientOutputs: false });
        disposables.add(notebook);
        { // transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = { transientOutputs: true, transientCellMetadata: {}, transientDocumentMetadata: { bar: true }, cellContentMetadata: {} };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.metadata.foo, 123);
                    assert.strictEqual(notebook.metadata.bar, undefined);
                    return VSBuffer.fromString('');
                }
            }), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
        { // NOT transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = { transientOutputs: false, transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {} };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.metadata.foo, 123);
                    assert.strictEqual(notebook.metadata.bar, 456);
                    return VSBuffer.fromString('');
                }
            }), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
    });
    test('no transient cell metadata is send to serializer', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [{ cellKind: CellKind.Code, language: 'foo', mime: 'foo', source: 'foo', outputs: [], metadata: { foo: 123, bar: 456 } }], {}, { transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {}, transientOutputs: false, });
        disposables.add(notebook);
        { // transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = { transientOutputs: true, transientDocumentMetadata: {}, transientCellMetadata: { bar: true }, cellContentMetadata: {} };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells[0].metadata.foo, 123);
                    assert.strictEqual(notebook.cells[0].metadata.bar, undefined);
                    return VSBuffer.fromString('');
                }
            }), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
        { // NOT transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = { transientOutputs: false, transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {} };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells[0].metadata.foo, 123);
                    assert.strictEqual(notebook.cells[0].metadata.bar, 456);
                    return VSBuffer.fromString('');
                }
            }), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
    });
    test('Notebooks with outputs beyond the size threshold will throw for backup snapshots', async function () {
        const outputLimit = 100;
        await configurationService.setUserConfiguration(NotebookSetting.outputBackupSizeLimit, outputLimit * 1.0 / 1024);
        const largeOutput = { outputId: '123', outputs: [{ mime: Mimes.text, data: VSBuffer.fromString('a'.repeat(outputLimit + 1)) }] };
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [{ cellKind: CellKind.Code, language: 'foo', mime: 'foo', source: 'foo', outputs: [largeOutput], metadata: { foo: 123, bar: 456 } }], {}, { transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {}, transientOutputs: false, });
        disposables.add(notebook);
        let callCount = 0;
        const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new class extends mock() {
            constructor() {
                super(...arguments);
                this.options = { transientOutputs: true, transientDocumentMetadata: {}, transientCellMetadata: { bar: true }, cellContentMetadata: {} };
            }
            async notebookToData(notebook) {
                callCount += 1;
                assert.strictEqual(notebook.cells[0].metadata.foo, 123);
                assert.strictEqual(notebook.cells[0].metadata.bar, undefined);
                return VSBuffer.fromString('');
            }
        }, configurationService), configurationService, telemetryService, logservice));
        try {
            await model.snapshot(2 /* SnapshotContext.Backup */, CancellationToken.None);
            assert.fail('Expected snapshot to throw an error for large output');
        }
        catch (e) {
            assert.notEqual(e.code, 'ERR_ASSERTION', e.message);
        }
        await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
        assert.strictEqual(callCount, 1);
    });
    test('Notebook model will not return a save delegate if the serializer has not been retreived', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [{ cellKind: CellKind.Code, language: 'foo', mime: 'foo', source: 'foo', outputs: [], metadata: { foo: 123, bar: 456 } }], {}, { transientCellMetadata: {}, transientDocumentMetadata: {}, cellContentMetadata: {}, transientOutputs: false, });
        disposables.add(notebook);
        const serializer = new class extends mock() {
            save() {
                return Promise.resolve({ name: 'savedFile' });
            }
        };
        serializer.test = 'yes';
        let resolveSerializer = () => { };
        const serializerPromise = new Promise(resolve => {
            resolveSerializer = resolve;
        });
        const notebookService = mockNotebookService(notebook, serializerPromise);
        configurationService.setUserConfiguration(NotebookSetting.remoteSaving, true);
        const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, notebookService, configurationService, telemetryService, logservice));
        // the save method should not be set if the serializer is not yet resolved
        const notExist = model.save;
        assert.strictEqual(notExist, undefined);
        resolveSerializer(serializer);
        await model.getNotebookSerializer();
        const result = await model.save?.({}, {});
        assert.strictEqual(result.name, 'savedFile');
    });
});
function mockNotebookService(notebook, notebookSerializer, configurationService = new TestConfigurationService()) {
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.serializer = undefined;
        }
        async withNotebookDataProvider(viewType) {
            this.serializer = await notebookSerializer;
            return new SimpleNotebookProviderInfo(notebook.viewType, this.serializer, {
                id: new ExtensionIdentifier('test'),
                location: undefined
            });
        }
        tryGetDataProviderSync(viewType) {
            if (!this.serializer) {
                return undefined;
            }
            return new SimpleNotebookProviderInfo(notebook.viewType, this.serializer, {
                id: new ExtensionIdentifier('test'),
                location: undefined
            });
        }
        async createNotebookTextDocumentSnapshot(uri, context, token) {
            const info = await this.withNotebookDataProvider(notebook.viewType);
            const serializer = info.serializer;
            const outputSizeLimit = configurationService.getValue(NotebookSetting.outputBackupSizeLimit) ?? 1024;
            const data = notebook.createSnapshot({ context: context, outputSizeLimit: outputSizeLimit, transientOptions: serializer.options });
            const bytes = await serializer.notebookToData(data);
            return bufferToStream(bytes);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0VkaXRvck1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUEwQixNQUFNLHNDQUFzQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUs5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUE0QixlQUFlLEVBQW9CLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkYsT0FBTyxFQUF5QywwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BILE9BQU8sRUFBRSx5QkFB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