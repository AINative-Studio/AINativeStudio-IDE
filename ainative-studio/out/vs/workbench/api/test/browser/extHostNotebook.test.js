/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { mock } from '../../../../base/test/common/mock.js';
import { MainContext } from '../../common/extHost.protocol.js';
import { ExtHostNotebookController } from '../../common/extHostNotebook.js';
import { CellKind, CellUri, NotebookCellsChangeType } from '../../../contrib/notebook/common/notebookCommon.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Event } from '../../../../base/common/event.js';
import { ExtHostNotebookDocuments } from '../../common/extHostNotebookDocuments.js';
import { SerializableObjectWithBuffers } from '../../../services/extensions/common/proxyIdentifier.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ExtHostConsumerFileSystem } from '../../common/extHostFileSystemConsumer.js';
import { ExtHostFileSystemInfo } from '../../common/extHostFileSystemInfo.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtHostSearch } from '../../common/extHostSearch.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
suite('NotebookCell#Document', function () {
    let rpcProtocol;
    let notebook;
    let extHostDocumentsAndEditors;
    let extHostDocuments;
    let extHostNotebooks;
    let extHostNotebookDocuments;
    let extHostConsumerFileSystem;
    let extHostSearch;
    const notebookUri = URI.parse('test:///notebook.file');
    const disposables = new DisposableStore();
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(async function () {
        rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadCommands, new class extends mock() {
            $registerCommand() { }
        });
        rpcProtocol.set(MainContext.MainThreadNotebook, new class extends mock() {
            async $registerNotebookSerializer() { }
            async $unregisterNotebookSerializer() { }
        });
        extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
        extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
        extHostConsumerFileSystem = new ExtHostConsumerFileSystem(rpcProtocol, new ExtHostFileSystemInfo());
        extHostSearch = new ExtHostSearch(rpcProtocol, new URITransformerService(null), new NullLogService());
        extHostNotebooks = new ExtHostNotebookController(rpcProtocol, new ExtHostCommands(rpcProtocol, new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        }), extHostDocumentsAndEditors, extHostDocuments, extHostConsumerFileSystem, extHostSearch, new NullLogService());
        extHostNotebookDocuments = new ExtHostNotebookDocuments(extHostNotebooks);
        const reg = extHostNotebooks.registerNotebookSerializer(nullExtensionDescription, 'test', new class extends mock() {
        });
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({
            addedDocuments: [{
                    uri: notebookUri,
                    viewType: 'test',
                    versionId: 0,
                    cells: [{
                            handle: 0,
                            uri: CellUri.generate(notebookUri, 0),
                            source: ['### Heading'],
                            eol: '\n',
                            language: 'markdown',
                            cellKind: CellKind.Markup,
                            outputs: [],
                        }, {
                            handle: 1,
                            uri: CellUri.generate(notebookUri, 1),
                            source: ['console.log("aaa")', 'console.log("bbb")'],
                            eol: '\n',
                            language: 'javascript',
                            cellKind: CellKind.Code,
                            outputs: [],
                        }],
                }],
            addedEditors: [{
                    documentUri: notebookUri,
                    id: '_notebook_editor_0',
                    selections: [{ start: 0, end: 1 }],
                    visibleRanges: [],
                    viewType: 'test'
                }]
        }));
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ newActiveEditor: '_notebook_editor_0' }));
        notebook = extHostNotebooks.notebookDocuments[0];
        disposables.add(reg);
        disposables.add(notebook);
        disposables.add(extHostDocuments);
    });
    test('cell document is vscode.TextDocument', async function () {
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const [c1, c2] = notebook.apiNotebook.getCells();
        const d1 = extHostDocuments.getDocument(c1.document.uri);
        assert.ok(d1);
        assert.strictEqual(d1.languageId, c1.document.languageId);
        assert.strictEqual(d1.version, 1);
        const d2 = extHostDocuments.getDocument(c2.document.uri);
        assert.ok(d2);
        assert.strictEqual(d2.languageId, c2.document.languageId);
        assert.strictEqual(d2.version, 1);
    });
    test('cell document goes when notebook closes', async function () {
        const cellUris = [];
        for (const cell of notebook.apiNotebook.getCells()) {
            assert.ok(extHostDocuments.getDocument(cell.document.uri));
            cellUris.push(cell.document.uri.toString());
        }
        const removedCellUris = [];
        const reg = extHostDocuments.onDidRemoveDocument(doc => {
            removedCellUris.push(doc.uri.toString());
        });
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ removedDocuments: [notebook.uri] }));
        reg.dispose();
        assert.strictEqual(removedCellUris.length, 2);
        assert.deepStrictEqual(removedCellUris.sort(), cellUris.sort());
    });
    test('cell document is vscode.TextDocument after changing it', async function () {
        const p = new Promise((resolve, reject) => {
            disposables.add(extHostNotebookDocuments.onDidChangeNotebookDocument(e => {
                try {
                    assert.strictEqual(e.contentChanges.length, 1);
                    assert.strictEqual(e.contentChanges[0].addedCells.length, 2);
                    const [first, second] = e.contentChanges[0].addedCells;
                    const doc1 = extHostDocuments.getAllDocumentData().find(data => isEqual(data.document.uri, first.document.uri));
                    assert.ok(doc1);
                    assert.strictEqual(doc1?.document === first.document, true);
                    const doc2 = extHostDocuments.getAllDocumentData().find(data => isEqual(data.document.uri, second.document.uri));
                    assert.ok(doc2);
                    assert.strictEqual(doc2?.document === second.document, true);
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            }));
        });
        extHostNotebookDocuments.$acceptModelChanged(notebookUri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 0, [{
                                    handle: 2,
                                    uri: CellUri.generate(notebookUri, 2),
                                    source: ['Hello', 'World', 'Hello World!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                }, {
                                    handle: 3,
                                    uri: CellUri.generate(notebookUri, 3),
                                    source: ['Hallo', 'Welt', 'Hallo Welt!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                }]]]
                }
            ]
        }), false);
        await p;
    });
    test('cell document stays open when notebook is still open', async function () {
        const docs = [];
        const addData = [];
        for (const cell of notebook.apiNotebook.getCells()) {
            const doc = extHostDocuments.getDocument(cell.document.uri);
            assert.ok(doc);
            assert.strictEqual(extHostDocuments.getDocument(cell.document.uri).isClosed, false);
            docs.push(doc);
            addData.push({
                EOL: '\n',
                isDirty: doc.isDirty,
                lines: doc.getText().split('\n'),
                languageId: doc.languageId,
                uri: doc.uri,
                versionId: doc.version,
                encoding: 'utf8'
            });
        }
        // this call happens when opening a document on the main side
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ addedDocuments: addData });
        // this call happens when closing a document from the main side
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ removedDocuments: docs.map(d => d.uri) });
        // notebook is still open -> cell documents stay open
        for (const cell of notebook.apiNotebook.getCells()) {
            assert.ok(extHostDocuments.getDocument(cell.document.uri));
            assert.strictEqual(extHostDocuments.getDocument(cell.document.uri).isClosed, false);
        }
        // close notebook -> docs are closed
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ removedDocuments: [notebook.uri] }));
        for (const cell of notebook.apiNotebook.getCells()) {
            assert.throws(() => extHostDocuments.getDocument(cell.document.uri));
        }
        for (const doc of docs) {
            assert.strictEqual(doc.isClosed, true);
        }
    });
    test('cell document goes when cell is removed', async function () {
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const [cell1, cell2] = notebook.apiNotebook.getCells();
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 2,
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 1, []]]
                }
            ]
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 1);
        assert.strictEqual(cell1.document.isClosed, true); // ref still alive!
        assert.strictEqual(cell2.document.isClosed, false);
        assert.throws(() => extHostDocuments.getDocument(cell1.document.uri));
    });
    test('cell#index', function () {
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const [first, second] = notebook.apiNotebook.getCells();
        assert.strictEqual(first.index, 0);
        assert.strictEqual(second.index, 1);
        // remove first cell
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [{
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 1, []]]
                }]
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 1);
        assert.strictEqual(second.index, 0);
        extHostNotebookDocuments.$acceptModelChanged(notebookUri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [{
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 0, [{
                                    handle: 2,
                                    uri: CellUri.generate(notebookUri, 2),
                                    source: ['Hello', 'World', 'Hello World!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                }, {
                                    handle: 3,
                                    uri: CellUri.generate(notebookUri, 3),
                                    source: ['Hallo', 'Welt', 'Hallo Welt!'],
                                    eol: '\n',
                                    language: 'test',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                }]]]
                }]
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 3);
        assert.strictEqual(second.index, 2);
    });
    test('ERR MISSING extHostDocument for notebook cell: #116711', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        // DON'T call this, make sure the cell-documents have not been created yet
        // assert.strictEqual(notebook.notebookDocument.cellCount, 2);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 100,
            rawEvents: [{
                    kind: NotebookCellsChangeType.ModelChange,
                    changes: [[0, 2, [{
                                    handle: 3,
                                    uri: CellUri.generate(notebookUri, 3),
                                    source: ['### Heading'],
                                    eol: '\n',
                                    language: 'markdown',
                                    cellKind: CellKind.Markup,
                                    outputs: [],
                                }, {
                                    handle: 4,
                                    uri: CellUri.generate(notebookUri, 4),
                                    source: ['console.log("aaa")', 'console.log("bbb")'],
                                    eol: '\n',
                                    language: 'javascript',
                                    cellKind: CellKind.Code,
                                    outputs: [],
                                }]]]
                }]
        }), false);
        assert.strictEqual(notebook.apiNotebook.cellCount, 2);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 1);
        assert.strictEqual(event.contentChanges[0].range.end - event.contentChanges[0].range.start, 2);
        assert.strictEqual(event.contentChanges[0].removedCells[0].document.isClosed, true);
        assert.strictEqual(event.contentChanges[0].removedCells[1].document.isClosed, true);
        assert.strictEqual(event.contentChanges[0].addedCells.length, 2);
        assert.strictEqual(event.contentChanges[0].addedCells[0].document.isClosed, false);
        assert.strictEqual(event.contentChanges[0].addedCells[1].document.isClosed, false);
    });
    test('Opening a notebook results in VS Code firing the event onDidChangeActiveNotebookEditor twice #118470', function () {
        let count = 0;
        disposables.add(extHostNotebooks.onDidChangeActiveNotebookEditor(() => count += 1));
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({
            addedEditors: [{
                    documentUri: notebookUri,
                    id: '_notebook_editor_2',
                    selections: [{ start: 0, end: 1 }],
                    visibleRanges: [],
                    viewType: 'test'
                }]
        }));
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({
            newActiveEditor: '_notebook_editor_2'
        }));
        assert.strictEqual(count, 1);
    });
    test('unset active notebook editor', function () {
        const editor = extHostNotebooks.activeNotebookEditor;
        assert.ok(editor !== undefined);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ newActiveEditor: undefined }));
        assert.ok(extHostNotebooks.activeNotebookEditor === editor);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({}));
        assert.ok(extHostNotebooks.activeNotebookEditor === editor);
        extHostNotebooks.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers({ newActiveEditor: null }));
        assert.ok(extHostNotebooks.activeNotebookEditor === undefined);
    });
    test('change cell language triggers onDidChange events', async function () {
        const first = notebook.apiNotebook.cellAt(0);
        assert.strictEqual(first.document.languageId, 'markdown');
        const removed = Event.toPromise(extHostDocuments.onDidRemoveDocument);
        const added = Event.toPromise(extHostDocuments.onDidAddDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12, rawEvents: [{
                    kind: NotebookCellsChangeType.ChangeCellLanguage,
                    index: 0,
                    language: 'fooLang'
                }]
        }), false);
        const removedDoc = await removed;
        const addedDoc = await added;
        assert.strictEqual(first.document.languageId, 'fooLang');
        assert.ok(removedDoc === addedDoc);
    });
    test('onDidChangeNotebook-event, cell changes', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12, rawEvents: [{
                    kind: NotebookCellsChangeType.ChangeCellMetadata,
                    index: 0,
                    metadata: { foo: 1 }
                }, {
                    kind: NotebookCellsChangeType.ChangeCellMetadata,
                    index: 1,
                    metadata: { foo: 2 },
                }, {
                    kind: NotebookCellsChangeType.Output,
                    index: 1,
                    outputs: [
                        {
                            items: [{
                                    valueBytes: VSBuffer.fromByteArray([0, 2, 3]),
                                    mime: 'text/plain'
                                }],
                            outputId: '1'
                        }
                    ]
                }]
        }), false, undefined);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 2);
        const [first, second] = event.cellChanges;
        assert.deepStrictEqual(first.metadata, first.cell.metadata);
        assert.deepStrictEqual(first.executionSummary, undefined);
        assert.deepStrictEqual(first.outputs, undefined);
        assert.deepStrictEqual(first.document, undefined);
        assert.deepStrictEqual(second.outputs, second.cell.outputs);
        assert.deepStrictEqual(second.metadata, second.cell.metadata);
        assert.deepStrictEqual(second.executionSummary, undefined);
        assert.deepStrictEqual(second.document, undefined);
    });
    test('onDidChangeNotebook-event, notebook metadata', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({ versionId: 12, rawEvents: [] }), false, { foo: 2 });
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 0);
        assert.deepStrictEqual(event.metadata, { foo: 2 });
    });
    test('onDidChangeNotebook-event, froozen data', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({ versionId: 12, rawEvents: [] }), false, { foo: 2 });
        const event = await p;
        assert.ok(Object.isFrozen(event));
        assert.ok(Object.isFrozen(event.cellChanges));
        assert.ok(Object.isFrozen(event.contentChanges));
        assert.ok(Object.isFrozen(event.notebook));
        assert.ok(!Object.isFrozen(event.metadata));
    });
    test('change cell language and onDidChangeNotebookDocument', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        const first = notebook.apiNotebook.cellAt(0);
        assert.strictEqual(first.document.languageId, 'markdown');
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [{
                    kind: NotebookCellsChangeType.ChangeCellLanguage,
                    index: 0,
                    language: 'fooLang'
                }]
        }), false);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 1);
        const [cellChange] = event.cellChanges;
        assert.strictEqual(cellChange.cell === first, true);
        assert.ok(cellChange.document === first.document);
        assert.ok(cellChange.executionSummary === undefined);
        assert.ok(cellChange.metadata === undefined);
        assert.ok(cellChange.outputs === undefined);
    });
    test('change notebook cell document and onDidChangeNotebookDocument', async function () {
        const p = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        const first = notebook.apiNotebook.cellAt(0);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: 12,
            rawEvents: [{
                    kind: NotebookCellsChangeType.ChangeCellContent,
                    index: 0
                }]
        }), false);
        const event = await p;
        assert.strictEqual(event.notebook === notebook.apiNotebook, true);
        assert.strictEqual(event.contentChanges.length, 0);
        assert.strictEqual(event.cellChanges.length, 1);
        const [cellChange] = event.cellChanges;
        assert.strictEqual(cellChange.cell === first, true);
        assert.ok(cellChange.document === first.document);
        assert.ok(cellChange.executionSummary === undefined);
        assert.ok(cellChange.metadata === undefined);
        assert.ok(cellChange.outputs === undefined);
    });
    async function replaceOutputs(cellIndex, outputId, outputItems) {
        const changeEvent = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [{
                    kind: NotebookCellsChangeType.Output,
                    index: cellIndex,
                    outputs: [{ outputId, items: outputItems }]
                }]
        }), false);
        await changeEvent;
    }
    async function appendOutputItem(cellIndex, outputId, outputItems) {
        const changeEvent = Event.toPromise(extHostNotebookDocuments.onDidChangeNotebookDocument);
        extHostNotebookDocuments.$acceptModelChanged(notebook.uri, new SerializableObjectWithBuffers({
            versionId: notebook.apiNotebook.version + 1,
            rawEvents: [{
                    kind: NotebookCellsChangeType.OutputItem,
                    index: cellIndex,
                    append: true,
                    outputId,
                    outputItems
                }]
        }), false);
        await changeEvent;
    }
    test('Append multiple text/plain output items', async function () {
        await replaceOutputs(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('bar') }]);
        await appendOutputItem(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('baz') }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 3);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'text/plain');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'foo');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[1].mime, 'text/plain');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[1].data).toString(), 'bar');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[2].mime, 'text/plain');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[2].data).toString(), 'baz');
    });
    test('Append multiple stdout stream output items to an output with another mime', async function () {
        await replaceOutputs(1, '1', [{ mime: 'text/plain', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('bar') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('baz') }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 3);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'text/plain');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[1].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[2].mime, 'application/vnd.code.notebook.stdout');
    });
    test('Compress multiple stdout stream output items', async function () {
        await replaceOutputs(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('bar') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('baz') }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'foobarbaz');
    });
    test('Compress multiple stdout stream output items (with support for terminal escape code -> \u001b[A)', async function () {
        await replaceOutputs(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('\nfoo') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString(`${String.fromCharCode(27)}[Abar`) }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'bar');
    });
    test('Compress multiple stdout stream output items (with support for terminal escape code -> \r character)', async function () {
        await replaceOutputs(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stdout', valueBytes: VSBuffer.fromString(`\rbar`) }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stdout');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'bar');
    });
    test('Compress multiple stderr stream output items', async function () {
        await replaceOutputs(1, '1', [{ mime: 'application/vnd.code.notebook.stderr', valueBytes: VSBuffer.fromString('foo') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stderr', valueBytes: VSBuffer.fromString('bar') }]);
        await appendOutputItem(1, '1', [{ mime: 'application/vnd.code.notebook.stderr', valueBytes: VSBuffer.fromString('baz') }]);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items.length, 1);
        assert.strictEqual(notebook.apiNotebook.cellAt(1).outputs[0].items[0].mime, 'application/vnd.code.notebook.stderr');
        assert.strictEqual(VSBuffer.wrap(notebook.apiNotebook.cellAt(1).outputs[0].items[0].data).toString(), 'foobarbaz');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdE5vdGVib29rLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQW1CLFdBQVcsRUFBeUcsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2TCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6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Q0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMxRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzFGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdHLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDMUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUcsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsMkVBQTJFLEVBQUUsS0FBSztRQUN0RixNQUFNLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLHNDQUFzQyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNILE1BQU0sZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLHNDQUFzQyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNILE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENB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QUFFLHNDQUFzQyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNILE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUNwSCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNwSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=