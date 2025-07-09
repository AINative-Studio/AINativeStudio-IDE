/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isHTMLSpanElement } from '../../../../../base/browser/dom.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { registerColors } from '../../../terminal/common/terminalColorRegistry.js';
import { appendStylizedStringToContainer, calcANSI8bitColor, handleANSIOutput } from '../../browser/debugANSIHandling.js';
import { LinkDetector } from '../../browser/linkDetector.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel } from './mockDebugModel.js';
suite('Debug - ANSI Handling', () => {
    let disposables;
    let model;
    let session;
    let linkDetector;
    /**
     * Instantiate services for use by the functions being tested.
     */
    setup(() => {
        disposables = new DisposableStore();
        model = createMockDebugModel(disposables);
        session = createTestSession(model);
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        linkDetector = instantiationService.createInstance(LinkDetector);
        registerColors();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('appendStylizedStringToContainer', () => {
        const root = document.createElement('span');
        let child;
        assert.strictEqual(0, root.children.length);
        appendStylizedStringToContainer(root, 'content1', ['class1', 'class2'], linkDetector, session.root, undefined, undefined, undefined, undefined, 0);
        appendStylizedStringToContainer(root, 'content2', ['class2', 'class3'], linkDetector, session.root, undefined, undefined, undefined, undefined, 0);
        assert.strictEqual(2, root.children.length);
        child = root.firstChild;
        if (isHTMLSpanElement(child)) {
            assert.strictEqual('content1', child.textContent);
            assert(child.classList.contains('class1'));
            assert(child.classList.contains('class2'));
        }
        else {
            assert.fail('Unexpected assertion error');
        }
        child = root.lastChild;
        if (isHTMLSpanElement(child)) {
            assert.strictEqual('content2', child.textContent);
            assert(child.classList.contains('class2'));
            assert(child.classList.contains('class3'));
        }
        else {
            assert.fail('Unexpected assertion error');
        }
    });
    /**
     * Apply an ANSI sequence to {@link #getSequenceOutput}.
     *
     * @param sequence The ANSI sequence to stylize.
     * @returns An {@link HTMLSpanElement} that contains the stylized text.
     */
    function getSequenceOutput(sequence) {
        const root = handleANSIOutput(sequence, linkDetector, session.root, []);
        assert.strictEqual(1, root.children.length);
        const child = root.lastChild;
        if (isHTMLSpanElement(child)) {
            return child;
        }
        else {
            assert.fail('Unexpected assertion error');
        }
    }
    /**
     * Assert that a given ANSI sequence maintains added content following the ANSI code, and that
     * the provided {@param assertion} passes.
     *
     * @param sequence The ANSI sequence to verify. The provided sequence should contain ANSI codes
     * only, and should not include actual text content as it is provided by this function.
     * @param assertion The function used to verify the output.
     */
    function assertSingleSequenceElement(sequence, assertion) {
        const child = getSequenceOutput(sequence + 'content');
        assert.strictEqual('content', child.textContent);
        assertion(child);
    }
    /**
     * Assert that a given DOM element has the custom inline CSS style matching
     * the color value provided.
     * @param element The HTML span element to look at.
     * @param colorType If `foreground`, will check the element's css `color`;
     * if `background`, will check the element's css `backgroundColor`.
     * if `underline`, will check the elements css `textDecorationColor`.
     * @param color RGBA object to compare color to. If `undefined` or not provided,
     * will assert that no value is set.
     * @param message Optional custom message to pass to assertion.
     * @param colorShouldMatch Optional flag (defaults TO true) which allows caller to indicate that the color SHOULD NOT MATCH
     * (for testing changes to theme colors where we need color to have changed but we don't know exact color it should have
     * changed to (but we do know the color it should NO LONGER BE))
     */
    function assertInlineColor(element, colorType, color, message, colorShouldMatch = true) {
        if (color !== undefined) {
            const cssColor = Color.Format.CSS.formatRGB(new Color(color));
            if (colorType === 'background') {
                const styleBefore = element.style.backgroundColor;
                element.style.backgroundColor = cssColor;
                assert((styleBefore === element.style.backgroundColor) === colorShouldMatch, message || `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
            }
            else if (colorType === 'foreground') {
                const styleBefore = element.style.color;
                element.style.color = cssColor;
                assert((styleBefore === element.style.color) === colorShouldMatch, message || `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
            }
            else {
                const styleBefore = element.style.textDecorationColor;
                element.style.textDecorationColor = cssColor;
                assert((styleBefore === element.style.textDecorationColor) === colorShouldMatch, message || `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
            }
        }
        else {
            if (colorType === 'background') {
                assert(!element.style.backgroundColor, message || `Defined ${colorType} color style found when it should not have been defined`);
            }
            else if (colorType === 'foreground') {
                assert(!element.style.color, message || `Defined ${colorType} color style found when it should not have been defined`);
            }
            else {
                assert(!element.style.textDecorationColor, message || `Defined ${colorType} color style found when it should not have been defined`);
            }
        }
    }
    test('Expected single sequence operation', () => {
        // Bold code
        assertSingleSequenceElement('\x1b[1m', (child) => {
            assert(child.classList.contains('code-bold'), 'Bold formatting not detected after bold ANSI code.');
        });
        // Italic code
        assertSingleSequenceElement('\x1b[3m', (child) => {
            assert(child.classList.contains('code-italic'), 'Italic formatting not detected after italic ANSI code.');
        });
        // Underline code
        assertSingleSequenceElement('\x1b[4m', (child) => {
            assert(child.classList.contains('code-underline'), 'Underline formatting not detected after underline ANSI code.');
        });
        for (let i = 30; i <= 37; i++) {
            const customClassName = 'code-foreground-colored';
            // Foreground colour class
            assertSingleSequenceElement('\x1b[' + i + 'm', (child) => {
                assert(child.classList.contains(customClassName), `Custom foreground class not found on element after foreground ANSI code #${i}.`);
            });
            // Cancellation code removes colour class
            assertSingleSequenceElement('\x1b[' + i + ';39m', (child) => {
                assert(child.classList.contains(customClassName) === false, 'Custom foreground class still found after foreground cancellation code.');
                assertInlineColor(child, 'foreground', undefined, 'Custom color style still found after foreground cancellation code.');
            });
        }
        for (let i = 40; i <= 47; i++) {
            const customClassName = 'code-background-colored';
            // Foreground colour class
            assertSingleSequenceElement('\x1b[' + i + 'm', (child) => {
                assert(child.classList.contains(customClassName), `Custom background class not found on element after background ANSI code #${i}.`);
            });
            // Cancellation code removes colour class
            assertSingleSequenceElement('\x1b[' + i + ';49m', (child) => {
                assert(child.classList.contains(customClassName) === false, 'Custom background class still found after background cancellation code.');
                assertInlineColor(child, 'foreground', undefined, 'Custom color style still found after background cancellation code.');
            });
        }
        // check all basic colors for underlines (full range is checked elsewhere, here we check cancelation)
        for (let i = 0; i <= 255; i++) {
            const customClassName = 'code-underline-colored';
            // Underline colour class
            assertSingleSequenceElement('\x1b[58;5;' + i + 'm', (child) => {
                assert(child.classList.contains(customClassName), `Custom underline color class not found on element after underline color ANSI code 58;5;${i}m.`);
            });
            // Cancellation underline color code removes colour class
            assertSingleSequenceElement('\x1b[58;5;' + i + 'm\x1b[59m', (child) => {
                assert(child.classList.contains(customClassName) === false, 'Custom underline color class still found after underline color cancellation code 59m.');
                assertInlineColor(child, 'underline', undefined, 'Custom underline color style still found after underline color cancellation code 59m.');
            });
        }
        // Different codes do not cancel each other
        assertSingleSequenceElement('\x1b[1;3;4;30;41m', (child) => {
            assert.strictEqual(5, child.classList.length, 'Incorrect number of classes found for different ANSI codes.');
            assert(child.classList.contains('code-bold'));
            assert(child.classList.contains('code-italic'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-underline'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-foreground-colored'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-background-colored'), 'Different ANSI codes should not cancel each other.');
        });
        // Different codes do not ACCUMULATE more than one copy of each class
        assertSingleSequenceElement('\x1b[1;1;2;2;3;3;4;4;5;5;6;6;8;8;9;9;21;21;53;53;73;73;74;74m', (child) => {
            assert(child.classList.contains('code-bold'));
            assert(child.classList.contains('code-italic'), 'italic missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-underline') === false, 'underline PRESENT and double underline should have removed it- Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-dim'), 'dim missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-blink'), 'blink missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-rapid-blink'), 'rapid blink mkssing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-double-underline'), 'double underline missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-hidden'), 'hidden missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-strike-through'), 'strike-through missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-overline'), 'overline missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-superscript') === false, 'superscript PRESENT and subscript should have removed it- Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-subscript'), 'subscript missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert.strictEqual(10, child.classList.length, 'Incorrect number of classes found for each style code sent twice ANSI codes.');
        });
        // More Different codes do not cancel each other
        assertSingleSequenceElement('\x1b[1;2;5;6;21;8;9m', (child) => {
            assert.strictEqual(7, child.classList.length, 'Incorrect number of classes found for different ANSI codes.');
            assert(child.classList.contains('code-bold'));
            assert(child.classList.contains('code-dim'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-blink'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-rapid-blink'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-double-underline'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-hidden'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-strike-through'), 'Different ANSI codes should not cancel each other.');
        });
        // New foreground codes don't remove old background codes and vice versa
        assertSingleSequenceElement('\x1b[40;31;42;33m', (child) => {
            assert.strictEqual(2, child.classList.length);
            assert(child.classList.contains('code-background-colored'), 'New foreground ANSI code should not cancel existing background formatting.');
            assert(child.classList.contains('code-foreground-colored'), 'New background ANSI code should not cancel existing foreground formatting.');
        });
        // Duplicate codes do not change output
        assertSingleSequenceElement('\x1b[1;1;4;1;4;4;1;4m', (child) => {
            assert(child.classList.contains('code-bold'), 'Duplicate formatting codes should have no effect.');
            assert(child.classList.contains('code-underline'), 'Duplicate formatting codes should have no effect.');
        });
        // Extra terminating semicolon does not change output
        assertSingleSequenceElement('\x1b[1;4;m', (child) => {
            assert(child.classList.contains('code-bold'), 'Extra semicolon after ANSI codes should have no effect.');
            assert(child.classList.contains('code-underline'), 'Extra semicolon after ANSI codes should have no effect.');
        });
        // Cancellation code removes multiple codes
        assertSingleSequenceElement('\x1b[1;4;30;41;32;43;34;45;36;47;0m', (child) => {
            assert.strictEqual(0, child.classList.length, 'Cancellation ANSI code should clear ALL formatting.');
            assertInlineColor(child, 'background', undefined, 'Cancellation ANSI code should clear ALL formatting.');
            assertInlineColor(child, 'foreground', undefined, 'Cancellation ANSI code should clear ALL formatting.');
        });
    });
    test('Expected single 8-bit color sequence operation', () => {
        // Basic and bright color codes specified with 8-bit color code format
        for (let i = 0; i <= 15; i++) {
            // As these are controlled by theme, difficult to check actual color value
            // Foreground codes should add standard classes
            assertSingleSequenceElement('\x1b[38;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-foreground-colored'), `Custom color class not found after foreground 8-bit color code 38;5;${i}`);
            });
            // Background codes should add standard classes
            assertSingleSequenceElement('\x1b[48;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-background-colored'), `Custom color class not found after background 8-bit color code 48;5;${i}`);
            });
        }
        // 8-bit advanced colors
        for (let i = 16; i <= 255; i++) {
            // Foreground codes should add custom class and inline style
            assertSingleSequenceElement('\x1b[38;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-foreground-colored'), `Custom color class not found after foreground 8-bit color code 38;5;${i}`);
                assertInlineColor(child, 'foreground', calcANSI8bitColor(i), `Incorrect or no color styling found after foreground 8-bit color code 38;5;${i}`);
            });
            // Background codes should add custom class and inline style
            assertSingleSequenceElement('\x1b[48;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-background-colored'), `Custom color class not found after background 8-bit color code 48;5;${i}`);
                assertInlineColor(child, 'background', calcANSI8bitColor(i), `Incorrect or no color styling found after background 8-bit color code 48;5;${i}`);
            });
            // Color underline codes should add custom class and inline style
            assertSingleSequenceElement('\x1b[58;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-underline-colored'), `Custom color class not found after underline 8-bit color code 58;5;${i}`);
                assertInlineColor(child, 'underline', calcANSI8bitColor(i), `Incorrect or no color styling found after underline 8-bit color code 58;5;${i}`);
            });
        }
        // Bad (nonexistent) color should not render
        assertSingleSequenceElement('\x1b[48;5;300m', (child) => {
            assert.strictEqual(0, child.classList.length, 'Bad ANSI color codes should have no effect.');
        });
        // Should ignore any codes after the ones needed to determine color
        assertSingleSequenceElement('\x1b[48;5;100;42;77;99;4;24m', (child) => {
            assert(child.classList.contains('code-background-colored'));
            assert.strictEqual(1, child.classList.length);
            assertInlineColor(child, 'background', calcANSI8bitColor(100));
        });
    });
    test('Expected single 24-bit color sequence operation', () => {
        // 24-bit advanced colors
        for (let r = 0; r <= 255; r += 64) {
            for (let g = 0; g <= 255; g += 64) {
                for (let b = 0; b <= 255; b += 64) {
                    const color = new RGBA(r, g, b);
                    // Foreground codes should add class and inline style
                    assertSingleSequenceElement(`\x1b[38;2;${r};${g};${b}m`, (child) => {
                        assert(child.classList.contains('code-foreground-colored'), 'DOM should have "code-foreground-colored" class for advanced ANSI colors.');
                        assertInlineColor(child, 'foreground', color);
                    });
                    // Background codes should add class and inline style
                    assertSingleSequenceElement(`\x1b[48;2;${r};${g};${b}m`, (child) => {
                        assert(child.classList.contains('code-background-colored'), 'DOM should have "code-foreground-colored" class for advanced ANSI colors.');
                        assertInlineColor(child, 'background', color);
                    });
                    // Underline color codes should add class and inline style
                    assertSingleSequenceElement(`\x1b[58;2;${r};${g};${b}m`, (child) => {
                        assert(child.classList.contains('code-underline-colored'), 'DOM should have "code-underline-colored" class for advanced ANSI colors.');
                        assertInlineColor(child, 'underline', color);
                    });
                }
            }
        }
        // Invalid color should not render
        assertSingleSequenceElement('\x1b[38;2;4;4m', (child) => {
            assert.strictEqual(0, child.classList.length, `Invalid color code "38;2;4;4" should not add a class (classes found: ${child.classList}).`);
            assert(!child.style.color, `Invalid color code "38;2;4;4" should not add a custom color CSS (found color: ${child.style.color}).`);
        });
        // Bad (nonexistent) color should not render
        assertSingleSequenceElement('\x1b[48;2;150;300;5m', (child) => {
            assert.strictEqual(0, child.classList.length, `Nonexistent color code "48;2;150;300;5" should not add a class (classes found: ${child.classList}).`);
        });
        // Should ignore any codes after the ones needed to determine color
        assertSingleSequenceElement('\x1b[48;2;100;42;77;99;200;75m', (child) => {
            assert(child.classList.contains('code-background-colored'), `Color code with extra (valid) items "48;2;100;42;77;99;200;75" should still treat initial part as valid code and add class "code-background-custom".`);
            assert.strictEqual(1, child.classList.length, `Color code with extra items "48;2;100;42;77;99;200;75" should add one and only one class. (classes found: ${child.classList}).`);
            assertInlineColor(child, 'background', new RGBA(100, 42, 77), `Color code "48;2;100;42;77;99;200;75" should  style background-color as rgb(100,42,77).`);
        });
    });
    /**
     * Assert that a given ANSI sequence produces the expected number of {@link HTMLSpanElement} children. For
     * each child, run the provided assertion.
     *
     * @param sequence The ANSI sequence to verify.
     * @param assertions A set of assertions to run on the resulting children.
     */
    function assertMultipleSequenceElements(sequence, assertions, elementsExpected) {
        if (elementsExpected === undefined) {
            elementsExpected = assertions.length;
        }
        const root = handleANSIOutput(sequence, linkDetector, session.root, []);
        assert.strictEqual(elementsExpected, root.children.length);
        for (let i = 0; i < elementsExpected; i++) {
            const child = root.children[i];
            if (isHTMLSpanElement(child)) {
                assertions[i](child);
            }
            else {
                assert.fail('Unexpected assertion error');
            }
        }
    }
    test('Expected multiple sequence operation', () => {
        // Multiple codes affect the same text
        assertSingleSequenceElement('\x1b[1m\x1b[3m\x1b[4m\x1b[32m', (child) => {
            assert(child.classList.contains('code-bold'), 'Bold class not found after multiple different ANSI codes.');
            assert(child.classList.contains('code-italic'), 'Italic class not found after multiple different ANSI codes.');
            assert(child.classList.contains('code-underline'), 'Underline class not found after multiple different ANSI codes.');
            assert(child.classList.contains('code-foreground-colored'), 'Foreground color class not found after multiple different ANSI codes.');
        });
        // Consecutive codes do not affect previous ones
        assertMultipleSequenceElements('\x1b[1mbold\x1b[32mgreen\x1b[4munderline\x1b[3mitalic\x1b[0mnothing', [
            (bold) => {
                assert.strictEqual(1, bold.classList.length);
                assert(bold.classList.contains('code-bold'), 'Bold class not found after bold ANSI code.');
            },
            (green) => {
                assert.strictEqual(2, green.classList.length);
                assert(green.classList.contains('code-bold'), 'Bold class not found after both bold and color ANSI codes.');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (underline) => {
                assert.strictEqual(3, underline.classList.length);
                assert(underline.classList.contains('code-bold'), 'Bold class not found after bold, color, and underline ANSI codes.');
                assert(underline.classList.contains('code-foreground-colored'), 'Color class not found after color and underline ANSI codes.');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code.');
            },
            (italic) => {
                assert.strictEqual(4, italic.classList.length);
                assert(italic.classList.contains('code-bold'), 'Bold class not found after bold, color, underline, and italic ANSI codes.');
                assert(italic.classList.contains('code-foreground-colored'), 'Color class not found after color, underline, and italic ANSI codes.');
                assert(italic.classList.contains('code-underline'), 'Underline class not found after underline and italic ANSI codes.');
                assert(italic.classList.contains('code-italic'), 'Italic class not found after italic ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 5);
        // Consecutive codes with ENDING/OFF codes do not LEAVE affect previous ones
        assertMultipleSequenceElements('\x1b[1mbold\x1b[22m\x1b[32mgreen\x1b[4munderline\x1b[24m\x1b[3mitalic\x1b[23mjustgreen\x1b[0mnothing', [
            (bold) => {
                assert.strictEqual(1, bold.classList.length);
                assert(bold.classList.contains('code-bold'), 'Bold class not found after bold ANSI code.');
            },
            (green) => {
                assert.strictEqual(1, green.classList.length);
                assert(green.classList.contains('code-bold') === false, 'Bold class found after both bold WAS TURNED OFF with 22m');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (underline) => {
                assert.strictEqual(2, underline.classList.length);
                assert(underline.classList.contains('code-foreground-colored'), 'Color class not found after color and underline ANSI codes.');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code.');
            },
            (italic) => {
                assert.strictEqual(2, italic.classList.length);
                assert(italic.classList.contains('code-foreground-colored'), 'Color class not found after color, underline, and italic ANSI codes.');
                assert(italic.classList.contains('code-underline') === false, 'Underline class found after underline WAS TURNED OFF with 24m');
                assert(italic.classList.contains('code-italic'), 'Italic class not found after italic ANSI code.');
            },
            (justgreen) => {
                assert.strictEqual(1, justgreen.classList.length);
                assert(justgreen.classList.contains('code-italic') === false, 'Italic class found after italic WAS TURNED OFF with 23m');
                assert(justgreen.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 6);
        // more Consecutive codes with ENDING/OFF codes do not LEAVE affect previous ones
        assertMultipleSequenceElements('\x1b[2mdim\x1b[22m\x1b[32mgreen\x1b[5mslowblink\x1b[25m\x1b[6mrapidblink\x1b[25mjustgreen\x1b[0mnothing', [
            (dim) => {
                assert.strictEqual(1, dim.classList.length);
                assert(dim.classList.contains('code-dim'), 'Dim class not found after dim ANSI code 2m.');
            },
            (green) => {
                assert.strictEqual(1, green.classList.length);
                assert(green.classList.contains('code-dim') === false, 'Dim class found after dim WAS TURNED OFF with 22m');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (slowblink) => {
                assert.strictEqual(2, slowblink.classList.length);
                assert(slowblink.classList.contains('code-foreground-colored'), 'Color class not found after color and blink ANSI codes.');
                assert(slowblink.classList.contains('code-blink'), 'Blink class not found after underline ANSI code 5m.');
            },
            (rapidblink) => {
                assert.strictEqual(2, rapidblink.classList.length);
                assert(rapidblink.classList.contains('code-foreground-colored'), 'Color class not found after color, blink, and rapid blink ANSI codes.');
                assert(rapidblink.classList.contains('code-blink') === false, 'blink class found after underline WAS TURNED OFF with 25m');
                assert(rapidblink.classList.contains('code-rapid-blink'), 'Rapid blink class not found after rapid blink ANSI code 6m.');
            },
            (justgreen) => {
                assert.strictEqual(1, justgreen.classList.length);
                assert(justgreen.classList.contains('code-rapid-blink') === false, 'Rapid blink class found after rapid blink WAS TURNED OFF with 25m');
                assert(justgreen.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 6);
        // more Consecutive codes with ENDING/OFF codes do not LEAVE affect previous ones
        assertMultipleSequenceElements('\x1b[8mhidden\x1b[28m\x1b[32mgreen\x1b[9mcrossedout\x1b[29m\x1b[21mdoubleunderline\x1b[24mjustgreen\x1b[0mnothing', [
            (hidden) => {
                assert.strictEqual(1, hidden.classList.length);
                assert(hidden.classList.contains('code-hidden'), 'Hidden class not found after dim ANSI code 8m.');
            },
            (green) => {
                assert.strictEqual(1, green.classList.length);
                assert(green.classList.contains('code-hidden') === false, 'Hidden class found after Hidden WAS TURNED OFF with 28m');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (crossedout) => {
                assert.strictEqual(2, crossedout.classList.length);
                assert(crossedout.classList.contains('code-foreground-colored'), 'Color class not found after color and hidden ANSI codes.');
                assert(crossedout.classList.contains('code-strike-through'), 'strike-through class not found after crossout/strikethrough ANSI code 9m.');
            },
            (doubleunderline) => {
                assert.strictEqual(2, doubleunderline.classList.length);
                assert(doubleunderline.classList.contains('code-foreground-colored'), 'Color class not found after color, hidden, and crossedout ANSI codes.');
                assert(doubleunderline.classList.contains('code-strike-through') === false, 'strike-through class found after strike-through WAS TURNED OFF with 29m');
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline ANSI code 21m.');
            },
            (justgreen) => {
                assert.strictEqual(1, justgreen.classList.length);
                assert(justgreen.classList.contains('code-double-underline') === false, 'Double underline class found after double underline WAS TURNED OFF with 24m');
                assert(justgreen.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 6);
        // underline, double underline are mutually exclusive, test underline->double underline->off and double underline->underline->off
        assertMultipleSequenceElements('\x1b[4munderline\x1b[21mdouble underline\x1b[24munderlineOff\x1b[21mdouble underline\x1b[4munderline\x1b[24munderlineOff', [
            (underline) => {
                assert.strictEqual(1, underline.classList.length);
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code 4m.');
            },
            (doubleunderline) => {
                assert(doubleunderline.classList.contains('code-underline') === false, 'Underline class found after double underline code 21m');
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline code 21m');
                assert.strictEqual(1, doubleunderline.classList.length, 'should have found only double underline');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after underline off code 4m.');
            },
            (doubleunderline) => {
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline code 21m');
                assert.strictEqual(1, doubleunderline.classList.length, 'should have found only double underline');
            },
            (underline) => {
                assert(underline.classList.contains('code-double-underline') === false, 'Double underline class found after underline code 4m');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code 4m.');
                assert.strictEqual(1, underline.classList.length, 'should have found only underline');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after underline off code 4m.');
            },
        ], 6);
        // underline and strike-through and overline can exist at the same time and
        // in any combination
        assertMultipleSequenceElements('\x1b[4munderline\x1b[9mand strikethough\x1b[53mand overline\x1b[24munderlineOff\x1b[55moverlineOff\x1b[29mstriklethoughOff', [
            (underline) => {
                assert.strictEqual(1, underline.classList.length, 'should have found only underline');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code 4m.');
            },
            (strikethrough) => {
                assert(strikethrough.classList.contains('code-underline'), 'Underline class NOT found after strikethrough code 9m');
                assert(strikethrough.classList.contains('code-strike-through'), 'Strike through class not found after strikethrough code 9m');
                assert.strictEqual(2, strikethrough.classList.length, 'should have found underline and strikethrough');
            },
            (overline) => {
                assert(overline.classList.contains('code-underline'), 'Underline class NOT found after overline code 53m');
                assert(overline.classList.contains('code-strike-through'), 'Strike through class not found after overline code 53m');
                assert(overline.classList.contains('code-overline'), 'Overline class not found after overline code 53m');
                assert.strictEqual(3, overline.classList.length, 'should have found underline,strikethrough and overline');
            },
            (underlineoff) => {
                assert(underlineoff.classList.contains('code-underline') === false, 'Underline class found after underline off code 24m');
                assert(underlineoff.classList.contains('code-strike-through'), 'Strike through class not found after underline off code 24m');
                assert(underlineoff.classList.contains('code-overline'), 'Overline class not found after underline off code 24m');
                assert.strictEqual(2, underlineoff.classList.length, 'should have found strikethrough and overline');
            },
            (overlineoff) => {
                assert(overlineoff.classList.contains('code-underline') === false, 'Underline class found after overline off code 55m');
                assert(overlineoff.classList.contains('code-overline') === false, 'Overline class found after overline off code 55m');
                assert(overlineoff.classList.contains('code-strike-through'), 'Strike through class not found after overline off code 55m');
                assert.strictEqual(1, overlineoff.classList.length, 'should have found only strikethrough');
            },
            (nothing) => {
                assert(nothing.classList.contains('code-strike-through') === false, 'Strike through class found after strikethrough off code 29m');
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after strikethough OFF code 29m');
            },
        ], 6);
        // double underline and strike-through and overline can exist at the same time and
        // in any combination
        assertMultipleSequenceElements('\x1b[21mdoubleunderline\x1b[9mand strikethough\x1b[53mand overline\x1b[29mstriklethoughOff\x1b[55moverlineOff\x1b[24munderlineOff', [
            (doubleunderline) => {
                assert.strictEqual(1, doubleunderline.classList.length, 'should have found only doubleunderline');
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline ANSI code 21m.');
            },
            (strikethrough) => {
                assert(strikethrough.classList.contains('code-double-underline'), 'Double nderline class NOT found after strikethrough code 9m');
                assert(strikethrough.classList.contains('code-strike-through'), 'Strike through class not found after strikethrough code 9m');
                assert.strictEqual(2, strikethrough.classList.length, 'should have found doubleunderline and strikethrough');
            },
            (overline) => {
                assert(overline.classList.contains('code-double-underline'), 'Double underline class NOT found after overline code 53m');
                assert(overline.classList.contains('code-strike-through'), 'Strike through class not found after overline code 53m');
                assert(overline.classList.contains('code-overline'), 'Overline class not found after overline code 53m');
                assert.strictEqual(3, overline.classList.length, 'should have found doubleunderline,overline and strikethrough');
            },
            (strikethrougheoff) => {
                assert(strikethrougheoff.classList.contains('code-double-underline'), 'Double underline class NOT found after strikethrough off code 29m');
                assert(strikethrougheoff.classList.contains('code-overline'), 'Overline class NOT found after strikethrough off code 29m');
                assert(strikethrougheoff.classList.contains('code-strike-through') === false, 'Strike through class found after strikethrough off code 29m');
                assert.strictEqual(2, strikethrougheoff.classList.length, 'should have found doubleunderline and overline');
            },
            (overlineoff) => {
                assert(overlineoff.classList.contains('code-double-underline'), 'Double underline class NOT found after overline off code 55m');
                assert(overlineoff.classList.contains('code-strike-through') === false, 'Strike through class found after overline off code 55m');
                assert(overlineoff.classList.contains('code-overline') === false, 'Overline class found after overline off code 55m');
                assert.strictEqual(1, overlineoff.classList.length, 'Should have found only double underline');
            },
            (nothing) => {
                assert(nothing.classList.contains('code-double-underline') === false, 'Double underline class found after underline off code 24m');
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after underline OFF code 24m');
            },
        ], 6);
        // superscript and subscript are mutually exclusive, test superscript->subscript->off and subscript->superscript->off
        assertMultipleSequenceElements('\x1b[73msuperscript\x1b[74msubscript\x1b[75mneither\x1b[74msubscript\x1b[73msuperscript\x1b[75mneither', [
            (superscript) => {
                assert.strictEqual(1, superscript.classList.length, 'should only be superscript class');
                assert(superscript.classList.contains('code-superscript'), 'Superscript class not found after superscript ANSI code 73m.');
            },
            (subscript) => {
                assert(subscript.classList.contains('code-superscript') === false, 'Superscript class found after subscript code 74m');
                assert(subscript.classList.contains('code-subscript'), 'Subscript class not found after subscript code 74m');
                assert.strictEqual(1, subscript.classList.length, 'should have found only subscript class');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after superscript/subscript off code 75m.');
            },
            (subscript) => {
                assert(subscript.classList.contains('code-subscript'), 'Subscript class not found after subscript code 74m');
                assert.strictEqual(1, subscript.classList.length, 'should have found only subscript class');
            },
            (superscript) => {
                assert(superscript.classList.contains('code-subscript') === false, 'Subscript class found after superscript code 73m');
                assert(superscript.classList.contains('code-superscript'), 'Superscript class not found after superscript ANSI code 73m.');
                assert.strictEqual(1, superscript.classList.length, 'should have found only superscript class');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after superscipt/subscript off code 75m.');
            },
        ], 6);
        // Consecutive font codes switch to new font class and remove previous and then final switch to default font removes class
        assertMultipleSequenceElements('\x1b[11mFont1\x1b[12mFont2\x1b[13mFont3\x1b[14mFont4\x1b[15mFont5\x1b[10mdefaultFont', [
            (font1) => {
                assert.strictEqual(1, font1.classList.length);
                assert(font1.classList.contains('code-font-1'), 'font 1 class NOT found after switch to font 1 with ANSI code 11m');
            },
            (font2) => {
                assert.strictEqual(1, font2.classList.length);
                assert(font2.classList.contains('code-font-1') === false, 'font 1 class found after switch to font 2 with ANSI code 12m');
                assert(font2.classList.contains('code-font-2'), 'font 2 class NOT found after switch to font 2 with ANSI code 12m');
            },
            (font3) => {
                assert.strictEqual(1, font3.classList.length);
                assert(font3.classList.contains('code-font-2') === false, 'font 2 class found after switch to font 3 with ANSI code 13m');
                assert(font3.classList.contains('code-font-3'), 'font 3 class NOT found after switch to font 3 with ANSI code 13m');
            },
            (font4) => {
                assert.strictEqual(1, font4.classList.length);
                assert(font4.classList.contains('code-font-3') === false, 'font 3 class found after switch to font 4 with ANSI code 14m');
                assert(font4.classList.contains('code-font-4'), 'font 4 class NOT found after switch to font 4 with ANSI code 14m');
            },
            (font5) => {
                assert.strictEqual(1, font5.classList.length);
                assert(font5.classList.contains('code-font-4') === false, 'font 4 class found after switch to font 5 with ANSI code 15m');
                assert(font5.classList.contains('code-font-5'), 'font 5 class NOT found after switch to font 5 with ANSI code 15m');
            },
            (defaultfont) => {
                assert.strictEqual(0, defaultfont.classList.length, 'One or more font style classes still found after reset to default font with ANSI code 10m.');
            },
        ], 6);
        // More Consecutive font codes switch to new font class and remove previous and then final switch to default font removes class
        assertMultipleSequenceElements('\x1b[16mFont6\x1b[17mFont7\x1b[18mFont8\x1b[19mFont9\x1b[20mFont10\x1b[10mdefaultFont', [
            (font6) => {
                assert.strictEqual(1, font6.classList.length);
                assert(font6.classList.contains('code-font-6'), 'font 6 class NOT found after switch to font 6 with ANSI code 16m');
            },
            (font7) => {
                assert.strictEqual(1, font7.classList.length);
                assert(font7.classList.contains('code-font-6') === false, 'font 6 class found after switch to font 7 with ANSI code 17m');
                assert(font7.classList.contains('code-font-7'), 'font 7 class NOT found after switch to font 7 with ANSI code 17m');
            },
            (font8) => {
                assert.strictEqual(1, font8.classList.length);
                assert(font8.classList.contains('code-font-7') === false, 'font 7 class found after switch to font 8 with ANSI code 18m');
                assert(font8.classList.contains('code-font-8'), 'font 8 class NOT found after switch to font 8 with ANSI code 18m');
            },
            (font9) => {
                assert.strictEqual(1, font9.classList.length);
                assert(font9.classList.contains('code-font-8') === false, 'font 8 class found after switch to font 9 with ANSI code 19m');
                assert(font9.classList.contains('code-font-9'), 'font 9 class NOT found after switch to font 9 with ANSI code 19m');
            },
            (font10) => {
                assert.strictEqual(1, font10.classList.length);
                assert(font10.classList.contains('code-font-9') === false, 'font 9 class found after switch to font 10 with ANSI code 20m');
                assert(font10.classList.contains('code-font-10'), `font 10 class NOT found after switch to font 10 with ANSI code 20m (${font10.classList})`);
            },
            (defaultfont) => {
                assert.strictEqual(0, defaultfont.classList.length, 'One or more font style classes (2nd series) still found after reset to default font with ANSI code 10m.');
            },
        ], 6);
        // Blackletter font codes can be turned off with other font codes or 23m
        assertMultipleSequenceElements('\x1b[3mitalic\x1b[20mfont10blacklatter\x1b[23mitalicAndBlackletterOff\x1b[20mFont10Again\x1b[11mFont1\x1b[10mdefaultFont', [
            (italic) => {
                assert.strictEqual(1, italic.classList.length);
                assert(italic.classList.contains('code-italic'), 'italic class NOT found after italic code ANSI code 3m');
            },
            (font10) => {
                assert.strictEqual(2, font10.classList.length);
                assert(font10.classList.contains('code-italic'), 'no itatic class found after switch to font 10 (blackletter) with ANSI code 20m');
                assert(font10.classList.contains('code-font-10'), 'font 10 class NOT found after switch to font 10 with ANSI code 20m');
            },
            (italicAndBlackletterOff) => {
                assert.strictEqual(0, italicAndBlackletterOff.classList.length, 'italic or blackletter (font10) class found after both switched off with ANSI code 23m');
            },
            (font10) => {
                assert.strictEqual(1, font10.classList.length);
                assert(font10.classList.contains('code-font-10'), 'font 10 class NOT found after switch to font 10 with ANSI code 20m');
            },
            (font1) => {
                assert.strictEqual(1, font1.classList.length);
                assert(font1.classList.contains('code-font-10') === false, 'font 10 class found after switch to font 1 with ANSI code 11m');
                assert(font1.classList.contains('code-font-1'), 'font 1 class NOT found after switch to font 1 with ANSI code 11m');
            },
            (defaultfont) => {
                assert.strictEqual(0, defaultfont.classList.length, 'One or more font style classes (2nd series) still found after reset to default font with ANSI code 10m.');
            },
        ], 6);
        // italic can be turned on/off with affecting font codes 1-9  (italic off will clear 'blackletter'(font 23) as per spec)
        assertMultipleSequenceElements('\x1b[3mitalic\x1b[12mfont2\x1b[23mitalicOff\x1b[3mitalicFont2\x1b[10mjustitalic\x1b[23mnothing', [
            (italic) => {
                assert.strictEqual(1, italic.classList.length);
                assert(italic.classList.contains('code-italic'), 'italic class NOT found after italic code ANSI code 3m');
            },
            (font10) => {
                assert.strictEqual(2, font10.classList.length);
                assert(font10.classList.contains('code-italic'), 'no itatic class found after switch to font 2 with ANSI code 12m');
                assert(font10.classList.contains('code-font-2'), 'font 2 class NOT found after switch to font 2 with ANSI code 12m');
            },
            (italicOff) => {
                assert.strictEqual(1, italicOff.classList.length, 'italic class found after both switched off with ANSI code 23m');
                assert(italicOff.classList.contains('code-italic') === false, 'itatic class found after switching it OFF with ANSI code 23m');
                assert(italicOff.classList.contains('code-font-2'), 'font 2 class NOT found after switching italic off with ANSI code 23m');
            },
            (italicFont2) => {
                assert.strictEqual(2, italicFont2.classList.length);
                assert(italicFont2.classList.contains('code-italic'), 'no itatic class found after italic ANSI code 3m');
                assert(italicFont2.classList.contains('code-font-2'), 'font 2 class NOT found after italic ANSI code 3m');
            },
            (justitalic) => {
                assert.strictEqual(1, justitalic.classList.length);
                assert(justitalic.classList.contains('code-font-2') === false, 'font 2 class found after switch to default font with ANSI code 10m');
                assert(justitalic.classList.contains('code-italic'), 'italic class NOT found after switch to default font with ANSI code 10m');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more classes still found after final italic removal with ANSI code 23m.');
            },
        ], 6);
        // Reverse video reverses Foreground/Background colors WITH both SET and can called in sequence
        assertMultipleSequenceElements('\x1b[38;2;10;20;30mfg10,20,30\x1b[48;2;167;168;169mbg167,168,169\x1b[7m8ReverseVideo\x1b[7mDuplicateReverseVideo\x1b[27mReverseOff\x1b[27mDupReverseOff', [
            (fg10_20_30) => {
                assert.strictEqual(1, fg10_20_30.classList.length, 'Foreground ANSI color code should add one class.');
                assert(fg10_20_30.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(fg10_20_30, 'foreground', new RGBA(10, 20, 30), '24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (bg167_168_169) => {
                assert.strictEqual(2, bg167_168_169.classList.length, 'background ANSI color codes should only add a single class.');
                assert(bg167_168_169.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom background color class.');
                assertInlineColor(bg167_168_169, 'background', new RGBA(167, 168, 169), '24-bit RGBA ANSI background color code (167,168,169) should add matching color inline style.');
                assert(bg167_168_169.classList.contains('code-foreground-colored'), 'Still Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(bg167_168_169, 'foreground', new RGBA(10, 20, 30), 'Still 24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (reverseVideo) => {
                assert.strictEqual(2, reverseVideo.classList.length, 'background ANSI color codes should only add a single class.');
                assert(reverseVideo.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom background color class.');
                assertInlineColor(reverseVideo, 'foreground', new RGBA(167, 168, 169), 'Reversed 24-bit RGBA ANSI foreground color code (167,168,169) should add matching former background color inline style.');
                assert(reverseVideo.classList.contains('code-foreground-colored'), 'Still Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(reverseVideo, 'background', new RGBA(10, 20, 30), 'Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former foreground color inline style.');
            },
            (dupReverseVideo) => {
                assert.strictEqual(2, dupReverseVideo.classList.length, 'After second Reverse Video - background ANSI color codes should only add a single class.');
                assert(dupReverseVideo.classList.contains('code-background-colored'), 'After second Reverse Video - Background ANSI color codes should add custom background color class.');
                assertInlineColor(dupReverseVideo, 'foreground', new RGBA(167, 168, 169), 'After second Reverse Video - Reversed 24-bit RGBA ANSI foreground color code (167,168,169) should add matching former background color inline style.');
                assert(dupReverseVideo.classList.contains('code-foreground-colored'), 'After second Reverse Video - Still Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(dupReverseVideo, 'background', new RGBA(10, 20, 30), 'After second Reverse Video - Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former foreground color inline style.');
            },
            (reversedBack) => {
                assert.strictEqual(2, reversedBack.classList.length, 'Reversed Back - background ANSI color codes should only add a single class.');
                assert(reversedBack.classList.contains('code-background-colored'), 'Reversed Back - Background ANSI color codes should add custom background color class.');
                assertInlineColor(reversedBack, 'background', new RGBA(167, 168, 169), 'Reversed Back - 24-bit RGBA ANSI background color code (167,168,169) should add matching color inline style.');
                assert(reversedBack.classList.contains('code-foreground-colored'), 'Reversed Back -  Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(reversedBack, 'foreground', new RGBA(10, 20, 30), 'Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (dupReversedBack) => {
                assert.strictEqual(2, dupReversedBack.classList.length, '2nd Reversed Back - background ANSI color codes should only add a single class.');
                assert(dupReversedBack.classList.contains('code-background-colored'), '2nd Reversed Back - Background ANSI color codes should add custom background color class.');
                assertInlineColor(dupReversedBack, 'background', new RGBA(167, 168, 169), '2nd Reversed Back - 24-bit RGBA ANSI background color code (167,168,169) should add matching color inline style.');
                assert(dupReversedBack.classList.contains('code-foreground-colored'), '2nd Reversed Back -  Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(dupReversedBack, 'foreground', new RGBA(10, 20, 30), '2nd Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
        ], 6);
        // Reverse video reverses Foreground/Background colors WITH ONLY foreground color SET
        assertMultipleSequenceElements('\x1b[38;2;10;20;30mfg10,20,30\x1b[7m8ReverseVideo\x1b[27mReverseOff', [
            (fg10_20_30) => {
                assert.strictEqual(1, fg10_20_30.classList.length, 'Foreground ANSI color code should add one class.');
                assert(fg10_20_30.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(fg10_20_30, 'foreground', new RGBA(10, 20, 30), '24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (reverseVideo) => {
                assert.strictEqual(1, reverseVideo.classList.length, 'Background ANSI color codes should only add a single class.');
                assert(reverseVideo.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom background color class.');
                assert(reverseVideo.classList.contains('code-foreground-colored') === false, 'After Reverse with NO background the Foreground ANSI color codes should NOT BE SET.');
                assertInlineColor(reverseVideo, 'background', new RGBA(10, 20, 30), 'Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former foreground color inline style.');
            },
            (reversedBack) => {
                assert.strictEqual(1, reversedBack.classList.length, 'Reversed Back - background ANSI color codes should only add a single class.');
                assert(reversedBack.classList.contains('code-background-colored') === false, 'AFTER Reversed Back - Background ANSI color should NOT BE SET.');
                assert(reversedBack.classList.contains('code-foreground-colored'), 'Reversed Back -  Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(reversedBack, 'foreground', new RGBA(10, 20, 30), 'Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
        ], 3);
        // Reverse video reverses Foreground/Background colors WITH ONLY background color SET
        assertMultipleSequenceElements('\x1b[48;2;167;168;169mbg167,168,169\x1b[7m8ReverseVideo\x1b[27mReverseOff', [
            (bg167_168_169) => {
                assert.strictEqual(1, bg167_168_169.classList.length, 'Background ANSI color code should add one class.');
                assert(bg167_168_169.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom foreground color class.');
                assertInlineColor(bg167_168_169, 'background', new RGBA(167, 168, 169), '24-bit RGBA ANSI color code (167, 168, 169) should add matching background color inline style.');
            },
            (reverseVideo) => {
                assert.strictEqual(1, reverseVideo.classList.length, 'After ReverseVideo Foreground ANSI color codes should only add a single class.');
                assert(reverseVideo.classList.contains('code-foreground-colored'), 'After ReverseVideo Foreground ANSI color codes should add custom background color class.');
                assert(reverseVideo.classList.contains('code-background-colored') === false, 'After Reverse with NO foreground color the background ANSI color codes should BE SET.');
                assertInlineColor(reverseVideo, 'foreground', new RGBA(167, 168, 169), 'Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former background color inline style.');
            },
            (reversedBack) => {
                assert.strictEqual(1, reversedBack.classList.length, 'Reversed Back - background ANSI color codes should only add a single class.');
                assert(reversedBack.classList.contains('code-foreground-colored') === false, 'AFTER Reversed Back - Foreground ANSI color should NOT BE SET.');
                assert(reversedBack.classList.contains('code-background-colored'), 'Reversed Back -  Background ANSI color codes should add custom background color class.');
                assertInlineColor(reversedBack, 'background', new RGBA(167, 168, 169), 'Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching background color inline style.');
            },
        ], 3);
        // Underline color Different types of color codes still cancel each other
        assertMultipleSequenceElements('\x1b[58;2;101;102;103m24bitUnderline101,102,103\x1b[58;5;3m8bitsimpleUnderline\x1b[58;2;104;105;106m24bitUnderline104,105,106\x1b[58;5;101m8bitadvanced\x1b[58;2;200;200;200munderline200,200,200\x1b[59mUnderlineColorResetToDefault', [
            (adv24Bit) => {
                assert.strictEqual(1, adv24Bit.classList.length, 'Underline ANSI color codes should only add a single class (1).');
                assert(adv24Bit.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                assertInlineColor(adv24Bit, 'underline', new RGBA(101, 102, 103), '24-bit RGBA ANSI color code (101,102,103) should add matching color inline style.');
            },
            (adv8BitSimple) => {
                assert.strictEqual(1, adv8BitSimple.classList.length, 'Multiple underline ANSI color codes should only add a single class (2).');
                assert(adv8BitSimple.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                // changed to simple theme color, don't know exactly what it should be, but it should NO LONGER BE 101,102,103
                assertInlineColor(adv8BitSimple, 'underline', new RGBA(101, 102, 103), 'Change to theme color SHOULD NOT STILL BE 24-bit RGBA ANSI color code (101,102,103) should add matching color inline style.', false);
            },
            (adv24BitAgain) => {
                assert.strictEqual(1, adv24BitAgain.classList.length, 'Multiple underline ANSI color codes should only add a single class (3).');
                assert(adv24BitAgain.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                assertInlineColor(adv24BitAgain, 'underline', new RGBA(104, 105, 106), '24-bit RGBA ANSI color code (100,100,100) should add matching color inline style.');
            },
            (adv8BitAdvanced) => {
                assert.strictEqual(1, adv8BitAdvanced.classList.length, 'Multiple underline ANSI color codes should only add a single class (4).');
                assert(adv8BitAdvanced.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                // changed to 8bit advanced color, don't know exactly what it should be, but it should NO LONGER BE 104,105,106
                assertInlineColor(adv8BitAdvanced, 'underline', new RGBA(104, 105, 106), 'Change to theme color SHOULD NOT BE 24-bit RGBA ANSI color code (104,105,106) should add matching color inline style.', false);
            },
            (adv24BitUnderlin200) => {
                assert.strictEqual(1, adv24BitUnderlin200.classList.length, 'Multiple underline ANSI color codes should only add a single class 4.');
                assert(adv24BitUnderlin200.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                assertInlineColor(adv24BitUnderlin200, 'underline', new RGBA(200, 200, 200), 'after change underline color SHOULD BE 24-bit RGBA ANSI color code (200,200,200) should add matching color inline style.');
            },
            (underlineColorResetToDefault) => {
                assert.strictEqual(0, underlineColorResetToDefault.classList.length, 'After Underline Color reset to default NO underline color class should be set.');
                assertInlineColor(underlineColorResetToDefault, 'underline', undefined, 'after RESET TO DEFAULT underline color SHOULD NOT BE SET (no color inline style.)');
            },
        ], 6);
        // Different types of color codes still cancel each other
        assertMultipleSequenceElements('\x1b[34msimple\x1b[38;2;101;102;103m24bit\x1b[38;5;3m8bitsimple\x1b[38;2;104;105;106m24bitAgain\x1b[38;5;101m8bitadvanced', [
            (simple) => {
                assert.strictEqual(1, simple.classList.length, 'Foreground ANSI color code should add one class.');
                assert(simple.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
            },
            (adv24Bit) => {
                assert.strictEqual(1, adv24Bit.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv24Bit.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(adv24Bit, 'foreground', new RGBA(101, 102, 103), '24-bit RGBA ANSI color code (101,102,103) should add matching color inline style.');
            },
            (adv8BitSimple) => {
                assert.strictEqual(1, adv8BitSimple.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv8BitSimple.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                //color is theme based, so we can't check what it should be but we know it should NOT BE 101,102,103 anymore
                assertInlineColor(adv8BitSimple, 'foreground', new RGBA(101, 102, 103), 'SHOULD NOT LONGER BE 24-bit RGBA ANSI color code (101,102,103) after simple color change.', false);
            },
            (adv24BitAgain) => {
                assert.strictEqual(1, adv24BitAgain.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv24BitAgain.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(adv24BitAgain, 'foreground', new RGBA(104, 105, 106), '24-bit RGBA ANSI color code (104,105,106) should add matching color inline style.');
            },
            (adv8BitAdvanced) => {
                assert.strictEqual(1, adv8BitAdvanced.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv8BitAdvanced.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                // color should NO LONGER BE 104,105,106
                assertInlineColor(adv8BitAdvanced, 'foreground', new RGBA(104, 105, 106), 'SHOULD NOT LONGER BE 24-bit RGBA ANSI color code (104,105,106) after advanced color change.', false);
            }
        ], 5);
    });
    /**
     * Assert that the provided ANSI sequence exactly matches the text content of the resulting
     * {@link HTMLSpanElement}.
     *
     * @param sequence The ANSI sequence to verify.
     */
    function assertSequencestrictEqualToContent(sequence) {
        const child = getSequenceOutput(sequence);
        assert(child.textContent === sequence);
    }
    test('Invalid codes treated as regular text', () => {
        // Individual components of ANSI code start are printed
        assertSequencestrictEqualToContent('\x1b');
        assertSequencestrictEqualToContent('[');
        // Unsupported sequence prints both characters
        assertSequencestrictEqualToContent('\x1b[');
        // Random strings are displayed properly
        for (let i = 0; i < 50; i++) {
            const uuid = generateUuid();
            assertSequencestrictEqualToContent(uuid);
        }
    });
    /**
     * Assert that a given ANSI sequence maintains added content following the ANSI code, and that
     * the expression itself is thrown away.
     *
     * @param sequence The ANSI sequence to verify. The provided sequence should contain ANSI codes
     * only, and should not include actual text content as it is provided by this function.
     */
    function assertEmptyOutput(sequence) {
        const child = getSequenceOutput(sequence + 'content');
        assert.strictEqual('content', child.textContent);
        assert.strictEqual(0, child.classList.length);
    }
    test('Empty sequence output', () => {
        const sequences = [
            // No colour codes
            '',
            '\x1b[;m',
            '\x1b[1;;m',
            '\x1b[m',
            '\x1b[99m'
        ];
        sequences.forEach(sequence => {
            assertEmptyOutput(sequence);
        });
        // Check other possible ANSI terminators
        const terminators = 'ABCDHIJKfhmpsu'.split('');
        terminators.forEach(terminator => {
            assertEmptyOutput('\x1b[content' + terminator);
        });
    });
    test('calcANSI8bitColor', () => {
        // Invalid values
        // Negative (below range), simple range, decimals
        for (let i = -10; i <= 15; i += 0.5) {
            assert(calcANSI8bitColor(i) === undefined, 'Values less than 16 passed to calcANSI8bitColor should return undefined.');
        }
        // In-range range decimals
        for (let i = 16.5; i < 254; i += 1) {
            assert(calcANSI8bitColor(i) === undefined, 'Floats passed to calcANSI8bitColor should return undefined.');
        }
        // Above range
        for (let i = 256; i < 300; i += 0.5) {
            assert(calcANSI8bitColor(i) === undefined, 'Values grather than 255 passed to calcANSI8bitColor should return undefined.');
        }
        // All valid colors
        for (let red = 0; red <= 5; red++) {
            for (let green = 0; green <= 5; green++) {
                for (let blue = 0; blue <= 5; blue++) {
                    const colorOut = calcANSI8bitColor(16 + red * 36 + green * 6 + blue);
                    assert(colorOut.r === Math.round(red * (255 / 5)), 'Incorrect red value encountered for color');
                    assert(colorOut.g === Math.round(green * (255 / 5)), 'Incorrect green value encountered for color');
                    assert(colorOut.b === Math.round(blue * (255 / 5)), 'Incorrect balue value encountered for color');
                }
            }
        }
        // All grays
        for (let i = 232; i <= 255; i++) {
            const grayOut = calcANSI8bitColor(i);
            assert(grayOut.r === grayOut.g);
            assert(grayOut.r === grayOut.b);
            assert(grayOut.r === Math.round((i - 232) / 23 * 255));
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvZGVidWdBTlNJSGFuZGxpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFM0QsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUVuQyxJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxLQUFpQixDQUFDO0lBQ3RCLElBQUksT0FBcUIsQ0FBQztJ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