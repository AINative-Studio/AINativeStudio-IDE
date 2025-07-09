/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/configuration.js';
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'debug.autoExpandLazyVariables',
        migrateFn: (value) => {
            if (value === true) {
                return { value: 'on' };
            }
            else if (value === false) {
                return { value: 'off' };
            }
            return [];
        }
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXR0aW5nTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdTZXR0aW5nTWlncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBRS9GLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQztLQUM3RSwrQkFBK0IsQ0FBQyxDQUFDO1FBQ2pDLEdBQUcsRUFBRSwrQkFBK0I7UUFDcEMsU0FBUyxFQUFFLENBQUMsS0FBYyxFQUFFLEVBQUU7WUFDN0IsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDeEIsQ0FBQztpQkFBTSxJQUFJLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN6QixDQUFDO1lBRUQsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0tBQ0QsQ0FBQyxDQUFDLENBQUMifQ==