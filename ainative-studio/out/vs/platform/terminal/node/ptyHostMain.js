/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DefaultURITransformer } from '../../../base/common/uriIpc.js';
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { Server as ChildProcessServer } from '../../../base/parts/ipc/node/ipc.cp.js';
import { Server as UtilityProcessServer } from '../../../base/parts/ipc/node/ipc.mp.js';
import { localize } from '../../../nls.js';
import { OPTIONS, parseArgs } from '../../environment/node/argv.js';
import { NativeEnvironmentService } from '../../environment/node/environmentService.js';
import { getLogLevel } from '../../log/common/log.js';
import { LoggerChannel } from '../../log/common/logIpc.js';
import { LogService } from '../../log/common/logService.js';
import { LoggerService } from '../../log/node/loggerService.js';
import product from '../../product/common/product.js';
import { TerminalIpcChannels } from '../common/terminal.js';
import { HeartbeatService } from './heartbeatService.js';
import { PtyService } from './ptyService.js';
import { isUtilityProcess } from '../../../base/parts/sandbox/node/electronTypes.js';
import { timeout } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
startPtyHost();
async function startPtyHost() {
    // Parse environment variables
    const startupDelay = parseInt(process.env.VSCODE_STARTUP_DELAY ?? '0');
    const simulatedLatency = parseInt(process.env.VSCODE_LATENCY ?? '0');
    const reconnectConstants = {
        graceTime: parseInt(process.env.VSCODE_RECONNECT_GRACE_TIME || '0'),
        shortGraceTime: parseInt(process.env.VSCODE_RECONNECT_SHORT_GRACE_TIME || '0'),
        scrollback: parseInt(process.env.VSCODE_RECONNECT_SCROLLBACK || '100')
    };
    // Sanitize environment
    delete process.env.VSCODE_RECONNECT_GRACE_TIME;
    delete process.env.VSCODE_RECONNECT_SHORT_GRACE_TIME;
    delete process.env.VSCODE_RECONNECT_SCROLLBACK;
    delete process.env.VSCODE_LATENCY;
    delete process.env.VSCODE_STARTUP_DELAY;
    // Delay startup if needed, this must occur before RPC is setup to avoid the channel from timing
    // out.
    if (startupDelay) {
        await timeout(startupDelay);
    }
    // Setup RPC
    const _isUtilityProcess = isUtilityProcess(process);
    let server;
    if (_isUtilityProcess) {
        server = new UtilityProcessServer();
    }
    else {
        server = new ChildProcessServer(TerminalIpcChannels.PtyHost);
    }
    // Services
    const productService = { _serviceBrand: undefined, ...product };
    const environmentService = new NativeEnvironmentService(parseArgs(process.argv, OPTIONS), productService);
    const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
    server.registerChannel(TerminalIpcChannels.Logger, new LoggerChannel(loggerService, () => DefaultURITransformer));
    const logger = loggerService.createLogger('ptyhost', { name: localize('ptyHost', "Pty Host") });
    const logService = new LogService(logger);
    // Log developer config
    if (startupDelay) {
        logService.warn(`Pty Host startup is delayed ${startupDelay}ms`);
    }
    if (simulatedLatency) {
        logService.warn(`Pty host is simulating ${simulatedLatency}ms latency`);
    }
    const disposables = new DisposableStore();
    // Heartbeat responsiveness tracking
    const heartbeatService = new HeartbeatService();
    server.registerChannel(TerminalIpcChannels.Heartbeat, ProxyChannel.fromService(heartbeatService, disposables));
    // Init pty service
    const ptyService = new PtyService(logService, productService, reconnectConstants, simulatedLatency);
    const ptyServiceChannel = ProxyChannel.fromService(ptyService, disposables);
    server.registerChannel(TerminalIpcChannels.PtyHost, ptyServiceChannel);
    // Register a channel for direct communication via Message Port
    if (_isUtilityProcess) {
        server.registerChannel(TerminalIpcChannels.PtyHostWindow, ptyServiceChannel);
    }
    // Clean up
    process.once('exit', () => {
        logService.trace('Pty host exiting');
        logService.dispose();
        heartbeatService.dispose();
        ptyService.dispose();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5SG9zdE1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS9wdHlIb3N0TWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLElBQUksb0JBQW9CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEUsT0FBTyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFFdEQsT0FBTyxFQUF1QixtQkFBbUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3QyxPQUFPLEVB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