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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
export const ISharedProcessLifecycleService = createDecorator('sharedProcessLifecycleService');
let SharedProcessLifecycleService = class SharedProcessLifecycleService extends Disposable {
    constructor(logService) {
        super();
        this.logService = logService;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
    }
    fireOnWillShutdown() {
        this.logService.trace('Lifecycle#onWillShutdown.fire()');
        this._onWillShutdown.fire();
    }
};
SharedProcessLifecycleService = __decorate([
    __param(0, ILogService)
], SharedProcessLifecycleService);
export { SharedProcessLifecycleService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc0xpZmVjeWNsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGlmZWN5Y2xlL25vZGUvc2hhcmVkUHJvY2Vzc0xpZmVjeWNsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGVBQWUsQ0FBaUMsK0JBQStCLENBQUMsQ0FBQztBQVl4SCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFPNUQsWUFDYyxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQUZzQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSnJDLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDOUQsbUJBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztJQU1yRCxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFFekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0QsQ0FBQTtBQWxCWSw2QkFBNkI7SUFRdkMsV0FBQSxXQUFXLENBQUE7R0FSRCw2QkFBNkIsQ0FrQnpDIn0=