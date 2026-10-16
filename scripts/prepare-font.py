"""Subset Google's OFL Noto Serif SC for reliable local font loading.

Requires fonttools and brotli. Use --font-source for an already downloaded source.
"""
import argparse
from pathlib import Path
import sys
import urllib.request
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tmp/font-tools'))
from fontTools import subset
from fontTools.ttLib import TTFont
parser=argparse.ArgumentParser();parser.add_argument('--font-source',type=Path,default=root/'tmp/NotoSerifSC.ttf');parser.add_argument('--sans',action='store_true');args=parser.parse_args()
family='NotoSansSC' if args.sans else 'NotoSerifSC';folder='notosanssc' if args.sans else 'notoserifsc';suffix='sans' if args.sans else 'serif'
source=args.font_source
if not source.exists():
 source.parent.mkdir(parents=True,exist_ok=True)
 urllib.request.urlretrieve(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/{family}%5Bwght%5D.ttf',source)
text=''.join(p.read_text(encoding='utf-8') for p in (root/'src').rglob('*') if p.suffix in {'.jsx','.json','.mjs','.css'})
text+=''.join(chr(i) for i in range(32,127))+'温故而知新□＿〇一二三四五六七八九十'
font=TTFont(source);options=subset.Options();options.flavor='woff2';options.layout_features=['*'];options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
subsetter=subset.Subsetter(options=options);subsetter.populate(text=text);subsetter.subset(font)
for name in font['name'].names:
 if name.nameID in [1,4,6,16]:
  value=f'WenGu{suffix.title()}' if name.nameID==6 else f'WenGu {suffix.title()}'
  name.string=value.encode(name.getEncoding(),errors='replace')
font.flavor='woff2';out=root/'public/fonts';out.mkdir(parents=True,exist_ok=True);font.save(out/f'wengu-{suffix}.woff2')
urllib.request.urlretrieve(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/OFL.txt',out/f'{suffix}-OFL.txt')
print('Local subset font:',(out/f'wengu-{suffix}.woff2').stat().st_size,'bytes')
