/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from './window.js';
import { Emitter } from '../common/event.js';
class WindowManager {
    constructor() {
        // --- Zoom Level
        this.mapWindowIdToZoomLevel = new Map();
        this._onDidChangeZoomLevel = new Emitter();
        this.onDidChangeZoomLevel = this._onDidChangeZoomLevel.event;
        // --- Zoom Factor
        this.mapWindowIdToZoomFactor = new Map();
        // --- Fullscreen
        this._onDidChangeFullscreen = new Emitter();
        this.onDidChangeFullscreen = this._onDidChangeFullscreen.event;
        this.mapWindowIdToFullScreen = new Map();
    }
    static { this.INSTANCE = new WindowManager(); }
    getZoomLevel(targetWindow) {
        return this.mapWindowIdToZoomLevel.get(this.getWindowId(targetWindow)) ?? 0;
    }
    setZoomLevel(zoomLevel, targetWindow) {
        if (this.getZoomLevel(targetWindow) === zoomLevel) {
            return;
        }
        const targetWindowId = this.getWindowId(targetWindow);
        this.mapWindowIdToZoomLevel.set(targetWindowId, zoomLevel);
        this._onDidChangeZoomLevel.fire(targetWindowId);
    }
    getZoomFactor(targetWindow) {
        return this.mapWindowIdToZoomFactor.get(this.getWindowId(targetWindow)) ?? 1;
    }
    setZoomFactor(zoomFactor, targetWindow) {
        this.mapWindowIdToZoomFactor.set(this.getWindowId(targetWindow), zoomFactor);
    }
    setFullscreen(fullscreen, targetWindow) {
        if (this.isFullscreen(targetWindow) === fullscreen) {
            return;
        }
        const windowId = this.getWindowId(targetWindow);
        this.mapWindowIdToFullScreen.set(windowId, fullscreen);
        this._onDidChangeFullscreen.fire(windowId);
    }
    isFullscreen(targetWindow) {
        return !!this.mapWindowIdToFullScreen.get(this.getWindowId(targetWindow));
    }
    getWindowId(targetWindow) {
        return targetWindow.vscodeWindowId;
    }
}
export function addMatchMediaChangeListener(targetWindow, query, callback) {
    if (typeof query === 'string') {
        query = targetWindow.matchMedia(query);
    }
    query.addEventListener('change', callback);
}
/** A zoom index, e.g. 1, 2, 3 */
export function setZoomLevel(zoomLevel, targetWindow) {
    WindowManager.INSTANCE.setZoomLevel(zoomLevel, targetWindow);
}
export function getZoomLevel(targetWindow) {
    return WindowManager.INSTANCE.getZoomLevel(targetWindow);
}
export const onDidChangeZoomLevel = WindowManager.INSTANCE.onDidChangeZoomLevel;
/** The zoom scale for an index, e.g. 1, 1.2, 1.4 */
export function getZoomFactor(targetWindow) {
    return WindowManager.INSTANCE.getZoomFactor(targetWindow);
}
export function setZoomFactor(zoomFactor, targetWindow) {
    WindowManager.INSTANCE.setZoomFactor(zoomFactor, targetWindow);
}
export function setFullscreen(fullscreen, targetWindow) {
    WindowManager.INSTANCE.setFullscreen(fullscreen, targetWindow);
}
export function isFullscreen(targetWindow) {
    return WindowManager.INSTANCE.isFullscreen(targetWindow);
}
export const onDidChangeFullscreen = WindowManager.INSTANCE.onDidChangeFullscreen;
const userAgent = navigator.userAgent;
export const isFirefox = (userAgent.indexOf('Firefox') >= 0);
export const isWebKit = (userAgent.indexOf('AppleWebKit') >= 0);
export const isChrome = (userAgent.indexOf('Chrome') >= 0);
export const isSafari = (!isChrome && (userAgent.indexOf('Safari') >= 0));
export const isWebkitWebView = (!isChrome && !isSafari && isWebKit);
export const isElectron = (userAgent.indexOf('Electron/') >= 0);
export const isAndroid = (userAgent.indexOf('Android') >= 0);
let standalone = false;
if (typeof mainWindow.matchMedia === 'function') {
    const standaloneMatchMedia = mainWindow.matchMedia('(display-mode: standalone) or (display-mode: window-controls-overlay)');
    const fullScreenMatchMedia = mainWindow.matchMedia('(display-mode: fullscreen)');
    standalone = standaloneMatchMedia.matches;
    addMatchMediaChangeListener(mainWindow, standaloneMatchMedia, ({ matches }) => {
        // entering fullscreen would change standaloneMatchMedia.matches to false
        // if standalone is true (running as PWA) and entering fullscreen, skip this change
        if (standalone && fullScreenMatchMedia.matches) {
            return;
        }
        // otherwise update standalone (browser to PWA or PWA to browser)
        standalone = matches;
    });
}
export function isStandalone() {
    return standalone;
}
// Visible means that the feature is enabled, not necessarily being rendered
// e.g. visible is true even in fullscreen mode where the controls are hidden
// See docs at https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay/visible
export function isWCOEnabled() {
    return navigator?.windowControlsOverlay?.visible;
}
// Returns the bounding rect of the titlebar area if it is supported and defined
// See docs at https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay/getTitlebarAreaRect
export function getWCOTitlebarAreaRect(targetWindow) {
    return targetWindow.navigator?.windowControlsOverlay?.getTitlebarAreaRect();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvYnJvd3Nlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWMsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU3QyxNQUFNLGFBQWE7SUFBbkI7UUFJQyxpQkFBaUI7UUFFQSwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUVuRCwwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFDO1FBQ3RELHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFlakUsa0JBQWtCO1FBRUQsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFTckUsaUJBQWlCO1FBRUEsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQztRQUN2RCwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBRWxELDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO0lBa0J2RSxDQUFDO2FBeERnQixhQUFRLEdBQUcsSUFBSSxhQUFhLEVBQUUsQUFBdEIsQ0FBdUI7SUFTL0MsWUFBWSxDQUFDLFlBQW9CO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFDRCxZQUFZLENBQUMsU0FBaUIsRUFBRSxZQUFvQjtRQUNuRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkQsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQU1ELGFBQWEsQ0FBQyxZQUFvQjtRQUNqQyxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBQ0QsYUFBYSxDQUFDLFVBQWtCLEVBQUUsWUFBb0I7UUFDckQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFTRCxhQUFhLENBQUMsVUFBbUIsRUFBRSxZQUFvQjtRQUN0RCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEQsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFlBQVksQ0FBQyxZQUFvQjtRQUNoQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRU8sV0FBVyxDQUFDLFlBQW9CO1FBQ3ZDLE9BQVEsWUFBMkIsQ0FBQyxjQUFjLENBQUM7SUFDcEQsQ0FBQzs7QUFHRixNQUFNLFVBQVUsMkJBQTJCLENBQUMsWUFBb0IsRUFBRSxLQUE4QixFQUFFLFFBQW9FO0lBQ3JLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDL0IsS0FBSyxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUNELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELGlDQUFpQztBQUNqQyxNQUFNLFVBQVUsWUFBWSxDQUFDLFNBQWlCLEVBQUUsWUFBb0I7SUFDbkUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQzlELENBQUM7QUFDRCxNQUFNLFVBQVUsWUFBWSxDQUFDLFlBQW9CO0lBQ2hELE9BQU8sYUFBYSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUNELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUM7QUFFaEYsb0RBQW9EO0FBQ3BELE1BQU0sVUFBVSxhQUFhLENBQUMsWUFBb0I7SUFDakQsT0FBTyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBQ0QsTUFBTSxVQUFVLGFBQWEsQ0FBQyxVQUFrQixFQUFFLFlBQW9CO0lBQ3JFLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNoRSxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxVQUFtQixFQUFFLFlBQW9CO0lBQ3RFLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNoRSxDQUFDO0FBQ0QsTUFBTSxVQUFVLFlBQVksQ0FBQyxZQUFvQjtJQUNoRCxPQUFPLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFDRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDO0FBRWxGLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7QUFFdEMsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM3RCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDM0QsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUUsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLENBQUM7QUFDcEUsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNoRSxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBRTdELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztBQUN2QixJQUFJLE9BQU8sVUFBVSxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztJQUNqRCxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsdUVBQXVFLENBQUMsQ0FBQztJQUM1SCxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUNqRixVQUFVLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxDQUFDO0lBQzFDLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtRQUM3RSx5RUFBeUU7UUFDekUsbUZBQW1GO1FBQ25GLElBQUksVUFBVSxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hELE9BQU87UUFDUixDQUFDO1FBQ0QsaUVBQWlFO1FBQ2pFLFVBQVUsR0FBRyxPQUFPLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBQ0QsTUFBTSxVQUFVLFlBQVk7SUFDM0IsT0FBTyxVQUFVLENBQUM7QUFDbkIsQ0FBQztBQUVELDRFQUE0RTtBQUM1RSw2RUFBNkU7QUFDN0UsNkZBQTZGO0FBQzdGLE1BQU0sVUFBVSxZQUFZO0lBQzNCLE9BQVEsU0FBaUIsRUFBRSxxQkFBcUIsRUFBRSxPQUFPLENBQUM7QUFDM0QsQ0FBQztBQUVELGdGQUFnRjtBQUNoRix5R0FBeUc7QUFDekcsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFlBQW9CO0lBQzFELE9BQVEsWUFBWSxDQUFDLFNBQWlCLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQztBQUN0RixDQUFDIn0=