/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { unthemedListStyles } from '../list/listWidget.js';
import { SelectBoxList } from './selectBoxCustom.js';
import { SelectBoxNative } from './selectBoxNative.js';
import { Widget } from '../widget.js';
import { isMacintosh } from '../../../common/platform.js';
import './selectBox.css';
export const unthemedSelectBoxStyles = {
    ...unthemedListStyles,
    selectBackground: '#3C3C3C',
    selectForeground: '#F0F0F0',
    selectBorder: '#3C3C3C',
    decoratorRightForeground: undefined,
    selectListBackground: undefined,
    selectListBorder: undefined,
    focusBorder: undefined,
};
export class SelectBox extends Widget {
    constructor(options, selected, contextViewProvider, styles, selectBoxOptions) {
        super();
        // Default to native SelectBox for OSX unless overridden
        if (isMacintosh && !selectBoxOptions?.useCustomDrawn) {
            this.selectBoxDelegate = new SelectBoxNative(options, selected, styles, selectBoxOptions);
        }
        else {
            this.selectBoxDelegate = new SelectBoxList(options, selected, contextViewProvider, styles, selectBoxOptions);
        }
        this._register(this.selectBoxDelegate);
    }
    // Public SelectBox Methods - routed through delegate interface
    get onDidSelect() {
        return this.selectBoxDelegate.onDidSelect;
    }
    setOptions(options, selected) {
        this.selectBoxDelegate.setOptions(options, selected);
    }
    select(index) {
        this.selectBoxDelegate.select(index);
    }
    setAriaLabel(label) {
        this.selectBoxDelegate.setAriaLabel(label);
    }
    focus() {
        this.selectBoxDelegate.focus();
    }
    blur() {
        this.selectBoxDelegate.blur();
    }
    setFocusable(focusable) {
        this.selectBoxDelegate.setFocusable(focusable);
    }
    setEnabled(enabled) {
        this.selectBoxDelegate.setEnabled(enabled);
    }
    render(container) {
        this.selectBoxDelegate.render(container);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0Qm94LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zZWxlY3RCb3gvc2VsZWN0Qm94LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUd0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxpQkFBaUIsQ0FBQztBQW1EekIsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQXFCO0lBQ3hELEdBQUcsa0JBQWtCO0lBQ3JCLGdCQUFnQixFQUFFLFNBQVM7SUFDM0IsZ0JBQWdCLEVBQUUsU0FBUztJQUMzQixZQUFZLEVBQUUsU0FBUztJQUN2Qix3QkFBd0IsRUFBRSxTQUFTO0lBQ25DLG9CQUFvQixFQUFFLFNBQVM7SUFDL0IsZ0JBQWdCLEVBQUUsU0FBUztJQUMzQixXQUFXLEVBQUUsU0FBUztDQUN0QixDQUFDO0FBT0YsTUFBTSxPQUFPLFNBQVUsU0FBUSxNQUFNO0lBR3BDLFlBQVksT0FBNEIsRUFBRSxRQUFnQixFQUFFLG1CQUF5QyxFQUFFLE1BQXdCLEVBQUUsZ0JBQW9DO1FBQ3BLLEtBQUssRUFBRSxDQUFDO1FBRVIsd0RBQXdEO1FBQ3hELElBQUksV0FBVyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksZUFBZSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDM0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM5RyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsK0RBQStEO0lBRS9ELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQztJQUMzQyxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQTRCLEVBQUUsUUFBaUI7UUFDekQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFhO1FBQ25CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELFlBQVksQ0FBQyxLQUFhO1FBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVELFlBQVksQ0FBQyxTQUFrQjtRQUM5QixJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxVQUFVLENBQUMsT0FBZ0I7UUFDMUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQXNCO1FBQzVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUNEIn0=