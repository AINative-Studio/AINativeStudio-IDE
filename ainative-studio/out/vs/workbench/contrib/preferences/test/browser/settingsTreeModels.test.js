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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL3Rlc3QvYnJvd3Nlci9zZXR0aW5nc1RyZWVNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLFVBQVUsRUFBZ0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUNwQztZQUNDLFFBQVEsRUFBRSxLQUFLO1lBQ2YsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsZUFBZSxDQUNyQix5QkFBeUIsQ0FBQyxhQUFhLENBQUMsRUFDeEM7WUFDQyxRQUFRLEVBQUUsV0FBVztZQUNyQixLQUFLLEVBQUUsS0FBSztTQUNaLENBQUMsQ0FBQztRQUVKLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLHlCQUF5QixDQUFDLHFCQUFxQixDQUFDLEVBQ2hEO1lBQ0MsUUFBUSxFQUFFLFNBQVM7WUFDbkIsS0FBSyxFQUFFLGVBQWU7U0FDdEIsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLGVBQWUsQ0FDckIseUJBQXlCLENBQUMsS0FBSyxDQUFDLEVBQ2hDO1lBQ0MsUUFBUSxFQUFFLEVBQUU7WUFDWixLQUFLLEVBQUUsS0FBSztTQUNaLENBQUMs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