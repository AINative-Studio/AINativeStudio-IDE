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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3BlZWNoL2NvbW1vbi9zcGVlY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUk5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixlQUFlLENBQUMsQ0FBQztBQUUvRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsd0RBQXdELENBQUMsRUFBRSxDQUFDLENBQUM7QUFDbk4sTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVUsd0JBQXdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDBDQUEwQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BOLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFVLHdCQUF3QixFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwwQ0FBMEMsQ0FB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