/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IntervalTimer } from '../../../../base/common/async.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../core/position.js';
import { Range } from '../../core/range.js';
import { ensureValidWordDefinition, getWordAtText } from '../../core/wordHelper.js';
import { MirrorTextModel as BaseMirrorModel } from '../../model/mirrorTextModel.js';
/**
 * Stop syncing a model to the worker if it was not needed for 1 min.
 */
export const STOP_SYNC_MODEL_DELTA_TIME_MS = 60 * 1000;
export const WORKER_TEXT_MODEL_SYNC_CHANNEL = 'workerTextModelSync';
export class WorkerTextModelSyncClient extends Disposable {
    static create(workerClient, modelService) {
        return new WorkerTextModelSyncClient(workerClient.getChannel(WORKER_TEXT_MODEL_SYNC_CHANNEL), modelService);
    }
    constructor(proxy, modelService, keepIdleModels = false) {
        super();
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
        this._proxy = proxy;
        this._modelService = modelService;
        if (!keepIdleModels) {
            const timer = new IntervalTimer();
            timer.cancelAndSet(() => this._checkStopModelSync(), Math.round(STOP_SYNC_MODEL_DELTA_TIME_MS / 2));
            this._register(timer);
        }
    }
    dispose() {
        for (const modelUrl in this._syncedModels) {
            dispose(this._syncedModels[modelUrl]);
        }
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
        super.dispose();
    }
    ensureSyncedResources(resources, forceLargeModels = false) {
        for (const resource of resources) {
            const resourceStr = resource.toString();
            if (!this._syncedModels[resourceStr]) {
                this._beginModelSync(resource, forceLargeModels);
            }
            if (this._syncedModels[resourceStr]) {
                this._syncedModelsLastUsedTime[resourceStr] = (new Date()).getTime();
            }
        }
    }
    _checkStopModelSync() {
        const currentTime = (new Date()).getTime();
        const toRemove = [];
        for (const modelUrl in this._syncedModelsLastUsedTime) {
            const elapsedTime = currentTime - this._syncedModelsLastUsedTime[modelUrl];
            if (elapsedTime > STOP_SYNC_MODEL_DELTA_TIME_MS) {
                toRemove.push(modelUrl);
            }
        }
        for (const e of toRemove) {
            this._stopModelSync(e);
        }
    }
    _beginModelSync(resource, forceLargeModels) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return;
        }
        if (!forceLargeModels && model.isTooLargeForSyncing()) {
            return;
        }
        const modelUrl = resource.toString();
        this._proxy.$acceptNewModel({
            url: model.uri.toString(),
            lines: model.getLinesContent(),
            EOL: model.getEOL(),
            versionId: model.getVersionId()
        });
        const toDispose = new DisposableStore();
        toDispose.add(model.onDidChangeContent((e) => {
            this._proxy.$acceptModelChanged(modelUrl.toString(), e);
        }));
        toDispose.add(model.onWillDispose(() => {
            this._stopModelSync(modelUrl);
        }));
        toDispose.add(toDisposable(() => {
            this._proxy.$acceptRemovedModel(modelUrl);
        }));
        this._syncedModels[modelUrl] = toDispose;
    }
    _stopModelSync(modelUrl) {
        const toDispose = this._syncedModels[modelUrl];
        delete this._syncedModels[modelUrl];
        delete this._syncedModelsLastUsedTime[modelUrl];
        dispose(toDispose);
    }
}
export class WorkerTextModelSyncServer {
    constructor() {
        this._models = Object.create(null);
    }
    bindToServer(workerServer) {
        workerServer.setChannel(WORKER_TEXT_MODEL_SYNC_CHANNEL, this);
    }
    getModel(uri) {
        return this._models[uri];
    }
    getModels() {
        const all = [];
        Object.keys(this._models).forEach((key) => all.push(this._models[key]));
        return all;
    }
    $acceptNewModel(data) {
        this._models[data.url] = new MirrorModel(URI.parse(data.url), data.lines, data.EOL, data.versionId);
    }
    $acceptModelChanged(uri, e) {
        if (!this._models[uri]) {
            return;
        }
        const model = this._models[uri];
        model.onEvents(e);
    }
    $acceptRemovedModel(uri) {
        if (!this._models[uri]) {
            return;
        }
        delete this._models[uri];
    }
}
export class MirrorModel extends BaseMirrorModel {
    get uri() {
        return this._uri;
    }
    get eol() {
        return this._eol;
    }
    getValue() {
        return this.getText();
    }
    findMatches(regex) {
        const matches = [];
        for (let i = 0; i < this._lines.length; i++) {
            const line = this._lines[i];
            const offsetToAdd = this.offsetAt(new Position(i + 1, 1));
            const iteratorOverMatches = line.matchAll(regex);
            for (const match of iteratorOverMatches) {
                if (match.index || match.index === 0) {
                    match.index = match.index + offsetToAdd;
                }
                matches.push(match);
            }
        }
        return matches;
    }
    getLinesContent() {
        return this._lines.slice(0);
    }
    getLineCount() {
        return this._lines.length;
    }
    getLineContent(lineNumber) {
        return this._lines[lineNumber - 1];
    }
    getWordAtPosition(position, wordDefinition) {
        const wordAtText = getWordAtText(position.column, ensureValidWordDefinition(wordDefinition), this._lines[position.lineNumber - 1], 0);
        if (wordAtText) {
            return new Range(position.lineNumber, wordAtText.startColumn, position.lineNumber, wordAtText.endColumn);
        }
        return null;
    }
    getWordUntilPosition(position, wordDefinition) {
        const wordAtPosition = this.getWordAtPosition(position, wordDefinition);
        if (!wordAtPosition) {
            return {
                word: '',
                startColumn: position.column,
                endColumn: position.column
            };
        }
        return {
            word: this._lines[position.lineNumber - 1].substring(wordAtPosition.startColumn - 1, position.column - 1),
            startColumn: wordAtPosition.startColumn,
            endColumn: position.column
        };
    }
    words(wordDefinition) {
        const lines = this._lines;
        const wordenize = this._wordenize.bind(this);
        let lineNumber = 0;
        let lineText = '';
        let wordRangesIdx = 0;
        let wordRanges = [];
        return {
            *[Symbol.iterator]() {
                while (true) {
                    if (wordRangesIdx < wordRanges.length) {
                        const value = lineText.substring(wordRanges[wordRangesIdx].start, wordRanges[wordRangesIdx].end);
                        wordRangesIdx += 1;
                        yield value;
                    }
                    else {
                        if (lineNumber < lines.length) {
                            lineText = lines[lineNumber];
                            wordRanges = wordenize(lineText, wordDefinition);
                            wordRangesIdx = 0;
                            lineNumber += 1;
                        }
                        else {
                            break;
                        }
                    }
                }
            }
        };
    }
    getLineWords(lineNumber, wordDefinition) {
        const content = this._lines[lineNumber - 1];
        const ranges = this._wordenize(content, wordDefinition);
        const words = [];
        for (const range of ranges) {
            words.push({
                word: content.substring(range.start, range.end),
                startColumn: range.start + 1,
                endColumn: range.end + 1
            });
        }
        return words;
    }
    _wordenize(content, wordDefinition) {
        const result = [];
        let match;
        wordDefinition.lastIndex = 0; // reset lastIndex just to be sure
        while (match = wordDefinition.exec(content)) {
            if (match[0].length === 0) {
                // it did match the empty string
                break;
            }
            result.push({ start: match.index, end: match.index + match[0].length });
        }
        return result;
    }
    getValueInRange(range) {
        range = this._validateRange(range);
        if (range.startLineNumber === range.endLineNumber) {
            return this._lines[range.startLineNumber - 1].substring(range.startColumn - 1, range.endColumn - 1);
        }
        const lineEnding = this._eol;
        const startLineIndex = range.startLineNumber - 1;
        const endLineIndex = range.endLineNumber - 1;
        const resultLines = [];
        resultLines.push(this._lines[startLineIndex].substring(range.startColumn - 1));
        for (let i = startLineIndex + 1; i < endLineIndex; i++) {
            resultLines.push(this._lines[i]);
        }
        resultLines.push(this._lines[endLineIndex].substring(0, range.endColumn - 1));
        return resultLines.join(lineEnding);
    }
    offsetAt(position) {
        position = this._validatePosition(position);
        this._ensureLineStarts();
        return this._lineStarts.getPrefixSum(position.lineNumber - 2) + (position.column - 1);
    }
    positionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        this._ensureLineStarts();
        const out = this._lineStarts.getIndexOf(offset);
        const lineLength = this._lines[out.index].length;
        // Ensure we return a valid position
        return {
            lineNumber: 1 + out.index,
            column: 1 + Math.min(out.remainder, lineLength)
        };
    }
    _validateRange(range) {
        const start = this._validatePosition({ lineNumber: range.startLineNumber, column: range.startColumn });
        const end = this._validatePosition({ lineNumber: range.endLineNumber, column: range.endColumn });
        if (start.lineNumber !== range.startLineNumber
            || start.column !== range.startColumn
            || end.lineNumber !== range.endLineNumber
            || end.column !== range.endColumn) {
            return {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column
            };
        }
        return range;
    }
    _validatePosition(position) {
        if (!Position.isIPosition(position)) {
            throw new Error('bad position');
        }
        let { lineNumber, column } = position;
        let hasChanged = false;
        if (lineNumber < 1) {
            lineNumber = 1;
            column = 1;
            hasChanged = true;
        }
        else if (lineNumber > this._lines.length) {
            lineNumber = this._lines.length;
            column = this._lines[lineNumber - 1].length + 1;
            hasChanged = true;
        }
        else {
            const maxCharacter = this._lines[lineNumber - 1].length + 1;
            if (column < 1) {
                column = 1;
                hasChanged = true;
            }
            else if (column > maxCharacter) {
                column = maxCharacter;
                hasChanged = true;
            }
        }
        if (!hasChanged) {
            return position;
        }
        else {
            return { lineNumber, column };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU3luYy5pbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdGV4dE1vZGVsU3luYy90ZXh0TW9kZWxTeW5jLmltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2SCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzdELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsYUFBYSxFQUFtQixNQUFNLDBCQUEwQixDQUFDO0FBR3JHLE9BQU8sRUFBRSxlQUFlLElBQUksZUFBZSxFQUFzQixNQUFNLGdDQUFnQyxDQUFDO0FBS3hHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUV2RCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxxQkFBcUIsQ0FBQztBQUVwRSxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQUVqRCxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQW1DLEVBQUUsWUFBMkI7UUFDcEYsT0FBTyxJQUFJLHlCQUF5QixDQUNuQyxZQUFZLENBQUMsVUFBVSxDQUFvQyw4QkFBOEIsQ0FBQyxFQUMxRixZQUFZLENBQ1osQ0FBQztJQUNILENBQUM7SUFPRCxZQUFZLEtBQXdDLEVBQUUsWUFBMkIsRUFBRSxpQkFBMEIsS0FBSztRQUNqSCxLQUFLLEVBQUUsQ0FBQztRQUpELGtCQUFhLEdBQXdDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekUsOEJBQXlCLEdBQW1DLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFJdkYsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFFbEMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbEMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLDZCQUE2QixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU0scUJBQXFCLENBQUMsU0FBZ0IsRUFBRSxtQkFBNEIsS0FBSztRQUMvRSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUV4QyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xELENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7UUFDOUIsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUN2RCxNQUFNLFdBQVcsR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNFLElBQUksV0FBVyxHQUFHLDZCQUE2QixFQUFFLENBQUM7Z0JBQ2pELFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsUUFBYSxFQUFFLGdCQUF5QjtRQUMvRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRXJDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO1lBQzNCLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTtZQUN6QixLQUFLLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRTtZQUM5QixHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUNuQixTQUFTLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRTtTQUMvQixDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3hDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDO0lBQzFDLENBQUM7SUFFTyxjQUFjLENBQUMsUUFBZ0I7UUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFJckM7UUFDQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLFlBQVksQ0FBQyxZQUE4QjtRQUNqRCxZQUFZLENBQUMsVUFBVSxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFTSxRQUFRLENBQUMsR0FBVztRQUMxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVNLFNBQVM7UUFDZixNQUFNLEdBQUcsR0FBa0IsRUFBRSxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RSxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxlQUFlLENBQUMsSUFBbUI7UUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsR0FBVyxFQUFFLENBQXFCO1FBQ3JELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkIsQ0FBQztJQUVELG1CQUFtQixDQUFDLEdBQVc7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sV0FBWSxTQUFRLGVBQWU7SUFFL0MsSUFBVyxHQUFHO1FBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFXLEdBQUc7UUFDYixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU0sV0FBVyxDQUFDLEtBQWE7UUFDL0IsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ25CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pELEtBQUssTUFBTSxLQUFLLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3RDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUM7Z0JBQ3pDLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTSxlQUFlO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUMzQixDQUFDO0lBRU0sY0FBYyxDQUFDLFVBQWtCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFFBQW1CLEVBQUUsY0FBc0I7UUFFbkUsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUMvQixRQUFRLENBQUMsTUFBTSxFQUNmLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxFQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQ3BDLENBQUMsQ0FDRCxDQUFDO1FBRUYsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxRyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sb0JBQW9CLENBQUMsUUFBbUIsRUFBRSxjQUFzQjtRQUN0RSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPO2dCQUNOLElBQUksRUFBRSxFQUFFO2dCQUNSLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTTtnQkFDNUIsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQzFCLENBQUM7UUFDSCxDQUFDO1FBQ0QsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3pHLFdBQVcsRUFBRSxjQUFjLENBQUMsV0FBVztZQUN2QyxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU07U0FDMUIsQ0FBQztJQUNILENBQUM7SUFHTSxLQUFLLENBQUMsY0FBc0I7UUFFbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3QyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN0QixJQUFJLFVBQVUsR0FBaUIsRUFBRSxDQUFDO1FBRWxDLE9BQU87WUFDTixDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztnQkFDakIsT0FBTyxJQUFJLEVBQUUsQ0FBQztvQkFDYixJQUFJLGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2pHLGFBQWEsSUFBSSxDQUFDLENBQUM7d0JBQ25CLE1BQU0sS0FBSyxDQUFDO29CQUNiLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7NEJBQy9CLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7NEJBQzdCLFVBQVUsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDOzRCQUNqRCxhQUFhLEdBQUcsQ0FBQyxDQUFDOzRCQUNsQixVQUFVLElBQUksQ0FBQyxDQUFDO3dCQUNqQixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsTUFBTTt3QkFDUCxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVNLFlBQVksQ0FBQyxVQUFrQixFQUFFLGNBQXNCO1FBQzdELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sS0FBSyxHQUFzQixFQUFFLENBQUM7UUFDcEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQztnQkFDL0MsV0FBVyxFQUFFLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQztnQkFDNUIsU0FBUyxFQUFFLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQzthQUN4QixDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sVUFBVSxDQUFDLE9BQWUsRUFBRSxjQUFzQjtRQUN6RCxNQUFNLE1BQU0sR0FBaUIsRUFBRSxDQUFDO1FBQ2hDLElBQUksS0FBNkIsQ0FBQztRQUVsQyxjQUFjLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtDQUFrQztRQUVoRSxPQUFPLEtBQUssR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDN0MsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQixnQ0FBZ0M7Z0JBQ2hDLE1BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSxlQUFlLENBQUMsS0FBYTtRQUNuQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQyxJQUFJLEtBQUssQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25ELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQzdCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztRQUVqQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRSxLQUFLLElBQUksQ0FBQyxHQUFHLGNBQWMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hELFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDRCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUUsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxRQUFRLENBQUMsUUFBbUI7UUFDbEMsUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQyxXQUFZLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFTSxVQUFVLENBQUMsTUFBYztRQUMvQixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QixNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRWpELG9DQUFvQztRQUNwQyxPQUFPO1lBQ04sVUFBVSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSztZQUN6QixNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7U0FDL0MsQ0FBQztJQUNILENBQUM7SUFFTyxjQUFjLENBQUMsS0FBYTtRQUVuQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDdkcsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRWpHLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsZUFBZTtlQUMxQyxLQUFLLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxXQUFXO2VBQ2xDLEdBQUcsQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLGFBQWE7ZUFDdEMsR0FBRyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFFcEMsT0FBTztnQkFDTixlQUFlLEVBQUUsS0FBSyxDQUFDLFVBQVU7Z0JBQ2pDLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTTtnQkFDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxVQUFVO2dCQUM3QixTQUFTLEVBQUUsR0FBRyxDQUFDLE1BQU07YUFDckIsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxRQUFtQjtRQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNELElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDO1FBQ3RDLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztRQUV2QixJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQixVQUFVLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNYLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFbkIsQ0FBQzthQUFNLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUMsVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2hDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2hELFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFbkIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQzVELElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNoQixNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNYLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDbkIsQ0FBQztpQkFDSSxJQUFJLE1BQU0sR0FBRyxZQUFZLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxHQUFHLFlBQVksQ0FBQztnQkFDdEIsVUFBVSxHQUFHLElBQUksQ0FBQztZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9