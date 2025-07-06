/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { Codicon } from '../../../../base/common/codicons.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { createProfileSchemaEnums } from '../../common/terminalProfiles.js';
suite('terminalProfiles', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('createProfileSchemaEnums', () => {
        test('should return an empty array when there are no profiles', () => {
            deepStrictEqual(createProfileSchemaEnums([]), {
                values: [
                    null
                ],
                markdownDescriptions: [
                    'Automatically detect the default'
                ]
            });
        });
        test('should return a single entry when there is one profile', () => {
            const profile = {
                profileName: 'name',
                path: 'path',
                isDefault: true
            };
            deepStrictEqual(createProfileSchemaEnums([profile]), {
                values: [
                    null,
                    'name'
                ],
                markdownDescriptions: [
                    'Automatically detect the default',
                    '$(terminal) name\n- path: path'
                ]
            });
        });
        test('should show all profile information', () => {
            const profile = {
                profileName: 'name',
                path: 'path',
                isDefault: true,
                args: ['a', 'b'],
                color: 'terminal.ansiRed',
                env: {
                    c: 'd',
                    e: 'f'
                },
                icon: Codicon.zap,
                overrideName: true
            };
            deepStrictEqual(createProfileSchemaEnums([profile]), {
                values: [
                    null,
                    'name'
                ],
                markdownDescriptions: [
                    'Automatically detect the default',
                    `$(zap) name\n- path: path\n- args: ['a','b']\n- overrideName: true\n- color: terminal.ansiRed\n- env: {\"c\":\"d\",\"e\":\"f\"}`
                ]
            });
        });
        test('should return a multiple entries when there are multiple profiles', () => {
            const profile1 = {
                profileName: 'name',
                path: 'path',
                isDefault: true
            };
            const profile2 = {
                profileName: 'foo',
                path: 'bar',
                isDefault: false
            };
            deepStrictEqual(createProfileSchemaEnums([profile1, profile2]), {
                values: [
                    null,
                    'name',
                    'foo'
                ],
                markdownDescriptions: [
                    'Automatically detect the default',
                    '$(terminal) name\n- path: path',
                    '$(terminal) foo\n- path: bar'
                ]
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbFByb2ZpbGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEdBQUcsRUFBRTtZQUNwRSxlQUFlLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzdDLE1BQU0sRUFBRTtvQkFDUCxJQUFJO2lCQUNKO2dCQUNELG9CQUFvQixFQUFFO29CQUNyQixrQ0FBa0M7aUJBQ2xDO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsd0RBQXdELEVBQUUsR0FBRyxFQUFFO1lBQ25FLE1BQU0sT0FBTyxHQUFxQjtnQkFDakMsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxJQUFJO2FBQ2YsQ0FBQztZQUNGLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BELE1BQU0sRUFBRTtvQkFDUCxJQUFJO29CQUNKLE1BQU07aUJBQ047Z0JBQ0Qsb0JBQW9CLEVBQUU7b0JBQ3JCLGtDQUFrQztvQkFDbEMsZ0NBQWdDO2lCQUNoQzthQUNELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxNQUFNLE9BQU8sR0FBcUI7Z0JBQ2pDLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixJQUFJLEVBQUUsTUFBTTtnQkFDWixTQUFTLEVBQUUsSUFBSTtnQkFDZixJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNoQixLQUFLLEVBQUUsa0JBQWtCO2dCQUN6QixHQUFHLEVBQUU7b0JBQ0osQ0FBQyxFQUFFLEdBQUc7b0JBQ04sQ0FBQyxFQUFFLEdBQUc7aUJBQ047Z0JBQ0QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHO2dCQUNqQixZQUFZLEVBQUUsSUFBSTthQUNsQixDQUFDO1lBQ0YsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDcEQsTUFBTSxFQUFFO29CQUNQLElBQUk7b0JBQ0osTUFBTTtpQkFDTjtnQkFDRCxvQkFBb0IsRUFBRTtvQkFDckIsa0NBQWtDO29CQUNsQyxpSUFBaUk7aUJBQ2pJO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsbUVBQW1FLEVBQUUsR0FBRyxFQUFFO1lBQzlFLE1BQU0sUUFBUSxHQUFxQjtnQkFDbEMsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxJQUFJO2FBQ2YsQ0FBQztZQUNGLE1BQU0sUUFBUSxHQUFxQjtnQkFDbEMsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLElBQUksRUFBRSxLQUFLO2dCQUNYLFNBQVMsRUFBRSxLQUFLO2FBQ2hCLENBQUM7WUFDRixlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtnQkFDL0QsTUFBTSxFQUFFO29CQUNQLElBQUk7b0JBQ0osTUFBTTtvQkFDTixLQUFLO2lCQUNMO2dCQUNELG9CQUFvQixFQUFFO29CQUNyQixrQ0FBa0M7b0JBQ2xDLGdDQUFnQztvQkFDaEMsOEJBQThCO2lCQUM5QjthQUNELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9