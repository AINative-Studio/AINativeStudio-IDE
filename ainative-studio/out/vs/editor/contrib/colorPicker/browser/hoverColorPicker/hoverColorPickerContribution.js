/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Range } from '../../../../common/core/range.js';
import { ContentHoverController } from '../../../hover/browser/contentHoverController.js';
import { isOnColorDecorator } from './hoverColorPicker.js';
export class HoverColorPickerContribution extends Disposable {
    static { this.ID = 'editor.contrib.colorContribution'; }
    static { this.RECOMPUTE_TIME = 1000; } // ms
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(_editor.onMouseDown((e) => this.onMouseDown(e)));
    }
    dispose() {
        super.dispose();
    }
    onMouseDown(mouseEvent) {
        const colorDecoratorsActivatedOn = this._editor.getOption(154 /* EditorOption.colorDecoratorsActivatedOn */);
        if (colorDecoratorsActivatedOn !== 'click' && colorDecoratorsActivatedOn !== 'clickAndHover') {
            return;
        }
        if (!isOnColorDecorator(mouseEvent)) {
            return;
        }
        const hoverController = this._editor.getContribution(ContentHoverController.ID);
        if (!hoverController) {
            return;
        }
        if (hoverController.isColorPickerVisible) {
            return;
        }
        const targetRange = mouseEvent.target.range;
        if (!targetRange) {
            return;
        }
        const range = new Range(targetRange.startLineNumber, targetRange.startColumn + 1, targetRange.endLineNumber, targetRange.endColumn + 1);
        hoverController.showContentHover(range, 1 /* HoverStartMode.Immediate */, 1 /* HoverStartSource.Click */, false);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlckNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2hvdmVyQ29sb3JQaWNrZXIvaG92ZXJDb2xvclBpY2tlckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTNELE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxVQUFVO2FBRXBDLE9BQUUsR0FBVyxrQ0FBa0MsQ0FBQzthQUV2RCxtQkFBYyxHQUFHLElBQUksQ0FBQyxHQUFDLEtBQUs7SUFFNUMsWUFBNkIsT0FBb0I7UUFFaEQsS0FBSyxFQUFFLENBQUM7UUFGb0IsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUdoRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTyxXQUFXLENBQUMsVUFBNkI7UUFFaEQsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsbURBQXlDLENBQUM7UUFDbkcsSUFBSSwwQkFBMEIsS0FBSyxPQUFPLElBQUksMEJBQTBCLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDOUYsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUF5QixzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzFDLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDNUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEksZUFBZSxDQUFDLGdCQUFnQixDQUFDLEtBQUssb0VBQW9ELEtBQUssQ0FBQyxDQUFDO0lBQ2xHLENBQUMifQ==