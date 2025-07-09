/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { Memento } from '../../common/memento.js';
import { TestStorageService } from './workbenchTestServices.js';
suite('Memento', () => {
    const disposables = new DisposableStore();
    let storage;
    setup(() => {
        storage = disposables.add(new TestStorageService());
        Memento.clear(-1 /* StorageScope.APPLICATION */);
        Memento.clear(0 /* StorageScope.PROFILE */);
        Memento.clear(1 /* StorageScope.WORKSPACE */);
    });
    teardown(() => {
        disposables.clear();
    });
    test('Loading and Saving Memento with Scopes', () => {
        const myMemento = new Memento('memento.test', storage);
        // Application
        let memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [1, 2, 3];
        let applicationMemento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(applicationMemento, memento);
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [4, 5, 6];
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'Hello World';
        myMemento.saveMemento();
        // Application
        memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3] });
        applicationMemento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(applicationMemento, memento);
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [4, 5, 6] });
        profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World' });
        // Assert the Mementos are stored properly in storage
        assert.deepStrictEqual(JSON.parse(storage.get('memento/memento.test', -1 /* StorageScope.APPLICATION */)), { foo: [1, 2, 3] });
        assert.deepStrictEqual(JSON.parse(storage.get('memento/memento.test', 0 /* StorageScope.PROFILE */)), { foo: [4, 5, 6] });
        assert.deepStrictEqual(JSON.parse(storage.get('memento/memento.test', 1 /* StorageScope.WORKSPACE */)), { foo: 'Hello World' });
        // Delete Application
        memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        // Delete Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        // Delete Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        myMemento.saveMemento();
        // Application
        memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Assert the Mementos are also removed from storage
        assert.strictEqual(storage.get('memento/memento.test', -1 /* StorageScope.APPLICATION */, null), null);
        assert.strictEqual(storage.get('memento/memento.test', 0 /* StorageScope.PROFILE */, null), null);
        assert.strictEqual(storage.get('memento/memento.test', 1 /* StorageScope.WORKSPACE */, null), null);
    });
    test('Save and Load', () => {
        const myMemento = new Memento('memento.test', storage);
        // Profile
        let memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [1, 2, 3];
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'Hello World';
        myMemento.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3] });
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World' });
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [4, 5, 6];
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'World Hello';
        myMemento.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [4, 5, 6] });
        profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'World Hello' });
        // Delete Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        // Delete Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        myMemento.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
    });
    test('Save and Load - 2 Components with same id', () => {
        const myMemento = new Memento('memento.test', storage);
        const myMemento2 = new Memento('memento.test', storage);
        // Profile
        let memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [1, 2, 3];
        memento = myMemento2.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.bar = [1, 2, 3];
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'Hello World';
        memento = myMemento2.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.bar = 'Hello World';
        myMemento.saveMemento();
        myMemento2.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3], bar: [1, 2, 3] });
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        memento = myMemento2.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3], bar: [1, 2, 3] });
        profileMemento = myMemento2.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World', bar: 'Hello World' });
        memento = myMemento2.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World', bar: 'Hello World' });
    });
    test('Clear Memento', () => {
        let myMemento = new Memento('memento.test', storage);
        // Profile
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        profileMemento.foo = 'Hello World';
        // Workspace
        let workspaceMemento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        workspaceMemento.bar = 'Hello World';
        myMemento.saveMemento();
        // Clear
        storage = disposables.add(new TestStorageService());
        Memento.clear(0 /* StorageScope.PROFILE */);
        Memento.clear(1 /* StorageScope.WORKSPACE */);
        myMemento = new Memento('memento.test', storage);
        profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        workspaceMemento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, {});
        assert.deepStrictEqual(workspaceMemento, {});
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtZW50by50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2NvbW1vbi9tZW1lbnRvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFaEUsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxJQUFJLE9BQXdCLENBQUM7SUFFN0IsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sQ0FBQyxLQUFLLG1DQUEwQixDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxLQUFLLDhCQUFzQixDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxLQUFLLGdDQUF3QixDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDbkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FB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