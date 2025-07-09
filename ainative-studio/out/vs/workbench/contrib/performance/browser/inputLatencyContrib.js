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
import { inputLatency } from '../../../../base/browser/performance.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let InputLatencyContrib = class InputLatencyContrib extends Disposable {
    constructor(_editorService, _telemetryService) {
        super();
        this._editorService = _editorService;
        this._telemetryService = _telemetryService;
        this._listener = this._register(new MutableDisposable());
        // The current sampling strategy is when the active editor changes, start sampling and
        // report the results after 60 seconds. It's done this way as we don't want to sample
        // everything, just somewhat randomly, and using an interval would utilize CPU when the
        // application is inactive.
        this._scheduler = this._register(new RunOnceScheduler(() => {
            this._logSamples();
            this._setupListener();
        }, 60000));
        // Only log 1% of users selected randomly to reduce the volume of data
        if (Math.random() <= 0.01) {
            this._setupListener();
        }
    }
    _setupListener() {
        this._listener.value = Event.once(this._editorService.onDidActiveEditorChange)(() => this._scheduler.schedule());
    }
    _logSamples() {
        const measurements = inputLatency.getAndClearMeasurements();
        if (!measurements) {
            return;
        }
        this._telemetryService.publicLog2('performance.inputLatency', {
            keydown: measurements.keydown,
            input: measurements.input,
            render: measurements.render,
            total: measurements.total,
            sampleCount: measurements.sampleCount
        });
    }
};
InputLatencyContrib = __decorate([
    __param(0, IEditorService),
    __param(1, ITelemetryService)
], InputLatencyContrib);
export { InputLatencyContrib };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRMYXRlbmN5Q29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9icm93c2VyL2lucHV0TGF0ZW5jeUNvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTNFLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUlsRCxZQUNpQixjQUErQyxFQUM1QyxpQkFBcUQ7UUFFeEUsS0FBSyxFQUFFLENBQUM7UUFIeUIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzNCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFMeEQsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFTcEUsc0ZBQXNGO1FBQ3RGLHFGQUFxRjtRQUNyRix1RkFBdUY7UUFDdkYsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUMxRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBR1gsc0VBQXNFO1FBQ3RFLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN2QixDQUFDO0lBRUYsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2xILENBQUM7SUFFTyxXQUFXO1FBQ2xCLE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQXNCRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFzRSwwQkFBMEIsRUFBRTtZQUNsSSxPQUFPLEVBQUUsWUFBWSxDQUFDLE9BQU87WUFDN0IsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLO1lBQ3pCLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTTtZQUMzQixLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7WUFDekIsV0FBVyxFQUFFLFlBQVksQ0FBQyxXQUFXO1NBQ3JDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBakVZLG1CQUFtQjtJQUs3QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsaUJBQWlCLENBQUE7R0FOUCxtQkFBbUIsQ0FpRS9CIn0=