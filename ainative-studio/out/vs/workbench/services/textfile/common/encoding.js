/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { newWriteableStream, listenStream } from '../../../../base/common/stream.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { coalesce } from '../../../../base/common/arrays.js';
export const UTF8 = 'utf8';
export const UTF8_with_bom = 'utf8bom';
export const UTF16be = 'utf16be';
export const UTF16le = 'utf16le';
export function isUTFEncoding(encoding) {
    return [UTF8, UTF8_with_bom, UTF16be, UTF16le].some(utfEncoding => utfEncoding === encoding);
}
export const UTF16be_BOM = [0xFE, 0xFF];
export const UTF16le_BOM = [0xFF, 0xFE];
export const UTF8_BOM = [0xEF, 0xBB, 0xBF];
const ZERO_BYTE_DETECTION_BUFFER_MAX_LEN = 512; // number of bytes to look at to decide about a file being binary or not
const NO_ENCODING_GUESS_MIN_BYTES = 512; // when not auto guessing the encoding, small number of bytes are enough
const AUTO_ENCODING_GUESS_MIN_BYTES = 512 * 8; // with auto guessing we want a lot more content to be read for guessing
const AUTO_ENCODING_GUESS_MAX_BYTES = 512 * 128; // set an upper limit for the number of bytes we pass on to jschardet
export var DecodeStreamErrorKind;
(function (DecodeStreamErrorKind) {
    /**
     * Error indicating that the stream is binary even
     * though `acceptTextOnly` was specified.
     */
    DecodeStreamErrorKind[DecodeStreamErrorKind["STREAM_IS_BINARY"] = 1] = "STREAM_IS_BINARY";
})(DecodeStreamErrorKind || (DecodeStreamErrorKind = {}));
export class DecodeStreamError extends Error {
    constructor(message, decodeStreamErrorKind) {
        super(message);
        this.decodeStreamErrorKind = decodeStreamErrorKind;
    }
}
class DecoderStream {
    /**
     * This stream will only load iconv-lite lazily if the encoding
     * is not UTF-8. This ensures that for most common cases we do
     * not pay the price of loading the module from disk.
     *
     * We still need to be careful when converting UTF-8 to a string
     * though because we read the file in chunks of Buffer and thus
     * need to decode it via TextDecoder helper that is available
     * in browser and node.js environments.
     */
    static async create(encoding) {
        let decoder = undefined;
        if (encoding !== UTF8) {
            const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
            decoder = iconv.getDecoder(toNodeEncoding(encoding));
        }
        else {
            const utf8TextDecoder = new TextDecoder();
            decoder = {
                write(buffer) {
                    return utf8TextDecoder.decode(buffer, {
                        // Signal to TextDecoder that potentially more data is coming
                        // and that we are calling `decode` in the end to consume any
                        // remainders
                        stream: true
                    });
                },
                end() {
                    return utf8TextDecoder.decode();
                }
            };
        }
        return new DecoderStream(decoder);
    }
    constructor(iconvLiteDecoder) {
        this.iconvLiteDecoder = iconvLiteDecoder;
    }
    write(buffer) {
        return this.iconvLiteDecoder.write(buffer);
    }
    end() {
        return this.iconvLiteDecoder.end();
    }
}
export function toDecodeStream(source, options) {
    const minBytesRequiredForDetection = options.minBytesRequiredForDetection ?? options.guessEncoding ? AUTO_ENCODING_GUESS_MIN_BYTES : NO_ENCODING_GUESS_MIN_BYTES;
    return new Promise((resolve, reject) => {
        const target = newWriteableStream(strings => strings.join(''));
        const bufferedChunks = [];
        let bytesBuffered = 0;
        let decoder = undefined;
        const cts = new CancellationTokenSource();
        const createDecoder = async () => {
            try {
                // detect encoding from buffer
                const detected = await detectEncodingFromBuffer({
                    buffer: VSBuffer.concat(bufferedChunks),
                    bytesRead: bytesBuffered
                }, options.guessEncoding, options.candidateGuessEncodings);
                // throw early if the source seems binary and
                // we are instructed to only accept text
                if (detected.seemsBinary && options.acceptTextOnly) {
                    throw new DecodeStreamError('Stream is binary but only text is accepted for decoding', 1 /* DecodeStreamErrorKind.STREAM_IS_BINARY */);
                }
                // ensure to respect overwrite of encoding
                detected.encoding = await options.overwriteEncoding(detected.encoding);
                // decode and write buffered content
                decoder = await DecoderStream.create(detected.encoding);
                const decoded = decoder.write(VSBuffer.concat(bufferedChunks).buffer);
                target.write(decoded);
                bufferedChunks.length = 0;
                bytesBuffered = 0;
                // signal to the outside our detected encoding and final decoder stream
                resolve({
                    stream: target,
                    detected
                });
            }
            catch (error) {
                // Stop handling anything from the source and target
                cts.cancel();
                target.destroy();
                reject(error);
            }
        };
        listenStream(source, {
            onData: async (chunk) => {
                // if the decoder is ready, we just write directly
                if (decoder) {
                    target.write(decoder.write(chunk.buffer));
                }
                // otherwise we need to buffer the data until the stream is ready
                else {
                    bufferedChunks.push(chunk);
                    bytesBuffered += chunk.byteLength;
                    // buffered enough data for encoding detection, create stream
                    if (bytesBuffered >= minBytesRequiredForDetection) {
                        // pause stream here until the decoder is ready
                        source.pause();
                        await createDecoder();
                        // resume stream now that decoder is ready but
                        // outside of this stack to reduce recursion
                        setTimeout(() => source.resume());
                    }
                }
            },
            onError: error => target.error(error), // simply forward to target
            onEnd: async () => {
                // we were still waiting for data to do the encoding
                // detection. thus, wrap up starting the stream even
                // without all the data to get things going
                if (!decoder) {
                    await createDecoder();
                }
                // end the target with the remainders of the decoder
                target.end(decoder?.end());
            }
        }, cts.token);
    });
}
export async function toEncodeReadable(readable, encoding, options) {
    const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
    const encoder = iconv.getEncoder(toNodeEncoding(encoding), options);
    let bytesWritten = false;
    let done = false;
    return {
        read() {
            if (done) {
                return null;
            }
            const chunk = readable.read();
            if (typeof chunk !== 'string') {
                done = true;
                // If we are instructed to add a BOM but we detect that no
                // bytes have been written, we must ensure to return the BOM
                // ourselves so that we comply with the contract.
                if (!bytesWritten && options?.addBOM) {
                    switch (encoding) {
                        case UTF8:
                        case UTF8_with_bom:
                            return VSBuffer.wrap(Uint8Array.from(UTF8_BOM));
                        case UTF16be:
                            return VSBuffer.wrap(Uint8Array.from(UTF16be_BOM));
                        case UTF16le:
                            return VSBuffer.wrap(Uint8Array.from(UTF16le_BOM));
                    }
                }
                const leftovers = encoder.end();
                if (leftovers && leftovers.length > 0) {
                    bytesWritten = true;
                    return VSBuffer.wrap(leftovers);
                }
                return null;
            }
            bytesWritten = true;
            return VSBuffer.wrap(encoder.write(chunk));
        }
    };
}
export async function encodingExists(encoding) {
    const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
    return iconv.encodingExists(toNodeEncoding(encoding));
}
export function toNodeEncoding(enc) {
    if (enc === UTF8_with_bom || enc === null) {
        return UTF8; // iconv does not distinguish UTF 8 with or without BOM, so we need to help it
    }
    return enc;
}
export function detectEncodingByBOMFromBuffer(buffer, bytesRead) {
    if (!buffer || bytesRead < UTF16be_BOM.length) {
        return null;
    }
    const b0 = buffer.readUInt8(0);
    const b1 = buffer.readUInt8(1);
    // UTF-16 BE
    if (b0 === UTF16be_BOM[0] && b1 === UTF16be_BOM[1]) {
        return UTF16be;
    }
    // UTF-16 LE
    if (b0 === UTF16le_BOM[0] && b1 === UTF16le_BOM[1]) {
        return UTF16le;
    }
    if (bytesRead < UTF8_BOM.length) {
        return null;
    }
    const b2 = buffer.readUInt8(2);
    // UTF-8
    if (b0 === UTF8_BOM[0] && b1 === UTF8_BOM[1] && b2 === UTF8_BOM[2]) {
        return UTF8_with_bom;
    }
    return null;
}
// we explicitly ignore a specific set of encodings from auto guessing
// - ASCII: we never want this encoding (most UTF-8 files would happily detect as
//          ASCII files and then you could not type non-ASCII characters anymore)
// - UTF-16: we have our own detection logic for UTF-16
// - UTF-32: we do not support this encoding in VSCode
const IGNORE_ENCODINGS = ['ascii', 'utf-16', 'utf-32'];
/**
 * Guesses the encoding from buffer.
 */
