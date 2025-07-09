/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*
 * This module exists so that the AMD build of the monaco editor can replace this with an async loader plugin.
 * If you add new functions to this module make sure that they are also provided in the AMD build of the monaco editor.
 *
 * TODO@esm remove me once we no longer ship an AMD build.
 */
export function getNLSMessages() {
    return globalThis._VSCODE_NLS_MESSAGES;
}
export function getNLSLanguage() {
    return globalThis._VSCODE_NLS_LANGUAGE;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLm1lc3NhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL25scy5tZXNzYWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7Ozs7R0FLRztBQUVILE1BQU0sVUFBVSxjQUFjO0lBQzdCLE9BQU8sVUFBVSxDQUFDLG9CQUFvQixDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYztJQUM3QixPQUFPLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQztBQUN4QyxDQUFDIn0=