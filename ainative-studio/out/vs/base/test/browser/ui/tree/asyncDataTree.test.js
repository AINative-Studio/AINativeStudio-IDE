/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncDataTree, CompressibleAsyncDataTree } from '../../../../browser/ui/tree/asyncDataTree.js';
import { timeout } from '../../../../common/async.js';
import { Iterable } from '../../../../common/iterator.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
import { runWithFakedTimers } from '../../../common/timeTravelScheduler.js';
function find(element, id) {
    if (element.id === id) {
        return element;
    }
    if (!element.children) {
        return undefined;
    }
    for (const child of element.children) {
        const result = find(child, id);
        if (result) {
            return result;
        }
    }
    return undefined;
}
class Renderer {
    constructor() {
        this.templateId = 'default';
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(element, index, templateData) {
        templateData.textContent = element.element.id + (element.element.suffix || '');
    }
    disposeTemplate(templateData) {
        // noop
    }
    renderCompressedElements(node, index, templateData, height) {
        const result = [];
        for (const element of node.element.elements) {
            result.push(element.id + (element.suffix || ''));
        }
        templateData.textContent = result.join('/');
    }
}
class IdentityProvider {
    getId(element) {
        return element.id;
    }
}
class VirtualDelegate {
    getHeight() { return 20; }
    getTemplateId(element) { return 'default'; }
}
class DataSource {
    hasChildren(element) {
        return !!element.children && element.children.length > 0;
    }
    getChildren(element) {
        return Promise.resolve(element.children || []);
    }
}
class Model {
    constructor(root) {
        this.root = root;
    }
    get(id) {
        const result = find(this.root, id);
        if (!result) {
            throw new Error('element not found');
        }
        return result;
    }
}
suite('AsyncDataTree', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Collapse state should be preserved across refresh calls', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a'
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 0);
        await tree.setInput(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        const twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        model.get('a').children = [
            { id: 'aa' },
            { id: 'ab' },
            { id: 'ac' }
        ];
        await tree.updateChildren(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        await tree.expand(model.get('a'));
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 4);
        model.get('a').children = [];
        await tree.updateChildren(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
    });
    test('issue #68648', async () => {
        const container = document.createElement('div');
        const getChildrenCalls = [];
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                getChildrenCalls.push(element.id);
                return Promise.resolve(element.children || []);
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a'
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root']);
        let twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
        model.get('a').children = [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }];
        await tree.updateChildren(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'root']);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
        model.get('a').children = [];
        await tree.updateChildren(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'root', 'root']);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
        model.get('a').children = [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }];
        await tree.updateChildren(model.root);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'root', 'root', 'root']);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(twistie.classList.contains('collapsed'));
        assert(tree.getNode().children[0].collapsed);
    });
    test('issue #67722 - once resolved, refreshed collapsed nodes should only get children when expanded', async () => {
        const container = document.createElement('div');
        const getChildrenCalls = [];
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                getChildrenCalls.push(element.id);
                return Promise.resolve(element.children || []);
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert(tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root']);
        await tree.expand(model.get('a'));
        assert(!tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a']);
        tree.collapse(model.get('a'));
        assert(tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a']);
        await tree.updateChildren();
        assert(tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a', 'root'], 'a should not be refreshed, since it\' collapsed');
    });
    test('resolved collapsed nodes which lose children should lose twistie as well', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        await tree.expand(model.get('a'));
        let twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(!tree.getNode(model.get('a')).collapsed);
        tree.collapse(model.get('a'));
        model.get('a').children = [];
        await tree.updateChildren(model.root);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        assert(tree.getNode(model.get('a')).collapsed);
    });
    test('issue #192422 - resolved collapsed nodes with changed children don\'t show old children', async () => {
        const container = document.createElement('div');
        let hasGottenAChildren = false;
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                if (element.id === 'a') {
                    if (!hasGottenAChildren) {
                        hasGottenAChildren = true;
                    }
                    else {
                        return [{ id: 'c' }];
                    }
                }
                return element.children || [];
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'b' }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        const a = model.get('a');
        const aNode = tree.getNode(a);
        assert(aNode.collapsed);
        await tree.expand(a);
        assert(!aNode.collapsed);
        assert.equal(aNode.children.length, 1);
        assert.equal(aNode.children[0].element.id, 'b');
        const bChild = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(bChild?.textContent, 'b');
        tree.collapse(a);
        assert(aNode.collapsed);
        await tree.updateChildren(a);
        const aUpdated1 = model.get('a');
        const aNodeUpdated1 = tree.getNode(a);
        assert(aNodeUpdated1.collapsed);
        assert.equal(aNodeUpdated1.children.length, 0);
        let didCheckNoChildren = false;
        const event = tree.onDidChangeCollapseState(e => {
            const child = container.querySelector('.monaco-list-row:nth-child(2)');
            assert.equal(child, undefined);
            didCheckNoChildren = true;
        });
        await tree.expand(aUpdated1);
        event.dispose();
        assert(didCheckNoChildren);
        const aNodeUpdated2 = tree.getNode(a);
        assert(!aNodeUpdated2.collapsed);
        assert.equal(aNodeUpdated2.children.length, 1);
        assert.equal(aNodeUpdated2.children[0].element.id, 'c');
        const child = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(child?.textContent, 'c');
    });
    test('issue #192422 - resolved collapsed nodes with unchanged children immediately show children', async () => {
        const container = document.createElement('div');
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                return element.children || [];
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'b' }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        const a = model.get('a');
        const aNode = tree.getNode(a);
        assert(aNode.collapsed);
        await tree.expand(a);
        assert(!aNode.collapsed);
        assert.equal(aNode.children.length, 1);
        assert.equal(aNode.children[0].element.id, 'b');
        const bChild = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(bChild?.textContent, 'b');
        tree.collapse(a);
        assert(aNode.collapsed);
        const aUpdated1 = model.get('a');
        const aNodeUpdated1 = tree.getNode(a);
        assert(aNodeUpdated1.collapsed);
        assert.equal(aNodeUpdated1.children.length, 1);
        let didCheckSameChildren = false;
        const event = tree.onDidChangeCollapseState(e => {
            const child = container.querySelector('.monaco-list-row:nth-child(2)');
            assert.equal(child?.textContent, 'b');
            didCheckSameChildren = true;
        });
        await tree.expand(aUpdated1);
        event.dispose();
        assert(didCheckSameChildren);
        const aNodeUpdated2 = tree.getNode(a);
        assert(!aNodeUpdated2.collapsed);
        assert.equal(aNodeUpdated2.children.length, 1);
        assert.equal(aNodeUpdated2.children[0].element.id, 'b');
        const child = container.querySelector('.monaco-list-row:nth-child(2)');
        assert.equal(child?.textContent, 'b');
    });
    test('support default collapse state per element', async () => {
        const container = document.createElement('div');
        const getChildrenCalls = [];
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                getChildrenCalls.push(element.id);
                return Promise.resolve(element.children || []);
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, {
            collapseByDefault: el => el.id !== 'a'
        }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert(!tree.getNode(model.get('a')).collapsed);
        assert.deepStrictEqual(getChildrenCalls, ['root', 'a']);
    });
    test('issue #80098 - concurrent refresh and expand', async () => {
        const container = document.createElement('div');
        const calls = [];
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            getChildren(element) {
                return new Promise(c => calls.push(() => c(element.children || [])));
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{
                            id: 'aa'
                        }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        const pSetInput = tree.setInput(model.root);
        calls.pop()(); // resolve getChildren(root)
        await pSetInput;
        const pUpdateChildrenA = tree.updateChildren(model.get('a'));
        const pExpandA = tree.expand(model.get('a'));
        assert.strictEqual(calls.length, 1, 'expand(a) still hasn\'t called getChildren(a)');
        calls.pop()();
        assert.strictEqual(calls.length, 0, 'no pending getChildren calls');
        await pUpdateChildrenA;
        assert.strictEqual(calls.length, 0, 'expand(a) should not have forced a second refresh');
        const result = await pExpandA;
        assert.strictEqual(result, true, 'expand(a) should be done');
    });
    test('issue #80098 - first expand should call getChildren', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const container = document.createElement('div');
            const calls = [];
            const dataSource = new class {
                hasChildren(element) {
                    return !!element.children && element.children.length > 0;
                }
                getChildren(element) {
                    return new Promise(c => calls.push(() => c(element.children || [])));
                }
            };
            const model = new Model({
                id: 'root',
                children: [{
                        id: 'a', children: [{
                                id: 'aa'
                            }]
                    }]
            });
            const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
            tree.layout(200);
            const pSetInput = tree.setInput(model.root);
            calls.pop()(); // resolve getChildren(root)
            await pSetInput;
            const pExpandA = tree.expand(model.get('a'));
            assert.strictEqual(calls.length, 1, 'expand(a) should\'ve called getChildren(a)');
            let race = await Promise.race([pExpandA.then(() => 'expand'), timeout(1).then(() => 'timeout')]);
            assert.strictEqual(race, 'timeout', 'expand(a) should not be yet done');
            calls.pop()();
            assert.strictEqual(calls.length, 0, 'no pending getChildren calls');
            race = await Promise.race([pExpandA.then(() => 'expand'), timeout(1).then(() => 'timeout')]);
            assert.strictEqual(race, 'expand', 'expand(a) should now be done');
        });
    });
    test('issue #78388 - tree should react to hasChildren toggles', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a'
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        let twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
        model.get('a').children = [{ id: 'aa' }];
        await tree.updateChildren(model.get('a'), false);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(twistie.classList.contains('collapsible'));
        assert(twistie.classList.contains('collapsed'));
        model.get('a').children = [];
        await tree.updateChildren(model.get('a'), false);
        assert.strictEqual(container.querySelectorAll('.monaco-list-row').length, 1);
        twistie = container.querySelector('.monaco-list-row:first-child .monaco-tl-twistie');
        assert(!twistie.classList.contains('collapsible'));
        assert(!twistie.classList.contains('collapsed'));
    });
    test('issues #84569, #82629 - rerender', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a',
                    children: [{
                            id: 'b',
                            suffix: '1'
                        }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        await tree.expand(model.get('a'));
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'b1']);
        const a = model.get('a');
        const b = model.get('b');
        a.children?.splice(0, 1, { id: 'b', suffix: '2' });
        await Promise.all([
            tree.updateChildren(a, true, true),
            tree.updateChildren(b, true, true)
        ]);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'b2']);
    });
    test('issue #199264 - dispose during render', async () => {
        const container = document.createElement('div');
        const model1 = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }]
                }]
        });
        const model2 = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model1.root);
        const input = tree.setInput(model2.root);
        tree.dispose();
        await input;
        assert.strictEqual(container.innerHTML, '');
    });
    test('issue #121567', async () => {
        const container = document.createElement('div');
        const calls = [];
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                calls.push(element);
                return element.children ?? Iterable.empty();
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{
                            id: 'aa'
                        }]
                }]
        });
        const a = model.get('a');
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.strictEqual(calls.length, 1, 'There should be a single getChildren call for the root');
        assert(tree.isCollapsible(a), 'a is collapsible');
        assert(tree.isCollapsed(a), 'a is collapsed');
        await tree.updateChildren(a, false);
        assert.strictEqual(calls.length, 1, 'There should be no changes to the calls list, since a was collapsed');
        assert(tree.isCollapsible(a), 'a is collapsible');
        assert(tree.isCollapsed(a), 'a is collapsed');
        const children = a.children;
        a.children = [];
        await tree.updateChildren(a, false);
        assert.strictEqual(calls.length, 1, 'There should still be no changes to the calls list, since a was collapsed');
        assert(!tree.isCollapsible(a), 'a is no longer collapsible');
        assert(tree.isCollapsed(a), 'a is collapsed');
        a.children = children;
        await tree.updateChildren(a, false);
        assert.strictEqual(calls.length, 1, 'There should still be no changes to the calls list, since a was collapsed');
        assert(tree.isCollapsible(a), 'a is collapsible again');
        assert(tree.isCollapsed(a), 'a is collapsed');
        await tree.expand(a);
        assert.strictEqual(calls.length, 2, 'Finally, there should be a getChildren call for a');
        assert(tree.isCollapsible(a), 'a is still collapsible');
        assert(!tree.isCollapsed(a), 'a is expanded');
    });
    test('issue #199441', async () => {
        const container = document.createElement('div');
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                return element.children ?? Iterable.empty();
            }
        };
        const compressionDelegate = new class {
            isIncompressible(element) {
                return !dataSource.hasChildren(element);
            }
        };
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{
                            id: 'b',
                            children: [{ id: 'b.txt' }]
                        }]
                }]
        });
        const collapseByDefault = (element) => false;
        const tree = store.add(new CompressibleAsyncDataTree('test', container, new VirtualDelegate(), compressionDelegate, [new Renderer()], dataSource, { identityProvider: new IdentityProvider(), collapseByDefault }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a/b', 'b.txt']);
        model.get('a').children.push({
            id: 'c',
            children: [{ id: 'c.txt' }]
        });
        await tree.updateChildren(model.root, true);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'b', 'b.txt', 'c', 'c.txt']);
    });
    test('Tree Navigation: AsyncDataTree', async () => {
        const container = document.createElement('div');
        const model = new Model({
            id: 'root',
            children: [{
                    id: 'a', children: [{
                            id: 'aa', children: [{ id: 'aa.txt' }]
                        }, {
                            id: 'ab', children: [{ id: 'ab.txt' }]
                        }]
                }, {
                    id: 'b', children: [{
                            id: 'ba', children: [{ id: 'ba.txt' }]
                        }, {
                            id: 'bb', children: [{ id: 'bb.txt' }]
                        }]
                }, {
                    id: 'c', children: [{
                            id: 'ca', children: [{ id: 'ca.txt' }]
                        }, {
                            id: 'cb', children: [{ id: 'cb.txt' }]
                        }]
                }]
        });
        const tree = store.add(new AsyncDataTree('test', container, new VirtualDelegate(), [new Renderer()], new DataSource(), { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'b', 'c']);
        assert.strictEqual(tree.navigate().current(), null);
        assert.strictEqual(tree.navigate().first()?.id, 'a');
        assert.strictEqual(tree.navigate().last()?.id, 'c');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'a');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'c');
        await tree.expand(model.get('a'));
        await tree.expand(model.get('aa'));
        await tree.expand(model.get('ab'));
        await tree.expand(model.get('b'));
        await tree.expand(model.get('ba'));
        await tree.expand(model.get('bb'));
        await tree.expand(model.get('c'));
        await tree.expand(model.get('ca'));
        await tree.expand(model.get('cb'));
        // Only the first 10 elements are rendered (total height is 200px, each element is 20px)
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'aa', 'aa.txt', 'ab', 'ab.txt', 'b', 'ba', 'ba.txt', 'bb', 'bb.txt']);
        assert.strictEqual(tree.navigate().first()?.id, 'a');
        assert.strictEqual(tree.navigate().last()?.id, 'cb.txt');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'ab.txt');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'ba');
        assert.strictEqual(tree.navigate(model.get('ab.txt')).previous()?.id, 'ab');
        assert.strictEqual(tree.navigate(model.get('ab.txt')).next()?.id, 'b');
        assert.strictEqual(tree.navigate(model.get('bb.txt')).next()?.id, 'c');
        tree.collapse(model.get('b'), false);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'aa', 'aa.txt', 'ab', 'ab.txt', 'b', 'c', 'ca', 'ca.txt', 'cb']);
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'c');
    });
    test('Test Navigation: CompressibleAsyncDataTree', async () => {
        const container = document.createElement('div');
        const dataSource = new class {
            hasChildren(element) {
                return !!element.children && element.children.length > 0;
            }
            async getChildren(element) {
                return element.children ?? Iterable.empty();
            }
        };
        const compressionDelegate = new class {
            isIncompressible(element) {
                return !dataSource.hasChildren(element);
            }
        };
        const model = new Model({
            id: 'root',
            children: [
                {
                    id: 'a', children: [{ id: 'aa', children: [{ id: 'aa.txt' }] }]
                }, {
                    id: 'b', children: [{ id: 'ba', children: [{ id: 'ba.txt' }] }]
                }, {
                    id: 'c', children: [{
                            id: 'ca', children: [{ id: 'ca.txt' }]
                        }, {
                            id: 'cb', children: [{ id: 'cb.txt' }]
                        }]
                }
            ]
        });
        const tree = store.add(new CompressibleAsyncDataTree('test', container, new VirtualDelegate(), compressionDelegate, [new Renderer()], dataSource, { identityProvider: new IdentityProvider() }));
        tree.layout(200);
        await tree.setInput(model.root);
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a', 'b', 'c']);
        assert.strictEqual(tree.navigate().current(), null);
        assert.strictEqual(tree.navigate().first()?.id, 'a');
        assert.strictEqual(tree.navigate().last()?.id, 'c');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'a');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'c');
        await tree.expand(model.get('a'));
        await tree.expand(model.get('aa'));
        await tree.expand(model.get('b'));
        await tree.expand(model.get('ba'));
        await tree.expand(model.get('c'));
        await tree.expand(model.get('ca'));
        await tree.expand(model.get('cb'));
        // Only the first 10 elements are rendered (total height is 200px, each element is 20px)
        assert.deepStrictEqual(Array.from(container.querySelectorAll('.monaco-list-row')).map(e => e.textContent), ['a/aa', 'aa.txt', 'b/ba', 'ba.txt', 'c', 'ca', 'ca.txt', 'cb', 'cb.txt']);
        assert.strictEqual(tree.navigate().first()?.id, 'aa');
        assert.strictEqual(tree.navigate().last()?.id, 'cb.txt');
        assert.strictEqual(tree.navigate(model.get('b')).previous()?.id, 'aa.txt');
        assert.strictEqual(tree.navigate(model.get('ba')).previous()?.id, 'aa.txt');
        assert.strictEqual(tree.navigate(model.get('b')).next()?.id, 'ba.txt');
        assert.strictEqual(tree.navigate(model.get('ba')).next()?.id, 'ba.txt');
        assert.strictEqual(tree.navigate(model.get('aa.txt')).previous()?.id, 'aa');
        assert.strictEqual(tree.navigate(model.get('aa.txt')).next()?.id, 'ba');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEYXRhVHJlZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvdHJlZS9hc3luY0RhdGFUcmVlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxhQUFhLEVBQUUseUJBQXlCLEVBQTRCLE1BQU0sOENBQThDLENBQUM7QUFJbEksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQVE1RSxTQUFTLElBQUksQ0FBQyxPQUFnQixFQUFFLEVBQVU7SUFDekMsSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRS9CLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sUUFBUTtJQUFkO1FB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QUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXZMLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFF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QyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9