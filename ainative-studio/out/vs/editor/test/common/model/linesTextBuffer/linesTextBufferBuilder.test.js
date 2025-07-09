/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as strings from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { createTextBufferFactory } from '../../../../common/model/textModel.js';
function testTextBufferFactory(text, eol, mightContainNonBasicASCII, mightContainRTL) {
    const { disposable, textBuffer } = createTextBufferFactory(text).create(1 /* DefaultEndOfLine.LF */);
    assert.strictEqual(textBuffer.mightContainNonBasicASCII(), mightContainNonBasicASCII);
    assert.strictEqual(textBuffer.mightContainRTL(), mightContainRTL);
    assert.strictEqual(textBuffer.getEOL(), eol);
    disposable.dispose();
}
suite('ModelBuilder', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('t1', () => {
        testTextBufferFactory('', '\n', false, false);
    });
    test('t2', () => {
        testTextBufferFactory('Hello world', '\n', false, false);
    });
    test('t3', () => {
        testTextBufferFactory('Hello world\nHow are you?', '\n', false, false);
    });
    test('t4', () => {
        testTextBufferFactory('Hello world\nHow are you?\nIs everything good today?\nDo you enjoy the weather?', '\n', false, false);
    });
    test('carriage return detection (1 \\r\\n 2 \\n)', () => {
        testTextBufferFactory('Hello world\r\nHow are you?\nIs everything good today?\nDo you enjoy the weather?', '\n', false, false);
    });
    test('carriage return detection (2 \\r\\n 1 \\n)', () => {
        testTextBufferFactory('Hello world\r\nHow are you?\r\nIs everything good today?\nDo you enjoy the weather?', '\r\n', false, false);
    });
    test('carriage return detection (3 \\r\\n 0 \\n)', () => {
        testTextBufferFactory('Hello world\r\nHow are you?\r\nIs everything good today?\r\nDo you enjoy the weather?', '\r\n', false, false);
    });
    test('BOM handling', () => {
        testTextBufferFactory(strings.UTF8_BOM_CHARACTER + 'Hello world!', '\n', false, false);
    });
    test('RTL handling 2', () => {
        testTextBufferFactory('Hello world!זוהי עובדה מבוססת שדעתו', '\n', true, true);
    });
    test('RTL handling 3', () => {
        testTextBufferFactory('Hello world!זוהי \nעובדה מבוססת שדעתו', '\n', true, true);
    });
    test('ASCII handling 1', () => {
        testTextBufferFactory('Hello world!!\nHow do you do?', '\n', false, false);
    });
    test('ASCII handling 2', () => {
        testTextBufferFactory('Hello world!!\nHow do you do?Züricha📚📚b', '\n', true, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNUZXh0QnVmZmVyQnVpbGRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9saW5lc1RleHRCdWZmZXIvbGluZXNUZXh0QnVmZmVyQnVpbGRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssT0FBTyxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhGLFNBQVMscUJBQXFCLENBQUMsSUFBWSxFQUFFLEdBQVcsRUFBRSx5QkFBa0MsRUFBRSxlQUF3QjtJQUNySCxNQUFNLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sNkJBQXFCLENBQUM7SUFFN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN0QixDQUFDO0FBRUQsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFFMUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUNmLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDZixxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ2YscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ2YscUJBQXFCLENBQUMsaUZBQWlGLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM5SCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQscUJBQXFCLENBQUMsbUZBQW1GLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoSSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQscUJBQXFCLENBQUMscUZBQXFGLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwSSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQscUJBQXFCLENBQUMsdUZBQXVGLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN0SSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsR0FBRyxjQUFjLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IscUJBQXFCLENBQUMscUNBQXFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IscUJBQXFCLENBQUMsdUNBQXVDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IscUJBQXFCLENBQUMsK0JBQStCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IscUJBQXFCLENBQUMsMkNBQTJDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=