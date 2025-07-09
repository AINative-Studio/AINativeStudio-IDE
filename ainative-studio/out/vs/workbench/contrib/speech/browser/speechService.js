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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zcGVlY2gvYnJvd3Nlci9zcGVlY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQW1DLGlCQUFpQixFQUF3QixzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSw4QkFBOEIsRUFBRSxzQkFBc0IsRUFBd0Isc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0VCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRixPQUFPLEVBQUUsaUJBQWlC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