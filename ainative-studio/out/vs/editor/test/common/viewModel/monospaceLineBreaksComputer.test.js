/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditorOptions } from '../../../common/config/editorOptions.js';
import { FontInfo } from '../../../common/config/fontInfo.js';
import { ModelLineProjectionData } from '../../../common/modelLineProjectionData.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
function parseAnnotatedText(annotatedText) {
    let text = '';
    let currentLineIndex = 0;
    const indices = [];
    for (let i = 0, len = annotatedText.length; i < len; i++) {
        if (annotatedText.charAt(i) === '|') {
            currentLineIndex++;
        }
        else {
            text += annotatedText.charAt(i);
            indices[text.length - 1] = currentLineIndex;
        }
    }
    return { text: text, indices: indices };
}
function toAnnotatedText(text, lineBreakData) {
    // Insert line break markers again, according to algorithm
    let actualAnnotatedText = '';
    if (lineBreakData) {
        let previousLineIndex = 0;
        for (let i = 0, len = text.length; i < len; i++) {
            const r = lineBreakData.translateToOutputPosition(i);
            if (previousLineIndex !== r.outputLineIndex) {
                previousLineIndex = r.outputLineIndex;
                actualAnnotatedText += '|';
            }
            actualAnnotatedText += text.charAt(i);
        }
    }
    else {
        // No wrapping
        actualAnnotatedText = text;
    }
    return actualAnnotatedText;
}
function getLineBreakData(factory, tabSize, breakAfter, columnsForFullWidthChar, wrappingIndent, wordBreak, text, previousLineBreakData) {
    const fontInfo = new FontInfo({
        pixelRatio: 1,
        fontFamily: 'testFontFamily',
        fontWeight: 'normal',
        fontSize: 14,
        fontFeatureSettings: '',
        fontVariationSettings: '',
        lineHeight: 19,
        letterSpacing: 0,
        isMonospace: true,
        typicalHalfwidthCharacterWidth: 7,
        typicalFullwidthCharacterWidth: 7 * columnsForFullWidthChar,
        canUseHalfwidthRightwardsArrow: true,
        spaceWidth: 7,
        middotWidth: 7,
        wsmiddotWidth: 7,
        maxDigitWidth: 7
    }, false);
    const lineBreaksComputer = factory.createLineBreaksComputer(fontInfo, tabSize, breakAfter, wrappingIndent, wordBreak);
    const previousLineBreakDataClone = previousLineBreakData ? new ModelLineProjectionData(null, null, previousLineBreakData.breakOffsets.slice(0), previousLineBreakData.breakOffsetsVisibleColumn.slice(0), previousLineBreakData.wrappedTextIndentLength) : null;
    lineBreaksComputer.addRequest(text, null, previousLineBreakDataClone);
    return lineBreaksComputer.finalize()[0];
}
function assertLineBreaks(factory, tabSize, breakAfter, annotatedText, wrappingIndent = 0 /* WrappingIndent.None */, wordBreak = 'normal') {
    // Create version of `annotatedText` with line break markers removed
    const text = parseAnnotatedText(annotatedText).text;
    const lineBreakData = getLineBreakData(factory, tabSize, breakAfter, 2, wrappingIndent, wordBreak, text, null);
    const actualAnnotatedText = toAnnotatedText(text, lineBreakData);
    assert.strictEqual(actualAnnotatedText, annotatedText);
    return lineBreakData;
}
suite('Editor ViewModel - MonospaceLineBreaksComputer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('MonospaceLineBreaksComputer', () => {
        const factory = new MonospaceLineBreaksComputerFactory('(', '\t).');
        // Empty string
        assertLineBreaks(factory, 4, 5, '');
        // No wrapping if not necessary
        assertLineBreaks(factory, 4, 5, 'aaa');
        assertLineBreaks(factory, 4, 5, 'aaaaa');
        assertLineBreaks(factory, 4, -1, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        // Acts like hard wrapping if no char found
        assertLineBreaks(factory, 4, 5, 'aaaaa|a');
        // Honors wrapping character
        assertLineBreaks(factory, 4, 5, 'aaaaa|.');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a.|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a..|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a...|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a....|aaa.|aa');
        // Honors tabs when computing wrapping position
        assertLineBreaks(factory, 4, 5, '\t');
        assertLineBreaks(factory, 4, 5, '\t|aaa');
        assertLineBreaks(factory, 4, 5, '\t|a\t|aa');
        assertLineBreaks(factory, 4, 5, 'aa\ta');
        assertLineBreaks(factory, 4, 5, 'aa\t|aa');
        // Honors wrapping before characters (& gives it priority)
        assertLineBreaks(factory, 4, 5, 'aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaa(.|aa');
        // Honors wrapping after characters (& gives it priority)
        assertLineBreaks(factory, 4, 5, 'aaa))|).aaa');
        assertLineBreaks(factory, 4, 5, 'aaa))|).|aaaa');
        assertLineBreaks(factory, 4, 5, 'aaa)|().|aaa');
        assertLineBreaks(factory, 4, 5, 'aaa|(().|aaa');
        assertLineBreaks(factory, 4, 5, 'aa.|(().|aaa');
        assertLineBreaks(factory, 4, 5, 'aa.|(.).|aaa');
    });
    function assertLineBreakDataEqual(a, b) {
        if (!a || !b) {
            assert.deepStrictEqual(a, b);
            return;
        }
        assert.deepStrictEqual(a.breakOffsets, b.breakOffsets);
        assert.deepStrictEqual(a.wrappedTextIndentLength, b.wrappedTextIndentLength);
        for (let i = 0; i < a.breakOffsetsVisibleColumn.length; i++) {
            const diff = a.breakOffsetsVisibleColumn[i] - b.breakOffsetsVisibleColumn[i];
            assert.ok(diff < 0.001);
        }
    }
    function assertIncrementalLineBreaks(factory, text, tabSize, breakAfter1, annotatedText1, breakAfter2, annotatedText2, wrappingIndent = 0 /* WrappingIndent.None */, columnsForFullWidthChar = 2) {
        // sanity check the test
        assert.strictEqual(text, parseAnnotatedText(annotatedText1).text);
        assert.strictEqual(text, parseAnnotatedText(annotatedText2).text);
        // check that the direct mapping is ok for 1
        const directLineBreakData1 = getLineBreakData(factory, tabSize, breakAfter1, columnsForFullWidthChar, wrappingIndent, 'normal', text, null);
        assert.strictEqual(toAnnotatedText(text, directLineBreakData1), annotatedText1);
        // check that the direct mapping is ok for 2
        const directLineBreakData2 = getLineBreakData(factory, tabSize, breakAfter2, columnsForFullWidthChar, wrappingIndent, 'normal', text, null);
        assert.strictEqual(toAnnotatedText(text, directLineBreakData2), annotatedText2);
        // check that going from 1 to 2 is ok
        const lineBreakData2from1 = getLineBreakData(factory, tabSize, breakAfter2, columnsForFullWidthChar, wrappingIndent, 'normal', text, directLineBreakData1);
        assert.strictEqual(toAnnotatedText(text, lineBreakData2from1), annotatedText2);
        assertLineBreakDataEqual(lineBreakData2from1, directLineBreakData2);
        // check that going from 2 to 1 is ok
        const lineBreakData1from2 = getLineBreakData(factory, tabSize, breakAfter1, columnsForFullWidthChar, wrappingIndent, 'normal', text, directLineBreakData2);
        assert.strictEqual(toAnnotatedText(text, lineBreakData1from2), annotatedText1);
        assertLineBreakDataEqual(lineBreakData1from2, directLineBreakData1);
    }
    test('MonospaceLineBreaksComputer incremental 1', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, 'just some text and more', 4, 10, 'just some |text and |more', 15, 'just some text |and more');
        assertIncrementalLineBreaks(factory, 'Cu scripserit suscipiantur eos, in affert pericula contentiones sed, cetero sanctus et pro. Ius vidit magna regione te, sit ei elaboraret liberavisse. Mundi verear eu mea, eam vero scriptorem in, vix in menandri assueverit. Natum definiebas cu vim. Vim doming vocibus efficiantur id. In indoctum deseruisse voluptatum vim, ad debitis verterem sed.', 4, 47, 'Cu scripserit suscipiantur eos, in affert |pericula contentiones sed, cetero sanctus et |pro. Ius vidit magna regione te, sit ei |elaboraret liberavisse. Mundi verear eu mea, |eam vero scriptorem in, vix in menandri |assueverit. Natum definiebas cu vim. Vim |doming vocibus efficiantur id. In indoctum |deseruisse voluptatum vim, ad debitis verterem |sed.', 142, 'Cu scripserit suscipiantur eos, in affert pericula contentiones sed, cetero sanctus et pro. Ius vidit magna regione te, sit ei elaboraret |liberavisse. Mundi verear eu mea, eam vero scriptorem in, vix in menandri assueverit. Natum definiebas cu vim. Vim doming vocibus efficiantur |id. In indoctum deseruisse voluptatum vim, ad debitis verterem sed.');
        assertIncrementalLineBreaks(factory, 'An his legere persecuti, oblique delicata efficiantur ex vix, vel at graecis officiis maluisset. Et per impedit voluptua, usu discere maiorum at. Ut assum ornatus temporibus vis, an sea melius pericula. Ea dicunt oblique phaedrum nam, eu duo movet nobis. His melius facilis eu, vim malorum temporibus ne. Nec no sale regione, meliore civibus placerat id eam. Mea alii fabulas definitionem te, agam volutpat ad vis, et per bonorum nonumes repudiandae.', 4, 57, 'An his legere persecuti, oblique delicata efficiantur ex |vix, vel at graecis officiis maluisset. Et per impedit |voluptua, usu discere maiorum at. Ut assum ornatus |temporibus vis, an sea melius pericula. Ea dicunt |oblique phaedrum nam, eu duo movet nobis. His melius |facilis eu, vim malorum temporibus ne. Nec no sale |regione, meliore civibus placerat id eam. Mea alii |fabulas definitionem te, agam volutpat ad vis, et per |bonorum nonumes repudiandae.', 58, 'An his legere persecuti, oblique delicata efficiantur ex |vix, vel at graecis officiis maluisset. Et per impedit |voluptua, usu discere maiorum at. Ut assum ornatus |temporibus vis, an sea melius pericula. Ea dicunt oblique |phaedrum nam, eu duo movet nobis. His melius facilis eu, |vim malorum temporibus ne. Nec no sale regione, meliore |civibus placerat id eam. Mea alii fabulas definitionem |te, agam volutpat ad vis, et per bonorum nonumes |repudiandae.');
        assertIncrementalLineBreaks(factory, '\t\t"owner": "vscode",', 4, 14, '\t\t"owner|": |"vscod|e",', 16, '\t\t"owner":| |"vscode"|,', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇&👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 4, 51, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇&|👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 50, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇|&|👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '🐇👬&🌞🌖', 4, 5, '🐇👬&|🌞🌖', 4, '🐇👬|&|🌞🌖', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '\t\tfunc(\'🌞🏇🍼🌞🏇🍼🐇&👬🌖🌞👬🌖🌞🏇🍼🐇👬\', WrappingIndent.Same);', 4, 26, '\t\tfunc|(\'🌞🏇🍼🌞🏇🍼🐇&|👬🌖🌞👬🌖🌞🏇🍼🐇|👬\', |WrappingIndent.|Same);', 27, '\t\tfunc|(\'🌞🏇🍼🌞🏇🍼🐇&|👬🌖🌞👬🌖🌞🏇🍼🐇|👬\', |WrappingIndent.|Same);', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, 'factory, "xtxtfunc(x"🌞🏇🍼🌞🏇🍼🐇&👬🌖🌞👬🌖🌞🏇🍼🐇👬x"', 4, 16, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼|🐇&|👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 17, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼🐇|&👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 1 /* WrappingIndent.Same */);
    });
    test('issue #95686: CRITICAL: loop forever on the monospaceLineBreaksComputer', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, '						<tr dmx-class:table-danger="(alt <= 50)" dmx-class:table-warning="(alt <= 200)" dmx-class:table-primary="(alt <= 400)" dmx-class:table-info="(alt <= 800)" dmx-class:table-success="(alt >= 400)">', 4, 179, '						<tr dmx-class:table-danger="(alt <= 50)" dmx-class:table-warning="(alt <= 200)" dmx-class:table-primary="(alt <= 400)" dmx-class:table-info="(alt <= 800)" |dmx-class:table-success="(alt >= 400)">', 1, '	|	|	|	|	|	|<|t|r| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|d|a|n|g|e|r|=|"|(|a|l|t| |<|=| |5|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|w|a|r|n|i|n|g|=|"|(|a|l|t| |<|=| |2|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|p|r|i|m|a|r|y|=|"|(|a|l|t| |<|=| |4|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|i|n|f|o|=|"|(|a|l|t| |<|=| |8|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|s|u|c|c|e|s|s|=|"|(|a|l|t| |>|=| |4|0|0|)|"|>', 1 /* WrappingIndent.Same */);
    });
    test('issue #110392: Occasional crash when resize with panel on the right', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, '你好 **hello** **hello** **hello-world** hey there!', 4, 15, '你好 **hello** |**hello** |**hello-world**| hey there!', 1, '你|好| |*|*|h|e|l|l|o|*|*| |*|*|h|e|l|l|o|*|*| |*|*|h|e|l|l|o|-|w|o|r|l|d|*|*| |h|e|y| |t|h|e|r|e|!', 1 /* WrappingIndent.Same */, 1.6605405405405405);
    });
    test('MonospaceLineBreaksComputer - CJK and Kinsoku Shori', () => {
        const factory = new MonospaceLineBreaksComputerFactory('(', '\t)');
        assertLineBreaks(factory, 4, 5, 'aa \u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, '\u3042 \u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, '\u3042\u3042|\u5b89\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa |\u5b89)\u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa \u3042|\u5b89\u3042)|\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa |(\u5b89aa|\u5b89');
    });
    test('MonospaceLineBreaksComputer - WrappingIndent.Same', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        assertLineBreaks(factory, 4, 38, ' *123456789012345678901234567890123456|7890', 1 /* WrappingIndent.Same */);
    });
    test('issue #16332: Scroll bar overlaying on top of text', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        assertLineBreaks(factory, 4, 24, 'a/ very/long/line/of/tex|t/that/expands/beyon|d/your/typical/line/|of/code/', 2 /* WrappingIndent.Indent */);
    });
    test('issue #35162: wrappingIndent not consistently working', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        const mapper = assertLineBreaks(factory, 4, 24, '                t h i s |i s |a l |o n |g l |i n |e', 2 /* WrappingIndent.Indent */);
        assert.strictEqual(mapper.wrappedTextIndentLength, '                    '.length);
    });
    test('issue #75494: surrogate pairs', () => {
        const factory = new MonospaceLineBreaksComputerFactory('\t', ' ');
        assertLineBreaks(factory, 4, 49, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼|🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼|🐇👬', 1 /* WrappingIndent.Same */);
    });
    test('issue #75494: surrogate pairs overrun 1', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 4, '🐇👬|&|🌞🌖', 1 /* WrappingIndent.Same */);
    });
    test('issue #75494: surrogate pairs overrun 2', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 17, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼🐇|&👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 1 /* WrappingIndent.Same */);
    });
    test('MonospaceLineBreaksComputer - WrappingIndent.DeepIndent', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        const mapper = assertLineBreaks(factory, 4, 26, '        W e A r e T e s t |i n g D e |e p I n d |e n t a t |i o n', 3 /* WrappingIndent.DeepIndent */);
        assert.strictEqual(mapper.wrappedTextIndentLength, '                '.length);
    });
    test('issue #33366: Word wrap algorithm behaves differently around punctuation', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 23, 'this is a line of |text, text that sits |on a line', 1 /* WrappingIndent.Same */);
    });
    test('issue #152773: Word wrap algorithm behaves differently with bracket followed by comma', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 24, 'this is a line of |(text), text that sits |on a line', 1 /* WrappingIndent.Same */);
    });
    test('issue #112382: Word wrap doesn\'t work well with control characters', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 6, '\x06\x06\x06|\x06\x06\x06', 1 /* WrappingIndent.Same */);
    });
    test('Word break work well with Chinese/Japanese/Korean (CJK) text when setting normal', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 5, '你好|1111', 1 /* WrappingIndent.Same */, 'normal');
    });
    test('Word break work well with Chinese/Japanese/Korean (CJK) text when setting keepAll', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 8, '你好1111', 1 /* WrappingIndent.Same */, 'keepAll');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vdmlld01vZGVsL21vbm9zcGFjZUxpbmVCcmVha3NDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLHlDQUF5QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQThCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakgsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFOUcsU0FBUyxrQkFBa0IsQ0FBQyxhQUFxQjtJQUNoRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7SUFDZCxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUN6QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3BCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMs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