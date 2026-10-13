"""Synthetic recovery guard tests; no credentials, remote database or assets."""
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('restore', Path(__file__).with_name('restore-turso.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RestoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='aim-restore-test-')
        self.addCleanup(self.temp.cleanup)
        self.parent = Path(self.temp.name).resolve()
        self.backup = self.parent / 'backup'
        self.backup.mkdir()
        db = sqlite3.connect(self.backup / 'database.sqlite')
        db.executescript("""
            CREATE TABLE issues(id INTEGER PRIMARY KEY, title TEXT);
            INSERT INTO issues VALUES(1, 'mother synthetic');
            CREATE VIRTUAL TABLE issue_text_fts USING fts5(text);
            CREATE VIRTUAL TABLE issue_metadata_fts USING fts5(text);
            INSERT INTO issue_text_fts VALUES('mother synthetic');
            INSERT INTO issue_metadata_fts VALUES('mother synthetic');
        """)
        db.close()
        (self.backup / 'capture.json').write_text('{}', encoding='utf-8')
        (self.backup / 'verification.json').write_text(json.dumps({
            'verified': True, 'database_sha256': module.sha(self.backup / 'database.sqlite'),
            'capture_started_utc': '2026-10-13T00:00:00Z', 'capture_completed_utc': '2026-10-13T00:00:01Z'
        }), encoding='utf-8')
        self.manifest = [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': module.sha(p)}
                         for p in self.backup.iterdir()]
        self.write_manifest()

    def write_manifest(self):
        (self.backup / 'manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        self.digest = module.sha(self.backup / 'manifest.json')

    def run_restore(self, name='restored', digest=None):
        return module.restore(self.backup, self.parent / name, digest or self.digest, self.parent)

    def test_round_trip_and_no_overwrite(self):
        report = self.run_restore()
        self.assertTrue(report['verified'])
        self.assertEqual(report['tables']['issues']['rows'], 1)
        self.assertEqual(report['fts_query_counts']['issue_text_fts'], 1)
        original_hash = module.sha(self.parent / 'restored/database.sqlite')
        with self.assertRaises(ValueError):
            self.run_restore()
        self.assertEqual(module.sha(self.parent / 'restored/database.sqlite'), original_hash)

    def test_wrong_trusted_digest(self):
        with self.assertRaises(ValueError):
            self.run_restore(digest='0' * 64)
        self.assertFalse((self.parent / 'restored').exists())

    def test_modified_file(self):
        with (self.backup / 'database.sqlite').open('ab') as output:
            output.write(b'tampered')
        with self.assertRaises(ValueError):
            self.run_restore()
        self.assertFalse((self.parent / 'restored').exists())

    def test_manifest_traversal(self):
        self.manifest[0]['name'] = '../outside'
        self.write_manifest()
        with self.assertRaises(ValueError):
            self.run_restore()

    def test_nonempty_wal(self):
        (self.backup / 'database.sqlite-wal').write_bytes(b'not-checkpointed')
        with self.assertRaises(ValueError):
            self.run_restore()

    def test_destination_escape(self):
        with self.assertRaises(ValueError):
            self.run_restore('../escaped-restore')

    def test_same_counts_different_content(self):
        self.run_restore()
        before = sqlite3.connect(self.backup / 'database.sqlite')
        after = sqlite3.connect(self.parent / 'restored/database.sqlite')
        try:
            after.execute("UPDATE issues SET title='changed'")
            after.commit()
            with self.assertRaises(ValueError):
                module.compare_databases(before, after)
        finally:
            before.close()
            after.close()


if __name__ == '__main__':
    unittest.main()
