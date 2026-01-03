# Auto-Update System Manual Testing Checklist

This document provides comprehensive manual testing procedures for the AINative Studio auto-update system across all supported platforms.

## Overview

The auto-update system must be tested manually on actual hardware/VMs to verify real-world functionality. These tests complement the automated test suite and ensure end-to-end functionality.

**Testing Requirements:**
- Physical hardware or VMs for each platform
- Network access to update server
- Multiple update scenarios
- Performance monitoring tools
- SHA256 verification tools

**Success Criteria:**
- >99% update check success rate
- >95% download success rate
- >90% installation success rate
- <5 seconds for update check
- Proper error handling and recovery

---

## Platform-Specific Testing

### macOS Intel (darwin)

#### Prerequisites
- [ ] macOS 10.13 or later
- [ ] Intel x64 processor
- [ ] Network connection
- [ ] Admin privileges (if testing user vs system install)

#### Test Cases

**TC-MACOS-001: Update Check**
- [ ] Launch AINative Studio
- [ ] Wait 30 seconds for automatic update check
- [ ] Verify no errors in Console.app
- [ ] Check network traffic shows request to update server
- [ ] Verify check completes in <5 seconds

**TC-MACOS-002: No Update Available (HTTP 204)**
- [ ] Configure mock update server to return HTTP 204
- [ ] Trigger manual update check: Help → Check for Updates
- [ ] Verify message: "You're up to date"
- [ ] Verify application remains stable
- [ ] Verify no download initiated

**TC-MACOS-003: Update Available (HTTP 200)**
- [ ] Configure mock update server to return HTTP 200 with update metadata
- [ ] Trigger manual update check
- [ ] Verify notification: "Update available: v1.5.0"
- [ ] Verify download button appears
- [ ] Click download button
- [ ] Monitor download progress
- [ ] Verify SHA256 checksum validation
- [ ] Verify "Restart to Update" button appears

**TC-MACOS-004: Download and Install**
- [ ] Click "Restart to Update"
- [ ] Verify application quits gracefully
- [ ] Verify Squirrel.Mac installer launches
- [ ] Verify new version installs
- [ ] Verify application relaunches
- [ ] Check Help → About to confirm new version

**TC-MACOS-005: Background Update**
- [ ] Set update.mode = "default"
- [ ] Leave application running
- [ ] Wait for automatic check (30 seconds after startup)
- [ ] Verify download happens in background
- [ ] Verify notification when ready: "Update downloaded"
- [ ] Verify can postpone update

**TC-MACOS-006: Network Error Handling**
- [ ] Disconnect network
- [ ] Trigger manual update check
- [ ] Verify error message: "Unable to check for updates"
- [ ] Reconnect network
- [ ] Verify next check succeeds

**TC-MACOS-007: Performance**
- [ ] Measure time from check initiation to response
- [ ] Verify <5 seconds for update check
- [ ] Measure download speed
- [ ] Verify progress bar updates smoothly
- [ ] Check CPU/memory usage during download

---

### macOS Apple Silicon (darwin-arm64)

#### Prerequisites
- [ ] macOS 11.0 or later
- [ ] Apple Silicon (M1/M2/M3) processor
- [ ] Network connection
- [ ] Admin privileges

#### Test Cases

**TC-MACOS-ARM-001 through TC-MACOS-ARM-007**
- [ ] Repeat all macOS Intel test cases
- [ ] Verify ARM64-specific binary is downloaded
- [ ] Verify Rosetta 2 is NOT required
- [ ] Verify native ARM64 performance

**TC-MACOS-ARM-008: Universal Binary**
- [ ] If using universal binary, verify single download
- [ ] Verify binary works on both Intel and ARM64
- [ ] Verify correct architecture is used at runtime

---

### Windows x64

#### Prerequisites
- [ ] Windows 10 or later
- [ ] x64 processor
- [ ] Network connection
- [ ] Admin or user-level install

#### Test Cases

**TC-WIN-001: Setup Installer Update**
- [ ] Launch AINative Studio (Setup install)
- [ ] Trigger manual update check
- [ ] Verify update metadata received
- [ ] Verify .exe installer downloads to temp folder
- [ ] Verify SHA256 checksum validation
- [ ] Verify installer size is correct

