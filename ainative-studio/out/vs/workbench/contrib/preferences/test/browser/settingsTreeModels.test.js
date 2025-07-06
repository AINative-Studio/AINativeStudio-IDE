/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { settingKeyToDisplayFormat, parseQuery } from '../../browser/settingsTreeModels.js';
suite('SettingsTree', () => {
    test('settingKeyToDisplayFormat', () => {
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar'), {
            category: 'Foo',
            label: 'Bar'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc'), {
            category: 'Foo › Bar',
            label: 'Etc'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.etcSomething'), {
            category: 'Foo Bar',
            label: 'Etc Something'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo'), {
            category: '',
            label: 'Foo'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.1leading.number'), {
            category: 'Foo › 1leading',
            label: 'Number'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.1Leading.number'), {
            category: 'Foo › 1 Leading',
            label: 'Number'
        });
    });
    test('settingKeyToDisplayFormat - with category', () => {
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar', 'foo'), {
            category: '',
            label: 'Bar'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('disableligatures.ligatures', 'disableligatures'), {
            category: '',
            label: 'Ligatures'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc', 'foo'), {
            category: 'Bar',
            label: 'Etc'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.etcSomething', 'foo'), {
            category: 'Foo Bar',
            label: 'Etc Something'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc', 'foo/bar'), {
            category: '',
            label: 'Etc'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc', 'something/foo'), {
            category: 'Bar',
            label: 'Etc'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('bar.etc', 'something.bar'), {
            category: '',
            label: 'Etc'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.etc', 'fooBar'), {
            category: '',
            label: 'Etc'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.somethingElse.etc', 'fooBar'), {
            category: 'Something Else',
            label: 'Etc'
        });
    });
    test('settingKeyToDisplayFormat - known acronym/term', () => {
        assert.deepStrictEqual(settingKeyToDisplayFormat('css.someCssSetting'), {
            category: 'CSS',
            label: 'Some CSS Setting'
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('powershell.somePowerShellSetting'), {
            category: 'PowerShell',
            label: 'Some PowerShell Setting'
        });
    });
    test('parseQuery', () => {
        function testParseQuery(input, expected) {
            assert.deepStrictEqual(parseQuery(input), expected, input);
        }
        testParseQuery('', {
            tags: [],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@modified', {
            tags: ['modified'],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@tag:foo', {
            tags: ['foo'],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@modified foo', {
            tags: ['modified'],
            extensionFilters: [],
            query: 'foo',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@tag:foo @modified', {
            tags: ['foo', 'modified'],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@tag:foo @modified my query', {
            tags: ['foo', 'modified'],
            extensionFilters: [],
            query: 'my query',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('test @modified query', {
            tags: ['modified'],
            extensionFilters: [],
            query: 'test  query',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('test @modified', {
            tags: ['modified'],
            extensionFilters: [],
            query: 'test',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('query has @ for some reason', {
            tags: [],
            extensionFilters: [],
            query: 'query has @ for some reason',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@ext:github.vscode-pull-request-github', {
            tags: [],
            extensionFilters: ['github.vscode-pull-request-github'],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@ext:github.vscode-pull-request-github,vscode.git', {
            tags: [],
            extensionFilters: ['github.vscode-pull-request-github', 'vscode.git'],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@feature:scm', {
            tags: [],
            extensionFilters: [],
            featureFilters: ['scm'],
            query: '',
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@feature:scm,terminal', {
            tags: [],
            extensionFilters: [],
            featureFilters: ['scm', 'terminal'],
            query: '',
            idFilters: [],
            languageFilter: undefined
        });
        testParseQuery('@id:files.autoSave', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: ['files.autoSave'],
            languageFilter: undefined
        });
        testParseQuery('@id:files.autoSave,terminal.integrated.commandsToSkipShell', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: ['files.autoSave', 'terminal.integrated.commandsToSkipShell'],
            languageFilter: undefined
        });
        testParseQuery('@lang:cpp', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: [],
            languageFilter: 'cpp'
        });
        testParseQuery('@lang:cpp,python', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: [],
            languageFilter: 'cpp'
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy90ZXN0L2Jyb3dzZXIvc2V0dGluZ3NUcmVlTW9kZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxVQUFVLEVBQWdCLE1BQU0scUNBQXFDLENBQUM7QUFFMUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLENBQUMsZUFBZSxDQUNyQix5QkFBeUIsQ0FBQyxTQUFTLENBQUMsRUFDcEM7WUFDQyxRQUFRLEVBQUUsS0FBSztZQUNmLEtBQUssRUFBRSxLQUFLO1NBQ1osQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLGVBQWUsQ0FDckIseUJBQXlCLENBQUMsYUFBYSxDQUFDLEVBQ3hDO1lBQ0MsUUFBUSxFQUFFLFdBQVc7WUFDckIsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsZUFBZSxDQUNyQix5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUNoRDtZQUNDLFFBQVEsRUFBRSxTQUFTO1lBQ25CLEtBQUssRUFBRSxlQUFlO1NBQ3RCLENBQUMsQ0FBQztRQUVKLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxFQUNoQztZQUNDLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUM7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