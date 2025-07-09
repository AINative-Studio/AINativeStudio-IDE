/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndexTreeModel } from '../../../../browser/ui/tree/indexTreeModel.js';
import { timeout } from '../../../../common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
import { DisposableStore } from '../../../../common/lifecycle.js';
function bindListToModel(list, model) {
    return model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => {
        list.splice(start, deleteCount, ...elements);
    });
}
function toArray(list) {
    return list.map(i => i.element);
}
function toElements(node) {
    return node.children?.length ? { e: node.element, children: node.children.map(toElements) } : node.element;
}
const diffIdentityProvider = { getId: (n) => String(n) };
/**
 * Calls that test function twice, once with an empty options and
 * once with `diffIdentityProvider`.
 */
function withSmartSplice(fn) {
    fn({});
    fn({ diffIdentityProvider });
}
suite('IndexTreeModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('ctor', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        assert(model);
        assert.strictEqual(list.length, 0);
    });
    test('insert', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            { element: 0 },
            { element: 1 },
            { element: 2 }
        ], options);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 1);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        assert.deepStrictEqual(list[2].element, 2);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 1);
        disposable.dispose();
    }));
    test('deep insert', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, children: [
                    { element: 10 },
                    { element: 11 },
                    { element: 12 },
                ]
            },
            { element: 1 },
            { element: 2 }
        ]);
        assert.deepStrictEqual(list.length, 6);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 2);
        assert.deepStrictEqual(list[2].element, 11);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 2);
        assert.deepStrictEqual(list[3].element, 12);
        assert.deepStrictEqual(list[3].collapsed, false);
        assert.deepStrictEqual(list[3].depth, 2);
        assert.deepStrictEqual(list[4].element, 1);
        assert.deepStrictEqual(list[4].collapsed, false);
        assert.deepStrictEqual(list[4].depth, 1);
        assert.deepStrictEqual(list[5].element, 2);
        assert.deepStrictEqual(list[5].collapsed, false);
        assert.deepStrictEqual(list[5].depth, 1);
        disposable.dispose();
    }));
    test('deep insert collapsed', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, collapsed: true, children: [
                    { element: 10 },
                    { element: 11 },
                    { element: 12 },
                ]
            },
            { element: 1 },
            { element: 2 }
        ], options);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, true);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 1);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        assert.deepStrictEqual(list[2].element, 2);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 1);
        disposable.dispose();
    }));
    test('delete', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            { element: 0 },
            { element: 1 },
            { element: 2 }
        ], options);
        assert.deepStrictEqual(list.length, 3);
        model.splice([1], 1, undefined, options);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 2);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        model.splice([0], 2, undefined, options);
        assert.deepStrictEqual(list.length, 0);
        disposable.dispose();
    }));
    test('nested delete', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
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
        assert.deepStrictEqual(list.length, 6);
        model.splice([1], 2, undefined, options);
        assert.deepStrictEqual(list.length, 4);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 2);
        assert.deepStrictEqual(list[2].element, 11);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 2);
        assert.deepStrictEqual(list[3].element, 12);
        assert.deepStrictEqual(list[3].collapsed, false);
        assert.deepStrictEqual(list[3].depth, 2);
        disposable.dispose();
    }));
    test('deep delete', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
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
        assert.deepStrictEqual(list.length, 6);
        model.splice([0], 1, undefined, options);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 1);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 2);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        disposable.dispose();
    }));
    test('smart splice deep', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            { element: 0 },
            { element: 1 },
            { element: 2 },
            { element: 3 },
        ], { diffIdentityProvider });
        assert.deepStrictEqual(list.filter(l => l.depth === 1).map(toElements), [
            0,
            1,
            2,
            3,
        ]);
        model.splice([0], 3, [
            { element: -0.5 },
            { element: 0, children: [{ element: 0.1 }] },
            { element: 1 },
            { element: 2, children: [{ element: 2.1 }, { element: 2.2, children: [{ element: 2.21 }] }] },
        ], { diffIdentityProvider, diffDepth: Infinity });
        assert.deepStrictEqual(list.filter(l => l.depth === 1).map(toElements), [
            -0.5,
            { e: 0, children: [0.1] },
            1,
            { e: 2, children: [2.1, { e: 2.2, children: [2.21] }] },
            3,
        ]);
        disposable.dispose();
    });
    test('hidden delete', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, collapsed: true, children: [
                    { element: 10 },
                    { element: 11 },
                    { element: 12 },
                ]
            },
            { element: 1 },
            { element: 2 }
        ], options);
        assert.deepStrictEqual(list.length, 3);
        model.splice([0, 1], 1, undefined, options);
        assert.deepStrictEqual(list.length, 3);
        model.splice([0, 0], 2, undefined, options);
        assert.deepStrictEqual(list.length, 3);
        disposable.dispose();
    }));
    test('collapse', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
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
        assert.deepStrictEqual(list.length, 6);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, true);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 1);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 1);
        assert.deepStrictEqual(list[2].element, 2);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 1);
        disposable.dispose();
    }));
    test('expand', () => withSmartSplice(options => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, collapsed: true, children: [
                    { element: 10 },
                    { element: 11 },
                    { element: 12 },
                ]
            },
            { element: 1 },
            { element: 2 }
        ], options);
        assert.deepStrictEqual(list.length, 3);
        model.expandTo([0, 1]);
        assert.deepStrictEqual(list.length, 6);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[0].depth, 1);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(list[1].depth, 2);
        assert.deepStrictEqual(list[2].element, 11);
        assert.deepStrictEqual(list[2].collapsed, false);
        assert.deepStrictEqual(list[2].depth, 2);
        assert.deepStrictEqual(list[3].element, 12);
        assert.deepStrictEqual(list[3].collapsed, false);
        assert.deepStrictEqual(list[3].depth, 2);
        assert.deepStrictEqual(list[4].element, 1);
        assert.deepStrictEqual(list[4].collapsed, false);
        assert.deepStrictEqual(list[4].depth, 1);
        assert.deepStrictEqual(list[5].element, 2);
        assert.deepStrictEqual(list[5].collapsed, false);
        assert.deepStrictEqual(list[5].depth, 1);
        disposable.dispose();
    }));
    test('smart diff consistency', () => {
        const times = 500;
        const minEdits = 1;
        const maxEdits = 10;
        const maxInserts = 5;
        for (let i = 0; i < times; i++) {
            const list = [];
            const options = { diffIdentityProvider: { getId: (n) => String(n) } };
            const model = new IndexTreeModel('test', -1);
            const disposable = bindListToModel(list, model);
            const changes = [];
            const expected = [];
            let elementCounter = 0;
            for (let edits = Math.random() * (maxEdits - minEdits) + minEdits; edits > 0; edits--) {
                const spliceIndex = Math.floor(Math.random() * list.length);
                const deleteCount = Math.ceil(Math.random() * (list.length - spliceIndex));
                const insertCount = Math.floor(Math.random() * maxInserts + 1);
                const inserts = [];
                for (let i = 0; i < insertCount; i++) {
                    const element = elementCounter++;
                    inserts.push({ element, children: [] });
                }
                // move existing items
                if (Math.random() < 0.5) {
                    const elements = list.slice(spliceIndex, spliceIndex + Math.floor(deleteCount / 2));
                    inserts.push(...elements.map(({ element }) => ({ element, children: [] })));
                }
                model.splice([spliceIndex], deleteCount, inserts, options);
                expected.splice(spliceIndex, deleteCount, ...inserts.map(i => i.element));
                const listElements = list.map(l => l.element);
                changes.push(`splice(${spliceIndex}, ${deleteCount}, [${inserts.map(e => e.element).join(', ')}]) -> ${listElements.join(', ')}`);
                assert.deepStrictEqual(expected, listElements, `Expected ${listElements.join(', ')} to equal ${expected.join(', ')}. Steps:\n\n${changes.join('\n')}`);
            }
            disposable.dispose();
        }
    });
    test('collapse should recursively adjust visible count', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 1, children: [
                    {
                        element: 11, children: [
                            { element: 111 }
                        ]
                    }
                ]
            },
            {
                element: 2, children: [
                    { element: 21 }
                ]
            }
        ]);
        assert.deepStrictEqual(list.length, 5);
        assert.deepStrictEqual(toArray(list), [1, 11, 111, 2, 21]);
        model.setCollapsed([0, 0], true);
        assert.deepStrictEqual(list.length, 4);
        assert.deepStrictEqual(toArray(list), [1, 11, 2, 21]);
        model.setCollapsed([1], true);
        assert.deepStrictEqual(list.length, 3);
        assert.deepStrictEqual(toArray(list), [1, 11, 2]);
        disposable.dispose();
    });
    test('setCollapsible', () => {
        const list = [];
        const model = new IndexTreeModel('test', -1);
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, children: [
                    { element: 10 }
                ]
            }
        ]);
        assert.deepStrictEqual(list.length, 2);
        model.setCollapsible([0], false);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, false);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(model.setCollapsed([0], true), false);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, false);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(model.setCollapsed([0], false), false);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, false);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        model.setCollapsible([0], true);
        assert.deepStrictEqual(list.length, 2);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, true);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        assert.deepStrictEqual(model.setCollapsed([0], true), true);
        assert.deepStrictEqual(list.length, 1);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, true);
        assert.deepStrictEqual(list[0].collapsed, true);
        assert.deepStrictEqual(model.setCollapsed([0], false), true);
        assert.deepStrictEqual(list[0].element, 0);
        assert.deepStrictEqual(list[0].collapsible, true);
        assert.deepStrictEqual(list[0].collapsed, false);
        assert.deepStrictEqual(list[1].element, 10);
        assert.deepStrictEqual(list[1].collapsible, false);
        assert.deepStrictEqual(list[1].collapsed, false);
        disposable.dispose();
    });
    test('simple filter', () => {
        const list = [];
        const filter = new class {
            filter(element) {
                return element % 2 === 0 ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
        };
        const model = new IndexTreeModel('test', -1, { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, children: [
                    { element: 1 },
                    { element: 2 },
                    { element: 3 },
                    { element: 4 },
                    { element: 5 },
                    { element: 6 },
                    { element: 7 }
                ]
            }
        ]);
        assert.deepStrictEqual(list.length, 4);
        assert.deepStrictEqual(toArray(list), [0, 2, 4, 6]);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), [0]);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(toArray(list), [0, 2, 4, 6]);
        disposable.dispose();
    });
    test('recursive filter on initial model', () => {
        const list = [];
        const filter = new class {
            filter(element) {
                return element === 0 ? 2 /* TreeVisibility.Recurse */ : 0 /* TreeVisibility.Hidden */;
            }
        };
        const model = new IndexTreeModel('test', -1, { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, children: [
                    { element: 1 },
                    { element: 2 }
                ]
            }
        ]);
        assert.deepStrictEqual(toArray(list), []);
        disposable.dispose();
    });
    test('refilter', () => {
        const list = [];
        let shouldFilter = false;
        const filter = new class {
            filter(element) {
                return (!shouldFilter || element % 2 === 0) ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
        };
        const model = new IndexTreeModel('test', -1, { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 0, children: [
                    { element: 1 },
                    { element: 2 },
                    { element: 3 },
                    { element: 4 },
                    { element: 5 },
                    { element: 6 },
                    { element: 7 }
                ]
            },
        ]);
        assert.deepStrictEqual(toArray(list), [0, 1, 2, 3, 4, 5, 6, 7]);
        model.refilter();
        assert.deepStrictEqual(toArray(list), [0, 1, 2, 3, 4, 5, 6, 7]);
        shouldFilter = true;
        model.refilter();
        assert.deepStrictEqual(toArray(list), [0, 2, 4, 6]);
        shouldFilter = false;
        model.refilter();
        assert.deepStrictEqual(toArray(list), [0, 1, 2, 3, 4, 5, 6, 7]);
        disposable.dispose();
    });
    test('recursive filter', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new class {
            filter(element) {
                return query.test(element) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        };
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'vscode', children: [
                    { element: '.build' },
                    { element: 'git' },
                    {
                        element: 'github', children: [
                            { element: 'calendar.yml' },
                            { element: 'endgame' },
                            { element: 'build.js' },
                        ]
                    },
                    {
                        element: 'build', children: [
                            { element: 'lib' },
                            { element: 'gulpfile.js' }
                        ]
                    }
                ]
            },
        ]);
        assert.deepStrictEqual(list.length, 10);
        query = /build/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode', '.build', 'github', 'build.js', 'build']);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(toArray(list), ['vscode', '.build', 'github', 'build.js', 'build']);
        disposable.dispose();
    });
    test('recursive filter updates when children change (#133272)', async () => {
        const list = [];
        let query = '';
        const filter = new class {
            filter(element) {
                return element.includes(query) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        };
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'a',
                children: [
                    { element: 'b' },
                ],
            },
        ]);
        assert.deepStrictEqual(toArray(list), ['a', 'b']);
        query = 'visible';
        model.refilter();
        assert.deepStrictEqual(toArray(list), []);
        model.splice([0, 0, 0], 0, [
            {
                element: 'visible', children: []
            },
        ]);
        await timeout(0); // wait for refilter microtask
        assert.deepStrictEqual(toArray(list), ['a', 'b', 'visible']);
        disposable.dispose();
    });
    test('recursive filter with collapse', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new class {
            filter(element) {
                return query.test(element) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        };
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'vscode', children: [
                    { element: '.build' },
                    { element: 'git' },
                    {
                        element: 'github', children: [
                            { element: 'calendar.yml' },
                            { element: 'endgame' },
                            { element: 'build.js' },
                        ]
                    },
                    {
                        element: 'build', children: [
                            { element: 'lib' },
                            { element: 'gulpfile.js' }
                        ]
                    }
                ]
            },
        ]);
        assert.deepStrictEqual(list.length, 10);
        query = /gulp/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode', 'build', 'gulpfile.js']);
        model.setCollapsed([0, 3], true);
        assert.deepStrictEqual(toArray(list), ['vscode', 'build']);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        disposable.dispose();
    });
    test('recursive filter while collapsed', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new class {
            filter(element) {
                return query.test(element) ? 1 /* TreeVisibility.Visible */ : 2 /* TreeVisibility.Recurse */;
            }
        };
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            {
                element: 'vscode', collapsed: true, children: [
                    { element: '.build' },
                    { element: 'git' },
                    {
                        element: 'github', children: [
                            { element: 'calendar.yml' },
                            { element: 'endgame' },
                            { element: 'build.js' },
                        ]
                    },
                    {
                        element: 'build', children: [
                            { element: 'lib' },
                            { element: 'gulpfile.js' }
                        ]
                    }
                ]
            },
        ]);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        query = /gulp/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode']);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(toArray(list), ['vscode', 'build', 'gulpfile.js']);
        model.setCollapsed([0], true);
        assert.deepStrictEqual(toArray(list), ['vscode']);
        query = new RegExp('');
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['vscode']);
        model.setCollapsed([0], false);
        assert.deepStrictEqual(list.length, 10);
        disposable.dispose();
    });
    suite('getNodeLocation', () => {
        test('simple', () => {
            const list = [];
            const model = new IndexTreeModel('test', -1);
            const disposable = bindListToModel(list, model);
            model.splice([0], 0, [
                {
                    element: 0, children: [
                        { element: 10 },
                        { element: 11 },
                        { element: 12 },
                    ]
                },
                { element: 1 },
                { element: 2 }
            ]);
            assert.deepStrictEqual(model.getNodeLocation(list[0]), [0]);
            assert.deepStrictEqual(model.getNodeLocation(list[1]), [0, 0]);
            assert.deepStrictEqual(model.getNodeLocation(list[2]), [0, 1]);
            assert.deepStrictEqual(model.getNodeLocation(list[3]), [0, 2]);
            assert.deepStrictEqual(model.getNodeLocation(list[4]), [1]);
            assert.deepStrictEqual(model.getNodeLocation(list[5]), [2]);
            disposable.dispose();
        });
        test('with filter', () => {
            const list = [];
            const filter = new class {
                filter(element) {
                    return element % 2 === 0 ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
                }
            };
            const model = new IndexTreeModel('test', -1, { filter });
            const disposable = bindListToModel(list, model);
            model.splice([0], 0, [
                {
                    element: 0, children: [
                        { element: 1 },
                        { element: 2 },
                        { element: 3 },
                        { element: 4 },
                        { element: 5 },
                        { element: 6 },
                        { element: 7 }
                    ]
                }
            ]);
            assert.deepStrictEqual(model.getNodeLocation(list[0]), [0]);
            assert.deepStrictEqual(model.getNodeLocation(list[1]), [0, 1]);
            assert.deepStrictEqual(model.getNodeLocation(list[2]), [0, 3]);
            assert.deepStrictEqual(model.getNodeLocation(list[3]), [0, 5]);
            disposable.dispose();
        });
    });
    test('refilter with filtered out nodes', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new class {
            filter(element) {
                return query.test(element);
            }
        };
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            { element: 'silver' },
            { element: 'gold' },
            { element: 'platinum' }
        ]);
        assert.deepStrictEqual(toArray(list), ['silver', 'gold', 'platinum']);
        query = /platinum/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['platinum']);
        model.splice([0], Number.POSITIVE_INFINITY, [
            { element: 'silver' },
            { element: 'gold' },
            { element: 'platinum' }
        ]);
        assert.deepStrictEqual(toArray(list), ['platinum']);
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['platinum']);
        disposable.dispose();
    });
    test('explicit hidden nodes should have renderNodeCount == 0, issue #83211', () => {
        const list = [];
        let query = new RegExp('');
        const filter = new class {
            filter(element) {
                return query.test(element);
            }
        };
        const model = new IndexTreeModel('test', 'root', { filter });
        const disposable = bindListToModel(list, model);
        model.splice([0], 0, [
            { element: 'a', children: [{ element: 'aa' }] },
            { element: 'b', children: [{ element: 'bb' }] }
        ]);
        assert.deepStrictEqual(toArray(list), ['a', 'aa', 'b', 'bb']);
        assert.deepStrictEqual(model.getListIndex([0]), 0);
        assert.deepStrictEqual(model.getListIndex([0, 0]), 1);
        assert.deepStrictEqual(model.getListIndex([1]), 2);
        assert.deepStrictEqual(model.getListIndex([1, 0]), 3);
        query = /b/;
        model.refilter();
        assert.deepStrictEqual(toArray(list), ['b', 'bb']);
        assert.deepStrictEqual(model.getListIndex([0]), -1);
        assert.deepStrictEqual(model.getListIndex([0, 0]), -1);
        assert.deepStrictEqual(model.getListIndex([1]), 0);
        assert.deepStrictEqual(model.getListIndex([1, 0]), 1);
        disposable.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS90cmVlL2luZGV4VHJlZU1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBZ0QsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFN0gsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRSxTQUFTLGVBQWUsQ0FBSSxJQUFvQixFQUFFLEtBQXdCO0lBQ3pFLE9BQU8sS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7UUFDMUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUksSUFBb0I7SUFDdkMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFHRCxTQUFTLFVBQVUsQ0FBSSxJQUFrQjtJQUN4QyxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQzVHLENBQUM7QUFFRCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVqRTs7O0dBR0c7QUFDSCxTQUFTLGVBQWUsQ0FBQyxFQUFnRTtJQUN4RixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDUCxFQUFFLENBQUMsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFFNUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNqQixNQUFNLElBQUksR0FBd0IsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFTLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzlDLE1BQU0sSUFBSSxHQUF3QixFQUFFLENBQUM7UUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQVMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRCxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtTQUNkLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFWixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFSixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNuRCxNQUFNLElBQUksR0FBd0IsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFTLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFaEQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNwQjtnQkFDQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtvQkFDckIsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO29CQUNmLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtvQkFDZixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7aUJBQ2Y7YUFDRDtZQUNELEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUNkLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtTQUNkLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMs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QUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpDLFVBQVUs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Q0FBQztRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lB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WSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVqRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7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