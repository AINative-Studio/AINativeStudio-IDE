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
import { raceCancellation } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { ISpeechService, TextToSpeechStatus } from '../../contrib/speech/common/speechService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadSpeech = class MainThreadSpeech {
    constructor(extHostContext, speechService, logService) {
        this.speechService = speechService;
        this.logService = logService;
        this.providerRegistrations = new Map();
        this.speechToTextSessions = new Map();
        this.textToSpeechSessions = new Map();
        this.keywordRecognitionSessions = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostSpeech);
    }
    $registerProvider(handle, identifier, metadata) {
        this.logService.trace('[Speech] extension registered provider', metadata.extension.value);
        const registration = this.speechService.registerSpeechProvider(identifier, {
            metadata,
            createSpeechToTextSession: (token, options) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createSpeechToTextSession(handle, session, options?.language);
                const onDidChange = disposables.add(new Emitter());
                this.speechToTextSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelSpeechToTextSession(session);
                    this.speechToTextSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event
                };
            },
            createTextToSpeechSession: (token, options) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None,
                        synthesize: async () => { }
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createTextToSpeechSession(handle, session, options?.language);
                const onDidChange = disposables.add(new Emitter());
                this.textToSpeechSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelTextToSpeechSession(session);
                    this.textToSpeechSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event,
                    synthesize: async (text) => {
                        await this.proxy.$synthesizeSpeech(session, text);
                        await raceCancellation(Event.toPromise(Event.filter(onDidChange.event, e => e.status === TextToSpeechStatus.Stopped)), token);
                    }
                };
            },
            createKeywordRecognitionSession: token => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createKeywordRecognitionSession(handle, session);
                const onDidChange = disposables.add(new Emitter());
                this.keywordRecognitionSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelKeywordRecognitionSession(session);
                    this.keywordRecognitionSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event
                };
            }
        });
        this.providerRegistrations.set(handle, {
            dispose: () => {
                registration.dispose();
            }
        });
    }
    $unregisterProvider(handle) {
        const registration = this.providerRegistrations.get(handle);
        if (registration) {
            registration.dispose();
            this.providerRegistrations.delete(handle);
        }
    }
    $emitSpeechToTextEvent(session, event) {
        const providerSession = this.speechToTextSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    $emitTextToSpeechEvent(session, event) {
        const providerSession = this.textToSpeechSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    $emitKeywordRecognitionEvent(session, event) {
        const providerSession = this.keywordRecognitionSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    dispose() {
        this.providerRegistrations.forEach(disposable => disposable.dispose());
        this.providerRegistrations.clear();
        this.speechToTextSessions.forEach(session => session.onDidChange.dispose());
        this.speechToTextSessions.clear();
        this.textToSpeechSessions.forEach(session => session.onDidChange.dispose());
        this.textToSpeechSessions.clear();
        this.keywordRecognitionSessions.forEach(session => session.onDidChange.dispose());
        this.keywordRecognitionSessions.clear();
    }
};
MainThreadSpeech = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSpeech),
    __param(1, ISpeechService),
    __param(2, ILogService)
], MainThreadSpeech);
export { MainThreadSpeech };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNwZWVjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFNwZWVjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBc0IsV0FBVyxFQUF5QixNQUFNLCtCQUErQixDQUFDO0FBQ3ZILE9BQU8sRUFBcUQsY0FBYyxFQUEwQyxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdMLE9BQU8sRUFBbUIsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQWV0RyxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQVU1QixZQUNDLGNBQStCLEVBQ2YsYUFBOEMsRUFDakQsVUFBd0M7UUFEcEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ2hDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFUckMsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFFdkQseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7UUFDOUQseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7UUFDOUQsK0JBQTBCLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUM7UUFPMUYsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFD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