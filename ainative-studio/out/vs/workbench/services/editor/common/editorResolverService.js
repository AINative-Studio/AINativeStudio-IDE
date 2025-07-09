/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { Schemas } from '../../../../base/common/network.js';
import { posix } from '../../../../base/common/path.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export const IEditorResolverService = createDecorator('editorResolverService');
export const editorsAssociationsSettingId = 'workbench.editorAssociations';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const editorAssociationsConfigurationNode = {
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.editorAssociations': {
            type: 'object',
            markdownDescription: localize('editor.editorAssociations', "Configure [glob patterns](https://aka.ms/vscode-glob-patterns) to editors (for example `\"*.hex\": \"hexEditor.hexedit\"`). These have precedence over the default behavior."),
            additionalProperties: {
                type: 'string'
            }
        }
    }
};
configurationRegistry.registerConfiguration(editorAssociationsConfigurationNode);
//#endregion
//#region EditorResolverService types
export var RegisteredEditorPriority;
(function (RegisteredEditorPriority) {
    RegisteredEditorPriority["builtin"] = "builtin";
    RegisteredEditorPriority["option"] = "option";
    RegisteredEditorPriority["exclusive"] = "exclusive";
    RegisteredEditorPriority["default"] = "default";
})(RegisteredEditorPriority || (RegisteredEditorPriority = {}));
/**
 * If we didn't resolve an editor dictates what to do with the opening state
 * ABORT = Do not continue with opening the editor
 * NONE = Continue as if the resolution has been disabled as the service could not resolve one
 */
export var ResolvedStatus;
(function (ResolvedStatus) {
    ResolvedStatus[ResolvedStatus["ABORT"] = 1] = "ABORT";
    ResolvedStatus[ResolvedStatus["NONE"] = 2] = "NONE";
})(ResolvedStatus || (ResolvedStatus = {}));
//#endregion
//#region Util functions
export function priorityToRank(priority) {
    switch (priority) {
        case RegisteredEditorPriority.exclusive:
            return 5;
        case RegisteredEditorPriority.default:
            return 4;
        case RegisteredEditorPriority.builtin:
            return 3;
        // Text editor is priority 2
        case RegisteredEditorPriority.option:
        default:
            return 1;
    }
}
export function globMatchesResource(globPattern, resource) {
    const excludedSchemes = new Set([
        Schemas.extension,
        Schemas.webviewPanel,
        Schemas.vscodeWorkspaceTrust,
        Schemas.vscodeSettings
    ]);
    // We want to say that the above schemes match no glob patterns
    if (excludedSchemes.has(resource.scheme)) {
        return false;
    }
    const matchOnPath = typeof globPattern === 'string' && globPattern.indexOf(posix.sep) >= 0;
    const target = matchOnPath ? `${resource.scheme}:${resource.path}` : basename(resource);
    return glob.match(typeof globPattern === 'string' ? globPattern.toLowerCase() : globPattern, target.toLowerCase());
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2VkaXRvclJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBR3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUE4QyxNQUFNLG9FQUFvRSxDQUFDO0FBRXZLLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFNNUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBYXZHLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLDhCQUE4QixDQUFDO0FBRTNFLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFekcsTUFBTSxtQ0FBbUMsR0FBdUI7SUFDL0QsR0FBRyw4QkFBOEI7SUFDakMsVUFBVSxFQUFFO1FBQ1gsOEJBQThCLEVBQUU7WUFDL0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsOEtBQThLLENBQUM7WUFDMU8sb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRO2FBQ2Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQztBQVFGLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDakYsWUFBWTtBQUVaLHFDQUFxQztBQUNyQyxNQUFNLENBQU4sSUFBWSx3QkFLWDtBQUxELFdBQVksd0JBQXdCO0lBQ25DLCtDQUFtQixDQUFBO0lBQ25CLDZDQUFpQixDQUFBO0lBQ2pCLG1EQUF1QixDQUFBO0lBQ3ZCLCtDQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFMVyx3QkFBd0IsS0FBeEIsd0JBQXdCLFFBS25DO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IscURBQVMsQ0FBQTtJQUNULG1EQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLGNBQWMsS0FBZCxjQUFjLFFBRy9CO0FBaUhELFlBQVk7QUFFWix3QkFBd0I7QUFDeEIsTUFBTSxVQUFVLGNBQWMsQ0FBQyxRQUFrQztJQUNoRSxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssd0JBQXdCLENBQUMsU0FBUztZQUN0QyxPQUFPLENBQUMsQ0FBQztRQUNWLEtBQUssd0JBQXdCLENBQUMsT0FBTztZQUNwQyxPQUFPLENBQUMsQ0FBQztRQUNWLEtBQUssd0JBQXdCLENBQUMsT0FBTztZQUNwQyxPQUFPLENBQUMsQ0FBQztRQUNWLDRCQUE0QjtRQUM1QixLQUFLLHdCQUF3QixDQUFDLE1BQU0sQ0FBQztRQUNyQztZQUNDLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsV0FBMkMsRUFBRSxRQUFhO0lBQzdGLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxTQUFTO1FBQ2pCLE9BQU8sQ0FBQyxZQUFZO1FBQ3BCLE9BQU8sQ0FBQyxvQkFBb0I7UUFDNUIsT0FBTyxDQUFDLGNBQWM7S0FDdEIsQ0FBQyxDQUFDO0lBQ0gsK0RBQStEO0lBQy9ELElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUMxQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxNQUFNLFdBQVcsR0FBRyxPQUFPLFdBQVcsS0FBSyxRQUFRLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3BILENBQUM7QUFDRCxZQUFZIn0=