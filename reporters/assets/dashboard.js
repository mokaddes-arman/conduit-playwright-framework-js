(function () {
  const data = window.__DASHBOARD__ || { tests: [], totals: {}, clusters: [], history: [] };
  const app = document.getElementById('app');

  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const f = (n) => (n == null ? 0 : n);
  const pct = (n) => (n * 100).toFixed(1) + '%';
  const shortTitle = (t) => (t.length > 46 ? t.slice(0, 45) + '…' : t);

  const fmtMs = (ms) => {
    if (ms == null) return '—';
    if (ms < 1000) return Math.round(ms) + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    const m = Math.floor(ms / 60000);
    return m + 'm ' + Math.round((ms - m * 60000) / 1000) + 's';
  };
  const fmtTime = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };
  const fmtDay = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };
  const fmtClock = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  const barClass = (r) => (r >= 0.9 ? 'pass' : r >= 0.7 ? 'flaky' : 'fail');

  const ICONS = {
    overview: '<path d="M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
    tests: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    failures: '<circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
    breakdown: '<path d="M3 3v18h18"/><path d="M7 15l4-6 4 4 4-7"/>',
    slowest: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    api: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/>',
    timeline: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    theme: '<path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6L4.5 4.5M19.5 19.5L18 18M6 18l-1.5 1.5M19.5 4.5L18 6"/><circle cx="12" cy="12" r="4"/>',
  };
  const ico = (name, cls) =>
    `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // ---- derived data ---------------------------------------------------------
  const failed = data.tests.filter((t) => t.status === 'failed');
  const flaky = data.tests.filter((t) => t.status === 'flaky');
  const attention = [...failed, ...flaky];

  const specGroups = (() => {
    const m = new Map();
    for (const t of data.tests) {
      if (!m.has(t.file)) m.set(t.file, { file: t.file, total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 });
      const g = m.get(t.file);
      g.total++;
      g[t.status] = (g[t.status] || 0) + 1;
    }
    return [...m.values()]
      .map((g) => ({ ...g, rate: (g.passed + g.flaky) / (g.passed + g.failed + g.flaky || 1) }))
      .sort((a, b) => a.rate - b.rate || a.file.localeCompare(b.file));
  })();

  const envGroups = (() => {
    const m = new Map();
    for (const t of data.tests) {
      if (!m.has(t.project)) m.set(t.project, { name: t.project, total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, duration: 0 });
      const g = m.get(t.project);
      g.total++;
      g[t.status] = (g[t.status] || 0) + 1;
      g.duration += t.duration || 0;
    }
    return [...m.values()].map((g) => ({ ...g, rate: (g.passed + g.flaky) / (g.passed + g.failed + g.flaky || 1) }));
  })();

  const workerGroups = (() => {
    const m = new Map();
    for (const t of data.tests) {
      const w = t.workerIndex == null ? 0 : t.workerIndex;
      if (!m.has(w)) m.set(w, { index: w, total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, duration: 0, tests: [] });
      const g = m.get(w);
      g.total++;
      g[t.status] = (g[t.status] || 0) + 1;
      g.duration += t.duration || 0;
      g.tests.push(t);
    }
    return [...m.values()].sort((a, b) => a.index - b.index);
  })();

  const apiTests = data.tests.filter((t) => t.endpoint);
  const reportHref = '../playwright-report/index.html';
  const history = Array.isArray(data.history) ? data.history : [];

  // ---- shell -----------------------------------------------------------------
  const NAV = [
    { id: 'overview', label: 'Overview' },
    { id: 'tests', label: 'Tests', count: () => data.tests.length },
    { id: 'failures', label: 'Failures', count: () => attention.length },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'slowest', label: 'Slowest' },
    { id: 'api', label: 'API', count: () => apiTests.length },
    { id: 'timeline', label: 'Timeline' },
  ];

  let active = 'overview';
  let filter = '';

  const navHtml = () =>
    NAV.map(
      (n) =>
        `<button class="nav-pill ${n.id === active ? 'active' : ''}" data-tab="${n.id}">${n.label}${
          n.count ? `<span class="count">${n.count()}</span>` : ''
        }</button>`
    ).join('');

  const hexLogo = () =>
    `<svg class="hex" viewBox="0 0 48 48" aria-hidden="true">
      <defs><linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#22d3ee"/>
      </linearGradient></defs>
      <path d="M24 2l19 11v22L24 46 5 35V13z" fill="none" stroke="url(#brandGrad)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M16 24l6 6 12-13" fill="none" stroke="url(#brandGrad)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const footerHtml = () => `
    <footer class="footer">
      <span>Generated by Conduit QA reporter</span>
      <span class="center">${esc(fmtTime(data.generatedAt || data.runDate))}</span>
      <span>Playwright ${esc(data.playwrightVersion || 'n/a')}</span>
    </footer>`;

  // ---- overview (bento) ------------------------------------------------------
  function ringCard() {
    const passed = f(data.totals.passed) + f(data.totals.flaky);
    const fl = f(data.totals.flaky);
    const fail = f(data.totals.failed);
    const total = f(data.totals.total);
    const denom = passed + fail || 1;
    const R = 54;
    const C = 2 * Math.PI * R;
    const segs = [
      { cls: 'seg-pass', n: passed - fl },
      { cls: 'seg-flaky', n: fl },
      { cls: 'seg-fail', n: fail },
    ];
    let off = 0;
    const arcs = segs
      .map((s) => {
        const len = (s.n / denom) * C;
        const a = `<circle class="${s.cls}" r="${R}" cx="66" cy="66" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"></circle>`;
        off += len;
        return a;
      })
      .join('');

    const prev = data.previousPassRate;
    let trend = '';
    if (prev != null) {
      const d = (data.passRate - prev) * 100;
      const up = d >= 0;
      trend = `<div class="card-sub ${up ? 'trend-up' : 'trend-down'}">${up ? '+' : '−'}${Math.abs(d).toFixed(1)} pts vs previous run</div>`;
    }

    return `<div class="card row-span-2 ring-wrap">
      <div style="align-self:flex-start"><span class="card-label">Pass rate</span></div>
      <div class="ring">
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="Pass rate ${pct(data.passRate)}">
          <circle class="track" r="${R}" cx="66" cy="66"></circle>
          <circle class="inner" r="${R - 16}" cx="66" cy="66"></circle>
          ${arcs}
        </svg>
        <div class="ring-center"><b>${(data.passRate * 100).toFixed(0)}%</b></div>
      </div>
      <div style="text-align:center">
        <div class="card-sub">${passed} passed / ${total} total</div>
        ${trend}
      </div>
    </div>`;
  }

  function trendCard() {
    const last = history.slice(-8);
    if (last.length < 2) {
      return `<div class="card col-span-2">
        <div class="trend-head"><span class="card-label">Pass rate trend</span></div>
        <div class="trend-empty">Trend appears after 2 runs</div>
      </div>`;
    }
    const rates = last.map((h) => h.passRate);
    const first = rates[0];
    const lastRate = rates[rates.length - 1];
    const eps = 0.005;
    const dir = lastRate - first > eps ? 'up' : first - lastRate > eps ? 'down' : 'steady';
    const label = `<span class="trend-${dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'muted'}">trending ${dir}</span>`;

    const W = 520;
    const H = 150;
    const pad = 16;
    const min = Math.min(...rates, 0.9);
    const max = Math.max(...rates, 1);
    const span = Math.max(0.02, max - min);
    const x = (i) => pad + (i * (W - pad * 2)) / (last.length - 1);
    const y = (r) => H - pad - ((r - min) / span) * (H - pad * 2);
    const line = rates.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(' ');
    const area = `${pad},${H - pad} ${line} ${(W - pad).toFixed(1)},${H - pad}`;
    const dots = rates
      .map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r).toFixed(1)}" r="3" fill="#22d3ee"/>`)
      .join('');

    return `<div class="card col-span-2">
      <div class="trend-head"><span class="card-label">Pass rate trend</span>${label}</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Pass rate across the last ${last.length} runs">
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8b7bff" stop-opacity="0.5"/><stop offset="1" stop-color="#8b7bff" stop-opacity="0"/>
        </linearGradient></defs>
        <polygon points="${area}" fill="url(#areaGrad)"/>
        <polyline points="${line}" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
      </svg>
      <div class="card-sub" style="margin-top:6px">${esc(fmtDay(last[0].date))} → ${esc(fmtDay(last[last.length - 1].date))}</div>
    </div>`;
  }

  function durationCard() {
    return `<div class="card">
      <span class="card-label">Duration</span>
      <div class="big-num">${fmtMs(data.durationMs)}</div>
      <div class="card-sub">${f(data.workers)} worker${f(data.workers) === 1 ? '' : 's'} · ${f(data.suites)} suite${f(data.suites) === 1 ? '' : 's'}</div>
    </div>`;
  }

  function statCard(label, value, sub, cls) {
    return `<div class="card stat">
      <span class="card-label">${label}</span>
      <div class="big-num ${cls}">${value}</div>
      <div class="card-sub">${sub}</div>
    </div>`;
  }

  function environmentCard() {
    const projects = (data.projects || []).filter((p) => p !== 'setup');
    return `<div class="card col-span-2">
      <span class="card-label">Environment</span>
      <div class="big-num v-total" style="font-size:32px">${esc(data.env || 'local')}</div>
      <div class="card-sub">${projects.length ? projects.map(esc).join(' · ') : 'no browser projects'}</div>
    </div>`;
  }

  function needsAttention() {
    const empty = '<div class="empty">Nothing needs attention</div>';
    const rows = attention.length
      ? attention
          .slice(0, 6)
          .map(
            (t) => `<button class="row-item clickable ${t.status}" data-tab="tests" data-search="${esc(t.title)}">
          <span class="pill ${t.status}">${t.status}</span>
          <span class="row-main">
            <span class="row-title">${esc(shortTitle(t.title))}</span>
            <span class="row-meta">${esc(t.file)} · ${esc(t.project)}${t.error?.message ? ' · ' + esc(t.error.message) : ''}</span>
          </span>
        </button>`
          )
          .join('')
      : empty;
    return `<div class="card col-span-2">
      <span class="card-label">Needs attention</span>
      <div class="row-list">${rows}</div>
    </div>`;
  }

  function slowestCard() {
    const rows = [...data.tests]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(
        (t) => `<div class="row-item">
        <span class="row-main">
          <span class="row-title">${esc(shortTitle(t.title))}</span>
          <span class="row-meta">${esc(t.file)} · ${esc(t.project)}</span>
        </span>
        <span class="row-dur">${fmtMs(t.duration)}</span>
      </div>`
      )
      .join('');
    return `<div class="card col-span-2">
      <span class="card-label">Slowest tests</span>
      <div class="row-list">${rows}</div>
    </div>`;
  }

  function overview() {
    const t = data.totals;
    return `
      <div class="grid">
        ${ringCard()}
        ${trendCard()}
        ${durationCard()}
        ${statCard('Passed', f(t.passed), 'first time', 'v-pass')}
        ${statCard('Failed', f(t.failed), t.failed ? 'needs attention' : 'none', 'v-fail')}
        ${statCard('Flaky', f(t.flaky), 'passed on retry', 'v-flaky')}
        ${statCard('Skipped', f(t.skipped), 'not executed', 'v-skip')}
        ${statCard('Total tests', f(t.total), `across ${f(data.suites)} suites`, 'v-total')}
        ${environmentCard()}
        ${needsAttention()}
        ${slowestCard()}
      </div>`;
  }

  // ---- tests table -----------------------------------------------------------
  function testRows(q) {
    const query = (q || '').toLowerCase().trim();
    const rows = data.tests.filter(
      (t) => !query || (t.title + ' ' + t.file + ' ' + t.project + ' ' + (t.endpoint || '')).toLowerCase().includes(query)
    );
    if (!rows.length) return '<tr><td colspan="6" class="muted">No tests match.</td></tr>';
    return rows
      .map(
        (t) => `<tr>
        <td><span class="pill ${t.status}">${t.status}</span></td>
        <td>${esc(t.title)}${(t.tags || []).map((g) => `<span class="chip tag">${esc(g)}</span>`).join('')}</td>
        <td>${esc(t.project)}</td>
        <td class="loc">${esc(t.file)}:${t.line}</td>
        <td>${t.endpoint ? `<span class="chip">${esc(t.endpoint)}</span>` : '—'}</td>
        <td class="num">${fmtMs(t.duration)}</td>
      </tr>`
      )
      .join('');
  }

  function testsView() {
    return `
      <input id="test-search" class="searchbox" type="search" placeholder="Filter tests…" value="${esc(filter)}" />
      <div class="tablewrap">
        <table>
          <thead><tr><th>Status</th><th>Title</th><th>Project</th><th>Location</th><th>Endpoint</th><th class="num">Duration</th></tr></thead>
          <tbody id="test-rows">${testRows(filter)}</tbody>
        </table>
      </div>`;
  }

  function refreshRows() {
    const box = document.getElementById('test-rows');
    const input = document.getElementById('test-search');
    if (box && input) box.innerHTML = testRows(input.value);
  }

  // ---- failures --------------------------------------------------------------
  function failuresView() {
    if (!attention.length) return '<div class="empty">Nothing needs attention</div>';
    const clusters = (data.clusters || []).length
      ? `<div style="margin-bottom:16px">${data.clusters
          .map((c) => `<div class="cluster"><div class="msg">${esc(c.message)}</div><div class="n">×${c.count}</div></div>`)
          .join('')}</div>`
      : '';
    const items = attention
      .map((t) => {
        const err = t.error || {};
        const steps = (t.steps || []).map((s) => `<li>${esc(s)}</li>`).join('');
        const links = [
          t.screenshot ? `<a href="${esc(t.screenshot)}" target="_blank" rel="noopener">Screenshot</a>` : '',
          t.video ? `<a href="${esc(t.video)}" target="_blank" rel="noopener">Video</a>` : '',
          t.trace ? `<a href="${esc(t.trace)}" target="_blank" rel="noopener">Trace</a>` : '',
          t.reportUrl ? `<a href="${esc(t.reportUrl)}" target="_blank" rel="noopener">Playwright report</a>` : '',
        ]
          .filter(Boolean)
          .join('');
        return `<details class="test" ${attention.length <= 3 ? 'open' : ''}>
          <summary>
            <span class="pill ${t.status}">${t.status}</span>
            <strong>${esc(t.title)}</strong>
            <span class="chip">${esc(t.project)}</span>
            <span class="loc">${esc(t.file)}:${t.line}</span>
          </summary>
          <div class="test-body">
            <h4>Error</h4>
            <pre>${esc(err.stack || err.message || '(no error captured)')}</pre>
            ${steps ? `<h4>Steps</h4><ul class="steps">${steps}</ul>` : ''}
            ${links ? `<div class="links">${links}</div>` : ''}
          </div>
        </details>`;
      })
      .join('');
    return clusters + items;
  }

  // ---- breakdown / slowest / api / timeline ----------------------------------
  function breakdownView() {
    const group = (label, entries) => {
      const rows = entries
        .map(
          (e) => `<tr>
          <td>${esc(e.name || e.file)}</td>
          <td class="num">${e.total}</td>
          <td class="num" style="color:var(--pass)">${e.passed + e.flaky}</td>
          <td class="num" style="color:var(--fail)">${e.failed}</td>
          <td class="num" style="color:var(--flaky)">${e.flaky}</td>
          <td class="num">${fmtMs(e.duration || 0)}</td>
          <td class="num">${pct(e.rate)}</td>
        </tr>`
        )
        .join('');
      return `<div class="card" style="margin-bottom:14px"><h2 class="panel-title">${label}</h2>
        <div class="tablewrap" style="max-height:none"><table>
        <thead><tr><th>Group</th><th class="num">Total</th><th class="num">Pass</th><th class="num">Fail</th><th class="num">Flaky</th><th class="num">Duration</th><th class="num">Pass rate</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
    };
    return group('By project', envGroups) + group('By file', specGroups);
  }

  function slowestView() {
    const rows = [...data.tests]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 15)
      .map((t) => {
        const share = data.durationMs ? ((t.duration || 0) / data.durationMs) * 100 : 0;
        return `<tr>
          <td class="num">${fmtMs(t.duration)}</td>
          <td><span class="pill ${t.status}">${t.status}</span></td>
          <td>${esc(t.title)}</td>
          <td class="loc">${esc(t.file)}</td>
          <td class="num">${share.toFixed(1)}%</td>
        </tr>`;
      })
      .join('');
    return `<div class="card"><h2 class="panel-title">Slowest tests</h2>
      <div class="tablewrap" style="max-height:none"><table>
      <thead><tr><th class="num">Duration</th><th>Status</th><th>Title</th><th>File</th><th class="num">Share</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  function apiView() {
    if (!apiTests.length) return '<div class="empty">No endpoint annotations found.</div>';
    const rows = [...apiTests]
      .sort((a, b) => (a.endpoint || '').localeCompare(b.endpoint || ''))
      .map((t) => {
        const cls = !t.httpStatus ? '' : t.httpStatus < 400 ? 'passed' : 'failed';
        return `<tr>
          <td><span class="chip">${esc(t.endpoint)}</span></td>
          <td>${t.httpStatus ? `<span class="pill ${cls}">${t.httpStatus}</span>` : '—'}</td>
          <td><span class="pill ${t.status}">${t.status}</span></td>
          <td>${esc(t.title)}</td>
        </tr>`;
      })
      .join('');
    return `<div class="card"><h2 class="panel-title">API calls</h2>
      <div class="tablewrap" style="max-height:none"><table>
      <thead><tr><th>Endpoint</th><th>HTTP</th><th>Test</th><th>Title</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  function timelineView() {
    const start = data.runStart ? new Date(data.runStart).getTime() : 0;
    const end = data.runEnd ? new Date(data.runEnd).getTime() : 0;
    const span = Math.max(1, end - start);
    const summary = workerGroups
      .map(
        (g) => `<tr>
        <td>Worker ${g.index}</td>
        <td class="num">${g.total}</td>
        <td class="num" style="color:var(--pass)">${g.passed + g.flaky}</td>
        <td class="num" style="color:var(--fail)">${g.failed}</td>
        <td class="num">${fmtMs(g.duration)}</td>
      </tr>`
      )
      .join('');
    const lanes = workerGroups
      .map((g) => {
        const blocks = g.tests
          .map((t) => {
            const s = t.startTime ? new Date(t.startTime).getTime() : start;
            const left = ((s - start) / span) * 100;
            const width = Math.max(0.3, ((t.duration || 0) / span) * 100);
            return `<div class="block ${t.status}" style="left:${left}%;width:${width}%" title="${esc(t.title)} — ${fmtMs(t.duration)}"></div>`;
          })
          .join('');
        return `<div class="lane-row"><span class="lane-head">Worker ${g.index}</span><div class="lane">${blocks}</div></div>`;
      })
      .join('');
    const events = [
      `<li class="done"><div class="tl-title">Run started</div><div class="tl-meta">${esc(fmtClock(data.runStart))}</div></li>`,
      ...attention.map(
        (t) =>
          `<li class="${t.status}"><div class="tl-title">${t.status === 'flaky' ? 'Flaky' : 'Failed'}: ${esc(shortTitle(t.title))}</div><div class="tl-meta">${esc(t.file)} · ${esc(t.project)} · ${esc(fmtClock(t.startTime))}</div></li>`
      ),
      `<li class="done"><div class="tl-title">Run completed</div><div class="tl-meta">${esc(fmtClock(data.runEnd))}</div></li>`,
    ].join('');

    return `<div class="card" style="margin-bottom:14px"><h2 class="panel-title">Per-worker usage</h2>
      <div class="tablewrap" style="max-height:none"><table>
      <thead><tr><th>Worker</th><th class="num">Tests</th><th class="num">Pass</th><th class="num">Fail</th><th class="num">Duration</th></tr></thead>
      <tbody>${summary}</tbody></table></div></div>
      <div class="card" style="margin-bottom:14px"><h2 class="panel-title">Timeline</h2><div>${lanes}</div></div>
      <div class="card"><h2 class="panel-title">Activity</h2><ul class="tl">${events}</ul></div>`;
  }

  // ---- routing ---------------------------------------------------------------
  const VIEWS = {
    overview,
    tests: testsView,
    failures: failuresView,
    breakdown: breakdownView,
    slowest: slowestView,
    api: apiView,
    timeline: timelineView,
  };
  const isTab = (id) => NAV.some((n) => n.id === id);

  function render() {
    const view = VIEWS[active] || overview;
    document.getElementById('page').innerHTML = view();
    if (active === 'tests') {
      const input = document.getElementById('test-search');
      if (input) {
        input.addEventListener('input', refreshRows);
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    }
  }

  function setActive(id, opts = {}) {
    if (!isTab(id)) return;
    active = id;
    if (opts.search != null) filter = opts.search;
    document.querySelectorAll('.nav-pill').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    render();
  }

  function copySummary(btn) {
    const t = data.totals;
    const text = [
      `${data.projectName} — ${pct(data.passRate)} pass`,
      `Total ${f(t.total)} · Passed ${f(t.passed)} · Failed ${f(t.failed)} · Flaky ${f(t.flaky)} · Skipped ${f(t.skipped)}`,
      `Duration ${fmtMs(data.durationMs)} · ${f(data.workers)} worker(s)`,
    ].join('\n');
    navigator.clipboard?.writeText(text).then(
      () => { btn.textContent = 'Copied!'; setTimeout(() => (btn.textContent = 'Copy summary'), 1400); },
      () => { btn.textContent = 'Copy failed'; setTimeout(() => (btn.textContent = 'Copy summary'), 1400); }
    );
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('dash-theme', theme); } catch {}
  }
  function toggleTheme() {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  }
  function applyStoredTheme() {
    let theme = null;
    try { theme = localStorage.getItem('dash-theme'); } catch {}
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = theme;
  }

  function shell() {
    return `
    <div class="wrap">
      <header class="app-header">
        <div class="brand">
          ${hexLogo()}
          <div>
            <h1>Test health</h1>
            <div class="sub">${esc(data.projectName || 'Conduit QA')} · ${esc(fmtTime(data.runDate))} · ${esc(data.env || 'local')}</div>
          </div>
        </div>
        <div class="head-actions">
          <button id="copy-btn">${ico('copy')}Copy summary</button>
          <button class="btn-accent" id="theme-btn" title="Toggle light/dark theme" aria-label="Toggle light/dark theme">${ico('theme')}</button>
        </div>
      </header>
      <div class="navbar">
        <div class="pill-nav" id="pill-nav">${navHtml()}</div>
        <div class="nav-search">
          ${ico('search', 'search-ico')}
          <input id="global-search" type="search" placeholder="Search tests…" aria-label="Search tests" />
        </div>
      </div>
      <div id="page"></div>
      ${footerHtml()}
    </div>`;
  }

  function wire() {
    app.addEventListener('click', (e) => {
      const pill = e.target.closest('.nav-pill[data-tab]');
      if (pill) return setActive(pill.dataset.tab);
      const jump = e.target.closest('[data-tab]');
      if (jump && jump.dataset.tab) {
        return setActive(jump.dataset.tab, jump.dataset.search != null ? { search: jump.dataset.search } : {});
      }
      const copy = e.target.closest('#copy-btn');
      if (copy) return copySummary(copy);
      if (e.target.closest('#theme-btn')) return toggleTheme();
    });

    const search = document.getElementById('global-search');
    search.addEventListener('input', (e) => setActive('tests', { search: e.target.value }));
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        search.focus();
      }
    });
  }

  app.innerHTML = shell();
  applyStoredTheme();
  document.title = (data.projectName || 'Conduit QA') + ' — Test Dashboard';
  wire();
  render();
})();
