/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestDecoder } from '../utils/testDecoder.js';
import { Range } from '../../../common/core/range.js';
import { newWriteableStream } from '../../../../base/common/stream.js';
import { Tab } from '../../../common/codecs/simpleCodec/tokens/tab.js';
import { Word } from '../../../common/codecs/simpleCodec/tokens/word.js';
import { Dash } from '../../../common/codecs/simpleCodec/tokens/dash.js';
import { Space } from '../../../common/codecs/simpleCodec/tokens/space.js';
import { NewLine } from '../../../common/codecs/linesCodec/tokens/newLine.js';
import { FormFeed } from '../../../common/codecs/simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../../common/codecs/simpleCodec/tokens/verticalTab.js';
import { MarkdownLink } from '../../../common/codecs/markdownCodec/tokens/markdownLink.js';
import { CarriageReturn } from '../../../common/codecs/linesCodec/tokens/carriageReturn.js';
import { MarkdownImage } from '../../../common/codecs/markdownCodec/tokens/markdownImage.js';
import { ExclamationMark } from '../../../common/codecs/simpleCodec/tokens/exclamationMark.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MarkdownComment } from '../../../common/codecs/markdownCodec/tokens/markdownComment.js';
import { LeftBracket, RightBracket } from '../../../common/codecs/simpleCodec/tokens/brackets.js';
import { MarkdownDecoder } from '../../../common/codecs/markdownCodec/markdownDecoder.js';
import { LeftParenthesis, RightParenthesis } from '../../../common/codecs/simpleCodec/tokens/parentheses.js';
import { LeftAngleBracket, RightAngleBracket } from '../../../common/codecs/simpleCodec/tokens/angleBrackets.js';
/**
 * A reusable test utility that asserts that a `TestMarkdownDecoder` instance
 * correctly decodes `inputData` into a stream of `TMarkdownToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestMarkdownDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello [world](/etc/hosts)!',
 *   [
 *     new Space(new Range(1, 1, 1, 2)),
 *     new Word(new Range(1, 2, 1, 7), 'hello'),
 *     new Space(new Range(1, 7, 1, 8)),
 *     new MarkdownLink(1, 8, '[world]', '(/etc/hosts)'),
 *     new Word(new Range(1, 27, 1, 28), '!'),
 *     new NewLine(new Range(1, 28, 1, 29)),
 *   ],
 * );
 */
