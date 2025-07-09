/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveElement } from '../../../../base/browser/dom.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { URI } from '../../../../base/common/uri.js';
import { isEditorCommandsContext, isEditorIdentifier } from '../../../common/editor.js';
import { isEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
export function resolveCommandsContext(commandArgs, editorService, editorGroupsService, listService) {
    const commandContext = getCommandsContext(commandArgs, editorService, editorGroupsService, listService);
    const preserveFocus = commandContext.length ? commandContext[0].preserveFocus || false : false;
    const resolvedContext = { groupedEditors: [], preserveFocus };
    for (const editorContext of commandContext) {
        const groupAndEditor = getEditorAndGroupFromContext(editorContext, editorGroupsService);
        if (!groupAndEditor) {
            continue;
        }
        const { group, editor } = groupAndEditor;
        // Find group context if already added
        let groupContext = undefined;
        for (const targetGroupContext of resolvedContext.groupedEditors) {
            if (targetGroupContext.group.id === group.id) {
                groupContext = targetGroupContext;
                break;
            }
        }
        // Otherwise add new group context
        if (!groupContext) {
            groupContext = { group, editors: [] };
            resolvedContext.groupedEditors.push(groupContext);
        }
        // Add editor to group context
        if (editor) {
            groupContext.editors.push(editor);
        }
    }
    return resolvedContext;
}
function getCommandsContext(commandArgs, editorService, editorGroupsService, listService) {
    // Figure out if command is executed from a list
    const list = listService.lastFocusedList;
    let isListAction = list instanceof List && list.getHTMLElement() === getActiveElement();
    // Get editor context for which the command was triggered
    let editorContext = getEditorContextFromCommandArgs(commandArgs, isListAction, editorService, editorGroupsService, listService);
    // If the editor context can not be determind use the active editor
    if (!editorContext) {
        const activeGroup = editorGroupsService.activeGroup;
        const activeEditor = activeGroup.activeEditor;
        editorContext = { groupId: activeGroup.id, editorIndex: activeEditor ? activeGroup.getIndexOfEditor(activeEditor) : undefined };
        isListAction = false;
    }
    const multiEditorContext = getMultiSelectContext(editorContext, isListAction, editorService, editorGroupsService, listService);
    // Make sure the command context is the first one in the list
    return moveCurrentEditorContextToFront(editorContext, multiEditorContext);
}
function moveCurrentEditorContextToFront(editorContext, multiEditorContext) {
    if (multiEditorContext.length <= 1) {
        return multiEditorContext;
    }
    const editorContextIndex = multiEditorContext.findIndex(context => context.groupId === editorContext.groupId &&
        context.editorIndex === editorContext.editorIndex);
    if (editorContextIndex !== -1) {
        multiEditorContext.splice(editorContextIndex, 1);
        multiEditorContext.unshift(editorContext);
    }
    else if (editorContext.editorIndex === undefined) {
        multiEditorContext.unshift(editorContext);
    }
    else {
        throw new Error('Editor context not found in multi editor context');
    }
    return multiEditorContext;
}
function getEditorContextFromCommandArgs(commandArgs, isListAction, editorService, editorGroupsService, listService) {
    // We only know how to extraxt the command context from URI and IEditorCommandsContext arguments
    const filteredArgs = commandArgs.filter(arg => isEditorCommandsContext(arg) || URI.isUri(arg));
    // If the command arguments contain an editor context, use it
    for (const arg of filteredArgs) {
        if (isEditorCommandsContext(arg)) {
            return arg;
        }
    }
    // Otherwise, try to find the editor group by the URI of the resource
    for (const uri of filteredArgs) {
        const editorIdentifiers = editorService.findEditors(uri);
        if (editorIdentifiers.length) {
            const editorIdentifier = editorIdentifiers[0];
            const group = editorGroupsService.getGroup(editorIdentifier.groupId);
            return { groupId: editorIdentifier.groupId, editorIndex: group?.getIndexOfEditor(editorIdentifier.editor) };
        }
    }
    // If there is no context in the arguments, try to find the context from the focused list
    // if the action was executed from a list
    if (isListAction) {
        const list = listService.lastFocusedList;
        for (const focusedElement of list.getFocusedElements()) {
            if (isGroupOrEditor(focusedElement)) {
                return groupOrEditorToEditorContext(focusedElement, undefined, editorGroupsService);
            }
        }
    }
    return undefined;
}
function getMultiSelectContext(editorContext, isListAction, editorService, editorGroupsService, listService) {
    // If the action was executed from a list, return all selected editors
    if (isListAction) {
        const list = listService.lastFocusedList;
        const selection = list.getSelectedElements().filter(isGroupOrEditor);
        if (selection.length > 1) {
            return selection.map(e => groupOrEditorToEditorContext(e, editorContext.preserveFocus, editorGroupsService));
        }
        if (selection.length === 0) {
            // TODO@benibenj workaround for https://github.com/microsoft/vscode/issues/224050
            // Explainer: the `isListAction` flag can be a false positive in certain cases because
            // it will be `true` if the active element is a `List` even if it is part of the editor
            // area. The workaround here is to fallback to `isListAction: false` if the list is not
            // having any editor or group selected.
            return getMultiSelectContext(editorContext, false, editorService, editorGroupsService, listService);
        }
    }
    // Check editors selected in the group (tabs)
    else {
        const group = editorGroupsService.getGroup(editorContext.groupId);
        const editor = editorContext.editorIndex !== undefined ? group?.getEditorByIndex(editorContext.editorIndex) : group?.activeEditor;
        // If the editor is selected, return all selected editors otherwise only use the editors context
        if (group && editor && group.isSelected(editor)) {
            return group.selectedEditors.map(editor => groupOrEditorToEditorContext({ editor, groupId: group.id }, editorContext.preserveFocus, editorGroupsService));
        }
    }
    // Otherwise go with passed in context
    return [editorContext];
}
function groupOrEditorToEditorContext(element, preserveFocus, editorGroupsService) {
    if (isEditorGroup(element)) {
        return { groupId: element.id, editorIndex: undefined, preserveFocus };
    }
    const group = editorGroupsService.getGroup(element.groupId);
    return { groupId: element.groupId, editorIndex: group ? group.getIndexOfEditor(element.editor) : -1, preserveFocus };
}
function isGroupOrEditor(element) {
    return isEditorGroup(element) || isEditorIdentifier(element);
}
function getEditorAndGroupFromContext(commandContext, editorGroupsService) {
    const group = editorGroupsService.getGroup(commandContext.groupId);
    if (!group) {
        return undefined;
    }
    if (commandContext.editorIndex === undefined) {
        return { group, editor: undefined };
    }
    const editor = group.getEditorByIndex(commandContext.editorIndex);
    return { group, editor };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHNDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JDb21tYW5kc0NvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQTBCLHVCQUF1QixFQUFxQixrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRW5JLE9BQU8sRUFBc0MsYUFBYSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFXM0gsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFdBQXNCLEVBQUUsYUFBNkIsRUFBRSxtQkFBeUMsRUFBRSxXQUF5QjtJQUVqSyxNQUFNLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3hHLE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDL0YsTUFBTSxlQUFlLEdBQW1DLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQztJQUU5RixLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQzVDLE1BQU0sY0FBYyxHQUFHLDRCQUE0QixDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixTQUFTO1FBQ1YsQ0FBQztRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDO1FBRXpDLHNDQUFzQztRQUN0QyxJQUFJLFlBQVksR0FBRyxTQUFTLENBQUM7UUFDN0IsS0FBSyxNQUFNLGtCQUFrQixJQUFJLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNqRSxJQUFJLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5QyxZQUFZLEdBQUcsa0JBQWtCLENBQUM7Z0JBQ2xDLE1BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsWUFBWSxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0QyxlQUFlLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBRUQsOEJBQThCO1FBQzlCLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sZUFBZSxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFdBQXNCLEVBQUUsYUFBNkIsRUFBRSxtQkFBeUMsRUFBRSxXQUF5QjtJQUN0SixnREFBZ0Q7SUFDaEQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQztJQUN6QyxJQUFJLFlBQVksR0FBRyxJQUFJLFlBQVksSUFBSSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO0lBRXhGLHlEQUF5RDtJQUN6RCxJQUFJLGFBQWEsR0FBRywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUVoSSxtRUFBbUU7SUFDbkUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQztRQUNwRCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDO1FBQzlDLGFBQWEsR0FBRyxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEksWUFBWSxHQUFHLEtBQUssQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUUvSCw2REFBNkQ7SUFDN0QsT0FBTywrQkFBK0IsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUMzRSxDQUFDO0FBRUQsU0FBUywrQkFBK0IsQ0FBQyxhQUFxQyxFQUFFLGtCQUE0QztJQUMzSCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQyxPQUFPLGtCQUFrQixDQUFDO0lBQzNCLENBQUM7SUFFRCxNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUNqRSxPQUFPLENBQUMsT0FBTyxLQUFLLGFBQWEsQ0FBQyxPQUFPO1FBQ3pDLE9BQU8sQ0FBQyxXQUFXLEtBQUssYUFBYSxDQUFDLFdBQVcsQ0FDakQsQ0FBQztJQUVGLElBQUksa0JBQWtCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvQixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakQsa0JBQWtCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNDLENBQUM7U0FBTSxJQUFJLGFBQWEsQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDcEQsa0JBQWtCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxPQUFPLGtCQUFrQixDQUFDO0FBQzNCLENBQUM7QUFFRCxTQUFTLCtCQUErQixDQUFDLFdBQXNCLEVBQUUsWUFBcUIsRUFBRSxhQUE2QixFQUFFLG1CQUF5QyxFQUFFLFdBQXlCO0lBQzFMLGdHQUFnRztJQUNoRyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRS9GLDZEQUE2RDtJQUM3RCxLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2hDLElBQUksdUJBQXVCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUM7SUFDRixDQUFDO0lBRUQscUVBQXFFO0lBQ3JFLEtBQUssTUFBTSxHQUFHLElBQUksWUFBcUIsRUFBRSxDQUFDO1FBQ3pDLE1BQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6RCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUM3RyxDQUFDO0lBQ0YsQ0FBQztJQUVELHlGQUF5RjtJQUN6Rix5Q0FBeUM7SUFDekMsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsZUFBZ0MsQ0FBQztRQUMxRCxLQUFLLE1BQU0sY0FBYyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7WUFDeEQsSUFBSSxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsT0FBTyw0QkFBNEIsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDckYsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsYUFBcUMsRUFBRSxZQUFxQixFQUFFLGFBQTZCLEVBQUUsbUJBQXlDLEVBQUUsV0FBeUI7SUFFL0wsc0VBQXNFO0lBQ3RFLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLGVBQWdDLENBQUM7UUFDMUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXJFLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDOUcsQ0FBQztRQUVELElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixpRkFBaUY7WUFDakYsc0ZBQXNGO1lBQ3RGLHVGQUF1RjtZQUN2Rix1RkFBdUY7WUFDdkYsdUNBQXVDO1lBQ3ZDLE9BQU8scUJBQXFCLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDckcsQ0FBQztJQUNGLENBQUM7SUFDRCw2Q0FBNkM7U0FDeEMsQ0FBQztRQUNMLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEUsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUM7UUFDbEksZ0dBQWdHO1FBQ2hHLElBQUksS0FBSyxJQUFJLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakQsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsYUFBYSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0osQ0FBQztJQUNGLENBQUM7SUFFRCxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLE9BQXlDLEVBQUUsYUFBa0MsRUFBRSxtQkFBeUM7SUFDN0osSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsQ0FBQztJQUN2RSxDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUM7QUFDdEgsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLE9BQWdCO0lBQ3hDLE9BQU8sYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlELENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLGNBQXNDLEVBQUUsbUJBQXlDO0lBQ3RILE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUksY0FBYyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDO0FBQzFCLENBQUMifQ==