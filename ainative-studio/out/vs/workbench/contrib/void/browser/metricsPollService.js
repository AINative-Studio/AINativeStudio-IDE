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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1BvbGxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL21ldHJpY3NQb2xsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQVM5RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQSxDQUFFLGFBQWE7QUFFbkQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQix3QkFBd0IsQ0FBQyxDQUFDO0FBQ2xHLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTthQUcxQixPQUFFLEdBQUcsd0JBQXdCLEFBQTNCLENBQTRCO0lBSTlDLFlBQ21DLGNBQStCO1FBRWpFLEtBQUssRUFBRSxDQUFBO1FBRjJCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUlqRSxnQkFBZ0I7UUFDaEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN4QyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFVCxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3pDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2hELENBQUMsSUFBSSxDQUFDLENBQUE7UUFDUCxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFHbEIsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7O0FBNUJJLGtCQUFrQjtJQVFyQixXQUFBLGVBQWUsQ0FBQTtHQVJaLGtCQUFrQixDQStCdkI7QUFFRCw4QkFBOEIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsa0JBQWtCLHNDQUE4QixDQUFDIn0=