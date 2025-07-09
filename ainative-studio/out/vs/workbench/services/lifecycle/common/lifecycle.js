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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9saWZlY3ljbGUvY29tbW9uL2xpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFDO0FBMER4RixNQUFNLENBQU4sSUFBWSx1QkFjWDtBQWRELFdBQVksdUJBQXVCO0lBRWxDOzs7T0FHRztJQUNILDJFQUFXLENBQUE7SUFFWDs7OztPQUlHO0lBQ0gscUVBQUksQ0FBQTtBQUNMLENBQUMsRUFkVyx1QkFBdUIsS0FBdkIsdUJBQXVCLFFBY2xDO0FBcUVELE1BQU0sQ0FBTixJQUFrQixjQXFCakI7QUFyQkQsV0FBa0IsY0FBYztJQUUvQjs7T0FFRztJQUNILHFEQUFTLENBQUE7SUFFVDs7T0FFRztJQUNILG1EQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILHVEQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILG1EQUFJLENBQUE7QUFDTCxDQUFDLEVBckJpQixjQUFjLEtBQWQsY0FBYyxRQXFCL0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsV0FJakI7QUFKRCxXQUFrQixXQUFXO0lBQzVCLHVEQUFhLENBQUE7SUFDYixpRUFBa0IsQ0FBQTtJQUNsQixpRUFBa0IsQ0FBQTtBQUNuQixDQUFDLEVBSmlCLFdBQVcsS0FBWCxXQUFXLFFBSTVCO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFdBQXdCO0lBQzNELFFBQVEsV0FBVyxFQUFFLENBQUM7UUFDckIsa0NBQTBCLENBQUMsQ0FBQyxPQUFPLFdBQVcsQ0FBQztRQUMvQyx1Q0FBK0IsQ0FBQyxDQUFDLE9BQU8sZ0JBQWdCLENBQUM7UUFDekQsdUNBQStCLENBQUMsQ0FBQyxPQUFPLGdCQUFnQixDQUFDO0lBQzFELENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGNBNkJqQjtBQTdCRCxXQUFrQixjQUFjO0lBRS9COzs7OztPQUtHO0lBQ0gsMkRBQVksQ0FBQTtJQUVaOzs7OztPQUtHO0lBQ0gscURBQVMsQ0FBQTtJQUVUOzs7T0FHRztJQUNILDJEQUFZLENBQUE7SUFFWjs7O09BR0c7SUFDSCwrREFBYyxDQUFBO0FBQ2YsQ0FBQyxFQTdCaUIsY0FBYyxLQUFkLGNBQWMsUUE2Qi9CO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLEtBQXFCO0lBQzNELFFBQVEsS0FBSyxFQUFFLENBQUM7UUFDZixvQ0FBNEIsQ0FBQyxDQUFDLE9BQU8sVUFBVSxDQUFDO1FBQ2hELGlDQUF5QixDQUFDLENBQUMsT0FBTyxPQUFPLENBQUM7UUFDMUMsb0NBQTRCLENBQUMsQ0FBQyxPQUFPLFVBQVUsQ0FBQztRQUNoRCxzQ0FBOEIsQ0FBQyxDQUFDLE9BQU8sWUFBWSxDQUFDO0lBQ3JELENBQUM7QUFDRixDQUFDIn0=