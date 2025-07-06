/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { anyScore, createMatches, fuzzyScore, fuzzyScoreGraceful, fuzzyScoreGracefulAggressive, matchesCamelCase, matchesContiguousSubString, matchesPrefix, matchesStrictPrefix, matchesSubString, matchesWords, or } from '../../common/filters.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function filterOk(filter, word, wordToMatchAgainst, highlights) {
    const r = filter(word, wordToMatchAgainst);
    assert(r, `${word} didn't match ${wordToMatchAgainst}`);
    if (highlights) {
        assert.deepStrictEqual(r, highlights);
    }
}
function filterNotOk(filter, word, wordToMatchAgainst) {
    assert(!filter(word, wordToMatchAgainst), `${word} matched ${wordToMatchAgainst}`);
}
suite('Filters', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('or', () => {
        let filter;
        let counters;
        const newFilter = function (i, r) {
            return function () { counters[i]++; return r; };
        };
        counters = [0, 0];
        filter = or(newFilter(0, false), newFilter(1, false));
        filterNotOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 1]);
        counters = [0, 0];
        filter = or(newFilter(0, true), newFilter(1, false));
        filterOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 0]);
        counters = [0, 0];
        filter = or(newFilter(0, true), newFilter(1, true));
        filterOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 0]);
        counters = [0, 0];
        filter = or(newFilter(0, false), newFilter(1, true));
        filterOk(filter, 'anything', 'anything');
        assert.deepStrictEqual(counters, [1, 1]);
    });
    test('PrefixFilter - case sensitive', function () {
        filterNotOk(matchesStrictPrefix, '', '');
        filterOk(matchesStrictPrefix, '', 'anything', []);
        filterOk(matchesStrictPrefix, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesStrictPrefix, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesStrictPrefix, 'alpha', 'alp');
        filterOk(matchesStrictPrefix, 'a', 'alpha', [{ start: 0, end: 1 }]);
        filterNotOk(matchesStrictPrefix, 'x', 'alpha');
        filterNotOk(matchesStrictPrefix, 'A', 'alpha');
        filterNotOk(matchesStrictPrefix, 'AlPh', 'alPHA');
    });
    test('PrefixFilter - ignore case', function () {
        filterOk(matchesPrefix, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesPrefix, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesPrefix, 'alpha', 'alp');
        filterOk(matchesPrefix, 'a', 'alpha', [{ start: 0, end: 1 }]);
        filterOk(matchesPrefix, 'ä', 'Älpha', [{ start: 0, end: 1 }]);
        filterNotOk(matchesPrefix, 'x', 'alpha');
        filterOk(matchesPrefix, 'A', 'alpha', [{ start: 0, end: 1 }]);
        filterOk(matchesPrefix, 'AlPh', 'alPHA', [{ start: 0, end: 4 }]);
        filterNotOk(matchesPrefix, 'T', '4'); // see https://github.com/microsoft/vscode/issues/22401
    });
    test('CamelCaseFilter', () => {
        filterNotOk(matchesCamelCase, '', '');
        filterOk(matchesCamelCase, '', 'anything', []);
        filterOk(matchesCamelCase, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesCamelCase, 'AlPhA', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesCamelCase, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesCamelCase, 'alpha', 'alp');
        filterOk(matchesCamelCase, 'c', 'CamelCaseRocks', [
            { start: 0, end: 1 }
        ]);
        filterOk(matchesCamelCase, 'cc', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 5, end: 6 }
        ]);
        filterOk(matchesCamelCase, 'ccr', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 5, end: 6 },
            { start: 9, end: 10 }
        ]);
        filterOk(matchesCamelCase, 'cacr', 'CamelCaseRocks', [
            { start: 0, end: 2 },
            { start: 5, end: 6 },
            { start: 9, end: 10 }
        ]);
        filterOk(matchesCamelCase, 'cacar', 'CamelCaseRocks', [
            { start: 0, end: 2 },
            { start: 5, end: 7 },
            { start: 9, end: 10 }
        ]);
        filterOk(matchesCamelCase, 'ccarocks', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 5, end: 7 },
            { start: 9, end: 14 }
        ]);
        filterOk(matchesCamelCase, 'cr', 'CamelCaseRocks', [
            { start: 0, end: 1 },
            { start: 9, end: 10 }
        ]);
        filterOk(matchesCamelCase, 'fba', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 5 }
        ]);
        filterOk(matchesCamelCase, 'fbar', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 6 }
        ]);
        filterOk(matchesCamelCase, 'fbara', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 7 }
        ]);
        filterOk(matchesCamelCase, 'fbaa', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 5 },
            { start: 6, end: 7 }
        ]);
        filterOk(matchesCamelCase, 'fbaab', 'FooBarAbe', [
            { start: 0, end: 1 },
            { start: 3, end: 5 },
            { start: 6, end: 8 }
        ]);
        filterOk(matchesCamelCase, 'c2d', 'canvasCreation2D', [
            { start: 0, end: 1 },
            { start: 14, end: 16 }
        ]);
        filterOk(matchesCamelCase, 'cce', '_canvasCreationEvent', [
            { start: 1, end: 2 },
            { start: 7, end: 8 },
            { start: 15, end: 16 }
        ]);
    });
    test('CamelCaseFilter - #19256', function () {
        assert(matchesCamelCase('Debug Console', 'Open: Debug Console'));
        assert(matchesCamelCase('Debug console', 'Open: Debug Console'));
        assert(matchesCamelCase('debug console', 'Open: Debug Console'));
    });
    test('matchesContiguousSubString', () => {
        filterOk(matchesContiguousSubString, 'cela', 'cancelAnimationFrame()', [
            { start: 3, end: 7 }
        ]);
    });
    test('matchesSubString', () => {
        filterOk(matchesSubString, 'cmm', 'cancelAnimationFrame()', [
            { start: 0, end: 1 },
            { start: 9, end: 10 },
            { start: 18, end: 19 }
        ]);
        filterOk(matchesSubString, 'abc', 'abcabc', [
            { start: 0, end: 3 },
        ]);
        filterOk(matchesSubString, 'abc', 'aaabbbccc', [
            { start: 0, end: 1 },
            { start: 3, end: 4 },
            { start: 6, end: 7 },
        ]);
    });
    test('matchesSubString performance (#35346)', function () {
        filterNotOk(matchesSubString, 'aaaaaaaaaaaaaaaaaaaax', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    });
    test('WordFilter', () => {
        filterOk(matchesWords, 'alpha', 'alpha', [{ start: 0, end: 5 }]);
        filterOk(matchesWords, 'alpha', 'alphasomething', [{ start: 0, end: 5 }]);
        filterNotOk(matchesWords, 'alpha', 'alp');
        filterOk(matchesWords, 'a', 'alpha', [{ start: 0, end: 1 }]);
        filterNotOk(matchesWords, 'x', 'alpha');
        filterOk(matchesWords, 'A', 'alpha', [{ start: 0, end: 1 }]);
        filterOk(matchesWords, 'AlPh', 'alPHA', [{ start: 0, end: 4 }]);
        assert(matchesWords('Debug Console', 'Open: Debug Console'));
        filterOk(matchesWords, 'gp', 'Git: Pull', [{ start: 0, end: 1 }, { start: 5, end: 6 }]);
        filterOk(matchesWords, 'g p', 'Git: Pull', [{ start: 0, end: 1 }, { start: 5, end: 6 }]);
        filterOk(matchesWords, 'gipu', 'Git: Pull', [{ start: 0, end: 2 }, { start: 5, end: 7 }]);
        filterOk(matchesWords, 'gp', 'Category: Git: Pull', [{ start: 10, end: 11 }, { start: 15, end: 16 }]);
        filterOk(matchesWords, 'g p', 'Category: Git: Pull', [{ start: 10, end: 11 }, { start: 15, end: 16 }]);
        filterOk(matchesWords, 'gipu', 'Category: Git: Pull', [{ start: 10, end: 12 }, { start: 15, end: 17 }]);
        filterNotOk(matchesWords, 'it', 'Git: Pull');
        filterNotOk(matchesWords, 'll', 'Git: Pull');
        filterOk(matchesWords, 'git: プル', 'git: プル', [{ start: 0, end: 7 }]);
        filterOk(matchesWords, 'git プル', 'git: プル', [{ start: 0, end: 3 }, { start: 5, end: 7 }]);
        filterOk(matchesWords, 'öäk', 'Öhm: Älles Klar', [{ start: 0, end: 1 }, { start: 5, end: 6 }, { start: 11, end: 12 }]);
        // Handles issue #123915
        filterOk(matchesWords, 'C++', 'C/C++: command', [{ start: 2, end: 5 }]);
        // Handles issue #154533
        filterOk(matchesWords, '.', ':', []);
        filterOk(matchesWords, '.', '.', [{ start: 0, end: 1 }]);
        // assert.ok(matchesWords('gipu', 'Category: Git: Pull', true) === null);
        // assert.deepStrictEqual(matchesWords('pu', 'Category: Git: Pull', true), [{ start: 15, end: 17 }]);
        filterOk(matchesWords, 'bar', 'foo-bar');
        filterOk(matchesWords, 'bar test', 'foo-bar test');
        filterOk(matchesWords, 'fbt', 'foo-bar test');
        filterOk(matchesWords, 'bar test', 'foo-bar (test)');
        filterOk(matchesWords, 'foo bar', 'foo (bar)');
        filterNotOk(matchesWords, 'bar est', 'foo-bar test');
        filterNotOk(matchesWords, 'fo ar', 'foo-bar test');
        filterNotOk(matchesWords, 'for', 'foo-bar test');
        filterOk(matchesWords, 'foo bar', 'foo-bar');
        filterOk(matchesWords, 'foo bar', '123 foo-bar 456');
        filterOk(matchesWords, 'foo-bar', 'foo bar');
        filterOk(matchesWords, 'foo:bar', 'foo:bar');
    });
    function assertMatches(pattern, word, decoratedWord, filter, opts = {}) {
        const r = filter(pattern, pattern.toLowerCase(), opts.patternPos || 0, word, word.toLowerCase(), opts.wordPos || 0, { firstMatchCanBeWeak: opts.firstMatchCanBeWeak ?? false, boostFullMatch: true });
        assert.ok(!decoratedWord === !r);
        if (r) {
            const matches = createMatches(r);
            let actualWord = '';
            let pos = 0;
            for (const match of matches) {
                actualWord += word.substring(pos, match.start);
                actualWord += '^' + word.substring(match.start, match.end).split('').join('^');
                pos = match.end;
            }
            actualWord += word.substring(pos);
            assert.strictEqual(actualWord, decoratedWord);
        }
    }
    test('fuzzyScore, #23215', function () {
        assertMatches('tit', 'win.tit', 'win.^t^i^t', fuzzyScore);
        assertMatches('title', 'win.title', 'win.^t^i^t^l^e', fuzzyScore);
        assertMatches('WordCla', 'WordCharacterClassifier', '^W^o^r^dCharacter^C^l^assifier', fuzzyScore);
        assertMatches('WordCCla', 'WordCharacterClassifier', '^W^o^r^d^Character^C^l^assifier', fuzzyScore);
    });
    test('fuzzyScore, #23332', function () {
        assertMatches('dete', '"editor.quickSuggestionsDelay"', undefined, fuzzyScore);
    });
    test('fuzzyScore, #23190', function () {
        assertMatches('c:\\do', '& \'C:\\Documents and Settings\'', '& \'^C^:^\\^D^ocuments and Settings\'', fuzzyScore);
        assertMatches('c:\\do', '& \'c:\\Documents and Settings\'', '& \'^c^:^\\^D^ocuments and Settings\'', fuzzyScore);
    });
    test('fuzzyScore, #23581', function () {
        assertMatches('close', 'css.lint.importStatement', '^css.^lint.imp^ort^Stat^ement', fuzzyScore);
        assertMatches('close', 'css.colorDecorators.enable', '^css.co^l^orDecorator^s.^enable', fuzzyScore);
        assertMatches('close', 'workbench.quickOpen.closeOnFocusOut', 'workbench.quickOpen.^c^l^o^s^eOnFocusOut', fuzzyScore);
        assertTopScore(fuzzyScore, 'close', 2, 'css.lint.importStatement', 'css.colorDecorators.enable', 'workbench.quickOpen.closeOnFocusOut');
    });
    test('fuzzyScore, #23458', function () {
        assertMatches('highlight', 'editorHoverHighlight', 'editorHover^H^i^g^h^l^i^g^h^t', fuzzyScore);
        assertMatches('hhighlight', 'editorHoverHighlight', 'editor^Hover^H^i^g^h^l^i^g^h^t', fuzzyScore);
        assertMatches('dhhighlight', 'editorHoverHighlight', undefined, fuzzyScore);
    });
    test('fuzzyScore, #23746', function () {
        assertMatches('-moz', '-moz-foo', '^-^m^o^z-foo', fuzzyScore);
        assertMatches('moz', '-moz-foo', '-^m^o^z-foo', fuzzyScore);
        assertMatches('moz', '-moz-animation', '-^m^o^z-animation', fuzzyScore);
        assertMatches('moza', '-moz-animation', '-^m^o^z-^animation', fuzzyScore);
    });
    test('fuzzyScore', () => {
        assertMatches('ab', 'abA', '^a^bA', fuzzyScore);
        assertMatches('ccm', 'cacmelCase', '^ca^c^melCase', fuzzyScore);
        assertMatches('bti', 'the_black_knight', undefined, fuzzyScore);
        assertMatches('ccm', 'camelCase', undefined, fuzzyScore);
        assertMatches('cmcm', 'camelCase', undefined, fuzzyScore);
        assertMatches('BK', 'the_black_knight', 'the_^black_^knight', fuzzyScore);
        assertMatches('KeyboardLayout=', 'KeyboardLayout', undefined, fuzzyScore);
        assertMatches('LLL', 'SVisualLoggerLogsList', 'SVisual^Logger^Logs^List', fuzzyScore);
        assertMatches('LLLL', 'SVilLoLosLi', undefined, fuzzyScore);
        assertMatches('LLLL', 'SVisualLoggerLogsList', undefined, fuzzyScore);
        assertMatches('TEdit', 'TextEdit', '^Text^E^d^i^t', fuzzyScore);
        assertMatches('TEdit', 'TextEditor', '^Text^E^d^i^tor', fuzzyScore);
        assertMatches('TEdit', 'Textedit', '^Text^e^d^i^t', fuzzyScore);
        assertMatches('TEdit', 'text_edit', '^text_^e^d^i^t', fuzzyScore);
        assertMatches('TEditDit', 'TextEditorDecorationType', '^Text^E^d^i^tor^Decorat^ion^Type', fuzzyScore);
        assertMatches('TEdit', 'TextEditorDecorationType', '^Text^E^d^i^torDecorationType', fuzzyScore);
        assertMatches('Tedit', 'TextEdit', '^Text^E^d^i^t', fuzzyScore);
        assertMatches('ba', '?AB?', undefined, fuzzyScore);
        assertMatches('bkn', 'the_black_knight', 'the_^black_^k^night', fuzzyScore);
        assertMatches('bt', 'the_black_knight', 'the_^black_knigh^t', fuzzyScore);
        assertMatches('ccm', 'camelCasecm', '^camel^Casec^m', fuzzyScore);
        assertMatches('fdm', 'findModel', '^fin^d^Model', fuzzyScore);
        assertMatches('fob', 'foobar', '^f^oo^bar', fuzzyScore);
        assertMatches('fobz', 'foobar', undefined, fuzzyScore);
        assertMatches('foobar', 'foobar', '^f^o^o^b^a^r', fuzzyScore);
        assertMatches('form', 'editor.formatOnSave', 'editor.^f^o^r^matOnSave', fuzzyScore);
        assertMatches('g p', 'Git: Pull', '^Git:^ ^Pull', fuzzyScore);
        assertMatches('g p', 'Git: Pull', '^Git:^ ^Pull', fuzzyScore);
        assertMatches('gip', 'Git: Pull', '^G^it: ^Pull', fuzzyScore);
        assertMatches('gip', 'Git: Pull', '^G^it: ^Pull', fuzzyScore);
        assertMatches('gp', 'Git: Pull', '^Git: ^Pull', fuzzyScore);
        assertMatches('gp', 'Git_Git_Pull', '^Git_Git_^Pull', fuzzyScore);
        assertMatches('is', 'ImportStatement', '^Import^Statement', fuzzyScore);
        assertMatches('is', 'isValid', '^i^sValid', fuzzyScore);
        assertMatches('lowrd', 'lowWord', '^l^o^wWo^r^d', fuzzyScore);
        assertMatches('myvable', 'myvariable', '^m^y^v^aria^b^l^e', fuzzyScore);
        assertMatches('no', '', undefined, fuzzyScore);
        assertMatches('no', 'match', undefined, fuzzyScore);
        assertMatches('ob', 'foobar', undefined, fuzzyScore);
        assertMatches('sl', 'SVisualLoggerLogsList', '^SVisual^LoggerLogsList', fuzzyScore);
        assertMatches('sllll', 'SVisualLoggerLogsList', '^SVisua^l^Logger^Logs^List', fuzzyScore);
        assertMatches('Three', 'HTMLHRElement', undefined, fuzzyScore);
        assertMatches('Three', 'Three', '^T^h^r^e^e', fuzzyScore);
        assertMatches('fo', 'barfoo', undefined, fuzzyScore);
        assertMatches('fo', 'bar_foo', 'bar_^f^oo', fuzzyScore);
        assertMatches('fo', 'bar_Foo', 'bar_^F^oo', fuzzyScore);
        assertMatches('fo', 'bar foo', 'bar ^f^oo', fuzzyScore);
        assertMatches('fo', 'bar.foo', 'bar.^f^oo', fuzzyScore);
        assertMatches('fo', 'bar/foo', 'bar/^f^oo', fuzzyScore);
        assertMatches('fo', 'bar\\foo', 'bar\\^f^oo', fuzzyScore);
    });
    test('fuzzyScore (first match can be weak)', function () {
        assertMatches('Three', 'HTMLHRElement', 'H^TML^H^R^El^ement', fuzzyScore, { firstMatchCanBeWeak: true });
        assertMatches('tor', 'constructor', 'construc^t^o^r', fuzzyScore, { firstMatchCanBeWeak: true });
        assertMatches('ur', 'constructor', 'constr^ucto^r', fuzzyScore, { firstMatchCanBeWeak: true });
        assertTopScore(fuzzyScore, 'tor', 2, 'constructor', 'Thor', 'cTor');
    });
    test('fuzzyScore, many matches', function () {
        assertMatches('aaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '^a^a^a^a^a^aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', fuzzyScore);
    });
    test('Freeze when fjfj -> jfjf, https://github.com/microsoft/vscode/issues/91807', function () {
        assertMatches('jfjfj', 'fjfjfjfjfjfjfjfjfjfjfj', undefined, fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfj', 'fjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', undefined, fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfjjfjfjfjfjfjfjfjfjfj', 'fjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', undefined, fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfj', 'fJfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', 'f^J^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^jfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', // strong match
        fuzzyScore);
        assertMatches('jfjfjfjfjfjfjfjfjfj', 'fjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', 'f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^j^f^jfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfj', // any match
        fuzzyScore, { firstMatchCanBeWeak: true });
    });
    test('fuzzyScore, issue #26423', function () {
        assertMatches('baba', 'abababab', undefined, fuzzyScore);
        assertMatches('fsfsfs', 'dsafdsafdsafdsafdsafdsafdsafasdfdsa', undefined, fuzzyScore);
        assertMatches('fsfsfsfsfsfsfsf', 'dsafdsafdsafdsafdsafdsafdsafasdfdsafdsafdsafdsafdsfdsafdsfdfdfasdnfdsajfndsjnafjndsajlknfdsa', undefined, fuzzyScore);
    });
    test('Fuzzy IntelliSense matching vs Haxe metadata completion, #26995', function () {
        assertMatches('f', ':Foo', ':^Foo', fuzzyScore);
        assertMatches('f', ':foo', ':^foo', fuzzyScore);
    });
    test('Separator only match should not be weak #79558', function () {
        assertMatches('.', 'foo.bar', 'foo^.bar', fuzzyScore);
    });
    test('Cannot set property \'1\' of undefined, #26511', function () {
        const word = new Array(123).join('a');
        const pattern = new Array(120).join('a');
        fuzzyScore(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0);
        assert.ok(true); // must not explode
    });
    test('Vscode 1.12 no longer obeys \'sortText\' in completion items (from language server), #26096', function () {
        assertMatches('  ', '  group', undefined, fuzzyScore, { patternPos: 2 });
        assertMatches('  g', '  group', '  ^group', fuzzyScore, { patternPos: 2 });
        assertMatches('g', '  group', '  ^group', fuzzyScore);
        assertMatches('g g', '  groupGroup', undefined, fuzzyScore);
        assertMatches('g g', '  group Group', '  ^group^ ^Group', fuzzyScore);
        assertMatches(' g g', '  group Group', '  ^group^ ^Group', fuzzyScore, { patternPos: 1 });
        assertMatches('zz', 'zzGroup', '^z^zGroup', fuzzyScore);
        assertMatches('zzg', 'zzGroup', '^z^z^Group', fuzzyScore);
        assertMatches('g', 'zzGroup', 'zz^Group', fuzzyScore);
    });
    test('patternPos isn\'t working correctly #79815', function () {
        assertMatches(':p'.substr(1), 'prop', '^prop', fuzzyScore, { patternPos: 0 });
        assertMatches(':p', 'prop', '^prop', fuzzyScore, { patternPos: 1 });
        assertMatches(':p', 'prop', undefined, fuzzyScore, { patternPos: 2 });
        assertMatches(':p', 'proP', 'pro^P', fuzzyScore, { patternPos: 1, wordPos: 1 });
        assertMatches(':p', 'aprop', 'a^prop', fuzzyScore, { patternPos: 1, firstMatchCanBeWeak: true });
        assertMatches(':p', 'aprop', undefined, fuzzyScore, { patternPos: 1, firstMatchCanBeWeak: false });
    });
    function assertTopScore(filter, pattern, expected, ...words) {
        let topScore = -(100 * 10);
        let topIdx = 0;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const m = filter(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0);
            if (m) {
                const [score] = m;
                if (score > topScore) {
                    topScore = score;
                    topIdx = i;
                }
            }
        }
        assert.strictEqual(topIdx, expected, `${pattern} -> actual=${words[topIdx]} <> expected=${words[expected]}`);
    }
    test('topScore - fuzzyScore', function () {
        assertTopScore(fuzzyScore, 'cons', 2, 'ArrayBufferConstructor', 'Console', 'console');
        assertTopScore(fuzzyScore, 'Foo', 1, 'foo', 'Foo', 'foo');
        // #24904
        assertTopScore(fuzzyScore, 'onMess', 1, 'onmessage', 'onMessage', 'onThisMegaEscape');
        assertTopScore(fuzzyScore, 'CC', 1, 'camelCase', 'CamelCase');
        assertTopScore(fuzzyScore, 'cC', 0, 'camelCase', 'CamelCase');
        // assertTopScore(fuzzyScore, 'cC', 1, 'ccfoo', 'camelCase');
        // assertTopScore(fuzzyScore, 'cC', 1, 'ccfoo', 'camelCase', 'foo-cC-bar');
        // issue #17836
        // assertTopScore(fuzzyScore, 'TEdit', 1, 'TextEditorDecorationType', 'TextEdit', 'TextEditor');
        assertTopScore(fuzzyScore, 'p', 4, 'parse', 'posix', 'pafdsa', 'path', 'p');
        assertTopScore(fuzzyScore, 'pa', 0, 'parse', 'pafdsa', 'path');
        // issue #14583
        assertTopScore(fuzzyScore, 'log', 3, 'HTMLOptGroupElement', 'ScrollLogicalPosition', 'SVGFEMorphologyElement', 'log', 'logger');
        assertTopScore(fuzzyScore, 'e', 2, 'AbstractWorker', 'ActiveXObject', 'else');
        // issue #14446
        assertTopScore(fuzzyScore, 'workbench.sideb', 1, 'workbench.editor.defaultSideBySideLayout', 'workbench.sideBar.location');
        // issue #11423
        assertTopScore(fuzzyScore, 'editor.r', 2, 'diffEditor.renderSideBySide', 'editor.overviewRulerlanes', 'editor.renderControlCharacter', 'editor.renderWhitespace');
        // assertTopScore(fuzzyScore, 'editor.R', 1, 'diffEditor.renderSideBySide', 'editor.overviewRulerlanes', 'editor.renderControlCharacter', 'editor.renderWhitespace');
        // assertTopScore(fuzzyScore, 'Editor.r', 0, 'diffEditor.renderSideBySide', 'editor.overviewRulerlanes', 'editor.renderControlCharacter', 'editor.renderWhitespace');
        assertTopScore(fuzzyScore, '-mo', 1, '-ms-ime-mode', '-moz-columns');
        // dupe, issue #14861
        assertTopScore(fuzzyScore, 'convertModelPosition', 0, 'convertModelPositionToViewPosition', 'convertViewToModelPosition');
        // dupe, issue #14942
        assertTopScore(fuzzyScore, 'is', 0, 'isValidViewletId', 'import statement');
        assertTopScore(fuzzyScore, 'title', 1, 'files.trimTrailingWhitespace', 'window.title');
        assertTopScore(fuzzyScore, 'const', 1, 'constructor', 'const', 'cuOnstrul');
    });
    test('Unexpected suggestion scoring, #28791', function () {
        assertTopScore(fuzzyScore, '_lines', 1, '_lineStarts', '_lines');
        assertTopScore(fuzzyScore, '_lines', 1, '_lineS', '_lines');
        assertTopScore(fuzzyScore, '_lineS', 0, '_lineS', '_lines');
    });
    test.skip('Bad completion ranking changes valid variable name to class name when pressing "." #187055', function () {
        assertTopScore(fuzzyScore, 'a', 1, 'A', 'a');
        assertTopScore(fuzzyScore, 'theme', 1, 'Theme', 'theme');
    });
    test('HTML closing tag proposal filtered out #38880', function () {
        assertMatches('\t\t<', '\t\t</body>', '^\t^\t^</body>', fuzzyScore, { patternPos: 0 });
        assertMatches('\t\t<', '\t\t</body>', '\t\t^</body>', fuzzyScore, { patternPos: 2 });
        assertMatches('\t<', '\t</body>', '\t^</body>', fuzzyScore, { patternPos: 1 });
    });
    test('fuzzyScoreGraceful', () => {
        assertMatches('rlut', 'result', undefined, fuzzyScore);
        assertMatches('rlut', 'result', '^res^u^l^t', fuzzyScoreGraceful);
        assertMatches('cno', 'console', '^co^ns^ole', fuzzyScore);
        assertMatches('cno', 'console', '^co^ns^ole', fuzzyScoreGraceful);
        assertMatches('cno', 'console', '^c^o^nsole', fuzzyScoreGracefulAggressive);
        assertMatches('cno', 'co_new', '^c^o_^new', fuzzyScoreGraceful);
        assertMatches('cno', 'co_new', '^c^o_^new', fuzzyScoreGracefulAggressive);
    });
    test('List highlight filter: Not all characters from match are highlighterd #66923', () => {
        assertMatches('foo', 'barbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', 'barbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_^f^o^o', fuzzyScore);
    });
    test('Autocompletion is matched against truncated filterText to 54 characters #74133', () => {
        assertMatches('foo', 'ffffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', 'ffffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_^f^o^o', fuzzyScore);
        assertMatches('Aoo', 'Affffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', '^Affffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_f^o^o', fuzzyScore);
        assertMatches('foo', 'Gffffffffffffffffffffffffffffbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbarbar_foo', undefined, fuzzyScore);
    });
    test('"Go to Symbol" with the exact method name doesn\'t work as expected #84787', function () {
        const match = fuzzyScore(':get', ':get', 1, 'get', 'get', 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
        assert.ok(Boolean(match));
    });
    test('Wrong highlight after emoji #113404', function () {
        assertMatches('di', '✨div classname=""></div>', '✨^d^iv classname=""></div>', fuzzyScore);
        assertMatches('di', 'adiv classname=""></div>', 'adiv classname=""></^d^iv>', fuzzyScore);
    });
    test('Suggestion is not highlighted #85826', function () {
        assertMatches('SemanticTokens', 'SemanticTokensEdits', '^S^e^m^a^n^t^i^c^T^o^k^e^n^sEdits', fuzzyScore);
        assertMatches('SemanticTokens', 'SemanticTokensEdits', '^S^e^m^a^n^t^i^c^T^o^k^e^n^sEdits', fuzzyScoreGracefulAggressive);
    });
    test('IntelliSense completion not correctly highlighting text in front of cursor #115250', function () {
        assertMatches('lo', 'log', '^l^og', fuzzyScore);
        assertMatches('.lo', 'log', '^l^og', anyScore);
        assertMatches('.', 'log', 'log', anyScore);
    });
    test('anyScore should not require a strong first match', function () {
        assertMatches('bar', 'foobAr', 'foo^b^A^r', anyScore);
        assertMatches('bar', 'foobar', 'foo^b^a^r', anyScore);
    });
    test('configurable full match boost', function () {
        const prefix = 'create';
        const a = 'createModelServices';
        const b = 'create';
        let aBoost = fuzzyScore(prefix, prefix, 0, a, a.toLowerCase(), 0, { boostFullMatch: true, firstMatchCanBeWeak: true });
        let bBoost = fuzzyScore(prefix, prefix, 0, b, b.toLowerCase(), 0, { boostFullMatch: true, firstMatchCanBeWeak: true });
        assert.ok(aBoost);
        assert.ok(bBoost);
        assert.ok(aBoost[0] < bBoost[0]);
        // also works with wordStart > 0 (https://github.com/microsoft/vscode/issues/187921)
        const wordPrefix = '$(symbol-function) ';
        aBoost = fuzzyScore(prefix, prefix, 0, `${wordPrefix}${a}`, `${wordPrefix}${a}`.toLowerCase(), wordPrefix.length, { boostFullMatch: true, firstMatchCanBeWeak: true });
        bBoost = fuzzyScore(prefix, prefix, 0, `${wordPrefix}${b}`, `${wordPrefix}${b}`.toLowerCase(), wordPrefix.length, { boostFullMatch: true, firstMatchCanBeWeak: true });
        assert.ok(aBoost);
        assert.ok(bBoost);
        assert.ok(aBoost[0] < bBoost[0]);
        const aScore = fuzzyScore(prefix, prefix, 0, a, a.toLowerCase(), 0, { boostFullMatch: false, firstMatchCanBeWeak: true });
        const bScore = fuzzyScore(prefix, prefix, 0, b, b.toLowerCase(), 0, { boostFullMatch: false, firstMatchCanBeWeak: true });
        assert.ok(aScore);
        assert.ok(bScore);
        assert.ok(aScore[0] === bScore[0]);
    });
    test('Unexpected suggest highlighting ignores whole word match in favor of matching first letter#147423', function () {
        assertMatches('i', 'machine/{id}', 'machine/{^id}', fuzzyScore);
        assertMatches('ok', 'obobobf{ok}/user', '^obobobf{o^k}/user', fuzzyScore);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9maWx0ZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSw0QkFBNEIsRUFBZ0MsZ0JBQWdCLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNwUixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsU0FBUyxRQUFRLENBQUMsTUFBZSxFQUFFLElBQVksRUFBRSxrQkFBMEIsRUFBRSxVQUE2QztJQUN6SCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDM0MsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksaUJBQWlCLGtCQUFrQixFQUFFLENBQUMsQ0FBQztJQUN4RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsTUFBZSxFQUFFLElBQVksRUFBRSxrQkFBMEI7SUFDN0UsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLEdBQUcsSUFBSSxZQUFZLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUNwRixDQUFDO0FBRUQsS0FBSyxDQUFDLFNBQVMsRUFB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