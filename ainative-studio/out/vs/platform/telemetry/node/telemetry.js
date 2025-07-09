/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { join } from '../../../base/common/path.js';
import { Promises } from '../../../base/node/pfs.js';
export async function buildTelemetryMessage(appRoot, extensionsPath) {
    const mergedTelemetry = Object.create(null);
    // Simple function to merge the telemetry into one json object
    const mergeTelemetry = (contents, dirName) => {
        const telemetryData = JSON.parse(contents);
        mergedTelemetry[dirName] = telemetryData;
    };
    if (extensionsPath) {
        const dirs = [];
        const files = await Promises.readdir(extensionsPath);
        for (const file of files) {
            try {
                const fileStat = await fs.promises.stat(join(extensionsPath, file));
                if (fileStat.isDirectory()) {
                    dirs.push(file);
                }
            }
            catch {
                // This handles case where broken symbolic links can cause statSync to throw and error
            }
        }
        const telemetryJsonFolders = [];
        for (const dir of dirs) {
            const files = (await Promises.readdir(join(extensionsPath, dir))).filter(file => file === 'telemetry.json');
            if (files.length === 1) {
                telemetryJsonFolders.push(dir); // // We know it contains a telemetry.json file so we add it to the list of folders which have one
            }
        }
        for (const folder of telemetryJsonFolders) {
            const contents = (await fs.promises.readFile(join(extensionsPath, folder, 'telemetry.json'))).toString();
            mergeTelemetry(contents, folder);
        }
    }
    let contents = (await fs.promises.readFile(join(appRoot, 'telemetry-core.json'))).toString();
    mergeTelemetry(contents, 'vscode-core');
    contents = (await fs.promises.readFile(join(appRoot, 'telemetry-extensions.json'))).toString();
    mergeTelemetry(contents, 'vscode-extensions');
    return JSON.stringify(mergedTelemetry, null, 4);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9ub2RlL3RlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXJELE1BQU0sQ0FBQyxLQUFLLFVBQVUscUJBQXFCLENBQUMsT0FBZSxFQUFFLGNBQXVCO0lBQ25GLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFNUMsOERBQThEO0lBQzlELE1BQU0sY0FBYyxHQUFHLENBQUMsUUFBZ0IsRUFBRSxPQUFlLEVBQUUsRUFBRTtRQUM1RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNDLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxhQUFhLENBQUM7SUFDMUMsQ0FBQyxDQUFDO0lBRUYsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7UUFFMUIsTUFBTSxLQUFLLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3JELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO29CQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqQixDQUFDO1lBQ0YsQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUixzRkFBc0Y7WUFDdkYsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFhLEVBQUUsQ0FBQztRQUMxQyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzVHLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0dBQWtHO1lBQ25JLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLE1BQU0sSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzNDLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN6RyxjQUFjLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDN0YsY0FBYyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUV4QyxRQUFRLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDL0YsY0FBYyxDQUFDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBRTlDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMifQ==