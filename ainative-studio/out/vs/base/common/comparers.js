/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from './lazy.js';
import { sep } from './path.js';
// When comparing large numbers of strings it's better for performance to create an
// Intl.Collator object and use the function provided by its compare property
// than it is to use String.prototype.localeCompare()
// A collator with numeric sorting enabled, and no sensitivity to case, accents or diacritics.
const intlFileNameCollatorBaseNumeric = new Lazy(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return {
        collator,
        collatorIsNumeric: collator.resolvedOptions().numeric
    };
});
// A collator with numeric sorting enabled.
const intlFileNameCollatorNumeric = new Lazy(() => {
    const collator = new Intl.Collator(undefined, { numeric: true });
    return {
        collator
    };
});
// A collator with numeric sorting enabled, and sensitivity to accents and diacritics but not case.
const intlFileNameCollatorNumericCaseInsensitive = new Lazy(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'accent' });
    return {
        collator
    };
});
/** Compares filenames without distinguishing the name from the extension. Disambiguates by unicode comparison. */
export function compareFileNames(one, other, caseSensitive = false) {
    const a = one || '';
    const b = other || '';
    const result = intlFileNameCollatorBaseNumeric.value.collator.compare(a, b);
    // Using the numeric option will make compare(`foo1`, `foo01`) === 0. Disambiguate.
    if (intlFileNameCollatorBaseNumeric.value.collatorIsNumeric && result === 0 && a !== b) {
        return a < b ? -1 : 1;
    }
    return result;
}
/** Compares full filenames without grouping by case. */
export function compareFileNamesDefault(one, other) {
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    one = one || '';
    other = other || '';
    return compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares full filenames grouping uppercase names before lowercase. */
export function compareFileNamesUpper(one, other) {
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    one = one || '';
    other = other || '';
    return compareCaseUpperFirst(one, other) || compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares full filenames grouping lowercase names before uppercase. */
export function compareFileNamesLower(one, other) {
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    one = one || '';
    other = other || '';
    return compareCaseLowerFirst(one, other) || compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares full filenames by unicode value. */
export function compareFileNamesUnicode(one, other) {
    one = one || '';
    other = other || '';
    if (one === other) {
        return 0;
    }
    return one < other ? -1 : 1;
}
/** Compares filenames by extension, then by name. Disambiguates by unicode comparison. */
export function compareFileExtensions(one, other) {
    const [oneName, oneExtension] = extractNameAndExtension(one);
    const [otherName, otherExtension] = extractNameAndExtension(other);
    let result = intlFileNameCollatorBaseNumeric.value.collator.compare(oneExtension, otherExtension);
    if (result === 0) {
        // Using the numeric option will  make compare(`foo1`, `foo01`) === 0. Disambiguate.
        if (intlFileNameCollatorBaseNumeric.value.collatorIsNumeric && oneExtension !== otherExtension) {
            return oneExtension < otherExtension ? -1 : 1;
        }
        // Extensions are equal, compare filenames
        result = intlFileNameCollatorBaseNumeric.value.collator.compare(oneName, otherName);
        if (intlFileNameCollatorBaseNumeric.value.collatorIsNumeric && result === 0 && oneName !== otherName) {
            return oneName < otherName ? -1 : 1;
        }
    }
    return result;
}
/** Compares filenames by extension, then by full filename. Mixes uppercase and lowercase names together. */
export function compareFileExtensionsDefault(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one);
    const otherExtension = extractExtension(other);
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    const collatorNumericCaseInsensitive = intlFileNameCollatorNumericCaseInsensitive.value.collator;
    return compareAndDisambiguateByLength(collatorNumericCaseInsensitive, oneExtension, otherExtension) ||
        compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares filenames by extension, then case, then full filename. Groups uppercase names before lowercase. */
export function compareFileExtensionsUpper(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one);
    const otherExtension = extractExtension(other);
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    const collatorNumericCaseInsensitive = intlFileNameCollatorNumericCaseInsensitive.value.collator;
    return compareAndDisambiguateByLength(collatorNumericCaseInsensitive, oneExtension, otherExtension) ||
        compareCaseUpperFirst(one, other) ||
        compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares filenames by extension, then case, then full filename. Groups lowercase names before uppercase. */
export function compareFileExtensionsLower(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one);
    const otherExtension = extractExtension(other);
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    const collatorNumericCaseInsensitive = intlFileNameCollatorNumericCaseInsensitive.value.collator;
    return compareAndDisambiguateByLength(collatorNumericCaseInsensitive, oneExtension, otherExtension) ||
        compareCaseLowerFirst(one, other) ||
        compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares filenames by case-insensitive extension unicode value, then by full filename unicode value. */
export function compareFileExtensionsUnicode(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one).toLowerCase();
    const otherExtension = extractExtension(other).toLowerCase();
    // Check for extension differences
    if (oneExtension !== otherExtension) {
        return oneExtension < otherExtension ? -1 : 1;
    }
    // Check for full filename differences.
    if (one !== other) {
        return one < other ? -1 : 1;
    }
    return 0;
}
const FileNameMatch = /^(.*?)(\.([^.]*))?$/;
/** Extracts the name and extension from a full filename, with optional special handling for dotfiles */
function extractNameAndExtension(str, dotfilesAsNames = false) {
    const match = str ? FileNameMatch.exec(str) : [];
    let result = [(match && match[1]) || '', (match && match[3]) || ''];
    // if the dotfilesAsNames option is selected, treat an empty filename with an extension
    // or a filename that starts with a dot, as a dotfile name
    if (dotfilesAsNames && (!result[0] && result[1] || result[0] && result[0].charAt(0) === '.')) {
        result = [result[0] + '.' + result[1], ''];
    }
    return result;
}
/** Extracts the extension from a full filename. Treats dotfiles as names, not extensions. */
function extractExtension(str) {
    const match = str ? FileNameMatch.exec(str) : [];
    return (match && match[1] && match[1].charAt(0) !== '.' && match[3]) || '';
}
function compareAndDisambiguateByLength(collator, one, other) {
    // Check for differences
    const result = collator.compare(one, other);
    if (result !== 0) {
        return result;
    }
    // In a numeric comparison, `foo1` and `foo01` will compare as equivalent.
    // Disambiguate by sorting the shorter string first.
    if (one.length !== other.length) {
        return one.length < other.length ? -1 : 1;
    }
    return 0;
}
/** @returns `true` if the string is starts with a lowercase letter. Otherwise, `false`. */
function startsWithLower(string) {
    const character = string.charAt(0);
    return (character.toLocaleUpperCase() !== character) ? true : false;
}
/** @returns `true` if the string starts with an uppercase letter. Otherwise, `false`. */
function startsWithUpper(string) {
    const character = string.charAt(0);
    return (character.toLocaleLowerCase() !== character) ? true : false;
}
/**
 * Compares the case of the provided strings - lowercase before uppercase
 *
 * @returns
 * ```text
 *   -1 if one is lowercase and other is uppercase
 *    1 if one is uppercase and other is lowercase
 *    0 otherwise
 * ```
 */
function compareCaseLowerFirst(one, other) {
    if (startsWithLower(one) && startsWithUpper(other)) {
        return -1;
    }
    return (startsWithUpper(one) && startsWithLower(other)) ? 1 : 0;
}
/**
 * Compares the case of the provided strings - uppercase before lowercase
 *
 * @returns
 * ```text
 *   -1 if one is uppercase and other is lowercase
 *    1 if one is lowercase and other is uppercase
 *    0 otherwise
 * ```
 */
function compareCaseUpperFirst(one, other) {
    if (startsWithUpper(one) && startsWithLower(other)) {
        return -1;
    }
    return (startsWithLower(one) && startsWithUpper(other)) ? 1 : 0;
}
function comparePathComponents(one, other, caseSensitive = false) {
    if (!caseSensitive) {
        one = one && one.toLowerCase();
        other = other && other.toLowerCase();
    }
    if (one === other) {
        return 0;
    }
    return one < other ? -1 : 1;
}
export function comparePaths(one, other, caseSensitive = false) {
    const oneParts = one.split(sep);
    const otherParts = other.split(sep);
    const lastOne = oneParts.length - 1;
    const lastOther = otherParts.length - 1;
    let endOne, endOther;
    for (let i = 0;; i++) {
        endOne = lastOne === i;
        endOther = lastOther === i;
        if (endOne && endOther) {
            return compareFileNames(oneParts[i], otherParts[i], caseSensitive);
        }
        else if (endOne) {
            return -1;
        }
        else if (endOther) {
            return 1;
        }
        const result = comparePathComponents(oneParts[i], otherParts[i], caseSensitive);
        if (result !== 0) {
            return result;
        }
    }
}
export function compareAnything(one, other, lookFor) {
    const elementAName = one.toLowerCase();
    const elementBName = other.toLowerCase();
    // Sort prefix matches over non prefix matches
    const prefixCompare = compareByPrefix(one, other, lookFor);
    if (prefixCompare) {
        return prefixCompare;
    }
    // Sort suffix matches over non suffix matches
    const elementASuffixMatch = elementAName.endsWith(lookFor);
    const elementBSuffixMatch = elementBName.endsWith(lookFor);
    if (elementASuffixMatch !== elementBSuffixMatch) {
        return elementASuffixMatch ? -1 : 1;
    }
    // Understand file names
    const r = compareFileNames(elementAName, elementBName);
    if (r !== 0) {
        return r;
    }
    // Compare by name
    return elementAName.localeCompare(elementBName);
}
export function compareByPrefix(one, other, lookFor) {
    const elementAName = one.toLowerCase();
    const elementBName = other.toLowerCase();
    // Sort prefix matches over non prefix matches
    const elementAPrefixMatch = elementAName.startsWith(lookFor);
    const elementBPrefixMatch = elementBName.startsWith(lookFor);
    if (elementAPrefixMatch !== elementBPrefixMatch) {
        return elementAPrefixMatch ? -1 : 1;
    }
    // Same prefix: Sort shorter matches to the top to have those on top that match more precisely
    else if (elementAPrefixMatch && elementBPrefixMatch) {
        if (elementAName.length < elementBName.length) {
            return -1;
        }
        if (elementAName.length > elementBName.length) {
            return 1;
        }
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvbXBhcmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsbUZBQW1GO0FBQ25GLDZFQUE2RTtBQUM3RSxxREFBcUQ7QUFFckQsOEZBQThGO0FBQzlGLE1BQU0sK0JBQStCLEdBQWtFLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNwSCxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN0RixPQUFPO1FBQ04sUUFBUTtRQUNSLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxPQUFPO0tBQ3JELENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVILDJDQUEyQztBQUMzQyxNQUFNLDJCQUEyQixHQUFzQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDcEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLE9BQU87UUFDTixRQUFRO0tBQ1IsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDO0FBRUgsbUdBQW1HO0FBQ25HLE1BQU0sMENBQTBDLEdBQXNDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNuRyxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FB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