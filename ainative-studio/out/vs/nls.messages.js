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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLm1lc3NhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9ubHMubWVzc2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7O0dBS0c7QUFFSCxNQUFNLFVBQVUsY0FBYztJQUM3QixPQUFPLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQztBQUN4QyxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWM7SUFDN0IsT0FBTyxVQUFVLENBQUMsb0JBQW9CLENBQUM7QUFDeEMsQ0FBQyJ9