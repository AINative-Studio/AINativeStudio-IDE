/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { language } from '../../../../base/common/platform.js';
export const ISpeechService = createDecorator('speechService');
export const HasSpeechProvider = new RawContextKey('hasSpeechProvider', false, { type: 'boolean', description: localize('hasSpeechProvider', "A speech provider is registered to the speech service.") });
export const SpeechToTextInProgress = new RawContextKey('speechToTextInProgress', false, { type: 'boolean', description: localize('speechToTextInProgress', "A speech-to-text session is in progress.") });
export const TextToSpeechInProgress = new RawContextKey('textToSpeechInProgress', false, { type: 'boolean', description: localize('textToSpeechInProgress', "A text-to-speech session is in progress.") });
export var SpeechToTextStatus;
(function (SpeechToTextStatus) {
    SpeechToTextStatus[SpeechToTextStatus["Started"] = 1] = "Started";
    SpeechToTextStatus[SpeechToTextStatus["Recognizing"] = 2] = "Recognizing";
    SpeechToTextStatus[SpeechToTextStatus["Recognized"] = 3] = "Recognized";
    SpeechToTextStatus[SpeechToTextStatus["Stopped"] = 4] = "Stopped";
    SpeechToTextStatus[SpeechToTextStatus["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
export var TextToSpeechStatus;
(function (TextToSpeechStatus) {
    TextToSpeechStatus[TextToSpeechStatus["Started"] = 1] = "Started";
    TextToSpeechStatus[TextToSpeechStatus["Stopped"] = 2] = "Stopped";
    TextToSpeechStatus[TextToSpeechStatus["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
export var KeywordRecognitionStatus;
(function (KeywordRecognitionStatus) {
    KeywordRecognitionStatus[KeywordRecognitionStatus["Recognized"] = 1] = "Recognized";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Stopped"] = 2] = "Stopped";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Canceled"] = 3] = "Canceled";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
export var AccessibilityVoiceSettingId;
(function (AccessibilityVoiceSettingId) {
    AccessibilityVoiceSettingId["SpeechTimeout"] = "accessibility.voice.speechTimeout";
    AccessibilityVoiceSettingId["AutoSynthesize"] = "accessibility.voice.autoSynthesize";
    AccessibilityVoiceSettingId["SpeechLanguage"] = "accessibility.voice.speechLanguage";
    AccessibilityVoiceSettingId["IgnoreCodeBlocks"] = "accessibility.voice.ignoreCodeBlocks";
})(AccessibilityVoiceSettingId || (AccessibilityVoiceSettingId = {}));
export const SPEECH_LANGUAGE_CONFIG = "accessibility.voice.speechLanguage" /* AccessibilityVoiceSettingId.SpeechLanguage */;
export const SPEECH_LANGUAGES = {
    ['da-DK']: {
        name: localize('speechLanguage.da-DK', "Danish (Denmark)")
    },
    ['de-DE']: {
        name: localize('speechLanguage.de-DE', "German (Germany)")
    },
    ['en-AU']: {
        name: localize('speechLanguage.en-AU', "English (Australia)")
    },
    ['en-CA']: {
        name: localize('speechLanguage.en-CA', "English (Canada)")
    },
    ['en-GB']: {
        name: localize('speechLanguage.en-GB', "English (United Kingdom)")
    },
    ['en-IE']: {
        name: localize('speechLanguage.en-IE', "English (Ireland)")
    },
    ['en-IN']: {
        name: localize('speechLanguage.en-IN', "English (India)")
    },
    ['en-NZ']: {
        name: localize('speechLanguage.en-NZ', "English (New Zealand)")
    },
    ['en-US']: {
        name: localize('speechLanguage.en-US', "English (United States)")
    },
    ['es-ES']: {
        name: localize('speechLanguage.es-ES', "Spanish (Spain)")
    },
    ['es-MX']: {
        name: localize('speechLanguage.es-MX', "Spanish (Mexico)")
    },
    ['fr-CA']: {
        name: localize('speechLanguage.fr-CA', "French (Canada)")
    },
    ['fr-FR']: {
        name: localize('speechLanguage.fr-FR', "French (France)")
    },
    ['hi-IN']: {
        name: localize('speechLanguage.hi-IN', "Hindi (India)")
    },
    ['it-IT']: {
        name: localize('speechLanguage.it-IT', "Italian (Italy)")
    },
    ['ja-JP']: {
        name: localize('speechLanguage.ja-JP', "Japanese (Japan)")
    },
    ['ko-KR']: {
        name: localize('speechLanguage.ko-KR', "Korean (South Korea)")
    },
    ['nl-NL']: {
        name: localize('speechLanguage.nl-NL', "Dutch (Netherlands)")
    },
    ['pt-PT']: {
        name: localize('speechLanguage.pt-PT', "Portuguese (Portugal)")
    },
    ['pt-BR']: {
        name: localize('speechLanguage.pt-BR', "Portuguese (Brazil)")
    },
    ['ru-RU']: {
        name: localize('speechLanguage.ru-RU', "Russian (Russia)")
    },
    ['sv-SE']: {
        name: localize('speechLanguage.sv-SE', "Swedish (Sweden)")
    },
    ['tr-TR']: {
        // allow-any-unicode-next-line
        name: localize('speechLanguage.tr-TR', "Turkish (Türkiye)")
    },
    ['zh-CN']: {
        name: localize('speechLanguage.zh-CN', "Chinese (Simplified, China)")
    },
    ['zh-HK']: {
        name: localize('speechLanguage.zh-HK', "Chinese (Traditional, Hong Kong)")
    },
    ['zh-TW']: {
        name: localize('speechLanguage.zh-TW', "Chinese (Traditional, Taiwan)")
    }
};
export function speechLanguageConfigToLanguage(config, lang = language) {
    if (typeof config === 'string') {
        if (config === 'auto') {
            if (lang !== 'en') {
                const langParts = lang.split('-');
                return speechLanguageConfigToLanguage(`${langParts[0]}-${(langParts[1] ?? langParts[0]).toUpperCase()}`);
            }
        }
        else {
            if (SPEECH_LANGUAGES[config]) {
                return config;
            }
        }
    }
    return 'en-US';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zcGVlY2gvY29tbW9uL3NwZWVjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSTlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQWlCLGVBQWUsQ0FBQyxDQUFDO0FBRS9FLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUFVLG1CQUFtQixFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx3REFBd0QsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNuTixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSx3QkFBd0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMENBQTBDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcE4sTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVUsd0JBQXdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDBDQUEwQyxDQUFDLEVB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