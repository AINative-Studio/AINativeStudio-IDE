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
import { debounce } from '../../../../../base/common/decorators.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
let TextAreaSyncAddon = class TextAreaSyncAddon extends Disposable {
    activate(terminal) {
        this._terminal = terminal;
        this._refreshListeners();
    }
    constructor(_capabilities, _accessibilityService, _configurationService, _logService) {
        super();
        this._capabilities = _capabilities;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._listeners = this._register(new MutableDisposable());
        this._register(Event.runAndSubscribe(Event.any(this._capabilities.onDidAddCapability, this._capabilities.onDidRemoveCapability, this._accessibilityService.onDidChangeScreenReaderOptimized), () => {
            this._refreshListeners();
        }));
    }
    _refreshListeners() {
        const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (this._shouldBeActive() && commandDetection) {
            if (!this._listeners.value) {
                const textarea = this._terminal?.textarea;
                if (textarea) {
                    this._listeners.value = Event.runAndSubscribe(commandDetection.promptInputModel.onDidChangeInput, () => this._sync(textarea));
                }
            }
        }
        else {
            this._listeners.clear();
        }
    }
    _shouldBeActive() {
        return this._accessibilityService.isScreenReaderOptimized() || this._configurationService.getValue("terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */);
    }
    _sync(textArea) {
        const commandCapability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!commandCapability) {
            return;
        }
        textArea.value = commandCapability.promptInputModel.value;
        textArea.selectionStart = commandCapability.promptInputModel.cursorIndex;
        textArea.selectionEnd = commandCapability.promptInputModel.cursorIndex;
        this._logService.debug(`TextAreaSyncAddon#sync: text changed to "${textArea.value}"`);
    }
};
__decorate([
    debounce(50)
], TextAreaSyncAddon.prototype, "_sync", null);
TextAreaSyncAddon = __decorate([
    __param(1, IAccessibilityService),
    __param(2, IConfigurationService),
    __param(3, ITerminalLogService)
], TextAreaSyncAddon);
export { TextAreaSyncAddon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFTeW5jQWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci90ZXh0QXJlYVN5bmNBZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQXFCLE1BQU0scURBQXFELENBQUM7QUFFdEcsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBSWhELFFBQVEsQ0FBQyxRQUFrQjtRQUMxQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsWUFDa0IsYUFBdUMsRUFDakMscUJBQTZELEVBQzdELHFCQUE2RCxFQUMvRCxXQUFpRDtRQUV0RSxLQUFLLEVBQUUsQ0FBQztRQUxTLGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtRQUNoQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBWHRELGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBZXJFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUM3QyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixFQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDLHFCQUFxQixFQUN4QyxJQUFJLENBQUMscUJBQXFCLENBQUMsZ0NBQWdDLENBQzNELEVBQUUsR0FBRyxFQUFFO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsNkNBQXFDLENBQUM7UUFDckYsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7Z0JBQzFDLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQy9ILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZTtRQUN0QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLHlFQUEyQixDQUFDO0lBQy9ILENBQUM7SUFHTyxLQUFLLENBQUMsUUFBNkI7UUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsNkNBQXFDLENBQUM7UUFDdEYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFFRCxRQUFRLENBQUMsS0FBSyxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztRQUMxRCxRQUFRLENBQUMsY0FBYyxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQztRQUN6RSxRQUFRLENBQUMsWUFBWSxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQztRQUV2RSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDdkYsQ0FBQztDQUNELENBQUE7QUFaUTtJQURQLFFBQVEsQ0FBQyxFQUFFLENBQUM7OENBWVo7QUF4RFcsaUJBQWlCO0lBVzNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0dBYlQsaUJBQWlCLENBeUQ3QiJ9