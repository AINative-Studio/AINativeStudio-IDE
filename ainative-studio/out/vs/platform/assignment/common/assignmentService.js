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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hc3NpZ25tZW50L2NvbW1vbi9hc3NpZ25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQXNCLGdCQUFnQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEosT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHdkQsTUFBTSxPQUFnQixxQkFBcUI7SUFNMUMsSUFBYyxrQkFBa0I7UUFDL0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsWUFDa0IsU0FBaUIsRUFDZixvQkFBMkMsRUFDM0MsY0FBK0IsRUFDL0Isa0JBQXVDLEVBQ2hELFNBQW9DLEVBQ3RDLGVBQWtDO1FBTHpCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMvQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ2hELGNBQVMsR0FBVCxTQUFTLENBQTJCO1FBQ3RDLG9CQUFlLEdBQWYsZUFBZSxDQUFtQjtRQWJuQyx1QkFBa0IsR0FBRyxLQUFLLENBQUM7UUFlbEMsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMseUJBQXlCLEtBQUssU0FBUyxDQUFDO1FBQzdFLElBQUksQ0FBQyxTQUFTLElBQUksY0FBYyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixD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