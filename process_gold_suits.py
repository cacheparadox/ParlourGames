import os
from PIL import Image

def extract_gold_symbol(img_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # 1. Make the outer white border transparent
        # Pure white and near-white colors at the edge of the card
        if r > 210 and g > 210 and b > 210:
            new_data.append((0, 0, 0, 0))
            continue
            
        # 2. Make the dark-gray card background transparent
        # The background has very low color saturation (MaxDiff is 0 to 8)
        # and its brightness is generally low (< 110).
        max_diff = max(abs(r - g), abs(r - b), abs(g - b))
        brightness = (r + g + b) / 3
        
        if brightness < 110 and max_diff < 15:
            new_data.append((0, 0, 0, 0))
            continue
            
        # Otherwise, keep the pixel (it's part of the gold engraving)
        new_data.append(item)
        
    img.putdata(new_data)
    img.save(img_path)
    print(f"Extracted gold symbol from: {os.path.basename(img_path)}")

def main():
    print("--- Refining Card Suits (Gold Extraction) ---")
    suits = ["heart.png", "spade.png", "diamond-suit.png", "club.png"]
    for suit in suits:
        suit_path = os.path.join(r"c:\Projects\Parlour\src\assets", suit)
        extract_gold_symbol(suit_path)

if __name__ == "__main__":
    main()
