/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { DiffEditorHeightCalculatorService } from '../../../browser/diff/editorHeightCalculator.js';
import { URI } from '../../../../../../base/common/uri.js';
import { createTextModel as createTextModelWithText } from '../../../../../../editor/test/common/testTextModel.js';
import { DefaultLinesDiffComputer } from '../../../../../../editor/common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer.js';
import { getEditorPadding } from '../../../browser/diff/diffCellEditorOptions.js';
import { HeightOfHiddenLinesRegionInDiffEditor } from '../../../browser/diff/diffElementViewModel.js';
suite('NotebookDiff EditorHeightCalculator', () => {
    ['Hide Unchanged Regions', 'Show Unchanged Regions'].forEach(suiteTitle => {
        suite(suiteTitle, () => {
            const fontInfo = { lineHeight: 18, fontSize: 18 };
            let disposables;
            let textModelResolver;
            let editorWorkerService;
            const original = URI.parse('original');
            const modified = URI.parse('modified');
            let originalModel;
            let modifiedModel;
            const diffComputer = new DefaultLinesDiffComputer();
            let calculator;
            const hideUnchangedRegions = suiteTitle.startsWith('Hide');
            const configurationService = new TestConfigurationService({
                notebook: { diff: { ignoreMetadata: true } }, diffEditor: {
                    hideUnchangedRegions: {
                        enabled: hideUnchangedRegions, minimumLineCount: 3, contextLineCount: 3
                    }
                }
            });
            function createTextModel(lines) {
                return createTextModelWithText(lines.join('\n'));
            }
            teardown(() => disposables.dispose());
            ensureNoDisposablesAreLeakedInTestSuite();
            setup(() => {
                disposables = new DisposableStore();
                textModelResolver = new class extends mock() {
                    async createModelReference(resource) {
                        return {
                            dispose: () => { },
                            object: {
                                textEditorModel: resource === original ? originalModel : modifiedModel,
                                getLanguageId: () => 'javascript',
                            }
                        };
                    }
                };
                editorWorkerService = new class extends mock() {
                    async computeDiff(_original, _modified, options, _algorithm) {
                        const originalLines = new Array(originalModel.getLineCount()).fill(0).map((_, i) => originalModel.getLineContent(i + 1));
                        const modifiedLines = new Array(modifiedModel.getLineCount()).fill(0).map((_, i) => modifiedModel.getLineContent(i + 1));
                        const result = diffComputer.computeDiff(originalLines, modifiedLines, options);
                        const identical = originalLines.join('') === modifiedLines.join('');
                        return {
                            identical,
                            quitEarly: result.hitTimeout,
                            changes: result.changes,
                            moves: result.moves,
                        };
                    }
                };
                calculator = new DiffEditorHeightCalculatorService(fontInfo.lineHeight, textModelResolver, editorWorkerService, configurationService);
            });
            test('1 original line with change in same line', async () => {
                originalModel = disposables.add(createTextModel(['Hello World']));
                modifiedModel = disposables.add(createTextModel(['Foo Bar']));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(1, 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('1 original line with insertion of a new line', async () => {
                originalModel = disposables.add(createTextModel(['Hello World']));
                modifiedModel = disposables.add(createTextModel(['Hello World', 'Foo Bar']));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(2, 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('1 line with update to a line and insert of a new line', async () => {
                originalModel = disposables.add(createTextModel(['Hello World']));
                modifiedModel = disposables.add(createTextModel(['Foo Bar', 'Bar Baz']));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(2, 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('10 line with update to a line and insert of a new line', async () => {
                originalModel = disposables.add(createTextModel(createLines(10)));
                modifiedModel = disposables.add(createTextModel(createLines(10).concat('Foo Bar')));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(hideUnchangedRegions ? 4 : 11, hideUnchangedRegions ? 1 : 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('50 lines with updates, deletions and inserts', async () => {
                originalModel = disposables.add(createTextModel(createLines(60)));
                const modifiedLines = createLines(60);
                modifiedLines[3] = 'Foo Bar';
                modifiedLines.splice(7, 3);
                modifiedLines.splice(10, 0, 'Foo Bar1', 'Foo Bar2', 'Foo Bar3');
                modifiedLines.splice(30, 0, '', '');
                modifiedLines.splice(40, 4);
                modifiedLines.splice(50, 0, '1', '2', '3', '4', '5');
                modifiedModel = disposables.add(createTextModel(modifiedLines));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(hideUnchangedRegions ? 50 : 70, hideUnchangedRegions ? 3 : 0);
                assert.strictEqual(height, expectedHeight);
            });
            function getExpectedHeight(visibleLineCount, unchangeRegionsHeight) {
                return (visibleLineCount * fontInfo.lineHeight) + getEditorPadding(visibleLineCount).top + getEditorPadding(visibleLineCount).bottom + (unchangeRegionsHeight * HeightOfHiddenLinesRegionInDiffEditor);
            }
            function createLines(count, linePrefix = 'Hello World') {
                return new Array(count).fill(0).map((_, i) => `${linePrefix} ${i}`);
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvZGlmZi9lZGl0b3JIZWlnaHRDYWxjdWxhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQWMsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFHcEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLElBQUksdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVuSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyRkFBMkYsQ0FBQztBQUdySSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV0RyxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELENBQUMsd0JBQXdCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDekUsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7WUFDdEIsTUFB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