**TC-WIN-002: Background Update (User Install)**
- [ ] Set update.mode = "default"
- [ ] Set update.enableWindowsBackgroundUpdates = true
- [ ] Wait for automatic check
- [ ] Verify silent installer launches
- [ ] Verify /verysilent /update flags used
- [ ] Verify mutex file created
- [ ] Monitor for "Ready" state
- [ ] Verify can restart to complete update

**TC-WIN-003: Archive Mode**
- [ ] Launch AINative Studio (archive install)
- [ ] Trigger update check
- [ ] Verify "Download" button opens browser
- [ ] Verify downloads .zip file
- [ ] Verify manual extraction required

**TC-WIN-004: Admin vs User Install**
- [ ] Test both admin and user-level installs
- [ ] Verify admin install blocks updates when running as admin
- [ ] Verify user install allows updates without admin
- [ ] Verify appropriate permissions checks

**TC-WIN-005: Update During Active Work**
- [ ] Open files with unsaved changes
- [ ] Download update
- [ ] Click "Restart to Update"
- [ ] Verify prompted to save changes
- [ ] Verify can cancel update
- [ ] Verify state persists after cancel

**TC-WIN-006: Installer Cleanup**
- [ ] After successful update, check temp folder
- [ ] Verify old installers are cleaned up
- [ ] Verify mutex files are removed
- [ ] Verify no orphaned processes

---

### Windows ARM64

#### Prerequisites
- [ ] Windows 11 ARM64
- [ ] ARM64 processor (Snapdragon)
- [ ] Network connection

#### Test Cases

**TC-WIN-ARM-001 through TC-WIN-ARM-006**
- [ ] Repeat all Windows x64 test cases
- [ ] Verify ARM64-specific binary is downloaded
- [ ] Verify no x64 emulation required
- [ ] Verify native ARM64 performance

---

### Linux x64

#### Prerequisites
- [ ] Ubuntu 20.04 or later (or equivalent)
- [ ] x64 processor
- [ ] Network connection

#### Test Cases

**TC-LINUX-001: Manual Download**
- [ ] Launch AINative Studio
- [ ] Trigger update check
- [ ] Verify "Download" button appears
- [ ] Click download
- [ ] Verify browser opens to download page or direct .tar.gz download
- [ ] Verify downloadUrl used if configured

**TC-LINUX-002: Tarball Verification**
- [ ] Download .tar.gz file
- [ ] Download .tar.gz.sha256 file
- [ ] Verify SHA256 checksum matches
- [ ] Extract tarball
- [ ] Verify contents are correct

**TC-LINUX-003: Different Distributions**
- [ ] Test on Ubuntu
- [ ] Test on Fedora
- [ ] Test on Debian
- [ ] Test on Arch
- [ ] Verify update check works on all

**TC-LINUX-004: AppImage**
- [ ] If using AppImage, test update check
- [ ] Verify AppImage-specific update mechanism
- [ ] Verify delta updates if supported

---

### Linux ARM64

#### Prerequisites
- [ ] Ubuntu 20.04 ARM64 or later
- [ ] ARM64 processor (Raspberry Pi 4+, ARM server)
- [ ] Network connection

#### Test Cases

**TC-LINUX-ARM-001 through TC-LINUX-ARM-004**
- [ ] Repeat all Linux x64 test cases
- [ ] Verify ARM64-specific binary is downloaded
- [ ] Verify native ARM64 performance

---

### Snap (Linux)

#### Prerequisites
- [ ] Ubuntu with Snap support
- [ ] Snap-installed AINative Studio

#### Test Cases

**TC-SNAP-001: Automatic Updates**
- [ ] Verify snap automatically updates
- [ ] Check snap refresh timer
- [ ] Verify manual refresh works
- [ ] Verify application restarts with new version

**TC-SNAP-002: Update Disabled in App**
- [ ] Verify in-app update check is disabled
- [ ] Verify message explains snap handles updates
- [ ] Verify Help → About shows snap version

---

## Configuration Mode Testing

