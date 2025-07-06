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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFRyZWVWaWV3cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBNEIsV0FBVyxFQUEyQixNQUFNLGtDQUFrQyxDQUFDO0FBRWxILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHdCQUF3QixFQUE2QixNQUFNLDBCQUEwQixDQUFDO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsd0JBQXdCLElBQUkscUJBQXFCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV6RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxTQUFTLGVBQWUsQ0FBQyxNQUE0QztJQUNwRSxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDcEMsT0FBTyxTQUFT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