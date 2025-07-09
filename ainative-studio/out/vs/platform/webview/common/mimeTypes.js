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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWltZVR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYnZpZXcvY29tbW9uL21pbWVUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUd2RCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDO0lBQ2hDLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQztJQUN6QixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3BCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQztJQUNwQixDQUFDLEtBQUssRUFBRSx3QkFBd0IsQ0FBQztJQUNqQyxDQUFDLE1BQU0sRUFBRSx3QkFBd0IsQ0FBQztJQUNsQyxDQUFDLE1BQU0sRUFBRSx3QkFBd0IsQ0FBQztJQUNsQyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQztJQUM3QixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUM7SUFDdEIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDO0lBQ3JCLENBQUMsUUFBUSxFQUFFLHVCQUF1QixDQUFDO0lBQ25DLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQztJQUNwQixDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQztJQUMzQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQztDQUM3QixDQUFDLENBQUM7QUFFSCxNQUFNLFVBQVUseUJBQXlCLENBQUMsUUFBYTtJQUN0RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ25ELE9BQU8sZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQztBQUNwRixDQUFDIn0=