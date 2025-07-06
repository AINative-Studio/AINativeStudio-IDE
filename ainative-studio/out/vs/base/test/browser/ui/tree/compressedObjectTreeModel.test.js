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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS90cmVlL2NvbXByZXNzZWRPYmplY3RUcmVlTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSx5QkFBeUIsRUFBRSxVQUFVLEVBQStDLE1BQU0sMERBQTBELENBQUM7QUFHeEssT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBUW5GLFNBQVMsT0FBTyxDQUFJLFdBQXNDO0lBQ3pELE1BQU0sTUFBTSxHQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNyRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTFFLElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQzlCLENBQUM7SUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDNUIsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVELEtBQUssQ0FBQyxzQkFBc0IsRUFBRTtJQUU3Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRTtRQUU5QixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2IsTUFBTSxZQUFZLEdBQW1DLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3BFLE1BQU0sVUFBVSxHQUNmLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFFdkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDdEIsTUFBTSxZQUFZLEdBQW1DO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckIsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO29CQUNmLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtvQkFDZixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7aUJBQ2Y7YUFDRCxDQUFDO1lBRUYsTUFBTSxVQUFVLEdBQWdFO2dCQUMvRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1QsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEVBQUU7b0JBQ3RELEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUFFO29CQUN0RCxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsRUFBRTtpQkFDdEQ7YUFDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDeEIsTUFBTSxZQUFZLEdBQW1DO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckI7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7NEJBQ3RCO2dDQUNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFO29DQUN2QixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7aUNBQ2pCOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQztZQUVGLE1BQU0sVUFBVSxHQUFnRTtnQkFDL0UsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTthQUNoRSxDQUFDO1lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDeEIsTUFBTSxZQUFZLEdBQW1DO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckI7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7NEJBQ3RCO2dDQUNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFO29DQUN2QixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7b0NBQ2pCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtvQ0FDakIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO29DQUNqQixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7aUNBQ2pCOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQztZQUVGLE1BQU0sVUFBVSxHQUFnRTtnQkFDL0UsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO2dCQUMxRCxRQUFRLEVBQUU7b0JBQ1QsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEVBQUU7b0JBQ3hELEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUFFO29CQUN4RCxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDeEQsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEVBQUU7aUJBQ3hEO2FBQ0QsQ0FBQztZQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1lBQy9CLE1BQU0sWUFBWSxHQUFtQztnQkFDcEQsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUU7b0JBQ3JCO3dCQUNDLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFOzRCQUN0QjtnQ0FDQyxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRTtvQ0FDdkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO29DQUNqQixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7aUNBQ2pCOzZCQUNEO3lCQUNEO3FCQUNEO29CQUNEO3dCQUNDLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFOzRCQUN0QjtnQ0FDQyxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRTtvQ0FDdkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO29DQUNqQixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7aUNBQ2pCOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQztZQUVGLE1BQU0sVUFBVSxHQUFnRTtnQkFDL0UsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTtnQkFDakQsUUFBUSxFQUFFO29CQUNUO3dCQUNDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO3dCQUN2RCxRQUFRLEVBQUU7NEJBQ1QsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEVBQUU7NEJBQ3hELEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUFFO3lCQUN4RDtxQkFDRDtvQkFDRDt3QkFDQyxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTt3QkFDdkQsUUFBUSxFQUFFOzRCQUNULEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUFFOzRCQUN4RCxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsRUFBRTt5QkFDeEQ7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUU7WUFDM0IsTUFBTSxZQUFZLEdBQW1DO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckI7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7NEJBQ3RCO2dDQUNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFO29DQUN2QixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRTtpQ0FDdkM7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDO1lBRUYsTUFBTSxVQUFVLEdBQWdFO2dCQUMvRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUU7Z0JBQzFELFFBQVEsRUFBRTtvQkFDVCxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsRUFBRTtpQkFDdkQ7YUFDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUU7WUFDN0IsTUFBTSxZQUFZLEdBQW1DO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckI7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7NEJBQ3RCO2dDQUNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7b0NBQzdDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtpQ0FDakI7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDO1lBRUYsTUFBTSxVQUFVLEdBQWdFO2dCQUMvRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTtnQkFDckQsUUFBUSxFQUFFO29CQUNULEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsRUFBRTtpQkFDNUQ7YUFDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUU7WUFDNUIsTUFBTSxZQUFZLEdBQW1DO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckI7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7NEJBQ3RCO2dDQUNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7b0NBQzdDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFO2lDQUN2Qzs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDthQUNELENBQUM7WUFFRixNQUFNLFVBQVUsR0FBZ0U7Z0JBQy9FLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO2dCQUNyRCxRQUFRLEVBQUU7b0JBQ1Q7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRTt3QkFDbEQsUUFBUSxFQUFFOzRCQUNULEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxFQUFFO3lCQUN2RDtxQkFDRDtpQkFDRDthQUNELENBQUM7WUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNwRSxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRTtZQUMzQixNQUFNLFlBQVksR0FBbUM7Z0JBQ3BELE9BQU8sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFO29CQUNyQjt3QkFDQyxPQUFPLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzRCQUM1QztnQ0FDQyxPQUFPLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO29DQUM3QyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRTtpQ0FDdkM7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDO1lBRUYsTUFBTSxVQUFVLEdBQWdFO2dCQUMvRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1Q7d0JBQ0MsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRTt3QkFDakQsUUFBUSxFQUFFOzRCQUNUO2dDQUNDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUU7Z0NBQ2xELFFBQVEsRUFBRTtvQ0FDVCxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsRUFBRTtpQ0FDdkQ7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDO1lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsZUFBZSxDQUFJLElBQW9CLEVBQUUsS0FBOEI7UUFDL0UsT0FBTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtZQUMxRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLE9BQU8sQ0FBSSxJQUF5QztRQUM1RCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLEVBQUU7UUFFbEM7OztXQUdHO1FBQ0gsU0FBUyxlQUFlLENBQUMsRUFBc0U7WUFDOUYsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1AsRUFBRSxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUdELElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ2pCLE1BQU0sS0FBSyxHQUFHLElBQUkseUJBQXlCLENBQVMsTUFBTSxDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDNUMsTUFBTSxJQUFJLEdBQTZDLEVBQUUsQ0FBQztZQUMxRCxNQUFNLEtBQUssR0FBRyxJQUFJLHlCQUF5QixDQUFTLE1BQU0sQ0FBQyxDQUFDO1lBQzVELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFaEQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3ZCLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtnQkFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7Z0JBQ2QsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO2FBQ2QsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVaLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtnQkFDdkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO2dCQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtnQkFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7YUFDZCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRVosTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbEMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM5QyxNQUFNLElBQUksR0FBNkMsRUFBRSxDQUFDO1lBQzFELE1BQU0sS0FBSyxHQUFHLElBQUkseUJBQXlCLENBQVMsTUFBTSxDQUFDLENBQUM7WUFDNUQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVoRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtnQkFDdkI7b0JBQ0MsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUU7d0JBQ3JCLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTt3QkFDZixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7d0JBQ2YsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO3FCQUNmO2lCQUNEO2dCQUNELEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtnQkFDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7YUFDZCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRVosTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFO2dCQUNyQixFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTthQUNoQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRVosTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbEMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNsRCxNQUFNLElBQUksR0FBNkMsRUFBRSxDQUFDO1lBQzFELE1BQU0sS0FBSyxHQUFHLElBQUkseUJBQXlCLENBQVMsTUFBTSxDQUFDLENBQUM7WUFDNUQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVoRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtnQkFDdkI7b0JBQ0MsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQzs0QkFDdEIsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQztvQ0FDdkIsT0FBTyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUU7d0NBQ3ZCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTt3Q0FDakIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO3dDQUNqQixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7cUNBQ2pCO2lDQUNELENBQUM7eUJBQ0YsQ0FBQztpQkFDRjthQUNELEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFWixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFO2dCQUNyQixFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDaEIsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO2FBQ2hCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFWixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3RCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTthQUNqQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRVosTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtnQkFDdkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO2FBQ2pCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFWixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtnQkFDdkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO2dCQUNqQixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7YUFDakIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVaLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9