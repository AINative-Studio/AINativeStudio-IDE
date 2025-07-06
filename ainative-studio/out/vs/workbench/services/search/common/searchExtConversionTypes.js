/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce } from '../../../../base/common/arrays.js';
import { DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS } from './search.js';
import { TextSearchContext2, TextSearchMatch2 } from './searchExtTypes.js';
/**
 * Checks if the given object is of type TextSearchMatch.
 * @param object The object to check.
 * @returns True if the object is a TextSearchMatch, false otherwise.
 */
function isTextSearchMatch(object) {
    return 'uri' in object && 'ranges' in object && 'preview' in object;
}
function newToOldFileProviderOptions(options) {
    return options.folderOptions.map(folderOption => ({
        folder: folderOption.folder,
        excludes: folderOption.excludes.map(e => typeof (e) === 'string' ? e : e.pattern),
        includes: folderOption.includes,
        useGlobalIgnoreFiles: folderOption.useIgnoreFiles.global,
        useIgnoreFiles: folderOption.useIgnoreFiles.local,
        useParentIgnoreFiles: folderOption.useIgnoreFiles.parent,
        followSymlinks: folderOption.followSymlinks,
        maxResults: options.maxResults,
        session: options.session // TODO: make sure that we actually use a cancellation token here.
    }));
}
export class OldFileSearchProviderConverter {
    constructor(provider) {
        this.provider = provider;
    }
    provideFileSearchResults(pattern, options, token) {
        const getResult = async () => {
            const newOpts = newToOldFileProviderOptions(options);
            return Promise.all(newOpts.map(o => this.provider.provideFileSearchResults({ pattern }, o, token)));
        };
        return getResult().then(e => coalesce(e).flat());
    }
}
function newToOldTextProviderOptions(options) {
    return options.folderOptions.map(folderOption => ({
        folder: folderOption.folder,
        excludes: folderOption.excludes.map(e => typeof (e) === 'string' ? e : e.pattern),
        includes: folderOption.includes,
        useGlobalIgnoreFiles: folderOption.useIgnoreFiles.global,
        useIgnoreFiles: folderOption.useIgnoreFiles.local,
        useParentIgnoreFiles: folderOption.useIgnoreFiles.parent,
        followSymlinks: folderOption.followSymlinks,
        maxResults: options.maxResults,
        previewOptions: newToOldPreviewOptions(options.previewOptions),
        maxFileSize: options.maxFileSize,
        encoding: folderOption.encoding,
        afterContext: options.surroundingContext,
        beforeContext: options.surroundingContext
    }));
}
export function newToOldPreviewOptions(options) {
    return {
        matchLines: options?.matchLines ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS.matchLines,
        charsPerLine: options?.charsPerLine ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS.charsPerLine
    };
}
export function oldToNewTextSearchResult(result) {
    if (isTextSearchMatch(result)) {
        const ranges = asArray(result.ranges).map((r, i) => {
            const previewArr = asArray(result.preview.matches);
            const matchingPreviewRange = previewArr[i];
            return { sourceRange: r, previewRange: matchingPreviewRange };
        });
        return new TextSearchMatch2(result.uri, ranges, result.preview.text);
    }
    else {
        return new TextSearchContext2(result.uri, result.text, result.lineNumber);
    }
}
export class OldTextSearchProviderConverter {
    constructor(provider) {
        this.provider = provider;
    }
    provideTextSearchResults(query, options, progress, token) {
        const progressShim = (oldResult) => {
            if (!validateProviderResult(oldResult)) {
                return;
            }
            progress.report(oldToNewTextSearchResult(oldResult));
        };
        const getResult = async () => {
            return coalesce(await Promise.all(newToOldTextProviderOptions(options).map(o => this.provider.provideTextSearchResults(query, o, { report: (e) => progressShim(e) }, token))))
                .reduce((prev, cur) => ({ limitHit: prev.limitHit || cur.limitHit }), { limitHit: false });
        };
        const oldResult = getResult();
        return oldResult.then((e) => {
            return {
                limitHit: e.limitHit,
                message: coalesce(asArray(e.message))
            };
        });
    }
}
function validateProviderResult(result) {
    if (extensionResultIsMatch(result)) {
        if (Array.isArray(result.ranges)) {
            if (!Array.isArray(result.preview.matches)) {
                console.warn('INVALID - A text search provider match\'s`ranges` and`matches` properties must have the same type.');
                return false;
            }
            if (result.preview.matches.length !== result.ranges.length) {
                console.warn('INVALID - A text search provider match\'s`ranges` and`matches` properties must have the same length.');
                return false;
            }
        }
        else {
            if (Array.isArray(result.preview.matches)) {
                console.warn('INVALID - A text search provider match\'s`ranges` and`matches` properties must have the same length.');
                return false;
            }
        }
    }
    return true;
}
export function extensionResultIsMatch(data) {
    return !!data.preview;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0Q29udmVyc2lvblR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9zZWFyY2hFeHRDb252ZXJzaW9uVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUl0RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDbEUsT0FBTyxFQUE4RixrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBa0gsTUFBTSxxQkFBcUIsQ0FBQztBQXNTdlI7Ozs7R0FJRztBQUNILFNBQVMsaUJBQWlCLENBQUMsTUFBVztJQUNyQyxPQUFPLEtBQUssSUFBSSxNQUFNLElBQUksUUFBUSxJQUFJLE1BQU0sSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDO0FBQ3JFLENBQUM7QUErSEQsU0FBUywyQkFBMkIsQ0FBQyxPQUFrQztJQUN0RSxPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqRCxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07UUFDM0IsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ2pGLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUTtRQUMvQixvQkFBb0IsRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU07UUFDeEQs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