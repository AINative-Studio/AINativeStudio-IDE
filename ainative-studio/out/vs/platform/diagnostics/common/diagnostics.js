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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhZ25vc3RpY3MvY29tbW9uL2RpYWdub3N0aWNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUc5RSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsb0JBQW9CLENBQUM7QUFDdkMsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixFQUFFLENBQUMsQ0FBQztBQW9GNUUsTUFBTSxVQUFVLHVCQUF1QixDQUFDLENBQU07SUFDN0MsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUN6QyxDQUFDO0FBRUQsTUFBTSxPQUFPLHNCQUFzQjtJQUdsQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZUFBd0MsRUFBRSxVQUE4RDtRQUNoSSxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLGVBQXdDLEVBQUUsVUFBOEQ7UUFDM0gsT0FBTztZQUNOLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsU0FBUyxFQUFFLGVBQWU7WUFDMUIsWUFBWSxFQUFFLGtCQUFrQjtZQUNoQyxVQUFVLEVBQUUsRUFBRTtZQUNkLEVBQUUsRUFBRSxRQUFRO1lBQ1osTUFBTSxFQUFFLFlBQVk7WUFDcEIsTUFBTSxFQUFFLFlBQVk7U0FDcEIsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQXdDLEVBQUUsVUFBOEQ7UUFDNUgsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUFDLFNBQXFCO1FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFnQyxJQUFtQixDQUFDO0NBRS9FIn0=