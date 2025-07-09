/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ipcRenderer, process, webFrame, webUtils } from '../../electron-sandbox/globals.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
suite('Sandbox', () => {
    test('globals', async () => {
        assert.ok(typeof ipcRenderer.send === 'function');
        assert.ok(typeof webFrame.setZoomLevel === 'function');
        assert.ok(typeof process.platform === 'string');
        assert.ok(typeof webUtils.getPathForFile === 'function');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvc2FuZGJveC90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZ2xvYmFscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0YsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFFckIsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sV0FBVyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sUUFBUSxDQUFDLFlBQVksS0FBSyxVQUFVLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sUUFBUSxDQUFDLGNBQWMsS0FBSyxVQUFVLENBQUMsQ0FBQztJQUMxRCxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==