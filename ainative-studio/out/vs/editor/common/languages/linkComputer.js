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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9saW5rQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFRckUsTUFBTSxDQUFOLElBQWtCLEtBZ0JqQjtBQWhCRCxXQUFrQixLQUFLO0lBQ3RCLHVDQUFXLENBQUE7SUFDWCxtQ0FBUyxDQUFBO0lBQ1QsMkJBQUssQ0FBQTtJQUNMLDZCQUFNLENBQUE7SUFDTiwrQkFBTyxDQUFBO0lBQ1AsaUNBQVEsQ0FBQTtJQUNSLDJCQUFLLENBQUE7SUFDTCw2QkFBTSxDQUFBO0lBQ04sK0JBQU8sQ0FBQTtJQUNQLCtDQUFlLENBQUE7SUFDZiw4Q0FBZSxDQUFBO0lBQ2YsZ0RBQWdCLENBQUE7SUFDaEIsZ0NBQVEsQ0FBQTtJQUNSLHNDQUFXLENBQUE7SUFDWCxzREFBbUIsQ0FBQSxDQUFDLG1DQUFtQztBQUN4RCxDQUFDLEVBaEJpQixLQUFLLEtBQUwsS0FBSyxRQWdCdEI7QUFJRCxNQUFNLFdBQVc7SUFNaEIsWUFBWSxJQUFZLEVBQUUsSUFBWSxFQUFFLFlBQW9CO1FBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztRQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJ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