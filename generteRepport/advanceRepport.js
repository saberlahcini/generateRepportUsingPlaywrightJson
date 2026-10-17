import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = process.argv[2] || 'reports/results.json';
const outputDir = process.argv[3] || 'advanced-report';

if (!fs.existsSync(inputFile)) {
  console.error(`JSON report not found: ${inputFile}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

function flattenSuites(suites, parent = {}) {
  const rows = [];

  for (const suite of suites || []) {
    const file = suite.file || parent.file || '';
    const project = suite.projectName || parent.project || '';

    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const last = results[results.length - 1] || {};

        let status = last.status || test.status || 'unknown';

        if (test.status === 'flaky') status = 'flaky';
        if (test.status === 'skipped') status = 'skipped';
        if (test.status === 'unexpected') status = 'failed';
        if (status === 'timedOut') status = 'failed';
        if (status === 'interrupted') status = 'failed';

        rows.push({
          title: spec.title || '(untitled)',
          fullTitle: [suite.title, spec.title].filter(Boolean).join(' › '),
          file,
          project: test.projectName || project || 'default',
          status,
          expectedStatus: test.expectedStatus || '',
          duration: last.duration || 0,
          retry: last.retry || 0,
          error: last.error ? (last.error.message || last.error.stack || '') : '',
          stack: last.error ? (last.error.stack || last.error.message || '') : '',
          startTime: last.startTime || '',
          attachments: last.attachments || [],
        });
      }
    }

    rows.push(...flattenSuites(suite.suites, { file, project }));
  }

  return rows;
}

const tests = flattenSuites(raw.suites);

const stats = {
  total: tests.length,
  passed: tests.filter(t => t.status === 'passed').length,
  failed: tests.filter(t => t.status === 'failed').length,
  flaky: tests.filter(t => t.status === 'flaky').length,
  skipped: tests.filter(t => t.status === 'skipped').length,
  duration: tests.reduce((sum, t) => sum + (t.duration || 0), 0),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const testsJson = JSON.stringify(tests).replace(/</g, '\\u003c');
const statsJson = JSON.stringify(stats).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Playwright Advanced Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --green: #22c55e;
      --red: #ef4444;
      --yellow: #eab308;
      --blue: #3b82f6;
      --gray: #64748b;
      --border: #334155;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; }
    .sub { color: var(--muted); margin-bottom: 24px; }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      background: var(--card);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--border);
    }

    .card .label { color: var(--muted); font-size: 13px; }
    .card .value { font-size: 28px; font-weight: 700; margin-top: 6px; }

    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    @media (max-width: 900px) { .charts { grid-template-columns: 1fr; } }

    .chart-box {
      background: var(--card);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--border);
    }

    .chart-box h2 { margin: 0 0 12px; font-size: 16px; }

    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }

    input, select {
      background: #0f172a;
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      padding: 10px 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    th { color: var(--muted); font-size: 13px; text-transform: uppercase; }
    tr:hover { background: #243247; }

    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .status.passed { background: rgba(34,197,94,.15); color: var(--green); }
    .status.failed { background: rgba(239,68,68,.15); color: var(--red); }
    .status.flaky { background: rgba(234,179,8,.15); color: var(--yellow); }
    .status.skipped { background: rgba(100,116,139,.2); color: #cbd5e1; }

    .error {
      color: #fca5a5;
      font-size: 12px;
      white-space: pre-wrap;
      max-width: 500px;
    }

    details summary { cursor: pointer; color: #93c5fd; }
    .small { color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Playwright Advanced Report</h1>
    <div class="sub">Generated from ${escapeHtml(inputFile)}</div>

    <div class="cards">
      <div class="card"><div class="label">Total</div><div class="value">${stats.total}</div></div>
      <div class="card"><div class="label">Passed</div><div class="value" style="color:var(--green)">${stats.passed}</div></div>
      <div class="card"><div class="label">Failed</div><div class="value" style="color:var(--red)">${stats.failed}</div></div>
      <div class="card"><div class="label">Flaky</div><div class="value" style="color:var(--yellow)">${stats.flaky}</div></div>
      <div class="card"><div class="label">Skipped</div><div class="value" style="color:var(--gray)">${stats.skipped}</div></div>
      <div class="card"><div class="label">Duration</div><div class="value">${(stats.duration / 1000).toFixed(2)}s</div></div>
    </div>

    <div class="charts">
      <div class="chart-box">
        <h2>Status Distribution</h2>
        <canvas id="statusChart"></canvas>
      </div>
      <div class="chart-box">
        <h2>Slowest 10 Tests</h2>
        <canvas id="durationChart"></canvas>
      </div>
    </div>

    <div class="filters">
      <input id="search" placeholder="Search test, file, error..." style="min-width:260px" />
      <select id="statusFilter">
        <option value="all">All statuses</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="flaky">Flaky</option>
        <option value="skipped">Skipped</option>
      </select>
      <select id="projectFilter"><option value="all">All projects</option></select>
      <select id="fileFilter"><option value="all">All files</option></select>
    </div>

    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>File</th>
          <th>Project</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Retry</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>

  <script>
    const tests = ${testsJson};
    const stats = ${statsJson};

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const statusColors = {
      passed: '#22c55e',
      failed: '#ef4444',
      flaky: '#eab308',
      skipped: '#64748b'
    };

    new Chart(document.getElementById('statusChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Flaky', 'Skipped'],
        datasets: [{
          data: [stats.passed, stats.failed, stats.flaky, stats.skipped],
          backgroundColor: [
            statusColors.passed,
            statusColors.failed,
            statusColors.flaky,
            statusColors.skipped
          ],
          borderWidth: 0
        }]
      },
      options: { plugins: { legend: { labels: { color: '#e2e8f0' } } } }
    });

    const slowest = [...tests].sort((a, b) => b.duration - a.duration).slice(0, 10);

    new Chart(document.getElementById('durationChart'), {
      type: 'bar',
      data: {
        labels: slowest.map(t => t.title.length > 40 ? t.title.slice(0, 40) + '…' : t.title),
        datasets: [{
          label: 'Duration (ms)',
          data: slowest.map(t => t.duration),
          backgroundColor: '#3b82f6'
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#e2e8f0' }, grid: { color: '#334155' } }
        }
      }
    });

    const tbody = document.getElementById('tbody');
    const projectFilter = document.getElementById('projectFilter');
    const fileFilter = document.getElementById('fileFilter');

    const projects = [...new Set(tests.map(t => t.project).filter(Boolean))];
    const files = [...new Set(tests.map(t => t.file).filter(Boolean))];

    projects.forEach(p => {
      projectFilter.innerHTML += '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + '</option>';
    });

    files.forEach(f => {
      fileFilter.innerHTML += '<option value="' + escapeHtml(f) + '">' + escapeHtml(f) + '</option>';
    });

    function render() {
      const search = document.getElementById('search').value.toLowerCase();
      const statusFilter = document.getElementById('statusFilter').value;
      const project = projectFilter.value;
      const file = fileFilter.value;

      const filtered = tests.filter(t => {
        const haystack = (t.title + ' ' + t.fullTitle + ' ' + t.file + ' ' + t.error).toLowerCase();
        const matchSearch = !search || haystack.includes(search);
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchProject = project === 'all' || t.project === project;
        const matchFile = file === 'all' || t.file === file;
        return matchSearch && matchStatus && matchProject && matchFile;
      });

      tbody.innerHTML = filtered.map(t => \`
        <tr>
          <td>
            \${escapeHtml(t.title)}
            <div class="small">\${escapeHtml(t.fullTitle)}</div>
          </td>
          <td>\${escapeHtml(t.file)}</td>
          <td>\${escapeHtml(t.project)}</td>
          <td><span class="status \${t.status}">\${escapeHtml(t.status)}</span></td>
          <td>\${t.duration} ms</td>
          <td>\${t.retry}</td>
          <td>
            \${t.error
              ? '<details><summary>Show error</summary><div class="error">' + escapeHtml(t.stack || t.error) + '</div></details>'
              : '<span class="small">—</span>'}
          </td>
        </tr>
      \`).join('');
    }

    ['search', 'statusFilter', 'projectFilter', 'fileFilter'].forEach(id => {
      document.getElementById(id).addEventListener('input', render);
    });

    render();
  </script>
</body>
</html>`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');

console.log(`✅ Advanced report generated: ${path.join(outputDir, 'index.html')}`);