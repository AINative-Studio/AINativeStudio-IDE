"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubRemoteSourcePublisher = void 0;
const publish_1 = require("./publish");
class GithubRemoteSourcePublisher {
    constructor(gitAPI) {
        this.gitAPI = gitAPI;
        this.name = 'GitHub';
        this.icon = 'github';
    }
    publishRepository(repository) {
        return (0, publish_1.publishRepository)(this.gitAPI, repository);
    }
}
exports.GithubRemoteSourcePublisher = GithubRemoteSourcePublisher;
//# sourceMappingURL=remoteSourcePublisher.js.map