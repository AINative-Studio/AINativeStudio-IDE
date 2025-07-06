/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Virtual Key Codes, the value does not hold any inherent meaning.
 * Inspired somewhat from https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
 * But these are "more general", as they should work across browsers & OS`s.
 */
export var KeyCode;
(function (KeyCode) {
    KeyCode[KeyCode["DependsOnKbLayout"] = -1] = "DependsOnKbLayout";
    /**
     * Placed first to cover the 0 value of the enum.
     */
    KeyCode[KeyCode["Unknown"] = 0] = "Unknown";
    KeyCode[KeyCode["Backspace"] = 1] = "Backspace";
    KeyCode[KeyCode["Tab"] = 2] = "Tab";
    KeyCode[KeyCode["Enter"] = 3] = "Enter";
    KeyCode[KeyCode["Shift"] = 4] = "Shift";
    KeyCode[KeyCode["Ctrl"] = 5] = "Ctrl";
    KeyCode[KeyCode["Alt"] = 6] = "Alt";
    KeyCode[KeyCode["PauseBreak"] = 7] = "PauseBreak";
    KeyCode[KeyCode["CapsLock"] = 8] = "CapsLock";
    KeyCode[KeyCode["Escape"] = 9] = "Escape";
    KeyCode[KeyCode["Space"] = 10] = "Space";
    KeyCode[KeyCode["PageUp"] = 11] = "PageUp";
    KeyCode[KeyCode["PageDown"] = 12] = "PageDown";
    KeyCode[KeyCode["End"] = 13] = "End";
    KeyCode[KeyCode["Home"] = 14] = "Home";
    KeyCode[KeyCode["LeftArrow"] = 15] = "LeftArrow";
    KeyCode[KeyCode["UpArrow"] = 16] = "UpArrow";
    KeyCode[KeyCode["RightArrow"] = 17] = "RightArrow";
    KeyCode[KeyCode["DownArrow"] = 18] = "DownArrow";
    KeyCode[KeyCode["Insert"] = 19] = "Insert";
    KeyCode[KeyCode["Delete"] = 20] = "Delete";
    KeyCode[KeyCode["Digit0"] = 21] = "Digit0";
    KeyCode[KeyCode["Digit1"] = 22] = "Digit1";
    KeyCode[KeyCode["Digit2"] = 23] = "Digit2";
    KeyCode[KeyCode["Digit3"] = 24] = "Digit3";
    KeyCode[KeyCode["Digit4"] = 25] = "Digit4";
    KeyCode[KeyCode["Digit5"] = 26] = "Digit5";
    KeyCode[KeyCode["Digit6"] = 27] = "Digit6";
    KeyCode[KeyCode["Digit7"] = 28] = "Digit7";
    KeyCode[KeyCode["Digit8"] = 29] = "Digit8";
    KeyCode[KeyCode["Digit9"] = 30] = "Digit9";
    KeyCode[KeyCode["KeyA"] = 31] = "KeyA";
    KeyCode[KeyCode["KeyB"] = 32] = "KeyB";
    KeyCode[KeyCode["KeyC"] = 33] = "KeyC";
    KeyCode[KeyCode["KeyD"] = 34] = "KeyD";
    KeyCode[KeyCode["KeyE"] = 35] = "KeyE";
    KeyCode[KeyCode["KeyF"] = 36] = "KeyF";
    KeyCode[KeyCode["KeyG"] = 37] = "KeyG";
    KeyCode[KeyCode["KeyH"] = 38] = "KeyH";
    KeyCode[KeyCode["KeyI"] = 39] = "KeyI";
    KeyCode[KeyCode["KeyJ"] = 40] = "KeyJ";
    KeyCode[KeyCode["KeyK"] = 41] = "KeyK";
    KeyCode[KeyCode["KeyL"] = 42] = "KeyL";
    KeyCode[KeyCode["KeyM"] = 43] = "KeyM";
    KeyCode[KeyCode["KeyN"] = 44] = "KeyN";
    KeyCode[KeyCode["KeyO"] = 45] = "KeyO";
    KeyCode[KeyCode["KeyP"] = 46] = "KeyP";
    KeyCode[KeyCode["KeyQ"] = 47] = "KeyQ";
    KeyCode[KeyCode["KeyR"] = 48] = "KeyR";
    KeyCode[KeyCode["KeyS"] = 49] = "KeyS";
    KeyCode[KeyCode["KeyT"] = 50] = "KeyT";
    KeyCode[KeyCode["KeyU"] = 51] = "KeyU";
    KeyCode[KeyCode["KeyV"] = 52] = "KeyV";
    KeyCode[KeyCode["KeyW"] = 53] = "KeyW";
    KeyCode[KeyCode["KeyX"] = 54] = "KeyX";
    KeyCode[KeyCode["KeyY"] = 55] = "KeyY";
    KeyCode[KeyCode["KeyZ"] = 56] = "KeyZ";
    KeyCode[KeyCode["Meta"] = 57] = "Meta";
    KeyCode[KeyCode["ContextMenu"] = 58] = "ContextMenu";
    KeyCode[KeyCode["F1"] = 59] = "F1";
    KeyCode[KeyCode["F2"] = 60] = "F2";
    KeyCode[KeyCode["F3"] = 61] = "F3";
    KeyCode[KeyCode["F4"] = 62] = "F4";
    KeyCode[KeyCode["F5"] = 63] = "F5";
    KeyCode[KeyCode["F6"] = 64] = "F6";
    KeyCode[KeyCode["F7"] = 65] = "F7";
    KeyCode[KeyCode["F8"] = 66] = "F8";
    KeyCode[KeyCode["F9"] = 67] = "F9";
    KeyCode[KeyCode["F10"] = 68] = "F10";
    KeyCode[KeyCode["F11"] = 69] = "F11";
    KeyCode[KeyCode["F12"] = 70] = "F12";
    KeyCode[KeyCode["F13"] = 71] = "F13";
    KeyCode[KeyCode["F14"] = 72] = "F14";
    KeyCode[KeyCode["F15"] = 73] = "F15";
    KeyCode[KeyCode["F16"] = 74] = "F16";
    KeyCode[KeyCode["F17"] = 75] = "F17";
    KeyCode[KeyCode["F18"] = 76] = "F18";
    KeyCode[KeyCode["F19"] = 77] = "F19";
    KeyCode[KeyCode["F20"] = 78] = "F20";
    KeyCode[KeyCode["F21"] = 79] = "F21";
    KeyCode[KeyCode["F22"] = 80] = "F22";
    KeyCode[KeyCode["F23"] = 81] = "F23";
    KeyCode[KeyCode["F24"] = 82] = "F24";
    KeyCode[KeyCode["NumLock"] = 83] = "NumLock";
    KeyCode[KeyCode["ScrollLock"] = 84] = "ScrollLock";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ';:' key
     */
    KeyCode[KeyCode["Semicolon"] = 85] = "Semicolon";
    /**
     * For any country/region, the '+' key
     * For the US standard keyboard, the '=+' key
     */
    KeyCode[KeyCode["Equal"] = 86] = "Equal";
    /**
     * For any country/region, the ',' key
     * For the US standard keyboard, the ',<' key
     */
    KeyCode[KeyCode["Comma"] = 87] = "Comma";
    /**
     * For any country/region, the '-' key
     * For the US standard keyboard, the '-_' key
     */
    KeyCode[KeyCode["Minus"] = 88] = "Minus";
    /**
     * For any country/region, the '.' key
     * For the US standard keyboard, the '.>' key
     */
    KeyCode[KeyCode["Period"] = 89] = "Period";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '/?' key
     */
    KeyCode[KeyCode["Slash"] = 90] = "Slash";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '`~' key
     */
    KeyCode[KeyCode["Backquote"] = 91] = "Backquote";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '[{' key
     */
    KeyCode[KeyCode["BracketLeft"] = 92] = "BracketLeft";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '\|' key
     */
    KeyCode[KeyCode["Backslash"] = 93] = "Backslash";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ']}' key
     */
    KeyCode[KeyCode["BracketRight"] = 94] = "BracketRight";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ''"' key
     */
    KeyCode[KeyCode["Quote"] = 95] = "Quote";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     */
    KeyCode[KeyCode["OEM_8"] = 96] = "OEM_8";
    /**
     * Either the angle bracket key or the backslash key on the RT 102-key keyboard.
     */
    KeyCode[KeyCode["IntlBackslash"] = 97] = "IntlBackslash";
    KeyCode[KeyCode["Numpad0"] = 98] = "Numpad0";
    KeyCode[KeyCode["Numpad1"] = 99] = "Numpad1";
    KeyCode[KeyCode["Numpad2"] = 100] = "Numpad2";
    KeyCode[KeyCode["Numpad3"] = 101] = "Numpad3";
    KeyCode[KeyCode["Numpad4"] = 102] = "Numpad4";
    KeyCode[KeyCode["Numpad5"] = 103] = "Numpad5";
    KeyCode[KeyCode["Numpad6"] = 104] = "Numpad6";
    KeyCode[KeyCode["Numpad7"] = 105] = "Numpad7";
    KeyCode[KeyCode["Numpad8"] = 106] = "Numpad8";
    KeyCode[KeyCode["Numpad9"] = 107] = "Numpad9";
    KeyCode[KeyCode["NumpadMultiply"] = 108] = "NumpadMultiply";
    KeyCode[KeyCode["NumpadAdd"] = 109] = "NumpadAdd";
    KeyCode[KeyCode["NUMPAD_SEPARATOR"] = 110] = "NUMPAD_SEPARATOR";
    KeyCode[KeyCode["NumpadSubtract"] = 111] = "NumpadSubtract";
    KeyCode[KeyCode["NumpadDecimal"] = 112] = "NumpadDecimal";
    KeyCode[KeyCode["NumpadDivide"] = 113] = "NumpadDivide";
    /**
     * Cover all key codes when IME is processing input.
     */
    KeyCode[KeyCode["KEY_IN_COMPOSITION"] = 114] = "KEY_IN_COMPOSITION";
    KeyCode[KeyCode["ABNT_C1"] = 115] = "ABNT_C1";
    KeyCode[KeyCode["ABNT_C2"] = 116] = "ABNT_C2";
    KeyCode[KeyCode["AudioVolumeMute"] = 117] = "AudioVolumeMute";
    KeyCode[KeyCode["AudioVolumeUp"] = 118] = "AudioVolumeUp";
    KeyCode[KeyCode["AudioVolumeDown"] = 119] = "AudioVolumeDown";
    KeyCode[KeyCode["BrowserSearch"] = 120] = "BrowserSearch";
    KeyCode[KeyCode["BrowserHome"] = 121] = "BrowserHome";
    KeyCode[KeyCode["BrowserBack"] = 122] = "BrowserBack";
    KeyCode[KeyCode["BrowserForward"] = 123] = "BrowserForward";
    KeyCode[KeyCode["MediaTrackNext"] = 124] = "MediaTrackNext";
    KeyCode[KeyCode["MediaTrackPrevious"] = 125] = "MediaTrackPrevious";
    KeyCode[KeyCode["MediaStop"] = 126] = "MediaStop";
    KeyCode[KeyCode["MediaPlayPause"] = 127] = "MediaPlayPause";
    KeyCode[KeyCode["LaunchMediaPlayer"] = 128] = "LaunchMediaPlayer";
    KeyCode[KeyCode["LaunchMail"] = 129] = "LaunchMail";
    KeyCode[KeyCode["LaunchApp2"] = 130] = "LaunchApp2";
    /**
     * VK_CLEAR, 0x0C, CLEAR key
     */
    KeyCode[KeyCode["Clear"] = 131] = "Clear";
    /**
     * Placed last to cover the length of the enum.
     * Please do not depend on this value!
     */
    KeyCode[KeyCode["MAX_VALUE"] = 132] = "MAX_VALUE";
})(KeyCode || (KeyCode = {}));
/**
 * keyboardEvent.code
 */
export var ScanCode;
(function (ScanCode) {
    ScanCode[ScanCode["DependsOnKbLayout"] = -1] = "DependsOnKbLayout";
    ScanCode[ScanCode["None"] = 0] = "None";
    ScanCode[ScanCode["Hyper"] = 1] = "Hyper";
    ScanCode[ScanCode["Super"] = 2] = "Super";
    ScanCode[ScanCode["Fn"] = 3] = "Fn";
    ScanCode[ScanCode["FnLock"] = 4] = "FnLock";
    ScanCode[ScanCode["Suspend"] = 5] = "Suspend";
    ScanCode[ScanCode["Resume"] = 6] = "Resume";
    ScanCode[ScanCode["Turbo"] = 7] = "Turbo";
    ScanCode[ScanCode["Sleep"] = 8] = "Sleep";
    ScanCode[ScanCode["WakeUp"] = 9] = "WakeUp";
    ScanCode[ScanCode["KeyA"] = 10] = "KeyA";
    ScanCode[ScanCode["KeyB"] = 11] = "KeyB";
    ScanCode[ScanCode["KeyC"] = 12] = "KeyC";
    ScanCode[ScanCode["KeyD"] = 13] = "KeyD";
    ScanCode[ScanCode["KeyE"] = 14] = "KeyE";
    ScanCode[ScanCode["KeyF"] = 15] = "KeyF";
    ScanCode[ScanCode["KeyG"] = 16] = "KeyG";
    ScanCode[ScanCode["KeyH"] = 17] = "KeyH";
    ScanCode[ScanCode["KeyI"] = 18] = "KeyI";
    ScanCode[ScanCode["KeyJ"] = 19] = "KeyJ";
    ScanCode[ScanCode["KeyK"] = 20] = "KeyK";
    ScanCode[ScanCode["KeyL"] = 21] = "KeyL";
    ScanCode[ScanCode["KeyM"] = 22] = "KeyM";
    ScanCode[ScanCode["KeyN"] = 23] = "KeyN";
    ScanCode[ScanCode["KeyO"] = 24] = "KeyO";
    ScanCode[ScanCode["KeyP"] = 25] = "KeyP";
    ScanCode[ScanCode["KeyQ"] = 26] = "KeyQ";
    ScanCode[ScanCode["KeyR"] = 27] = "KeyR";
    ScanCode[ScanCode["KeyS"] = 28] = "KeyS";
    ScanCode[ScanCode["KeyT"] = 29] = "KeyT";
    ScanCode[ScanCode["KeyU"] = 30] = "KeyU";
    ScanCode[ScanCode["KeyV"] = 31] = "KeyV";
    ScanCode[ScanCode["KeyW"] = 32] = "KeyW";
    ScanCode[ScanCode["KeyX"] = 33] = "KeyX";
    ScanCode[ScanCode["KeyY"] = 34] = "KeyY";
    ScanCode[ScanCode["KeyZ"] = 35] = "KeyZ";
    ScanCode[ScanCode["Digit1"] = 36] = "Digit1";
    ScanCode[ScanCode["Digit2"] = 37] = "Digit2";
    ScanCode[ScanCode["Digit3"] = 38] = "Digit3";
    ScanCode[ScanCode["Digit4"] = 39] = "Digit4";
    ScanCode[ScanCode["Digit5"] = 40] = "Digit5";
    ScanCode[ScanCode["Digit6"] = 41] = "Digit6";
    ScanCode[ScanCode["Digit7"] = 42] = "Digit7";
    ScanCode[ScanCode["Digit8"] = 43] = "Digit8";
    ScanCode[ScanCode["Digit9"] = 44] = "Digit9";
    ScanCode[ScanCode["Digit0"] = 45] = "Digit0";
    ScanCode[ScanCode["Enter"] = 46] = "Enter";
    ScanCode[ScanCode["Escape"] = 47] = "Escape";
    ScanCode[ScanCode["Backspace"] = 48] = "Backspace";
    ScanCode[ScanCode["Tab"] = 49] = "Tab";
    ScanCode[ScanCode["Space"] = 50] = "Space";
    ScanCode[ScanCode["Minus"] = 51] = "Minus";
    ScanCode[ScanCode["Equal"] = 52] = "Equal";
    ScanCode[ScanCode["BracketLeft"] = 53] = "BracketLeft";
    ScanCode[ScanCode["BracketRight"] = 54] = "BracketRight";
    ScanCode[ScanCode["Backslash"] = 55] = "Backslash";
    ScanCode[ScanCode["IntlHash"] = 56] = "IntlHash";
    ScanCode[ScanCode["Semicolon"] = 57] = "Semicolon";
    ScanCode[ScanCode["Quote"] = 58] = "Quote";
    ScanCode[ScanCode["Backquote"] = 59] = "Backquote";
    ScanCode[ScanCode["Comma"] = 60] = "Comma";
    ScanCode[ScanCode["Period"] = 61] = "Period";
    ScanCode[ScanCode["Slash"] = 62] = "Slash";
    ScanCode[ScanCode["CapsLock"] = 63] = "CapsLock";
    ScanCode[ScanCode["F1"] = 64] = "F1";
    ScanCode[ScanCode["F2"] = 65] = "F2";
    ScanCode[ScanCode["F3"] = 66] = "F3";
    ScanCode[ScanCode["F4"] = 67] = "F4";
    ScanCode[ScanCode["F5"] = 68] = "F5";
    ScanCode[ScanCode["F6"] = 69] = "F6";
    ScanCode[ScanCode["F7"] = 70] = "F7";
    ScanCode[ScanCode["F8"] = 71] = "F8";
    ScanCode[ScanCode["F9"] = 72] = "F9";
    ScanCode[ScanCode["F10"] = 73] = "F10";
    ScanCode[ScanCode["F11"] = 74] = "F11";
    ScanCode[ScanCode["F12"] = 75] = "F12";
    ScanCode[ScanCode["PrintScreen"] = 76] = "PrintScreen";
    ScanCode[ScanCode["ScrollLock"] = 77] = "ScrollLock";
    ScanCode[ScanCode["Pause"] = 78] = "Pause";
    ScanCode[ScanCode["Insert"] = 79] = "Insert";
    ScanCode[ScanCode["Home"] = 80] = "Home";
    ScanCode[ScanCode["PageUp"] = 81] = "PageUp";
    ScanCode[ScanCode["Delete"] = 82] = "Delete";
    ScanCode[ScanCode["End"] = 83] = "End";
    ScanCode[ScanCode["PageDown"] = 84] = "PageDown";
    ScanCode[ScanCode["ArrowRight"] = 85] = "ArrowRight";
    ScanCode[ScanCode["ArrowLeft"] = 86] = "ArrowLeft";
    ScanCode[ScanCode["ArrowDown"] = 87] = "ArrowDown";
    ScanCode[ScanCode["ArrowUp"] = 88] = "ArrowUp";
    ScanCode[ScanCode["NumLock"] = 89] = "NumLock";
    ScanCode[ScanCode["NumpadDivide"] = 90] = "NumpadDivide";
    ScanCode[ScanCode["NumpadMultiply"] = 91] = "NumpadMultiply";
    ScanCode[ScanCode["NumpadSubtract"] = 92] = "NumpadSubtract";
    ScanCode[ScanCode["NumpadAdd"] = 93] = "NumpadAdd";
    ScanCode[ScanCode["NumpadEnter"] = 94] = "NumpadEnter";
    ScanCode[ScanCode["Numpad1"] = 95] = "Numpad1";
    ScanCode[ScanCode["Numpad2"] = 96] = "Numpad2";
    ScanCode[ScanCode["Numpad3"] = 97] = "Numpad3";
    ScanCode[ScanCode["Numpad4"] = 98] = "Numpad4";
    ScanCode[ScanCode["Numpad5"] = 99] = "Numpad5";
    ScanCode[ScanCode["Numpad6"] = 100] = "Numpad6";
    ScanCode[ScanCode["Numpad7"] = 101] = "Numpad7";
    ScanCode[ScanCode["Numpad8"] = 102] = "Numpad8";
    ScanCode[ScanCode["Numpad9"] = 103] = "Numpad9";
    ScanCode[ScanCode["Numpad0"] = 104] = "Numpad0";
    ScanCode[ScanCode["NumpadDecimal"] = 105] = "NumpadDecimal";
    ScanCode[ScanCode["IntlBackslash"] = 106] = "IntlBackslash";
    ScanCode[ScanCode["ContextMenu"] = 107] = "ContextMenu";
    ScanCode[ScanCode["Power"] = 108] = "Power";
    ScanCode[ScanCode["NumpadEqual"] = 109] = "NumpadEqual";
    ScanCode[ScanCode["F13"] = 110] = "F13";
    ScanCode[ScanCode["F14"] = 111] = "F14";
    ScanCode[ScanCode["F15"] = 112] = "F15";
    ScanCode[ScanCode["F16"] = 113] = "F16";
    ScanCode[ScanCode["F17"] = 114] = "F17";
    ScanCode[ScanCode["F18"] = 115] = "F18";
    ScanCode[ScanCode["F19"] = 116] = "F19";
    ScanCode[ScanCode["F20"] = 117] = "F20";
    ScanCode[ScanCode["F21"] = 118] = "F21";
    ScanCode[ScanCode["F22"] = 119] = "F22";
    ScanCode[ScanCode["F23"] = 120] = "F23";
    ScanCode[ScanCode["F24"] = 121] = "F24";
    ScanCode[ScanCode["Open"] = 122] = "Open";
    ScanCode[ScanCode["Help"] = 123] = "Help";
    ScanCode[ScanCode["Select"] = 124] = "Select";
    ScanCode[ScanCode["Again"] = 125] = "Again";
    ScanCode[ScanCode["Undo"] = 126] = "Undo";
    ScanCode[ScanCode["Cut"] = 127] = "Cut";
    ScanCode[ScanCode["Copy"] = 128] = "Copy";
    ScanCode[ScanCode["Paste"] = 129] = "Paste";
    ScanCode[ScanCode["Find"] = 130] = "Find";
    ScanCode[ScanCode["AudioVolumeMute"] = 131] = "AudioVolumeMute";
    ScanCode[ScanCode["AudioVolumeUp"] = 132] = "AudioVolumeUp";
    ScanCode[ScanCode["AudioVolumeDown"] = 133] = "AudioVolumeDown";
    ScanCode[ScanCode["NumpadComma"] = 134] = "NumpadComma";
    ScanCode[ScanCode["IntlRo"] = 135] = "IntlRo";
    ScanCode[ScanCode["KanaMode"] = 136] = "KanaMode";
    ScanCode[ScanCode["IntlYen"] = 137] = "IntlYen";
    ScanCode[ScanCode["Convert"] = 138] = "Convert";
    ScanCode[ScanCode["NonConvert"] = 139] = "NonConvert";
    ScanCode[ScanCode["Lang1"] = 140] = "Lang1";
    ScanCode[ScanCode["Lang2"] = 141] = "Lang2";
    ScanCode[ScanCode["Lang3"] = 142] = "Lang3";
    ScanCode[ScanCode["Lang4"] = 143] = "Lang4";
    ScanCode[ScanCode["Lang5"] = 144] = "Lang5";
    ScanCode[ScanCode["Abort"] = 145] = "Abort";
    ScanCode[ScanCode["Props"] = 146] = "Props";
    ScanCode[ScanCode["NumpadParenLeft"] = 147] = "NumpadParenLeft";
    ScanCode[ScanCode["NumpadParenRight"] = 148] = "NumpadParenRight";
    ScanCode[ScanCode["NumpadBackspace"] = 149] = "NumpadBackspace";
    ScanCode[ScanCode["NumpadMemoryStore"] = 150] = "NumpadMemoryStore";
    ScanCode[ScanCode["NumpadMemoryRecall"] = 151] = "NumpadMemoryRecall";
    ScanCode[ScanCode["NumpadMemoryClear"] = 152] = "NumpadMemoryClear";
    ScanCode[ScanCode["NumpadMemoryAdd"] = 153] = "NumpadMemoryAdd";
    ScanCode[ScanCode["NumpadMemorySubtract"] = 154] = "NumpadMemorySubtract";
    ScanCode[ScanCode["NumpadClear"] = 155] = "NumpadClear";
    ScanCode[ScanCode["NumpadClearEntry"] = 156] = "NumpadClearEntry";
    ScanCode[ScanCode["ControlLeft"] = 157] = "ControlLeft";
    ScanCode[ScanCode["ShiftLeft"] = 158] = "ShiftLeft";
    ScanCode[ScanCode["AltLeft"] = 159] = "AltLeft";
    ScanCode[ScanCode["MetaLeft"] = 160] = "MetaLeft";
    ScanCode[ScanCode["ControlRight"] = 161] = "ControlRight";
    ScanCode[ScanCode["ShiftRight"] = 162] = "ShiftRight";
    ScanCode[ScanCode["AltRight"] = 163] = "AltRight";
    ScanCode[ScanCode["MetaRight"] = 164] = "MetaRight";
    ScanCode[ScanCode["BrightnessUp"] = 165] = "BrightnessUp";
    ScanCode[ScanCode["BrightnessDown"] = 166] = "BrightnessDown";
    ScanCode[ScanCode["MediaPlay"] = 167] = "MediaPlay";
    ScanCode[ScanCode["MediaRecord"] = 168] = "MediaRecord";
    ScanCode[ScanCode["MediaFastForward"] = 169] = "MediaFastForward";
    ScanCode[ScanCode["MediaRewind"] = 170] = "MediaRewind";
    ScanCode[ScanCode["MediaTrackNext"] = 171] = "MediaTrackNext";
    ScanCode[ScanCode["MediaTrackPrevious"] = 172] = "MediaTrackPrevious";
    ScanCode[ScanCode["MediaStop"] = 173] = "MediaStop";
    ScanCode[ScanCode["Eject"] = 174] = "Eject";
    ScanCode[ScanCode["MediaPlayPause"] = 175] = "MediaPlayPause";
    ScanCode[ScanCode["MediaSelect"] = 176] = "MediaSelect";
    ScanCode[ScanCode["LaunchMail"] = 177] = "LaunchMail";
    ScanCode[ScanCode["LaunchApp2"] = 178] = "LaunchApp2";
    ScanCode[ScanCode["LaunchApp1"] = 179] = "LaunchApp1";
    ScanCode[ScanCode["SelectTask"] = 180] = "SelectTask";
    ScanCode[ScanCode["LaunchScreenSaver"] = 181] = "LaunchScreenSaver";
    ScanCode[ScanCode["BrowserSearch"] = 182] = "BrowserSearch";
    ScanCode[ScanCode["BrowserHome"] = 183] = "BrowserHome";
    ScanCode[ScanCode["BrowserBack"] = 184] = "BrowserBack";
    ScanCode[ScanCode["BrowserForward"] = 185] = "BrowserForward";
    ScanCode[ScanCode["BrowserStop"] = 186] = "BrowserStop";
    ScanCode[ScanCode["BrowserRefresh"] = 187] = "BrowserRefresh";
    ScanCode[ScanCode["BrowserFavorites"] = 188] = "BrowserFavorites";
    ScanCode[ScanCode["ZoomToggle"] = 189] = "ZoomToggle";
    ScanCode[ScanCode["MailReply"] = 190] = "MailReply";
    ScanCode[ScanCode["MailForward"] = 191] = "MailForward";
    ScanCode[ScanCode["MailSend"] = 192] = "MailSend";
    ScanCode[ScanCode["MAX_VALUE"] = 193] = "MAX_VALUE";
})(ScanCode || (ScanCode = {}));
class KeyCodeStrMap {
    constructor() {
        this._keyCodeToStr = [];
        this._strToKeyCode = Object.create(null);
    }
    define(keyCode, str) {
        this._keyCodeToStr[keyCode] = str;
        this._strToKeyCode[str.toLowerCase()] = keyCode;
    }
    keyCodeToStr(keyCode) {
        return this._keyCodeToStr[keyCode];
    }
    strToKeyCode(str) {
        return this._strToKeyCode[str.toLowerCase()] || 0 /* KeyCode.Unknown */;
    }
}
const uiMap = new KeyCodeStrMap();
const userSettingsUSMap = new KeyCodeStrMap();
const userSettingsGeneralMap = new KeyCodeStrMap();
export const EVENT_KEY_CODE_MAP = new Array(230);
export const NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE = {};
const scanCodeIntToStr = [];
const scanCodeStrToInt = Object.create(null);
const scanCodeLowerCaseStrToInt = Object.create(null);
export const ScanCodeUtils = {
    lowerCaseToEnum: (scanCode) => scanCodeLowerCaseStrToInt[scanCode] || 0 /* ScanCode.None */,
    toEnum: (scanCode) => scanCodeStrToInt[scanCode] || 0 /* ScanCode.None */,
    toString: (scanCode) => scanCodeIntToStr[scanCode] || 'None'
};
/**
 * -1 if a ScanCode => KeyCode mapping depends on kb layout.
 */
export const IMMUTABLE_CODE_TO_KEY_CODE = [];
/**
 * -1 if a KeyCode => ScanCode mapping depends on kb layout.
 */
export const IMMUTABLE_KEY_CODE_TO_CODE = [];
for (let i = 0; i <= 193 /* ScanCode.MAX_VALUE */; i++) {
    IMMUTABLE_CODE_TO_KEY_CODE[i] = -1 /* KeyCode.DependsOnKbLayout */;
}
for (let i = 0; i <= 132 /* KeyCode.MAX_VALUE */; i++) {
    IMMUTABLE_KEY_CODE_TO_CODE[i] = -1 /* ScanCode.DependsOnKbLayout */;
}
(function () {
    // See https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
    // See https://github.com/microsoft/node-native-keymap/blob/88c0b0e5/deps/chromium/keyboard_codes_win.h
    const empty = '';
    const mappings = [
        // immutable, scanCode, scanCodeStr, keyCode, keyCodeStr, eventKeyCode, vkey, usUserSettingsLabel, generalUserSettingsLabel
        [1, 0 /* ScanCode.None */, 'None', 0 /* KeyCode.Unknown */, 'unknown', 0, 'VK_UNKNOWN', empty, empty],
        [1, 1 /* ScanCode.Hyper */, 'Hyper', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 2 /* ScanCode.Super */, 'Super', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 3 /* ScanCode.Fn */, 'Fn', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 4 /* ScanCode.FnLock */, 'FnLock', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 5 /* ScanCode.Suspend */, 'Suspend', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 6 /* ScanCode.Resume */, 'Resume', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 7 /* ScanCode.Turbo */, 'Turbo', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 8 /* ScanCode.Sleep */, 'Sleep', 0 /* KeyCode.Unknown */, empty, 0, 'VK_SLEEP', empty, empty],
        [1, 9 /* ScanCode.WakeUp */, 'WakeUp', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [0, 10 /* ScanCode.KeyA */, 'KeyA', 31 /* KeyCode.KeyA */, 'A', 65, 'VK_A', empty, empty],
        [0, 11 /* ScanCode.KeyB */, 'KeyB', 32 /* KeyCode.KeyB */, 'B', 66, 'VK_B', empty, empty],
        [0, 12 /* ScanCode.KeyC */, 'KeyC', 33 /* KeyCode.KeyC */, 'C', 67, 'VK_C', empty, empty],
        [0, 13 /* ScanCode.KeyD */, 'KeyD', 34 /* KeyCode.KeyD */, 'D', 68, 'VK_D', empty, empty],
        [0, 14 /* ScanCode.KeyE */, 'KeyE', 35 /* KeyCode.KeyE */, 'E', 69, 'VK_E', empty, empty],
        [0, 15 /* ScanCode.KeyF */, 'KeyF', 36 /* KeyCode.KeyF */, 'F', 70, 'VK_F', empty, empty],
        [0, 16 /* ScanCode.KeyG */, 'KeyG', 37 /* KeyCode.KeyG */, 'G', 71, 'VK_G', empty, empty],
        [0, 17 /* ScanCode.KeyH */, 'KeyH', 38 /* KeyCode.KeyH */, 'H', 72, 'VK_H', empty, empty],
        [0, 18 /* ScanCode.KeyI */, 'KeyI', 39 /* KeyCode.KeyI */, 'I', 73, 'VK_I', empty, empty],
        [0, 19 /* ScanCode.KeyJ */, 'KeyJ', 40 /* KeyCode.KeyJ */, 'J', 74, 'VK_J', empty, empty],
        [0, 20 /* ScanCode.KeyK */, 'KeyK', 41 /* KeyCode.KeyK */, 'K', 75, 'VK_K', empty, empty],
        [0, 21 /* ScanCode.KeyL */, 'KeyL', 42 /* KeyCode.KeyL */, 'L', 76, 'VK_L', empty, empty],
        [0, 22 /* ScanCode.KeyM */, 'KeyM', 43 /* KeyCode.KeyM */, 'M', 77, 'VK_M', empty, empty],
        [0, 23 /* ScanCode.KeyN */, 'KeyN', 44 /* KeyCode.KeyN */, 'N', 78, 'VK_N', empty, empty],
        [0, 24 /* ScanCode.KeyO */, 'KeyO', 45 /* KeyCode.KeyO */, 'O', 79, 'VK_O', empty, empty],
        [0, 25 /* ScanCode.KeyP */, 'KeyP', 46 /* KeyCode.KeyP */, 'P', 80, 'VK_P', empty, empty],
        [0, 26 /* ScanCode.KeyQ */, 'KeyQ', 47 /* KeyCode.KeyQ */, 'Q', 81, 'VK_Q', empty, empty],
        [0, 27 /* ScanCode.KeyR */, 'KeyR', 48 /* KeyCode.KeyR */, 'R', 82, 'VK_R', empty, empty],
        [0, 28 /* ScanCode.KeyS */, 'KeyS', 49 /* KeyCode.KeyS */, 'S', 83, 'VK_S', empty, empty],
        [0, 29 /* ScanCode.KeyT */, 'KeyT', 50 /* KeyCode.KeyT */, 'T', 84, 'VK_T', empty, empty],
        [0, 30 /* ScanCode.KeyU */, 'KeyU', 51 /* KeyCode.KeyU */, 'U', 85, 'VK_U', empty, empty],
        [0, 31 /* ScanCode.KeyV */, 'KeyV', 52 /* KeyCode.KeyV */, 'V', 86, 'VK_V', empty, empty],
        [0, 32 /* ScanCode.KeyW */, 'KeyW', 53 /* KeyCode.KeyW */, 'W', 87, 'VK_W', empty, empty],
        [0, 33 /* ScanCode.KeyX */, 'KeyX', 54 /* KeyCode.KeyX */, 'X', 88, 'VK_X', empty, empty],
        [0, 34 /* ScanCode.KeyY */, 'KeyY', 55 /* KeyCode.KeyY */, 'Y', 89, 'VK_Y', empty, empty],
        [0, 35 /* ScanCode.KeyZ */, 'KeyZ', 56 /* KeyCode.KeyZ */, 'Z', 90, 'VK_Z', empty, empty],
        [0, 36 /* ScanCode.Digit1 */, 'Digit1', 22 /* KeyCode.Digit1 */, '1', 49, 'VK_1', empty, empty],
        [0, 37 /* ScanCode.Digit2 */, 'Digit2', 23 /* KeyCode.Digit2 */, '2', 50, 'VK_2', empty, empty],
        [0, 38 /* ScanCode.Digit3 */, 'Digit3', 24 /* KeyCode.Digit3 */, '3', 51, 'VK_3', empty, empty],
        [0, 39 /* ScanCode.Digit4 */, 'Digit4', 25 /* KeyCode.Digit4 */, '4', 52, 'VK_4', empty, empty],
        [0, 40 /* ScanCode.Digit5 */, 'Digit5', 26 /* KeyCode.Digit5 */, '5', 53, 'VK_5', empty, empty],
        [0, 41 /* ScanCode.Digit6 */, 'Digit6', 27 /* KeyCode.Digit6 */, '6', 54, 'VK_6', empty, empty],
        [0, 42 /* ScanCode.Digit7 */, 'Digit7', 28 /* KeyCode.Digit7 */, '7', 55, 'VK_7', empty, empty],
        [0, 43 /* ScanCode.Digit8 */, 'Digit8', 29 /* KeyCode.Digit8 */, '8', 56, 'VK_8', empty, empty],
        [0, 44 /* ScanCode.Digit9 */, 'Digit9', 30 /* KeyCode.Digit9 */, '9', 57, 'VK_9', empty, empty],
        [0, 45 /* ScanCode.Digit0 */, 'Digit0', 21 /* KeyCode.Digit0 */, '0', 48, 'VK_0', empty, empty],
        [1, 46 /* ScanCode.Enter */, 'Enter', 3 /* KeyCode.Enter */, 'Enter', 13, 'VK_RETURN', empty, empty],
        [1, 47 /* ScanCode.Escape */, 'Escape', 9 /* KeyCode.Escape */, 'Escape', 27, 'VK_ESCAPE', empty, empty],
        [1, 48 /* ScanCode.Backspace */, 'Backspace', 1 /* KeyCode.Backspace */, 'Backspace', 8, 'VK_BACK', empty, empty],
        [1, 49 /* ScanCode.Tab */, 'Tab', 2 /* KeyCode.Tab */, 'Tab', 9, 'VK_TAB', empty, empty],
        [1, 50 /* ScanCode.Space */, 'Space', 10 /* KeyCode.Space */, 'Space', 32, 'VK_SPACE', empty, empty],
        [0, 51 /* ScanCode.Minus */, 'Minus', 88 /* KeyCode.Minus */, '-', 189, 'VK_OEM_MINUS', '-', 'OEM_MINUS'],
        [0, 52 /* ScanCode.Equal */, 'Equal', 86 /* KeyCode.Equal */, '=', 187, 'VK_OEM_PLUS', '=', 'OEM_PLUS'],
        [0, 53 /* ScanCode.BracketLeft */, 'BracketLeft', 92 /* KeyCode.BracketLeft */, '[', 219, 'VK_OEM_4', '[', 'OEM_4'],
        [0, 54 /* ScanCode.BracketRight */, 'BracketRight', 94 /* KeyCode.BracketRight */, ']', 221, 'VK_OEM_6', ']', 'OEM_6'],
        [0, 55 /* ScanCode.Backslash */, 'Backslash', 93 /* KeyCode.Backslash */, '\\', 220, 'VK_OEM_5', '\\', 'OEM_5'],
        [0, 56 /* ScanCode.IntlHash */, 'IntlHash', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty], // has been dropped from the w3c spec
        [0, 57 /* ScanCode.Semicolon */, 'Semicolon', 85 /* KeyCode.Semicolon */, ';', 186, 'VK_OEM_1', ';', 'OEM_1'],
        [0, 58 /* ScanCode.Quote */, 'Quote', 95 /* KeyCode.Quote */, '\'', 222, 'VK_OEM_7', '\'', 'OEM_7'],
        [0, 59 /* ScanCode.Backquote */, 'Backquote', 91 /* KeyCode.Backquote */, '`', 192, 'VK_OEM_3', '`', 'OEM_3'],
        [0, 60 /* ScanCode.Comma */, 'Comma', 87 /* KeyCode.Comma */, ',', 188, 'VK_OEM_COMMA', ',', 'OEM_COMMA'],
        [0, 61 /* ScanCode.Period */, 'Period', 89 /* KeyCode.Period */, '.', 190, 'VK_OEM_PERIOD', '.', 'OEM_PERIOD'],
        [0, 62 /* ScanCode.Slash */, 'Slash', 90 /* KeyCode.Slash */, '/', 191, 'VK_OEM_2', '/', 'OEM_2'],
        [1, 63 /* ScanCode.CapsLock */, 'CapsLock', 8 /* KeyCode.CapsLock */, 'CapsLock', 20, 'VK_CAPITAL', empty, empty],
        [1, 64 /* ScanCode.F1 */, 'F1', 59 /* KeyCode.F1 */, 'F1', 112, 'VK_F1', empty, empty],
        [1, 65 /* ScanCode.F2 */, 'F2', 60 /* KeyCode.F2 */, 'F2', 113, 'VK_F2', empty, empty],
        [1, 66 /* ScanCode.F3 */, 'F3', 61 /* KeyCode.F3 */, 'F3', 114, 'VK_F3', empty, empty],
        [1, 67 /* ScanCode.F4 */, 'F4', 62 /* KeyCode.F4 */, 'F4', 115, 'VK_F4', empty, empty],
        [1, 68 /* ScanCode.F5 */, 'F5', 63 /* KeyCode.F5 */, 'F5', 116, 'VK_F5', empty, empty],
        [1, 69 /* ScanCode.F6 */, 'F6', 64 /* KeyCode.F6 */, 'F6', 117, 'VK_F6', empty, empty],
        [1, 70 /* ScanCode.F7 */, 'F7', 65 /* KeyCode.F7 */, 'F7', 118, 'VK_F7', empty, empty],
        [1, 71 /* ScanCode.F8 */, 'F8', 66 /* KeyCode.F8 */, 'F8', 119, 'VK_F8', empty, empty],
        [1, 72 /* ScanCode.F9 */, 'F9', 67 /* KeyCode.F9 */, 'F9', 120, 'VK_F9', empty, empty],
        [1, 73 /* ScanCode.F10 */, 'F10', 68 /* KeyCode.F10 */, 'F10', 121, 'VK_F10', empty, empty],
        [1, 74 /* ScanCode.F11 */, 'F11', 69 /* KeyCode.F11 */, 'F11', 122, 'VK_F11', empty, empty],
        [1, 75 /* ScanCode.F12 */, 'F12', 70 /* KeyCode.F12 */, 'F12', 123, 'VK_F12', empty, empty],
        [1, 76 /* ScanCode.PrintScreen */, 'PrintScreen', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 77 /* ScanCode.ScrollLock */, 'ScrollLock', 84 /* KeyCode.ScrollLock */, 'ScrollLock', 145, 'VK_SCROLL', empty, empty],
        [1, 78 /* ScanCode.Pause */, 'Pause', 7 /* KeyCode.PauseBreak */, 'PauseBreak', 19, 'VK_PAUSE', empty, empty],
        [1, 79 /* ScanCode.Insert */, 'Insert', 19 /* KeyCode.Insert */, 'Insert', 45, 'VK_INSERT', empty, empty],
        [1, 80 /* ScanCode.Home */, 'Home', 14 /* KeyCode.Home */, 'Home', 36, 'VK_HOME', empty, empty],
        [1, 81 /* ScanCode.PageUp */, 'PageUp', 11 /* KeyCode.PageUp */, 'PageUp', 33, 'VK_PRIOR', empty, empty],
        [1, 82 /* ScanCode.Delete */, 'Delete', 20 /* KeyCode.Delete */, 'Delete', 46, 'VK_DELETE', empty, empty],
        [1, 83 /* ScanCode.End */, 'End', 13 /* KeyCode.End */, 'End', 35, 'VK_END', empty, empty],
        [1, 84 /* ScanCode.PageDown */, 'PageDown', 12 /* KeyCode.PageDown */, 'PageDown', 34, 'VK_NEXT', empty, empty],
        [1, 85 /* ScanCode.ArrowRight */, 'ArrowRight', 17 /* KeyCode.RightArrow */, 'RightArrow', 39, 'VK_RIGHT', 'Right', empty],
        [1, 86 /* ScanCode.ArrowLeft */, 'ArrowLeft', 15 /* KeyCode.LeftArrow */, 'LeftArrow', 37, 'VK_LEFT', 'Left', empty],
        [1, 87 /* ScanCode.ArrowDown */, 'ArrowDown', 18 /* KeyCode.DownArrow */, 'DownArrow', 40, 'VK_DOWN', 'Down', empty],
        [1, 88 /* ScanCode.ArrowUp */, 'ArrowUp', 16 /* KeyCode.UpArrow */, 'UpArrow', 38, 'VK_UP', 'Up', empty],
        [1, 89 /* ScanCode.NumLock */, 'NumLock', 83 /* KeyCode.NumLock */, 'NumLock', 144, 'VK_NUMLOCK', empty, empty],
        [1, 90 /* ScanCode.NumpadDivide */, 'NumpadDivide', 113 /* KeyCode.NumpadDivide */, 'NumPad_Divide', 111, 'VK_DIVIDE', empty, empty],
        [1, 91 /* ScanCode.NumpadMultiply */, 'NumpadMultiply', 108 /* KeyCode.NumpadMultiply */, 'NumPad_Multiply', 106, 'VK_MULTIPLY', empty, empty],
        [1, 92 /* ScanCode.NumpadSubtract */, 'NumpadSubtract', 111 /* KeyCode.NumpadSubtract */, 'NumPad_Subtract', 109, 'VK_SUBTRACT', empty, empty],
        [1, 93 /* ScanCode.NumpadAdd */, 'NumpadAdd', 109 /* KeyCode.NumpadAdd */, 'NumPad_Add', 107, 'VK_ADD', empty, empty],
        [1, 94 /* ScanCode.NumpadEnter */, 'NumpadEnter', 3 /* KeyCode.Enter */, empty, 0, empty, empty, empty],
        [1, 95 /* ScanCode.Numpad1 */, 'Numpad1', 99 /* KeyCode.Numpad1 */, 'NumPad1', 97, 'VK_NUMPAD1', empty, empty],
        [1, 96 /* ScanCode.Numpad2 */, 'Numpad2', 100 /* KeyCode.Numpad2 */, 'NumPad2', 98, 'VK_NUMPAD2', empty, empty],
        [1, 97 /* ScanCode.Numpad3 */, 'Numpad3', 101 /* KeyCode.Numpad3 */, 'NumPad3', 99, 'VK_NUMPAD3', empty, empty],
        [1, 98 /* ScanCode.Numpad4 */, 'Numpad4', 102 /* KeyCode.Numpad4 */, 'NumPad4', 100, 'VK_NUMPAD4', empty, empty],
        [1, 99 /* ScanCode.Numpad5 */, 'Numpad5', 103 /* KeyCode.Numpad5 */, 'NumPad5', 101, 'VK_NUMPAD5', empty, empty],
        [1, 100 /* ScanCode.Numpad6 */, 'Numpad6', 104 /* KeyCode.Numpad6 */, 'NumPad6', 102, 'VK_NUMPAD6', empty, empty],
        [1, 101 /* ScanCode.Numpad7 */, 'Numpad7', 105 /* KeyCode.Numpad7 */, 'NumPad7', 103, 'VK_NUMPAD7', empty, empty],
        [1, 102 /* ScanCode.Numpad8 */, 'Numpad8', 106 /* KeyCode.Numpad8 */, 'NumPad8', 104, 'VK_NUMPAD8', empty, empty],
        [1, 103 /* ScanCode.Numpad9 */, 'Numpad9', 107 /* KeyCode.Numpad9 */, 'NumPad9', 105, 'VK_NUMPAD9', empty, empty],
        [1, 104 /* ScanCode.Numpad0 */, 'Numpad0', 98 /* KeyCode.Numpad0 */, 'NumPad0', 96, 'VK_NUMPAD0', empty, empty],
        [1, 105 /* ScanCode.NumpadDecimal */, 'NumpadDecimal', 112 /* KeyCode.NumpadDecimal */, 'NumPad_Decimal', 110, 'VK_DECIMAL', empty, empty],
        [0, 106 /* ScanCode.IntlBackslash */, 'IntlBackslash', 97 /* KeyCode.IntlBackslash */, 'OEM_102', 226, 'VK_OEM_102', empty, empty],
        [1, 107 /* ScanCode.ContextMenu */, 'ContextMenu', 58 /* KeyCode.ContextMenu */, 'ContextMenu', 93, empty, empty, empty],
        [1, 108 /* ScanCode.Power */, 'Power', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 109 /* ScanCode.NumpadEqual */, 'NumpadEqual', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 110 /* ScanCode.F13 */, 'F13', 71 /* KeyCode.F13 */, 'F13', 124, 'VK_F13', empty, empty],
        [1, 111 /* ScanCode.F14 */, 'F14', 72 /* KeyCode.F14 */, 'F14', 125, 'VK_F14', empty, empty],
        [1, 112 /* ScanCode.F15 */, 'F15', 73 /* KeyCode.F15 */, 'F15', 126, 'VK_F15', empty, empty],
        [1, 113 /* ScanCode.F16 */, 'F16', 74 /* KeyCode.F16 */, 'F16', 127, 'VK_F16', empty, empty],
        [1, 114 /* ScanCode.F17 */, 'F17', 75 /* KeyCode.F17 */, 'F17', 128, 'VK_F17', empty, empty],
        [1, 115 /* ScanCode.F18 */, 'F18', 76 /* KeyCode.F18 */, 'F18', 129, 'VK_F18', empty, empty],
        [1, 116 /* ScanCode.F19 */, 'F19', 77 /* KeyCode.F19 */, 'F19', 130, 'VK_F19', empty, empty],
        [1, 117 /* ScanCode.F20 */, 'F20', 78 /* KeyCode.F20 */, 'F20', 131, 'VK_F20', empty, empty],
        [1, 118 /* ScanCode.F21 */, 'F21', 79 /* KeyCode.F21 */, 'F21', 132, 'VK_F21', empty, empty],
        [1, 119 /* ScanCode.F22 */, 'F22', 80 /* KeyCode.F22 */, 'F22', 133, 'VK_F22', empty, empty],
        [1, 120 /* ScanCode.F23 */, 'F23', 81 /* KeyCode.F23 */, 'F23', 134, 'VK_F23', empty, empty],
        [1, 121 /* ScanCode.F24 */, 'F24', 82 /* KeyCode.F24 */, 'F24', 135, 'VK_F24', empty, empty],
        [1, 122 /* ScanCode.Open */, 'Open', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 123 /* ScanCode.Help */, 'Help', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 124 /* ScanCode.Select */, 'Select', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 125 /* ScanCode.Again */, 'Again', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 126 /* ScanCode.Undo */, 'Undo', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 127 /* ScanCode.Cut */, 'Cut', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 128 /* ScanCode.Copy */, 'Copy', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 129 /* ScanCode.Paste */, 'Paste', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 130 /* ScanCode.Find */, 'Find', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 131 /* ScanCode.AudioVolumeMute */, 'AudioVolumeMute', 117 /* KeyCode.AudioVolumeMute */, 'AudioVolumeMute', 173, 'VK_VOLUME_MUTE', empty, empty],
        [1, 132 /* ScanCode.AudioVolumeUp */, 'AudioVolumeUp', 118 /* KeyCode.AudioVolumeUp */, 'AudioVolumeUp', 175, 'VK_VOLUME_UP', empty, empty],
        [1, 133 /* ScanCode.AudioVolumeDown */, 'AudioVolumeDown', 119 /* KeyCode.AudioVolumeDown */, 'AudioVolumeDown', 174, 'VK_VOLUME_DOWN', empty, empty],
        [1, 134 /* ScanCode.NumpadComma */, 'NumpadComma', 110 /* KeyCode.NUMPAD_SEPARATOR */, 'NumPad_Separator', 108, 'VK_SEPARATOR', empty, empty],
        [0, 135 /* ScanCode.IntlRo */, 'IntlRo', 115 /* KeyCode.ABNT_C1 */, 'ABNT_C1', 193, 'VK_ABNT_C1', empty, empty],
        [1, 136 /* ScanCode.KanaMode */, 'KanaMode', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [0, 137 /* ScanCode.IntlYen */, 'IntlYen', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 138 /* ScanCode.Convert */, 'Convert', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 139 /* ScanCode.NonConvert */, 'NonConvert', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 140 /* ScanCode.Lang1 */, 'Lang1', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 141 /* ScanCode.Lang2 */, 'Lang2', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 142 /* ScanCode.Lang3 */, 'Lang3', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 143 /* ScanCode.Lang4 */, 'Lang4', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 144 /* ScanCode.Lang5 */, 'Lang5', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 145 /* ScanCode.Abort */, 'Abort', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 146 /* ScanCode.Props */, 'Props', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 147 /* ScanCode.NumpadParenLeft */, 'NumpadParenLeft', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 148 /* ScanCode.NumpadParenRight */, 'NumpadParenRight', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 149 /* ScanCode.NumpadBackspace */, 'NumpadBackspace', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 150 /* ScanCode.NumpadMemoryStore */, 'NumpadMemoryStore', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 151 /* ScanCode.NumpadMemoryRecall */, 'NumpadMemoryRecall', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 152 /* ScanCode.NumpadMemoryClear */, 'NumpadMemoryClear', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 153 /* ScanCode.NumpadMemoryAdd */, 'NumpadMemoryAdd', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 154 /* ScanCode.NumpadMemorySubtract */, 'NumpadMemorySubtract', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 155 /* ScanCode.NumpadClear */, 'NumpadClear', 131 /* KeyCode.Clear */, 'Clear', 12, 'VK_CLEAR', empty, empty],
        [1, 156 /* ScanCode.NumpadClearEntry */, 'NumpadClearEntry', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 0 /* ScanCode.None */, empty, 5 /* KeyCode.Ctrl */, 'Ctrl', 17, 'VK_CONTROL', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 4 /* KeyCode.Shift */, 'Shift', 16, 'VK_SHIFT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 6 /* KeyCode.Alt */, 'Alt', 18, 'VK_MENU', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 57 /* KeyCode.Meta */, 'Meta', 91, 'VK_COMMAND', empty, empty],
        [1, 157 /* ScanCode.ControlLeft */, 'ControlLeft', 5 /* KeyCode.Ctrl */, empty, 0, 'VK_LCONTROL', empty, empty],
        [1, 158 /* ScanCode.ShiftLeft */, 'ShiftLeft', 4 /* KeyCode.Shift */, empty, 0, 'VK_LSHIFT', empty, empty],
        [1, 159 /* ScanCode.AltLeft */, 'AltLeft', 6 /* KeyCode.Alt */, empty, 0, 'VK_LMENU', empty, empty],
        [1, 160 /* ScanCode.MetaLeft */, 'MetaLeft', 57 /* KeyCode.Meta */, empty, 0, 'VK_LWIN', empty, empty],
        [1, 161 /* ScanCode.ControlRight */, 'ControlRight', 5 /* KeyCode.Ctrl */, empty, 0, 'VK_RCONTROL', empty, empty],
        [1, 162 /* ScanCode.ShiftRight */, 'ShiftRight', 4 /* KeyCode.Shift */, empty, 0, 'VK_RSHIFT', empty, empty],
        [1, 163 /* ScanCode.AltRight */, 'AltRight', 6 /* KeyCode.Alt */, empty, 0, 'VK_RMENU', empty, empty],
        [1, 164 /* ScanCode.MetaRight */, 'MetaRight', 57 /* KeyCode.Meta */, empty, 0, 'VK_RWIN', empty, empty],
        [1, 165 /* ScanCode.BrightnessUp */, 'BrightnessUp', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 166 /* ScanCode.BrightnessDown */, 'BrightnessDown', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 167 /* ScanCode.MediaPlay */, 'MediaPlay', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 168 /* ScanCode.MediaRecord */, 'MediaRecord', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 169 /* ScanCode.MediaFastForward */, 'MediaFastForward', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 170 /* ScanCode.MediaRewind */, 'MediaRewind', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 171 /* ScanCode.MediaTrackNext */, 'MediaTrackNext', 124 /* KeyCode.MediaTrackNext */, 'MediaTrackNext', 176, 'VK_MEDIA_NEXT_TRACK', empty, empty],
        [1, 172 /* ScanCode.MediaTrackPrevious */, 'MediaTrackPrevious', 125 /* KeyCode.MediaTrackPrevious */, 'MediaTrackPrevious', 177, 'VK_MEDIA_PREV_TRACK', empty, empty],
        [1, 173 /* ScanCode.MediaStop */, 'MediaStop', 126 /* KeyCode.MediaStop */, 'MediaStop', 178, 'VK_MEDIA_STOP', empty, empty],
        [1, 174 /* ScanCode.Eject */, 'Eject', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 175 /* ScanCode.MediaPlayPause */, 'MediaPlayPause', 127 /* KeyCode.MediaPlayPause */, 'MediaPlayPause', 179, 'VK_MEDIA_PLAY_PAUSE', empty, empty],
        [1, 176 /* ScanCode.MediaSelect */, 'MediaSelect', 128 /* KeyCode.LaunchMediaPlayer */, 'LaunchMediaPlayer', 181, 'VK_MEDIA_LAUNCH_MEDIA_SELECT', empty, empty],
        [1, 177 /* ScanCode.LaunchMail */, 'LaunchMail', 129 /* KeyCode.LaunchMail */, 'LaunchMail', 180, 'VK_MEDIA_LAUNCH_MAIL', empty, empty],
        [1, 178 /* ScanCode.LaunchApp2 */, 'LaunchApp2', 130 /* KeyCode.LaunchApp2 */, 'LaunchApp2', 183, 'VK_MEDIA_LAUNCH_APP2', empty, empty],
        [1, 179 /* ScanCode.LaunchApp1 */, 'LaunchApp1', 0 /* KeyCode.Unknown */, empty, 0, 'VK_MEDIA_LAUNCH_APP1', empty, empty],
        [1, 180 /* ScanCode.SelectTask */, 'SelectTask', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 181 /* ScanCode.LaunchScreenSaver */, 'LaunchScreenSaver', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 182 /* ScanCode.BrowserSearch */, 'BrowserSearch', 120 /* KeyCode.BrowserSearch */, 'BrowserSearch', 170, 'VK_BROWSER_SEARCH', empty, empty],
        [1, 183 /* ScanCode.BrowserHome */, 'BrowserHome', 121 /* KeyCode.BrowserHome */, 'BrowserHome', 172, 'VK_BROWSER_HOME', empty, empty],
        [1, 184 /* ScanCode.BrowserBack */, 'BrowserBack', 122 /* KeyCode.BrowserBack */, 'BrowserBack', 166, 'VK_BROWSER_BACK', empty, empty],
        [1, 185 /* ScanCode.BrowserForward */, 'BrowserForward', 123 /* KeyCode.BrowserForward */, 'BrowserForward', 167, 'VK_BROWSER_FORWARD', empty, empty],
        [1, 186 /* ScanCode.BrowserStop */, 'BrowserStop', 0 /* KeyCode.Unknown */, empty, 0, 'VK_BROWSER_STOP', empty, empty],
        [1, 187 /* ScanCode.BrowserRefresh */, 'BrowserRefresh', 0 /* KeyCode.Unknown */, empty, 0, 'VK_BROWSER_REFRESH', empty, empty],
        [1, 188 /* ScanCode.BrowserFavorites */, 'BrowserFavorites', 0 /* KeyCode.Unknown */, empty, 0, 'VK_BROWSER_FAVORITES', empty, empty],
        [1, 189 /* ScanCode.ZoomToggle */, 'ZoomToggle', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 190 /* ScanCode.MailReply */, 'MailReply', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 191 /* ScanCode.MailForward */, 'MailForward', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        [1, 192 /* ScanCode.MailSend */, 'MailSend', 0 /* KeyCode.Unknown */, empty, 0, empty, empty, empty],
        // See https://lists.w3.org/Archives/Public/www-dom/2010JulSep/att-0182/keyCode-spec.html
        // If an Input Method Editor is processing key input and the event is keydown, return 229.
        [1, 0 /* ScanCode.None */, empty, 114 /* KeyCode.KEY_IN_COMPOSITION */, 'KeyInComposition', 229, empty, empty, empty],
        [1, 0 /* ScanCode.None */, empty, 116 /* KeyCode.ABNT_C2 */, 'ABNT_C2', 194, 'VK_ABNT_C2', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 96 /* KeyCode.OEM_8 */, 'OEM_8', 223, 'VK_OEM_8', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_KANA', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_HANGUL', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_JUNJA', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_FINAL', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_HANJA', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_KANJI', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_CONVERT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_NONCONVERT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_ACCEPT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_MODECHANGE', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_SELECT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_PRINT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_EXECUTE', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_SNAPSHOT', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_HELP', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_APPS', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_PROCESSKEY', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_PACKET', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_DBE_SBCSCHAR', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_DBE_DBCSCHAR', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_ATTN', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_CRSEL', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_EXSEL', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_EREOF', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_PLAY', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_ZOOM', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_NONAME', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_PA1', empty, empty],
        [1, 0 /* ScanCode.None */, empty, 0 /* KeyCode.Unknown */, empty, 0, 'VK_OEM_CLEAR', empty, empty],
    ];
    const seenKeyCode = [];
    const seenScanCode = [];
    for (const mapping of mappings) {
        const [immutable, scanCode, scanCodeStr, keyCode, keyCodeStr, eventKeyCode, vkey, usUserSettingsLabel, generalUserSettingsLabel] = mapping;
        if (!seenScanCode[scanCode]) {
            seenScanCode[scanCode] = true;
            scanCodeIntToStr[scanCode] = scanCodeStr;
            scanCodeStrToInt[scanCodeStr] = scanCode;
            scanCodeLowerCaseStrToInt[scanCodeStr.toLowerCase()] = scanCode;
            if (immutable) {
                IMMUTABLE_CODE_TO_KEY_CODE[scanCode] = keyCode;
                if ((keyCode !== 0 /* KeyCode.Unknown */)
                    && (keyCode !== 3 /* KeyCode.Enter */)
                    && (keyCode !== 5 /* KeyCode.Ctrl */)
                    && (keyCode !== 4 /* KeyCode.Shift */)
                    && (keyCode !== 6 /* KeyCode.Alt */)
                    && (keyCode !== 57 /* KeyCode.Meta */)) {
                    IMMUTABLE_KEY_CODE_TO_CODE[keyCode] = scanCode;
                }
            }
        }
        if (!seenKeyCode[keyCode]) {
            seenKeyCode[keyCode] = true;
            if (!keyCodeStr) {
                throw new Error(`String representation missing for key code ${keyCode} around scan code ${scanCodeStr}`);
            }
            uiMap.define(keyCode, keyCodeStr);
            userSettingsUSMap.define(keyCode, usUserSettingsLabel || keyCodeStr);
            userSettingsGeneralMap.define(keyCode, generalUserSettingsLabel || usUserSettingsLabel || keyCodeStr);
        }
        if (eventKeyCode) {
            EVENT_KEY_CODE_MAP[eventKeyCode] = keyCode;
        }
        if (vkey) {
            NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE[vkey] = keyCode;
        }
    }
    // Manually added due to the exclusion above (due to duplication with NumpadEnter)
    IMMUTABLE_KEY_CODE_TO_CODE[3 /* KeyCode.Enter */] = 46 /* ScanCode.Enter */;
})();
export var KeyCodeUtils;
(function (KeyCodeUtils) {
    function toString(keyCode) {
        return uiMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toString = toString;
    function fromString(key) {
        return uiMap.strToKeyCode(key);
    }
    KeyCodeUtils.fromString = fromString;
    function toUserSettingsUS(keyCode) {
        return userSettingsUSMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toUserSettingsUS = toUserSettingsUS;
    function toUserSettingsGeneral(keyCode) {
        return userSettingsGeneralMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toUserSettingsGeneral = toUserSettingsGeneral;
    function fromUserSettings(key) {
        return userSettingsUSMap.strToKeyCode(key) || userSettingsGeneralMap.strToKeyCode(key);
    }
    KeyCodeUtils.fromUserSettings = fromUserSettings;
    function toElectronAccelerator(keyCode) {
        if (keyCode >= 98 /* KeyCode.Numpad0 */ && keyCode <= 113 /* KeyCode.NumpadDivide */) {
            // [Electron Accelerators] Electron is able to parse numpad keys, but unfortunately it
            // renders them just as regular keys in menus. For example, num0 is rendered as "0",
            // numdiv is rendered as "/", numsub is rendered as "-".
            //
            // This can lead to incredible confusion, as it makes numpad based keybindings indistinguishable
            // from keybindings based on regular keys.
            //
            // We therefore need to fall back to custom rendering for numpad keys.
            return null;
        }
        switch (keyCode) {
            case 16 /* KeyCode.UpArrow */:
                return 'Up';
            case 18 /* KeyCode.DownArrow */:
                return 'Down';
            case 15 /* KeyCode.LeftArrow */:
                return 'Left';
            case 17 /* KeyCode.RightArrow */:
                return 'Right';
        }
        return uiMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toElectronAccelerator = toElectronAccelerator;
})(KeyCodeUtils || (KeyCodeUtils = {}));
export var KeyMod;
(function (KeyMod) {
    KeyMod[KeyMod["CtrlCmd"] = 2048] = "CtrlCmd";
    KeyMod[KeyMod["Shift"] = 1024] = "Shift";
    KeyMod[KeyMod["Alt"] = 512] = "Alt";
    KeyMod[KeyMod["WinCtrl"] = 256] = "WinCtrl";
})(KeyMod || (KeyMod = {}));
export function KeyChord(firstPart, secondPart) {
    const chordPart = ((secondPart & 0x0000FFFF) << 16) >>> 0;
    return (firstPart | chordPart) >>> 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Q29kZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9rZXlDb2Rlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLE9BdU5qQjtBQXZORCxXQUFrQixPQUFPO0lBQ3hCLGdFQUFzQixDQUFBO0lBRXRCOztPQUVHO0lBQ0gsMkNBQVcsQ0FBQTtJQUVYLCtDQUFTLENBQUE7SUFDVCxtQ0FBRyxDQUFBO0lBQ0gsdUNBQUssQ0FBQTtJQUNMLHVDQUFLLENBQUE7SUFDTCxxQ0FBSSxDQUFBO0lBQ0osbUNBQUcsQ0FBQTtJQUNILGlEQUFVLENBQUE7SUFDViw2Q0FBUSxDQUFBO0lBQ1IseUNBQU0sQ0FBQTtJQUNOLHdDQUFLLENBQUE7SUFDTCwwQ0FBTSxDQUFBO0lBQ04sOENBQVEsQ0FBQTtJQUNSLG9DQUFHLENBQUE7SUFDSCxzQ0FBSSxDQUFBO0lBQ0osZ0RBQVMsQ0FBQTtJQUNULDRDQUFPLENBQUE7SUFDUCxrREFBVSxDQUFBO0lBQ1YsZ0RBQVMsQ0FBQTtJQUNULDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBRU4sMENBQU0sQ0FBQTtJQUNOLDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUNOLDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUNOLDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUVOLHNDQUFJLENBQUE7SUFDSixzQ0FBSSxDQUFBO0lBQ0osc0NBQUksQ0FBQTtJQUNKLHNDQUFJLENBQUE7SUFDSixzQ0FBSSxDQUFBO0lBQ0osc0NBQUksQ0FBQTtJQUNKLHNDQUFJLENBQUE7SUFDSixzQ0FBSSxD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TUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQywwQkFBaUIsTUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQywwQkFBaUIsTUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQywwQkFBaUIsTUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFB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RSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMEJBQWdCLEtBQUssd0JBQWUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN6RSxDQUFDLENBQUMsMkJBQWlCLE1BQU0sMkJBQW1CLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDMUUsQ0FBQyxDQUFDLDJCQUFpQixNQUFNLDJCQUFtQixLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQzFFLENBQUMsQ0FBQyw2QkFBbUIsUUFB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