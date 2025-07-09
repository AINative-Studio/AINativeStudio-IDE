/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { compress, CompressedObjectTreeModel, decompress } from '../../../../browser/ui/tree/compressedObjectTreeModel.js';
import { Iterable } from '../../../../common/iterator.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
function resolve(treeElement) {
    const result = { element: treeElement.element };
    const children = Array.from(Iterable.from(treeElement.children), resolve);
    if (treeElement.incompressible) {
        result.incompressible = true;
    }
    if (children.length > 0) {
        result.children = children;
    }
    return result;
}
suite('CompressedObjectTree', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('compress & decompress', function () {
        test('small', function () {
            const decompressed = { element: 1 };
            const compressed = { element: { elements: [1], incompressible: false } };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('no compression', function () {
            const decompressed = {
                element: 1, children: [
                    { element: 11 },
                    { element: 12 },
                    { element: 13 }
                ]
            };
            const compressed = {
                element: { elements: [1], incompressible: false },
                children: [
                    { element: { elements: [11], incompressible: false } },
                    { element: { elements: [12], incompressible: false } },
                    { element: { elements: [13], incompressible: false } }
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('single hierarchy', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, children: [
                            {
                                element: 111, children: [
                                    { element: 1111 }
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1, 11, 111, 1111], incompressible: false }
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('deep compression', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, children: [
                            {
                                element: 111, children: [
                                    { element: 1111 },
                                    { element: 1112 },
                                    { element: 1113 },
                                    { element: 1114 },
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1, 11, 111], incompressible: false },
                children: [
                    { element: { elements: [1111], incompressible: false } },
                    { element: { elements: [1112], incompressible: false } },
                    { element: { elements: [1113], incompressible: false } },
                    { element: { elements: [1114], incompressible: false } },
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('double deep compression', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, children: [
                            {
                                element: 111, children: [
                                    { element: 1112 },
                                    { element: 1113 },
                                ]
                            }
                        ]
                    },
                    {
                        element: 12, children: [
                            {
                                element: 121, children: [
                                    { element: 1212 },
                                    { element: 1213 },
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1], incompressible: false },
                children: [
                    {
                        element: { elements: [11, 111], incompressible: false },
                        children: [
                            { element: { elements: [1112], incompressible: false } },
                            { element: { elements: [1113], incompressible: false } },
                        ]
                    },
                    {
                        element: { elements: [12, 121], incompressible: false },
                        children: [
                            { element: { elements: [1212], incompressible: false } },
                            { element: { elements: [1213], incompressible: false } },
                        ]
                    }
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible leaf', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, children: [
                            {
                                element: 111, children: [
                                    { element: 1111, incompressible: true }
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1, 11, 111], incompressible: false },
                children: [
                    { element: { elements: [1111], incompressible: true } }
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible branch', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, children: [
                            {
                                element: 111, incompressible: true, children: [
                                    { element: 1111 }
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1, 11], incompressible: false },
                children: [
                    { element: { elements: [111, 1111], incompressible: true } }
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible chain', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, children: [
                            {
                                element: 111, incompressible: true, children: [
                                    { element: 1111, incompressible: true }
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1, 11], incompressible: false },
                children: [
                    {
                        element: { elements: [111], incompressible: true },
                        children: [
                            { element: { elements: [1111], incompressible: true } }
                        ]
                    }
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
        test('incompressible tree', function () {
            const decompressed = {
                element: 1, children: [
                    {
                        element: 11, incompressible: true, children: [
                            {
                                element: 111, incompressible: true, children: [
                                    { element: 1111, incompressible: true }
                                ]
                            }
                        ]
                    }
                ]
            };
            const compressed = {
                element: { elements: [1], incompressible: false },
                children: [
                    {
                        element: { elements: [11], incompressible: true },
                        children: [
                            {
                                element: { elements: [111], incompressible: true },
                                children: [
                                    { element: { elements: [1111], incompressible: true } }
                                ]
                            }
                        ]
                    }
                ]
            };
            assert.deepStrictEqual(resolve(compress(decompressed)), compressed);
            assert.deepStrictEqual(resolve(decompress(compressed)), decompressed);
        });
    });
    function bindListToModel(list, model) {
        return model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => {
            list.splice(start, deleteCount, ...elements);
        });
    }
    function toArray(list) {
        return list.map(i => i.element.elements);
    }
    suite('CompressedObjectTreeModel', function () {
        /**
         * Calls that test function twice, once with an empty options and
         * once with `diffIdentityProvider`.
         */
        function withSmartSplice(fn) {
            fn({});
            fn({ diffIdentityProvider: { getId: n => String(n) } });
        }
        test('ctor', () => {
            const model = new CompressedObjectTreeModel('test');
            assert(model);
            assert.strictEqual(model.size, 0);
        });
        test('flat', () => withSmartSplice(options => {
            const list = [];
            const model = new CompressedObjectTreeModel('test');
            const disposable = bindListToModel(list, model);
            model.setChildren(null, [
                { element: 0 },
                { element: 1 },
                { element: 2 }
            ], options);
            assert.deepStrictEqual(toArray(list), [[0], [1], [2]]);
            assert.strictEqual(model.size, 3);
            model.setChildren(null, [
                { element: 3 },
                { element: 4 },
                { element: 5 },
            ], options);
            assert.deepStrictEqual(toArray(list), [[3], [4], [5]]);
            assert.strictEqual(model.size, 3);
            model.setChildren(null, [], options);
            assert.deepStrictEqual(toArray(list), []);
            assert.strictEqual(model.size, 0);
            disposable.dispose();
        }));
        test('nested', () => withSmartSplice(options => {
            const list = [];
            const model = new CompressedObjectTreeModel('test');
            const disposable = bindListToModel(list, model);
            model.setChildren(null, [
                {
                    element: 0, children: [
                        { element: 10 },
                        { element: 11 },
                        { element: 12 },
                    ]
                },
                { element: 1 },
                { element: 2 }
            ], options);
            assert.deepStrictEqual(toArray(list), [[0], [10], [11], [12], [1], [2]]);
            assert.strictEqual(model.size, 6);
            model.setChildren(12, [
                { element: 120 },
                { element: 121 }
            ], options);
            assert.deepStrictEqual(toArray(list), [[0], [10], [11], [12], [120], [121], [1], [2]]);
            assert.strictEqual(model.size, 8);
            model.setChildren(0, [], options);
            assert.deepStrictEqual(toArray(list), [[0], [1], [2]]);
            assert.strictEqual(model.size, 3);
            model.setChildren(null, [], options);
            assert.deepStrictEqual(toArray(list), []);
            assert.strictEqual(model.size, 0);
            disposable.dispose();
        }));
        test('compressed', () => withSmartSplice(options => {
            const list = [];
            const model = new CompressedObjectTreeModel('test');
            const disposable = bindListToModel(list, model);
            model.setChildren(null, [
                {
                    element: 1, children: [{
                            element: 11, children: [{
                                    element: 111, children: [
                                        { element: 1111 },
                                        { element: 1112 },
                                        { element: 1113 },
                                    ]
                                }]
                        }]
                }
            ], options);
            assert.deepStrictEqual(toArray(list), [[1, 11, 111], [1111], [1112], [1113]]);
            assert.strictEqual(model.size, 6);
            model.setChildren(11, [
                { element: 111 },
                { element: 112 },
                { element: 113 },
            ], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113]]);
            assert.strictEqual(model.size, 5);
            model.setChildren(113, [
                { element: 1131 }
            ], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113, 1131]]);
            assert.strictEqual(model.size, 6);
            model.setChildren(1131, [
                { element: 1132 }
            ], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113, 1131, 1132]]);
            assert.strictEqual(model.size, 7);
            model.setChildren(1131, [
                { element: 1132 },
                { element: 1133 },
            ], options);
            assert.deepStrictEqual(toArray(list), [[1, 11], [111], [112], [113, 1131], [1132], [1133]]);
            assert.strictEqual(model.size, 8);
            disposable.dispose();
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL3RyZWUvY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLHlCQUF5QixFQUFFLFVBQVUsRUFBK0MsTUFBTSwwREFBMEQsQ0FBQztBQUd4SyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFRbkYsU0FBUyxPQUFPLENBQUksV0FBc0M7SUFDekQsTUFBTSxNQUFNLEdBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3JELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFMUUsSUFBSSxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDaEMsTUFBTSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QixNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztJQUM1QixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsS0FBSyxDQUFDLHNCQUFzQixFQUFFO0lBRTdCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLHVCQUF1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