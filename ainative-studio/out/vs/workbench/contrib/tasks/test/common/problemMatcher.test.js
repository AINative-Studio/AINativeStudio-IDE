/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as matchers from '../../common/problemMatcher.js';
import assert from 'assert';
import { ValidationStatus } from '../../../../../base/common/parsers.js';
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this._messages = [];
    }
    info(message) {
        this._messages.push(message);
        this._validationStatus.state = 1 /* ValidationState.Info */;
    }
    warn(message) {
        this._messages.push(message);
        this._validationStatus.state = 2 /* ValidationState.Warning */;
    }
    error(message) {
        this._messages.push(message);
        this._validationStatus.state = 3 /* ValidationState.Error */;
    }
    fatal(message) {
        this._messages.push(message);
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
    }
    hasMessage(message) {
        return this._messages.indexOf(message) !== null;
    }
    get messages() {
        return this._messages;
    }
    get state() {
        return this._validationStatus.state;
    }
    isOK() {
        return this._validationStatus.isOK();
    }
    get status() {
        return this._validationStatus;
    }
}
suite('ProblemPatternParser', () => {
    let reporter;
    let parser;
    const testRegexp = new RegExp('test');
    setup(() => {
        reporter = new ProblemReporter();
        parser = new matchers.ProblemPatternParser(reporter);
    });
    suite('single-pattern definitions', () => {
        test('parses a pattern defined by only a regexp', () => {
            const problemPattern = {
                regexp: 'test'
            };
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.Location,
                file: 1,
                line: 2,
                character: 3,
                message: 0
            });
        });
        test('does not sets defaults for line and character if kind is File', () => {
            const problemPattern = {
                regexp: 'test',
                kind: 'file'
            };
            const parsed = parser.parse(problemPattern);
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.File,
                file: 1,
                message: 0
            });
        });
    });
    suite('multi-pattern definitions', () => {
        test('defines a pattern based on regexp and property fields, with file/line location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, line: 4, column: 5, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    line: 4,
                    character: 5,
                    message: 6
                }]);
        });
        test('defines a pattern bsaed on regexp and property fields, with location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, location: 4, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    location: 4,
                    message: 6
                }]);
        });
        test('accepts a pattern that provides the fields from multiple entries', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                { regexp: testRegexp, kind: matchers.ProblemLocationKind.Location, file: 3 },
                { regexp: new RegExp('test1'), line: 4 },
                { regexp: new RegExp('test2'), character: 5 },
                { regexp: new RegExp('test3'), message: 6 }
            ]);
        });
        test('forbids setting the loop flag outside of the last element in the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, loop: true },
                { regexp: 'test1', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The loop property is only supported on the last line matcher.'));
        });
        test('forbids setting the kind outside of the first element of the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', kind: 'file', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. The kind property must be provided only in the first element'));
        });
        test('kind: Location requires a regexp', () => {
            const problemPattern = [
                { file: 0, line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a regexp on every entry', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a message', () => {
            const problemPattern = [
                { regexp: 'test', file: 0, line: 1, column: 20 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: Location requires a file', () => {
            const problemPattern = [
                { regexp: 'test', line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: Location requires either a line or location', () => {
            const problemPattern = [
                { regexp: 'test', file: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: File accepts a regexp, file and message', () => {
            const problemPattern = [
                { regexp: 'test', file: 2, kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.File,
                    file: 2,
                    message: 6
                }]);
        });
        test('kind: File requires a file', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: File requires a message', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', file: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy90ZXN0L2NvbW1vbi9wcm9ibGVtTWF0Y2hlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxRQUFRLE1BQU0sZ0NBQWdDLENBQUM7QUFFM0QsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBcUMsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU1RyxNQUFNLGVBQWU7SUFJcEI7UUFDQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFTSxJQUFJLENBQUMsT0FBZTtRQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSywrQkFBdUIsQ0FBQztJQUNyRCxDQUFDO0lBRU0sSUFBSSxDQUFDLE9BQWU7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssa0NBQTBCLENBQUM7SUFDeEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxPQUFlO1FBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLGdDQUF3QixDQUFDO0lBQ3RELENBQUM7SUFFTSxLQUFLLENBQUMsT0FBZTtRQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLElB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