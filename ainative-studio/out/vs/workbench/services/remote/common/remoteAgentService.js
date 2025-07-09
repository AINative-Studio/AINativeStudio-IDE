/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { timeout } from '../../../../base/common/async.js';
export const IRemoteAgentService = createDecorator('remoteAgentService');
export const remoteConnectionLatencyMeasurer = new class {
    constructor() {
        this.maxSampleCount = 5;
        this.sampleDelay = 2000;
        this.initial = [];
        this.maxInitialCount = 3;
        this.average = [];
        this.maxAverageCount = 100;
        this.highLatencyMultiple = 2;
        this.highLatencyMinThreshold = 500;
        this.highLatencyMaxThreshold = 1500;
        this.lastMeasurement = undefined;
    }
    get latency() { return this.lastMeasurement; }
    async measure(remoteAgentService) {
        let currentLatency = Infinity;
        // Measure up to samples count
        for (let i = 0; i < this.maxSampleCount; i++) {
            const rtt = await remoteAgentService.getRoundTripTime();
            if (rtt === undefined) {
                return undefined;
            }
            currentLatency = Math.min(currentLatency, rtt / 2 /* we want just one way, not round trip time */);
            await timeout(this.sampleDelay);
        }
        // Keep track of average latency
        this.average.push(currentLatency);
        if (this.average.length > this.maxAverageCount) {
            this.average.shift();
        }
        // Keep track of initial latency
        let initialLatency = undefined;
        if (this.initial.length < this.maxInitialCount) {
            this.initial.push(currentLatency);
        }
        else {
            initialLatency = this.initial.reduce((sum, value) => sum + value, 0) / this.initial.length;
        }
        // Remember as last measurement
        this.lastMeasurement = {
            initial: initialLatency,
            current: currentLatency,
            average: this.average.reduce((sum, value) => sum + value, 0) / this.average.length,
            high: (() => {
                // based on the initial, average and current latency, try to decide
                // if the connection has high latency
                // Some rules:
                // - we require the initial latency to be computed
                // - we only consider latency above highLatencyMinThreshold as potentially high
                // - we require the current latency to be above the average latency by a factor of highLatencyMultiple
                // - but not if the latency is actually above highLatencyMaxThreshold
                if (typeof initialLatency === 'undefined') {
                    return false;
                }
                if (currentLatency > this.highLatencyMaxThreshold) {
                    return true;
                }
                if (currentLatency > this.highLatencyMinThreshold && currentLatency > initialLatency * this.highLatencyMultiple) {
                    return true;
                }
                return false;
            })()
        };
        return this.lastMeasurement;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZW1vdGUvY29tbW9uL3JlbW90ZUFnZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFPN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQWdFOUYsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsSUFBSTtJQUFBO1FBRXpDLG1CQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLGdCQUFXLEdBQUcsSUFBSSxDQUFDO1FBRW5CLFlBQU8sR0FBYSxFQUFFLENBQUM7UUFDdkIsb0JBQWUsR0FBRyxDQUFDLENBQUM7UUFFcEIsWUFBTyxHQUFhLEVBQUUsQ0FBQztRQUN2QixvQkFBZSxHQUFHLEdBQUcsQ0FBQztRQUV0Qix3QkFBbUIsR0FBRyxDQUFDLENBQUM7UUFDeEIsNEJBQXVCLEdBQUcsR0FBRyxDQUFDO1FBQzlCLDRCQUF1QixHQUFHLElBQUksQ0FBQztRQUV4QyxvQkFBZSxHQUFvRCxTQUFTLENBQUM7SUFnRTlFLENBQUM7SUEvREEsSUFBSSxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUU5QyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUF1QztRQUNwRCxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUM7UUFFOUIsOEJBQThCO1FBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsY0FB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