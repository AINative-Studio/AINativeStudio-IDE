/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { localize2 } from '../../../../../../nls.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { INotificationService, Severity } from '../../../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { INativeEnvironmentService } from '../../../../../../platform/environment/common/environment.js';
import { executeCreateCommand, validateSkillName } from './createCommand.js';
/**
 * Skill Create Command ID
 */
export const SKILL_CREATE_ACTION_ID = 'ainative.skill.create';
/**
 * Skill Create Action
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SKILL_CREATE_ACTION_ID,
            f1: true,
            title: localize2('skillCreate', 'AINative Studio: Create Skill'),
            category: localize2('skillsCategory', 'Skills')
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const notificationService = accessor.get(INotificationService);
        const fileService = accessor.get(IFileService);
        const envService = accessor.get(INativeEnvironmentService);
        // Prompt for skill name
        const skillName = await quickInputService.input({
            prompt: 'Enter skill name (lowercase, alphanumeric and hyphens only)',
            placeHolder: 'my-awesome-skill',
            validateInput: async (value) => {
                const validation = validateSkillName(value);
                return validation.valid ? undefined : validation.error;
            }
        });
        // User cancelled
        if (!skillName) {
            return;
        }
        // Execute create command
        const result = await executeCreateCommand(skillName, fileService, envService);
        if (result.success) {
            // Show success notification with detailed message
            notificationService.notify({
                severity: Severity.Info,
                message: `Skill "${result.skillName}" created successfully`,
                source: 'Skills Manager',
                actions: {
                    primary: [
                        {
                            id: 'open-skill',
                            label: 'Open Folder',
                            tooltip: 'Open the skill folder',
                            class: undefined,
                            enabled: true,
                            run: () => {
                                // TODO: Open the skill folder in file explorer
                            }
                        }
                    ]
                }
            });
            // Show detailed output in info message
            const lines = result.output.split('\n');
            const detailMessage = lines.slice(0, 5).join('\n'); // Show first 5 lines
            notificationService.info(detailMessage);
        }
        else {
            // Show error notification
            notificationService.error(result.output);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDcmVhdGVBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvY2xpL3NraWxsQ3JlYXRlQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNoSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0U7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FBQztBQUU5RDs7R0FFRztBQUNILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFBRSwrQkFBK0IsQ0FBQztZQUNoRSxRQUFRLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQztTQUMvQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUUzRCx3QkFBd0I7UUFDeEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7WUFDL0MsTUFBTSxFQUFFLDZEQUE2RDtZQUNyRSxXQUFXLEVBQUUsa0JBQWtCO1lBQy9CLGFBQWEsRUFBRSxLQUFLLEVBQUUsS0FBYSxFQUFFLEVBQUU7Z0JBQ3RDLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM1QyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztZQUN4RCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFOUUsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEIsa0RBQWtEO1lBQ2xELG1CQUFtQixDQUFDLE1BQU0sQ0FBQztnQkFDMUIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUN2QixPQUFPLEVBQUUsVUFBVSxNQUFNLENBQUMsU0FBUyx3QkFBd0I7Z0JBQzNELE1BQU0sRUFBRSxnQkFBZ0I7Z0JBQ3hCLE9BQU8sRUFBRTtvQkFDUixPQUFPLEVBQUU7d0JBQ1I7NEJBQ0MsRUFBRSxFQUFFLFlBQVk7NEJBQ2hCLEtBQUssRUFBRSxhQUFhOzRCQUNwQixPQUFPLEVBQUUsdUJBQXVCOzRCQUNoQyxLQUFLLEVBQUUsU0FBUzs0QkFDaEIsT0FBTyxFQUFFLElBQUk7NEJBQ2IsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQ0FDVCwrQ0FBK0M7NEJBQ2hELENBQUM7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDLENBQUM7WUFFSCx1Q0FBdUM7WUFDdkMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMscUJBQXFCO1lBQ3pFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6QyxDQUFDO2FBQU0sQ0FBQztZQUNQLDBCQUEwQjtZQUMxQixtQkFBbUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=