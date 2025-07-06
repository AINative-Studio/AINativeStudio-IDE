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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbmNvZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3Rlcm1pbmFsRW5jb2RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVsRCxNQUFNLHdCQUF3QixHQUFHO0lBQ2hDLEtBQUssRUFBRSxPQUFPLEVBQUUsZ0JBQWdCO0lBQ2hDLEtBQUssRUFBRSxPQUFPLEVBQUUsd0JBQXdCO0lBQ3hDLEtBQUssRUFBRSxPQUFPLEVBQUUsbUJBQW1CO0lBQ25DLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CO0lBQ3BDLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVTtJQUMxQixLQUFLLEVBQUUsT0FBTyxFQUFFLGFBQWE7SUFDN0IsS0FBSyxFQUFFLE9BQU8sRUFBRSxZQUFZO0lBQzVCLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CO0lBQ3BDLEtBQUssRUFBRSxPQUFPLEVBQUUsU0FBUztJQUN6QixLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVU7SUFDMUIsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlO0lBQy9CLEtBQUssRUFBRSxPQUFPLEVBQUUscUJBQXFCO0lBQ3JDLE1BQU0sRUFBRSxRQUFRLENBQUMsc0JBQXNCO0NBQ3ZDLENBQUM7QUFFRixTQUFTLG1CQUFtQixDQUFDLFlBQW9CO0lBQ2hELE1BQU0sc0JBQXNCLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDdkYsTUFBTSxNQUFNLEdBQUcsNEJBQTRCLENBQUMs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