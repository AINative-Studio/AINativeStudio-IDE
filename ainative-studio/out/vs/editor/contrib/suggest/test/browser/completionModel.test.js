/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditorOptions } from '../../../../common/config/editorOptions.js';
import { CompletionModel } from '../../browser/completionModel.js';
import { CompletionItem, getSuggestionComparator } from '../../browser/suggest.js';
import { WordDistance } from '../../browser/wordDistance.js';
export function createSuggestItem(label, overwriteBefore, kind = 9 /* languages.CompletionItemKind.Property */, incomplete = false, position = { lineNumber: 1, column: 1 }, sortText, filterText) {
    const suggestion = {
        label,
        sortText,
        filterText,
        range: { startLineNumber: position.lineNumber, startColumn: position.column - overwriteBefore, endLineNumber: position.lineNumber, endColumn: position.column },
        insertText: typeof label === 'string' ? label : label.label,
        kind
    };
    const container = {
        incomplete,
        suggestions: [suggestion]
    };
    const provider = {
        _debugDisplayName: 'test',
        provideCompletionItems() {
            return;
        }
    };
    return new CompletionItem(position, suggestion, container, provider);
}
suite('CompletionModel', function () {
    const defaultOptions = {
        insertMode: 'insert',
        snippetsPreventQuickSuggestions: true,
        filterGraceful: true,
        localityBonus: false,
        shareSuggestSelections: false,
        showIcons: true,
        showMethods: true,
        showFunctions: true,
        showConstructors: true,
        showDeprecated: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showKeywords: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showSnippets: true,
    };
    let model;
    setup(function () {
        model = new CompletionModel([
            createSuggestItem('foo', 3),
            createSuggestItem('Foo', 3),
            createSuggestItem('foo', 2),
        ], 1, {
            leadingLineContent: 'foo',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('filtering - cached', function () {
        const itemsNow = model.items;
        let itemsThen = model.items;
        assert.ok(itemsNow === itemsThen);
        // still the same context
        model.lineContext = { leadingLineContent: 'foo', characterCountDelta: 0 };
        itemsThen = model.items;
        assert.ok(itemsNow === itemsThen);
        // different context, refilter
        model.lineContext = { leadingLineContent: 'foo1', characterCountDelta: 1 };
        itemsThen = model.items;
        assert.ok(itemsNow !== itemsThen);
    });
    test('complete/incomplete', () => {
        assert.strictEqual(model.getIncompleteProvider().size, 0);
        const incompleteModel = new CompletionModel([
            createSuggestItem('foo', 3, undefined, true),
            createSuggestItem('foo', 2),
        ], 1, {
            leadingLineContent: 'foo',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(incompleteModel.getIncompleteProvider().size, 1);
    });
    test('Fuzzy matching of snippets stopped working with inline snippet suggestions #49895', function () {
        const completeItem1 = createSuggestItem('foobar1', 1, undefined, false, { lineNumber: 1, column: 2 });
        const completeItem2 = createSuggestItem('foobar2', 1, undefined, false, { lineNumber: 1, column: 2 });
        const completeItem3 = createSuggestItem('foobar3', 1, undefined, false, { lineNumber: 1, column: 2 });
        const completeItem4 = createSuggestItem('foobar4', 1, undefined, false, { lineNumber: 1, column: 2 });
        const completeItem5 = createSuggestItem('foobar5', 1, undefined, false, { lineNumber: 1, column: 2 });
        const incompleteItem1 = createSuggestItem('foofoo1', 1, undefined, true, { lineNumber: 1, column: 2 });
        const model = new CompletionModel([
            completeItem1,
            completeItem2,
            completeItem3,
            completeItem4,
            completeItem5,
            incompleteItem1,
        ], 2, { leadingLineContent: 'f', characterCountDelta: 0 }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.getIncompleteProvider().size, 1);
        assert.strictEqual(model.items.length, 6);
    });
    test('proper current word when length=0, #16380', function () {
        model = new CompletionModel([
            createSuggestItem('    </div', 4),
            createSuggestItem('a', 0),
            createSuggestItem('p', 0),
            createSuggestItem('    </tag', 4),
            createSuggestItem('    XYZ', 4),
        ], 1, {
            leadingLineContent: '   <',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 4);
        const [a, b, c, d] = model.items;
        assert.strictEqual(a.completion.label, '    </div');
        assert.strictEqual(b.completion.label, '    </tag');
        assert.strictEqual(c.completion.label, 'a');
        assert.strictEqual(d.completion.label, 'p');
    });
    test('keep snippet sorting with prefix: top, #25495', function () {
        model = new CompletionModel([
            createSuggestItem('Snippet1', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('tnippet2', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('semver', 1, 9 /* languages.CompletionItemKind.Property */),
        ], 1, {
            leadingLineContent: 's',
            characterCountDelta: 0
        }, WordDistance.None, defaultOptions, 'top', undefined);
        assert.strictEqual(model.items.length, 2);
        const [a, b] = model.items;
        assert.strictEqual(a.completion.label, 'Snippet1');
        assert.strictEqual(b.completion.label, 'semver');
        assert.ok(a.score < b.score); // snippet really promoted
    });
    test('keep snippet sorting with prefix: bottom, #25495', function () {
        model = new CompletionModel([
            createSuggestItem('snippet1', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('tnippet2', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('Semver', 1, 9 /* languages.CompletionItemKind.Property */),
        ], 1, {
            leadingLineContent: 's',
            characterCountDelta: 0
        }, WordDistance.None, defaultOptions, 'bottom', undefined);
        assert.strictEqual(model.items.length, 2);
        const [a, b] = model.items;
        assert.strictEqual(a.completion.label, 'Semver');
        assert.strictEqual(b.completion.label, 'snippet1');
        assert.ok(a.score < b.score); // snippet really demoted
    });
    test('keep snippet sorting with prefix: inline, #25495', function () {
        model = new CompletionModel([
            createSuggestItem('snippet1', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('tnippet2', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('Semver', 1),
        ], 1, {
            leadingLineContent: 's',
            characterCountDelta: 0
        }, WordDistance.None, defaultOptions, 'inline', undefined);
        assert.strictEqual(model.items.length, 2);
        const [a, b] = model.items;
        assert.strictEqual(a.completion.label, 'snippet1');
        assert.strictEqual(b.completion.label, 'Semver');
        assert.ok(a.score > b.score); // snippet really demoted
    });
    test('filterText seems ignored in autocompletion, #26874', function () {
        const item1 = createSuggestItem('Map - java.util', 1, undefined, undefined, undefined, undefined, 'Map');
        const item2 = createSuggestItem('Map - java.util', 1);
        model = new CompletionModel([item1, item2], 1, {
            leadingLineContent: 'M',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 2);
        model.lineContext = {
            leadingLineContent: 'Map ',
            characterCountDelta: 3
        };
        assert.strictEqual(model.items.length, 1);
    });
    test('Vscode 1.12 no longer obeys \'sortText\' in completion items (from language server), #26096', function () {
        const item1 = createSuggestItem('<- groups', 2, 9 /* languages.CompletionItemKind.Property */, false, { lineNumber: 1, column: 3 }, '00002', '  groups');
        const item2 = createSuggestItem('source', 0, 9 /* languages.CompletionItemKind.Property */, false, { lineNumber: 1, column: 3 }, '00001', 'source');
        const items = [item1, item2].sort(getSuggestionComparator(1 /* SnippetSortOrder.Inline */));
        model = new CompletionModel(items, 3, {
            leadingLineContent: '  ',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 2);
        const [first, second] = model.items;
        assert.strictEqual(first.completion.label, 'source');
        assert.strictEqual(second.completion.label, '<- groups');
    });
    test('Completion item sorting broken when using label details #153026', function () {
        const itemZZZ = createSuggestItem({ label: 'ZZZ' }, 0, 11 /* languages.CompletionItemKind.Operator */, false);
        const itemAAA = createSuggestItem({ label: 'AAA' }, 0, 11 /* languages.CompletionItemKind.Operator */, false);
        const itemIII = createSuggestItem('III', 0, 11 /* languages.CompletionItemKind.Operator */, false);
        const cmp = getSuggestionComparator(1 /* SnippetSortOrder.Inline */);
        const actual = [itemZZZ, itemAAA, itemIII].sort(cmp);
        assert.deepStrictEqual(actual, [itemAAA, itemIII, itemZZZ]);
    });
    test('Score only filtered items when typing more, score all when typing less', function () {
        model = new CompletionModel([
            createSuggestItem('console', 0),
            createSuggestItem('co_new', 0),
            createSuggestItem('bar', 0),
            createSuggestItem('car', 0),
            createSuggestItem('foo', 0),
        ], 1, {
            leadingLineContent: '',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 5);
        // narrow down once
        model.lineContext = { leadingLineContent: 'c', characterCountDelta: 1 };
        assert.strictEqual(model.items.length, 3);
        // query gets longer, narrow down the narrow-down'ed-set from before
        model.lineContext = { leadingLineContent: 'cn', characterCountDelta: 2 };
        assert.strictEqual(model.items.length, 2);
        // query gets shorter, refilter everything
        model.lineContext = { leadingLineContent: '', characterCountDelta: 0 };
        assert.strictEqual(model.items.length, 5);
    });
    test('Have more relaxed suggest matching algorithm #15419', function () {
        model = new CompletionModel([
            createSuggestItem('result', 0),
            createSuggestItem('replyToUser', 0),
            createSuggestItem('randomLolut', 0),
            createSuggestItem('car', 0),
            createSuggestItem('foo', 0),
        ], 1, {
            leadingLineContent: '',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        // query gets longer, narrow down the narrow-down'ed-set from before
        model.lineContext = { leadingLineContent: 'rlut', characterCountDelta: 4 };
        assert.strictEqual(model.items.length, 3);
        const [first, second, third] = model.items;
        assert.strictEqual(first.completion.label, 'result'); // best with `rult`
        assert.strictEqual(second.completion.label, 'replyToUser'); // best with `rltu`
        assert.strictEqual(third.completion.label, 'randomLolut'); // best with `rlut`
    });
    test('Emmet suggestion not appearing at the top of the list in jsx files, #39518', function () {
        model = new CompletionModel([
            createSuggestItem('from', 0),
            createSuggestItem('form', 0),
            createSuggestItem('form:get', 0),
            createSuggestItem('testForeignMeasure', 0),
            createSuggestItem('fooRoom', 0),
        ], 1, {
            leadingLineContent: '',
            characterCountDelta: 0
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        model.lineContext = { leadingLineContent: 'form', characterCountDelta: 4 };
        assert.strictEqual(model.items.length, 5);
        const [first, second, third] = model.items;
        assert.strictEqual(first.completion.label, 'form'); // best with `form`
        assert.strictEqual(second.completion.label, 'form:get'); // best with `form`
        assert.strictEqual(third.completion.label, 'from'); // best with `from`
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvY29tcGxldGlvbk1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQTBCLE1BQU0sNENBQTRDLENBQUM7QUFHbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsdUJBQXVCLEVBQW9CLE1BQU0sMEJBQTBCLENBQUM7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTdELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxLQUE2QyxFQUFFLGVBQXVCLEVBQUUsSUFBSSxnREFBd0MsRUFBRSxhQUFzQixLQUFLLEVBQUUsV0FBc0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxRQUFpQixFQUFFLFVBQW1CO0lBQzlRLE1BQU0sVUFBVSxHQUE2QjtRQUM1QyxLQUFLO1FBQ0wsUUFBUTtRQUNSLFVBQVU7UUFDVixLQUFLLEVBQUUsRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxlQUFlLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUU7UUFDL0osVUFBVSxFQUFFLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FB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