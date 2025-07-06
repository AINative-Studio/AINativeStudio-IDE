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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWREaWFnbm9zdGljcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHL0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBR3JFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRTtJQUU5QixJQUFJLGFBQTRCLENBQUM7SUFFakMsS0FBSyxDQUFDO1FBQ0wsYUFBYSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7SUFDckMsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUM7UUFDUixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUVoQyxNQUFNLElBQUksR0FBRyxJQUFJLHFCQUFxQixDQUNyQyxJQUFJO1lBQUE7Z0JBQ0gsb0JBQWUsR0FBRyxFQUFFLENBQUM7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