/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy } from './filters.js';
import { ltrim } from './strings.js';
import { ThemeIcon } from './themables.js';
const iconStartMarker = '$(';
const iconsRegex = new RegExp(`\\$\\(${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?\\)`, 'g'); // no capturing groups
const escapeIconsRegex = new RegExp(`(\\\\)?${iconsRegex.source}`, 'g');
export function escapeIcons(text) {
    return text.replace(escapeIconsRegex, (match, escaped) => escaped ? match : `\\${match}`);
}
const markdownEscapedIconsRegex = new RegExp(`\\\\${iconsRegex.source}`, 'g');
export function markdownEscapeEscapedIcons(text) {
    // Need to add an extra \ for escaping in markdown
    return text.replace(markdownEscapedIconsRegex, match => `\\${match}`);
}
const stripIconsRegex = new RegExp(`(\\s)?(\\\\)?${iconsRegex.source}(\\s)?`, 'g');
/**
 * Takes a label with icons (`$(iconId)xyz`)  and strips the icons out (`xyz`)
 */
export function stripIcons(text) {
    if (text.indexOf(iconStartMarker) === -1) {
        return text;
    }
    return text.replace(stripIconsRegex, (match, preWhitespace, escaped, postWhitespace) => escaped ? match : preWhitespace || postWhitespace || '');
}
/**
 * Takes a label with icons (`$(iconId)xyz`), removes the icon syntax adds whitespace so that screen readers can read the text better.
 */
export function getCodiconAriaLabel(text) {
    if (!text) {
        return '';
    }
    return text.replace(/\$\((.*?)\)/g, (_match, codiconName) => ` ${codiconName} `).trim();
}
const _parseIconsRegex = new RegExp(`\\$\\(${ThemeIcon.iconNameCharacter}+\\)`, 'g');
/**
 * Takes a label with icons (`abc $(iconId)xyz`) and returns the text (`abc xyz`) and the offsets of the icons (`[3]`)
 */
export function parseLabelWithIcons(input) {
    _parseIconsRegex.lastIndex = 0;
    let text = '';
    const iconOffsets = [];
    let iconsOffset = 0;
    while (true) {
        const pos = _parseIconsRegex.lastIndex;
        const match = _parseIconsRegex.exec(input);
        const chars = input.substring(pos, match?.index);
        if (chars.length > 0) {
            text += chars;
            for (let i = 0; i < chars.length; i++) {
                iconOffsets.push(iconsOffset);
            }
        }
        if (!match) {
            break;
        }
        iconsOffset += match[0].length;
    }
    return { text, iconOffsets };
}
export function matchesFuzzyIconAware(query, target, enableSeparateSubstringMatching = false) {
    const { text, iconOffsets } = target;
    // Return early if there are no icon markers in the word to match against
    if (!iconOffsets || iconOffsets.length === 0) {
        return matchesFuzzy(query, text, enableSeparateSubstringMatching);
    }
    // Trim the word to match against because it could have leading
    // whitespace now if the word started with an icon
    const wordToMatchAgainstWithoutIconsTrimmed = ltrim(text, ' ');
    const leadingWhitespaceOffset = text.length - wordToMatchAgainstWithoutIconsTrimmed.length;
    // match on value without icon
    const matches = matchesFuzzy(query, wordToMatchAgainstWithoutIconsTrimmed, enableSeparateSubstringMatching);
    // Map matches back to offsets with icon and trimming
    if (matches) {
        for (const match of matches) {
            const iconOffset = iconOffsets[match.start + leadingWhitespaceOffset] /* icon offsets at index */ + leadingWhitespaceOffset /* overall leading whitespace offset */;
            match.start += iconOffset;
            match.end += iconOffset;
        }
    }
    return matches;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9pY29uTGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVSxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNyQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFM0MsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBRTdCLE1BQU0sVUFBVSxHQUFHLElBQUksTUFBTSxDQUFDLFNBQVMsU0FBUyxDQUFDLGtCQUFrQixNQUFNLFNBQVMsQ0FBQyxzQkFBc0IsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsc0JBQXNCO0FBRTlJLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxNQUFNLENBQUMsVUFBVSxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDeEUsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFZO0lBQ3ZDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDM0YsQ0FBQztBQUVELE1BQU0seUJBQXlCLEdBQUcsSUFBSSxNQUFNLENBQUMsT0FBTyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDOUUsTUFBTSxVQUFVLDBCQUEwQixDQUFDLElBQVk7SUFDdEQsa0RBQWtEO0lBQ2xELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFB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