### Update Mode: "none"

**TC-MODE-NONE-001**
- [ ] Set update.mode = "none"
- [ ] Restart AINative Studio
- [ ] Verify Help → Check for Updates is disabled
- [ ] Verify no automatic checks occur
- [ ] Verify UI indicates updates disabled

### Update Mode: "manual"

**TC-MODE-MANUAL-001**
- [ ] Set update.mode = "manual"
- [ ] Restart AINative Studio
- [ ] Verify Help → Check for Updates is enabled
- [ ] Verify no automatic checks occur
- [ ] Trigger manual check
- [ ] Verify check completes successfully

### Update Mode: "start"

**TC-MODE-START-001**
- [ ] Set update.mode = "start"
- [ ] Restart AINative Studio
- [ ] Wait 30 seconds
- [ ] Verify automatic check occurs once
- [ ] Wait 1 hour
- [ ] Verify no subsequent automatic checks

### Update Mode: "default"

**TC-MODE-DEFAULT-001**
- [ ] Set update.mode = "default"
- [ ] Restart AINative Studio
- [ ] Verify check occurs after 30 seconds
- [ ] Wait 1 hour
- [ ] Verify periodic checks occur
- [ ] Verify checks happen every hour

---

## Error Scenario Testing

### Network Errors

**TC-ERROR-001: Complete Network Loss**
- [ ] Disconnect network
- [ ] Trigger update check
- [ ] Verify error message shown
- [ ] Verify application remains stable
- [ ] Reconnect network
- [ ] Verify recovery on next check

**TC-ERROR-002: Timeout**
- [ ] Configure firewall to drop packets to update server
- [ ] Trigger update check
- [ ] Verify timeout occurs
- [ ] Verify error message shown
- [ ] Verify application remains stable

**TC-ERROR-003: DNS Failure**
- [ ] Configure invalid DNS
- [ ] Trigger update check
- [ ] Verify DNS resolution fails
- [ ] Verify error message shown
- [ ] Restore DNS
- [ ] Verify recovery

### Server Errors

**TC-ERROR-004: HTTP 404**
- [ ] Configure server to return 404
- [ ] Trigger update check
- [ ] Verify error handled gracefully
- [ ] Verify user-friendly message

**TC-ERROR-005: HTTP 500**
- [ ] Configure server to return 500
- [ ] Trigger update check
- [ ] Verify retry logic engages
- [ ] Verify exponential backoff
- [ ] Verify eventual failure message

**TC-ERROR-006: HTTP 429 Rate Limit**
- [ ] Trigger many rapid update checks
- [ ] Verify rate limit response handled
- [ ] Verify Retry-After header respected
- [ ] Verify automatic retry after delay

### Download Errors

**TC-ERROR-007: SHA256 Mismatch**
- [ ] Configure server with incorrect SHA256
- [ ] Download update
- [ ] Verify checksum validation fails
- [ ] Verify download is rejected
- [ ] Verify error message shown
- [ ] Verify temporary file cleaned up

**TC-ERROR-008: Incomplete Download**
- [ ] Start download
- [ ] Kill network mid-download
- [ ] Verify error detected
- [ ] Verify partial file cleaned up
- [ ] Verify can retry download

**TC-ERROR-009: Disk Full**
- [ ] Fill disk to <100MB free
- [ ] Attempt download
- [ ] Verify disk space check
- [ ] Verify error message shown
- [ ] Free up space
- [ ] Verify download succeeds

---

## Performance Testing

### Update Check Performance

**TC-PERF-001: Check Latency**
- [ ] Measure 100 consecutive update checks
- [ ] Record time for each check
- [ ] Calculate average, min, max
- [ ] Verify >99% complete in <5 seconds
- [ ] Verify average <2 seconds

**TC-PERF-002: Check Success Rate**
- [ ] Perform 1000 update checks over 24 hours
- [ ] Record success/failure for each
- [ ] Calculate success rate
- [ ] Verify >99% success rate

### Download Performance

**TC-PERF-003: Download Speed**
- [ ] Download 100MB update
- [ ] Measure transfer speed
- [ ] Verify reasonable speed (>1MB/s on good connection)
- [ ] Verify progress updates every second

