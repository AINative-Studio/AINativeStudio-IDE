#!/usr/bin/env python3
"""
Convert PNG images to ICNS format for macOS icons.
This script creates ICNS files from PNG images.
"""

import os
import struct
from PIL import Image
import io

def create_icns_from_png(png_path, icns_path):
    """Create an ICNS file from a PNG image."""
    try:
        # Try using pillow-heif or basic approach
        with Image.open(png_path) as img:
            img = img.convert('RGBA')
            
            # Create different sizes needed for ICNS
            sizes = [16, 32, 64, 128, 256, 512, 1024]
            images = []
            
            for size in sizes:
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                images.append(resized)
            
            # Save as ICNS - Pillow should handle this
            images[0].save(icns_path, format='ICNS', 
                          sizes=[(s, s) for s in sizes], 
                          append_images=images[1:])
            
            return True
            
    except Exception as e:
        print(f"Error creating ICNS: {e}")
        return False

def create_macos_icns():
    """Create main macOS application icon."""
    success = create_icns_from_png('ai_native_studio.png', 'code.icns')
    if success:
        print("✓ Created code.icns")
    else:
        print("⚠ Could not create ICNS file - may need macOS tools")
        # Fallback: create a simple script that can be run on macOS
        create_icns_script()

def create_icns_script():
    """Create a script to generate ICNS on macOS."""
    script_content = '''#!/bin/bash
# This script creates ICNS files using macOS tools
# Run this on macOS to generate proper ICNS files

# Create iconset directory
mkdir -p AINativeStudio.iconset

# Generate all required sizes
sips -z 16 16 ai_native_studio.png --out AINativeStudio.iconset/icon_16x16.png
sips -z 32 32 ai_native_studio.png --out AINativeStudio.iconset/icon_16x16@2x.png
sips -z 32 32 ai_native_studio.png --out AINativeStudio.iconset/icon_32x32.png
sips -z 64 64 ai_native_studio.png --out AINativeStudio.iconset/icon_32x32@2x.png
sips -z 128 128 ai_native_studio.png --out AINativeStudio.iconset/icon_128x128.png
sips -z 256 256 ai_native_studio.png --out AINativeStudio.iconset/icon_128x128@2x.png
sips -z 256 256 ai_native_studio.png --out AINativeStudio.iconset/icon_256x256.png
sips -z 512 512 ai_native_studio.png --out AINativeStudio.iconset/icon_256x256@2x.png
sips -z 512 512 ai_native_studio.png --out AINativeStudio.iconset/icon_512x512.png
sips -z 1024 1024 ai_native_studio.png --out AINativeStudio.iconset/icon_512x512@2x.png

# Create ICNS file
iconutil -c icns AINativeStudio.iconset --output code.icns

# Clean up
rm -rf AINativeStudio.iconset

echo "Created code.icns"
'''
    
    with open('create_icns_macos.sh', 'w') as f:
        f.write(script_content)
    
    os.chmod('create_icns_macos.sh', 0o755)
    print("✓ Created create_icns_macos.sh script for macOS")

if __name__ == "__main__":
    print("Creating macOS ICNS files...")
    create_macos_icns()