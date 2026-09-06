"""Dependency-free queue probe and manual-run status for GitHub Actions."""
import json
import os
import sys
import time
import urllib.request


def execute(sql, args=()):
    url = os.environ['TURSO_DATABASE_URL'].replace('libsql://', 'https://').rstrip('/')
    values = [{'type': 'integer', 'value': str(v)} if isinstance(v, int)
              else {'type': 'text', 'value': str(v)} for v in args]
    request = urllib.request.Request(url + '/v2/pipeline', data=json.dumps({
        'requests': [{'type': 'execute', 'stmt': {'sql': sql, 'args': values}}, {'type': 'close'}]
    }).encode(), headers={'Authorization': 'Bearer ' + os.environ['TURSO_AUTH_TOKEN'],
                         'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)['results'][0]
    if result['type'] != 'ok':
        raise RuntimeError('Database operation failed; check the indexing migrations.')
    return result['response']['result']


def main():
    command = sys.argv[1]
    if command == 'verify':
        result = execute('SELECT (SELECT COUNT(*) FROM issues), (SELECT COUNT(*) FROM issue_search_index)')
        row = result['rows'][0]
        print('Database access verified: ' + row[0]['value'] + ' issues, ' + row[1]['value'] + ' indexed pages. No rows changed.')
        return
    now = int(time.time() * 1000)
    run_url = 'https://github.com/' + os.environ['GITHUB_REPOSITORY'] + '/actions/runs/' + os.environ['GITHUB_RUN_ID']
    if command == 'check':
        request_id = os.environ.get('INDEXING_REQUEST_ID', '')
        if request_id:
            admitted = execute("UPDATE indexing_dispatches SET status='running',run_id=?,checked_at=?,message='Indexing worker started.' WHERE id=? AND active=1", [os.environ['GITHUB_RUN_ID'], now, request_id])
            if int(admitted.get('affected_row_count', 0)) == 0:
                with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf8') as output:
                    output.write('pending=false\n')
                print('This Admin request was released. No indexing work started.')
                return
        result = execute("SELECT COUNT(*) FROM indexing_jobs WHERE (status='queued' AND available_at<=?) OR (status='processing' AND lease_until<?)", [now, now])
        pending = int(result['rows'][0][0]['value']) > 0
        execute("INSERT INTO indexing_schedule VALUES('github-actions',?,?,?) ON CONFLICT(id) DO UPDATE SET last_checked_at=excluded.last_checked_at,last_result=excluded.last_result,run_url=excluded.run_url", [now, 'pending' if pending else 'idle', run_url])
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf8') as output:
            output.write('pending=' + str(pending).lower() + '\n')
        print('Queued work found.' if pending else 'No queued work. Skipping dependency installation and OCR.')
    elif command in ('success', 'failure', 'cancelled'):
        # Do not overwrite a newer run's record with a delayed completion.
        execute("UPDATE indexing_schedule SET last_result=? WHERE id='github-actions' AND run_url=?", [command, run_url])
        request_id = os.environ.get('INDEXING_REQUEST_ID', '')
        if request_id:
            execute("UPDATE indexing_dispatches SET status=?,active=NULL,checked_at=?,message=? WHERE id=? AND active=1", ['complete' if command == 'success' else 'failed', now, 'Run finished. Check the queue for remaining issues.' if command == 'success' else 'The run stopped. Saved pages and queued work are retained.', request_id])
    else:
        raise ValueError('Unsupported schedule command')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Indexing run status failed. Check database access and migration 00005.', file=sys.stderr)
        sys.exit(1)
