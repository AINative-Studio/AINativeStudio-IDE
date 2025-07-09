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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFHckY7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBRXBFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUVqRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBaUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUN0RSxJQUFJLEVBQUUsTUFBTTtJQUNaLEtBQUssRUFBRSxRQUFRLENBQ2QsK0NBQStDLEVBQy9DLHNDQUFzQyxDQUN0QztJQUNELFdBQVcsRUFBRSxpQkFBaUI7SUFDOUIsT0FBTyxFQUFFLGlCQUFpQjtJQUMxQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztDQUNuQyxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUMzRCxPQUFPLEVBQUUsUUFBUSxDQUNoQix3REFBd0QsRUFDeEQsd0JBQXdCLEVBQ3hCLGNBQWMsQ0FDZDtJQUNELFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Q0FDOUMsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDN0QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO0lBQ3JDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7Q0FDL0MsQ0FBQyxDQUFDIn0=