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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2V4cGxvcmVyUHJvamVjdGlvbnMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFzQiw4QkFBOEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUdyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHbEUsT0FBTyxFQUFvQywrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFHLE9BQU8sRUFBb0IsZ0JBQWdCLEVBQXdDLE1BQU0sMkJBQTJCLENBQUM7QUFvQ3JILElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztBQUVsQixNQUFNLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUV4QyxNQUFNLE9BQWdCLG1CQUFtQjtJQTRDeEMsWUFDaUIsSUFBc0I7SUFDdEM7OztPQUdHO0lBQ2EsU0FBcUMsSUFBSTtRQUx6QyxTQUFJLEdBQUosSUFBSSxDQUFrQjtRQUt0QixXQUFNLEdBQU4sTUFBTSxDQUFtQztRQWpEdkMsa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBRXZEOztXQUVHO1FBQ2EsYUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO1FBRXBEOztXQUVHO1FBQ2EsYUFBUSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1FBRTlEOztXQUVHO1FBQ2EsV0FBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBRWpDOztXQUVHO1FBQ0ksVUFBSyxHQUFXLElBQUksQ0FBQyxN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