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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRhc2tDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUYXNrQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBSXRHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSw4QkFBOEIsRUFBdUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU5RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFJbEQsWUFDa0IsSUFBZSxFQUNoQyx5QkFBOEMsRUFDOUMsUUFBMEIsRUFDMUIsT0FBc0MsRUFDZixvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFOUyxTQUFJLEdBQUosSUFBSSxDQUFXO1FBUWhDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7WUFDNUssSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUM7UUFDckQsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVO1lBQ1YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksSUFBSSxDQUFDO1lBQzdDLE1BQU0sV0FBVyxHQUFHLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7WUFDOUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3pKLElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUNwQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUNyQyxDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUE2QztRQUMzRCxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssY0FBYztlQUNoQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO2VBQ25ELEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2pELENBQUM7SUFFRCxhQUFhLENBQUMsVUFBdUI7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQ0QsQ0FBQTtBQXJDWSxtQkFBbUI7SUFTN0IsV0FBQSxxQkFBcUIsQ0FBQTtHQVRYLG1CQUFtQixDQXFDL0IifQ==