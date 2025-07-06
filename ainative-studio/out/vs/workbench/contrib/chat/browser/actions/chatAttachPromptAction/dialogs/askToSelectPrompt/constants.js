/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { Codicon } from '../../../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../../../base/common/themables.js';
import { DOCUMENTATION_URL } from '../../../../../common/promptSyntax/constants.js';
import { isLinux, isWindows } from '../../../../../../../../base/common/platform.js';
/**
 * Name of the `"super"` key based on the current OS.
 */
export const SUPER_KEY_NAME = (isWindows || isLinux) ? 'Ctrl' : '⌘';
/**
 * Name of the `alt`/`options` key based on the current OS.
 */
export const ALT_KEY_NAME = (isWindows || isLinux) ? 'Alt' : '⌥';
/**
 * A special quick pick item that links to the documentation.
 */
export const DOCS_OPTION = Object.freeze({
    type: 'item',
    label: localize('commands.prompts.use.select-dialog.docs-label', 'Learn how to create reusable prompts'),
    description: DOCUMENTATION_URL,
    tooltip: DOCUMENTATION_URL,
    value: URI.parse(DOCUMENTATION_URL),
});
/**
 * Button that opens a prompt file in the editor.
 */
export const EDIT_BUTTON = Object.freeze({
    tooltip: localize('commands.prompts.use.select-dialog.open-button.tooltip', "edit ({0}-key + enter)", SUPER_KEY_NAME),
    iconClass: ThemeIcon.asClassName(Codicon.edit),
});
/**
 * Button that deletes a prompt file.
 */
export const DELETE_BUTTON = Object.freeze({
    tooltip: localize('delete', "delete"),
    iconClass: ThemeIcon.asClassName(Codicon.trash),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBR3JGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUVwRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFFakU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQWlDLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDdEUsSUFBSSxFQUFFLE1BQU07SUFDWixLQUFLLEVBQUUsUUFBUSxDQUNkLCtDQUErQyxFQUMvQyxzQ0FBc0MsQ0FDdEM7SUFDRCxXQUFXLEVBQUUsaUJBQWlCO0lBQzlCLE9BQU8sRUFBRSxpQkFBaUI7SUFDMUIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUM7Q0FDbkMsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDM0QsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsd0RBQXdELEVBQ3hELHdCQUF3QixFQUN4QixjQUFjLENBQ2Q7SUFDRCxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0NBQzlDLENBQUMsQ0FBQztBQUVIOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFzQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzdELE9BQU8sRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNyQyxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0NBQy9DLENBQUMsQ0FBQyJ9