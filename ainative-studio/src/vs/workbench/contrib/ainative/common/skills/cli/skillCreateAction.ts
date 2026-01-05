/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../../../editor/browser/editorExtensions.js';
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

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);
		const fileService = accessor.get(IFileService);
		const envService = accessor.get(INativeEnvironmentService);

		// Prompt for skill name
		const skillName = await quickInputService.input({
			prompt: 'Enter skill name (lowercase, alphanumeric and hyphens only)',
			placeHolder: 'my-awesome-skill',
			validateInput: async (value: string) => {
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
		} else {
			// Show error notification
			notificationService.error(result.output);
		}
	}
});
