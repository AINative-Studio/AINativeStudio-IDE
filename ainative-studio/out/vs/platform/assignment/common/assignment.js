/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../base/common/platform.js';
export const ASSIGNMENT_STORAGE_KEY = 'VSCode.ABExp.FeatureData';
export const ASSIGNMENT_REFETCH_INTERVAL = 0; // no polling
export var TargetPopulation;
(function (TargetPopulation) {
    TargetPopulation["Insiders"] = "insider";
    TargetPopulation["Public"] = "public";
    TargetPopulation["Exploration"] = "exploration";
})(TargetPopulation || (TargetPopulation = {}));
/*
Based upon the official VSCode currently existing filters in the
ExP backend for the VSCode cluster.
https://experimentation.visualstudio.com/Analysis%20and%20Experimentation/_git/AnE.ExP.TAS.TachyonHost.Configuration?path=%2FConfigurations%2Fvscode%2Fvscode.json&version=GBmaster
"X-MSEdge-Market": "detection.market",
"X-FD-Corpnet": "detection.corpnet",
"X-VSCode-AppVersion": "appversion",
"X-VSCode-Build": "build",
"X-MSEdge-ClientId": "clientid",
"X-VSCode-ExtensionName": "extensionname",
"X-VSCode-ExtensionVersion": "extensionversion",
"X-VSCode-TargetPopulation": "targetpopulation",
"X-VSCode-Language": "language"
*/
export var Filters;
(function (Filters) {
    /**
     * The market in which the extension is distributed.
     */
    Filters["Market"] = "X-MSEdge-Market";
    /**
     * The corporation network.
     */
    Filters["CorpNet"] = "X-FD-Corpnet";
    /**
     * Version of the application which uses experimentation service.
     */
    Filters["ApplicationVersion"] = "X-VSCode-AppVersion";
    /**
     * Insiders vs Stable.
     */
    Filters["Build"] = "X-VSCode-Build";
    /**
     * Client Id which is used as primary unit for the experimentation.
     */
    Filters["ClientId"] = "X-MSEdge-ClientId";
    /**
     * Extension header.
     */
    Filters["ExtensionName"] = "X-VSCode-ExtensionName";
    /**
     * The version of the extension.
     */
    Filters["ExtensionVersion"] = "X-VSCode-ExtensionVersion";
    /**
     * The language in use by VS Code
     */
    Filters["Language"] = "X-VSCode-Language";
    /**
     * The target population.
     * This is used to separate internal, early preview, GA, etc.
     */
    Filters["TargetPopulation"] = "X-VSCode-TargetPopulation";
})(Filters || (Filters = {}));
export class AssignmentFilterProvider {
    constructor(version, appName, machineId, targetPopulation) {
        this.version = version;
        this.appName = appName;
        this.machineId = machineId;
        this.targetPopulation = targetPopulation;
    }
    /**
     * Returns a version string that can be parsed by the TAS client.
     * The tas client cannot handle suffixes lke "-insider"
     * Ref: https://github.com/microsoft/tas-client/blob/30340d5e1da37c2789049fcf45928b954680606f/vscode-tas-client/src/vscode-tas-client/VSCodeFilterProvider.ts#L35
     *
     * @param version Version string to be trimmed.
    */
    static trimVersionSuffix(version) {
        const regex = /\-[a-zA-Z0-9]+$/;
        const result = version.split(regex);
        return result[0];
    }
    getFilterValue(filter) {
        switch (filter) {
            case Filters.ApplicationVersion:
                return AssignmentFilterProvider.trimVersionSuffix(this.version); // productService.version
            case Filters.Build:
                return this.appName; // productService.nameLong
            case Filters.ClientId:
                return this.machineId;
            case Filters.Language:
                return platform.language;
            case Filters.ExtensionName:
                return 'vscode-core'; // always return vscode-core for exp service
            case Filters.ExtensionVersion:
                return '999999.0'; // always return a very large number for cross-extension experimentation
            case Filters.TargetPopulation:
                return this.targetPopulation;
            default:
                return '';
        }
    }
    getFilters() {
        const filters = new Map();
        const filterValues = Object.values(Filters);
        for (const value of filterValues) {
            filters.set(value, this.getFilterValue(value));
        }
        return filters;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hc3NpZ25tZW50L2NvbW1vbi9hc3NpZ25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFHN0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsMEJBQTBCLENBQUM7QUFDakUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYTtBQU8zRCxNQUFNLENBQU4sSUFBWSxnQkFJWDtBQUpELFdBQVksZ0JBQWdCO0lBQzNCLHdDQUFvQixDQUFBO0lBQ3BCLHFDQUFpQixDQUFBO0lBQ2pCLCtDQUEyQixDQUFBO0FBQzVCLENBQUMsRUFKVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBSTNCO0FBRUQ7Ozs7Ozs7Ozs7Ozs7RUFhRTtBQUNGLE1BQU0sQ0FBTixJQUFZLE9BOENYO0FBOUNELFdBQVksT0FBTztJQUNsQjs7T0FFRztJQUNILHFDQUEwQixDQUFBO0lBRTFCOztPQUVHO0lBQ0gsbUNBQXdCLENBQUE7SUFFeEI7O09BRUc7SUFDSCxxREFBMEMsQ0FBQTtJQUUxQzs7T0FFRztJQUNILG1DQUF3QixDQUFBO0lBRXhCOztPQUVHO0lBQ0gseUNBQThCLENBQUE7SUFFOUI7O09BRUc7SUFDSCxtREFBd0MsQ0FBQTtJQUV4Qzs7T0FFRztJQUNILHlEQUE4QyxDQUFBO0lBRTlDOztPQUVHO0lBQ0gseUNBQThCLENBQUE7SUFFOUI7OztPQUdHO0lBQ0gseURBQThDLENBQUE7QUFDL0MsQ0FBQyxFQTlDVyxPQUFPLEtBQVAsT0FBTyxRQThDbEI7QUFFRCxNQUFNLE9BQU8sd0JBQXdCO0lBQ3BDLFlBQ1MsT0FBZSxFQUNmLE9BQWUsRUFDZixTQUFpQixFQUNqQixnQkFBa0M7UUFIbEMsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7SUFDdkMsQ0FBQztJQUVMOzs7Ozs7TUFNRTtJQUNNLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxPQUFlO1FBQy9DLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELGNBQWMsQ0FBQyxNQUFjO1FBQzVCLFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDaEIsS0FBSyxPQUFPLENBQUMsa0JBQWtCO2dCQUM5QixPQUFPLHdCQUF3QixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtZQUMzRixLQUFLLE9BQU8sQ0FBQyxLQUFLO2dCQUNqQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQywwQkFBMEI7WUFDaEQsS0FBSyxPQUFPLENBQUMsUUFBUTtnQkFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3ZCLEtBQUssT0FBTyxDQUFDLFFBQVE7Z0JBQ3BCLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUMxQixLQUFLLE9BQU8sQ0FBQyxhQUFhO2dCQUN6QixPQUFPLGFBQWEsQ0FBQyxDQUFDLDRDQUE0QztZQUNuRSxLQUFLLE9BQU8sQ0FBQyxnQkFBZ0I7Z0JBQzVCLE9BQU8sVUFBVSxDQUFDLENBQUMsd0VBQXdFO1lBQzVGLEtBQUssT0FBTyxDQUFDLGdCQUFnQjtnQkFDNUIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7WUFDOUI7Z0JBQ0MsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVU7UUFDVCxNQUFNLE9BQU8sR0FBcUIsSUFBSSxHQUFHLEVBQWUsQ0FBQztRQUN6RCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLEtBQUssTUFBTSxLQUFLLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0NBQ0QifQ==