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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9yZXF1ZXN0L3Rlc3QvZWxlY3Ryb24tbWFpbi9yZXF1ZXN0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHOUQsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFFckIsSUFBSSxJQUFZLENBQUM7SUFDakIsSUFBSSxNQUFtQixDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsRUFBRTtZQUM1RCxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDdkMsSUFBSSxHQUFHLENBQUMsR0FBRyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUM1QixPQUFPLENBQUMsZ0JBQWdCO2dCQUN6QixDQUFDO2dCQUNELEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2xELElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMs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