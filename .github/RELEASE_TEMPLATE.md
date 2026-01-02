# AINative Studio Release

## Installation

### Linux

#### Debian/Ubuntu (.deb)
```bash
sudo dpkg -i AINativeStudio-{version}-Linux-{arch}.deb
```

#### Fedora/RHEL/CentOS (.rpm)
```bash
# Modern package manager (recommended)
sudo dnf install AINativeStudio-{version}-Linux-{arch}.rpm

# Or using YUM
sudo yum install AINativeStudio-{version}-Linux-{arch}.rpm
```

#### Tarball (.tar.gz)
```bash
tar -xzf AINativeStudio-{version}-Linux-{arch}.tar.gz
cd AINativeStudio-{version}-Linux-{arch}
./ainative-studio
```

#### AppImage
```bash
chmod +x AINativeStudio-{version}-Linux-{arch}.AppImage
./AINativeStudio-{version}-Linux-{arch}.AppImage
```

### macOS

#### DMG Installer
1. Download `AINativeStudio-{version}-Darwin-{arch}.dmg`
2. Open the DMG file
3. Drag AINative Studio to Applications folder

#### ZIP Archive
```bash
unzip AINativeStudio-{version}-Darwin-{arch}.zip
# Move to Applications
mv "AINative Studio.app" /Applications/
```

### Windows

#### User Setup (Recommended)
```powershell
# Download and run
.\AINativeStudio-{version}-Windows-{arch}-UserSetup.exe
```

#### System Setup (Requires Admin)
```powershell
# Download and run as Administrator
.\AINativeStudio-{version}-Windows-{arch}-SystemSetup.exe
```

#### Portable ZIP
```powershell
# Extract and run
Expand-Archive AINativeStudio-{version}-Windows-{arch}.zip
cd AINativeStudio-{version}-Windows-{arch}
.\AINativeStudio.exe
```

## SHA256 Checksums

Verify your download integrity:

```bash
# Linux/macOS
sha256sum -c <filename>.sha256

# Windows (PowerShell)
Get-FileHash <filename> -Algorithm SHA256
```

All releases include `.sha256` files for verification.

## What's New

{RELEASE_NOTES_CONTENT}

## System Requirements

- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 10.15 or later (Intel or Apple Silicon)
- **Linux**: Ubuntu 20.04+, Fedora 36+, or equivalent

## Support

- **Documentation**: https://docs.ainativestudio.com
- **Issues**: https://github.com/AINative-Studio/AINativeStudio-IDE/issues
- **Community**: https://discord.gg/ainativestudio

---

🤖 Generated with AINative Studio
