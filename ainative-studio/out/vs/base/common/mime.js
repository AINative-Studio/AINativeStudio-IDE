/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extname } from './path.js';
export const Mimes = Object.freeze({
    text: 'text/plain',
    binary: 'application/octet-stream',
    unknown: 'application/unknown',
    markdown: 'text/markdown',
    latex: 'text/latex',
    uriList: 'text/uri-list',
    html: 'text/html',
});
const mapExtToTextMimes = {
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.ics': 'text/calendar',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.txt': 'text/plain',
    '.xml': 'text/xml'
};
// Known media mimes that we can handle
const mapExtToMediaMimes = {
    '.aac': 'audio/x-aac',
    '.avi': 'video/x-msvideo',
    '.bmp': 'image/bmp',
    '.flv': 'video/x-flv',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jpe': 'image/jpg',
    '.jpeg': 'image/jpg',
    '.jpg': 'image/jpg',
    '.m1v': 'video/mpeg',
    '.m2a': 'audio/mpeg',
    '.m2v': 'video/mpeg',
    '.m3a': 'audio/mpeg',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.mk3d': 'video/x-matroska',
    '.mks': 'video/x-matroska',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.movie': 'video/x-sgi-movie',
    '.mp2': 'audio/mpeg',
    '.mp2a': 'audio/mpeg',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mp4a': 'audio/mp4',
    '.mp4v': 'video/mp4',
    '.mpe': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.mpg4': 'video/mp4',
    '.mpga': 'audio/mpeg',
    '.oga': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.ogv': 'video/ogg',
    '.png': 'image/png',
    '.psd': 'image/vnd.adobe.photoshop',
    '.qt': 'video/quicktime',
    '.spx': 'audio/ogg',
    '.svg': 'image/svg+xml',
    '.tga': 'image/x-tga',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.wav': 'audio/x-wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.wma': 'audio/x-ms-wma',
    '.wmv': 'video/x-ms-wmv',
    '.woff': 'application/font-woff',
};
export function getMediaOrTextMime(path) {
    const ext = extname(path);
    const textMime = mapExtToTextMimes[ext.toLowerCase()];
    if (textMime !== undefined) {
        return textMime;
    }
    else {
        return getMediaMime(path);
    }
}
export function getMediaMime(path) {
    const ext = extname(path);
    return mapExtToMediaMimes[ext.toLowerCase()];
}
export function getExtensionForMimeType(mimeType) {
    for (const extension in mapExtToMediaMimes) {
        if (mapExtToMediaMimes[extension] === mimeType) {
            return extension;
        }
    }
    return undefined;
}
const _simplePattern = /^(.+)\/(.+?)(;.+)?$/;
export function normalizeMimeType(mimeType, strict) {
    const match = _simplePattern.exec(mimeType);
    if (!match) {
        return strict
            ? undefined
            : mimeType;
    }
    // https://datatracker.ietf.org/doc/html/rfc2045#section-5.1
    // media and subtype must ALWAYS be lowercase, parameter not
    return `${match[1].toLowerCase()}/${match[2].toLowerCase()}${match[3] ?? ''}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWltZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9taW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFcEMsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDbEMsSUFBSSxFQUFFLFlBQVk7SUFDbEIsTUFBTSxFQUFFLDBCQUEwQjtJQUNsQyxPQUFPLEVBQUUscUJBQXFCO0lBQzlCLFFBQVEsRUFBRSxlQUFlO0lBQ3pCLEtBQUssRUFBRSxZQUFZO0lBQ25CLE9BQU8sRUFBRSxlQUFlO0lBQ3hCLElBQUksRUFBRSxXQUFXO0NBQ2pCLENBQUMsQ0FBQztBQU1ILE1BQU0saUJBQWlCLEdBQXVCO0lBQzdDLE1BQU0sRUFBRSxVQUFVO0lBQ2xCLE1BQU0sRUFBRSxVQUFVO0lBQ2xCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLE1BQU0sRUFBRSxlQUFlO0lBQ3ZCLEtBQUssRUFBRSxpQkFBaUI7SUFDeEIsTUFBTSxFQUFFLGlCQUFpQjtJQUN6QixNQUFNLEVBQUUsWUFBWTtJQUNwQixNQUFNLEVBQUUsVUFBVTtDQUNsQixDQUFDO0FBRUYsdUNBQXVDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQXVCO0lBQzlDLE1BQU0sRUFBRSxhQUFhO0lBQ3JCLE1BQU0sRUFBRSxpQkFBaUI7SUFDekIsTUFBTSxFQUFFLFdBQVc7SUFDbkIsTUFBTSxFQUFFLGFBQWE7SUFDckIsTUFBTSxFQUFFLFdBQVc7SUFDbkIsTUFBTSxFQUFFLGNBQWM7SUFDdEIsTUFBTSxFQUFFLFdBQVc7SUFDbkIsT0FBTyxFQUFFLFdBQVc7SUFDcEIsTUFBTSxFQUFFLFdBQVc7SUFD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