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
import { ContextView } from '../../../base/browser/ui/contextview/contextview.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { getWindow } from '../../../base/browser/dom.js';
let ContextViewHandler = class ContextViewHandler extends Disposable {
    constructor(layoutService) {
        super();
        this.layoutService = layoutService;
        this.contextView = this._register(new ContextView(this.layoutService.mainContainer, 1 /* ContextViewDOMPosition.ABSOLUTE */));
        this.layout();
        this._register(layoutService.onDidLayoutContainer(() => this.layout()));
    }
    // ContextView
    showContextView(delegate, container, shadowRoot) {
        let domPosition;
        if (container) {
            if (container === this.layoutService.getContainer(getWindow(container))) {
                domPosition = 1 /* ContextViewDOMPosition.ABSOLUTE */;
            }
            else if (shadowRoot) {
                domPosition = 3 /* ContextViewDOMPosition.FIXED_SHADOW */;
            }
            else {
                domPosition = 2 /* ContextViewDOMPosition.FIXED */;
            }
        }
        else {
            domPosition = 1 /* ContextViewDOMPosition.ABSOLUTE */;
        }
        this.contextView.setContainer(container ?? this.layoutService.activeContainer, domPosition);
        this.contextView.show(delegate);
        const openContextView = {
            close: () => {
                if (this.openContextView === openContextView) {
                    this.hideContextView();
                }
            }
        };
        this.openContextView = openContextView;
        return openContextView;
    }
    layout() {
        this.contextView.layout();
    }
    hideContextView(data) {
        this.contextView.hide(data);
        this.openContextView = undefined;
    }
};
ContextViewHandler = __decorate([
    __param(0, ILayoutService)
], ContextViewHandler);
export { ContextViewHandler };
export class ContextViewService extends ContextViewHandler {
    getContextViewElement() {
        return this.contextView.getViewElement();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dFZpZXdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHR2aWV3L2Jyb3dzZXIvY29udGV4dFZpZXdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQWdELE1BQU0scURBQXFELENBQUM7QUFDaEksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFbEQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBS2pELFlBQ2tDLGFBQTZCO1FBRTlELEtBQUssRUFBRSxDQUFDO1FBRnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUk5RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLDBDQUFrQyxDQUFDLENBQUM7UUFFdEgsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRUQsY0FBYztJQUVkLGVBQWUsQ0FBQyxRQUE4QixFQUFFLFNBQXVCLEVBQUUsVUFBb0I7UUFDNUYsSUFBSSxXQUFtQyxDQUFDO1FBQ3hDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLFNBQVMsS0FBSyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN6RSxXQUFXLDBDQUFrQyxDQUFDO1lBQy9DLENBQUM7aUJBQU0sSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDdkIsV0FBVyw4Q0FBc0MsQ0FBQztZQUNuRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsV0FBVyx1Q0FBK0IsQ0FBQztZQUM1QyxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLDBDQUFrQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFNUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFaEMsTUFBTSxlQUFlLEdBQXFCO1lBQ3pDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ1gsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLGVBQWUsRUFBRSxDQUFDO29CQUM5QyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3hCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQztRQUVGLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3ZDLE9BQU8sZUFBZSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsZUFBZSxDQUFDLElBQVU7UUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUM7SUFDbEMsQ0FBQztDQUNELENBQUE7QUF4RFksa0JBQWtCO0lBTTVCLFdBQUEsY0FBYyxDQUFBO0dBTkosa0JBQWtCLENBd0Q5Qjs7QUFFRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsa0JBQWtCO0lBSXpELHFCQUFxQjtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDMUMsQ0FBQztDQUNEIn0=