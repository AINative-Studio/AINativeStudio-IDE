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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0Q29udmVyc2lvblR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3NlYXJjaEV4dENvbnZlcnNpb25UeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSXRFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsRSxPQUFPLEVBQThGLGtCQUFrQixFQUFFLGdCQUFnQixFQUFrSCxNQUFNLHFCQUFxQixDQUFDO0FBc1N2Ujs7OztHQUlHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxNQUFXO0lBQ3JDLE9BQU8sS0FBSyxJQUFJLE1BQU0sSUFBSSxRQUFRLElBQUksTUFBTSxJQUFJLFNBQVMsSUFBSSxNQUFNLENBQUM7QUFDckUsQ0FBQztBQStIRCxTQUFTLDJCQUEyQixDQUFDLE9BQWtDO0lBQ3RFLE9BQU8sT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTTtRQUMzQixRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDakYsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO1FBQy9CLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTTtRQUN4RCxjQUFj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