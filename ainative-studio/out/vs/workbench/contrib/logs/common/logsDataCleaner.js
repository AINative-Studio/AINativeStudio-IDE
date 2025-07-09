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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { Promises } from '../../../../base/common/async.js';
let LogsDataCleaner = class LogsDataCleaner extends Disposable {
    constructor(environmentService, fileService, lifecycleService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.lifecycleService = lifecycleService;
        this.cleanUpOldLogsSoon();
    }
    cleanUpOldLogsSoon() {
        let handle = setTimeout(async () => {
            handle = undefined;
            const stat = await this.fileService.resolve(dirname(this.environmentService.logsHome));
            if (stat.children) {
                const currentLog = basename(this.environmentService.logsHome);
                const allSessions = stat.children.filter(stat => stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name));
                const oldSessions = allSessions.sort().filter((d, i) => d.name !== currentLog);
                const toDelete = oldSessions.slice(0, Math.max(0, oldSessions.length - 49));
                Promises.settled(toDelete.map(stat => this.fileService.del(stat.resource, { recursive: true })));
            }
        }, 10 * 1000);
        this.lifecycleService.onWillShutdown(() => {
            if (handle) {
                clearTimeout(handle);
                handle = undefined;
            }
        });
    }
};
LogsDataCleaner = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, ILifecycleService)
], LogsDataCleaner);
export { LogsDataCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0RhdGFDbGVhbmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvY29tbW9uL2xvZ3NEYXRhQ2xlYW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXJELElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsVUFBVTtJQUU5QyxZQUNnRCxrQkFBZ0QsRUFDaEUsV0FBeUIsRUFDcEIsZ0JBQW1DO1FBRXZFLEtBQUssRUFBRSxDQUFDO1FBSnVDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFDaEUsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDcEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUd2RSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksTUFBTSxHQUFRLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN2QyxNQUFNLEdBQUcsU0FBUyxDQUFDO1lBQ25CLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3ZGLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM5RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEcsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUM7Z0JBQy9FLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDNUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRyxDQUFDO1FBQ0YsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFO1lBQ3pDLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQixNQUFNLEdBQUcsU0FBUyxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBOUJZLGVBQWU7SUFHekIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsaUJBQWlCLENBQUE7R0FMUCxlQUFlLENBOEIzQiJ9