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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvY29tbW9uL3VwZGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBVzlFOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBRUgsTUFBTSxDQUFOLElBQWtCLFNBVWpCO0FBVkQsV0FBa0IsU0FBUztJQUMxQiw0Q0FBK0IsQ0FBQTtJQUMvQiwwQkFBYSxDQUFBO0lBQ2Isa0NBQXFCLENBQUE7SUFDckIsd0RBQTJDLENBQUE7SUFDM0MsNERBQStDLENBQUE7SUFDL0Msd0NBQTJCLENBQUE7SUFDM0Isc0NBQXlCLENBQUE7SUFDekIsa0NBQXFCLENBQUE7SUFDckIsNEJBQWUsQ0FBQTtBQUNoQixDQUFDLEVBVmlCLFNBQVMsS0FBVCxTQUFTLFFBVTFCO0FBRUQsTUFBTSxDQUFOLElBQWtCLFVBSWpCO0FBSkQsV0FBa0IsVUFBVTtJQUMzQiw2Q0FBSyxDQUFBO0lBQ0wsaURBQU8sQ0FBQTtJQUNQLDJDQUFJLENBQUE7QUFDTCxDQUFDLEVBSmlCLFVBQVUsS0FBVixVQUFVLFFBSTNCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGlCQU9qQjtBQVBELFdBQWtCLGlCQUFpQjtJQUNsQyxpRUFBUSxDQUFBO0lBQ1IsMkZBQXFCLENBQUE7SUFDckIsaUZBQWdCLENBQUE7SUFDaEIseUZBQW9CLENBQUE7SUFDcEIseUZBQW9CLENBQUE7SUFDcEIsNkVBQWMsQ0FBQTtBQUNmLENBQUMsRUFQaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQU9sQztBQWNELE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRztJQUNwQixhQUFhLEVBQUUsTUFBTSxDQUFnQixFQUFFLElBQUksK0NBQXlCLEVBQUUsQ0FBQztJQUN2RSxRQUFRLEVBQUUsQ0FBQyxNQUF5QixFQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxxQ0FBb0IsRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUN6RixJQUFJLEVBQUUsQ0FBQyxVQUFzQixFQUFFLEtBQWMsRUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksNkJBQWdCLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3JHLGtCQUFrQixFQUFFLENBQUMsUUFBaUIsRUFBc0IsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDJEQUE4QixFQUFFLFFBQVEsRUFBRSxDQUFDO0lBQ2pILG9CQUFvQixFQUFFLENBQUMsTUFBZSxFQUF3QixFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksK0RBQWdDLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDbkgsV0FBVyxFQUFFLE1BQU0sQ0FBYyxFQUFFLElBQUksMkNBQXVCLEVBQUUsQ0FBQztJQUNqRSxVQUFVLEVBQUUsQ0FBQyxNQUFlLEVBQWMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLHlDQUFzQixFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ3JGLFFBQVEsRUFBRSxDQUFDLE1BQWUsRUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUkscUNBQW9CLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDL0UsS0FBSyxFQUFFLENBQUMsTUFBZSxFQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSwrQkFBaUIsRUFBRSxNQUFNLEVBQUUsQ0FBQztDQUN0RSxDQUFDO0FBU0YsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZUFBZSxDQUFDLENBQUMifQ==