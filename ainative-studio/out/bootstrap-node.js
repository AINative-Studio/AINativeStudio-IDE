/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
// increase number of stack frames(from 10, https://github.com/v8/v8/wiki/Stack-Trace-API)
Error.stackTraceLimit = 100;
if (!process.env['VSCODE_HANDLES_SIGPIPE']) {
    // Workaround for Electron not installing a handler to ignore SIGPIPE
    // (https://github.com/electron/electron/issues/13254)
    let didLogAboutSIGPIPE = false;
    process.on('SIGPIPE', () => {
        // See https://github.com/microsoft/vscode-remote-release/issues/6543
        // In certain situations, the console itself can be in a broken pipe state
        // so logging SIGPIPE to the console will cause an infinite async loop
        if (!didLogAboutSIGPIPE) {
            didLogAboutSIGPIPE = true;
            console.error(new Error(`Unexpected SIGPIPE`));
        }
    });
}
// Setup current working directory in all our node & electron processes
// - Windows: call `process.chdir()` to always set application folder as cwd
// -  all OS: store the `process.cwd()` inside `VSCODE_CWD` for consistent lookups
function setupCurrentWorkingDirectory() {
    try {
        // Store the `process.cwd()` inside `VSCODE_CWD`
        // for consistent lookups, but make sure to only
        // do this once unless defined already from e.g.
        // a parent process.
        if (typeof process.env['VSCODE_CWD'] !== 'string') {
            process.env['VSCODE_CWD'] = process.cwd();
        }
        // Windows: always set application folder as current working dir
        if (process.platform === 'win32') {
            process.chdir(path.dirname(process.execPath));
        }
    }
    catch (err) {
        console.error(err);
    }
}
setupCurrentWorkingDirectory();
/**
 * Add support for redirecting the loading of node modules
 *
 * Note: only applies when running out of sources.
 */
export function devInjectNodeModuleLookupPath(injectPath) {
    if (!process.env['VSCODE_DEV']) {
        return; // only applies running out of sources
    }
    if (!injectPath) {
        throw new Error('Missing injectPath');
    }
    // register a loader hook
    const Module = require('node:module');
    Module.register('./bootstrap-import.js', { parentURL: import.meta.url, data: injectPath });
}
export function removeGlobalNodeJsModuleLookupPaths() {
    if (typeof process?.versions?.electron === 'string') {
        return; // Electron disables global search paths in https://github.com/electron/electron/blob/3186c2f0efa92d275dc3d57b5a14a60ed3846b0e/shell/common/node_bindings.cc#L653
    }
    const Module = require('module');
    const globalPaths = Module.globalPaths;
    const originalResolveLookupPaths = Module._resolveLookupPaths;
    Module._resolveLookupPaths = function (moduleName, parent) {
        const paths = originalResolveLookupPaths(moduleName, parent);
        if (Array.isArray(paths)) {
            let commonSuffixLength = 0;
            while (commonSuffixLength < paths.length && paths[paths.length - 1 - commonSuffixLength] === globalPaths[globalPaths.length - 1 - commonSuffixLength]) {
                commonSuffixLength++;
            }
            return paths.slice(0, paths.length - commonSuffixLength);
        }
        return paths;
    };
    const originalNodeModulePaths = Module._nodeModulePaths;
    Module._nodeModulePaths = function (from) {
        let paths = originalNodeModulePaths(from);
        if (!isWindows) {
            return paths;
        }
        // On Windows, remove drive(s) and users' home directory from search paths,
        // UNLESS 'from' is explicitly set to one of those.
        const isDrive = (p) => p.length >= 3 && p.endsWith(':\\');
        if (!isDrive(from)) {
            paths = paths.filter(p => !isDrive(path.dirname(p)));
        }
        if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
            const userDir = path.dirname(path.join(process.env.HOMEDRIVE, process.env.HOMEPATH));
            const isUsersDir = (p) => path.relative(p, userDir).length === 0;
            // Check if 'from' is the same as 'userDir'
            if (!isUsersDir(from)) {
                paths = paths.filter(p => !isUsersDir(path.dirname(p)));
            }
        }
        return paths;
    };
}
/**
 * Helper to enable portable mode.
 */
export function configurePortable(product) {
    const appRoot = path.dirname(__dirname);
    function getApplicationPath() {
        if (process.env['VSCODE_DEV']) {
            return appRoot;
        }
        if (process.platform === 'darwin') {
            return path.dirname(path.dirname(path.dirname(appRoot)));
        }
        return path.dirname(path.dirname(appRoot));
    }
    function getPortableDataPath() {
        if (process.env['VSCODE_PORTABLE']) {
            return process.env['VSCODE_PORTABLE'];
        }
        if (process.platform === 'win32' || process.platform === 'linux') {
            return path.join(getApplicationPath(), 'data');
        }
        const portableDataName = product.portable || `${product.applicationName}-portable-data`;
        return path.join(path.dirname(getApplicationPath()), portableDataName);
    }
    const portableDataPath = getPortableDataPath();
    const isPortable = !('target' in product) && fs.existsSync(portableDataPath);
    const portableTempPath = path.join(portableDataPath, 'tmp');
    const isTempPortable = isPortable && fs.existsSync(portableTempPath);
    if (isPortable) {
        process.env['VSCODE_PORTABLE'] = portableDataPath;
    }
    else {
        delete process.env['VSCODE_PORTABLE'];
    }
    if (isTempPortable) {
        if (process.platform === 'win32') {
            process.env['TMP'] = portableTempPath;
            process.env['TEMP'] = portableTempPath;
        }
        else {
            process.env['TMPDIR'] = portableTempPath;
        }
    }
    return {
        portableDataPath,
        isPortable
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLW5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsiYm9vdHN0cmFwLW5vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUNwQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRzVDLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQUUvQywwRkFBMEY7QUFDMUYsS0FBSyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUM7QUFFNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO0lBQzVDLHFFQUFxRTtJQUNyRSxzREFBc0Q7SUFDdEQsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQzFCLHFFQUFxRTtRQUNyRSwwRUFBMEU7UUFDMUUsc0VBQXNFO1FBQ3RFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3pCLGtCQUFrQixHQUFHLElBQUksQ0FBQztZQUMxQixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxD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