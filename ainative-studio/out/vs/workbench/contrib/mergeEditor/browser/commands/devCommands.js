/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { MergeEditor } from '../view/mergeEditor.js';
import { ctxIsMergeEditor } from '../../common/mergeEditor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
const MERGE_EDITOR_CATEGORY = localize2('mergeEditor', 'Merge Editor (Dev)');
export class MergeEditorCopyContentsToJSON extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.copyContentsJson',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.copyState', "Copy Merge Editor State as JSON"),
            icon: Codicon.layoutCentered,
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        const clipboardService = accessor.get(IClipboardService);
        const notificationService = accessor.get(INotificationService);
        if (!(activeEditorPane instanceof MergeEditor)) {
            notificationService.info({
                name: localize('mergeEditor.name', 'Merge Editor'),
                message: localize('mergeEditor.noActiveMergeEditor', "No active merge editor")
            });
            return;
        }
        const model = activeEditorPane.model;
        if (!model) {
            return;
        }
        const contents = {
            languageId: model.resultTextModel.getLanguageId(),
            base: model.base.getValue(),
            input1: model.input1.textModel.getValue(),
            input2: model.input2.textModel.getValue(),
            result: model.resultTextModel.getValue(),
            initialResult: model.getInitialResultValue(),
        };
        const jsonStr = JSON.stringify(contents, undefined, 4);
        clipboardService.writeText(jsonStr);
        notificationService.info({
            name: localize('mergeEditor.name', 'Merge Editor'),
            message: localize('mergeEditor.successfullyCopiedMergeEditorContents', "Successfully copied merge editor state"),
        });
    }
}
export class MergeEditorSaveContentsToFolder extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.saveContentsToFolder',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.saveContentsToFolder', "Save Merge Editor State to Folder"),
            icon: Codicon.layoutCentered,
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    async run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        const notificationService = accessor.get(INotificationService);
        const dialogService = accessor.get(IFileDialogService);
        const fileService = accessor.get(IFileService);
        const languageService = accessor.get(ILanguageService);
        if (!(activeEditorPane instanceof MergeEditor)) {
            notificationService.info({
                name: localize('mergeEditor.name', 'Merge Editor'),
                message: localize('mergeEditor.noActiveMergeEditor', "No active merge editor")
            });
            return;
        }
        const model = activeEditorPane.model;
        if (!model) {
            return;
        }
        const result = await dialogService.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: localize('mergeEditor.selectFolderToSaveTo', 'Select folder to save to')
        });
        if (!result) {
            return;
        }
        const targetDir = result[0];
        const extension = languageService.getExtensions(model.resultTextModel.getLanguageId())[0] || '';
        async function write(fileName, source) {
            await fileService.writeFile(URI.joinPath(targetDir, fileName + extension), VSBuffer.fromString(source), {});
        }
        await Promise.all([
            write('base', model.base.getValue()),
            write('input1', model.input1.textModel.getValue()),
            write('input2', model.input2.textModel.getValue()),
            write('result', model.resultTextModel.getValue()),
            write('initialResult', model.getInitialResultValue()),
        ]);
        notificationService.info({
            name: localize('mergeEditor.name', 'Merge Editor'),
            message: localize('mergeEditor.successfullySavedMergeEditorContentsToFolder', "Successfully saved merge editor state to folder"),
        });
    }
}
export class MergeEditorLoadContentsFromFolder extends Action2 {
    constructor() {
        super({
            id: 'merge.dev.loadContentsFromFolder',
            category: MERGE_EDITOR_CATEGORY,
            title: localize2('merge.dev.loadContentsFromFolder', "Load Merge Editor State from Folder"),
            icon: Codicon.layoutCentered,
            f1: true
        });
    }
    async run(accessor, args) {
        const dialogService = accessor.get(IFileDialogService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const quickInputService = accessor.get(IQuickInputService);
        if (!args) {
            args = {};
        }
        let targetDir;
        if (!args.folderUri) {
            const result = await dialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: localize('mergeEditor.selectFolderToSaveTo', 'Select folder to save to')
            });
            if (!result) {
                return;
            }
            targetDir = result[0];
        }
        else {
            targetDir = args.folderUri;
        }
        const targetDirInfo = await fileService.resolve(targetDir);
        function findFile(name) {
            return targetDirInfo.children.find(c => c.name.startsWith(name))?.resource;
        }
        const shouldOpenInitial = await promptOpenInitial(quickInputService, args.resultState);
        const baseUri = findFile('base');
        const input1Uri = findFile('input1');
        const input2Uri = findFile('input2');
        const resultUri = findFile(shouldOpenInitial ? 'initialResult' : 'result');
        const input = {
            base: { resource: baseUri },
            input1: { resource: input1Uri, label: 'Input 1', description: 'Input 1', detail: '(from file)' },
            input2: { resource: input2Uri, label: 'Input 2', description: 'Input 2', detail: '(from file)' },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9jb21tYW5kcy9kZXZDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxnQkFBZ0IsRUFBdUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsTUFBTSxxQkFBcUIsR0FBcUIsU0FBUyxDQUFDLGFBQWEsRUFB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