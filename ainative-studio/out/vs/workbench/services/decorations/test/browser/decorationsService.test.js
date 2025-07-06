/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DecorationsService } from '../../browser/decorationsService.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import * as resources from '../../../../../base/common/resources.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('DecorationsService', function () {
    let service;
    setup(function () {
        service = new DecorationsService(new class extends mock() {
            constructor() {
                super(...arguments);
                this.extUri = resources.extUri;
            }
        }, new TestThemeService());
    });
    teardown(function () {
        service.dispose();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Async provider, async/evented result', function () {
        return runWithFakedTimers({}, async function () {
            const uri = URI.parse('foo:bar');
            let callCounter = 0;
            const reg = service.registerDecorationsProvider(new class {
                constructor() {
                    this.label = 'Test';
                    this.onDidChange = Event.None;
                }
                provideDecorations(uri) {
                    callCounter += 1;
                    return new Promise(resolve => {
                        setTimeout(() => resolve({
                            color: 'someBlue',
                            tooltip: 'T',
                            strikethrough: true
                        }));
                    });
                }
            });
            // trigger -> async
            assert.strictEqual(service.getDecoration(uri, false), undefined);
            assert.strictEqual(callCounter, 1);
            // event when result is computed
            const e = await Event.toPromise(service.onDidChangeDecorations);
            assert.strictEqual(e.affectsResource(uri), true);
            // sync result
            assert.deepStrictEqual(service.getDecoration(uri, false).tooltip, 'T');
            assert.deepStrictEqual(service.getDecoration(uri, false).strikethrough, true);
            assert.strictEqual(callCounter, 1);
            reg.dispose();
        });
    });
    test('Sync provider, sync result', function () {
        const uri = URI.parse('foo:bar');
        let callCounter = 0;
        const reg = service.registerDecorationsProvider(new class {
            constructor() {
                this.label = 'Test';
                this.onDidChange = Event.None;
            }
            provideDecorations(uri) {
                callCounter += 1;
                return { color: 'someBlue', tooltip: 'Z' };
            }
        });
        // trigger -> sync
        assert.deepStrictEqual(service.getDecoration(uri, false).tooltip, 'Z');
        assert.deepStrictEqual(service.getDecoration(uri, false).strikethrough, false);
        assert.strictEqual(callCounter, 1);
        reg.dispose();
    });
    test('Clear decorations on provider dispose', async function () {
        return runWithFakedTimers({}, async function () {
            const uri = URI.parse('foo:bar');
            let callCounter = 0;
            const reg = service.registerDecorationsProvider(new class {
                constructor() {
                    this.label = 'Test';
                    this.onDidChange = Event.None;
                }
                provideDecorations(uri) {
                    callCounter += 1;
                    return { color: 'someBlue', tooltip: 'J' };
                }
            });
            // trigger -> sync
            assert.deepStrictEqual(service.getDecoration(uri, false).tooltip, 'J');
            assert.strictEqual(callCounter, 1);
            // un-register -> ensure good event
            let didSeeEvent = false;
            const p = new Promise(resolve => {
                const l = service.onDidChangeDecorations(e => {
                    assert.strictEqual(e.affectsResource(uri), true);
                    assert.deepStrictEqual(service.getDecoration(uri, false), undefined);
                    assert.strictEqual(callCounter, 1);
                    didSeeEvent = true;
                    l.dispose();
                    resolve();
                });
            });
            reg.dispose(); // will clear all data
            await p;
            assert.strictEqual(didSeeEvent, true);
        });
    });
    test('No default bubbling', function () {
        let reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: Event.None,
            provideDecorations(uri) {
                return uri.path.match(/\.txt/)
                    ? { tooltip: '.txt', weight: 17 }
                    : undefined;
            }
        });
        const childUri = URI.parse('file:///some/path/some/file.txt');
        let deco = service.getDecoration(childUri, false);
        assert.strictEqual(deco.tooltip, '.txt');
        deco = service.getDecoration(childUri.with({ path: 'some/path/' }), true);
        assert.strictEqual(deco, undefined);
        reg.dispose();
        // bubble
        reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: Event.None,
            provideDecorations(uri) {
                return uri.path.match(/\.txt/)
                    ? { tooltip: '.txt.bubble', weight: 71, bubble: true }
                    : undefined;
            }
        });
        deco = service.getDecoration(childUri, false);
        assert.strictEqual(deco.tooltip, '.txt.bubble');
        deco = service.getDecoration(childUri.with({ path: 'some/path/' }), true);
        assert.strictEqual(typeof deco.tooltip, 'string');
        reg.dispose();
    });
    test('Decorations not showing up for second root folder #48502', async function () {
        let cancelCount = 0;
        let callCount = 0;
        const provider = new class {
            constructor() {
                this._onDidChange = new Emitter();
                this.onDidChange = this._onDidChange.event;
                this.label = 'foo';
            }
            provideDecorations(uri, token) {
                store.add(token.onCancellationRequested(() => {
                    cancelCount += 1;
                }));
                return new Promise(resolve => {
                    callCount += 1;
                    setTimeout(() => {
                        resolve({ letter: 'foo' });
                    }, 10);
                });
            }
        };
        const reg = service.registerDecorationsProvider(provider);
        const uri = URI.parse('foo://bar');
        const d1 = service.getDecoration(uri, false);
        provider._onDidChange.fire([uri]);
        const d2 = service.getDecoration(uri, false);
        assert.strictEqual(cancelCount, 1);
        assert.strictEqual(callCount, 2);
        d1?.dispose();
        d2?.dispose();
        reg.dispose();
    });
    test('Decorations not bubbling... #48745', function () {
        const reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: Event.None,
            provideDecorations(uri) {
                if (uri.path.match(/hello$/)) {
                    return { tooltip: 'FOO', weight: 17, bubble: true };
                }
                else {
                    return new Promise(_resolve => { });
                }
            }
        });
        const data1 = service.getDecoration(URI.parse('a:b/'), true);
        assert.ok(!data1);
        const data2 = service.getDecoration(URI.parse('a:b/c.hello'), false);
        assert.ok(data2.tooltip);
        const data3 = service.getDecoration(URI.parse('a:b/'), true);
        assert.ok(data3);
        reg.dispose();
    });
    test('Folder decorations don\'t go away when file with problems is deleted #61919 (part1)', function () {
        const emitter = new Emitter();
        let gone = false;
        const reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: emitter.event,
            provideDecorations(uri) {
                if (!gone && uri.path.match(/file.ts$/)) {
                    return { tooltip: 'FOO', weight: 17, bubble: true };
                }
                return undefined;
            }
        });
        const uri = URI.parse('foo:/folder/file.ts');
        const uri2 = URI.parse('foo:/folder/');
        let data = service.getDecoration(uri, true);
        assert.strictEqual(data.tooltip, 'FOO');
        data = service.getDecoration(uri2, true);
        assert.ok(data.tooltip); // emphazied items...
        gone = true;
        emitter.fire([uri]);
        data = service.getDecoration(uri, true);
        assert.strictEqual(data, undefined);
        data = service.getDecoration(uri2, true);
        assert.strictEqual(data, undefined);
        reg.dispose();
    });
    test('Folder decorations don\'t go away when file with problems is deleted #61919 (part2)', function () {
        return runWithFakedTimers({}, async function () {
            const emitter = new Emitter();
            let gone = false;
            const reg = service.registerDecorationsProvider({
                label: 'Test',
                onDidChange: emitter.event,
                provideDecorations(uri) {
                    if (!gone && uri.path.match(/file.ts$/)) {
                        return { tooltip: 'FOO', weight: 17, bubble: true };
                    }
                    return undefined;
                }
            });
            const uri = URI.parse('foo:/folder/file.ts');
            const uri2 = URI.parse('foo:/folder/');
            let data = service.getDecoration(uri, true);
            assert.strictEqual(data.tooltip, 'FOO');
            data = service.getDecoration(uri2, true);
            assert.ok(data.tooltip); // emphazied items...
            return new Promise((resolve, reject) => {
                const l = service.onDidChangeDecorations(e => {
                    l.dispose();
                    try {
                        assert.ok(e.affectsResource(uri));
                        assert.ok(e.affectsResource(uri2));
                        resolve();
                        reg.dispose();
                    }
                    catch (err) {
                        reject(err);
                        reg.dispose();
                    }
                });
                gone = true;
                emitter.fire([uri]);
            });
        });
    });
    test('FileDecorationProvider intermittently fails #133210', async function () {
        const invokeOrder = [];
        store.add(service.registerDecorationsProvider(new class {
            constructor() {
                this.label = 'Provider-1';
                this.onDidChange = Event.None;
            }
            provideDecorations() {
                invokeOrder.push(this.label);
                return undefined;
            }
        }));
        store.add(service.registerDecorationsProvider(new class {
            constructor() {
                this.label = 'Provider-2';
                this.onDidChange = Event.None;
            }
            provideDecorations() {
                invokeOrder.push(this.label);
                return undefined;
            }
        }));
        service.getDecoration(URI.parse('test://me/path'), false);
        assert.deepStrictEqual(invokeOrder, ['Provider-2', 'Provider-1']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kZWNvcmF0aW9ucy90ZXN0L2Jyb3dzZXIvZGVjb3JhdGlvbnNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxTQUFTLE1BQU0seUNBQXlDLENBQUM7QUFFckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxvQkFBb0IsRUFBRTtJQUUzQixJQUFJLE9BQTJCLENBQUM7SUFFaEMsS0FBSyxDQUFDO1FBQ0wsT0FBTyxHQUFHLElBQUksa0JBQWtCLENBQy9CLElBQUksS0FBTSxTQUFRLElBQUksRUFBdUI7WUFBekM7O2dCQUNNLFdBQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQ3BDLENBQUM7U0FBQSxFQUNELElBQUksZ0JBQWdCLEVBQUUsQ0FDdEIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDO1FB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