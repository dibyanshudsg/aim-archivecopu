import contextlib
import importlib.util
import io
import os
import pathlib
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('schedule', pathlib.Path(__file__).with_name('indexing-schedule.py'))
schedule = importlib.util.module_from_spec(spec)
spec.loader.exec_module(schedule)


class ScheduleTest(unittest.TestCase):
    def check_queue(self, count):
        calls = []
        def execute(sql, args=()):
            calls.append((sql, args))
            return {'rows': [[{'value': str(count)}]]}
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / 'output'
            with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'test/archive', 'GITHUB_RUN_ID': '123', 'GITHUB_OUTPUT': str(output)}), patch.object(schedule, 'execute', execute), patch.object(schedule.sys, 'argv', ['schedule', 'check']), contextlib.redirect_stdout(io.StringIO()):
                schedule.main()
            self.assertEqual(output.read_text().strip(), 'pending=' + str(count > 0).lower())
        self.assertIn('lease_until', calls[0][0])
        self.assertEqual(calls[1][1][1], 'pending' if count else 'idle')
        self.assertFalse(any('DELETE' in sql or 'UPDATE indexing_jobs' in sql for sql, _ in calls))

    def test_idle_skips_install(self):
        self.check_queue(0)

    def test_queued_or_expired_work_starts_worker(self):
        self.check_queue(2)


if __name__ == '__main__':
    unittest.main()
