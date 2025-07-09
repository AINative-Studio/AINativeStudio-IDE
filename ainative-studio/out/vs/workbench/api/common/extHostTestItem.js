/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import * as editorRange from '../../../editor/common/core/range.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { createTestItemChildren, TestItemCollection } from '../../contrib/testing/common/testItemCollection.js';
import { denamespaceTestTag } from '../../contrib/testing/common/testTypes.js';
import { createPrivateApiFor, getPrivateApiFor } from './extHostTestingPrivateApi.js';
import * as Convert from './extHostTypeConverters.js';
const testItemPropAccessor = (api, defaultValue, equals, toUpdate) => {
    let value = defaultValue;
    return {
        enumerable: true,
        configurable: false,
        get() {
            return value;
        },
        set(newValue) {
            if (!equals(value, newValue)) {
                const oldValue = value;
                value = newValue;
                api.listener?.(toUpdate(newValue, oldValue));
            }
        },
    };
};
const strictEqualComparator = (a, b) => a === b;
const propComparators = {
    range: (a, b) => {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.isEqual(b);
    },
    label: strictEqualComparator,
    description: strictEqualComparator,
    sortText: strictEqualComparator,
    busy: strictEqualComparator,
    error: strictEqualComparator,
    canResolveChildren: strictEqualComparator,
    tags: (a, b) => {
        if (a.length !== b.length) {
            return false;
        }
        if (a.some(t1 => !b.find(t2 => t1.id === t2.id))) {
            return false;
        }
        return true;
    },
};
const evSetProps = (fn) => v => ({ op: 4 /* TestItemEventOp.SetProp */, update: fn(v) });
const makePropDescriptors = (api, label) => ({
    range: (() => {
        let value;
        const updateProps = evSetProps(r => ({ range: editorRange.Range.lift(Convert.Range.from(r)) }));
        return {
            enumerable: true,
            configurable: false,
            get() {
                return value;
            },
            set(newValue) {
                api.listener?.({ op: 6 /* TestItemEventOp.DocumentSynced */ });
                if (!propComparators.range(value, newValue)) {
                    value = newValue;
                    api.listener?.(updateProps(newValue));
                }
            },
        };
    })(),
    label: testItemPropAccessor(api, label, propComparators.label, evSetProps(label => ({ label }))),
    description: testItemPropAccessor(api, undefined, propComparators.description, evSetProps(description => ({ description }))),
    sortText: testItemPropAccessor(api, undefined, propComparators.sortText, evSetProps(sortText => ({ sortText }))),
    canResolveChildren: testItemPropAccessor(api, false, propComparators.canResolveChildren, state => ({
        op: 2 /* TestItemEventOp.UpdateCanResolveChildren */,
        state,
    })),
    busy: testItemPropAccessor(api, false, propComparators.busy, evSetProps(busy => ({ busy }))),
    error: testItemPropAccessor(api, undefined, propComparators.error, evSetProps(error => ({ error: Convert.MarkdownString.fromStrict(error) || null }))),
    tags: testItemPropAccessor(api, [], propComparators.tags, (current, previous) => ({
        op: 1 /* TestItemEventOp.SetTags */,
        new: current.map(Convert.TestTag.from),
        old: previous.map(Convert.TestTag.from),
    })),
});
const toItemFromPlain = (item) => {
    const testId = TestId.fromString(item.extId);
    const testItem = new TestItemImpl(testId.controllerId, testId.localId, item.label, URI.revive(item.uri) || undefined);
    testItem.range = Convert.Range.to(item.range || undefined);
    testItem.description = item.description || undefined;
    testItem.sortText = item.sortText || undefined;
    testItem.tags = item.tags.map(t => Convert.TestTag.to({ id: denamespaceTestTag(t).tagId }));
    return testItem;
};
export const toItemFromContext = (context) => {
    let node;
    for (const test of context.tests) {
        const next = toItemFromPlain(test.item);
        getPrivateApiFor(next).parent = node;
        node = next;
    }
    return node;
};
export class TestItemImpl {
    /**
     * Note that data is deprecated and here for back-compat only
     */
    constructor(controllerId, id, label, uri) {
        if (id.includes("\0" /* TestIdPathParts.Delimiter */)) {
            throw new Error(`Test IDs may not include the ${JSON.stringify(id)} symbol`);
        }
        const api = createPrivateApiFor(this, controllerId);
        Object.defineProperties(this, {
            id: {
                value: id,
                enumerable: true,
                writable: false,
            },
            uri: {
                value: uri,
                enumerable: true,
                writable: false,
            },
            parent: {
                enumerable: false,
                get() {
                    return api.parent instanceof TestItemRootImpl ? undefined : api.parent;
                },
            },
            children: {
                value: createTestItemChildren(api, getPrivateApiFor, TestItemImpl),
                enumerable: true,
                writable: false,
            },
            ...makePropDescriptors(api, label),
        });
    }
}
export class TestItemRootImpl extends TestItemImpl {
    constructor(controllerId, label) {
        super(controllerId, controllerId, label, undefined);
        this._isRoot = true;
    }
}
export class ExtHostTestItemCollection extends TestItemCollection {
    constructor(controllerId, controllerLabel, editors) {
        super({
            controllerId,
            getDocumentVersion: uri => uri && editors.getDocument(uri)?.version,
            getApiFor: getPrivateApiFor,
            getChildren: (item) => item.children,
            root: new TestItemRootImpl(controllerId, controllerLabel),
            toITestItem: Convert.TestItem.from,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RJdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXN0SXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxLQUFLLFdBQVcsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsTUFBTSxFQUFtQixNQUFNLHdDQUF3QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBNEUsa0JBQWtCLEVBQW1CLE1BQU0sb0RBQW9ELENBQUM7QUFDM00sT0FBTyxFQUFFLGtCQUFrQixFQUErQixNQUFNLDJDQUEyQyxDQUFDO0FBRTVHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBdUIsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRyxPQUFPLEtBQUssT0FBTyxNQUFNLDRCQUE0QixDQUFDO0FBRXRELE1BQU0sb0JBQW9CLEdBQUcsQ0FDNUIsR0FBd0IsRUFDeEIsWUFBZ0MsRUFDaEMsTUFBaUUsRUFDakUsUUFBOEYsRUFDN0YsRUFBRTtJQUNILElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQztJQUN6QixPQUFPO1FBQ04sVUFBVSxFQUFFLElBQUk7UUFDaEIsWUFBWSxFQUFFLEtBQUs7UUFDbkIsR0FBRztZQUNGLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELEdBQUcsQ0FBQyxRQUE0QjtZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM5QixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLEtBQUssR0FBRyxRQUFRLENBQUM7Z0JBQ2pCLEdBQUcsQ0FBQyxR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