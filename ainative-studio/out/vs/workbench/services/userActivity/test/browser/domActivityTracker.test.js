/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { DomActivityTracker } from '../../browser/domActivityTracker.js';
import { UserActivityService } from '../../common/userActivityService.js';
import * as sinon from 'sinon';
import assert from 'assert';
suite('DomActivityTracker', () => {
    let uas;
    let dom;
    let insta;
    let clock;
    const maxTimeToBecomeIdle = 3 * 30_000; // (MIN_INTERVALS_WITHOUT_ACTIVITY + 1) * CHECK_INTERVAL;
    setup(() => {
        clock = sinon.useFakeTimers();
        insta = new TestInstantiationService();
        uas = new UserActivityService(insta);
        dom = new DomActivityTracker(uas);
    });
    teardown(() => {
        dom.dispose();
        uas.dispose();
        clock.restore();
        insta.dispose();
    });
    test('marks inactive on no input', () => {
        assert.equal(uas.isActive, true);
        clock.tick(maxTimeToBecomeIdle);
        assert.equal(uas.isActive, false);
    });
    test('preserves activity state when active', () => {
        assert.equal(uas.isActive, true);
        const div = 10;
        for (let i = 0; i < div; i++) {
            document.dispatchEvent(new MouseEvent('keydown'));
            clock.tick(maxTimeToBecomeIdle / div);
        }
        assert.equal(uas.isActive, true);
    });
    test('restores active state', () => {
        assert.equal(uas.isActive, true);
        clock.tick(maxTimeToBecomeIdle);
        assert.equal(uas.isActive, false);
        document.dispatchEvent(new MouseEvent('keydown'));
        assert.equal(uas.isActive, true);
        clock.tick(maxTimeToBecomeIdle);
        assert.equal(uas.isActive, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tQWN0aXZpdHlUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJBY3Rpdml0eS90ZXN0L2Jyb3dzZXIvZG9tQWN0aXZpdHlUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxHQUF3QixDQUFDO0lBQzdCLElBQUksR0FBdUIsQ0FBQztJQUM1QixJQUFJLEtBQStCLENBQUM7SUFDcEMsSUFBSSxLQUE0QixDQUFDO0lBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLHlEQUF5RDtJQUVqRyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM5QixLQUFLLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQ3ZDLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLEdBQUcsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFHSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlCLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=