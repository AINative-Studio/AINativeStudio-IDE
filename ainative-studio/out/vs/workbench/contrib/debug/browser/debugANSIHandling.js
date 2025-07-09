/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, RGBA } from '../../../../base/common/color.js';
import { isDefined } from '../../../../base/common/types.js';
import { editorHoverBackground, listActiveSelectionBackground, listFocusBackground, listInactiveFocusBackground, listInactiveSelectionBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { ansiColorIdentifiers } from '../../terminal/common/terminalColorRegistry.js';
/**
 * @param text The content to stylize.
 * @returns An {@link HTMLSpanElement} that contains the potentially stylized text.
 */
export function handleANSIOutput(text, linkDetector, workspaceFolder, highlights) {
    const root = document.createElement('span');
    const textLength = text.length;
    let styleNames = [];
    let customFgColor;
    let customBgColor;
    let customUnderlineColor;
    let colorsInverted = false;
    let currentPos = 0;
    let unprintedChars = 0;
    let buffer = '';
    while (currentPos < textLength) {
        let sequenceFound = false;
        // Potentially an ANSI escape sequence.
        // See http://ascii-table.com/ansi-escape-sequences.php & https://en.wikipedia.org/wiki/ANSI_escape_code
        if (text.charCodeAt(currentPos) === 27 && text.charAt(currentPos + 1) === '[') {
            const startPos = currentPos;
            currentPos += 2; // Ignore 'Esc[' as it's in every sequence.
            let ansiSequence = '';
            while (currentPos < textLength) {
                const char = text.charAt(currentPos);
                ansiSequence += char;
                currentPos++;
                // Look for a known sequence terminating character.
                if (char.match(/^[ABCDHIJKfhmpsu]$/)) {
                    sequenceFound = true;
                    break;
                }
            }
            if (sequenceFound) {
                unprintedChars += 2 + ansiSequence.length;
                // Flush buffer with previous styles.
                appendStylizedStringToContainer(root, buffer, styleNames, linkDetector, workspaceFolder, customFgColor, customBgColor, customUnderlineColor, highlights, currentPos - buffer.length - unprintedChars);
                buffer = '';
                /*
                 * Certain ranges that are matched here do not contain real graphics rendition sequences. For
                 * the sake of having a simpler expression, they have been included anyway.
                 */
                if (ansiSequence.match(/^(?:[34][0-8]|9[0-7]|10[0-7]|[0-9]|2[1-5,7-9]|[34]9|5[8,9]|1[0-9])(?:;[349][0-7]|10[0-7]|[013]|[245]|[34]9)?(?:;[012]?[0-9]?[0-9])*;?m$/)) {
                    const styleCodes = ansiSequence.slice(0, -1) // Remove final 'm' character.
                        .split(';') // Separate style codes.
                        .filter(elem => elem !== '') // Filter empty elems as '34;m' -> ['34', ''].
                        .map(elem => parseInt(elem, 10)); // Convert to numbers.
                    if (styleCodes[0] === 38 || styleCodes[0] === 48 || styleCodes[0] === 58) {
                        // Advanced color code - can't be combined with formatting codes like simple colors can
                        // Ignores invalid colors and additional info beyond what is necessary
                        const colorType = (styleCodes[0] === 38) ? 'foreground' : ((styleCodes[0] === 48) ? 'background' : 'underline');
                        if (styleCodes[1] === 5) {
                            set8BitColor(styleCodes, colorType);
                        }
                        else if (styleCodes[1] === 2) {
                            set24BitColor(styleCodes, colorType);
                        }
                    }
                    else {
                        setBasicFormatters(styleCodes);
                    }
                }
                else {
                    // Unsupported sequence so simply hide it.
                }
            }
            else {
                currentPos = startPos;
            }
        }
        if (sequenceFound === false) {
            buffer += text.charAt(currentPos);
            currentPos++;
        }
    }
    // Flush remaining text buffer if not empty.
    if (buffer) {
        appendStylizedStringToContainer(root, buffer, styleNames, linkDetector, workspaceFolder, customFgColor, customBgColor, customUnderlineColor, highlights, currentPos - buffer.length);
    }
    return root;
    /**
     * Change the foreground or background color by clearing the current color
     * and adding the new one.
     * @param colorType If `'foreground'`, will change the foreground color, if
     * 	`'background'`, will change the background color, and if `'underline'`
     * will set the underline color.
     * @param color Color to change to. If `undefined` or not provided,
     * will clear current color without adding a new one.
     */
    function changeColor(colorType, color) {
        if (colorType === 'foreground') {
            customFgColor = color;
        }
        else if (colorType === 'background') {
            customBgColor = color;
        }
        else if (colorType === 'underline') {
            customUnderlineColor = color;
        }
        styleNames = styleNames.filter(style => style !== `code-${colorType}-colored`);
        if (color !== undefined) {
            styleNames.push(`code-${colorType}-colored`);
        }
    }
    /**
     * Swap foreground and background colors.  Used for color inversion.  Caller should check
     * [] flag to make sure it is appropriate to turn ON or OFF (if it is already inverted don't call
     */
    function reverseForegroundAndBackgroundColors() {
        const oldFgColor = customFgColor;
        changeColor('foreground', customBgColor);
        changeColor('background', oldFgColor);
    }
    /**
     * Calculate and set basic ANSI formatting. Supports ON/OFF of bold, italic, underline,
     * double underline,  crossed-out/strikethrough, overline, dim, blink, rapid blink,
     * reverse/invert video, hidden, superscript, subscript and alternate font codes,
     * clearing/resetting of foreground, background and underline colors,
     * setting normal foreground and background colors, and bright foreground and
     * background colors. Not to be used for codes containing advanced colors.
     * Will ignore invalid codes.
     * @param styleCodes Array of ANSI basic styling numbers, which will be
     * applied in order. New colors and backgrounds clear old ones; new formatting
     * does not.
     * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#SGR }
     */
    function setBasicFormatters(styleCodes) {
        for (const code of styleCodes) {
            switch (code) {
                case 0: { // reset (everything)
                    styleNames = [];
                    customFgColor = undefined;
                    customBgColor = undefined;
                    break;
                }
                case 1: { // bold
                    styleNames = styleNames.filter(style => style !== `code-bold`);
                    styleNames.push('code-bold');
                    break;
                }
                case 2: { // dim
                    styleNames = styleNames.filter(style => style !== `code-dim`);
                    styleNames.push('code-dim');
                    break;
                }
                case 3: { // italic
                    styleNames = styleNames.filter(style => style !== `code-italic`);
                    styleNames.push('code-italic');
                    break;
                }
                case 4: { // underline
                    styleNames = styleNames.filter(style => (style !== `code-underline` && style !== `code-double-underline`));
                    styleNames.push('code-underline');
                    break;
                }
                case 5: { // blink
                    styleNames = styleNames.filter(style => style !== `code-blink`);
                    styleNames.push('code-blink');
                    break;
                }
                case 6: { // rapid blink
                    styleNames = styleNames.filter(style => style !== `code-rapid-blink`);
                    styleNames.push('code-rapid-blink');
                    break;
                }
                case 7: { // invert foreground and background
                    if (!colorsInverted) {
                        colorsInverted = true;
                        reverseForegroundAndBackgroundColors();
                    }
                    break;
                }
                case 8: { // hidden
                    styleNames = styleNames.filter(style => style !== `code-hidden`);
                    styleNames.push('code-hidden');
                    break;
                }
                case 9: { // strike-through/crossed-out
                    styleNames = styleNames.filter(style => style !== `code-strike-through`);
                    styleNames.push('code-strike-through');
                    break;
                }
                case 10: { // normal default font
                    styleNames = styleNames.filter(style => !style.startsWith('code-font'));
                    break;
                }
                case 11:
                case 12:
                case 13:
                case 14:
                case 15:
                case 16:
                case 17:
                case 18:
                case 19:
                case 20: { // font codes (and 20 is 'blackletter' font code)
                    styleNames = styleNames.filter(style => !style.startsWith('code-font'));
                    styleNames.push(`code-font-${code - 10}`);
                    break;
                }
                case 21: { // double underline
                    styleNames = styleNames.filter(style => (style !== `code-underline` && style !== `code-double-underline`));
                    styleNames.push('code-double-underline');
                    break;
                }
                case 22: { // normal intensity (bold off and dim off)
                    styleNames = styleNames.filter(style => (style !== `code-bold` && style !== `code-dim`));
                    break;
                }
                case 23: { // Neither italic or blackletter (font 10)
                    styleNames = styleNames.filter(style => (style !== `code-italic` && style !== `code-font-10`));
                    break;
                }
                case 24: { // not underlined (Neither singly nor doubly underlined)
                    styleNames = styleNames.filter(style => (style !== `code-underline` && style !== `code-double-underline`));
                    break;
                }
                case 25: { // not blinking
                    styleNames = styleNames.filter(style => (style !== `code-blink` && style !== `code-rapid-blink`));
                    break;
                }
                case 27: { // not reversed/inverted
                    if (colorsInverted) {
                        colorsInverted = false;
                        reverseForegroundAndBackgroundColors();
                    }
                    break;
                }
                case 28: { // not hidden (reveal)
                    styleNames = styleNames.filter(style => style !== `code-hidden`);
                    break;
                }
                case 29: { // not crossed-out
                    styleNames = styleNames.filter(style => style !== `code-strike-through`);
                    break;
                }
                case 53: { // overlined
                    styleNames = styleNames.filter(style => style !== `code-overline`);
                    styleNames.push('code-overline');
                    break;
                }
                case 55: { // not overlined
                    styleNames = styleNames.filter(style => style !== `code-overline`);
                    break;
                }
                case 39: { // default foreground color
                    changeColor('foreground', undefined);
                    break;
                }
                case 49: { // default background color
                    changeColor('background', undefined);
                    break;
                }
                case 59: { // default underline color
                    changeColor('underline', undefined);
                    break;
                }
                case 73: { // superscript
                    styleNames = styleNames.filter(style => (style !== `code-superscript` && style !== `code-subscript`));
                    styleNames.push('code-superscript');
                    break;
                }
                case 74: { // subscript
                    styleNames = styleNames.filter(style => (style !== `code-superscript` && style !== `code-subscript`));
                    styleNames.push('code-subscript');
                    break;
                }
                case 75: { // neither superscript or subscript
                    styleNames = styleNames.filter(style => (style !== `code-superscript` && style !== `code-subscript`));
                    break;
                }
                default: {
                    setBasicColor(code);
                    break;
                }
            }
        }
    }
    /**
     * Calculate and set styling for complicated 24-bit ANSI color codes.
     * @param styleCodes Full list of integer codes that make up the full ANSI
     * sequence, including the two defining codes and the three RGB codes.
     * @param colorType If `'foreground'`, will set foreground color, if
     * `'background'`, will set background color, and if it is `'underline'`
     * will set the underline color.
     * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#24-bit }
     */
    function set24BitColor(styleCodes, colorType) {
        if (styleCodes.length >= 5 &&
            styleCodes[2] >= 0 && styleCodes[2] <= 255 &&
            styleCodes[3] >= 0 && styleCodes[3] <= 255 &&
            styleCodes[4] >= 0 && styleCodes[4] <= 255) {
            const customColor = new RGBA(styleCodes[2], styleCodes[3], styleCodes[4]);
            changeColor(colorType, customColor);
        }
    }
    /**
     * Calculate and set styling for advanced 8-bit ANSI color codes.
     * @param styleCodes Full list of integer codes that make up the ANSI
     * sequence, including the two defining codes and the one color code.
     * @param colorType If `'foreground'`, will set foreground color, if
     * `'background'`, will set background color and if it is `'underline'`
     * will set the underline color.
     * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit }
     */
    function set8BitColor(styleCodes, colorType) {
        let colorNumber = styleCodes[2];
        const color = calcANSI8bitColor(colorNumber);
        if (color) {
            changeColor(colorType, color);
        }
        else if (colorNumber >= 0 && colorNumber <= 15) {
            if (colorType === 'underline') {
                // for underline colors we just decode the 0-15 color number to theme color, set and return
                const colorName = ansiColorIdentifiers[colorNumber];
                changeColor(colorType, `--vscode-debug-ansi-${colorName}`);
                return;
            }
            // Need to map to one of the four basic color ranges (30-37, 90-97, 40-47, 100-107)
            colorNumber += 30;
            if (colorNumber >= 38) {
                // Bright colors
                colorNumber += 52;
            }
            if (colorType === 'background') {
                colorNumber += 10;
            }
            setBasicColor(colorNumber);
        }
    }
    /**
     * Calculate and set styling for basic bright and dark ANSI color codes. Uses
     * theme colors if available. Automatically distinguishes between foreground
     * and background colors; does not support color-clearing codes 39 and 49.
     * @param styleCode Integer color code on one of the following ranges:
     * [30-37, 90-97, 40-47, 100-107]. If not on one of these ranges, will do
     * nothing.
     */
    function setBasicColor(styleCode) {
        let colorType;
        let colorIndex;
        if (styleCode >= 30 && styleCode <= 37) {
            colorIndex = styleCode - 30;
            colorType = 'foreground';
        }
        else if (styleCode >= 90 && styleCode <= 97) {
            colorIndex = (styleCode - 90) + 8; // High-intensity (bright)
            colorType = 'foreground';
        }
        else if (styleCode >= 40 && styleCode <= 47) {
            colorIndex = styleCode - 40;
            colorType = 'background';
        }
        else if (styleCode >= 100 && styleCode <= 107) {
            colorIndex = (styleCode - 100) + 8; // High-intensity (bright)
            colorType = 'background';
        }
        if (colorIndex !== undefined && colorType) {
            const colorName = ansiColorIdentifiers[colorIndex];
            changeColor(colorType, `--vscode-debug-ansi-${colorName.replaceAll('.', '-')}`);
        }
    }
}
/**
 * @param root The {@link HTMLElement} to append the content to.
 * @param stringContent The text content to be appended.
 * @param cssClasses The list of CSS styles to apply to the text content.
 * @param linkDetector The {@link ILinkDetector} responsible for generating links from {@param stringContent}.
 * @param customTextColor If provided, will apply custom color with inline style.
 * @param customBackgroundColor If provided, will apply custom backgroundColor with inline style.
 * @param customUnderlineColor If provided, will apply custom textDecorationColor with inline style.
 * @param highlights The ranges to highlight.
 * @param offset The starting index of the stringContent in the original text.
 */
export function appendStylizedStringToContainer(root, stringContent, cssClasses, linkDetector, workspaceFolder, customTextColor, customBackgroundColor, customUnderlineColor, highlights, offset) {
    if (!root || !stringContent) {
        return;
    }
    const container = linkDetector.linkify(stringContent, true, workspaceFolder, undefined, undefined, highlights?.map(h => ({ start: h.start - offset, end: h.end - offset, extraClasses: h.extraClasses })));
    container.className = cssClasses.join(' ');
    if (customTextColor) {
        container.style.color =
            typeof customTextColor === 'string' ? `var(${customTextColor})` : Color.Format.CSS.formatRGB(new Color(customTextColor));
    }
    if (customBackgroundColor) {
        container.style.backgroundColor =
            typeof customBackgroundColor === 'string' ? `var(${customBackgroundColor})` : Color.Format.CSS.formatRGB(new Color(customBackgroundColor));
    }
    if (customUnderlineColor) {
        container.style.textDecorationColor =
            typeof customUnderlineColor === 'string' ? `var(${customUnderlineColor})` : Color.Format.CSS.formatRGB(new Color(customUnderlineColor));
    }
    root.appendChild(container);
}
/**
 * Calculate the color from the color set defined in the ANSI 8-bit standard.
 * Standard and high intensity colors are not defined in the standard as specific
 * colors, so these and invalid colors return `undefined`.
 * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit } for info.
 * @param colorNumber The number (ranging from 16 to 255) referring to the color
 * desired.
 */
export function calcANSI8bitColor(colorNumber) {
    if (colorNumber % 1 !== 0) {
        // Should be integer
        return;
    }
    if (colorNumber >= 16 && colorNumber <= 231) {
        // Converts to one of 216 RGB colors
        colorNumber -= 16;
        let blue = colorNumber % 6;
        colorNumber = (colorNumber - blue) / 6;
        let green = colorNumber % 6;
        colorNumber = (colorNumber - green) / 6;
        let red = colorNumber;
        // red, green, blue now range on [0, 5], need to map to [0,255]
        const convFactor = 255 / 5;
        blue = Math.round(blue * convFactor);
        green = Math.round(green * convFactor);
        red = Math.round(red * convFactor);
        return new RGBA(red, green, blue);
    }
    else if (colorNumber >= 232 && colorNumber <= 255) {
        // Converts to a grayscale value
        colorNumber -= 232;
        const colorLevel = Math.round(colorNumber / 23 * 255);
        return new RGBA(colorLevel, colorLevel, colorLevel);
    }
    else {
        return;
    }
}
registerThemingParticipant((theme, collector) => {
    const areas = [
        { selector: '.monaco-workbench .sidebar, .monaco-workbench .auxiliarybar', bg: theme.getColor(SIDE_BAR_BACKGROUND) },
        { selector: '.monaco-workbench .panel', bg: theme.getColor(PANEL_BACKGROUND) },
        { selector: '.monaco-workbench .monaco-list-row.selected', bg: theme.getColor(listInactiveSelectionBackground) },
        { selector: '.monaco-workbench .monaco-list-row.focused', bg: theme.getColor(listInactiveFocusBackground) },
        { selector: '.monaco-workbench .monaco-list:focus .monaco-list-row.focused', bg: theme.getColor(listFocusBackground) },
        { selector: '.monaco-workbench .monaco-list:focus .monaco-list-row.selected', bg: theme.getColor(listActiveSelectionBackground) },
        { selector: '.debug-hover-widget', bg: theme.getColor(editorHoverBackground) },
    ];
    for (const { selector, bg } of areas) {
        const content = ansiColorIdentifiers
            .map(color => {
            const actual = theme.getColor(color);
            if (!actual) {
                return undefined;
            }
            // this uses the default contrast ratio of 4 (from the terminal),
            // we may want to make this configurable in the future, but this is
            // good to keep things sane to start with.
            return `--vscode-debug-ansi-${color.replaceAll('.', '-')}:${bg ? bg.ensureConstrast(actual, 4) : actual}`;
        })
            .filter(isDefined);
        collector.addRule(`${selector} { ${content.join(';')} }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0FOU0lIYW5kbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM3TSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUUvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUd0Rjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLFlBQTJCLEVBQUUsZUFBNkMsRUFBRSxVQUFvQztJQUU5SixNQUFNLElBQUksR0FBb0IsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3RCxNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBRXZDLElBQUksVUFBVSxHQUFhLEVBQUUsQ0FBQztJQUM5QixJQUFJLGFBQXdDLENBQUM7SUFDN0MsSUFBSSxhQUF3QyxDQUFDO0lBQzdDLElBQUksb0JBQStDLENBQUM7SUFDcEQsSUFBSSxjQUFjLEdBQVksS0FBSyxDQUFDO0lBQ3BDLElBQUksVUFBVSxHQUFXLENBQUMsQ0FB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