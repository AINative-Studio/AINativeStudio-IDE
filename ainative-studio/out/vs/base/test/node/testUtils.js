/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { randomPath } from '../../common/extpath.js';
import { join } from '../../common/path.js';
import * as testUtils from '../common/testUtils.js';
export function getRandomTestPath(tmpdir, ...segments) {
    return randomPath(join(tmpdir, ...segments));
}
export var flakySuite = testUtils.flakySuite;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3Rlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzVDLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0JBQXdCLENBQUM7QUFFcEQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE1BQWMsRUFBRSxHQUFHLFFBQWtCO0lBQ3RFLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxNQUFNLEtBQVEsVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMifQ==