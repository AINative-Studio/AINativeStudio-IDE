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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9kaWZmL2VkaXRvckhlaWdodENhbGN1bGF0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUdwRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsSUFBSSx1QkFBdUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRW5ILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJGQUEyRixDQUFDO0FBR3JJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXRHLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsQ0FBQyx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUN6RSxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtZQUN0QixNQUFNLFFB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