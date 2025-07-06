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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLm1lc3NhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvbmxzLm1lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7OztHQUtHO0FBRUgsTUFBTSxVQUFVLGNBQWM7SUFDN0IsT0FBTyxVQUFVLENBQUMsb0JBQW9CLENBQUM7QUFDeEMsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjO0lBQzdCLE9BQU8sVUFBVSxDQUFDLG9CQUFvQixDQUFDO0FBQ3hDLENBQUMifQ==