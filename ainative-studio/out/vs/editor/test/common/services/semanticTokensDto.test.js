/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { encodeSemanticTokensDto, decodeSemanticTokensDto } from '../../../common/services/semanticTokensDto.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('SemanticTokensDto', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function toArr(arr) {
        const result = [];
        for (let i = 0, len = arr.length; i < len; i++) {
            result[i] = arr[i];
        }
        return result;
    }
    function assertEqualFull(actual, expected) {
        const convert = (dto) => {
            return {
                id: dto.id,
                type: dto.type,
                data: toArr(dto.data)
            };
        };
        assert.deepStrictEqual(convert(actual), convert(expected));
    }
    function assertEqualDelta(actual, expected) {
        const convertOne = (delta) => {
            if (!delta.data) {
                return delta;
            }
            return {
                start: delta.start,
                deleteCount: delta.deleteCount,
                data: toArr(delta.data)
            };
        };
        const convert = (dto) => {
            return {
                id: dto.id,
                type: dto.type,
                deltas: dto.deltas.map(convertOne)
            };
        };
        assert.deepStrictEqual(convert(actual), convert(expected));
    }
    function testRoundTrip(value) {
        const decoded = decodeSemanticTokensDto(encodeSemanticTokensDto(value));
        if (value.type === 'full' && decoded.type === 'full') {
            assertEqualFull(decoded, value);
        }
        else if (value.type === 'delta' && decoded.type === 'delta') {
            assertEqualDelta(decoded, value);
        }
        else {
            assert.fail('wrong type');
        }
    }
    test('full encoding', () => {
        testRoundTrip({
            id: 12,
            type: 'full',
            data: new Uint32Array([(1 << 24) + (2 << 16) + (3 << 8) + 4])
        });
    });
    test('delta encoding', () => {
        testRoundTrip({
            id: 12,
            type: 'delta',
            deltas: [{
                    start: 0,
                    deleteCount: 4,
                    data: undefined
                }, {
                    start: 15,
                    deleteCount: 0,
                    data: new Uint32Array([(1 << 24) + (2 << 16) + (3 << 8) + 4])
                }, {
                    start: 27,
                    deleteCount: 5,
                    data: new Uint32Array([(1 << 24) + (2 << 16) + (3 << 8) + 4, 1, 2, 3, 4, 5, 6, 7, 8, 9])
                }]
        });
    });
    test('partial array buffer', () => {
        const sharedArr = new Uint32Array([
            (1 << 24) + (2 << 16) + (3 << 8) + 4,
            1, 2, 3, 4, 5, (1 << 24) + (2 << 16) + (3 << 8) + 4
        ]);
        testRoundTrip({
            id: 12,
            type: 'delta',
            deltas: [{
                    start: 0,
                    deleteCount: 4,
                    data: sharedArr.subarray(0, 1)
                }, {
                    start: 15,
                    deleteCount: 0,
                    data: sharedArr.subarray(1, sharedArr.length)
                }]
        });
    });
    test('issue #94521: unusual backing array buffer', () => {
        function wrapAndSliceUint8Arry(buff, prefixLength, suffixLength) {
            const wrapped = new Uint8Array(prefixLength + buff.byteLength + suffixLength);
            wrapped.set(buff, prefixLength);
            return wrapped.subarray(prefixLength, prefixLength + buff.byteLength);
        }
        function wrapAndSlice(buff, prefixLength, suffixLength) {
            return VSBuffer.wrap(wrapAndSliceUint8Arry(buff.buffer, prefixLength, suffixLength));
        }
        const dto = {
            id: 5,
            type: 'full',
            data: new Uint32Array([1, 2, 3, 4, 5])
        };
        const encoded = encodeSemanticTokensDto(dto);
        // with misaligned prefix and misaligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 1, 1)), dto);
        // with misaligned prefix and aligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 1, 4)), dto);
        // with aligned prefix and misaligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 4, 1)), dto);
        // with aligned prefix and aligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 4, 4)), dto);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNEdG8udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvc2VtYW50aWNUb2tlbnNEdG8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFtRCx1QkFBdUIsRUFBc0IsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0TCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUUvQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsS0FBSyxDQUFDLEdBQWdCO1FBQzlCLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsTUFBOEIsRUFBRSxRQUFnQztRQUN4RixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQTJCLEVBQUUsRUFBRTtZQUMvQyxPQUFPO2dCQUNOLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDVixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7Z0JBQ2QsSUFBSSxF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