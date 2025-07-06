/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ID = 'diagnosticsService';
export const IDiagnosticsService = createDecorator(ID);
export function isRemoteDiagnosticError(x) {
    return !!x.hostName && !!x.errorMessage;
}
export class NullDiagnosticsService {
    async getPerformanceInfo(mainProcessInfo, remoteInfo) {
        return {};
    }
    async getSystemInfo(mainProcessInfo, remoteInfo) {
        return {
            processArgs: 'nullProcessArgs',
            gpuStatus: 'nullGpuStatus',
            screenReader: 'nullScreenReader',
            remoteData: [],
            os: 'nullOs',
            memory: 'nullMemory',
            vmHint: 'nullVmHint',
        };
    }
    async getDiagnostics(mainProcessInfo, remoteInfo) {
        return '';
    }
    async getWorkspaceFileExtensions(workspace) {
        return { extensions: [] };
    }
    async reportWorkspaceStats(workspace) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFnbm9zdGljcy9jb21tb24vZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzlFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQztBQUN2QyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFDO0FBb0Y1RSxNQUFNLFVBQVUsdUJBQXVCLENBQUMsQ0FBTTtJQUM3QyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ3pDLENBQUM7QUFFRCxNQUFNLE9BQU8sc0JBQXNCO0lBR2xDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxlQUF3QyxFQUFFLFVBQThEO1FBQ2hJLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsZUFBd0MsRUFBRSxVQUE4RDtRQUMzSCxPQUFPO1lBQ04sV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixTQUFTLEVBQUUsZUFBZTtZQUMxQixZQUFZLEVBQUUsa0JBQWtCO1lBQ2hDLFVBQVUsRUFBRSxFQUFFO1lBQ2QsRUFBRSxFQUFFLFFBQVE7WUFDWixNQUFNLEVBQUUsWUFBWTtZQUNwQixNQUFNLEVBQUUsWUFBWTtTQUNwQixDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsZUFBd0MsRUFBRSxVQUE4RDtRQUM1SCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQUMsU0FBcUI7UUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFNBQWdDLElBQW1CLENBQUM7Q0FFL0UifQ==