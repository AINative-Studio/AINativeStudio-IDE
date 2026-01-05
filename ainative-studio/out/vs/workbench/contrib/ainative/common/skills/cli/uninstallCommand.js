/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../../base/common/severity.js';
/**
 * Service for uninstalling skills
 */
let SkillUninstallService = class SkillUninstallService extends Disposable {
    constructor(registry, dialogService) {
        super();
        this.registry = registry;
        this.dialogService = dialogService;
    }
    /**
     * Uninstall a skill with optional confirmation
     */
    async uninstall(options) {
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
        }
        catch (error) {
            throw new Error(`Failed to uninstall skill '${skillName}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Uninstall multiple skills
     */
    async uninstallMultiple(skillNames, skipConfirmation = false) {
        const results = [];
        for (const skillName of skillNames) {
            try {
                const result = await this.uninstall({ skillName, skipConfirmation });
                results.push(result);
            }
            catch (error) {
                results.push({
                    skillName,
                    success: false
                });
            }
        }
        return results;
    }
};
SkillUninstallService = __decorate([
    __param(0, ISkillsRegistry),
    __param(1, IDialogService)
], SkillUninstallService);
export { SkillUninstallService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pbnN0YWxsQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9jbGkvdW5pbnN0YWxsQ29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0RixPQUFPLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQztBQUVqRTs7R0FFRztBQUNJLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQUNwRCxZQUNtQyxRQUF5QixFQUMxQixhQUE2QjtRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQUgwQixhQUFRLEdBQVIsUUFBUSxDQUFpQjtRQUMxQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7SUFHL0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUF5QjtRQUN4QyxNQUFNLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDO1FBRWhELDhCQUE4QjtRQUM5QixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxTQUFTLHFCQUFxQixDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNyRCxJQUFJLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3RCLE9BQU8sRUFBRSx1Q0FBdUMsU0FBUyxJQUFJO2dCQUM3RCxNQUFNLEVBQUUsK0VBQStFLEtBQUssQ0FBQyxJQUFJLGNBQWMsS0FBSyxDQUFDLE9BQU8sYUFBYSxLQUFLLENBQUMsTUFBTSxFQUFFO2dCQUN2SixhQUFhLEVBQUUsV0FBVztnQkFDMUIsWUFBWSxFQUFFLFFBQVE7YUFDdEIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDRixDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFekMsT0FBTztnQkFDTixTQUFTO2dCQUNULE9BQU8sRUFBRSxJQUFJO2FBQ2IsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLFNBQVMsTUFBTSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hILENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsVUFBb0IsRUFBRSxnQkFBZ0IsR0FBRyxLQUFLO1FBQ3JFLE1BQU0sT0FBTyxHQUFzQixFQUFFLENBQUM7UUFFdEMsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztnQkFDckUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWixTQUFTO29CQUNULE9BQU8sRUFBRSxLQUFLO2lCQUNkLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNELENBQUE7QUFwRVkscUJBQXFCO0lBRS9CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7R0FISixxQkFBcUIsQ0FvRWpDIn0=