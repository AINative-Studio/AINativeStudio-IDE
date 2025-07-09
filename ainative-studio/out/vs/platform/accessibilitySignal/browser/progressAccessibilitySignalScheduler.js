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
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService } from './accessibilitySignalService.js';
const PROGRESS_SIGNAL_LOOP_DELAY = 5000;
/**
 * Schedules a signal to play while progress is happening.
 */
let AccessibilityProgressSignalScheduler = class AccessibilityProgressSignalScheduler extends Disposable {
    constructor(msDelayTime, msLoopTime, _accessibilitySignalService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._scheduler = new RunOnceScheduler(() => {
            this._signalLoop = this._accessibilitySignalService.playSignalLoop(AccessibilitySignal.progress, msLoopTime ?? PROGRESS_SIGNAL_LOOP_DELAY);
        }, msDelayTime);
        this._scheduler.schedule();
    }
    dispose() {
        super.dispose();
        this._signalLoop?.dispose();
        this._scheduler.dispose();
    }
};
AccessibilityProgressSignalScheduler = __decorate([
    __param(2, IAccessibilitySignalService)
], AccessibilityProgressSignalScheduler);
export { AccessibilityProgressSignalScheduler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsU2NoZWR1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHlTaWduYWwvYnJvd3Nlci9wcm9ncmVzc0FjY2Vzc2liaWxpdHlTaWduYWxTY2hlZHVsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRW5HLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDO0FBRXhDOztHQUVHO0FBQ0ksSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBcUMsU0FBUSxVQUFVO0lBR25FLFlBQVksV0FBbUIsRUFBRSxVQUE4QixFQUFnRCwyQkFBd0Q7UUFDdEssS0FBSyxFQUFFLENBQUM7UUFEc0csZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUV0SyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsVUFBVSxJQUFJLDBCQUEwQixDQUFDLENBQUM7UUFDNUksQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUNRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRCxDQUFBO0FBZlksb0NBQW9DO0lBR2tCLFdBQUEsMkJBQTJCLENBQUE7R0FIakYsb0NBQW9DLENBZWhEIn0=