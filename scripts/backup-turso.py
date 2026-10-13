"""Create a new private Turso capture, then verify a standalone SQLite backup.

Never overwrites a backup or changes remote application data. Failed captures
remain for diagnosis and are never labelled verified. Windows workspace tool.
"""
import csv
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
from datetime import datetime, timezone, timedelta

ROOT = Path('D:/AIM Project')
PARENT = Path('D:/AIM (Project Directory)')


def sha(file):
    h = hashlib.sha256()
    with file.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def main():
    if PARENT.resolve() != PARENT or ROOT.resolve() != ROOT:
        raise RuntimeError('Unexpected resolved path')
    stamp = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%Y-%m-%d_%H%M%S_IST')
    dest = PARENT / ('P1-02_turso_' + stamp)
    dest.mkdir(exist_ok=False)
    identity = subprocess.check_output(['whoami', '/user', '/fo', 'csv', '/nh'], text=True)
    sid = next(csv.reader([identity.strip()]))[1]
    subprocess.run(['icacls', str(dest), '/inheritance:r', '/grant:r',
                    '*' + sid + ':(OI)(CI)F', '*S-1-5-18:(OI)(CI)F',
                    '*S-1-5-32-544:(OI)(CI)F'], check=True, capture_output=True)
    print(json.dumps({'stage': 'private_directory_created', 'path': str(dest)}), flush=True)
    subprocess.run(['node', str(ROOT / 'scripts/capture-turso-replica.mjs'), str(dest)],
                   cwd=ROOT, check=True)
    capture = json.loads((dest / 'capture.json').read_text(encoding='utf-8'))
    source = sqlite3.connect((dest / 'replica.db').as_uri() + '?mode=ro', uri=True)
    backup = dest / 'database.sqlite'
    with backup.open('xb'):
        pass
    target = sqlite3.connect(backup)
    source.backup(target)
    target.close()
    source.close()
    # Reopen without replication configuration or credentials.
    db = sqlite3.connect(backup.as_uri() + '?mode=ro', uri=True)
    integrity = [row[0] for row in db.execute('PRAGMA integrity_check')]
    foreign_keys = list(db.execute('PRAGMA foreign_key_check'))
    counts = {}
    for name, metadata in capture['tables'].items():
        quoted = '"' + name.replace('"', '""') + '"'
        counts[name] = db.execute('SELECT count(*) FROM ' + quoted).fetchone()[0]
        if counts[name] != metadata['rows']:
            raise RuntimeError('Backup row count mismatch')
    if integrity != ['ok'] or foreign_keys:
        raise RuntimeError('Backup integrity or foreign-key failure')
    # Physical backup must preserve every schema and row, including FTS shadows.
    original = sqlite3.connect((dest / 'replica.db').as_uri() + '?mode=ro', uri=True)
    if list(db.execute('SELECT * FROM sqlite_schema ORDER BY type,name')) != list(original.execute('SELECT * FROM sqlite_schema ORDER BY type,name')):
        raise RuntimeError('Schema comparison failed')
    for name in counts:
        quoted = '"' + name.replace('"', '""') + '"'
        def rows_digest(connection):
            rows = connection.execute('SELECT * FROM ' + quoted)
            return sorted(hashlib.sha256(repr(row).encode('utf-8')).hexdigest() for row in rows)
        if rows_digest(db) != rows_digest(original):
            raise RuntimeError('Backup row-content comparison failed')
    fts = {name: db.execute('SELECT count(*) FROM ' + name + " WHERE " + name + " MATCH 'mother'").fetchone()[0]
           for name in ['issue_text_fts', 'issue_metadata_fts']}
    original.close()
    db.close()
    report = {'task': 'P1-02', 'verified': True, 'destination': str(dest),
              'capture_started_utc': capture['capture_started_utc'],
              'capture_completed_utc': capture['capture_completed_utc'],
              'database_bytes': backup.stat().st_size, 'database_sha256': sha(backup),
              'integrity_check': integrity, 'foreign_key_violations': len(foreign_keys),
              'tables': counts, 'fts_query_counts': fts,
              'verification': 'All remote snapshot schema/table digests match replica; SQLite backup reopened offline, all rows/schema match replica, integrity and FK checks pass.',
              'limits': 'Database only; no PDF/cover bytes. Same drive, not drive-failure protection. Full app restore remains Phase 3. Source is configured remote Turso, not a fresh Vercel env comparison.',
              'access': 'Inheritance disabled on folder; creating user, SYSTEM and Administrators only. Contains private application data, no auth token export.'}
    (dest / 'verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    files = [p for p in dest.iterdir() if p.is_file()]
    manifest = [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(files)]
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    for row in manifest:
        if sha(dest / row['name']) != row['sha256']:
            raise RuntimeError('Final hash verification failed')
    (dest / 'manifest.sha256').write_text(sha(dest / 'manifest.json') + '  manifest.json\n', encoding='ascii')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
