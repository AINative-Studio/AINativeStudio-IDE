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
import * as dom from '../../../../../base/browser/dom.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ChatProgressContentPart } from './chatProgressContentPart.js';
import { ChatCollapsibleListContentPart } from './chatReferencesContentPart.js';
let ChatTaskContentPart = class ChatTaskContentPart extends Disposable {
    constructor(task, contentReferencesListPool, renderer, context, instantiationService) {
        super();
        this.task = task;
        if (task.progress.length) {
            const refsPart = this._register(instantiationService.createInstance(ChatCollapsibleListContentPart, task.progress, task.content.value, context, contentReferencesListPool));
            this.domNode = dom.$('.chat-progress-task');
            this.domNode.appendChild(refsPart.domNode);
            this.onDidChangeHeight = refsPart.onDidChangeHeight;
        }
        else {
            // #217645
            const isSettled = task.isSettled?.() ?? true;
            const showSpinner = !isSettled && !context.element.isComplete;
            const progressPart = this._register(instantiationService.createInstance(ChatProgressContentPart, task, renderer, context, showSpinner, true, undefined));
            this.domNode = progressPart.domNode;
            this.onDidChangeHeight = Event.None;
        }
    }
    hasSameContent(other) {
        return other.kind === 'progressTask'
            && other.progress.length === this.task.progress.length
            && other.isSettled() === this.task.isSettled();
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatTaskContentPart = __decorate([
    __param(4, IInstantiationService)
], ChatTaskContentPart);
export { ChatTaskContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRhc2tDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0VGFza0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUl0RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsOEJBQThCLEVBQXVCLE1BQU0sZ0NBQWdDLENBQUM7QUFFOUYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBSWxELFlBQ2tCLElBQWUsRUFDaEMseUJBQThDLEVBQzlDLFFBQTBCLEVBQzFCLE9BQXNDLEVBQ2Ysb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFDO1FBTlMsU0FBSSxHQUFKLElBQUksQ0FBVztRQVFoQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1lBQzVLLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDO1FBQ3JELENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVTtZQUNWLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLElBQUksQ0FBQztZQUM3QyxNQUFNLFdBQVcsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN6SixJQUFJLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUM7WUFDcEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBNkM7UUFDM0QsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWM7ZUFDaEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtlQUNuRCxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQXVCO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNELENBQUE7QUFyQ1ksbUJBQW1CO0lBUzdCLFdBQUEscUJBQXFCLENBQUE7R0FUWCxtQkFBbUIsQ0FxQy9CIn0=