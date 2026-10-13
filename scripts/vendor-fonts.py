"""Maintainer-only font acquisition. Normal installs/builds use committed WOFF2 files.

Requires fonttools[woff]==4.54.1. Full fonts are losslessly WOFF2-compressed;
no glyphs, names or outlines are changed. Sources are pinned, never fetched at build time.
"""
import hashlib
import io
import json
from pathlib import Path
import urllib.parse
import urllib.request

from fontTools.ttLib import TTFont

COMMIT = 'bd8f81ddb5c74d5c8897b36ad88b440266245103'
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'apps/web/src/app/fonts'
FAMILIES = {
    'inter': ['Inter[opsz,wght].ttf'],
    'aboreto': ['Aboreto-Regular.ttf'],
    'tirodevanagarihindi': ['TiroDevanagariHindi-Regular.ttf'],
    'tangerine': ['Tangerine-Regular.ttf', 'Tangerine-Bold.ttf'],
}


def fetch(relative):
    url = f'https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/{urllib.parse.quote(relative)}'
    with urllib.request.urlopen(url, timeout=60) as response:
        return url, response.read()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    if (DEST / 'manifest.json').exists():
        raise SystemExit('Font manifest already exists; review an update before replacing vendored assets.')
    entries = []
    for family, sources in FAMILIES.items():
        url, license_bytes = fetch(f'{family}/OFL.txt')
        license_name = f'{family}-OFL.txt'
        (DEST / license_name).write_bytes(license_bytes)
        entries.append(dict(file=license_name, source=url, sha256=hashlib.sha256(license_bytes).hexdigest()))
        for source in sources:
            url, original = fetch(f'{family}/{source}')
            font = TTFont(io.BytesIO(original), recalcTimestamp=False)
            font.flavor = 'woff2'
            target = source.replace('[opsz,wght]', '-variable').replace('.ttf', '.woff2')
            font.save(DEST / target)
            content = (DEST / target).read_bytes()
            entries.append(dict(file=target, source=url, sourceSha256=hashlib.sha256(original).hexdigest(),
                                sha256=hashlib.sha256(content).hexdigest(), bytes=len(content)))
    (DEST / 'manifest.json').write_text(json.dumps(dict(commit=COMMIT, conversion='fonttools 4.54.1 WOFF2; full fonts', files=entries), indent=2) + '\n', encoding='utf8')
    print(json.dumps(dict(files=len(entries), fontBytes=sum(e.get('bytes', 0) for e in entries))))


if __name__ == '__main__':
    main()
