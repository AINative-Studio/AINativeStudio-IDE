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
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { AccessibilityProgressSignalScheduler } from '../../../../platform/accessibilitySignal/browser/progressAccessibilitySignalScheduler.js';
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const CHAT_RESPONSE_PENDING_ALLOWANCE_MS = 4000;
let ChatAccessibilityService = class ChatAccessibilityService extends Disposable {
    constructor(_accessibilitySignalService, _instantiationService, _configurationService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._pendingSignalMap = this._register(new DisposableMap());
        this._requestId = 0;
    }
    acceptRequest() {
        this._requestId++;
        this._accessibilitySignalService.playSignal(AccessibilitySignal.chatRequestSent, { allowManyInParallel: true });
        this._pendingSignalMap.set(this._requestId, this._instantiationService.createInstance(AccessibilityProgressSignalScheduler, CHAT_RESPONSE_PENDING_ALLOWANCE_MS, undefined));
        return this._requestId;
    }
    acceptResponse(response, requestId, isVoiceInput) {
        this._pendingSignalMap.deleteAndDispose(requestId);
        const isPanelChat = typeof response !== 'string';
        const responseContent = typeof response === 'string' ? response : response?.response.toString();
        this._accessibilitySignalService.playSignal(AccessibilitySignal.chatResponseReceived, { allowManyInParallel: true });
        if (!response || !responseContent) {
            return;
        }
        const errorDetails = isPanelChat && response.errorDetails ? ` ${response.errorDetails.message}` : '';
        const plainTextResponse = renderStringAsPlaintext(new MarkdownString(responseContent));
        if (!isVoiceInput || this._configurationService.getValue("accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */) !== 'on') {
            status(plainTextResponse + errorDetails);
        }
    }
};
ChatAccessibilityService = __decorate([
    __param(0, IAccessibilitySignalService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], ChatAccessibilityService);
export { ChatAccessibilityService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QWNjZXNzaWJpbGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbEosT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sMEZBQTBGLENBQUM7QUFHaEosT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxDQUFDO0FBQ3pDLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQVF2RCxZQUM4QiwyQkFBeUUsRUFDL0UscUJBQTZELEVBQzdELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUpzQyxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBQzlELDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVA3RSxzQkFBaUIsR0FBZ0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFFckgsZUFBVSxHQUFXLENBQUMsQ0FBQztJQVEvQixDQUFDO0lBQ0QsYUFBYTtRQUNaLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEgsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0NBQW9DLEVBQUUsa0NBQWtDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1SyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUNELGNBQWMsQ0FBQyxRQUFxRCxFQUFFLFNBQWlCLEVBQUUsWUFBc0I7UUFDOUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sV0FBVyxHQUFHLE9BQU8sUUFBUSxLQUFLLFFBQVEsQ0FBQztRQUNqRCxNQUFNLGVBQWUsR0FBRyxPQUFPLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNySCxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkMsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxXQUFXLElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDckcsTUFBTSxpQkFBaUIsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsdUZBQTRDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0csTUFBTSxDQUFDLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQW5DWSx3QkFBd0I7SUFTbEMsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FYWCx3QkFBd0IsQ0FtQ3BDIn0=