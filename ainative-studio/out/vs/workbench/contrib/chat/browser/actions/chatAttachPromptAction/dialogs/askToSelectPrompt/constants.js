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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUUxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUdyRjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFFcEU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBRWpFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFpQyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3RFLElBQUksRUFBRSxNQUFNO0lBQ1osS0FBSyxFQUFFLFFBQVEsQ0FDZCwrQ0FBK0MsRUFDL0Msc0NBQXNDLENBQ3RDO0lBQ0QsV0FBVyxFQUFFLGlCQUFpQjtJQUM5QixPQUFPLEVBQUUsaUJBQWlCO0lBQzFCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDO0NBQ25DLENBQUMsQ0FBQztBQUVIOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFzQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzNELE9BQU8sRUFBRSxRQUFRLENBQ2hCLHdEQUF3RCxFQUN4RCx3QkFBd0IsRUFDeEIsY0FBYyxDQUNkO0lBQ0QsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztDQUM5QyxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM3RCxPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDckMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztDQUMvQyxDQUFDLENBQUMifQ==