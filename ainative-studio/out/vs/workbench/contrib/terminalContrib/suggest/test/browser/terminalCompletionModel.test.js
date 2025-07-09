/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert, { notStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalCompletionModel } from '../../browser/terminalCompletionModel.js';
import { LineContext } from '../../../../../services/suggest/browser/simpleCompletionModel.js';
import { TerminalCompletionItem, TerminalCompletionItemKind } from '../../browser/terminalCompletionItem.js';
function createItem(options) {
    return new TerminalCompletionItem({
        ...options,
        kind: options.kind ?? TerminalCompletionItemKind.Method,
        label: options.label || 'defaultLabel',
        provider: options.provider || 'defaultProvider',
        replacementIndex: options.replacementIndex || 0,
        replacementLength: options.replacementLength || 1,
    });
}
function createFileItems(...labels) {
    return labels.map(label => createItem({ label, kind: TerminalCompletionItemKind.File }));
}
function createFileItemsModel(...labels) {
    return new TerminalCompletionModel(createFileItems(...labels), new LineContext('', 0));
}
function createFolderItems(...labels) {
    return labels.map(label => createItem({ label, kind: TerminalCompletionItemKind.Folder }));
}
function createFolderItemsModel(...labels) {
    return new TerminalCompletionModel(createFolderItems(...labels), new LineContext('', 0));
}
function assertItems(model, labels) {
    assert.deepStrictEqual(model.items.map(i => i.completion.label), labels);
    assert.strictEqual(model.items.length, labels.length); // sanity check
}
suite('TerminalCompletionModel', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    let model;
    test('should handle an empty list', function () {
        model = new TerminalCompletionModel([], new LineContext('', 0));
        assert.strictEqual(model.items.length, 0);
    });
    test('should handle a list with one item', function () {
        model = new TerminalCompletionModel([
            createItem({ label: 'a' }),
        ], new LineContext('', 0));
        assert.strictEqual(model.items.length, 1);
        assert.strictEqual(model.items[0].completion.label, 'a');
    });
    test('should sort alphabetically', function () {
        model = new TerminalCompletionModel([
            createItem({ label: 'b' }),
            createItem({ label: 'z' }),
            createItem({ label: 'a' }),
        ], new LineContext('', 0));
        assert.strictEqual(model.items.length, 3);
        assert.strictEqual(model.items[0].completion.label, 'a');
        assert.strictEqual(model.items[1].completion.label, 'b');
        assert.strictEqual(model.items[2].completion.label, 'z');
    });
    test('fuzzy matching', () => {
        const initial = [
            '.\\.eslintrc',
            '.\\resources\\',
            '.\\scripts\\',
            '.\\src\\',
        ];
        const expected = [
            '.\\scripts\\',
            '.\\src\\',
            '.\\.eslintrc',
            '.\\resources\\',
        ];
        model = new TerminalCompletionModel(initial.map(e => (createItem({ label: e }))), new LineContext('s', 0));
        assertItems(model, expected);
    });
    suite('files and folders', () => {
        test('should deprioritize files that start with underscore', function () {
            const initial = ['_a', 'a', 'z'];
            const expected = ['a', 'z', '_a'];
            assertItems(createFileItemsModel(...initial), expected);
            assertItems(createFolderItemsModel(...initial), expected);
        });
        test('should ignore the dot in dotfiles when sorting', function () {
            const initial = ['b', '.a', 'a', '.b'];
            const expected = ['.a', 'a', 'b', '.b'];
            assertItems(createFileItemsModel(...initial), expected);
            assertItems(createFolderItemsModel(...initial), expected);
        });
        test('should handle many files and folders correctly', function () {
            // This is VS Code's root directory with some python items added that have special
            // sorting
            const items = [
                ...createFolderItems('__pycache', '.build', '.configurations', '.devcontainer', '.eslint-plugin-local', '.github', '.profile-oss', '.vscode', '.vscode-test', 'build', 'cli', 'extensions', 'node_modules', 'out', 'remote', 'resources', 'scripts', 'src', 'test'),
                ...createFileItems('__init__.py', '.editorconfig', '.eslint-ignore', '.git-blame-ignore-revs', '.gitattributes', '.gitignore', '.lsifrc.json', '.mailmap', '.mention-bot', '.npmrc', '.nvmrc', '.vscode-test.js', 'cglicenses.json', 'cgmanifest.json', 'CodeQL.yml', 'CONTRIBUTING.md', 'eslint.config.js', 'gulpfile.js', 'LICENSE.txt', 'package-lock.json', 'package.json', 'product.json', 'README.md', 'SECURITY.md', 'ThirdPartyNotices.txt', 'tsfmt.json')
            ];
            const model = new TerminalCompletionModel(items, new LineContext('', 0));
            assertItems(model, [
                '.build',
                'build',
                'cglicenses.json',
                'cgmanifest.json',
                'cli',
                'CodeQL.yml',
                '.configurations',
                'CONTRIBUTING.md',
                '.devcontainer',
                '.editorconfig',
                'eslint.config.js',
                '.eslint-ignore',
                '.eslint-plugin-local',
                'extensions',
                '.gitattributes',
                '.git-blame-ignore-revs',
                '.github',
                '.gitignore',
                'gulpfile.js',
                'LICENSE.txt',
                '.lsifrc.json',
                '.mailmap',
                '.mention-bot',
                'node_modules',
                '.npmrc',
                '.nvmrc',
                'out',
                'package.json',
                'package-lock.json',
                'product.json',
                '.profile-oss',
                'README.md',
                'remote',
                'resources',
                'scripts',
                'SECURITY.md',
                'src',
                'test',
                'ThirdPartyNotices.txt',
                'tsfmt.json',
                '.vscode',
                '.vscode-test',
                '.vscode-test.js',
                '__init__.py',
                '__pycache',
            ]);
        });
    });
    suite('inline completions', () => {
        function createItems(kind) {
            return [
                ...createFolderItems('a', 'c'),
                ...createFileItems('b', 'd'),
                new TerminalCompletionItem({
                    label: 'ab',
                    provider: 'core',
                    replacementIndex: 0,
                    replacementLength: 0,
                    kind
                })
            ];
        }
        suite('InlineSuggestion', () => {
            test('should put on top generally', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestion), new LineContext('', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
            test('should NOT put on top when there\'s an exact match of another item', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestion), new LineContext('a', 0));
                notStrictEqual(model.items[0].completion.label, 'ab');
                strictEqual(model.items[1].completion.label, 'ab');
            });
        });
        suite('InlineSuggestionAlwaysOnTop', () => {
            test('should put on top generally', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop), new LineContext('', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
            test('should put on top even if there\'s an exact match of another item', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop), new LineContext('a', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sRUFBRSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBNEIsTUFBTSx5Q0FBeUMsQ0FBQztBQUV2SSxTQUFTLFVBQVUsQ0FBQyxPQUFxQztJQUN4RCxPQUFPLElBQUksc0JBQXNCLENBQUM7UUFDakMsR0FBRyxPQUFPO1FBQ1YsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksMEJBQTBCLENBQUMsTUFBTTtRQUN2RCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssSUFBSSxjQUFjO1FBQ3RDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLGlCQUFpQjtRQUMvQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLElBQUksQ0FBQztRQUMvQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCLElBQUksQ0FBQztLQUNqRCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBRyxNQUFnQjtJQUMzQyxPQUFPLE1BQU0sQ0FB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