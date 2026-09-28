from pathlib import Path
import sys
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'games/puzzle/sand-sort'
capture = root / (sys.argv[1] if len(sys.argv) > 1 else 'preview-webgl-initial.png')
output = root / (sys.argv[2] if len(sys.argv) > 2 else 'comparison-initial.png')
reference = Image.open(root / 'assets/game-cover-realistic.png').convert('RGB')
actual = Image.open(capture).convert('RGB')
reference = reference.resize(actual.size, Image.Resampling.LANCZOS)
sheet = Image.new('RGB', (actual.width * 2 + 18, actual.height + 28), '#e8e6e1')
sheet.paste(reference, (0, 28))
sheet.paste(actual, (actual.width + 18, 28))
draw = ImageDraw.Draw(sheet)
draw.text((8, 8), 'APPROVED CONCEPT', fill='#202020')
draw.text((actual.width + 26, 8), 'ACTUAL BROWSER CAPTURE', fill='#202020')
sheet.save(output)
focus = Image.new('RGB', (516, 660), '#e8e6e1')
for index, screen in enumerate([reference, actual]):
    bottle = screen.crop((50,146,133,343)).resize((249,591),Image.Resampling.LANCZOS)
    focus.paste(bottle,(index*267,24))
ImageDraw.Draw(focus).text((8,8),'SOURCE / ACTUAL - BOTTLE DETAIL',fill='#202020')
focus.save(output.with_name(output.stem + '-detail.png'))
print(output)
