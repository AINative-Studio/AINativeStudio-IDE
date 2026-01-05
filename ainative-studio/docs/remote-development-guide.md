# Remote Development with AINative Studio

## Overview

AINative Studio IDE supports remote development, allowing you to work with code on different machines seamlessly. This guide covers:

- Remote development with WSL (Windows Subsystem for Linux)
- Remote development via SSH
- Development in Docker containers
- Remote tunnels for accessing your development environment from anywhere

## Prerequisites

### General Requirements

- AINative Studio IDE v1.4.9 or later
- Stable internet connection for first-time server installation
- Remote machine with:
  - Linux, macOS, or Windows
  - SSH access (for SSH remote)
  - Supported architectures: x64, ARM64

### Platform-Specific Requirements

**For WSL**:
- Windows 10 version 1903+ or Windows 11
- WSL 2 installed and configured
- At least one Linux distribution installed

**For SSH**:
- SSH client on local machine
- SSH server on remote machine
- SSH key or password authentication configured

**For Containers**:
- Docker Desktop installed and running
- Dev Container configuration in your project

## Remote-WSL Development (Windows Only)

### Setting Up WSL

1. **Install WSL 2** (if not already installed):
   ```powershell
   wsl --install
   ```

2. **Install a Linux distribution** (e.g., Ubuntu):
   ```powershell
   wsl --install -d Ubuntu
   ```

3. **Verify installation**:
   ```powershell
   wsl --list --verbose
   ```

### Connecting to WSL

1. **Open AINative Studio**

2. **Open Command Palette** (Ctrl+Shift+P or Cmd+Shift+P)

3. **Select**: "Remote-WSL: New WSL Window"

4. **Choose your distribution** from the list

5. **Wait for server installation**:
   - First connection downloads the AINative Studio server (~50-100MB)
   - Server installs to `~/.ainativestudio-server/` in WSL
   - Subsequent connections are instant

### Working in WSL

Once connected:

- **File Explorer**: Shows WSL file system (`/home/user/...`)
- **Terminal**: Opens in WSL environment automatically
- **Extensions**: Install in WSL context for full functionality
- **AI Features**: Work seamlessly in remote context

### Common WSL Commands

**Open folder in WSL from Windows**:
```bash
\\wsl$\Ubuntu\home\username\project
```

**Access Windows files from WSL**:
```bash
cd /mnt/c/Users/YourName/Documents
```

**Check WSL version**:
```powershell
wsl --list --verbose
```

## Remote-SSH Development

### Setting Up SSH Connection

1. **Configure SSH on remote machine**:
   ```bash
   # Install SSH server (if needed)
   sudo apt-get install openssh-server

   # Start SSH service
   sudo systemctl start ssh
   sudo systemctl enable ssh
   ```

2. **Set up SSH keys** (recommended):
   ```bash
   # On local machine, generate key
   ssh-keygen -t ed25519 -C "your_email@example.com"

   # Copy to remote machine
   ssh-copy-id username@remote-host
   ```

3. **Create SSH config** (optional but recommended):

   Edit `~/.ssh/config` (or `C:\Users\YourName\.ssh\config` on Windows):
   ```
   Host my-remote-server
       HostName 192.168.1.100
       User username
       IdentityFile ~/.ssh/id_ed25519
       ForwardAgent yes
   ```

### Connecting via SSH

1. **Open Command Palette** (Ctrl+Shift+P)

2. **Select**: "Remote-SSH: Connect to Host..."

3. **Enter connection**:
   - Use configured host: `my-remote-server`
   - Or full SSH string: `username@192.168.1.100`

4. **Authenticate**:
   - Enter password if using password auth
   - SSH key authentication is automatic

5. **Server installation**:
   - First connection downloads server to remote machine
   - Installs to `~/.ainativestudio-server/`
   - Takes 1-3 minutes depending on connection speed

### SSH Configuration Options

Configure in Settings (search for "Remote.SSH"):

- **Connect Timeout**: Adjust if connections are slow (default: 60s)
- **Remote Platform**: Specify OS if auto-detection fails
- **Default Extensions**: Auto-install extensions on remote
- **Enable Agent Forwarding**: For Git operations with SSH keys

### Troubleshooting SSH Connections

**Connection timeout**:
- Check firewall settings
- Verify SSH service is running: `sudo systemctl status ssh`
- Try increasing timeout in settings

**Permission denied**:
- Verify username and password
- Check SSH key permissions: `chmod 600 ~/.ssh/id_ed25519`
- Ensure public key is in `~/.ssh/authorized_keys` on remote

