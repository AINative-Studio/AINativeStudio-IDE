/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { dispose } from '../../../../../base/common/lifecycle.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { createBreakpointDecorations } from '../../browser/breakpointEditorContribution.js';
import { getBreakpointMessageAndIcon, getExpandedBodySize } from '../../browser/breakpointsView.js';
import { IDebugService } from '../../common/debug.js';
import { Breakpoint, DebugModel } from '../../common/debugModel.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel, mockUriIdentityService } from './mockDebugModel.js';
import { MockDebugService, MockDebugStorage } from '../common/mockDebug.js';
import { MockLabelService } from '../../../../services/label/test/common/mockLabelService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
function addBreakpointsAndCheckEvents(model, uri, data) {
    let eventCount = 0;
    const toDispose = model.onDidChangeBreakpoints(e => {
        assert.strictEqual(e?.sessionOnly, false);
        assert.strictEqual(e?.changed, undefined);
        assert.strictEqual(e?.removed, undefined);
        const added = e?.added;
        assert.notStrictEqual(added, undefined);
        assert.strictEqual(added.length, data.length);
        eventCount++;
        dispose(toDispose);
        for (let i = 0; i < data.length; i++) {
            assert.strictEqual(e.added[i] instanceof Breakpoint, true);
            assert.strictEqual(e.added[i].lineNumber, data[i].lineNumber);
        }
    });
    const bps = model.addBreakpoints(uri, data);
    assert.strictEqual(eventCount, 1);
    return bps;
}
suite('Debug - Breakpoints', () => {
    let model;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        model = createMockDebugModel(disposables);
    });
    // Breakpoints
    test('simple', () => {
        const modelUri = uri.file('/myfolder/myfile.js');
        addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumber: 5, enabled: true }, { lineNumber: 10, enabled: false }]);
        assert.strictEqual(model.areBreakpointsActivated(), true);
        assert.strictEqual(model.getBreakpoints().length, 2);
        let eventCount = 0;
        const toDispose = model.onDidChangeBreakpoints(e => {
            eventCount++;
            assert.strictEqual(e?.added, undefined);
            assert.strictEqual(e?.sessionOnly, false);
            assert.strictEqual(e?.removed?.length, 2);
            assert.strictEqual(e?.changed, undefined);
            dispose(toDispose);
        });
        model.removeBreakpoints(model.getBreakpoints());
        assert.strictEqual(eventCount, 1);
        assert.strictEqual(model.getBreakpoints().length, 0);
    });
    test('toggling', () => {
        const modelUri = uri.file('/myfolder/myfile.js');
        addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumber: 5, enabled: true }, { lineNumber: 10, enabled: false }]);
        addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumber: 12, enabled: true, condition: 'fake condition' }]);
        assert.strictEqual(model.getBreakpoints().length, 3);
        const bp = model.getBreakpoints().pop();
        if (bp) {
            model.removeBreakpoints([bp]);
        }
        assert.strictEqual(model.getBreakpoints().length, 2);
        model.setBreakpointsActivated(false);
        assert.strictEqual(model.areBreakpointsActivated(), false);
        model.setBreakpointsActivated(true);
        assert.strictEqual(model.areBreakpointsActivated(), true);
    });
    test('two files', () => {
        const modelUri1 = uri.file('/myfolder/my file first.js');
        const modelUri2 = uri.file('/secondfolder/second/second file.js');
        addBreakpointsAndCheckEvents(model, modelUri1, [{ lineNumber: 5, enabled: true }, { lineNumber: 10, enabled: false }]);
        assert.strictEqual(getExpandedBodySize(model, undefined, 9), 44);
        addBreakpointsAndCheckEvents(model, modelUri2, [{ lineNumber: 1, enabled: true }, { lineNumber: 2, enabled: true }, { lineNumber: 3, enabled: false }]);
        assert.strictEqual(getExpandedBodySize(model, undefined, 9), 110);
        assert.strictEqual(model.getBreakpoints().length, 5);
        assert.strictEqual(model.getBreakpoints({ uri: modelUri1 }).length, 2);
        assert.strictEqual(model.getBreakpoints({ uri: modelUri2 }).length, 3);
        assert.strictEqual(model.getBreakpoints({ lineNumber: 5 }).length, 1);
        assert.strictEqual(model.getBreakpoints({ column: 5 }).length, 0);
        const bp = model.getBreakpoints()[0];
        const update = new Map();
        update.set(bp.getId(), { lineNumber: 100 });
        let eventFired = false;
        const toDispose = model.onDidChangeBreakpoints(e => {
            eventFired = true;
            assert.strictEqual(e?.added, undefined);
            assert.strictEqual(e?.removed, undefined);
            assert.strictEqual(e?.changed?.length, 1);
            dispose(toDispose);
        });
        model.updateBreakpoints(update);
        assert.strictEqual(eventFired, true);
        assert.strictEqual(bp.lineNumber, 100);
        assert.strictEqual(model.getBreakpoints({ enabledOnly: true }).length, 3);
        model.enableOrDisableAllBreakpoints(false);
        model.getBreakpoints().forEach(bp => {
            assert.strictEqual(bp.enabled, false);
        });
        assert.strictEqual(model.getBreakpoints({ enabledOnly: true }).length, 0);
        model.setEnablement(bp, true);
        assert.strictEqual(bp.enabled, true);
        model.removeBreakpoints(model.getBreakpoints({ uri: modelUri1 }));
        assert.strictEqual(getExpandedBodySize(model, undefined, 9), 66);
        assert.strictEqual(model.getBreakpoints().length, 3);
    });
    test('conditions', () => {
        const modelUri1 = uri.file('/myfolder/my file first.js');
        addBreakpointsAndCheckEvents(model, modelUri1, [{ lineNumber: 5, condition: 'i < 5', hitCondition: '17' }, { lineNumber: 10, condition: 'j < 3' }]);
        const breakpoints = model.getBreakpoints();
        assert.strictEqual(breakpoints[0].condition, 'i < 5');
        assert.strictEqual(breakpoints[0].hitCondition, '17');
        assert.strictEqual(breakpoints[1].condition, 'j < 3');
        assert.strictEqual(!!breakpoints[1].hitCondition, false);
        assert.strictEqual(model.getBreakpoints().length, 2);
        model.removeBreakpoints(model.getBreakpoints());
        assert.strictEqual(model.getBreakpoints().length, 0);
    });
    test('function breakpoints', () => {
        model.addFunctionBreakpoint({ name: 'foo' }, '1');
        model.addFunctionBreakpoint({ name: 'bar' }, '2');
        model.updateFunctionBreakpoint('1', { name: 'fooUpdated' });
        model.updateFunctionBreakpoint('2', { name: 'barUpdated' });
        const functionBps = model.getFunctionBreakpoints();
        assert.strictEqual(functionBps[0].name, 'fooUpdated');
        assert.strictEqual(functionBps[1].name, 'barUpdated');
        model.removeFunctionBreakpoints();
        assert.strictEqual(model.getFunctionBreakpoints().length, 0);
    });
    test('multiple sessions', () => {
        const modelUri = uri.file('/myfolder/myfile.js');
        addBreakpointsAndCheckEvents(model, modelUri, [{ lineNumber: 5, enabled: true, condition: 'x > 5' }, { lineNumber: 10, enabled: false }]);
        const breakpoints = model.getBreakpoints();
        const session = disposables.add(createTestSession(model));
        const data = new Map();
        assert.strictEqual(breakpoints[0].lineNumber, 5);
        assert.strictEqual(breakpoints[1].lineNumber, 10);
        data.set(breakpoints[0].getId(), { verified: false, line: 10 });
        data.set(breakpoints[1].getId(), { verified: true, line: 50 });
        model.setBreakpointSessionData(session.getId(), {}, data);
        assert.strictEqual(breakpoints[0].lineNumber, 5);
        assert.strictEqual(breakpoints[1].lineNumber, 50);
        const session2 = disposables.add(createTestSession(model));
        const data2 = new Map();
        data2.set(breakpoints[0].getId(), { verified: true, line: 100 });
        data2.set(breakpoints[1].getId(), { verified: true, line: 500 });
        model.setBreakpointSessionData(session2.getId(), {}, data2);
        // Breakpoint is verified only once, show that line
        assert.strictEqual(breakpoints[0].lineNumber, 100);
        // Breakpoint is verified two times, show the original line
        assert.strictEqual(breakpoints[1].lineNumber, 10);
        model.setBreakpointSessionData(session.getId(), {}, undefined);
        // No more double session verification
        assert.strictEqual(breakpoints[0].lineNumber, 100);
        assert.strictEqual(breakpoints[1].lineNumber, 500);
        assert.strictEqual(breakpoints[0].supported, false);
        const data3 = new Map();
        data3.set(breakpoints[0].getId(), { verified: true, line: 500 });
        model.setBreakpointSessionData(session2.getId(), { supportsConditionalBreakpoints: true }, data2);
        assert.strictEqual(breakpoints[0].supported, true);
    });
    test('exception breakpoints', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        model.setExceptionBreakpointsForSession("session-id-1", [{ filter: 'uncaught', label: 'UNCAUGHT', default: true }]);
        assert.strictEqual(eventCount, 1);
        let exceptionBreakpoints = model.getExceptionBreakpointsForSession("session-id-1");
        assert.strictEqual(exceptionBreakpoints.length, 1);
        assert.strictEqual(exceptionBreakpoints[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpoints[0].enabled, true);
        model.setExceptionBreakpointsForSession("session-id-2", [{ filter: 'uncaught', label: 'UNCAUGHT' }, { filter: 'caught', label: 'CAUGHT' }]);
        assert.strictEqual(eventCount, 2);
        exceptionBreakpoints = model.getExceptionBreakpointsForSession("session-id-2");
        assert.strictEqual(exceptionBreakpoints.length, 2);
        assert.strictEqual(exceptionBreakpoints[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpoints[0].enabled, true);
        assert.strictEqual(exceptionBreakpoints[1].filter, 'caught');
        assert.strictEqual(exceptionBreakpoints[1].label, 'CAUGHT');
        assert.strictEqual(exceptionBreakpoints[1].enabled, false);
        model.setExceptionBreakpointsForSession("session-id-3", [{ filter: 'all', label: 'ALL' }]);
        assert.strictEqual(eventCount, 3);
        assert.strictEqual(model.getExceptionBreakpointsForSession("session-id-3").length, 1);
        exceptionBreakpoints = model.getExceptionBreakpoints();
        assert.strictEqual(exceptionBreakpoints[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpoints[0].enabled, true);
        assert.strictEqual(exceptionBreakpoints[1].filter, 'caught');
        assert.strictEqual(exceptionBreakpoints[1].label, 'CAUGHT');
        assert.strictEqual(exceptionBreakpoints[1].enabled, false);
        assert.strictEqual(exceptionBreakpoints[2].filter, 'all');
        assert.strictEqual(exceptionBreakpoints[2].label, 'ALL');
    });
    test('exception breakpoints multiple sessions', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        model.setExceptionBreakpointsForSession("session-id-4", [{ filter: 'uncaught', label: 'UNCAUGHT', default: true }, { filter: 'caught', label: 'CAUGHT' }]);
        model.setExceptionBreakpointFallbackSession("session-id-4");
        assert.strictEqual(eventCount, 1);
        let exceptionBreakpointsForSession = model.getExceptionBreakpointsForSession("session-id-4");
        assert.strictEqual(exceptionBreakpointsForSession.length, 2);
        assert.strictEqual(exceptionBreakpointsForSession[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpointsForSession[1].filter, 'caught');
        model.setExceptionBreakpointsForSession("session-id-5", [{ filter: 'all', label: 'ALL' }, { filter: 'caught', label: 'CAUGHT' }]);
        assert.strictEqual(eventCount, 2);
        exceptionBreakpointsForSession = model.getExceptionBreakpointsForSession("session-id-5");
        let exceptionBreakpointsForUndefined = model.getExceptionBreakpointsForSession(undefined);
        assert.strictEqual(exceptionBreakpointsForSession.length, 2);
        assert.strictEqual(exceptionBreakpointsForSession[0].filter, 'caught');
        assert.strictEqual(exceptionBreakpointsForSession[1].filter, 'all');
        assert.strictEqual(exceptionBreakpointsForUndefined.length, 2);
        assert.strictEqual(exceptionBreakpointsForUndefined[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpointsForUndefined[1].filter, 'caught');
        model.removeExceptionBreakpointsForSession("session-id-4");
        assert.strictEqual(eventCount, 2);
        exceptionBreakpointsForUndefined = model.getExceptionBreakpointsForSession(undefined);
        assert.strictEqual(exceptionBreakpointsForUndefined.length, 2);
        assert.strictEqual(exceptionBreakpointsForUndefined[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpointsForUndefined[1].filter, 'caught');
        model.setExceptionBreakpointFallbackSession("session-id-5");
        assert.strictEqual(eventCount, 2);
        exceptionBreakpointsForUndefined = model.getExceptionBreakpointsForSession(undefined);
        assert.strictEqual(exceptionBreakpointsForUndefined.length, 2);
        assert.strictEqual(exceptionBreakpointsForUndefined[0].filter, 'caught');
        assert.strictEqual(exceptionBreakpointsForUndefined[1].filter, 'all');
        const exceptionBreakpoints = model.getExceptionBreakpoints();
        assert.strictEqual(exceptionBreakpoints.length, 3);
    });
    test('instruction breakpoints', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        //address: string, offset: number, condition?: string, hitCondition?: string
        model.addInstructionBreakpoint({ instructionReference: '0xCCCCFFFF', offset: 0, address: 0n, canPersist: false });
        assert.strictEqual(eventCount, 1);
        let instructionBreakpoints = model.getInstructionBreakpoints();
        assert.strictEqual(instructionBreakpoints.length, 1);
        assert.strictEqual(instructionBreakpoints[0].instructionReference, '0xCCCCFFFF');
        assert.strictEqual(instructionBreakpoints[0].offset, 0);
        model.addInstructionBreakpoint({ instructionReference: '0xCCCCEEEE', offset: 1, address: 0n, canPersist: false });
        assert.strictEqual(eventCount, 2);
        instructionBreakpoints = model.getInstructionBreakpoints();
        assert.strictEqual(instructionBreakpoints.length, 2);
        assert.strictEqual(instructionBreakpoints[0].instructionReference, '0xCCCCFFFF');
        assert.strictEqual(instructionBreakpoints[0].offset, 0);
        assert.strictEqual(instructionBreakpoints[1].instructionReference, '0xCCCCEEEE');
        assert.strictEqual(instructionBreakpoints[1].offset, 1);
    });
    test('data breakpoints', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        model.addDataBreakpoint({ description: 'label', src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'id' }, canPersist: true, accessTypes: ['read'], accessType: 'read' }, '1');
        model.addDataBreakpoint({ description: 'second', src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'secondId' }, canPersist: false, accessTypes: ['readWrite'], accessType: 'readWrite' }, '2');
        model.updateDataBreakpoint('1', { condition: 'aCondition' });
        model.updateDataBreakpoint('2', { hitCondition: '10' });
        const dataBreakpoints = model.getDataBreakpoints();
        assert.strictEqual(dataBreakpoints[0].canPersist, true);
        assert.deepStrictEqual(dataBreakpoints[0].src, { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'id' });
        assert.strictEqual(dataBreakpoints[0].accessType, 'read');
        assert.strictEqual(dataBreakpoints[0].condition, 'aCondition');
        assert.strictEqual(dataBreakpoints[1].canPersist, false);
        assert.strictEqual(dataBreakpoints[1].description, 'second');
        assert.strictEqual(dataBreakpoints[1].accessType, 'readWrite');
        assert.strictEqual(dataBreakpoints[1].hitCondition, '10');
        assert.strictEqual(eventCount, 4);
        model.removeDataBreakpoints(dataBreakpoints[0].getId());
        assert.strictEqual(eventCount, 5);
        assert.strictEqual(model.getDataBreakpoints().length, 1);
        model.removeDataBreakpoints();
        assert.strictEqual(model.getDataBreakpoints().length, 0);
        assert.strictEqual(eventCount, 6);
    });
    test('message and class name', () => {
        const modelUri = uri.file('/myfolder/my file first.js');
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 5, enabled: true, condition: 'x > 5' },
            { lineNumber: 10, enabled: false },
            { lineNumber: 12, enabled: true, logMessage: 'hello' },
            { lineNumber: 15, enabled: true, hitCondition: '12' },
            { lineNumber: 500, enabled: true },
        ]);
        const breakpoints = model.getBreakpoints();
        const ls = new MockLabelService();
        let result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[0], ls, model);
        assert.strictEqual(result.message, 'Condition: x > 5');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-conditional');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[1], ls, model);
        assert.strictEqual(result.message, 'Disabled Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-disabled');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[2], ls, model);
        assert.strictEqual(result.message, 'Log Message: hello');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-log');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[3], ls, model);
        assert.strictEqual(result.message, 'Hit Count: 12');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-conditional');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[4], ls, model);
        assert.strictEqual(result.message, ls.getUriLabel(breakpoints[4].uri));
        assert.strictEqual(result.icon.id, 'debug-breakpoint');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, false, breakpoints[2], ls, model);
        assert.strictEqual(result.message, 'Disabled Logpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-log-disabled');
        model.addDataBreakpoint({ description: 'label', canPersist: true, accessTypes: ['read'], accessType: 'read', src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'id' } });
        const dataBreakpoints = model.getDataBreakpoints();
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, dataBreakpoints[0], ls, model);
        assert.strictEqual(result.message, 'Data Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-data');
        const functionBreakpoint = model.addFunctionBreakpoint({ name: 'foo' }, '1');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, functionBreakpoint, ls, model);
        assert.strictEqual(result.message, 'Function Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-function');
        const data = new Map();
        data.set(breakpoints[0].getId(), { verified: false, line: 10 });
        data.set(breakpoints[1].getId(), { verified: true, line: 50 });
        data.set(breakpoints[2].getId(), { verified: true, line: 50, message: 'world' });
        data.set(functionBreakpoint.getId(), { verified: true });
        model.setBreakpointSessionData('mocksessionid', { supportsFunctionBreakpoints: false, supportsDataBreakpoints: true, supportsLogPoints: true }, data);
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[0], ls, model);
        assert.strictEqual(result.message, 'Unverified Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-unverified');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, functionBreakpoint, ls, model);
        assert.strictEqual(result.message, 'Function breakpoints not supported by this debug type');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-function-unverified');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[2], ls, model);
        assert.strictEqual(result.message, 'Log Message: hello, world');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-log');
    });
    test('decorations', () => {
        const modelUri = uri.file('/myfolder/my file first.js');
        const languageId = 'testMode';
        const textModel = createTextModel(['this is line one', 'this is line two', '    this is line three it has whitespace at start', 'this is line four', 'this is line five'].join('\n'), languageId);
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 1, enabled: true, condition: 'x > 5' },
            { lineNumber: 2, column: 4, enabled: false },
            { lineNumber: 3, enabled: true, logMessage: 'hello' },
            { lineNumber: 500, enabled: true },
        ]);
        const breakpoints = model.getBreakpoints();
        const instantiationService = new TestInstantiationService();
        const debugService = new MockDebugService();
        debugService.getModel = () => model;
        instantiationService.stub(IDebugService, debugService);
        instantiationService.stub(ILabelService, new MockLabelService());
        instantiationService.stub(ILanguageService, disposables.add(new LanguageService()));
        let decorations = instantiationService.invokeFunction(accessor => createBreakpointDecorations(accessor, textModel, breakpoints, 3 /* State.Running */, true, true));
        assert.strictEqual(decorations.length, 3); // last breakpoint filtered out since it has a large line number
        assert.deepStrictEqual(decorations[0].range, new Range(1, 1, 1, 2));
        assert.deepStrictEqual(decorations[1].range, new Range(2, 4, 2, 5));
        assert.deepStrictEqual(decorations[2].range, new Range(3, 5, 3, 6));
        assert.strictEqual(decorations[0].options.beforeContentClassName, undefined);
        assert.strictEqual(decorations[1].options.before?.inlineClassName, `debug-breakpoint-placeholder`);
        assert.strictEqual(decorations[0].options.overviewRuler?.position, OverviewRulerLane.Left);
        const expected = new MarkdownString(undefined, { isTrusted: true, supportThemeIcons: true }).appendCodeblock(languageId, 'Condition: x > 5');
        assert.deepStrictEqual(decorations[0].options.glyphMarginHoverMessage, expected);
        decorations = instantiationService.invokeFunction(accessor => createBreakpointDecorations(accessor, textModel, breakpoints, 3 /* State.Running */, true, false));
        assert.strictEqual(decorations[0].options.overviewRuler, null);
        textModel.dispose();
        instantiationService.dispose();
    });
    test('updates when storage changes', () => {
        const storage1 = disposables.add(new TestStorageService());
        const debugStorage1 = disposables.add(new MockDebugStorage(storage1));
        const model1 = disposables.add(new DebugModel(debugStorage1, { isDirty: (e) => false }, mockUriIdentityService, new NullLogService()));
        // 1. create breakpoints in the first model
        const modelUri = uri.file('/myfolder/my file first.js');
        const first = [
            { lineNumber: 1, enabled: true, condition: 'x > 5' },
            { lineNumber: 2, column: 4, enabled: false },
        ];
        addBreakpointsAndCheckEvents(model1, modelUri, first);
        debugStorage1.storeBreakpoints(model1);
        const stored = storage1.get('debug.breakpoint', 1 /* StorageScope.WORKSPACE */);
        // 2. hydrate a new model and ensure external breakpoints get applied
        const storage2 = disposables.add(new TestStorageService());
        const model2 = disposables.add(new DebugModel(disposables.add(new MockDebugStorage(storage2)), { isDirty: (e) => false }, mockUriIdentityService, new NullLogService()));
        storage2.store('debug.breakpoint', stored, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */, /* external= */ true);
        assert.deepStrictEqual(model2.getBreakpoints().map(b => b.getId()), model1.getBreakpoints().map(b => b.getId()));
        // 3. ensure non-external changes are ignored
        storage2.store('debug.breakpoint', '[]', 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */, /* external= */ false);
        assert.deepStrictEqual(model2.getBreakpoints().map(b => b.getId()), model1.getBreakpoints().map(b => b.getId()));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvYnJlYWtwb2ludHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7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