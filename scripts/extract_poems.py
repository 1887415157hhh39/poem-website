"""Rebuild the curriculum from the supplied PDF, retaining physical page provenance."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import fitz

parser = argparse.ArgumentParser()
parser.add_argument('pdf', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
doc = fitz.open(args.pdf)
text, pages = '', []
for index in range(5, len(doc)):
    # PyMuPDF emits the footer first; remove ONLY the verified first page number.
    lines = doc[index].get_text().splitlines()
    assert lines[0].strip() == str(index - 4), (index, lines[0])
    chunk = '\n'.join(lines[1:]) + '\n'
    pages.extend([index + 1] * len(chunk))
    text += chunk

headings = list(re.finditer(r'(?m)^(\d+)\.\s*([^\n]*《[^\n]+)', text))
assert len(headings) == 200
preface_counts = {'shi-118': 3, 'ci-31': 2, 'ci-33': 3}
modern = {152,153,154,156,157,158,159,160,161,162}
poems = []
for index, match in enumerate(headings):
    number = int(match.group(1))
    category = '诗' if index < 162 else '词'
    assert number == (index + 1 if index < 162 else index - 161)
    poem_id = f"{'shi' if category == '诗' else 'ci'}-{number}"
    heading = match.group(2).strip()
    title_match = re.search(r'《(.*?)》', heading)
    raw_title = title_match.group(1)
    title = raw_title.split('·')[-1] if raw_title.startswith('诗经') else raw_title
    author = heading[:heading.index('《')].strip() or ('诗经' if raw_title.startswith('诗经') else '未署名')
    subtitle = heading[heading.index('》') + 1:].strip()
    end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
    body = text[match.end():end].strip()
    if index == 161:
        body = re.sub(r'\n词\s*$', '', body)
    # One corrupt ToUnicode mapping, checked against the rasterized original p44.
    body = body.replace('重湖叠ꧼ清嘉', '重湖叠巘清嘉')
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    n_preface = preface_counts.get(poem_id, 0)
    preface = ''.join(lines[:n_preface])
    lines = lines[n_preface:]
    poems.append(dict(id=poem_id, number=number, category=category,
        form='现代诗' if category == '诗' and number in modern else category,
        title=title, fullTitle=raw_title, author=author, subtitle=subtitle,
        sourceHeading=heading, sourcePage=pages[match.start()], printedPage=pages[match.start()]-5,
        lines=lines, preface=preface))

(root/'src/data').mkdir(parents=True, exist_ok=True)
(root/'src/data/poems.json').write_text(json.dumps(poems, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(root/'public').mkdir(exist_ok=True)
if args.pdf.resolve() != (root/'public/curriculum.pdf').resolve():
    shutil.copy2(args.pdf, root/'public/curriculum.pdf')
report = {
    'source': args.pdf.name, 'sha256': hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
    'pdfPages': len(doc), 'total': len(poems), 'shi': 162, 'ci': 38,
    'corrections': [{'id':'ci-9','physicalPage':44,'before':'重湖叠ꧼ清嘉','after':'重湖叠巘清嘉','evidence':'PDF原页图像核对'}],
    'prefacesSeparated': list(preface_counts),
    'verification': '目录数量和连续编号、跨页正文、非中文异常字符已检查；未声称逐字人工校对全部原文。按校方PDF保留用字，网站提供原页核对。'
}
(root/'docs/corpus-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'total':len(poems),'shi':162,'ci':38,'lines':sum(len(p['lines']) for p in poems)}, ensure_ascii=False))
