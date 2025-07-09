/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from "assert";
import { DisposableStore } from "../../../../base/common/lifecycle.js";
import { derivedHandleChanges } from "../../../../base/common/observable.js";
import { ensureNoDisposablesAreLeakedInTestSuite } from "../../../../base/test/common/utils.js";
import { observableCodeEditor } from "../../../browser/observableCodeEditor.js";
import { Position } from "../../../common/core/position.js";
import { Range } from "../../../common/core/range.js";
import { withTestCodeEditor } from "../testCodeEditor.js";
suite("CodeEditorWidget", () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function withTestFixture(cb) {
        withEditorSetupTestFixture(undefined, cb);
    }
    function withEditorSetupTestFixture(preSetupCallback, cb) {
        withTestCodeEditor("hello world", {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            preSetupCallback?.(editor, disposables);
            const obsEditor = observableCodeEditor(editor);
            const log = new Log();
            const derived = derivedHandleChanges({
                createEmptyChangeSummary: () => undefined,
                handleChange: (context) => {
                    const obsName = observableName(context.changedObservable, obsEditor);
                    log.log(`handle change: ${obsName} ${formatChange(context.change)}`);
                    return true;
                },
            }, (reader) => {
                const versionId = obsEditor.versionId.read(reader);
                const selection = obsEditor.selections.read(reader)?.map((s) => s.toString()).join(", ");
                obsEditor.onDidType.read(reader);
                const str = `running derived: selection: ${selection}, value: ${versionId}`;
                log.log(str);
                return str;
            });
            derived.recomputeInitiallyAndOnChange(disposables);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "running derived: selection: [1,1 -> 1,1], value: 1",
            ]);
            cb({ editor, viewModel, log, derived });
            disposables.dispose();
        });
    }
    test("setPosition", () => withTestFixture(({ editor, log }) => {
        editor.setPosition(new Position(1, 2));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":1,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"api","reason":0}',
            "running derived: selection: [1,2 -> 1,2], value: 1",
        ]);
    }));
    test("keyboard.type", () => withTestFixture(({ editor, log }) => {
        editor.trigger("keyboard", "type", { text: "abc" });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.onDidType "abc"',
            'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
            'handle change: editor.versionId {"changes":[{"range":"[1,2 -> 1,2]","rangeLength":0,"text":"b","rangeOffset":1}],"eol":"\\n","versionId":3}',
            'handle change: editor.versionId {"changes":[{"range":"[1,3 -> 1,3]","rangeLength":0,"text":"c","rangeOffset":2}],"eol":"\\n","versionId":4}',
            'handle change: editor.selections {"selection":"[1,4 -> 1,4]","modelVersionId":4,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
            'running derived: selection: [1,4 -> 1,4], value: 4',
        ]);
    }));
    test("keyboard.type and set position", () => withTestFixture(({ editor, log }) => {
        editor.trigger("keyboard", "type", { text: "abc" });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.onDidType "abc"',
            'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
            'handle change: editor.versionId {"changes":[{"range":"[1,2 -> 1,2]","rangeLength":0,"text":"b","rangeOffset":1}],"eol":"\\n","versionId":3}',
            'handle change: editor.versionId {"changes":[{"range":"[1,3 -> 1,3]","rangeLength":0,"text":"c","rangeOffset":2}],"eol":"\\n","versionId":4}',
            'handle change: editor.selections {"selection":"[1,4 -> 1,4]","modelVersionId":4,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
            'running derived: selection: [1,4 -> 1,4], value: 4',
        ]);
        editor.setPosition(new Position(1, 5), "test");
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.selections {"selection":"[1,5 -> 1,5]","modelVersionId":4,"oldSelections":["[1,4 -> 1,4]"],"oldModelVersionId":4,"source":"test","reason":0}',
            "running derived: selection: [1,5 -> 1,5], value: 4",
        ]);
    }));
    test("listener interaction (unforced)", () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log(">>> before get");
                derived.get();
                log.log("<<< after get");
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger("keyboard", "type", { text: "a" });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                ">>> before get",
                "<<< after get",
                'handle change: editor.onDidType "a"',
                'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
                'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":2,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
                "running derived: selection: [1,2 -> 1,2], value: 2",
            ]);
        });
    });
    test("listener interaction ()", () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log(">>> before forceUpdate");
                observableCodeEditor(editor).forceUpdate();
                log.log(">>> before get");
                derived.get();
                log.log("<<< after get");
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger("keyboard", "type", { text: "a" });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                ">>> before forceUpdate",
                ">>> before get",
                "handle change: editor.versionId undefined",
                "running derived: selection: [1,2 -> 1,2], value: 2",
                "<<< after get",
                'handle change: editor.onDidType "a"',
                'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
                'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":2,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
                "running derived: selection: [1,2 -> 1,2], value: 2",
            ]);
        });
    });
});
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
function formatChange(change) {
    return JSON.stringify(change, (key, value) => {
        if (value instanceof Range) {
            return value.toString();
        }
        if (value === false ||
            (Array.isArray(value) && value.length === 0)) {
            return undefined;
        }
        return value;
    });
}
function observableName(obs, obsEditor) {
    switch (obs) {
        case obsEditor.selections:
            return "editor.selections";
        case obsEditor.versionId:
            return "editor.versionId";
        case obsEditor.onDidType:
            return "editor.onDidType";
        default:
            return "unknown";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3dpZGdldC9vYnNlcnZhYmxlQ29kZUVkaXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQWUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQXdCLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUUxRCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxlQUFlLENBQ3ZCLEVBQXlHO1FBRXpHLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FDbEMsZ0JBRVksRUFDWixFQUF5RztRQUV6RyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzNELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFDMUMsZ0JBQWdCLEVBQUUsQ0FB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