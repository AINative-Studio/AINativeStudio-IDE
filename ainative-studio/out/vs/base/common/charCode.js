/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Names from https://blog.codinghorror.com/ascii-pronunciation-rules-for-programmers/
/**
 * An inlined enum containing useful character codes (to be used with String.charCodeAt).
 * Please leave the const keyword such that it gets inlined when compiled to JavaScript!
 */
export var CharCode;
(function (CharCode) {
    CharCode[CharCode["Null"] = 0] = "Null";
    /**
     * The `\b` character.
     */
    CharCode[CharCode["Backspace"] = 8] = "Backspace";
    /**
     * The `\t` character.
     */
    CharCode[CharCode["Tab"] = 9] = "Tab";
    /**
     * The `\n` character.
     */
    CharCode[CharCode["LineFeed"] = 10] = "LineFeed";
    /**
     * The `\r` character.
     */
    CharCode[CharCode["CarriageReturn"] = 13] = "CarriageReturn";
    CharCode[CharCode["Space"] = 32] = "Space";
    /**
     * The `!` character.
     */
    CharCode[CharCode["ExclamationMark"] = 33] = "ExclamationMark";
    /**
     * The `"` character.
     */
    CharCode[CharCode["DoubleQuote"] = 34] = "DoubleQuote";
    /**
     * The `#` character.
     */
    CharCode[CharCode["Hash"] = 35] = "Hash";
    /**
     * The `$` character.
     */
    CharCode[CharCode["DollarSign"] = 36] = "DollarSign";
    /**
     * The `%` character.
     */
    CharCode[CharCode["PercentSign"] = 37] = "PercentSign";
    /**
     * The `&` character.
     */
    CharCode[CharCode["Ampersand"] = 38] = "Ampersand";
    /**
     * The `'` character.
     */
    CharCode[CharCode["SingleQuote"] = 39] = "SingleQuote";
    /**
     * The `(` character.
     */
    CharCode[CharCode["OpenParen"] = 40] = "OpenParen";
    /**
     * The `)` character.
     */
    CharCode[CharCode["CloseParen"] = 41] = "CloseParen";
    /**
     * The `*` character.
     */
    CharCode[CharCode["Asterisk"] = 42] = "Asterisk";
    /**
     * The `+` character.
     */
    CharCode[CharCode["Plus"] = 43] = "Plus";
    /**
     * The `,` character.
     */
    CharCode[CharCode["Comma"] = 44] = "Comma";
    /**
     * The `-` character.
     */
    CharCode[CharCode["Dash"] = 45] = "Dash";
    /**
     * The `.` character.
     */
    CharCode[CharCode["Period"] = 46] = "Period";
    /**
     * The `/` character.
     */
    CharCode[CharCode["Slash"] = 47] = "Slash";
    CharCode[CharCode["Digit0"] = 48] = "Digit0";
    CharCode[CharCode["Digit1"] = 49] = "Digit1";
    CharCode[CharCode["Digit2"] = 50] = "Digit2";
    CharCode[CharCode["Digit3"] = 51] = "Digit3";
    CharCode[CharCode["Digit4"] = 52] = "Digit4";
    CharCode[CharCode["Digit5"] = 53] = "Digit5";
    CharCode[CharCode["Digit6"] = 54] = "Digit6";
    CharCode[CharCode["Digit7"] = 55] = "Digit7";
    CharCode[CharCode["Digit8"] = 56] = "Digit8";
    CharCode[CharCode["Digit9"] = 57] = "Digit9";
    /**
     * The `:` character.
     */
    CharCode[CharCode["Colon"] = 58] = "Colon";
    /**
     * The `;` character.
     */
    CharCode[CharCode["Semicolon"] = 59] = "Semicolon";
    /**
     * The `<` character.
     */
    CharCode[CharCode["LessThan"] = 60] = "LessThan";
    /**
     * The `=` character.
     */
    CharCode[CharCode["Equals"] = 61] = "Equals";
    /**
     * The `>` character.
     */
    CharCode[CharCode["GreaterThan"] = 62] = "GreaterThan";
    /**
     * The `?` character.
     */
    CharCode[CharCode["QuestionMark"] = 63] = "QuestionMark";
    /**
     * The `@` character.
     */
    CharCode[CharCode["AtSign"] = 64] = "AtSign";
    CharCode[CharCode["A"] = 65] = "A";
    CharCode[CharCode["B"] = 66] = "B";
    CharCode[CharCode["C"] = 67] = "C";
    CharCode[CharCode["D"] = 68] = "D";
    CharCode[CharCode["E"] = 69] = "E";
    CharCode[CharCode["F"] = 70] = "F";
    CharCode[CharCode["G"] = 71] = "G";
    CharCode[CharCode["H"] = 72] = "H";
    CharCode[CharCode["I"] = 73] = "I";
    CharCode[CharCode["J"] = 74] = "J";
    CharCode[CharCode["K"] = 75] = "K";
    CharCode[CharCode["L"] = 76] = "L";
    CharCode[CharCode["M"] = 77] = "M";
    CharCode[CharCode["N"] = 78] = "N";
    CharCode[CharCode["O"] = 79] = "O";
    CharCode[CharCode["P"] = 80] = "P";
    CharCode[CharCode["Q"] = 81] = "Q";
    CharCode[CharCode["R"] = 82] = "R";
    CharCode[CharCode["S"] = 83] = "S";
    CharCode[CharCode["T"] = 84] = "T";
    CharCode[CharCode["U"] = 85] = "U";
    CharCode[CharCode["V"] = 86] = "V";
    CharCode[CharCode["W"] = 87] = "W";
    CharCode[CharCode["X"] = 88] = "X";
    CharCode[CharCode["Y"] = 89] = "Y";
    CharCode[CharCode["Z"] = 90] = "Z";
    /**
     * The `[` character.
     */
    CharCode[CharCode["OpenSquareBracket"] = 91] = "OpenSquareBracket";
    /**
     * The `\` character.
     */
    CharCode[CharCode["Backslash"] = 92] = "Backslash";
    /**
     * The `]` character.
     */
    CharCode[CharCode["CloseSquareBracket"] = 93] = "CloseSquareBracket";
    /**
     * The `^` character.
     */
    CharCode[CharCode["Caret"] = 94] = "Caret";
    /**
     * The `_` character.
     */
    CharCode[CharCode["Underline"] = 95] = "Underline";
    /**
     * The ``(`)`` character.
     */
    CharCode[CharCode["BackTick"] = 96] = "BackTick";
    CharCode[CharCode["a"] = 97] = "a";
    CharCode[CharCode["b"] = 98] = "b";
    CharCode[CharCode["c"] = 99] = "c";
    CharCode[CharCode["d"] = 100] = "d";
    CharCode[CharCode["e"] = 101] = "e";
    CharCode[CharCode["f"] = 102] = "f";
    CharCode[CharCode["g"] = 103] = "g";
    CharCode[CharCode["h"] = 104] = "h";
    CharCode[CharCode["i"] = 105] = "i";
    CharCode[CharCode["j"] = 106] = "j";
    CharCode[CharCode["k"] = 107] = "k";
    CharCode[CharCode["l"] = 108] = "l";
    CharCode[CharCode["m"] = 109] = "m";
    CharCode[CharCode["n"] = 110] = "n";
    CharCode[CharCode["o"] = 111] = "o";
    CharCode[CharCode["p"] = 112] = "p";
    CharCode[CharCode["q"] = 113] = "q";
    CharCode[CharCode["r"] = 114] = "r";
    CharCode[CharCode["s"] = 115] = "s";
    CharCode[CharCode["t"] = 116] = "t";
    CharCode[CharCode["u"] = 117] = "u";
    CharCode[CharCode["v"] = 118] = "v";
    CharCode[CharCode["w"] = 119] = "w";
    CharCode[CharCode["x"] = 120] = "x";
    CharCode[CharCode["y"] = 121] = "y";
    CharCode[CharCode["z"] = 122] = "z";
    /**
     * The `{` character.
     */
    CharCode[CharCode["OpenCurlyBrace"] = 123] = "OpenCurlyBrace";
    /**
     * The `|` character.
     */
    CharCode[CharCode["Pipe"] = 124] = "Pipe";
    /**
     * The `}` character.
     */
    CharCode[CharCode["CloseCurlyBrace"] = 125] = "CloseCurlyBrace";
    /**
     * The `~` character.
     */
    CharCode[CharCode["Tilde"] = 126] = "Tilde";
    /**
     * The &nbsp; (no-break space) character.
     * Unicode Character 'NO-BREAK SPACE' (U+00A0)
     */
    CharCode[CharCode["NoBreakSpace"] = 160] = "NoBreakSpace";
    CharCode[CharCode["U_Combining_Grave_Accent"] = 768] = "U_Combining_Grave_Accent";
    CharCode[CharCode["U_Combining_Acute_Accent"] = 769] = "U_Combining_Acute_Accent";
    CharCode[CharCode["U_Combining_Circumflex_Accent"] = 770] = "U_Combining_Circumflex_Accent";
    CharCode[CharCode["U_Combining_Tilde"] = 771] = "U_Combining_Tilde";
    CharCode[CharCode["U_Combining_Macron"] = 772] = "U_Combining_Macron";
    CharCode[CharCode["U_Combining_Overline"] = 773] = "U_Combining_Overline";
    CharCode[CharCode["U_Combining_Breve"] = 774] = "U_Combining_Breve";
    CharCode[CharCode["U_Combining_Dot_Above"] = 775] = "U_Combining_Dot_Above";
    CharCode[CharCode["U_Combining_Diaeresis"] = 776] = "U_Combining_Diaeresis";
    CharCode[CharCode["U_Combining_Hook_Above"] = 777] = "U_Combining_Hook_Above";
    CharCode[CharCode["U_Combining_Ring_Above"] = 778] = "U_Combining_Ring_Above";
    CharCode[CharCode["U_Combining_Double_Acute_Accent"] = 779] = "U_Combining_Double_Acute_Accent";
    CharCode[CharCode["U_Combining_Caron"] = 780] = "U_Combining_Caron";
    CharCode[CharCode["U_Combining_Vertical_Line_Above"] = 781] = "U_Combining_Vertical_Line_Above";
    CharCode[CharCode["U_Combining_Double_Vertical_Line_Above"] = 782] = "U_Combining_Double_Vertical_Line_Above";
    CharCode[CharCode["U_Combining_Double_Grave_Accent"] = 783] = "U_Combining_Double_Grave_Accent";
    CharCode[CharCode["U_Combining_Candrabindu"] = 784] = "U_Combining_Candrabindu";
    CharCode[CharCode["U_Combining_Inverted_Breve"] = 785] = "U_Combining_Inverted_Breve";
    CharCode[CharCode["U_Combining_Turned_Comma_Above"] = 786] = "U_Combining_Turned_Comma_Above";
    CharCode[CharCode["U_Combining_Comma_Above"] = 787] = "U_Combining_Comma_Above";
    CharCode[CharCode["U_Combining_Reversed_Comma_Above"] = 788] = "U_Combining_Reversed_Comma_Above";
    CharCode[CharCode["U_Combining_Comma_Above_Right"] = 789] = "U_Combining_Comma_Above_Right";
    CharCode[CharCode["U_Combining_Grave_Accent_Below"] = 790] = "U_Combining_Grave_Accent_Below";
    CharCode[CharCode["U_Combining_Acute_Accent_Below"] = 791] = "U_Combining_Acute_Accent_Below";
    CharCode[CharCode["U_Combining_Left_Tack_Below"] = 792] = "U_Combining_Left_Tack_Below";
    CharCode[CharCode["U_Combining_Right_Tack_Below"] = 793] = "U_Combining_Right_Tack_Below";
    CharCode[CharCode["U_Combining_Left_Angle_Above"] = 794] = "U_Combining_Left_Angle_Above";
    CharCode[CharCode["U_Combining_Horn"] = 795] = "U_Combining_Horn";
    CharCode[CharCode["U_Combining_Left_Half_Ring_Below"] = 796] = "U_Combining_Left_Half_Ring_Below";
    CharCode[CharCode["U_Combining_Up_Tack_Below"] = 797] = "U_Combining_Up_Tack_Below";
    CharCode[CharCode["U_Combining_Down_Tack_Below"] = 798] = "U_Combining_Down_Tack_Below";
    CharCode[CharCode["U_Combining_Plus_Sign_Below"] = 799] = "U_Combining_Plus_Sign_Below";
    CharCode[CharCode["U_Combining_Minus_Sign_Below"] = 800] = "U_Combining_Minus_Sign_Below";
    CharCode[CharCode["U_Combining_Palatalized_Hook_Below"] = 801] = "U_Combining_Palatalized_Hook_Below";
    CharCode[CharCode["U_Combining_Retroflex_Hook_Below"] = 802] = "U_Combining_Retroflex_Hook_Below";
    CharCode[CharCode["U_Combining_Dot_Below"] = 803] = "U_Combining_Dot_Below";
    CharCode[CharCode["U_Combining_Diaeresis_Below"] = 804] = "U_Combining_Diaeresis_Below";
    CharCode[CharCode["U_Combining_Ring_Below"] = 805] = "U_Combining_Ring_Below";
    CharCode[CharCode["U_Combining_Comma_Below"] = 806] = "U_Combining_Comma_Below";
    CharCode[CharCode["U_Combining_Cedilla"] = 807] = "U_Combining_Cedilla";
    CharCode[CharCode["U_Combining_Ogonek"] = 808] = "U_Combining_Ogonek";
    CharCode[CharCode["U_Combining_Vertical_Line_Below"] = 809] = "U_Combining_Vertical_Line_Below";
    CharCode[CharCode["U_Combining_Bridge_Below"] = 810] = "U_Combining_Bridge_Below";
    CharCode[CharCode["U_Combining_Inverted_Double_Arch_Below"] = 811] = "U_Combining_Inverted_Double_Arch_Below";
    CharCode[CharCode["U_Combining_Caron_Below"] = 812] = "U_Combining_Caron_Below";
    CharCode[CharCode["U_Combining_Circumflex_Accent_Below"] = 813] = "U_Combining_Circumflex_Accent_Below";
    CharCode[CharCode["U_Combining_Breve_Below"] = 814] = "U_Combining_Breve_Below";
    CharCode[CharCode["U_Combining_Inverted_Breve_Below"] = 815] = "U_Combining_Inverted_Breve_Below";
    CharCode[CharCode["U_Combining_Tilde_Below"] = 816] = "U_Combining_Tilde_Below";
    CharCode[CharCode["U_Combining_Macron_Below"] = 817] = "U_Combining_Macron_Below";
    CharCode[CharCode["U_Combining_Low_Line"] = 818] = "U_Combining_Low_Line";
    CharCode[CharCode["U_Combining_Double_Low_Line"] = 819] = "U_Combining_Double_Low_Line";
    CharCode[CharCode["U_Combining_Tilde_Overlay"] = 820] = "U_Combining_Tilde_Overlay";
    CharCode[CharCode["U_Combining_Short_Stroke_Overlay"] = 821] = "U_Combining_Short_Stroke_Overlay";
    CharCode[CharCode["U_Combining_Long_Stroke_Overlay"] = 822] = "U_Combining_Long_Stroke_Overlay";
    CharCode[CharCode["U_Combining_Short_Solidus_Overlay"] = 823] = "U_Combining_Short_Solidus_Overlay";
    CharCode[CharCode["U_Combining_Long_Solidus_Overlay"] = 824] = "U_Combining_Long_Solidus_Overlay";
    CharCode[CharCode["U_Combining_Right_Half_Ring_Below"] = 825] = "U_Combining_Right_Half_Ring_Below";
    CharCode[CharCode["U_Combining_Inverted_Bridge_Below"] = 826] = "U_Combining_Inverted_Bridge_Below";
    CharCode[CharCode["U_Combining_Square_Below"] = 827] = "U_Combining_Square_Below";
    CharCode[CharCode["U_Combining_Seagull_Below"] = 828] = "U_Combining_Seagull_Below";
    CharCode[CharCode["U_Combining_X_Above"] = 829] = "U_Combining_X_Above";
    CharCode[CharCode["U_Combining_Vertical_Tilde"] = 830] = "U_Combining_Vertical_Tilde";
    CharCode[CharCode["U_Combining_Double_Overline"] = 831] = "U_Combining_Double_Overline";
    CharCode[CharCode["U_Combining_Grave_Tone_Mark"] = 832] = "U_Combining_Grave_Tone_Mark";
    CharCode[CharCode["U_Combining_Acute_Tone_Mark"] = 833] = "U_Combining_Acute_Tone_Mark";
    CharCode[CharCode["U_Combining_Greek_Perispomeni"] = 834] = "U_Combining_Greek_Perispomeni";
    CharCode[CharCode["U_Combining_Greek_Koronis"] = 835] = "U_Combining_Greek_Koronis";
    CharCode[CharCode["U_Combining_Greek_Dialytika_Tonos"] = 836] = "U_Combining_Greek_Dialytika_Tonos";
    CharCode[CharCode["U_Combining_Greek_Ypogegrammeni"] = 837] = "U_Combining_Greek_Ypogegrammeni";
    CharCode[CharCode["U_Combining_Bridge_Above"] = 838] = "U_Combining_Bridge_Above";
    CharCode[CharCode["U_Combining_Equals_Sign_Below"] = 839] = "U_Combining_Equals_Sign_Below";
    CharCode[CharCode["U_Combining_Double_Vertical_Line_Below"] = 840] = "U_Combining_Double_Vertical_Line_Below";
    CharCode[CharCode["U_Combining_Left_Angle_Below"] = 841] = "U_Combining_Left_Angle_Below";
    CharCode[CharCode["U_Combining_Not_Tilde_Above"] = 842] = "U_Combining_Not_Tilde_Above";
    CharCode[CharCode["U_Combining_Homothetic_Above"] = 843] = "U_Combining_Homothetic_Above";
    CharCode[CharCode["U_Combining_Almost_Equal_To_Above"] = 844] = "U_Combining_Almost_Equal_To_Above";
    CharCode[CharCode["U_Combining_Left_Right_Arrow_Below"] = 845] = "U_Combining_Left_Right_Arrow_Below";
    CharCode[CharCode["U_Combining_Upwards_Arrow_Below"] = 846] = "U_Combining_Upwards_Arrow_Below";
    CharCode[CharCode["U_Combining_Grapheme_Joiner"] = 847] = "U_Combining_Grapheme_Joiner";
    CharCode[CharCode["U_Combining_Right_Arrowhead_Above"] = 848] = "U_Combining_Right_Arrowhead_Above";
    CharCode[CharCode["U_Combining_Left_Half_Ring_Above"] = 849] = "U_Combining_Left_Half_Ring_Above";
    CharCode[CharCode["U_Combining_Fermata"] = 850] = "U_Combining_Fermata";
    CharCode[CharCode["U_Combining_X_Below"] = 851] = "U_Combining_X_Below";
    CharCode[CharCode["U_Combining_Left_Arrowhead_Below"] = 852] = "U_Combining_Left_Arrowhead_Below";
    CharCode[CharCode["U_Combining_Right_Arrowhead_Below"] = 853] = "U_Combining_Right_Arrowhead_Below";
    CharCode[CharCode["U_Combining_Right_Arrowhead_And_Up_Arrowhead_Below"] = 854] = "U_Combining_Right_Arrowhead_And_Up_Arrowhead_Below";
    CharCode[CharCode["U_Combining_Right_Half_Ring_Above"] = 855] = "U_Combining_Right_Half_Ring_Above";
    CharCode[CharCode["U_Combining_Dot_Above_Right"] = 856] = "U_Combining_Dot_Above_Right";
    CharCode[CharCode["U_Combining_Asterisk_Below"] = 857] = "U_Combining_Asterisk_Below";
    CharCode[CharCode["U_Combining_Double_Ring_Below"] = 858] = "U_Combining_Double_Ring_Below";
    CharCode[CharCode["U_Combining_Zigzag_Above"] = 859] = "U_Combining_Zigzag_Above";
    CharCode[CharCode["U_Combining_Double_Breve_Below"] = 860] = "U_Combining_Double_Breve_Below";
    CharCode[CharCode["U_Combining_Double_Breve"] = 861] = "U_Combining_Double_Breve";
    CharCode[CharCode["U_Combining_Double_Macron"] = 862] = "U_Combining_Double_Macron";
    CharCode[CharCode["U_Combining_Double_Macron_Below"] = 863] = "U_Combining_Double_Macron_Below";
    CharCode[CharCode["U_Combining_Double_Tilde"] = 864] = "U_Combining_Double_Tilde";
    CharCode[CharCode["U_Combining_Double_Inverted_Breve"] = 865] = "U_Combining_Double_Inverted_Breve";
    CharCode[CharCode["U_Combining_Double_Rightwards_Arrow_Below"] = 866] = "U_Combining_Double_Rightwards_Arrow_Below";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_A"] = 867] = "U_Combining_Latin_Small_Letter_A";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_E"] = 868] = "U_Combining_Latin_Small_Letter_E";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_I"] = 869] = "U_Combining_Latin_Small_Letter_I";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_O"] = 870] = "U_Combining_Latin_Small_Letter_O";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_U"] = 871] = "U_Combining_Latin_Small_Letter_U";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_C"] = 872] = "U_Combining_Latin_Small_Letter_C";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_D"] = 873] = "U_Combining_Latin_Small_Letter_D";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_H"] = 874] = "U_Combining_Latin_Small_Letter_H";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_M"] = 875] = "U_Combining_Latin_Small_Letter_M";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_R"] = 876] = "U_Combining_Latin_Small_Letter_R";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_T"] = 877] = "U_Combining_Latin_Small_Letter_T";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_V"] = 878] = "U_Combining_Latin_Small_Letter_V";
    CharCode[CharCode["U_Combining_Latin_Small_Letter_X"] = 879] = "U_Combining_Latin_Small_Letter_X";
    /**
     * Unicode Character 'LINE SEPARATOR' (U+2028)
     * http://www.fileformat.info/info/unicode/char/2028/index.htm
     */
    CharCode[CharCode["LINE_SEPARATOR"] = 8232] = "LINE_SEPARATOR";
    /**
     * Unicode Character 'PARAGRAPH SEPARATOR' (U+2029)
     * http://www.fileformat.info/info/unicode/char/2029/index.htm
     */
    CharCode[CharCode["PARAGRAPH_SEPARATOR"] = 8233] = "PARAGRAPH_SEPARATOR";
    /**
     * Unicode Character 'NEXT LINE' (U+0085)
     * http://www.fileformat.info/info/unicode/char/0085/index.htm
     */
    CharCode[CharCode["NEXT_LINE"] = 133] = "NEXT_LINE";
    // http://www.fileformat.info/info/unicode/category/Sk/list.htm
    CharCode[CharCode["U_CIRCUMFLEX"] = 94] = "U_CIRCUMFLEX";
    CharCode[CharCode["U_GRAVE_ACCENT"] = 96] = "U_GRAVE_ACCENT";
    CharCode[CharCode["U_DIAERESIS"] = 168] = "U_DIAERESIS";
    CharCode[CharCode["U_MACRON"] = 175] = "U_MACRON";
    CharCode[CharCode["U_ACUTE_ACCENT"] = 180] = "U_ACUTE_ACCENT";
    CharCode[CharCode["U_CEDILLA"] = 184] = "U_CEDILLA";
    CharCode[CharCode["U_MODIFIER_LETTER_LEFT_ARROWHEAD"] = 706] = "U_MODIFIER_LETTER_LEFT_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_RIGHT_ARROWHEAD"] = 707] = "U_MODIFIER_LETTER_RIGHT_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_UP_ARROWHEAD"] = 708] = "U_MODIFIER_LETTER_UP_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_DOWN_ARROWHEAD"] = 709] = "U_MODIFIER_LETTER_DOWN_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_CENTRED_RIGHT_HALF_RING"] = 722] = "U_MODIFIER_LETTER_CENTRED_RIGHT_HALF_RING";
    CharCode[CharCode["U_MODIFIER_LETTER_CENTRED_LEFT_HALF_RING"] = 723] = "U_MODIFIER_LETTER_CENTRED_LEFT_HALF_RING";
    CharCode[CharCode["U_MODIFIER_LETTER_UP_TACK"] = 724] = "U_MODIFIER_LETTER_UP_TACK";
    CharCode[CharCode["U_MODIFIER_LETTER_DOWN_TACK"] = 725] = "U_MODIFIER_LETTER_DOWN_TACK";
    CharCode[CharCode["U_MODIFIER_LETTER_PLUS_SIGN"] = 726] = "U_MODIFIER_LETTER_PLUS_SIGN";
    CharCode[CharCode["U_MODIFIER_LETTER_MINUS_SIGN"] = 727] = "U_MODIFIER_LETTER_MINUS_SIGN";
    CharCode[CharCode["U_BREVE"] = 728] = "U_BREVE";
    CharCode[CharCode["U_DOT_ABOVE"] = 729] = "U_DOT_ABOVE";
    CharCode[CharCode["U_RING_ABOVE"] = 730] = "U_RING_ABOVE";
    CharCode[CharCode["U_OGONEK"] = 731] = "U_OGONEK";
    CharCode[CharCode["U_SMALL_TILDE"] = 732] = "U_SMALL_TILDE";
    CharCode[CharCode["U_DOUBLE_ACUTE_ACCENT"] = 733] = "U_DOUBLE_ACUTE_ACCENT";
    CharCode[CharCode["U_MODIFIER_LETTER_RHOTIC_HOOK"] = 734] = "U_MODIFIER_LETTER_RHOTIC_HOOK";
    CharCode[CharCode["U_MODIFIER_LETTER_CROSS_ACCENT"] = 735] = "U_MODIFIER_LETTER_CROSS_ACCENT";
    CharCode[CharCode["U_MODIFIER_LETTER_EXTRA_HIGH_TONE_BAR"] = 741] = "U_MODIFIER_LETTER_EXTRA_HIGH_TONE_BAR";
    CharCode[CharCode["U_MODIFIER_LETTER_HIGH_TONE_BAR"] = 742] = "U_MODIFIER_LETTER_HIGH_TONE_BAR";
    CharCode[CharCode["U_MODIFIER_LETTER_MID_TONE_BAR"] = 743] = "U_MODIFIER_LETTER_MID_TONE_BAR";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_TONE_BAR"] = 744] = "U_MODIFIER_LETTER_LOW_TONE_BAR";
    CharCode[CharCode["U_MODIFIER_LETTER_EXTRA_LOW_TONE_BAR"] = 745] = "U_MODIFIER_LETTER_EXTRA_LOW_TONE_BAR";
    CharCode[CharCode["U_MODIFIER_LETTER_YIN_DEPARTING_TONE_MARK"] = 746] = "U_MODIFIER_LETTER_YIN_DEPARTING_TONE_MARK";
    CharCode[CharCode["U_MODIFIER_LETTER_YANG_DEPARTING_TONE_MARK"] = 747] = "U_MODIFIER_LETTER_YANG_DEPARTING_TONE_MARK";
    CharCode[CharCode["U_MODIFIER_LETTER_UNASPIRATED"] = 749] = "U_MODIFIER_LETTER_UNASPIRATED";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_DOWN_ARROWHEAD"] = 751] = "U_MODIFIER_LETTER_LOW_DOWN_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_UP_ARROWHEAD"] = 752] = "U_MODIFIER_LETTER_LOW_UP_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_LEFT_ARROWHEAD"] = 753] = "U_MODIFIER_LETTER_LOW_LEFT_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_RIGHT_ARROWHEAD"] = 754] = "U_MODIFIER_LETTER_LOW_RIGHT_ARROWHEAD";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_RING"] = 755] = "U_MODIFIER_LETTER_LOW_RING";
    CharCode[CharCode["U_MODIFIER_LETTER_MIDDLE_GRAVE_ACCENT"] = 756] = "U_MODIFIER_LETTER_MIDDLE_GRAVE_ACCENT";
    CharCode[CharCode["U_MODIFIER_LETTER_MIDDLE_DOUBLE_GRAVE_ACCENT"] = 757] = "U_MODIFIER_LETTER_MIDDLE_DOUBLE_GRAVE_ACCENT";
    CharCode[CharCode["U_MODIFIER_LETTER_MIDDLE_DOUBLE_ACUTE_ACCENT"] = 758] = "U_MODIFIER_LETTER_MIDDLE_DOUBLE_ACUTE_ACCENT";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_TILDE"] = 759] = "U_MODIFIER_LETTER_LOW_TILDE";
    CharCode[CharCode["U_MODIFIER_LETTER_RAISED_COLON"] = 760] = "U_MODIFIER_LETTER_RAISED_COLON";
    CharCode[CharCode["U_MODIFIER_LETTER_BEGIN_HIGH_TONE"] = 761] = "U_MODIFIER_LETTER_BEGIN_HIGH_TONE";
    CharCode[CharCode["U_MODIFIER_LETTER_END_HIGH_TONE"] = 762] = "U_MODIFIER_LETTER_END_HIGH_TONE";
    CharCode[CharCode["U_MODIFIER_LETTER_BEGIN_LOW_TONE"] = 763] = "U_MODIFIER_LETTER_BEGIN_LOW_TONE";
    CharCode[CharCode["U_MODIFIER_LETTER_END_LOW_TONE"] = 764] = "U_MODIFIER_LETTER_END_LOW_TONE";
    CharCode[CharCode["U_MODIFIER_LETTER_SHELF"] = 765] = "U_MODIFIER_LETTER_SHELF";
    CharCode[CharCode["U_MODIFIER_LETTER_OPEN_SHELF"] = 766] = "U_MODIFIER_LETTER_OPEN_SHELF";
    CharCode[CharCode["U_MODIFIER_LETTER_LOW_LEFT_ARROW"] = 767] = "U_MODIFIER_LETTER_LOW_LEFT_ARROW";
    CharCode[CharCode["U_GREEK_LOWER_NUMERAL_SIGN"] = 885] = "U_GREEK_LOWER_NUMERAL_SIGN";
    CharCode[CharCode["U_GREEK_TONOS"] = 900] = "U_GREEK_TONOS";
    CharCode[CharCode["U_GREEK_DIALYTIKA_TONOS"] = 901] = "U_GREEK_DIALYTIKA_TONOS";
    CharCode[CharCode["U_GREEK_KORONIS"] = 8125] = "U_GREEK_KORONIS";
    CharCode[CharCode["U_GREEK_PSILI"] = 8127] = "U_GREEK_PSILI";
    CharCode[CharCode["U_GREEK_PERISPOMENI"] = 8128] = "U_GREEK_PERISPOMENI";
    CharCode[CharCode["U_GREEK_DIALYTIKA_AND_PERISPOMENI"] = 8129] = "U_GREEK_DIALYTIKA_AND_PERISPOMENI";
    CharCode[CharCode["U_GREEK_PSILI_AND_VARIA"] = 8141] = "U_GREEK_PSILI_AND_VARIA";
    CharCode[CharCode["U_GREEK_PSILI_AND_OXIA"] = 8142] = "U_GREEK_PSILI_AND_OXIA";
    CharCode[CharCode["U_GREEK_PSILI_AND_PERISPOMENI"] = 8143] = "U_GREEK_PSILI_AND_PERISPOMENI";
    CharCode[CharCode["U_GREEK_DASIA_AND_VARIA"] = 8157] = "U_GREEK_DASIA_AND_VARIA";
    CharCode[CharCode["U_GREEK_DASIA_AND_OXIA"] = 8158] = "U_GREEK_DASIA_AND_OXIA";
    CharCode[CharCode["U_GREEK_DASIA_AND_PERISPOMENI"] = 8159] = "U_GREEK_DASIA_AND_PERISPOMENI";
    CharCode[CharCode["U_GREEK_DIALYTIKA_AND_VARIA"] = 8173] = "U_GREEK_DIALYTIKA_AND_VARIA";
    CharCode[CharCode["U_GREEK_DIALYTIKA_AND_OXIA"] = 8174] = "U_GREEK_DIALYTIKA_AND_OXIA";
    CharCode[CharCode["U_GREEK_VARIA"] = 8175] = "U_GREEK_VARIA";
    CharCode[CharCode["U_GREEK_OXIA"] = 8189] = "U_GREEK_OXIA";
    CharCode[CharCode["U_GREEK_DASIA"] = 8190] = "U_GREEK_DASIA";
    CharCode[CharCode["U_IDEOGRAPHIC_FULL_STOP"] = 12290] = "U_IDEOGRAPHIC_FULL_STOP";
    CharCode[CharCode["U_LEFT_CORNER_BRACKET"] = 12300] = "U_LEFT_CORNER_BRACKET";
    CharCode[CharCode["U_RIGHT_CORNER_BRACKET"] = 12301] = "U_RIGHT_CORNER_BRACKET";
    CharCode[CharCode["U_LEFT_BLACK_LENTICULAR_BRACKET"] = 12304] = "U_LEFT_BLACK_LENTICULAR_BRACKET";
    CharCode[CharCode["U_RIGHT_BLACK_LENTICULAR_BRACKET"] = 12305] = "U_RIGHT_BLACK_LENTICULAR_BRACKET";
    CharCode[CharCode["U_OVERLINE"] = 8254] = "U_OVERLINE";
    /**
     * UTF-8 BOM
     * Unicode Character 'ZERO WIDTH NO-BREAK SPACE' (U+FEFF)
     * http://www.fileformat.info/info/unicode/char/feff/index.htm
     */
    CharCode[CharCode["UTF8_BOM"] = 65279] = "UTF8_BOM";
    CharCode[CharCode["U_FULLWIDTH_SEMICOLON"] = 65307] = "U_FULLWIDTH_SEMICOLON";
    CharCode[CharCode["U_FULLWIDTH_COMMA"] = 65292] = "U_FULLWIDTH_COMMA";
})(CharCode || (CharCode = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhckNvZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY2hhckNvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsc0ZBQXNGO0FBRXRGOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFrQixRQXNiakI7QUF0YkQsV0FBa0IsUUFBUTtJQUN6Qix1Q0FBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCxpREFBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCxxQ0FBTyxDQUFBO0lBQ1A7O09BRUc7SUFDSCxnREFBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCw0REFBbUIsQ0FBQTtJQUNuQiwwQ0FBVSxDQUFBO0lBQ1Y7O09BRUc7SUFDSCw4REFBb0IsQ0FBQTtJQUNwQjs7T0FFRztJQUNILHNEQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gsd0NBQVMsQ0FBQTtJQUNUOztPQUVHO0lBQ0gsb0RBQWUsQ0FBQTtJQUNmOztPQUVHO0lBQ0gsc0RBQWdCLENBQUE7SUFDaEI7O09BRUc7SUFDSCxrREFBYyxDQUFBO0lBQ2Q7O09BRUc7SUFDSCxzREFBZ0IsQ0FBQTtJQUNoQjs7T0FFRztJQUNILGtEQUFjLENBQUE7SUFDZDs7T0FFRztJQUNILG9EQUFlLENBQUE7SUFDZjs7T0FFRztJQUNILGdEQUFhLENBQUE7SUFDYjs7T0FFRztJQUNILHdDQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILDBDQUFVLENBQUE7SUFDVjs7T0FFRztJQUNILHdDQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILDRDQUFXLENBQUE7SUFDWDs7T0FFRztJQUNILDBDQUFVLENBQUE7SUFFViw0Q0FBVyxDQUFBO0lBQ1gsNENBQVcsQ0FBQTtJQUNYLDRDQUFXLENBQUE7SUFDWCw0Q0FBVyxDQUFBO0lBQ1gsNENBQVcsQ0FBQTtJ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QyxDQUFBO0lBQ3RDLDZGQUF1QyxDQUFBO0lBQ3ZDLDZGQUF1QyxDQUFBO0lBQ3ZDLHVGQUFvQyxDQUFBO0lBQ3BDLHlGQUFxQyxDQUFBO0lBQ3JDLHlGQUFxQyxDQUFBO0lBQ3JDLGlFQUF5QixDQUFBO0lBQ3pCLGlHQUF5QyxDQUFBO0lBQ3pDLG1GQUFrQyxDQUFBO0lBQ2xDLHVGQUFvQyxDQUFBO0lBQ3BDLHVGQUFvQyxDQUFBO0lBQ3BDLHlGQUFxQyxDQUFBO0lBQ3JDLHFHQUEyQyxDQUFBO0lBQzNDLGlHQUF5QyxDQUFBO0lBQ3pDLDJFQUE4QixDQUFBO0lBQzlCLHVGQUFvQyxDQUFBO0lBQ3BDLDZFQUErQixDQUFBO0lBQy9CLCtFQUFnQyxDQUFBO0lBQ2hDLHVFQUE0QixDQUFBO0lBQzVCLHFFQUEyQixDQUFBO0lBQzNCLCtGQUF3QyxDQUFBO0lBQ3hDLGlGQUFpQyxDQUFBO0lBQ2pDLDZHQUErQyxDQUFBO0lBQy9DLCtFQUFnQyxDQUFBO0lBQ2hDLHVHQUE0QyxDQUFBO0lBQzVDLCtFQUFnQyxDQUFBO0lBQ2hDLGlHQUF5QyxDQUFBO0lBQ3pDLCtFQUFnQyxDQUFBO0lBQ2hDLGlGQUFpQyxDQUFBO0lBQ2pDLHlFQUE2QixDQUFBO0lBQzdCLHVGQUFvQyxDQUFBO0lBQ3BDLG1GQUFrQyxDQUFBO0lBQ2xDLGlHQUF5QyxDQUFBO0lBQ3pDLCtGQUF3QyxDQUFBO0lBQ3hDLG1HQUEwQyxDQUFBO0lBQzFDLGlHQUF5QyxDQUFBO0lBQ3pDLG1HQUEwQyxDQUFBO0lBQzFDLG1HQUEwQyxDQUFBO0lBQzFDLGlGQUFpQyxDQUFBO0lBQ2pDLG1GQUFrQyxDQUFBO0lBQ2xDLHVFQUE0QixDQUFBO0lBQzVCLHFGQUFtQyxDQUFBO0lBQ25DLHVGQUFvQyxDQUFBO0lBQ3BDLHVGQUFvQyxDQUFBO0lBQ3BDLHVGQUFvQyxDQUFBO0lBQ3BDLDJGQUFzQyxDQUFBO0lBQ3RDLG1GQUFrQyxDQUFBO0lBQ2xDLG1HQUEwQyxDQUFBO0lBQzFDLCtGQUF3QyxDQUFBO0lBQ3hDLGlGQUFpQyxDQUFBO0lBQ2pDLDJGQUFz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