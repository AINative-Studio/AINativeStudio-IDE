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
import { IDebugService } from '../common/debug.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
let DebugTitleContribution = class DebugTitleContribution {
    constructor(debugService, hostService, titleService) {
        this.toDispose = [];
        const updateTitle = () => {
            if (debugService.state === 2 /* State.Stopped */ && !hostService.hasFocus) {
                titleService.updateProperties({ prefix: '🔴' });
            }
            else {
                titleService.updateProperties({ prefix: '' });
            }
        };
        this.toDispose.push(debugService.onDidChangeState(updateTitle));
        this.toDispose.push(hostService.onDidChangeFocus(updateTitle));
    }
    dispose() {
        dispose(this.toDispose);
    }
};
DebugTitleContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IHostService),
    __param(2, ITitleService)
], DebugTitleContribution);
export { DebugTitleContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUaXRsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnVGl0bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBUyxNQUFNLG9CQUFvQixDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXpFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBSWxDLFlBQ2dCLFlBQTJCLEVBQzVCLFdBQXlCLEVBQ3hCLFlBQTJCO1FBTG5DLGNBQVMsR0FBa0IsRUFBRSxDQUFDO1FBT3JDLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtZQUN4QixJQUFJLFlBQVksQ0FBQyxLQUFLLDBCQUFrQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuRSxZQUFZLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNqRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDL0MsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0QsQ0FBQTtBQXZCWSxzQkFBc0I7SUFLaEMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsYUFBYSxDQUFBO0dBUEgsc0JBQXNCLENBdUJsQyJ9