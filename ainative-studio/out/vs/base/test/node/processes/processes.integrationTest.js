/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as cp from 'child_process';
import { FileAccess } from '../../../common/network.js';
import * as objects from '../../../common/objects.js';
import * as platform from '../../../common/platform.js';
import * as processes from '../../../node/processes.js';
function fork(id) {
    const opts = {
        env: objects.mixin(objects.deepClone(process.env), {
            VSCODE_ESM_ENTRYPOINT: id,
            VSCODE_PIPE_LOGGING: 'true',
            VSCODE_VERBOSE_LOGGING: true
        })
    };
    return cp.fork(FileAccess.asFileUri('bootstrap-fork').fsPath, ['--type=processTests'], opts);
}
suite('Processes', () => {
    test('buffered sending - simple data', function (done) {
        if (process.env['VSCODE_PID']) {
            return done(); // this test fails when run from within VS Code
        }
        const child = fork('vs/base/test/node/processes/fixtures/fork');
        const sender = processes.createQueuedSender(child);
        let counter = 0;
        const msg1 = 'Hello One';
        const msg2 = 'Hello Two';
        const msg3 = 'Hello Three';
        child.on('message', msgFromChild => {
            if (msgFromChild === 'ready') {
                sender.send(msg1);
                sender.send(msg2);
                sender.send(msg3);
            }
            else {
                counter++;
                if (counter === 1) {
                    assert.strictEqual(msgFromChild, msg1);
                }
                else if (counter === 2) {
                    assert.strictEqual(msgFromChild, msg2);
                }
                else if (counter === 3) {
                    assert.strictEqual(msgFromChild, msg3);
                    child.kill();
                    done();
                }
            }
        });
    });
    (!platform.isWindows || process.env['VSCODE_PID'] ? test.skip : test)('buffered sending - lots of data (potential deadlock on win32)', function (done) {
        const child = fork('vs/base/test/node/processes/fixtures/fork_large');
        const sender = processes.createQueuedSender(child);
        const largeObj = Object.create(null);
        for (let i = 0; i < 10000; i++) {
            largeObj[i] = 'some data';
        }
        const msg = JSON.stringify(largeObj);
        child.on('message', msgFromChild => {
            if (msgFromChild === 'ready') {
                sender.send(msg);
                sender.send(msg);
                sender.send(msg);
            }
            else if (msgFromChild === 'done') {
                child.kill();
                done();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wcm9jZXNzZXMvcHJvY2Vzc2VzLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3hELE9BQU8sS0FBSyxPQUFPLE1BQU0sNEJBQTRCLENBQUM7QUFDdEQsT0FBTyxLQUFLLFFBQVEsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RCxPQUFPLEtBQUssU0FBUyxNQUFNLDRCQUE0QixDQUFDO0FBRXhELFNBQVMsSUFBSSxDQUFDLEVBQVU7SUFDdkIsTUFBTSxJQUFJLEdBQVE7UUFDakIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEQscUJBQXFCLEVBQUUsRUFBRTtZQUN6QixtQkFBbUIsRUFBRSxNQUFNO1lBQzNCLHNCQUFzQixFQUFFLElBQUk7U0FDNUIsQ0FBQztLQUNGLENBQUM7SUFFRixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUYsQ0FBQztBQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxVQUFVLElBQWdCO1FBQ2hFLElBQUksT0FBTyxDQUFD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