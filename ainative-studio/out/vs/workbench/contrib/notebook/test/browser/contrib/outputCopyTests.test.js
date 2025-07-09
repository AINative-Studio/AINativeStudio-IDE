/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mock } from '../../../../../../base/test/common/mock.js';
import assert from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { copyCellOutput } from '../../../browser/viewModel/cellOutputTextHelper.js';
suite('Cell Output Clipboard Tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class ClipboardService {
        constructor() {
            this._clipboardContent = '';
        }
        get clipboardContent() {
            return this._clipboardContent;
        }
        async writeText(value) {
            this._clipboardContent = value;
        }
    }
    const logService = new class extends mock() {
    };
    function createOutputViewModel(outputs, cellViewModel) {
        const outputViewModel = { model: { outputs: outputs } };
        if (cellViewModel) {
            cellViewModel.outputsViewModels.push(outputViewModel);
            cellViewModel.model.outputs.push(outputViewModel.model);
        }
        else {
            cellViewModel = {
                outputsViewModels: [outputViewModel],
                model: { outputs: [outputViewModel.model] }
            };
        }
        outputViewModel.cellViewModel = cellViewModel;
        return outputViewModel;
    }
    test('Copy text/plain output', async () => {
        const mimeType = 'text/plain';
        const clipboard = new ClipboardService();
        const outputDto = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const output = createOutputViewModel([outputDto]);
        await copyCellOutput(mimeType, output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'output content');
    });
    test('Nothing copied for invalid mimetype', async () => {
        const clipboard = new ClipboardService();
        const outputDtos = [
            { data: VSBuffer.fromString('output content'), mime: 'bad' },
            { data: VSBuffer.fromString('output 2'), mime: 'unknown' }
        ];
        const output = createOutputViewModel(outputDtos);
        await copyCellOutput('bad', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, '');
    });
    test('Text copied if available instead of invalid mime type', async () => {
        const clipboard = new ClipboardService();
        const outputDtos = [
            { data: VSBuffer.fromString('output content'), mime: 'bad' },
            { data: VSBuffer.fromString('text content'), mime: 'text/plain' }
        ];
        const output = createOutputViewModel(outputDtos);
        await copyCellOutput('bad', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'text content');
    });
    test('Selected mimetype is preferred', async () => {
        const clipboard = new ClipboardService();
        const outputDtos = [
            { data: VSBuffer.fromString('plain text'), mime: 'text/plain' },
            { data: VSBuffer.fromString('html content'), mime: 'text/html' }
        ];
        const output = createOutputViewModel(outputDtos);
        await copyCellOutput('text/html', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'html content');
    });
    test('copy subsequent output', async () => {
        const clipboard = new ClipboardService();
        const output = createOutputViewModel([{ data: VSBuffer.fromString('first'), mime: 'text/plain' }]);
        const output2 = createOutputViewModel([{ data: VSBuffer.fromString('second'), mime: 'text/plain' }], output.cellViewModel);
        const output3 = createOutputViewModel([{ data: VSBuffer.fromString('third'), mime: 'text/plain' }], output.cellViewModel);
        await copyCellOutput('text/plain', output2, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'second');
        await copyCellOutput('text/plain', output3, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'third');
    });
    test('adjacent stream outputs are concanented', async () => {
        const clipboard = new ClipboardService();
        const output = createOutputViewModel([{ data: VSBuffer.fromString('stdout'), mime: 'application/vnd.code.notebook.stdout' }]);
        createOutputViewModel([{ data: VSBuffer.fromString('stderr'), mime: 'application/vnd.code.notebook.stderr' }], output.cellViewModel);
        createOutputViewModel([{ data: VSBuffer.fromString('text content'), mime: 'text/plain' }], output.cellViewModel);
        createOutputViewModel([{ data: VSBuffer.fromString('non-adjacent'), mime: 'application/vnd.code.notebook.stdout' }], output.cellViewModel);
        await copyCellOutput('application/vnd.code.notebook.stdout', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'stdoutstderr');
    });
    test('error output uses the value in the stack', async () => {
        const clipboard = new ClipboardService();
        const data = VSBuffer.fromString(`{"name":"Error Name","message":"error message","stack":"error stack"}`);
        const output = createOutputViewModel([{ data, mime: 'application/vnd.code.notebook.error' }]);
        await copyCellOutput('application/vnd.code.notebook.error', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'error stack');
    });
    test('error without stack uses the name and message', async () => {
        const clipboard = new ClipboardService();
        const data = VSBuffer.fromString(`{"name":"Error Name","message":"error message"}`);
        const output = createOutputViewModel([{ data, mime: 'application/vnd.code.notebook.error' }]);
        await copyCellOutput('application/vnd.code.notebook.error', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'Error Name: error message');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q29weVRlc3RzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvb3V0cHV0Q29weVRlc3RzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBR2xFLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXBGLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLGdCQUFnQjtRQUF0QjtZQUNTLHNCQUFpQixHQUFHLEVBQUUsQ0FBQztRQU9oQyxDQUFDO1FBTkEsSUFBVyxnQkFBZ0I7WUFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDL0IsQ0FBQztRQUNNLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBYTtZQUNuQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLENBQUM7S0FDRDtJQUVELE1BQU0sVUFBVSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUksRUFBZTtLQUFJLENBQUM7SUFFN0QsU0FBUyxxQkFBcUIsQ0FBQyxPQUF5QixFQUFFLGFBQThCO1FBQ3ZGLE1BQU0sZUFBZSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUEwQixDQUFDO1FBRWhGLElB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