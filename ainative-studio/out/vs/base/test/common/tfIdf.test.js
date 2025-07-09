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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3RmSWRmLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQTZCLE1BQU0sdUJBQXVCLENBQUM7QUFDbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFOzs7O0dBSUc7QUFDSCxTQUFTLFNBQVMsQ0FBSSxHQUFRO0lBQzdCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN0QixPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQVUsRUFBRSxDQUFDO0lBRXpCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxD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