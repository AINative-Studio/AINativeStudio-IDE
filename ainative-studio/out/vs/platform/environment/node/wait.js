/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { randomPath } from '../../../base/common/extpath.js';
export function createWaitMarkerFileSync(verbose) {
    const randomWaitMarkerPath = randomPath(tmpdir());
    try {
        writeFileSync(randomWaitMarkerPath, ''); // use built-in fs to avoid dragging in more dependencies
        if (verbose) {
            console.log(`Marker file for --wait created: ${randomWaitMarkerPath}`);
        }
        return randomWaitMarkerPath;
    }
    catch (err) {
        if (verbose) {
            console.error(`Failed to create marker file for --wait: ${err}`);
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9ub2RlL3dhaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNuQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsT0FBaUI7SUFDekQsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUVsRCxJQUFJLENBQUM7UUFDSixhQUFhLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyx5REFBeUQ7UUFDbEcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBQ0QsT0FBTyxvQkFBb0IsQ0FBQztJQUM3QixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNkLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0FBQ0YsQ0FBQyJ9