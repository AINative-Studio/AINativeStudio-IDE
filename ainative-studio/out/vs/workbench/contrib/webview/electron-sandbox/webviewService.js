/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebviewService } from '../browser/webviewService.js';
import { ElectronWebviewElement } from './webviewElement.js';
export class ElectronWebviewService extends WebviewService {
    createWebviewElement(initInfo) {
        const webview = this._instantiationService.createInstance(ElectronWebviewElement, initInfo, this._webviewThemeDataProvider);
        this.registerNewWebview(webview);
        return webview;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9lbGVjdHJvbi1zYW5kYm94L3dlYnZpZXdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU3RCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsY0FBYztJQUVoRCxvQkFBb0IsQ0FBQyxRQUF5QjtRQUN0RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM1SCxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNEIn0=