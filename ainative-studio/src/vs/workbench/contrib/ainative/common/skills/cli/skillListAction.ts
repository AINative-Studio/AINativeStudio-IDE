/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../../../nls.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { ISkillConfigService } from '../skillConfigServiceTypes.js';
import { executeListCommand, ListCommandOptions } from './listCommand.js';

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

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const skillsRegistry = accessor.get(ISkillsRegistry);
		const skillConfigService = accessor.get(ISkillConfigService);

		const result = await executeListCommand(skillsRegistry, skillConfigService);

		// Show result in quick pick
		await quickInputService.pick(
			result.skills.map(skill => ({
				label: `${skill.statusIcon} ${skill.name}`,
				description: skill.version,
				detail: `${skill.description} • Source: ${skill.source}`
			})),
			{
				placeHolder: `${result.totalCount} skill${result.totalCount !== 1 ? 's' : ''} installed (${result.enabledCount} enabled, ${result.disabledCount} disabled)`,
				canPickMany: false
			}
		);
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

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const skillsRegistry = accessor.get(ISkillsRegistry);
		const skillConfigService = accessor.get(ISkillConfigService);

		const options: ListCommandOptions = { enabled: true };
		const result = await executeListCommand(skillsRegistry, skillConfigService, options);

		if (result.skills.length === 0) {
			await quickInputService.pick([], {
				placeHolder: 'No enabled skills found'
			});
			return;
		}

		await quickInputService.pick(
			result.skills.map(skill => ({
				label: `${skill.statusIcon} ${skill.name}`,
				description: skill.version,
				detail: `${skill.description} • Source: ${skill.source}`
			})),
			{
				placeHolder: `${result.enabledCount} enabled skill${result.enabledCount !== 1 ? 's' : ''}`,
				canPickMany: false
			}
		);
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

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const skillsRegistry = accessor.get(ISkillsRegistry);
		const skillConfigService = accessor.get(ISkillConfigService);

		const options: ListCommandOptions = { disabled: true };
		const result = await executeListCommand(skillsRegistry, skillConfigService, options);

		if (result.skills.length === 0) {
			await quickInputService.pick([], {
				placeHolder: 'No disabled skills found'
			});
			return;
		}

		await quickInputService.pick(
			result.skills.map(skill => ({
				label: `${skill.statusIcon} ${skill.name}`,
				description: skill.version,
				detail: `${skill.description} • Source: ${skill.source}`
			})),
			{
				placeHolder: `${result.disabledCount} disabled skill${result.disabledCount !== 1 ? 's' : ''}`,
				canPickMany: false
			}
		);
	}
});
