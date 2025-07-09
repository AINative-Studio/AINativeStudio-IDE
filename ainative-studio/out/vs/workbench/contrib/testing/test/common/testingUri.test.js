/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { buildTestUri, parseTestUri } from '../../common/testingUri.js';
suite('Workbench - Testing URIs', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('round trip', () => {
        const uris = [
            { type: 3 /* TestUriType.ResultActualOutput */, taskIndex: 1, messageIndex: 42, resultId: 'r', testExtId: 't' },
            { type: 4 /* TestUriType.ResultExpectedOutput */, taskIndex: 1, messageIndex: 42, resultId: 'r', testExtId: 't' },
            { type: 2 /* TestUriType.ResultMessage */, taskIndex: 1, messageIndex: 42, resultId: 'r', testExtId: 't' },
        ];
        for (const uri of uris) {
            const serialized = buildTestUri(uri);
            assert.deepStrictEqual(uri, parseTestUri(serialized));
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1VyaS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdGluZ1VyaS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFpQixZQUFZLEVBQWUsTUFBTSw0QkFBNEIsQ0FBQztBQUVwRyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxJQUFJLEdBQW9CO1lBQzdCLEVBQUUsSUFBSSx3Q0FBZ0MsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3ZHLEVBQUUsSUFBSSwwQ0FBa0MsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3pHLEVBQUUsSUFBSSxtQ0FBMkIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFO1NBQ2xHLENBQUM7UUFFRixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9