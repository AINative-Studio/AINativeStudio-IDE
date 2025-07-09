/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableMap } from '../../base/common/lifecycle.js';
import { assertNotDisposed } from './observableDisposable.js';
/**
 * Generic cache for object instances. Guarantees to return only non-disposed
 * objects from the {@linkcode get} method. If a requested object is not yet
 * in the cache or is disposed already, the {@linkcode factory} callback is
 * called to create a new object.
 *
 * @throws if {@linkcode factory} callback returns a disposed object.
 *
 * ## Examples
 *
 * ```typescript
 * // a class that will be used as a cache key; the key can be of any
 * // non-nullable type, including primitives like `string` or `number`,
 * // but in this case we use an object pointer as a key
 * class KeyObject {}
 *
 * // a class for testing purposes
 * class TestObject extends ObservableDisposable {
 *   constructor(
 *     public readonly id: KeyObject,
 *   ) {}
 * };
 *
 * // create an object cache instance providing it a factory function that
 * // is responsible for creating new objects based on the provided key if
 * // the cache does not contain the requested object yet or an existing
 * // object is already disposed
 * const cache = new ObjectCache<TestObject, KeyObject>((key) => {
 *   // create a new test object based on the provided key
 *   return new TestObject(key);
 * });
 *
 * // create two keys
 * const key1 = new KeyObject();
 * const key2 = new KeyObject();
 *
 * // get an object from the cache by its key
 * const object1 = cache.get(key1); // returns a new test object
 *
 * // validate that the new object has the correct key
 * assert(
 *   object1.id === key1,
 *   'Object 1 must have correct ID.',
 * );
 *
 * // returns the same cached test object
 * const object2 = cache.get(key1);
 *
 * // validate that the same exact object is returned from the cache
 * assert(
 *   object1 === object2,
 *   'Object 2 the same cached object as object 1.',
 * );
 *
 * // returns a new test object
 * const object3 = cache.get(key2);
 *
 * // validate that the new object has the correct key
 * assert(
 *   object3.id === key2,
 *   'Object 3 must have correct ID.',
 * );
 *
 * assert(
 *   object3 !== object1,
 *   'Object 3 must be a new object.',
 * );
 * ```
 */
export class ObjectCache extends Disposable {
    constructor(factory) {
        super();
        this.factory = factory;
        this.cache = this._register(new DisposableMap());
    }
    /**
     * Get an existing object from the cache. If a requested object is not yet
     * in the cache or is disposed already, the {@linkcode factory} callback is
     * called to create a new object.
     *
     * @throws if {@linkcode factory} callback returns a disposed object.
     * @param key - ID of the object in the cache
     */
    get(key) {
        let object = this.cache.get(key);
        // if object is already disposed, remove it from the cache
        if (object?.disposed) {
            this.cache.deleteAndLeak(key);
            object = undefined;
        }
        // if object exists and is not disposed, return it
        if (object) {
            // must always hold true due to the check above
            assertNotDisposed(object, 'Object must not be disposed.');
            return object;
        }
        // create a new object by calling the factory
        object = this.factory(key);
        // newly created object must not be disposed
        assertNotDisposed(object, 'Newly created object must not be disposed.');
        // remove it from the cache automatically on dispose
        object.onDispose(() => {
            this.cache.deleteAndLeak(key);
        });
        this.cache.set(key, object);
        return object;
    }
    /**
     * Remove an object from the cache by its key.
     *
     * @param key ID of the object to remove.
     * @param dispose Whether the removed object must be disposed.
     */
    remove(key, dispose) {
        if (dispose) {
            this.cache.deleteAndDispose(key);
            return this;
        }
        this.cache.deleteAndLeak(key);
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JqZWN0Q2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQXdCLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFcEY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0VHO0FBQ0gsTUFBTSxPQUFPLFdBR1gsU0FBUSxVQUFVO0lBSW5CLFlBQ2tCLE9BQW9EO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBRlMsWUFBTyxHQUFQLE9BQU8sQ0FBNkM7UUFKckQsVUFBSyxHQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQztJQU1yQyxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLEdBQUcsQ0FBQyxHQUFTO1FBQ25CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWpDLDBEQUEwRDtRQUMxRCxJQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QixNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxrREFBa0Q7UUFDbEQsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLCtDQUErQztZQUMvQyxpQkFBaUIsQ0FDaEIsTUFBTSxFQUNOLDhCQUE4QixDQUM5QixDQUFDO1lBRUYsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTNCLDRDQUE0QztRQUM1QyxpQkFBaUIsQ0FDaEIsTUFBTSxFQUNOLDRDQUE0QyxDQUM1QyxDQUFDO1FBRUYsb0RBQW9EO1FBQ3BELE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTVCLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLEdBQVMsRUFBRSxPQUFnQjtRQUN4QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCJ9