/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { promises } from 'fs';
import { getCaseInsensitive } from '../common/objects.js';
import * as path from '../common/path.js';
import * as Platform from '../common/platform.js';
import * as process from '../common/process.js';
import { Source, TerminateResponseCode } from '../common/processes.js';
import * as Types from '../common/types.js';
import * as pfs from './pfs.js';
export { Source, TerminateResponseCode };
export function getWindowsShell(env = process.env) {
    return env['comspec'] || 'cmd.exe';
}
// Wrapper around process.send() that will queue any messages if the internal node.js
// queue is filled with messages and only continue sending messages when the internal
// queue is free again to consume messages.
// On Windows we always wait for the send() method to return before sending the next message
// to workaround https://github.com/nodejs/node/issues/7657 (IPC can freeze process)
export function createQueuedSender(childProcess) {
    let msgQueue = [];
    let useQueue = false;
    const send = function (msg) {
        if (useQueue) {
            msgQueue.push(msg); // add to the queue if the process cannot handle more messages
            return;
        }
        const result = childProcess.send(msg, (error) => {
            if (error) {
                console.error(error); // unlikely to happen, best we can do is log this error
            }
            useQueue = false; // we are good again to send directly without queue
            // now send all the messages that we have in our queue and did not send yet
            if (msgQueue.length > 0) {
                const msgQueueCopy = msgQueue.slice(0);
                msgQueue = [];
                msgQueueCopy.forEach(entry => send(entry));
            }
        });
        if (!result || Platform.isWindows /* workaround https://github.com/nodejs/node/issues/7657 */) {
            useQueue = true;
        }
    };
    return { send };
}
async function fileExistsDefault(path) {
    if (await pfs.Promises.exists(path)) {
        let statValue;
        try {
            statValue = await promises.stat(path);
        }
        catch (e) {
            if (e.message.startsWith('EACCES')) {
                // it might be symlink
                statValue = await promises.lstat(path);
            }
        }
        return statValue ? !statValue.isDirectory() : false;
    }
    return false;
}
export async function findExecutable(command, cwd, paths, env = process.env, fileExists = fileExistsDefault) {
    // If we have an absolute path then we take it.
    if (path.isAbsolute(command)) {
        return await fileExists(command) ? command : undefined;
    }
    if (cwd === undefined) {
        cwd = process.cwd();
    }
    const dir = path.dirname(command);
    if (dir !== '.') {
        // We have a directory and the directory is relative (see above). Make the path absolute
        // to the current working directory.
        const fullPath = path.join(cwd, command);
        return await fileExists(fullPath) ? fullPath : undefined;
    }
    const envPath = getCaseInsensitive(env, 'PATH');
    if (paths === undefined && Types.isString(envPath)) {
        paths = envPath.split(path.delimiter);
    }
    // No PATH environment. Make path absolute to the cwd.
    if (paths === undefined || paths.length === 0) {
        const fullPath = path.join(cwd, command);
        return await fileExists(fullPath) ? fullPath : undefined;
    }
    // We have a simple file name. We get the path variable from the env
    // and try to find the executable on the path.
    for (const pathEntry of paths) {
        // The path entry is absolute.
        let fullPath;
        if (path.isAbsolute(pathEntry)) {
            fullPath = path.join(pathEntry, command);
        }
        else {
            fullPath = path.join(cwd, pathEntry, command);
        }
        if (Platform.isWindows) {
            const pathExt = getCaseInsensitive(env, 'PATHEXT') || '.COM;.EXE;.BAT;.CMD';
            const pathExtsFound = pathExt.split(';').map(async (ext) => {
                const withExtension = fullPath + ext;
                return await fileExists(withExtension) ? withExtension : undefined;
            });
            for (const foundPromise of pathExtsFound) {
                const found = await foundPromise;
                if (found) {
                    return found;
                }
            }
        }
        if (await fileExists(fullPath)) {
            return fullPath;
        }
    }
    const fullPath = path.join(cwd, command);
    return await fileExists(fullPath) ? fullPath : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9wcm9jZXNzZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFTLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNyQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMxRCxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxLQUFLLE9BQU8sTUFBTSxzQkFBc0IsQ0FBQztBQUNoRCxPQUFPLEVBQStCLE1BQU0sRUFBa0MscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwSSxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFDO0FBQzVDLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQW1GLENBQUM7QUFPMUgsTUFBTSxVQUFVLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFtQztJQUNoRixPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUM7QUFDcEMsQ0FBQztBQU1ELHFGQUFxRjtBQUNyRixxRkFBcUY7QUFDckYsMkNBQTJDO0FBQzNDLDRGQUE0RjtBQUM1RixvRkFBb0Y7QUFDcEYsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFlBQTZCO0lBQy9ELElBQUksUUFBUSxHQUFhLEVBQUUsQ0FBQztJQUM1QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFFckIsTUFBTSxJQUFJLEdBQUcsVUFBVSxHQUFRO1FBQzlCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxRQUFRLENB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