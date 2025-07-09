/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { EditorResourceAccessor, EditorExtensions, SideBySideEditor, EditorCloseContext } from '../common/editor.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { Promises } from '../../base/common/async.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkingCopyService } from '../services/workingCopy/common/workingCopyService.js';
import { Schemas } from '../../base/common/network.js';
import { Iterable } from '../../base/common/iterator.js';
import { Emitter } from '../../base/common/event.js';
/**
 * A lightweight descriptor of an editor pane. The descriptor is deferred so that heavy editor
 * panes can load lazily in the workbench.
 */
export class EditorPaneDescriptor {
    static { this.instantiatedEditorPanes = new Set(); }
    static didInstantiateEditorPane(typeId) {
        return EditorPaneDescriptor.instantiatedEditorPanes.has(typeId);
    }
    static { this._onWillInstantiateEditorPane = new Emitter(); }
    static { this.onWillInstantiateEditorPane = EditorPaneDescriptor._onWillInstantiateEditorPane.event; }
    static create(ctor, typeId, name) {
        return new EditorPaneDescriptor(ctor, typeId, name);
    }
    constructor(ctor, typeId, name) {
        this.ctor = ctor;
        this.typeId = typeId;
        this.name = name;
    }
    instantiate(instantiationService, group) {
        EditorPaneDescriptor._onWillInstantiateEditorPane.fire({ typeId: this.typeId });
        const pane = instantiationService.createInstance(this.ctor, group);
        EditorPaneDescriptor.instantiatedEditorPanes.add(this.typeId);
        return pane;
    }
    describes(editorPane) {
        return editorPane.getId() === this.typeId;
    }
}
export class EditorPaneRegistry {
    constructor() {
        this.mapEditorPanesToEditors = new Map();
        //#endregion
    }
    registerEditorPane(editorPaneDescriptor, editorDescriptors) {
        this.mapEditorPanesToEditors.set(editorPaneDescriptor, editorDescriptors);
        return toDisposable(() => {
            this.mapEditorPanesToEditors.delete(editorPaneDescriptor);
        });
    }
    getEditorPane(editor) {
        const descriptors = this.findEditorPaneDescriptors(editor);
        if (descriptors.length === 0) {
            return undefined;
        }
        if (descriptors.length === 1) {
            return descriptors[0];
        }
        return editor.prefersEditorPane(descriptors);
    }
    findEditorPaneDescriptors(editor, byInstanceOf) {
        const matchingEditorPaneDescriptors = [];
        for (const editorPane of this.mapEditorPanesToEditors.keys()) {
            const editorDescriptors = this.mapEditorPanesToEditors.get(editorPane) || [];
            for (const editorDescriptor of editorDescriptors) {
                const editorClass = editorDescriptor.ctor;
                // Direct check on constructor type (ignores prototype chain)
                if (!byInstanceOf && editor.constructor === editorClass) {
                    matchingEditorPaneDescriptors.push(editorPane);
                    break;
                }
                // Normal instanceof check
                else if (byInstanceOf && editor instanceof editorClass) {
                    matchingEditorPaneDescriptors.push(editorPane);
                    break;
                }
            }
        }
        // If no descriptors found, continue search using instanceof and prototype chain
        if (!byInstanceOf && matchingEditorPaneDescriptors.length === 0) {
            return this.findEditorPaneDescriptors(editor, true);
        }
        return matchingEditorPaneDescriptors;
    }
    //#region Used for tests only
    getEditorPaneByType(typeId) {
        return Iterable.find(this.mapEditorPanesToEditors.keys(), editor => editor.typeId === typeId);
    }
    getEditorPanes() {
        return Array.from(this.mapEditorPanesToEditors.keys());
    }
    getEditors() {
        const editorClasses = [];
        for (const editorPane of this.mapEditorPanesToEditors.keys()) {
            const editorDescriptors = this.mapEditorPanesToEditors.get(editorPane);
            if (editorDescriptors) {
                editorClasses.push(...editorDescriptors.map(editorDescriptor => editorDescriptor.ctor));
            }
        }
        return editorClasses;
    }
}
Registry.add(EditorExtensions.EditorPane, new EditorPaneRegistry());
//#endregion
//#region Editor Close Tracker
export function whenEditorClosed(accessor, resources) {
    const editorService = accessor.get(IEditorService);
    const uriIdentityService = accessor.get(IUriIdentityService);
    const workingCopyService = accessor.get(IWorkingCopyService);
    return new Promise(resolve => {
        let remainingResources = [...resources];
        // Observe any editor closing from this moment on
        const listener = editorService.onDidCloseEditor(async (event) => {
            if (event.context === EditorCloseContext.MOVE) {
                return; // ignore move events where the editor will open in another group
            }
            let primaryResource = EditorResourceAccessor.getOriginalUri(event.editor, { supportSideBySide: SideBySideEditor.PRIMARY });
            let secondaryResource = EditorResourceAccessor.getOriginalUri(event.editor, { supportSideBySide: SideBySideEditor.SECONDARY });
            // Specially handle an editor getting replaced: if the new active editor
            // matches any of the resources from the closed editor, ignore those
            // resources because they were actually not closed, but replaced.
            // (see https://github.com/microsoft/vscode/issues/134299)
            if (event.context === EditorCloseContext.REPLACE) {
                const newPrimaryResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
                const newSecondaryResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.SECONDARY });
                if (uriIdentityService.extUri.isEqual(primaryResource, newPrimaryResource)) {
                    primaryResource = undefined;
                }
                if (uriIdentityService.extUri.isEqual(secondaryResource, newSecondaryResource)) {
                    secondaryResource = undefined;
                }
            }
            // Remove from resources to wait for being closed based on the
            // resources from editors that got closed
            remainingResources = remainingResources.filter(resource => {
                // Closing editor matches resource directly: remove from remaining
                if (uriIdentityService.extUri.isEqual(resource, primaryResource) || uriIdentityService.extUri.isEqual(resource, secondaryResource)) {
                    return false;
                }
                // Closing editor is untitled with associated resource
                // that matches resource directly: remove from remaining
                // but only if the editor was not replaced, otherwise
                // saving an untitled with associated resource would
                // release the `--wait` call.
                // (see https://github.com/microsoft/vscode/issues/141237)
                if (event.context !== EditorCloseContext.REPLACE) {
                    if ((primaryResource?.scheme === Schemas.untitled && uriIdentityService.extUri.isEqual(resource, primaryResource.with({ scheme: resource.scheme }))) ||
                        (secondaryResource?.scheme === Schemas.untitled && uriIdentityService.extUri.isEqual(resource, secondaryResource.with({ scheme: resource.scheme })))) {
                        return false;
                    }
                }
                // Editor is not yet closed, so keep it in waiting mode
                return true;
            });
            // All resources to wait for being closed are closed
            if (remainingResources.length === 0) {
                // If auto save is configured with the default delay (1s) it is possible
                // to close the editor while the save still continues in the background. As such
                // we have to also check if the editors to track for are dirty and if so wait
                // for them to get saved.
                const dirtyResources = resources.filter(resource => workingCopyService.isDirty(resource));
                if (dirtyResources.length > 0) {
                    await Promises.settled(dirtyResources.map(async (resource) => await new Promise(resolve => {
                        if (!workingCopyService.isDirty(resource)) {
                            return resolve(); // return early if resource is not dirty
                        }
                        // Otherwise resolve promise when resource is saved
                        const listener = workingCopyService.onDidChangeDirty(workingCopy => {
                            if (!workingCopy.isDirty() && uriIdentityService.extUri.isEqual(resource, workingCopy.resource)) {
                                listener.dispose();
                                return resolve();
                            }
                        });
                    })));
                }
                listener.dispose();
                return resolve();
            }
        });
    });
}
//#endregion
//#region ARIA
export function computeEditorAriaLabel(input, index, group, groupCount) {
    let ariaLabel = input.getAriaLabel();
    if (group && !group.isPinned(input)) {
        ariaLabel = localize('preview', "{0}, preview", ariaLabel);
    }
    if (group?.isSticky(index ?? input)) {
        ariaLabel = localize('pinned', "{0}, pinned", ariaLabel);
    }
    // Apply group information to help identify in
    // which group we are (only if more than one group
    // is actually opened)
    if (group && typeof groupCount === 'number' && groupCount > 1) {
        ariaLabel = `${ariaLabel}, ${group.ariaLabel}`;
    }
    return ariaLabel;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBZ0Qsa0JBQWtCLEVBQW1DLE1BQU0scUJBQXFCLENBQUM7QUFHcE0sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBR3RFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBeUJyRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBRVIsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUNwRSxNQUFNLENBQUMsd0JBQXdCLENBQUMsTUFBYztRQUM3QyxPQUFPLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqRSxDQUFDO2FBRXVCLGlDQUE0QixHQUFHLElBQUksT0FBTyxFQUFtQyxDQUFDO2FBQ3RGLGdDQUEyQixHQUFHLG9CQUFvQixDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztJQUV0RyxNQUFNLENBQUMsTUFBTSxDQUNaLElBQXFFLEVBQ3JFLE1BQWMsRUFDZCxJQUFZO1FBRVosT0FBTyxJQUFJLG9CQUFvQixDQUFDLElBQXlELEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFHLENBQUM7SUFFRCxZQUNrQixJQUF1RCxFQUMvRCxNQUFjLEVBQ2QsSUFBWTtRQUZKLFNBQUksR0FBSixJQUFJLENBQW1EO1FBQy9ELFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxTQUFJLEdBQUosSUFBSSxDQUFRO0lBQ2xCLENBQUM7SUFFTCxXQUFXLENBQUMsb0JBQTJDLEVBQUUsS0FBbUI7UUFDM0Usb0JBQW9CLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25FLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsU0FBUyxDQUFDLFVBQXNCO1FBQy9CLE9BQU8sVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDM0MsQ0FBQzs7QUFHRixNQUFNLE9BQU8sa0JBQWtCO0lBQS9CO1FBRWtCLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFnRSxDQUFDO1FBNEVuSCxZQUFZO0lBQ2IsQ0FBQztJQTNFQSxrQkFBa0IsQ0FBQyxvQkFBMEMsRUFBRSxpQkFBeUQ7UUFDdkgsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFFLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsYUFBYSxDQUFDLE1BQW1CO1FBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUzRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVPLHlCQUF5QixDQUFDLE1BQW1CLEVBQUUsWUFBc0I7UUFDNUUsTUFBTSw2QkFBNkIsR0FBMkIsRUFBRSxDQUFDO1FBRWpFLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3RSxLQUFLLE1BQU0sZ0JBQWdCLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDbEQsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO2dCQUUxQyw2REFBNkQ7Z0JBQzdELElBQUksQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDekQsNkJBQTZCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMvQyxNQUFNO2dCQUNQLENBQUM7Z0JBRUQsMEJBQTBCO3FCQUNyQixJQUFJLFlBQVksSUFBSSxNQUFNLFlBQVksV0FBVyxFQUFFLENBQUM7b0JBQ3hELDZCQUE2QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDL0MsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxnRkFBZ0Y7UUFDaEYsSUFBSSxDQUFDLFlBQVksSUFBSSw2QkFBNkIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakUsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxPQUFPLDZCQUE2QixDQUFDO0lBQ3RDLENBQUM7SUFFRCw2QkFBNkI7SUFFN0IsbUJBQW1CLENBQUMsTUFBYztRQUNqQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsVUFBVTtRQUNULE1BQU0sYUFBYSxHQUFrQyxFQUFFLENBQUM7UUFDeEQsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUM5RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2QixhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztDQUdEO0FBRUQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFFcEUsWUFBWTtBQUVaLDhCQUE4QjtBQUU5QixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsUUFBMEIsRUFBRSxTQUFnQjtJQUM1RSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzdELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBRTdELE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDNUIsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFFeEMsaURBQWlEO1FBQ2pELE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUMsS0FBSyxFQUFDLEVBQUU7WUFDN0QsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMvQyxPQUFPLENBQUMsaUVBQWlFO1lBQzFFLENBQUM7WUFFRCxJQUFJLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDM0gsSUFBSSxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFFL0gsd0VBQXdFO1lBQ3hFLG9FQUFvRTtZQUNwRSxpRUFBaUU7WUFDakUsMERBQTBEO1lBQzFELElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbEQsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQzlJLE1BQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO2dCQUVsSixJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztvQkFDNUUsZUFBZSxHQUFHLFNBQVMsQ0FBQztnQkFDN0IsQ0FBQztnQkFFRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO29CQUNoRixpQkFBaUIsR0FBRyxTQUFTLENBQUM7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1lBRUQsOERBQThEO1lBQzlELHlDQUF5QztZQUN6QyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBRXpELGtFQUFrRTtnQkFDbEUsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7b0JBQ3BJLE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7Z0JBRUQsc0RBQXNEO2dCQUN0RCx3REFBd0Q7Z0JBQ3hELHFEQUFxRDtnQkFDckQsb0RBQW9EO2dCQUNwRCw2QkFBNkI7Z0JBQzdCLDBEQUEwRDtnQkFDMUQsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsRCxJQUNDLENBQUMsZUFBZSxFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsUUFBUSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDaEosQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNuSixDQUFDO3dCQUNGLE9BQU8sS0FBSyxDQUFDO29CQUNkLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCx1REFBdUQ7Z0JBQ3ZELE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLENBQUM7WUFFSCxvREFBb0Q7WUFDcEQsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBRXJDLHdFQUF3RTtnQkFDeEUsZ0ZBQWdGO2dCQUNoRiw2RUFBNkU7Z0JBQzdFLHlCQUF5QjtnQkFDekIsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUMxRixJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQy9CLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7d0JBQzdGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzs0QkFDM0MsT0FBTyxPQUFPLEVBQUUsQ0FBQyxDQUFDLHdDQUF3Qzt3QkFDM0QsQ0FBQzt3QkFFRCxtREFBbUQ7d0JBQ25ELE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFOzRCQUNsRSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dDQUNqRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0NBRW5CLE9BQU8sT0FBTyxFQUFFLENBQUM7NEJBQ2xCLENBQUM7d0JBQ0YsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNOLENBQUM7Z0JBRUQsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUVuQixPQUFPLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFlBQVk7QUFFWixjQUFjO0FBRWQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLEtBQWtCLEVBQUUsS0FBeUIsRUFBRSxLQUErQixFQUFFLFVBQThCO0lBQ3BKLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNyQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNyQyxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELElBQUksS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNyQyxTQUFTLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVELDhDQUE4QztJQUM5QyxrREFBa0Q7SUFDbEQsc0JBQXNCO0lBQ3RCLElBQUksS0FBSyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDL0QsU0FBUyxHQUFHLEdBQUcsU0FBUyxLQUFLLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELFlBQVkifQ==