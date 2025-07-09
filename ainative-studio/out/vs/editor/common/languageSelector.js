/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { match as matchGlobPattern } from '../../base/common/glob.js';
import { normalize } from '../../base/common/path.js';
export function score(selector, candidateUri, candidateLanguage, candidateIsSynchronized, candidateNotebookUri, candidateNotebookType) {
    if (Array.isArray(selector)) {
        // array -> take max individual value
        let ret = 0;
        for (const filter of selector) {
            const value = score(filter, candidateUri, candidateLanguage, candidateIsSynchronized, candidateNotebookUri, candidateNotebookType);
            if (value === 10) {
                return value; // already at the highest
            }
            if (value > ret) {
                ret = value;
            }
        }
        return ret;
    }
    else if (typeof selector === 'string') {
        if (!candidateIsSynchronized) {
            return 0;
        }
        // short-hand notion, desugars to
        // 'fooLang' -> { language: 'fooLang'}
        // '*' -> { language: '*' }
        if (selector === '*') {
            return 5;
        }
        else if (selector === candidateLanguage) {
            return 10;
        }
        else {
            return 0;
        }
    }
    else if (selector) {
        // filter -> select accordingly, use defaults for scheme
        const { language, pattern, scheme, hasAccessToAllModels, notebookType } = selector; // TODO: microsoft/TypeScript#42768
        if (!candidateIsSynchronized && !hasAccessToAllModels) {
            return 0;
        }
        // selector targets a notebook -> use the notebook uri instead
        // of the "normal" document uri.
        if (notebookType && candidateNotebookUri) {
            candidateUri = candidateNotebookUri;
        }
        let ret = 0;
        if (scheme) {
            if (scheme === candidateUri.scheme) {
                ret = 10;
            }
            else if (scheme === '*') {
                ret = 5;
            }
            else {
                return 0;
            }
        }
        if (language) {
            if (language === candidateLanguage) {
                ret = 10;
            }
            else if (language === '*') {
                ret = Math.max(ret, 5);
            }
            else {
                return 0;
            }
        }
        if (notebookType) {
            if (notebookType === candidateNotebookType) {
                ret = 10;
            }
            else if (notebookType === '*' && candidateNotebookType !== undefined) {
                ret = Math.max(ret, 5);
            }
            else {
                return 0;
            }
        }
        if (pattern) {
            let normalizedPattern;
            if (typeof pattern === 'string') {
                normalizedPattern = pattern;
            }
            else {
                // Since this pattern has a `base` property, we need
                // to normalize this path first before passing it on
                // because we will compare it against `Uri.fsPath`
                // which uses platform specific separators.
                // Refs: https://github.com/microsoft/vscode/issues/99938
                normalizedPattern = { ...pattern, base: normalize(pattern.base) };
            }
            if (normalizedPattern === candidateUri.fsPath || matchGlobPattern(normalizedPattern, candidateUri.fsPath)) {
                ret = 10;
            }
            else {
                return 0;
            }
        }
        return ret;
    }
    else {
        return 0;
    }
}
export function targetsNotebooks(selector) {
    if (typeof selector === 'string') {
        return false;
    }
    else if (Array.isArray(selector)) {
        return selector.some(targetsNotebooks);
    }
    else {
        return !!selector.notebookType;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZWxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlU2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFvQixLQUFLLElBQUksZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFxQnRELE1BQU0sVUFBVSxLQUFLLENBQUMsUUFBc0MsRUFBRSxZQUFpQixFQUFFLGlCQUF5QixFQUFFLHVCQUFnQyxFQUFFLG9CQUFxQyxFQUFFLHFCQUF5QztJQUU3TixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUM3QixxQ0FBcUM7UUFDckMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUMvQixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQ25JLElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUNsQixPQUFPLEtBQUssQ0FBQyxDQUFDLHlCQUF5QjtZQUN4QyxDQUFDO1lBQ0QsSUFBSSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLEdBQUcsR0FBRyxLQUFLLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFDO0lBRVosQ0FBQztTQUFNLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFFekMsSUFBSSxDQUFDLHVCQUF1QixFQUFF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