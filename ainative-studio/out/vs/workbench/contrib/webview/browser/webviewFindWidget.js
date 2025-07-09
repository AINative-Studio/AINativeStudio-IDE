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
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { SimpleFindWidget } from '../../codeEditor/browser/find/simpleFindWidget.js';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from './webview.js';
let WebviewFindWidget = class WebviewFindWidget extends SimpleFindWidget {
    async _getResultCount(dataChanged) {
        return undefined;
    }
    constructor(_delegate, contextViewService, contextKeyService, hoverService, keybindingService) {
        super({
            showCommonFindToggles: false,
            checkImeCompletionState: _delegate.checkImeCompletionState,
            enableSash: true,
        }, contextViewService, contextKeyService, hoverService, keybindingService);
        this._delegate = _delegate;
        this._findWidgetFocused = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED.bindTo(contextKeyService);
        this._register(_delegate.hasFindResult(hasResult => {
            this.updateButtons(hasResult);
            this.focusFindBox();
        }));
        this._register(_delegate.onDidStopFind(() => {
            this.updateButtons(false);
        }));
    }
    find(previous) {
        const val = this.inputValue;
        if (val) {
            this._delegate.find(val, previous);
        }
    }
    hide(animated = true) {
        super.hide(animated);
        this._delegate.stopFind(true);
        this._delegate.focus();
    }
    _onInputChanged() {
        const val = this.inputValue;
        if (val) {
            this._delegate.updateFind(val);
        }
        else {
            this._delegate.stopFind(false);
        }
        return false;
    }
    _onFocusTrackerFocus() {
        this._findWidgetFocused.set(true);
    }
    _onFocusTrackerBlur() {
        this._findWidgetFocused.reset();
    }
    _onFindInputFocusTrackerFocus() { }
    _onFindInputFocusTrackerBlur() { }
    findFirst() { }
};
WebviewFindWidget = __decorate([
    __param(1, IContextViewService),
    __param(2, IContextKeyService),
    __param(3, IHoverService),
    __param(4, IKeybindingService)
], WebviewFindWidget);
export { WebviewFindWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ZpbmRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3dlYnZpZXdGaW5kV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsOENBQThDLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFZdkUsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxnQkFBZ0I7SUFDNUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxXQUFxQjtRQUNwRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBSUQsWUFDa0IsU0FBOEIsRUFDMUIsa0JBQXVDLEVBQ3hDLGlCQUFxQyxFQUMxQyxZQUEyQixFQUN0QixpQkFBcUM7UUFFekQsS0FBSyxDQUFDO1lBQ0wscUJBQXFCLEVBQUUsS0FBSztZQUM1Qix1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO1lBQzFELFVBQVUsRUFBRSxJQUFJO1NBQ2hCLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFWMUQsY0FBUyxHQUFULFNBQVMsQ0FBcUI7UUFXL0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLDhDQUE4QyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5HLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNsRCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sSUFBSSxDQUFDLFFBQWlCO1FBQzVCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVlLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSTtRQUNuQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVTLGVBQWU7UUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUM1QixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRVMsb0JBQW9CO1FBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVTLG1CQUFtQjtRQUM1QixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVTLDZCQUE2QixLQUFLLENBQUM7SUFFbkMsNEJBQTRCLEtBQUssQ0FBQztJQUU1QyxTQUFTLEtBQUssQ0FBQztDQUNmLENBQUE7QUFuRVksaUJBQWlCO0lBUzNCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsa0JBQWtCLENBQUE7R0FaUixpQkFBaUIsQ0FtRTdCIn0=