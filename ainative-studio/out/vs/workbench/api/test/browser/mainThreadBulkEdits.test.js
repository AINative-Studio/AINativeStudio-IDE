/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../base/test/common/mock.js';
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { reviveWorkspaceEditDto } from '../../browser/mainThreadBulkEdits.js';
import { UriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadBulkEdits', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('"Rename failed to apply edits" in monorepo with pnpm #158845', function () {
        const fileService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeFileSystemProviderCapabilities = Event.None;
                this.onDidChangeFileSystemProviderRegistrations = Event.None;
            }
            hasProvider(uri) {
                return true;
            }
            hasCapability(resource, capability) {
                // if (resource.scheme === 'case' && capability === FileSystemProviderCapabilities.PathCaseSensitive) {
                // 	return false;
                // }
                // NO capabilities, esp not being case-sensitive
                return false;
            }
        };
        const uriIdentityService = new UriIdentityService(fileService);
        const edits = [
            { resource: URI.from({ scheme: 'case', path: '/hello/WORLD/foo.txt' }), textEdit: { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'sss' }, versionId: undefined },
            { resource: URI.from({ scheme: 'case', path: '/heLLO/world/fOO.txt' }), textEdit: { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'sss' }, versionId: undefined },
            { resource: URI.from({ scheme: 'case', path: '/other/path.txt' }), textEdit: { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'sss' }, versionId: undefined },
            { resource: URI.from({ scheme: 'foo', path: '/other/path.txt' }), textEdit: { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'sss' }, versionId: undefined },
        ];
        const out = reviveWorkspaceEditDto({ edits }, uriIdentityService);
        assert.strictEqual(out.edits[0].resource.path, '/hello/WORLD/foo.txt');
        assert.strictEqual(out.edits[1].resource.path, '/hello/WORLD/foo.txt'); // the FIRST occurrence defined the shape!
        assert.strictEqual(out.edits[2].resource.path, '/other/path.txt');
        assert.strictEqual(out.edits[3].resource.path, '/other/path.txt');
        uriIdentityService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEJ1bGtFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRCdWxrRWRpdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFbkcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLHFCQUFxQixFQUFFO0lBRTVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDhEQUE4RCxFQUFFO1FBR3BFLE1BQU0sV0FBVyxHQUFHLElBQUksS0FBTSxTQUFRLElBQUksRUFBZ0I7WUFBbEM7O2dCQUNkLDhDQUF5QyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZELCtDQUEwQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFhbEUsQ0FBQztZQVhTLFdBQVcsQ0FBQyxHQUFRO2dCQUM1QixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFUSxhQUFhLENBQUMsUUFBYSxFQUFFLFVBQTBDO2dCQUMvRSx1R0FBdUc7Z0JBQ3ZHLGlCQUFpQjtnQkFDakIsSUFBSTtnQkFDSixnREFBZ0Q7Z0JBQ2hELE9B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