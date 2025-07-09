/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { isEditorInputWithOptions, isEditorInput } from '../../../common/editor.js';
import { preferredSideBySideGroupDirection, IEditorGroupsService } from './editorGroupsService.js';
import { AUX_WINDOW_GROUP, SIDE_GROUP } from './editorService.js';
export function findGroup(accessor, editor, preferredGroup) {
    const editorGroupService = accessor.get(IEditorGroupsService);
    const configurationService = accessor.get(IConfigurationService);
    const group = doFindGroup(editor, preferredGroup, editorGroupService, configurationService);
    if (group instanceof Promise) {
        return group.then(group => handleGroupActivation(group, editor, preferredGroup, editorGroupService));
    }
    return handleGroupActivation(group, editor, preferredGroup, editorGroupService);
}
function handleGroupActivation(group, editor, preferredGroup, editorGroupService) {
    // Resolve editor activation strategy
    let activation = undefined;
    if (editorGroupService.activeGroup !== group && // only if target group is not already active
        editor.options && !editor.options.inactive && // never for inactive editors
        editor.options.preserveFocus && // only if preserveFocus
        typeof editor.options.activation !== 'number' && // only if activation is not already defined (either true or false)
        preferredGroup !== SIDE_GROUP // never for the SIDE_GROUP
    ) {
        // If the resolved group is not the active one, we typically
        // want the group to become active. There are a few cases
        // where we stay away from encorcing this, e.g. if the caller
        // is already providing `activation`.
        //
        // Specifically for historic reasons we do not activate a
        // group is it is opened as `SIDE_GROUP` with `preserveFocus:true`.
        // repeated Alt-clicking of files in the explorer always open
        // into the same side group and not cause a group to be created each time.
        activation = EditorActivation.ACTIVATE;
    }
    return [group, activation];
}
function doFindGroup(input, preferredGroup, editorGroupService, configurationService) {
    let group;
    const editor = isEditorInputWithOptions(input) ? input.editor : input;
    const options = input.options;
    // Group: Instance of Group
    if (preferredGroup && typeof preferredGroup !== 'number') {
        group = preferredGroup;
    }
    // Group: Specific Group
    else if (typeof preferredGroup === 'number' && preferredGroup >= 0) {
        group = editorGroupService.getGroup(preferredGroup);
    }
    // Group: Side by Side
    else if (preferredGroup === SIDE_GROUP) {
        const direction = preferredSideBySideGroupDirection(configurationService);
        let candidateGroup = editorGroupService.findGroup({ direction });
        if (!candidateGroup || isGroupLockedForEditor(candidateGroup, editor)) {
            // Create new group either when the candidate group
            // is locked or was not found in the direction
            candidateGroup = editorGroupService.addGroup(editorGroupService.activeGroup, direction);
        }
        group = candidateGroup;
    }
    // Group: Aux Window
    else if (preferredGroup === AUX_WINDOW_GROUP) {
        group = editorGroupService.createAuxiliaryEditorPart().then(group => group.activeGroup);
    }
    // Group: Unspecified without a specific index to open
    else if (!options || typeof options.index !== 'number') {
        const groupsByLastActive = editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        // Respect option to reveal an editor if it is already visible in any group
        if (options?.revealIfVisible) {
            for (const lastActiveGroup of groupsByLastActive) {
                if (isActive(lastActiveGroup, editor)) {
                    group = lastActiveGroup;
                    break;
                }
            }
        }
        // Respect option to reveal an editor if it is open (not necessarily visible)
        // Still prefer to reveal an editor in a group where the editor is active though.
        // We also try to reveal an editor if it has the `Singleton` capability which
        // indicates that the same editor cannot be opened across groups.
        if (!group) {
            if (options?.revealIfOpened || configurationService.getValue('workbench.editor.revealIfOpen') || (isEditorInput(editor) && editor.hasCapability(8 /* EditorInputCapabilities.Singleton */))) {
                let groupWithInputActive = undefined;
                let groupWithInputOpened = undefined;
                for (const group of groupsByLastActive) {
                    if (isOpened(group, editor)) {
                        if (!groupWithInputOpened) {
                            groupWithInputOpened = group;
                        }
                        if (!groupWithInputActive && group.isActive(editor)) {
                            groupWithInputActive = group;
                        }
                    }
                    if (groupWithInputOpened && groupWithInputActive) {
                        break; // we found all groups we wanted
                    }
                }
                // Prefer a target group where the input is visible
                group = groupWithInputActive || groupWithInputOpened;
            }
        }
    }
    // Fallback to active group if target not valid but avoid
    // locked editor groups unless editor is already opened there
    if (!group) {
        let candidateGroup = editorGroupService.activeGroup;
        // Locked group: find the next non-locked group
        // going up the neigbours of the group or create
        // a new group otherwise
        if (isGroupLockedForEditor(candidateGroup, editor)) {
            for (const group of editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                if (isGroupLockedForEditor(group, editor)) {
                    continue;
                }
                candidateGroup = group;
                break;
            }
            if (isGroupLockedForEditor(candidateGroup, editor)) {
                // Group is still locked, so we have to create a new
                // group to the side of the candidate group
                group = editorGroupService.addGroup(candidateGroup, preferredSideBySideGroupDirection(configurationService));
            }
            else {
                group = candidateGroup;
            }
        }
        // Non-locked group: take as is
        else {
            group = candidateGroup;
        }
    }
    return group;
}
function isGroupLockedForEditor(group, editor) {
    if (!group.isLocked) {
        // only relevant for locked editor groups
        return false;
    }
    if (isOpened(group, editor)) {
        // special case: the locked group contains
        // the provided editor. in that case we do not want
        // to open the editor in any different group.
        return false;
    }
    // group is locked for this editor
    return true;
}
function isActive(group, editor) {
    if (!group.activeEditor) {
        return false;
    }
    return group.activeEditor.matches(editor);
}
function isOpened(group, editor) {
    for (const typedEditor of group.editors) {
        if (typedEditor.matches(editor)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBGaW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9jb21tb24vZWRpdG9yR3JvdXBGaW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFaEYsT0FBTyxFQUEwQix3QkFBd0IsRUFBdUIsYUFBYSxFQUEyQixNQUFNLDJCQUEyQixDQUFDO0FBRTFKLE9BQU8sRUFBNkIsaUNBQWlDLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQXlDLFVBQVUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBY3pHLE1BQU0sVUFBVSxTQUFTLENBQUMsUUFBMEIsRUFBRSxNQUFvRCxFQUFFLGNBQTBDO0lBQ3JKLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzlELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBRWpFLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDNUYsSUFBSSxLQUFLLFlBQVksT0FBTyxFQUFFLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0lB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