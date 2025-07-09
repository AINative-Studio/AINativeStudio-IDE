/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cookie from 'cookie';
import * as fs from 'fs';
import * as path from '../../base/common/path.js';
import { generateUuid } from '../../base/common/uuid.js';
import { connectionTokenCookieName, connectionTokenQueryName } from '../../base/common/network.js';
import { Promises } from '../../base/node/pfs.js';
const connectionTokenRegex = /^[0-9A-Za-z_-]+$/;
export var ServerConnectionTokenType;
(function (ServerConnectionTokenType) {
    ServerConnectionTokenType[ServerConnectionTokenType["None"] = 0] = "None";
    ServerConnectionTokenType[ServerConnectionTokenType["Optional"] = 1] = "Optional";
    ServerConnectionTokenType[ServerConnectionTokenType["Mandatory"] = 2] = "Mandatory";
})(ServerConnectionTokenType || (ServerConnectionTokenType = {}));
export class NoneServerConnectionToken {
    constructor() {
        this.type = 0 /* ServerConnectionTokenType.None */;
    }
    validate(connectionToken) {
        return true;
    }
}
export class MandatoryServerConnectionToken {
    constructor(value) {
        this.value = value;
        this.type = 2 /* ServerConnectionTokenType.Mandatory */;
    }
    validate(connectionToken) {
        return (connectionToken === this.value);
    }
}
export class ServerConnectionTokenParseError {
    constructor(message) {
        this.message = message;
    }
}
export async function parseServerConnectionToken(args, defaultValue) {
    const withoutConnectionToken = args['without-connection-token'];
    const connectionToken = args['connection-token'];
    const connectionTokenFile = args['connection-token-file'];
    if (withoutConnectionToken) {
        if (typeof connectionToken !== 'undefined' || typeof connectionTokenFile !== 'undefined') {
            return new ServerConnectionTokenParseError(`Please do not use the argument '--connection-token' or '--connection-token-file' at the same time as '--without-connection-token'.`);
        }
        return new NoneServerConnectionToken();
    }
    if (typeof connectionTokenFile !== 'undefined') {
        if (typeof connectionToken !== 'undefined') {
            return new ServerConnectionTokenParseError(`Please do not use the argument '--connection-token' at the same time as '--connection-token-file'.`);
        }
        let rawConnectionToken;
        try {
            rawConnectionToken = fs.readFileSync(connectionTokenFile).toString().replace(/\r?\n$/, '');
        }
        catch (e) {
            return new ServerConnectionTokenParseError(`Unable to read the connection token file at '${connectionTokenFile}'.`);
        }
        if (!connectionTokenRegex.test(rawConnectionToken)) {
            return new ServerConnectionTokenParseError(`The connection token defined in '${connectionTokenFile} does not adhere to the characters 0-9, a-z, A-Z, _, or -.`);
        }
        return new MandatoryServerConnectionToken(rawConnectionToken);
    }
    if (typeof connectionToken !== 'undefined') {
        if (!connectionTokenRegex.test(connectionToken)) {
            return new ServerConnectionTokenParseError(`The connection token '${connectionToken} does not adhere to the characters 0-9, a-z, A-Z or -.`);
        }
        return new MandatoryServerConnectionToken(connectionToken);
    }
    return new MandatoryServerConnectionToken(await defaultValue());
}
export async function determineServerConnectionToken(args) {
    const readOrGenerateConnectionToken = async () => {
        if (!args['user-data-dir']) {
            // No place to store it!
            return generateUuid();
        }
        const storageLocation = path.join(args['user-data-dir'], 'token');
        // First try to find a connection token
        try {
            const fileContents = await fs.promises.readFile(storageLocation);
            const connectionToken = fileContents.toString().replace(/\r?\n$/, '');
            if (connectionTokenRegex.test(connectionToken)) {
                return connectionToken;
            }
        }
        catch (err) { }
        // No connection token found, generate one
        const connectionToken = generateUuid();
        try {
            // Try to store it
            await Promises.writeFile(storageLocation, connectionToken, { mode: 0o600 });
        }
        catch (err) { }
        return connectionToken;
    };
    return parseServerConnectionToken(args, readOrGenerateConnectionToken);
}
export function requestHasValidConnectionToken(connectionToken, req, parsedUrl) {
    // First check if there is a valid query parameter
    if (connectionToken.validate(parsedUrl.query[connectionTokenQueryName])) {
        return true;
    }
    // Otherwise, check if there is a valid cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    return connectionToken.validate(cookies[connectionTokenCookieName]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3NlcnZlckNvbm5lY3Rpb25Ub2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUd6QixPQUFPLEtBQUssSUFBSSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFbEQsTUFBTSxvQkFBb0IsR0FBRyxrQkFBa0IsQ0FBQztBQUVoRCxNQUFNLENBQU4sSUFBa0IseUJBSWpCO0FBSkQsV0FBa0IseUJBQXlCO0lBQzFDLHlFQUFJLENBQUE7SUFDSixpRkFBUSxDQUFBO0lBQ1IsbUZBQVMsQ0FBQTtBQUNWLENBQUMsRUFKaUIseUJBQXlCLEtBQXpCLHlCQUF5QixRQUkxQztBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFDaUIsU0FBSSwwQ0FBa0M7SUFLdkQsQ0FBQztJQUhPLFFBQVEsQ0FBQyxlQUFvQjtRQUNuQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw4QkFBOEI7SUFHMUMsWUFBNEIsS0FBYTtRQUFiLFVBQUssR0FBTCxLQUFLLENBQVE7UUFGekIsU0FBSSwrQ0FBdUM7SUFHM0QsQ0FBQztJQUVNLFFBQVEsQ0FBQyxlQUFvQjtRQUNuQyxPQUFPLENBQUMsZUFBZSxLQUFLLElB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