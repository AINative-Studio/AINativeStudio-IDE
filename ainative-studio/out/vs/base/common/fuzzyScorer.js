/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareAnything } from './comparers.js';
import { createMatches as createFuzzyMatches, fuzzyScore, isUpper, matchesPrefix } from './filters.js';
import { hash } from './hash.js';
import { sep } from './path.js';
import { isLinux, isWindows } from './platform.js';
import { equalsIgnoreCase, stripWildcards } from './strings.js';
const NO_MATCH = 0;
const NO_SCORE = [NO_MATCH, []];
// const DEBUG = true;
// const DEBUG_MATRIX = false;
export function scoreFuzzy(target, query, queryLower, allowNonContiguousMatches) {
    if (!target || !query) {
        return NO_SCORE; // return early if target or query are undefined
    }
    const targetLength = target.length;
    const queryLength = query.length;
    if (targetLength < queryLength) {
        return NO_SCORE; // impossible for query to be contained in target
    }
    // if (DEBUG) {
    // 	console.group(`Target: ${target}, Query: ${query}`);
    // }
    const targetLower = target.toLowerCase();
    const res = doScoreFuzzy(query, queryLower, queryLength, target, targetLower, targetLength, allowNonContiguousMatches);
    // if (DEBUG) {
    // 	console.log(`%cFinal Score: ${res[0]}`, 'font-weight: bold');
    // 	console.groupEnd();
    // }
    return res;
}
function doScoreFuzzy(query, queryLower, queryLength, target, targetLower, targetLength, allowNonContiguousMatches) {
    const scores = [];
    const matches = [];
    //
    // Build Scorer Matrix:
    //
    // The matrix is composed of query q and target t. For each index we score
    // q[i] with t[i] and compare that with the previous score. If the score is
    // equal or larger, we keep the match. In addition to the score, we also keep
    // the length of the consecutive matches to use as boost for the score.
    //
    //      t   a   r   g   e   t
    //  q
    //  u
    //  e
    //  r
    //  y
    //
    for (let queryIndex = 0; queryIndex < queryLength; queryIndex++) {
        const queryIndexOffset = queryIndex * targetLength;
        const queryIndexPreviousOffset = queryIndexOffset - targetLength;
        const queryIndexGtNull = queryIndex > 0;
        const queryCharAtIndex = query[queryIndex];
        const queryLowerCharAtIndex = queryLower[queryIndex];
        for (let targetIndex = 0; targetIndex < targetLength; targetIndex++) {
            const targetIndexGtNull = targetIndex > 0;
            const currentIndex = queryIndexOffset + targetIndex;
            const leftIndex = currentIndex - 1;
            const diagIndex = queryIndexPreviousOffset + targetIndex - 1;
            const leftScore = targetIndexGtNull ? scores[leftIndex] : 0;
            const diagScore = queryIndexGtNull && targetIndexGtNull ? scores[diagIndex] : 0;
            const matchesSequenceLength = queryIndexGtNull && targetIndexGtNull ? matches[diagIndex] : 0;
            // If we are not matching on the first query character any more, we only produce a
            // score if we had a score previously for the last query index (by looking at the diagScore).
            // This makes sure that the query always matches in sequence on the target. For example
            // given a target of "ede" and a query of "de", we would otherwise produce a wrong high score
            // for query[1] ("e") matching on target[0] ("e") because of the "beginning of word" boost.
            let score;
            if (!diagScore && queryIndexGtNull) {
                score = 0;
            }
            else {
                score = computeCharScore(queryCharAtIndex, queryLowerCharAtIndex, target, targetLower, targetIndex, matchesSequenceLength);
            }
            // We have a score and its equal or larger than the left score
            // Match: sequence continues growing from previous diag value
            // Score: increases by diag score value
            const isValidScore = score && diagScore + score >= leftScore;
            if (isValidScore && (
            // We don't need to check if it's contiguous if we allow non-contiguous matches
            allowNonContiguousMatches ||
                // We must be looking for a contiguous match.
                // Looking at an index higher than 0 in the query means we must have already
                // found out this is contiguous otherwise there wouldn't have been a score
                queryIndexGtNull ||
                // lastly check if the query is completely contiguous at this index in the target
                targetLower.startsWith(queryLower, targetIndex))) {
                matches[currentIndex] = matchesSequenceLength + 1;
                scores[currentIndex] = diagScore + score;
            }
            // We either have no score or the score is lower than the left score
            // Match: reset to 0
            // Score: pick up from left hand side
            else {
                matches[currentIndex] = NO_MATCH;
                scores[currentIndex] = leftScore;
            }
        }
    }
    // Restore Positions (starting from bottom right of matrix)
    const positions = [];
    let queryIndex = queryLength - 1;
    let targetIndex = targetLength - 1;
    while (queryIndex >= 0 && targetIndex >= 0) {
        const currentIndex = queryIndex * targetLength + targetIndex;
        const match = matches[currentIndex];
        if (match === NO_MATCH) {
            targetIndex--; // go left
        }
        else {
            positions.push(targetIndex);
            // go up and left
            queryIndex--;
            targetIndex--;
        }
    }
    // Print matrix
    // if (DEBUG_MATRIX) {
    // 	printMatrix(query, target, matches, scores);
    // }
    return [scores[queryLength * targetLength - 1], positions.reverse()];
}
function computeCharScore(queryCharAtIndex, queryLowerCharAtIndex, target, targetLower, targetIndex, matchesSequenceLength) {
    let score = 0;
    if (!considerAsEqual(queryLowerCharAtIndex, targetLower[targetIndex])) {
        return score; // no match of characters
    }
    // if (DEBUG) {
    // 	console.groupCollapsed(`%cFound a match of char: ${queryLowerCharAtIndex} at index ${targetIndex}`, 'font-weight: normal');
    // }
    // Character match bonus
    score += 1;
    // if (DEBUG) {
    // 	console.log(`%cCharacter match bonus: +1`, 'font-weight: normal');
    // }
    // Consecutive match bonus
    if (matchesSequenceLength > 0) {
        score += (matchesSequenceLength * 5);
        // if (DEBUG) {
        // 	console.log(`Consecutive match bonus: +${matchesSequenceLength * 5}`);
        // }
    }
    // Same case bonus
    if (queryCharAtIndex === target[targetIndex]) {
        score += 1;
        // if (DEBUG) {
        // 	console.log('Same case bonus: +1');
        // }
    }
    // Start of word bonus
    if (targetIndex === 0) {
        score += 8;
        // if (DEBUG) {
        // 	console.log('Start of word bonus: +8');
        // }
    }
    else {
        // After separator bonus
        const separatorBonus = scoreSeparatorAtPos(target.charCodeAt(targetIndex - 1));
        if (separatorBonus) {
            score += separatorBonus;
            // if (DEBUG) {
            // 	console.log(`After separator bonus: +${separatorBonus}`);
            // }
        }
        // Inside word upper case bonus (camel case). We only give this bonus if we're not in a contiguous sequence.
        // For example:
        // NPE => NullPointerException = boost
        // HTTP => HTTP = not boost
        else if (isUpper(target.charCodeAt(targetIndex)) && matchesSequenceLength === 0) {
            score += 2;
            // if (DEBUG) {
            // 	console.log('Inside word upper case bonus: +2');
            // }
        }
    }
    // if (DEBUG) {
    // 	console.log(`Total score: ${score}`);
    // 	console.groupEnd();
    // }
    return score;
}
function considerAsEqual(a, b) {
    if (a === b) {
        return true;
    }
    // Special case path separators: ignore platform differences
    if (a === '/' || a === '\\') {
        return b === '/' || b === '\\';
    }
    return false;
}
function scoreSeparatorAtPos(charCode) {
    switch (charCode) {
        case 47 /* CharCode.Slash */:
        case 92 /* CharCode.Backslash */:
            return 5; // prefer path separators...
        case 95 /* CharCode.Underline */:
        case 45 /* CharCode.Dash */:
        case 46 /* CharCode.Period */:
        case 32 /* CharCode.Space */:
        case 39 /* CharCode.SingleQuote */:
        case 34 /* CharCode.DoubleQuote */:
        case 58 /* CharCode.Colon */:
            return 4; // ...over other separators
        default:
            return 0;
    }
}
const NO_SCORE2 = [undefined, []];
export function scoreFuzzy2(target, query, patternStart = 0, wordStart = 0) {
    // Score: multiple inputs
    const preparedQuery = query;
    if (preparedQuery.values && preparedQuery.values.length > 1) {
        return doScoreFuzzy2Multiple(target, preparedQuery.values, patternStart, wordStart);
    }
    // Score: single input
    return doScoreFuzzy2Single(target, query, patternStart, wordStart);
}
function doScoreFuzzy2Multiple(target, query, patternStart, wordStart) {
    let totalScore = 0;
    const totalMatches = [];
    for (const queryPiece of query) {
        const [score, matches] = doScoreFuzzy2Single(target, queryPiece, patternStart, wordStart);
        if (typeof score !== 'number') {
            // if a single query value does not match, return with
            // no score entirely, we require all queries to match
            return NO_SCORE2;
        }
        totalScore += score;
        totalMatches.push(...matches);
    }
    // if we have a score, ensure that the positions are
    // sorted in ascending order and distinct
    return [totalScore, normalizeMatches(totalMatches)];
}
function doScoreFuzzy2Single(target, query, patternStart, wordStart) {
    const score = fuzzyScore(query.original, query.originalLowercase, patternStart, target, target.toLowerCase(), wordStart, { firstMatchCanBeWeak: true, boostFullMatch: true });
    if (!score) {
        return NO_SCORE2;
    }
    return [score[0], createFuzzyMatches(score)];
}
const NO_ITEM_SCORE = Object.freeze({ score: 0 });
const PATH_IDENTITY_SCORE = 1 << 18;
const LABEL_PREFIX_SCORE_THRESHOLD = 1 << 17;
const LABEL_SCORE_THRESHOLD = 1 << 16;
function getCacheHash(label, description, allowNonContiguousMatches, query) {
    const values = query.values ? query.values : [query];
    const cacheHash = hash({
        [query.normalized]: {
            values: values.map(v => ({ value: v.normalized, expectContiguousMatch: v.expectContiguousMatch })),
            label,
            description,
            allowNonContiguousMatches
        }
    });
    return cacheHash;
}
export function scoreItemFuzzy(item, query, allowNonContiguousMatches, accessor, cache) {
    if (!item || !query.normalized) {
        return NO_ITEM_SCORE; // we need an item and query to score on at least
    }
    const label = accessor.getItemLabel(item);
    if (!label) {
        return NO_ITEM_SCORE; // we need a label at least
    }
    const description = accessor.getItemDescription(item);
    // in order to speed up scoring, we cache the score with a unique hash based on:
    // - label
    // - description (if provided)
    // - whether non-contiguous matching is enabled or not
    // - hash of the query (normalized) values
    const cacheHash = getCacheHash(label, description, allowNonContiguousMatches, query);
    const cached = cache[cacheHash];
    if (cached) {
        return cached;
    }
    const itemScore = doScoreItemFuzzy(label, description, accessor.getItemPath(item), query, allowNonContiguousMatches);
    cache[cacheHash] = itemScore;
    return itemScore;
}
function doScoreItemFuzzy(label, description, path, query, allowNonContiguousMatches) {
    const preferLabelMatches = !path || !query.containsPathSeparator;
    // Treat identity matches on full path highest
    if (path && (isLinux ? query.pathNormalized === path : equalsIgnoreCase(query.pathNormalized, path))) {
        return { score: PATH_IDENTITY_SCORE, labelMatch: [{ start: 0, end: label.length }], descriptionMatch: description ? [{ start: 0, end: description.length }] : undefined };
    }
    // Score: multiple inputs
    if (query.values && query.values.length > 1) {
        return doScoreItemFuzzyMultiple(label, description, path, query.values, preferLabelMatches, allowNonContiguousMatches);
    }
    // Score: single input
    return doScoreItemFuzzySingle(label, description, path, query, preferLabelMatches, allowNonContiguousMatches);
}
function doScoreItemFuzzyMultiple(label, description, path, query, preferLabelMatches, allowNonContiguousMatches) {
    let totalScore = 0;
    const totalLabelMatches = [];
    const totalDescriptionMatches = [];
    for (const queryPiece of query) {
        const { score, labelMatch, descriptionMatch } = doScoreItemFuzzySingle(label, description, path, queryPiece, preferLabelMatches, allowNonContiguousMatches);
        if (score === NO_MATCH) {
            // if a single query value does not match, return with
            // no score entirely, we require all queries to match
            return NO_ITEM_SCORE;
        }
        totalScore += score;
        if (labelMatch) {
            totalLabelMatches.push(...labelMatch);
        }
        if (descriptionMatch) {
            totalDescriptionMatches.push(...descriptionMatch);
        }
    }
    // if we have a score, ensure that the positions are
    // sorted in ascending order and distinct
    return {
        score: totalScore,
        labelMatch: normalizeMatches(totalLabelMatches),
        descriptionMatch: normalizeMatches(totalDescriptionMatches)
    };
}
function doScoreItemFuzzySingle(label, description, path, query, preferLabelMatches, allowNonContiguousMatches) {
    // Prefer label matches if told so or we have no description
    if (preferLabelMatches || !description) {
        const [labelScore, labelPositions] = scoreFuzzy(label, query.normalized, query.normalizedLowercase, allowNonContiguousMatches && !query.expectContiguousMatch);
        if (labelScore) {
            // If we have a prefix match on the label, we give a much
            // higher baseScore to elevate these matches over others
            // This ensures that typing a file name wins over results
            // that are present somewhere in the label, but not the
            // beginning.
            const labelPrefixMatch = matchesPrefix(query.normalized, label);
            let baseScore;
            if (labelPrefixMatch) {
                baseScore = LABEL_PREFIX_SCORE_THRESHOLD;
                // We give another boost to labels that are short, e.g. given
                // files "window.ts" and "windowActions.ts" and a query of
                // "window", we want "window.ts" to receive a higher score.
                // As such we compute the percentage the query has within the
                // label and add that to the baseScore.
                const prefixLengthBoost = Math.round((query.normalized.length / label.length) * 100);
                baseScore += prefixLengthBoost;
            }
            else {
                baseScore = LABEL_SCORE_THRESHOLD;
            }
            return { score: baseScore + labelScore, labelMatch: labelPrefixMatch || createMatches(labelPositions) };
        }
    }
    // Finally compute description + label scores if we have a description
    if (description) {
        let descriptionPrefix = description;
        if (!!path) {
            descriptionPrefix = `${description}${sep}`; // assume this is a file path
        }
        const descriptionPrefixLength = descriptionPrefix.length;
        const descriptionAndLabel = `${descriptionPrefix}${label}`;
        const [labelDescriptionScore, labelDescriptionPositions] = scoreFuzzy(descriptionAndLabel, query.normalized, query.normalizedLowercase, allowNonContiguousMatches && !query.expectContiguousMatch);
        if (labelDescriptionScore) {
            const labelDescriptionMatches = createMatches(labelDescriptionPositions);
            const labelMatch = [];
            const descriptionMatch = [];
            // We have to split the matches back onto the label and description portions
            labelDescriptionMatches.forEach(h => {
                // Match overlaps label and description part, we need to split it up
                if (h.start < descriptionPrefixLength && h.end > descriptionPrefixLength) {
                    labelMatch.push({ start: 0, end: h.end - descriptionPrefixLength });
                    descriptionMatch.push({ start: h.start, end: descriptionPrefixLength });
                }
                // Match on label part
                else if (h.start >= descriptionPrefixLength) {
                    labelMatch.push({ start: h.start - descriptionPrefixLength, end: h.end - descriptionPrefixLength });
                }
                // Match on description part
                else {
                    descriptionMatch.push(h);
                }
            });
            return { score: labelDescriptionScore, labelMatch, descriptionMatch };
        }
    }
    return NO_ITEM_SCORE;
}
function createMatches(offsets) {
    const ret = [];
    if (!offsets) {
        return ret;
    }
    let last;
    for (const pos of offsets) {
        if (last && last.end === pos) {
            last.end += 1;
        }
        else {
            last = { start: pos, end: pos + 1 };
            ret.push(last);
        }
    }
    return ret;
}
function normalizeMatches(matches) {
    // sort matches by start to be able to normalize
    const sortedMatches = matches.sort((matchA, matchB) => {
        return matchA.start - matchB.start;
    });
    // merge matches that overlap
    const normalizedMatches = [];
    let currentMatch = undefined;
    for (const match of sortedMatches) {
        // if we have no current match or the matches
        // do not overlap, we take it as is and remember
        // it for future merging
        if (!currentMatch || !matchOverlaps(currentMatch, match)) {
            currentMatch = match;
            normalizedMatches.push(match);
        }
        // otherwise we merge the matches
        else {
            currentMatch.start = Math.min(currentMatch.start, match.start);
            currentMatch.end = Math.max(currentMatch.end, match.end);
        }
    }
    return normalizedMatches;
}
function matchOverlaps(matchA, matchB) {
    if (matchA.end < matchB.start) {
        return false; // A ends before B starts
    }
    if (matchB.end < matchA.start) {
        return false; // B ends before A starts
    }
    return true;
}
//#endregion
//#region Comparers
export function compareItemsByFuzzyScore(itemA, itemB, query, allowNonContiguousMatches, accessor, cache) {
    const itemScoreA = scoreItemFuzzy(itemA, query, allowNonContiguousMatches, accessor, cache);
    const itemScoreB = scoreItemFuzzy(itemB, query, allowNonContiguousMatches, accessor, cache);
    const scoreA = itemScoreA.score;
    const scoreB = itemScoreB.score;
    // 1.) identity matches have highest score
    if (scoreA === PATH_IDENTITY_SCORE || scoreB === PATH_IDENTITY_SCORE) {
        if (scoreA !== scoreB) {
            return scoreA === PATH_IDENTITY_SCORE ? -1 : 1;
        }
    }
    // 2.) matches on label are considered higher compared to label+description matches
    if (scoreA > LABEL_SCORE_THRESHOLD || scoreB > LABEL_SCORE_THRESHOLD) {
        if (scoreA !== scoreB) {
            return scoreA > scoreB ? -1 : 1;
        }
        // prefer more compact matches over longer in label (unless this is a prefix match where
        // longer prefix matches are actually preferred)
        if (scoreA < LABEL_PREFIX_SCORE_THRESHOLD && scoreB < LABEL_PREFIX_SCORE_THRESHOLD) {
            const comparedByMatchLength = compareByMatchLength(itemScoreA.labelMatch, itemScoreB.labelMatch);
            if (comparedByMatchLength !== 0) {
                return comparedByMatchLength;
            }
        }
        // prefer shorter labels over longer labels
        const labelA = accessor.getItemLabel(itemA) || '';
        const labelB = accessor.getItemLabel(itemB) || '';
        if (labelA.length !== labelB.length) {
            return labelA.length - labelB.length;
        }
    }
    // 3.) compare by score in label+description
    if (scoreA !== scoreB) {
        return scoreA > scoreB ? -1 : 1;
    }
    // 4.) scores are identical: prefer matches in label over non-label matches
    const itemAHasLabelMatches = Array.isArray(itemScoreA.labelMatch) && itemScoreA.labelMatch.length > 0;
    const itemBHasLabelMatches = Array.isArray(itemScoreB.labelMatch) && itemScoreB.labelMatch.length > 0;
    if (itemAHasLabelMatches && !itemBHasLabelMatches) {
        return -1;
    }
    else if (itemBHasLabelMatches && !itemAHasLabelMatches) {
        return 1;
    }
    // 5.) scores are identical: prefer more compact matches (label and description)
    const itemAMatchDistance = computeLabelAndDescriptionMatchDistance(itemA, itemScoreA, accessor);
    const itemBMatchDistance = computeLabelAndDescriptionMatchDistance(itemB, itemScoreB, accessor);
    if (itemAMatchDistance && itemBMatchDistance && itemAMatchDistance !== itemBMatchDistance) {
        return itemBMatchDistance > itemAMatchDistance ? -1 : 1;
    }
    // 6.) scores are identical: start to use the fallback compare
    return fallbackCompare(itemA, itemB, query, accessor);
}
function computeLabelAndDescriptionMatchDistance(item, score, accessor) {
    let matchStart = -1;
    let matchEnd = -1;
    // If we have description matches, the start is first of description match
    if (score.descriptionMatch && score.descriptionMatch.length) {
        matchStart = score.descriptionMatch[0].start;
    }
    // Otherwise, the start is the first label match
    else if (score.labelMatch && score.labelMatch.length) {
        matchStart = score.labelMatch[0].start;
    }
    // If we have label match, the end is the last label match
    // If we had a description match, we add the length of the description
    // as offset to the end to indicate this.
    if (score.labelMatch && score.labelMatch.length) {
        matchEnd = score.labelMatch[score.labelMatch.length - 1].end;
        if (score.descriptionMatch && score.descriptionMatch.length) {
            const itemDescription = accessor.getItemDescription(item);
            if (itemDescription) {
                matchEnd += itemDescription.length;
            }
        }
    }
    // If we have just a description match, the end is the last description match
    else if (score.descriptionMatch && score.descriptionMatch.length) {
        matchEnd = score.descriptionMatch[score.descriptionMatch.length - 1].end;
    }
    return matchEnd - matchStart;
}
function compareByMatchLength(matchesA, matchesB) {
    if ((!matchesA && !matchesB) || ((!matchesA || !matchesA.length) && (!matchesB || !matchesB.length))) {
        return 0; // make sure to not cause bad comparing when matches are not provided
    }
    if (!matchesB || !matchesB.length) {
        return -1;
    }
    if (!matchesA || !matchesA.length) {
        return 1;
    }
    // Compute match length of A (first to last match)
    const matchStartA = matchesA[0].start;
    const matchEndA = matchesA[matchesA.length - 1].end;
    const matchLengthA = matchEndA - matchStartA;
    // Compute match length of B (first to last match)
    const matchStartB = matchesB[0].start;
    const matchEndB = matchesB[matchesB.length - 1].end;
    const matchLengthB = matchEndB - matchStartB;
    // Prefer shorter match length
    return matchLengthA === matchLengthB ? 0 : matchLengthB < matchLengthA ? 1 : -1;
}
function fallbackCompare(itemA, itemB, query, accessor) {
    // check for label + description length and prefer shorter
    const labelA = accessor.getItemLabel(itemA) || '';
    const labelB = accessor.getItemLabel(itemB) || '';
    const descriptionA = accessor.getItemDescription(itemA);
    const descriptionB = accessor.getItemDescription(itemB);
    const labelDescriptionALength = labelA.length + (descriptionA ? descriptionA.length : 0);
    const labelDescriptionBLength = labelB.length + (descriptionB ? descriptionB.length : 0);
    if (labelDescriptionALength !== labelDescriptionBLength) {
        return labelDescriptionALength - labelDescriptionBLength;
    }
    // check for path length and prefer shorter
    const pathA = accessor.getItemPath(itemA);
    const pathB = accessor.getItemPath(itemB);
    if (pathA && pathB && pathA.length !== pathB.length) {
        return pathA.length - pathB.length;
    }
    // 7.) finally we have equal scores and equal length, we fallback to comparer
    // compare by label
    if (labelA !== labelB) {
        return compareAnything(labelA, labelB, query.normalized);
    }
    // compare by description
    if (descriptionA && descriptionB && descriptionA !== descriptionB) {
        return compareAnything(descriptionA, descriptionB, query.normalized);
    }
    // compare by path
    if (pathA && pathB && pathA !== pathB) {
        return compareAnything(pathA, pathB, query.normalized);
    }
    // equal
    return 0;
}
/*
 * If a query is wrapped in quotes, the user does not want to
 * use fuzzy search for this query.
 */
