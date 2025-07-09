/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { parentOriginHash } from '../../../base/browser/iframe.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('parentOriginHash', () => {
    test('localhost 1', async () => {
        const hash = await parentOriginHash('http://localhost:9888', '123456');
        assert.strictEqual(hash, '0fnsiac2jaup1t266qekgr7iuj4pnm31gf8r0h1o6k2lvvmfh6hk');
    });
    test('localhost 2', async () => {
        const hash = await parentOriginHash('http://localhost:9888', '123457');
        assert.strictEqual(hash, '07shf01bmdfrghk96voldpletbh36vj7blnl4td8kdq1sej5kjqs');
    });
    test('localhost 3', async () => {
        const hash = await parentOriginHash('http://localhost:9887', '123456');
        assert.strictEqual(hash, '1v1128i162q0nee9l89360sqan26u3pdnjrkke5ijd0sel8sbtqf');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvd2Vidmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RixLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxzREFBc0QsQ0FBQyxDQUFDO0lBQ2xGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5QixNQUFNLElBQUksR0FBRyxNQUFNLGdCQUFnQixDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLHNEQUFzRCxDQUFDLENBQUM7SUFDbEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlCLE1BQU0sSUFBSSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsc0RBQXNELENBQUMsQ0FBQztJQUNsRixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==