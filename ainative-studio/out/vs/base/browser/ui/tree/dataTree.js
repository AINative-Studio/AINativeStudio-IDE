/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractTree } from './abstractTree.js';
import { ObjectTreeModel } from './objectTreeModel.js';
import { TreeError } from './tree.js';
import { Iterable } from '../../../common/iterator.js';
export class DataTree extends AbstractTree {
    constructor(user, container, delegate, renderers, dataSource, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
        this.dataSource = dataSource;
        this.nodesByIdentity = new Map();
        this.identityProvider = options.identityProvider;
    }
    // Model
    getInput() {
        return this.input;
    }
    setInput(input, viewState) {
        if (viewState && !this.identityProvider) {
            throw new TreeError(this.user, 'Can\'t restore tree view state without an identity provider');
        }
        this.input = input;
        if (!input) {
            this.nodesByIdentity.clear();
            this.model.setChildren(null, Iterable.empty());
            return;
        }
        if (!viewState) {
            this._refresh(input);
            return;
        }
        const focus = [];
        const selection = [];
        const isCollapsed = (element) => {
            const id = this.identityProvider.getId(element).toString();
            return !viewState.expanded[id];
        };
        const onDidCreateNode = (node) => {
            const id = this.identityProvider.getId(node.element).toString();
            if (viewState.focus.has(id)) {
                focus.push(node.element);
            }
            if (viewState.selection.has(id)) {
                selection.push(node.element);
            }
        };
        this._refresh(input, isCollapsed, onDidCreateNode);
        this.setFocus(focus);
        this.setSelection(selection);
        if (viewState && typeof viewState.scrollTop === 'number') {
            this.scrollTop = viewState.scrollTop;
        }
    }
    updateChildren(element = this.input) {
        if (typeof this.input === 'undefined') {
            throw new TreeError(this.user, 'Tree input not set');
        }
        let isCollapsed;
        if (this.identityProvider) {
            isCollapsed = element => {
                const id = this.identityProvider.getId(element).toString();
                const node = this.nodesByIdentity.get(id);
                if (!node) {
                    return undefined;
                }
                return node.collapsed;
            };
        }
        this._refresh(element, isCollapsed);
    }
    resort(element = this.input, recursive = true) {
        this.model.resort((element === this.input ? null : element), recursive);
    }
    // View
    refresh(element) {
        if (element === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(element);
    }
    // Implementation
    _refresh(element, isCollapsed, onDidCreateNode) {
        let onDidDeleteNode;
        if (this.identityProvider) {
            const insertedElements = new Set();
            const outerOnDidCreateNode = onDidCreateNode;
            onDidCreateNode = (node) => {
                const id = this.identityProvider.getId(node.element).toString();
                insertedElements.add(id);
                this.nodesByIdentity.set(id, node);
                outerOnDidCreateNode?.(node);
            };
            onDidDeleteNode = (node) => {
                const id = this.identityProvider.getId(node.element).toString();
                if (!insertedElements.has(id)) {
                    this.nodesByIdentity.delete(id);
                }
            };
        }
        this.model.setChildren((element === this.input ? null : element), this.iterate(element, isCollapsed).elements, { onDidCreateNode, onDidDeleteNode });
    }
    iterate(element, isCollapsed) {
        const children = [...this.dataSource.getChildren(element)];
        const elements = Iterable.map(children, element => {
            const { elements: children, size } = this.iterate(element, isCollapsed);
            const collapsible = this.dataSource.hasChildren ? this.dataSource.hasChildren(element) : undefined;
            const collapsed = size === 0 ? undefined : (isCollapsed && isCollapsed(element));
            return { element, children, collapsible, collapsed };
        });
        return { elements, size: children.length };
    }
    createModel(user, options) {
        return new ObjectTreeModel(user, options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvZGF0YVRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBK0MsTUFBTSxtQkFBbUIsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFnRixTQUFTLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBTXZELE1BQU0sT0FBTyxRQUF3QyxTQUFRLFlBQTZDO0lBUXpHLFlBQ1MsSUFBWSxFQUNwQixTQUFzQixFQUN0QixRQUFpQyxFQUNqQyxTQUErQyxFQUN2QyxVQUFrQyxFQUMxQyxVQUE0QyxFQUFFO1FBRTlDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBa0QsQ0FBQyxDQUFDO1FBUHhGLFNBQUksR0FBSixJQUFJLENBQVE7UUFJWixlQUFVLEdBQVYsVUFBVSxDQUF3QjtRQVBuQyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1FBV3RFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFDbEQsQ0FBQztJQUVELFFBQVE7SUFFUixRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBeUIsRUFBRSxTQUFpQztRQUNwRSxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSw2REFBNkQsQ0FBQyxDQUFDO1FBQy9GLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUVuQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMvQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sU0FBUyxHQUFRLEVBQUUsQ0FBQztRQUUxQixNQUFNLFdBQVcsR0FBRyxDQUFDLE9BQVUsRUFBRSxFQUFFO1lBQ2xDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBaUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDNUQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDO1FBRUYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxJQUErQixFQUFFLEVBQUU7WUFDM0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGdCQUFpQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFFakUsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQixDQUFDO1lBRUQsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU3QixJQUFJLFNBQVMsSUFBSSxPQUFPLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUFDLFVBQXNCLElBQUksQ0FBQyxLQUFNO1FBQy9DLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCxJQUFJLFdBQXlELENBQUM7UUFFOUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixXQUFXLEdBQUcsT0FBTyxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBaUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUUxQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ1gsT0FBTyxTQUFTLENBQUM7Z0JBQ2xCLENBQUM7Z0JBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQXNCLElBQUksQ0FBQyxLQUFNLEVBQUUsU0FBUyxHQUFHLElBQUk7UUFDekQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQsT0FBTztJQUVQLE9BQU8sQ0FBQyxPQUFXO1FBQ2xCLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsaUJBQWlCO0lBRVQsUUFBUSxDQUFDLE9BQW1CLEVBQUUsV0FBNEMsRUFBRSxlQUEyRDtRQUM5SSxJQUFJLGVBQXdFLENBQUM7UUFFN0UsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFFM0MsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQUM7WUFDN0MsZUFBZSxHQUFHLENBQUMsSUFBK0IsRUFBRSxFQUFFO2dCQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFFakUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRW5DLG9CQUFvQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsQ0FBQyxDQUFDO1lBRUYsZUFBZSxHQUFHLENBQUMsSUFBK0IsRUFBRSxFQUFFO2dCQUNyRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFFakUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakMsQ0FBQztZQUNGLENBQUMsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQzNKLENBQUM7SUFFTyxPQUFPLENBQUMsT0FBbUIsRUFBRSxXQUE0QztRQUNoRixNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUNqRCxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN4RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUNuRyxNQUFNLFNBQVMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBRWpGLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRVMsV0FBVyxDQUFDLElBQVksRUFBRSxPQUF5QztRQUM1RSxPQUFPLElBQUksZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQ0QifQ==