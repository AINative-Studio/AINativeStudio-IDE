/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { localize2 } from '../../../../../../nls.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { ISkillConfigService } from '../skillConfigServiceTypes.js';
import { executeListCommand } from './listCommand.js';
/**
 * Skill List Command ID
 */
export const SKILL_LIST_ACTION_ID = 'ainative.skill.list';
/**
 * Skill List (All) Action
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SKILL_LIST_ACTION_ID,
            f1: true,
            title: localize2('skillList', 'AINative Studio: List Skills'),
            category: localize2('skillsCategory', 'Skills')
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const skillsRegistry = accessor.get(ISkillsRegistry);
        const skillConfigService = accessor.get(ISkillConfigService);
        const result = await executeListCommand(skillsRegistry, skillConfigService);
        // Show result in quick pick
        await quickInputService.pick(result.skills.map(skill => ({
            label: `${skill.statusIcon} ${skill.name}`,
            description: skill.version,
            detail: `${skill.description} • Source: ${skill.source}`
        })), {
            placeHolder: `${result.totalCount} skill${result.totalCount !== 1 ? 's' : ''} installed (${result.enabledCount} enabled, ${result.disabledCount} disabled)`,
            canPickMany: false
        });
    }
});
/**
 * Skill List (Enabled Only) Action
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'ainative.skill.list.enabled',
            f1: true,
            title: localize2('skillListEnabled', 'AINative Studio: List Enabled Skills'),
            category: localize2('skillsCategory', 'Skills')
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const skillsRegistry = accessor.get(ISkillsRegistry);
        const skillConfigService = accessor.get(ISkillConfigService);
        const options = { enabled: true };
        const result = await executeListCommand(skillsRegistry, skillConfigService, options);
        if (result.skills.length === 0) {
            await quickInputService.pick([], {
                placeHolder: 'No enabled skills found'
            });
            return;
        }
        await quickInputService.pick(result.skills.map(skill => ({
            label: `${skill.statusIcon} ${skill.name}`,
            description: skill.version,
            detail: `${skill.description} • Source: ${skill.source}`
        })), {
            placeHolder: `${result.enabledCount} enabled skill${result.enabledCount !== 1 ? 's' : ''}`,
            canPickMany: false
        });
    }
});
/**
 * Skill List (Disabled Only) Action
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'ainative.skill.list.disabled',
            f1: true,
            title: localize2('skillListDisabled', 'AINative Studio: List Disabled Skills'),
            category: localize2('skillsCategory', 'Skills')
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const skillsRegistry = accessor.get(ISkillsRegistry);
        const skillConfigService = accessor.get(ISkillConfigService);
        const options = { disabled: true };
        const result = await executeListCommand(skillsRegistry, skillConfigService, options);
        if (result.skills.length === 0) {
            await quickInputService.pick([], {
                placeHolder: 'No disabled skills found'
            });
            return;
        }
        await quickInputService.pick(result.skills.map(skill => ({
            label: `${skill.statusIcon} ${skill.name}`,
            description: skill.version,
            detail: `${skill.description} • Source: ${skill.source}`
        })), {
            placeHolder: `${result.disabledCount} disabled skill${result.disabledCount !== 1 ? 's' : ''}`,
            canPickMany: false
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMaXN0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL2NsaS9za2lsbExpc3RBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBc0IsTUFBTSxrQkFBa0IsQ0FBQztBQUUxRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHFCQUFxQixDQUFDO0FBRTFEOztHQUVHO0FBQ0gsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLDhCQUE4QixDQUFDO1lBQzdELFFBQVEsRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDO1NBQy9DLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0s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