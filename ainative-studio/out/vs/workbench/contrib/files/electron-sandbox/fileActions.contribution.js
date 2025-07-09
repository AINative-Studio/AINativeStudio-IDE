/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isWindows, isMacintosh } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { getMultiSelectedResources, IExplorerService } from '../browser/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { revealResourcesInOS } from './fileCommands.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { appendToCommandPalette, appendEditorTitleContextMenuItem } from '../browser/fileActions.contribution.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../common/editor.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
const REVEAL_IN_OS_COMMAND_ID = 'revealFileInOS';
const REVEAL_IN_OS_LABEL = isWindows ? nls.localize2('revealInWindows', "Reveal in File Explorer") : isMacintosh ? nls.localize2('revealInMac', "Reveal in Finder") : nls.localize2('openContainer', "Open Containing Folder");
const REVEAL_IN_OS_WHEN_CONTEXT = ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeUserData));
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: REVEAL_IN_OS_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus.toNegated(),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
    win: {
        primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */
    },
    handler: (accessor, resource) => {
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
        revealResourcesInOS(resources, accessor.get(INativeHostService), accessor.get(IWorkspaceContextService));
    }
});
const REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID = 'workbench.action.files.revealActiveFileInWindows';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 48 /* KeyCode.KeyR */),
    id: REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID,
    handler: (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeInput = editorService.activeEditor;
        const resource = EditorResourceAccessor.getOriginalUri(activeInput, { filterByScheme: Schemas.file, supportSideBySide: SideBySideEditor.PRIMARY });
        const resources = resource ? [resource] : [];
        revealResourcesInOS(resources, accessor.get(INativeHostService), accessor.get(IWorkspaceContextService));
    }
});
appendEditorTitleContextMenuItem(REVEAL_IN_OS_COMMAND_ID, REVEAL_IN_OS_LABEL.value, REVEAL_IN_OS_WHEN_CONTEXT, '2_files', false, 0);
// Menu registration - open editors
const revealInOsCommand = {
    id: REVEAL_IN_OS_COMMAND_ID,
    title: REVEAL_IN_OS_LABEL.value
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContextShare, {
    title: nls.localize('miShare', "Share"),
    submenu: MenuId.MenubarShare,
    group: 'share',
    order: 3,
});
// Menu registration - explorer
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT
});
// Command Palette
const category = nls.localize2('filesCategory', "File");
appendToCommandPalette({
    id: REVEAL_IN_OS_COMMAND_ID,
    title: REVEAL_IN_OS_LABEL,
    category: category
}, REVEAL_IN_OS_WHEN_CONTEXT);
// Menu registration - chat attachments context
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT
});
// Menu registration - chat inline anchor
MenuRegistry.appendMenuItem(MenuId.ChatInlineResourceAnchorContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2VsZWN0cm9uLXNhbmRib3gvZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFaEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdDQUFnQyxFQUFFLE1BQU0s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