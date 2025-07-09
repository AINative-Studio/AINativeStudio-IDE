/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getZoomLevel, setZoomFactor, setZoomLevel } from '../../../base/browser/browser.js';
import { getActiveWindow, getWindows } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { ipcRenderer, webFrame } from '../../../base/parts/sandbox/electron-sandbox/globals.js';
import { zoomLevelToZoomFactor } from '../common/window.js';
export var ApplyZoomTarget;
(function (ApplyZoomTarget) {
    ApplyZoomTarget[ApplyZoomTarget["ACTIVE_WINDOW"] = 1] = "ACTIVE_WINDOW";
    ApplyZoomTarget[ApplyZoomTarget["ALL_WINDOWS"] = 2] = "ALL_WINDOWS";
})(ApplyZoomTarget || (ApplyZoomTarget = {}));
export const MAX_ZOOM_LEVEL = 8;
export const MIN_ZOOM_LEVEL = -8;
/**
 * Apply a zoom level to the window. Also sets it in our in-memory
 * browser helper so that it can be accessed in non-electron layers.
 */
export function applyZoom(zoomLevel, target) {
    zoomLevel = Math.min(Math.max(zoomLevel, MIN_ZOOM_LEVEL), MAX_ZOOM_LEVEL); // cap zoom levels between -8 and 8
    const targetWindows = [];
    if (target === ApplyZoomTarget.ACTIVE_WINDOW) {
        targetWindows.push(getActiveWindow());
    }
    else if (target === ApplyZoomTarget.ALL_WINDOWS) {
        targetWindows.push(...Array.from(getWindows()).map(({ window }) => window));
    }
    else {
        targetWindows.push(target);
    }
    for (const targetWindow of targetWindows) {
        getGlobals(targetWindow)?.webFrame?.setZoomLevel(zoomLevel);
        setZoomFactor(zoomLevelToZoomFactor(zoomLevel), targetWindow);
        setZoomLevel(zoomLevel, targetWindow);
    }
}
function getGlobals(win) {
    if (win === mainWindow) {
        // main window
        return { ipcRenderer, webFrame };
    }
    else {
        // auxiliary window
        const auxiliaryWindow = win;
        if (auxiliaryWindow?.vscode?.ipcRenderer && auxiliaryWindow?.vscode?.webFrame) {
            return auxiliaryWindow.vscode;
        }
    }
    return undefined;
}
export function zoomIn(target) {
    applyZoom(getZoomLevel(typeof target === 'number' ? getActiveWindow() : target) + 1, target);
}
export function zoomOut(target) {
    applyZoom(getZoomLevel(typeof target === 'number' ? getActiveWindow() : target) - 1, target);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvdy9lbGVjdHJvbi1zYW5kYm94L3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RCxPQUFPLEVBQW1CLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU1RCxNQUFNLENBQU4sSUFBWSxlQUdYO0FBSEQsV0FBWSxlQUFlO0lBQzFCLHVFQUFpQixDQUFBO0lBQ2pCLG1FQUFXLENBQUE7QUFDWixDQUFDLEVBSFcsZUFBZSxLQUFmLGVBQWUsUUFHMUI7QUFFRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVqQzs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsU0FBUyxDQUFDLFNBQWlCLEVBQUUsTUFBZ0M7SUFDNUUsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7SUFFOUcsTUFBTSxhQUFhLEdBQWEsRUFBRSxDQUFDO0lBQ25DLElBQUksTUFBTSxLQUFLLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM5QyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQztTQUFNLElBQUksTUFBTSxLQUFLLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztTQUFNLENBQUM7UUFDUCxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQzFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVELGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM5RCxZQUFZLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM5QixJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN4QixjQUFjO1FBQ2QsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUNsQyxDQUFDO1NBQU0sQ0FBQztRQUNQLG1CQUFtQjtRQUNuQixNQUFNLGVBQWUsR0FBRyxHQUE2QyxDQUFDO1FBQ3RFLElBQUksZUFBZSxFQUFFLE1BQU0sRUFBRSxXQUFXLElBQUksZUFBZSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUMvRSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxVQUFVLE1BQU0sQ0FBQyxNQUFnQztJQUN0RCxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUM5RixDQUFDO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxNQUFnQztJQUN2RCxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUM5RixDQUFDO0FBMEJELFlBQVkifQ==