/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { FileAccess } from '../../../../base/common/network.js';
import { EDITOR_EXPERIMENTAL_PREFER_TREESITTER, ITreeSitterImporter, TREESITTER_ALLOWED_SUPPORT } from '../treeSitterParserService.js';
import { IModelService } from '../model.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Emitter } from '../../../../base/common/event.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { TextModelTreeSitter } from './textModelTreeSitter.js';
import { getModuleLocation, TreeSitterLanguages } from './treeSitterLanguages.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
const EDITOR_TREESITTER_TELEMETRY = 'editor.experimental.treeSitterTelemetry';
const FILENAME_TREESITTER_WASM = `tree-sitter.wasm`;
let TreeSitterTextModelService = class TreeSitterTextModelService extends Disposable {
    constructor(_modelService, fileService, _configurationService, _environmentService, _treeSitterImporter, _instantiationService) {
        super();
        this._modelService = _modelService;
        this._configurationService = _configurationService;
        this._environmentService = _environmentService;
        this._treeSitterImporter = _treeSitterImporter;
        this._instantiationService = _instantiationService;
        this._textModelTreeSitters = this._register(new DisposableMap());
        this._registeredLanguages = new Map();
        this._onDidUpdateTree = this._register(new Emitter());
        this.onDidUpdateTree = this._onDidUpdateTree.event;
        this.isTest = false;
        this._hasInit = false;
        this._treeSitterLanguages = this._register(new TreeSitterLanguages(this._treeSitterImporter, fileService, this._environmentService, this._registeredLanguages));
        this.onDidAddLanguage = this._treeSitterLanguages.onDidAddLanguage;
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(EDITOR_EXPERIMENTAL_PREFER_TREESITTER)) {
                this._supportedLanguagesChanged();
            }
        }));
        this._supportedLanguagesChanged();
    }
    getOrInitLanguage(languageId) {
        return this._treeSitterLanguages.getOrInitLanguage(languageId);
    }
    getParseResult(textModel) {
        const textModelTreeSitter = this._textModelTreeSitters.get(textModel);
        return textModelTreeSitter?.textModelTreeSitter;
    }
    /**
     * For testing
     */
    async getTree(content, languageId) {
        const language = await this.getLanguage(languageId);
        const Parser = await this._treeSitterImporter.getParserClass();
        if (language) {
            const parser = new Parser();
            parser.setLanguage(language);
            return parser.parse(content) ?? undefined;
        }
        return undefined;
    }
    getTreeSync(content, languageId) {
        const language = this.getOrInitLanguage(languageId);
        const Parser = this._treeSitterImporter.parserClass;
        if (language && Parser) {
            const parser = new Parser();
            parser.setLanguage(language);
            return parser.parse(content) ?? undefined;
        }
        return undefined;
    }
    async getLanguage(languageId) {
        await this._init;
        return this._treeSitterLanguages.getLanguage(languageId);
    }
    async _doInitParser() {
        const Parser = await this._treeSitterImporter.getParserClass();
        const environmentService = this._environmentService;
        const isTest = this.isTest;
        await Parser.init({
            locateFile(_file, _folder) {
                const location = `${getModuleLocation(environmentService)}/${FILENAME_TREESITTER_WASM}`;
                if (isTest) {
                    return FileAccess.asFileUri(location).toString(true);
                }
                else {
                    return FileAccess.asBrowserUri(location).toString(true);
                }
            }
        });
        return true;
    }
    async _initParser(hasLanguages) {
        if (this._hasInit) {
            return this._init;
        }
        if (hasLanguages) {
            this._hasInit = true;
            this._init = this._doInitParser();
            // New init, we need to deal with all the existing text models and set up listeners
            this._init.then(() => this._registerModelServiceListeners());
        }
        else {
            this._init = Promise.resolve(false);
        }
        return this._init;
    }
    async _supportedLanguagesChanged() {
        let hasLanguages = false;
        const handleLanguage = (languageId) => {
            if (this._getSetting(languageId)) {
                hasLanguages = true;
                this._addGrammar(languageId, `tree-sitter-${languageId}`);
            }
            else {
                this._removeGrammar(languageId);
            }
        };
        // Eventually, this should actually use an extension point to add tree sitter grammars, but for now they are hard coded in core
        for (const languageId of TREESITTER_ALLOWED_SUPPORT) {
            handleLanguage(languageId);
        }
        return this._initParser(hasLanguages);
    }
    _getSetting(languageId) {
        const setting = this._configurationService.getValue(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${languageId}`);
        if (!setting && TREESITTER_ALLOWED_SUPPORT.includes(languageId)) {
            return this._configurationService.getValue(EDITOR_TREESITTER_TELEMETRY);
        }
        return setting;
    }
    async _registerModelServiceListeners() {
        this._register(this._modelService.onModelAdded(model => {
            this._createTextModelTreeSitter(model);
        }));
        this._register(this._modelService.onModelRemoved(model => {
            this._textModelTreeSitters.deleteAndDispose(model);
        }));
        this._modelService.getModels().forEach(model => this._createTextModelTreeSitter(model));
    }
    async getTextModelTreeSitter(model, parseImmediately = false) {
        await this.getLanguage(model.getLanguageId());
        return this._createTextModelTreeSitter(model, parseImmediately);
    }
    _createTextModelTreeSitter(model, parseImmediately = true) {
        const textModelTreeSitter = this._instantiationService.createInstance(TextModelTreeSitter, model, this._treeSitterLanguages, parseImmediately);
        const disposables = new DisposableStore();
        disposables.add(textModelTreeSitter);
        disposables.add(textModelTreeSitter.onDidChangeParseResult((e) => this._handleOnDidChangeParseResult(e, model)));
        this._textModelTreeSitters.set(model, {
            textModelTreeSitter,
            disposables,
            dispose: disposables.dispose.bind(disposables)
        });
        return textModelTreeSitter;
    }
    _handleOnDidChangeParseResult(change, model) {
        this._onDidUpdateTree.fire({ textModel: model, ranges: change.ranges, versionId: change.versionId, tree: change.tree, languageId: change.languageId, hasInjections: change.hasInjections });
    }
    _addGrammar(languageId, grammarName) {
        if (!this._registeredLanguages.has(languageId)) {
            this._registeredLanguages.set(languageId, grammarName);
        }
    }
    _removeGrammar(languageId) {
        if (this._registeredLanguages.has(languageId)) {
            this._registeredLanguages.delete(languageId);
        }
    }
};
TreeSitterTextModelService = __decorate([
    __param(0, IModelService),
    __param(1, IFileService),
    __param(2, IConfigurationService),
    __param(3, IEnvironmentService),
    __param(4, ITreeSitterImporter),
    __param(5, IInstantiationService)
], TreeSitterTextModelService);
export { TreeSitterTextModelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy90cmVlU2l0dGVyL3RyZWVTaXR0ZXJQYXJzZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFFLHFDQUFxQyxFQUFtRSxtQkFBbUIsRUFBRSwwQkFBMEIsRUFBd0IsTUFBTSwrQkFBK0IsQ0FBQztBQUM5TixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUEyQixNQUFNLDBCQUEwQixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE1BQU0sMkJBQTJCLEdBQUcseUNBQXlDLENBQUM7QUFDOUUsTUFBTSx3QkFBd0IsR0FBRyxrQkFBa0IsQ0FBQztBQUU3QyxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEy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