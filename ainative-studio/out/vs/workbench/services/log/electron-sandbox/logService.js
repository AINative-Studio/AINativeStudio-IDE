/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConsoleLogger } from '../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { windowLogGroup, windowLogId } from '../common/logConstants.js';
import { LogService } from '../../../../platform/log/common/logService.js';
export class NativeLogService extends LogService {
    constructor(loggerService, environmentService) {
        const disposables = new DisposableStore();
        const fileLogger = disposables.add(loggerService.createLogger(environmentService.logFile, { id: windowLogId, name: windowLogGroup.name, group: windowLogGroup }));
        let consoleLogger;
        if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
            // Extension development test CLI: forward everything to main side
            consoleLogger = loggerService.createConsoleMainLogger();
        }
        else {
            // Normal mode: Log to console
            consoleLogger = new ConsoleLogger(fileLogger.getLevel());
        }
        super(fileLogger, [consoleLogger]);
        this._register(disposables);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbG9nL2VsZWN0cm9uLXNhbmRib3gvbG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFXLE1BQU0sd0NBQXdDLENBQUM7QUFHaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTNFLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBRS9DLFlBQVksYUFBa0MsRUFBRSxrQkFBc0Q7UUFFckcsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUUxQyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWxLLElBQUksYUFBc0IsQ0FBQztRQUMzQixJQUFJLGtCQUFrQixDQUFDLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2pHLGtFQUFrRTtZQUNsRSxhQUFhLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDekQsQ0FBQzthQUFNLENBQUM7WUFDUCw4QkFBOEI7WUFDOUIsYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUVuQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzdCLENBQUM7Q0FDRCJ9