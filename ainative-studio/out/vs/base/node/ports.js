/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as net from 'net';
/**
 * Given a start point and a max number of retries, will find a port that
 * is openable. Will return 0 in case no free port can be found.
 */
export function findFreePort(startPort, giveUpAfter, timeout, stride = 1) {
    let done = false;
    return new Promise(resolve => {
        const timeoutHandle = setTimeout(() => {
            if (!done) {
                done = true;
                return resolve(0);
            }
        }, timeout);
        doFindFreePort(startPort, giveUpAfter, stride, (port) => {
            if (!done) {
                done = true;
                clearTimeout(timeoutHandle);
                return resolve(port);
            }
        });
    });
}
function doFindFreePort(startPort, giveUpAfter, stride, clb) {
    if (giveUpAfter === 0) {
        return clb(0);
    }
    const client = new net.Socket();
    // If we can connect to the port it means the port is already taken so we continue searching
    client.once('connect', () => {
        dispose(client);
        return doFindFreePort(startPort + stride, giveUpAfter - 1, stride, clb);
    });
    client.once('data', () => {
        // this listener is required since node.js 8.x
    });
    client.once('error', (err) => {
        dispose(client);
        // If we receive any non ECONNREFUSED error, it means the port is used but we cannot connect
        if (err.code !== 'ECONNREFUSED') {
            return doFindFreePort(startPort + stride, giveUpAfter - 1, stride, clb);
        }
        // Otherwise it means the port is free to use!
        return clb(startPort);
    });
    client.connect(startPort, '127.0.0.1');
}
// Reference: https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/net/base/port_util.cc#56
export const BROWSER_RESTRICTED_PORTS = {
    1: true, // tcpmux
    7: true, // echo
    9: true, // discard
    11: true, // systat
    13: true, // daytime
    15: true, // netstat
    17: true, // qotd
    19: true, // chargen
    20: true, // ftp data
    21: true, // ftp access
    22: true, // ssh
    23: true, // telnet
    25: true, // smtp
    37: true, // time
    42: true, // name
    43: true, // nicname
    53: true, // domain
    69: true, // tftp
    77: true, // priv-rjs
    79: true, // finger
    87: true, // ttylink
    95: true, // supdup
    101: true, // hostriame
    102: true, // iso-tsap
    103: true, // gppitnp
    104: true, // acr-nema
    109: true, // pop2
    110: true, // pop3
    111: true, // sunrpc
    113: true, // auth
    115: true, // sftp
    117: true, // uucp-path
    119: true, // nntp
    123: true, // NTP
    135: true, // loc-srv /epmap
    137: true, // netbios
    139: true, // netbios
    143: true, // imap2
    161: true, // snmp
    179: true, // BGP
    389: true, // ldap
    427: true, // SLP (Also used by Apple Filing Protocol)
    465: true, // smtp+ssl
    512: true, // print / exec
    513: true, // login
    514: true, // shell
    515: true, // printer
    526: true, // tempo
    530: true, // courier
    531: true, // chat
    532: true, // netnews
    540: true, // uucp
    548: true, // AFP (Apple Filing Protocol)
    554: true, // rtsp
    556: true, // remotefs
    563: true, // nntp+ssl
    587: true, // smtp (rfc6409)
    601: true, // syslog-conn (rfc3195)
    636: true, // ldap+ssl
    989: true, // ftps-data
    990: true, // ftps
    993: true, // ldap+ssl
    995: true, // pop3+ssl
    1719: true, // h323gatestat
    1720: true, // h323hostcall
    1723: true, // pptp
    2049: true, // nfs
    3659: true, // apple-sasl / PasswordServer
    4045: true, // lockd
    5060: true, // sip
    5061: true, // sips
    6000: true, // X11
    6566: true, // sane-port
    6665: true, // Alternate IRC [Apple addition]
    6666: true, // Alternate IRC [Apple addition]
    6667: true, // Standard IRC [Apple addition]
    6668: true, // Alternate IRC [Apple addition]
    6669: true, // Alternate IRC [Apple addition]
    6697: true, // IRC + TLS
    10080: true // Amanda
};
/**
 * Uses listen instead of connect. Is faster, but if there is another listener on 0.0.0.0 then this will take 127.0.0.1 from that listener.
 */
export function findFreePortFaster(startPort, giveUpAfter, timeout, hostname = '127.0.0.1') {
    let resolved = false;
    let timeoutHandle = undefined;
    let countTried = 1;
    const server = net.createServer({ pauseOnConnect: true });
    function doResolve(port, resolve) {
        if (!resolved) {
            resolved = true;
            server.removeAllListeners();
            server.close();
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            resolve(port);
        }
    }
    return new Promise(resolve => {
        timeoutHandle = setTimeout(() => {
            doResolve(0, resolve);
        }, timeout);
        server.on('listening', () => {
            doResolve(startPort, resolve);
        });
        server.on('error', err => {
            if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES') && (countTried < giveUpAfter)) {
                startPort++;
                countTried++;
                server.listen(startPort, hostname);
            }
            else {
                doResolve(0, resolve);
            }
        });
        server.on('close', () => {
            doResolve(0, resolve);
        });
        server.listen(startPort, hostname);
    });
}
function dispose(socket) {
    try {
        socket.removeAllListeners('connect');
        socket.removeAllListeners('error');
        socket.end();
        socket.destroy();
        socket.unref();
    }
    catch (error) {
        console.error(error); // otherwise this error would get lost in the callback chain
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9wb3J0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQztBQUUzQjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLFNBQWlCLEVBQUUsV0FBbUIsRUFBRSxPQUFlLEVBQUUsTUFBTSxHQUFHLENBQUM7SUFDL0YsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBRWpCLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDNUIsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLElBQUksQ0FBQztnQkFDWixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQixDQUFDO1FBQ0YsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRVosY0FBYyxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDdkQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ1osWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUM1QixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxTQUFpQixFQUFFLFdBQW1CLEVBQUUsTUFBYyxFQUFFLEdBQTJCO0lBQzFHLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRSxDQUFD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