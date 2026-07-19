import os
from PIL import Image, ImageDraw

def crop_card_back():
    img_path = r"c:\Projects\Parlour\src\assets\card-back.png"
    if not os.path.exists(img_path):
        print("card-back.png not found")
        return
    
    img = Image.open(img_path)
    w, h = img.size
    print(f"Original card-back size: {w}x{h}")
    
    if w == 1024 and h == 1024:
        left = int(w * 0.16)
        right = int(w * 0.84)
        top = int(h * 0.025)
        bottom = int(h * 0.975)
        
        print(f"Cropping card-back to: ({left}, {top}, {right}, {bottom})")
        cropped = img.crop((left, top, right, bottom))
        cropped.save(img_path)
        print("Cropped card-back saved successfully!")
    else:
        print("Card-back is already cropped. Skipping.")

def remove_background_refined(img_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # Calculate saturation difference and average brightness
        max_diff = max(abs(r - g), abs(r - b), abs(g - b))
        brightness = (r + g + b) / 3
        
        # 1. Catch outer white margins
        if brightness > 195 and max_diff < 30:
            new_data.append((0, 0, 0, 0))
            continue
            
        # 2. Catch gray card background texture and any white specs/noise
        if brightness < 185 and max_diff < 24:
            new_data.append((0, 0, 0, 0))
            continue
            
        new_data.append(item)
        
    img.putdata(new_data)
    img.save(img_path)
    print(f"Refined background removal completed for: {os.path.basename(img_path)}")

def remove_pure_black_background(img_path, threshold=20):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # Simple dark key for black background extraction
        if r < threshold and g < threshold and b < threshold:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(img_path)
    print(f"Removed pure black background from: {os.path.basename(img_path)}")

def mask_token_to_circle(img_path, pad_percent=0.03):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    
    pad_w = int(w * pad_percent)
    pad_h = int(h * pad_percent)
    draw.ellipse((pad_w, pad_h, w - pad_w, h - pad_h), fill=255)
    
    result = Image.new("RGBA", (w, h))
    result.paste(img, (0, 0), mask=mask)
    
    datas = result.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        if a > 0 and r < 35 and g < 35 and b < 35:
            brightness = (r + g + b) / 3
            if brightness < 20:
                new_data.append((0, 0, 0, 0))
                continue
        new_data.append(item)
        
    result.putdata(new_data)
    result.save(img_path)
    print(f"Masked circular token: {os.path.basename(img_path)}")

def main():
    print("--- Card Back Cropping ---")
    crop_card_back()
    
    print("\n--- Card Suits Background Extraction (Refined) ---")
    assets_to_clean = ["heart.png", "spade.png", "diamond-suit.png", "club.png", "devil.png"]
    for asset in assets_to_clean:
        asset_path = os.path.join(r"c:\Projects\Parlour\src\assets", asset)
        remove_background_refined(asset_path)
        
    print("\n--- Diamond Gem Background Extraction (Pure Black Key) ---")
    diamond_path = os.path.join(r"c:\Projects\Parlour\src\assets", "diamond.png")
    remove_pure_black_background(diamond_path, threshold=20)
        
    print("\n--- Wooden Tokens Circular Masking (All Pieces) ---")
    tokens = ["king.png", "general.png", "knight.png", "soldier.png", "commoner.png"]
    for token in tokens:
        token_path = os.path.join(r"c:\Projects\Parlour\src\assets", token)
        mask_token_to_circle(token_path, pad_percent=0.08)

if __name__ == "__main__":
    main()
