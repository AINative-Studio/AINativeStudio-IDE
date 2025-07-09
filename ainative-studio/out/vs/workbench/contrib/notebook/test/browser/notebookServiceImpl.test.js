/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NotebookProviderInfoStore } from '../../browser/services/notebookServiceImpl.js';
import { NotebookProviderInfo } from '../../common/notebookProvider.js';
import { EditorResolverService } from '../../../../services/editor/browser/editorResolverService.js';
import { RegisteredEditorPriority } from '../../../../services/editor/common/editorResolverService.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('NotebookProviderInfoStore', function () {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('Can\'t open untitled notebooks in test #119363', function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const store = new NotebookProviderInfoStore(new class extends mock() {
            get() { return ''; }
            store() { }
            getObject() { return {}; }
        }, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRegisterExtensions = Event.None;
            }
        }, disposables.add(instantiationService.createInstance(EditorResolverService)), new TestConfigurationService(), new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeScreenReaderOptimized = Event.None;
            }
        }, instantiationService, new class extends mock() {
            hasProvider() { return true; }
        }, new class extends mock() {
        }, new class extends mock() {
        });
        disposables.add(store);
        const fooInfo = new NotebookProviderInfo({
            extension: nullExtensionDescription.identifier,
            id: 'foo',
            displayName: 'foo',
            selectors: [{ filenamePattern: '*.foo' }],
            priority: RegisteredEditorPriority.default,
            providerDisplayName: 'foo',
        });
        const barInfo = new NotebookProviderInfo({
            extension: nullExtensionDescription.identifier,
            id: 'bar',
            displayName: 'bar',
            selectors: [{ filenamePattern: '*.bar' }],
            priority: RegisteredEditorPriority.default,
            providerDisplayName: 'bar',
        });
        store.add(fooInfo);
        store.add(barInfo);
        assert.ok(store.get('foo'));
        assert.ok(store.get('bar'));
        assert.ok(!store.get('barfoo'));
        let providers = store.getContributedNotebook(URI.parse('file:///test/nb.foo'));
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0] === fooInfo, true);
        providers = store.getContributedNotebook(URI.parse('file:///test/nb.bar'));
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0] === barInfo, true);
        providers = store.getContributedNotebook(URI.parse('untitled:///Untitled-1'));
        assert.strictEqual(providers.length, 2);
        assert.strictEqual(providers[0] === fooInfo, true);
        assert.strictEqual(providers[1] === barInfo, true);
        providers = store.getContributedNotebook(URI.parse('untitled:///test/nb.bar'));
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0] === barInfo, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZXJ2aWNlSW1wbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va1NlcnZpY2VJbXBsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBSXpILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRyxLQUFLLENBQUMsMkJBQTJCLEVBQUU7SUFDbEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQWtDLENBQUM7SUFFOUYsSUFBSSxDQUFDLGdEQUFnRCxFQUFFO1FBQ3RELE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENB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