/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getTelemetryLevel } from '../../telemetry/common/telemetryUtils.js';
import { AssignmentFilterProvider, ASSIGNMENT_REFETCH_INTERVAL, ASSIGNMENT_STORAGE_KEY, TargetPopulation } from './assignment.js';
import { importAMDNodeModule } from '../../../amdX.js';
export class BaseAssignmentService {
    get experimentsEnabled() {
        return true;
    }
    constructor(machineId, configurationService, productService, environmentService, telemetry, keyValueStorage) {
        this.machineId = machineId;
        this.configurationService = configurationService;
        this.productService = productService;
        this.environmentService = environmentService;
        this.telemetry = telemetry;
        this.keyValueStorage = keyValueStorage;
        this.networkInitialized = false;
        const isTesting = environmentService.extensionTestsLocationURI !== undefined;
        if (!isTesting && productService.tasConfig && this.experimentsEnabled && getTelemetryLevel(this.configurationService) === 3 /* TelemetryLevel.USAGE */) {
            this.tasClient = this.setupTASClient();
        }
        // For development purposes, configure the delay until tas local tas treatment ovverrides are available
        const overrideDelaySetting = this.configurationService.getValue('experiments.overrideDelay');
        const overrideDelay = typeof overrideDelaySetting === 'number' ? overrideDelaySetting : 0;
        this.overrideInitDelay = new Promise(resolve => setTimeout(resolve, overrideDelay));
    }
    async getTreatment(name) {
        // For development purposes, allow overriding tas assignments to test variants locally.
        await this.overrideInitDelay;
        const override = this.configurationService.getValue('experiments.override.' + name);
        if (override !== undefined) {
            return override;
        }
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        let result;
        const client = await this.tasClient;
        // The TAS client is initialized but we need to check if the initial fetch has completed yet
        // If it is complete, return a cached value for the treatment
        // If not, use the async call with `checkCache: true`. This will allow the module to return a cached value if it is present.
        // Otherwise it will await the initial fetch to return the most up to date value.
        if (this.networkInitialized) {
            result = client.getTreatmentVariable('vscode', name);
        }
        else {
            result = await client.getTreatmentVariableAsync('vscode', name, true);
        }
        result = client.getTreatmentVariable('vscode', name);
        return result;
    }
    async setupTASClient() {
        const targetPopulation = this.productService.quality === 'stable' ?
            TargetPopulation.Public : (this.productService.quality === 'exploration' ?
            TargetPopulation.Exploration : TargetPopulation.Insiders);
        const filterProvider = new AssignmentFilterProvider(this.productService.version, this.productService.nameLong, this.machineId, targetPopulation);
        const tasConfig = this.productService.tasConfig;
        const tasClient = new (await importAMDNodeModule('tas-client-umd', 'lib/tas-client-umd.js')).ExperimentationService({
            filterProviders: [filterProvider],
            telemetry: this.telemetry,
            storageKey: ASSIGNMENT_STORAGE_KEY,
            keyValueStorage: this.keyValueStorage,
            assignmentContextTelemetryPropertyName: tasConfig.assignmentContextTelemetryPropertyName,
            telemetryEventName: tasConfig.telemetryEventName,
            endpoint: tasConfig.endpoint,
            refetchInterval: ASSIGNMENT_REFETCH_INTERVAL,
        });
        await tasClient.initializePromise;
        tasClient.initialFetch.then(() => this.networkInitialized = true);
        return tasClient;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYXNzaWdubWVudC9jb21tb24vYXNzaWdubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDJCQUEyQixFQUFFLHNCQUFzQixFQUFzQixnQkFBZ0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBR3ZELE1BQU0sT0FBZ0IscUJBQXFCO0lBTTFDLElBQWMsa0JBQWtCO1FBQy9CLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFlBQ2tCLFNBQWlCLEVBQ2Ysb0JBQTJDLEVBQzNDLGNBQStCLEVBQy9CLGtCQUF1QyxFQUNoRCxTQUFvQyxFQUN0QyxlQUFrQztRQUx6QixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2YseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDL0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNoRCxjQUFTLEdBQVQsU0FBUyxDQUEyQjtRQUN0QyxvQkFBZSxHQUFmLGVBQWUsQ0FBbUI7UUFibkMsdUJBQWtCLEdBQUcsS0FBSyxDQUFDO1FBZWxDLE1BQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLHlCQUF5QixLQUFLLFNBQVMsQ0FBQztRQUM3RSxJQUFJLENBQUMsU0FBUyxJQUFJLGNBQWMsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGtCQUFrQixJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0Is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