/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Client as MessagePortClient } from '../../browser/ipc.mp.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
suite('IPC, MessagePorts', () => {
    test('message passing', async () => {
        const { port1, port2 } = new MessageChannel();
        const client1 = new MessagePortClient(port1, 'client1');
        const client2 = new MessagePortClient(port2, 'client2');
        client1.registerChannel('client1', {
            call(_, command, arg, cancellationToken) {
                switch (command) {
                    case 'testMethodClient1': return Promise.resolve('success1');
                    default: return Promise.reject(new Error('not implemented'));
                }
            },
            listen(_, event, arg) {
                switch (event) {
                    default: throw new Error('not implemented');
                }
            }
        });
        client2.registerChannel('client2', {
            call(_, command, arg, cancellationToken) {
                switch (command) {
                    case 'testMethodClient2': return Promise.resolve('success2');
                    default: return Promise.reject(new Error('not implemented'));
                }
            },
            listen(_, event, arg) {
                switch (event) {
                    default: throw new Error('not implemented');
                }
            }
        });
        const channelClient1 = client2.getChannel('client1');
        assert.strictEqual(await channelClient1.call('testMethodClient1'), 'success1');
        const channelClient2 = client1.getChannel('client2');
        assert.strictEqual(await channelClient2.call('testMethodClient2'), 'success2');
        client1.dispose();
        client2.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvdGVzdC9icm93c2VyL2lwYy5tcC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUc1QixPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0YsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUUvQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBRTlDLE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXhELE9BQU8sQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxDQUFVLEVBQUUsT0FBZSxFQUFFLEdBQVEsRUFBRSxpQkFBb0M7Z0JBQy9FLFFBQVEsT0FBTyxFQUFFLENBQUM7b0JBQ2pCLEtBQUssbUJBQW1CLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQzdELE9BQU8sQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhLEVBQUUsR0FBUztnQkFDMUMsUUFBUSxLQUFLLEVBQUUsQ0FBQztvQkFDZixPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQzdDLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUU7WUFDbEMsSUFBSSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsR0FBUSxFQUFFLGlCQUFvQztnQkFDL0UsUUFBUSxPQUFPLEVBQUUsQ0FBQztvQkFDakIsS0FBSyxtQkFBbUIsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDN0QsT0FBTyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztnQkFDOUQsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWEsRUFBRSxHQUFTO2dCQUMxQyxRQUFRLEtBQUssRUFBRSxDQUFDO29CQUNmLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFL0UsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRS9FLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=