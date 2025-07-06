/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IMetricsService } from '../common/metricsService.js';
const PING_EVERY_MS = 15 * 1000 * 60; // 15 minutes
export const IMetricsPollService = createDecorator('voidMetricsPollService');
let MetricsPollService = class MetricsPollService extends Disposable {
    static { this.ID = 'voidMetricsPollService'; }
    constructor(metricsService) {
        super();
        this.metricsService = metricsService;
        // initial state
        const { window } = dom.getActiveWindow();
        let i = 1;
        this.intervalID = window.setInterval(() => {
            this.metricsService.capture('Alive', { iv1: i });
            i += 1;
        }, PING_EVERY_MS);
    }
    dispose() {
        super.dispose();
        const { window } = dom.getActiveWindow();
        window.clearInterval(this.intervalID);
    }
};
MetricsPollService = __decorate([
    __param(0, IMetricsService)
], MetricsPollService);
registerWorkbenchContribution2(MetricsPollService.ID, MetricsPollService, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1BvbGxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvbWV0cmljc1BvbGxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBRWxHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBUzlELE1BQU0sYUFBYSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBLENBQUUsYUFBYTtBQUVuRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLHdCQUF3QixDQUFDLENBQUM7QUFDbEcsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO2FBRzFCLE9BQUUsR0FBRyx3QkFBd0IsQUFBM0IsQ0FBNEI7SUFJOUMsWUFDbUMsY0FBK0I7UUFFakUsS0FBSyxFQUFFLENBQUE7UUFGMkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBSWpFLGdCQUFnQjtRQUNoQixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVULElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDekMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDaEQsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNQLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUdsQixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDeEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdEMsQ0FBQzs7QUE1Qkksa0JBQWtCO0lBUXJCLFdBQUEsZUFBZSxDQUFBO0dBUlosa0JBQWtCLENBK0J2QjtBQUVELDhCQUE4QixDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxrQkFBa0Isc0NBQThCLENBQUMifQ==