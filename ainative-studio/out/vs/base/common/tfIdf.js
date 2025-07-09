/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function countMapFrom(values) {
    const map = new Map();
    for (const value of values) {
        map.set(value, (map.get(value) ?? 0) + 1);
    }
    return map;
}
/**
 * Implementation of tf-idf (term frequency-inverse document frequency) for a set of
 * documents where each document contains one or more chunks of text.
 * Each document is identified by a key, and the score for each document is computed
 * by taking the max score over all the chunks in the document.
 */
export class TfIdfCalculator {
    constructor() {
        /**
         * Total number of chunks
         */
        this.chunkCount = 0;
        this.chunkOccurrences = new Map();
        this.documents = new Map();
    }
    calculateScores(query, token) {
        const embedding = this.computeEmbedding(query);
        const idfCache = new Map();
        const scores = [];
        // For each document, generate one score
        for (const [key, doc] of this.documents) {
            if (token.isCancellationRequested) {
                return [];
            }
            for (const chunk of doc.chunks) {
                const score = this.computeSimilarityScore(chunk, embedding, idfCache);
                if (score > 0) {
                    scores.push({ key, score });
                }
            }
        }
        return scores;
    }
    /**
     * Count how many times each term (word) appears in a string.
     */
    static termFrequencies(input) {
        return countMapFrom(TfIdfCalculator.splitTerms(input));
    }
    /**
     * Break a string into terms (words).
     */
    static *splitTerms(input) {
        const normalize = (word) => word.toLowerCase();
        // Only match on words that are at least 3 characters long and start with a letter
        for (const [word] of input.matchAll(/\b\p{Letter}[\p{Letter}\d]{2,}\b/gu)) {
            yield normalize(word);
            const camelParts = word.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/g);
            if (camelParts.length > 1) {
                for (const part of camelParts) {
                    // Require at least 3 letters in the parts of a camel case word
                    if (part.length > 2 && /\p{Letter}{3,}/gu.test(part)) {
                        yield normalize(part);
                    }
                }
            }
        }
    }
    updateDocuments(documents) {
        for (const { key } of documents) {
            this.deleteDocument(key);
        }
        for (const doc of documents) {
            const chunks = [];
            for (const text of doc.textChunks) {
                // TODO: See if we can compute the tf lazily
                // The challenge is that we need to also update the `chunkOccurrences`
                // and all of those updates need to get flushed before the real TF-IDF of
                // anything is computed.
                const tf = TfIdfCalculator.termFrequencies(text);
                // Update occurrences list
                for (const term of tf.keys()) {
                    this.chunkOccurrences.set(term, (this.chunkOccurrences.get(term) ?? 0) + 1);
                }
                chunks.push({ text, tf });
            }
            this.chunkCount += chunks.length;
            this.documents.set(doc.key, { chunks });
        }
        return this;
    }
    deleteDocument(key) {
        const doc = this.documents.get(key);
        if (!doc) {
            return;
        }
        this.documents.delete(key);
        this.chunkCount -= doc.chunks.length;
        // Update term occurrences for the document
        for (const chunk of doc.chunks) {
            for (const term of chunk.tf.keys()) {
                const currentOccurrences = this.chunkOccurrences.get(term);
                if (typeof currentOccurrences === 'number') {
                    const newOccurrences = currentOccurrences - 1;
                    if (newOccurrences <= 0) {
                        this.chunkOccurrences.delete(term);
                    }
                    else {
                        this.chunkOccurrences.set(term, newOccurrences);
                    }
                }
            }
        }
    }
    computeSimilarityScore(chunk, queryEmbedding, idfCache) {
        // Compute the dot product between the chunk's embedding and the query embedding
        // Note that the chunk embedding is computed lazily on a per-term basis.
        // This lets us skip a large number of calculations because the majority
        // of chunks do not share any terms with the query.
        let sum = 0;
        for (const [term, termTfidf] of Object.entries(queryEmbedding)) {
            const chunkTf = chunk.tf.get(term);
            if (!chunkTf) {
                // Term does not appear in chunk so it has no contribution
                continue;
            }
            let chunkIdf = idfCache.get(term);
            if (typeof chunkIdf !== 'number') {
                chunkIdf = this.computeIdf(term);
                idfCache.set(term, chunkIdf);
            }
            const chunkTfidf = chunkTf * chunkIdf;
            sum += chunkTfidf * termTfidf;
        }
        return sum;
    }
    computeEmbedding(input) {
        const tf = TfIdfCalculator.termFrequencies(input);
        return this.computeTfidf(tf);
    }
    computeIdf(term) {
        const chunkOccurrences = this.chunkOccurrences.get(term) ?? 0;
        return chunkOccurrences > 0
            ? Math.log((this.chunkCount + 1) / chunkOccurrences)
            : 0;
    }
    computeTfidf(termFrequencies) {
        const embedding = Object.create(null);
        for (const [word, occurrences] of termFrequencies) {
            const idf = this.computeIdf(word);
            if (idf > 0) {
                embedding[word] = occurrences * idf;
            }
        }
        return embedding;
    }
}
/**
 * Normalize the scores to be between 0 and 1 and sort them decending.
 * @param scores array of scores from {@link TfIdfCalculator.calculateScores}
 * @returns normalized scores
 */
export function normalizeTfIdfScores(scores) {
    // copy of scores
    const result = scores.slice(0);
    // sort descending
    result.sort((a, b) => b.score - a.score);
    // normalize
    const max = result[0]?.score ?? 0;
    if (max > 0) {
        for (const score of result) {
            score.score /= max;
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdGZJZGYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsU0FBUyxZQUFZLENBQUksTUFBbUI7SUFDM0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztJQUNqQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBNEJEOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFBNUI7UUFtREM7O1dBRUc7UUFDSyxlQUFVLEdBQUcsQ0FBQyxDQUFDO1FBRU4scUJBQWdCLEdBQXdCLElBQUksR0FBRyxFQUFxRCxDQUFDO1FBRXJHLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFFaEMsQ0FBQztJQXdHTixDQUFDO0lBbktBLGVBQWUsQ0FBQyxLQUFhLEVBQUUsS0FBd0I7UUFDdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzNDLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUM7UUFDaEMsd0NBQXdDO1FBQ3hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMs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