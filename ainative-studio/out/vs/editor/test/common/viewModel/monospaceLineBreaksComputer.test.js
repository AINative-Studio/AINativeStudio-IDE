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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3ZpZXdNb2RlbC9tb25vc3BhY2VMaW5lQnJlYWtzQ29tcHV0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUE4Qix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTlHLFNBQVMsa0JBQWtCLENBQUMsYUFBcUI7SUFDaEQsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2QsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7SUFDekIsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMxRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDckMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNwQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hD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