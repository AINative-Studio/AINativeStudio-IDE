/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObjectTreeElementCollapseState } from '../../../../../base/browser/ui/tree/tree.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { isCollapsedInSerializedTestTree } from './testingViewState.js';
import { InternalTestItem } from '../../common/testTypes.js';
let idCounter = 0;
const getId = () => String(idCounter++);
export class TestItemTreeElement {
    constructor(test, 
    /**
     * Parent tree item. May not actually be the test item who owns this one
     * in a 'flat' projection.
     */
    parent = null) {
        this.test = test;
        this.parent = parent;
        this.changeEmitter = new Emitter();
        /**
         * Fired whenever the element or test properties change.
         */
        this.onChange = this.changeEmitter.event;
        /**
         * Tree children of this item.
         */
        this.children = new Set();
        /**
         * Unique ID of the element in the tree.
         */
        this.treeId = getId();
        /**
         * Depth of the element in the tree.
         */
        this.depth = this.parent ? this.parent.depth + 1 : 0;
        /**
         * Whether the node's test result is 'retired' -- from an outdated test run.
         */
        this.retired = false;
        /**
         * State to show on the item. This is generally the item's computed state
         * from its children.
         */
        this.state = 0 /* TestResultState.Unset */;
    }
    toJSON() {
        if (this.depth === 0) {
            return { controllerId: this.test.controllerId };
        }
        const context = {
            $mid: 16 /* MarshalledId.TestItemContext */,
            tests: [InternalTestItem.serialize(this.test)],
        };
        for (let p = this.parent; p && p.depth > 0; p = p.parent) {
            context.tests.unshift(InternalTestItem.serialize(p.test));
        }
        return context;
    }
}
export class TestTreeErrorMessage {
    get description() {
        return typeof this.message === 'string' ? this.message : this.message.value;
    }
    constructor(message, parent) {
        this.message = message;
        this.parent = parent;
        this.treeId = getId();
        this.children = new Set();
    }
}
export const testIdentityProvider = {
    getId(element) {
        // For "not expandable" elements, whether they have children is part of the
        // ID so they're rerendered if that changes (#204805)
        const expandComponent = element instanceof TestTreeErrorMessage
            ? 'error'
            : element.test.expand === 0 /* TestItemExpandState.NotExpandable */
                ? !!element.children.size
                : element.test.expand;
        return element.treeId + '\0' + expandComponent;
    }
};
export const getChildrenForParent = (serialized, rootsWithChildren, node) => {
    let it;
    if (node === null) { // roots
        const rootsWithChildrenArr = [...rootsWithChildren];
        if (rootsWithChildrenArr.length === 1) {
            return getChildrenForParent(serialized, rootsWithChildrenArr, rootsWithChildrenArr[0]);
        }
        it = rootsWithChildrenArr;
    }
    else {
        it = node.children;
    }
    return Iterable.map(it, element => (element instanceof TestTreeErrorMessage
        ? { element }
        : {
            element,
            collapsible: element.test.expand !== 0 /* TestItemExpandState.NotExpandable */,
            collapsed: element.test.item.error
                ? ObjectTreeElementCollapseState.PreserveOrExpanded
                : (isCollapsedInSerializedTestTree(serialized, element.test.item.extId) ?? element.depth > 0
                    ? ObjectTreeElementCollapseState.PreserveOrCollapsed
                    : ObjectTreeElementCollapseState.PreserveOrExpanded),
            children: getChildrenForParent(serialized, rootsWithChildren, element),
        }));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBc0IsOEJBQThCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFHckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR2xFLE9BQU8sRUFBb0MsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRyxPQUFPLEVBQW9CLGdCQUFnQixFQUF3QyxNQUFNLDJCQUEyQixDQUFDO0FBb0NySCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFFbEIsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFFeEMsTUFBTSxPQUFnQixtQkFBbUI7SUE0Q3hDLFlBQ2lCLElBQXNCO0lBQ3RDOzs7T0FHRztJQUNhLFNBQXFDLElBQUk7UUFMekMsU0FBSSxHQUFKLElBQUksQ0FBa0I7UUFLdEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUM7UUFqRHZDLGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUV2RDs7V0FFRztRQUNhLGFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztRQUVwRDs7V0FFRztRQUNhLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztRQUU5RDs7V0FFRztRQUNhLFdBQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUVqQzs7V0FFRztRQUNJLFVBQUssR0FBVyxJQUFJLENB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