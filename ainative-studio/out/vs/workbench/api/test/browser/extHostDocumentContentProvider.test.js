/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtHostDocumentContentProvider } from '../../common/extHostDocumentContentProviders.js';
import { Emitter } from '../../../../base/common/event.js';
import { timeout } from '../../../../base/common/async.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
suite('ExtHostDocumentContentProvider', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const resource = URI.parse('foo:bar');
    let documentContentProvider;
    let mainThreadContentProvider;
    const changes = [];
    setup(() => {
        changes.length = 0;
        mainThreadContentProvider = new class {
            $registerTextContentProvider(handle, scheme) {
            }
            $unregisterTextContentProvider(handle) {
            }
            async $onVirtualDocumentChange(uri, value) {
                await timeout(10);
                changes.push([uri, value]);
            }
            dispose() {
                throw new Error('Method not implemented.');
            }
        };
        const ehContext = SingleProxyRPCProtocol(mainThreadContentProvider);
        const documentsAndEditors = new ExtHostDocumentsAndEditors(ehContext, new NullLogService());
        documentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [{
                    isDirty: false,
                    languageId: 'foo',
                    uri: resource,
                    versionId: 1,
                    lines: ['foo'],
                    EOL: '\n',
                    encoding: 'utf8'
                }]
        });
        documentContentProvider = new ExtHostDocumentContentProvider(ehContext, documentsAndEditors, new NullLogService());
    });
    test('TextDocumentContentProvider drops onDidChange events when they happen quickly #179711', async () => {
        await runWithFakedTimers({}, async function () {
            const emitter = new Emitter();
            const contents = ['X', 'Y'];
            let counter = 0;
            let stack = 0;
            const d = documentContentProvider.registerTextDocumentContentProvider(resource.scheme, {
                onDidChange: emitter.event,
                async provideTextDocumentContent(_uri) {
                    assert.strictEqual(stack, 0);
                    stack++;
                    try {
                        await timeout(0);
                        return contents[counter++ % contents.length];
                    }
                    finally {
                        stack--;
                    }
                }
            });
            emitter.fire(resource);
            emitter.fire(resource);
            await timeout(100);
            assert.strictEqual(changes.length, 2);
            assert.strictEqual(changes[0][1], 'X');
            assert.strictEqual(changes[1][1], 'Y');
            d.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REb2N1bWVudENvbnRlbnRQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXpGLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFFNUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RDLElBQUksdUJBQXVELENBQUM7SUFDNUQsSUFBSSx5QkFBa0UsQ0FBQztJQUN2RSxNQUFNLE9BQU8sR0FBMEMsRUFBRSxDQUFDO0lBRTFELEtBQUss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