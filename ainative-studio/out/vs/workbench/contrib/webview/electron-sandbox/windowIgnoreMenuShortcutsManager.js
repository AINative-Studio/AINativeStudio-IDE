/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../../base/common/platform.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { hasNativeTitlebar } from '../../../../platform/window/common/window.js';
export class WindowIgnoreMenuShortcutsManager {
    constructor(configurationService, mainProcessService, _nativeHostService) {
        this._nativeHostService = _nativeHostService;
        this._isUsingNativeTitleBars = hasNativeTitlebar(configurationService);
        this._webviewMainService = ProxyChannel.toService(mainProcessService.getChannel('webview'));
    }
    didFocus() {
        this.setIgnoreMenuShortcuts(true);
    }
    didBlur() {
        this.setIgnoreMenuShortcuts(false);
    }
    get _shouldToggleMenuShortcutsEnablement() {
        return isMacintosh || this._isUsingNativeTitleBars;
    }
    setIgnoreMenuShortcuts(value) {
        if (this._shouldToggleMenuShortcutsEnablement) {
            this._webviewMainService.setIgnoreMenuShortcuts({ windowId: this._nativeHostService.windowId }, value);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93SWdub3JlTWVudVNob3J0Y3V0c01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9lbGVjdHJvbi1zYW5kYm94L3dpbmRvd0lnbm9yZU1lbnVTaG9ydGN1dHNNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFLeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFakYsTUFBTSxPQUFPLGdDQUFnQztJQU01QyxZQUNDLG9CQUEyQyxFQUMzQyxrQkFBdUMsRUFDdEIsa0JBQXNDO1FBQXRDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFFdkQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQXlCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3JILENBQUM7SUFFTSxRQUFRO1FBQ2QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFZLG9DQUFvQztRQUMvQyxPQUFPLFdBQVcsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUM7SUFDcEQsQ0FBQztJQUVTLHNCQUFzQixDQUFDLEtBQWM7UUFDOUMsSUFBSSxJQUFJLENBQUMsb0NBQW9DLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hHLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==