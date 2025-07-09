/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, HSLA } from '../../../base/common/color.js';
function _parseCaptureGroups(captureGroups) {
    const values = [];
    for (const captureGroup of captureGroups) {
        const parsedNumber = Number(captureGroup);
        if (parsedNumber || parsedNumber === 0 && captureGroup.replace(/\s/g, '') !== '') {
            values.push(parsedNumber);
        }
    }
    return values;
}
function _toIColor(r, g, b, a) {
    return {
        red: r / 255,
        blue: b / 255,
        green: g / 255,
        alpha: a
    };
}
function _findRange(model, match) {
    const index = match.index;
    const length = match[0].length;
    if (index === undefined) {
        return;
    }
    const startPosition = model.positionAt(index);
    const range = {
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: startPosition.lineNumber,
        endColumn: startPosition.column + length
    };
    return range;
}
function _findHexColorInformation(range, hexValue) {
    if (!range) {
        return;
    }
    const parsedHexColor = Color.Format.CSS.parseHex(hexValue);
    if (!parsedHexColor) {
        return;
    }
    return {
        range: range,
        color: _toIColor(parsedHexColor.rgba.r, parsedHexColor.rgba.g, parsedHexColor.rgba.b, parsedHexColor.rgba.a)
    };
}
function _findRGBColorInformation(range, matches, isAlpha) {
    if (!range || matches.length !== 1) {
        return;
    }
    const match = matches[0];
    const captureGroups = match.values();
    const parsedRegex = _parseCaptureGroups(captureGroups);
    return {
        range: range,
        color: _toIColor(parsedRegex[0], parsedRegex[1], parsedRegex[2], isAlpha ? parsedRegex[3] : 1)
    };
}
function _findHSLColorInformation(range, matches, isAlpha) {
    if (!range || matches.length !== 1) {
        return;
    }
    const match = matches[0];
    const captureGroups = match.values();
    const parsedRegex = _parseCaptureGroups(captureGroups);
    const colorEquivalent = new Color(new HSLA(parsedRegex[0], parsedRegex[1] / 100, parsedRegex[2] / 100, isAlpha ? parsedRegex[3] : 1));
    return {
        range: range,
        color: _toIColor(colorEquivalent.rgba.r, colorEquivalent.rgba.g, colorEquivalent.rgba.b, colorEquivalent.rgba.a)
    };
}
function _findMatches(model, regex) {
    if (typeof model === 'string') {
        return [...model.matchAll(regex)];
    }
    else {
        return model.findMatches(regex);
    }
}
function computeColors(model) {
    const result = [];
    // Early validation for RGB and HSL
    const initialValidationRegex = /\b(rgb|rgba|hsl|hsla)(\([0-9\s,.\%]*\))|\s+(#)([A-Fa-f0-9]{6})\b|\s+(#)([A-Fa-f0-9]{8})\b|^(#)([A-Fa-f0-9]{6})\b|^(#)([A-Fa-f0-9]{8})\b/gm;
    const initialValidationMatches = _findMatches(model, initialValidationRegex);
    // Potential colors have been found, validate the parameters
    if (initialValidationMatches.length > 0) {
        for (const initialMatch of initialValidationMatches) {
            const initialCaptureGroups = initialMatch.filter(captureGroup => captureGroup !== undefined);
            const colorScheme = initialCaptureGroups[1];
            const colorParameters = initialCaptureGroups[2];
            if (!colorParameters) {
                continue;
            }
            let colorInformation;
            if (colorScheme === 'rgb') {
                const regexParameters = /^\(\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*\)$/gm;
                colorInformation = _findRGBColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), false);
            }
            else if (colorScheme === 'rgba') {
                const regexParameters = /^\(\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(0[.][0-9]+|[.][0-9]+|[01][.]|[01])\s*\)$/gm;
                colorInformation = _findRGBColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), true);
            }
            else if (colorScheme === 'hsl') {
                const regexParameters = /^\(\s*(36[0]|3[0-5][0-9]|[12][0-9][0-9]|[1-9]?[0-9])\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*\)$/gm;
                colorInformation = _findHSLColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), false);
            }
            else if (colorScheme === 'hsla') {
                const regexParameters = /^\(\s*(36[0]|3[0-5][0-9]|[12][0-9][0-9]|[1-9]?[0-9])\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*,\s*(0[.][0-9]+|[.][0-9]+|[01][.]|[01])\s*\)$/gm;
                colorInformation = _findHSLColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), true);
            }
            else if (colorScheme === '#') {
                colorInformation = _findHexColorInformation(_findRange(model, initialMatch), colorScheme + colorParameters);
            }
            if (colorInformation) {
                result.push(colorInformation);
            }
        }
    }
    return result;
}
/**
 * Returns an array of all default document colors in the provided document
 */
export function computeDefaultDocumentColors(model) {
    if (!model || typeof model.getValue !== 'function' || typeof model.positionAt !== 'function') {
        // Unknown caller!
        return [];
    }
    return computeColors(model);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdERvY3VtZW50Q29sb3JzQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvZGVmYXVsdERvY3VtZW50Q29sb3JzQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQVc1RCxTQUFTLG1CQUFtQixDQUFDLGFBQXVDO0lBQ25FLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNsQixLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxQyxJQUFJLFlBQVksSUFBSSxZQUFZLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2xGLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTO0lBQzVELE9BQU87UUFDTixHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUc7UUFDWixJQUFJLEVBQUUsQ0FBQyxHQUFHLEdBQUc7UUFDYixLQUFLLEVBQUUsQ0FBQyxHQUFHLEdBQUc7UUFDZCxLQUFLLEVBQUUsQ0FBQztLQUNSLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsS0FBbUMsRUFBRSxLQUF1QjtJQUMvRSxNQUFNLEtBQUssR0FBRyxLQUFLLENB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