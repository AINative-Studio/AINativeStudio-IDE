/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { UserActivityService } from '../../common/userActivityService.js';
const MARK_INACTIVE_DEBOUNCE = 10_000;
suite('UserActivityService', () => {
    let userActivityService;
    let clock;
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        clock = sinon.useFakeTimers();
        userActivityService = ds.add(new UserActivityService(ds.add(new TestInstantiationService())));
    });
    teardown(() => {
        clock.restore();
    });
    test('isActive should be true initially', () => {
        assert.ok(userActivityService.isActive);
    });
    test('markActive should be inactive when all handles gone', () => {
        const h1 = userActivityService.markActive();
        const h2 = userActivityService.markActive();
        assert.strictEqual(userActivityService.isActive, true);
        h1.dispose();
        assert.strictEqual(userActivityService.isActive, true);
        h2.dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        assert.strictEqual(userActivityService.isActive, false);
    });
    test('markActive sets active whenHeldFor', async () => {
        userActivityService.markActive().dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        const duration = 100; // milliseconds
        const opts = { whenHeldFor: duration };
        const handle = userActivityService.markActive(opts);
        assert.strictEqual(userActivityService.isActive, false);
        clock.tick(duration - 1);
        assert.strictEqual(userActivityService.isActive, false);
        clock.tick(1);
        assert.strictEqual(userActivityService.isActive, true);
        handle.dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        assert.strictEqual(userActivityService.isActive, false);
    });
    test('markActive whenHeldFor before triggers', async () => {
        userActivityService.markActive().dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        const duration = 100; // milliseconds
        const opts = { whenHeldFor: duration };
        userActivityService.markActive(opts).dispose();
        assert.strictEqual(userActivityService.isActive, false);
        clock.tick(duration + MARK_INACTIVE_DEBOUNCE);
        assert.strictEqual(userActivityService.isActive, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckFjdGl2aXR5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyQWN0aXZpdHkvdGVzdC9jb21tb24vdXNlckFjdGl2aXR5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBNEMsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVwSCxNQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQztBQUV0QyxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLElBQUksbUJBQXlDLENBQUM7SUFDOUMsSUFBSSxLQUE0QixDQUFDO0lBRWpDLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFckQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDOUIsbUJBQW1CLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILElB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