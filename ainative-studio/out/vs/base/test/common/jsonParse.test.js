/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { parse, stripComments } from '../../common/jsonc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON Parse', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Line comment', () => {
        const content = [
            "{",
            "  \"prop\": 10 // a comment",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  \"prop\": 10 ",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - EOF', () => {
        const content = [
            "{",
            "}",
            "// a comment"
        ].join('\n');
        const expected = [
            "{",
            "}",
            ""
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - \\r\\n', () => {
        const content = [
            "{",
            "  \"prop\": 10 // a comment",
            "}",
        ].join('\r\n');
        const expected = [
            "{",
            "  \"prop\": 10 ",
            "}",
        ].join('\r\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - EOF - \\r\\n', () => {
        const content = [
            "{",
            "}",
            "// a comment"
        ].join('\r\n');
        const expected = [
            "{",
            "}",
            ""
        ].join('\r\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - single line', () => {
        const content = [
            "{",
            "  /* before */\"prop\": 10/* after */",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  \"prop\": 10",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - multi line', () => {
        const content = [
            "{",
            "  /**",
            "   * Some comment",
            "   */",
            "  \"prop\": 10",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  ",
            "  \"prop\": 10",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - shortest match', () => {
        const content = "/* abc */ */";
        const expected = " */";
        assert.strictEqual(stripComments(content), expected);
    });
    test('No strings - double quote', () => {
        const content = [
            "{",
            "  \"/* */\": 10",
            "}"
        ].join('\n');
        const expected = [
            "{",
            "  \"/* */\": 10",
            "}"
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('No strings - single quote', () => {
        const content = [
            "{",
            "  '/* */': 10",
            "}"
        ].join('\n');
        const expected = [
            "{",
            "  '/* */': 10",
            "}"
        ].join('\n');
        assert.strictEqual(stripComments(content), expected);
    });
    test('Trailing comma in object', () => {
        const content = [
            "{",
            `  "a": 10,`,
            "}"
        ].join('\n');
        const expected = [
            "{",
            `  "a": 10`,
            "}"
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma in array', () => {
        const content = [
            `[ "a", "b", "c", ]`
        ].join('\n');
        const expected = [
            `[ "a", "b", "c" ]`
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma', () => {
        const content = [
            "{",
            "  \"propA\": 10, // a comment",
            "  \"propB\": false, // a trailing comma",
            "}",
        ].join('\n');
        const expected = [
            "{",
            "  \"propA\": 10,",
            "  \"propB\": false",
            "}",
        ].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma - EOF', () => {
        const content = `
// This configuration file allows you to pass permanent command line arguments to VS Code.
// Only a subset of arguments is currently supported to reduce the likelihood of breaking
// the installation.
//
// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT
//
// NOTE: Changing this file requires a restart of VS Code.
{
	// Use software rendering instead of hardware accelerated rendering.
	// This can help in cases where you see rendering issues in VS Code.
	// "disable-hardware-acceleration": true,
	// Allows to disable crash reporting.
	// Should restart the app if the value is changed.
	"enable-crash-reporter": true,
	// Unique id used for correlating crash reports sent from this instance.
	// Do not edit this value.
	"crash-reporter-id": "aaaaab31-7453-4506-97d0-93411b2c21c7",
	"locale": "en",
	// "log-level": "trace"
}
`;
        assert.deepEqual(parse(content), {
            "enable-crash-reporter": true,
            "crash-reporter-id": "aaaaab31-7453-4506-97d0-93411b2c21c7",
            "locale": "en"
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblBhcnNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vanNvblBhcnNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxPQUFPLEdBQVc7WUFDdkIsR0FBRztZQUNILDZCQUE2QjtZQUM3QixHQUFHO1NBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLFFBQVEsR0FBRztZQUNoQixHQUFHO1lBQ0gsaUJBQWlCO1lBQ2pCLEdBQUc7U0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxPQUFPLEdBQVc7WUFDdkIsR0FBRztZQUNILEdBQUc7WUFDSCxjQUFjO1NBQ2QsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDYixNQUFNLFFBQVEsR0FBRztZQUNoQixHQUFHO1lBQ0gsR0FBRztZQUNILEVBQUU7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