/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { snapshotToString, stringToSnapshot } from '../../common/textfiles.js';
import { URI } from '../../../../../base/common/uri.js';
import { join, basename } from '../../../../../base/common/path.js';
import { UTF16le, UTF8_with_bom, UTF16be, UTF8, UTF16le_BOM, UTF16be_BOM, UTF8_BOM } from '../../common/encoding.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { createTextBufferFactoryFromStream } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
/**
 * Allows us to reuse test suite across different environments.
 *
 * It introduces a bit of complexity with setup and teardown, however
 * it helps us to ensure that tests are added for all environments at once,
 * hence helps us catch bugs better.
 */
export default function createSuite(params) {
    let service;
    let testDir = '';
    const { exists, stat, readFile, detectEncodingByBOM } = params;
    const disposables = new DisposableStore();
    setup(async () => {
        const result = await params.setup();
        service = result.service;
        testDir = result.testDir;
    });
    teardown(async () => {
        await params.teardown();
        disposables.clear();
    });
    test('create - no encoding - content empty', async () => {
        const resource = URI.file(join(testDir, 'small_new.txt'));
        await service.create([{ resource }]);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 0 /* no BOM */);
    });
    test('create - no encoding - content provided (string)', async () => {
        const resource = URI.file(join(testDir, 'small_new.txt'));
        await service.create([{ resource, value: 'Hello World' }]);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.toString(), 'Hello World');
        assert.strictEqual(res.byteLength, 'Hello World'.length);
    });
    test('create - no encoding - content provided (snapshot)', async () => {
        const resource = URI.file(join(testDir, 'small_new.txt'));
        await service.create([{ resource, value: stringToSnapshot('Hello World') }]);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.toString(), 'Hello World');
        assert.strictEqual(res.byteLength, 'Hello World'.length);
    });
    test('create - UTF 16 LE - no content', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16le'));
        await service.create([{ resource }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16le);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF16le_BOM.length);
    });
    test('create - UTF 16 LE - content provided', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16le'));
        await service.create([{ resource, value: 'Hello World' }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16le);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length * 2 /* UTF16 2bytes per char */ + UTF16le_BOM.length);
    });
    test('create - UTF 16 BE - no content', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16be'));
        await service.create([{ resource }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16be);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF16le_BOM.length);
    });
    test('create - UTF 16 BE - content provided', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16be'));
        await service.create([{ resource, value: 'Hello World' }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16be);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length * 2 /* UTF16 2bytes per char */ + UTF16be_BOM.length);
    });
    test('create - UTF 8 BOM - no content', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF8_BOM.length);
    });
    test('create - UTF 8 BOM - content provided', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource, value: 'Hello World' }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length + UTF8_BOM.length);
    });
    function createTextModelSnapshot(text, preserveBOM) {
        const textModel = disposables.add(createTextModel(text));
        const snapshot = textModel.createSnapshot(preserveBOM);
        return snapshot;
    }
    test('create - UTF 8 BOM - empty content - snapshot', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource, value: createTextModelSnapshot('') }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF8_BOM.length);
    });
    test('create - UTF 8 BOM - content provided - snapshot', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource, value: createTextModelSnapshot('Hello World') }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length + UTF8_BOM.length);
    });
    test('write - use encoding (UTF 16 BE) - small content as string', async () => {
        await testEncoding(URI.file(join(testDir, 'small.txt')), UTF16be, 'Hello\nWorld', 'Hello\nWorld');
    });
    test('write - use encoding (UTF 16 BE) - small content as snapshot', async () => {
        await testEncoding(URI.file(join(testDir, 'small.txt')), UTF16be, createTextModelSnapshot('Hello\nWorld'), 'Hello\nWorld');
    });
    test('write - use encoding (UTF 16 BE) - large content as string', async () => {
        await testEncoding(URI.file(join(testDir, 'lorem.txt')), UTF16be, 'Hello\nWorld', 'Hello\nWorld');
    });
    test('write - use encoding (UTF 16 BE) - large content as snapshot', async () => {
        await testEncoding(URI.file(join(testDir, 'lorem.txt')), UTF16be, createTextModelSnapshot('Hello\nWorld'), 'Hello\nWorld');
    });
    async function testEncoding(resource, encoding, content, expectedContent) {
        await service.write(resource, content, { encoding });
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, encoding);
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.encoding, encoding);
        const textBuffer = disposables.add(resolved.value.create(isWindows ? 2 /* DefaultEndOfLine.CRLF */ : 1 /* DefaultEndOfLine.LF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer.createSnapshot(false)), expectedContent);
    }
    test('write - use encoding (cp1252)', async () => {
        const filePath = join(testDir, 'some_cp1252.txt');
        const contents = await readFile(filePath, 'utf8');
        const eol = /\r\n/.test(contents) ? '\r\n' : '\n';
        await testEncodingKeepsData(URI.file(filePath), 'cp1252', ['ObjectCount = LoadObjects("Öffentlicher Ordner");', '', 'Private = "Persönliche Information"', ''].join(eol));
    });
    test('write - use encoding (shiftjis)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_shiftjis.txt')), 'shiftjis', '中文abc');
    });
    test('write - use encoding (gbk)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_gbk.txt')), 'gbk', '中国abc');
    });
    test('write - use encoding (cyrillic)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_cyrillic.txt')), 'cp866', 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя');
    });
    test('write - use encoding (big5)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_big5.txt')), 'cp950', '中文abc');
    });
    async function testEncodingKeepsData(resource, encoding, expected) {
        let resolved = await service.readStream(resource, { encoding });
        const textBuffer = disposables.add(resolved.value.create(isWindows ? 2 /* DefaultEndOfLine.CRLF */ : 1 /* DefaultEndOfLine.LF */).textBuffer);
        const content = snapshotToString(textBuffer.createSnapshot(false));
        assert.strictEqual(content, expected);
        await service.write(resource, content, { encoding });
        resolved = await service.readStream(resource, { encoding });
        const textBuffer2 = disposables.add(resolved.value.create(2 /* DefaultEndOfLine.CRLF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer2.createSnapshot(false)), content);
        await service.write(resource, createTextModelSnapshot(content), { encoding });
        resolved = await service.readStream(resource, { encoding });
        const textBuffer3 = disposables.add(resolved.value.create(2 /* DefaultEndOfLine.CRLF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer3.createSnapshot(false)), content);
    }
    test('write - no encoding - content as string', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = (await readFile(resource.fsPath)).toString();
        await service.write(resource, content);
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.value.getFirstLineText(999999), content);
    });
    test('write - no encoding - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = (await readFile(resource.fsPath)).toString();
        await service.write(resource, createTextModelSnapshot(content));
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.value.getFirstLineText(999999), content);
    });
    test('write - encoding preserved (UTF 16 LE) - content as string', async () => {
        const resource = URI.file(join(testDir, 'some_utf16le.css'));
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.encoding, UTF16le);
        await testEncoding(URI.file(join(testDir, 'some_utf16le.css')), UTF16le, 'Hello\nWorld', 'Hello\nWorld');
    });
    test('write - encoding preserved (UTF 16 LE) - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'some_utf16le.css'));
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.encoding, UTF16le);
        await testEncoding(URI.file(join(testDir, 'some_utf16le.css')), UTF16le, createTextModelSnapshot('Hello\nWorld'), 'Hello\nWorld');
    });
    test('write - UTF8 variations - content as string', async () => {
        const resource = URI.file(join(testDir, 'index.html'));
        let detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        const content = (await readFile(resource.fsPath)).toString() + 'updates';
        await service.write(resource, content, { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // ensure BOM preserved if enforced
        await service.write(resource, content, { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // allow to remove BOM
        await service.write(resource, content, { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        // BOM does not come back
        await service.write(resource, content, { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
    });
    test('write - UTF8 variations - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'index.html'));
        let detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        const model = disposables.add(createTextModel((await readFile(resource.fsPath)).toString() + 'updates'));
        await service.write(resource, model.createSnapshot(), { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // ensure BOM preserved if enforced
        await service.write(resource, model.createSnapshot(), { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // allow to remove BOM
        await service.write(resource, model.createSnapshot(), { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        // BOM does not come back
        await service.write(resource, model.createSnapshot(), { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
    });
    test('write - preserve UTF8 BOM - content as string', async () => {
        const resource = URI.file(join(testDir, 'some_utf8_bom.txt'));
        let detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        await service.write(resource, 'Hello World', { encoding: detectedEncoding });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
    });
    test('write - ensure BOM in empty file - content as string', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await service.write(resource, '', { encoding: UTF8_with_bom });
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
    });
    test('write - ensure BOM in empty file - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await service.write(resource, createTextModelSnapshot(''), { encoding: UTF8_with_bom });
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
    });
    test('readStream - small text', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await testReadStream(resource);
    });
    test('readStream - large text', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        await testReadStream(resource);
    });
    async function testReadStream(resource) {
        const result = await service.readStream(resource);
        assert.strictEqual(result.name, basename(resource.fsPath));
        assert.strictEqual(result.size, (await stat(resource.fsPath)).size);
        const content = (await readFile(resource.fsPath)).toString();
        const textBuffer = disposables.add(result.value.create(1 /* DefaultEndOfLine.LF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer.createSnapshot(false)), snapshotToString(createTextModelSnapshot(content, false)));
    }
    test('read - small text', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await testRead(resource);
    });
    test('read - large text', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        await testRead(resource);
    });
    async function testRead(resource) {
        const result = await service.read(resource);
        assert.strictEqual(result.name, basename(resource.fsPath));
        assert.strictEqual(result.size, (await stat(resource.fsPath)).size);
        assert.strictEqual(result.value, (await readFile(resource.fsPath)).toString());
    }
    test('readStream - encoding picked up (CP1252)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'windows1252';
        const result = await service.readStream(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value.getFirstLineText(999999), 'Private = "Persönlicheß Information"');
    });
    test('read - encoding picked up (CP1252)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'windows1252';
        const result = await service.read(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value, 'Private = "Persönlicheß Information"');
    });
    test('read - encoding picked up (binary)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'binary';
        const result = await service.read(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value, 'Private = "Persönlicheß Information"');
    });
    test('read - encoding picked up (base64)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'base64';
        const result = await service.read(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value, btoa('Private = "Persönlicheß Information"'));
    });
    test('readStream - user overrides BOM', async () => {
        const resource = URI.file(join(testDir, 'some_utf16le.css'));
        const result = await service.readStream(resource, { encoding: 'windows1252' });
        assert.strictEqual(result.encoding, 'windows1252');
    });
    test('readStream - BOM removed', async () => {
        const resource = URI.file(join(testDir, 'some_utf8_bom.txt'));
        const result = await service.readStream(resource);
        assert.strictEqual(result.value.getFirstLineText(999999), 'This is some UTF 8 with BOM file.');
    });
    test('readStream - invalid encoding', async () => {
        const resource = URI.file(join(testDir, 'index.html'));
        const result = await service.readStream(resource, { encoding: 'superduper' });
        assert.strictEqual(result.encoding, 'utf8');
    });
    test('readStream - encoding override', async () => {
        const resource = URI.file(join(testDir, 'some.utf16le'));
        const result = await service.readStream(resource, { encoding: 'windows1252' });
        assert.strictEqual(result.encoding, 'utf16le');
        assert.strictEqual(result.value.getFirstLineText(999999), 'This is some UTF 16 with BOM file.');
    });
    test('readStream - large Big5', async () => {
        await testLargeEncoding('big5', '中文abc');
    });
    test('readStream - large CP1252', async () => {
        await testLargeEncoding('cp1252', 'öäüß');
    });
    test('readStream - large Cyrillic', async () => {
        await testLargeEncoding('cp866', 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя');
    });
    test('readStream - large GBK', async () => {
        await testLargeEncoding('gbk', '中国abc');
    });
    test('readStream - large ShiftJIS', async () => {
        await testLargeEncoding('shiftjis', '中文abc');
    });
    test('readStream - large UTF8 BOM', async () => {
        await testLargeEncoding('utf8bom', 'öäüß');
    });
    test('readStream - large UTF16 LE', async () => {
        await testLargeEncoding('utf16le', 'öäüß');
    });
    test('readStream - large UTF16 BE', async () => {
        await testLargeEncoding('utf16be', 'öäüß');
    });
    async function testLargeEncoding(encoding, needle) {
        const resource = URI.file(join(testDir, `lorem_${encoding}.txt`));
        // Verify via `ITextFileService.readStream`
        const result = await service.readStream(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        const textBuffer = disposables.add(result.value.create(1 /* DefaultEndOfLine.LF */).textBuffer);
        let contents = snapshotToString(textBuffer.createSnapshot(false));
        assert.strictEqual(contents.indexOf(needle), 0);
        assert.ok(contents.indexOf(needle, 10) > 0);
        // Verify via `ITextFileService.getDecodedTextFactory`
        const rawFile = await params.readFile(resource.fsPath);
        let rawFileVSBuffer;
        if (rawFile instanceof VSBuffer) {
            rawFileVSBuffer = rawFile;
        }
        else {
            rawFileVSBuffer = VSBuffer.wrap(rawFile);
        }
        const factory = await createTextBufferFactoryFromStream(await service.getDecodedStream(resource, bufferToStream(rawFileVSBuffer), { encoding }));
        const textBuffer2 = disposables.add(factory.create(1 /* DefaultEndOfLine.LF */).textBuffer);
        contents = snapshotToString(textBuffer2.createSnapshot(false));
        assert.strictEqual(contents.indexOf(needle), 0);
        assert.ok(contents.indexOf(needle, 10) > 0);
    }
    test('readStream - UTF16 LE (no BOM)', async () => {
        const resource = URI.file(join(testDir, 'utf16_le_nobom.txt'));
        const result = await service.readStream(resource);
        assert.strictEqual(result.encoding, 'utf16le');
    });
    test('readStream - UTF16 BE (no BOM)', async () => {
        const resource = URI.file(join(testDir, 'utf16_be_nobom.txt'));
        const result = await service.readStream(resource);
        assert.strictEqual(result.encoding, 'utf16be');
    });
    test('readStream - autoguessEncoding', async () => {
        const resource = URI.file(join(testDir, 'some_cp1252.txt'));
        const result = await service.readStream(resource, { autoGuessEncoding: true });
        assert.strictEqual(result.encoding, 'windows1252');
    });
    test('readStream - autoguessEncoding (candidateGuessEncodings)', async () => {
        // This file is determined to be Windows-1252 unless candidateDetectEncoding is set.
        const resource = URI.file(join(testDir, 'some.shiftjis.1.txt'));
        const result = await service.readStream(resource, { autoGuessEncoding: true, candidateGuessEncodings: ['utf-8', 'shiftjis', 'euc-jp'] });
        assert.strictEqual(result.encoding, 'shiftjis');
    });
    test('readStream - autoguessEncoding (candidateGuessEncodings is Empty)', async () => {
        const resource = URI.file(join(testDir, 'some_cp1252.txt'));
        const result = await service.readStream(resource, { autoGuessEncoding: true, candidateGuessEncodings: [] });
        assert.strictEqual(result.encoding, 'windows1252');
    });
    test('readStream - FILE_IS_BINARY', async () => {
        const resource = URI.file(join(testDir, 'binary.txt'));
        let error = undefined;
        try {
            await service.readStream(resource, { acceptTextOnly: true });
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.textFileOperationResult, 0 /* TextFileOperationResult.FILE_IS_BINARY */);
        const result = await service.readStream(URI.file(join(testDir, 'small.txt')), { acceptTextOnly: true });
        assert.strictEqual(result.name, 'small.txt');
    });
    test('read - FILE_IS_BINARY', async () => {
        const resource = URI.file(join(testDir, 'binary.txt'));
        let error = undefined;
        try {
            await service.read(resource, { acceptTextOnly: true });
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.textFileOperationResult, 0 /* TextFileOperationResult.FILE_IS_BINARY */);
        const result = await service.read(URI.file(join(testDir, 'small.txt')), { acceptTextOnly: true });
        assert.strictEqual(result.name, 'small.txt');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3QvY29tbW9uL3RleHRGaWxlU2VydmljZS5pby50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQW9CLGdCQUFnQixFQUFtRCxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xKLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBaUIxRTs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsT0FBTyxVQUFVLFdBQVcsQ0FBQyxNQUFjO0lBQ2pELElBQUksT0FBeUIsQ0FBQztJQUM5QixJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDakIsTUFBTSxFQUFFLE1BQU0sRUFB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QUFLLENBQUMsQ0FBQyxFQUNsRCxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFdEQsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFdEQsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLFVBQVUsUUFBUSxDQUFDLFFBQWE7UUFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFB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