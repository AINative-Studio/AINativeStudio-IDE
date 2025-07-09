/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FinalNewLineParticipant, TrimFinalNewLinesParticipant, TrimWhitespaceParticipant } from '../../browser/saveParticipants.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { TextFileEditorModel } from '../../../../services/textfile/common/textFileEditorModel.js';
import { snapshotToString } from '../../../../services/textfile/common/textfiles.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Save Participants', function () {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('insert final new line', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { 'insertFinalNewline': true });
        const participant = new FinalNewLineParticipant(configService, undefined);
        // No new line for empty lines
        let lineContent = '';
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // No new line if last line already empty
        lineContent = `Hello New Line${model.textEditorModel.getEOL()}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // New empty line added (single line)
        lineContent = 'Hello New Line';
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${lineContent}${model.textEditorModel.getEOL()}`);
        // New empty line added (multi line)
        lineContent = `Hello New Line${model.textEditorModel.getEOL()}Hello New Line${model.textEditorModel.getEOL()}Hello New Line`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${lineContent}${model.textEditorModel.getEOL()}`);
    });
    test('trim final new lines', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { 'trimFinalNewlines': true });
        const participant = new TrimFinalNewLinesParticipant(configService, undefined);
        const textContent = 'Trim New Line';
        const eol = `${model.textEditorModel.getEOL()}`;
        // No new line removal if last line is not new line
        let lineContent = `${textContent}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // No new line removal if last line is single new line
        lineContent = `${textContent}${eol}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // Remove new line (single line with two new lines)
        lineContent = `${textContent}${eol}${eol}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}`);
        // Remove new lines (multiple lines with multiple new lines)
        lineContent = `${textContent}${eol}${textContent}${eol}${eol}${eol}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}${textContent}${eol}`);
    });
    test('trim final new lines bug#39750', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { 'trimFinalNewlines': true });
        const participant = new TrimFinalNewLinesParticipant(configService, undefined);
        const textContent = 'Trim New Line';
        // single line
        const lineContent = `${textContent}`;
        model.textEditorModel.setValue(lineContent);
        // apply edits and push to undo stack.
        const textEdits = [{ range: new Range(1, 14, 1, 14), text: '.', forceMoveMarkers: false }];
        model.textEditorModel.pushEditOperations([new Selection(1, 14, 1, 14)], textEdits, () => { return [new Selection(1, 15, 1, 15)]; });
        // undo
        await model.textEditorModel.undo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}`);
        // trim final new lines should not mess the undo stack
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        await model.textEditorModel.redo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}.`);
    });
    test('trim final new lines bug#46075', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { 'trimFinalNewlines': true });
        const participant = new TrimFinalNewLinesParticipant(configService, undefined);
        const textContent = 'Test';
        const eol = `${model.textEditorModel.getEOL()}`;
        const content = `${textContent}${eol}${eol}`;
        model.textEditorModel.setValue(content);
        // save many times
        for (let i = 0; i < 10; i++) {
            await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        }
        // confirm trimming
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}`);
        // undo should go back to previous content immediately
        await model.textEditorModel.undo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}${eol}`);
        await model.textEditorModel.redo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}`);
    });
    test('trim whitespace', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { 'trimTrailingWhitespace': true });
        const participant = new TrimWhitespaceParticipant(configService, undefined);
        const textContent = 'Test';
        const content = `${textContent} 	`;
        model.textEditorModel.setValue(content);
        // save many times
        for (let i = 0; i < 10; i++) {
            await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        }
        // confirm trimming
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}`);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci90ZXN0L2Jyb3dzZXIvc2F2ZVBhcnRpY2lwYW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSw0QkFBNEIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xHLE9BQU8sRUFBZ0MsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUduSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsS0FBSyxDQUFDLG1CQUFtQixFQUFFO0lBRTFCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxvQkFBMkMsQ0FBQztJQUNoRCxJQUFJLFFBQTZCLENBQUM7SUFFbEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFB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