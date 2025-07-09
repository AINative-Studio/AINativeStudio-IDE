/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { range } from './arrays.js';
import { CancellationTokenSource } from './cancellation.js';
import { CancellationError } from './errors.js';
function createPage(elements) {
    return {
        isResolved: !!elements,
        promise: null,
        cts: null,
        promiseIndexes: new Set(),
        elements: elements || []
    };
}
export function singlePagePager(elements) {
    return {
        firstPage: elements,
        total: elements.length,
        pageSize: elements.length,
        getPage: (pageIndex, cancellationToken) => {
            return Promise.resolve(elements);
        }
    };
}
export class PagedModel {
    get length() { return this.pager.total; }
    constructor(arg) {
        this.pages = [];
        this.pager = Array.isArray(arg) ? singlePagePager(arg) : arg;
        const totalPages = Math.ceil(this.pager.total / this.pager.pageSize);
        this.pages = [
            createPage(this.pager.firstPage.slice()),
            ...range(totalPages - 1).map(() => createPage())
        ];
    }
    isResolved(index) {
        const pageIndex = Math.floor(index / this.pager.pageSize);
        const page = this.pages[pageIndex];
        return !!page.isResolved;
    }
    get(index) {
        const pageIndex = Math.floor(index / this.pager.pageSize);
        const indexInPage = index % this.pager.pageSize;
        const page = this.pages[pageIndex];
        return page.elements[indexInPage];
    }
    resolve(index, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(new CancellationError());
        }
        const pageIndex = Math.floor(index / this.pager.pageSize);
        const indexInPage = index % this.pager.pageSize;
        const page = this.pages[pageIndex];
        if (page.isResolved) {
            return Promise.resolve(page.elements[indexInPage]);
        }
        if (!page.promise) {
            page.cts = new CancellationTokenSource();
            page.promise = this.pager.getPage(pageIndex, page.cts.token)
                .then(elements => {
                page.elements = elements;
                page.isResolved = true;
                page.promise = null;
                page.cts = null;
            }, err => {
                page.isResolved = false;
                page.promise = null;
                page.cts = null;
                return Promise.reject(err);
            });
        }
        const listener = cancellationToken.onCancellationRequested(() => {
            if (!page.cts) {
                return;
            }
            page.promiseIndexes.delete(index);
            if (page.promiseIndexes.size === 0) {
                page.cts.cancel();
            }
        });
        page.promiseIndexes.add(index);
        return page.promise.then(() => page.elements[indexInPage])
            .finally(() => listener.dispose());
    }
}
export class DelayedPagedModel {
    get length() { return this.model.length; }
    constructor(model, timeout = 500) {
        this.model = model;
        this.timeout = timeout;
    }
    isResolved(index) {
        return this.model.isResolved(index);
    }
    get(index) {
        return this.model.get(index);
    }
    resolve(index, cancellationToken) {
        return new Promise((c, e) => {
            if (cancellationToken.isCancellationRequested) {
                return e(new CancellationError());
            }
            const timer = setTimeout(() => {
                if (cancellationToken.isCancellationRequested) {
                    return e(new CancellationError());
                }
                timeoutCancellation.dispose();
                this.model.resolve(index, cancellationToken).then(c, e);
            }, this.timeout);
            const timeoutCancellation = cancellationToken.onCancellationRequested(() => {
                clearTimeout(timer);
                timeoutCancellation.dispose();
                e(new CancellationError());
            });
        });
    }
}
/**
 * Similar to array.map, `mapPager` lets you map the elements of an
 * abstract paged collection to another type.
 */
export function mapPager(pager, fn) {
    return {
        firstPage: pager.firstPage.map(fn),
        total: pager.total,
        pageSize: pager.pageSize,
        getPage: (pageIndex, token) => pager.getPage(pageIndex, token).then(r => r.map(fn))
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3BhZ2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3BDLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFvQmhELFNBQVMsVUFBVSxDQUFJLFFBQWM7SUFDcEMsT0FBTztRQUNOLFVBQVUsRUFBRSxDQUFDLENBQUMsUUFBUTtRQUN0QixPQUFPLEVBQUUsSUFBSTtRQUNiLEdBQUcsRUFBRSxJQUFJO1FBQ1QsY0FBYyxFQUFFLElBQUksR0FBRyxFQUFVO1FBQ2pDLFFBQVEsRUFBRSxRQUFRLElBQUksRUFBRTtLQUN4QixDQUFDO0FBQ0gsQ0FBQztBQVlELE1BQU0sVUFBVSxlQUFlLENBQUksUUFBYTtJQUMvQyxPQUFPO1FBQ04sU0FBUyxFQUFFLFFBQVE7UUFDbkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNO1FBQ3RCLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTTtRQUN6QixPQUFPLEVBQUUsQ0FBQyxTQUFpQixFQUFFLGlCQUFvQyxFQUFnQixFQUFFO1lBQ2xGLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUt0QixJQUFJLE1BQU0sS0FBYSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVqRCxZQUFZLEdBQW9CO1FBSnhCLFVBQUssR0FBZSxFQUFFLENBQUM7UUFLOUIsSUFBSSxD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