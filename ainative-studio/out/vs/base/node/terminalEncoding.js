/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * This code is also used by standalone cli's. Avoid adding dependencies to keep the size of the cli small.
 */
import { exec } from 'child_process';
import { isWindows } from '../common/platform.js';
const windowsTerminalEncodings = {
    '437': 'cp437', // United States
    '850': 'cp850', // Multilingual(Latin I)
    '852': 'cp852', // Slavic(Latin II)
    '855': 'cp855', // Cyrillic(Russian)
    '857': 'cp857', // Turkish
    '860': 'cp860', // Portuguese
    '861': 'cp861', // Icelandic
    '863': 'cp863', // Canadian - French
    '865': 'cp865', // Nordic
    '866': 'cp866', // Russian
    '869': 'cp869', // Modern Greek
    '936': 'cp936', // Simplified Chinese
    '1252': 'cp1252' // West European Latin
};
function toIconvLiteEncoding(encodingName) {
    const normalizedEncodingName = encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];
    return mapped || normalizedEncodingName;
}
const JSCHARDET_TO_ICONV_ENCODINGS = {
    'ibm866': 'cp866',
    'big5': 'cp950'
};
const UTF8 = 'utf8';
export async function resolveTerminalEncoding(verbose) {
    let rawEncodingPromise;
    // Support a global environment variable to win over other mechanics
    const cliEncodingEnv = process.env['VSCODE_CLI_ENCODING'];
    if (cliEncodingEnv) {
        if (verbose) {
            console.log(`Found VSCODE_CLI_ENCODING variable: ${cliEncodingEnv}`);
        }
        rawEncodingPromise = Promise.resolve(cliEncodingEnv);
    }
    // Windows: educated guess
    else if (isWindows) {
        rawEncodingPromise = new Promise(resolve => {
            if (verbose) {
                console.log('Running "chcp" to detect terminal encoding...');
            }
            exec('chcp', (err, stdout, stderr) => {
                if (stdout) {
                    if (verbose) {
                        console.log(`Output from "chcp" command is: ${stdout}`);
                    }
                    const windowsTerminalEncodingKeys = Object.keys(windowsTerminalEncodings);
                    for (const key of windowsTerminalEncodingKeys) {
                        if (stdout.indexOf(key) >= 0) {
                            return resolve(windowsTerminalEncodings[key]);
                        }
                    }
                }
                return resolve(undefined);
            });
        });
    }
    // Linux/Mac: use "locale charmap" command
    else {
        rawEncodingPromise = new Promise(resolve => {
            if (verbose) {
                console.log('Running "locale charmap" to detect terminal encoding...');
            }
            exec('locale charmap', (err, stdout, stderr) => resolve(stdout));
        });
    }
    const rawEncoding = await rawEncodingPromise;
    if (verbose) {
        console.log(`Detected raw terminal encoding: ${rawEncoding}`);
    }
    if (!rawEncoding || rawEncoding.toLowerCase() === 'utf-8' || rawEncoding.toLowerCase() === UTF8) {
        return UTF8;
    }
    return toIconvLiteEncoding(rawEncoding);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbmNvZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvdGVybWluYWxFbmNvZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7R0FFRztBQUNILE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWxELE1BQU0sd0JBQXdCLEdBQUc7SUFDaEMsS0FBSyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0I7SUFDaEMsS0FBSyxFQUFFLE9BQU8sRUFBRSx3QkFBd0I7SUFDeEMsS0FBSyxFQUFFLE9BQU8sRUFBRSxtQkFBbUI7SUFDbkMsS0FBSyxFQUFFLE9BQU8sRUFBRSxvQkFBb0I7SUFDcEMsS0FBSyxFQUFFLE9BQU8sRUFBRSxVQUFVO0lBQzFCLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYTtJQUM3QixLQUFLLEVBQUUsT0FBTyxFQUFFLFlBQVk7SUFDNUIsS0FBSyxFQUFFLE9BQU8sRUFBRSxvQkFBb0I7SUFDcEMsS0FBSyxFQUFFLE9BQU8sRUFBRSxTQUFTO0lBQ3pCLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVTtJQUMxQixLQUFLLEVBQUUsT0FBTyxFQUFFLGVBQWU7SUFDL0IsS0FBSyxFQUFFLE9BQU8sRUFBRSxxQkFBcUI7SUFDckMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxzQkFBc0I7Q0FDdkMsQ0FBQztBQUVGLFNBQVMsbUJBQW1CLENBQUMsWUFBb0I7SUFDaEQsTUFBTSxzQkFBc0IsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUN2RixNQUFNLE1BQU0sR0FBRyw0QkFBNEIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBRXBFLE9BQU8sTUFBTSxJQUFJLHNCQUFzQixDQUFDO0FBQ3pDLENBQUM7QUFFRCxNQUFNLDRCQUE0QixHQUErQjtJQUNoRSxRQUFRLEVBQUUsT0FBTztJQUNqQixNQUFNLEVBQUUsT0FBTztDQUNmLENBQUM7QUFFRixNQUFNLElBQUksR0FBRyxNQUFNLENBQUM7QUFFcEIsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUIsQ0FBQyxPQUFpQjtJQUM5RCxJQUFJLGtCQUErQyxDQUFDO0lBRXBELG9FQUFvRTtJQUNwRSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDMUQsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsMEJBQTBCO1NBQ3JCLElBQUksU0FBUyxFQUFFLENBQUM7UUFDcEIsa0JBQWtCLEdBQUcsSUFBSSxPQUFPLENBQXFCLE9BQU8sQ0FBQyxFQUFFO1lBQzlELElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1lBQzlELENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDcEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixJQUFJLE9BQU8sRUFBRSxDQUFDO3dCQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLE1BQU0sRUFBRSxDQUFDLENBQUM7b0JBQ3pELENBQUM7b0JBRUQsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFpRCxDQUFDO29CQUMxSCxLQUFLLE1BQU0sR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUM7d0JBQy9DLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDOUIsT0FBTyxPQUFPLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDL0MsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCwwQ0FBMEM7U0FDckMsQ0FBQztRQUNMLGtCQUFrQixHQUFHLElBQUksT0FBTyxDQUFTLE9BQU8sQ0FBQyxFQUFFO1lBQ2xELElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7WUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztJQUM3QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNqRyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxPQUFPLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pDLENBQUMifQ==