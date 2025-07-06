/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ILifecycleService = createDecorator('lifecycleService');
export var WillShutdownJoinerOrder;
(function (WillShutdownJoinerOrder) {
    /**
     * Joiners to run before the `Last` joiners. This is the default order and best for
     * most cases. You can be sure that services are still functional at this point.
     */
    WillShutdownJoinerOrder[WillShutdownJoinerOrder["Default"] = 1] = "Default";
    /**
     * The joiners to run last. This should ONLY be used in rare cases when you have no
     * dependencies to workbench services or state. The workbench may be in a state where
     * resources can no longer be accessed or changed.
     */
    WillShutdownJoinerOrder[WillShutdownJoinerOrder["Last"] = 2] = "Last";
})(WillShutdownJoinerOrder || (WillShutdownJoinerOrder = {}));
export var ShutdownReason;
(function (ShutdownReason) {
    /**
     * The window is closed.
     */
    ShutdownReason[ShutdownReason["CLOSE"] = 1] = "CLOSE";
    /**
     * The window closes because the application quits.
     */
    ShutdownReason[ShutdownReason["QUIT"] = 2] = "QUIT";
    /**
     * The window is reloaded.
     */
    ShutdownReason[ShutdownReason["RELOAD"] = 3] = "RELOAD";
    /**
     * The window is loaded into a different workspace context.
     */
    ShutdownReason[ShutdownReason["LOAD"] = 4] = "LOAD";
})(ShutdownReason || (ShutdownReason = {}));
export var StartupKind;
(function (StartupKind) {
    StartupKind[StartupKind["NewWindow"] = 1] = "NewWindow";
    StartupKind[StartupKind["ReloadedWindow"] = 3] = "ReloadedWindow";
    StartupKind[StartupKind["ReopenedWindow"] = 4] = "ReopenedWindow";
})(StartupKind || (StartupKind = {}));
export function StartupKindToString(startupKind) {
    switch (startupKind) {
        case 1 /* StartupKind.NewWindow */: return 'NewWindow';
        case 3 /* StartupKind.ReloadedWindow */: return 'ReloadedWindow';
        case 4 /* StartupKind.ReopenedWindow */: return 'ReopenedWindow';
    }
}
export var LifecyclePhase;
(function (LifecyclePhase) {
    /**
     * The first phase signals that we are about to startup getting ready.
     *
     * Note: doing work in this phase blocks an editor from showing to
     * the user, so please rather consider to use `Restored` phase.
     */
    LifecyclePhase[LifecyclePhase["Starting"] = 1] = "Starting";
    /**
     * Services are ready and the window is about to restore its UI state.
     *
     * Note: doing work in this phase blocks an editor from showing to
     * the user, so please rather consider to use `Restored` phase.
     */
    LifecyclePhase[LifecyclePhase["Ready"] = 2] = "Ready";
    /**
     * Views, panels and editors have restored. Editors are given a bit of
     * time to restore their contents.
     */
    LifecyclePhase[LifecyclePhase["Restored"] = 3] = "Restored";
    /**
     * The last phase after views, panels and editors have restored and
     * some time has passed (2-5 seconds).
     */
    LifecyclePhase[LifecyclePhase["Eventually"] = 4] = "Eventually";
})(LifecyclePhase || (LifecyclePhase = {}));
export function LifecyclePhaseToString(phase) {
    switch (phase) {
        case 1 /* LifecyclePhase.Starting */: return 'Starting';
        case 2 /* LifecyclePhase.Ready */: return 'Ready';
        case 3 /* LifecyclePhase.Restored */: return 'Restored';
        case 4 /* LifecyclePhase.Eventually */: return 'Eventually';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGlmZWN5Y2xlL2NvbW1vbi9saWZlY3ljbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBb0Isa0JBQWtCLENBQUMsQ0FBQztBQTBEeEYsTUFBTSxDQUFOLElBQVksdUJBY1g7QUFkRCxXQUFZLHVCQUF1QjtJQUVsQzs7O09BR0c7SUFDSCwyRUFBVyxDQUFBO0lBRVg7Ozs7T0FJRztJQUNILHFFQUFJLENBQUE7QUFDTCxDQUFDLEVBZFcsdUJBQXVCLEtBQXZCLHVCQUF1QixRQWNsQztBQXFFRCxNQUFNLENBQU4sSUFBa0IsY0FxQmpCO0FBckJELFdBQWtCLGNBQWM7SUFFL0I7O09BRUc7SUFDSCxxREFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCxtREFBSSxDQUFBO0lBRUo7O09BRUc7SUFDSCx1REFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCxtREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQXJCaUIsY0FBYyxLQUFkLGNBQWMsUUFxQi9CO0FBRUQsTUFBTSxDQUFOLElBQWtCLFdBSWpCO0FBSkQsV0FBa0IsV0FBVztJQUM1Qix1REFBYSxDQUFBO0lBQ2IsaUVBQWtCLENBQUE7SUFDbEIsaUVBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQUppQixXQUFXLEtBQVgsV0FBVyxRQUk1QjtBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxXQUF3QjtJQUMzRCxRQUFRLFdBQVcsRUFBRSxDQUFDO1FBQ3JCLGtDQUEwQixDQUFDLENBQUMsT0FBTyxXQUFXLENBQUM7UUFDL0MsdUNBQStCLENBQUMsQ0FBQyxPQUFPLGdCQUFnQixDQUFDO1FBQ3pELHVDQUErQixDQUFDLENBQUMsT0FBTyxnQkFBZ0IsQ0FBQztJQUMxRCxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixjQTZCakI7QUE3QkQsV0FBa0IsY0FBYztJQUUvQjs7Ozs7T0FLRztJQUNILDJEQUFZLENBQUE7SUFFWjs7Ozs7T0FLRztJQUNILHFEQUFTLENBQUE7SUFFVDs7O09BR0c7SUFDSCwyREFBWSxDQUFBO0lBRVo7OztPQUdHO0lBQ0gsK0RBQWMsQ0FBQTtBQUNmLENBQUMsRUE3QmlCLGNBQWMsS0FBZCxjQUFjLFFBNkIvQjtBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxLQUFxQjtJQUMzRCxRQUFRLEtBQUssRUFBRSxDQUFDO1FBQ2Ysb0NBQTRCLENBQUMsQ0FBQyxPQUFPLFVBQVUsQ0FBQztRQUNoRCxpQ0FBeUIsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDO1FBQzFDLG9DQUE0QixDQUFDLENBQUMsT0FBTyxVQUFVLENBQUM7UUFDaEQsc0NBQThCLENBQUMsQ0FBQyxPQUFPLFlBQVksQ0FBQztJQUNyRCxDQUFDO0FBQ0YsQ0FBQyJ9