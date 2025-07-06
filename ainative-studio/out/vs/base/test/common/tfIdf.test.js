/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../common/cancellation.js';
import { TfIdfCalculator } from '../../common/tfIdf.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
/**
 * Generates all permutations of an array.
 *
 * This is useful for testing to make sure order does not effect the result.
 */
function permutate(arr) {
    if (arr.length === 0) {
        return [[]];
    }
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const permutationsRest = permutate(rest);
        for (let j = 0; j < permutationsRest.length; j++) {
            result.push([arr[i], ...permutationsRest[j]]);
        }
    }
    return result;
}
function assertScoreOrdersEqual(actualScores, expectedScoreKeys) {
    actualScores.sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key));
    assert.strictEqual(actualScores.length, expectedScoreKeys.length);
    for (let i = 0; i < expectedScoreKeys.length; i++) {
        assert.strictEqual(actualScores[i].key, expectedScoreKeys[i]);
    }
}
suite('TF-IDF Calculator', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Should return no scores when no documents are given', () => {
        const tfidf = new TfIdfCalculator();
        const scores = tfidf.calculateScores('something', CancellationToken.None);
        assertScoreOrdersEqual(scores, []);
    });
    test('Should return no scores for term not in document', () => {
        const tfidf = new TfIdfCalculator().updateDocuments([
            makeDocument('A', 'cat dog fish'),
        ]);
        const scores = tfidf.calculateScores('elepant', CancellationToken.None);
        assertScoreOrdersEqual(scores, []);
    });
    test('Should return scores for document with exact match', () => {
        for (const docs of permutate([
            makeDocument('A', 'cat dog cat'),
            makeDocument('B', 'cat fish'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['A']);
        }
    });
    test('Should return document with more matches first', () => {
        for (const docs of permutate([
            makeDocument('/A', 'cat dog cat'),
            makeDocument('/B', 'cat fish'),
            makeDocument('/C', 'frog'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B']);
        }
    });
    test('Should return document with more matches first when term appears in all documents', () => {
        for (const docs of permutate([
            makeDocument('/A', 'cat dog cat cat'),
            makeDocument('/B', 'cat fish'),
            makeDocument('/C', 'frog cat cat'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/C', '/B']);
        }
    });
    test('Should weigh less common term higher', () => {
        for (const docs of permutate([
            makeDocument('/A', 'cat dog cat'),
            makeDocument('/B', 'fish'),
            makeDocument('/C', 'cat cat cat cat'),
            makeDocument('/D', 'cat fish')
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat the dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/C', '/D']);
        }
    });
    test('Should weigh chunks with less common terms higher', () => {
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog'])
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/B', '/A']);
        }
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog'])
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B', '/B']);
        }
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog'])
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat the dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/B', '/A', '/B']);
        }
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog'])
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('lake fish', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A']);
        }
    });
    test('Should ignore case and punctuation', () => {
        for (const docs of permutate([
            makeDocument('/A', 'Cat doG.cat'),
            makeDocument('/B', 'cAt fiSH'),
            makeDocument('/C', 'frOg'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('. ,CaT!  ', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B']);
        }
    });
    test('Should match on camelCase words', () => {
        for (const docs of permutate([
            makeDocument('/A', 'catDog cat'),
            makeDocument('/B', 'fishCatFish'),
            makeDocument('/C', 'frogcat'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('catDOG', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B']);
        }
    });
    test('Should not match document after delete', () => {
        const docA = makeDocument('/A', 'cat dog cat');
        const docB = makeDocument('/B', 'cat fish');
        const docC = makeDocument('/C', 'frog');
        const tfidf = new TfIdfCalculator().updateDocuments([docA, docB, docC]);
        let scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, ['/A', '/B']);
        tfidf.deleteDocument(docA.key);
        scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, ['/B']);
        tfidf.deleteDocument(docC.key);
        scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, ['/B']);
        tfidf.deleteDocument(docB.key);
        scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, []);
    });
});
function makeDocument(key, content) {
    return {
        key,
        textChunks: Array.isArray(content) ? content : [content],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi90ZklkZi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUE2QixNQUFNLHVCQUF1QixDQUFDO0FBQ25GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRTs7OztHQUlHO0FBQ0gsU0FBUyxTQUFTLENBQUksR0FBUTtJQUM3QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztJQUV6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxJQUFJLENB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