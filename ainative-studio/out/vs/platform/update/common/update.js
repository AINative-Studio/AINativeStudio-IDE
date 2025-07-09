/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { upcast } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
/**
 * Updates are run as a state machine:
 *
 *      Uninitialized
 *           ↓
 *          Idle
 *          ↓  ↑
 *   Checking for Updates  →  Available for Download
 *         ↓
 *     Downloading  →   Ready
 *         ↓               ↑
 *     Downloaded   →  Updating
 *
 * Available: There is an update available for download (linux).
 * Ready: Code will be updated as soon as it restarts (win32, darwin).
 * Downloaded: There is an update ready to be installed in the background (win32).
 */
export var StateType;
(function (StateType) {
    StateType["Uninitialized"] = "uninitialized";
    StateType["Idle"] = "idle";
    StateType["Disabled"] = "disabled";
    StateType["CheckingForUpdates"] = "checking for updates";
    StateType["AvailableForDownload"] = "available for download";
    StateType["Downloading"] = "downloading";
    StateType["Downloaded"] = "downloaded";
    StateType["Updating"] = "updating";
    StateType["Ready"] = "ready";
})(StateType || (StateType = {}));
export var UpdateType;
(function (UpdateType) {
    UpdateType[UpdateType["Setup"] = 0] = "Setup";
    UpdateType[UpdateType["Archive"] = 1] = "Archive";
    UpdateType[UpdateType["Snap"] = 2] = "Snap";
})(UpdateType || (UpdateType = {}));
export var DisablementReason;
(function (DisablementReason) {
    DisablementReason[DisablementReason["NotBuilt"] = 0] = "NotBuilt";
    DisablementReason[DisablementReason["DisabledByEnvironment"] = 1] = "DisabledByEnvironment";
    DisablementReason[DisablementReason["ManuallyDisabled"] = 2] = "ManuallyDisabled";
    DisablementReason[DisablementReason["MissingConfiguration"] = 3] = "MissingConfiguration";
    DisablementReason[DisablementReason["InvalidConfiguration"] = 4] = "InvalidConfiguration";
    DisablementReason[DisablementReason["RunningAsAdmin"] = 5] = "RunningAsAdmin";
})(DisablementReason || (DisablementReason = {}));
export const State = {
    Uninitialized: upcast({ type: "uninitialized" /* StateType.Uninitialized */ }),
    Disabled: (reason) => ({ type: "disabled" /* StateType.Disabled */, reason }),
    Idle: (updateType, error) => ({ type: "idle" /* StateType.Idle */, updateType, error }),
    CheckingForUpdates: (explicit) => ({ type: "checking for updates" /* StateType.CheckingForUpdates */, explicit }),
    AvailableForDownload: (update) => ({ type: "available for download" /* StateType.AvailableForDownload */, update }),
    Downloading: upcast({ type: "downloading" /* StateType.Downloading */ }),
    Downloaded: (update) => ({ type: "downloaded" /* StateType.Downloaded */, update }),
    Updating: (update) => ({ type: "updating" /* StateType.Updating */, update }),
    Ready: (update) => ({ type: "ready" /* StateType.Ready */, update }),
};
export const IUpdateService = createDecorator('updateService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS9jb21tb24vdXBkYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFXOUU7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFFSCxNQUFNLENBQU4sSUFBa0IsU0FVakI7QUFWRCxXQUFrQixTQUFTO0lBQzFCLDRDQUErQixDQUFBO0lBQy9CLDBCQUFhLENBQUE7SUFDYixrQ0FBcUIsQ0FBQTtJQUNyQix3REFBMkMsQ0FBQTtJQUMzQyw0REFBK0MsQ0FBQTtJQUMvQyx3Q0FBMkIsQ0FBQTtJQUMzQixzQ0FBeUIsQ0FBQTtJQUN6QixrQ0FBcUIsQ0FBQTtJQUNyQiw0QkFBZSxDQUFBO0FBQ2hCLENBQUMsRUFWaUIsU0FBUyxLQUFULFNBQVMsUUFVMUI7QUFFRCxNQUFNLENBQU4sSUFBa0IsVUFJakI7QUFKRCxXQUFrQixVQUFVO0lBQzNCLDZDQUFLLENBQUE7SUFDTCxpREFBTyxDQUFBO0lBQ1AsMkNBQUksQ0FBQTtBQUNMLENBQUMsRUFKaUIsVUFBVSxLQUFWLFVBQVUsUUFJM0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsaUJBT2pCO0FBUEQsV0FBa0IsaUJBQWlCO0lBQ2xDLGlFQUFRLENBQUE7SUFDUiwyRkFBcUIsQ0FBQTtJQUNyQixpRkFBZ0IsQ0FBQTtJQUNoQix5RkFBb0IsQ0FBQTtJQUNwQix5RkFBb0IsQ0FBQTtJQUNwQiw2RUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQVBpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBT2xDO0FBY0QsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHO0lBQ3BCLGFBQWEsRUFBRSxNQUFNLENBQWdCLEVBQUUsSUFBSSwrQ0FBeUIsRUFBRSxDQUFDO0lBQ3ZFLFFBQVEsRUFBRSxDQUFDLE1BQXlCLEVBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLHFDQUFvQixFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ3pGLElBQUksRUFBRSxDQUFDLFVBQXNCLEVBQUUsS0FBYyxFQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSw2QkFBZ0IsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDckcsa0JBQWtCLEVBQUUsQ0FBQyxRQUFpQixFQUFzQixFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksMkRBQThCLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFDakgsb0JBQW9CLEVBQUUsQ0FBQyxNQUFlLEVBQXdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSwrREFBZ0MsRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUNuSCxXQUFXLEVBQUUsTUFBTSxDQUFjLEVBQUUsSUFBSSwyQ0FBdUIsRUFBRSxDQUFDO0lBQ2pFLFVBQVUsRUFBRSxDQUFDLE1BQWUsRUFBYyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUkseUNBQXNCLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDckYsUUFBUSxFQUFFLENBQUMsTUFBZSxFQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxxQ0FBb0IsRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUMvRSxLQUFLLEVBQUUsQ0FBQyxNQUFlLEVBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLCtCQUFpQixFQUFFLE1BQU0sRUFBRSxDQUFDO0NBQ3RFLENBQUM7QUFTRixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixlQUFlLENBQUMsQ0FBQyJ9