async function guessEncodingByBuffer(buffer, candidateGuessEncodings) {
    const jschardet = await importAMDNodeModule('jschardet', 'dist/jschardet.min.js');
    // ensure to limit buffer for guessing due to https://github.com/aadsm/jschardet/issues/53
    const limitedBuffer = buffer.slice(0, AUTO_ENCODING_GUESS_MAX_BYTES);
    // before guessing jschardet calls toString('binary') on input if it is a Buffer,
    // since we are using it inside browser environment as well we do conversion ourselves
    // https://github.com/aadsm/jschardet/blob/v2.1.1/src/index.js#L36-L40
    const binaryString = encodeLatin1(limitedBuffer.buffer);
    // ensure to convert candidate encodings to jschardet encoding names if provided
    if (candidateGuessEncodings) {
        candidateGuessEncodings = coalesce(candidateGuessEncodings.map(e => toJschardetEncoding(e)));
        if (candidateGuessEncodings.length === 0) {
            candidateGuessEncodings = undefined;
        }
    }
    let guessed;
    try {
        guessed = jschardet.detect(binaryString, candidateGuessEncodings ? { detectEncodings: candidateGuessEncodings } : undefined);
    }
    catch (error) {
        return null; // jschardet throws for unknown encodings (https://github.com/microsoft/vscode/issues/239928)
    }
    if (!guessed || !guessed.encoding) {
        return null;
    }
    const enc = guessed.encoding.toLowerCase();
    if (0 <= IGNORE_ENCODINGS.indexOf(enc)) {
        return null; // see comment above why we ignore some encodings
    }
    return toIconvLiteEncoding(guessed.encoding);
}
const JSCHARDET_TO_ICONV_ENCODINGS = {
    'ibm866': 'cp866',
    'big5': 'cp950'
};
function normalizeEncoding(encodingName) {
    return encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}
