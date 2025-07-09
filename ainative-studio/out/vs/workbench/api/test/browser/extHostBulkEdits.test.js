/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as extHostTypes from '../../common/extHostTypes.js';
import { MainContext } from '../../common/extHost.protocol.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { SingleProxyRPCProtocol, TestRPCProtocol } from '../common/testRPCProtocol.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostBulkEdits } from '../../common/extHostBulkEdits.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostBulkEdits.applyWorkspaceEdit', () => {
    const resource = URI.parse('foo:bar');
    let bulkEdits;
    let workspaceResourceEdits;
    setup(() => {
        workspaceResourceEdits = null;
        const rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadBulkEdits, new class extends mock() {
            $tryApplyWorkspaceEdit(_workspaceResourceEdits) {
                workspaceResourceEdits = _workspaceResourceEdits.value;
                return Promise.resolve(true);
            }
        });
        const documentsAndEditors = new ExtHostDocumentsAndEditors(SingleProxyRPCProtocol(null), new NullLogService());
        documentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [{
                    isDirty: false,
                    languageId: 'foo',
                    uri: resource,
                    versionId: 1337,
                    lines: ['foo'],
                    EOL: '\n',
                    encoding: 'utf8'
                }]
        });
        bulkEdits = new ExtHostBulkEdits(rpcProtocol, documentsAndEditors);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('uses version id if document available', async () => {
        const edit = new extHostTypes.WorkspaceEdit();
        edit.replace(resource, new extHostTypes.Range(0, 0, 0, 0), 'hello');
        await bulkEdits.applyWorkspaceEdit(edit, nullExtensionDescription, undefined);
        assert.strictEqual(workspaceResourceEdits.edits.length, 1);
        const [first] = workspaceResourceEdits.edits;
        assert.strictEqual(first.versionId, 1337);
    });
    test('does not use version id if document is not available', async () => {
        const edit = new extHostTypes.WorkspaceEdit();
        edit.replace(URI.parse('foo:bar2'), new extHostTypes.Range(0, 0, 0, 0), 'hello');
        await bulkEdits.applyWorkspaceEdit(edit, nullExtensionDescription, undefined);
        assert.strictEqual(workspaceResourceEdits.edits.length, 1);
        const [first] = workspaceResourceEdits.edits;
        assert.ok(typeof first.versionId === 'undefined');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEJ1bGtFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RCdWxrRWRpdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLFlBQVksTUFBTSw4QkFBOEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFzRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRyxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBRWpELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEMsSUFBSSxTQUEyQixDQUFDO0lBQ2hDLElBQUksc0JBQXlDLENBQUM7SUFFOUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLHNCQUFzQixHQUFHLElBQUssQ0FB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