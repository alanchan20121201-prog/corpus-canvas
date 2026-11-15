import os
from PIL import Image, ImageDraw

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# rounded background with a soft vertical gradient
top = (63, 106, 88, 255)
bot = (32, 62, 52, 255)
for y in range(S):
    t = y / (S - 1)
    c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(4))
    d.line([(0, y), (S, y)], fill=c)

mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, S - 1, S - 1], radius=228, fill=255)

bg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
bg.paste(img, (0, 0), mask)
img = bg
d = ImageDraw.Draw(img)

cream = (247, 242, 230, 255)
cream_soft = (247, 242, 230, 105)

cx, cy = 512, 512
nodes = [(300, 316, 44), (726, 330, 44), (322, 716, 44), (700, 704, 44)]
# connectors
for (x, y, r) in nodes:
    d.line([(cx, cy), (x, y)], fill=cream_soft, width=18)
# centre node
d.ellipse([cx - 86, cy - 86, cx + 86, cy + 86], fill=cream)
d.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], fill=(47, 84, 70, 255))
for (x, y, r) in nodes:
    d.ellipse([x - r, y - r, x + r, y + r], fill=cream)


os.makedirs('build', exist_ok=True)
img.save('build/icon.png')
sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save('build/icon.ico', sizes=sizes)
print('icon written')
