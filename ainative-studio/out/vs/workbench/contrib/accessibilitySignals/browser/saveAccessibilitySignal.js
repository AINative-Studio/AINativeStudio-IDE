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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
let SaveAccessibilitySignalContribution = class SaveAccessibilitySignalContribution extends Disposable {
    static { this.ID = 'workbench.contrib.saveAccessibilitySignal'; }
    constructor(_accessibilitySignalService, _workingCopyService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._workingCopyService = _workingCopyService;
        this._register(this._workingCopyService.onDidSave(e => this._accessibilitySignalService.playSignal(AccessibilitySignal.save, { userGesture: e.reason === 1 /* SaveReason.EXPLICIT */ })));
    }
};
SaveAccessibilitySignalContribution = __decorate([
    __param(0, IAccessibilitySignalService),
    __param(1, IWorkingCopyService)
], SaveAccessibilitySignalContribution);
export { SaveAccessibilitySignalContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZUFjY2Vzc2liaWxpdHlTaWduYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvc2F2ZUFjY2Vzc2liaWxpdHlTaWduYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBR2xKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTFGLElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQW9DLFNBQVEsVUFBVTthQUVsRCxPQUFFLEdBQUcsMkNBQTJDLEFBQTlDLENBQStDO0lBRWpFLFlBQytDLDJCQUF3RCxFQUNoRSxtQkFBd0M7UUFFOUUsS0FBSyxFQUFFLENBQUM7UUFIc0MsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUNoRSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBRzlFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxNQUFNLGdDQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkwsQ0FBQzs7QUFWVyxtQ0FBbUM7SUFLN0MsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLG1CQUFtQixDQUFBO0dBTlQsbUNBQW1DLENBVy9DIn0=