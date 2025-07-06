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
import { localize } from '../../../../nls.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { HasSpeechProvider, SpeechToTextInProgress, KeywordRecognitionStatus, SpeechToTextStatus, speechLanguageConfigToLanguage, SPEECH_LANGUAGE_CONFIG, TextToSpeechInProgress, TextToSpeechStatus } from '../common/speechService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
const speechProvidersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'speechProviders',
    jsonSchema: {
        description: localize('vscode.extension.contributes.speechProvider', 'Contributes a Speech Provider'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { name: '', description: '' } }],
            required: ['name'],
            properties: {
                name: {
                    description: localize('speechProviderName', "Unique name for this Speech Provider."),
                    type: 'string'
                },
                description: {
                    description: localize('speechProviderDescription', "A description of this Speech Provider, shown in the UI."),
                    type: 'string'
                }
            }
        }
    }
});
let SpeechService = class SpeechService extends Disposable {
    get hasSpeechProvider() { return this.providerDescriptors.size > 0 || this.providers.size > 0; }
    constructor(logService, contextKeyService, hostService, telemetryService, configurationService, extensionService) {
        super();
        this.logService = logService;
        this.hostService = hostService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.extensionService = extensionService;
        this._onDidChangeHasSpeechProvider = this._register(new Emitter());
        this.onDidChangeHasSpeechProvider = this._onDidChangeHasSpeechProvider.event;
        this.providers = new Map();
        this.providerDescriptors = new Map();
        //#region Speech to Text
        this._onDidStartSpeechToTextSession = this._register(new Emitter());
        this.onDidStartSpeechToTextSession = this._onDidStartSpeechToTextSession.event;
        this._onDidEndSpeechToTextSession = this._register(new Emitter());
        this.onDidEndSpeechToTextSession = this._onDidEndSpeechToTextSession.event;
        this.activeSpeechToTextSessions = 0;
        //#endregion
        //#region Text to Speech
        this._onDidStartTextToSpeechSession = this._register(new Emitter());
        this.onDidStartTextToSpeechSession = this._onDidStartTextToSpeechSession.event;
        this._onDidEndTextToSpeechSession = this._register(new Emitter());
        this.onDidEndTextToSpeechSession = this._onDidEndTextToSpeechSession.event;
        this.activeTextToSpeechSessions = 0;
        //#endregion
        //#region Keyword Recognition
        this._onDidStartKeywordRecognition = this._register(new Emitter());
        this.onDidStartKeywordRecognition = this._onDidStartKeywordRecognition.event;
        this._onDidEndKeywordRecognition = this._register(new Emitter());
        this.onDidEndKeywordRecognition = this._onDidEndKeywordRecognition.event;
        this.activeKeywordRecognitionSessions = 0;
        this.hasSpeechProviderContext = HasSpeechProvider.bindTo(contextKeyService);
        this.textToSpeechInProgress = TextToSpeechInProgress.bindTo(contextKeyService);
        this.speechToTextInProgress = SpeechToTextInProgress.bindTo(contextKeyService);
        this.handleAndRegisterSpeechExtensions();
    }
    handleAndRegisterSpeechExtensions() {
        speechProvidersExtensionPoint.setHandler((extensions, delta) => {
            const oldHasSpeechProvider = this.hasSpeechProvider;
            for (const extension of delta.removed) {
                for (const descriptor of extension.value) {
                    this.providerDescriptors.delete(descriptor.name);
                }
            }
            for (const extension of delta.added) {
                for (const descriptor of extension.value) {
                    this.providerDescriptors.set(descriptor.name, descriptor);
                }
            }
            if (oldHasSpeechProvider !== this.hasSpeechProvider) {
                this.handleHasSpeechProviderChange();
            }
        });
    }
    registerSpeechProvider(identifier, provider) {
        if (this.providers.has(identifier)) {
            throw new Error(`Speech provider with identifier ${identifier} is already registered.`);
        }
        const oldHasSpeechProvider = this.hasSpeechProvider;
        this.providers.set(identifier, provider);
        if (oldHasSpeechProvider !== this.hasSpeechProvider) {
            this.handleHasSpeechProviderChange();
        }
        return toDisposable(() => {
            const oldHasSpeechProvider = this.hasSpeechProvider;
            this.providers.delete(identifier);
            if (oldHasSpeechProvider !== this.hasSpeechProvider) {
                this.handleHasSpeechProviderChange();
            }
        });
    }
    handleHasSpeechProviderChange() {
        this.hasSpeechProviderContext.set(this.hasSpeechProvider);
        this._onDidChangeHasSpeechProvider.fire();
    }
    get hasActiveSpeechToTextSession() { return this.activeSpeechToTextSessions > 0; }
    async createSpeechToTextSession(token, context = 'speech') {
        const provider = await this.getProvider();
        const language = speechLanguageConfigToLanguage(this.configurationService.getValue(SPEECH_LANGUAGE_CONFIG));
        const session = provider.createSpeechToTextSession(token, typeof language === 'string' ? { language } : undefined);
        const sessionStart = Date.now();
        let sessionRecognized = false;
        let sessionError = false;
        let sessionContentLength = 0;
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = () => {
            this.activeSpeechToTextSessions = Math.max(0, this.activeSpeechToTextSessions - 1);
            if (!this.hasActiveSpeechToTextSession) {
                this.speechToTextInProgress.reset();
            }
            this._onDidEndSpeechToTextSession.fire();
            this.telemetryService.publicLog2('speechToTextSession', {
                context,
                sessionDuration: Date.now() - sessionStart,
                sessionRecognized,
                sessionError,
                sessionContentLength,
                sessionLanguage: language
            });
            disposables.dispose();
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled()));
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled();
        }
        disposables.add(session.onDidChange(e => {
            switch (e.status) {
                case SpeechToTextStatus.Started:
                    this.activeSpeechToTextSessions++;
                    this.speechToTextInProgress.set(true);
                    this._onDidStartSpeechToTextSession.fire();
                    break;
                case SpeechToTextStatus.Recognizing:
                    sessionRecognized = true;
                    break;
                case SpeechToTextStatus.Recognized:
                    if (typeof e.text === 'string') {
                        sessionContentLength += e.text.length;
                    }
                    break;
                case SpeechToTextStatus.Stopped:
                    onSessionStoppedOrCanceled();
                    break;
                case SpeechToTextStatus.Error:
                    this.logService.error(`Speech provider error in speech to text session: ${e.text}`);
                    sessionError = true;
                    break;
            }
        }));
        return session;
    }
    async getProvider() {
        // Send out extension activation to ensure providers can register
        await this.extensionService.activateByEvent('onSpeech');
        const provider = Array.from(this.providers.values()).at(0);
        if (!provider) {
            throw new Error(`No Speech provider is registered.`);
        }
        else if (this.providers.size > 1) {
            this.logService.warn(`Multiple speech providers registered. Picking first one: ${provider.metadata.displayName}`);
        }
        return provider;
    }
    get hasActiveTextToSpeechSession() { return this.activeTextToSpeechSessions > 0; }
    async createTextToSpeechSession(token, context = 'speech') {
        const provider = await this.getProvider();
        const language = speechLanguageConfigToLanguage(this.configurationService.getValue(SPEECH_LANGUAGE_CONFIG));
        const session = provider.createTextToSpeechSession(token, typeof language === 'string' ? { language } : undefined);
        const sessionStart = Date.now();
        let sessionError = false;
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = (dispose) => {
            this.activeTextToSpeechSessions = Math.max(0, this.activeTextToSpeechSessions - 1);
            if (!this.hasActiveTextToSpeechSession) {
                this.textToSpeechInProgress.reset();
            }
            this._onDidEndTextToSpeechSession.fire();
            this.telemetryService.publicLog2('textToSpeechSession', {
                context,
                sessionDuration: Date.now() - sessionStart,
                sessionError,
                sessionLanguage: language
            });
            if (dispose) {
                disposables.dispose();
            }
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled(true)));
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled(true);
        }
        disposables.add(session.onDidChange(e => {
            switch (e.status) {
                case TextToSpeechStatus.Started:
                    this.activeTextToSpeechSessions++;
                    this.textToSpeechInProgress.set(true);
                    this._onDidStartTextToSpeechSession.fire();
                    break;
                case TextToSpeechStatus.Stopped:
                    onSessionStoppedOrCanceled(false);
                    break;
                case TextToSpeechStatus.Error:
                    this.logService.error(`Speech provider error in text to speech session: ${e.text}`);
                    sessionError = true;
                    break;
            }
        }));
        return session;
    }
    get hasActiveKeywordRecognition() { return this.activeKeywordRecognitionSessions > 0; }
    async recognizeKeyword(token) {
        const result = new DeferredPromise();
        const disposables = new DisposableStore();
        disposables.add(token.onCancellationRequested(() => {
            disposables.dispose();
            result.complete(KeywordRecognitionStatus.Canceled);
        }));
        const recognizeKeywordDisposables = disposables.add(new DisposableStore());
        let activeRecognizeKeywordSession = undefined;
        const recognizeKeyword = () => {
            recognizeKeywordDisposables.clear();
            const cts = new CancellationTokenSource(token);
            recognizeKeywordDisposables.add(toDisposable(() => cts.dispose(true)));
            const currentRecognizeKeywordSession = activeRecognizeKeywordSession = this.doRecognizeKeyword(cts.token).then(status => {
                if (currentRecognizeKeywordSession === activeRecognizeKeywordSession) {
                    result.complete(status);
                }
            }, error => {
                if (currentRecognizeKeywordSession === activeRecognizeKeywordSession) {
                    result.error(error);
                }
            });
        };
        disposables.add(this.hostService.onDidChangeFocus(focused => {
            if (!focused && activeRecognizeKeywordSession) {
                recognizeKeywordDisposables.clear();
                activeRecognizeKeywordSession = undefined;
            }
            else if (!activeRecognizeKeywordSession) {
                recognizeKeyword();
            }
        }));
        if (this.hostService.hasFocus) {
            recognizeKeyword();
        }
        let status;
        try {
            status = await result.p;
        }
        finally {
            disposables.dispose();
        }
        this.telemetryService.publicLog2('keywordRecognition', {
            keywordRecognized: status === KeywordRecognitionStatus.Recognized
        });
        return status;
    }
    async doRecognizeKeyword(token) {
        const provider = await this.getProvider();
        const session = provider.createKeywordRecognitionSession(token);
        this.activeKeywordRecognitionSessions++;
        this._onDidStartKeywordRecognition.fire();
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = () => {
            this.activeKeywordRecognitionSessions = Math.max(0, this.activeKeywordRecognitionSessions - 1);
            this._onDidEndKeywordRecognition.fire();
            disposables.dispose();
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled()));
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled();
        }
        disposables.add(session.onDidChange(e => {
            if (e.status === KeywordRecognitionStatus.Stopped) {
                onSessionStoppedOrCanceled();
            }
        }));
        try {
            return (await Event.toPromise(session.onDidChange)).status;
        }
        finally {
            onSessionStoppedOrCanceled();
        }
    }
};
SpeechService = __decorate([
    __param(0, ILogService),
    __param(1, IContextKeyService),
    __param(2, IHostService),
    __param(3, ITelemetryService),
    __param(4, IConfigurationService),
    __param(5, IExtensionService)
], SpeechService);
export { SpeechService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3BlZWNoL2Jyb3dzZXIvc3BlZWNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFtQyxpQkFBaUIsRUFBd0Isc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsOEJBQThCLEVBQUUsc0JBQXNCLEVBQXdCLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdFQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0YsT0FBTyxFQUFFLGlC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