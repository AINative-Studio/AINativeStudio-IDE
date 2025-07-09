/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getWorkspaceIdentifier, getSingleFolderWorkspaceIdentifier } from '../../browser/workspaces.js';
suite('Workspaces', () => {
    test('workspace identifiers are stable', function () {
        // workspace identifier
        assert.strictEqual(getWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test')).id, '474434e4');
        // single folder identifier
        assert.strictEqual(getSingleFolderWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test'))?.id, '474434e4');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL3Rlc3QvYnJvd3Nlci93b3Jrc3BhY2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV6RyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4QixJQUFJLENBQUMsa0NBQWtDLEVBQUU7UUFFeEMsdUJBQXVCO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWxHLDJCQUEyQjtRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNoSCxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==