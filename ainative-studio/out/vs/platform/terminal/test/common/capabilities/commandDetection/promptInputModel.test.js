/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../log/common/log.js';
import { PromptInputModel } from '../../../../common/capabilities/commandDetection/promptInputModel.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ok, notDeepStrictEqual, strictEqual } from 'assert';
import { timeout } from '../../../../../../base/common/async.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
suite('PromptInputModel', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let promptInputModel;
    let xterm;
    let onCommandStart;
    let onCommandStartChanged;
    let onCommandExecuted;
    async function writePromise(data) {
        await new Promise(r => xterm.write(data, r));
    }
    function fireCommandStart() {
        onCommandStart.fire({ marker: xterm.registerMarker() });
    }
    function fireCommandExecuted() {
        onCommandExecuted.fire(null);
    }
    function setContinuationPrompt(prompt) {
        promptInputModel.setContinuationPrompt(prompt);
    }
    async function assertPromptInput(valueWithCursor) {
        await timeout(0);
        if (promptInputModel.cursorIndex !== -1 && !valueWithCursor.includes('|')) {
            throw new Error('assertPromptInput must contain | character');
        }
        const actualValueWithCursor = promptInputModel.getCombinedString();
        strictEqual(actualValueWithCursor, valueWithCursor.replaceAll('\n', '\u23CE'));
        // This is required to ensure the cursor index is correctly resolved for non-ascii characters
        const value = valueWithCursor.replace(/[\|\[\]]/g, '');
        const cursorIndex = valueWithCursor.indexOf('|');
        strictEqual(promptInputModel.value, value);
        strictEqual(promptInputModel.cursorIndex, cursorIndex, `value=${promptInputModel.value}`);
        ok(promptInputModel.ghostTextIndex === -1 || cursorIndex <= promptInputModel.ghostTextIndex, `cursorIndex (${cursorIndex}) must be before ghostTextIndex (${promptInputModel.ghostTextIndex})`);
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true }));
        onCommandStart = store.add(new Emitter());
        onCommandStartChanged = store.add(new Emitter());
        onCommandExecuted = store.add(new Emitter());
        promptInputModel = store.add(new PromptInputModel(xterm, onCommandStart.event, onCommandStartChanged.event, onCommandExecuted.event, new NullLogService));
    });
    test('basic input and execute', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        await writePromise('\r\n');
        fireCommandExecuted();
        await assertPromptInput('foo bar');
        await writePromise('(command output)\r\n$ ');
        fireCommandStart();
        await assertPromptInput('|');
    });
    test('should not fire onDidChangeInput events when nothing changes', async () => {
        const events = [];
        store.add(promptInputModel.onDidChangeInput(e => events.push(e)));
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo');
        await assertPromptInput('foo|');
        await writePromise(' bar');
        await assertPromptInput('foo bar|');
        await writePromise('\r\n');
        fireCommandExecuted();
        await assertPromptInput('foo bar');
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        for (let i = 0; i < events.length - 1; i++) {
            notDeepStrictEqual(events[i], events[i + 1], 'not adjacent events should fire with the same value');
        }
    });
    test('should fire onDidInterrupt followed by onDidFinish when ctrl+c is pressed', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo');
        await assertPromptInput('foo|');
        await new Promise(r => {
            store.add(promptInputModel.onDidInterrupt(() => {
                // Fire onDidFinishInput immediately after onDidInterrupt
                store.add(promptInputModel.onDidFinishInput(() => {
                    r();
                }));
            }));
            xterm.input('\x03');
            writePromise('^C').then(() => fireCommandExecuted());
        });
    });
    test('cursor navigation', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        await writePromise('\x1b[3D');
        await assertPromptInput('foo |bar');
        await writePromise('\x1b[4D');
        await assertPromptInput('|foo bar');
        await writePromise('\x1b[3C');
        await assertPromptInput('foo| bar');
        await writePromise('\x1b[4C');
        await assertPromptInput('foo bar|');
        await writePromise('\x1b[D');
        await assertPromptInput('foo ba|r');
        await writePromise('\x1b[C');
        await assertPromptInput('foo bar|');
    });
    suite('ghost text', () => {
        test('basic ghost text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[2m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
        });
        test('trailing whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo    ');
            await writePromise('\x1b[4D');
            await assertPromptInput('foo|    ');
        });
        test('basic ghost text one word', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('pw\x1b[2md\x1b[1D');
            await assertPromptInput('pw|[d]');
        });
        test('ghost text with cursor navigation', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[2m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
            await writePromise('\x1b[C');
            await assertPromptInput('fo|o[ bar]');
            await writePromise('\x1b[C');
            await assertPromptInput('foo|[ bar]');
        });
        test('ghost text with different foreground colors only', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[38;2;255;0;0m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
        });
        test('no ghost text when foreground color matches earlier text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[38;2;255;0;0mred1\x1b[0m ' + // Red "red1"
                '\x1b[38;2;0;255;0mgreen\x1b[0m ' + // Green "green"
                '\x1b[38;2;255;0;0mred2\x1b[0m' // Red "red2" (same as red1)
            );
            await assertPromptInput('red1 green red2|'); // No ghost text expected
        });
        test('ghost text detected when foreground color is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[38;2;255;0;0mcmd\x1b[0m ' + // Red "cmd"
                '\x1b[38;2;0;255;0marg\x1b[0m ' + // Green "arg"
                '\x1b[38;2;0;0;255mfinal\x1b[5D' // Blue "final" (ghost text)
            );
            await assertPromptInput('cmd arg |[final]');
        });
        test('no ghost text when background color matches earlier text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[48;2;255;0;0mred_bg1\x1b[0m ' + // Red background
                '\x1b[48;2;0;255;0mgreen_bg\x1b[0m ' + // Green background
                '\x1b[48;2;255;0;0mred_bg2\x1b[0m' // Red background again
            );
            await assertPromptInput('red_bg1 green_bg red_bg2|'); // No ghost text expected
        });
        test('ghost text detected when background color is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[48;2;255;0;0mred_bg\x1b[0m ' + // Red background
                '\x1b[48;2;0;255;0mgreen_bg\x1b[0m ' + // Green background
                '\x1b[48;2;0;0;255mblue_bg\x1b[7D' // Blue background (ghost text)
            );
            await assertPromptInput('red_bg green_bg |[blue_bg]');
        });
        test('ghost text detected when bold style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[1mBOLD\x1b[4D' // Bold "BOLD" (ghost text)
            );
            await assertPromptInput('text |[BOLD]');
        });
        test('no ghost text when earlier text has the same bold style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[1mBOLD1\x1b[0m ' + // Bold "BOLD1"
                'normal ' +
                '\x1b[1mBOLD2\x1b[0m' // Bold "BOLD2" (same style as "BOLD1")
            );
            await assertPromptInput('BOLD1 normal BOLD2|'); // No ghost text expected
        });
        test('ghost text detected when italic style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[3mITALIC\x1b[6D' // Italic "ITALIC" (ghost text)
            );
            await assertPromptInput('text |[ITALIC]');
        });
        test('no ghost text when earlier text has the same italic style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[3mITALIC1\x1b[0m ' + // Italic "ITALIC1"
                'normal ' +
                '\x1b[3mITALIC2\x1b[0m' // Italic "ITALIC2" (same style as "ITALIC1")
            );
            await assertPromptInput('ITALIC1 normal ITALIC2|'); // No ghost text expected
        });
        test('ghost text detected when underline style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[4mUNDERLINE\x1b[9D' // Underlined "UNDERLINE" (ghost text)
            );
            await assertPromptInput('text |[UNDERLINE]');
        });
        test('no ghost text when earlier text has the same underline style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[4mUNDERLINE1\x1b[0m ' + // Underlined "UNDERLINE1"
                'normal ' +
                '\x1b[4mUNDERLINE2\x1b[0m' // Underlined "UNDERLINE2" (same style as "UNDERLINE1")
            );
            await assertPromptInput('UNDERLINE1 normal UNDERLINE2|'); // No ghost text expected
        });
        test('ghost text detected when strikethrough style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[9mSTRIKE\x1b[6D' // Strikethrough "STRIKE" (ghost text)
            );
            await assertPromptInput('text |[STRIKE]');
        });
        test('no ghost text when earlier text has the same strikethrough style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[9mSTRIKE1\x1b[0m ' + // Strikethrough "STRIKE1"
                'normal ' +
                '\x1b[9mSTRIKE2\x1b[0m' // Strikethrough "STRIKE2" (same style as "STRIKE1")
            );
            await assertPromptInput('STRIKE1 normal STRIKE2|'); // No ghost text expected
        });
        suite('With wrapping', () => {
            test('Fish ghost text in long line with wrapped content', async () => {
                promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                // Write a command with ghost text that will wrap
                await writePromise('find . -name');
                await assertPromptInput(`find . -name|`);
                // Add ghost text with dim style
                await writePromise('\x1b[2m test\x1b[0m\x1b[4D');
                await assertPromptInput(`find . -name |[test]`);
                // Move cursor within the ghost text
                await writePromise('\x1b[C');
                await assertPromptInput(`find . -name t|[est]`);
                // Accept ghost text
                await writePromise('\x1b[C\x1b[C\x1b[C\x1b[C\x1b[C');
                await assertPromptInput(`find . -name test|`);
            });
            test('Pwsh ghost text in long line with wrapped content', async () => {
                promptInputModel.setShellType("pwsh" /* GeneralShellType.PowerShell */);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                // Write a command with ghost text that will wrap
                await writePromise('find . -name');
                await assertPromptInput(`find . -name|`);
                // Add ghost text with dim style
                await writePromise('\x1b[2m test\x1b[0m\x1b[4D');
                await assertPromptInput(`find . -name |[test]`);
                // Move cursor within the ghost text
                await writePromise('\x1b[C');
                await assertPromptInput(`find . -name t|[est]`);
                // Accept ghost text
                await writePromise('\x1b[C\x1b[C\x1b[C\x1b[C\x1b[C');
                await assertPromptInput(`find . -name test|`);
            });
        });
    });
    test('wide input (Korean)', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('안영');
        await assertPromptInput('안영|');
        await writePromise('\r\n컴퓨터');
        await assertPromptInput('안영\n컴퓨터|');
        await writePromise('\r\n사람');
        await assertPromptInput('안영\n컴퓨터\n사람|');
        await writePromise('\x1b[G');
        await assertPromptInput('안영\n컴퓨터\n|사람');
        await writePromise('\x1b[A');
        await assertPromptInput('안영\n|컴퓨터\n사람');
        await writePromise('\x1b[4C');
        await assertPromptInput('안영\n컴퓨|터\n사람');
        await writePromise('\x1b[1;4H');
        await assertPromptInput('안|영\n컴퓨터\n사람');
        await writePromise('\x1b[D');
        await assertPromptInput('|안영\n컴퓨터\n사람');
    });
    test('emoji input', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('✌️👍');
        await assertPromptInput('✌️👍|');
        await writePromise('\r\n😎😕😅');
        await assertPromptInput('✌️👍\n😎😕😅|');
        await writePromise('\r\n🤔🤷😩');
        await assertPromptInput('✌️👍\n😎😕😅\n🤔🤷😩|');
        await writePromise('\x1b[G');
        await assertPromptInput('✌️👍\n😎😕😅\n|🤔🤷😩');
        await writePromise('\x1b[A');
        await assertPromptInput('✌️👍\n|😎😕😅\n🤔🤷😩');
        await writePromise('\x1b[2C');
        await assertPromptInput('✌️👍\n😎😕|😅\n🤔🤷😩');
        await writePromise('\x1b[1;4H');
        await assertPromptInput('✌️|👍\n😎😕😅\n🤔🤷😩');
        await writePromise('\x1b[D');
        await assertPromptInput('|✌️👍\n😎😕😅\n🤔🤷😩');
    });
    suite('trailing whitespace', () => {
        test('delete whitespace with backspace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise(' ');
            await assertPromptInput(` |`);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput('|');
            xterm.input(' '.repeat(4), true);
            await writePromise(' '.repeat(4));
            await assertPromptInput(`    |`);
            xterm.input('\x1b[D'.repeat(2), true); // Left
            await writePromise('\x1b[2D');
            await assertPromptInput(`  |  `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput(` |  `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput(`|  `);
            xterm.input(' ', true);
            await writePromise(' ');
            await assertPromptInput(` |  `);
            xterm.input(' ', true);
            await writePromise(' ');
            await assertPromptInput(`  |  `);
            xterm.input('\x1b[C', true); // Right
            await writePromise('\x1b[C');
            await assertPromptInput(`   | `);
            xterm.input('a', true);
            await writePromise('a');
            await assertPromptInput(`   a| `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D\x1b[K');
            await assertPromptInput(`   | `);
            xterm.input('\x1b[D'.repeat(2), true); // Left
            await writePromise('\x1b[2D');
            await assertPromptInput(` |   `);
            xterm.input('\x1b[3~', true); // Delete
            await writePromise('');
            await assertPromptInput(` |  `);
        });
        // TODO: This doesn't work correctly but it doesn't matter too much as it only happens when
        // there is a lot of whitespace at the end of a prompt input
        test.skip('track whitespace when ConPTY deletes whitespace unexpectedly', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            xterm.input('ls', true);
            await writePromise('ls');
            await assertPromptInput(`ls|`);
            xterm.input(' '.repeat(4), true);
            await writePromise(' '.repeat(4));
            await assertPromptInput(`ls    |`);
            xterm.input(' ', true);
            await writePromise('\x1b[4D\x1b[5X\x1b[5C'); // Cursor left x(N-1), delete xN, cursor right xN
            await assertPromptInput(`ls     |`);
        });
        test('track whitespace beyond cursor', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise(' '.repeat(8));
            await assertPromptInput(`${' '.repeat(8)}|`);
            await writePromise('\x1b[4D');
            await assertPromptInput(`${' '.repeat(4)}|${' '.repeat(4)}`);
        });
    });
    suite('multi-line', () => {
        test('basic 2 line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
        });
        test('basic 3 line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\nb\n|`);
            await writePromise('c');
            await assertPromptInput(`echo "a\nb\nc|`);
        });
        test('navigate left in multi-line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "a\n|b`);
            await writePromise('\x1b[@c');
            await assertPromptInput(`echo "a\nc|b`);
            await writePromise('\x1b[K\n\r\∙ ');
            await assertPromptInput(`echo "a\nc\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nc\nb|`);
            await writePromise(' foo');
            await assertPromptInput(`echo "a\nc\nb foo|`);
            await writePromise('\x1b[3D');
            await assertPromptInput(`echo "a\nc\nb |foo`);
        });
        test('navigate up in multi-line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "foo');
            await assertPromptInput(`echo "foo|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\n|`);
            await writePromise('bar');
            await assertPromptInput(`echo "foo\nbar|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\nbar\n|`);
            await writePromise('baz');
            await assertPromptInput(`echo "foo\nbar\nbaz|`);
            await writePromise('\x1b[A');
            await assertPromptInput(`echo "foo\nbar|\nbaz`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nba|r\nbaz`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nb|ar\nbaz`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\n|bar\nbaz`);
            await writePromise('\x1b[1;9H');
            await assertPromptInput(`echo "|foo\nbar\nbaz`);
            await writePromise('\x1b[C');
            await assertPromptInput(`echo "f|oo\nbar\nbaz`);
            await writePromise('\x1b[C');
            await assertPromptInput(`echo "fo|o\nbar\nbaz`);
            await writePromise('\x1b[C');
            await assertPromptInput(`echo "foo|\nbar\nbaz`);
        });
        test('navigating up when first line contains invalid/stale trailing whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "foo      \x1b[6D');
            await assertPromptInput(`echo "foo|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\n|`);
            await writePromise('bar');
            await assertPromptInput(`echo "foo\nbar|`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nba|r`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nb|ar`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\n|bar`);
        });
    });
    suite('multi-line wrapped (no continuation prompt)', () => {
        test('basic wrapped line', async () => {
            xterm.resize(5, 10);
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('ech');
            await assertPromptInput(`ech|`);
            await writePromise('o ');
            await assertPromptInput(`echo |`);
            await writePromise('"a"');
            // HACK: Trailing whitespace is due to flaky detection in wrapped lines (but it doesn't matter much)
            await assertPromptInput(`echo "a"| `);
            await writePromise('\n\r\ b');
            await assertPromptInput(`echo "a"\n b|`);
            await writePromise('\n\r\ c');
            await assertPromptInput(`echo "a"\n b\n c|`);
        });
    });
    suite('multi-line wrapped (continuation prompt)', () => {
        test('basic wrapped line', async () => {
            xterm.resize(5, 10);
            promptInputModel.setContinuationPrompt('∙ ');
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('ech');
            await assertPromptInput(`ech|`);
            await writePromise('o ');
            await assertPromptInput(`echo |`);
            await writePromise('"a"');
            // HACK: Trailing whitespace is due to flaky detection in wrapped lines (but it doesn't matter much)
            await assertPromptInput(`echo "a"| `);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a"\nb|`);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\nb\n|`);
            await writePromise('c');
            await assertPromptInput(`echo "a"\nb\nc|`);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\nb\nc\n|`);
        });
    });
    suite('multi-line wrapped fish', () => {
        test('forward slash continuation', async () => {
            promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
            await writePromise('$ ');
            await assertPromptInput('|');
            await writePromise('[I] meganrogge@Megans-MacBook-Pro ~ (main|BISECTING)>');
            fireCommandStart();
            await writePromise('ech\\');
            await assertPromptInput(`ech\\|`);
            await writePromise('\no bye');
            await assertPromptInput(`echo bye|`);
        });
        test('newline with no continuation', async () => {
            promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
            await writePromise('$ ');
            await assertPromptInput('|');
            await writePromise('[I] meganrogge@Megans-MacBook-Pro ~ (main|BISECTING)>');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "hi');
            await assertPromptInput(`echo "hi|`);
            await writePromise('\nand bye\nwhy"');
            await assertPromptInput(`echo "hi\nand bye\nwhy"|`);
        });
    });
    // To "record a session" for these tests:
    // - Enable debug logging
    // - Open and clear Terminal output channel
    // - Open terminal and perform the test
    // - Extract all "parsing data" lines from the terminal
    suite('recorded sessions', () => {
        async function replayEvents(events) {
            for (const data of events) {
                await writePromise(data);
            }
        }
        suite('Windows 11 (10.0.22621.3447), pwsh 7.4.2, starship prompt 1.10.2', () => {
            test('input with ignored ghost text', async () => {
                await replayEvents([
                    '[?25l[2J[m[H]0;C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\\pwsh.exe[?25h',
                    '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                    ']633;P;IsWindows=True',
                    ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                    ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m03:13:47 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$⇡ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                fireCommandStart();
                await assertPromptInput('|');
                await replayEvents([
                    '[?25l[93mf[97m[2m[3makecommand[3;4H[?25h',
                    '[m',
                    '[93mfo[9X',
                    '[m',
                    '[?25l[93m[3;3Hfoo[?25h',
                    '[m',
                ]);
                await assertPromptInput('foo|');
            });
            test('input with accepted and run ghost text', async () => {
                await replayEvents([
                    '[?25l[2J[m[H]0;C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\\pwsh.exe[?25h',
                    '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                    ']633;P;IsWindows=True',
                    ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                    ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m03:41:36 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                promptInputModel.setContinuationPrompt('∙ ');
                fireCommandStart();
                await assertPromptInput('|');
                await replayEvents([
                    '[?25l[93me[97m[2m[3mcho "hello world"[3;4H[?25h',
                    '[m',
                ]);
                await assertPromptInput('e|[cho "hello world"]');
                await replayEvents([
                    '[?25l[93mec[97m[2m[3mho "hello world"[3;5H[?25h',
                    '[m',
                ]);
                await assertPromptInput('ec|[ho "hello world"]');
                await replayEvents([
                    '[?25l[93m[3;3Hech[97m[2m[3mo "hello world"[3;6H[?25h',
                    '[m',
                ]);
                await assertPromptInput('ech|[o "hello world"]');
                await replayEvents([
                    '[?25l[93m[3;3Hecho[97m[2m[3m "hello world"[3;7H[?25h',
                    '[m',
                ]);
                await assertPromptInput('echo|[ "hello world"]');
                await replayEvents([
                    '[?25l[93m[3;3Hecho [97m[2m[3m"hello world"[3;8H[?25h',
                    '[m',
                ]);
                await assertPromptInput('echo |["hello world"]');
                await replayEvents([
                    '[?25l[93m[3;3Hecho [36m"hello world"[?25h',
                    '[m',
                ]);
                await assertPromptInput('echo "hello world"|');
                await replayEvents([
                    ']633;E;echo "hello world";ff464d39-bc80-4bae-9ead-b1cafc4adf6f]633;C',
                ]);
                fireCommandExecuted();
                await assertPromptInput('echo "hello world"');
                await replayEvents([
                    '\r\n',
                    'hello world\r\n',
                ]);
                await assertPromptInput('echo "hello world"');
                await replayEvents([
                    ']633;D;0]633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m03:41:42 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                fireCommandStart();
                await assertPromptInput('|');
            });
            test('input, go to start (ctrl+home), delete word in front (ctrl+delete)', async () => {
                await replayEvents([
                    '[?25l[2J[m[H]0;C:\Program Files\WindowsApps\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\pwsh.exe[?25h',
                    '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                    ']633;P;IsWindows=True',
                    ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                    ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m16:07:06 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/210662 [33m[46m [38;2;17;17;17m$! [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                fireCommandStart();
                await assertPromptInput('|');
                await replayEvents([
                    '[?25l[93mG[97m[2m[3mit push[3;4H[?25h',
                    '[m',
                    '[?25l[93mGe[97m[2m[3mt-ChildItem -Path a[3;5H[?25h',
                    '[m',
                    '[?25l[93m[3;3HGet[97m[2m[3m-ChildItem -Path a[3;6H[?25h',
                ]);
                await assertPromptInput('Get|[-ChildItem -Path a]');
                await replayEvents([
                    '[m',
                    '[?25l[3;3H[?25h',
                    '[21X',
                ]);
                // Don't force a sync, the prompt input model should update by itself
                await timeout(0);
                const actualValueWithCursor = promptInputModel.getCombinedString();
                strictEqual(actualValueWithCursor, '|'.replaceAll('\n', '\u23CE'));
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL2NhcGFiaWxpdGllcy9jb21tYW5kRGV0ZWN0aW9uL3Byb21wdElucHV0TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUErQixNQUFNLHNFQUFzRSxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHaEUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksZ0JBQWtDLENBQUM7SUFDdkMsSUFBSSxLQUFlLENBQUM7SUFDcEIsSUFBSSxjQUF5QyxDQUFDO0lBQzlDLElBQUkscUJBQW9DLENBQUM7SUFDekMsSUFBSSxpQkFBNEMsQ0FBQztJQUVqRCxLQUFLLFVBQVUsWUFBWSxDQUFDLElBQVk7UUFDdkMsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxD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