/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ConsoleLogger, ILogService } from '../../../log/common/log.js';
import { LogService } from '../../../log/common/logService.js';
import { RequestStore } from '../../common/requestStore.js';
suite('RequestStore', () => {
    let instantiationService;
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ILogService, new LogService(new ConsoleLogger()));
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('should resolve requests', async () => {
        const requestStore = store.add(instantiationService.createInstance((RequestStore), undefined));
        let eventArgs;
        store.add(requestStore.onCreateRequest(e => eventArgs = e));
        const request = requestStore.createRequest({ arg: 'foo' });
        strictEqual(typeof eventArgs?.requestId, 'number');
        strictEqual(eventArgs?.arg, 'foo');
        requestStore.acceptReply(eventArgs.requestId, { data: 'bar' });
        const result = await request;
        strictEqual(result.data, 'bar');
    });
    test('should reject the promise when the request times out', async () => {
        const requestStore = store.add(instantiationService.createInstance((RequestStore), 1));
        const request = requestStore.createRequest({ arg: 'foo' });
        let threw = false;
        try {
            await request;
        }
        catch (e) {
            threw = true;
        }
        if (!threw) {
            fail();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFN0b3JlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vcmVxdWVzdFN0b3JlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDM0MsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVELEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUN0RCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsTUFBTSxZQUFZLEdBQW9ELEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUEsWUFBK0MsQ0FBQSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDakwsSUFBSSxTQUF5RCxDQUFDO1FBQzlELEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMzRCxXQUFXLENBQUMsT0FBTyxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25DLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDO1FBQzdCLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZFLE1BQU0sWUFBWSxHQUFvRCxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFBLFlBQStDLENBQUEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pLLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMzRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEIsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLENBQUM7UUFDZixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osSUFBSSxFQUFFLENBQUM7UUFDUixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9