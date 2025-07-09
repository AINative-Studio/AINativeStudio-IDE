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
import { ISpeechService } from '../common/speechService.js';
let SpeechAccessibilitySignalContribution = class SpeechAccessibilitySignalContribution extends Disposable {
    static { this.ID = 'workbench.contrib.speechAccessibilitySignal'; }
    constructor(_accessibilitySignalService, _speechService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._speechService = _speechService;
        this._register(this._speechService.onDidStartSpeechToTextSession(() => this._accessibilitySignalService.playSignal(AccessibilitySignal.voiceRecordingStarted)));
        this._register(this._speechService.onDidEndSpeechToTextSession(() => this._accessibilitySignalService.playSignal(AccessibilitySignal.voiceRecordingStopped)));
    }
};
SpeechAccessibilitySignalContribution = __decorate([
    __param(0, IAccessibilitySignalService),
    __param(1, ISpeechService)
], SpeechAccessibilitySignalContribution);
export { SpeechAccessibilitySignalContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoQWNjZXNzaWJpbGl0eVNpZ25hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zcGVlY2gvYnJvd3Nlci9zcGVlY2hBY2Nlc3NpYmlsaXR5U2lnbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUVsSixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFckQsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBc0MsU0FBUSxVQUFVO2FBRXBELE9BQUUsR0FBRyw2Q0FBNkMsQUFBaEQsQ0FBaUQ7SUFFbkUsWUFDK0MsMkJBQXdELEVBQ3JFLGNBQThCO1FBRS9ELEtBQUssRUFBRSxDQUFDO1FBSHNDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDckUsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBSS9ELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hLLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9KLENBQUM7O0FBWlcscUNBQXFDO0lBSy9DLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxjQUFjLENBQUE7R0FOSixxQ0FBcUMsQ0FhakQifQ==