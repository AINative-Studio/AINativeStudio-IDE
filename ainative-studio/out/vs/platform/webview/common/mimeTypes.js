/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getMediaMime, Mimes } from '../../../base/common/mime.js';
import { extname } from '../../../base/common/path.js';
const webviewMimeTypes = new Map([
    ['.svg', 'image/svg+xml'],
    ['.txt', Mimes.text],
    ['.css', 'text/css'],
    ['.js', 'application/javascript'],
    ['.cjs', 'application/javascript'],
    ['.mjs', 'application/javascript'],
    ['.json', 'application/json'],
    ['.html', 'text/html'],
    ['.htm', 'text/html'],
    ['.xhtml', 'application/xhtml+xml'],
    ['.oft', 'font/otf'],
    ['.xml', 'application/xml'],
    ['.wasm', 'application/wasm'],
]);
export function getWebviewContentMimeType(resource) {
    const ext = extname(resource.fsPath).toLowerCase();
    return webviewMimeTypes.get(ext) || getMediaMime(resource.fsPath) || Mimes.unknown;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWltZVR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJ2aWV3L2NvbW1vbi9taW1lVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHdkQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUNoQyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7SUFDekIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwQixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7SUFDcEIsQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLENBQUM7SUFDakMsQ0FBQyxNQUFNLEVBQUUsd0JBQXdCLENBQUM7SUFDbEMsQ0FBQyxNQUFNLEVBQUUsd0JBQXdCLENBQUM7SUFDbEMsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUM7SUFDN0IsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDO0lBQ3RCLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQztJQUNyQixDQUFDLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQztJQUNuQyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7SUFDcEIsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUM7SUFDM0IsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUM7Q0FDN0IsQ0FBQyxDQUFDO0FBRUgsTUFBTSxVQUFVLHlCQUF5QixDQUFDLFFBQWE7SUFDdEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNuRCxPQUFPLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUM7QUFDcEYsQ0FBQyJ9