/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { UninstallOptions, UninstallResult } from './cliTypes.js';
import Severity from '../../../../../../base/common/severity.js';

/**
 * Service for uninstalling skills
 */
export class SkillUninstallService extends Disposable {
	constructor(
		@ISkillsRegistry private readonly registry: ISkillsRegistry,
		@IDialogService private readonly dialogService: IDialogService
	) {
		super();
	}

	/**
	 * Uninstall a skill with optional confirmation
	 */
	async uninstall(options: UninstallOptions): Promise<UninstallResult> {
		const { skillName, skipConfirmation } = options;

		// Check if skill is installed
		const skill = await this.registry.get(skillName);
		if (!skill) {
			throw new Error(`Skill '${skillName}' is not installed.`);
		}

		// Show confirmation dialog unless skipped
		if (!skipConfirmation) {
			const confirmation = await this.dialogService.confirm({
				type: Severity.Warning,
				message: `Are you sure you want to uninstall '${skillName}'?`,
				detail: `This will remove all files for the skill from your system.\n\nInstalled at: ${skill.path}\nVersion: ${skill.version}\nSource: ${skill.source}`,
				primaryButton: 'Uninstall',
				cancelButton: 'Cancel'
			});

			if (!confirmation.confirmed) {
				throw new Error('Uninstall cancelled by user.');
			}
		}

		// Perform uninstallation
		try {
			await this.registry.uninstall(skillName);

			return {
				skillName,
				success: true
			};
		} catch (error) {
			throw new Error(`Failed to uninstall skill '${skillName}': ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Uninstall multiple skills
	 */
	async uninstallMultiple(skillNames: string[], skipConfirmation = false): Promise<UninstallResult[]> {
		const results: UninstallResult[] = [];

		for (const skillName of skillNames) {
			try {
				const result = await this.uninstall({ skillName, skipConfirmation });
				results.push(result);
			} catch (error) {
				results.push({
					skillName,
					success: false
				});
			}
		}

		return results;
	}
}
