/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../editor/common/core/range.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { CellKind } from '../../../notebook/common/notebookCommon.js';
import { contentMatchesToTextSearchMatches, webviewMatchesToTextSearchMatches } from '../../browser/notebookSearch/searchNotebookHelpers.js';
import { CellFindMatchModel } from '../../../notebook/browser/contrib/find/findModel.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { createFileUriFromPathFromRoot, stubModelService, stubNotebookEditorService } from './searchTestCommon.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellMatch, NotebookCompatibleFileMatch, textSearchMatchesToNotebookMatches } from '../../browser/notebookSearch/notebookSearchModel.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
suite('searchNotebookHelpers', () => {
    let instantiationService;
    let mdCellFindMatch;
    let codeCellFindMatch;
    let mdInputCell;
    let codeCell;
    let markdownContentResults;
    let codeContentResults;
    let codeWebviewResults;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let counter = 0;
    setup(() => {
        instantiationService = new TestInstantiationService();
        store.add(instantiationService);
        const modelService = stubModelService(instantiationService, (e) => store.add(e));
        const notebookEditorService = stubNotebookEditorService(instantiationService, (e) => store.add(e));
        instantiationService.stub(IModelService, modelService);
        instantiationService.stub(INotebookEditorService, notebookEditorService);
        mdInputCell = {
            id: 'mdCell',
            cellKind: CellKind.Markup, textBuffer: {
                getLineContent(lineNumber) {
                    if (lineNumber === 1) {
                        return '# Hello World Test';
                    }
                    else {
                        return '';
                    }
                }
            }
        };
        const findMatchMds = [new FindMatch(new Range(1, 15, 1, 19), ['Test'])];
        codeCell = {
            id: 'codeCell',
            cellKind: CellKind.Code, textBuffer: {
                getLineContent(lineNumber) {
                    if (lineNumber === 1) {
                        return 'print("test! testing!!")';
                    }
                    else if (lineNumber === 2) {
                        return 'print("this is a Test")';
                    }
                    else {
                        return '';
                    }
                }
            }
        };
        const findMatchCodeCells = [new FindMatch(new Range(1, 8, 1, 12), ['test']),
            new FindMatch(new Range(1, 14, 1, 18), ['test']),
            new FindMatch(new Range(2, 18, 2, 22), ['Test'])
        ];
        const webviewMatches = [{
                index: 0,
                searchPreviewInfo: {
                    line: 'test! testing!!',
                    range: {
                        start: 1,
                        end: 5
                    }
                }
            },
            {
                index: 1,
                searchPreviewInfo: {
                    line: 'test! testing!!',
                    range: {
                        start: 7,
                        end: 11
                    }
                }
            },
            {
                index: 3,
                searchPreviewInfo: {
                    line: 'this is a Test',
                    range: {
                        start: 11,
                        end: 15
                    }
                }
            }
        ];
        mdCellFindMatch = new CellFindMatchModel(mdInputCell, 0, findMatchMds, []);
        codeCellFindMatch = new CellFindMatchModel(codeCell, 5, findMatchCodeCells, webviewMatches);
    });
    teardown(() => {
        instantiationService.dispose();
    });
    suite('notebookEditorMatchesToTextSearchResults', () => {
        function assertRangesEqual(actual, expected) {
            if (!Array.isArray(actual)) {
                actual = [actual];
            }
            assert.strictEqual(actual.length, expected.length);
            actual.forEach((r, i) => {
                const expectedRange = expected[i];
                assert.deepStrictEqual({ startLineNumber: r.startLineNumber, startColumn: r.startColumn, endLineNumber: r.endLineNumber, endColumn: r.endColumn }, { startLineNumber: expectedRange.startLineNumber, startColumn: expectedRange.startColumn, endLineNumber: expectedRange.endLineNumber, endColumn: expectedRange.endColumn });
            });
        }
        test('convert CellFindMatchModel to ITextSearchMatch and check results', () => {
            markdownContentResults = contentMatchesToTextSearchMatches(mdCellFindMatch.contentMatches, mdInputCell);
            codeContentResults = contentMatchesToTextSearchMatches(codeCellFindMatch.contentMatches, codeCell);
            codeWebviewResults = webviewMatchesToTextSearchMatches(codeCellFindMatch.webviewMatches);
            assert.strictEqual(markdownContentResults.length, 1);
            assert.strictEqual(markdownContentResults[0].previewText, '# Hello World Test\n');
            assertRangesEqual(markdownContentResults[0].rangeLocations.map(e => e.preview), [new Range(0, 14, 0, 18)]);
            assertRangesEqual(markdownContentResults[0].rangeLocations.map(e => e.source), [new Range(0, 14, 0, 18)]);
            assert.strictEqual(codeContentResults.length, 2);
            assert.strictEqual(codeContentResults[0].previewText, 'print("test! testing!!")\n');
            assert.strictEqual(codeContentResults[1].previewText, 'print("this is a Test")\n');
            assertRangesEqual(codeContentResults[0].rangeLocations.map(e => e.preview), [new Range(0, 7, 0, 11), new Range(0, 13, 0, 17)]);
            assertRangesEqual(codeContentResults[0].rangeLocations.map(e => e.source), [new Range(0, 7, 0, 11), new Range(0, 13, 0, 17)]);
            assert.strictEqual(codeWebviewResults.length, 3);
            assert.strictEqual(codeWebviewResults[0].previewText, 'test! testing!!');
            assert.strictEqual(codeWebviewResults[1].previewText, 'test! testing!!');
            assert.strictEqual(codeWebviewResults[2].previewText, 'this is a Test');
            assertRangesEqual(codeWebviewResults[0].rangeLocations.map(e => e.preview), [new Range(0, 1, 0, 5)]);
            assertRangesEqual(codeWebviewResults[1].rangeLocations.map(e => e.preview), [new Range(0, 7, 0, 11)]);
            assertRangesEqual(codeWebviewResults[2].rangeLocations.map(e => e.preview), [new Range(0, 11, 0, 15)]);
            assertRangesEqual(codeWebviewResults[0].rangeLocations.map(e => e.source), [new Range(0, 1, 0, 5)]);
            assertRangesEqual(codeWebviewResults[1].rangeLocations.map(e => e.source), [new Range(0, 7, 0, 11)]);
            assertRangesEqual(codeWebviewResults[2].rangeLocations.map(e => e.source), [new Range(0, 11, 0, 15)]);
        });
        test('convert ITextSearchMatch to MatchInNotebook', () => {
            const mdCellMatch = new CellMatch(aFileMatch(), mdInputCell, 0);
            const markdownCellContentMatchObjs = textSearchMatchesToNotebookMatches(markdownContentResults, mdCellMatch);
            const codeCellMatch = new CellMatch(aFileMatch(), codeCell, 0);
            const codeCellContentMatchObjs = textSearchMatchesToNotebookMatches(codeContentResults, codeCellMatch);
            const codeWebviewContentMatchObjs = textSearchMatchesToNotebookMatches(codeWebviewResults, codeCellMatch);
            assert.strictEqual(markdownCellContentMatchObjs[0].cell?.id, mdCellMatch.id);
            assertRangesEqual(markdownCellContentMatchObjs[0].range(), [new Range(1, 15, 1, 19)]);
            assert.strictEqual(codeCellContentMatchObjs[0].cell?.id, codeCellMatch.id);
            assert.strictEqual(codeCellContentMatchObjs[1].cell?.id, codeCellMatch.id);
            assertRangesEqual(codeCellContentMatchObjs[0].range(), [new Range(1, 8, 1, 12)]);
            assertRangesEqual(codeCellContentMatchObjs[1].range(), [new Range(1, 14, 1, 18)]);
            assertRangesEqual(codeCellContentMatchObjs[2].range(), [new Range(2, 18, 2, 22)]);
            assert.strictEqual(codeWebviewContentMatchObjs[0].cell?.id, codeCellMatch.id);
            assert.strictEqual(codeWebviewContentMatchObjs[1].cell?.id, codeCellMatch.id);
            assert.strictEqual(codeWebviewContentMatchObjs[2].cell?.id, codeCellMatch.id);
            assertRangesEqual(codeWebviewContentMatchObjs[0].range(), [new Range(1, 2, 1, 6)]);
            assertRangesEqual(codeWebviewContentMatchObjs[1].range(), [new Range(1, 8, 1, 12)]);
            assertRangesEqual(codeWebviewContentMatchObjs[2].range(), [new Range(1, 12, 1, 16)]);
        });
        function aFileMatch() {
            const rawMatch = {
                resource: URI.file('somepath' + ++counter),
                results: []
            };
            const searchModel = instantiationService.createInstance(SearchModelImpl);
            store.add(searchModel);
            const folderMatch = instantiationService.createInstance(FolderMatchImpl, URI.file('somepath'), '', 0, {
                type: 2 /* QueryType.Text */, folderQueries: [{ folder: createFileUriFromPathFromRoot() }], contentPattern: {
                    pattern: ''
                }
            }, searchModel.searchResult.plainTextSearchResult, searchModel.searchResult, null);
            const fileMatch = instantiationService.createInstance(NotebookCompatibleFileMatch, {
                pattern: ''
            }, undefined, undefined, folderMatch, rawMatch, null, '');
            fileMatch.createMatches();
            store.add(folderMatch);
            store.add(fileMatch);
            return fileMatch;
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9zZWFyY2hOb3RlYm9va0hlbHBlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQXVCLE1BQU0sdUNBQXVDLENBQUM7QUFHdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbkgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsMkJBQTJCLEVBQUUsa0NBQWtDLEVBQUUs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