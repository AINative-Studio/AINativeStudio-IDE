/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtHostLoggerService as BaseExtHostLoggerService } from '../common/extHostLoggerService.js';
import { Schemas } from '../../../base/common/network.js';
import { SpdLogLogger } from '../../../platform/log/node/spdlogLog.js';
import { generateUuid } from '../../../base/common/uuid.js';
export class ExtHostLoggerService extends BaseExtHostLoggerService {
    doCreateLogger(resource, logLevel, options) {
        if (resource.scheme === Schemas.file) {
            /* Create the logger in the Extension Host process to prevent loggers (log, output channels...) traffic  over IPC */
            return new SpdLogLogger(options?.name || generateUuid(), resource.fsPath, !options?.donotRotate, !!options?.donotUseFormatters, logLevel);
        }
        return super.doCreateLogger(resource, logLevel, options);
    }
    registerLogger(resource) {
        super.registerLogger(resource);
        this._proxy.$registerLogger(resource);
    }
    deregisterLogger(resource) {
        super.deregisterLogger(resource);
        this._proxy.$deregisterLogger(resource);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvZ2dlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RMb2dnZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxvQkFBb0IsSUFBSSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSx3QkFBd0I7SUFFOUMsY0FBYyxDQUFDLFFBQWEsRUFBRSxRQUFrQixFQUFFLE9BQXdCO1FBQzVGLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEMsb0hBQW9IO1lBQ3BILE9BQU8sSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxZQUFZLEVBQUUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzNJLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRVEsY0FBYyxDQUFDLFFBQXlCO1FBQ2hELEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVRLGdCQUFnQixDQUFDLFFBQWE7UUFDdEMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUVEIn0=