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
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Memento } from '../../../common/memento.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { BaseAssignmentService } from '../../../../platform/assignment/common/assignmentService.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
export const IWorkbenchAssignmentService = createDecorator('WorkbenchAssignmentService');
class MementoKeyValueStorage {
    constructor(memento) {
        this.memento = memento;
        this.mementoObj = memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    async getValue(key, defaultValue) {
        const value = await this.mementoObj[key];
        return value || defaultValue;
    }
    setValue(key, value) {
        this.mementoObj[key] = value;
        this.memento.saveMemento();
    }
}
class WorkbenchAssignmentServiceTelemetry {
    constructor(telemetryService, productService) {
        this.telemetryService = telemetryService;
        this.productService = productService;
    }
    get assignmentContext() {
        return this._lastAssignmentContext?.split(';');
    }
    // __GDPR__COMMON__ "abexp.assignmentcontext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    setSharedProperty(name, value) {
        if (name === this.productService.tasConfig?.assignmentContextTelemetryPropertyName) {
            this._lastAssignmentContext = value;
        }
        this.telemetryService.setExperimentProperty(name, value);
    }
    postEvent(eventName, props) {
        const data = {};
        for (const [key, value] of props.entries()) {
            data[key] = value;
        }
        /* __GDPR__
            "query-expfeature" : {
                "owner": "sbatten",
                "comment": "Logs queries to the experiment service by feature for metric calculations",
                "ABExp.queriedFeature": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The experimental feature being queried" }
            }
        */
        this.telemetryService.publicLog(eventName, data);
    }
}
let WorkbenchAssignmentService = class WorkbenchAssignmentService extends BaseAssignmentService {
    constructor(telemetryService, storageService, configurationService, productService, environmentService) {
        super(telemetryService.machineId, configurationService, productService, environmentService, new WorkbenchAssignmentServiceTelemetry(telemetryService, productService), new MementoKeyValueStorage(new Memento('experiment.service.memento', storageService)));
        this.telemetryService = telemetryService;
    }
    get experimentsEnabled() {
        return this.configurationService.getValue('workbench.enableExperiments') === true;
    }
    async getTreatment(name) {
        const result = await super.getTreatment(name);
        this.telemetryService.publicLog2('tasClientReadTreatmentComplete', { treatmentName: name, treatmentValue: JSON.stringify(result) });
        return result;
    }
    async getCurrentExperiments() {
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        await this.tasClient;
        return this.telemetry?.assignmentContext;
    }
};
WorkbenchAssignmentService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IProductService),
    __param(4, IEnvironmentService)
], WorkbenchAssignmentService);
export { WorkbenchAssignmentService };
registerSingleton(IWorkbenchAssignmentService, WorkbenchAssignmentService, 1 /* InstantiationType.Delayed */);
const registry = Registry.as(ConfigurationExtensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.enableExperiments': {
            'type': 'boolean',
            'description': localize('workbench.enableExperiments', "Fetches experiments to run from a Microsoft online service."),
            'default': true,
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'restricted': true,
            'tags': ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXNzaWdubWVudC9jb21tb24vYXNzaWdubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixPQUFPLEVBQWlCLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDcEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQXNCLE1BQU0sb0VBQW9FLENBQUM7QUFDdkssT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFN0YsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUE4Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBTXRILE1B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