**Server installation fails**:
- Check available disk space: `df -h`
- Verify internet connection on remote machine
- Check server download URL is accessible

## Dev Containers

### Setting Up Dev Containers

1. **Install Docker Desktop**:
   - Download from https://www.docker.com/products/docker-desktop
   - Ensure Docker daemon is running

2. **Create dev container configuration**:

   In your project root, create `.devcontainer/devcontainer.json`:
   ```json
   {
     "name": "My Dev Container",
     "image": "mcr.microsoft.com/devcontainers/typescript-node:18",
     "customizations": {
       "vscode": {
         "extensions": [
           "dbaeumer.vscode-eslint",
           "esbenp.prettier-vscode"
         ]
       }
     },
     "forwardPorts": [3000],
     "postCreateCommand": "npm install"
   }
   ```

### Opening in Container

1. **Open project folder** in AINative Studio

2. **Command Palette** → "Dev Containers: Reopen in Container"

3. **Wait for container build**:
   - First time: Downloads base image and builds container
   - Subsequent times: Reuses existing container

4. **Development in container**:
   - File system is mounted from host
   - Server runs inside container
   - Extensions run in container context

### Common Container Configurations

**Python Development**:
```json
{
  "name": "Python 3",
  "image": "mcr.microsoft.com/devcontainers/python:3.11",
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python"]
    }
  }
}
```

**Node.js Development**:
```json
{
  "name": "Node.js",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint"]
    }
  }
}
```

**Dockerfile-based**:
```json
{
  "name": "Custom Container",
  "dockerFile": "Dockerfile",
  "context": ".."
}
```

## Remote Tunnels

### What are Remote Tunnels?

Remote Tunnels allow you to:
- Access your local development environment from anywhere
- Connect from a browser or another AINative Studio instance
- No SSH or VPN required

### Setting Up Remote Tunnel

1. **Command Palette** → "Remote Tunnels: Turn on Remote Tunnel Access"

2. **Authenticate**:
   - Sign in with GitHub or Microsoft account
   - Authorize AINative Studio

3. **Get tunnel URL**:
   - Unique URL generated: `https://tunnels.ainativestudio.com/...`
   - Valid for current session

4. **Connect from anywhere**:
   - Use URL in browser
   - Or connect from another AINative Studio instance

### Tunnel Security

- End-to-end encrypted connection
- Requires authentication to access
- Automatically expires when session ends
- Can be manually disabled at any time

## Performance Optimization

### Network Performance

**For slow connections**:
- Increase connection timeout in settings
- Use compression: `remote.SSH.enableCompression: true`
- Disable unnecessary extensions on remote

**For high-latency connections**:
- Use local Git operations when possible
- Cache files locally
- Consider using Remote Tunnels instead of SSH

### Server Resource Usage

**Monitor server resources**:
```bash
# Check server processes
ps aux | grep ainative-server

# Check disk usage
du -sh ~/.ainativestudio-server/

# Check memory usage
free -h
```

**Reduce server memory usage**:
- Close unused remote windows
- Disable extensions not needed remotely
- Limit file watcher scope

### Extension Management

**Install only necessary extensions remotely**:
- UI extensions: Install locally
- Code analysis, linters: Install remotely
- Language servers: Install remotely
- Themes, icon packs: Install locally

## AI Features in Remote Context

### Using AI Features Remotely

All AINative Studio AI features work in remote context:

- **Chat**: Works seamlessly with remote files
- **Tab Autocomplete**: Full support
- **Quick Edit (Cmd+K)**: Edits remote files
- **Agent Mode**: Can create/modify/delete remote files
- **Gather Mode**: Understands remote workspace structure

### Context Gathering

The AI automatically:
- Reads remote files when needed
- Understands remote project structure
- Uses remote Git information
- Accesses remote terminal output

### API Keys

API keys are stored locally, not on remote machine:
- Secure: Keys never transmitted to remote
- Convenient: Same keys for all remotes
- Configure in local AINative Studio settings

## Troubleshooting

### Server Download Issues

**Problem**: "Failed to download server"

**Solutions**:
1. Check internet connection on remote machine
2. Verify firewall allows GitHub access
3. Check GitHub releases: https://github.com/AINative-Studio/AINativeStudio-IDE/releases
4. Manually download and extract server if needed

