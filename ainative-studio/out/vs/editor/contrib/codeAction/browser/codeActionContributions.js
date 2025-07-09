/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { editorConfigurationBaseNode } from '../../../common/config/editorConfigurationSchema.js';
import { AutoFixAction, CodeActionCommand, FixAllAction, OrganizeImportsAction, QuickFixAction, RefactorAction, SourceAction } from './codeActionCommands.js';
import { CodeActionController } from './codeActionController.js';
import { LightBulbWidget } from './lightBulbWidget.js';
import * as nls from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
registerEditorContribution(CodeActionController.ID, CodeActionController, 3 /* EditorContributionInstantiation.Eventually */);
registerEditorContribution(LightBulbWidget.ID, LightBulbWidget, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(QuickFixAction);
registerEditorAction(RefactorAction);
registerEditorAction(SourceAction);
registerEditorAction(OrganizeImportsAction);
registerEditorAction(AutoFixAction);
registerEditorAction(FixAllAction);
registerEditorCommand(new CodeActionCommand());
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionWidget.showHeaders': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('showCodeActionHeaders', "Enable/disable showing group headers in the Code Action menu."),
            default: true,
        },
    }
});
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionWidget.includeNearbyQuickFixes': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('includeNearbyQuickFixes', "Enable/disable showing nearest Quick Fix within a line when not currently on a diagnostic."),
            default: true,
        },
    }
});
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActions.triggerOnFocusChange': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: nls.localize('triggerOnFocusChange', 'Enable triggering {0} when {1} is set to {2}. Code Actions must be set to {3} to be triggered for window and focus changes.', '`#editor.codeActionsOnSave#`', '`#files.autoSave#`', '`afterDelay`', '`always`'),
            default: false,
        },
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb25Db250cmlidXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlKLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBc0IsVUFBVSxFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSwwQkFBMEIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLHFEQUE2QyxDQUFDO0FBQ3RILDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsZUFBZSwrQ0FBdUMsQ0FBQztBQUN0RyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNyQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNyQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNuQyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQzVDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3BDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ25DLHFCQUFxQixDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBRS9DLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixHQUFHLDJCQUEyQjtJQUM5QixVQUFVLEVBQUU7UUFDWCxxQ0FBcUMsRUFBRTtZQUN0QyxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLCtEQUErRCxDQUFDO1lBQ25ILE9BQU8sRUFBRSxJQUFJO1NBQ2I7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixHQUFHLDJCQUEyQjtJQUM5QixVQUFVLEVBQUU7UUFDWCxpREFBaUQsRUFBRTtZQUNsRCxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDRGQUE0RixDQUFDO1lBQ2xKLE9BQU8sRUFBRSxJQUFJO1NBQ2I7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixHQUFHLDJCQUEyQjtJQUM5QixVQUFVLEVBQUU7UUFDWCx5Q0FBeUMsRUFBRTtZQUMxQyxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsNkhBQTZILEVBQUUsOEJBQThCLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQztZQUMxUSxPQUFPLEVBQUUsS0FBSztTQUNkO0tBQ0Q7Q0FDRCxDQUFDLENBQUMifQ==