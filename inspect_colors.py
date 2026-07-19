import os
from PIL import Image

def inspect_colors():
    img_path = r"c:\Projects\Parlour\src\assets\club.png"
    if not os.path.exists(img_path):
        print("club.png not found")
        return
        
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    print(f"Image size: {w}x{h}")
    
    # Inspect a grid of corners (likely background or white border)
    test_points = [
        (0, 0), (5, 5), (10, 10), (50, 50), (100, 100), # Top-left corners
        (w // 2, 20), (20, h // 2), # Top-mid, left-mid
        (w // 2, h // 2) # Center (should be gold symbol)
      ]
      
    for pt in test_points:
        color = img.getpixel(pt)
        r, g, b, a = color
        max_diff = max(abs(r - g), abs(r - b), abs(g - b))
        brightness = (r + g + b) / 3
        print(f"Point {pt}: Color={color}, Brightness={brightness:.1f}, MaxDiff={max_diff}")

if __name__ == "__main__":
    inspect_colors()
