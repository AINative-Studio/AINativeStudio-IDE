/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellOutputContainer } from '../../browser/view/cellParts/cellOutput.js';
import { CellKind } from '../../common/notebookCommon.js';
import { setupInstantiationService, withTestNotebook } from './testNotebookEditor.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { INotebookService } from '../../common/notebookService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { Event } from '../../../../../base/common/event.js';
import { getAllOutputsText } from '../../browser/viewModel/cellOutputTextHelper.js';
suite('CellOutput', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let outputMenus = [];
    setup(() => {
        outputMenus = [];
        instantiationService = setupInstantiationService(store);
        instantiationService.stub(INotebookService, new class extends mock() {
            getOutputMimeTypeInfo(_textModel, _kernelProvides, output) {
                return [{
                        rendererId: 'plainTextRendererId',
                        mimeType: 'text/plain',
                        isTrusted: true
                    }, {
                        rendererId: 'htmlRendererId',
                        mimeType: 'text/html',
                        isTrusted: true
                    }, {
                        rendererId: 'errorRendererId',
                        mimeType: 'application/vnd.code.notebook.error',
                        isTrusted: true
                    }, {
                        rendererId: 'stderrRendererId',
                        mimeType: 'application/vnd.code.notebook.stderr',
                        isTrusted: true
                    }, {
                        rendererId: 'stdoutRendererId',
                        mimeType: 'application/vnd.code.notebook.stdout',
                        isTrusted: true
                    }]
                    .filter(info => output.outputs.some(output => output.mime === info.mimeType));
            }
            getRendererInfo() {
                return {
                    id: 'rendererId',
                    displayName: 'Stubbed Renderer',
                    extensionId: { _lower: 'id', value: 'id' },
                };
            }
        });
        instantiationService.stub(IMenuService, new class extends mock() {
            createMenu() {
                const menu = new class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() { return []; }
                    dispose() { outputMenus = outputMenus.filter(item => item !== menu); }
                };
                outputMenus.push(menu);
                return menu;
            }
        });
    });
    test('Render cell output items with multiple mime types', async function () {
        const outputItem = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const htmlOutputItem = { data: VSBuffer.fromString('output content'), mime: 'text/html' };
        const output1 = { outputId: 'abc', outputs: [outputItem, htmlOutputItem] };
        const output2 = { outputId: 'def', outputs: [outputItem, htmlOutputItem] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2], {}],
        ], (editor, viewModel, disposables, accessor) => {
            const cell = viewModel.viewCells[0];
            const cellTemplate = createCellTemplate(disposables);
            const output = disposables.add(accessor.createInstance(CellOutputContainer, editor, cell, cellTemplate, { limit: 100 }));
            output.render();
            cell.outputsViewModels[0].setVisible(true);
            assert.strictEqual(outputMenus.length, 1, 'should have 1 output menus');
            assert(cellTemplate.outputContainer.domNode.style.display !== 'none', 'output container should be visible');
            cell.outputsViewModels[1].setVisible(true);
            assert.strictEqual(outputMenus.length, 2, 'should have 2 output menus');
            cell.outputsViewModels[1].setVisible(true);
            assert.strictEqual(outputMenus.length, 2, 'should still have 2 output menus');
        }, instantiationService);
    });
    test('One of many cell outputs becomes hidden', async function () {
        const outputItem = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const htmlOutputItem = { data: VSBuffer.fromString('output content'), mime: 'text/html' };
        const output1 = { outputId: 'abc', outputs: [outputItem, htmlOutputItem] };
        const output2 = { outputId: 'def', outputs: [outputItem, htmlOutputItem] };
        const output3 = { outputId: 'ghi', outputs: [outputItem, htmlOutputItem] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2, output3], {}],
        ], (editor, viewModel, disposables, accessor) => {
            const cell = viewModel.viewCells[0];
            const cellTemplate = createCellTemplate(disposables);
            const output = disposables.add(accessor.createInstance(CellOutputContainer, editor, cell, cellTemplate, { limit: 100 }));
            output.render();
            cell.outputsViewModels[0].setVisible(true);
            cell.outputsViewModels[1].setVisible(true);
            cell.outputsViewModels[2].setVisible(true);
            cell.outputsViewModels[1].setVisible(false);
            assert(cellTemplate.outputContainer.domNode.style.display !== 'none', 'output container should be visible');
            assert.strictEqual(outputMenus.length, 2, 'should have 2 output menus');
        }, instantiationService);
    });
    test('get all adjacent stream outputs', async () => {
        const stdout = { data: VSBuffer.fromString('stdout'), mime: 'application/vnd.code.notebook.stdout' };
        const stderr = { data: VSBuffer.fromString('stderr'), mime: 'application/vnd.code.notebook.stderr' };
        const output1 = { outputId: 'abc', outputs: [stdout] };
        const output2 = { outputId: 'abc', outputs: [stderr] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2], {}],
        ], (_editor, viewModel) => {
            const cell = viewModel.viewCells[0];
            const notebook = viewModel.notebookDocument;
            const result = getAllOutputsText(notebook, cell);
            assert.strictEqual(result, 'stdoutstderr');
        }, instantiationService);
    });
    test('get all mixed outputs of cell', async () => {
        const stdout = { data: VSBuffer.fromString('stdout'), mime: 'application/vnd.code.notebook.stdout' };
        const stderr = { data: VSBuffer.fromString('stderr'), mime: 'application/vnd.code.notebook.stderr' };
        const plainText = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const error = { data: VSBuffer.fromString(`{"name":"Error Name","message":"error message","stack":"error stack"}`), mime: 'application/vnd.code.notebook.error' };
        const output1 = { outputId: 'abc', outputs: [stdout] };
        const output2 = { outputId: 'abc', outputs: [stderr] };
        const output3 = { outputId: 'abc', outputs: [plainText] };
        const output4 = { outputId: 'abc', outputs: [error] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2, output3, output4], {}],
        ], (_editor, viewModel) => {
            const cell = viewModel.viewCells[0];
            const notebook = viewModel.notebookDocument;
            const result = getAllOutputsText(notebook, cell);
            assert.strictEqual(result, 'Cell output 1 of 3\n' +
                'stdoutstderr\n' +
                'Cell output 2 of 3\n' +
                'output content\n' +
                'Cell output 3 of 3\n' +
                'error stack');
        }, instantiationService);
    });
});
function createCellTemplate(disposables) {
    return {
        outputContainer: new FastDomNode(document.createElement('div')),
        outputShowMoreContainer: new FastDomNode(document.createElement('div')),
        focusSinkElement: document.createElement('div'),
        templateDisposables: disposables,
        elementDisposables: disposables,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jZWxsT3V0cHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUdqRixPQUFPLEVBQUUsUUFBUSxFQUFxQyxNQUFNLGdDQUFnQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVwRixLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3hELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxXQUFXLEdBQVksRUFBRSxDQUFDO0lBRTlCLEtBQUss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