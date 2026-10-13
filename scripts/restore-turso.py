"""Offline, private, non-overwriting restore of a verified Turso snapshot.

No environment loading, network client, application server or worker is used.
The manifest digest must come from a separately retained trusted record.
"""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import time
from datetime import datetime, timezone

PRIVATE_PARENT = Path('D:/AIM (Project Directory)')


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def verify_snapshot(folder, expected_manifest):
    manifest = folder / 'manifest.json'
    if sha(manifest) != expected_manifest.lower():
        raise ValueError('Manifest does not match the trusted digest')
    entries = json.loads(manifest.read_text(encoding='utf-8'))
    names = set()
    for entry in entries:
        name = entry['name']
        if not name or Path(name).name != name or '/' in name or '\\' in name or ':' in name or name in names:
            raise ValueError('Unsafe or duplicate manifest entry')
        names.add(name)
        file = folder / name
        if file.is_symlink() or file.resolve().parent != folder or not file.is_file():
            raise ValueError('Manifest file is missing or escapes the backup')
        if file.stat().st_size != entry['bytes'] or sha(file) != entry['sha256']:
            raise ValueError('Backup file failed integrity verification')
    if not {'database.sqlite', 'capture.json', 'verification.json'} <= names:
        raise ValueError('Required snapshot evidence is absent')
    wal = folder / 'database.sqlite-wal'
    if wal.exists() and wal.stat().st_size:
        raise ValueError('Standalone backup has a nonempty WAL; do not ignore it')
    verification = json.loads((folder / 'verification.json').read_text(encoding='utf-8'))
    if verification.get('verified') is not True or verification['database_sha256'] != sha(folder / 'database.sqlite'):
        raise ValueError('Snapshot was not successfully verified')
    return verification


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def inventory(db):
    schema = list(db.execute('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name'))
    tables = {}
    for kind, name, _, _ in schema:
        if kind != 'table':
            continue
        hashes = sorted(hashlib.sha256(repr(row).encode('utf-8')).hexdigest()
                        for row in db.execute('SELECT * FROM ' + quote(name)))
        tables[name] = {'rows': len(hashes), 'sha256': hashlib.sha256('\n'.join(hashes).encode()).hexdigest()}
    return {'schema_sha256': hashlib.sha256(repr(schema).encode()).hexdigest(), 'tables': tables}


def compare_databases(source, restored):
    before, after = inventory(source), inventory(restored)
    if before != after:
        raise ValueError('Restored schema or table contents differ')
    if list(restored.execute('PRAGMA integrity_check')) != [('ok',)]:
        raise ValueError('Restored database integrity check failed')
    if list(restored.execute('PRAGMA foreign_key_check')):
        raise ValueError('Restored database foreign key check failed')
    fts = {}
    for name in ['issue_text_fts', 'issue_metadata_fts']:
        sql = 'SELECT count(*) FROM ' + quote(name) + ' WHERE ' + quote(name) + " MATCH 'mother'"
        count = restored.execute(sql).fetchone()[0]
        if count != source.execute(sql).fetchone()[0]:
            raise ValueError('Restored FTS query differs')
        # rank=1 also checks an external-content FTS index against its content.
        restored.execute('INSERT INTO ' + quote(name) + '(' + quote(name) + ", rank) VALUES ('integrity-check', 1)")
        restored.rollback()
        fts[name] = count
    return after, fts


def protect(folder):
    if os.name == 'nt':
        identity = subprocess.check_output(['whoami', '/user', '/fo', 'csv', '/nh'], text=True)
        sid = next(csv.reader([identity.strip()]))[1]
        subprocess.run(['icacls', str(folder), '/inheritance:r', '/grant:r',
                        '*' + sid + ':(OI)(CI)F', '*S-1-5-18:(OI)(CI)F',
                        '*S-1-5-32-544:(OI)(CI)F'], check=True, capture_output=True)
    else:
        folder.chmod(0o700)


def restore(backup, destination, manifest_sha256, private_parent=PRIVATE_PARENT):
    started = time.monotonic()
    backup = backup.resolve(strict=True)
    parent = private_parent.resolve(strict=True)
    destination = destination.absolute()
    # Direct child only: no existing folder, symlink, parent traversal or reuse.
    if destination.parent.resolve() != parent or destination.exists() or destination.is_symlink():
        raise ValueError('Destination must be a new direct child of the private recovery parent')
    if destination.resolve() == backup or backup.is_relative_to(destination.resolve()):
        raise ValueError('Destination overlaps the source backup')
    verified = verify_snapshot(backup, manifest_sha256)
    destination.mkdir(mode=0o700, exist_ok=False)
    protect(destination)
    target = destination / 'database.sqlite'
    original = backup / 'database.sqlite'
    with original.open('rb') as source_file, target.open('xb') as target_file:
        shutil.copyfileobj(source_file, target_file)
    if sha(target) != verified['database_sha256']:
        raise ValueError('Restored file hash differs')
    source = sqlite3.connect(original.as_uri() + '?mode=ro&immutable=1', uri=True)
    restored = sqlite3.connect(target)
    try:
        contents, fts = compare_databases(source, restored)
    finally:
        source.close()
        restored.close()
    if sha(target) != verified['database_sha256']:
        raise ValueError('Verification changed the restored database')
    verify_snapshot(backup, manifest_sha256)
    report = {
        'verified': True, 'verified_utc': datetime.now(timezone.utc).isoformat(),
        'scope': 'Offline database restore only; no app, R2 or hosted acceptance',
        'source_capture_started_utc': verified['capture_started_utc'],
        'source_capture_completed_utc': verified['capture_completed_utc'],
        'source_manifest_sha256': manifest_sha256, 'database_sha256': sha(target),
        'elapsed_seconds': round(time.monotonic() - started, 3),
        'python_sqlite_version': sqlite3.sqlite_version,
        'integrity_check': 'ok', 'foreign_key_violations': 0,
        'fts_query_counts': fts, **contents,
        'limits': 'Same drive; live asset references retained. Do not start app/worker with production credentials. No RTO/RPO agreed.'
    }
    with (destination / 'restore-verification.json').open('x', encoding='utf-8') as output:
        json.dump(report, output, indent=2)
        output.write('\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--manifest-sha256', required=True)
    args = parser.parse_args()
    try:
        report = restore(args.backup, args.destination, args.manifest_sha256)
        print(json.dumps({key: report[key] for key in ['verified', 'scope', 'elapsed_seconds', 'integrity_check', 'foreign_key_violations']}))
    except Exception as error:
        # Never print database rows, environment values or raw provider errors.
        print(json.dumps({'verified': False, 'error_type': type(error).__name__,
                          'action': 'Retain failed target privately; inspect inputs and retry in a new directory. No success report issued.'}))
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
