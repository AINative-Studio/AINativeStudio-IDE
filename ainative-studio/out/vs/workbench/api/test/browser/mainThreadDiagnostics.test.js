/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { MainThreadDiagnostics } from '../../browser/mainThreadDiagnostics.js';
import { mock } from '../../../test/common/workbenchTestServices.js';
suite('MainThreadDiagnostics', function () {
    let markerService;
    setup(function () {
        markerService = new MarkerService();
    });
    teardown(function () {
        markerService.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('clear markers on dispose', function () {
        const diag = new MainThreadDiagnostics(new class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) { return null; }
            getProxy() {
                return {
                    $acceptMarkersChange() { }
                };
            }
            drain() { return null; }
        }, markerService, new class extends mock() {
            asCanonicalUri(uri) { return uri; }
        });
        diag.$changeMany('foo', [[URI.file('a'), [{
                        code: '666',
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1,
                        message: 'fffff',
                        severity: 1,
                        source: 'me'
                    }]]]);
        assert.strictEqual(markerService.read().length, 1);
        diag.dispose();
        assert.strictEqual(markerService.read().length, 0);
    });
    test('OnDidChangeDiagnostics triggers twice on same diagnostics #136434', function () {
        return runWithFakedTimers({}, async () => {
            const changedData = [];
            const diag = new MainThreadDiagnostics(new class {
                constructor() {
                    this.remoteAuthority = '';
                    this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
                }
                dispose() { }
                assertRegistered() { }
                set(v) { return null; }
                getProxy() {
                    return {
                        $acceptMarkersChange(data) {
                            changedData.push(data);
                        }
                    };
                }
                drain() { return null; }
            }, markerService, new class extends mock() {
                asCanonicalUri(uri) { return uri; }
            });
            const markerDataStub = {
                code: '666',
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                severity: 1,
                source: 'me'
            };
            const target = URI.file('a');
            diag.$changeMany('foo', [[target, [{ ...markerDataStub, message: 'same_owner' }]]]);
            markerService.changeOne('bar', target, [{ ...markerDataStub, message: 'forgein_owner' }]);
            // added one marker via the API and one via the ext host. the latter must not
            // trigger an event to the extension host
            await timeout(0);
            assert.strictEqual(markerService.read().length, 2);
            assert.strictEqual(changedData.length, 1);
            assert.strictEqual(changedData[0].length, 1);
            assert.strictEqual(changedData[0][0][1][0].message, 'forgein_owner');
            diag.dispose();
        });
    });
    test('onDidChangeDiagnostics different behavior when "extensionKind" ui running on remote workspace #136955', function () {
        return runWithFakedTimers({}, async () => {
            const markerData = {
                code: '666',
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                severity: 1,
                source: 'me',
                message: 'message'
            };
            const target = URI.file('a');
            markerService.changeOne('bar', target, [markerData]);
            const changedData = [];
            const diag = new MainThreadDiagnostics(new class {
                constructor() {
                    this.remoteAuthority = '';
                    this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
                }
                dispose() { }
                assertRegistered() { }
                set(v) { return null; }
                getProxy() {
                    return {
                        $acceptMarkersChange(data) {
                            changedData.push(data);
                        }
                    };
                }
                drain() { return null; }
            }, markerService, new class extends mock() {
                asCanonicalUri(uri) { return uri; }
            });
            diag.$clear('bar');
            await timeout(0);
            assert.strictEqual(markerService.read().length, 0);
            assert.strictEqual(changedData.length, 1);
            diag.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZERpYWdub3N0aWNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUdyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUcvRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHckUsS0FBSyxDQUFDLHVCQUF1QixFQUFFO0lBRTlCLElBQUksYUFBNEIsQ0FBQztJQUVqQyxLQUFLLENBQUM7UUFDTCxhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQztRQUNSLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFO1FBRWhDLE1BQU0sSUFBSSxHQUFHLElBQUkscUJBQXFCLENBQ3JDLElBQUk7WUFBQTtnQkFDSCxvQkFBZSxHQUFHLEVBQUUsQ0FBQztnQkFD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