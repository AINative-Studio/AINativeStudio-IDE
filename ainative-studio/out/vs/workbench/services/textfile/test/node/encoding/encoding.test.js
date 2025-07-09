/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as encoding from '../../../common/encoding.js';
import * as streams from '../../../../../../base/common/stream.js';
import { newWriteableBufferStream, VSBuffer, streamToBufferReadableStream } from '../../../../../../base/common/buffer.js';
import { splitLines } from '../../../../../../base/common/strings.js';
import { FileAccess } from '../../../../../../base/common/network.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
export async function detectEncodingByBOM(file) {
    try {
        const { buffer, bytesRead } = await readExactlyByFile(file, 3);
        return encoding.detectEncodingByBOMFromBuffer(buffer, bytesRead);
    }
    catch (error) {
        return null; // ignore errors (like file not found)
    }
}
function readExactlyByFile(file, totalBytes) {
    return new Promise((resolve, reject) => {
        fs.open(file, 'r', null, (err, fd) => {
            if (err) {
                return reject(err);
            }
            function end(err, resultBuffer, bytesRead) {
                fs.close(fd, closeError => {
                    if (closeError) {
                        return reject(closeError);
                    }
                    if (err && err.code === 'EISDIR') {
                        return reject(err); // we want to bubble this error up (file is actually a folder)
                    }
                    return resolve({ buffer: resultBuffer ? VSBuffer.wrap(resultBuffer) : null, bytesRead });
                });
            }
            const buffer = Buffer.allocUnsafe(totalBytes);
            let offset = 0;
            function readChunk() {
                fs.read(fd, buffer, offset, totalBytes - offset, null, (err, bytesRead) => {
                    if (err) {
                        return end(err, null, 0);
                    }
                    if (bytesRead === 0) {
                        return end(null, buffer, offset);
                    }
                    offset += bytesRead;
                    if (offset === totalBytes) {
                        return end(null, buffer, offset);
                    }
                    return readChunk();
                });
            }
            readChunk();
        });
    });
}
suite('Encoding', () => {
    test('detectBOM does not return error for non existing file', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/not-exist.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, null);
    });
    test('detectBOM UTF-8', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf8.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, 'utf8bom');
    });
    test('detectBOM UTF-16 LE', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16le.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, 'utf16le');
    });
    test('detectBOM UTF-16 BE', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16be.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, 'utf16be');
    });
    test('detectBOM ANSI', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_ansi.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, null);
    });
    test('detectBOM ANSI (2)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/empty.txt').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, null);
    });
    test('detectEncodingFromBuffer (JSON saved as PNG)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.json.png').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (PNG saved as TXT)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.png.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, true);
    });
    test('detectEncodingFromBuffer (XML saved as PNG)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.xml.png').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (QWOFF saved as TXT)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.qwoff.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, true);
    });
    test('detectEncodingFromBuffer (CSS saved as QWOFF)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.css.qwoff').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (PDF)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.pdf').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, true);
    });
    test('detectEncodingFromBuffer (guess UTF-16 LE from content without BOM)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/utf16_le_nobom.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.encoding, encoding.UTF16le);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (guess UTF-16 BE from content without BOM)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/utf16_be_nobom.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.encoding, encoding.UTF16be);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('autoGuessEncoding (UTF8)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_file.css').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, 'utf8');
    });
    test('autoGuessEncoding (ASCII)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_ansi.css').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, null);
    });
    test('autoGuessEncoding (ShiftJIS)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.shiftjis.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, 'shiftjis');
    });
    test('autoGuessEncoding (CP1252)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.cp1252.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, 'windows1252');
    });
    test('autoGuessEncoding (candidateGuessEncodings - ShiftJIS)', async function () {
        // This file is determined to be windows1252 unless candidateDetectEncoding is set.
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.shiftjis.1.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true, ['utf8', 'shiftjis', 'eucjp']);
        assert.strictEqual(mimes.encoding, 'shiftjis');
    });
    async function readAndDecodeFromDisk(path, fileEncoding) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js').then(iconv => iconv.decode(data, encoding.toNodeEncoding(fileEncoding))));
                }
            });
        });
    }
    function newTestReadableStream(buffers) {
        const stream = newWriteableBufferStream();
        buffers
            .map(VSBuffer.wrap)
            .forEach(buffer => {
            setTimeout(() => {
                stream.write(buffer);
            });
        });
        setTimeout(() => {
            stream.end();
        });
        return stream;
    }
    async function readAllAsString(stream) {
        return streams.consumeStream(stream, strings => strings.join(''));
    }
    test('toDecodeStream - some stream', async function () {
        const source = newTestReadableStream([
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
        ]);
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 4, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content, 'ABCABCABC');
    });
    test('toDecodeStream - some stream, expect too much data', async function () {
        const source = newTestReadableStream([
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
        ]);
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 64, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content, 'ABCABCABC');
    });
    test('toDecodeStream - some stream, no data', async function () {
        const source = newWriteableBufferStream();
        source.end();
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 512, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content, '');
    });
    test('toDecodeStream - encoding, utf16be', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16be.css').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 64, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        assert.strictEqual(detected.encoding, 'utf16be');
        assert.strictEqual(detected.seemsBinary, false);
        const expected = await readAndDecodeFromDisk(path, detected.encoding);
        const actual = await readAllAsString(stream);
        assert.strictEqual(actual, expected);
    });
    test('toDecodeStream - empty file', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/empty.txt').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        const expected = await readAndDecodeFromDisk(path, detected.encoding);
        const actual = await readAllAsString(stream);
        assert.strictEqual(actual, expected);
    });
    test('toDecodeStream - decodes buffer entirely', async function () {
        const emojis = Buffer.from('🖥️💻💾');
        const incompleteEmojis = emojis.slice(0, emojis.length - 1);
        const buffers = [];
        for (let i = 0; i < incompleteEmojis.length; i++) {
            buffers.push(incompleteEmojis.slice(i, i + 1));
        }
        const source = newTestReadableStream(buffers);
        const { stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 4, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        const expected = new TextDecoder().decode(incompleteEmojis);
        const actual = await readAllAsString(stream);
        assert.strictEqual(actual, expected);
    });
    test('toDecodeStream - some stream (GBK issue #101856)', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_gbk.txt').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 4, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async () => 'gbk' });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content.length, 65537);
    });
    test('toDecodeStream - some stream (UTF-8 issue #102202)', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/issue_102202.txt').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, { acceptTextOnly: true, minBytesRequiredForDetection: 4, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async () => 'utf-8' });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        const lines = splitLines(content);
        assert.strictEqual(lines[981].toString(), '啊啊啊啊啊啊aaa啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊，啊啊啊啊啊啊啊啊啊啊啊。');
    });
    test('toDecodeStream - binary', async function () {
        const source = () => {
            return newTestReadableStream([
                Buffer.from([0, 0, 0]),
                Buffer.from('Hello World'),
                Buffer.from([0])
            ]);
        };
        // acceptTextOnly: true
        let error = undefined;
        try {
            await encoding.toDecodeStream(source(), { acceptTextOnly: true, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        }
        catch (e) {
            error = e;
        }
        assert.ok(error instanceof encoding.DecodeStreamError);
        assert.strictEqual(error.decodeStreamErrorKind, 1 /* encoding.DecodeStreamErrorKind.STREAM_IS_BINARY */);
        // acceptTextOnly: false
        const { detected, stream } = await encoding.toDecodeStream(source(), { acceptTextOnly: false, guessEncoding: false, candidateGuessEncodings: [], overwriteEncoding: async (detected) => detected || encoding.UTF8 });
        assert.ok(detected);
        assert.strictEqual(detected.seemsBinary, true);
        assert.ok(stream);
    });
    test('toEncodeReadable - encoding, utf16be', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16be.css').fsPath;
        const source = await readAndDecodeFromDisk(path, encoding.UTF16be);
        const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
        const expected = VSBuffer.wrap(iconv.encode(source, encoding.toNodeEncoding(encoding.UTF16be))).toString();
        const actual = streams.consumeReadable(await encoding.toEncodeReadable(streams.toReadable(source), encoding.UTF16be), VSBuffer.concat).toString();
        assert.strictEqual(actual, expected);
    });
    test('toEncodeReadable - empty readable to utf8', async function () {
        const source = {
            read() {
                return null;
            }
        };
        const actual = streams.consumeReadable(await encoding.toEncodeReadable(source, encoding.UTF8), VSBuffer.concat).toString();
        assert.strictEqual(actual, '');
    });
    [{
            utfEncoding: encoding.UTF8,
            relatedBom: encoding.UTF8_BOM
        }, {
            utfEncoding: encoding.UTF8_with_bom,
            relatedBom: encoding.UTF8_BOM
        }, {
            utfEncoding: encoding.UTF16be,
            relatedBom: encoding.UTF16be_BOM,
        }, {
            utfEncoding: encoding.UTF16le,
            relatedBom: encoding.UTF16le_BOM
        }].forEach(({ utfEncoding, relatedBom }) => {
        test(`toEncodeReadable - empty readable to ${utfEncoding} with BOM`, async function () {
            const source = {
                read() {
                    return null;
                }
            };
            const encodedReadable = encoding.toEncodeReadable(source, utfEncoding, { addBOM: true });
            const expected = VSBuffer.wrap(Buffer.from(relatedBom)).toString();
            const actual = streams.consumeReadable(await encodedReadable, VSBuffer.concat).toString();
            assert.strictEqual(actual, expected);
        });
    });
    test('encodingExists', async function () {
        for (const enc in encoding.SUPPORTED_ENCODINGS) {
            if (enc === encoding.UTF8_with_bom) {
                continue; // skip over encodings from us
            }
            const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
            assert.strictEqual(iconv.encodingExists(enc), true, enc);
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9ub2RlL2VuY29kaW5nL2VuY29kaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxRQUFRLE1BQU0sNkJBQTZCLENBQUM7QUFDeEQsT0FBTyxLQUFLLE9BQU8sTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsUUFBUSxFQUEwQiw0QkFBNEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25KLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEcsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxJQUFZO0lBQ3JELElBQUksQ0FBQztRQUNKLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFL0QsT0FBTyxRQUFRLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLENBQUMsc0NBQXNDO0lBQ3BELENB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QUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSztRQUMxRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLDJFQUEyRSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3RILE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSztRQUMxRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLDJFQUEyRSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3RILE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsS0FBSztRQUMzQyxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLHFFQUFxRSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ2hILE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQWlCLENB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