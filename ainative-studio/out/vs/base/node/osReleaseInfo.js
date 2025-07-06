/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constants as FSConstants, promises as FSPromises } from 'fs';
import { createInterface as readLines } from 'readline';
import * as Platform from '../common/platform.js';
export async function getOSReleaseInfo(errorLogger) {
    if (Platform.isMacintosh || Platform.isWindows) {
        return;
    }
    // Extract release information on linux based systems
    // using the identifiers specified in
    // https://www.freedesktop.org/software/systemd/man/os-release.html
    let handle;
    for (const filePath of ['/etc/os-release', '/usr/lib/os-release', '/etc/lsb-release']) {
        try {
            handle = await FSPromises.open(filePath, FSConstants.R_OK);
            break;
        }
        catch (err) { }
    }
    if (!handle) {
        errorLogger('Unable to retrieve release information from known identifier paths.');
        return;
    }
    try {
        const osReleaseKeys = new Set([
            'ID',
            'DISTRIB_ID',
            'ID_LIKE',
            'VERSION_ID',
            'DISTRIB_RELEASE',
        ]);
        const releaseInfo = {
            id: 'unknown'
        };
        for await (const line of readLines({ input: handle.createReadStream(), crlfDelay: Infinity })) {
            if (!line.includes('=')) {
                continue;
            }
            const key = line.split('=')[0].toUpperCase().trim();
            if (osReleaseKeys.has(key)) {
                const value = line.split('=')[1].replace(/"/g, '').toLowerCase().trim();
                if (key === 'ID' || key === 'DISTRIB_ID') {
                    releaseInfo.id = value;
                }
                else if (key === 'ID_LIKE') {
                    releaseInfo.id_like = value;
                }
                else if (key === 'VERSION_ID' || key === 'DISTRIB_RELEASE') {
                    releaseInfo.version_id = value;
                }
            }
        }
        return releaseInfo;
    }
    catch (err) {
        errorLogger(err);
    }
    return;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NSZWxlYXNlSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL29zUmVsZWFzZUluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsSUFBSSxXQUFXLEVBQUUsUUFBUSxJQUFJLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxJQUFJLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN4RCxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFDO0FBUWxELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsV0FBaUM7SUFDdkUsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoRCxPQUFPO0lBQ1IsQ0FBQztJQUVELHFEQUFxRDtJQUNyRCxxQ0FBcUM7SUFDckMsbUVBQW1FO0lBQ25FLElBQUksTUFBeUMsQ0FBQztJQUM5QyxLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUMsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1FBQ3ZGLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzRCxNQUFNO1FBQ1AsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixXQUFXLENBQUMscUVBQXFFLENBQUMsQ0FBQztRQUNuRixPQUFPO0lBQ1IsQ0FBQztJQUVELElBQUksQ0FBQztRQUNKLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDO1lBQzdCLElBQUk7WUFDSixZQUFZO1lBQ1osU0FBUztZQUNULFlBQVk7WUFDWixpQkFBaUI7U0FDakIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxXQUFXLEdBQWdCO1lBQ2hDLEVBQUUsRUFBRSxTQUFTO1NBQ2IsQ0FBQztRQUVGLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQy9GLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLFNBQVM7WUFDVixDQUFDO1lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwRCxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4RSxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLFlBQVksRUFBRSxDQUFDO29CQUMxQyxXQUFXLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQztnQkFDeEIsQ0FBQztxQkFBTSxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDOUIsV0FBVyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQzdCLENBQUM7cUJBQU0sSUFBSSxHQUFHLEtBQUssWUFBWSxJQUFJLEdBQUcsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO29CQUM5RCxXQUFXLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztnQkFDaEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELE9BQU87QUFDUixDQUFDIn0=