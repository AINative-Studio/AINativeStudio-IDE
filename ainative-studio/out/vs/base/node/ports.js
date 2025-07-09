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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3BvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBRTNCOzs7R0FHRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsU0FBaUIsRUFBRSxXQUFtQixFQUFFLE9BQWUsRUFBRSxNQUFNLEdBQUcsQ0FBQztJQUMvRixJQUFJLElBQUksR0FBRyxLQUFLLENBQUM7SUFFakIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM1QixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNaLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25CLENBQUM7UUFDRixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFWixjQUFjLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN2RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLElBQUksQ0FBQztnQkFDWixZQUFZLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzVCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLFNBQWlCLEVBQUUsV0FBbUIsRUFBRSxNQUFjLEVBQUUsR0FBMkI7SUFDMUcsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFD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