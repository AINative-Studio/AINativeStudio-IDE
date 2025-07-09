/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExecutionEngine } from '../common/tasks.js';
import { AbstractTaskService } from './abstractTaskService.js';
import { ITaskService } from '../common/taskService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export class TaskService extends AbstractTaskService {
    static { this.ProcessTaskSystemSupportMessage = nls.localize('taskService.processTaskSystem', 'Process task system is not support in the web.'); }
    _getTaskSystem() {
        if (this._taskSystem) {
            return this._taskSystem;
        }
        if (this.executionEngine !== ExecutionEngine.Terminal) {
            throw new Error(TaskService.ProcessTaskSystemSupportMessage);
        }
        this._taskSystem = this._createTerminalTaskSystem();
        this._taskSystemListeners =
            [
                this._taskSystem.onDidStateChange((event) => {
                    this._taskRunningState.set(this._taskSystem.isActiveSync());
                    this._onDidStateChange.fire(event);
                }),
            ];
        return this._taskSystem;
    }
    _computeLegacyConfiguration(workspaceFolder) {
        throw new Error(TaskService.ProcessTaskSystemSupportMessage);
    }
    _versionAndEngineCompatible(filter) {
        return this.executionEngine === ExecutionEngine.Terminal;
    }
}
registerSingleton(ITaskService, TaskService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQXVDLE1BQU0sMEJBQTBCLENBQUM7QUFDcEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxNQUFNLE9BQU8sV0FBWSxTQUFRLG1CQUFtQjthQUMzQixvQ0FBK0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLGdEQUFnRCxDQUFDLENBQUM7SUFFaEosY0FBYztRQUN2QixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDekIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsb0JBQW9CO1lBQ3hCO2dCQUNDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7b0JBQzdELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3BDLENBQUMsQ0FBQzthQUNGLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVTLDJCQUEyQixDQUFDLGVBQWlDO1FBQ3RFLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVTLDJCQUEyQixDQUFDLE1BQW9CO1FBQ3pELE9BQU8sSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLENBQUMsUUFBUSxDQUFDO0lBQzFELENBQUM7O0FBR0YsaUJBQWlCLENBQUMsWUFBWSxFQUFFLFdBQVcsb0NBQTRCLENBQUMifQ==