**TC-PERF-004: Download Success Rate**
- [ ] Perform 100 downloads
- [ ] Record success/failure for each
- [ ] Calculate success rate
- [ ] Verify >95% success rate

### Installation Performance

**TC-PERF-005: Installation Success Rate**
- [ ] Perform 100 installations
- [ ] Record success/failure for each
- [ ] Calculate success rate
- [ ] Verify >90% success rate

---

## Security Testing

**TC-SEC-001: HTTPS Enforcement**
- [ ] Verify all update checks use HTTPS
- [ ] Verify certificate validation
- [ ] Test with invalid certificate (should fail)
- [ ] Test with self-signed certificate (should fail)

**TC-SEC-002: SHA256 Verification**
- [ ] Verify SHA256 checked for every download
- [ ] Test with tampered file (should fail)
- [ ] Test with incorrect hash (should fail)
- [ ] Verify download rejected on mismatch

**TC-SEC-003: Code Signing**
- [ ] macOS: Verify app is notarized
- [ ] Windows: Verify installer is signed
- [ ] Verify signature before installation
- [ ] Test with unsigned binary (should warn/fail)

---

## User Experience Testing

**TC-UX-001: Notifications**
- [ ] Verify clear notification when update available
- [ ] Verify notification is not intrusive
- [ ] Verify can dismiss notification
- [ ] Verify notification reappears appropriately

**TC-UX-002: Progress Indication**
- [ ] Verify progress bar during download
- [ ] Verify percentage shown
- [ ] Verify estimated time remaining
- [ ] Verify can view detailed progress

**TC-UX-003: Update Postponement**
- [ ] Download update
- [ ] Choose "Later" when prompted to install
- [ ] Verify update remains available
- [ ] Verify prompted again later
- [ ] Verify can install at any time

**TC-UX-004: Release Notes**
- [ ] Verify release notes shown with update notification
- [ ] Verify release notes are readable
- [ ] Verify links in release notes work
- [ ] Verify can view full changelog

---

## Regression Testing

**TC-REG-001: Settings Persistence**
- [ ] Configure update settings
- [ ] Download and install update
- [ ] Verify settings persisted after update

**TC-REG-002: Extensions After Update**
- [ ] Install extensions
- [ ] Download and install update
- [ ] Verify all extensions still work
- [ ] Verify no extension data lost

**TC-REG-003: Workspace After Update**
- [ ] Open workspace with files
- [ ] Download and install update
- [ ] Verify workspace reopens
- [ ] Verify files still open
- [ ] Verify no data lost

---

## Test Execution Log

### Template for Recording Results

**Platform:** _____________
**OS Version:** _____________
**Architecture:** _____________
**Test Date:** _____________
**Tester:** _____________

| Test Case | Result | Notes | Time |
|-----------|--------|-------|------|
| TC-XXX-001 | PASS/FAIL | | |
| TC-XXX-002 | PASS/FAIL | | |
| ... | | | |

**Summary:**
- Total Tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___
- Success Rate: ___%

**Issues Found:**
1.
2.
3.

**Recommendations:**
1.
2.
3.

---

## Appendix: Test Data

### Mock Update Server URLs

**Local Testing:**
```
http://localhost:3456/api/update/{platform}/{quality}/{commit}
```

**Platforms:**
- darwin
- darwin-arm64
- win32-x64
- win32-x64-user
- win32-x64-archive
- win32-arm64
- linux-x64
- linux-arm64

### Expected Response Times

| Operation | Target | Maximum |
|-----------|--------|---------|
| Update Check | <2s | <5s |
| Download (50MB) | <60s | <180s |
| Install | <30s | <60s |

### SHA256 Test Vectors

```
Empty file: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
"Hello, World!": dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f
```

---

## Notes

- All manual tests should be performed on clean installations
- Test with both fresh installs and updated installations
- Document any platform-specific quirks or issues
- Take screenshots of errors for bug reports
- Monitor system logs during testing
- Verify disk space before and after tests
- Test with both fast and slow network connections
- Test with proxy configurations if applicable
