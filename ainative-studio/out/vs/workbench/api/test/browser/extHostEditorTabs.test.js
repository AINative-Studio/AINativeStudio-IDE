/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ExtHostEditorTabs } from '../../common/extHostEditorTabs.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { TextMergeTabInput, TextTabInput } from '../../common/extHostTypes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostEditorTabs', function () {
    const defaultTabDto = {
        id: 'uniquestring',
        input: { kind: 1 /* TabInputKind.TextInput */, uri: URI.parse('file://abc/def.txt') },
        isActive: true,
        isDirty: true,
        isPinned: true,
        isPreview: false,
        label: 'label1',
    };
    function createTabDto(dto) {
        return { ...defaultTabDto, ...dto };
    }
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Ensure empty model throws when accessing active group', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 0);
        // Active group should never be undefined (there is always an active group). Ensure accessing it undefined throws.
        // TODO @lramos15 Add a throw on the main side when a model is sent without an active group
        assert.throws(() => extHostEditorTabs.tabGroups.activeTabGroup);
    });
    test('single tab', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tab = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.ok(first.activeTab);
        assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        {
            extHostEditorTabs.$acceptEditorTabModel([{
                    isActive: true,
                    viewColumn: 0,
                    groupId: 12,
                    tabs: [tab]
                }]);
            assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
            const [first] = extHostEditorTabs.tabGroups.all;
            assert.ok(first.activeTab);
            assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        }
    });
    test('Empty tab group', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: []
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.strictEqual(first.activeTab, undefined);
        assert.strictEqual(first.tabs.length, 0);
    });
    test('Ensure tabGroup change events fires', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        let count = 0;
        store.add(extHostEditorTabs.tabGroups.onDidChangeTabGroups(() => count++));
        assert.strictEqual(count, 0);
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: []
            }]);
        assert.ok(extHostEditorTabs.tabGroups.activeTabGroup);
        const activeTabGroup = extHostEditorTabs.tabGroups.activeTabGroup;
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(activeTabGroup.tabs.length, 0);
        assert.strictEqual(count, 1);
    });
    test('Check TabGroupChangeEvent properties', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const group1Data = {
            isActive: true,
            viewColumn: 0,
            groupId: 12,
            tabs: []
        };
        const group2Data = { ...group1Data, groupId: 13 };
        const events = [];
        store.add(extHostEditorTabs.tabGroups.onDidChangeTabGroups(e => events.push(e)));
        // OPEN
        extHostEditorTabs.$acceptEditorTabModel([group1Data]);
        assert.deepStrictEqual(events, [{
                changed: [],
                closed: [],
                opened: [extHostEditorTabs.tabGroups.activeTabGroup]
            }]);
        // OPEN, CHANGE
        events.length = 0;
        extHostEditorTabs.$acceptEditorTabModel([{ ...group1Data, isActive: false }, group2Data]);
        assert.deepStrictEqual(events, [{
                changed: [extHostEditorTabs.tabGroups.all[0]],
                closed: [],
                opened: [extHostEditorTabs.tabGroups.all[1]]
            }]);
        // CHANGE
        events.length = 0;
        extHostEditorTabs.$acceptEditorTabModel([group1Data, { ...group2Data, isActive: false }]);
        assert.deepStrictEqual(events, [{
                changed: extHostEditorTabs.tabGroups.all,
                closed: [],
                opened: []
            }]);
        // CLOSE, CHANGE
        events.length = 0;
        const oldActiveGroup = extHostEditorTabs.tabGroups.activeTabGroup;
        extHostEditorTabs.$acceptEditorTabModel([group2Data]);
        assert.deepStrictEqual(events, [{
                changed: extHostEditorTabs.tabGroups.all,
                closed: [oldActiveGroup],
                opened: []
            }]);
    });
    test('Ensure reference equality for activeTab and activeGroup', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tab = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            editorId: 'default',
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.ok(first.activeTab);
        assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        assert.strictEqual(first.activeTab, first.tabs[0]);
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup, first);
    });
    test('TextMergeTabInput surfaces in the UI', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tab = createTabDto({
            input: {
                kind: 3 /* TabInputKind.TextMergeInput */,
                base: URI.from({ scheme: 'test', path: 'base' }),
                input1: URI.from({ scheme: 'test', path: 'input1' }),
                input2: URI.from({ scheme: 'test', path: 'input2' }),
                result: URI.from({ scheme: 'test', path: 'result' }),
            }
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.ok(first.activeTab);
        assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        assert.ok(first.activeTab.input instanceof TextMergeTabInput);
    });
    test('Ensure reference stability', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tabDto = createTabDto();
        // single dirty tab
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tabDto]
            }]);
        let all = extHostEditorTabs.tabGroups.all.map(group => group.tabs).flat();
        assert.strictEqual(all.length, 1);
        const apiTab1 = all[0];
        assert.ok(apiTab1.input instanceof TextTabInput);
        assert.strictEqual(tabDto.input.kind, 1 /* TabInputKind.TextInput */);
        const dtoResource = tabDto.input.uri;
        assert.strictEqual(apiTab1.input.uri.toString(), URI.revive(dtoResource).toString());
        assert.strictEqual(apiTab1.isDirty, true);
        // NOT DIRTY anymore
        const tabDto2 = { ...tabDto, isDirty: false };
        // Accept a simple update
        extHostEditorTabs.$acceptTabOperation({
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            index: 0,
            tabDto: tabDto2,
            groupId: 12
        });
        all = extHostEditorTabs.tabGroups.all.map(group => group.tabs).flat();
        assert.strictEqual(all.length, 1);
        const apiTab2 = all[0];
        assert.ok(apiTab1.input instanceof TextTabInput);
        assert.strictEqual(apiTab1.input.uri.toString(), URI.revive(dtoResource).toString());
        assert.strictEqual(apiTab2.isDirty, false);
        assert.strictEqual(apiTab1 === apiTab2, true);
    });
    test('Tab.isActive working', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tabDtoAAA = createTabDto({
            id: 'AAA',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            input: { kind: 1 /* TabInputKind.TextInput */, uri: URI.parse('file://abc/AAA.txt') },
            editorId: 'default'
        });
        const tabDtoBBB = createTabDto({
            id: 'BBB',
            isActive: false,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            input: { kind: 1 /* TabInputKind.TextInput */, uri: URI.parse('file://abc/BBB.txt') },
            editorId: 'default'
        });
        // single dirty tab
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tabDtoAAA, tabDtoBBB]
            }]);
        const all = extHostEditorTabs.tabGroups.all.map(group => group.tabs).flat();
        assert.strictEqual(all.length, 2);
        const activeTab1 = extHostEditorTabs.tabGroups.activeTabGroup?.activeTab;
        assert.ok(activeTab1?.input instanceof TextTabInput);
        assert.strictEqual(tabDtoAAA.input.kind, 1 /* TabInputKind.TextInput */);
        const dtoAAAResource = tabDtoAAA.input.uri;
        assert.strictEqual(activeTab1?.input?.uri.toString(), URI.revive(dtoAAAResource)?.toString());
        assert.strictEqual(activeTab1?.isActive, true);
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: { ...tabDtoBBB, isActive: true } /// BBB is now active
        });
        const activeTab2 = extHostEditorTabs.tabGroups.activeTabGroup?.activeTab;
        assert.ok(activeTab2?.input instanceof TextTabInput);
        assert.strictEqual(tabDtoBBB.input.kind, 1 /* TabInputKind.TextInput */);
        const dtoBBBResource = tabDtoBBB.input.uri;
        assert.strictEqual(activeTab2?.input?.uri.toString(), URI.revive(dtoBBBResource)?.toString());
        assert.strictEqual(activeTab2?.isActive, true);
        assert.strictEqual(activeTab1?.isActive, false);
    });
    test('vscode.window.tagGroups is immutable', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.activeTabGroup = undefined;
        });
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.all.length = 0;
        });
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.onDidChangeActiveTabGroup = undefined;
        });
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.onDidChangeTabGroups = undefined;
        });
    });
    test('Ensure close is called with all tab ids', function () {
        const closedTabIds = [];
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
            // override/implement $moveTab or $closeTab
            async $closeTab(tabIds, preserveFocus) {
                closedTabIds.push(tabIds);
                return true;
            }
        }));
        const tab = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            editorId: 'default'
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const activeTab = extHostEditorTabs.tabGroups.activeTabGroup?.activeTab;
        assert.ok(activeTab);
        extHostEditorTabs.tabGroups.close(activeTab, false);
        assert.strictEqual(closedTabIds.length, 1);
        assert.deepStrictEqual(closedTabIds[0], ['uniquestring']);
        // Close with array
        extHostEditorTabs.tabGroups.close([activeTab], false);
        assert.strictEqual(closedTabIds.length, 2);
        assert.deepStrictEqual(closedTabIds[1], ['uniquestring']);
    });
    test('Update tab only sends tab change event', async function () {
        const closedTabIds = [];
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
            // override/implement $moveTab or $closeTab
            async $closeTab(tabIds, preserveFocus) {
                closedTabIds.push(tabIds);
                return true;
            }
        }));
        const tabDto = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            editorId: 'default'
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tabDto]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 1);
        const tab = extHostEditorTabs.tabGroups.all[0].tabs[0];
        const p = new Promise(resolve => store.add(extHostEditorTabs.tabGroups.onDidChangeTabs(resolve)));
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: { ...tabDto, label: 'NEW LABEL' }
        });
        const changedTab = (await p).changed[0];
        assert.ok(tab === changedTab);
        assert.strictEqual(changedTab.label, 'NEW LABEL');
    });
    test('Active tab', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tab1 = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
        });
        const tab2 = createTabDto({
            isActive: false,
            id: 'uniquestring2',
        });
        const tab3 = createTabDto({
            isActive: false,
            id: 'uniquestring3',
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab1, tab2, tab3]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 3);
        // Active tab is correct
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, extHostEditorTabs.tabGroups.activeTabGroup?.tabs[0]);
        // Switching active tab works
        tab1.isActive = false;
        tab2.isActive = true;
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: tab1
        });
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: tab2
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, extHostEditorTabs.tabGroups.activeTabGroup?.tabs[1]);
        //Closing tabs out works
        tab3.isActive = true;
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab3]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, extHostEditorTabs.tabGroups.activeTabGroup?.tabs[0]);
        // Closing out all tabs returns undefine active tab
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: []
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 0);
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, undefined);
    });
    test('Tab operations patches open and close correctly', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tab1 = createTabDto({
            id: 'uniquestring',
            isActive: true,
            label: 'label1',
        });
        const tab2 = createTabDto({
            isActive: false,
            id: 'uniquestring2',
            label: 'label2',
        });
        const tab3 = createTabDto({
            isActive: false,
            id: 'uniquestring3',
            label: 'label3',
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab1, tab2, tab3]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 3);
        // Close tab 2
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 1 /* TabModelOperationKind.TAB_CLOSE */,
            tabDto: tab2
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 2);
        // Close active tab and update tab 3 to be active
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 1 /* TabModelOperationKind.TAB_CLOSE */,
            tabDto: tab1
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 1);
        tab3.isActive = true;
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: tab3
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.activeTab?.label, 'label3');
        // Open tab 2 back
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 0 /* TabModelOperationKind.TAB_OPEN */,
            tabDto: tab2
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 2);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[1]?.label, 'label2');
    });
    test('Tab operations patches move correctly', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new class extends mock() {
        }));
        const tab1 = createTabDto({
            id: 'uniquestring',
            isActive: true,
            label: 'label1',
        });
        const tab2 = createTabDto({
            isActive: false,
            id: 'uniquestring2',
            label: 'label2',
        });
        const tab3 = createTabDto({
            isActive: false,
            id: 'uniquestring3',
            label: 'label3',
        });
        extHostEditorTabs.$acceptEditorTabModel([{
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab1, tab2, tab3]
            }]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 3);
        // Move tab 2 to index 0
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            oldIndex: 1,
            kind: 3 /* TabModelOperationKind.TAB_MOVE */,
            tabDto: tab2
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 3);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[0]?.label, 'label2');
        // Move tab 3 to index 1
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            oldIndex: 2,
            kind: 3 /* TabModelOperationKind.TAB_MOVE */,
            tabDto: tab3
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map(g => g.tabs).flat().length, 3);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[1]?.label, 'label3');
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[0]?.label, 'label2');
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[2]?.label, 'label1');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVkaXRvclRhYnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdEVkaXRvclRhYnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLG1CQUFtQixFQUFFO0lBRTFCLE1BQU0sYUFBYSxHQUFrQjtRQUNwQyxFQUFFLEVBQUUsY0FBYztRQUNsQixLQUFLLEVBQUUsRUFBRSxJQUFJLGdDQUF3QixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUU7UUFDN0UsUUFBUSxFQUFFLElBQUk7UUFDZCxPQUFPLEVBQUUsSUFBSTtRQUNiLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLEtBQUs7UUFDaEIsS0FBSyxFQUFFLFFBQVE7S0FDZixDQUFDO0lBRUYsU0FBUyxZQUFZLENBQUMsR0FBNEI7UUFDakQsT0FBTyxFQUFFLEdBQUcsYUFBYSxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxDQUFDLHVEQUF1RCxFQUFFO1FBQzdELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUMsc0JBQXNCLENBQUMsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE2QjtTQUV6RSxDQUFDLENBQ0YsQ0FBQztRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsa0hBQWtIO1FBQ2xILDJGQUEyRjtRQUMzRixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUU7UUFFbEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxHQUFHLEdBQWtCLFlBQVksQ0FBQztZQUN2QyxFQUFFLEVBQUUsY0FBYztZQUNsQixRQUFRLEVBQUUsSUFBSTtZQUNkLE9BQU8sRUFBRSxJQUFJO1lBQ2IsUUFBUSxFQUFFLElBQUk7WUFDZCxLQUFLLEVBQUUsUUFBUTtTQUNmLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNYLENBQUMsQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztRQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCxDQUFDO1lBQ0EsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDeEMsUUFBUSxFQUFFLElBQUk7b0JBQ2QsVUFBVSxFQUFFLENBQUM7b0JBQ2IsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUNYLENBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztZQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUU7UUFDdkIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLEVBQUU7YUFDUixDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUU7UUFDM0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdCLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLElBQUksRUFBRSxFQUFFO2FBQ1IsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN0RCxNQUFNLGNBQWMsR0FBb0IsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztRQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUU7UUFDNUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxVQUFVLEdBQXVCO1lBQ3RDLFFBQVEsRUFBRSxJQUFJO1lBQ2QsVUFBVSxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxFQUFFO1NBQ1IsQ0FBQztRQUNGLE1BQU0sVUFBVSxHQUF1QixFQUFFLEdBQUcsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUV0RSxNQUFNLE1BQU0sR0FBaUMsRUFBRSxDQUFDO1FBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakYsT0FBTztRQUNQLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsRUFBRTtnQkFDWCxNQUFNLEVBQUUsRUFBRTtnQkFDVixNQUFNLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO2FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBRUosZUFBZTtRQUNmLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxHQUFHLFVBQVUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLEVBQUUsRUFBRTtnQkFDVixNQUFNLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVDLENBQUMsQ0FBQyxDQUFDO1FBRUosU0FBUztRQUNULE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsR0FBRyxVQUFVLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUc7Z0JBQ3hDLE1BQU0sRUFBRSxFQUFFO2dCQUNWLE1BQU0sRUFBRSxFQUFFO2FBQ1YsQ0FBQyxDQUFDLENBQUM7UUFFSixnQkFBZ0I7UUFDaEIsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbEIsTUFBTSxjQUFjLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztRQUNsRSxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHO2dCQUN4QyxNQUFNLEVBQUUsQ0FBQyxjQUFjLENBQUM7Z0JBQ3hCLE1BQU0sRUFBRSxFQUFFO2FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5REFBeUQsRUFBRTtRQUMvRCxNQUFNLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLENBQzlDLHNCQUFzQixDQUFDLElBQUksS0FBTSxTQUFRLElBQUksRUFBNkI7U0FFekUsQ0FBQyxDQUNGLENBQUM7UUFDRixNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUM7WUFDeEIsRUFBRSxFQUFFLGNBQWM7WUFDbEIsUUFBUSxFQUFFLElBQUk7WUFDZCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQUUsU0FBUztTQUNuQixDQUFDLENBQUM7UUFFSCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUN4QyxRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsQ0FBQztnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDWCxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7UUFDaEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUU7UUFFNUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxHQUFHLEdBQWtCLFlBQVksQ0FBQztZQUN2QyxLQUFLLEVBQUU7Z0JBQ04sSUFBSSxxQ0FBNkI7Z0JBQ2pDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ2hELE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7YUFDcEQ7U0FDRCxDQUFDLENBQUM7UUFFSCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUN4QyxRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsQ0FBQztnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDWCxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7UUFDaEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssWUFBWSxpQkFBaUIsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1FBRWxDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUMsc0JBQXNCLENBQUMsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE2QjtTQUV6RSxDQUFDLENBQ0YsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLFlBQVksRUFBRSxDQUFDO1FBRTlCLG1CQUFtQjtRQUVuQixpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUN4QyxRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsQ0FBQztnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7YUFDZCxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksR0FBRyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxZQUFZLFlBQVksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLGlDQUF5QixDQUFDO1FBQzlELE1BQU0sV0FBVyxHQUFJLE1BQU0sQ0FBQyxLQUFzQixDQUFDLEdBQUcsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFHMUMsb0JBQW9CO1FBRXBCLE1BQU0sT0FBTyxHQUFrQixFQUFFLEdBQUcsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUM3RCx5QkFBeUI7UUFDekIsaUJBQWlCLENBQUMsbUJBQW1CLENBQUM7WUFDckMsSUFBSSwwQ0FBa0M7WUFDdEMsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsT0FBTztZQUNmLE9BQU8sRUFBRSxFQUFFO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsR0FBRyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxZQUFZLFlBQVksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUU7UUFFNUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBQ0YsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDO1lBQzlCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFLElBQUk7WUFDZCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLFFBQVE7WUFDZixLQUFLLEVBQUUsRUFBRSxJQUFJLGdDQUF3QixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDN0UsUUFBUSxFQUFFLFNBQVM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDO1lBQzlCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFLEtBQUs7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLFFBQVE7WUFDZixLQUFLLEVBQUUsRUFBRSxJQUFJLGdDQUF3QixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDN0UsUUFBUSxFQUFFLFNBQVM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsbUJBQW1CO1FBRW5CLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7YUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEMsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7UUFDekUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxZQUFZLFlBQVksQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLGlDQUF5QixDQUFDO1FBQ2pFLE1BQU0sY0FBYyxHQUFJLFNBQVMsQ0FBQyxLQUFzQixDQUFDLEdBQUcsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM5RixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFL0MsaUJBQWlCLENBQUMsbUJBQW1CLENBQUM7WUFDckMsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsQ0FBQztZQUNSLElBQUksMENBQWtDO1lBQ3RDLE1BQU0sRUFBRSxFQUFFLEdBQUcsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxxQkFBcUI7U0FDOUQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7UUFDekUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxZQUFZLFlBQVksQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLGlDQUF5QixDQUFDO1FBQ2pFLE1BQU0sY0FBYyxHQUFJLFNBQVMsQ0FBQyxLQUFzQixDQUFDLEdBQUcsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM5RixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFO1FBRTVDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUMsc0JBQXNCLENBQUMsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE2QjtTQUV6RSxDQUFDLENBQ0YsQ0FBQztRQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2xCLDBDQUEwQztZQUMxQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUN4RCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2xCLDBDQUEwQztZQUMxQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNsQiwwQ0FBMEM7WUFDMUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHlCQUF5QixHQUFHLFNBQVMsQ0FBQztRQUNuRSxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2xCLDBDQUEwQztZQUMxQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUU7UUFDL0MsTUFBTSxZQUFZLEdBQWUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUMsc0JBQXNCLENBQUMsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE2QjtZQUN6RSwyQ0FBMkM7WUFDbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFnQixFQUFFLGFBQXVCO2dCQUNqRSxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMxQixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7U0FDRCxDQUFDLENBQ0YsQ0FBQztRQUNGLE1BQU0sR0FBRyxHQUFrQixZQUFZLENBQUM7WUFDdkMsRUFBRSxFQUFFLGNBQWM7WUFDbEIsUUFBUSxFQUFFLElBQUk7WUFDZCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQUUsU0FBUztTQUNuQixDQUFDLENBQUM7UUFFSCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUN4QyxRQUFRLEVBQUUsSUFBSTtnQkFDZCxVQUFVLEVBQUUsQ0FBQztnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDWCxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7UUFDeEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyQixpQkFBaUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzFELG1CQUFtQjtRQUNuQixpQkFBaUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLO1FBQ25ELE1BQU0sWUFBWSxHQUFlLEVBQUUsQ0FBQztRQUNwQyxNQUFNLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLENBQzlDLHNCQUFzQixDQUFDLElBQUksS0FBTSxTQUFRLElBQUksRUFBNkI7WUFDekUsMkNBQTJDO1lBQ2xDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBZ0IsRUFBRSxhQUF1QjtnQkFDakUsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDMUIsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBa0IsWUFBWSxDQUFDO1lBQzFDLEVBQUUsRUFBRSxjQUFjO1lBQ2xCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsT0FBTyxFQUFFLElBQUk7WUFDYixRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUFFLFNBQVM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO2FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBR3ZELE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUF3QixPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekgsaUJBQWlCLENBQUMsbUJBQW1CLENBQUM7WUFDckMsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsQ0FBQztZQUNSLElBQUksMENBQWtDO1lBQ3RDLE1BQU0sRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUU7U0FDekMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4QyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxVQUFVLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsWUFBWSxFQUFFO1FBRWxCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUMsc0JBQXNCLENBQUMsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUE2QjtTQUV6RSxDQUFDLENBQ0YsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFrQixZQUFZLENBQUM7WUFDeEMsRUFBRSxFQUFFLGNBQWM7WUFDbEIsUUFBUSxFQUFFLElBQUk7WUFDZCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLFFBQVE7U0FDZixDQUFDLENBQUM7UUFFSCxNQUFNLElBQUksR0FBa0IsWUFBWSxDQUFDO1lBQ3hDLFFBQVEsRUFBRSxLQUFLO1lBQ2YsRUFBRSxFQUFFLGVBQWU7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxRQUFRLEVBQUUsS0FBSztZQUNmLEVBQUUsRUFBRSxlQUFlO1NBQ25CLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2FBQ3hCLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0Rix3QkFBd0I7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9ILDZCQUE2QjtRQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUNyQixpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNyQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSwwQ0FBa0M7WUFDdEMsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFDSCxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNyQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSwwQ0FBa0M7WUFDdEMsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFL0gsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQzthQUNaLENBQUMsQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFL0gsbURBQW1EO1FBQ25ELGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE9BQU8sRUFBRSxFQUFFO2dCQUNYLElBQUksRUFBRSxFQUFFO2FBQ1IsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUU7UUFDdkQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxFQUFFLEVBQUUsY0FBYztZQUNsQixRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxRQUFRLEVBQUUsS0FBSztZQUNmLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEtBQUssRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxRQUFRLEVBQUUsS0FBSztZQUNmLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEtBQUssRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7YUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRGLGNBQWM7UUFDZCxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNyQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSx5Q0FBaUM7WUFDckMsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRGLGlEQUFpRDtRQUNqRCxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNyQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSx5Q0FBaUM7WUFDckMsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDO1lBQ3JDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLENBQUM7WUFDUixJQUFJLDBDQUFrQztZQUN0QyxNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFbkYsa0JBQWtCO1FBQ2xCLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDO1lBQ3JDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLENBQUM7WUFDUixJQUFJLHdDQUFnQztZQUNwQyxNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUU7UUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxzQkFBc0IsQ0FBQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTZCO1NBRXpFLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxFQUFFLEVBQUUsY0FBYztZQUNsQixRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxRQUFRLEVBQUUsS0FBSztZQUNmLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEtBQUssRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQWtCLFlBQVksQ0FBQztZQUN4QyxRQUFRLEVBQUUsS0FBSztZQUNmLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEtBQUssRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7YUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRGLHdCQUF3QjtRQUN4QixpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNyQyxPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxJQUFJLHdDQUFnQztZQUNwQyxNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFakYsd0JBQXdCO1FBQ3hCLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDO1lBQ3JDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLENBQUM7WUFDUixRQUFRLEVBQUUsQ0FBQztZQUNYLElBQUksd0NBQWdDO1lBQ3BDLE1BQU0sRUFBRSxJQUFJO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNsRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=