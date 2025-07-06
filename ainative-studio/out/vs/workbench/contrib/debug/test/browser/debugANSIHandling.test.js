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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z0FOU0lIYW5kbGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTFILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUzRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBRW5DLElBQUksV0FBNEIsQ0FBQztJQUNqQyxJQUFJLEtBQWlCLENBQUM7SUFDdEIsSUFBSSxPQUFxQixDQUFDO0lB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