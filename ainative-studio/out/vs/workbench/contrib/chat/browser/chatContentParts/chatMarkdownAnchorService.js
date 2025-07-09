/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, isActiveElement } from '../../../../../base/browser/dom.js';
import { Disposable, combinedDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IChatMarkdownAnchorService = createDecorator('chatMarkdownAnchorService');
export class ChatMarkdownAnchorService extends Disposable {
    constructor() {
        super(...arguments);
        this._widgets = [];
        this._lastFocusedWidget = undefined;
    }
    get lastFocusedAnchor() {
        return this._lastFocusedWidget;
    }
    setLastFocusedList(widget) {
        this._lastFocusedWidget = widget;
    }
    register(widget) {
        if (this._widgets.some(other => other === widget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        // Keep in our lists list
        this._widgets.push(widget);
        const element = widget.getHTMLElement();
        // Check for currently being focused
        if (isActiveElement(element)) {
            this.setLastFocusedList(widget);
        }
        return combinedDisposable(addDisposableListener(element, 'focus', () => this.setLastFocusedList(widget)), toDisposable(() => this._widgets.splice(this._widgets.indexOf(widget), 1)), addDisposableListener(element, 'blur', () => {
            if (this._lastFocusedWidget === widget) {
                this.setLastFocusedList(undefined);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQW5jaG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0TWFya2Rvd25BbmNob3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFlLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUloRyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDJCQUEyQixDQUFDLENBQUM7QUFjbkgsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFBekQ7O1FBSVMsYUFBUSxHQUF5QixFQUFFLENBQUM7UUFDcEMsdUJBQWtCLEdBQW1DLFNBQVMsQ0FBQztJQW1DeEUsQ0FBQztJQWpDQSxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNoQyxDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBc0M7UUFDaEUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQztJQUNsQyxDQUFDO0lBRUQsUUFBUSxDQUFDLE1BQTBCO1FBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUzQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFeEMsb0NBQW9DO1FBQ3BDLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUN4QixxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUM5RSxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDMUUscUJBQXFCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDM0MsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQztJQUNILENBQUM7Q0FDRCJ9