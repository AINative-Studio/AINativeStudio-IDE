/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InMemoryStorageService } from '../../common/storage.js';
export function createSuite(params) {
    let storageService;
    const disposables = new DisposableStore();
    setup(async () => {
        storageService = await params.setup();
    });
    teardown(() => {
        disposables.clear();
        return params.teardown(storageService);
    });
    test('Get Data, Integer, Boolean (application)', () => {
        storeData(-1 /* StorageScope.APPLICATION */);
    });
    test('Get Data, Integer, Boolean (profile)', () => {
        storeData(0 /* StorageScope.PROFILE */);
    });
    test('Get Data, Integer, Boolean, Object (workspace)', () => {
        storeData(1 /* StorageScope.WORKSPACE */);
    });
    test('Storage change source', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        // Explicit external source
        storageService.storeAll([{ key: 'testExternalChange', value: 'foobar', scope: 1 /* StorageScope.WORKSPACE */, target: 1 /* StorageTarget.MACHINE */ }], true);
        let storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testExternalChange');
        strictEqual(storageValueChangeEvent?.external, true);
        // Default source
        storageService.storeAll([{ key: 'testChange', value: 'barfoo', scope: 1 /* StorageScope.WORKSPACE */, target: 1 /* StorageTarget.MACHINE */ }], false);
        storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testChange');
        strictEqual(storageValueChangeEvent?.external, false);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testChange');
        strictEqual(storageValueChangeEvent?.external, false);
    });
    test('Storage change event scope (all keys)', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageValueChangeEvents.length, 2);
    });
    test('Storage change event scope (specific key)', () => {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, 'testChange', disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('testChange', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange', 'foobar', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storageService.store('testChange', 'foobar', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('testChange2', 'foobar', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        const storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'testChange');
        ok(storageValueChangeEvent);
        strictEqual(storageValueChangeEvents.length, 1);
    });
    function storeData(scope) {
        let storageValueChangeEvents = [];
        storageService.onDidChangeValue(scope, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        strictEqual(storageService.get('test.get', scope, 'foobar'), 'foobar');
        strictEqual(storageService.get('test.get', scope, ''), '');
        strictEqual(storageService.getNumber('test.getNumber', scope, 5), 5);
        strictEqual(storageService.getNumber('test.getNumber', scope, 0), 0);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, true), true);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, false), false);
        deepStrictEqual(storageService.getObject('test.getObject', scope, { 'foo': 'bar' }), { 'foo': 'bar' });
        deepStrictEqual(storageService.getObject('test.getObject', scope, {}), {});
        deepStrictEqual(storageService.getObject('test.getObject', scope, []), []);
        storageService.store('test.get', 'foobar', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.get('test.get', scope, (undefined)), 'foobar');
        let storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'test.get');
        strictEqual(storageValueChangeEvent?.scope, scope);
        strictEqual(storageValueChangeEvent?.key, 'test.get');
        storageValueChangeEvents = [];
        storageService.store('test.get', '', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.get('test.get', scope, (undefined)), '');
        storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'test.get');
        strictEqual(storageValueChangeEvent.scope, scope);
        strictEqual(storageValueChangeEvent.key, 'test.get');
        storageService.store('test.getNumber', 5, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getNumber('test.getNumber', scope, (undefined)), 5);
        storageService.store('test.getNumber', 0, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getNumber('test.getNumber', scope, (undefined)), 0);
        storageService.store('test.getBoolean', true, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, (undefined)), true);
        storageService.store('test.getBoolean', false, scope, 1 /* StorageTarget.MACHINE */);
        strictEqual(storageService.getBoolean('test.getBoolean', scope, (undefined)), false);
        storageService.store('test.getObject', {}, scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, (undefined)), {});
        storageService.store('test.getObject', [42], scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, (undefined)), [42]);
        storageService.store('test.getObject', { 'foo': {} }, scope, 1 /* StorageTarget.MACHINE */);
        deepStrictEqual(storageService.getObject('test.getObject', scope, (undefined)), { 'foo': {} });
        strictEqual(storageService.get('test.getDefault', scope, 'getDefault'), 'getDefault');
        strictEqual(storageService.getNumber('test.getNumberDefault', scope, 5), 5);
        strictEqual(storageService.getBoolean('test.getBooleanDefault', scope, true), true);
        deepStrictEqual(storageService.getObject('test.getObjectDefault', scope, { 'foo': 42 }), { 'foo': 42 });
        storageService.storeAll([
            { key: 'test.storeAll1', value: 'foobar', scope, target: 1 /* StorageTarget.MACHINE */ },
            { key: 'test.storeAll2', value: 4, scope, target: 1 /* StorageTarget.MACHINE */ },
            { key: 'test.storeAll3', value: null, scope, target: 1 /* StorageTarget.MACHINE */ }
        ], false);
        strictEqual(storageService.get('test.storeAll1', scope, 'foobar'), 'foobar');
        strictEqual(storageService.get('test.storeAll2', scope, '4'), '4');
        strictEqual(storageService.get('test.storeAll3', scope, 'null'), 'null');
    }
    test('Remove Data (application)', () => {
        removeData(-1 /* StorageScope.APPLICATION */);
    });
    test('Remove Data (profile)', () => {
        removeData(0 /* StorageScope.PROFILE */);
    });
    test('Remove Data (workspace)', () => {
        removeData(1 /* StorageScope.WORKSPACE */);
    });
    function removeData(scope) {
        const storageValueChangeEvents = [];
        storageService.onDidChangeValue(scope, undefined, disposables)(e => storageValueChangeEvents.push(e), undefined, disposables);
        storageService.store('test.remove', 'foobar', scope, 1 /* StorageTarget.MACHINE */);
        strictEqual('foobar', storageService.get('test.remove', scope, (undefined)));
        storageService.remove('test.remove', scope);
        ok(!storageService.get('test.remove', scope, (undefined)));
        const storageValueChangeEvent = storageValueChangeEvents.find(e => e.key === 'test.remove');
        strictEqual(storageValueChangeEvent?.scope, scope);
        strictEqual(storageValueChangeEvent?.key, 'test.remove');
    }
    test('Keys (in-memory)', () => {
        let storageTargetEvent = undefined;
        storageService.onDidChangeTarget(e => storageTargetEvent = e, undefined, disposables);
        // Empty
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        let storageValueChangeEvent = undefined;
        // Add values
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            storageService.onDidChangeValue(scope, undefined, disposables)(e => storageValueChangeEvent = e, undefined, disposables);
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                storageTargetEvent = Object.create(null);
                storageValueChangeEvent = Object.create(null);
                storageService.store('test.target1', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                strictEqual(storageTargetEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.key, 'test.target1');
                strictEqual(storageValueChangeEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.target, target);
                storageTargetEvent = undefined;
                storageValueChangeEvent = Object.create(null);
                storageService.store('test.target1', 'otherValue1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                strictEqual(storageTargetEvent, undefined);
                strictEqual(storageValueChangeEvent?.key, 'test.target1');
                strictEqual(storageValueChangeEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.target, target);
                storageService.store('test.target2', 'value2', scope, target);
                storageService.store('test.target3', 'value3', scope, target);
                strictEqual(storageService.keys(scope, target).length, 3);
            }
        }
        // Remove values
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                const keysLength = storageService.keys(scope, target).length;
                storageService.store('test.target4', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, keysLength + 1);
                storageTargetEvent = Object.create(null);
                storageValueChangeEvent = Object.create(null);
                storageService.remove('test.target4', scope);
                strictEqual(storageService.keys(scope, target).length, keysLength);
                strictEqual(storageTargetEvent?.scope, scope);
                strictEqual(storageValueChangeEvent?.key, 'test.target4');
                strictEqual(storageValueChangeEvent?.scope, scope);
            }
        }
        // Remove all
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                const keys = storageService.keys(scope, target);
                for (const key of keys) {
                    storageService.remove(key, scope);
                }
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        // Adding undefined or null removes value
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                storageService.store('test.target1', 'value1', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                storageTargetEvent = Object.create(null);
                storageService.store('test.target1', undefined, scope, target);
                strictEqual(storageService.keys(scope, target).length, 0);
                strictEqual(storageTargetEvent?.scope, scope);
                storageService.store('test.target1', '', scope, target);
                strictEqual(storageService.keys(scope, target).length, 1);
                storageService.store('test.target1', null, scope, target);
                strictEqual(storageService.keys(scope, target).length, 0);
            }
        }
        // Target change
        for (const scope of [1 /* StorageScope.WORKSPACE */, 0 /* StorageScope.PROFILE */, -1 /* StorageScope.APPLICATION */]) {
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 0 /* StorageTarget.USER */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(storageTargetEvent);
            storageTargetEvent = undefined;
            storageService.store('test.target5', 'value1', scope, 1 /* StorageTarget.MACHINE */);
            ok(!storageTargetEvent); // no change in target
        }
    });
}
suite('StorageService (in-memory)', function () {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    createSuite({
        setup: async () => disposables.add(new InMemoryStorageService()),
        teardown: async () => { }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL3Rlc3QvY29tbW9uL3N0b3JhZ2VTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQXFHLE1BQU0seUJBQXlCLENBQUM7QUFFcEssTUFBTSxVQUFVLFdBQVcsQ0FBNEIsTUFBNEU7SUFFbEksSUFBSSxjQUFpQixDQUFDO0lBRXRCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLGNBQWMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxTQUFTLG1DQUEwQixDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxTQUFTLDhCQUFzQixDQUFDO0lBQ2pDLENBQUMsQ0FBQyxD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