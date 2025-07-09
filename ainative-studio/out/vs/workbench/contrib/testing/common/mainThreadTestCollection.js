/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { AbstractIncrementalTestCollection } from './testTypes.js';
export class MainThreadTestCollection extends AbstractIncrementalTestCollection {
    /**
     * @inheritdoc
     */
    get busyProviders() {
        return this.busyControllerCount;
    }
    /**
     * @inheritdoc
     */
    get rootItems() {
        return this.roots;
    }
    /**
     * @inheritdoc
     */
    get all() {
        return this.getIterator();
    }
    get rootIds() {
        return Iterable.map(this.roots.values(), r => r.item.extId);
    }
    constructor(uriIdentityService, expandActual) {
        super(uriIdentityService);
        this.expandActual = expandActual;
        this.testsByUrl = new ResourceMap();
        this.busyProvidersChangeEmitter = new Emitter();
        this.expandPromises = new WeakMap();
        this.onBusyProvidersChange = this.busyProvidersChangeEmitter.event;
        this.changeCollector = {
            add: node => {
                if (!node.item.uri) {
                    return;
                }
                const s = this.testsByUrl.get(node.item.uri);
                if (!s) {
                    this.testsByUrl.set(node.item.uri, new Set([node]));
                }
                else {
                    s.add(node);
                }
            },
            remove: node => {
                if (!node.item.uri) {
                    return;
                }
                const s = this.testsByUrl.get(node.item.uri);
                if (!s) {
                    return;
                }
                s.delete(node);
                if (s.size === 0) {
                    this.testsByUrl.delete(node.item.uri);
                }
            },
        };
    }
    /**
     * @inheritdoc
     */
    expand(testId, levels) {
        const test = this.items.get(testId);
        if (!test) {
            return Promise.resolve();
        }
        // simple cache to avoid duplicate/unnecessary expansion calls
        const existing = this.expandPromises.get(test);
        if (existing && existing.pendingLvl >= levels) {
            return existing.prom;
        }
        const prom = this.expandActual(test.item.extId, levels);
        const record = { doneLvl: existing ? existing.doneLvl : -1, pendingLvl: levels, prom };
        this.expandPromises.set(test, record);
        return prom.then(() => {
            record.doneLvl = levels;
        });
    }
    /**
     * @inheritdoc
     */
    getNodeById(id) {
        return this.items.get(id);
    }
    /**
     * @inheritdoc
     */
    getNodeByUrl(uri) {
        return this.testsByUrl.get(uri) || Iterable.empty();
    }
    /**
     * @inheritdoc
     */
    getReviverDiff() {
        const ops = [{ op: 4 /* TestDiffOpType.IncrementPendingExtHosts */, amount: this.pendingRootCount }];
        const queue = [this.rootIds];
        while (queue.length) {
            for (const child of queue.pop()) {
                const item = this.items.get(child);
                ops.push({
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: item.controllerId,
                        expand: item.expand,
                        item: item.item,
                    }
                });
                queue.push(item.children);
            }
        }
        return ops;
    }
    /**
     * Applies the diff to the collection.
     */
    apply(diff) {
        const prevBusy = this.busyControllerCount;
        super.apply(diff);
        if (prevBusy !== this.busyControllerCount) {
            this.busyProvidersChangeEmitter.fire(this.busyControllerCount);
        }
    }
    /**
     * Clears everything from the collection, and returns a diff that applies
     * that action.
     */
    clear() {
        const ops = [];
        for (const root of this.roots) {
            ops.push({ op: 3 /* TestDiffOpType.Remove */, itemId: root.item.extId });
        }
        this.roots.clear();
        this.items.clear();
        return ops;
    }
    /**
     * @override
     */
    createItem(internal) {
        return { ...internal, children: new Set() };
    }
    createChangeCollector() {
        return this.changeCollector;
    }
    *getIterator() {
        const queue = new LinkedList();
        queue.push(this.rootIds);
        while (queue.size > 0) {
            for (const id of queue.pop()) {
                const node = this.getNodeById(id);
                yield node;
                queue.push(node.children);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlc3RDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL21haW5UaHJlYWRUZXN0Q29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHN0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFpSSxNQUFNLGdCQUFnQixDQUFDO0FBRWxNLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxpQ0FBZ0U7SUFVN0c7O09BRUc7SUFDSCxJQUFXLGFBQWE7UUFDdkIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLEdBQUc7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2pCLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBSUQsWUFBWSxrQkFBeUMsRUFBbUIsWUFBMkQ7UUFDbEksS0FBSyxDQUFD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