/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { instantiateTestCodeEditor, createCodeEditorServices } from './testCodeEditor.js';
import { instantiateTextModel } from '../common/testTextModel.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
export function testCommand(lines, languageId, selection, commandFactory, expectedLines, expectedSelection, forceTokenization, prepare) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables);
    if (prepare) {
        instantiationService.invokeFunction(prepare, disposables);
    }
    const model = disposables.add(instantiateTextModel(instantiationService, lines.join('\n'), languageId));
    const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model));
    const viewModel = editor.getViewModel();
    if (forceTokenization) {
        model.tokenization.forceTokenization(model.getLineCount());
    }
    viewModel.setSelections('tests', [selection]);
    const command = instantiationService.invokeFunction((accessor) => commandFactory(accessor, viewModel.getSelection()));
    viewModel.executeCommand(command, 'tests');
    assert.deepStrictEqual(model.getLinesContent(), expectedLines);
    const actualSelection = viewModel.getSelection();
    assert.deepStrictEqual(actualSelection.toString(), expectedSelection.toString());
    disposables.dispose();
}
/**
 * Extract edit operations if command `command` were to execute on model `model`
 */
export function getEditOperation(model, command) {
    const operations = [];
    const editOperationBuilder = {
        addEditOperation: (range, text, forceMoveMarkers = false) => {
            operations.push({
                range: range,
                text: text,
                forceMoveMarkers: forceMoveMarkers
            });
        },
        addTrackedEditOperation: (range, text, forceMoveMarkers = false) => {
            operations.push({
                range: range,
                text: text,
                forceMoveMarkers: forceMoveMarkers
            });
        },
        trackSelection: (selection) => {
            return '';
        }
    };
    command.getEditOperations(model, editOperationBuilder);
    return operations;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci90ZXN0Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFLNUIsT0FBTyxFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR3BFLE1BQU0sVUFBVSxXQUFXLENBQzFCLEtBQWUsRUFDZixVQUF5QixFQUN6QixTQUFvQixFQUNwQixjQUE4RSxFQUM5RSxhQUF1QixFQUN2QixpQkFBNEIsRUFDNUIsaUJBQTJCLEVBQzNCLE9BQTRFO0lBRTVFLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDeEcsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3ZGLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUcsQ0FBQztJQUV6QyxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBRTlDLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RILFNBQVMsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRS9ELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBRWpGLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN2QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsS0FBaUIsRUFBRSxPQUFpQjtJQUNwRSxNQUFNLFVBQVUsR0FBMkIsRUFBRSxDQUFDO0lBQzlDLE1BQU0sb0JBQW9CLEdBQTBCO1FBQ25ELGdCQUFnQixFQUFFLENBQUMsS0FBYSxFQUFFLElBQVksRUFBRSxtQkFBNEIsS0FBSyxFQUFFLEVBQUU7WUFDcEYsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFDZixLQUFLLEVBQUUsS0FBSztnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixnQkFBZ0IsRUFBRSxnQkFBZ0I7YUFDbEMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELHVCQUF1QixFQUFFLENBQUMsS0FBYSxFQUFFLElBQVksRUFBRSxtQkFBNEIsS0FBSyxFQUFFLEVBQUU7WUFDM0YsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFDZixLQUFLLEVBQUUsS0FBSztnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixnQkFBZ0IsRUFBRSxnQkFBZ0I7YUFDbEMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUdELGNBQWMsRUFBRSxDQUFDLFNBQXFCLEVBQUUsRUFBRTtZQUN6QyxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7S0FDRCxDQUFDO0lBQ0YsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sVUFBVSxDQUFDO0FBQ25CLENBQUMifQ==