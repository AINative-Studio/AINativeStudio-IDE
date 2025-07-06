/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { webContents } from 'electron';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { WebviewProtocolProvider } from './webviewProtocolProvider.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
let WebviewMainService = class WebviewMainService extends Disposable {
    constructor(windowsMainService) {
        super();
        this.windowsMainService = windowsMainService;
        this._onFoundInFrame = this._register(new Emitter());
        this.onFoundInFrame = this._onFoundInFrame.event;
        this._register(new WebviewProtocolProvider());
    }
    async setIgnoreMenuShortcuts(id, enabled) {
        let contents;
        if (typeof id.windowId === 'number') {
            const { windowId } = id;
            const window = this.windowsMainService.getWindowById(windowId);
            if (!window?.win) {
                throw new Error(`Invalid windowId: ${windowId}`);
            }
            contents = window.win.webContents;
        }
        else {
            const { webContentsId } = id;
            contents = webContents.fromId(webContentsId);
            if (!contents) {
                throw new Error(`Invalid webContentsId: ${webContentsId}`);
            }
        }
        if (!contents.isDestroyed()) {
            contents.setIgnoreMenuShortcuts(enabled);
        }
    }
    async findInFrame(windowId, frameName, text, options) {
        const initialFrame = this.getFrameByName(windowId, frameName);
        const frame = initialFrame;
        if (typeof frame.findInFrame === 'function') {
            frame.findInFrame(text, {
                findNext: options.findNext,
                forward: options.forward,
            });
            const foundInFrameHandler = (_, result) => {
                if (result.finalUpdate) {
                    this._onFoundInFrame.fire(result);
                    frame.removeListener('found-in-frame', foundInFrameHandler);
                }
            };
            frame.on('found-in-frame', foundInFrameHandler);
        }
    }
    async stopFindInFrame(windowId, frameName, options) {
        const initialFrame = this.getFrameByName(windowId, frameName);
        const frame = initialFrame;
        if (typeof frame.stopFindInFrame === 'function') {
            frame.stopFindInFrame(options.keepSelection ? 'keepSelection' : 'clearSelection');
        }
    }
    getFrameByName(windowId, frameName) {
        const window = this.windowsMainService.getWindowById(windowId.windowId);
        if (!window?.win) {
            throw new Error(`Invalid windowId: ${windowId}`);
        }
        const frame = window.win.webContents.mainFrame.framesInSubtree.find(frame => {
            return frame.name === frameName;
        });
        if (!frame) {
            throw new Error(`Unknown frame: ${frameName}`);
        }
        return frame;
    }
};
WebviewMainService = __decorate([
    __param(0, IWindowsMainService)
], WebviewMainService);
export { WebviewMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2Vidmlldy9lbGVjdHJvbi1tYWluL3dlYnZpZXdNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWUsV0FBVyxFQUFnQixNQUFNLFVBQVUsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXRFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQU9qRCxZQUNzQixrQkFBd0Q7UUFFN0UsS0FBSyxFQUFFLENBQUM7UUFGOEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUo3RCxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQztRQUM5RSxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1FBTWxELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUEwQyxFQUFFLE9BQWdCO1FBQy9GLElBQUksUUFBaUMsQ0FBQztRQUV0QyxJQUFJLE9BQVEsRUFBc0IsQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFJLEVB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