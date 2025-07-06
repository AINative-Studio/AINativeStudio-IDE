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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1RlbXBsYXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Rhc2tUZW1wbGF0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQVUxQyxNQUFNLFdBQVcsR0FBZTtJQUMvQixFQUFFLEVBQUUsWUFBWTtJQUNoQixLQUFLLEVBQUUsV0FBVztJQUNsQixJQUFJLEVBQUUsVUFBVTtJQUNoQixVQUFVLEVBQUUsS0FBSztJQUNqQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsa0NBQWtDLENBQUM7SUFDM0UsT0FBTyxFQUFFO1FBQ1IsR0FBRztRQUNILHlEQUF5RDtRQUN6RCx3REFBd0Q7UUFDeEQsdUJBQXVCO1FBQ3ZCLGNBQWM7UUFDZCxPQUFPO1FBQ1AseUJBQXlCO1FBQ3pCLDRCQUE0QjtRQUM1Qix3QkFBd0I7UUFDeEIsaUJBQWlCO1FBQ2pCLGtCQUFrQjtRQUNsQixvRUFBb0U7UUFDcEUsNkNBQTZDO1FBQzdDLDZGQUE2RjtRQUM3Riw4Q0FBOEM7UUFDOUMsVUFBVTtRQUNWLHlCQUF5QjtRQUN6Qix5QkFBeUI7UUFDekIsNEJBQTRCO1FBQzVCLFVBQVU7UUFDVixzQ0FBc0M7UUFDdEMsT0FBTztRQUNQLEtBQUs7UUFDTCxHQUFHO0tBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0NBQ1osQ0FBQztBQUVGLE1BQU0sT0FBTyxHQUFlO0lBQzNCLEVBQUUsRUFBRSxTQUFTO0lBQ2IsS0FBSyxFQUFFLFNBQVM7SUFDaEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLDJC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