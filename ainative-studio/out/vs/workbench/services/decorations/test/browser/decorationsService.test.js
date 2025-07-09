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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2RlY29yYXRpb25zL3Rlc3QvYnJvd3Nlci9kZWNvcmF0aW9uc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxLQUFLLFNBQVMsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLG9CQUFvQixFQUFFO0lBRTNCLElBQUksT0FBMkIsQ0FBQztJQUVoQyxLQUFLLENBQUM7UUFDTCxPQUFPLEdBQUcsSUFBSSxrQkFBa0IsQ0FDL0IsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUF1QjtZQUF6Qzs7Z0JBQ00sV0FBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDcEMsQ0FBQztTQUFBLEVBQ0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUN0QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUM7UUFDUixP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