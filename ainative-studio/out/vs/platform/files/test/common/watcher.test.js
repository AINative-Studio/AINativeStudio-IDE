/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { FileChangesEvent } from '../../common/files.js';
import { coalesceEvents, reviveFileChanges, parseWatcherPatterns, isFiltered } from '../../common/watcher.js';
class TestFileWatcher extends Disposable {
    constructor() {
        super();
        this._onDidFilesChange = this._register(new Emitter());
    }
    get onDidFilesChange() {
        return this._onDidFilesChange.event;
    }
    report(changes) {
        this.onRawFileEvents(changes);
    }
    onRawFileEvents(events) {
        // Coalesce
        const coalescedEvents = coalesceEvents(events);
        // Emit through event emitter
        if (coalescedEvents.length > 0) {
            this._onDidFilesChange.fire({ raw: reviveFileChanges(coalescedEvents), event: this.toFileChangesEvent(coalescedEvents) });
        }
    }
    toFileChangesEvent(changes) {
        return new FileChangesEvent(reviveFileChanges(changes), !isLinux);
    }
}
var Path;
(function (Path) {
    Path[Path["UNIX"] = 0] = "UNIX";
    Path[Path["WINDOWS"] = 1] = "WINDOWS";
    Path[Path["UNC"] = 2] = "UNC";
})(Path || (Path = {}));
suite('Watcher', () => {
    (isWindows ? test.skip : test)('parseWatcherPatterns - posix', () => {
        const path = '/users/data/src';
        let parsedPattern = parseWatcherPatterns(path, ['*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['/users/data/src/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['/users/data/src/bar/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), false);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), true);
        parsedPattern = parseWatcherPatterns(path, ['**/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), true);
    });
    (!isWindows ? test.skip : test)('parseWatcherPatterns - windows', () => {
        const path = 'c:\\users\\data\\src';
        let parsedPattern = parseWatcherPatterns(path, ['*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['c:\\users\\data\\src\\*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['c:\\users\\data\\src\\bar/*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), true);
        parsedPattern = parseWatcherPatterns(path, ['**/*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('Watcher Events Normalizer', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('simple add/update/delete', done => {
        const watch = disposables.add(new TestFileWatcher());
        const added = URI.file('/users/data/src/added.txt');
        const updated = URI.file('/users/data/src/updated.txt');
        const deleted = URI.file('/users/data/src/deleted.txt');
        const raw = [
            { resource: added, type: 1 /* FileChangeType.ADDED */ },
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 3);
            assert.ok(event.contains(added, 1 /* FileChangeType.ADDED */));
            assert.ok(event.contains(updated, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(deleted, 2 /* FileChangeType.DELETED */));
            done();
        }));
        watch.report(raw);
    });
    (isWindows ? [Path.WINDOWS, Path.UNC] : [Path.UNIX]).forEach(path => {
        test(`delete only reported for top level folder (${path})`, done => {
            const watch = disposables.add(new TestFileWatcher());
            const deletedFolderA = URI.file(path === Path.UNIX ? '/users/data/src/todelete1' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete1' : '\\\\localhost\\users\\data\\src\\todelete1');
            const deletedFolderB = URI.file(path === Path.UNIX ? '/users/data/src/todelete2' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2' : '\\\\localhost\\users\\data\\src\\todelete2');
            const deletedFolderBF1 = URI.file(path === Path.UNIX ? '/users/data/src/todelete2/file.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2\\file.txt' : '\\\\localhost\\users\\data\\src\\todelete2\\file.txt');
            const deletedFolderBF2 = URI.file(path === Path.UNIX ? '/users/data/src/todelete2/more/test.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2\\more\\test.txt' : '\\\\localhost\\users\\data\\src\\todelete2\\more\\test.txt');
            const deletedFolderBF3 = URI.file(path === Path.UNIX ? '/users/data/src/todelete2/super/bar/foo.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\todelete2\\super\\bar\\foo.txt' : '\\\\localhost\\users\\data\\src\\todelete2\\super\\bar\\foo.txt');
            const deletedFileA = URI.file(path === Path.UNIX ? '/users/data/src/deleteme.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\deleteme.txt' : '\\\\localhost\\users\\data\\src\\deleteme.txt');
            const addedFile = URI.file(path === Path.UNIX ? '/users/data/src/added.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\added.txt' : '\\\\localhost\\users\\data\\src\\added.txt');
            const updatedFile = URI.file(path === Path.UNIX ? '/users/data/src/updated.txt' : path === Path.WINDOWS ? 'C:\\users\\data\\src\\updated.txt' : '\\\\localhost\\users\\data\\src\\updated.txt');
            const raw = [
                { resource: deletedFolderA, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderB, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF1, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF2, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF3, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFileA, type: 2 /* FileChangeType.DELETED */ },
                { resource: addedFile, type: 1 /* FileChangeType.ADDED */ },
                { resource: updatedFile, type: 0 /* FileChangeType.UPDATED */ }
            ];
            disposables.add(watch.onDidFilesChange(({ event, raw }) => {
                assert.ok(event);
                assert.strictEqual(raw.length, 5);
                assert.ok(event.contains(deletedFolderA, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(deletedFolderB, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(deletedFileA, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(addedFile, 1 /* FileChangeType.ADDED */));
                assert.ok(event.contains(updatedFile, 0 /* FileChangeType.UPDATED */));
                done();
            }));
            watch.report(raw);
        });
    });
    test('event coalescer: ignore CREATE followed by DELETE', done => {
        const watch = disposables.add(new TestFileWatcher());
        const created = URI.file('/users/data/src/related');
        const deleted = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 1);
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: flatten DELETE followed by CREATE into CHANGE', done => {
        const watch = disposables.add(new TestFileWatcher());
        const deleted = URI.file('/users/data/src/related');
        const created = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(deleted, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: ignore UPDATE when CREATE received', done => {
        const watch = disposables.add(new TestFileWatcher());
        const created = URI.file('/users/data/src/related');
        const updated = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(created, 1 /* FileChangeType.ADDED */));
            assert.ok(!event.contains(created, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: apply DELETE', done => {
        const watch = disposables.add(new TestFileWatcher());
        const updated = URI.file('/users/data/src/related');
        const updated2 = URI.file('/users/data/src/related');
        const deleted = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: updated2, type: 0 /* FileChangeType.UPDATED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: updated, type: 2 /* FileChangeType.DELETED */ }
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(deleted, 2 /* FileChangeType.DELETED */));
            assert.ok(!event.contains(updated, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: track case renames', done => {
        const watch = disposables.add(new TestFileWatcher());
        const oldPath = URI.file('/users/data/src/added');
        const newPath = URI.file('/users/data/src/ADDED');
        const raw = [
            { resource: newPath, type: 1 /* FileChangeType.ADDED */ },
            { resource: oldPath, type: 2 /* FileChangeType.DELETED */ }
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            for (const r of raw) {
                if (isEqual(r.resource, oldPath)) {
                    assert.strictEqual(r.type, 2 /* FileChangeType.DELETED */);
                }
                else if (isEqual(r.resource, newPath)) {
                    assert.strictEqual(r.type, 1 /* FileChangeType.ADDED */);
                }
                else {
                    assert.fail();
                }
            }
            done();
        }));
        watch.report(raw);
    });
    test('event type filter', () => {
        const resource = URI.file('/users/data/src/related');
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 2 /* FileChangeFilter.UPDATED */), true);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */), true);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */ | 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 2 /* FileChangeFilter.UPDATED */), true);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 2 /* FileChangeFilter.UPDATED */ | 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 8 /* FileChangeFilter.DELETED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 8 /* FileChangeFilter.DELETED */ | 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9jb21tb24vd2F0Y2hlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFvQixnQkFBZ0IsRUFBK0IsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RyxPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTlHLE1BQU0sZUFBZ0IsU0FBUSxVQUFVO0lBR3ZDO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBbUQsQ0FBQyxDQUFDO0lBQ3pHLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7SUFDckMsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFzQjtRQUM1QixJQUFJLENBQUMsZUFBZSxD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