function queryExpectsExactMatch(query) {
    return query.startsWith('"') && query.endsWith('"');
}
/**
 * Helper function to prepare a search value for scoring by removing unwanted characters
 * and allowing to score on multiple pieces separated by whitespace character.
 */
const MULTIPLE_QUERY_VALUES_SEPARATOR = ' ';
export function prepareQuery(original) {
    if (typeof original !== 'string') {
        original = '';
    }
    const originalLowercase = original.toLowerCase();
    const { pathNormalized, normalized, normalizedLowercase } = normalizeQuery(original);
    const containsPathSeparator = pathNormalized.indexOf(sep) >= 0;
    const expectExactMatch = queryExpectsExactMatch(original);
    let values = undefined;
    const originalSplit = original.split(MULTIPLE_QUERY_VALUES_SEPARATOR);
    if (originalSplit.length > 1) {
        for (const originalPiece of originalSplit) {
            const expectExactMatchPiece = queryExpectsExactMatch(originalPiece);
            const { pathNormalized: pathNormalizedPiece, normalized: normalizedPiece, normalizedLowercase: normalizedLowercasePiece } = normalizeQuery(originalPiece);
            if (normalizedPiece) {
                if (!values) {
                    values = [];
                }
                values.push({
                    original: originalPiece,
                    originalLowercase: originalPiece.toLowerCase(),
                    pathNormalized: pathNormalizedPiece,
                    normalized: normalizedPiece,
                    normalizedLowercase: normalizedLowercasePiece,
                    expectContiguousMatch: expectExactMatchPiece
                });
            }
        }
    }
    return { original, originalLowercase, pathNormalized, normalized, normalizedLowercase, values, containsPathSeparator, expectContiguousMatch: expectExactMatch };
}
function normalizeQuery(original) {
    let pathNormalized;
    if (isWindows) {
        pathNormalized = original.replace(/\//g, sep); // Help Windows users to search for paths when using slash
    }
    else {
        pathNormalized = original.replace(/\\/g, sep); // Help macOS/Linux users to search for paths when using backslash
    }
    // we remove quotes here because quotes are used for exact match search
    const normalized = stripWildcards(pathNormalized).replace(/\s|"/g, '');
    return {
        pathNormalized,
        normalized,
        normalizedLowercase: normalized.toLowerCase()
    };
}
export function pieceToQuery(arg1) {
    if (Array.isArray(arg1)) {
        return prepareQuery(arg1.map(piece => piece.original).join(MULTIPLE_QUERY_VALUES_SEPARATOR));
    }
    return prepareQuery(arg1.original);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV6enlTY29yZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZnV6enlTY29yZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxhQUFhLElBQUksa0JBQWtCLEVBQUUsVUFBVSxFQUFVLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL0csT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNqQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFPaEUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBQ25CLE1BQU0sUUFBUSxHQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRTVDLHNCQUFzQjtBQUN0Qiw4QkFBOEI7QUFFOUIsTUFBTSxVQUFVLFVBQVUsQ0FBQyxNQUFjLEVBQUUsS0FBYSxFQUFFLFVBQWtCLEVBQUUseUJBQWtDO0lBQy9HLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixPQUFPLFFBQVEsQ0FBQyxDQUFDLGdEQUFnRDtJQUNsRSxDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNuQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBRWpDLElBQUksWUFBWSxHQUFHLFdBQVcsRUFBRSxDQUFDO1FBQ2hDLE9BQU8s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