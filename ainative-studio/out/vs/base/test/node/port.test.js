/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as net from 'net';
import * as ports from '../../node/ports.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { flakySuite } from './testUtils.js';
flakySuite('Ports', () => {
    (process.env['VSCODE_PID'] ? test.skip /* this test fails when run from within VS Code */ : test)('Finds a free port (no timeout)', function (done) {
        // get an initial freeport >= 7000
        ports.findFreePort(7000, 100, 300000).then(initialPort => {
            assert.ok(initialPort >= 7000);
            // create a server to block this port
            const server = net.createServer();
            server.listen(initialPort, undefined, undefined, () => {
                // once listening, find another free port and assert that the port is different from the opened one
                ports.findFreePort(7000, 50, 300000).then(freePort => {
                    assert.ok(freePort >= 7000 && freePort !== initialPort);
                    server.close();
                    done();
                }, err => done(err));
            });
        }, err => done(err));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3BvcnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxxQkFBcUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFNUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFDeEIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxnQ0FBZ0MsRUFBRSxVQUFVLElBQUk7UUFFakosa0NBQWtDO1FBQ2xDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLENBQUM7WUFFL0IscUNBQXFDO1lBQ3JDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNsQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRTtnQkFFckQsbUdBQW1HO2dCQUNuRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUNwRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxLQUFLLFdBQVcsQ0FBQyxDQUFDO29CQUN4RCxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBRWYsSUFBSSxFQUFFLENBQUM7Z0JBQ1IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==