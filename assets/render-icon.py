#!/Library/Developer/CommandLineTools/usr/bin/python3
# Renders .claude-plugin/icon.png. Needs Pillow; the CommandLineTools python3 has it.
# Usage: assets/render-icon.py .claude-plugin/icon.png
from PIL import Image, ImageDraw, ImageFilter
import sys
OUT = sys.argv[1]; S = 1024; K = 4; W = S * K
CHAMPAGNE=(0xf5,0xee,0xd1); PINK=(0xff,0x00,0x73); ICE=(0x00,0xff,0xda); BLUE=(0x00,0x2d,0xff)

stroke=int(W*0.075); top,bot=int(W*0.27),int(W*0.73)
xs=[int(W*x) for x in (0.30,0.43,0.56,0.69)]
x0,y0 = xs[0]-int(W*0.06), bot+int(W*0.02)
x1,y1 = xs[-1]+int(W*0.06), top-int(W*0.02)

def bars_mask(width):
    m=Image.new("L",(W,W),0); d=ImageDraw.Draw(m)
    for x in xs: d.rounded_rectangle((x-width//2,top,x+width//2,bot),radius=width//2,fill=255)
    return m
def slash_mask(width):
    m=Image.new("L",(W,W),0); d=ImageDraw.Draw(m)
    d.line((x0,y0,x1,y1),fill=255,width=width)
    for cx,cy in ((x0,y0),(x1,y1)): d.ellipse((cx-width//2,cy-width//2,cx+width//2,cy+width//2),fill=255)
    return m
def dot_mask(r):
    m=Image.new("L",(W,W),0); cx,cy=int(W*0.84),int(W*0.84)
    ImageDraw.Draw(m).ellipse((cx-r,cy-r,cx+r,cy+r),fill=255); return m
def halo(mask, color, blur, strength):
    m=mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda a:int(a*strength))
    layer=Image.new("RGBA",(W,W),color+(255,)); layer.putalpha(m); return layer
def solid(mask,color):
    layer=Image.new("RGBA",(W,W),color+(255,)); layer.putalpha(mask); return layer

base=Image.new("RGBA",(W,W),CHAMPAGNE+(255,))
base=Image.alpha_composite(base, halo(bars_mask(stroke+int(W*0.02)), PINK, int(W*0.035), 0.32))
base=Image.alpha_composite(base, solid(bars_mask(stroke), PINK))
base=Image.alpha_composite(base, halo(slash_mask(stroke+int(W*0.02)), ICE, int(W*0.03), 0.40))
base=Image.alpha_composite(base, solid(slash_mask(stroke+int(W*0.03)), CHAMPAGNE))   # clean gap
base=Image.alpha_composite(base, solid(slash_mask(stroke), ICE))
r=int(W*0.035)
base=Image.alpha_composite(base, halo(dot_mask(r*2), BLUE, int(W*0.02), 0.30))
base=Image.alpha_composite(base, solid(dot_mask(r), BLUE))

flat=base.convert("RGB").resize((S,S),Image.LANCZOS)
flat.save(OUT,"PNG",optimize=True)
flat.resize((64,64),Image.LANCZOS).save(OUT.replace(".png","-64.png"),"PNG")
print(flat.size)
