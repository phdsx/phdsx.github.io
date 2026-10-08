from pathlib import Path
from PIL import Image, ImageOps
source = Path('evidence/thumbnail-scene.png')
image = Image.open(source).convert('RGB')
# The capture temporarily hides HTML overlays; every scene pixel is live Three.js.
image = ImageOps.fit(image, (960, 540), method=Image.Resampling.LANCZOS)
image.save('../assets/tours/beijing-zoo.webp', 'WEBP', quality=88)
print('Thumbnail from actual runtime screenshot, 960x540')
