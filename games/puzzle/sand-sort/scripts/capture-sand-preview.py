from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
paths = sorted((root / 'qa-frames').glob('frame*.png'))
frames = [Image.open(path).convert('RGB') for path in paths]
frames[0].save(root / 'preview-webgl.gif', save_all=True, append_images=frames[1:], duration=[450] + [180] * (len(frames)-2) + [750], loop=0, optimize=True)
sheet = Image.new('RGB',(126 * 3, (len(frames)+2)//3 * 245),'#171c24')
draw = ImageDraw.Draw(sheet)
for index, frame in enumerate(frames):
    thumb = frame.resize((126,224),Image.Resampling.LANCZOS)
    x = (index % 3) * 126
    y = (index // 3) * 245
    sheet.paste(thumb,(x,y+20))
    draw.text((x+4,y+4),paths[index].name,fill='white')
sheet.save(root / 'qa-frames/contact-sheet.png')
print('Saved browser-only GIF and frame contact sheet.')
