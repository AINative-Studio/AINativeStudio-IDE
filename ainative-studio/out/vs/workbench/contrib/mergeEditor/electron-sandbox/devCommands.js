/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { randomPath } from '../../../../base/common/extpath.js';
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { MergeEditor } from '../browser/view/mergeEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const MERGE_EDITOR_CATEGORY = localize2('mergeEditor', 'Merge Editor (Dev)');
export class MergeEditorOpenContentsFromJSON extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.openContentsJson',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.openState', "Open Merge Editor State from JSON"),
            icon: Codicon.layoutCentered,
            f1: true,
        });
    }
    async run(accessor, args) {
        const quickInputService = accessor.get(IQuickInputService);
        const clipboardService = accessor.get(IClipboardService);
        const editorService = accessor.get(IEditorService);
        const languageService = accessor.get(ILanguageService);
        const env = accessor.get(INativeEnvironmentService);
        const fileService = accessor.get(IFileService);
        if (!args) {
            args = {};
        }
        let content;
        if (!args.data) {
            const result = await quickInputService.input({
                prompt: localize('mergeEditor.enterJSON', 'Enter JSON'),
                value: await clipboardService.readText(),
            });
            if (result === undefined) {
                return;
            }
            content =
                result !== ''
                    ? JSON.parse(result)
                    : { base: '', input1: '', input2: '', result: '', languageId: 'plaintext' };
        }
        else {
            content = args.data;
        }
        const targetDir = URI.joinPath(env.tmpDir, randomPath());
        const extension = languageService.getExtensions(content.languageId)[0] || '';
        const baseUri = URI.joinPath(targetDir, `/base${extension}`);
        const input1Uri = URI.joinPath(targetDir, `/input1${extension}`);
        const input2Uri = URI.joinPath(targetDir, `/input2${extension}`);
        const resultUri = URI.joinPath(targetDir, `/result${extension}`);
        const initialResultUri = URI.joinPath(targetDir, `/initialResult${extension}`);
        async function writeFile(uri, content) {
            await fileService.writeFile(uri, VSBuffer.fromString(content));
        }
        const shouldOpenInitial = await promptOpenInitial(quickInputService, args.resultState);
        await Promise.all([
            writeFile(baseUri, content.base),
            writeFile(input1Uri, content.input1),
            writeFile(input2Uri, content.input2),
            writeFile(resultUri, shouldOpenInitial ? (content.initialResult || '') : content.result),
            writeFile(initialResultUri, content.initialResult || ''),
        ]);
        const input = {
            base: { resource: baseUri },
            input1: { resource: input1Uri, label: 'Input 1', description: 'Input 1', detail: '(from JSON)' },
            input2: { resource: input2Uri, label: 'Input 2', description: 'Input 2', detail: '(from JSON)' },
            result: { resource: resultUri },
        };
        editorService.openEditor(input);
    }
}
async function promptOpenInitial(quickInputService, resultStateOverride) {
    if (resultStateOverride) {
        return resultStateOverride === 'initial';
    }
    const result = await quickInputService.pick([{ label: 'result', result: false }, { label: 'initial result', result: true }], { canPickMany: false });
    return result?.result;
}
class MergeEditorAction extends Action2 {
    constructor(desc) {
        super(desc);
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            const vm = activeEditorPane.viewModel.get();
            if (!vm) {
                return;
            }
            this.runWithViewModel(vm, accessor);
        }
    }
}
export class OpenSelectionInTemporaryMergeEditor extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.dev.openSelectionInTemporaryMergeEditor',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.openSelectionInTemporaryMergeEditor', "Open Selection In Temporary Merge Editor"),
            icon: Codicon.layoutCentered,
            f1: true,
        });
    }
    async runWithViewModel(viewModel, accessor) {
        const rangesInBase = viewModel.selectionInBase.get()?.rangesInBase;
        if (!rangesInBase || rangesInBase.length === 0) {
            return;
        }
        const base = rangesInBase
            .map((r) => viewModel.model.base.getValueInRange(r))
            .join('\n');
        const input1 = rangesInBase
            .map((r) => viewModel.inputCodeEditorView1.editor.getModel().getValueInRange(viewModel.model.translateBaseRangeToInput(1, r)))
            .join('\n');
        const input2 = rangesInBase
            .map((r) => viewModel.inputCodeEditorView2.editor.getModel().getValueInRange(viewModel.model.translateBaseRangeToInput(2, r)))
            .join('\n');
        const result = rangesInBase
            .map((r) => viewModel.resultCodeEditorView.editor.getModel().getValueInRange(viewModel.model.translateBaseRangeToResult(r)))
            .join('\n');
        new MergeEditorOpenContentsFromJSON().run(accessor, {
            data: {
                base,
                input1,
                input2,
                result,
                languageId: viewModel.resultCodeEditorView.editor.getModel().getLanguageId()
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvZWxlY3Ryb24tc2FuZGJveC9kZXZDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE1BQU0scUJBQXFCLEdBQXFCLFNBQVMsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUUvRixNQUFNLE9BQU8sK0JBQWdDLFNBQVEs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