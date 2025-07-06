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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RG9jdW1lbnRTYXZlUGFydGljaXBhbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXJHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3RFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHaEcsU0FBUyxPQUFPLENBQUMsQ0FBUztJQUN6QixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUM7QUFFRCxLQUFLLENB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