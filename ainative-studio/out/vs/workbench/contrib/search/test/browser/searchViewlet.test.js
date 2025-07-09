/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { MockLabelService } from '../../../../services/label/test/common/mockLabelService.js';
import { OneLineRange } from '../../../../services/search/common/search.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { createFileUriFromPathFromRoot, getRootName, stubModelService, stubNotebookEditorService } from './searchTestCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FILE_MATCH_PREFIX, MATCH_PREFIX } from '../../browser/searchTreeModel/searchTreeCommon.js';
import { NotebookCompatibleFileMatch } from '../../browser/notebookSearch/notebookSearchModel.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
import { searchComparer, searchMatchComparer } from '../../browser/searchCompare.js';
import { MatchImpl } from '../../browser/searchTreeModel/match.js';
suite('Search - Viewlet', () => {
    let instantiation;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiation = new TestInstantiationService();
        instantiation.stub(ILanguageConfigurationService, TestLanguageConfigurationService);
        instantiation.stub(IModelService, stubModelService(instantiation, (e) => store.add(e)));
        instantiation.stub(INotebookEditorService, stubNotebookEditorService(instantiation, (e) => store.add(e)));
        instantiation.set(IWorkspaceContextService, new TestContextService(TestWorkspace));
        const fileService = new FileService(new NullLogService());
        store.add(fileService);
        const uriIdentityService = new UriIdentityService(fileService);
        store.add(uriIdentityService);
        instantiation.stub(IUriIdentityService, uriIdentityService);
        instantiation.stub(ILabelService, new MockLabelService());
        instantiation.stub(ILogService, new NullLogService());
    });
    teardown(() => {
        instantiation.dispose();
    });
    test('Data Source', function () {
        const result = aSearchResult();
        result.query = {
            type: 2 /* QueryType.Text */,
            contentPattern: { pattern: 'foo' },
            folderQueries: [{
                    folder: createFileUriFromPathFromRoot()
                }]
        };
        result.add([{
                resource: createFileUriFromPathFromRoot('/foo'),
                results: [{
                        previewText: 'bar',
                        rangeLocations: [
                            {
                                preview: {
                                    startLineNumber: 0,
                                    startColumn: 0,
                                    endLineNumber: 0,
                                    endColumn: 1
                                },
                                source: {
                                    startLineNumber: 1,
                                    startColumn: 0,
                                    endLineNumber: 1,
                                    endColumn: 1
                                }
                            }
                        ]
                    }]
            }], '', false);
        const fileMatch = result.matches()[0];
        const lineMatch = fileMatch.matches()[0];
        assert.strictEqual(fileMatch.id(), FILE_MATCH_PREFIX + URI.file(`${getRootName()}/foo`).toString());
        assert.strictEqual(lineMatch.id(), `${MATCH_PREFIX}${URI.file(`${getRootName()}/foo`).toString()}>[2,1 -> 2,2]b`);
    });
    test('Comparer', () => {
        const fileMatch1 = aFileMatch('/foo');
        const fileMatch2 = aFileMatch('/with/path');
        const fileMatch3 = aFileMatch('/with/path/foo');
        const lineMatch1 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(0, 1, 1), false);
        const lineMatch2 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        const lineMatch3 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        assert(searchMatchComparer(fileMatch1, fileMatch2) < 0);
        assert(searchMatchComparer(fileMatch2, fileMatch1) > 0);
        assert(searchMatchComparer(fileMatch1, fileMatch1) === 0);
        assert(searchMatchComparer(fileMatch2, fileMatch3) < 0);
        assert(searchMatchComparer(lineMatch1, lineMatch2) < 0);
        assert(searchMatchComparer(lineMatch2, lineMatch1) > 0);
        assert(searchMatchComparer(lineMatch2, lineMatch3) === 0);
    });
    test('Advanced Comparer', () => {
        const fileMatch1 = aFileMatch('/with/path/foo10');
        const fileMatch2 = aFileMatch('/with/path2/foo1');
        const fileMatch3 = aFileMatch('/with/path/bar.a');
        const fileMatch4 = aFileMatch('/with/path/bar.b');
        // By default, path < path2
        assert(searchMatchComparer(fileMatch1, fileMatch2) < 0);
        // By filenames, foo10 > foo1
        assert(searchMatchComparer(fileMatch1, fileMatch2, "fileNames" /* SearchSortOrder.FileNames */) > 0);
        // By type, bar.a < bar.b
        assert(searchMatchComparer(fileMatch3, fileMatch4, "type" /* SearchSortOrder.Type */) < 0);
    });
    test('Cross-type Comparer', () => {
        const searchResult = aSearchResult();
        const folderMatch1 = aFolderMatch('/voo', 0, searchResult.plainTextSearchResult);
        const folderMatch2 = aFolderMatch('/with', 1, searchResult.plainTextSearchResult);
        const fileMatch1 = aFileMatch('/voo/foo.a', folderMatch1);
        const fileMatch2 = aFileMatch('/with/path.c', folderMatch2);
        const fileMatch3 = aFileMatch('/with/path/bar.b', folderMatch2);
        const lineMatch1 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(0, 1, 1), false);
        const lineMatch2 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        const lineMatch3 = new MatchImpl(fileMatch2, ['barfoo'], new OneLineRange(0, 1, 1), new OneLineRange(0, 1, 1), false);
        const lineMatch4 = new MatchImpl(fileMatch2, ['fooooo'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        const lineMatch5 = new MatchImpl(fileMatch3, ['foobar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        /***
         * Structure would take the following form:
         *
         *	folderMatch1 (voo)
         *		> fileMatch1 (/foo.a)
         *			>> lineMatch1
         *			>> lineMatch2
         *	folderMatch2 (with)
         *		> fileMatch2 (/path.c)
         *			>> lineMatch4
         *			>> lineMatch5
         *		> fileMatch3 (/path/bar.b)
         *			>> lineMatch3
         *
         */
        // for these, refer to diagram above
        assert(searchComparer(fileMatch1, fileMatch3) < 0);
        assert(searchComparer(fileMatch2, fileMatch3) < 0);
        assert(searchComparer(folderMatch2, fileMatch2) < 0);
        assert(searchComparer(lineMatch4, lineMatch5) < 0);
        assert(searchComparer(lineMatch1, lineMatch3) < 0);
        assert(searchComparer(lineMatch2, folderMatch2) < 0);
        // travel up hierarchy and order of folders take precedence. "voo < with" in indices
        assert(searchComparer(fileMatch1, fileMatch3, "fileNames" /* SearchSortOrder.FileNames */) < 0);
        // bar.b < path.c
        assert(searchComparer(fileMatch3, fileMatch2, "fileNames" /* SearchSortOrder.FileNames */) < 0);
        // lineMatch4's parent is fileMatch2, "bar.b < path.c"
        assert(searchComparer(fileMatch3, lineMatch4, "fileNames" /* SearchSortOrder.FileNames */) < 0);
        // bar.b < path.c
        assert(searchComparer(fileMatch3, fileMatch2, "type" /* SearchSortOrder.Type */) < 0);
        // lineMatch4's parent is fileMatch2, "bar.b < path.c"
        assert(searchComparer(fileMatch3, lineMatch4, "type" /* SearchSortOrder.Type */) < 0);
    });
    function aFileMatch(path, parentFolder, ...lineMatches) {
        const rawMatch = {
            resource: URI.file('/' + path),
            results: lineMatches
        };
        const fileMatch = instantiation.createInstance(NotebookCompatibleFileMatch, {
            pattern: ''
        }, undefined, undefined, parentFolder ?? aFolderMatch('', 0), rawMatch, null, '');
        fileMatch.createMatches();
        store.add(fileMatch);
        return fileMatch;
    }
    function aFolderMatch(path, index, parent) {
        const searchModel = instantiation.createInstance(SearchModelImpl);
        store.add(searchModel);
        const folderMatch = instantiation.createInstance(FolderMatchImpl, createFileUriFromPathFromRoot(path), path, index, {
            type: 2 /* QueryType.Text */, folderQueries: [{ folder: createFileUriFromPathFromRoot() }], contentPattern: {
                pattern: ''
            }
        }, (parent ?? aSearchResult().folderMatches()[0]), searchModel.searchResult, null);
        store.add(folderMatch);
        return folderMatch;
    }
    function aSearchResult() {
        const searchModel = instantiation.createInstance(SearchModelImpl);
        store.add(searchModel);
        searchModel.searchResult.query = {
            type: 2 /* QueryType.Text */, folderQueries: [{ folder: createFileUriFromPathFromRoot() }], contentPattern: {
                pattern: ''
            }
        };
        return searchModel.searchResult;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlld2xldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2Jyb3dzZXIvc2VhcmNoVmlld2xldC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDeEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQy9ILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzlGLE9BQU8sRUFBZ0MsWUFBWSxFQUE4QixNQUFNLDhDQUE4QyxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNoSSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQTZELGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9KLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRWxHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRW5FLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsSUFBSSxhQUF1QyxDQUFDO0lBQzVDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGFBQWEsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDL0MsYUFBYSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3BGLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsYUFBYSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMxRCxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvRCxLQUFLLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDOUIsYUFBYSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzVELGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQzFELGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLE1BQU0sTUFBTSxHQUFrQixhQUFhLEVBQUUsQ0FBQztRQUM5QyxNQUFNLENBQUMsS0FBSyxHQUFHO1lBQ2QsSUFBSSx3QkFBZ0I7WUFDcEIsY0FBYyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtZQUNsQyxhQUFhLEVBQUUsQ0FBQztvQkFDZixNQUFNLEVBQUUsNkJBQTZCLEVBQUU7aUJBQ3ZDLENBQUM7U0FDRixDQUFDO1FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNYLFFBQVEsRUFBRSw2QkFBNkIsQ0FBQyxNQUFNLENBQUM7Z0JBQy9DLE9BQU8sRUFBRSxDQUFDO3dCQUVULFdBQVcsRUFBRSxLQUFLO3dCQUNsQixjQUFjLEVBQUU7NEJBQ2Y7Z0NBQ0MsT0FBTyxFQUFFO29DQUNSLGVBQWUsRUFBRSxDQUFDO29DQUNsQixXQUFXLEVBQUUsQ0FBQztvQ0FDZCxhQUFhLEVBQUUsQ0FBQztvQ0FDaEIsU0FBUyxFQUFFLENBQUM7aUNBQ1o7Z0NBQ0QsTUFBTSxFQUFFO29DQUNQLGVBQWUsRUFBRSxDQUFDO29DQUNsQixXQUFXLEVBQUUsQ0FBQztvQ0FDZCxhQUFhLEVBQUUsQ0FBQztvQ0FDaEIsU0FBUyxFQUFFLENBQUM7aUNBQ1o7NkJBQ0Q7eUJBQ0Q7cUJBQ0QsQ0FBQzthQUNGLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFZixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNwRyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ25ILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1QyxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkgsTUFBTSxVQUFVLEdBQUcsSUFBSSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ILE1BQU0sVUFBVSxHQUFHLElBQUksU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVuSCxNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXhELE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNsRCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNsRCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNsRCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVsRCwyQkFBMkI7UUFDM0IsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4RCw2QkFBNkI7UUFDN0IsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLDhDQUE0QixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25GLHlCQUF5QjtRQUN6QixNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsb0NBQXVCLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBRWhDLE1BQU0sWUFBWSxHQUFHLGFBQWEsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRWxGLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDMUQsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM1RCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFaEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ILE1BQU0sVUFBVSxHQUFHLElBQUksU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVuSCxNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEgsTUFBTSxVQUFVLEdBQUcsSUFBSSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxD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