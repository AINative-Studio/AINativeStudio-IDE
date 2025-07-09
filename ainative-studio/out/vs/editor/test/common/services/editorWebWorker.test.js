/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { EditorWorker } from '../../../common/services/editorWebWorker.js';
suite('EditorWebWorker', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class WorkerWithModels extends EditorWorker {
        getModel(uri) {
            return this._getModel(uri);
        }
        addModel(lines, eol = '\n') {
            const uri = 'test:file#' + Date.now();
            this.$acceptNewModel({
                url: uri,
                versionId: 1,
                lines: lines,
                EOL: eol
            });
            return this._getModel(uri);
        }
    }
    let worker;
    let model;
    setup(() => {
        worker = new WorkerWithModels();
        model = worker.addModel([
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ]);
    });
    function assertPositionAt(offset, line, column) {
        const position = model.positionAt(offset);
        assert.strictEqual(position.lineNumber, line);
        assert.strictEqual(position.column, column);
    }
    function assertOffsetAt(lineNumber, column, offset) {
        const actual = model.offsetAt({ lineNumber, column });
        assert.strictEqual(actual, offset);
    }
    test('ICommonModel#offsetAt', () => {
        assertOffsetAt(1, 1, 0);
        assertOffsetAt(1, 2, 1);
        assertOffsetAt(1, 17, 16);
        assertOffsetAt(2, 1, 17);
        assertOffsetAt(2, 4, 20);
        assertOffsetAt(3, 1, 45);
        assertOffsetAt(5, 30, 95);
        assertOffsetAt(5, 31, 95);
        assertOffsetAt(5, Number.MAX_VALUE, 95);
        assertOffsetAt(6, 30, 95);
        assertOffsetAt(Number.MAX_VALUE, 30, 95);
        assertOffsetAt(Number.MAX_VALUE, Number.MAX_VALUE, 95);
    });
    test('ICommonModel#positionAt', () => {
        assertPositionAt(0, 1, 1);
        assertPositionAt(Number.MIN_VALUE, 1, 1);
        assertPositionAt(1, 1, 2);
        assertPositionAt(16, 1, 17);
        assertPositionAt(17, 2, 1);
        assertPositionAt(20, 2, 4);
        assertPositionAt(45, 3, 1);
        assertPositionAt(95, 4, 30);
        assertPositionAt(96, 4, 30);
        assertPositionAt(99, 4, 30);
        assertPositionAt(Number.MAX_VALUE, 4, 30);
    });
    test('ICommonModel#validatePosition, issue #15882', function () {
        const model = worker.addModel(['{"id": "0001","type": "donut","name": "Cake","image":{"url": "images/0001.jpg","width": 200,"height": 200},"thumbnail":{"url": "images/thumbnails/0001.jpg","width": 32,"height": 32}}']);
        assert.strictEqual(model.offsetAt({ lineNumber: 1, column: 2 }), 1);
    });
    test('MoreMinimal', () => {
        return worker.$computeMoreMinimalEdits(model.uri.toString(), [{ text: 'This is line One', range: new Range(1, 1, 1, 17) }], false).then(edits => {
            assert.strictEqual(edits.length, 1);
            const [first] = edits;
            assert.strictEqual(first.text, 'O');
            assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 14, endLineNumber: 1, endColumn: 15 });
        });
    });
    test('MoreMinimal, merge adjacent edits', async function () {
        const model = worker.addModel([
            'one',
            'two',
            'three',
            'four',
            'five'
        ], '\n');
        const newEdits = await worker.$computeMoreMinimalEdits(model.uri.toString(), [
            {
                range: new Range(1, 1, 2, 1),
                text: 'one\ntwo\nthree\n',
            }, {
                range: new Range(2, 1, 3, 1),
                text: '',
            }, {
                range: new Range(3, 1, 4, 1),
                text: '',
            }, {
                range: new Range(4, 2, 4, 3),
                text: '4',
            }, {
                range: new Range(5, 3, 5, 5),
                text: '5',
            }
        ], false);
        assert.strictEqual(newEdits.length, 2);
        assert.strictEqual(newEdits[0].text, '4');
        assert.strictEqual(newEdits[1].text, '5');
    });
    test('MoreMinimal, issue #15385 newline changes only', function () {
        const model = worker.addModel([
            '{',
            '\t"a":1',
            '}'
        ], '\n');
        return worker.$computeMoreMinimalEdits(model.uri.toString(), [{ text: '{\r\n\t"a":1\r\n}', range: new Range(1, 1, 3, 2) }], false).then(edits => {
            assert.strictEqual(edits.length, 0);
        });
    });
    test('MoreMinimal, issue #15385 newline changes and other', function () {
        const model = worker.addModel([
            '{',
            '\t"a":1',
            '}'
        ], '\n');
        return worker.$computeMoreMinimalEdits(model.uri.toString(), [{ text: '{\r\n\t"b":1\r\n}', range: new Range(1, 1, 3, 2) }], false).then(edits => {
            assert.strictEqual(edits.length, 1);
            const [first] = edits;
            assert.strictEqual(first.text, 'b');
            assert.deepStrictEqual(first.range, { startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 4 });
        });
    });
    test('MoreMinimal, issue #15385 newline changes and other 2/2', function () {
        const model = worker.addModel([
            'package main', // 1
            'func foo() {', // 2
            '}' // 3
        ]);
        return worker.$computeMoreMinimalEdits(model.uri.toString(), [{ text: '\n', range: new Range(3, 2, 4, 1000) }], false).then(edits => {
            assert.strictEqual(edits.length, 1);
            const [first] = edits;
            assert.strictEqual(first.text, '\n');
            assert.deepStrictEqual(first.range, { startLineNumber: 3, startColumn: 2, endLineNumber: 3, endColumn: 2 });
        });
    });
    async function testEdits(lines, edits) {
        const model = worker.addModel(lines);
        const smallerEdits = await worker.$computeHumanReadableDiff(model.uri.toString(), edits, { ignoreTrimWhitespace: false, maxComputationTimeMs: 0, computeMoves: false });
        const t1 = applyEdits(model.getValue(), edits);
        const t2 = applyEdits(model.getValue(), smallerEdits);
        assert.deepStrictEqual(t1, t2);
        return smallerEdits.map(e => ({ range: Range.lift(e.range).toString(), text: e.text }));
    }
    test('computeHumanReadableDiff 1', async () => {
        assert.deepStrictEqual(await testEdits([
            'function test() {}'
        ], [{
                text: "\n/** Some Comment */\n",
                range: new Range(1, 1, 1, 1)
            }]), ([{ range: "[1,1 -> 1,1]", text: "\n/** Some Comment */\n" }]));
    });
    test('computeHumanReadableDiff 2', async () => {
        assert.deepStrictEqual(await testEdits([
            'function test() {}'
        ], [{
                text: 'function test(myParam: number) { console.log(myParam); }',
                range: new Range(1, 1, 1, Number.MAX_SAFE_INTEGER)
            }]), ([{ range: '[1,15 -> 1,15]', text: 'myParam: number' }, { range: '[1,18 -> 1,18]', text: ' console.log(myParam); ' }]));
    });
    test('computeHumanReadableDiff 3', async () => {
        assert.deepStrictEqual(await testEdits([
            '',
            '',
            '',
            ''
        ], [{
                text: 'function test(myParam: number) { console.log(myParam); }\n\n',
                range: new Range(2, 1, 3, 20)
            }]), ([{ range: '[2,1 -> 2,1]', text: 'function test(myParam: number) { console.log(myParam); }\n' }]));
    });
    test('computeHumanReadableDiff 4', async () => {
        assert.deepStrictEqual(await testEdits([
            'function algorithm() {}',
        ], [{
                text: 'function alm() {}',
                range: new Range(1, 1, 1, Number.MAX_SAFE_INTEGER)
            }]), ([{ range: "[1,10 -> 1,19]", text: "alm" }]));
    });
    test('[Bug] Getting Message "Overlapping ranges are not allowed" and nothing happens with Inline-Chat ', async function () {
        await testEdits(("const API = require('../src/api');\n\ndescribe('API', () => {\n  let api;\n  let database;\n\n  beforeAll(() => {\n    database = {\n      getAllBooks: jest.fn(),\n      getBooksByAuthor: jest.fn(),\n      getBooksByTitle: jest.fn(),\n    };\n    api = new API(database);\n  });\n\n  describe('GET /books', () => {\n    it('should return all books', async () => {\n      const mockBooks = [{ title: 'Book 1' }, { title: 'Book 2' }];\n      database.getAllBooks.mockResolvedValue(mockBooks);\n\n      const req = {};\n      const res = {\n        json: jest.fn(),\n      };\n\n      await api.register({\n        get: (path, handler) => {\n          if (path === '/books') {\n            handler(req, res);\n          }\n        },\n      });\n\n      expect(database.getAllBooks).toHaveBeenCalled();\n      expect(res.json).toHaveBeenCalledWith(mockBooks);\n    });\n  });\n\n  describe('GET /books/author/:author', () => {\n    it('should return books by author', async () => {\n      const mockAuthor = 'John Doe';\n      const mockBooks = [{ title: 'Book 1', author: mockAuthor }, { title: 'Book 2', author: mockAuthor }];\n      database.getBooksByAuthor.mockResolvedValue(mockBooks);\n\n      const req = {\n        params: {\n          author: mockAuthor,\n        },\n      };\n      const res = {\n        json: jest.fn(),\n      };\n\n      await api.register({\n        get: (path, handler) => {\n          if (path === `/books/author/${mockAuthor}`) {\n            handler(req, res);\n          }\n        },\n      });\n\n      expect(database.getBooksByAuthor).toHaveBeenCalledWith(mockAuthor);\n      expect(res.json).toHaveBeenCalledWith(mockBooks);\n    });\n  });\n\n  describe('GET /books/title/:title', () => {\n    it('should return books by title', async () => {\n      const mockTitle = 'Book 1';\n      const mockBooks = [{ title: mockTitle, author: 'John Doe' }];\n      database.getBooksByTitle.mockResolvedValue(mockBooks);\n\n      const req = {\n        params: {\n          title: mockTitle,\n        },\n      };\n      const res = {\n        json: jest.fn(),\n      };\n\n      await api.register({\n        get: (path, handler) => {\n          if (path === `/books/title/${mockTitle}`) {\n            handler(req, res);\n          }\n        },\n      });\n\n      expect(database.getBooksByTitle).toHaveBeenCalledWith(mockTitle);\n      expect(res.json).toHaveBeenCalledWith(mockBooks);\n    });\n  });\n});\n").split('\n'), [{
                range: { startLineNumber: 1, startColumn: 1, endLineNumber: 96, endColumn: 1 },
                text: `const request = require('supertest');\nconst API = require('../src/api');\n\ndescribe('API', () => {\n  let api;\n  let database;\n\n  beforeAll(() => {\n    database = {\n      getAllBooks: jest.fn(),\n      getBooksByAuthor: jest.fn(),\n      getBooksByTitle: jest.fn(),\n    };\n    api = new API(database);\n  });\n\n  describe('GET /books', () => {\n    it('should return all books', async () => {\n      const mockBooks = [{ title: 'Book 1' }, { title: 'Book 2' }];\n      database.getAllBooks.mockResolvedValue(mockBooks);\n\n      const response = await request(api.app).get('/books');\n\n      expect(database.getAllBooks).toHaveBeenCalled();\n      expect(response.status).toBe(200);\n      expect(response.body).toEqual(mockBooks);\n    });\n  });\n\n  describe('GET /books/author/:author', () => {\n    it('should return books by author', async () => {\n      const mockAuthor = 'John Doe';\n      const mockBooks = [{ title: 'Book 1', author: mockAuthor }, { title: 'Book 2', author: mockAuthor }];\n      database.getBooksByAuthor.mockResolvedValue(mockBooks);\n\n      const response = await request(api.app).get(\`/books/author/\${mockAuthor}\`);\n\n      expect(database.getBooksByAuthor).toHaveBeenCalledWith(mockAuthor);\n      expect(response.status).toBe(200);\n      expect(response.body).toEqual(mockBooks);\n    });\n  });\n\n  describe('GET /books/title/:title', () => {\n    it('should return books by title', async () => {\n      const mockTitle = 'Book 1';\n      const mockBooks = [{ title: mockTitle, author: 'John Doe' }];\n      database.getBooksByTitle.mockResolvedValue(mockBooks);\n\n      const response = await request(api.app).get(\`/books/title/\${mockTitle}\`);\n\n      expect(database.getBooksByTitle).toHaveBeenCalledWith(mockTitle);\n      expect(response.status).toBe(200);\n      expect(response.body).toEqual(mockBooks);\n    });\n  });\n});\n`,
            }]);
    });
    test('ICommonModel#getValueInRange, issue #17424', function () {
        const model = worker.addModel([
            'package main', // 1
            'func foo() {', // 2
            '}' // 3
        ]);
        const value = model.getValueInRange({ startLineNumber: 3, startColumn: 1, endLineNumber: 4, endColumn: 1 });
        assert.strictEqual(value, '}');
    });
    test('textualSuggest, issue #17785', function () {
        const model = worker.addModel([
            'foobar', // 1
            'f f' // 2
        ]);
        return worker.$textualSuggest([model.uri.toString()], 'f', '[a-z]+', 'img').then((result) => {
            if (!result) {
                assert.ok(false);
            }
            assert.strictEqual(result.words.length, 1);
            assert.strictEqual(typeof result.duration, 'number');
            assert.strictEqual(result.words[0], 'foobar');
        });
    });
    test('get words via iterator, issue #46930', function () {
        const model = worker.addModel([
            'one line', // 1
            'two line', // 2
            '',
            'past empty',
            'single',
            '',
            'and now we are done'
        ]);
        const words = [...model.words(/[a-z]+/img)];
        assert.deepStrictEqual(words, ['one', 'line', 'two', 'line', 'past', 'empty', 'single', 'and', 'now', 'we', 'are', 'done']);
    });
});
function applyEdits(text, edits) {
    const transformer = new PositionOffsetTransformer(text);
    const offsetEdits = edits.map(e => {
        const range = Range.lift(e.range);
        return ({
            startOffset: transformer.getOffset(range.getStartPosition()),
            endOffset: transformer.getOffset(range.getEndPosition()),
            text: e.text
        });
    });
    offsetEdits.sort((a, b) => b.startOffset - a.startOffset);
    for (const edit of offsetEdits) {
        text = text.substring(0, edit.startOffset) + edit.text + text.substring(edit.endOffset);
    }
    return text;
}
class PositionOffsetTransformer {
    constructor(text) {
        this.text = text;
        this.lineStartOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
            }
        }
        this.lineStartOffsetByLineIdx.push(text.length + 1);
    }
    getOffset(position) {
        const maxLineOffset = position.lineNumber >= this.lineStartOffsetByLineIdx.length ? this.text.length : (this.lineStartOffsetByLineIdx[position.lineNumber] - 1);
        return Math.min(this.lineStartOffsetByLineIdx[position.lineNumber - 1] + position.column - 1, maxLineOffset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2ViV29ya2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL2VkaXRvcldlYldvcmtlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzNFLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFFN0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLGdCQUFpQixTQUFRLFlBQVk7UUFFMUMsUUFBUSxDQUFDLEdBQVc7WUFDbkIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFFRCxRQUFRLENBQUMsS0FBZSxFQUFFLE1BQWMsSUFBSTtZQUMzQyxNQUFNLEdBQUcsR0FBRyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxlQUFlLENBQUM7Z0JBQ3BCLEdBQUcsRUFBRSxHQUFHO2dCQUNSLFNBQVMsRUFBRSxDQUFDO2dCQUNaLEtBQUssRUFBRSxLQUFLO2dCQUNaLEdBQUcsRUFBRSxHQUFHO2FBQ1IsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBRSxDQUFDO1FBQzdCLENBQUM7S0FDRDtJQUVELElBQUksTUFBd0IsQ0FBQztJQUM3QixJQUFJLEtBQW1CLENBQUM7SUFFeEIsS0FBSyxDQUFDLEdB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