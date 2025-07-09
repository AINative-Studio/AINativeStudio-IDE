/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { MainThreadWorkspace } from '../../browser/mainThreadWorkspace.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { workbenchInstantiationService } from '../../../test/browser/workbenchTestServices.js';
import { URI } from '../../../../base/common/uri.js';
suite('MainThreadWorkspace', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let configService;
    let instantiationService;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        configService = instantiationService.get(IConfigurationService);
        configService.setUserConfiguration('search', {});
    });
    test('simple', () => {
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries.length, 1);
                assert.strictEqual(query.folderQueries[0].disregardIgnoreFiles, true);
                assert.deepStrictEqual({ ...query.includePattern }, { 'foo': true });
                assert.strictEqual(query.maxResults, 10);
                return Promise.resolve({ results: [], messages: [] });
            }
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: 'foo', disregardSearchExcludeSettings: true }, CancellationToken.None);
    });
    test('exclude defaults', () => {
        configService.setUserConfiguration('search', {
            'exclude': { 'searchExclude': true }
        });
        configService.setUserConfiguration('files', {
            'exclude': { 'filesExclude': true }
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries.length, 1);
                assert.strictEqual(query.folderQueries[0].disregardIgnoreFiles, true);
                assert.strictEqual(query.folderQueries[0].excludePattern?.length, 1);
                assert.deepStrictEqual(query.folderQueries[0].excludePattern[0].pattern, { 'filesExclude': true });
                return Promise.resolve({ results: [], messages: [] });
            }
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: '', disregardSearchExcludeSettings: true }, CancellationToken.None);
    });
    test('disregard excludes', () => {
        configService.setUserConfiguration('search', {
            'exclude': { 'searchExclude': true }
        });
        configService.setUserConfiguration('files', {
            'exclude': { 'filesExclude': true }
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.deepStrictEqual(query.folderQueries[0].excludePattern, []);
                assert.deepStrictEqual(query.excludePattern, undefined);
                return Promise.resolve({ results: [], messages: [] });
            }
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: '', disregardSearchExcludeSettings: true, disregardExcludeSettings: true }, CancellationToken.None);
    });
    test('do not disregard anything if disregardExcludeSettings is true', () => {
        configService.setUserConfiguration('search', {
            'exclude': { 'searchExclude': true }
        });
        configService.setUserConfiguration('files', {
            'exclude': { 'filesExclude': true }
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries.length, 1);
                assert.strictEqual(query.folderQueries[0].disregardIgnoreFiles, true);
                assert.deepStrictEqual(query.folderQueries[0].excludePattern, []);
                return Promise.resolve({ results: [], messages: [] });
            }
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: '', disregardExcludeSettings: true, disregardSearchExcludeSettings: false }, CancellationToken.None);
    });
    test('exclude string', () => {
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.deepStrictEqual(query.folderQueries[0].excludePattern, []);
                assert.deepStrictEqual({ ...query.excludePattern }, { 'exclude/**': true });
                return Promise.resolve({ results: [], messages: [] });
            }
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: '', excludePattern: [{ pattern: 'exclude/**' }], disregardSearchExcludeSettings: true }, CancellationToken.None);
    });
    test('Valid revived URI after moving to EH', () => {
        const uriComponents = {
            scheme: 'test',
            path: '/Users/username/Downloads',
        };
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries?.length, 1);
                assert.ok(URI.isUri(query.folderQueries[0].folder));
                assert.strictEqual(query.folderQueries[0].folder.path, '/Users/username/Downloads');
                assert.strictEqual(query.folderQueries[0].folder.scheme, 'test');
                return Promise.resolve({ results: [], messages: [] });
            }
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(uriComponents, { filePattern: '*.md' }, CancellationToken.None);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdvcmtzcGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRXb3Jrc3BhY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdEUsT0FBTyxFQUFjLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELElBQUksYUFBdUMsQ0FBQztJQUM1QyxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUE2QixDQUFDO1FBRXpHLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQTZCLENBQUM7UUFDNUYsYUFBYSxDQUFD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