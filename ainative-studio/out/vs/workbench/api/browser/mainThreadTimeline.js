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
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ITimelineService } from '../../contrib/timeline/common/timeline.js';
import { revive } from '../../../base/common/marshalling.js';
let MainThreadTimeline = class MainThreadTimeline {
    constructor(context, logService, _timelineService) {
        this.logService = logService;
        this._timelineService = _timelineService;
        this._providerEmitters = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostTimeline);
    }
    $registerTimelineProvider(provider) {
        this.logService.trace(`MainThreadTimeline#registerTimelineProvider: id=${provider.id}`);
        const proxy = this._proxy;
        const emitters = this._providerEmitters;
        let onDidChange = emitters.get(provider.id);
        if (onDidChange === undefined) {
            onDidChange = new Emitter();
            emitters.set(provider.id, onDidChange);
        }
        this._timelineService.registerTimelineProvider({
            ...provider,
            onDidChange: onDidChange.event,
            async provideTimeline(uri, options, token) {
                return revive(await proxy.$getTimeline(provider.id, uri, options, token));
            },
            dispose() {
                emitters.delete(provider.id);
                onDidChange?.dispose();
            }
        });
    }
    $unregisterTimelineProvider(id) {
        this.logService.trace(`MainThreadTimeline#unregisterTimelineProvider: id=${id}`);
        this._timelineService.unregisterTimelineProvider(id);
    }
    $emitTimelineChangeEvent(e) {
        this.logService.trace(`MainThreadTimeline#emitChangeEvent: id=${e.id}, uri=${e.uri?.toString(true)}`);
        const emitter = this._providerEmitters.get(e.id);
        emitter?.fire(e);
    }
    dispose() {
        // noop
    }
};
MainThreadTimeline = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTimeline),
    __param(1, ILogService),
    __param(2, ITimelineService)
], MainThreadTimeline);
export { MainThreadTimeline };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRpbWVsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGltZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFpRCxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzSCxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFvRSxnQkFBZ0IsRUFBWSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pKLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUd0RCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUk5QixZQUNDLE9BQXdCLEVBQ1gsVUFBd0MsRUFDbkMsZ0JBQW1EO1FBRHZDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUxyRCxzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQztRQU9wRixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxRQUFvQztRQUM3RCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxtREFBbUQsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFeEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUUxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDeEMsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUMsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDL0IsV0FBVyxHQUFHLElBQUksT0FBTyxFQUF1QixDQUFDO1lBQ2pELFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDO1lBQzlDLEdBQUcsUUFBUTtZQUNYLFdBQVcsRUFBRSxXQUFXLENBQUMsS0FBSztZQUM5QixLQUFLLENBQUMsZUFBZSxDQUFDLEdBQVEsRUFBRSxPQUF3QixFQUFFLEtBQXdCO2dCQUNqRixPQUFPLE1BQU0sQ0FBVyxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDckYsQ0FBQztZQUNELE9BQU87Z0JBQ04sUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzdCLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUN4QixDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELDJCQUEyQixDQUFDLEVBQVU7UUFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscURBQXFELEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxDQUFzQjtRQUM5QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFdEcsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakQsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU87SUFDUixDQUFDO0NBQ0QsQ0FBQTtBQXJEWSxrQkFBa0I7SUFEOUIsb0JBQW9CLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDO0lBT2xELFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxnQkFBZ0IsQ0FBQTtHQVBOLGtCQUFrQixDQXFEOUIifQ==