/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
export var TerminalZoomCommandId;
(function (TerminalZoomCommandId) {
    TerminalZoomCommandId["FontZoomIn"] = "workbench.action.terminal.fontZoomIn";
    TerminalZoomCommandId["FontZoomOut"] = "workbench.action.terminal.fontZoomOut";
    TerminalZoomCommandId["FontZoomReset"] = "workbench.action.terminal.fontZoomReset";
})(TerminalZoomCommandId || (TerminalZoomCommandId = {}));
export var TerminalZoomSettingId;
(function (TerminalZoomSettingId) {
    TerminalZoomSettingId["MouseWheelZoom"] = "terminal.integrated.mouseWheelZoom";
})(TerminalZoomSettingId || (TerminalZoomSettingId = {}));
export const terminalZoomConfiguration = {
    ["terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */]: {
        markdownDescription: isMacintosh
            ? localize('terminal.integrated.mouseWheelZoom.mac', "Zoom the font of the terminal when using mouse wheel and holding `Cmd`.")
            : localize('terminal.integrated.mouseWheelZoom', "Zoom the font of the terminal when using mouse wheel and holding `Ctrl`."),
        type: 'boolean',
        default: false
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvem9vbS9jb21tb24vdGVybWluYWwuem9vbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE1BQU0sQ0FBTixJQUFrQixxQkFJakI7QUFKRCxXQUFrQixxQkFBcUI7SUFDdEMsNEVBQW1ELENBQUE7SUFDbkQsOEVBQXFELENBQUE7SUFDckQsa0ZBQXlELENBQUE7QUFDMUQsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBRUQsTUFBTSxDQUFOLElBQWtCLHFCQUVqQjtBQUZELFdBQWtCLHFCQUFxQjtJQUN0Qyw4RUFBcUQsQ0FBQTtBQUN0RCxDQUFDLEVBRmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFFdEM7QUFFRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBb0Q7SUFDekYsaUZBQXNDLEVBQUU7UUFDdkMsbUJBQW1CLEVBQUUsV0FBVztZQUMvQixDQUFDLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLHlFQUF5RSxDQUFDO1lBQy9ILENBQUMsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsMEVBQTBFLENBQUM7UUFDN0gsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsS0FBSztLQUNkO0NBQ0QsQ0FBQyJ9