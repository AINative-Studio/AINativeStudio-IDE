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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3QvY29tbW9uL3dhdGNoZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBb0IsZ0JBQWdCLEVBQStCLE1BQU0sdUJBQXVCLENBQUM7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU5RyxNQUFNLGVBQWdCLFNBQVEsVUFBVTtJQUd2QztRQUNDLEtBQUssRUFBRSxDQUFDO1FBRVIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW1ELENBQUMsQ0FBQztJQUN6RyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBc0I7UUFDNUIsSUFBSSxDQUFDLGVBQWUs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