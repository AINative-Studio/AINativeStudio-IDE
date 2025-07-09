/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
const dotnetBuild = {
    id: 'dotnetCore',
    label: '.NET Core',
    sort: 'NET Core',
    autoDetect: false,
    description: nls.localize('dotnetCore', 'Executes .NET Core build command'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "2.0.0",',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"label": "build",',
        '\t\t\t"command": "dotnet",',
        '\t\t\t"type": "shell",',
        '\t\t\t"args": [',
        '\t\t\t\t"build",',
        '\t\t\t\t// Ask dotnet build to generate full paths for file names.',
        '\t\t\t\t"/property:GenerateFullPaths=true",',
        '\t\t\t\t// Do not generate summary otherwise it leads to duplicate errors in Problems panel',
        '\t\t\t\t"/consoleloggerparameters:NoSummary"',
        '\t\t\t],',
        '\t\t\t"group": "build",',
        '\t\t\t"presentation": {',
        '\t\t\t\t"reveal": "silent"',
        '\t\t\t},',
        '\t\t\t"problemMatcher": "$msCompile"',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};
const msbuild = {
    id: 'msbuild',
    label: 'MSBuild',
    autoDetect: false,
    description: nls.localize('msbuild', 'Executes the build target'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "2.0.0",',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"label": "build",',
        '\t\t\t"type": "shell",',
        '\t\t\t"command": "msbuild",',
        '\t\t\t"args": [',
        '\t\t\t\t// Ask msbuild to generate full paths for file names.',
        '\t\t\t\t"/property:GenerateFullPaths=true",',
        '\t\t\t\t"/t:build",',
        '\t\t\t\t// Do not generate summary otherwise it leads to duplicate errors in Problems panel',
        '\t\t\t\t"/consoleloggerparameters:NoSummary"',
        '\t\t\t],',
        '\t\t\t"group": "build",',
        '\t\t\t"presentation": {',
        '\t\t\t\t// Reveal the output only if unrecognized errors occur.',
        '\t\t\t\t"reveal": "silent"',
        '\t\t\t},',
        '\t\t\t// Use the standard MS compiler pattern to detect errors, warnings and infos',
        '\t\t\t"problemMatcher": "$msCompile"',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};
const command = {
    id: 'externalCommand',
    label: 'Others',
    autoDetect: false,
    description: nls.localize('externalCommand', 'Example to run an arbitrary external command'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "2.0.0",',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"label": "echo",',
        '\t\t\t"type": "shell",',
        '\t\t\t"command": "echo Hello"',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};
const maven = {
    id: 'maven',
    label: 'maven',
    sort: 'MVN',
    autoDetect: false,
    description: nls.localize('Maven', 'Executes common maven commands'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "2.0.0",',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"label": "verify",',
        '\t\t\t"type": "shell",',
        '\t\t\t"command": "mvn -B verify",',
        '\t\t\t"group": "build"',
        '\t\t},',
        '\t\t{',
        '\t\t\t"label": "test",',
        '\t\t\t"type": "shell",',
        '\t\t\t"command": "mvn -B test",',
        '\t\t\t"group": "test"',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};
let _templates = null;
export function getTemplates() {
    if (!_templates) {
        _templates = [dotnetBuild, msbuild, maven].sort((a, b) => {
            return (a.sort || a.label).localeCompare(b.sort || b.label);
        });
        _templates.push(command);
    }
    return _templates;
}
/** Version 1.0 templates
 *
const gulp: TaskEntry = {
    id: 'gulp',
    label: 'Gulp',
    autoDetect: true,
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "gulp",',
        '\t"isShellCommand": true,',
        '\t"args": ["--no-color"],',
        '\t"showOutput": "always"',
        '}'
    ].join('\n')
};

const grunt: TaskEntry = {
    id: 'grunt',
    label: 'Grunt',
    autoDetect: true,
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "grunt",',
        '\t"isShellCommand": true,',
        '\t"args": ["--no-color"],',
        '\t"showOutput": "always"',
        '}'
    ].join('\n')
};

const npm: TaskEntry = {
    id: 'npm',
    label: 'npm',
    sort: 'NPM',
    autoDetect: false,
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "npm",',
        '\t"isShellCommand": true,',
        '\t"showOutput": "always",',
        '\t"suppressTaskName": true,',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"taskName": "install",',
        '\t\t\t"args": ["install"]',
        '\t\t},',
        '\t\t{',
        '\t\t\t"taskName": "update",',
        '\t\t\t"args": ["update"]',
        '\t\t},',
        '\t\t{',
        '\t\t\t"taskName": "test",',
        '\t\t\t"args": ["run", "test"]',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};

const tscConfig: TaskEntry = {
    id: 'tsc.config',
    label: 'TypeScript - tsconfig.json',
    autoDetect: false,
    description: nls.localize('tsc.config', 'Compiles a TypeScript project'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "tsc",',
        '\t"isShellCommand": true,',
        '\t"args": ["-p", "."],',
        '\t"showOutput": "silent",',
        '\t"problemMatcher": "$tsc"',
        '}'
    ].join('\n')
};

const tscWatch: TaskEntry = {
    id: 'tsc.watch',
    label: 'TypeScript - Watch Mode',
    autoDetect: false,
    description: nls.localize('tsc.watch', 'Compiles a TypeScript project in watch mode'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "tsc",',
        '\t"isShellCommand": true,',
        '\t"args": ["-w", "-p", "."],',
        '\t"showOutput": "silent",',
        '\t"isBackground": true,',
        '\t"problemMatcher": "$tsc-watch"',
        '}'
    ].join('\n')
};

const dotnetBuild: TaskEntry = {
    id: 'dotnetCore',
    label: '.NET Core',
    sort: 'NET Core',
    autoDetect: false,
    description: nls.localize('dotnetCore', 'Executes .NET Core build command'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "dotnet",',
        '\t"isShellCommand": true,',
        '\t"args": [],',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"taskName": "build",',
        '\t\t\t"args": [ ],',
        '\t\t\t"isBuildCommand": true,',
        '\t\t\t"showOutput": "silent",',
        '\t\t\t"problemMatcher": "$msCompile"',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};

const msbuild: TaskEntry = {
    id: 'msbuild',
    label: 'MSBuild',
    autoDetect: false,
    description: nls.localize('msbuild', 'Executes the build target'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "msbuild",',
        '\t"args": [',
        '\t\t// Ask msbuild to generate full paths for file names.',
        '\t\t"/property:GenerateFullPaths=true"',
        '\t],',
        '\t"taskSelector": "/t:",',
        '\t"showOutput": "silent",',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"taskName": "build",',
        '\t\t\t// Show the output window only if unrecognized errors occur.',
        '\t\t\t"showOutput": "silent",',
        '\t\t\t// Use the standard MS compiler pattern to detect errors, warnings and infos',
        '\t\t\t"problemMatcher": "$msCompile"',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};

const command: TaskEntry = {
    id: 'externalCommand',
    label: 'Others',
    autoDetect: false,
    description: nls.localize('externalCommand', 'Example to run an arbitrary external command'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "echo",',
        '\t"isShellCommand": true,',
        '\t"args": ["Hello World"],',
        '\t"showOutput": "always"',
        '}'
    ].join('\n')
};

const maven: TaskEntry = {
    id: 'maven',
    label: 'maven',
    sort: 'MVN',
    autoDetect: false,
    description: nls.localize('Maven', 'Executes common maven commands'),
    content: [
        '{',
        '\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
        '\t// for the documentation about the tasks.json format',
        '\t"version": "0.1.0",',
        '\t"command": "mvn",',
        '\t"isShellCommand": true,',
        '\t"showOutput": "always",',
        '\t"suppressTaskName": true,',
        '\t"tasks": [',
        '\t\t{',
        '\t\t\t"taskName": "verify",',
        '\t\t\t"args": ["-B", "verify"],',
        '\t\t\t"isBuildCommand": true',
        '\t\t},',
        '\t\t{',
        '\t\t\t"taskName": "test",',
        '\t\t\t"args": ["-B", "test"],',
        '\t\t\t"isTestCommand": true',
        '\t\t}',
        '\t]',
        '}'
    ].join('\n')
};

export let templates: TaskEntry[] = [gulp, grunt, tscConfig, tscWatch, dotnetBuild, msbuild, npm, maven].sort((a, b) => {
    return (a.sort || a.label).localeCompare(b.sort || b.label);
});
templates.push(command);
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1RlbXBsYXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vdGFza1RlbXBsYXRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBVTFDLE1BQU0sV0FBVyxHQUFlO0lBQy9CLEVBQUUsRUFBRSxZQUFZO0lBQ2hCLEtBQUssRUFBRSxXQUFXO0lBQ2xCLElBQUksRUFBRSxVQUFVO0lBQ2hCLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxrQ0FBa0MsQ0FBQztJQUMzRSxPQUFPLEVBQUU7UUFDUixHQUFHO1FBQ0gseURBQXlEO1FBQ3pELHdEQUF3RDtRQUN4RCx1QkFBdUI7UUFDdkIsY0FBYztRQUNkLE9BQU87UUFDUCx5QkFBeUI7UUFDekIsNEJBQTRCO1FBQzVCLHdCQUF3QjtRQUN4QixpQkFBaUI7UUFDakIsa0JBQWtCO1FBQ2xCLG9FQUFvRTtRQUNwRSw2Q0FBNkM7UUFDN0MsNkZBQTZGO1FBQzdGLDhDQUE4QztRQUM5QyxVQUFVO1FBQ1YseUJBQXlCO1FBQ3pCLHlCQUF5QjtRQUN6Qiw0QkFBNEI7UUFDNUIsVUFBVTtRQUNWLHNDQUFzQztRQUN0QyxPQUFPO1FBQ1AsS0FBSztRQUNMLEdBQUc7S0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Q0FDWixDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQWU7SUFDM0IsRUFBRSxFQUFFLFNBQVM7SUFDYixLQUFLLEVBQUUsU0FBUztJQUNoQixVQUFVLEVBQUUsS0FBSztJQUNqQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsMkJBQTJC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