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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFekYsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUU1Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEMsSUFBSSx1QkFBdUQsQ0FBQztJQUM1RCxJQUFJLHlCQUFrRSxDQUFDO0lBQ3ZFLE1BQU0sT0FBTyxHQUEwQyxFQUFFLENBQUM7SUFFMUQsS0FBSyxDQUFD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