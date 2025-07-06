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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL2NvbW1vbi91cGRhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQVc5RTs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUVILE1BQU0sQ0FBTixJQUFrQixTQVVqQjtBQVZELFdBQWtCLFNBQVM7SUFDMUIsNENBQStCLENBQUE7SUFDL0IsMEJBQWEsQ0FBQTtJQUNiLGtDQUFxQixDQUFBO0lBQ3JCLHdEQUEyQyxDQUFBO0lBQzNDLDREQUErQyxDQUFBO0lBQy9DLHdDQUEyQixDQUFBO0lBQzNCLHNDQUF5QixDQUFBO0lBQ3pCLGtDQUFxQixDQUFBO0lBQ3JCLDRCQUFlLENBQUE7QUFDaEIsQ0FBQyxFQVZpQixTQUFTLEtBQVQsU0FBUyxRQVUxQjtBQUVELE1BQU0sQ0FBTixJQUFrQixVQUlqQjtBQUpELFdBQWtCLFVBQVU7SUFDM0IsNkNBQUssQ0FBQTtJQUNMLGlEQUFPLENBQUE7SUFDUCwyQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQUppQixVQUFVLEtBQVYsVUFBVSxRQUkzQjtBQUVELE1BQU0sQ0FBTixJQUFrQixpQkFPakI7QUFQRCxXQUFrQixpQkFBaUI7SUFDbEMsaUVBQVEsQ0FBQTtJQUNSLDJGQUFxQixDQUFBO0lBQ3JCLGlGQUFnQixDQUFBO0lBQ2hCLHlGQUFvQixDQUFBO0lBQ3BCLHlGQUFvQixDQUFBO0lBQ3BCLDZFQUFjLENBQUE7QUFDZixDQUFDLEVBUGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFPbEM7QUFjRCxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUc7SUFDcEIsYUFBYSxFQUFFLE1BQU0sQ0FBZ0IsRUFBRSxJQUFJLCtDQUF5QixFQUFFLENBQUM7SUFDdkUsUUFBUSxFQUFFLENBQUMsTUFBeUIsRUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUkscUNBQW9CLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDekYsSUFBSSxFQUFFLENBQUMsVUFBc0IsRUFBRSxLQUFjLEVBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDZCQUFnQixFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUNyRyxrQkFBa0IsRUFBRSxDQUFDLFFBQWlCLEVBQXNCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSwyREFBOEIsRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUNqSCxvQkFBb0IsRUFBRSxDQUFDLE1BQWUsRUFBd0IsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLCtEQUFnQyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ25ILFdBQVcsRUFBRSxNQUFNLENBQWMsRUFBRSxJQUFJLDJDQUF1QixFQUFFLENBQUM7SUFDakUsVUFBVSxFQUFFLENBQUMsTUFBZSxFQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSx5Q0FBc0IsRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUNyRixRQUFRLEVBQUUsQ0FBQyxNQUFlLEVBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLHFDQUFvQixFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQy9FLEtBQUssRUFBRSxDQUFDLE1BQWUsRUFBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksK0JBQWlCLEVBQUUsTUFBTSxFQUFFLENBQUM7Q0FDdEUsQ0FBQztBQVNGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQWlCLGVBQWUsQ0FBQyxDQUFDIn0=