/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Client as MessagePortClient } from '../../browser/ipc.mp.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
suite('IPC, MessagePorts', () => {
    test('message port close event', async () => {
        const { port1, port2 } = new MessageChannel();
        const client1 = new MessagePortClient(port1, 'client1');
        const client2 = new MessagePortClient(port2, 'client2');
        // This test ensures that Electron's API for the close event
        // does not break because we rely on it to dispose client
        // connections from the server.
        //
        // This event is not provided by browser MessagePort API though.
        const whenClosed = new Promise(resolve => port1.addEventListener('close', () => resolve(true)));
        client2.dispose();
        assert.ok(await whenClosed);
        client1.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2lwYy5tcC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0YsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUUvQixJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0MsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBRTlDLE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXhELDREQUE0RDtRQUM1RCx5REFBeUQ7UUFDekQsK0JBQStCO1FBQy9CLEVBQUU7UUFDRixnRUFBZ0U7UUFDaEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxPQUFPLENBQVUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxVQUFVLENBQUMsQ0FBQztRQUU1QixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=