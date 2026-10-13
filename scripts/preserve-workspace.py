"""Create a new P1-01 recovery copy; never overwrite or delete a backup.

Copies private configuration. Output must stay private. This does not back up
remote Turso/R2 or certify local database consistency.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from datetime import datetime, timezone, timedelta

SOURCE = Path('D:/AIM Project')
PARENT = Path('D:/AIM (Project Directory)')
SKIP_DIRS = {'node_modules', '.pnpm-store', '.next', '.next-verify',
             '.next-performance', '.turbo', 'dist', 'build', 'coverage',
             '__pycache__', '.expo'}
SKIP_ROOT = {'.cache', '.codex-logs', '.lighthouse', '.playwright-cli'}


def git(*args):
    return subprocess.check_output(
        ['git', '-c', 'safe.directory=D:/AIM Project', *args],
        cwd=SOURCE, stderr=subprocess.PIPE).decode('utf-8')


def digest(file):
    h = hashlib.sha256()
    with file.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def inventory():
    files, excluded = [], []
    for current, dirs, names in os.walk(SOURCE, followlinks=False):
        relative = Path(current).relative_to(SOURCE)
        for name in list(dirs):
            item = Path(current) / name
            rel = item.relative_to(SOURCE)
            if (name in SKIP_DIRS or (relative == Path('.') and name in SKIP_ROOT)):
                excluded.append({'path': rel.as_posix(), 'reason': 'generated/cache/private runtime evidence; see scope'})
                dirs.remove(name)
            elif item.is_symlink() or bool(item.stat().st_file_attributes & 0x400):
                raise RuntimeError('Unexpected directory reparse point: ' + rel.as_posix())
        for name in names:
            item = Path(current) / name
            rel = item.relative_to(SOURCE)
            if name.endswith('.tsbuildinfo'):
                excluded.append({'path': rel.as_posix(), 'reason': 'regenerable compiler cache'})
            elif item.is_symlink():
                raise RuntimeError('Unexpected file symlink: ' + rel.as_posix())
            else:
                files.append(rel.as_posix())
    return sorted(files), excluded


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--remote-main', required=True)
    args = parser.parse_args()
    if len(args.remote_main) != 40 or any(c not in '0123456789abcdef' for c in args.remote_main):
        raise ValueError('Expected verified remote commit hash')
    if SOURCE.resolve() != SOURCE or PARENT.resolve() != PARENT:
        raise RuntimeError('Source or parent resolves through an unexpected link')
    if PARENT == SOURCE or SOURCE in PARENT.parents:
        raise RuntimeError('Backup must be outside source')
    files, exclusions = inventory()
    tracked = set(git('ls-files', '-z').split('\0')) - {''}
    omitted_tracked = sorted(p for p in tracked if (SOURCE / p).exists() and p not in files)
    if omitted_tracked:
        raise RuntimeError('Exclusions would omit existing tracked files: ' + repr(omitted_tracked))
    required_bytes = sum((SOURCE / rel).stat().st_size for rel in files)
    if shutil.disk_usage(PARENT).free < required_bytes + 100 * 1024 * 1024:
        raise RuntimeError('Insufficient free space for copy and verification metadata')
    before = git('status', '--porcelain=v1', '--untracked-files=all')
    head = git('rev-parse', 'HEAD').strip()
    stamp = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%Y-%m-%d_%H%M%S_IST')
    destination = PARENT / ('P1-01_workspace_' + stamp)
    destination.mkdir(exist_ok=False)
    identity = subprocess.check_output(['whoami', '/user', '/fo', 'csv', '/nh'], text=True)
    import csv
    account_sid = next(csv.reader([identity.strip()]))[1]
    subprocess.run(['icacls', str(destination), '/inheritance:r', '/grant:r',
                    '*' + account_sid + ':(OI)(CI)F',
                    '*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F'],
                   check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    payload = destination / 'workspace'
    payload.mkdir()
    manifest = []
    for i, rel in enumerate(files, 1):
        src, dst = SOURCE / rel, payload / rel
        original = digest(src)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        if digest(dst) != original or digest(src) != original:
            raise RuntimeError('Changed or mismatched file: ' + rel)
        manifest.append({'path': rel, 'bytes': dst.stat().st_size, 'sha256': original})
        if i % 250 == 0:
            print(json.dumps({'copied': i, 'total': len(files)}), flush=True)
    if inventory()[0] != files or git('status', '--porcelain=v1', '--untracked-files=all') != before:
        raise RuntimeError('Source inventory or Git status changed during backup')
    # Second independent pass catches source changes after a particular file was copied.
    for row in manifest:
        if digest(SOURCE / row['path']) != row['sha256'] or digest(payload / row['path']) != row['sha256']:
            raise RuntimeError('Final verification failed: ' + row['path'])
    if git('rev-parse', 'HEAD').strip() != head:
        raise RuntimeError('Git HEAD changed during backup')
    report = {
        'task': 'P1-01', 'verified': True, 'created_at_ist': stamp,
        'source': str(SOURCE), 'destination': str(destination),
        'local_head': head, 'remote_main_observed': args.remote_main,
        'documented_deployment': 'dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x',
        'deployment_evidence': 'PRODUCTION_RELEASE_2026-09-19.md; not a fresh Vercel inspection',
        'files': len(manifest), 'bytes': sum(row['bytes'] for row in manifest),
        'scope': 'Working source/config/docs, Git history, included local media, root/web OCR data and historical backups. Private config included. Dependencies, build caches, private runtime/browser logs excluded. No remote DB/object backup.',
        'limits': 'Same drive; not drive-failure protection. No encryption added. Local database files are not certified live database snapshots.',
        'access_control': 'Backup folder inheritance disabled; full control only for creating user SID, SYSTEM and Administrators, inherited by copied children.',
        'verification': 'SHA-256 source/copy/source per file plus final source/destination rehash; source inventory, Git status and HEAD stable',
    }
    for name, value in [('manifest.json', manifest), ('exclusions.json', exclusions), ('verification.json', report)]:
        (destination / name).write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    (destination / 'git-status.txt').write_text(before, encoding='utf-8')
    (destination / 'manifest.sha256').write_text(digest(destination / 'manifest.json') + '  manifest.json\n', encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
