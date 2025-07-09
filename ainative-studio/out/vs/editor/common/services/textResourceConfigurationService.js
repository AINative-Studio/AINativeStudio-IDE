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
import { Disposable } from '../../../base/common/lifecycle.js';
import { Position } from '../core/position.js';
import { ILanguageService } from '../languages/language.js';
import { IModelService } from './model.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
let TextResourceConfigurationService = class TextResourceConfigurationService extends Disposable {
    constructor(configurationService, modelService, languageService) {
        super();
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._register(this.configurationService.onDidChangeConfiguration(e => this._onDidChangeConfiguration.fire(this.toResourceConfigurationChangeEvent(e))));
    }
    getValue(resource, arg2, arg3) {
        if (typeof arg3 === 'string') {
            return this._getValue(resource, Position.isIPosition(arg2) ? arg2 : null, arg3);
        }
        return this._getValue(resource, null, typeof arg2 === 'string' ? arg2 : undefined);
    }
    updateValue(resource, key, value, configurationTarget) {
        const language = resource ? this.getLanguage(resource, null) : null;
        const configurationValue = this.configurationService.inspect(key, { resource, overrideIdentifier: language });
        if (configurationTarget === undefined) {
            configurationTarget = this.deriveConfigurationTarget(configurationValue, language);
        }
        const overrideIdentifier = language && configurationValue.overrideIdentifiers?.includes(language) ? language : undefined;
        return this.configurationService.updateValue(key, value, { resource, overrideIdentifier }, configurationTarget);
    }
    deriveConfigurationTarget(configurationValue, language) {
        if (language) {
            if (configurationValue.memory?.override !== undefined) {
                return 8 /* ConfigurationTarget.MEMORY */;
            }
            if (configurationValue.workspaceFolder?.override !== undefined) {
                return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
            if (configurationValue.workspace?.override !== undefined) {
                return 5 /* ConfigurationTarget.WORKSPACE */;
            }
            if (configurationValue.userRemote?.override !== undefined) {
                return 4 /* ConfigurationTarget.USER_REMOTE */;
            }
            if (configurationValue.userLocal?.override !== undefined) {
                return 3 /* ConfigurationTarget.USER_LOCAL */;
            }
        }
        if (configurationValue.memory?.value !== undefined) {
            return 8 /* ConfigurationTarget.MEMORY */;
        }
        if (configurationValue.workspaceFolder?.value !== undefined) {
            return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
        if (configurationValue.workspace?.value !== undefined) {
            return 5 /* ConfigurationTarget.WORKSPACE */;
        }
        if (configurationValue.userRemote?.value !== undefined) {
            return 4 /* ConfigurationTarget.USER_REMOTE */;
        }
        return 3 /* ConfigurationTarget.USER_LOCAL */;
    }
    _getValue(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        if (typeof section === 'undefined') {
            return this.configurationService.getValue({ resource, overrideIdentifier: language });
        }
        return this.configurationService.getValue(section, { resource, overrideIdentifier: language });
    }
    inspect(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        return this.configurationService.inspect(section, { resource, overrideIdentifier: language });
    }
    getLanguage(resource, position) {
        const model = this.modelService.getModel(resource);
        if (model) {
            return position ? model.getLanguageIdAtPosition(position.lineNumber, position.column) : model.getLanguageId();
        }
        return this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
    }
    toResourceConfigurationChangeEvent(configurationChangeEvent) {
        return {
            affectedKeys: configurationChangeEvent.affectedKeys,
            affectsConfiguration: (resource, configuration) => {
                const overrideIdentifier = resource ? this.getLanguage(resource, null) : undefined;
                if (configurationChangeEvent.affectsConfiguration(configuration, { resource, overrideIdentifier })) {
                    return true;
                }
                if (overrideIdentifier) {
                    //TODO@bpasero workaround for https://github.com/microsoft/vscode/issues/240410
                    return configurationChangeEvent.affectedKeys.has(`[${overrideIdentifier}]`);
                }
                return false;
            }
        };
    }
};
TextResourceConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], TextResourceConfigurationService);
export { TextResourceConfigurationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy90ZXh0UmVzb3VyY2VDb25maWd1cmF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBdUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5SixJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFPL0QsWUFDd0Isb0JBQTRELEVBQ3BFLFlBQTRDLEVBQ3pDLGVBQWtEO1FBRXBFLEtBQUssRUFBRSxDQUFDO1FBSmdDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBTnBELDhCQUF5QixHQUFtRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF5QyxDQUFDLENBQUM7UUFDbEosNkJBQXdCLEdBQWlELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFRN0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxD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