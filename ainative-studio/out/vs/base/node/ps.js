/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { exec } from 'child_process';
import { FileAccess } from '../common/network.js';
export function listProcesses(rootPid) {
    return new Promise((resolve, reject) => {
        let rootItem;
        const map = new Map();
        function addToTree(pid, ppid, cmd, load, mem) {
            const parent = map.get(ppid);
            if (pid === rootPid || parent) {
                const item = {
                    name: findName(cmd),
                    cmd,
                    pid,
                    ppid,
                    load,
                    mem
                };
                map.set(pid, item);
                if (pid === rootPid) {
                    rootItem = item;
                }
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(item);
                    if (parent.children.length > 1) {
                        parent.children = parent.children.sort((a, b) => a.pid - b.pid);
                    }
                }
            }
        }
        function findName(cmd) {
            const UTILITY_NETWORK_HINT = /--utility-sub-type=network/i;
            const WINDOWS_CRASH_REPORTER = /--crashes-directory/i;
            const WINPTY = /\\pipe\\winpty-control/i;
            const CONPTY = /conhost\.exe.+--headless/i;
            const TYPE = /--type=([a-zA-Z-]+)/;
            // find windows crash reporter
            if (WINDOWS_CRASH_REPORTER.exec(cmd)) {
                return 'electron-crash-reporter';
            }
            // find winpty process
            if (WINPTY.exec(cmd)) {
                return 'winpty-agent';
            }
            // find conpty process
            if (CONPTY.exec(cmd)) {
                return 'conpty-agent';
            }
            // find "--type=xxxx"
            let matches = TYPE.exec(cmd);
            if (matches && matches.length === 2) {
                if (matches[1] === 'renderer') {
                    return `window`;
                }
                else if (matches[1] === 'utility') {
                    if (UTILITY_NETWORK_HINT.exec(cmd)) {
                        return 'utility-network-service';
                    }
                    return 'utility-process';
                }
                else if (matches[1] === 'extensionHost') {
                    return 'extension-host'; // normalize remote extension host type
                }
                return matches[1];
            }
            // find all xxxx.js
            const JS = /[a-zA-Z-]+\.js/g;
            let result = '';
            do {
                matches = JS.exec(cmd);
                if (matches) {
                    result += matches + ' ';
                }
            } while (matches);
            if (result) {
                if (cmd.indexOf('node ') < 0 && cmd.indexOf('node.exe') < 0) {
                    return `electron-nodejs (${result})`;
                }
            }
            return cmd;
        }
        if (process.platform === 'win32') {
            const cleanUNCPrefix = (value) => {
                if (value.indexOf('\\\\?\\') === 0) {
                    return value.substring(4);
                }
                else if (value.indexOf('\\??\\') === 0) {
                    return value.substring(4);
                }
                else if (value.indexOf('"\\\\?\\') === 0) {
                    return '"' + value.substring(5);
                }
                else if (value.indexOf('"\\??\\') === 0) {
                    return '"' + value.substring(5);
                }
                else {
                    return value;
                }
            };
            (import('@vscode/windows-process-tree')).then(windowsProcessTree => {
                windowsProcessTree.getProcessList(rootPid, (processList) => {
                    if (!processList) {
                        reject(new Error(`Root process ${rootPid} not found`));
                        return;
                    }
                    windowsProcessTree.getProcessCpuUsage(processList, (completeProcessList) => {
                        const processItems = new Map();
                        completeProcessList.forEach(process => {
                            const commandLine = cleanUNCPrefix(process.commandLine || '');
                            processItems.set(process.pid, {
                                name: findName(commandLine),
                                cmd: commandLine,
                                pid: process.pid,
                                ppid: process.ppid,
                                load: process.cpu || 0,
                                mem: process.memory || 0
                            });
                        });
                        rootItem = processItems.get(rootPid);
                        if (rootItem) {
                            processItems.forEach(item => {
                                const parent = processItems.get(item.ppid);
                                if (parent) {
                                    if (!parent.children) {
                                        parent.children = [];
                                    }
                                    parent.children.push(item);
                                }
                            });
                            processItems.forEach(item => {
                                if (item.children) {
                                    item.children = item.children.sort((a, b) => a.pid - b.pid);
                                }
                            });
                            resolve(rootItem);
                        }
                        else {
                            reject(new Error(`Root process ${rootPid} not found`));
                        }
                    });
                }, windowsProcessTree.ProcessDataFlag.CommandLine | windowsProcessTree.ProcessDataFlag.Memory);
            });
        }
        else { // OS X & Linux
            function calculateLinuxCpuUsage() {
                // Flatten rootItem to get a list of all VSCode processes
                let processes = [rootItem];
                const pids = [];
                while (processes.length) {
                    const process = processes.shift();
                    if (process) {
                        pids.push(process.pid);
                        if (process.children) {
                            processes = processes.concat(process.children);
                        }
                    }
                }
                // The cpu usage value reported on Linux is the average over the process lifetime,
                // recalculate the usage over a one second interval
                // JSON.stringify is needed to escape spaces, https://github.com/nodejs/node/issues/6803
                let cmd = JSON.stringify(FileAccess.asFileUri('vs/base/node/cpuUsage.sh').fsPath);
                cmd += ' ' + pids.join(' ');
                exec(cmd, {}, (err, stdout, stderr) => {
                    if (err || stderr) {
                        reject(err || new Error(stderr.toString()));
                    }
                    else {
                        const cpuUsage = stdout.toString().split('\n');
                        for (let i = 0; i < pids.length; i++) {
                            const processInfo = map.get(pids[i]);
                            processInfo.load = parseFloat(cpuUsage[i]);
                        }
                        if (!rootItem) {
                            reject(new Error(`Root process ${rootPid} not found`));
                            return;
                        }
                        resolve(rootItem);
                    }
                });
            }
            exec('which ps', {}, (err, stdout, stderr) => {
                if (err || stderr) {
                    if (process.platform !== 'linux') {
                        reject(err || new Error(stderr.toString()));
                    }
                    else {
                        const cmd = JSON.stringify(FileAccess.asFileUri('vs/base/node/ps.sh').fsPath);
                        exec(cmd, {}, (err, stdout, stderr) => {
                            if (err || stderr) {
                                reject(err || new Error(stderr.toString()));
                            }
                            else {
                                parsePsOutput(stdout, addToTree);
                                calculateLinuxCpuUsage();
                            }
                        });
                    }
                }
                else {
                    const ps = stdout.toString().trim();
                    const args = '-ax -o pid=,ppid=,pcpu=,pmem=,command=';
                    // Set numeric locale to ensure '.' is used as the decimal separator
                    exec(`${ps} ${args}`, { maxBuffer: 1000 * 1024, env: { LC_NUMERIC: 'en_US.UTF-8' } }, (err, stdout, stderr) => {
                        // Silently ignoring the screen size is bogus error. See https://github.com/microsoft/vscode/issues/98590
                        if (err || (stderr && !stderr.includes('screen size is bogus'))) {
                            reject(err || new Error(stderr.toString()));
                        }
                        else {
                            parsePsOutput(stdout, addToTree);
                            if (process.platform === 'linux') {
                                calculateLinuxCpuUsage();
                            }
                            else {
                                if (!rootItem) {
                                    reject(new Error(`Root process ${rootPid} not found`));
                                }
                                else {
                                    resolve(rootItem);
                                }
                            }
                        }
                    });
                }
            });
        }
    });
}
function parsePsOutput(stdout, addToTree) {
    const PID_CMD = /^\s*([0-9]+)\s+([0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+(.+)$/;
    const lines = stdout.toString().split('\n');
    for (const line of lines) {
        const matches = PID_CMD.exec(line.trim());
        if (matches && matches.length === 6) {
            addToTree(parseInt(matches[1]), parseInt(matches[2]), matches[5], parseFloat(matches[3]), parseFloat(matches[4]));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHbEQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxPQUFlO0lBRTVDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFFdEMsSUFBSSxRQUFpQyxDQUFDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBRzNDLFNBQVMsU0FBUyxDQUFDLEdBQVcsRUFBRSxJQUFZLEVBQUUsR0FBVyxFQUFFLElBQVksRUFBRSxHQUFXO1lBRW5GLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsSUFBSSxHQUFHLEtBQUssT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUUvQixNQUFNLElBQUksR0FBZ0I7b0JBQ3pCLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDO29CQUNuQixHQUFHO29CQUNILEdBQUc7b0JBQ0gsSUFBSTtvQkFDSixJQUFJO29CQUNKLEdBQUc7aUJBQ0gsQ0FBQztnQkFDRixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFbkIsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQ3JCLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ2pCLENBQUM7Z0JBRUQsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFD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