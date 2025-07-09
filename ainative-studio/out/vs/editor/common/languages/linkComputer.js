/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CharacterClassifier } from '../core/characterClassifier.js';
export var State;
(function (State) {
    State[State["Invalid"] = 0] = "Invalid";
    State[State["Start"] = 1] = "Start";
    State[State["H"] = 2] = "H";
    State[State["HT"] = 3] = "HT";
    State[State["HTT"] = 4] = "HTT";
    State[State["HTTP"] = 5] = "HTTP";
    State[State["F"] = 6] = "F";
    State[State["FI"] = 7] = "FI";
    State[State["FIL"] = 8] = "FIL";
    State[State["BeforeColon"] = 9] = "BeforeColon";
    State[State["AfterColon"] = 10] = "AfterColon";
    State[State["AlmostThere"] = 11] = "AlmostThere";
    State[State["End"] = 12] = "End";
    State[State["Accept"] = 13] = "Accept";
    State[State["LastKnownState"] = 14] = "LastKnownState"; // marker, custom states may follow
})(State || (State = {}));
class Uint8Matrix {
    constructor(rows, cols, defaultValue) {
        const data = new Uint8Array(rows * cols);
        for (let i = 0, len = rows * cols; i < len; i++) {
            data[i] = defaultValue;
        }
        this._data = data;
        this.rows = rows;
        this.cols = cols;
    }
    get(row, col) {
        return this._data[row * this.cols + col];
    }
    set(row, col, value) {
        this._data[row * this.cols + col] = value;
    }
}
export class StateMachine {
    constructor(edges) {
        let maxCharCode = 0;
        let maxState = 0 /* State.Invalid */;
        for (let i = 0, len = edges.length; i < len; i++) {
            const [from, chCode, to] = edges[i];
            if (chCode > maxCharCode) {
                maxCharCode = chCode;
            }
            if (from > maxState) {
                maxState = from;
            }
            if (to > maxState) {
                maxState = to;
            }
        }
        maxCharCode++;
        maxState++;
        const states = new Uint8Matrix(maxState, maxCharCode, 0 /* State.Invalid */);
        for (let i = 0, len = edges.length; i < len; i++) {
            const [from, chCode, to] = edges[i];
            states.set(from, chCode, to);
        }
        this._states = states;
        this._maxCharCode = maxCharCode;
    }
    nextState(currentState, chCode) {
        if (chCode < 0 || chCode >= this._maxCharCode) {
            return 0 /* State.Invalid */;
        }
        return this._states.get(currentState, chCode);
    }
}
// State machine for http:// or https:// or file://
let _stateMachine = null;
function getStateMachine() {
    if (_stateMachine === null) {
        _stateMachine = new StateMachine([
            [1 /* State.Start */, 104 /* CharCode.h */, 2 /* State.H */],
            [1 /* State.Start */, 72 /* CharCode.H */, 2 /* State.H */],
            [1 /* State.Start */, 102 /* CharCode.f */, 6 /* State.F */],
            [1 /* State.Start */, 70 /* CharCode.F */, 6 /* State.F */],
            [2 /* State.H */, 116 /* CharCode.t */, 3 /* State.HT */],
            [2 /* State.H */, 84 /* CharCode.T */, 3 /* State.HT */],
            [3 /* State.HT */, 116 /* CharCode.t */, 4 /* State.HTT */],
            [3 /* State.HT */, 84 /* CharCode.T */, 4 /* State.HTT */],
            [4 /* State.HTT */, 112 /* CharCode.p */, 5 /* State.HTTP */],
            [4 /* State.HTT */, 80 /* CharCode.P */, 5 /* State.HTTP */],
            [5 /* State.HTTP */, 115 /* CharCode.s */, 9 /* State.BeforeColon */],
            [5 /* State.HTTP */, 83 /* CharCode.S */, 9 /* State.BeforeColon */],
            [5 /* State.HTTP */, 58 /* CharCode.Colon */, 10 /* State.AfterColon */],
            [6 /* State.F */, 105 /* CharCode.i */, 7 /* State.FI */],
            [6 /* State.F */, 73 /* CharCode.I */, 7 /* State.FI */],
            [7 /* State.FI */, 108 /* CharCode.l */, 8 /* State.FIL */],
            [7 /* State.FI */, 76 /* CharCode.L */, 8 /* State.FIL */],
            [8 /* State.FIL */, 101 /* CharCode.e */, 9 /* State.BeforeColon */],
            [8 /* State.FIL */, 69 /* CharCode.E */, 9 /* State.BeforeColon */],
            [9 /* State.BeforeColon */, 58 /* CharCode.Colon */, 10 /* State.AfterColon */],
            [10 /* State.AfterColon */, 47 /* CharCode.Slash */, 11 /* State.AlmostThere */],
            [11 /* State.AlmostThere */, 47 /* CharCode.Slash */, 12 /* State.End */],
        ]);
    }
    return _stateMachine;
}
var CharacterClass;
(function (CharacterClass) {
    CharacterClass[CharacterClass["None"] = 0] = "None";
    CharacterClass[CharacterClass["ForceTermination"] = 1] = "ForceTermination";
    CharacterClass[CharacterClass["CannotEndIn"] = 2] = "CannotEndIn";
})(CharacterClass || (CharacterClass = {}));
let _classifier = null;
function getClassifier() {
    if (_classifier === null) {
        _classifier = new CharacterClassifier(0 /* CharacterClass.None */);
        // allow-any-unicode-next-line
        const FORCE_TERMINATION_CHARACTERS = ' \t<>\'\"、。｡､，．：；‘〈「『〔（［｛｢｣｝］）〕』」〉’｀～…';
        for (let i = 0; i < FORCE_TERMINATION_CHARACTERS.length; i++) {
            _classifier.set(FORCE_TERMINATION_CHARACTERS.charCodeAt(i), 1 /* CharacterClass.ForceTermination */);
        }
        const CANNOT_END_WITH_CHARACTERS = '.,;:';
        for (let i = 0; i < CANNOT_END_WITH_CHARACTERS.length; i++) {
            _classifier.set(CANNOT_END_WITH_CHARACTERS.charCodeAt(i), 2 /* CharacterClass.CannotEndIn */);
        }
    }
    return _classifier;
}
export class LinkComputer {
    static _createLink(classifier, line, lineNumber, linkBeginIndex, linkEndIndex) {
        // Do not allow to end link in certain characters...
        let lastIncludedCharIndex = linkEndIndex - 1;
        do {
            const chCode = line.charCodeAt(lastIncludedCharIndex);
            const chClass = classifier.get(chCode);
            if (chClass !== 2 /* CharacterClass.CannotEndIn */) {
                break;
            }
            lastIncludedCharIndex--;
        } while (lastIncludedCharIndex > linkBeginIndex);
        // Handle links enclosed in parens, square brackets and curlys.
        if (linkBeginIndex > 0) {
            const charCodeBeforeLink = line.charCodeAt(linkBeginIndex - 1);
            const lastCharCodeInLink = line.charCodeAt(lastIncludedCharIndex);
            if ((charCodeBeforeLink === 40 /* CharCode.OpenParen */ && lastCharCodeInLink === 41 /* CharCode.CloseParen */)
                || (charCodeBeforeLink === 91 /* CharCode.OpenSquareBracket */ && lastCharCodeInLink === 93 /* CharCode.CloseSquareBracket */)
                || (charCodeBeforeLink === 123 /* CharCode.OpenCurlyBrace */ && lastCharCodeInLink === 125 /* CharCode.CloseCurlyBrace */)) {
                // Do not end in ) if ( is before the link start
                // Do not end in ] if [ is before the link start
                // Do not end in } if { is before the link start
                lastIncludedCharIndex--;
            }
        }
        return {
            range: {
                startLineNumber: lineNumber,
                startColumn: linkBeginIndex + 1,
                endLineNumber: lineNumber,
                endColumn: lastIncludedCharIndex + 2
            },
            url: line.substring(linkBeginIndex, lastIncludedCharIndex + 1)
        };
    }
    static computeLinks(model, stateMachine = getStateMachine()) {
        const classifier = getClassifier();
        const result = [];
        for (let i = 1, lineCount = model.getLineCount(); i <= lineCount; i++) {
            const line = model.getLineContent(i);
            const len = line.length;
            let j = 0;
            let linkBeginIndex = 0;
            let linkBeginChCode = 0;
            let state = 1 /* State.Start */;
            let hasOpenParens = false;
            let hasOpenSquareBracket = false;
            let inSquareBrackets = false;
            let hasOpenCurlyBracket = false;
            while (j < len) {
                let resetStateMachine = false;
                const chCode = line.charCodeAt(j);
                if (state === 13 /* State.Accept */) {
                    let chClass;
                    switch (chCode) {
                        case 40 /* CharCode.OpenParen */:
                            hasOpenParens = true;
                            chClass = 0 /* CharacterClass.None */;
                            break;
                        case 41 /* CharCode.CloseParen */:
                            chClass = (hasOpenParens ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */);
                            break;
                        case 91 /* CharCode.OpenSquareBracket */:
                            inSquareBrackets = true;
                            hasOpenSquareBracket = true;
                            chClass = 0 /* CharacterClass.None */;
                            break;
                        case 93 /* CharCode.CloseSquareBracket */:
                            inSquareBrackets = false;
                            chClass = (hasOpenSquareBracket ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */);
                            break;
                        case 123 /* CharCode.OpenCurlyBrace */:
                            hasOpenCurlyBracket = true;
                            chClass = 0 /* CharacterClass.None */;
                            break;
                        case 125 /* CharCode.CloseCurlyBrace */:
                            chClass = (hasOpenCurlyBracket ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */);
                            break;
                        // The following three rules make it that ' or " or ` are allowed inside links
                        // only if the link is wrapped by some other quote character
                        case 39 /* CharCode.SingleQuote */:
                        case 34 /* CharCode.DoubleQuote */:
                        case 96 /* CharCode.BackTick */:
                            if (linkBeginChCode === chCode) {
                                chClass = 1 /* CharacterClass.ForceTermination */;
                            }
                            else if (linkBeginChCode === 39 /* CharCode.SingleQuote */ || linkBeginChCode === 34 /* CharCode.DoubleQuote */ || linkBeginChCode === 96 /* CharCode.BackTick */) {
                                chClass = 0 /* CharacterClass.None */;
                            }
                            else {
                                chClass = 1 /* CharacterClass.ForceTermination */;
                            }
                            break;
                        case 42 /* CharCode.Asterisk */:
                            // `*` terminates a link if the link began with `*`
                            chClass = (linkBeginChCode === 42 /* CharCode.Asterisk */) ? 1 /* CharacterClass.ForceTermination */ : 0 /* CharacterClass.None */;
                            break;
                        case 124 /* CharCode.Pipe */:
                            // `|` terminates a link if the link began with `|`
                            chClass = (linkBeginChCode === 124 /* CharCode.Pipe */) ? 1 /* CharacterClass.ForceTermination */ : 0 /* CharacterClass.None */;
                            break;
                        case 32 /* CharCode.Space */:
                            // ` ` allow space in between [ and ]
                            chClass = (inSquareBrackets ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */);
                            break;
                        default:
                            chClass = classifier.get(chCode);
                    }
                    // Check if character terminates link
                    if (chClass === 1 /* CharacterClass.ForceTermination */) {
                        result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, j));
                        resetStateMachine = true;
                    }
                }
                else if (state === 12 /* State.End */) {
                    let chClass;
                    if (chCode === 91 /* CharCode.OpenSquareBracket */) {
                        // Allow for the authority part to contain ipv6 addresses which contain [ and ]
                        hasOpenSquareBracket = true;
                        chClass = 0 /* CharacterClass.None */;
                    }
                    else {
                        chClass = classifier.get(chCode);
                    }
                    // Check if character terminates link
                    if (chClass === 1 /* CharacterClass.ForceTermination */) {
                        resetStateMachine = true;
                    }
                    else {
                        state = 13 /* State.Accept */;
                    }
                }
                else {
                    state = stateMachine.nextState(state, chCode);
                    if (state === 0 /* State.Invalid */) {
                        resetStateMachine = true;
                    }
                }
                if (resetStateMachine) {
                    state = 1 /* State.Start */;
                    hasOpenParens = false;
                    hasOpenSquareBracket = false;
                    hasOpenCurlyBracket = false;
                    // Record where the link started
                    linkBeginIndex = j + 1;
                    linkBeginChCode = chCode;
                }
                j++;
            }
            if (state === 13 /* State.Accept */) {
                result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, len));
            }
        }
        return result;
    }
}
/**
 * Returns an array of all links contains in the provided
 * document. *Note* that this operation is computational
 * expensive and should not run in the UI thread.
 */
