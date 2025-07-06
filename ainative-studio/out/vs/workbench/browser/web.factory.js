/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Menu } from './web.api.js';
import { BrowserMain } from './web.main.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { mark } from '../../base/common/performance.js';
import { MenuId, MenuRegistry } from '../../platform/actions/common/actions.js';
import { DeferredPromise } from '../../base/common/async.js';
import { asArray } from '../../base/common/arrays.js';
let created = false;
const workbenchPromise = new DeferredPromise();
/**
 * Creates the workbench with the provided options in the provided container.
 *
 * @param domElement the container to create the workbench in
 * @param options for setting up the workbench
 */
export function create(domElement, options) {
    // Mark start of workbench
    mark('code/didLoadWorkbenchMain');
    // Assert that the workbench is not created more than once. We currently
    // do not support this and require a full context switch to clean-up.
    if (created) {
        throw new Error('Unable to create the VSCode workbench more than once.');
    }
    else {
        created = true;
    }
    // Register commands if any
    if (Array.isArray(options.commands)) {
        for (const command of options.commands) {
            CommandsRegistry.registerCommand(command.id, (accessor, ...args) => {
                // we currently only pass on the arguments but not the accessor
                // to the command to reduce our exposure of internal API.
                return command.handler(...args);
            });
            // Commands with labels appear in the command palette
            if (command.label) {
                for (const menu of asArray(command.menu ?? Menu.CommandPalette)) {
                    MenuRegistry.appendMenuItem(asMenuId(menu), { command: { id: command.id, title: command.label } });
                }
            }
        }
    }
    // Startup workbench and resolve waiters
    let instantiatedWorkbench = undefined;
    new BrowserMain(domElement, options).open().then(workbench => {
        instantiatedWorkbench = workbench;
        workbenchPromise.complete(workbench);
    });
    return toDisposable(() => {
        if (instantiatedWorkbench) {
            instantiatedWorkbench.shutdown();
        }
        else {
            workbenchPromise.p.then(instantiatedWorkbench => instantiatedWorkbench.shutdown());
        }
    });
}
function asMenuId(menu) {
    switch (menu) {
        case Menu.CommandPalette: return MenuId.CommandPalette;
        case Menu.StatusBarWindowIndicatorMenu: return MenuId.StatusBarWindowIndicatorMenu;
    }
}
export var commands;
(function (commands) {
    /**
     * {@linkcode IWorkbench.commands IWorkbench.commands.executeCommand}
     */
    async function executeCommand(command, ...args) {
        const workbench = await workbenchPromise.p;
        return workbench.commands.executeCommand(command, ...args);
    }
    commands.executeCommand = executeCommand;
})(commands || (commands = {}));
export var logger;
(function (logger) {
    /**
     * {@linkcode IWorkbench.logger IWorkbench.logger.log}
     */
    function log(level, message) {
        workbenchPromise.p.then(workbench => workbench.logger.log(level, message));
    }
    logger.log = log;
})(logger || (logger = {}));
export var env;
(function (env) {
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.retrievePerformanceMarks}
     */
    async function retrievePerformanceMarks() {
        const workbench = await workbenchPromise.p;
        return workbench.env.retrievePerformanceMarks();
    }
    env.retrievePerformanceMarks = retrievePerformanceMarks;
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.getUriScheme}
     */
    async function getUriScheme() {
        const workbench = await workbenchPromise.p;
        return workbench.env.getUriScheme();
    }
    env.getUriScheme = getUriScheme;
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.openUri}
     */
    async function openUri(target) {
        const workbench = await workbenchPromise.p;
        return workbench.env.openUri(target);
    }
    env.openUri = openUri;
})(env || (env = {}));
export var window;
(function (window) {
    /**
     * {@linkcode IWorkbench.window IWorkbench.window.withProgress}
     */
    async function withProgress(options, task) {
        const workbench = await workbenchPromise.p;
        return workbench.window.withProgress(options, task);
    }
    window.withProgress = withProgress;
    async function createTerminal(options) {
        const workbench = await workbenchPromise.p;
        workbench.window.createTerminal(options);
    }
    window.createTerminal = createTerminal;
    async function showInformationMessage(message, ...items) {
        const workbench = await workbenchPromise.p;
        return await workbench.window.showInformationMessage(message, ...items);
    }
    window.showInformationMessage = showInformationMessage;
})(window || (window = {}));
export var workspace;
(function (workspace) {
    /**
     * {@linkcode IWorkbench.workspace IWorkbench.workspace.didResolveRemoteAuthority}
     */
    async function didResolveRemoteAuthority() {
        const workbench = await workbenchPromise.p;
        await workbench.workspace.didResolveRemoteAuthority();
    }
    workspace.didResolveRemoteAuthority = didResolveRemoteAuthority;
    /**
     * {@linkcode IWorkbench.workspace IWorkbench.workspace.openTunnel}
     */
    async function openTunnel(tunnelOptions) {
        const workbench = await workbenchPromise.p;
        return workbench.workspace.openTunnel(tunnelOptions);
    }
    workspace.openTunnel = openTunnel;
})(workspace || (workspace = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci93ZWIuZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXNFLElBQUksRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTVDLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsSUFBSSxFQUFtQixNQUFNLGtDQUFrQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUt0RCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBYyxDQUFDO0FBRTNEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FBQyxVQUF1QixFQUFFLE9BQXNDO0lBRXJGLDBCQUEwQjtJQUMxQixJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUVsQyx3RUFBd0U7SUFDeEUscUVBQXFFO0lBQ3JFLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7SUFDMUUsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCwyQkFBMkI7SUFD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