/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { AcceptAllInput1, AcceptAllInput2, AcceptMerge, CompareInput1WithBaseCommand, CompareInput2WithBaseCommand, GoToNextUnhandledConflict, GoToPreviousUnhandledConflict, OpenBaseFile, OpenMergeEditor, OpenResultResource, ResetToBaseAndAutoMergeCommand, SetColumnLayout, SetMixedLayout, ShowHideTopBase, ShowHideCenterBase, ShowHideBase, ShowNonConflictingChanges, ToggleActiveConflictInput1, ToggleActiveConflictInput2, ResetCloseWithConflictsChoice } from './commands/commands.js';
import { MergeEditorCopyContentsToJSON, MergeEditorLoadContentsFromFolder, MergeEditorSaveContentsToFolder } from './commands/devCommands.js';
import { MergeEditorInput } from './mergeEditorInput.js';
import { MergeEditor, MergeEditorOpenHandlerContribution, MergeEditorResolverContribution } from './view/mergeEditor.js';
import { MergeEditorSerializer } from './mergeEditorSerializer.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { MergeEditorAccessibilityHelpProvider } from './mergeEditorAccessibilityHelp.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(MergeEditor, MergeEditor.ID, localize('name', "Merge Editor")), [
    new SyncDescriptor(MergeEditorInput)
]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(MergeEditorInput.ID, MergeEditorSerializer);
Registry.as(Extensions.Configuration).registerConfiguration({
    properties: {
        'mergeEditor.diffAlgorithm': {
            type: 'string',
            enum: ['legacy', 'advanced'],
            default: 'advanced',
            markdownEnumDescriptions: [
                localize('diffAlgorithm.legacy', "Uses the legacy diffing algorithm."),
                localize('diffAlgorithm.advanced', "Uses the advanced diffing algorithm."),
            ]
        },
        'mergeEditor.showDeletionMarkers': {
            type: 'boolean',
            default: true,
            description: 'Controls if deletions in base or one of the inputs should be indicated by a vertical bar.',
        },
    }
});
registerAction2(OpenResultResource);
registerAction2(SetMixedLayout);
registerAction2(SetColumnLayout);
registerAction2(OpenMergeEditor);
registerAction2(OpenBaseFile);
registerAction2(ShowNonConflictingChanges);
registerAction2(ShowHideBase);
registerAction2(ShowHideTopBase);
registerAction2(ShowHideCenterBase);
registerAction2(GoToNextUnhandledConflict);
registerAction2(GoToPreviousUnhandledConflict);
registerAction2(ToggleActiveConflictInput1);
registerAction2(ToggleActiveConflictInput2);
registerAction2(CompareInput1WithBaseCommand);
registerAction2(CompareInput2WithBaseCommand);
registerAction2(AcceptAllInput1);
registerAction2(AcceptAllInput2);
registerAction2(ResetToBaseAndAutoMergeCommand);
registerAction2(AcceptMerge);
registerAction2(ResetCloseWithConflictsChoice);
// Dev Commands
registerAction2(MergeEditorCopyContentsToJSON);
registerAction2(MergeEditorSaveContentsToFolder);
registerAction2(MergeEditorLoadContentsFromFolder);
Registry
    .as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(MergeEditorOpenHandlerContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(MergeEditorResolverContribution.ID, MergeEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
AccessibleViewRegistry.register(new MergeEditorAccessibilityHelpProvider());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbWVyZ2VFZGl0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUFtRCw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RLLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQ04sZUFBZSxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsNEJBQTRCLEVBQzNFLDRCQUE0QixFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLFlBQVksRUFBRSxlQUFlLEVBQ3JILGtCQUFrQixFQUFFLDhCQUE4QixFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFDdEkseUJBQXlCLEVBQUUsMEJBQTBCLEVBQUUsMEJBQTBCLEVBQUUsNkJBQTZCLEVBQ2hILE1BQU0sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyxFQUFF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