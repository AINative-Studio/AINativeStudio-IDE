#!/usr/bin/env python3
"""
Create SVG version of the AINative Studio icon.
This creates a basic SVG representation for scalable UI use.
"""

def create_svg_icon():
    """Create a basic SVG representation of the icon."""
    # Based on the bracket design in the PNG, create a simple SVG
    svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4a4a7a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d2d5a;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="400" fill="url(#grad1)"/>
  
  <!-- Left bracket -->
  <path d="M 120 140 
           L 140 140 
           L 140 160 
           L 120 160 
           L 120 200 
           L 140 200 
           L 140 220 
           L 120 220 
           L 120 260 
           L 140 260 
           L 140 280 
           L 120 280 
           L 120 320 
           L 140 320 
           L 140 340 
           L 120 340 
           L 120 360 
           L 80 360 
           L 80 340 
           L 80 320 
           L 80 280 
           L 80 220 
           L 80 200 
           L 80 160 
           L 80 140 
           L 80 120 
           L 120 120 
           Z" 
        fill="white" stroke="none"/>
  
  <!-- Right bracket -->
  <path d="M 280 140 
           L 260 140 
           L 260 160 
           L 280 160 
           L 280 200 
           L 260 200 
           L 260 220 
           L 280 220 
           L 280 260 
           L 260 260 
           L 260 280 
           L 280 280 
           L 280 320 
           L 260 320 
           L 260 340 
           L 280 340 
           L 280 360 
           L 320 360 
           L 320 340 
           L 320 320 
           L 320 280 
           L 320 220 
           L 320 200 
           L 320 160 
           L 320 140 
           L 320 120 
           L 280 120 
           Z" 
        fill="#5a7bcf" stroke="none"/>
  
  <!-- Small accent elements -->
  <circle cx="290" cy="180" r="8" fill="#5a7bcf"/>
  <circle cx="290" cy="220" r="6" fill="#5a7bcf"/>
  <circle cx="290" cy="260" r="4" fill="#5a7bcf"/>
  
  <!-- Bottom point -->
  <path d="M 180 300 L 200 320 L 160 320 Z" fill="white"/>
</svg>'''
    
    with open('ai_native_studio.svg', 'w') as f:
        f.write(svg_content)
    print("✓ Created ai_native_studio.svg")

if __name__ == "__main__":
    create_svg_icon()