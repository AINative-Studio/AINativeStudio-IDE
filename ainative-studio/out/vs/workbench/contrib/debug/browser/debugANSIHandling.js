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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQU5TSUhhbmRsaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzdNLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3RGOzs7R0FHRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsWUFBMkIsRUFBRSxlQUE2QyxFQUFFLFVBQW9DO0lBRTlKLE1BQU0sSUFBSSxHQUFvQixRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdELE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFdkMsSUFBSSxVQUFVLEdBQWEsRUFBRSxDQUFDO0lBQzlCLElBQUksYUFBd0MsQ0FBQztJQUM3QyxJQUFJLGFBQXdDLENBQUM7SUFDN0MsSUFBSSxvQkFBK0MsQ0FBQztJQUNwRCxJQUFJLGNBQWMsR0FBWSxLQUFLLENBQUM7SUFDcEMsSUFBSSxVQUFVLEdBQVcsQ0FBQyxDQUFDO0lBQzNCLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQztJQUN2QixJQUFJLE1BQU0sR0FBVyxFQUFFLENBQUM7SUFFeEIsT0FBTyxVQUFVLEdBQUcsVUFBVSxFQUFFLENBQUM7UUFFaEMsSUFBSSxhQUFhLEdBQVksS0FBSyxDQUFDO1FBRW5DLHVDQUF1QztRQUN2Qyx3R0FBd0c7UUFDeEcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUUvRSxNQUFNLFFBQVEsR0FBVyxVQUFVLENBQUM7WUFDcEMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLDJDQUEyQztZQUU1RCxJQUFJLFlBQVksR0FBVyxFQUFFLENBQUM7WUFFOUIsT0FBTyxVQUFVLEdBQUcsVUFBVSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzdDLFlBQVksSUFBSSxJQUFJLENBQUM7Z0JBRXJCLFVBQVUsRUFBRSxDQUFDO2dCQUViLG1EQUFtRDtnQkFDbkQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztvQkFDdEMsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDckIsTUFBTTtnQkFDUCxDQUFDO1lBRUYsQ0FBQztZQUVELElBQUksYUFBYSxFQUFFLENBQUM7Z0JBRW5CLGNBQWMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFFMUMscUNBQXFDO2dCQUNyQywrQkFBK0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxDQUFDO2dCQUV0TSxNQUFNLEdBQUcsRUFBRSxDQUFDO2dCQUVaOzs7bUJBR0c7Z0JBQ0gsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLHlJQUF5SSxDQUFDLEVBQUUsQ0FBQztvQkFFbkssTUFBTSxVQUFVLEdBQWEsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7eUJBQ25GLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBYSx3QkFBd0I7eUJBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBYyw4Q0FBOEM7eUJBQ3ZGLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFhLHNCQUFzQjtvQkFFckUsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO3dCQUMxRSx1RkFBdUY7d0JBQ3ZGLHNFQUFzRTt3QkFDdEUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFFaEgsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ3pCLFlBQVksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ3JDLENBQUM7NkJBQU0sSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ2hDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ3RDLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNoQyxDQUFDO2dCQUVGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCwwQ0FBMEM7Z0JBQzNDLENBQUM7WUFFRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxHQUFHLFFBQVEsQ0FBQztZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksYUFBYSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLFVBQVUsRUFBRSxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCw0Q0FBNEM7SUFDNUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNaLCtCQUErQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0TCxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7SUFFWjs7Ozs7Ozs7T0FRRztJQUNILFNBQVMsV0FBVyxDQUFDLFNBQW9ELEVBQUUsS0FBcUI7UUFDL0YsSUFBSSxTQUFTLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDaEMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUN2QixDQUFDO2FBQU0sSUFBSSxTQUFTLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDdkMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUN2QixDQUFDO2FBQU0sSUFBSSxTQUFTLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdEMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQzlCLENBQUM7UUFDRCxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxRQUFRLFNBQVMsVUFBVSxDQUFDLENBQUM7UUFDL0UsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekIsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLFNBQVMsVUFBVSxDQUFDLENBQUM7UUFDOUMsQ0FBQztJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLG9DQUFvQztRQUM1QyxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUM7UUFDakMsV0FBVyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN6QyxXQUFXLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLFVBQW9CO1FBQy9DLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxFQUFFLENBQUM7WUFDL0IsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxxQkFBcUI7b0JBQy9CLFVBQVUsR0FBRyxFQUFFLENBQUM7b0JBQ2hCLGFBQWEsR0FBRyxTQUFTLENBQUM7b0JBQzFCLGFBQWEsR0FBRyxTQUFTLENBQUM7b0JBQzFCLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO29CQUNoQixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQUMsQ0FBQztvQkFDL0QsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDN0IsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07b0JBQ2YsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDLENBQUM7b0JBQzlELFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQzVCLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUNsQixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxhQUFhLENBQUMsQ0FBQztvQkFDakUsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDL0IsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVk7b0JBQ3JCLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssZ0JBQWdCLElBQUksS0FBSyxLQUFLLHVCQUF1QixDQUFDLENBQUMsQ0FBQztvQkFDM0csVUFBVSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUNsQyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtvQkFDakIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssWUFBWSxDQUFDLENBQUM7b0JBQ2hFLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQzlCLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjO29CQUN2QixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxrQkFBa0IsQ0FBQyxDQUFDO29CQUN0RSxVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQ3BDLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7b0JBQzVDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDckIsY0FBYyxHQUFHLElBQUksQ0FBQzt3QkFDdEIsb0NBQW9DLEVBQUUsQ0FBQztvQkFDeEMsQ0FBQztvQkFDRCxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDbEIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssYUFBYSxDQUFDLENBQUM7b0JBQ2pFLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQy9CLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2QkFBNkI7b0JBQ3RDLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLHFCQUFxQixDQUFDLENBQUM7b0JBQ3pFLFVBQVUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDdkMsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQjtvQkFDaEMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDeEUsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlEQUFpRDtvQkFDNUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDeEUsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUMxQyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO29CQUM3QixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLGdCQUFnQixJQUFJLEtBQUssS0FBSyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7b0JBQzNHLFVBQVUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztvQkFDekMsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLDBDQUEwQztvQkFDcEQsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxXQUFXLElBQUksS0FBSyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pGLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQ0FBMEM7b0JBQ3BELFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssYUFBYSxJQUFJLEtBQUssS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDO29CQUMvRixNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsd0RBQXdEO29CQUNsRSxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLGdCQUFnQixJQUFJLEtBQUssS0FBSyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7b0JBQzNHLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlO29CQUN6QixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLFlBQVksSUFBSSxLQUFLLEtBQUssa0JBQWtCLENBQUMsQ0FBQyxDQUFDO29CQUNsRyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCO29CQUNsQyxJQUFJLGNBQWMsRUFBRSxDQUFDO3dCQUNwQixjQUFjLEdBQUcsS0FBSyxDQUFDO3dCQUN2QixvQ0FBb0MsRUFBRSxDQUFDO29CQUN4QyxDQUFDO29CQUNELE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7b0JBQ2hDLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLGFBQWEsQ0FBQyxDQUFDO29CQUNqRSxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO29CQUM1QixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxxQkFBcUIsQ0FBQyxDQUFDO29CQUN6RSxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtvQkFDdEIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssZUFBZSxDQUFDLENBQUM7b0JBQ25FLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ2pDLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0I7b0JBQzFCLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLGVBQWUsQ0FBQyxDQUFDO29CQUNuRSxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsMkJBQTJCO29CQUN0QyxXQUFXLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNyQyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsMkJBQTJCO29CQUN0QyxXQUFXLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNyQyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsMEJBQTBCO29CQUNyQyxXQUFXLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNwQyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYztvQkFDeEIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxrQkFBa0IsSUFBSSxLQUFLLEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO29CQUN0RyxVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQ3BDLE1BQU07Z0JBQ1AsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO29CQUN0QixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLGtCQUFrQixJQUFJLEtBQUssS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3RHLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDbEMsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1DQUFtQztvQkFDN0MsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssS0FBSyxrQkFBa0IsSUFBSSxLQUFLLEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO29CQUN0RyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDVCxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3BCLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsU0FBUyxhQUFhLENBQUMsVUFBb0IsRUFBRSxTQUFvRDtRQUNoRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQztZQUN6QixVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHO1lBQzFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUc7WUFDMUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7WUFDN0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRSxXQUFXLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxTQUFTLFlBQVksQ0FBQyxVQUFvQixFQUFFLFNBQW9EO1FBQy9GLElBQUksV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU3QyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsV0FBVyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQixDQUFDO2FBQU0sSUFBSSxXQUFXLElBQUksQ0FBQyxJQUFJLFdBQVcsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNsRCxJQUFJLFNBQVMsS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDL0IsMkZBQTJGO2dCQUMzRixNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDcEQsV0FBVyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsU0FBUyxFQUFFLENBQUMsQ0FBQztnQkFDM0QsT0FBTztZQUNSLENBQUM7WUFDRCxtRkFBbUY7WUFDbkYsV0FBVyxJQUFJLEVBQUUsQ0FBQztZQUNsQixJQUFJLFdBQVcsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDdkIsZ0JBQWdCO2dCQUNoQixXQUFXLElBQUksRUFBRSxDQUFDO1lBQ25CLENBQUM7WUFDRCxJQUFJLFNBQVMsS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDaEMsV0FBVyxJQUFJLEVBQUUsQ0FBQztZQUNuQixDQUFDO1lBQ0QsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQVMsYUFBYSxDQUFDLFNBQWlCO1FBQ3ZDLElBQUksU0FBa0QsQ0FBQztRQUN2RCxJQUFJLFVBQThCLENBQUM7UUFFbkMsSUFBSSxTQUFTLElBQUksRUFBRSxJQUFJLFNBQVMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN4QyxVQUFVLEdBQUcsU0FBUyxHQUFHLEVBQUUsQ0FBQztZQUM1QixTQUFTLEdBQUcsWUFBWSxDQUFDO1FBQzFCLENBQUM7YUFBTSxJQUFJLFNBQVMsSUFBSSxFQUFFLElBQUksU0FBUyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQy9DLFVBQVUsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFDN0QsU0FBUyxHQUFHLFlBQVksQ0FBQztRQUMxQixDQUFDO2FBQU0sSUFBSSxTQUFTLElBQUksRUFBRSxJQUFJLFNBQVMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxVQUFVLEdBQUcsU0FBUyxHQUFHLEVBQUUsQ0FBQztZQUM1QixTQUFTLEdBQUcsWUFBWSxDQUFDO1FBQzFCLENBQUM7YUFBTSxJQUFJLFNBQVMsSUFBSSxHQUFHLElBQUksU0FBUyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2pELFVBQVUsR0FBRyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7WUFDOUQsU0FBUyxHQUFHLFlBQVksQ0FBQztRQUMxQixDQUFDO1FBRUQsSUFBSSxVQUFVLEtBQUssU0FBUyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ25ELFdBQVcsQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqRixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxVQUFVLCtCQUErQixDQUM5QyxJQUFpQixFQUNqQixhQUFxQixFQUNyQixVQUFvQixFQUNwQixZQUEyQixFQUMzQixlQUE2QyxFQUM3QyxlQUEwQyxFQUMxQyxxQkFBZ0QsRUFDaEQsb0JBQStDLEVBQy9DLFVBQW9DLEVBQ3BDLE1BQWM7SUFFZCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDN0IsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUNyQyxhQUFhLEVBQ2IsSUFBSSxFQUNKLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FDdEcsQ0FBQztJQUVGLFNBQVMsQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSztZQUNwQixPQUFPLGVBQWUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQzNILENBQUM7SUFDRCxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFDM0IsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlO1lBQzlCLE9BQU8scUJBQXFCLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDN0ksQ0FBQztJQUNELElBQUksb0JBQW9CLEVBQUUsQ0FBQztRQUMxQixTQUFTLENBQUMsS0FBSyxDQUFDLG1CQUFtQjtZQUNsQyxPQUFPLG9CQUFvQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxvQkFBb0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0lBQzFJLENBQUM7SUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFdBQW1CO0lBQ3BELElBQUksV0FBVyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMzQixvQkFBb0I7UUFDcEIsT0FBTztJQUNSLENBQUM7SUFBQyxJQUFJLFdBQVcsSUFBSSxFQUFFLElBQUksV0FBVyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQy9DLG9DQUFvQztRQUNwQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBRWxCLElBQUksSUFBSSxHQUFXLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDbkMsV0FBVyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLEtBQUssR0FBVyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsR0FBRyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsSUFBSSxHQUFHLEdBQVcsV0FBVyxDQUFDO1FBRTlCLCtEQUErRDtRQUMvRCxNQUFNLFVBQVUsR0FBVyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQztRQUNyQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDdkMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBRW5DLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDO1NBQU0sSUFBSSxXQUFXLElBQUksR0FBRyxJQUFJLFdBQVcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNyRCxnQ0FBZ0M7UUFDaEMsV0FBVyxJQUFJLEdBQUcsQ0FBQztRQUNuQixNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDOUQsT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTztJQUNSLENBQUM7QUFDRixDQUFDO0FBRUQsMEJBQTBCLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDL0MsTUFBTSxLQUFLLEdBQUc7UUFDYixFQUFFLFFBQVEsRUFBRSw2REFBNkQsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO1FBQ3BILEVBQUUsUUFBUSxFQUFFLDBCQUEwQixFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7UUFDOUUsRUFBRSxRQUFRLEVBQUUsNkNBQTZDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsK0JBQStCLENBQUMsRUFBRTtRQUNoSCxFQUFFLFFBQVEsRUFBRSw0Q0FBNEMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFO1FBQzNHLEVBQUUsUUFBUSxFQUFFLCtEQUErRCxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7UUFDdEgsRUFBRSxRQUFRLEVBQUUsZ0VBQWdFLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUMsRUFBRTtRQUNqSSxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO0tBQzlFLENBQUM7SUFFRixLQUFLLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLElBQUksS0FBSyxFQUFFLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsb0JBQW9CO2FBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNaLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUFDLE9BQU8sU0FBUyxDQUFDO1lBQUMsQ0FBQztZQUNsQyxpRUFBaUU7WUFDakUsbUVBQW1FO1lBQ25FLDBDQUEwQztZQUMxQyxPQUFPLHVCQUF1QixLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMzRyxDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFcEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzRCxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMifQ==