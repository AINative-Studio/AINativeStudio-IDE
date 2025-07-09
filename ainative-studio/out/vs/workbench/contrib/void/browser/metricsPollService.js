/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1BvbGxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9tZXRyaWNzUG9sbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFFbEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFTOUQsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUEsQ0FBRSxhQUFhO0FBRW5ELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isd0JBQXdCLENBQUMsQ0FBQztBQUNsRyxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7YUFHMUIsT0FBRSxHQUFHLHdCQUF3QixBQUEzQixDQUE0QjtJQUk5QyxZQUNtQyxjQUErQjtRQUVqRSxLQUFLLEVBQUUsQ0FBQTtRQUYyQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFJakUsZ0JBQWdCO1FBQ2hCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDeEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRVQsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUN6QyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNoRCxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1AsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBR2xCLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN0QyxDQUFDOztBQTVCSSxrQkFBa0I7SUFRckIsV0FBQSxlQUFlLENBQUE7R0FSWixrQkFBa0IsQ0ErQnZCO0FBRUQsOEJBQThCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLGtCQUFrQixzQ0FBOEIsQ0FBQyJ9