export function computeLinks(model) {
    if (!model || typeof model.getLineCount !== 'function' || typeof model.getLineContent !== 'function') {
        // Unknown caller!
        return [];
    }
    return LinkComputer.computeLinks(model);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL2xpbmtDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQVFyRSxNQUFNLENBQU4sSUFBa0IsS0FnQmpCO0FBaEJELFdBQWtCLEtBQUs7SUFDdEIsdUNBQVcsQ0FBQTtJQUNYLG1DQUFTLENBQUE7SUFDVCwyQkFBSyxDQUFBO0lBQ0wsNkJBQU0sQ0FBQTtJQUNOLCtCQUFPLENBQUE7SUFDUCxpQ0FBUSxDQUFBO0lBQ1IsMkJBQUssQ0FBQTtJQUNMLDZCQUFNLENBQUE7SUFDTiwrQkFBTyxDQUFBO0lBQ1AsK0NBQWUsQ0FBQTtJQUNmLDhDQUFlLENBQUE7SUFDZixnREFBZ0IsQ0FBQTtJQUNoQixnQ0FBUSxDQUFBO0lBQ1Isc0NBQVcsQ0FBQTtJQUNYLHNEQUFtQixDQUFBLENBQUMsbUNBQW1DO0FBQ3hELENBQUMsRUFoQmlCLEtBQUssS0FBTCxLQUFLLFFBZ0J0QjtBQUlELE1BQU0sV0FBVztJQU1oQixZQUFZLElBQVksRUFBRSxJQUFZLEVBQUUsWUFBb0I7UUFDM0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUks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