/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { reset } from '../../dom.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from './iconLabels.js';
export class SimpleIconLabel {
    constructor(_container) {
        this._container = _container;
    }
    set text(text) {
        reset(this._container, ...renderLabelWithIcons(text ?? ''));
    }
    set title(title) {
        if (!this.hover && title) {
            this.hover = getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this._container, title);
        }
        else if (this.hover) {
            this.hover.update(title);
        }
    }
    dispose() {
        this.hover?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlSWNvbkxhYmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9pY29uTGFiZWwvc2ltcGxlSWNvbkxhYmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFckMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHdkQsTUFBTSxPQUFPLGVBQWU7SUFJM0IsWUFDa0IsVUFBdUI7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUNyQyxDQUFDO0lBRUwsSUFBSSxJQUFJLENBQUMsSUFBWTtRQUNwQixLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLG9CQUFvQixDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxLQUFhO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcseUJBQXlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RILENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCJ9