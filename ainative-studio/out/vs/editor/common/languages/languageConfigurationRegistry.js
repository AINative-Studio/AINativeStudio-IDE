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
import { Emitter } from '../../../base/common/event.js';
import { Disposable, markAsSingleton, toDisposable } from '../../../base/common/lifecycle.js';
import * as strings from '../../../base/common/strings.js';
import { DEFAULT_WORD_REGEXP, ensureValidWordDefinition } from '../core/wordHelper.js';
import { AutoClosingPairs } from './languageConfiguration.js';
import { CharacterPairSupport } from './supports/characterPair.js';
import { BracketElectricCharacterSupport } from './supports/electricCharacter.js';
import { IndentRulesSupport } from './supports/indentRules.js';
import { OnEnterSupport } from './supports/onEnter.js';
import { RichEditBrackets } from './supports/richEditBrackets.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ILanguageService } from './language.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { PLAINTEXT_LANGUAGE_ID } from './modesRegistry.js';
import { LanguageBracketsConfiguration } from './supports/languageBracketsConfiguration.js';
export class LanguageConfigurationServiceChangeEvent {
    constructor(languageId) {
        this.languageId = languageId;
    }
    affects(languageId) {
        return !this.languageId ? true : this.languageId === languageId;
    }
}
export const ILanguageConfigurationService = createDecorator('languageConfigurationService');
let LanguageConfigurationService = class LanguageConfigurationService extends Disposable {
    constructor(configurationService, languageService) {
        super();
        this.configurationService = configurationService;
        this.languageService = languageService;
        this._registry = this._register(new LanguageConfigurationRegistry());
        this.onDidChangeEmitter = this._register(new Emitter());
        this.onDidChange = this.onDidChangeEmitter.event;
        this.configurations = new Map();
        const languageConfigKeys = new Set(Object.values(customizedLanguageConfigKeys));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            const globalConfigChanged = e.change.keys.some((k) => languageConfigKeys.has(k));
            const localConfigChanged = e.change.overrides
                .filter(([overrideLangName, keys]) => keys.some((k) => languageConfigKeys.has(k)))
                .map(([overrideLangName]) => overrideLangName);
            if (globalConfigChanged) {
                this.configurations.clear();
                this.onDidChangeEmitter.fire(new LanguageConfigurationServiceChangeEvent(undefined));
            }
            else {
                for (const languageId of localConfigChanged) {
                    if (this.languageService.isRegisteredLanguageId(languageId)) {
                        this.configurations.delete(languageId);
                        this.onDidChangeEmitter.fire(new LanguageConfigurationServiceChangeEvent(languageId));
                    }
                }
            }
        }));
        this._register(this._registry.onDidChange((e) => {
            this.configurations.delete(e.languageId);
            this.onDidChangeEmitter.fire(new LanguageConfigurationServiceChangeEvent(e.languageId));
        }));
    }
    register(languageId, configuration, priority) {
        return this._registry.register(languageId, configuration, priority);
    }
    getLanguageConfiguration(languageId) {
        let result = this.configurations.get(languageId);
        if (!result) {
            result = computeConfig(languageId, this._registry, this.configurationService, this.languageService);
            this.configurations.set(languageId, result);
        }
        return result;
    }
};
LanguageConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, ILanguageService)
], LanguageConfigurationService);
export { LanguageConfigurationService };
function computeConfig(languageId, registry, configurationService, languageService) {
    let languageConfig = registry.getLanguageConfiguration(languageId);
    if (!languageConfig) {
        if (!languageService.isRegisteredLanguageId(languageId)) {
            // this happens for the null language, which can be returned by monarch.
            // Instead of throwing an error, we just return a default config.
            return new ResolvedLanguageConfiguration(languageId, {});
        }
        languageConfig = new ResolvedLanguageConfiguration(languageId, {});
    }
    const customizedConfig = getCustomizedLanguageConfig(languageConfig.languageId, configurationService);
    const data = combineLanguageConfigurations([languageConfig.underlyingConfig, customizedConfig]);
    const config = new ResolvedLanguageConfiguration(languageConfig.languageId, data);
    return config;
}
const customizedLanguageConfigKeys = {
    brackets: 'editor.language.brackets',
    colorizedBracketPairs: 'editor.language.colorizedBracketPairs'
};
function getCustomizedLanguageConfig(languageId, configurationService) {
    const brackets = configurationService.getValue(customizedLanguageConfigKeys.brackets, {
        overrideIdentifier: languageId,
    });
    const colorizedBracketPairs = configurationService.getValue(customizedLanguageConfigKeys.colorizedBracketPairs, {
        overrideIdentifier: languageId,
    });
    return {
        brackets: validateBracketPairs(brackets),
        colorizedBracketPairs: validateBracketPairs(colorizedBracketPairs),
    };
}
function validateBracketPairs(data) {
    if (!Array.isArray(data)) {
        return undefined;
    }
    return data.map(pair => {
        if (!Array.isArray(pair) || pair.length !== 2) {
            return undefined;
        }
        return [pair[0], pair[1]];
    }).filter((p) => !!p);
}
export function getIndentationAtPosition(model, lineNumber, column) {
    const lineText = model.getLineContent(lineNumber);
    let indentation = strings.getLeadingWhitespace(lineText);
    if (indentation.length > column - 1) {
        indentation = indentation.substring(0, column - 1);
    }
    return indentation;
}
class ComposedLanguageConfiguration {
    constructor(languageId) {
        this.languageId = languageId;
        this._resolved = null;
        this._entries = [];
        this._order = 0;
        this._resolved = null;
    }
    register(configuration, priority) {
        const entry = new LanguageConfigurationContribution(configuration, priority, ++this._order);
        this._entries.push(entry);
        this._resolved = null;
        return markAsSingleton(toDisposable(() => {
            for (let i = 0; i < this._entries.length; i++) {
                if (this._entries[i] === entry) {
                    this._entries.splice(i, 1);
                    this._resolved = null;
                    break;
                }
            }
        }));
    }
    getResolvedConfiguration() {
        if (!this._resolved) {
            const config = this._resolve();
            if (config) {
                this._resolved = new ResolvedLanguageConfiguration(this.languageId, config);
            }
        }
        return this._resolved;
    }
    _resolve() {
        if (this._entries.length === 0) {
            return null;
        }
        this._entries.sort(LanguageConfigurationContribution.cmp);
        return combineLanguageConfigurations(this._entries.map(e => e.configuration));
    }
}
function combineLanguageConfigurations(configs) {
    let result = {
        comments: undefined,
        brackets: undefined,
        wordPattern: undefined,
        indentationRules: undefined,
        onEnterRules: undefined,
        autoClosingPairs: undefined,
        surroundingPairs: undefined,
        autoCloseBefore: undefined,
        folding: undefined,
        colorizedBracketPairs: undefined,
        __electricCharacterSupport: undefined,
    };
    for (const entry of configs) {
        result = {
            comments: entry.comments || result.comments,
            brackets: entry.brackets || result.brackets,
            wordPattern: entry.wordPattern || result.wordPattern,
            indentationRules: entry.indentationRules || result.indentationRules,
            onEnterRules: entry.onEnterRules || result.onEnterRules,
            autoClosingPairs: entry.autoClosingPairs || result.autoClosingPairs,
            surroundingPairs: entry.surroundingPairs || result.surroundingPairs,
            autoCloseBefore: entry.autoCloseBefore || result.autoCloseBefore,
            folding: entry.folding || result.folding,
            colorizedBracketPairs: entry.colorizedBracketPairs || result.colorizedBracketPairs,
            __electricCharacterSupport: entry.__electricCharacterSupport || result.__electricCharacterSupport,
        };
    }
    return result;
}
class LanguageConfigurationContribution {
    constructor(configuration, priority, order) {
        this.configuration = configuration;
        this.priority = priority;
        this.order = order;
    }
    static cmp(a, b) {
        if (a.priority === b.priority) {
            // higher order last
            return a.order - b.order;
        }
        // higher priority last
        return a.priority - b.priority;
    }
}
export class LanguageConfigurationChangeEvent {
    constructor(languageId) {
        this.languageId = languageId;
    }
}
export class LanguageConfigurationRegistry extends Disposable {
    constructor() {
        super();
        this._entries = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this.register(PLAINTEXT_LANGUAGE_ID, {
            brackets: [
                ['(', ')'],
                ['[', ']'],
                ['{', '}'],
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '\"', close: '\"' },
                { open: '\'', close: '\'' },
                { open: '`', close: '`' },
            ],
            colorizedBracketPairs: [],
            folding: {
                offSide: true
            }
        }, 0));
    }
    /**
     * @param priority Use a higher number for higher priority
     */
    register(languageId, configuration, priority = 0) {
        let entries = this._entries.get(languageId);
        if (!entries) {
            entries = new ComposedLanguageConfiguration(languageId);
            this._entries.set(languageId, entries);
        }
        const disposable = entries.register(configuration, priority);
        this._onDidChange.fire(new LanguageConfigurationChangeEvent(languageId));
        return markAsSingleton(toDisposable(() => {
            disposable.dispose();
            this._onDidChange.fire(new LanguageConfigurationChangeEvent(languageId));
        }));
    }
    getLanguageConfiguration(languageId) {
        const entries = this._entries.get(languageId);
        return entries?.getResolvedConfiguration() || null;
    }
}
/**
 * Immutable.
*/
export class ResolvedLanguageConfiguration {
    constructor(languageId, underlyingConfig) {
        this.languageId = languageId;
        this.underlyingConfig = underlyingConfig;
        this._brackets = null;
        this._electricCharacter = null;
        this._onEnterSupport =
            this.underlyingConfig.brackets ||
                this.underlyingConfig.indentationRules ||
                this.underlyingConfig.onEnterRules
                ? new OnEnterSupport(this.underlyingConfig)
                : null;
        this.comments = ResolvedLanguageConfiguration._handleComments(this.underlyingConfig);
        this.characterPair = new CharacterPairSupport(this.underlyingConfig);
        this.wordDefinition = this.underlyingConfig.wordPattern || DEFAULT_WORD_REGEXP;
        this.indentationRules = this.underlyingConfig.indentationRules;
        if (this.underlyingConfig.indentationRules) {
            this.indentRulesSupport = new IndentRulesSupport(this.underlyingConfig.indentationRules);
        }
        else {
            this.indentRulesSupport = null;
        }
        this.foldingRules = this.underlyingConfig.folding || {};
        this.bracketsNew = new LanguageBracketsConfiguration(languageId, this.underlyingConfig);
    }
    getWordDefinition() {
        return ensureValidWordDefinition(this.wordDefinition);
    }
    get brackets() {
        if (!this._brackets && this.underlyingConfig.brackets) {
            this._brackets = new RichEditBrackets(this.languageId, this.underlyingConfig.brackets);
        }
        return this._brackets;
    }
    get electricCharacter() {
        if (!this._electricCharacter) {
            this._electricCharacter = new BracketElectricCharacterSupport(this.brackets);
        }
        return this._electricCharacter;
    }
    onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText) {
        if (!this._onEnterSupport) {
            return null;
        }
        return this._onEnterSupport.onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText);
    }
    getAutoClosingPairs() {
        return new AutoClosingPairs(this.characterPair.getAutoClosingPairs());
    }
    getAutoCloseBeforeSet(forQuotes) {
        return this.characterPair.getAutoCloseBeforeSet(forQuotes);
    }
    getSurroundingPairs() {
        return this.characterPair.getSurroundingPairs();
    }
    static _handleComments(conf) {
        const commentRule = conf.comments;
        if (!commentRule) {
            return null;
        }
        // comment configuration
        const comments = {};
        if (commentRule.lineComment) {
            comments.lineCommentToken = commentRule.lineComment;
        }
        if (commentRule.blockComment) {
            const [blockStart, blockEnd] = commentRule.blockComment;
            comments.blockCommentStartToken = blockStart;
            comments.blockCommentEndToken = blockEnd;
        }
        return comments;
    }
}
registerSingleton(ILanguageConfigurationService, LanguageConfigurationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvbGFuZ3VhZ2VDb25maWd1cmF0aW9uUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFFM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkYsT0FBTyxFQUF1RixnQkFBZ0IsRUFBZ0QsTUFBTSw0QkFBNEIsQ0FBQztBQUNqTSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENB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