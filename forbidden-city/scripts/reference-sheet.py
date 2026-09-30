from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
files=list((root/'research').glob('*-[123].jpg'))
files.sort()
width,height=1080,((len(files)+2)//3)*240
sheet=Image.new('RGB',(width,height),'#efeee5')
for i,file in enumerate(files):
    im=Image.open(file).convert('RGB');im.thumbnail((352,205))
    x=(i%3)*360;y=(i//3)*240
    sheet.paste(im,(x+(360-im.width)//2,y))
    ImageDraw.Draw(sheet).text((x+8,y+212),file.name,fill='#26382b')
sheet.save(root/'research/reference-contact-sheet.jpg',quality=88)
