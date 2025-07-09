/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { URI } from '../../../../../base/common/uri.js';
import { TextSearchMatch, OneLineRange } from '../../../../services/search/common/search.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IReplaceService } from '../../browser/replace.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { MockLabelService } from '../../../../services/label/test/common/mockLabelService.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { TestEditorGroupsService, TestEditorService } from '../../../../test/browser/workbenchTestServices.js';
import { NotebookEditorWidgetService } from '../../../notebook/browser/services/notebookEditorServiceImpl.js';
import { CellKind } from '../../../notebook/common/notebookCommon.js';
import { addToSearchResult, createFileUriFromPathFromRoot, getRootName } from './searchTestCommon.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellMatch, NotebookCompatibleFileMatch } from '../../browser/notebookSearch/notebookSearchModel.js';
import { MATCH_PREFIX } from '../../browser/searchTreeModel/searchTreeCommon.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
import { SearchResultImpl } from '../../browser/searchTreeModel/searchResult.js';
import { MatchImpl } from '../../browser/searchTreeModel/match.js';
const lineOneRange = new OneLineRange(1, 0, 1);
suite('SearchResult', () => {
    let instantiationService;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IModelService, stubModelService(instantiationService));
        instantiationService.stub(INotebookEditorService, stubNotebookEditorService(instantiationService));
        const fileService = new FileService(new NullLogService());
        store.add(fileService);
        const uriIdentityService = new UriIdentityService(fileService);
        store.add(uriIdentityService);
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        instantiationService.stubPromise(IReplaceService, {});
        instantiationService.stub(IReplaceService, 'replace', () => Promise.resolve(null));
        instantiationService.stub(ILabelService, new MockLabelService());
        instantiationService.stub(ILogService, new NullLogService());
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('Line Match', function () {
        const fileMatch = aFileMatch('folder/file.txt', null);
        const lineMatch = new MatchImpl(fileMatch, ['0 foo bar'], new OneLineRange(0, 2, 5), new OneLineRange(1, 0, 5), false);
        assert.strictEqual(lineMatch.text(), '0 foo bar');
        assert.strictEqual(lineMatch.range().startLineNumber, 2);
        assert.strictEqual(lineMatch.range().endLineNumber, 2);
        assert.strictEqual(lineMatch.range().startColumn, 1);
        assert.strictEqual(lineMatch.range().endColumn, 6);
        assert.strictEqual(lineMatch.id(), MATCH_PREFIX + 'file:///folder/file.txt>[2,1 -> 2,6]foo');
        assert.strictEqual(lineMatch.fullMatchText(), 'foo');
        assert.strictEqual(lineMatch.fullMatchText(true), '0 foo bar');
    });
    test('Line Match - Remove', function () {
        const fileMatch = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo bar', new OneLineRange(1, 0, 3)));
        const lineMatch = fileMatch.matches()[0];
        fileMatch.remove(lineMatch);
        assert.strictEqual(fileMatch.matches().length, 0);
    });
    test('File Match', function () {
        let fileMatch = aFileMatch('folder/file.txt', aSearchResult());
        assert.strictEqual(fileMatch.matches().length, 0);
        assert.strictEqual(fileMatch.resource.toString(), 'file:///folder/file.txt');
        assert.strictEqual(fileMatch.name(), 'file.txt');
        fileMatch = aFileMatch('file.txt', aSearchResult());
        assert.strictEqual(fileMatch.matches().length, 0);
        assert.strictEqual(fileMatch.resource.toString(), 'file:///file.txt');
        assert.strictEqual(fileMatch.name(), 'file.txt');
    });
    test('File Match: Select an existing match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(testObject.matches()[0]);
        assert.strictEqual(testObject.matches()[0], testObject.getSelectedMatch());
    });
    test('File Match: Select non existing match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        const target = testObject.matches()[0];
        testObject.remove(target);
        testObject.setSelectedMatch(target);
        assert.strictEqual(testObject.getSelectedMatch(), null);
    });
    test('File Match: isSelected return true for selected match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        const target = testObject.matches()[0];
        testObject.setSelectedMatch(target);
        assert.ok(testObject.isMatchSelected(target));
    });
    test('File Match: isSelected return false for un-selected match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(testObject.matches()[0]);
        assert.ok(!testObject.isMatchSelected(testObject.matches()[1]));
    });
    test('File Match: unselect', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(testObject.matches()[0]);
        testObject.setSelectedMatch(null);
        assert.strictEqual(null, testObject.getSelectedMatch());
    });
    test('File Match: unselect when not selected', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(null);
        assert.strictEqual(null, testObject.getSelectedMatch());
    });
    test('Match -> FileMatch -> SearchResult hierarchy exists', function () {
        const searchModel = instantiationService.createInstance(SearchModelImpl);
        store.add(searchModel);
        const searchResult = instantiationService.createInstance(SearchResultImpl, searchModel);
        store.add(searchResult);
        const fileMatch = aFileMatch('far/boo', searchResult);
        const lineMatch = new MatchImpl(fileMatch, ['foo bar'], new OneLineRange(0, 0, 3), new OneLineRange(1, 0, 3), false);
        assert(lineMatch.parent() === fileMatch);
        assert(fileMatch.parent() === searchResult.folderMatches()[0]);
    });
    test('Adding a raw match will add a file match with line matches', function () {
        const testObject = aSearchResult();
        const target = [aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)), new TextSearchMatch('preview 2', lineOneRange))];
        addToSearchResult(testObject, target);
        assert.strictEqual(3, testObject.count());
        const actual = testObject.matches();
        assert.strictEqual(1, actual.length);
        assert.strictEqual(URI.file(`${getRootName()}/1`).toString(), actual[0].resource.toString());
        const actuaMatches = actual[0].matches();
        assert.strictEqual(3, actuaMatches.length);
        assert.strictEqual('preview 1', actuaMatches[0].text());
        assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
        assert.strictEqual('preview 1', actuaMatches[1].text());
        assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));
        assert.strictEqual('preview 2', actuaMatches[2].text());
        assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[2].range()));
    });
    test('Adding multiple raw matches', function () {
        const testObject = aSearchResult();
        const target = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange))
        ];
        addToSearchResult(testObject, target);
        assert.strictEqual(3, testObject.count());
        const actual = testObject.matches();
        assert.strictEqual(2, actual.length);
        assert.strictEqual(URI.file(`${getRootName()}/1`).toString(), actual[0].resource.toString());
        let actuaMatches = actual[0].matches();
        assert.strictEqual(2, actuaMatches.length);
        assert.strictEqual('preview 1', actuaMatches[0].text());
        assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
        assert.strictEqual('preview 1', actuaMatches[1].text());
        assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));
        actuaMatches = actual[1].matches();
        assert.strictEqual(1, actuaMatches.length);
        assert.strictEqual('preview 2', actuaMatches[0].text());
        assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[0].range()));
    });
    test('Test that notebook matches get added correctly', function () {
        const testObject = aSearchResult();
        const cell1 = { cellKind: CellKind.Code };
        const cell2 = { cellKind: CellKind.Code };
        sinon.stub(CellMatch.prototype, 'addContext');
        const addFileMatch = sinon.spy(FolderMatchImpl.prototype, "addFileMatch");
        const fileMatch1 = aRawFileMatchWithCells('/1', {
            cell: cell1,
            index: 0,
            contentResults: [
                new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
            ],
            webviewResults: [
                new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)),
                new TextSearchMatch('preview 2', lineOneRange)
            ]
        });
        const fileMatch2 = aRawFileMatchWithCells('/2', {
            cell: cell2,
            index: 0,
            contentResults: [
                new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
            ],
            webviewResults: [
                new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)),
                new TextSearchMatch('preview 2', lineOneRange)
            ]
        });
        const target = [fileMatch1, fileMatch2];
        addToSearchResult(testObject, target);
        assert.strictEqual(6, testObject.count());
        assert.deepStrictEqual(fileMatch1.cellResults[0].contentResults, addFileMatch.getCall(0).args[0][0].cellResults[0].contentResults);
        assert.deepStrictEqual(fileMatch1.cellResults[0].webviewResults, addFileMatch.getCall(0).args[0][0].cellResults[0].webviewResults);
        assert.deepStrictEqual(fileMatch2.cellResults[0].contentResults, addFileMatch.getCall(0).args[0][1].cellResults[0].contentResults);
        assert.deepStrictEqual(fileMatch2.cellResults[0].webviewResults, addFileMatch.getCall(0).args[0][1].cellResults[0].webviewResults);
    });
    test('Dispose disposes matches', function () {
        const target1 = sinon.spy();
        const target2 = sinon.spy();
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange)),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange))
        ]);
        store.add(testObject.matches()[0].onDispose(target1));
        store.add(testObject.matches()[1].onDispose(target2));
        testObject.dispose();
        assert.ok(testObject.isEmpty());
        assert.ok(target1.calledOnce);
        assert.ok(target2.calledOnce);
    });
    test('remove triggers change event', function () {
        const target = sinon.spy();
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))
        ]);
        const objectToRemove = testObject.matches()[0];
        store.add(testObject.onChange(target));
        testObject.remove(objectToRemove);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: [objectToRemove], removed: true }], target.args[0]);
    });
    test('remove array triggers change event', function () {
        const target = sinon.spy();
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange)),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange))
        ]);
        const arrayToRemove = testObject.matches();
        store.add(testObject.onChange(target));
        testObject.remove(arrayToRemove);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: arrayToRemove, removed: true }], target.args[0]);
    });
    test('Removing all line matches and adding back will add file back to result', function () {
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))
        ]);
        const target = testObject.matches()[0];
        const matchToRemove = target.matches()[0];
        target.remove(matchToRemove);
        assert.ok(testObject.isEmpty());
        target.add(matchToRemove, true);
        assert.strictEqual(1, testObject.fileCount());
        assert.strictEqual(target, testObject.matches()[0]);
    });
    test('replace should remove the file match', function () {
        const voidPromise = Promise.resolve(null);
        instantiationService.stub(IReplaceService, 'replace', voidPromise);
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))
        ]);
        testObject.replace(testObject.matches()[0]);
        return voidPromise.then(() => assert.ok(testObject.isEmpty()));
    });
    test('replace should trigger the change event', function () {
        const target = sinon.spy();
        const voidPromise = Promise.resolve(null);
        instantiationService.stub(IReplaceService, 'replace', voidPromise);
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))
        ]);
        store.add(testObject.onChange(target));
        const objectToRemove = testObject.matches()[0];
        testObject.replace(objectToRemove);
        return voidPromise.then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual([{ elements: [objectToRemove], removed: true }], target.args[0]);
        });
    });
    test('replaceAll should remove all file matches', function () {
        const voidPromise = Promise.resolve(null);
        instantiationService.stubPromise(IReplaceService, 'replace', voidPromise);
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange)),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange))
        ]);
        testObject.replaceAll(null);
        return voidPromise.then(() => assert.ok(testObject.isEmpty()));
    });
    test('batchRemove should trigger the onChange event correctly', function () {
        const target = sinon.spy();
        const testObject = getPopulatedSearchResult();
        const folderMatch = testObject.folderMatches()[0];
        const fileMatch = testObject.folderMatches()[1].allDownstreamFileMatches()[0];
        const match = testObject.folderMatches()[1].allDownstreamFileMatches()[1].matches()[0];
        const arrayToRemove = [folderMatch, fileMatch, match];
        const expectedArrayResult = folderMatch.allDownstreamFileMatches().concat([fileMatch, match.parent()]);
        store.add(testObject.onChange(target));
        testObject.batchRemove(arrayToRemove);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: expectedArrayResult, removed: true, added: false }], target.args[0]);
    });
    test('batchReplace should trigger the onChange event correctly', async function () {
        const replaceSpy = sinon.spy();
        instantiationService.stub(IReplaceService, 'replace', (arg) => {
            if (Array.isArray(arg)) {
                replaceSpy(arg[0]);
            }
            else {
                replaceSpy(arg);
            }
            return Promise.resolve();
        });
        const target = sinon.spy();
        const testObject = getPopulatedSearchResult();
        const folderMatch = testObject.folderMatches()[0];
        const fileMatch = testObject.folderMatches()[1].allDownstreamFileMatches()[0];
        const match = testObject.folderMatches()[1].allDownstreamFileMatches()[1].matches()[0];
        const firstExpectedMatch = folderMatch.allDownstreamFileMatches()[0];
        const arrayToRemove = [folderMatch, fileMatch, match];
        store.add(testObject.onChange(target));
        await testObject.batchReplace(arrayToRemove);
        assert.ok(target.calledOnce);
        sinon.assert.calledThrice(replaceSpy);
        sinon.assert.calledWith(replaceSpy.firstCall, firstExpectedMatch);
        sinon.assert.calledWith(replaceSpy.secondCall, fileMatch);
        sinon.assert.calledWith(replaceSpy.thirdCall, match);
    });
    test('Creating a model with nested folders should create the correct structure', function () {
        const testObject = getPopulatedSearchResultForTreeTesting();
        const root0 = testObject.folderMatches()[0];
        const root1 = testObject.folderMatches()[1];
        const root2 = testObject.folderMatches()[2];
        const root3 = testObject.folderMatches()[3];
        const root0DownstreamFiles = root0.allDownstreamFileMatches();
        assert.deepStrictEqual(root0DownstreamFiles, [...root0.fileMatchesIterator(), ...getFolderMatchAtIndex(root0, 0).fileMatchesIterator()]);
        assert.deepStrictEqual(getFolderMatchAtIndex(root0, 0).allDownstreamFileMatches(), Array.from(getFolderMatchAtIndex(root0, 0).fileMatchesIterator()));
        assert.deepStrictEqual(getFileMatchAtIndex(getFolderMatchAtIndex(root0, 0), 0).parent(), getFolderMatchAtIndex(root0, 0));
        assert.deepStrictEqual(getFolderMatchAtIndex(root0, 0).parent(), root0);
        assert.deepStrictEqual(getFolderMatchAtIndex(root0, 0).closestRoot, root0);
        root0DownstreamFiles.forEach((e) => {
            assert.deepStrictEqual(e.closestRoot, root0);
        });
        const root1DownstreamFiles = root1.allDownstreamFileMatches();
        assert.deepStrictEqual(root1.allDownstreamFileMatches(), [...root1.fileMatchesIterator(), ...getFolderMatchAtIndex(root1, 0).fileMatchesIterator()]); // excludes the matches from nested root
        assert.deepStrictEqual(getFileMatchAtIndex(getFolderMatchAtIndex(root1, 0), 0).parent(), getFolderMatchAtIndex(root1, 0));
        root1DownstreamFiles.forEach((e) => {
            assert.deepStrictEqual(e.closestRoot, root1);
        });
        const root2DownstreamFiles = root2.allDownstreamFileMatches();
        assert.deepStrictEqual(root2DownstreamFiles, Array.from(root2.fileMatchesIterator()));
        assert.deepStrictEqual(getFileMatchAtIndex(root2, 0).parent(), root2);
        assert.deepStrictEqual(getFileMatchAtIndex(root2, 0).closestRoot, root2);
        const root3DownstreamFiles = root3.allDownstreamFileMatches();
        const root3Level3Folder = getFolderMatchAtIndex(getFolderMatchAtIndex(root3, 0), 0);
        assert.deepStrictEqual(root3DownstreamFiles, [...root3.fileMatchesIterator(), ...getFolderMatchAtIndex(root3Level3Folder, 0).fileMatchesIterator(), ...getFolderMatchAtIndex(root3Level3Folder, 1).fileMatchesIterator()].flat());
        assert.deepStrictEqual(root3Level3Folder.allDownstreamFileMatches(), getFolderMatchAtIndex(root3, 0).allDownstreamFileMatches());
        assert.deepStrictEqual(getFileMatchAtIndex(getFolderMatchAtIndex(root3Level3Folder, 1), 0).parent(), getFolderMatchAtIndex(root3Level3Folder, 1));
        assert.deepStrictEqual(getFolderMatchAtIndex(root3Level3Folder, 1).parent(), root3Level3Folder);
        assert.deepStrictEqual(root3Level3Folder.parent(), getFolderMatchAtIndex(root3, 0));
        root3DownstreamFiles.forEach((e) => {
            assert.deepStrictEqual(e.closestRoot, root3);
        });
    });
    test('Removing an intermediate folder should call OnChange() on all downstream file matches', function () {
        const target = sinon.spy();
        const testObject = getPopulatedSearchResultForTreeTesting();
        const folderMatch = getFolderMatchAtIndex(getFolderMatchAtIndex(getFolderMatchAtIndex(testObject.folderMatches()[3], 0), 0), 0);
        const expectedArrayResult = folderMatch.allDownstreamFileMatches();
        store.add(testObject.onChange(target));
        testObject.remove(folderMatch);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: expectedArrayResult, removed: true, added: false, clearingAll: false }], target.args[0]);
    });
    test('Replacing an intermediate folder should remove all downstream folders and file matches', async function () {
        const target = sinon.spy();
        const testObject = getPopulatedSearchResultForTreeTesting();
        const folderMatch = getFolderMatchAtIndex(testObject.folderMatches()[3], 0);
        const expectedArrayResult = folderMatch.allDownstreamFileMatches();
        store.add(testObject.onChange(target));
        await testObject.batchReplace([folderMatch]);
        assert.deepStrictEqual([{ elements: expectedArrayResult, removed: true, added: false }], target.args[0]);
    });
    function aFileMatch(path, searchResult, ...lineMatches) {
        if (!searchResult) {
            searchResult = aSearchResult();
        }
        const rawMatch = {
            resource: URI.file('/' + path),
            results: lineMatches
        };
        const root = searchResult?.folderMatches()[0];
        const fileMatch = instantiationService.createInstance(NotebookCompatibleFileMatch, {
            pattern: ''
        }, undefined, undefined, root, rawMatch, null, '');
        fileMatch.createMatches();
        store.add(fileMatch);
        return fileMatch;
    }
    function aSearchResult() {
        const searchModel = instantiationService.createInstance(SearchModelImpl);
        store.add(searchModel);
        searchModel.searchResult.query = {
            type: 2 /* QueryType.Text */, folderQueries: [{ folder: createFileUriFromPathFromRoot() }], contentPattern: {
                pattern: ''
            }
        };
        return searchModel.searchResult;
    }
    function aRawMatch(resource, ...results) {
        return { resource: createFileUriFromPathFromRoot(resource), results };
    }
    function aRawFileMatchWithCells(resource, ...cellMatches) {
        return {
            resource: createFileUriFromPathFromRoot(resource),
            cellResults: cellMatches
        };
    }
    function stubModelService(instantiationService) {
        instantiationService.stub(IThemeService, new TestThemeService());
        const config = new TestConfigurationService();
        config.setUserConfiguration('search', { searchOnType: true });
        instantiationService.stub(IConfigurationService, config);
        const modelService = instantiationService.createInstance(ModelService);
        store.add(modelService);
        return modelService;
    }
    function stubNotebookEditorService(instantiationService) {
        instantiationService.stub(IEditorGroupsService, new TestEditorGroupsService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IEditorService, store.add(new TestEditorService()));
        const notebookEditorWidgetService = instantiationService.createInstance(NotebookEditorWidgetService);
        store.add(notebookEditorWidgetService);
        return notebookEditorWidgetService;
    }
    function getPopulatedSearchResult() {
        const testObject = aSearchResult();
        testObject.query = {
            type: 2 /* QueryType.Text */,
            contentPattern: { pattern: 'foo' },
            folderQueries: [{
                    folder: createFileUriFromPathFromRoot('/voo')
                },
                { folder: createFileUriFromPathFromRoot('/with') },
            ]
        };
        addToSearchResult(testObject, [
            aRawMatch('/voo/foo.a', new TextSearchMatch('preview 1', lineOneRange), new TextSearchMatch('preview 2', lineOneRange)),
            aRawMatch('/with/path/bar.b', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/with/path.c', new TextSearchMatch('preview 4', lineOneRange), new TextSearchMatch('preview 5', lineOneRange)),
        ]);
        return testObject;
    }
    function getPopulatedSearchResultForTreeTesting() {
        const testObject = aSearchResult();
        testObject.query = {
            type: 2 /* QueryType.Text */,
            contentPattern: { pattern: 'foo' },
            folderQueries: [{
                    folder: createFileUriFromPathFromRoot('/voo')
                },
                {
                    folder: createFileUriFromPathFromRoot('/with')
                },
                {
                    folder: createFileUriFromPathFromRoot('/with/test')
                },
                {
                    folder: createFileUriFromPathFromRoot('/eep')
                },
            ]
        };
        /***
         * file structure looks like:
         * *voo/
         * |- foo.a
         * |- beep
         *    |- foo.c
         * 	  |- boop.c
         * *with/
         * |- path
         *    |- bar.b
         * |- path.c
         * |- *test/
         *    |- woo.c
         * eep/
         *    |- bar
         *       |- goo
         *           |- foo
         *              |- here.txt
         * 			 |- ooo
         *              |- there.txt
         *    |- eyy.y
         */
        addToSearchResult(testObject, [
            aRawMatch('/voo/foo.a', new TextSearchMatch('preview 1', lineOneRange), new TextSearchMatch('preview 2', lineOneRange)),
            aRawMatch('/voo/beep/foo.c', new TextSearchMatch('preview 1', lineOneRange), new TextSearchMatch('preview 2', lineOneRange)),
            aRawMatch('/voo/beep/boop.c', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/with/path.c', new TextSearchMatch('preview 4', lineOneRange), new TextSearchMatch('preview 5', lineOneRange)),
            aRawMatch('/with/path/bar.b', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/with/test/woo.c', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/eep/bar/goo/foo/here.txt', new TextSearchMatch('preview 6', lineOneRange), new TextSearchMatch('preview 7', lineOneRange)),
            aRawMatch('/eep/bar/goo/ooo/there.txt', new TextSearchMatch('preview 6', lineOneRange), new TextSearchMatch('preview 7', lineOneRange)),
            aRawMatch('/eep/eyy.y', new TextSearchMatch('preview 6', lineOneRange), new TextSearchMatch('preview 7', lineOneRange))
        ]);
        return testObject;
    }
    function getFolderMatchAtIndex(parent, index) {
        return Array.from(parent.folderMatchesIterator())[index];
    }
    function getFileMatchAtIndex(parent, index) {
        return Array.from(parent.fileMatchesIterator())[index];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9zZWFyY2hSZXN1bHQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQWMsZUFBZSxFQUFFLFlBQVksRUFBK0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0SSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxn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QyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDbkMsTUFBTSxVQUFVLEdBQUcsYUFBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxNQUFNLEdBQUc7WUFDZCxTQUFTLENBQUMsSUFBSSxFQUNiLElBQUksZUFBZSxDQUFDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzNELElBQUksZUFBZSxDQUFDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVB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QUcsd0JBQXdCLEVBQUUsQ0FBQztRQUU5QyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkYsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxNQUFNLGFBQWEsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxVQUFVLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdCLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNsRSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFELEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEVBQTBFLEVBQUU7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