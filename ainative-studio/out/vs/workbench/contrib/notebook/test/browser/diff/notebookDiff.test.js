/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { LcsDiff } from '../../../../../../base/common/diff/diff.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../../base/common/mime.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NotebookDiffEditorEventDispatcher } from '../../../browser/diff/eventDispatcher.js';
import { NotebookDiffViewModel, prettyChanges } from '../../../browser/diff/notebookDiffViewModel.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookService } from '../../../common/notebookService.js';
import { withTestNotebookDiffModel } from '../testNotebookEditor.js';
class CellSequence {
    constructor(textModel) {
        this.textModel = textModel;
    }
    getElements() {
        const hashValue = new Int32Array(this.textModel.cells.length);
        for (let i = 0; i < this.textModel.cells.length; i++) {
            hashValue[i] = this.textModel.cells[i].getHashValue();
        }
        return hashValue;
    }
}
suite('NotebookDiff', () => {
    let disposables;
    let token;
    let eventDispatcher;
    let diffViewModel;
    let diffResult;
    let notebookEditorWorkerService;
    let heightCalculator;
    teardown(() => disposables.dispose());
    const configurationService = new TestConfigurationService({ notebook: { diff: { ignoreMetadata: true } } });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        const cancellation = disposables.add(new CancellationTokenSource());
        eventDispatcher = disposables.add(new NotebookDiffEditorEventDispatcher());
        token = cancellation.token;
        notebookEditorWorkerService = new class extends mock() {
            computeDiff() { return Promise.resolve({ cellsDiff: diffResult, metadataChanged: false }); }
        };
        heightCalculator = new class extends mock() {
            diffAndComputeHeight() { return Promise.resolve(0); }
            computeHeightFromLines(_lineCount) {
                return 0;
            }
        };
    });
    async function verifyChangeEventIsNotFired(diffViewModel) {
        let eventArgs = undefined;
        disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
        await diffViewModel.computeDiff(token);
        assert.strictEqual(eventArgs, undefined);
    }
    test('diff different source', async () => {
        await withTestNotebookDiffModel([
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], [
            ['y', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1
                }]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 1);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
        });
    });
    test('No changes when re-computing diff with the same source', async () => {
        await withTestNotebookDiffModel([
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], [
            ['y', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1
                }]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff different output', async () => {
        await withTestNotebookDiffModel([
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }] }], { metadata: { collapsed: false }, executionOrder: 5 }],
            ['', 'javascript', CellKind.Code, [], {}]
        ], [
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
            ['', 'javascript', CellKind.Code, [], {}]
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1
                }]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 1, deleteCount: 1, elements: [diffViewModel.items[1]] });
            diffViewModel.items[1].hideUnchangedCells();
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            assert.deepStrictEqual(eventArgs, { start: 1, deleteCount: 1, elements: [diffViewModel.items[1]] });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff test small source', async () => {
        await withTestNotebookDiffModel([
            ['123456789', 'javascript', CellKind.Code, [], {}]
        ], [
            ['987654321', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1
                }]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 1);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff test data single cell', async () => {
        await withTestNotebookDiffModel([
            [[
                    '# This version has a bug\n',
                    'def mult(a, b):\n',
                    '    return a / b'
                ].join(''), 'javascript', CellKind.Code, [], {}]
        ], [
            [[
                    'def mult(a, b):\n',
                    '    \'This version is debugged.\'\n',
                    '    return a * b'
                ].join(''), 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            assert.strictEqual(diffResult.changes.length, 1);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 0,
                    originalLength: 1,
                    modifiedStart: 0,
                    modifiedLength: 1
                }]);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 1);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff foo/foe', async () => {
        await withTestNotebookDiffModel([
            [['def foe(x, y):\n', '    return x + y\n', 'foe(3, 2)'].join(''), 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([6])) }] }], { metadata: { collapsed: false }, executionOrder: 5 }],
            [['def foo(x, y):\n', '    return x * y\n', 'foo(1, 2)'].join(''), 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([2])) }] }], { metadata: { collapsed: false }, executionOrder: 6 }],
            ['', 'javascript', CellKind.Code, [], {}]
        ], [
            [['def foo(x, y):\n', '    return x * y\n', 'foo(1, 2)'].join(''), 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([6])) }] }], { metadata: { collapsed: false }, executionOrder: 5 }],
            [['def foe(x, y):\n', '    return x + y\n', 'foe(3, 2)'].join(''), 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([2])) }] }], { metadata: { collapsed: false }, executionOrder: 6 }],
            ['', 'javascript', CellKind.Code, [], {}]
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 3);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'modified');
            assert.strictEqual(diffViewModel.items[2].type, 'placeholder');
            diffViewModel.items[2].showHiddenCells();
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 2, deleteCount: 1, elements: [diffViewModel.items[2]] });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff markdown', async () => {
        await withTestNotebookDiffModel([
            ['This is a test notebook with only markdown cells', 'markdown', CellKind.Markup, [], {}],
            ['Lorem ipsum dolor sit amet', 'markdown', CellKind.Markup, [], {}],
            ['In other news', 'markdown', CellKind.Markup, [], {}],
        ], [
            ['This is a test notebook with markdown cells only', 'markdown', CellKind.Markup, [], {}],
            ['Lorem ipsum dolor sit amet', 'markdown', CellKind.Markup, [], {}],
            ['In the news', 'markdown', CellKind.Markup, [], {}],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 3);
            assert.strictEqual(diffViewModel.items[0].type, 'modified');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            assert.strictEqual(diffViewModel.items[2].type, 'modified');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 1, deleteCount: 1, elements: [diffViewModel.items[1]] });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff insert', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}]
        ], [
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}]
        ], async (model, disposables, accessor) => {
            diffResult = {
                changes: [{
                        originalStart: 0,
                        originalLength: 0,
                        modifiedStart: 0,
                        modifiedLength: 1
                    }],
                quitEarly: false
            };
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs;
            disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(eventArgs?.firstChangeIndex, 0);
            assert.strictEqual(diffViewModel.items[0].type, 'insert');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 1, deleteCount: 1, elements: [diffViewModel.items[1], diffViewModel.items[2]] });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff insert 2', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            const eventDispatcher = disposables.add(new NotebookDiffEditorEventDispatcher());
            diffResult = {
                changes: [{
                        originalStart: 0,
                        originalLength: 0,
                        modifiedStart: 0,
                        modifiedLength: 1
                    }, {
                        originalStart: 0,
                        originalLength: 6,
                        modifiedStart: 1,
                        modifiedLength: 6
                    }],
                quitEarly: false
            };
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs;
            disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(eventArgs?.firstChangeIndex, 0);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'insert');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            diffViewModel.items[1].showHiddenCells();
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[3].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[4].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[5].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[6].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[7].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 1, deleteCount: 1, elements: diffViewModel.items.slice(1) });
            diffViewModel.items[1].hideUnchangedCells();
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'insert');
            assert.strictEqual(diffViewModel.items[1].type, 'placeholder');
            assert.deepStrictEqual(eventArgs, { start: 1, deleteCount: 7, elements: [diffViewModel.items[1]] });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff insert 3', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], async (model, disposables, accessor) => {
            diffResult = {
                changes: [{
                        originalStart: 4,
                        originalLength: 0,
                        modifiedStart: 4,
                        modifiedLength: 1
                    }],
                quitEarly: false
            };
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            let eventArgs = undefined;
            disposables.add(diffViewModel.onDidChangeItems(e => eventArgs = e));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            assert.strictEqual(diffViewModel.items[1].type, 'insert');
            assert.strictEqual(diffViewModel.items[2].type, 'placeholder');
            diffViewModel.items[0].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[3].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[4].type, 'insert');
            assert.strictEqual(diffViewModel.items[5].type, 'placeholder');
            assert.deepStrictEqual(eventArgs, { start: 0, deleteCount: 1, elements: diffViewModel.items.slice(0, 4) });
            diffViewModel.items[5].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[1].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[3].type, 'unchanged');
            assert.strictEqual(diffViewModel.items[4].type, 'insert');
            assert.strictEqual(diffViewModel.items[5].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 5, deleteCount: 1, elements: diffViewModel.items.slice(5) });
            diffViewModel.items[0].hideUnchangedCells();
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            assert.strictEqual(diffViewModel.items[1].type, 'insert');
            assert.strictEqual(diffViewModel.items[2].type, 'unchanged');
            assert.deepStrictEqual(eventArgs, { start: 0, deleteCount: 4, elements: diffViewModel.items.slice(0, 1) });
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('LCS', async () => {
        await withTestNotebookDiffModel([
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            ['x = 3', 'javascript', CellKind.Code, [], { metadata: { collapsed: true }, executionOrder: 1 }],
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 1 }],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }]
        ], [
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            ['x = 3', 'javascript', CellKind.Code, [], { metadata: { collapsed: true }, executionOrder: 1 }],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 1 }]
        ], async (model) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            const diffResult = diff.ComputeDiff(false);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 2,
                    originalLength: 0,
                    modifiedStart: 2,
                    modifiedLength: 1
                }, {
                    originalStart: 3,
                    originalLength: 1,
                    modifiedStart: 4,
                    modifiedLength: 0
                }]);
        });
    });
    test('LCS 2', async () => {
        await withTestNotebookDiffModel([
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            ['x = 3', 'javascript', CellKind.Code, [], { metadata: { collapsed: true }, executionOrder: 1 }],
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 1 }],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
            ['x = 5', 'javascript', CellKind.Code, [], {}],
            ['x', 'javascript', CellKind.Code, [], {}],
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }] }], {}],
        ], [
            ['# Description', 'markdown', CellKind.Markup, [], { metadata: {} }],
            ['x = 3', 'javascript', CellKind.Code, [], { metadata: { collapsed: true }, executionOrder: 1 }],
            ['x', 'javascript', CellKind.Code, [], { metadata: { collapsed: false } }],
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 1 }],
            ['x = 5', 'javascript', CellKind.Code, [], {}],
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }] }], {}],
            ['x', 'javascript', CellKind.Code, [], {}],
        ], async (model) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            const diffResult = diff.ComputeDiff(false);
            prettyChanges(model.original.notebook, model.modified.notebook, diffResult);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 2,
                    originalLength: 0,
                    modifiedStart: 2,
                    modifiedLength: 1
                }, {
                    originalStart: 3,
                    originalLength: 1,
                    modifiedStart: 4,
                    modifiedLength: 0
                }, {
                    originalStart: 5,
                    originalLength: 0,
                    modifiedStart: 5,
                    modifiedLength: 1
                }, {
                    originalStart: 6,
                    originalLength: 1,
                    modifiedStart: 7,
                    modifiedLength: 0
                }]);
        });
    });
    test('LCS 3', async () => {
        await withTestNotebookDiffModel([
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], [
            ['var a = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
            ['var d = 4;', 'javascript', CellKind.Code, [], {}],
            ['var h = 8;', 'javascript', CellKind.Code, [], {}],
            ['var e = 5;', 'javascript', CellKind.Code, [], {}],
            ['var f = 6;', 'javascript', CellKind.Code, [], {}],
            ['var g = 7;', 'javascript', CellKind.Code, [], {}],
        ], async (model) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            const diffResult = diff.ComputeDiff(false);
            prettyChanges(model.original.notebook, model.modified.notebook, diffResult);
            assert.deepStrictEqual(diffResult.changes.map(change => ({
                originalStart: change.originalStart,
                originalLength: change.originalLength,
                modifiedStart: change.modifiedStart,
                modifiedLength: change.modifiedLength
            })), [{
                    originalStart: 4,
                    originalLength: 0,
                    modifiedStart: 4,
                    modifiedLength: 1
                }]);
        });
    });
    test('diff output', async () => {
        await withTestNotebookDiffModel([
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
            ['y', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([4])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], [
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
            ['y', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            diffViewModel.items[0].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].checkIfOutputsModified(), false);
            assert.strictEqual(diffViewModel.items[1].type, 'modified');
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
    test('diff output fast check', async () => {
        await withTestNotebookDiffModel([
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
            ['y', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([4])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], [
            ['x', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([3])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
            ['y', 'javascript', CellKind.Code, [{ outputId: 'someOtherId', outputs: [{ mime: Mimes.text, data: VSBuffer.wrap(new Uint8Array([5])) }] }], { metadata: { collapsed: false }, executionOrder: 3 }],
        ], async (model, disposables, accessor) => {
            const diff = new LcsDiff(new CellSequence(model.original.notebook), new CellSequence(model.modified.notebook));
            diffResult = diff.ComputeDiff(false);
            diffViewModel = disposables.add(new NotebookDiffViewModel(model, notebookEditorWorkerService, configurationService, eventDispatcher, accessor.get(INotebookService), heightCalculator, undefined));
            await diffViewModel.computeDiff(token);
            assert.strictEqual(diffViewModel.items.length, 2);
            assert.strictEqual(diffViewModel.items[0].type, 'placeholder');
            diffViewModel.items[0].showHiddenCells();
            assert.strictEqual(diffViewModel.items[0].original.textModel.equal(diffViewModel.items[0].modified.textModel), true);
            assert.strictEqual(diffViewModel.items[1].original.textModel.equal(diffViewModel.items[1].modified.textModel), false);
            await verifyChangeEventIsNotFired(diffViewModel);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0csT0FBTyxFQUEwQixPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBc0IsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV0RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUdyRSxNQUFNLFlBQVk7SUFFakIsWUFBcUIsU0FBNkI7UUFBN0Is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Q0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMzUCxDQUFDLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM1AsQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUN6QyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sSUFBSSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLFFB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S0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRTVILE1BQU0sMkJBQTJCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFFaEMsTUFBTSx5QkFBeUIsQ0FBQztZQUMvQixDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQUU7WUFDRixDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUN6QyxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pGLFVBQVUsR0FBRztnQkFDWixPQUFPLEVBQUUsQ0FBQzt3QkFDVCxhQUFhLEVBQUUsQ0FBQzt3QkFDaEIsY0FBYyxFQUFFLENBQUM7d0JBQ2pCLGFBQWEsRUFBRSxDQUFDO3dCQUNoQixjQUFjLEVBQUUsQ0FBQztxQkFDakIsRUFBRTt3QkFDRixhQUFhLEVBQUUsQ0FBQzt3QkFDaEIsY0FBYyxFQUFFLENBQUM7d0JBQ2pCLGFBQWEsRUFBRSxDQUFDO3dCQUNoQixjQUFjLEVBQUUsQ0FBQztxQkFDakIsQ0FBQztnQkFDRixTQUFTLEVBQUUsS0FBSzthQUNoQixDQUFDO1lBRUYsYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQW1CLGdCQUFnQixDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNyTixJQUFJLFNBQXdELENBQUM7WUFDN0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFL0QsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFHdkcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQStDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUUzRixNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBK0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDOUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVwRyxNQUFNLDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBRWhDLE1BQU0seUJBQXlCLENBQUM7WUFDL0IsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNuRCxFQUFFO1lBQ0YsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDekMsVUFBVSxHQUFHO2dCQUNaLE9BQU8sRUFBRSxDQUFDO3dCQUNULGFBQWEsRUFBRSxDQUFDO3dCQUNoQixjQUFjLEVBQUUsQ0FBQzt3QkFDakIsYUFBYSxFQUFFLENBQUM7d0JBQ2hCLGNBQWMsRUFBRSxDQUFDO3FCQUNqQixDQUFDO2dCQUNGLFNBQVMsRUFBRSxLQUFLO2FBQ2hCLENBQUM7WUFFRixhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLEtBQUssRUFBRSwyQkFBMkIsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBbUIsZ0JBQWdCLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3JOLElBQUksU0FBUyxHQUFrRCxTQUFTLENBQUM7WUFDekUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFL0QsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENB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QUFDLEVBQUUsQ0FBQztZQUNoRyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzlMLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzFFLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDOUMsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUMxQyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQzNJLEVBQUU7WUFDRixDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDcEUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNoRyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMxRSxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzlMLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDOUMsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMzSSxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFF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QUUsQ0FBQyxFQUFFLENBQUM7WUFDbk0sQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNuTSxFQUFFO1lBQ0YsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNuTSxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDO1NBQ25NLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDL0csVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFckMsYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQW1CLGdCQUFnQixDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNyTixNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQy9ELGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBRSxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBK0MsQ0FBQyxRQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBRSxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBUyxDQUFDLFFBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvSyxNQUFNLENBQUMsV0FBVyxDQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFTLENBQUMsUUFBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQVMsQ0FBQyxRQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFMUksTUFBTSwyQkFBMkIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==