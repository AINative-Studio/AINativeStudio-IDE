/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
export class RowCache {
    constructor(renderers) {
        this.renderers = renderers;
        this.cache = new Map();
        this.transactionNodesPendingRemoval = new Set();
        this.inTransaction = false;
    }
    /**
     * Returns a row either by creating a new one or reusing
     * a previously released row which shares the same templateId.
     *
     * @returns A row and `isReusingConnectedDomNode` if the row's node is already in the dom in a stale position.
     */
    alloc(templateId) {
        let result = this.getTemplateCache(templateId).pop();
        let isStale = false;
        if (result) {
            isStale = this.transactionNodesPendingRemoval.has(result.domNode);
            if (isStale) {
                this.transactionNodesPendingRemoval.delete(result.domNode);
            }
        }
        else {
            const domNode = $('.monaco-list-row');
            const renderer = this.getRenderer(templateId);
            const templateData = renderer.renderTemplate(domNode);
            result = { domNode, templateId, templateData };
        }
        return { row: result, isReusingConnectedDomNode: isStale };
    }
    /**
     * Releases the row for eventual reuse.
     */
    release(row) {
        if (!row) {
            return;
        }
        this.releaseRow(row);
    }
    /**
     * Begin a set of changes that use the cache. This lets us skip work when a row is removed and then inserted again.
     */
    transact(makeChanges) {
        if (this.inTransaction) {
            throw new Error('Already in transaction');
        }
        this.inTransaction = true;
        try {
            makeChanges();
        }
        finally {
            for (const domNode of this.transactionNodesPendingRemoval) {
                this.doRemoveNode(domNode);
            }
            this.transactionNodesPendingRemoval.clear();
            this.inTransaction = false;
        }
    }
    releaseRow(row) {
        const { domNode, templateId } = row;
        if (domNode) {
            if (this.inTransaction) {
                this.transactionNodesPendingRemoval.add(domNode);
            }
            else {
                this.doRemoveNode(domNode);
            }
        }
        const cache = this.getTemplateCache(templateId);
        cache.push(row);
    }
    doRemoveNode(domNode) {
        domNode.classList.remove('scrolling');
        domNode.remove();
    }
    getTemplateCache(templateId) {
        let result = this.cache.get(templateId);
        if (!result) {
            result = [];
            this.cache.set(templateId, result);
        }
        return result;
    }
    dispose() {
        this.cache.forEach((cachedRows, templateId) => {
            for (const cachedRow of cachedRows) {
                const renderer = this.getRenderer(templateId);
                renderer.disposeTemplate(cachedRow.templateData);
                cachedRow.templateData = null;
            }
        });
        this.cache.clear();
        this.transactionNodesPendingRemoval.clear();
    }
    getRenderer(templateId) {
        const renderer = this.renderers.get(templateId);
        if (!renderer) {
            throw new Error(`No renderer found for ${templateId}`);
        }
        return renderer;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm93Q2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2xpc3Qvcm93Q2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQVVqQyxNQUFNLE9BQU8sUUFBUTtJQU9wQixZQUFvQixTQUE2QztRQUE3QyxjQUFTLEdBQVQsU0FBUyxDQUFvQztRQUx6RCxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFekIsbUNBQThCLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztRQUNqRSxrQkFBYSxHQUFHLEtBQUssQ0FBQztJQUV1QyxDQUFDO0lBRXRFOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLFVBQWtCO1FBQ3ZCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVyRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDOUMsTUFBTSxZQUFZLEdB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