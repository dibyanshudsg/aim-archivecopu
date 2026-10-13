"""P1-04/05: verify preserved originals and retain extraction evidence privately."""
import csv
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
from datetime import datetime, timezone, timedelta

ROOT = Path('D:/AIM Project')
PARENT = Path('D:/AIM (Project Directory)')
WORKSPACE = PARENT / 'P1-01_workspace_2026-10-08_103323_IST'
DATABASE = PARENT / 'P1-02_turso_2026-10-08_131813_IST'


def digest(file):
    h = hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def main():
    if ROOT.resolve() != ROOT or PARENT.resolve() != PARENT:
        raise RuntimeError('Unexpected resolved path')
    stamp = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%Y-%m-%d_%H%M%S_IST')
    dest = PARENT / ('P1-04_05_evidence_' + stamp)
    dest.mkdir(exist_ok=False)
    sid = next(csv.reader([subprocess.check_output(['whoami','/user','/fo','csv','/nh'],text=True).strip()]))[1]
    subprocess.run(['icacls',str(dest),'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F',
                    '*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],check=True,capture_output=True)
    saved = {r['path']:r for r in json.loads((WORKSPACE/'manifest.json').read_text())}
    originals=[]
    for name in ['AIM 2026','Agnisikha 2026','Agnishikha 2026','AIM Issues','content']:
        folder=ROOT/name
        if not folder.exists():continue
        for file in sorted(p for p in folder.rglob('*') if p.is_file()):
            rel=file.relative_to(ROOT).as_posix()
            sha=digest(file)
            match=rel in saved and saved[rel]['sha256']==sha and digest(WORKSPACE/'workspace'/rel)==sha
            if not match:raise RuntimeError('Source not preserved: '+rel)
            originals.append({'path':rel,'bytes':file.stat().st_size,'sha256':sha,'workspace_copy_verified':True})
    evidence=[]
    for name in ['.codex-logs/indexing-pilot','.codex-logs/search-rebuild-v2']:
        for file in sorted(p for p in (ROOT/name).rglob('*') if p.is_file()):
            if file.suffix=='.traineddata':continue
            rel=file.relative_to(ROOT)
            sha=digest(file)
            if file.suffix=='.json':json.loads(file.read_text(encoding='utf-8-sig'))
            target=dest/'extraction-evidence'/rel
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(file,target)
            if digest(target)!=sha or digest(file)!=sha:raise RuntimeError('Evidence copy mismatch')
            evidence.append({'path':rel.as_posix(),'bytes':file.stat().st_size,'sha256':sha,
                'kind':'downloaded working PDF' if file.suffix=='.pdf' else 'generated extraction/review evidence'})
    for row in evidence:
        if digest(dest/'extraction-evidence'/row['path'])!=row['sha256']:
            raise RuntimeError('Final evidence verification failed')
    db_manifest=json.loads((DATABASE/'manifest.json').read_text())
    for row in db_manifest:
        if digest(DATABASE/row['name'])!=row['sha256']:raise RuntimeError('Database backup hash mismatch')
    db=sqlite3.connect((DATABASE/'database.sqlite').as_uri()+'?mode=ro',uri=True)
    integrity=db.execute('PRAGMA integrity_check').fetchall()
    fk=db.execute('PRAGMA foreign_key_check').fetchall()
    if integrity!=[('ok',)] or fk:raise RuntimeError('Database backup validation failed')
    refs=db.execute('SELECT id,pdf_url,cover_image_url FROM issues ORDER BY id').fetchall()
    db.close()
    report={'verified_on':datetime.now(timezone.utc).isoformat(),'originals':originals,'evidence':evidence,
            'original_files':len(originals),'original_bytes':sum(r['bytes'] for r in originals),
            'evidence_files':len(evidence),'evidence_bytes':sum(r['bytes'] for r in evidence),
            'backup_integrity':'ok','backup_foreign_key_violations':0,'backup_issue_count':len(refs),
            'database_backup':str(DATABASE),'workspace_backup':str(WORKSPACE),
            'limits':'Local files only; no remote asset bytes copied. Downloaded working PDFs are not certified original submissions or a complete R2 backup. OCR evidence is not editorial approval.'}
    (dest/'preservation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['originals','evidence']}|{'destination':str(dest),'report_sha256':digest(dest/'preservation.json')}),flush=True)


if __name__=='__main__':main()
