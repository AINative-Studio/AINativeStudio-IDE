/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import * as net from 'net';
import * as platform from '../../../../../base/common/platform.js';
import { tmpdir } from 'os';
import { join } from '../../../../../base/common/path.js';
import * as ports from '../../../../../base/node/ports.js';
import { SocketDebugAdapter, NamedPipeDebugAdapter } from '../../node/debugAdapter.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
function sendInitializeRequest(debugAdapter) {
    return new Promise((resolve, reject) => {
        debugAdapter.sendRequest('initialize', { adapterID: 'test' }, (result) => {
            resolve(result);
        }, 3000);
    });
}
function serverConnection(socket) {
    socket.on('data', (data) => {
        const str = data.toString().split('\r\n')[2];
        const request = JSON.parse(str);
        const response = {
            seq: request.seq,
            request_seq: request.seq,
            type: 'response',
            command: request.command
        };
        if (request.arguments.adapterID === 'test') {
            response.success = true;
        }
        else {
            response.success = false;
            response.message = 'failed';
        }
        const responsePayload = JSON.stringify(response);
        socket.write(`Content-Length: ${responsePayload.length}\r\n\r\n${responsePayload}`);
    });
}
suite('Debug - StreamDebugAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test(`StreamDebugAdapter (NamedPipeDebugAdapter) can initialize a connection`, async () => {
        const pipeName = crypto.randomBytes(10).toString('hex');
        const pipePath = platform.isWindows ? join('\\\\.\\pipe\\', pipeName) : join(tmpdir(), pipeName);
        const server = await new Promise((resolve, reject) => {
            const server = net.createServer(serverConnection);
            server.once('listening', () => resolve(server));
            server.once('error', reject);
            server.listen(pipePath);
        });
        const debugAdapter = new NamedPipeDebugAdapter({
            type: 'pipeServer',
            path: pipePath
        });
        try {
            await debugAdapter.startSession();
            const response = await sendInitializeRequest(debugAdapter);
            assert.strictEqual(response.command, 'initialize');
            assert.strictEqual(response.request_seq, 1);
            assert.strictEqual(response.success, true, response.message);
        }
        finally {
            await debugAdapter.stopSession();
            server.close();
            debugAdapter.dispose();
        }
    });
    test(`StreamDebugAdapter (SocketDebugAdapter) can initialize a connection`, async () => {
        const rndPort = Math.floor(Math.random() * 1000 + 8000);
        const port = await ports.findFreePort(rndPort, 10 /* try 10 ports */, 3000 /* try up to 3 seconds */, 87 /* skip 87 ports between attempts */);
        const server = net.createServer(serverConnection).listen(port);
        const debugAdapter = new SocketDebugAdapter({
            type: 'server',
            port
        });
        try {
            await debugAdapter.startSession();
            const response = await sendInitializeRequest(debugAdapter);
            assert.strictEqual(response.command, 'initialize');
            assert.strictEqual(response.request_seq, 1);
            assert.strictEqual(response.success, true, response.message);
        }
        finally {
            await debugAdapter.stopSession();
            server.close();
            debugAdapter.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtRGVidWdBZGFwdGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9ub2RlL3N0cmVhbURlYnVnQWRhcHRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQztBQUMzQixPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxLQUFLLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFzQixNQUFNLDRCQUE0QixDQUFDO0FBQzNHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLFNBQVMscUJBQXFCLENBQUMsWUFBZ0M7SUFDOUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxZQUFZLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3hFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE1BQWtC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