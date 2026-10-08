from pathlib import Path
from PIL import Image
import statistics

# Bake fine reflection detail from the approved empty bottle onto the 3D wall.
# This texture contains no sand or silhouette geometry.
root = Path(__file__).resolve().parents[1] / 'assets'
source = Image.open(root / 'game-cover-realistic.png').convert('RGB').crop((377, 910, 560, 1378))
detail = Image.new('RGBA', source.size)
for y in range(source.height):
    row = [source.getpixel((x, y)) for x in range(source.width)]
    luminance = [0.2126*r + 0.7152*g + 0.0722*b for r,g,b in row]
    baseline = statistics.median(luminance[:8] + luminance[-8:])
    for x, color in enumerate(row):
        alpha = max(0, min(210, int((luminance[x] - baseline - 10) * 1.2)))
        detail.putpixel((x, y), (*color, alpha))
detail.save(root / 'glass-reflection-detail.png')
print('Baked approved glass reflection detail.')
