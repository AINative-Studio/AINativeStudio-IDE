/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostDocumentsAndEditors', () => {
    let editors;
    setup(function () {
        editors = new ExtHostDocumentsAndEditors(new TestRPCProtocol(), new NullLogService());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('The value of TextDocument.isClosed is incorrect when a text document is closed, #27949', () => {
        editors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [{
                    EOL: '\n',
                    isDirty: true,
                    languageId: 'fooLang',
                    uri: URI.parse('foo:bar'),
                    versionId: 1,
                    lines: [
                        'first',
                        'second'
                    ],
                    encoding: 'utf8'
                }]
        });
        return new Promise((resolve, reject) => {
            const d = editors.onDidRemoveDocuments(e => {
                try {
                    for (const data of e) {
                        assert.strictEqual(data.document.isClosed, true);
                    }
                    resolve(undefined);
                }
                catch (e) {
                    reject(e);
                }
                finally {
                    d.dispose();
                }
            });
            editors.$acceptDocumentsAndEditorsDelta({
                removedDocuments: [URI.parse('foo:bar')]
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RG9jdW1lbnRzQW5kRWRpdG9ycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBRXhDLElBQUksT0FBbUMsQ0FBQztJQUV4QyxLQUFLLENBQUM7UUFDTCxPQUFPLEdBQUcsSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLGVBQWUsRUFBRSxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztJQUN2RixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHdGQUF3RixFQUFFLEdBQUcsRUFBRTtRQUVuRyxPQUFPLENBQUMsK0JBQStCLENBQUM7WUFDdkMsY0FBYyxFQUFFLENBQUM7b0JBQ2hCLEdBQUcsRUFBRSxJQUFJO29CQUNULE9BQU8sRUFBRSxJQUFJO29CQUNiLFVBQVUsRUFBRSxTQUFTO29CQUNyQixHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7b0JBQ3pCLFNBQVMsRUFBRSxDQUFDO29CQUNaLEtBQUssRUFBRTt3QkFDTixPQUFPO3dCQUNQLFFBQVE7cUJBQ1I7b0JBQ0QsUUFBUSxFQUFFLE1BQU07aUJBQ2hCLENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBRXRDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDO29CQUVKLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2xELENBQUM7b0JBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNwQixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNYLENBQUM7d0JBQVMsQ0FBQztvQkFDVixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLCtCQUErQixDQUFDO2dCQUN2QyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDeEMsQ0FBQyxDQUFDO1FBRUosQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=