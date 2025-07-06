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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvd2lkZ2V0L29ic2VydmFibGVDb2RlRWRpdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBZSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBd0Isb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTFELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLGVBQWUsQ0FDdkIsRUFBeUc7UUFFekcsMEJBQTBCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTLDBCQUEwQixDQUNsQyxnQkFFWSxFQUNaLEVBQXlHO1FBRXpHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDM0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUMxQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN4QyxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMvQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBRXRCLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUNuQztnQkFDQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO2dCQUN6QyxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtvQkFDekIsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDckUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsT0FBTyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNyRSxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO2FBQ0QsRUFDRCxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNWLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekYsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWpDLE1BQU0sR0FBRyxHQUFHLCtCQUErQixTQUFTLFlBQVksU0FBUyxFQUFFLENBQUM7Z0JBQzVFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2IsT0FBTyxHQUFHLENBQUM7WUFDWixDQUFDLENBQ0QsQ0FBQztZQUVGLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO2dCQUNoRCxvREFBb0Q7YUFDcEQsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUV4QyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FDeEIsZUFBZSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEVBQUU7WUFDaEQsbUtBQW1LO1lBQ25LLG9EQUFvRDtTQUNwRCxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRUwsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FDMUIsZUFBZSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtRQUNuQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUVwRCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO1lBQ2hELHVDQUF1QztZQUN2Qyw2SUFBNkk7WUFDN0ksNklBQTZJO1lBQzdJLDZJQUE2STtZQUM3SSx3S0FBd0s7WUFDeEssb0RBQW9EO1NBQ3BELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFTCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFLENBQzNDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7UUFDbkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFcEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtZQUNoRCx1Q0FBdUM7WUFDdkMsNklBQTZJO1lBQzdJLDZJQUE2STtZQUM3SSw2SUFBNkk7WUFDN0ksd0tBQXdLO1lBQ3hLLG9EQUFvRDtTQUNwRCxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUvQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO1lBQ2hELG9LQUFvSztZQUNwSyxvREFBb0Q7U0FDcEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVMLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsSUFBSSxPQUE0QixDQUFDO1FBQ2pDLElBQUksR0FBUSxDQUFDO1FBQ2IsMEJBQTBCLENBQ3pCLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtnQkFDbkMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUMxQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ2QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMxQixDQUFDLENBQUMsQ0FDRixDQUFDO1FBQ0gsQ0FBQyxFQUNELENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDUixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzNCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBRWYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtnQkFDaEQsZ0JBQWdCO2dCQUNoQixlQUFlO2dCQUNmLHFDQUFxQztnQkFDckMsNklBQTZJO2dCQUM3SSx3S0FBd0s7Z0JBQ3hLLG9EQUFvRDthQUNwRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxJQUFJLE9BQTRCLENBQUM7UUFDakMsSUFBSSxHQUFRLENBQUM7UUFDYiwwQkFBMEIsQ0FDekIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO2dCQUNuQyxHQUFHLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQ2xDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUUzQyxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQzFCLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFCLENBQUMsQ0FBQyxDQUNGLENBQUM7UUFDSCxDQUFDLEVBQ0QsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNSLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDM0IsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDdkIsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7WUFFZixNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUVsRCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO2dCQUNoRCx3QkFBd0I7Z0JBQ3hCLGdCQUFnQjtnQkFDaEIsMkNBQTJDO2dCQUMzQyxvREFBb0Q7Z0JBQ3BELGVBQWU7Z0JBQ2YscUNBQXFDO2dCQUNyQyw2SUFBNkk7Z0JBQzdJLHdLQUF3SztnQkFDeEssb0RBQW9EO2FBQ3BELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sR0FBRztJQUFUO1FBQ2tCLFlBQU8sR0FBYSxFQUFFLENBQUM7SUFVekMsQ0FBQztJQVRPLEdBQUcsQ0FBQyxPQUFlO1FBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFTSxrQkFBa0I7UUFDeEIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDeEIsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNEO0FBRUQsU0FBUyxZQUFZLENBQUMsTUFBZTtJQUNwQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLE1BQU0sRUFDTixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUNkLElBQUksS0FBSyxZQUFZLEtBQUssRUFBRSxDQUFDO1lBQzVCLE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pCLENBQUM7UUFDRCxJQUNDLEtBQUssS0FBSyxLQUFLO1lBQ2YsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQzNDLENBQUM7WUFDRixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDLENBQ0QsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUFxQixFQUFFLFNBQStCO0lBQzdFLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDYixLQUFLLFNBQVMsQ0FBQyxVQUFVO1lBQ3hCLE9BQU8sbUJBQW1CLENBQUM7UUFDNUIsS0FBSyxTQUFTLENBQUMsU0FBUztZQUN2QixPQUFPLGtCQUFrQixDQUFDO1FBQzNCLEtBQUssU0FBUyxDQUFDLFNBQVM7WUFDdkIsT0FBTyxrQkFBa0IsQ0FBQztRQUMzQjtZQUNDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7QUFDRixDQUFDIn0=