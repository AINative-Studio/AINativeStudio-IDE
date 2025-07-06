/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { Queue } from '../../../base/common/async.js';
import { randomPath } from '../../../base/common/extpath.js';
import { resolveTerminalEncoding } from '../../../base/node/terminalEncoding.js';
export function hasStdinWithoutTty() {
    try {
        return !process.stdin.isTTY; // Via https://twitter.com/MylesBorins/status/782009479382626304
    }
    catch (error) {
        // Windows workaround for https://github.com/nodejs/node/issues/11656
    }
    return false;
}
export function stdinDataListener(durationinMs) {
    return new Promise(resolve => {
        const dataListener = () => resolve(true);
        // wait for 1s maximum...
        setTimeout(() => {
            process.stdin.removeListener('data', dataListener);
            resolve(false);
        }, durationinMs);
        // ...but finish early if we detect data
        process.stdin.once('data', dataListener);
    });
}
export function getStdinFilePath() {
    return randomPath(tmpdir(), 'code-stdin', 3);
}
async function createStdInFile(targetPath) {
    await fs.promises.appendFile(targetPath, '');
    await fs.promises.chmod(targetPath, 0o600); // Ensure the file is only read/writable by the user: https://github.com/microsoft/vscode-remote-release/issues/9048
}
export async function readFromStdin(targetPath, verbose, onEnd) {
    let [encoding, iconv] = await Promise.all([
        resolveTerminalEncoding(verbose), // respect terminal encoding when piping into file
        import('@vscode/iconv-lite-umd'), // lazy load encoding module for usage
        createStdInFile(targetPath) // make sure file exists right away (https://github.com/microsoft/vscode/issues/155341)
    ]);
    if (!iconv.default.encodingExists(encoding)) {
        console.log(`Unsupported terminal encoding: ${encoding}, falling back to UTF-8.`);
        encoding = 'utf8';
    }
    // Use a `Queue` to be able to use `appendFile`
    // which helps file watchers to be aware of the
    // changes because each append closes the underlying
    // file descriptor.
    // (https://github.com/microsoft/vscode/issues/148952)
    const appendFileQueue = new Queue();
    const decoder = iconv.default.getDecoder(encoding);
    process.stdin.on('data', chunk => {
        const chunkStr = decoder.write(chunk);
        appendFileQueue.queue(() => fs.promises.appendFile(targetPath, chunkStr));
    });
    process.stdin.on('end', () => {
        const end = decoder.end();
        appendFileQueue.queue(async () => {
            try {
                if (typeof end === 'string') {
                    await fs.promises.appendFile(targetPath, end);
                }
            }
            finally {
                onEnd?.();
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RkaW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9ub2RlL3N0ZGluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRixNQUFNLFVBQVUsa0JBQWtCO0lBQ2pDLElBQUksQ0FBQztRQUNKLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdFQUFnRTtJQUM5RixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixxRUFBcUU7SUFDdEUsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxZQUFvQjtJQUNyRCxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzVCLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6Qyx5QkFBeUI7UUFDekIsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUVuRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEIsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRWpCLHdDQUF3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