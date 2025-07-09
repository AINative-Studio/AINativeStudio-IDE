/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { getElementToFocusAfterRemoved, getLastNodeFromSameType } from '../../browser/searchActionsRemoveReplace.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { MockObjectTree } from './mockSearchTree.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { createFileUriFromPathFromRoot, stubModelService, stubNotebookEditorService } from './searchTestCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
import { NotebookCompatibleFileMatch } from '../../browser/notebookSearch/notebookSearchModel.js';
import { MatchImpl } from '../../browser/searchTreeModel/match.js';
suite('Search Actions', () => {
    let instantiationService;
    let counter;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(IModelService, stubModelService(instantiationService, (e) => store.add(e)));
        instantiationService.stub(INotebookEditorService, stubNotebookEditorService(instantiationService, (e) => store.add(e)));
        instantiationService.stub(IKeybindingService, {});
        instantiationService.stub(ILabelService, { getUriBasenameLabel: (uri) => '' });
        instantiationService.stub(IKeybindingService, 'resolveKeybinding', (keybinding) => USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS));
        instantiationService.stub(IKeybindingService, 'lookupKeybinding', (id) => null);
        instantiationService.stub(IKeybindingService, 'lookupKeybinding', (id) => null);
        counter = 0;
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('get next element to focus after removing a match when it has next sibling file', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1), aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), aMatch(fileMatch2)];
        const tree = aTree(data);
        const target = data[2];
        const actual = await getElementToFocusAfterRemoved(tree, target, [target]);
        assert.strictEqual(data[4], actual);
    });
    test('get next element to focus after removing a match when it is the only match', async function () {
        const fileMatch1 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1)];
        const tree = aTree(data);
        const target = data[1];
        const actual = await getElementToFocusAfterRemoved(tree, target, [target]);
        assert.strictEqual(undefined, actual);
    });
    test('get next element to focus after removing a file match when it has next sibling', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const fileMatch3 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), fileMatch3, aMatch(fileMatch3)];
        const tree = aTree(data);
        const target = data[2];
        const actual = await getElementToFocusAfterRemoved(tree, target, []);
        assert.strictEqual(data[4], actual);
    });
    test('Find last FileMatch in Tree', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const fileMatch3 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), fileMatch3, aMatch(fileMatch3)];
        const tree = aTree(data);
        const actual = await getLastNodeFromSameType(tree, fileMatch1);
        assert.strictEqual(fileMatch3, actual);
    });
    test('Find last Match in Tree', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const fileMatch3 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), fileMatch3, aMatch(fileMatch3)];
        const tree = aTree(data);
        const actual = await getLastNodeFromSameType(tree, aMatch(fileMatch1));
        assert.strictEqual(data[5], actual);
    });
    test('get next element to focus after removing a file match when it is only match', async function () {
        const fileMatch1 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1)];
        const tree = aTree(data);
        const target = data[0];
        // const testObject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);
        const actual = await getElementToFocusAfterRemoved(tree, target, []);
        assert.strictEqual(undefined, actual);
    });
    function aFileMatch() {
        const uri = URI.file('somepath' + ++counter);
        const rawMatch = {
            resource: uri,
            results: []
        };
        const searchModel = instantiationService.createInstance(SearchModelImpl);
        store.add(searchModel);
        const folderMatch = instantiationService.createInstance(FolderMatchImpl, URI.file('somepath'), '', 0, {
            type: 2 /* QueryType.Text */, folderQueries: [{ folder: createFileUriFromPathFromRoot() }], contentPattern: {
                pattern: ''
            }
        }, searchModel.searchResult.plainTextSearchResult, searchModel.searchResult, null);
        store.add(folderMatch);
        const fileMatch = instantiationService.createInstance(NotebookCompatibleFileMatch, {
            pattern: ''
        }, undefined, undefined, folderMatch, rawMatch, null, '');
        fileMatch.createMatches();
        store.add(fileMatch);
        return fileMatch;
    }
    function aMatch(fileMatch) {
        const line = ++counter;
        const match = new MatchImpl(fileMatch, ['some match'], {
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: 0,
            endColumn: 2
        }, {
            startLineNumber: line,
            startColumn: 0,
            endLineNumber: line,
            endColumn: 2
        }, false);
        fileMatch.add(match);
        return match;
    }
    function aTree(elements) {
        return new MockObjectTree(elements);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2Jyb3dzZXIvc2VhcmNoQWN0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUVySCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNySCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNuSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxF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