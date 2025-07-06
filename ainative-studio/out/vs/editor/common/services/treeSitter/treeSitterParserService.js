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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3RyZWVTaXR0ZXIvdHJlZVNpdHRlclBhcnNlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRixPQUFPLEVBQUUscUNBQXFDLEVBQW1FLG1CQUFtQixFQUFFLDBCQUEwQixFQUF3QixNQUFNLCtCQUErQixDQUFDO0FBQzlOLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQTJCLE1BQU0sMEJBQTBCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsTUFBTSwyQkFBMkIsR0FBRyx5Q0FBeUMsQ0FBQztBQUM5RSxNQUFNLHdCQUF3QixHQUFHLGtCQUFrQixDQUFDO0FBRTdDLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJC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