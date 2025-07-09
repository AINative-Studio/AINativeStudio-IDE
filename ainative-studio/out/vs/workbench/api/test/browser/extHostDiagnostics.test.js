/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { DiagnosticCollection, ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import { Diagnostic, DiagnosticSeverity, Range, DiagnosticRelatedInformation, Location } from '../../common/extHostTypes.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { mock } from '../../../../base/test/common/mock.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { ExtUri, extUri } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostDiagnostics', () => {
    class DiagnosticsShape extends mock() {
        $changeMany(owner, entries) {
            //
        }
        $clear(owner) {
            //
        }
    }
    const fileSystemInfoService = new class extends mock() {
        constructor() {
            super(...arguments);
            this.extUri = extUri;
        }
    };
    const versionProvider = (uri) => {
        return undefined;
    };
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('disposeCheck', () => {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        collection.dispose();
        collection.dispose(); // that's OK
        assert.throws(() => collection.name);
        assert.throws(() => collection.clear());
        assert.throws(() => collection.delete(URI.parse('aa:bb')));
        assert.throws(() => collection.forEach(() => { }));
        assert.throws(() => collection.get(URI.parse('aa:bb')));
        assert.throws(() => collection.has(URI.parse('aa:bb')));
        assert.throws(() => collection.set(URI.parse('aa:bb'), []));
        assert.throws(() => collection.set(URI.parse('aa:bb'), undefined));
    });
    test('diagnostic collection, forEach, clear, has', function () {
        let collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        assert.strictEqual(collection.name, 'test');
        collection.dispose();
        assert.throws(() => collection.name);
        let c = 0;
        collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        collection.forEach(() => c++);
        assert.strictEqual(c, 0);
        collection.set(URI.parse('foo:bar'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2')
        ]);
        collection.forEach(() => c++);
        assert.strictEqual(c, 1);
        c = 0;
        collection.clear();
        collection.forEach(() => c++);
        assert.strictEqual(c, 0);
        collection.set(URI.parse('foo:bar1'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2')
        ]);
        collection.set(URI.parse('foo:bar2'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2')
        ]);
        collection.forEach(() => c++);
        assert.strictEqual(c, 2);
        assert.ok(collection.has(URI.parse('foo:bar1')));
        assert.ok(collection.has(URI.parse('foo:bar2')));
        assert.ok(!collection.has(URI.parse('foo:bar3')));
        collection.delete(URI.parse('foo:bar1'));
        assert.ok(!collection.has(URI.parse('foo:bar1')));
        collection.dispose();
    });
    test('diagnostic collection, immutable read', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        collection.set(URI.parse('foo:bar'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2')
        ]);
        let array = collection.get(URI.parse('foo:bar'));
        assert.throws(() => array.length = 0);
        assert.throws(() => array.pop());
        assert.throws(() => array[0] = new Diagnostic(new Range(0, 0, 0, 0), 'evil'));
        collection.forEach((uri, array) => {
            assert.throws(() => array.length = 0);
            assert.throws(() => array.pop());
            assert.throws(() => array[0] = new Diagnostic(new Range(0, 0, 0, 0), 'evil'));
        });
        array = collection.get(URI.parse('foo:bar'));
        assert.strictEqual(array.length, 2);
        collection.dispose();
    });
    test('diagnostics collection, set with dupliclated tuples', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        const uri = URI.parse('sc:hightower');
        collection.set([
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-1')]],
            [URI.parse('some:thing'), [new Diagnostic(new Range(0, 0, 1, 1), 'something')]],
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-2')]],
        ]);
        let array = collection.get(uri);
        assert.strictEqual(array.length, 2);
        let [first, second] = array;
        assert.strictEqual(first.message, 'message-1');
        assert.strictEqual(second.message, 'message-2');
        // clear
        collection.delete(uri);
        assert.ok(!collection.has(uri));
        // bad tuple clears 1/2
        collection.set([
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-1')]],
            [URI.parse('some:thing'), [new Diagnostic(new Range(0, 0, 1, 1), 'something')]],
            [uri, undefined]
        ]);
        assert.ok(!collection.has(uri));
        // clear
        collection.delete(uri);
        assert.ok(!collection.has(uri));
        // bad tuple clears 2/2
        collection.set([
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-1')]],
            [URI.parse('some:thing'), [new Diagnostic(new Range(0, 0, 1, 1), 'something')]],
            [uri, undefined],
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-2')]],
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-3')]],
        ]);
        array = collection.get(uri);
        assert.strictEqual(array.length, 2);
        [first, second] = array;
        assert.strictEqual(first.message, 'message-2');
        assert.strictEqual(second.message, 'message-3');
        collection.dispose();
    });
    test('diagnostics collection, set tuple overrides, #11547', function () {
        let lastEntries;
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                lastEntries = entries;
                return super.$changeMany(owner, entries);
            }
        }, new Emitter());
        const uri = URI.parse('sc:hightower');
        collection.set([[uri, [new Diagnostic(new Range(0, 0, 1, 1), 'error')]]]);
        assert.strictEqual(collection.get(uri).length, 1);
        assert.strictEqual(collection.get(uri)[0].message, 'error');
        assert.strictEqual(lastEntries.length, 1);
        const [[, data1]] = lastEntries;
        assert.strictEqual(data1.length, 1);
        assert.strictEqual(data1[0].message, 'error');
        lastEntries = undefined;
        collection.set([[uri, [new Diagnostic(new Range(0, 0, 1, 1), 'warning')]]]);
        assert.strictEqual(collection.get(uri).length, 1);
        assert.strictEqual(collection.get(uri)[0].message, 'warning');
        assert.strictEqual(lastEntries.length, 1);
        const [[, data2]] = lastEntries;
        assert.strictEqual(data2.length, 1);
        assert.strictEqual(data2[0].message, 'warning');
        lastEntries = undefined;
    });
    test('do send message when not making a change', function () {
        let changeCount = 0;
        let eventCount = 0;
        const emitter = new Emitter();
        store.add(emitter.event(_ => eventCount += 1));
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new class extends DiagnosticsShape {
            $changeMany() {
                changeCount += 1;
            }
        }, emitter);
        const uri = URI.parse('sc:hightower');
        const diag = new Diagnostic(new Range(0, 0, 0, 1), 'ffff');
        collection.set(uri, [diag]);
        assert.strictEqual(changeCount, 1);
        assert.strictEqual(eventCount, 1);
        collection.set(uri, [diag]);
        assert.strictEqual(changeCount, 2);
        assert.strictEqual(eventCount, 2);
    });
    test('diagnostics collection, tuples and undefined (small array), #15585', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        const uri = URI.parse('sc:hightower');
        const uri2 = URI.parse('sc:nomad');
        const diag = new Diagnostic(new Range(0, 0, 0, 1), 'ffff');
        collection.set([
            [uri, [diag, diag, diag]],
            [uri, undefined],
            [uri, [diag]],
            [uri2, [diag, diag]],
            [uri2, undefined],
            [uri2, [diag]],
        ]);
        assert.strictEqual(collection.get(uri).length, 1);
        assert.strictEqual(collection.get(uri2).length, 1);
    });
    test('diagnostics collection, tuples and undefined (large array), #15585', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        const tuples = [];
        for (let i = 0; i < 500; i++) {
            const uri = URI.parse('sc:hightower#' + i);
            const diag = new Diagnostic(new Range(0, 0, 0, 1), i.toString());
            tuples.push([uri, [diag, diag, diag]]);
            tuples.push([uri, undefined]);
            tuples.push([uri, [diag]]);
        }
        collection.set(tuples);
        for (let i = 0; i < 500; i++) {
            const uri = URI.parse('sc:hightower#' + i);
            assert.strictEqual(collection.has(uri), true);
            assert.strictEqual(collection.get(uri).length, 1);
        }
    });
    test('diagnostic capping (max per file)', function () {
        let lastEntries;
        const collection = new DiagnosticCollection('test', 'test', 100, 250, versionProvider, extUri, new class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                lastEntries = entries;
                return super.$changeMany(owner, entries);
            }
        }, new Emitter());
        const uri = URI.parse('aa:bb');
        const diagnostics = [];
        for (let i = 0; i < 500; i++) {
            diagnostics.push(new Diagnostic(new Range(i, 0, i + 1, 0), `error#${i}`, i < 300
                ? DiagnosticSeverity.Warning
                : DiagnosticSeverity.Error));
        }
        collection.set(uri, diagnostics);
        assert.strictEqual(collection.get(uri).length, 500);
        assert.strictEqual(lastEntries.length, 1);
        assert.strictEqual(lastEntries[0][1].length, 251);
        assert.strictEqual(lastEntries[0][1][0].severity, MarkerSeverity.Error);
        assert.strictEqual(lastEntries[0][1][200].severity, MarkerSeverity.Warning);
        assert.strictEqual(lastEntries[0][1][250].severity, MarkerSeverity.Info);
    });
    test('diagnostic capping (max files)', function () {
        let lastEntries;
        const collection = new DiagnosticCollection('test', 'test', 2, 1, versionProvider, extUri, new class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                lastEntries = entries;
                return super.$changeMany(owner, entries);
            }
        }, new Emitter());
        const diag = new Diagnostic(new Range(0, 0, 1, 1), 'Hello');
        collection.set([
            [URI.parse('aa:bb1'), [diag]],
            [URI.parse('aa:bb2'), [diag]],
            [URI.parse('aa:bb3'), [diag]],
            [URI.parse('aa:bb4'), [diag]],
        ]);
        assert.strictEqual(lastEntries.length, 3); // goes above the limit and then stops
    });
    test('diagnostic eventing', async function () {
        const emitter = new Emitter();
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), emitter);
        const diag1 = new Diagnostic(new Range(1, 1, 2, 3), 'diag1');
        const diag2 = new Diagnostic(new Range(1, 1, 2, 3), 'diag2');
        const diag3 = new Diagnostic(new Range(1, 1, 2, 3), 'diag3');
        let p = Event.toPromise(emitter.event).then(a => {
            assert.strictEqual(a.length, 1);
            assert.strictEqual(a[0].toString(), 'aa:bb');
            assert.ok(URI.isUri(a[0]));
        });
        collection.set(URI.parse('aa:bb'), []);
        await p;
        p = Event.toPromise(emitter.event).then(e => {
            assert.strictEqual(e.length, 2);
            assert.ok(URI.isUri(e[0]));
            assert.ok(URI.isUri(e[1]));
            assert.strictEqual(e[0].toString(), 'aa:bb');
            assert.strictEqual(e[1].toString(), 'aa:cc');
        });
        collection.set([
            [URI.parse('aa:bb'), [diag1]],
            [URI.parse('aa:cc'), [diag2, diag3]],
        ]);
        await p;
        p = Event.toPromise(emitter.event).then(e => {
            assert.strictEqual(e.length, 2);
            assert.ok(URI.isUri(e[0]));
            assert.ok(URI.isUri(e[1]));
        });
        collection.clear();
        await p;
    });
    test('vscode.languages.onDidChangeDiagnostics Does Not Provide Document URI #49582', async function () {
        const emitter = new Emitter();
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), emitter);
        const diag1 = new Diagnostic(new Range(1, 1, 2, 3), 'diag1');
        // delete
        collection.set(URI.parse('aa:bb'), [diag1]);
        let p = Event.toPromise(emitter.event).then(e => {
            assert.strictEqual(e[0].toString(), 'aa:bb');
        });
        collection.delete(URI.parse('aa:bb'));
        await p;
        // set->undefined (as delete)
        collection.set(URI.parse('aa:bb'), [diag1]);
        p = Event.toPromise(emitter.event).then(e => {
            assert.strictEqual(e[0].toString(), 'aa:bb');
        });
        collection.set(URI.parse('aa:bb'), undefined);
        await p;
    });
    test('diagnostics with related information', function (done) {
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                const [[, data]] = entries;
                assert.strictEqual(entries.length, 1);
                assert.strictEqual(data.length, 1);
                const [diag] = data;
                assert.strictEqual(diag.relatedInformation.length, 2);
                assert.strictEqual(diag.relatedInformation[0].message, 'more1');
                assert.strictEqual(diag.relatedInformation[1].message, 'more2');
                done();
            }
        }, new Emitter());
        const diag = new Diagnostic(new Range(0, 0, 1, 1), 'Foo');
        diag.relatedInformation = [
            new DiagnosticRelatedInformation(new Location(URI.parse('cc:dd'), new Range(0, 0, 0, 0)), 'more1'),
            new DiagnosticRelatedInformation(new Location(URI.parse('cc:ee'), new Range(0, 0, 0, 0)), 'more2')
        ];
        collection.set(URI.parse('aa:bb'), [diag]);
    });
    test('vscode.languages.getDiagnostics appears to return old diagnostics in some circumstances #54359', function () {
        const ownerHistory = [];
        const diags = new ExtHostDiagnostics(new class {
            getProxy(id) {
                return new class DiagnosticsShape {
                    $clear(owner) {
                        ownerHistory.push(owner);
                    }
                };
            }
            set() {
                return null;
            }
            dispose() { }
            assertRegistered() {
            }
            drain() {
                return undefined;
            }
        }, new NullLogService(), fileSystemInfoService, new class extends mock() {
            getDocument() {
                return undefined;
            }
        });
        const collection1 = diags.createDiagnosticCollection(nullExtensionDescription.identifier, 'foo');
        const collection2 = diags.createDiagnosticCollection(nullExtensionDescription.identifier, 'foo'); // warns, uses a different owner
        collection1.clear();
        collection2.clear();
        assert.strictEqual(ownerHistory.length, 2);
        assert.strictEqual(ownerHistory[0], 'foo');
        assert.strictEqual(ownerHistory[1], 'foo0');
    });
    test('Error updating diagnostics from extension #60394', function () {
        let callCount = 0;
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                callCount += 1;
            }
        }, new Emitter());
        const array = [];
        const diag1 = new Diagnostic(new Range(0, 0, 1, 1), 'Foo');
        const diag2 = new Diagnostic(new Range(0, 0, 1, 1), 'Bar');
        array.push(diag1, diag2);
        collection.set(URI.parse('test:me'), array);
        assert.strictEqual(callCount, 1);
        collection.set(URI.parse('test:me'), array);
        assert.strictEqual(callCount, 2); // equal array
        array.push(diag2);
        collection.set(URI.parse('test:me'), array);
        assert.strictEqual(callCount, 3); // same but un-equal array
    });
    test('Version id is set whenever possible', function () {
        const all = [];
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, uri => {
            return 7;
        }, extUri, new class extends DiagnosticsShape {
            $changeMany(_owner, entries) {
                all.push(...entries);
            }
        }, new Emitter());
        const array = [];
        const diag1 = new Diagnostic(new Range(0, 0, 1, 1), 'Foo');
        const diag2 = new Diagnostic(new Range(0, 0, 1, 1), 'Bar');
        array.push(diag1, diag2);
        collection.set(URI.parse('test:one'), array);
        collection.set(URI.parse('test:two'), [diag1]);
        collection.set(URI.parse('test:three'), [diag2]);
        const allVersions = all.map(tuple => tuple[1].map(t => t.modelVersionId)).flat();
        assert.deepStrictEqual(allVersions, [7, 7, 7, 7]);
    });
    test('Diagnostics created by tasks aren\'t accessible to extensions #47292', async function () {
        return runWithFakedTimers({}, async function () {
            const diags = new ExtHostDiagnostics(new class {
                getProxy(id) {
                    return {};
                }
                set() {
                    return null;
                }
                dispose() { }
                assertRegistered() {
                }
                drain() {
                    return undefined;
                }
            }, new NullLogService(), fileSystemInfoService, new class extends mock() {
                getDocument() {
                    return undefined;
                }
            });
            //
            const uri = URI.parse('foo:bar');
            const data = [{
                    message: 'message',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                    severity: MarkerSeverity.Info
                }];
            const p1 = Event.toPromise(diags.onDidChangeDiagnostics);
            diags.$acceptMarkersChange([[uri, data]]);
            await p1;
            assert.strictEqual(diags.getDiagnostics(uri).length, 1);
            const p2 = Event.toPromise(diags.onDidChangeDiagnostics);
            diags.$acceptMarkersChange([[uri, []]]);
            await p2;
            assert.strictEqual(diags.getDiagnostics(uri).length, 0);
        });
    });
    test('languages.getDiagnostics doesn\'t handle case insensitivity correctly #128198', function () {
        const diags = new ExtHostDiagnostics(new class {
            getProxy(id) {
                return new DiagnosticsShape();
            }
            set() {
                return null;
            }
            dispose() { }
            assertRegistered() {
            }
            drain() {
                return undefined;
            }
        }, new NullLogService(), new class extends mock() {
            constructor() {
                super(...arguments);
                this.extUri = new ExtUri(uri => uri.scheme === 'insensitive');
            }
        }, new class extends mock() {
            getDocument() {
                return undefined;
            }
        });
        const col = diags.createDiagnosticCollection(nullExtensionDescription.identifier);
        const uriSensitive = URI.from({ scheme: 'foo', path: '/SOME/path' });
        const uriSensitiveCaseB = uriSensitive.with({ path: uriSensitive.path.toUpperCase() });
        const uriInSensitive = URI.from({ scheme: 'insensitive', path: '/SOME/path' });
        const uriInSensitiveUpper = uriInSensitive.with({ path: uriInSensitive.path.toUpperCase() });
        col.set(uriSensitive, [new Diagnostic(new Range(0, 0, 0, 0), 'sensitive')]);
        col.set(uriInSensitive, [new Diagnostic(new Range(0, 0, 0, 0), 'insensitive')]);
        // collection itself honours casing
        assert.strictEqual(col.get(uriSensitive)?.length, 1);
        assert.strictEqual(col.get(uriSensitiveCaseB)?.length, 0);
        assert.strictEqual(col.get(uriInSensitive)?.length, 1);
        assert.strictEqual(col.get(uriInSensitiveUpper)?.length, 1);
        // languages.getDiagnostics honours casing
        assert.strictEqual(diags.getDiagnostics(uriSensitive)?.length, 1);
        assert.strictEqual(diags.getDiagnostics(uriSensitiveCaseB)?.length, 0);
        assert.strictEqual(diags.getDiagnostics(uriInSensitive)?.length, 1);
        assert.strictEqual(diags.getDiagnostics(uriInSensitiveUpper)?.length, 1);
        const fromForEach = [];
        col.forEach(uri => fromForEach.push(uri));
        assert.strictEqual(fromForEach.length, 2);
        assert.strictEqual(fromForEach[0].toString(), uriSensitive.toString());
        assert.strictEqual(fromForEach[1].toString(), uriInSensitive.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdERpYWdub3N0aWNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsNEJBQTRCLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFN0gsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXpGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFFaEMsTUFBTSxnQkFBaUIsU0FBUSxJQUFJLEVBQThCO1FBQ3ZELFdBQVcsQ0FBQyxLQUFhLEVBQUUsT0FBeUM7WUFDNUUsRUFBRTtRQUNILENBQUM7UUFDUSxNQUFNLENBQUMsS0FBYTtZQUM1QixFQUFFO1FBQ0gsQ0FBQztLQUNEO0lBRUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTBCO1FBQTVDOztZQUNmLFdBQU0sR0FBRyxNQUFNLENBQUM7UUFDbkMsQ0FBQztLQUFBLENBQUM7SUFFRixNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQVEsRUFBc0IsRUFBRTtRQUN4RCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDLENBQUM7SUFFRixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBRXpCLE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxFQUFFLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztRQUV0SSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsWUFBWTtRQUNsQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBVSxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQyw0Q0FBNEMsRUFBRTtRQUNsRCxJQUFJLFVBQVUsR0FBRyxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLElBQUksZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDcEksTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixVQUFVLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxJQUFJLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ2hJLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6QixVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1lBQ2xELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztTQUNsRCxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNOLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNuQixVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3JDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztZQUNsRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUM7U0FDbEQsQ0FBQyxDQUFDO1FBQ0gsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3JDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztZQUNsRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUM7U0FDbEQsQ0FBQyxDQUFDO1FBQ0gsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpCLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEQsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFO1FBQzdDLE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxFQUFFLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN0SSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1lBQ2xELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztTQUNsRCxDQUFDLENBQUM7UUFFSCxJQUFJLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQWlCLENBQUM7UUFDakUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUU5RSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBUSxFQUFFLEtBQW1DLEVBQU8sRUFBRTtZQUN6RSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFFLEtBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUUsS0FBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUUsS0FBc0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBaUIsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0lBR0gsSUFBSSxDQUFDLHFEQUFxRCxFQUFFO1FBQzNELE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxFQUFFLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN0SSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3RDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDZCxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMvRSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7U0FDM0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVoRCxRQUFRO1FBQ1IsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWhDLHVCQUF1QjtRQUN2QixVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ2QsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDL0UsQ0FBQyxHQUFHLEVBQUUsU0FBVSxDQUFDO1NBQ2pCLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFaEMsUUFBUTtRQUNSLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVoQyx1QkFBdUI7UUFDdkIsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNkLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQy9FLENBQUMsR0FBRyxFQUFFLFNBQVUsQ0FBQztZQUNqQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1NBQzNELENBQUMsQ0FBQztRQUVILEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVoRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscURBQXFELEVBQUU7UUFFM0QsSUFBSSxXQUE4QyxDQUFDO1FBQ25ELE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsSUFBSSxLQUFNLFNBQVEsZ0JBQWdCO1lBQ3ZILFdBQVcsQ0FBQyxLQUFhLEVBQUUsT0FBeUM7Z0JBQzVFLFdBQVcsR0FBRyxPQUFPLENBQUM7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDMUMsQ0FBQztTQUNELEVBQUUsSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFdEMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUM7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxXQUFXLEdBQUcsU0FBVSxDQUFDO1FBRXpCLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztR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QUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxDQUFDO1FBRVIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ2QsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3BDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxDQUFDO1FBRVIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLEVBQUUs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