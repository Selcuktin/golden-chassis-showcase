import glob
import os

import cv2
import numpy as np


def clean_image(img_path):
    img = cv2.imread(img_path)
    if img is None:
        return
    h, w = img.shape[:2]
    
    # 1. Clean top studio wall if it's a studio wall (mean > 190 in the top 130px)
    top_region = img[10:135, 380:1240]
    if np.mean(top_region) > 190 and np.std(top_region) > 30:
        mask_top = np.zeros((h, w), dtype=np.uint8)
        mask_top[10:135, 380:1240] = 255
        img = cv2.inpaint(img, mask_top, 15, cv2.INPAINT_TELEA)
    
    # 2. Clean bottom-right watermark ID (e.g. #42958457)
    mask_id = np.zeros((h, w), dtype=np.uint8)
    mask_id[int(h * 0.94):h, int(w * 0.85):w] = 255
    img = cv2.inpaint(img, mask_id, 10, cv2.INPAINT_TELEA)
    
    # 3. Clean bottom-left corner if any watermark numbers exist
    mask_bl = np.zeros((h, w), dtype=np.uint8)
    mask_bl[int(h * 0.95):h, 0:int(w * 0.15)] = 255
    img = cv2.inpaint(img, mask_bl, 10, cv2.INPAINT_TELEA)
    
    # 4. Save cleaned image with high quality
    cv2.imwrite(img_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"Cleaned: {img_path}")

def main():
    folders = [
        "public/cars/porsche-911-gt3",
        "public/cars/lamborghini-urus-se",
        "public/cars/mercedes-g63",
        "public/cars/audi-rs6"
    ]
    for folder in folders:
        for f in sorted(glob.glob(os.path.join(folder, "*.jpg"))):
            clean_image(f)

if __name__ == "__main__":
    main()
