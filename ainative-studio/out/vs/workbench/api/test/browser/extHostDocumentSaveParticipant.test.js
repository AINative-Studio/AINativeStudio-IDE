/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { TextDocumentSaveReason, TextEdit, Position, EndOfLine } from '../../common/extHostTypes.js';
import { ExtHostDocumentSaveParticipant } from '../../common/extHostDocumentSaveParticipant.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function timeout(n) {
    return new Promise(resolve => setTimeout(resolve, n));
}
suite('ExtHostDocumentSaveParticipant', () => {
    const resource = URI.parse('foo:bar');
    const mainThreadBulkEdits = new class extends mock() {
    };
    let documents;
    const nullLogService = new NullLogService();
    setup(() => {
        const documentsAndEditors = new ExtHostDocumentsAndEditors(SingleProxyRPCProtocol(null), new NullLogService());
        documentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [{
                    isDirty: false,
                    languageId: 'foo',
                    uri: resource,
                    versionId: 1,
                    lines: ['foo'],
                    EOL: '\n',
                    encoding: 'utf8'
                }]
        });
        documents = new ExtHostDocuments(SingleProxyRPCProtocol(null), documentsAndEditors);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('no listeners, no problem', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => assert.ok(true));
    });
    test('event delivery', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        let event;
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.ok(event);
            assert.strictEqual(event.reason, TextDocumentSaveReason.Manual);
            assert.strictEqual(typeof event.waitUntil, 'function');
        });
    });
    test('event delivery, immutable', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        let event;
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.ok(event);
            assert.throws(() => { event.document = null; });
        });
    });
    test('event delivery, bad listener', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            throw new Error('💀');
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(values => {
            sub.dispose();
            const [first] = values;
            assert.strictEqual(first, false);
        });
    });
    test('event delivery, bad listener doesn\'t prevent more events', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            throw new Error('💀');
        });
        let event;
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub1.dispose();
            sub2.dispose();
            assert.ok(event);
        });
    });
    test('event delivery, in subscriber order', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        let counter = 0;
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            assert.strictEqual(counter++, 0);
        });
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            assert.strictEqual(counter++, 1);
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub1.dispose();
            sub2.dispose();
        });
    });
    test('event delivery, ignore bad listeners', async () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits, { timeout: 5, errors: 1 });
        let callCount = 0;
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            callCount += 1;
            throw new Error('boom');
        });
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        sub.dispose();
        assert.strictEqual(callCount, 2);
    });
    test('event delivery, overall timeout', async function () {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits, { timeout: 20, errors: 5 });
        // let callCount = 0;
        const calls = [];
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            calls.push(1);
        });
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            calls.push(2);
            event.waitUntil(timeout(100));
        });
        const sub3 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            calls.push(3);
        });
        const values = await participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */);
        sub1.dispose();
        sub2.dispose();
        sub3.dispose();
        assert.deepStrictEqual(calls, [1, 2]);
        assert.strictEqual(values.length, 2);
    });
    test('event delivery, waitUntil', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            event.waitUntil(timeout(10));
            event.waitUntil(timeout(10));
            event.waitUntil(timeout(10));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
        });
    });
    test('event delivery, waitUntil must be called sync', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            event.waitUntil(new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        assert.throws(() => event.waitUntil(timeout(10)));
                        resolve(undefined);
                    }
                    catch (e) {
                        reject(e);
                    }
                }, 10);
            }));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
        });
    });
    test('event delivery, waitUntil will timeout', function () {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits, { timeout: 5, errors: 3 });
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (event) {
            event.waitUntil(timeout(100));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(values => {
            sub.dispose();
            const [first] = values;
            assert.strictEqual(first, false);
        });
    });
    test('event delivery, waitUntil failure handling', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, mainThreadBulkEdits);
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            e.waitUntil(Promise.reject(new Error('dddd')));
        });
        let event;
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            event = e;
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            assert.ok(event);
            sub1.dispose();
            sub2.dispose();
        });
    });
    test('event delivery, pushEdits sync', () => {
        let dto;
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, new class extends mock() {
            $tryApplyWorkspaceEdit(_edits) {
                dto = _edits.value;
                return Promise.resolve(true);
            }
        });
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
            e.waitUntil(Promise.resolve([TextEdit.setEndOfLine(EndOfLine.CRLF)]));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.strictEqual(dto.edits.length, 2);
            assert.ok(dto.edits[0].textEdit);
            assert.ok(dto.edits[1].textEdit);
        });
    });
    test('event delivery, concurrent change', () => {
        let edits;
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, new class extends mock() {
            $tryApplyWorkspaceEdit(_edits) {
                edits = _edits.value;
                return Promise.resolve(true);
            }
        });
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            // concurrent change from somewhere
            documents.$acceptModelChanged(resource, {
                changes: [{
                        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                        rangeOffset: undefined,
                        rangeLength: undefined,
                        text: 'bar'
                    }],
                eol: undefined,
                versionId: 2,
                isRedoing: false,
                isUndoing: false,
            }, true);
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(values => {
            sub.dispose();
            assert.strictEqual(edits, undefined);
            assert.strictEqual(values[0], false);
        });
    });
    test('event delivery, two listeners -> two document states', () => {
        const participant = new ExtHostDocumentSaveParticipant(nullLogService, documents, new class extends mock() {
            $tryApplyWorkspaceEdit(dto) {
                for (const edit of dto.value.edits) {
                    const uri = URI.revive(edit.resource);
                    const { text, range } = edit.textEdit;
                    documents.$acceptModelChanged(uri, {
                        changes: [{
                                range,
                                text,
                                rangeOffset: undefined,
                                rangeLength: undefined,
                            }],
                        eol: undefined,
                        versionId: documents.getDocumentData(uri).version + 1,
                        isRedoing: false,
                        isUndoing: false,
                    }, true);
                    // }
                }
                return Promise.resolve(true);
            }
        });
        const document = documents.getDocument(resource);
        const sub1 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            // the document state we started with
            assert.strictEqual(document.version, 1);
            assert.strictEqual(document.getText(), 'foo');
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
        });
        const sub2 = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            // the document state AFTER the first listener kicked in
            assert.strictEqual(document.version, 2);
            assert.strictEqual(document.getText(), 'barfoo');
            e.waitUntil(Promise.resolve([TextEdit.insert(new Position(0, 0), 'bar')]));
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(values => {
            sub1.dispose();
            sub2.dispose();
            // the document state AFTER eventing is done
            assert.strictEqual(document.version, 3);
            assert.strictEqual(document.getText(), 'barbarfoo');
        });
    });
    test('Log failing listener', function () {
        let didLogSomething = false;
        const participant = new ExtHostDocumentSaveParticipant(new class extends NullLogService {
            error(message, ...args) {
                didLogSomething = true;
            }
        }, documents, mainThreadBulkEdits);
        const sub = participant.getOnWillSaveTextDocumentEvent(nullExtensionDescription)(function (e) {
            throw new Error('boom');
        });
        return participant.$participateInSave(resource, 1 /* SaveReason.EXPLICIT */).then(() => {
            sub.dispose();
            assert.strictEqual(didLogSomething, true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVyRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUd0RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hHLFNBQVMsT0FBTyxDQUFDLENBQVM7SUFDekIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBRUQsS0FBSyxD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