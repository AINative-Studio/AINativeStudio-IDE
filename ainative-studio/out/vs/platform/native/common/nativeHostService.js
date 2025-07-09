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
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
// @ts-ignore: interface is implemented via proxy
let NativeHostService = class NativeHostService {
    constructor(windowId, mainProcessService) {
        this.windowId = windowId;
        return ProxyChannel.toService(mainProcessService.getChannel('nativeHost'), {
            context: windowId,
            properties: (() => {
                const properties = new Map();
                properties.set('windowId', windowId);
                return properties;
            })()
        });
    }
};
NativeHostService = __decorate([
    __param(1, IMainProcessService)
], NativeHostService);
export { NativeHostService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbmF0aXZlL2NvbW1vbi9uYXRpdmVIb3N0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHN0UsaURBQWlEO0FBQzFDLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBSTdCLFlBQ1UsUUFBZ0IsRUFDSixrQkFBdUM7UUFEbkQsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUd6QixPQUFPLFlBQVksQ0FBQyxTQUFTLENBQXFCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUM5RixPQUFPLEVBQUUsUUFBUTtZQUNqQixVQUFVLEVBQUUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO2dCQUM5QyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFFckMsT0FBTyxVQUFVLENBQUM7WUFDbkIsQ0FBQyxDQUFDLEVBQUU7U0FDSixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQWxCWSxpQkFBaUI7SUFNM0IsV0FBQSxtQkFBbUIsQ0FBQTtHQU5ULGlCQUFpQixDQWtCN0IifQ==