**Manual server installation**:
```bash
# On remote machine
cd ~
mkdir -p .ainativestudio-server
cd .ainativestudio-server

# Download server (replace version, platform, arch)
wget https://github.com/AINative-Studio/AINativeStudio-IDE/releases/download/v1.4.9/ainative-server-linux-x64.tar.gz

# Extract
tar xzf ainative-server-linux-x64.tar.gz
rm ainative-server-linux-x64.tar.gz

# Verify
./bin/ainative-server --version
```

### Connection Failures

**WSL connection fails**:
- Ensure WSL 2 is running: `wsl --status`
- Restart WSL: `wsl --shutdown` then `wsl`
- Check Windows Defender/antivirus

**SSH connection hangs**:
- Verify SSH service: `sudo systemctl status ssh`
- Check firewall: `sudo ufw status`
- Test SSH manually: `ssh username@host`

**Container connection fails**:
- Verify Docker is running: `docker ps`
- Check Docker daemon logs
- Rebuild container: "Dev Containers: Rebuild Container"

### Extension Issues

**Extensions not working remotely**:
- Install extension in remote context (not locally)
- Check extension logs in Output panel
- Verify extension supports remote development

**Extension installation fails**:
- Check internet connection on remote
- Verify marketplace access
- Try installing manually from VSIX

### Performance Issues

**Slow file operations**:
- Reduce file watcher scope in settings
- Exclude large directories (node_modules, build, etc.)
- Use .gitignore to exclude unnecessary files

**High CPU/memory on remote**:
- Disable resource-intensive extensions
- Close unused remote windows
- Restart remote server

## Best Practices

### Security

1. **Use SSH keys** instead of passwords
2. **Keep remote machine updated**: `sudo apt update && sudo apt upgrade`
3. **Use firewall**: Only allow necessary ports
4. **Don't share tunnel URLs**: They provide full access
5. **Revoke unused tunnel access** regularly

### Organization

1. **Use SSH config** for frequently accessed hosts
2. **Name your remotes** descriptively
3. **Keep workspace settings** in .vscode/ (syncs automatically)
4. **Document remote setup** in project README

### Efficiency

1. **Install extensions once**: Settings sync across remotes
2. **Use Git on remote** for faster operations
3. **Keep server updated**: Newer versions have performance improvements
4. **Close unused connections**: Free up resources

## Server Management

### Updating Server

Server updates automatically when you update AINative Studio client. To force update:

1. **Delete old server**:
   ```bash
   rm -rf ~/.ainativestudio-server/
   ```

2. **Reconnect**: New server downloads automatically

### Server Locations

- **WSL**: `/home/username/.ainativestudio-server/`
- **Linux/macOS**: `~/.ainativestudio-server/`
- **Windows**: Not applicable (server runs remotely)

### Cleaning Up

**Remove all remote servers** (frees ~100MB per server):
```bash
# On each remote machine
rm -rf ~/.ainativestudio-server/
```

**Remove old Void servers** (if upgraded from Void):
```bash
rm -rf ~/.void-server/
```

## Supported Platforms

### Client (Local Machine)
- Windows 10/11 (x64, ARM64)
- macOS 10.15+ (Intel, Apple Silicon)
- Linux (x64, ARM64)

### Server (Remote Machine)
- Linux x64 (Ubuntu, Debian, RHEL, Fedora, etc.)
- Linux ARM64 (Raspberry Pi 4+, AWS Graviton, etc.)
- macOS Intel x64
- macOS Apple Silicon ARM64
- Windows x64 (limited support)
- Windows ARM64 (limited support)
- Alpine Linux (for containers)

## Additional Resources

### Documentation
- VS Code Remote Development: https://code.visualstudio.com/docs/remote/remote-overview
- WSL Documentation: https://docs.microsoft.com/en-us/windows/wsl/
- SSH Documentation: https://www.openssh.com/manual.html
- Docker Documentation: https://docs.docker.com/

### Community
- GitHub Issues: https://github.com/AINative-Studio/AINativeStudio-IDE/issues
- Discussions: https://github.com/AINative-Studio/AINativeStudio-IDE/discussions

### Support
- Report bugs: https://github.com/AINative-Studio/AINativeStudio-IDE/issues/new
- Feature requests: https://github.com/AINative-Studio/AINativeStudio-IDE/discussions

## Version History

- **v1.4.9**: Initial remote development support
  - Remote-WSL support
  - Remote-SSH support
  - Dev Containers support
  - Remote Tunnels support

---

**Last Updated**: 2026-01-04
**Minimum Version**: AINative Studio v1.4.9
