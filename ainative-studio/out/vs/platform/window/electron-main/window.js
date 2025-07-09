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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvdy9lbGVjdHJvbi1tYWluL3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFPaEMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG1CQUFtQixFQUE4QixNQUFNLHFCQUFxQixDQUFDO0FBNEUvRyxNQUFNLENBQU4sSUFBa0IsVUFnQmpCO0FBaEJELFdBQWtCLFVBQVU7SUFFM0I7O09BRUc7SUFDSCxpREFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCwyQ0FBSSxDQUFBO0lBRUo7O09BRUc7SUFDSCwrQ0FBTSxDQUFBO0FBQ1AsQ0FBQyxFQWhCaUIsVUFBVSxLQUFWLFVBQVUsUUFnQjNCO0FBRUQsTUFBTSxDQUFOLElBQWtCLFlBcUJqQjtBQXJCRCxXQUFrQixZQUFZO0lBRTdCOztPQUVHO0lBQ0gsaURBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsK0NBQUksQ0FBQTtJQUVKOztPQUVHO0lBQ0gsbURBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gsK0NBQUksQ0FBQTtBQUNMLENBQUMsRUFyQmlCLFlBQVksS0FBWixZQUFZLFFBcUI3QjtBQVlELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLFVBQVUsSUFBSSw0QkFBb0I7SUFDbkUsT0FBTztRQUNOLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxLQUFLO1FBQ2hDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxNQUFNO1FBQ2xDLElBQUk7S0FDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUc7SUFFcEMsZ0VBQWdFO0lBQ2hFLDhEQUE4RDtJQUM5RCw4Q0FBOEM7SUFDOUMsaUVBQWlFO0lBQ2pFLCtEQUErRDtJQUMvRCwwQ0FBMEM7SUFFMUMsTUFBTSxLQUFLLEdBQUcsdUJBQXVCLENBQUMsS0FBSyxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQztJQUM5QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsUUFBUSxDQUFDO0lBQzlELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV6RSxPQUFPO1FBQ04sQ0FBQztRQUNELENBQUM7UUFDRCxLQUFLO1FBQ0wsTUFBTTtRQUNOLElBQUksMkJBQW1CO0tBQ3ZCLENBQUM7QUFDSCxDQUFDLENBQUM7QUFFRixNQUFNLENBQU4sSUFBa0IsVUFLakI7QUFMRCxXQUFrQixVQUFVO0lBQzNCLHFEQUFTLENBQUE7SUFDVCwrQ0FBTSxDQUFBO0lBQ04scURBQVMsQ0FBQTtJQUNULHVEQUFVLENBQUE7QUFDWCxDQUFDLEVBTGlCLFVBQVUsS0FBVixVQUFVLFFBSzNCO0FBT0QsTUFBTSxDQUFOLElBQWtCLFdBcUJqQjtBQXJCRCxXQUFrQixXQUFXO0lBRTVCOztPQUVHO0lBQ0gsNkRBQWdCLENBQUE7SUFFaEI7O09BRUc7SUFDSCw2REFBZ0IsQ0FBQTtJQUVoQjs7T0FFRztJQUNILDZDQUFRLENBQUE7SUFFUjs7T0FFRztJQUNILHlEQUFjLENBQUE7QUFDZixDQUFDLEVBckJpQixXQUFXLEtBQVgsV0FBVyxRQXFCNUIifQ==