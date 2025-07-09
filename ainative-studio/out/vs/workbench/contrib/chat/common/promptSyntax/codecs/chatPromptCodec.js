/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatPromptDecoder } from './chatPromptDecoder.js';
/**
 * Codec that is capable to encode and decode tokens of an AI chatbot prompt message.
 */
export const ChatPromptCodec = Object.freeze({
    /**
     * Encode a stream of `TChatPromptToken`s into a stream of `VSBuffer`s.
     *
     * @see {@linkcode ReadableStream}
     * @see {@linkcode VSBuffer}
     */
    encode: (_stream) => {
        throw new Error('The `encode` method is not implemented.');
    },
    /**
     * Decode a of `VSBuffer`s into a readable of `TChatPromptToken`s.
     *
     * @see {@linkcode TChatPromptToken}
     * @see {@linkcode VSBuffer}
     * @see {@linkcode ChatPromptDecoder}
     * @see {@linkcode ReadableStream}
     */
    decode: (stream) => {
        return new ChatPromptDecoder(stream);
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdENvZGVjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvY2hhdFByb21wdENvZGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSx3QkFBd0IsQ0FBQztBQW1CN0U7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQXFCLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDOUQ7Ozs7O09BS0c7SUFDSCxNQUFNLEVBQUUsQ0FBQyxPQUF5QyxFQUE0QixFQUFFO1FBQy9FLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILE1BQU0sRUFBRSxDQUFDLE1BQWdDLEVBQXFCLEVBQUU7UUFDL0QsT0FBTyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FDRCxDQUFDLENBQUMifQ==