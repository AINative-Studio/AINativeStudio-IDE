/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workbenchCalculateActions, workbenchDynamicCalculateActions } from '../../browser/viewParts/notebookEditorToolbar.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
/**
 * Calculate the visible actions in the toolbar.
 * @param action The action to measure.
 * @param container The container the action will be placed in.
 * @returns The primary and secondary actions to be rendered
 *
 * NOTE: every action requires space for ACTION_PADDING +8 to the right.
 *
 * ex: action with size 50 requires 58px of space
 */
suite('Workbench Toolbar calculateActions (strategy always + never)', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const defaultSecondaryActionModels = [
        { action: new Action('secondaryAction0', 'Secondary Action 0'), size: 50, visible: true, renderLabel: true },
        { action: new Action('secondaryAction1', 'Secondary Action 1'), size: 50, visible: true, renderLabel: true },
        { action: new Action('secondaryAction2', 'Secondary Action 2'), size: 50, visible: true, renderLabel: true },
    ];
    const defaultSecondaryActions = defaultSecondaryActionModels.map(action => action.action);
    const separator = { action: new Separator(), size: 1, visible: true, renderLabel: true };
    setup(function () {
        defaultSecondaryActionModels.forEach(action => disposables.add(action.action));
    });
    test('should return empty primary and secondary actions when given empty initial actions', () => {
        const result = workbenchCalculateActions([], [], 100);
        assert.deepEqual(result.primaryActions, []);
        assert.deepEqual(result.secondaryActions, []);
    });
    test('should return all primary actions when they fit within the container width', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action2', 'Action 2')), size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 200);
        assert.deepEqual(result.primaryActions, actions);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should move actions to secondary when they do not fit within the container width', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action2', 'Action 2')), size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 100);
        assert.deepEqual(result.primaryActions, [actions[0]]);
        assert.deepEqual(result.secondaryActions, [actions[1], actions[2], separator, ...defaultSecondaryActionModels].map(action => action.action));
    });
    test('should ignore second separator when two separators are in a row', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 125);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[3]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should ignore separators when they are at the end of the resulting primary actions', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 200);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[2]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should keep actions with size 0 in primary actions', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action2', 'Action 2')), size: 50, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action3', 'Action 3')), size: 0, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 116);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[3]]);
        assert.deepEqual(result.secondaryActions, [actions[2], separator, ...defaultSecondaryActionModels].map(action => action.action));
    });
    test('should not render separator if preceeded by size 0 action(s).', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 0, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 116);
        assert.deepEqual(result.primaryActions, [actions[0], actions[2]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should not render second separator if space between is hidden (size 0) actions.', () => {
        const actions = [
            { action: disposables.add(new Action('action0', 'Action 0')), size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action1', 'Action 1')), size: 0, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action2', 'Action 2')), size: 0, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: disposables.add(new Action('action3', 'Action 3')), size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 300);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[2], actions[3], actions[5]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
});
suite('Workbench Toolbar Dynamic calculateActions (strategy dynamic)', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const actionTemplate = [
        new Action('action0', 'Action 0'),
        new Action('action1', 'Action 1'),
        new Action('action2', 'Action 2'),
        new Action('action3', 'Action 3')
    ];
    const defaultSecondaryActionModels = [
        { action: new Action('secondaryAction0', 'Secondary Action 0'), size: 50, visible: true, renderLabel: true },
        { action: new Action('secondaryAction1', 'Secondary Action 1'), size: 50, visible: true, renderLabel: true },
        { action: new Action('secondaryAction2', 'Secondary Action 2'), size: 50, visible: true, renderLabel: true },
    ];
    const defaultSecondaryActions = defaultSecondaryActionModels.map(action => action.action);
    setup(function () {
        defaultSecondaryActionModels.forEach(action => disposables.add(action.action));
    });
    test('should return empty primary and secondary actions when given empty initial actions', () => {
        const result = workbenchDynamicCalculateActions([], [], 100);
        assert.deepEqual(result.primaryActions, []);
        assert.deepEqual(result.secondaryActions, []);
    });
    test('should return all primary actions as visiblewhen they fit within the container width', () => {
        const constainerSize = 200;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, constainerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('actions all within a group that cannot all fit, will all be icon only', () => {
        const containerSize = 150;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: false },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, [...defaultSecondaryActionModels].map(action => action.action));
    });
    test('should ignore second separator when two separators are in a row', () => {
        const containerSize = 200;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('check label visibility in different groupings', () => {
        const containerSize = 150;
        const actions = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const expectedOutputActions = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: false },
        ];
        const result = workbenchDynamicCalculateActions(actions, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expectedOutputActions);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should ignore separators when they are at the end of the resulting primary actions', () => {
        const containerSize = 200;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should keep actions with size 0 in primary actions', () => {
        const containerSize = 170;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[3], size: 0, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[3], size: 0, visible: true, renderLabel: false },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should not render separator if preceeded by size 0 action(s), but keep size 0 action in primary.', () => {
        const containerSize = 116;
        const input = [
            { action: actionTemplate[0], size: 0, visible: true, renderLabel: true }, // hidden
            { action: new Separator(), size: 1, visible: true, renderLabel: true }, // sep
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true }, // visible
        ];
        const expected = [
            { action: actionTemplate[0], size: 0, visible: true, renderLabel: true }, // hidden
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true } // visible
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should not render second separator if space between is hidden (size 0) actions.', () => {
        const containerSize = 300;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 0, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 0, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[3], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 0, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 0, visible: true, renderLabel: true },
            // remove separator here
            { action: actionTemplate[3], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXb3JrYmVuY2hUb29sYmFyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rV29ya2JlbmNoVG9vbGJhci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQy9ILE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkYsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBU25HOzs7Ozs7Ozs7R0FTRztBQUNILEtBQUssQ0FBQyw4REFBOEQsRUFBRSxHQUFHLEVBQUU7SUFDMUUsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxNQUFNLDRCQUE0QixHQUFtQjtRQUNwRCxFQUFFLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1FBQzVHLEVBQUUsTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7UUFDNUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtLQUM1RyxDQUFDO0lBQ0YsTUFBTSx1QkFBdUIsR0FBYyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckcsTUFBTSxTQUFTLEdBQWlCLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUV2RyxLQUFLLENBQUM7UUFDTCw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFTLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9GQUFvRixFQUFFLEdBQUcsRUFBRTtRQUMvRixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0RUFBNEUsRUFBRSxHQUFHLEVBQUU7UUFDdkYsTUFBTSxPQUFPLEdBQW1CO1lBQy9CLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDMUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUMxRyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQzFHLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0ZBQWtGLEVBQUUsR0FBRyxFQUFFO1FBQzdGLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQzFHLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDMUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUMxRyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLDRCQUE0QixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDOUksQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFO1FBQzVFLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQzFHLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQzFHLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0ZBQW9GLEVBQUUsR0FBRyxFQUFFO1FBQy9GLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQzFHLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUMxRyxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3RFLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBQy9ELE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQzFHLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDMUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUMxRyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pHLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLDRCQUE0QixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbEksQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQzFFLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pHLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUMxRyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUZBQWlGLEVBQUUsR0FBRyxFQUFFO1FBQzVGLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQzFHLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pHLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUMxRyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILEtBQUssQ0FBQywrREFBK0QsRUFBRSxHQUFHLEVBQUU7SUFDM0UsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxNQUFNLGNBQWMsR0FBRztRQUN0QixJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQ2pDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7UUFDakMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztRQUNqQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO0tBQ2pDLENBQUM7SUFFRixNQUFNLDRCQUE0QixHQUFtQjtRQUNwRCxFQUFFLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1FBQzVHLEVBQUUsTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7UUFDNUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtLQUM1RyxDQUFDO0lBQ0YsTUFBTSx1QkFBdUIsR0FBYyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFckcsS0FBSyxDQUFDO1FBQ0wsNEJBQTRCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBUyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvRkFBb0YsRUFBRSxHQUFHLEVBQUU7UUFDL0YsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0ZBQXNGLEVBQUUsR0FBRyxFQUFFO1FBQ2pHLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQztRQUMzQixNQUFNLEtBQUssR0FBbUI7WUFDN0IsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQztRQUNGLE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN6RSxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEdBQUcsRUFBRTtRQUNsRixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQW1CO1lBQzdCLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pFLENBQUM7UUFDRixNQUFNLFFBQVEsR0FBbUI7WUFDaEMsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFO1lBQzFFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRTtZQUMxRSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUU7U0FDMUUsQ0FBQztRQUdGLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRixNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLDRCQUE0QixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDM0csQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFO1FBQzVFLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQztRQUMxQixNQUFNLEtBQUssR0FBbUI7WUFDN0IsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQztRQUNGLE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRixNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNwRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7UUFDMUQsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDO1FBQzFCLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pFLENBQUM7UUFDRixNQUFNLHFCQUFxQixHQUFtQjtZQUM3QyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUU7WUFDMUUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFO1NBQzFFLENBQUM7UUFHRixNQUFNLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNwRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvRkFBb0YsRUFBRSxHQUFHLEVBQUU7UUFDL0YsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFtQjtZQUM3QixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN0RSxDQUFDO1FBQ0YsTUFBTSxRQUFRLEdBQW1CO1lBQ2hDLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN6RSxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUMvRCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQW1CO1lBQzdCLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3hFLENBQUM7UUFDRixNQUFNLFFBQVEsR0FBbUI7WUFDaEMsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRTtZQUMxRSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUU7U0FDekUsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRixNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNwRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrR0FBa0csRUFBRSxHQUFHLEVBQUU7UUFDN0csTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFtQjtZQUM3QixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRyxTQUFTO1lBQ3BGLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRyxNQUFNO1lBQy9FLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLFVBQVU7U0FDckYsQ0FBQztRQUNGLE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRyxTQUFTO1lBQ3BGLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFFLFVBQVU7U0FDckYsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRixNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNwRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRSxHQUFHLEVBQUU7UUFDNUYsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFtQjtZQUM3QixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDeEUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3hFLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pFLENBQUM7UUFDRixNQUFNLFFBQVEsR0FBbUI7WUFDaEMsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3hFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN4RSx3QkFBd0I7WUFDeEIsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pFLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDL0YsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9