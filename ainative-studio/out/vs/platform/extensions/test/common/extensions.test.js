/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { parseEnabledApiProposalNames } from '../../common/extensions.js';
suite('Parsing Enabled Api Proposals', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parsingEnabledApiProposals', () => {
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@1']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@randomstring']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@1234']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@1234_random']));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbnMvdGVzdC9jb21tb24vZXh0ZW5zaW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUUxRSxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBRTNDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkksTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pJLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4SSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEosTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVJLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwSixDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=