/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { Emitter } from '../../../../base/common/event.js';
import { ExtHostTreeViews } from '../../common/extHostTreeViews.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainContext } from '../../common/extHost.protocol.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription as extensionsDescription } from '../../../services/extensions/common/extensions.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function unBatchChildren(result) {
    if (!result || result.length === 0) {
        return undefined;
    }
    if (result.length > 1) {
        throw new Error('Unexpected result length, all tests are unbatched.');
    }
    return result[0].slice(1);
}
suite('ExtHostTreeView', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    class RecordingShape extends mock() {
        constructor() {
            super(...arguments);
            this.onRefresh = new Emitter();
        }
        async $registerTreeViewDataProvider(treeViewId) {
        }
        $refresh(viewId, itemsToRefresh) {
            return Promise.resolve(null).then(() => {
                this.onRefresh.fire(itemsToRefresh);
            });
        }
        $reveal(treeViewId, itemInfo, options) {
            return Promise.resolve();
        }
        $disposeTree(treeViewId) {
            return Promise.resolve();
        }
    }
    let testObject;
    let target;
    let onDidChangeTreeNode;
    let onDidChangeTreeNodeWithId;
    let tree;
    let labels;
    let nodes;
    setup(() => {
        tree = {
            'a': {
                'aa': {},
                'ab': {}
            },
            'b': {
                'ba': {},
                'bb': {}
            }
        };
        labels = {};
        nodes = {};
        const rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadCommands, new class extends mock() {
            $registerCommand() { }
        });
        target = new RecordingShape();
        testObject = store.add(new ExtHostTreeViews(target, new ExtHostCommands(rpcProtocol, new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        }), new NullLogService()));
        onDidChangeTreeNode = new Emitter();
        onDidChangeTreeNodeWithId = new Emitter();
        testObject.createTreeView('testNodeTreeProvider', { treeDataProvider: aNodeTreeDataProvider() }, extensionsDescription);
        testObject.createTreeView('testNodeWithIdTreeProvider', { treeDataProvider: aNodeWithIdTreeDataProvider() }, extensionsDescription);
        testObject.createTreeView('testNodeWithHighlightsTreeProvider', { treeDataProvider: aNodeWithHighlightedLabelTreeDataProvider() }, extensionsDescription);
        return loadCompleteTree('testNodeTreeProvider');
    });
    test('construct node tree', () => {
        return testObject.$getChildren('testNodeTreeProvider')
            .then(elements => {
            const actuals = unBatchChildren(elements)?.map(e => e.handle);
            assert.deepStrictEqual(actuals, ['0/0:a', '0/0:b']);
            return Promise.all([
                testObject.$getChildren('testNodeTreeProvider', ['0/0:a'])
                    .then(children => {
                    const actuals = unBatchChildren(children)?.map(e => e.handle);
                    assert.deepStrictEqual(actuals, ['0/0:a/0:aa', '0/0:a/0:ab']);
                    return Promise.all([
                        testObject.$getChildren('testNodeTreeProvider', ['0/0:a/0:aa']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject.$getChildren('testNodeTreeProvider', ['0/0:a/0:ab']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0))
                    ]);
                }),
                testObject.$getChildren('testNodeTreeProvider', ['0/0:b'])
                    .then(children => {
                    const actuals = unBatchChildren(children)?.map(e => e.handle);
                    assert.deepStrictEqual(actuals, ['0/0:b/0:ba', '0/0:b/0:bb']);
                    return Promise.all([
                        testObject.$getChildren('testNodeTreeProvider', ['0/0:b/0:ba']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject.$getChildren('testNodeTreeProvider', ['0/0:b/0:bb']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0))
                    ]);
                })
            ]);
        });
    });
    test('construct id tree', () => {
        return testObject.$getChildren('testNodeWithIdTreeProvider')
            .then(elements => {
            const actuals = unBatchChildren(elements)?.map(e => e.handle);
            assert.deepStrictEqual(actuals, ['1/a', '1/b']);
            return Promise.all([
                testObject.$getChildren('testNodeWithIdTreeProvider', ['1/a'])
                    .then(children => {
                    const actuals = unBatchChildren(children)?.map(e => e.handle);
                    assert.deepStrictEqual(actuals, ['1/aa', '1/ab']);
                    return Promise.all([
                        testObject.$getChildren('testNodeWithIdTreeProvider', ['1/aa']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject.$getChildren('testNodeWithIdTreeProvider', ['1/ab']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0))
                    ]);
                }),
                testObject.$getChildren('testNodeWithIdTreeProvider', ['1/b'])
                    .then(children => {
                    const actuals = unBatchChildren(children)?.map(e => e.handle);
                    assert.deepStrictEqual(actuals, ['1/ba', '1/bb']);
                    return Promise.all([
                        testObject.$getChildren('testNodeWithIdTreeProvider', ['1/ba']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0)),
                        testObject.$getChildren('testNodeWithIdTreeProvider', ['1/bb']).then(children => assert.strictEqual(unBatchChildren(children)?.length, 0))
                    ]);
                })
            ]);
        });
    });
    test('construct highlights tree', () => {
        return testObject.$getChildren('testNodeWithHighlightsTreeProvider')
            .then(elements => {
            assert.deepStrictEqual(removeUnsetKeys(unBatchChildren(elements)), [{
                    handle: '1/a',
                    label: { label: 'a', highlights: [[0, 2], [3, 5]] },
                    collapsibleState: TreeItemCollapsibleState.Collapsed
                }, {
                    handle: '1/b',
                    label: { label: 'b', highlights: [[0, 2], [3, 5]] },
                    collapsibleState: TreeItemCollapsibleState.Collapsed
                }]);
            return Promise.all([
                testObject.$getChildren('testNodeWithHighlightsTreeProvider', ['1/a'])
                    .then(children => {
                    assert.deepStrictEqual(removeUnsetKeys(unBatchChildren(children)), [{
                            handle: '1/aa',
                            parentHandle: '1/a',
                            label: { label: 'aa', highlights: [[0, 2], [3, 5]] },
                            collapsibleState: TreeItemCollapsibleState.None
                        }, {
                            handle: '1/ab',
                            parentHandle: '1/a',
                            label: { label: 'ab', highlights: [[0, 2], [3, 5]] },
                            collapsibleState: TreeItemCollapsibleState.None
                        }]);
                }),
                testObject.$getChildren('testNodeWithHighlightsTreeProvider', ['1/b'])
                    .then(children => {
                    assert.deepStrictEqual(removeUnsetKeys(unBatchChildren(children)), [{
                            handle: '1/ba',
                            parentHandle: '1/b',
                            label: { label: 'ba', highlights: [[0, 2], [3, 5]] },
                            collapsibleState: TreeItemCollapsibleState.None
                        }, {
                            handle: '1/bb',
                            parentHandle: '1/b',
                            label: { label: 'bb', highlights: [[0, 2], [3, 5]] },
                            collapsibleState: TreeItemCollapsibleState.None
                        }]);
                })
            ]);
        });
    });
    test('error is thrown if id is not unique', (done) => {
        tree['a'] = {
            'aa': {},
        };
        tree['b'] = {
            'aa': {},
            'ba': {}
        };
        let caughtExpectedError = false;
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeWithIdTreeProvider')
                .then(elements => {
                const actuals = unBatchChildren(elements)?.map(e => e.handle);
                assert.deepStrictEqual(actuals, ['1/a', '1/b']);
                return testObject.$getChildren('testNodeWithIdTreeProvider', ['1/a'])
                    .then(() => testObject.$getChildren('testNodeWithIdTreeProvider', ['1/b']))
                    .then(() => assert.fail('Should fail with duplicate id'))
                    .catch(() => caughtExpectedError = true)
                    .finally(() => caughtExpectedError ? done() : assert.fail('Expected duplicate id error not thrown.'));
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('refresh root', function (done) {
        store.add(target.onRefresh.event(actuals => {
            assert.strictEqual(undefined, actuals);
            done();
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('refresh a parent node', () => {
        return new Promise((c, e) => {
            store.add(target.onRefresh.event(actuals => {
                assert.deepStrictEqual(['0/0:b'], Object.keys(actuals));
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b']), {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed
                });
                c(undefined);
            }));
            onDidChangeTreeNode.fire(getNode('b'));
        });
    });
    test('refresh a leaf node', function (done) {
        store.add(target.onRefresh.event(actuals => {
            assert.deepStrictEqual(['0/0:b/0:bb'], Object.keys(actuals));
            assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b/0:bb']), {
                handle: '0/0:b/0:bb',
                parentHandle: '0/0:b',
                label: { label: 'bb' },
                collapsibleState: TreeItemCollapsibleState.None
            });
            done();
        }));
        onDidChangeTreeNode.fire(getNode('bb'));
    });
    async function runWithEventMerging(action) {
        await runWithFakedTimers({}, async () => {
            await new Promise((resolve) => {
                let subscription = undefined;
                subscription = target.onRefresh.event(() => {
                    subscription.dispose();
                    resolve();
                });
                onDidChangeTreeNode.fire(getNode('b'));
            });
            await new Promise(action);
        });
    }
    test('refresh parent and child node trigger refresh only on parent - scenario 1', async () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.deepStrictEqual(['0/0:b', '0/0:a/0:aa'], Object.keys(actuals));
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b']), {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed
                });
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:a/0:aa']), {
                    handle: '0/0:a/0:aa',
                    parentHandle: '0/0:a',
                    label: { label: 'aa' },
                    collapsibleState: TreeItemCollapsibleState.None
                });
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('aa'));
            onDidChangeTreeNode.fire(getNode('bb'));
        });
    });
    test('refresh parent and child node trigger refresh only on parent - scenario 2', async () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.deepStrictEqual(['0/0:a/0:aa', '0/0:b'], Object.keys(actuals));
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:b']), {
                    handle: '0/0:b',
                    label: { label: 'b' },
                    collapsibleState: TreeItemCollapsibleState.Collapsed
                });
                assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:a/0:aa']), {
                    handle: '0/0:a/0:aa',
                    parentHandle: '0/0:a',
                    label: { label: 'aa' },
                    collapsibleState: TreeItemCollapsibleState.None
                });
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('bb'));
            onDidChangeTreeNode.fire(getNode('aa'));
            onDidChangeTreeNode.fire(getNode('b'));
        });
    });
    test('refresh an element for label change', function (done) {
        labels['a'] = 'aa';
        store.add(target.onRefresh.event(actuals => {
            assert.deepStrictEqual(['0/0:a'], Object.keys(actuals));
            assert.deepStrictEqual(removeUnsetKeys(actuals['0/0:a']), {
                handle: '0/0:aa',
                label: { label: 'aa' },
                collapsibleState: TreeItemCollapsibleState.Collapsed
            });
            done();
        }));
        onDidChangeTreeNode.fire(getNode('a'));
    });
    test('refresh calls are throttled on roots', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.strictEqual(undefined, actuals);
                resolve();
            }));
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(undefined);
        });
    });
    test('refresh calls are throttled on elements', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.deepStrictEqual(['0/0:a', '0/0:b'], Object.keys(actuals));
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('a'));
        });
    });
    test('refresh calls are throttled on unknown elements', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.deepStrictEqual(['0/0:a', '0/0:b'], Object.keys(actuals));
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('g'));
            onDidChangeTreeNode.fire(getNode('a'));
        });
    });
    test('refresh calls are throttled on unknown elements and root', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.strictEqual(undefined, actuals);
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(getNode('g'));
            onDidChangeTreeNode.fire(undefined);
        });
    });
    test('refresh calls are throttled on elements and root', () => {
        return runWithEventMerging((resolve) => {
            store.add(target.onRefresh.event(actuals => {
                assert.strictEqual(undefined, actuals);
                resolve();
            }));
            onDidChangeTreeNode.fire(getNode('a'));
            onDidChangeTreeNode.fire(getNode('b'));
            onDidChangeTreeNode.fire(undefined);
            onDidChangeTreeNode.fire(getNode('a'));
        });
    });
    test('generate unique handles from labels by escaping them', (done) => {
        tree = {
            'a/0:b': {}
        };
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeTreeProvider')
                .then(elements => {
                assert.deepStrictEqual(unBatchChildren(elements)?.map(e => e.handle), ['0/0:a//0:b']);
                done();
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('tree with duplicate labels', (done) => {
        const dupItems = {
            'adup1': 'c',
            'adup2': 'g',
            'bdup1': 'e',
            'hdup1': 'i',
            'hdup2': 'l',
            'jdup1': 'k'
        };
        labels['c'] = 'a';
        labels['e'] = 'b';
        labels['g'] = 'a';
        labels['i'] = 'h';
        labels['l'] = 'h';
        labels['k'] = 'j';
        tree[dupItems['adup1']] = {};
        tree['d'] = {};
        const bdup1Tree = {};
        bdup1Tree['h'] = {};
        bdup1Tree[dupItems['hdup1']] = {};
        bdup1Tree['j'] = {};
        bdup1Tree[dupItems['jdup1']] = {};
        bdup1Tree[dupItems['hdup2']] = {};
        tree[dupItems['bdup1']] = bdup1Tree;
        tree['f'] = {};
        tree[dupItems['adup2']] = {};
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeTreeProvider')
                .then(elements => {
                const actuals = unBatchChildren(elements)?.map(e => e.handle);
                assert.deepStrictEqual(actuals, ['0/0:a', '0/0:b', '0/1:a', '0/0:d', '0/1:b', '0/0:f', '0/2:a']);
                return testObject.$getChildren('testNodeTreeProvider', ['0/1:b'])
                    .then(elements => {
                    const actuals = unBatchChildren(elements)?.map(e => e.handle);
                    assert.deepStrictEqual(actuals, ['0/1:b/0:h', '0/1:b/1:h', '0/1:b/0:j', '0/1:b/1:j', '0/1:b/2:h']);
                    done();
                });
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('getChildren is not returned from cache if refreshed', (done) => {
        tree = {
            'c': {}
        };
        store.add(target.onRefresh.event(() => {
            testObject.$getChildren('testNodeTreeProvider')
                .then(elements => {
                assert.deepStrictEqual(unBatchChildren(elements)?.map(e => e.handle), ['0/0:c']);
                done();
            });
        }));
        onDidChangeTreeNode.fire(undefined);
    });
    test('getChildren is returned from cache if not refreshed', () => {
        tree = {
            'c': {}
        };
        return testObject.$getChildren('testNodeTreeProvider')
            .then(elements => {
            assert.deepStrictEqual(unBatchChildren(elements)?.map(e => e.handle), ['0/0:a', '0/0:b']);
        });
    });
    test('reveal will throw an error if getParent is not implemented', () => {
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aNodeTreeDataProvider() }, extensionsDescription);
        return treeView.reveal({ key: 'a' })
            .then(() => assert.fail('Reveal should throw an error as getParent is not implemented'), () => null);
    });
    test('reveal will return empty array for root element', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: { handle: '0/0:a', label: { label: 'a' }, collapsibleState: TreeItemCollapsibleState.Collapsed },
            parentChain: []
        };
        return treeView.reveal({ key: 'a' })
            .then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected, removeUnsetKeys(revealTarget.args[0][1]));
            assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
        });
    });
    test('reveal will return parents array for an element when hierarchy is not loaded', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: { handle: '0/0:a/0:aa', label: { label: 'aa' }, collapsibleState: TreeItemCollapsibleState.None, parentHandle: '0/0:a' },
            parentChain: [{ handle: '0/0:a', label: { label: 'a' }, collapsibleState: TreeItemCollapsibleState.Collapsed }]
        };
        return treeView.reveal({ key: 'aa' })
            .then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
            assert.deepStrictEqual(expected.parentChain, (revealTarget.args[0][1].parentChain).map(arg => removeUnsetKeys(arg)));
            assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
        });
    });
    test('reveal will return parents array for an element when hierarchy is loaded', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: { handle: '0/0:a/0:aa', label: { label: 'aa' }, collapsibleState: TreeItemCollapsibleState.None, parentHandle: '0/0:a' },
            parentChain: [{ handle: '0/0:a', label: { label: 'a' }, collapsibleState: TreeItemCollapsibleState.Collapsed }]
        };
        return testObject.$getChildren('treeDataProvider')
            .then(() => testObject.$getChildren('treeDataProvider', ['0/0:a']))
            .then(() => treeView.reveal({ key: 'aa' })
            .then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
            assert.deepStrictEqual(expected.parentChain, (revealTarget.args[0][1].parentChain).map(arg => removeUnsetKeys(arg)));
            assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
        }));
    });
    test('reveal will return parents array for deeper element with no selection', () => {
        tree = {
            'b': {
                'ba': {
                    'bac': {}
                }
            }
        };
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: { handle: '0/0:b/0:ba/0:bac', label: { label: 'bac' }, collapsibleState: TreeItemCollapsibleState.None, parentHandle: '0/0:b/0:ba' },
            parentChain: [
                { handle: '0/0:b', label: { label: 'b' }, collapsibleState: TreeItemCollapsibleState.Collapsed },
                { handle: '0/0:b/0:ba', label: { label: 'ba' }, collapsibleState: TreeItemCollapsibleState.Collapsed, parentHandle: '0/0:b' }
            ]
        };
        return treeView.reveal({ key: 'bac' }, { select: false, focus: false, expand: false })
            .then(() => {
            assert.ok(revealTarget.calledOnce);
            assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
            assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
            assert.deepStrictEqual(expected.parentChain, (revealTarget.args[0][1].parentChain).map(arg => removeUnsetKeys(arg)));
            assert.deepStrictEqual({ select: false, focus: false, expand: false }, revealTarget.args[0][2]);
        });
    });
    test('reveal after first udpate', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        const expected = {
            item: { handle: '0/0:a/0:ac', label: { label: 'ac' }, collapsibleState: TreeItemCollapsibleState.None, parentHandle: '0/0:a' },
            parentChain: [{ handle: '0/0:a', label: { label: 'a' }, collapsibleState: TreeItemCollapsibleState.Collapsed }]
        };
        return loadCompleteTree('treeDataProvider')
            .then(() => {
            tree = {
                'a': {
                    'aa': {},
                    'ac': {}
                },
                'b': {
                    'ba': {},
                    'bb': {}
                }
            };
            onDidChangeTreeNode.fire(getNode('a'));
            return treeView.reveal({ key: 'ac' })
                .then(() => {
                assert.ok(revealTarget.calledOnce);
                assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
                assert.deepStrictEqual(expected.item, removeUnsetKeys(revealTarget.args[0][1].item));
                assert.deepStrictEqual(expected.parentChain, (revealTarget.args[0][1].parentChain).map(arg => removeUnsetKeys(arg)));
                assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
            });
        });
    });
    test('reveal after second udpate', () => {
        const revealTarget = sinon.spy(target, '$reveal');
        const treeView = testObject.createTreeView('treeDataProvider', { treeDataProvider: aCompleteNodeTreeDataProvider() }, extensionsDescription);
        return loadCompleteTree('treeDataProvider')
            .then(() => {
            return runWithEventMerging((resolve) => {
                tree = {
                    'a': {
                        'aa': {},
                        'ac': {}
                    },
                    'b': {
                        'ba': {},
                        'bb': {}
                    }
                };
                onDidChangeTreeNode.fire(getNode('a'));
                tree = {
                    'a': {
                        'aa': {},
                        'ac': {}
                    },
                    'b': {
                        'ba': {},
                        'bc': {}
                    }
                };
                onDidChangeTreeNode.fire(getNode('b'));
                resolve();
            }).then(() => {
                return treeView.reveal({ key: 'bc' })
                    .then(() => {
                    assert.ok(revealTarget.calledOnce);
                    assert.deepStrictEqual('treeDataProvider', revealTarget.args[0][0]);
                    assert.deepStrictEqual({ handle: '0/0:b/0:bc', label: { label: 'bc' }, collapsibleState: TreeItemCollapsibleState.None, parentHandle: '0/0:b' }, removeUnsetKeys(revealTarget.args[0][1].item));
                    assert.deepStrictEqual([{ handle: '0/0:b', label: { label: 'b' }, collapsibleState: TreeItemCollapsibleState.Collapsed }], revealTarget.args[0][1].parentChain.map(arg => removeUnsetKeys(arg)));
                    assert.deepStrictEqual({ select: true, focus: false, expand: false }, revealTarget.args[0][2]);
                });
            });
        });
    });
    function loadCompleteTree(treeId, element) {
        return testObject.$getChildren(treeId, element ? [element] : undefined)
            .then(elements => {
            if (!elements || elements?.length === 0) {
                return null;
            }
            return elements[0].slice(1).map(e => loadCompleteTree(treeId, e.handle));
        })
            .then(() => null);
    }
    function removeUnsetKeys(obj) {
        if (Array.isArray(obj)) {
            return obj.map(o => removeUnsetKeys(o));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key of Object.keys(obj)) {
                if (obj[key] !== undefined) {
                    result[key] = removeUnsetKeys(obj[key]);
                }
            }
            return result;
        }
        return obj;
    }
    function aNodeTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map(key => getNode(key));
            },
            getTreeItem: (element) => {
                return getTreeItem(element.key);
            },
            onDidChangeTreeData: onDidChangeTreeNode.event
        };
    }
    function aCompleteNodeTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map(key => getNode(key));
            },
            getTreeItem: (element) => {
                return getTreeItem(element.key);
            },
            getParent: ({ key }) => {
                const parentKey = key.substring(0, key.length - 1);
                return parentKey ? new Key(parentKey) : undefined;
            },
            onDidChangeTreeData: onDidChangeTreeNode.event
        };
    }
    function aNodeWithIdTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map(key => getNode(key));
            },
            getTreeItem: (element) => {
                const treeItem = getTreeItem(element.key);
                treeItem.id = element.key;
                return treeItem;
            },
            onDidChangeTreeData: onDidChangeTreeNodeWithId.event
        };
    }
    function aNodeWithHighlightedLabelTreeDataProvider() {
        return {
            getChildren: (element) => {
                return getChildren(element ? element.key : undefined).map(key => getNode(key));
            },
            getTreeItem: (element) => {
                const treeItem = getTreeItem(element.key, [[0, 2], [3, 5]]);
                treeItem.id = element.key;
                return treeItem;
            },
            onDidChangeTreeData: onDidChangeTreeNodeWithId.event
        };
    }
    function getTreeElement(element) {
        let parent = tree;
        for (let i = 0; i < element.length; i++) {
            parent = parent[element.substring(0, i + 1)];
            if (!parent) {
                return null;
            }
        }
        return parent;
    }
    function getChildren(key) {
        if (!key) {
            return Object.keys(tree);
        }
        const treeElement = getTreeElement(key);
        if (treeElement) {
            return Object.keys(treeElement);
        }
        return [];
    }
    function getTreeItem(key, highlights) {
        const treeElement = getTreeElement(key);
        return {
            label: { label: labels[key] || key, highlights },
            collapsibleState: treeElement && Object.keys(treeElement).length ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None
        };
    }
    function getNode(key) {
        if (!nodes[key]) {
            nodes[key] = new Key(key);
        }
        return nodes[key];
    }
    class Key {
        constructor(key) {
            this.key = key;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUcmVlVmlld3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQTRCLFdBQVcsRUFBMkIsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBNkIsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLHdCQUF3QixJQUFJLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsU0FBUyxlQUFlLENBQUMsTUFBNEM7SUFDcEUsSUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sU0FB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