function toIconvLiteEncoding(encodingName) {
    const normalizedEncodingName = normalizeEncoding(encodingName);
    const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];
    return mapped || normalizedEncodingName;
}
function toJschardetEncoding(encodingName) {
    const normalizedEncodingName = normalizeEncoding(encodingName);
    const mapped = GUESSABLE_ENCODINGS[normalizedEncodingName];
    return mapped ? mapped.guessableName : undefined;
}
function encodeLatin1(buffer) {
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
        result += String.fromCharCode(buffer[i]);
    }
    return result;
}
/**
 * The encodings that are allowed in a settings file don't match the canonical encoding labels specified by WHATWG.
 * See https://encoding.spec.whatwg.org/#names-and-labels
 * Iconv-lite strips all non-alphanumeric characters, but ripgrep doesn't. For backcompat, allow these labels.
 */
export function toCanonicalName(enc) {
    switch (enc) {
        case 'shiftjis':
            return 'shift-jis';
        case 'utf16le':
            return 'utf-16le';
        case 'utf16be':
            return 'utf-16be';
        case 'big5hkscs':
            return 'big5-hkscs';
        case 'eucjp':
            return 'euc-jp';
        case 'euckr':
            return 'euc-kr';
        case 'koi8r':
            return 'koi8-r';
        case 'koi8u':
            return 'koi8-u';
        case 'macroman':
            return 'x-mac-roman';
        case 'utf8bom':
            return 'utf8';
        default: {
            const m = enc.match(/windows(\d+)/);
            if (m) {
                return 'windows-' + m[1];
            }
            return enc;
        }
    }
}
export function detectEncodingFromBuffer({ buffer, bytesRead }, autoGuessEncoding, candidateGuessEncodings) {
    // Always first check for BOM to find out about encoding
    let encoding = detectEncodingByBOMFromBuffer(buffer, bytesRead);
    // Detect 0 bytes to see if file is binary or UTF-16 LE/BE
    // unless we already know that this file has a UTF-16 encoding
    let seemsBinary = false;
    if (encoding !== UTF16be && encoding !== UTF16le && buffer) {
        let couldBeUTF16LE = true; // e.g. 0xAA 0x00
        let couldBeUTF16BE = true; // e.g. 0x00 0xAA
        let containsZeroByte = false;
        // This is a simplified guess to detect UTF-16 BE or LE by just checking if
        // the first 512 bytes have the 0-byte at a specific location. For UTF-16 LE
        // this would be the odd byte index and for UTF-16 BE the even one.
        // Note: this can produce false positives (a binary file that uses a 2-byte
        // encoding of the same format as UTF-16) and false negatives (a UTF-16 file
        // that is using 4 bytes to encode a character).
        for (let i = 0; i < bytesRead && i < ZERO_BYTE_DETECTION_BUFFER_MAX_LEN; i++) {
            const isEndian = (i % 2 === 1); // assume 2-byte sequences typical for UTF-16
            const isZeroByte = (buffer.readUInt8(i) === 0);
            if (isZeroByte) {
                containsZeroByte = true;
            }
            // UTF-16 LE: expect e.g. 0xAA 0x00
            if (couldBeUTF16LE && (isEndian && !isZeroByte || !isEndian && isZeroByte)) {
                couldBeUTF16LE = false;
            }
            // UTF-16 BE: expect e.g. 0x00 0xAA
            if (couldBeUTF16BE && (isEndian && isZeroByte || !isEndian && !isZeroByte)) {
                couldBeUTF16BE = false;
            }
            // Return if this is neither UTF16-LE nor UTF16-BE and thus treat as binary
            if (isZeroByte && !couldBeUTF16LE && !couldBeUTF16BE) {
                break;
            }
        }
        // Handle case of 0-byte included
        if (containsZeroByte) {
            if (couldBeUTF16LE) {
                encoding = UTF16le;
            }
            else if (couldBeUTF16BE) {
                encoding = UTF16be;
            }
            else {
                seemsBinary = true;
            }
        }
    }
    // Auto guess encoding if configured
    if (autoGuessEncoding && !seemsBinary && !encoding && buffer) {
        return guessEncodingByBuffer(buffer.slice(0, bytesRead), candidateGuessEncodings).then(guessedEncoding => {
            return {
                seemsBinary: false,
                encoding: guessedEncoding
            };
        });
    }
    return { seemsBinary, encoding };
}
export const SUPPORTED_ENCODINGS = {
    utf8: {
        labelLong: 'UTF-8',
        labelShort: 'UTF-8',
        order: 1,
        alias: 'utf8bom',
        guessableName: 'UTF-8'
    },
    utf8bom: {
        labelLong: 'UTF-8 with BOM',
        labelShort: 'UTF-8 with BOM',
        encodeOnly: true,
        order: 2,
        alias: 'utf8'
    },
    utf16le: {
        labelLong: 'UTF-16 LE',
        labelShort: 'UTF-16 LE',
        order: 3,
        guessableName: 'UTF-16LE'
    },
    utf16be: {
        labelLong: 'UTF-16 BE',
        labelShort: 'UTF-16 BE',
        order: 4,
        guessableName: 'UTF-16BE'
    },
    windows1252: {
        labelLong: 'Western (Windows 1252)',
        labelShort: 'Windows 1252',
        order: 5,
        guessableName: 'windows-1252'
    },
    iso88591: {
        labelLong: 'Western (ISO 8859-1)',
        labelShort: 'ISO 8859-1',
        order: 6
    },
    iso88593: {
        labelLong: 'Western (ISO 8859-3)',
        labelShort: 'ISO 8859-3',
        order: 7
    },
    iso885915: {
        labelLong: 'Western (ISO 8859-15)',
        labelShort: 'ISO 8859-15',
        order: 8
    },
    macroman: {
        labelLong: 'Western (Mac Roman)',
        labelShort: 'Mac Roman',
        order: 9
    },
    cp437: {
        labelLong: 'DOS (CP 437)',
        labelShort: 'CP437',
        order: 10
    },
    windows1256: {
        labelLong: 'Arabic (Windows 1256)',
        labelShort: 'Windows 1256',
        order: 11
    },
    iso88596: {
        labelLong: 'Arabic (ISO 8859-6)',
        labelShort: 'ISO 8859-6',
        order: 12
    },
    windows1257: {
        labelLong: 'Baltic (Windows 1257)',
        labelShort: 'Windows 1257',
        order: 13
    },
    iso88594: {
        labelLong: 'Baltic (ISO 8859-4)',
        labelShort: 'ISO 8859-4',
        order: 14
    },
    iso885914: {
        labelLong: 'Celtic (ISO 8859-14)',
        labelShort: 'ISO 8859-14',
        order: 15
    },
    windows1250: {
        labelLong: 'Central European (Windows 1250)',
        labelShort: 'Windows 1250',
        order: 16,
        guessableName: 'windows-1250'
    },
    iso88592: {
        labelLong: 'Central European (ISO 8859-2)',
        labelShort: 'ISO 8859-2',
        order: 17,
        guessableName: 'ISO-8859-2'
    },
    cp852: {
        labelLong: 'Central European (CP 852)',
        labelShort: 'CP 852',
        order: 18
    },
    windows1251: {
        labelLong: 'Cyrillic (Windows 1251)',
        labelShort: 'Windows 1251',
        order: 19,
        guessableName: 'windows-1251'
    },
    cp866: {
        labelLong: 'Cyrillic (CP 866)',
        labelShort: 'CP 866',
        order: 20,
        guessableName: 'IBM866'
    },
    cp1125: {
        labelLong: 'Cyrillic (CP 1125)',
        labelShort: 'CP 1125',
        order: 21,
        guessableName: 'IBM1125'
    },
    iso88595: {
        labelLong: 'Cyrillic (ISO 8859-5)',
        labelShort: 'ISO 8859-5',
        order: 22,
        guessableName: 'ISO-8859-5'
    },
    koi8r: {
        labelLong: 'Cyrillic (KOI8-R)',
        labelShort: 'KOI8-R',
        order: 23,
        guessableName: 'KOI8-R'
    },
    koi8u: {
        labelLong: 'Cyrillic (KOI8-U)',
        labelShort: 'KOI8-U',
        order: 24
    },
    iso885913: {
        labelLong: 'Estonian (ISO 8859-13)',
        labelShort: 'ISO 8859-13',
        order: 25
    },
    windows1253: {
        labelLong: 'Greek (Windows 1253)',
        labelShort: 'Windows 1253',
        order: 26,
        guessableName: 'windows-1253'
    },
    iso88597: {
        labelLong: 'Greek (ISO 8859-7)',
        labelShort: 'ISO 8859-7',
        order: 27,
        guessableName: 'ISO-8859-7'
    },
    windows1255: {
        labelLong: 'Hebrew (Windows 1255)',
        labelShort: 'Windows 1255',
        order: 28,
        guessableName: 'windows-1255'
    },
    iso88598: {
        labelLong: 'Hebrew (ISO 8859-8)',
        labelShort: 'ISO 8859-8',
        order: 29,
        guessableName: 'ISO-8859-8'
    },
    iso885910: {
        labelLong: 'Nordic (ISO 8859-10)',
        labelShort: 'ISO 8859-10',
        order: 30
    },
    iso885916: {
        labelLong: 'Romanian (ISO 8859-16)',
        labelShort: 'ISO 8859-16',
        order: 31
    },
    windows1254: {
        labelLong: 'Turkish (Windows 1254)',
        labelShort: 'Windows 1254',
        order: 32
    },
    iso88599: {
        labelLong: 'Turkish (ISO 8859-9)',
        labelShort: 'ISO 8859-9',
        order: 33
    },
    windows1258: {
        labelLong: 'Vietnamese (Windows 1258)',
        labelShort: 'Windows 1258',
        order: 34
    },
    gbk: {
        labelLong: 'Simplified Chinese (GBK)',
        labelShort: 'GBK',
        order: 35
    },
    gb18030: {
        labelLong: 'Simplified Chinese (GB18030)',
        labelShort: 'GB18030',
        order: 36
    },
    cp950: {
        labelLong: 'Traditional Chinese (Big5)',
        labelShort: 'Big5',
        order: 37,
        guessableName: 'Big5'
    },
    big5hkscs: {
        labelLong: 'Traditional Chinese (Big5-HKSCS)',
        labelShort: 'Big5-HKSCS',
        order: 38
    },
    shiftjis: {
        labelLong: 'Japanese (Shift JIS)',
        labelShort: 'Shift JIS',
        order: 39,
        guessableName: 'SHIFT_JIS'
    },
    eucjp: {
        labelLong: 'Japanese (EUC-JP)',
        labelShort: 'EUC-JP',
        order: 40,
        guessableName: 'EUC-JP'
    },
    euckr: {
        labelLong: 'Korean (EUC-KR)',
        labelShort: 'EUC-KR',
        order: 41,
        guessableName: 'EUC-KR'
    },
    windows874: {
        labelLong: 'Thai (Windows 874)',
        labelShort: 'Windows 874',
        order: 42
    },
    iso885911: {
        labelLong: 'Latin/Thai (ISO 8859-11)',
        labelShort: 'ISO 8859-11',
        order: 43
    },
    koi8ru: {
        labelLong: 'Cyrillic (KOI8-RU)',
        labelShort: 'KOI8-RU',
        order: 44
    },
    koi8t: {
        labelLong: 'Tajik (KOI8-T)',
        labelShort: 'KOI8-T',
        order: 45
    },
    gb2312: {
        labelLong: 'Simplified Chinese (GB 2312)',
        labelShort: 'GB 2312',
        order: 46,
        guessableName: 'GB2312'
    },
    cp865: {
        labelLong: 'Nordic DOS (CP 865)',
        labelShort: 'CP 865',
        order: 47
    },
    cp850: {
        labelLong: 'Western European DOS (CP 850)',
        labelShort: 'CP 850',
        order: 48
    }
};
export const GUESSABLE_ENCODINGS = (() => {
    const guessableEncodings = {};
    for (const encoding in SUPPORTED_ENCODINGS) {
        if (SUPPORTED_ENCODINGS[encoding].guessableName) {
            guessableEncodings[encoding] = SUPPORTED_ENCODINGS[encoding];
        }
    }
    return guessableEncodings;
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vZW5jb2RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUE0QixrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUE0QyxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDO0FBQzNCLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUM7QUFDdkMsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQztBQUNqQyxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDO0FBSWpDLE1BQU0sVUFBVSxhQUFhLENBQUMsUUFBZ0I7SUFDN0MsT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQztBQUM5RixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4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