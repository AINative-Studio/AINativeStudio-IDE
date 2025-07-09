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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NSZWxlYXNlSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvb3NSZWxlYXNlSW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxJQUFJLFdBQVcsRUFBRSxRQUFRLElBQUksVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLElBQUksU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3hELE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUM7QUFRbEQsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxXQUFpQztJQUN2RSxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hELE9BQU87SUFDUixDQUFDO0lBRUQscURBQXFEO0lBQ3JELHFDQUFxQztJQUNyQyxtRUFBbUU7SUFDbkUsSUFBSSxNQUF5QyxDQUFDO0lBQzlDLEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7UUFDdkYsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNELE1BQU07UUFDUCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLFdBQVcsQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1FBQ25GLE9BQU87SUFDUixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0osTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUM7WUFDN0IsSUFBSTtZQUNKLFlBQVk7WUFDWixTQUFTO1lBQ1QsWUFBWTtZQUNaLGlCQUFpQjtTQUNqQixDQUFDLENBQUM7UUFDSCxNQUFNLFdBQVcsR0FBZ0I7WUFDaEMsRUFBRSxFQUFFLFNBQVM7U0FDYixDQUFDO1FBRUYsSUFBSSxLQUFLLEVBQUUsTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDL0YsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BELElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3hFLElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQzFDLFdBQVcsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixDQUFDO3FCQUFNLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUM5QixXQUFXLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztnQkFDN0IsQ0FBQztxQkFBTSxJQUFJLEdBQUcsS0FBSyxZQUFZLElBQUksR0FBRyxLQUFLLGlCQUFpQixFQUFFLENBQUM7b0JBQzlELFdBQVcsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQixDQUFDO0lBRUQsT0FBTztBQUNSLENBQUMifQ==