export class TestMarkdownDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        super(stream, new MarkdownDecoder(stream));
    }
}
suite('MarkdownDecoder', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('• general', () => {
        test('• base cases', async () => {
            const test = testDisposables.add(new TestMarkdownDecoder());
            await test.run([
                // basic text
                ' hello world',
                // text with markdown link and special characters in the filename
                'how are\t you [caption text](./some/file/path/refer🎨nce.md)?\v',
                // empty line
                '',
                // markdown link with special characters in the link caption and path
                '[(example!)](another/path/with[-and-]-chars/folder)\t ',
                // markdown link `#file` variable in the caption and with absolute path
                '\t[#file:something.txt](/absolute/path/to/something.txt)',
                // text with a commented out markdown link
                '\v\f machines must <!-- [computer rights](/do/not/exist) --> suffer',
            ], [
                // first line
                new Space(new Range(1, 1, 1, 2)),
                new Word(new Range(1, 2, 1, 7), 'hello'),
                new Space(new Range(1, 7, 1, 8)),
                new Word(new Range(1, 8, 1, 13), 'world'),
                new NewLine(new Range(1, 13, 1, 14)),
                // second line
                new Word(new Range(2, 1, 2, 4), 'how'),
                new Space(new Range(2, 4, 2, 5)),
                new Word(new Range(2, 5, 2, 8), 'are'),
                new Tab(new Range(2, 8, 2, 9)),
                new Space(new Range(2, 9, 2, 10)),
                new Word(new Range(2, 10, 2, 13), 'you'),
                new Space(new Range(2, 13, 2, 14)),
                new MarkdownLink(2, 14, '[caption text]', '(./some/file/path/refer🎨nce.md)'),
                new Word(new Range(2, 60, 2, 61), '?'),
                new VerticalTab(new Range(2, 61, 2, 62)),
                new NewLine(new Range(2, 62, 2, 63)),
                // third line
                new NewLine(new Range(3, 1, 3, 2)),
                // fourth line
                new MarkdownLink(4, 1, '[(example!)]', '(another/path/with[-and-]-chars/folder)'),
                new Tab(new Range(4, 52, 4, 53)),
                new Space(new Range(4, 53, 4, 54)),
                new NewLine(new Range(4, 54, 4, 55)),
                // fifth line
                new Tab(new Range(5, 1, 5, 2)),
                new MarkdownLink(5, 2, '[#file:something.txt]', '(/absolute/path/to/something.txt)'),
                new NewLine(new Range(5, 56, 5, 57)),
                // sixth line
                new VerticalTab(new Range(6, 1, 6, 2)),
                new FormFeed(new Range(6, 2, 6, 3)),
                new Space(new Range(6, 3, 6, 4)),
                new Word(new Range(6, 4, 6, 12), 'machines'),
                new Space(new Range(6, 12, 6, 13)),
                new Word(new Range(6, 13, 6, 17), 'must'),
                new Space(new Range(6, 17, 6, 18)),
                new MarkdownComment(new Range(6, 18, 6, 18 + 41), '<!-- [computer rights](/do/not/exist) -->'),
                new Space(new Range(6, 59, 6, 60)),
                new Word(new Range(6, 60, 6, 66), 'suffer'),
            ]);
        });
        test('• nuanced', async () => {
            const test = testDisposables.add(new TestMarkdownDecoder());
            const inputLines = [
                // tests that the link caption contain a chat prompt `#file:` reference, while
                // the file path can contain other `graphical characters`
                '\v\t[#file:./another/path/to/file.txt](./real/file!path/file◆name.md)',
                // tests that the link file path contain a chat prompt `#file:` reference,
                // `spaces`, `emojies`, and other `graphical characters`
                ' [reference ∘ label](/absolute/pa th/to-#file:file.txt/f🥸⚡️le.md)',
                // tests that link caption and file path can contain `parentheses`, `spaces`, and
                // `emojies`
                '\f[!(hello)!](./w(())rld/nice-🦚-filen(a)<me>.git))\n\t',
                // tests that the link caption can be empty, while the file path can contain `square brackets`
                '[<test>](./s[]me/pa[h!) ',
            ];
            await test.run(inputLines, [
                // `1st` line
                new VerticalTab(new Range(1, 1, 1, 2)),
                new Tab(new Range(1, 2, 1, 3)),
                new MarkdownLink(1, 3, '[#file:./another/path/to/file.txt]', '(./real/file!path/file◆name.md)'),
                new NewLine(new Range(1, 68, 1, 69)),
                // `2nd` line
                new Space(new Range(2, 1, 2, 2)),
                new MarkdownLink(2, 2, '[reference ∘ label]', '(/absolute/pa th/to-#file:file.txt/f🥸⚡️le.md)'),
                new NewLine(new Range(2, 67, 2, 68)),
                // `3rd` line
                new FormFeed(new Range(3, 1, 3, 2)),
                new MarkdownLink(3, 2, '[!(hello)!]', '(./w(())rld/nice-🦚-filen(a)<me>.git)'),
                new RightParenthesis(new Range(3, 50, 3, 51)),
                new NewLine(new Range(3, 51, 3, 52)),
                // `4th` line
                new Tab(new Range(4, 1, 4, 2)),
                new NewLine(new Range(4, 2, 4, 3)),
                // `5th` line
                new MarkdownLink(5, 1, '[<test>]', '(./s[]me/pa[h!)'),
                new Space(new Range(5, 24, 5, 25)),
            ]);
        });
    });
    suite('• links', () => {
        suite('• broken', () => {
            test('• invalid', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputLines = [
                    // incomplete link reference with empty caption
                    '[ ](./real/file path/file⇧name.md',
                    // space between caption and reference is disallowed
                    '[link text] (./file path/name.txt)',
                ];
                await test.run(inputLines, [
                    // `1st` line
                    new LeftBracket(new Range(1, 1, 1, 2)),
                    new Space(new Range(1, 2, 1, 3)),
                    new RightBracket(new Range(1, 3, 1, 4)),
                    new LeftParenthesis(new Range(1, 4, 1, 5)),
                    new Word(new Range(1, 5, 1, 5 + 11), './real/file'),
                    new Space(new Range(1, 16, 1, 17)),
                    new Word(new Range(1, 17, 1, 17 + 17), 'path/file⇧name.md'),
                    new NewLine(new Range(1, 34, 1, 35)),
                    // `2nd` line
                    new LeftBracket(new Range(2, 1, 2, 2)),
                    new Word(new Range(2, 2, 2, 2 + 4), 'link'),
                    new Space(new Range(2, 6, 2, 7)),
                    new Word(new Range(2, 7, 2, 7 + 4), 'text'),
                    new RightBracket(new Range(2, 11, 2, 12)),
                    new Space(new Range(2, 12, 2, 13)),
                    new LeftParenthesis(new Range(2, 13, 2, 14)),
                    new Word(new Range(2, 14, 2, 14 + 6), './file'),
                    new Space(new Range(2, 20, 2, 21)),
                    new Word(new Range(2, 21, 2, 21 + 13), 'path/name.txt'),
                    new RightParenthesis(new Range(2, 34, 2, 35)),
                ]);
            });
            suite('• stop characters inside caption/reference (new lines)', () => {
                for (const stopCharacter of [CarriageReturn, NewLine]) {
                    let characterName = '';
                    if (stopCharacter === CarriageReturn) {
                        characterName = '\\r';
                    }
                    if (stopCharacter === NewLine) {
                        characterName = '\\n';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`• stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `[haa${stopCharacter.symbol}loů](./real/💁/name.txt)`,
                            // stop character inside link reference
                            `[ref text](/etc/pat${stopCharacter.symbol}h/to/file.md)`,
                            // stop character between line caption and link reference is disallowed
                            `[text]${stopCharacter.symbol}(/etc/ path/file.md)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new LeftBracket(new Range(1, 1, 1, 2)),
                            new Word(new Range(1, 2, 1, 2 + 3), 'haa'),
                            new stopCharacter(new Range(1, 5, 1, 6)), // <- stop character
                            new Word(new Range(2, 1, 2, 1 + 3), 'loů'),
                            new RightBracket(new Range(2, 4, 2, 5)),
                            new LeftParenthesis(new Range(2, 5, 2, 6)),
                            new Word(new Range(2, 6, 2, 6 + 18), './real/💁/name.txt'),
                            new RightParenthesis(new Range(2, 24, 2, 25)),
                            new NewLine(new Range(2, 25, 2, 26)),
                            // `2nd` input line
                            new LeftBracket(new Range(3, 1, 3, 2)),
                            new Word(new Range(3, 2, 3, 2 + 3), 'ref'),
                            new Space(new Range(3, 5, 3, 6)),
                            new Word(new Range(3, 6, 3, 6 + 4), 'text'),
                            new RightBracket(new Range(3, 10, 3, 11)),
                            new LeftParenthesis(new Range(3, 11, 3, 12)),
                            new Word(new Range(3, 12, 3, 12 + 8), '/etc/pat'),
                            new stopCharacter(new Range(3, 20, 3, 21)), // <- stop character
                            new Word(new Range(4, 1, 4, 1 + 12), 'h/to/file.md'),
                            new RightParenthesis(new Range(4, 13, 4, 14)),
                            new NewLine(new Range(4, 14, 4, 15)),
                            // `3nd` input line
                            new LeftBracket(new Range(5, 1, 5, 2)),
                            new Word(new Range(5, 2, 5, 2 + 4), 'text'),
                            new RightBracket(new Range(5, 6, 5, 7)),
                            new stopCharacter(new Range(5, 7, 5, 8)), // <- stop character
                            new LeftParenthesis(new Range(6, 1, 6, 2)),
                            new Word(new Range(6, 2, 6, 2 + 5), '/etc/'),
                            new Space(new Range(6, 7, 6, 8)),
                            new Word(new Range(6, 8, 6, 8 + 12), 'path/file.md'),
                            new RightParenthesis(new Range(6, 20, 6, 21)),
                        ]);
                    });
                }
            });
            /**
             * Same as above but these stop characters do not move the caret to the next line.
             */
            suite('• stop characters inside caption/reference (same line)', () => {
                for (const stopCharacter of [VerticalTab, FormFeed]) {
                    let characterName = '';
                    if (stopCharacter === VerticalTab) {
                        characterName = '\\v';
                    }
                    if (stopCharacter === FormFeed) {
                        characterName = '\\f';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`• stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `[haa${stopCharacter.symbol}loů](./real/💁/name.txt)`,
                            // stop character inside link reference
                            `[ref text](/etc/pat${stopCharacter.symbol}h/to/file.md)`,
                            // stop character between line caption and link reference is disallowed
                            `[text]${stopCharacter.symbol}(/etc/ path/file.md)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new LeftBracket(new Range(1, 1, 1, 2)),
                            new Word(new Range(1, 2, 1, 2 + 3), 'haa'),
                            new stopCharacter(new Range(1, 5, 1, 6)), // <- stop character
                            new Word(new Range(1, 6, 1, 6 + 3), 'loů'),
                            new RightBracket(new Range(1, 9, 1, 10)),
                            new LeftParenthesis(new Range(1, 10, 1, 11)),
                            new Word(new Range(1, 11, 1, 11 + 18), './real/💁/name.txt'),
                            new RightParenthesis(new Range(1, 29, 1, 30)),
                            new NewLine(new Range(1, 30, 1, 31)),
                            // `2nd` input line
                            new LeftBracket(new Range(2, 1, 2, 2)),
                            new Word(new Range(2, 2, 2, 2 + 3), 'ref'),
                            new Space(new Range(2, 5, 2, 6)),
                            new Word(new Range(2, 6, 2, 6 + 4), 'text'),
                            new RightBracket(new Range(2, 10, 2, 11)),
                            new LeftParenthesis(new Range(2, 11, 2, 12)),
                            new Word(new Range(2, 12, 2, 12 + 8), '/etc/pat'),
                            new stopCharacter(new Range(2, 20, 2, 21)), // <- stop character
                            new Word(new Range(2, 21, 2, 21 + 12), 'h/to/file.md'),
                            new RightParenthesis(new Range(2, 33, 2, 34)),
                            new NewLine(new Range(2, 34, 2, 35)),
                            // `3nd` input line
                            new LeftBracket(new Range(3, 1, 3, 2)),
                            new Word(new Range(3, 2, 3, 2 + 4), 'text'),
                            new RightBracket(new Range(3, 6, 3, 7)),
                            new stopCharacter(new Range(3, 7, 3, 8)), // <- stop character
                            new LeftParenthesis(new Range(3, 8, 3, 9)),
                            new Word(new Range(3, 9, 3, 9 + 5), '/etc/'),
                            new Space(new Range(3, 14, 3, 15)),
                            new Word(new Range(3, 15, 3, 15 + 12), 'path/file.md'),
                            new RightParenthesis(new Range(3, 27, 3, 28)),
                        ]);
                    });
                }
            });
        });
    });
    suite('• images', () => {
        suite('• general', () => {
            test('• base cases', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    '\t![alt text](./some/path/to/file.jpg) ',
                    'plain text \f![label](./image.png)\v and more text',
                    '![](/var/images/default) following text',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Tab(new Range(1, 1, 1, 2)),
                    new MarkdownImage(1, 2, '![alt text]', '(./some/path/to/file.jpg)'),
                    new Space(new Range(1, 38, 1, 39)),
                    new NewLine(new Range(1, 39, 1, 40)),
                    // `2nd`
                    new Word(new Range(2, 1, 2, 6), 'plain'),
                    new Space(new Range(2, 6, 2, 7)),
                    new Word(new Range(2, 7, 2, 11), 'text'),
                    new Space(new Range(2, 11, 2, 12)),
                    new FormFeed(new Range(2, 12, 2, 13)),
                    new MarkdownImage(2, 13, '![label]', '(./image.png)'),
                    new VerticalTab(new Range(2, 34, 2, 35)),
                    new Space(new Range(2, 35, 2, 36)),
                    new Word(new Range(2, 36, 2, 39), 'and'),
                    new Space(new Range(2, 39, 2, 40)),
                    new Word(new Range(2, 40, 2, 44), 'more'),
                    new Space(new Range(2, 44, 2, 45)),
                    new Word(new Range(2, 45, 2, 49), 'text'),
                    new NewLine(new Range(2, 49, 2, 50)),
                    // `3rd`
                    new MarkdownImage(3, 1, '![]', '(/var/images/default)'),
                    new Space(new Range(3, 25, 3, 26)),
                    new Word(new Range(3, 26, 3, 35), 'following'),
                    new Space(new Range(3, 35, 3, 36)),
                    new Word(new Range(3, 36, 3, 40), 'text'),
                ]);
            });
            test('• nuanced', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    '\t![<!-- comment -->](./s☻me/path/to/file.jpeg) ',
                    'raw text \f![(/1.png)](./image-🥸.png)\v and more text',
                    // '![](/var/images/default) following text',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Tab(new Range(1, 1, 1, 2)),
                    new MarkdownImage(1, 2, '![<!-- comment -->]', '(./s☻me/path/to/file.jpeg)'),
                    new Space(new Range(1, 47, 1, 48)),
                    new NewLine(new Range(1, 48, 1, 49)),
                    // `2nd`
                    new Word(new Range(2, 1, 2, 4), 'raw'),
                    new Space(new Range(2, 4, 2, 5)),
                    new Word(new Range(2, 5, 2, 9), 'text'),
                    new Space(new Range(2, 9, 2, 10)),
                    new FormFeed(new Range(2, 10, 2, 11)),
                    new MarkdownImage(2, 11, '![(/1.png)]', '(./image-🥸.png)'),
                    new VerticalTab(new Range(2, 38, 2, 39)),
                    new Space(new Range(2, 39, 2, 40)),
                    new Word(new Range(2, 40, 2, 43), 'and'),
                    new Space(new Range(2, 43, 2, 44)),
                    new Word(new Range(2, 44, 2, 48), 'more'),
                    new Space(new Range(2, 48, 2, 49)),
                    new Word(new Range(2, 49, 2, 53), 'text'),
                ]);
            });
        });
        suite('• broken', () => {
            test('• invalid', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputLines = [
                    // incomplete link reference with empty caption
                    '![ ](./real/file path/file★name.webp',
                    // space between caption and reference is disallowed
                    '\f![link text] (./file path/name.jpg)',
                    // new line inside the link reference
                    '\v![ ](./file\npath/name.jpg )',
                ];
                await test.run(inputLines, [
                    // `1st` line
                    new ExclamationMark(new Range(1, 1, 1, 2)),
                    new LeftBracket(new Range(1, 2, 1, 3)),
                    new Space(new Range(1, 3, 1, 4)),
                    new RightBracket(new Range(1, 4, 1, 5)),
                    new LeftParenthesis(new Range(1, 5, 1, 6)),
                    new Word(new Range(1, 6, 1, 6 + 11), './real/file'),
                    new Space(new Range(1, 17, 1, 18)),
                    new Word(new Range(1, 18, 1, 18 + 19), 'path/file★name.webp'),
                    new NewLine(new Range(1, 37, 1, 38)),
                    // `2nd` line
                    new FormFeed(new Range(2, 1, 2, 2)),
                    new ExclamationMark(new Range(2, 2, 2, 3)),
                    new LeftBracket(new Range(2, 3, 2, 4)),
                    new Word(new Range(2, 4, 2, 4 + 4), 'link'),
                    new Space(new Range(2, 8, 2, 9)),
                    new Word(new Range(2, 9, 2, 9 + 4), 'text'),
                    new RightBracket(new Range(2, 13, 2, 14)),
                    new Space(new Range(2, 14, 2, 15)),
                    new LeftParenthesis(new Range(2, 15, 2, 16)),
                    new Word(new Range(2, 16, 2, 16 + 6), './file'),
                    new Space(new Range(2, 22, 2, 23)),
                    new Word(new Range(2, 23, 2, 23 + 13), 'path/name.jpg'),
                    new RightParenthesis(new Range(2, 36, 2, 37)),
                    new NewLine(new Range(2, 37, 2, 38)),
                    // `3rd` line
                    new VerticalTab(new Range(3, 1, 3, 2)),
                    new ExclamationMark(new Range(3, 2, 3, 3)),
                    new LeftBracket(new Range(3, 3, 3, 4)),
                    new Space(new Range(3, 4, 3, 5)),
                    new RightBracket(new Range(3, 5, 3, 6)),
                    new LeftParenthesis(new Range(3, 6, 3, 7)),
                    new Word(new Range(3, 7, 3, 7 + 6), './file'),
                    new NewLine(new Range(3, 13, 3, 14)),
                    new Word(new Range(4, 1, 4, 1 + 13), 'path/name.jpg'),
                    new Space(new Range(4, 14, 4, 15)),
                    new RightParenthesis(new Range(4, 15, 4, 16)),
                ]);
            });
            suite('• stop characters inside caption/reference (new lines)', () => {
                for (const stopCharacter of [CarriageReturn, NewLine]) {
                    let characterName = '';
                    if (stopCharacter === CarriageReturn) {
                        characterName = '\\r';
                    }
                    if (stopCharacter === NewLine) {
                        characterName = '\\n';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`• stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `![haa${stopCharacter.symbol}loů](./real/💁/name.png)`,
                            // stop character inside link reference
                            `![ref text](/etc/pat${stopCharacter.symbol}h/to/file.webp)`,
                            // stop character between line caption and link reference is disallowed
                            `![text]${stopCharacter.symbol}(/etc/ path/file.jpeg)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new ExclamationMark(new Range(1, 1, 1, 2)),
                            new LeftBracket(new Range(1, 2, 1, 3)),
                            new Word(new Range(1, 3, 1, 3 + 3), 'haa'),
                            new stopCharacter(new Range(1, 6, 1, 7)), // <- stop character
                            new Word(new Range(2, 1, 2, 1 + 3), 'loů'),
                            new RightBracket(new Range(2, 4, 2, 5)),
                            new LeftParenthesis(new Range(2, 5, 2, 6)),
                            new Word(new Range(2, 6, 2, 6 + 18), './real/💁/name.png'),
                            new RightParenthesis(new Range(2, 24, 2, 25)),
                            new NewLine(new Range(2, 25, 2, 26)),
                            // `2nd` input line
                            new ExclamationMark(new Range(3, 1, 3, 2)),
                            new LeftBracket(new Range(3, 2, 3, 3)),
                            new Word(new Range(3, 3, 3, 3 + 3), 'ref'),
                            new Space(new Range(3, 6, 3, 7)),
                            new Word(new Range(3, 7, 3, 7 + 4), 'text'),
                            new RightBracket(new Range(3, 11, 3, 12)),
                            new LeftParenthesis(new Range(3, 12, 3, 13)),
                            new Word(new Range(3, 13, 3, 13 + 8), '/etc/pat'),
                            new stopCharacter(new Range(3, 21, 3, 22)), // <- stop character
                            new Word(new Range(4, 1, 4, 1 + 14), 'h/to/file.webp'),
                            new RightParenthesis(new Range(4, 15, 4, 16)),
                            new NewLine(new Range(4, 16, 4, 17)),
                            // `3nd` input line
                            new ExclamationMark(new Range(5, 1, 5, 2)),
                            new LeftBracket(new Range(5, 2, 5, 3)),
                            new Word(new Range(5, 3, 5, 3 + 4), 'text'),
                            new RightBracket(new Range(5, 7, 5, 8)),
                            new stopCharacter(new Range(5, 8, 5, 9)), // <- stop character
                            new LeftParenthesis(new Range(6, 1, 6, 2)),
                            new Word(new Range(6, 2, 6, 2 + 5), '/etc/'),
                            new Space(new Range(6, 7, 6, 8)),
                            new Word(new Range(6, 8, 6, 8 + 14), 'path/file.jpeg'),
                            new RightParenthesis(new Range(6, 22, 6, 23)),
                        ]);
                    });
                }
            });
            /**
             * Same as above but these stop characters do not move the caret to the next line.
             */
            suite('• stop characters inside caption/reference (same line)', () => {
                for (const stopCharacter of [VerticalTab, FormFeed]) {
                    let characterName = '';
                    if (stopCharacter === VerticalTab) {
                        characterName = '\\v';
                    }
                    if (stopCharacter === FormFeed) {
                        characterName = '\\f';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`• stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `![haa${stopCharacter.symbol}loů](./real/💁/name)`,
                            // stop character inside link reference
                            `![ref text](/etc/pat${stopCharacter.symbol}h/to/file.webp)`,
                            // stop character between line caption and link reference is disallowed
                            `![text]${stopCharacter.symbol}(/etc/ path/image.gif)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new ExclamationMark(new Range(1, 1, 1, 2)),
                            new LeftBracket(new Range(1, 2, 1, 3)),
                            new Word(new Range(1, 3, 1, 3 + 3), 'haa'),
                            new stopCharacter(new Range(1, 6, 1, 7)), // <- stop character
                            new Word(new Range(1, 7, 1, 7 + 3), 'loů'),
                            new RightBracket(new Range(1, 10, 1, 11)),
                            new LeftParenthesis(new Range(1, 11, 1, 12)),
                            new Word(new Range(1, 12, 1, 12 + 14), './real/💁/name'),
                            new RightParenthesis(new Range(1, 26, 1, 27)),
                            new NewLine(new Range(1, 27, 1, 28)),
                            // `2nd` input line
                            new ExclamationMark(new Range(2, 1, 2, 2)),
                            new LeftBracket(new Range(2, 2, 2, 3)),
                            new Word(new Range(2, 3, 2, 3 + 3), 'ref'),
                            new Space(new Range(2, 6, 2, 7)),
                            new Word(new Range(2, 7, 2, 7 + 4), 'text'),
                            new RightBracket(new Range(2, 11, 2, 12)),
                            new LeftParenthesis(new Range(2, 12, 2, 13)),
                            new Word(new Range(2, 13, 2, 13 + 8), '/etc/pat'),
                            new stopCharacter(new Range(2, 21, 2, 22)), // <- stop character
                            new Word(new Range(2, 22, 2, 22 + 14), 'h/to/file.webp'),
                            new RightParenthesis(new Range(2, 36, 2, 37)),
                            new NewLine(new Range(2, 37, 2, 38)),
                            // `3nd` input line
                            new ExclamationMark(new Range(3, 1, 3, 2)),
                            new LeftBracket(new Range(3, 2, 3, 3)),
                            new Word(new Range(3, 3, 3, 3 + 4), 'text'),
                            new RightBracket(new Range(3, 7, 3, 8)),
                            new stopCharacter(new Range(3, 8, 3, 9)), // <- stop character
                            new LeftParenthesis(new Range(3, 9, 3, 10)),
                            new Word(new Range(3, 10, 3, 10 + 5), '/etc/'),
                            new Space(new Range(3, 15, 3, 16)),
                            new Word(new Range(3, 16, 3, 16 + 14), 'path/image.gif'),
                            new RightParenthesis(new Range(3, 30, 3, 31)),
                        ]);
                    });
                }
            });
        });
    });
    suite('• comments', () => {
        suite('• general', () => {
            test('• base cases', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    // comment with text inside it
                    '\t<!-- hello world -->',
                    // comment with a link inside
                    'some text<!-- \v[link label](/some/path/to/file.md)\f --> and more text ',
                    // comment new lines inside it
                    '<!-- comment\r\ntext\n\ngoes here --> usual text follows',
                    // an empty comment
                    '\t<!---->\t',
                    // comment that was not closed properly
                    'haalo\t<!-- [link label](/some/path/to/file.md)',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Tab(new Range(1, 1, 1, 2)),
                    new MarkdownComment(new Range(1, 2, 1, 2 + 20), '<!-- hello world -->'),
                    new NewLine(new Range(1, 22, 1, 23)),
                    // `2nd`
                    new Word(new Range(2, 1, 2, 5), 'some'),
                    new Space(new Range(2, 5, 2, 6)),
                    new Word(new Range(2, 6, 2, 10), 'text'),
                    new MarkdownComment(new Range(2, 10, 2, 10 + 46), '<!-- \v[link label](/some/path/to/file.md)\f -->'),
                    new Space(new Range(2, 56, 2, 57)),
                    new Word(new Range(2, 57, 2, 60), 'and'),
                    new Space(new Range(2, 60, 2, 61)),
                    new Word(new Range(2, 61, 2, 65), 'more'),
                    new Space(new Range(2, 65, 2, 66)),
                    new Word(new Range(2, 66, 2, 70), 'text'),
                    new Space(new Range(2, 70, 2, 71)),
                    new NewLine(new Range(2, 71, 2, 72)),
                    // `3rd`
                    new MarkdownComment(new Range(3, 1, 3 + 3, 1 + 13), '<!-- comment\r\ntext\n\ngoes here -->'),
                    new Space(new Range(6, 14, 6, 15)),
                    new Word(new Range(6, 15, 6, 15 + 5), 'usual'),
                    new Space(new Range(6, 20, 6, 21)),
                    new Word(new Range(6, 21, 6, 21 + 4), 'text'),
                    new Space(new Range(6, 25, 6, 26)),
                    new Word(new Range(6, 26, 6, 26 + 7), 'follows'),
                    new NewLine(new Range(6, 33, 6, 34)),
                    // `4rd`
                    new Tab(new Range(7, 1, 7, 2)),
                    new MarkdownComment(new Range(7, 2, 7, 2 + 7), '<!---->'),
                    new Tab(new Range(7, 9, 7, 10)),
                    new NewLine(new Range(7, 10, 7, 11)),
                    // `5th`
                    new Word(new Range(8, 1, 8, 6), 'haalo'),
                    new Tab(new Range(8, 6, 8, 7)),
                    new MarkdownComment(new Range(8, 7, 8, 7 + 40), '<!-- [link label](/some/path/to/file.md)'),
                ]);
            });
            test('• nuanced', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    // comment inside `<>` brackets
                    ' \f <<!--commen\t-->>',
                    // comment contains `<[]>` brackets and `!`
                    '<!--<[!c⚽︎mment!]>-->\t\t',
                    // comment contains `<!--` and new lines
                    '\v<!--some\r\ntext\n\t<!--inner\r\ntext-->\t\t',
                    // comment contains `<!--` and never closed properly
                    ' <!--<!--inner\r\ntext-- >\t\v\f ',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Space(new Range(1, 1, 1, 2)),
                    new FormFeed(new Range(1, 2, 1, 3)),
                    new Space(new Range(1, 3, 1, 4)),
                    new LeftAngleBracket(new Range(1, 4, 1, 5)),
                    new MarkdownComment(new Range(1, 5, 1, 5 + 14), '<!--commen\t-->'),
                    new RightAngleBracket(new Range(1, 19, 1, 20)),
                    new NewLine(new Range(1, 20, 1, 21)),
                    // `2nd`
                    new MarkdownComment(new Range(2, 1, 2, 1 + 21), '<!--<[!c⚽︎mment!]>-->'),
                    new Tab(new Range(2, 22, 2, 23)),
                    new Tab(new Range(2, 23, 2, 24)),
                    new NewLine(new Range(2, 24, 2, 25)),
                    // `3rd`
                    new VerticalTab(new Range(3, 1, 3, 2)),
                    new MarkdownComment(new Range(3, 2, 3 + 3, 1 + 7), '<!--some\r\ntext\n\t<!--inner\r\ntext-->'),
                    new Tab(new Range(6, 8, 6, 9)),
                    new Tab(new Range(6, 9, 6, 10)),
                    new NewLine(new Range(6, 10, 6, 11)),
                    // `4rd`
                    new Space(new Range(7, 1, 7, 2)),
                    // note! comment does not have correct closing `-->`, hence the comment extends
                    //       to the end of the text, and therefore includes the \t\v\f and space at the end
                    new MarkdownComment(new Range(7, 2, 8, 1 + 12), '<!--<!--inner\r\ntext-- >\t\v\f '),
                ]);
            });
        });
        test('• invalid', async () => {
            const test = testDisposables.add(new TestMarkdownDecoder());
            const inputData = [
                '\t<! -- mondo --> ',
                ' < !-- світ -->\t',
                '\v<!- - terra -->\f',
                '<!--mundo - -> ',
            ];
            await test.run(inputData, [
                // `1st`
                new Tab(new Range(1, 1, 1, 2)),
                new LeftAngleBracket(new Range(1, 2, 1, 3)),
                new ExclamationMark(new Range(1, 3, 1, 4)),
                new Space(new Range(1, 4, 1, 5)),
                new Dash(new Range(1, 5, 1, 6)),
                new Dash(new Range(1, 6, 1, 7)),
                new Space(new Range(1, 7, 1, 8)),
                new Word(new Range(1, 8, 1, 8 + 5), 'mondo'),
                new Space(new Range(1, 13, 1, 14)),
                new Dash(new Range(1, 14, 1, 15)),
                new Dash(new Range(1, 15, 1, 16)),
                new RightAngleBracket(new Range(1, 16, 1, 17)),
                new Space(new Range(1, 17, 1, 18)),
                new NewLine(new Range(1, 18, 1, 19)),
                // `2nd`
                new Space(new Range(2, 1, 2, 2)),
                new LeftAngleBracket(new Range(2, 2, 2, 3)),
                new Space(new Range(2, 3, 2, 4)),
                new ExclamationMark(new Range(2, 4, 2, 5)),
                new Dash(new Range(2, 5, 2, 6)),
                new Dash(new Range(2, 6, 2, 7)),
                new Space(new Range(2, 7, 2, 8)),
                new Word(new Range(2, 8, 2, 8 + 4), 'світ'),
                new Space(new Range(2, 12, 2, 13)),
                new Dash(new Range(2, 13, 2, 14)),
                new Dash(new Range(2, 14, 2, 15)),
                new RightAngleBracket(new Range(2, 15, 2, 16)),
                new Tab(new Range(2, 16, 2, 17)),
                new NewLine(new Range(2, 17, 2, 18)),
                // `3rd`
                new VerticalTab(new Range(3, 1, 3, 2)),
                new LeftAngleBracket(new Range(3, 2, 3, 3)),
                new ExclamationMark(new Range(3, 3, 3, 4)),
                new Dash(new Range(3, 4, 3, 5)),
                new Space(new Range(3, 5, 3, 6)),
                new Dash(new Range(3, 6, 3, 7)),
                new Space(new Range(3, 7, 3, 8)),
                new Word(new Range(3, 8, 3, 8 + 5), 'terra'),
                new Space(new Range(3, 13, 3, 14)),
                new Dash(new Range(3, 14, 3, 15)),
                new Dash(new Range(3, 15, 3, 16)),
                new RightAngleBracket(new Range(3, 16, 3, 17)),
                new FormFeed(new Range(3, 17, 3, 18)),
                new NewLine(new Range(3, 18, 3, 19)),
                // `4rd`
                // note! comment does not have correct closing `-->`, hence the comment extends
                //       to the end of the text, and therefore includes the `space` at the end
                new MarkdownComment(new Range(4, 1, 4, 1 + 15), '<!--mundo - -> '),
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25EZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29kZWNzL21hcmtkb3duRGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDL0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBa0IsTUFBTSx5REFBeUQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFakg7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsV0FBNEM7SUFDcEY7UUFDQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBVyxJQUFJLENBQUMsQ0FBQztRQUVsRCxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRWxFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0IsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FDL0IsSUFBSSxtQkFBbUIsRUFBRSxDQUN6QixDQUFDO1lBRUYsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUNiO2dCQUNDLGFBQWE7Z0JBQ2IsY0FBYztnQkFDZCxpRUFBaUU7Z0JBQ2pFLGlFQUFpRTtnQkFDakUsYUFBYTtnQkFDYixFQUFFO2dCQUNGLHFFQUFxRTtnQkFDckUsd0RBQXdEO2dCQUN4RCx1RUFBdUU7Z0JBQ3ZFLDBEQUEwRDtnQkFDMUQsMENBQTBDO2dCQUMxQyxxRUFBcUU7YUFDckUsRUFDRDtnQkFDQyxhQUFhO2dCQUNiLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQ3pDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQyxjQUFjO2dCQUNkLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztnQkFDdEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztnQkFDdEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVB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LEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxlQUFlLENBQUM7b0JBQ3JELElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUN6QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUN6QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsUUFBUTtvQkFDUixJQUFJLGFBQWEsQ0FBQyxD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QztvQkFDaEMsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZDLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMxQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsYUFBYSxDQUFDO29CQUNuRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixDQUFDO29CQUM3RCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsYUFBYTtvQkFDYixJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbkMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzFDLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN0QyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUMz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QUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDMUMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDOzRCQUMzQyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDekMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQzVDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUM7NEJBQ2pELElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsb0JBQW9COzRCQUNoRSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLENBQUM7NEJBQ3hELElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMs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RSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pDLElBQUksaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzlDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEMsUUFBUTtnQkFDUixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxJ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