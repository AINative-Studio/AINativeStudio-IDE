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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL3Rlcm1pbmFsUHJvZmlsZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU1RSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxJQUFJLENBQUMseURBQXlELEVBQUUsR0FBRyxFQUFFO1lBQ3BFLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDN0MsTUFBTSxFQUFFO29CQUNQLElBQUk7aUJBQ0o7Z0JBQ0Qsb0JBQW9CLEVBQUU7b0JBQ3JCLGtDQUFrQztpQkFDbEM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7WUFDbkUsTUFBTSxPQUFPLEdBQXFCO2dCQUNqQyxXQUFXLEVBQUUsTUFBTTtnQkFDbkIsSUFBSSxFQUFFLE1BQU07Z0JBQ1osU0FBUyxFQUFFLElBQUk7YUFDZixDQUFDO1lBQ0YsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDcEQsTUFBTSxFQUFFO29CQUNQLElBQUk7b0JBQ0osTUFBTTtpQkFDTjtnQkFDRCxvQkFBb0IsRUFBRTtvQkFDckIsa0NBQWtDO29CQUNsQyxnQ0FBZ0M7aUJBQ2hDO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELE1BQU0sT0FBTyxHQUFxQjtnQkFDakMsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxJQUFJO2dCQUNmLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxrQkFBa0I7Z0JBQ3pCLEdBQUcsRUFBRTtvQkFDSixDQUFDLEVBQUUsR0FBRztvQkFDTixDQUFDLEVBQUUsR0FBRztpQkFDTjtnQkFDRCxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUc7Z0JBQ2pCLFlBQVksRUFBRSxJQUFJO2FBQ2xCLENBQUM7WUFDRixlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO2dCQUNwRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSTtvQkFDSixNQUFNO2lCQUNOO2dCQUNELG9CQUFvQixFQUFFO29CQUNyQixrQ0FBa0M7b0JBQ2xDLGlJQUFpSTtpQkFDakk7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxtRUFBbUUsRUFBRSxHQUFHLEVBQUU7WUFDOUUsTUFBTSxRQUFRLEdBQXFCO2dCQUNsQyxXQUFXLEVBQUUsTUFBTTtnQkFDbkIsSUFBSSxFQUFFLE1BQU07Z0JBQ1osU0FBUyxFQUFFLElBQUk7YUFDZixDQUFDO1lBQ0YsTUFBTSxRQUFRLEdBQXFCO2dCQUNsQyxXQUFXLEVBQUUsS0FBSztnQkFDbEIsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsU0FBUyxFQUFFLEtBQUs7YUFDaEIsQ0FBQztZQUNGLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO2dCQUMvRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSTtvQkFDSixNQUFNO29CQUNOLEtBQUs7aUJBQ0w7Z0JBQ0Qsb0JBQW9CLEVBQUU7b0JBQ3JCLGtDQUFrQztvQkFDbEMsZ0NBQWdDO29CQUNoQyw4QkFBOEI7aUJBQzlCO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=