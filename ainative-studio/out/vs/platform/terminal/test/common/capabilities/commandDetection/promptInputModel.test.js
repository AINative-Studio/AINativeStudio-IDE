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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb24vcHJvbXB0SW5wdXRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQStCLE1BQU0sc0VBQXNFLENBQUM7QUFDckksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUdoRSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxnQkFBa0MsQ0FBQztJQUN2QyxJQUFJLEtBQWUsQ0FBQztJQUNwQixJQUFJLGNBQXlDLENBQUM7SUFDOUMsSUFBSSxxQkFBb0MsQ0FBQztJQUN6QyxJQUFJLGlCQUE0QyxDQUFDO0lBRWpELEtBQUssVUFBVSxZQUFZLENBQUMsSUFBWTtRQUN2QyxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENB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