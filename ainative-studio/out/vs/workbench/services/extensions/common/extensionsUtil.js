/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { localize } from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
// TODO: @sandy081 merge this with deduping in extensionsScannerService.ts
export function dedupExtensions(system, user, workspace, development, logService) {
    const result = new ExtensionIdentifierMap();
    system.forEach((systemExtension) => {
        const extension = result.get(systemExtension.identifier);
        if (extension) {
            logService.warn(localize('overwritingExtension', "Overwriting extension {0} with {1}.", extension.extensionLocation.fsPath, systemExtension.extensionLocation.fsPath));
        }
        result.set(systemExtension.identifier, systemExtension);
    });
    user.forEach((userExtension) => {
        const extension = result.get(userExtension.identifier);
        if (extension) {
            if (extension.isBuiltin) {
                if (semver.gte(extension.version, userExtension.version)) {
                    logService.warn(`Skipping extension ${userExtension.extensionLocation.path} in favour of the builtin extension ${extension.extensionLocation.path}.`);
                    return;
                }
                // Overwriting a builtin extension inherits the `isBuiltin` property and it doesn't show a warning
                userExtension.isBuiltin = true;
            }
            else {
                logService.warn(localize('overwritingExtension', "Overwriting extension {0} with {1}.", extension.extensionLocation.fsPath, userExtension.extensionLocation.fsPath));
            }
        }
        else if (userExtension.isBuiltin) {
            logService.warn(`Skipping obsolete builtin extension ${userExtension.extensionLocation.path}`);
            return;
        }
        result.set(userExtension.identifier, userExtension);
    });
    workspace.forEach(workspaceExtension => {
        const extension = result.get(workspaceExtension.identifier);
        if (extension) {
            logService.warn(localize('overwritingWithWorkspaceExtension', "Overwriting {0} with Workspace Extension {1}.", extension.extensionLocation.fsPath, workspaceExtension.extensionLocation.fsPath));
        }
        result.set(workspaceExtension.identifier, workspaceExtension);
    });
    development.forEach(developedExtension => {
        logService.info(localize('extensionUnderDevelopment', "Loading development extension at {0}", developedExtension.extensionLocation.fsPath));
        const extension = result.get(developedExtension.identifier);
        if (extension) {
            if (extension.isBuiltin) {
                // Overwriting a builtin extension inherits the `isBuiltin` property
                developedExtension.isBuiltin = true;
            }
        }
        result.set(developedExtension.identifier, developedExtension);
    });
    return Array.from(result.values());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1V0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnNVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSxzREFBc0QsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQztBQUduRSwwRUFBMEU7QUFDMUUsTUFBTSxVQUFVLGVBQWUsQ0FBQyxNQUErQixFQUFFLElBQTZCLEVBQUUsU0FBa0MsRUFBRSxXQUFvQyxFQUFFLFVBQXVCO0lBQ2hNLE1BQU0sTUFBTSxHQUFHLElBQUksc0JBQXNCLEVBQXlCLENBQUM7SUFDbkUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxxQ0FBcUMsRUFBRSxTQUFTLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3hLLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7UUFD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