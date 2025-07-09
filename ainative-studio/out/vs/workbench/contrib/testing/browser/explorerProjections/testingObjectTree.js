/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkbenchObjectTree } from '../../../../../platform/list/browser/listService.js';
import { TestItemTreeElement } from './index.js';
import { TestId } from '../../common/testId.js';
export class TestingObjectTree extends WorkbenchObjectTree {
    /**
     * Gets a serialized view state for the tree, optimized for storage.
     *
     * @param updatePreviousState Optional previous state to mutate and update
     * instead of creating a new one.
     */
    getOptimizedViewState(updatePreviousState) {
        const root = updatePreviousState || {};
        /**
         * Recursive builder function. Returns whether the subtree has any non-default
         * value. Adds itself to the parent children if it does.
         */
        const build = (node, parent) => {
            if (!(node.element instanceof TestItemTreeElement)) {
                return false;
            }
            const localId = TestId.localId(node.element.test.item.extId);
            const inTree = parent.children?.[localId] || {};
            // only saved collapsed state if it's not the default (not collapsed, or a root depth)
            inTree.collapsed = node.depth === 0 || !node.collapsed ? node.collapsed : undefined;
            let hasAnyNonDefaultValue = inTree.collapsed !== undefined;
            if (node.children.length) {
                for (const child of node.children) {
                    hasAnyNonDefaultValue = build(child, inTree) || hasAnyNonDefaultValue;
                }
            }
            if (hasAnyNonDefaultValue) {
                parent.children ??= {};
                parent.children[localId] = inTree;
            }
            else if (parent.children?.hasOwnProperty(localId)) {
                delete parent.children[localId];
            }
            return hasAnyNonDefaultValue;
        };
        root.children ??= {};
        // Controller IDs are hidden if there's only a single test controller, but
        // make sure they're added when the tree is built if this is the case, so
        // that the later ID lookup works.
        for (const node of this.getNode().children) {
            if (node.element instanceof TestItemTreeElement) {
                if (node.element.test.controllerId === node.element.test.item.extId) {
                    build(node, root);
                }
                else {
                    const ctrlNode = root.children[node.element.test.controllerId] ??= { children: {} };
                    build(node, ctrlNode);
                }
            }
        }
        return root;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ09iamVjdFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2V4cGxvcmVyUHJvamVjdGlvbnMvdGVzdGluZ09iamVjdFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUEyQixtQkFBbUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUUxRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFHaEQsTUFBTSxPQUFPLGlCQUFzQyxTQUFRLG1CQUF5RDtJQUVuSDs7Ozs7T0FLRztJQUNJLHFCQUFxQixDQUFDLG1CQUFzRDtRQUNsRixNQUFNLElBQUksR0FBcUMsbUJBQW1CLElBQUksRUFBRSxDQUFDO1FBRXpFOzs7V0FHRztRQUNILE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBd0QsRUFBRSxNQUF3QyxFQUFXLEVBQUU7WUFDN0gsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEQsc0ZBQXNGO1lBQ3RGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFFcEYsSUFBSSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQztZQUMzRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzFCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNuQyxxQkFBcUIsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLHFCQUFxQixDQUFDO2dCQUN2RSxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDO1lBQ25DLENBQUM7aUJBQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUVELE9BQU8scUJBQXFCLENBQUM7UUFDOUIsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUM7UUFFckIsMEVBQTBFO1FBQzFFLHlFQUF5RTtRQUN6RSxrQ0FBa0M7UUFDbEMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDNUMsSUFBSSxJQUFJLENBQUMsT0FBTyxZQUFZLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2pELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDckUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7b0JBQ3BGLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEIn0=