from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageChops, ImageFilter

root = Path(__file__).resolve().parents[1] / 'games/puzzle/sand-sort/assets'
source = Image.open(root / 'game-cover-realistic.png')
grain = ImageOps.grayscale(source.crop((191, 654, 271, 692)))
grain = ImageChops.subtract(grain, grain.filter(ImageFilter.GaussianBlur(3)), scale=1, offset=205)
grain = ImageEnhance.Contrast(grain).enhance(3.0)
tile = Image.new('L', (160, 76))
tile.paste(grain, (0, 0))
tile.paste(ImageOps.mirror(grain), (80, 0))
tile.paste(ImageOps.flip(grain), (0, 38))
tile.paste(ImageOps.flip(ImageOps.mirror(grain)), (80, 38))
tile.save(root / 'sand-grain-relief.png')
print('Extracted grain relief from the approved source image.')
