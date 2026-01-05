#!/bin/bash

# Exit on error
set -e

# Check platform
platform=$(uname)

if [[ "$platform" == "Darwin" ]]; then
    echo "Running on macOS. Note that the AppImage created will only work on Linux systems."
    if ! command -v docker &> /dev/null; then
        echo "Docker Desktop for Mac is not installed. Please install it from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
elif [[ "$platform" == "Linux" ]]; then
    echo "Running on Linux. Proceeding with AppImage creation..."
else
    echo "This script is intended to run on macOS or Linux. Current platform: $platform"
    exit 1
fi

# Enable BuildKit
export DOCKER_BUILDKIT=1

BUILD_IMAGE_NAME="ainative-appimage-builder"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Check and install Buildx if needed
if ! docker buildx version >/dev/null 2>&1; then
    echo "Installing Docker Buildx..."
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/buildx/releases/download/v0.13.1/buildx-v0.13.1.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
    chmod +x ~/.docker/cli-plugins/docker-buildx
fi

# Download appimagetool if not present
if [ ! -f "appimagetool" ]; then
    echo "Downloading appimagetool..."
    wget -O appimagetool "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x appimagetool
fi

# Delete any existing AppImage to avoid bloating the build
rm -f AINative-x86_64.AppImage

# Create build Dockerfile
echo "Creating build Dockerfile..."
cat > Dockerfile.build << 'EOF'
# syntax=docker/dockerfile:1
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    libfuse2 \
    libglib2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libdrm2 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EOF

# Create .dockerignore file
echo "Creating .dockerignore file..."
cat > .dockerignore << EOF
Dockerfile.build
.dockerignore
.git
.gitignore
.DS_Store
*~
*.swp
*.swo
*.tmp
*.bak
*.log
*.err
node_modules/
venv/
*.egg-info/
*.tox/
dist/
EOF

# Build Docker image without cache
echo "Building Docker image (no cache)..."
docker build --no-cache -t "$BUILD_IMAGE_NAME" -f Dockerfile.build .

# Create AppImage using local appimagetool
echo "Creating AppImage..."
docker run --rm --privileged -v "$(pwd):/app" "$BUILD_IMAGE_NAME" bash -c '
cd /app && \
rm -rf AINativeApp.AppDir && \
mkdir -p AINativeApp.AppDir/usr/bin AINativeApp.AppDir/usr/lib AINativeApp.AppDir/usr/share/applications && \
find . -maxdepth 1 ! -name AINativeApp.AppDir ! -name "." ! -name ".." -exec cp -r {} AINativeApp.AppDir/usr/bin/ \; && \
cp ainative.png AINativeApp.AppDir/ && \
echo "[Desktop Entry]" > AINativeApp.AppDir/ainative.desktop && \
echo "Name=AINative Studio" >> AINativeApp.AppDir/ainative.desktop && \
echo "Comment=Open source AI code editor." >> AINativeApp.AppDir/ainative.desktop && \
echo "GenericName=Text Editor" >> AINativeApp.AppDir/ainative.desktop && \
echo "Exec=ainative %F" >> AINativeApp.AppDir/ainative.desktop && \
echo "Icon=ainative" >> AINativeApp.AppDir/ainative.desktop && \
echo "Type=Application" >> AINativeApp.AppDir/ainative.desktop && \
echo "StartupNotify=false" >> AINativeApp.AppDir/ainative.desktop && \
echo "StartupWMClass=AINative" >> AINativeApp.AppDir/ainative.desktop && \
echo "Categories=TextEditor;Development;IDE;" >> AINativeApp.AppDir/ainative.desktop && \
echo "MimeType=application/x-ainative-workspace;" >> AINativeApp.AppDir/ainative.desktop && \
echo "Keywords=ainative;ai;" >> AINativeApp.AppDir/ainative.desktop && \
echo "Actions=new-empty-window;" >> AINativeApp.AppDir/ainative.desktop && \
echo "[Desktop Action new-empty-window]" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name=New Empty Window" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[de]=Neues leeres Fenster" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[es]=Nueva ventana vacía" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[fr]=Nouvelle fenêtre vide" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[it]=Nuova finestra vuota" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[ja]=新しい空のウィンドウ" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[ko]=새 빈 창" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[ru]=Новое пустое окно" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[zh_CN]=新建空窗口" >> AINativeApp.AppDir/ainative.desktop && \
echo "Name[zh_TW]=開新空視窗" >> AINativeApp.AppDir/ainative.desktop && \
echo "Exec=ainative --new-window %F" >> AINativeApp.AppDir/ainative.desktop && \
echo "Icon=ainative" >> AINativeApp.AppDir/ainative.desktop && \
chmod +x AINativeApp.AppDir/ainative.desktop && \
cp AINativeApp.AppDir/ainative.desktop AINativeApp.AppDir/usr/share/applications/ && \
echo "[Desktop Entry]" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Name=AINative Studio - URL Handler" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Comment=Open source AI code editor." > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "GenericName=Text Editor" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Exec=ainative --open-url %U" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Icon=ainative" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Type=Application" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "NoDisplay=true" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "StartupNotify=true" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Categories=Utility;TextEditor;Development;IDE;" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "MimeType=x-scheme-handler/ainative;" > AINativeApp.AppDir/ainative-url-handler.desktop && \
echo "Keywords=ainative;ai;" > AINativeApp.AppDir/ainative-url-handler.desktop && \
chmod +x AINativeApp.AppDir/ainative-url-handler.desktop && \
cp AINativeApp.AppDir/ainative-url-handler.desktop AINativeApp.AppDir/usr/share/applications/ && \
echo "#!/bin/bash" > AINativeApp.AppDir/AppRun && \
echo "HERE=\$(dirname \"\$(readlink -f \"\${0}\")\")" >> AINativeApp.AppDir/AppRun && \
echo "export PATH=\${HERE}/usr/bin:\${PATH}" >> AINativeApp.AppDir/AppRun && \
echo "export LD_LIBRARY_PATH=\${HERE}/usr/lib:\${LD_LIBRARY_PATH}" >> AINativeApp.AppDir/AppRun && \
echo "exec \${HERE}/usr/bin/ainative --no-sandbox \"\$@\"" >> AINativeApp.AppDir/AppRun && \
chmod +x AINativeApp.AppDir/AppRun && \
chmod -R 755 AINativeApp.AppDir && \

# Strip unneeded symbols from the binary to reduce size
strip --strip-unneeded AINativeApp.AppDir/usr/bin/ainative

ls -la AINativeApp.AppDir/ && \
ARCH=x86_64 ./appimagetool -n AINativeApp.AppDir AINative-x86_64.AppImage
'

# Clean up
rm -rf AINativeApp.AppDir .dockerignore appimagetool

echo "AppImage creation complete! Your AppImage is: AINative-x86_64.AppImage"
