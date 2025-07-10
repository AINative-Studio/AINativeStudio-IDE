#!/usr/bin/env python3
"""
Convert PNG images to ICO format for Windows icons.
This script creates ICO files from PNG images using basic conversion methods.
"""

import os
import struct
from PIL import Image
import io

def create_ico_from_png(png_path, ico_path, sizes=None):
    """Create an ICO file from a PNG image with multiple sizes."""
    if sizes is None:
        sizes = [16, 32, 48, 64, 128, 256]
    
    # Open the source PNG
    with Image.open(png_path) as img:
        img = img.convert('RGBA')  # Ensure RGBA format
        
        # Create images for each size
        images = []
        for size in sizes:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            images.append(resized)
        
        # Save as ICO
        images[0].save(ico_path, format='ICO', sizes=[(s, s) for s in sizes], append_images=images[1:])

def create_favicon():
    """Create a favicon.ico specifically for web use."""
    create_ico_from_png('ai_native_studio.png', 'favicon.ico', [16, 32, 48])

def create_windows_ico():
    """Create main Windows application icon."""
    create_ico_from_png('ai_native_studio.png', 'code.ico', [16, 32, 48, 64, 128, 256])

def create_tile_sizes():
    """Create Windows tile images for Start menu."""
    with Image.open('ai_native_studio.png') as img:
        img = img.convert('RGBA')
        
        # Create 70x70 tile
        tile_70 = img.resize((70, 70), Image.Resampling.LANCZOS)
        tile_70.save('code_70x70.png', format='PNG')
        
        # Create 150x150 tile
        tile_150 = img.resize((150, 150), Image.Resampling.LANCZOS)
        tile_150.save('code_150x150.png', format='PNG')

if __name__ == "__main__":
    try:
        from PIL import Image
        
        print("Creating Windows ICO files...")
        create_windows_ico()
        print("✓ Created code.ico")
        
        print("Creating favicon...")
        create_favicon()
        print("✓ Created favicon.ico")
        
        print("Creating Windows tile images...")
        create_tile_sizes()
        print("✓ Created tile images")
        
        print("All ICO files created successfully!")
        
    except ImportError:
        print("PIL (Pillow) not available. Using fallback method...")
        # Fallback: just copy the PNG files with ICO extension
        # This is not ideal but provides something
        import shutil
        shutil.copy('ai_native_studio_256x256.png', 'code.ico')
        shutil.copy('ai_native_studio_32x32.png', 'favicon.ico')
        print("Created basic ICO files (may need proper conversion tools)")