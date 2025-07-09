/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NativeTextSearchManager } from '../../node/textSearchManager.js';
suite('NativeTextSearchManager', () => {
    test('fixes encoding', async () => {
        let correctEncoding = false;
        const provider = {
            provideTextSearchResults(query, options, progress, token) {
                correctEncoding = options.folderOptions[0].encoding === 'windows-1252';
                return null;
            }
        };
        const query = {
            type: 2 /* QueryType.Text */,
            contentPattern: {
                pattern: 'a'
            },
            folderQueries: [{
                    folder: URI.file('/some/folder'),
                    fileEncoding: 'windows1252'
                }]
        };
        const m = new NativeTextSearchManager(query, provider);
        await m.search(() => { }, CancellationToken.None);
        assert.ok(correctEncoding);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS90ZXh0U2VhcmNoTWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFMUUsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakMsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBQzVCLE1BQU0sUUFBUSxHQUF3QjtZQUNyQyx3QkFBd0IsQ0FBQyxLQUF1QixFQUFFLE9BQWtDLEVBQUUsUUFBcUMsRUFBRSxLQUF3QjtnQkFDcEosZUFBZSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQztnQkFFdkUsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1NBQ0QsQ0FBQztRQUVGLE1BQU0sS0FBSyxHQUFlO1lBQ3pCLElBQUksd0JBQWdCO1lBQ3BCLGNBQWMsRUFBRTtnQkFDZixPQUFPLEVBQUUsR0FBRzthQUNaO1lBQ0QsYUFBYSxFQUFFLENBQUM7b0JBQ2YsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO29CQUNoQyxZQUFZLEVBQUUsYUFBYTtpQkFDM0IsQ0FBQztTQUNGLENBQUM7UUFFRixNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxELE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=