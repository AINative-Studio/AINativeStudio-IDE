/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
export class IgnoreFile {
    constructor(contents, location, parent) {
        this.location = location;
        this.parent = parent;
        if (location[location.length - 1] === '\\') {
            throw Error('Unexpected path format, do not use trailing backslashes');
        }
        if (location[location.length - 1] !== '/') {
            location += '/';
        }
        this.isPathIgnored = this.parseIgnoreFile(contents, this.location, this.parent);
    }
    /**
     * Updates the contents of the ignorefile. Preservering the location and parent
     * @param contents The new contents of the gitignore file
     */
    updateContents(contents) {
        this.isPathIgnored = this.parseIgnoreFile(contents, this.location, this.parent);
    }
    /**
     * Returns true if a path in a traversable directory has not been ignored.
     *
     * Note: For performance reasons this does not check if the parent directories have been ignored,
     * so it should always be used in tandem with `shouldTraverseDir` when walking a directory.
     *
     * In cases where a path must be tested in isolation, `isArbitraryPathIncluded` should be used.
     */
    isPathIncludedInTraversal(path, isDir) {
        if (path[0] !== '/' || path[path.length - 1] === '/') {
            throw Error('Unexpected path format, expectred to begin with slash and end without. got:' + path);
        }
        const ignored = this.isPathIgnored(path, isDir);
        return !ignored;
    }
    /**
     * Returns true if an arbitrary path has not been ignored.
     * This is an expensive operation and should only be used ouside of traversals.
     */
    isArbitraryPathIgnored(path, isDir) {
        if (path[0] !== '/' || path[path.length - 1] === '/') {
            throw Error('Unexpected path format, expectred to begin with slash and end without. got:' + path);
        }
        const segments = path.split('/').filter(x => x);
        let ignored = false;
        let walkingPath = '';
        for (let i = 0; i < segments.length; i++) {
            const isLast = i === segments.length - 1;
            const segment = segments[i];
            walkingPath = walkingPath + '/' + segment;
            if (!this.isPathIncludedInTraversal(walkingPath, isLast ? isDir : true)) {
                ignored = true;
                break;
            }
        }
        return ignored;
    }
    gitignoreLinesToExpression(lines, dirPath, trimForExclusions) {
        const includeLines = lines.map(line => this.gitignoreLineToGlob(line, dirPath));
        const includeExpression = Object.create(null);
        for (const line of includeLines) {
            includeExpression[line] = true;
        }
        return glob.parse(includeExpression, { trimForExclusions });
    }
    parseIgnoreFile(ignoreContents, dirPath, parent) {
        const contentLines = ignoreContents
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line[0] !== '#');
        // Pull out all the lines that end with `/`, those only apply to directories
        const fileLines = contentLines.filter(line => !line.endsWith('/'));
        const fileIgnoreLines = fileLines.filter(line => !line.includes('!'));
        const isFileIgnored = this.gitignoreLinesToExpression(fileIgnoreLines, dirPath, true);
        // TODO: Slight hack... this naieve approach may reintroduce too many files in cases of weirdly complex .gitignores
        const fileIncludeLines = fileLines.filter(line => line.includes('!')).map(line => line.replace(/!/g, ''));
        const isFileIncluded = this.gitignoreLinesToExpression(fileIncludeLines, dirPath, false);
        // When checking if a dir is ignored we can use all lines
        const dirIgnoreLines = contentLines.filter(line => !line.includes('!'));
        const isDirIgnored = this.gitignoreLinesToExpression(dirIgnoreLines, dirPath, true);
        // Same hack.
        const dirIncludeLines = contentLines.filter(line => line.includes('!')).map(line => line.replace(/!/g, ''));
        const isDirIncluded = this.gitignoreLinesToExpression(dirIncludeLines, dirPath, false);
        const isPathIgnored = (path, isDir) => {
            if (!path.startsWith(dirPath)) {
                return false;
            }
            if (isDir && isDirIgnored(path) && !isDirIncluded(path)) {
                return true;
            }
            if (isFileIgnored(path) && !isFileIncluded(path)) {
                return true;
            }
            if (parent) {
                return parent.isPathIgnored(path, isDir);
            }
            return false;
        };
        return isPathIgnored;
    }
    gitignoreLineToGlob(line, dirPath) {
        const firstSep = line.indexOf('/');
        if (firstSep === -1 || firstSep === line.length - 1) {
            line = '**/' + line;
        }
        else {
            if (firstSep === 0) {
                if (dirPath.slice(-1) === '/') {
                    line = line.slice(1);
                }
            }
            else {
                if (dirPath.slice(-1) !== '/') {
                    line = '/' + line;
                }
            }
            line = dirPath + line;
        }
        return line;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlRmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9pZ25vcmVGaWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFHeEQsTUFBTSxPQUFPLFVBQVU7SUFJdEIsWUFDQyxRQUFnQixFQUNDLFFBQWdCLEVBQ2hCLE1BQW1CO1FBRG5CLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNwQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzVDLE1BQU0sS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUNELElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDM0MsUUFBUSxJQUFJLEdBQUcsQ0FBQztRQUNqQixDQUFDO1FBQ0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsY0FBYyxDQUFDLFFBQWdCO1FBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCx5QkFBeUIsQ0FBQyxJQUFZLEVBQUUsS0FBYztR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