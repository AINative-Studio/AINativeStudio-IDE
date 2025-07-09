/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as http from 'http';
import assert from 'assert';
import { CancellationToken, CancellationTokenSource } from '../../../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
import { request } from '../../common/requestImpl.js';
import { streamToBuffer } from '../../../../common/buffer.js';
suite('Request', () => {
    let port;
    let server;
    setup(async () => {
        port = await new Promise((resolvePort, rejectPort) => {
            server = http.createServer((req, res) => {
                if (req.url === '/noreply') {
                    return; // never respond
                }
                res.setHeader('Content-Type', 'application/json');
                if (req.headers['echo-header']) {
                    res.setHeader('echo-header', req.headers['echo-header']);
                }
                const data = [];
                req.on('data', chunk => data.push(chunk));
                req.on('end', () => {
                    res.end(JSON.stringify({
                        method: req.method,
                        url: req.url,
                        data: Buffer.concat(data).toString()
                    }));
                });
            }).listen(0, '127.0.0.1', () => {
                const address = server.address();
                resolvePort(address.port);
            }).on('error', err => {
                rejectPort(err);
            });
        });
    });
    teardown(async () => {
        await new Promise((resolve, reject) => {
            server.close(err => err ? reject(err) : resolve());
        });
    });
    test('GET', async () => {
        const context = await request({
            url: `http://127.0.0.1:${port}`,
            headers: {
                'echo-header': 'echo-value'
            }
        }, CancellationToken.None);
        assert.strictEqual(context.res.statusCode, 200);
        assert.strictEqual(context.res.headers['content-type'], 'application/json');
        assert.strictEqual(context.res.headers['echo-header'], 'echo-value');
        const buffer = await streamToBuffer(context.stream);
        const body = JSON.parse(buffer.toString());
        assert.strictEqual(body.method, 'GET');
        assert.strictEqual(body.url, '/');
    });
    test('POST', async () => {
        const context = await request({
            type: 'POST',
            url: `http://127.0.0.1:${port}/postpath`,
            data: 'Some data',
        }, CancellationToken.None);
        assert.strictEqual(context.res.statusCode, 200);
        assert.strictEqual(context.res.headers['content-type'], 'application/json');
        const buffer = await streamToBuffer(context.stream);
        const body = JSON.parse(buffer.toString());
        assert.strictEqual(body.method, 'POST');
        assert.strictEqual(body.url, '/postpath');
        assert.strictEqual(body.data, 'Some data');
    });
    test('timeout', async () => {
        try {
            await request({
                type: 'GET',
                url: `http://127.0.0.1:${port}/noreply`,
                timeout: 123,
            }, CancellationToken.None);
            assert.fail('Should fail with timeout');
        }
        catch (err) {
            assert.strictEqual(err.message, 'Fetch timeout: 123ms');
        }
    });
    test('cancel', async () => {
        try {
            const source = new CancellationTokenSource();
            const res = request({
                type: 'GET',
                url: `http://127.0.0.1:${port}/noreply`,
            }, source.token);
            await new Promise(resolve => setTimeout(resolve, 100));
            source.cancel();
            await res;
            assert.fail('Should fail with cancellation');
        }
        catch (err) {
            assert.strictEqual(err.message, 'Canceled');
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvcmVxdWVzdC90ZXN0L2VsZWN0cm9uLW1haW4vcmVxdWVzdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBRTdCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRzlELEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBRXJCLElBQUksSUFBWSxDQUFDO0lBQ2pCLElBQUksTUFBbUIsQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVMsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUU7WUFDNUQsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ3ZDLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxDQUFDLGdCQUFnQjtnQkFDekIsQ0FBQztnQkFDRCxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFD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