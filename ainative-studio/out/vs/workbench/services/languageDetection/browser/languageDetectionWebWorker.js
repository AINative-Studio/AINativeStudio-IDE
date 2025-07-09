/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../amdX.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { LanguageDetectionWorkerHost } from './languageDetectionWorker.protocol.js';
import { WorkerTextModelSyncServer } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
export function create(workerServer) {
    return new LanguageDetectionWorker(workerServer);
}
/**
 * @internal
 */
export class LanguageDetectionWorker {
    static { this.expectedRelativeConfidence = 0.2; }
    static { this.positiveConfidenceCorrectionBucket1 = 0.05; }
    static { this.positiveConfidenceCorrectionBucket2 = 0.025; }
    static { this.negativeConfidenceCorrection = 0.5; }
    constructor(workerServer) {
        this._workerTextModelSyncServer = new WorkerTextModelSyncServer();
        this._regexpLoadFailed = false;
        this._loadFailed = false;
        this.modelIdToCoreId = new Map();
        this._host = LanguageDetectionWorkerHost.getChannel(workerServer);
        this._workerTextModelSyncServer.bindToServer(workerServer);
    }
    async $detectLanguage(uri, langBiases, preferHistory, supportedLangs) {
        const languages = [];
        const confidences = [];
        const stopWatch = new StopWatch();
        const documentTextSample = this.getTextForDetection(uri);
        if (!documentTextSample) {
            return;
        }
        const neuralResolver = async () => {
            for await (const language of this.detectLanguagesImpl(documentTextSample)) {
                if (!this.modelIdToCoreId.has(language.languageId)) {
                    this.modelIdToCoreId.set(language.languageId, await this._host.$getLanguageId(language.languageId));
                }
                const coreId = this.modelIdToCoreId.get(language.languageId);
                if (coreId && (!supportedLangs?.length || supportedLangs.includes(coreId))) {
                    languages.push(coreId);
                    confidences.push(language.confidence);
                }
            }
            stopWatch.stop();
            if (languages.length) {
                this._host.$sendTelemetryEvent(languages, confidences, stopWatch.elapsed());
                return languages[0];
            }
            return undefined;
        };
        const historicalResolver = async () => this.runRegexpModel(documentTextSample, langBiases ?? {}, supportedLangs);
        if (preferHistory) {
            const history = await historicalResolver();
            if (history) {
                return history;
            }
            const neural = await neuralResolver();
            if (neural) {
                return neural;
            }
        }
        else {
            const neural = await neuralResolver();
            if (neural) {
                return neural;
            }
            const history = await historicalResolver();
            if (history) {
                return history;
            }
        }
        return undefined;
    }
    getTextForDetection(uri) {
        const editorModel = this._workerTextModelSyncServer.getModel(uri);
        if (!editorModel) {
            return;
        }
        const end = editorModel.positionAt(10000);
        const content = editorModel.getValueInRange({
            startColumn: 1,
            startLineNumber: 1,
            endColumn: end.column,
            endLineNumber: end.lineNumber
        });
        return content;
    }
    async getRegexpModel() {
        if (this._regexpLoadFailed) {
            return;
        }
        if (this._regexpModel) {
            return this._regexpModel;
        }
        const uri = await this._host.$getRegexpModelUri();
        try {
            this._regexpModel = await importAMDNodeModule(uri, '');
            return this._regexpModel;
        }
        catch (e) {
            this._regexpLoadFailed = true;
            // console.warn('error loading language detection model', e);
            return;
        }
    }
    async runRegexpModel(content, langBiases, supportedLangs) {
        const regexpModel = await this.getRegexpModel();
        if (!regexpModel) {
            return;
        }
        if (supportedLangs?.length) {
            // When using supportedLangs, normally computed biases are too extreme. Just use a "bitmask" of sorts.
            for (const lang of Object.keys(langBiases)) {
                if (supportedLangs.includes(lang)) {
                    langBiases[lang] = 1;
                }
                else {
                    langBiases[lang] = 0;
                }
            }
        }
        const detected = regexpModel.detect(content, langBiases, supportedLangs);
        return detected;
    }
    async getModelOperations() {
        if (this._modelOperations) {
            return this._modelOperations;
        }
        const uri = await this._host.$getIndexJsUri();
        const { ModelOperations } = await importAMDNodeModule(uri, '');
        this._modelOperations = new ModelOperations({
            modelJsonLoaderFunc: async () => {
                const response = await fetch(await this._host.$getModelJsonUri());
                try {
                    const modelJSON = await response.json();
                    return modelJSON;
                }
                catch (e) {
                    const message = `Failed to parse model JSON.`;
                    throw new Error(message);
                }
            },
            weightsLoaderFunc: async () => {
                const response = await fetch(await this._host.$getWeightsUri());
                const buffer = await response.arrayBuffer();
                return buffer;
            }
        });
        return this._modelOperations;
    }
    // This adjusts the language confidence scores to be more accurate based on:
    // * VS Code's language usage
    // * Languages with 'problematic' syntaxes that have caused incorrect language detection
    adjustLanguageConfidence(modelResult) {
        switch (modelResult.languageId) {
            // For the following languages, we increase the confidence because
            // these are commonly used languages in VS Code and supported
            // by the model.
            case 'js':
            case 'html':
            case 'json':
            case 'ts':
            case 'css':
            case 'py':
            case 'xml':
            case 'php':
                modelResult.confidence += LanguageDetectionWorker.positiveConfidenceCorrectionBucket1;
                break;
            // case 'yaml': // YAML has been know to cause incorrect language detection because the language is pretty simple. We don't want to increase the confidence for this.
            case 'cpp':
            case 'sh':
            case 'java':
            case 'cs':
            case 'c':
                modelResult.confidence += LanguageDetectionWorker.positiveConfidenceCorrectionBucket2;
                break;
            // For the following languages, we need to be extra confident that the language is correct because
            // we've had issues like #131912 that caused incorrect guesses. To enforce this, we subtract the
            // negativeConfidenceCorrection from the confidence.
            // languages that are provided by default in VS Code
            case 'bat':
            case 'ini':
            case 'makefile':
            case 'sql':
            // languages that aren't provided by default in VS Code
            case 'csv':
            case 'toml':
                // Other considerations for negativeConfidenceCorrection that
                // aren't built in but suported by the model include:
                // * Assembly, TeX - These languages didn't have clear language modes in the community
                // * Markdown, Dockerfile - These languages are simple but they embed other languages
                modelResult.confidence -= LanguageDetectionWorker.negativeConfidenceCorrection;
                break;
            default:
                break;
        }
        return modelResult;
    }
    async *detectLanguagesImpl(content) {
        if (this._loadFailed) {
            return;
        }
        let modelOperations;
        try {
            modelOperations = await this.getModelOperations();
        }
        catch (e) {
            console.log(e);
            this._loadFailed = true;
            return;
        }
        let modelResults;
        try {
            modelResults = await modelOperations.runModel(content);
        }
        catch (e) {
            console.warn(e);
        }
        if (!modelResults
            || modelResults.length === 0
            || modelResults[0].confidence < LanguageDetectionWorker.expectedRelativeConfidence) {
            return;
        }
        const firstModelResult = this.adjustLanguageConfidence(modelResults[0]);
        if (firstModelResult.confidence < LanguageDetectionWorker.expectedRelativeConfidence) {
            return;
        }
        const possibleLanguages = [firstModelResult];
        for (let current of modelResults) {
            if (current === firstModelResult) {
                continue;
            }
            current = this.adjustLanguageConfidence(current);
            const currentHighest = possibleLanguages[possibleLanguages.length - 1];
            if (currentHighest.confidence - current.confidence >= LanguageDetectionWorker.expectedRelativeConfidence) {
                while (possibleLanguages.length) {
                    yield possibleLanguages.shift();
                }
                if (current.confidence > LanguageDetectionWorker.expectedRelativeConfidence) {
                    possibleLanguages.push(current);
                    continue;
                }
                return;
            }
            else {
                if (current.confidence > LanguageDetectionWorker.expectedRelativeConfidence) {
                    possibleLanguages.push(current);
                    continue;
                }
                return;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25XZWJXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xhbmd1YWdlRGV0ZWN0aW9uL2Jyb3dzZXIvbGFuZ3VhZ2VEZXRlY3Rpb25XZWJXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSwyQkFBMkIsRUFBNEIsTUFBTSx1Q0FBdUMsQ0FBQztBQUM5RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUluSCxNQUFNLFVBQVUsTUFBTSxDQUFDLFlBQThCO0lBQ3BELE9BQU8sSUFBSSx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sdUJBQXVCO2FBR1gsK0JBQTBCLEdBQUcsR0FBRyxBQUFOLENBQU87YUFDakMsd0NBQW1DLEdBQUcsSUFBSSxBQUFQLENBQVE7YUFDM0Msd0NBQW1DLEdBQUcsS0FBSyxBQUFSLENBQVM7YUFDNUMsaUNBQTRCLEdBQUcsR0FBRyxBQUFOLENBQU87SUFhM0QsWUFBWSxZQUE4QjtRQVh6QiwrQkFBMEIsR0FBRyxJQUFJLHlCQUF5QixFQUFFLENBQUM7UUFJdEUsc0JBQWlCLEdBQVksS0FBSyxDQUFDO1FBR25DLGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBRTdCLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7UUFHL0QsSUFBSSxDQUFDLEtBQUssR0FBRywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENB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