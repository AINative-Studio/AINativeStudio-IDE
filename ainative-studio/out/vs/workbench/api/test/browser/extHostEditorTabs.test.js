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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVkaXRvclRhYnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RWRpdG9yVGFicy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMsbUJBQW1CLEVBQUU7SUFFMUIsTUFBTSxhQUFhLEdBQWtCO1FBQ3BDLEVBQUUsRUFBRSxjQUFjO1FBQ2xCLEtBQUssRUFBRSxFQUFFLElBQUksZ0NBQXdCLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsRUFBRTtRQUM3RSxRQUFRLEVBQUUsSUFBSTtRQUNkLE9BQU8sRUFBRSxJQUFJO1FBQ2IsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsS0FBSztRQUNoQixLQUFLLEVBQUUsUUFBUTtLQUNmLENBQUM7SUFFRixTQUFTLFlBQVksQ0FBQyxHQUE0QjtRQUNqRCxPQUFPLEVBQUUsR0FBRyxhQUFhLEVBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lB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