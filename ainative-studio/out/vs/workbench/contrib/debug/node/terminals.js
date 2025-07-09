/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import { getDriveLetter } from '../../../../base/common/extpath.js';
import * as platform from '../../../../base/common/platform.js';
function spawnAsPromised(command, args) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        const child = cp.spawn(command, args);
        if (child.pid) {
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }
        child.on('error', err => {
            reject(err);
        });
        child.on('close', code => {
            resolve(stdout);
        });
    });
}
export async function hasChildProcesses(processId) {
    if (processId) {
        // if shell has at least one child process, assume that shell is busy
        if (platform.isWindows) {
            const windowsProcessTree = await import('@vscode/windows-process-tree');
            return new Promise(resolve => {
                windowsProcessTree.getProcessTree(processId, processTree => {
                    resolve(!!processTree && processTree.children.length > 0);
                });
            });
        }
        else {
            return spawnAsPromised('/usr/bin/pgrep', ['-lP', String(processId)]).then(stdout => {
                const r = stdout.trim();
                if (r.length === 0 || r.indexOf(' tmux') >= 0) { // ignore 'tmux'; see #43683
                    return false;
                }
                else {
                    return true;
                }
            }, error => {
                return true;
            });
        }
    }
    // fall back to safe side
    return Promise.resolve(true);
}
var ShellType;
(function (ShellType) {
    ShellType[ShellType["cmd"] = 0] = "cmd";
    ShellType[ShellType["powershell"] = 1] = "powershell";
    ShellType[ShellType["bash"] = 2] = "bash";
})(ShellType || (ShellType = {}));
export function prepareCommand(shell, args, argsCanBeInterpretedByShell, cwd, env) {
    shell = shell.trim().toLowerCase();
    // try to determine the shell type
    let shellType;
    if (shell.indexOf('powershell') >= 0 || shell.indexOf('pwsh') >= 0) {
        shellType = 1 /* ShellType.powershell */;
    }
    else if (shell.indexOf('cmd.exe') >= 0) {
        shellType = 0 /* ShellType.cmd */;
    }
    else if (shell.indexOf('bash') >= 0) {
        shellType = 2 /* ShellType.bash */;
    }
    else if (platform.isWindows) {
        shellType = 0 /* ShellType.cmd */; // pick a good default for Windows
    }
    else {
        shellType = 2 /* ShellType.bash */; // pick a good default for anything else
    }
    let quote;
    // begin command with a space to avoid polluting shell history
    let command = ' ';
    switch (shellType) {
        case 1 /* ShellType.powershell */:
            quote = (s) => {
                s = s.replace(/\'/g, '\'\'');
                if (s.length > 0 && s.charAt(s.length - 1) === '\\') {
                    return `'${s}\\'`;
                }
                return `'${s}'`;
            };
            if (cwd) {
                const driveLetter = getDriveLetter(cwd);
                if (driveLetter) {
                    command += `${driveLetter}:; `;
                }
                command += `cd ${quote(cwd)}; `;
            }
            if (env) {
                for (const key in env) {
                    const value = env[key];
                    if (value === null) {
                        command += `Remove-Item env:${key}; `;
                    }
                    else {
                        command += `\${env:${key}}='${value}'; `;
                    }
                }
            }
            if (args.length > 0) {
                const arg = args.shift();
                const cmd = argsCanBeInterpretedByShell ? arg : quote(arg);
                command += (cmd[0] === '\'') ? `& ${cmd} ` : `${cmd} `;
                for (const a of args) {
                    command += (a === '<' || a === '>' || argsCanBeInterpretedByShell) ? a : quote(a);
                    command += ' ';
                }
            }
            break;
        case 0 /* ShellType.cmd */:
            quote = (s) => {
                // Note: Wrapping in cmd /C "..." complicates the escaping.
                // cmd /C "node -e "console.log(process.argv)" """A^>0"""" # prints "A>0"
                // cmd /C "node -e "console.log(process.argv)" "foo^> bar"" # prints foo> bar
                // Outside of the cmd /C, it could be a simple quoting, but here, the ^ is needed too
                s = s.replace(/\"/g, '""');
                s = s.replace(/([><!^&|])/g, '^$1');
                return (' "'.split('').some(char => s.includes(char)) || s.length === 0) ? `"${s}"` : s;
            };
            if (cwd) {
                const driveLetter = getDriveLetter(cwd);
                if (driveLetter) {
                    command += `${driveLetter}: && `;
                }
                command += `cd ${quote(cwd)} && `;
            }
            if (env) {
                command += 'cmd /C "';
                for (const key in env) {
                    let value = env[key];
                    if (value === null) {
                        command += `set "${key}=" && `;
                    }
                    else {
                        value = value.replace(/[&^|<>]/g, s => `^${s}`);
                        command += `set "${key}=${value}" && `;
                    }
                }
            }
            for (const a of args) {
                command += (a === '<' || a === '>' || argsCanBeInterpretedByShell) ? a : quote(a);
                command += ' ';
            }
            if (env) {
                command += '"';
            }
            break;
        case 2 /* ShellType.bash */: {
            quote = (s) => {
                s = s.replace(/(["'\\\$!><#()\[\]*&^| ;{}?`])/g, '\\$1');
                return s.length === 0 ? `""` : s;
            };
            const hardQuote = (s) => {
                return /[^\w@%\/+=,.:^-]/.test(s) ? `'${s.replace(/'/g, '\'\\\'\'')}'` : s;
            };
            if (cwd) {
                command += `cd ${quote(cwd)} ; `;
            }
            if (env) {
                command += '/usr/bin/env';
                for (const key in env) {
                    const value = env[key];
                    if (value === null) {
                        command += ` -u ${hardQuote(key)}`;
                    }
                    else {
                        command += ` ${hardQuote(`${key}=${value}`)}`;
                    }
                }
                command += ' ';
            }
            for (const a of args) {
                command += (a === '<' || a === '>' || argsCanBeInterpretedByShell) ? a : quote(a);
                command += ' ';
            }
            break;
        }
    }
    return command;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL25vZGUvdGVybWluYWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNwRSxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLFNBQVMsZUFBZSxDQUFDLE9BQWUsRUFBRSxJQUFjO0lBQ3ZELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDdEMsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2YsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUU7Z0JBQ3hDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRTtZQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGlCQUFpQixDQUFDLFNBQTZCO0lBQ3BFLElBQUksU0FBUyxFQUFFLENBQUM7UUFFZixxRUFBcUU7UUFDckUsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEIsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLE1BQU0sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sSUFBSSxPQUFPLENBQVUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3JDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLEVBQUU7b0JBQzFELE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEYsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyw0QkFBNEI7b0JBQzVFLE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO1lBQ0YsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNWLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUNELHlCQUF5QjtJQUN6QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELElBQVcsU0FBbUM7QUFBOUMsV0FBVyxTQUFTO0lBQUcsdUNBQUcsQ0FBQTtJQUFFLHFEQUFVLENBQUE7SUFBRSx5Q0FBSSxDQUFBO0FBQUMsQ0FBQyxFQUFuQyxTQUFTLEtBQVQsU0FBUyxRQUEwQjtBQUc5QyxNQUFNLFVBQVUsY0FBYyxDQUFDLEtBQWEsRUFBRSxJQUFjLEVBQUUsMkJBQW9DLEVBQUUsR0FBWSxFQUFFLEdBQXNDO0lBRXZKLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFbkMsa0NBQWtDO0lBQ2xDLElBQUksU0FBUyxDQUFDO0lBQ2QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3BFLFNBQVMsK0JBQXVCLENBQUM7SUFDbEMsQ0FBQztTQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMxQyxTQUFTLHdCQUFnQixDQUFDO0lBQzNCLENBQUM7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDdkMsU0FBUyx5QkFBaUIsQ0FBQztJQUM1QixDQUFDO1NBQU0sSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDL0IsU0FBUyx3QkFBZ0IsQ0FBQyxDQUFDLGtDQUFrQztJQUM5RCxDQUFDO1NBQU0sQ0FBQztRQUNQLFNBQVMseUJBQWlCLENBQUMsQ0FBQyx3Q0FBd0M7SUFDckUsQ0FBQztJQUVELElBQUksS0FBNEIsQ0FBQztJQUNqQyw4REFBOEQ7SUFDOUQsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDO0lBRWxCLFFBQVEsU0FBUyxFQUFFLENBQUM7UUFFbkI7WUFFQyxLQUFLLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRTtnQkFDckIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDckQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNuQixDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNqQixDQUFDLENBQUM7WUFFRixJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNULE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsT0FBTyxJQUFJLEdBQUcsV0FBVyxLQUFLLENBQUM7Z0JBQ2hDLENBQUM7Z0JBQ0QsT0FBTyxJQUFJLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDakMsQ0FBQztZQUNELElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN2QixJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDcEIsT0FBTyxJQUFJLG1CQUFtQixHQUFHLElBQUksQ0FBQztvQkFDdkMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sSUFBSSxVQUFVLEdBQUcsTUFBTSxLQUFLLEtBQUssQ0FBQztvQkFDMUMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRyxDQUFDO2dCQUMxQixNQUFNLEdBQUcsR0FBRywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDdkQsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDdEIsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsRixPQUFPLElBQUksR0FBRyxDQUFDO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU07UUFFUDtZQUVDLEtBQUssR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFO2dCQUNyQiwyREFBMkQ7Z0JBQzNELHlFQUF5RTtnQkFDekUsNkVBQTZFO2dCQUM3RSxxRkFBcUY7Z0JBQ3JGLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDM0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLENBQUMsQ0FBQztZQUVGLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN4QyxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixPQUFPLElBQUksR0FBRyxXQUFXLE9BQU8sQ0FBQztnQkFDbEMsQ0FBQztnQkFDRCxPQUFPLElBQUksTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUNuQyxDQUFDO1lBQ0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxPQUFPLElBQUksVUFBVSxDQUFDO2dCQUN0QixLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUN2QixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNwQixPQUFPLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQztvQkFDaEMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDaEQsT0FBTyxJQUFJLFFBQVEsR0FBRyxJQUFJLEtBQUssT0FBTyxDQUFDO29CQUN4QyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDdEIsT0FBTyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixPQUFPLElBQUksR0FBRyxDQUFDO1lBQ2hCLENBQUM7WUFDRCxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNULE9BQU8sSUFBSSxHQUFHLENBQUM7WUFDaEIsQ0FBQztZQUNELE1BQU07UUFFUCwyQkFBbUIsQ0FBQyxDQUFDLENBQUM7WUFFckIsS0FBSyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUU7Z0JBQ3JCLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUM7WUFFRixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFO2dCQUMvQixPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsQ0FBQyxDQUFDO1lBRUYsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxPQUFPLElBQUksTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztZQUNsQyxDQUFDO1lBQ0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxPQUFPLElBQUksY0FBYyxDQUFDO2dCQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUN2QixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3ZCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNwQixPQUFPLElBQUksT0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDcEMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sSUFBSSxJQUFJLFNBQVMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQy9DLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLElBQUksR0FBRyxDQUFDO1lBQ2hCLENBQUM7WUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUN0QixPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xGLE9BQU8sSUFBSSxHQUFHLENBQUM7WUFDaEIsQ0FBQztZQUNELE1BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUMifQ==