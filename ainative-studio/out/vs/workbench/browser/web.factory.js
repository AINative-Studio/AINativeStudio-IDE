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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvd2ViLmZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFzRSxJQUFJLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDeEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUU1QyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLElBQUksRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFLdEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQWMsQ0FBQztBQUUzRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUMsVUFBdUIsRUFBRSxPQUFzQztJQUVyRiwwQkFBMEI7SUFDMUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFFbEMsd0VBQXdFO0lBQ3hFLHFFQUFxRTtJQUNyRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO0lBQzFFLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsMkJBQTJCO0lB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