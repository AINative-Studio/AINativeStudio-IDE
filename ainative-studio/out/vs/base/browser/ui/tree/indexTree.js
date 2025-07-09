/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractTree } from './abstractTree.js';
import { IndexTreeModel } from './indexTreeModel.js';
import { TreeError } from './tree.js';
import { Iterable } from '../../../common/iterator.js';
import './media/tree.css';
export class IndexTree extends AbstractTree {
    constructor(user, container, delegate, renderers, rootElement, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
        this.rootElement = rootElement;
    }
    splice(location, deleteCount, toInsert = Iterable.empty()) {
        this.model.splice(location, deleteCount, toInsert);
    }
    rerender(location) {
        if (location === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(location);
    }
    updateElementHeight(location, height) {
        if (location.length === 0) {
            throw new TreeError(this.user, `Update element height failed: invalid location`);
        }
        const elementIndex = this.model.getListIndex(location);
        if (elementIndex === -1) {
            return;
        }
        this.view.updateElementHeight(elementIndex, height);
    }
    createModel(user, options) {
        return new IndexTreeModel(user, this.rootElement, options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL2luZGV4VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUF3QixNQUFNLG1CQUFtQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQTJDLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxrQkFBa0IsQ0FBQztBQUkxQixNQUFNLE9BQU8sU0FBaUMsU0FBUSxZQUFzQztJQUkzRixZQUNrQixJQUFZLEVBQzdCLFNBQXNCLEVBQ3RCLFFBQWlDLEVBQ2pDLFNBQStDLEVBQ3ZDLFdBQWMsRUFDdEIsVUFBNkMsRUFBRTtRQUUvQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBUHBDLFNBQUksR0FBSixJQUFJLENBQVE7UUFJckIsZ0JBQVcsR0FBWCxXQUFXLENBQUc7SUFJdkIsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFrQixFQUFFLFdBQW1CLEVBQUUsV0FBc0MsUUFBUSxDQUFDLEtBQUssRUFBRTtRQUNyRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxRQUFRLENBQUMsUUFBbUI7UUFDM0IsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxRQUFrQixFQUFFLE1BQWM7UUFDckQsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnREFBZ0QsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsT0FBMEM7UUFDN0UsT0FBTyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM1RCxDQUFDO0NBQ0QifQ==