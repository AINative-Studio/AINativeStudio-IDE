/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { OpenEditor } from '../common/files.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { ExplorerItem } from '../common/explorerModel.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { AsyncDataTree } from '../../../../base/browser/ui/tree/asyncDataTree.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { isActiveElement } from '../../../../base/browser/dom.js';
export const IExplorerService = createDecorator('explorerService');
function getFocus(listService) {
    const list = listService.lastFocusedList;
    const element = list?.getHTMLElement();
    if (element && isActiveElement(element)) {
        let focus;
        if (list instanceof List) {
            const focused = list.getFocusedElements();
            if (focused.length) {
                focus = focused[0];
            }
        }
        else if (list instanceof AsyncDataTree) {
            const focused = list.getFocus();
            if (focused.length) {
                focus = focused[0];
            }
        }
        return focus;
    }
    return undefined;
}
// Commands can get executed from a command palette, from a context menu or from some list using a keybinding
// To cover all these cases we need to properly compute the resource on which the command is being executed
export function getResourceForCommand(commandArg, editorService, listService) {
    if (URI.isUri(commandArg)) {
        return commandArg;
    }
    const focus = getFocus(listService);
    if (focus instanceof ExplorerItem) {
        return focus.resource;
    }
    else if (focus instanceof OpenEditor) {
        return focus.getResource();
    }
    return EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
}
export function getMultiSelectedResources(commandArg, listService, editorSerice, editorGroupService, explorerService) {
    const list = listService.lastFocusedList;
    const element = list?.getHTMLElement();
    if (element && isActiveElement(element)) {
        // Explorer
        if (list instanceof AsyncDataTree && list.getFocus().every(item => item instanceof ExplorerItem)) {
            // Explorer
            const context = explorerService.getContext(true, true);
            if (context.length) {
                return context.map(c => c.resource);
            }
        }
        // Open editors view
        if (list instanceof List) {
            const selection = coalesce(list.getSelectedElements().filter(s => s instanceof OpenEditor).map((oe) => oe.getResource()));
            const focusedElements = list.getFocusedElements();
            const focus = focusedElements.length ? focusedElements[0] : undefined;
            let mainUriStr = undefined;
            if (URI.isUri(commandArg)) {
                mainUriStr = commandArg.toString();
            }
            else if (focus instanceof OpenEditor) {
                const focusedResource = focus.getResource();
                mainUriStr = focusedResource ? focusedResource.toString() : undefined;
            }
            // We only respect the selection if it contains the main element.
            const mainIndex = selection.findIndex(s => s.toString() === mainUriStr);
            if (mainIndex !== -1) {
                // Move the main resource to the front of the selection.
                const mainResource = selection[mainIndex];
                selection.splice(mainIndex, 1);
                selection.unshift(mainResource);
                return selection;
            }
        }
    }
    // Check for tabs multiselect
    const activeGroup = editorGroupService.activeGroup;
    const selection = activeGroup.selectedEditors;
    if (selection.length > 1 && URI.isUri(commandArg)) {
        // If the resource is part of the tabs selection, return all selected tabs/resources.
        // It's possible that multiple tabs are selected but the action was applied to a resource that is not part of the selection.
        const mainEditorSelectionIndex = selection.findIndex(e => e.matches({ resource: commandArg }));
        if (mainEditorSelectionIndex !== -1) {
            const mainEditor = selection[mainEditorSelectionIndex];
            selection.splice(mainEditorSelectionIndex, 1);
            selection.unshift(mainEditor);
            return selection.map(editor => EditorResourceAccessor.getOriginalUri(editor)).filter(uri => !!uri);
        }
    }
    const result = getResourceForCommand(commandArg, editorSerice, listService);
    return !!result ? [result] : [];
}
export function getOpenEditorsViewMultiSelection(accessor) {
    const list = accessor.get(IListService).lastFocusedList;
    const element = list?.getHTMLElement();
    if (element && isActiveElement(element)) {
        // Open editors view
        if (list instanceof List) {
            const selection = coalesce(list.getSelectedElements().filter(s => s instanceof OpenEditor));
            const focusedElements = list.getFocusedElements();
            const focus = focusedElements.length ? focusedElements[0] : undefined;
            let mainEditor = undefined;
            if (focus instanceof OpenEditor) {
                mainEditor = focus;
            }
            // We only respect the selection if it contains the main element.
            if (selection.some(s => s === mainEditor)) {
                return selection;
            }
            return mainEditor ? [mainEditor] : undefined;
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQTJCLE1BQU0sb0JBQW9CLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFxQixNQUFNLDJCQUEyQixDQUFDO0FBQ3hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdsRixPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBRy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQThCbEUsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFDO0FBbUJyRixTQUFTLFFBQVEsQ0FBQyxXQUF5QjtJQUMxQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFDO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLElBQUksRUFBRSxjQUFjLEVBQUUsQ0FBQztJQUN2QyxJQUFJLE9BQU8sSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxJQUFJLEtBQWMsQ0FBQztRQUNuQixJQUFJLElBQUksWUFBWSxJQUFJLEVBQUUsQ0FBQztZQUMxQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMxQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxZQUFZLGFBQWEsRUFBRSxDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCw2R0FBNkc7QUFDN0csMkdBQTJHO0FBQzNHLE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxVQUFtQixFQUFFLGFBQTZCLEVBQUUsV0FBeUI7SUFDbEgsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDM0IsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNwQyxJQUFJLEtBQUssWUFBWSxZQUFZLEVBQUUsQ0FBQztRQUNuQyxPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztTQUFNLElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxPQUFPLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUMzSCxDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLFVBQW1CLEVBQUUsV0FBeUIsRUFBRSxZQUE0QixFQUFFLGtCQUF3QyxFQUFFLGVBQWlDO0lBQ2xNLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUM7SUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDO0lBQ3ZDLElBQUksT0FBTyxJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3pDLFdBQVc7UUFDWCxJQUFJLElBQUksWUFBWSxhQUFhLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksWUFBWSxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ2xHLFdBQVc7WUFDWCxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLENBQUM7UUFDRixDQUFDO1FBRUQsb0JBQW9CO1FBQ3BCLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO1lBQzFCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBYyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RJLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2xELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ3RFLElBQUksVUFBVSxHQUF1QixTQUFTLENBQUM7WUFDL0MsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEMsQ0FBQztpQkFBTSxJQUFJLEtBQUssWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM1QyxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUN2RSxDQUFDO1lBQ0QsaUVBQWlFO1lBQ2pFLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssVUFBVSxDQUFDLENBQUM7WUFDeEUsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsd0RBQXdEO2dCQUN4RCxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNoQyxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCw2QkFBNkI7SUFDN0IsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDO0lBQ25ELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUM7SUFDOUMsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDbkQscUZBQXFGO1FBQ3JGLDRIQUE0SDtRQUM1SCxNQUFNLHdCQUF3QixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRixJQUFJLHdCQUF3QixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDdkQsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlCLE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRyxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDNUUsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakMsQ0FBQztBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FBQyxRQUEwQjtJQUMxRSxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLGVBQWUsQ0FBQztJQUN4RCxNQUFNLE9BQU8sR0FBRyxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUM7SUFDdkMsSUFBSSxPQUFPLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDekMsb0JBQW9CO1FBQ3BCLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO1lBQzFCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM1RixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNsRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUN0RSxJQUFJLFVBQVUsR0FBa0MsU0FBUyxDQUFDO1lBQzFELElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLENBQUM7WUFDRCxpRUFBaUU7WUFDakUsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzNDLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQyJ9