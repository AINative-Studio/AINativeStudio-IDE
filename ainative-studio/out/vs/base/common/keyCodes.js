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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Q29kZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24va2V5Q29kZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7R0FJRztBQUNILE1BQU0sQ0FBTixJQUFrQixPQXVOakI7QUF2TkQsV0FBa0IsT0FBTztJQUN4QixnRUFBc0IsQ0FBQTtJQUV0Qjs7T0FFRztJQUNILDJDQUFXLENBQUE7SUFFWCwrQ0FBUyxDQUFBO0lBQ1QsbUNBQUcsQ0FBQTtJQUNILHVDQUFLLENBQUE7SUFDTCx1Q0FBSyxDQUFBO0lBQ0wscUNBQUksQ0FBQTtJQUNKLG1DQUFHLENBQUE7SUFDSCxpREFBVSxDQUFBO0lBQ1YsNkNBQVEsQ0FBQTtJQUNSLHlDQUFNLENBQUE7SUFDTix3Q0FBSyxDQUFBO0lBQ0wsMENBQU0sQ0FBQTtJQUNOLDhDQUFRLENBQUE7SUFDUixvQ0FBRyxDQUFBO0lBQ0gsc0NBQUksQ0FBQTtJQUNKLGdEQUFTLENBQUE7SUFDVCw0Q0FBTyxDQUFBO0lBQ1Asa0RBQVUsQ0FBQTtJQUNWLGdEQUFTLENBQUE7SUFDVCwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUVOLDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUNOLDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUNOLDBDQUFNLENBQUE7SUFDTiwwQ0FBTSxDQUFBO0lBQ04sMENBQU0sQ0FBQTtJQUNOLDBDQUFNLENBQUE7SUFFTixzQ0FBSSxDQUFBO0lBQ0osc0NBQUksQ0FBQTtJQUNKLHNDQUFJLENBQUE7SUFDSixzQ0FBSSxDQUFBO0lBQ0osc0NBQUksQ0FBQTtJQUNKLHNDQUFJLENBQUE7SUFDSixzQ0FBSSxDQUFBO0lBQ0osc0NBQUks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LE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQywwQkFBaUIsTUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQywwQkFBaUIsTUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQywwQkFBaUIsTUFBTSx5QkFBZ0IsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUN2RSxDQUFDLENBQUMsMEJBQWlCLE1BQU0seUJBQWdCLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDdkUsQ0FBQyxDQUFDLDBCQUFpQixNQUFNLHlCQUFnQixHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVB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QUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDBCQUFnQixLQUFLLHdCQUFlLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDekUsQ0FBQyxDQUFDLDJCQUFpQixNQUFNLDJCQUFtQixLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQzFFLENBQUMsQ0FBQywyQkFBaUIsTUFBTSwyQkFBbUIsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUMxRSxDQUFDLENBQUMsNkJBQW1CLFFB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LEtBQUssMkJBQW1CLEtBQUssRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUNyRixDQUFDLENBQUMseUJBQWlCLEtBQUssMkJBQW1CLEtBQUssRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUNyRixDQUFDLENBQUMseUJBQWlCLEtBQUssMkJBQW1CLEtBQUssRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDN0UsQ0FBQyxDQUFDLHlCQUFpQixLQUFLLDJCQUFtQixLQUFLLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQzlFLENBQUMsQ0FBQyx5QkFBaUIsS0FBSywyQkFBbUIsS0FBSyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUM5RSxDQUFDLENBQUMseUJBQWlCLEtBQUssMkJBQW1CLEtBQUssRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDOUUsQ0FBQyxDQUFDLHlCQUFpQixLQUFLLDJCQUFtQixLQUFLLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQzdFLENBQUMsQ0FBQyx5QkFBaUIsS0FBSywyQkFBbUIsS0FBSyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUM3RSxDQUFDLENBQUMseUJBQWlCLEtBQUssMkJBQW1CLEtBQUssRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDL0UsQ0FBQyxDQUFDLHlCQUFpQixLQUFLLDJCQUFtQixLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQzVFLENBQUMsQ0FBQyx5QkFBaUIsS0FBSywyQkFBbUIsS0FBSyxFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FB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