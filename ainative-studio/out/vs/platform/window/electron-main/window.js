/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import electron from 'electron';
import { DEFAULT_AUX_WINDOW_SIZE, DEFAULT_WINDOW_SIZE } from '../common/window.js';
export var LoadReason;
(function (LoadReason) {
    /**
     * The window is loaded for the first time.
     */
    LoadReason[LoadReason["INITIAL"] = 1] = "INITIAL";
    /**
     * The window is loaded into a different workspace context.
     */
    LoadReason[LoadReason["LOAD"] = 2] = "LOAD";
    /**
     * The window is reloaded.
     */
    LoadReason[LoadReason["RELOAD"] = 3] = "RELOAD";
})(LoadReason || (LoadReason = {}));
export var UnloadReason;
(function (UnloadReason) {
    /**
     * The window is closed.
     */
    UnloadReason[UnloadReason["CLOSE"] = 1] = "CLOSE";
    /**
     * All windows unload because the application quits.
     */
    UnloadReason[UnloadReason["QUIT"] = 2] = "QUIT";
    /**
     * The window is reloaded.
     */
    UnloadReason[UnloadReason["RELOAD"] = 3] = "RELOAD";
    /**
     * The window is loaded into a different workspace context.
     */
    UnloadReason[UnloadReason["LOAD"] = 4] = "LOAD";
})(UnloadReason || (UnloadReason = {}));
export const defaultWindowState = function (mode = 1 /* WindowMode.Normal */) {
    return {
        width: DEFAULT_WINDOW_SIZE.width,
        height: DEFAULT_WINDOW_SIZE.height,
        mode
    };
};
export const defaultAuxWindowState = function () {
    // Auxiliary windows are being created from a `window.open` call
    // that sets `windowFeatures` that encode the desired size and
    // position of the new window (`top`, `left`).
    // In order to truly override this to a good default window state
    // we need to set not only width and height but also x and y to
    // a good location on the primary display.
    const width = DEFAULT_AUX_WINDOW_SIZE.width;
    const height = DEFAULT_AUX_WINDOW_SIZE.height;
    const workArea = electron.screen.getPrimaryDisplay().workArea;
    const x = Math.max(workArea.x + (workArea.width / 2) - (width / 2), 0);
    const y = Math.max(workArea.y + (workArea.height / 2) - (height / 2), 0);
    return {
        x,
        y,
        width,
        height,
        mode: 1 /* WindowMode.Normal */
    };
};
export var WindowMode;
(function (WindowMode) {
    WindowMode[WindowMode["Maximized"] = 0] = "Maximized";
    WindowMode[WindowMode["Normal"] = 1] = "Normal";
    WindowMode[WindowMode["Minimized"] = 2] = "Minimized";
    WindowMode[WindowMode["Fullscreen"] = 3] = "Fullscreen";
})(WindowMode || (WindowMode = {}));
export var WindowError;
(function (WindowError) {
    /**
     * Maps to the `unresponsive` event on a `BrowserWindow`.
     */
    WindowError[WindowError["UNRESPONSIVE"] = 1] = "UNRESPONSIVE";
    /**
     * Maps to the `render-process-gone` event on a `WebContents`.
     */
    WindowError[WindowError["PROCESS_GONE"] = 2] = "PROCESS_GONE";
    /**
     * Maps to the `did-fail-load` event on a `WebContents`.
     */
    WindowError[WindowError["LOAD"] = 3] = "LOAD";
    /**
     * Maps to the `responsive` event on a `BrowserWindow`.
     */
    WindowError[WindowError["RESPONSIVE"] = 4] = "RESPONSIVE";
})(WindowError || (WindowError = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93L2VsZWN0cm9uLW1haW4vd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQU9oQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQThCLE1BQU0scUJBQXFCLENBQUM7QUE0RS9HLE1BQU0sQ0FBTixJQUFrQixVQWdCakI7QUFoQkQsV0FBa0IsVUFBVTtJQUUzQjs7T0FFRztJQUNILGlEQUFXLENBQUE7SUFFWDs7T0FFRztJQUNILDJDQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILCtDQUFNLENBQUE7QUFDUCxDQUFDLEVBaEJpQixVQUFVLEtBQVYsVUFBVSxRQWdCM0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsWUFxQmpCO0FBckJELFdBQWtCLFlBQVk7SUFFN0I7O09BRUc7SUFDSCxpREFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCwrQ0FBSSxDQUFBO0lBRUo7O09BRUc7SUFDSCxtREFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCwrQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQXJCaUIsWUFBWSxLQUFaLFlBQVksUUFxQjdCO0FBWUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxJQUFJLDRCQUFvQjtJQUNuRSxPQUFPO1FBQ04sS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUs7UUFDaEMsTUFBTSxFQUFFLG1CQUFtQixDQUFDLE1BQU07UUFDbEMsSUFBSTtLQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRztJQUVwQyxnRUFBZ0U7SUFDaEUsOERBQThEO0lBQzlELDhDQUE4QztJQUM5QyxpRUFBaUU7SUFDakUsK0RBQStEO0lBQy9ELDBDQUEwQztJQUUxQyxNQUFNLEtBQUssR0FBRyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7SUFDNUMsTUFBTSxNQUFNLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDO0lBQzlDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLENBQUM7SUFDOUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2RSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRXpFLE9BQU87UUFDTixDQUFDO1FBQ0QsQ0FBQztRQUNELEtBQUs7UUFDTCxNQUFNO1FBQ04sSUFBSSwyQkFBbUI7S0FDdkIsQ0FBQztBQUNILENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBTixJQUFrQixVQUtqQjtBQUxELFdBQWtCLFVBQVU7SUFDM0IscURBQVMsQ0FBQTtJQUNULCtDQUFNLENBQUE7SUFDTixxREFBUyxDQUFBO0lBQ1QsdURBQVUsQ0FBQTtBQUNYLENBQUMsRUFMaUIsVUFBVSxLQUFWLFVBQVUsUUFLM0I7QUFPRCxNQUFNLENBQU4sSUFBa0IsV0FxQmpCO0FBckJELFdBQWtCLFdBQVc7SUFFNUI7O09BRUc7SUFDSCw2REFBZ0IsQ0FBQTtJQUVoQjs7T0FFRztJQUNILDZEQUFnQixDQUFBO0lBRWhCOztPQUVHO0lBQ0gsNkNBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gseURBQWMsQ0FBQTtBQUNmLENBQUMsRUFyQmlCLFdBQVcsS0FBWCxXQUFXLFFBcUI1QiJ9