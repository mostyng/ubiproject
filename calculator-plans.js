/* ════════════════════════════════════════════════════════════════
   UBI Project calculator: named plans, share links, Explore tab,
   and the presentation stage for screen recording.
   Loaded after the inline scripts in calculator.html and uses their
   globals (REV, SAVINGS_DATA, SPENDING_DATA, activeFS, activeSav,
   spendCut, update, drawPie, fmt, keyName, PIE_COLORS ...).

   TO ADD OR EDIT A PLAN: change PLANS below. Each plan has
     amount  monthly payment the plan starts from
     steps   the order the plan is built in. Each step has a caption
             (`say`, shown large in Present mode) and a `set` patch:
               design: 'ubi' | 'nit'
               fs:     { sourceKey: rate }   (true for sources with no slider)
               cut:    { spendingId: percent redirected }
               sav:    [ savingsKey, ... ]
               aiBase: index into AI_BASES
   Choosing a plan outside Present mode applies every step at once.
   ════════════════════════════════════════════════════════════════ */

const PLANS = {
  blank: {
    chip: 'Blank page', name: 'Build your own', steps: [],
    amount: 1000
  },

  friedman: {
    chip: 'Friedman', name: 'The negative income tax', who: 'Milton Friedman, 1962',
    pitch: 'Pay only the people below an income line, shrink the payment as they earn, and use it to replace existing aid.',
    caveat: 'Cost is a 2015 estimate for a poverty-line floor with a 50% phase-out. The housing redirect is about the size of HUD\'s budget, which this calculator groups with education.',
    amount: 1000,
    steps: [
      { say: 'A $1,000 floor paid to every adult costs about $3.1 trillion a year.', set: {} },
      { say: 'Friedman\'s version pays only people below an income line, and shrinks as they earn. Same floor, about $219 billion.', set: { design: 'nit' } },
      { say: 'He meant it to replace existing aid, not sit on top of it. Redirect food assistance.', set: { cut: { snap: 100 } } },
      { say: 'And housing assistance.', set: { cut: { eduhud: 48 } } },
      { say: 'Nearly covered on paper. The open question is what happens to people those programs served.', set: {} }
    ]
  },

  mlk: {
    chip: 'MLK', name: 'The guaranteed income', who: 'Martin Luther King Jr., 1967',
    pitch: 'Abolish poverty directly with an income tied to the median, not the minimum, that rises as the country gets richer.',
    caveat: 'King set the goal and left the funding to others. The two sources here are an illustration: war spending, which he pointed to, and the 70% top tax rate in force when he wrote.',
    amount: 2000,
    steps: [
      { say: 'King wanted the floor tied to median income, well above the poverty line. This slider tops out at $2,000 a month.', set: {} },
      { say: 'He named a goal, not a tax. But he pointed at war spending. Redirect half the defense budget.', set: { cut: { defense: 50 } } },
      { say: 'Return the top income tax rate to the 70 percent in force when he wrote.', set: { fs: { income: 70 } } },
      { say: 'Most of the cost is still uncovered. King argued the country could afford it and left the how to others.', set: {} }
    ]
  },

  yang: {
    chip: 'Yang', name: 'The Freedom Dividend', who: 'Andrew Yang, 2019',
    pitch: '$1,000 a month for every adult, paid for mainly by a 10% value-added tax.',
    caveat: 'Yang counted on $800 to $900 billion from economic growth. The Tax Foundation\'s model found growth would fall instead, leaving the plan about half funded.',
    amount: 1000,
    steps: [
      { say: '$1,000 a month for every adult. Yang called it the Freedom Dividend.', set: {} },
      { say: 'A 10 percent value-added tax, collected at each stage of production. It does most of the work.', set: { fs: { vat: 10 } } },
      { say: 'Smaller taxes on trading, investment gains and high salaries.', set: { fs: { ftt: 0.1, capgains: true, sscap: true } } },
      { say: 'A $40 per ton carbon tax.', set: { fs: { carbon: 40 } } },
      { say: 'People already on benefits choose one or the other.', set: { sav: ['overlap'] } },
      { say: 'About half funded. Yang counted on growth for much of the rest. The Tax Foundation\'s model did not.', set: {} }
    ]
  },

  altman: {
    chip: 'Altman', name: 'Own a share of AI', who: 'Sam Altman, 2021 and 2026',
    pitch: 'Instead of a check from taxes, every adult owns a slice of the companies and land that AI makes more valuable.',
    caveat: 'Uses today\'s values. Altman\'s $13,500 figure assumed a decade of AI-driven growth. In 2026 he said he now favors shared ownership, in equity or compute, over a fixed cash payment.',
    amount: 1125,
    steps: [
      { say: '$13,500 a year for every adult. Altman\'s 2021 figure, looking a decade out.', set: {} },
      { say: 'Big companies pay 2.5 percent of their value each year, in shares, into a fund everyone owns.', set: { fs: { equity: 2.5 } } },
      { say: 'Plus 2.5 percent a year on the value of privately owned land.', set: { fs: { lvt: 2.5 } } },
      { say: 'About half funded at today\'s values. The plan is a bet that AI makes both far more valuable.', set: {} }
    ]
  },

  amodei: {
    chip: 'Amodei', name: 'Tax the AI companies', who: 'Dario Amodei, 2025 and 2026',
    pitch: 'If AI permanently shrinks the demand for labor, fund income support by taxing the companies that build it.',
    caveat: 'Amodei has named no payment amount; $1,000 is a placeholder. The 3% rate comes from press accounts of his 2025 remarks, and AI revenue is an assumption you can change.',
    amount: 1000,
    steps: [
      { say: 'Amodei has named no amount. $1,000 a month is a placeholder so there is something to fund.', set: {} },
      { say: 'A 3 percent tax on AI revenue. At roughly $150 billion in industry revenue, that raises $4.5 billion.', set: { fs: { ai: 3 }, aiBase: 1 } },
      { say: 'He also names higher capital gains taxes. Scored the way Yang\'s version was, about $7 billion.', set: { fs: { capgains: true } } },
      { say: 'The bet is on growth. If AI revenue reached $3 trillion, the same 3 percent raises $90 billion.', set: { aiBase: 6 } },
      { say: 'A hypothetical ceiling: $10 trillion in AI revenue, taxed at 30 percent, would cover nearly all of it.', set: { fs: { ai: 30 }, aiBase: 8 } }
    ]
  }
};
const PLAN_ORDER = ['blank', 'friedman', 'mlk', 'yang', 'altman', 'amodei'];

/* Who pays, and who has proposed it. Drives the Explore tab. */
const SOURCE_META = {
  wealth:   { who: 'wealthy',   by: 'Elizabeth Warren' },
  income:   { who: 'wealthy',   by: 'Pre-1981 US tax code' },
  sscap:    { who: 'wealthy',   by: 'Andrew Yang' },
  vat:      { who: 'spenders',  by: 'Andrew Yang; most rich countries' },
  carbon:   { who: 'polluters', by: 'Climate Leadership Council; Yang' },
  lvt:      { who: 'land',      by: 'Thomas Paine; Henry George; Altman' },
  ftt:      { who: 'investors', by: 'Andrew Yang; Bernie Sanders' },
  capgains: { who: 'investors', by: 'Andrew Yang; Dario Amodei' },
  equity:   { who: 'companies', by: 'Sam Altman' },
  ai:       { who: 'companies', by: 'Dario Amodei' },
  auto:     { who: 'companies', by: 'Bill Gates' }
};
const WHO = {
  all: 'All', wealthy: 'The very wealthy', spenders: 'Everyone who spends', companies: 'Companies',
  investors: 'Investors', polluters: 'Polluters', land: 'Landowners'
};

/* ════ STATE: read, write, apply ════ */
let currentPlan = 'blank';
const $ = id => document.getElementById(id);

function emptyState(amount) { return { amount: amount || 1000, design: 'ubi', fs: {}, cut: {}, sav: [], aiBase: 1 }; }

function stateAtStep(plan, i) {
  const st = emptyState(plan.amount);
  plan.steps.slice(0, i + 1).forEach(step => {
    const s = step.set || {};
    if (s.design) st.design = s.design;
    if (s.amount) st.amount = s.amount;
    if (s.aiBase != null) st.aiBase = s.aiBase;
    Object.assign(st.fs, s.fs || {});
    Object.assign(st.cut, s.cut || {});
    (s.sav || []).forEach(k => { if (!st.sav.includes(k)) st.sav.push(k); });
  });
  return st;
}

function getState() {
  const st = emptyState(getMonthly());
  st.design = DESIGN;
  st.aiBase = +$('sr-aibase').value;
  activeFS.forEach(k => { const el = $('sr-' + k); st.fs[k] = el ? parseFloat(el.value) : true; });
  SPENDING_DATA.forEach(c => { if (spendCut[c.id] > 0) st.cut[c.id] = spendCut[c.id]; });
  st.sav = [...activeSav];
  return st;
}

function rateLabel(key, v) {
  if (key === 'carbon') return '$' + v + '/ton';
  if (key === 'print')  return fmt(v) + '/yr';
  return v + '%';
}

function setState(st) {
  DESIGN = st.design === 'nit' ? 'nit' : 'ubi';
  $('ubi-slider').value = st.amount;
  $('sr-aibase').value = st.aiBase != null ? st.aiBase : 1;
  $('sv-aibase').textContent = fmt(aiBaseB()) + '/yr';

  Object.keys(REV).forEach(key => {
    const on = Object.prototype.hasOwnProperty.call(st.fs, key);
    const card = $('fc-' + key);
    if (on) activeFS.add(key); else activeFS.delete(key);
    if (card) card.classList.toggle('active', on);
    if (key === 'print') $('infl-block').style.display = on ? 'block' : 'none';
    const el = $('sr-' + key);
    if (on && el && typeof st.fs[key] === 'number') {
      el.value = st.fs[key];
      const lab = $('sv-' + key);
      if (lab) lab.textContent = rateLabel(key, parseFloat(el.value));
    }
  });

  SPENDING_DATA.forEach(c => {
    spendCut[c.id] = c.locked ? 0 : (st.cut[c.id] || 0);
    const sl = $('sps-' + c.id);
    if (sl) sl.value = spendCut[c.id];
  });

  activeSav.clear();
  (st.sav || []).forEach(k => { if (SAVINGS_DATA[k]) activeSav.add(k); });
  Object.keys(SAVINGS_DATA).forEach(k => { const el = $('sv-' + k); if (el && el.classList.contains('savings-item')) el.classList.toggle('active', activeSav.has(k)); });

  syncDesign();
  updateSpending();
  update();
}

function syncDesign() {
  const nit = DESIGN === 'nit';
  document.querySelectorAll('.design-opt').forEach(b => {
    const on = b.dataset.design === DESIGN;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on);
  });
  $('ubi-slider').disabled = nit;
  $('design-note').hidden = !nit;
  $('ubi-meta-txt').textContent = nit ? 'Paid only below a break-even income' : '~258M eligible adults';
}

/* ════ PLANS ════ */
function buildPlanChips() {
  $('plan-chips').innerHTML = PLAN_ORDER.map(id =>
    `<button type="button" class="plan-chip" data-plan="${id}" aria-pressed="false">${PLANS[id].chip}</button>`).join('');
  $('plan-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-plan]');
    if (b) selectPlan(b.dataset.plan);
  });
}

function showPlanMeta(id) {
  currentPlan = id;
  const plan = PLANS[id];
  document.querySelectorAll('.plan-chip').forEach(b => {
    const on = b.dataset.plan === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  const note = $('plan-note');
  if (id === 'blank') { note.hidden = true; note.innerHTML = ''; }
  else {
    note.hidden = false;
    note.innerHTML = `<strong>${plan.name}.</strong> <span class="plan-who">${plan.who}.</span> ${plan.pitch} ` +
      `<span class="plan-caveat">${plan.caveat}</span> <a href="videos.html#${id}">Video and summary →</a>`;
  }
  $('stage-kicker').textContent = id === 'blank' ? 'UBI Project · Funding calculator' : plan.who;
  $('stage-title').textContent = plan.name;
}

function selectPlan(id, stepIdx) {
  const plan = PLANS[id] || PLANS.blank;
  showPlanMeta(PLANS[id] ? id : 'blank');
  if (presenting && plan.steps.length) { goStep(stepIdx || 0); return; }
  step = Math.max(0, plan.steps.length - 1);
  setState(plan.steps.length ? stateAtStep(plan, plan.steps.length - 1) : emptyState(plan.amount));
  renderStage();
}

/* ════ SHARE LINK ════ */
function stateToQuery() {
  const st = getState(), q = new URLSearchParams();
  if (currentPlan !== 'blank') q.set('plan', currentPlan);
  q.set('m', st.amount);
  if (st.design === 'nit') q.set('d', 'nit');
  const fs = Object.entries(st.fs).map(([k, v]) => v === true ? k : k + ':' + v).join(',');
  if (fs) q.set('f', fs);
  const cut = Object.entries(st.cut).map(([k, v]) => k + ':' + v).join(',');
  if (cut) q.set('c', cut);
  if (st.sav.length) q.set('v', st.sav.join(','));
  if (st.aiBase !== 1) q.set('a', st.aiBase);
  if (presenting) { q.set('present', 1); if (step) q.set('step', step); }
  return q.toString();
}

function queryToState(q) {
  const st = emptyState(parseInt(q.get('m')) || 1000);
  if (q.get('d') === 'nit') st.design = 'nit';
  (q.get('f') || '').split(',').filter(Boolean).forEach(part => {
    const [k, v] = part.split(':');
    if (REV[k]) st.fs[k] = v === undefined ? true : parseFloat(v);
  });
  (q.get('c') || '').split(',').filter(Boolean).forEach(part => {
    const [k, v] = part.split(':');
    if (k in spendCut) st.cut[k] = Math.max(0, Math.min(100, parseFloat(v) || 0));
  });
  st.sav = (q.get('v') || '').split(',').filter(k => SAVINGS_DATA[k]);
  if (q.get('a') != null) st.aiBase = Math.max(0, Math.min(AI_BASES.length - 1, parseInt(q.get('a')) || 0));
  return st;
}

let urlTimer;
function syncUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    try { history.replaceState(null, '', location.pathname + '?' + stateToQuery()); } catch (e) { /* file:// or sandbox */ }
  }, 250);
}

function copyLink() {
  const btn = $('btn-link');
  const url = location.origin + location.pathname + '?' + stateToQuery();
  const done = () => { btn.textContent = 'Link copied'; setTimeout(() => btn.textContent = 'Copy link', 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link', url));
  else prompt('Copy this link', url);
}

/* ════ EXPLORE TAB ════ */
let exFilter = 'all';
function buildExplore() {
  $('ex-filters').innerHTML = Object.entries(WHO).map(([k, label]) =>
    `<button type="button" class="ex-chip${k === 'all' ? ' active' : ''}" data-who="${k}" aria-pressed="${k === 'all'}">${label}</button>`).join('');
  $('ex-filters').addEventListener('click', e => {
    const b = e.target.closest('[data-who]');
    if (!b) return;
    exFilter = b.dataset.who;
    document.querySelectorAll('.ex-chip').forEach(c => { const on = c === b; c.classList.toggle('active', on); c.setAttribute('aria-pressed', on); });
    renderExplore();
  });
  $('ex-list').addEventListener('click', e => {
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    toggleFS(b.dataset.ex);
    const again = $('ex-list').querySelector(`[data-ex="${b.dataset.ex}"]`);
    if (again) again.focus();
  });
}

function renderExplore() {
  const list = $('ex-list');
  if (!list) return;
  const cost = totalCostB();
  const rows = Object.keys(SOURCE_META).map(key => {
    const el = $('sr-' + key);
    const now = REV[key](el ? parseFloat(el.value) : 0);
    const max = el ? REV[key](parseFloat(el.max)) : now;
    return { key, now, max, meta: SOURCE_META[key] };
  }).filter(r => exFilter === 'all' || r.meta.who === exFilter)
    .sort((a, b) => b.now - a.now);

  list.innerHTML = rows.map(r => {
    const on = activeFS.has(r.key);
    const pNow = Math.min(100, r.now / cost * 100), pMax = Math.min(100, r.max / cost * 100);
    const share = r.now / cost * 100;
    return `<div class="ex-row${on ? ' on' : ''}">
      <div class="ex-head">
        <span class="ex-name">${keyName(r.key)}</span>
        <button type="button" class="ex-add" data-ex="${r.key}" aria-pressed="${on}">${on ? 'Added ✓' : 'Add'}</button>
      </div>
      <div class="ex-bar" aria-hidden="true"><span class="ex-bar-max" style="width:${pMax}%"></span><span class="ex-bar-now" style="width:${pNow}%;background:${PIE_COLORS[r.key]}"></span></div>
      <div class="ex-meta"><strong>${fmt(r.now)}/yr</strong> · ${share >= 10 ? Math.round(share) : share.toFixed(1)}% of the cost${r.max > r.now ? ' · up to ' + fmt(r.max) : ''}</div>
      <div class="ex-tags"><span class="ex-who">${WHO[r.meta.who]}</span><span class="ex-by">${r.meta.by}</span></div>
    </div>`;
  }).join('') +
  (exFilter === 'all' ? `<div class="ex-row ex-row-link"><div class="ex-head"><span class="ex-name">Existing federal budget</span>
      <button type="button" class="ex-add" onclick="document.getElementById('tab-spending').click()">Open Spending</button></div>
      <div class="ex-meta">Redirect part of what is already spent instead of raising new money.</div></div>` : '');
}

/* ════ DONUT TWEEN + AFTER-UPDATE HOOK ════
   update() calls drawPie by name, so wrapping it here catches every change. */
const drawSettled = drawPie;          // v2 draw + accessibility sync
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastDraw = null, tweenRaf = 0;

drawPie = function (breakdown, totalRev, costB) {
  afterUpdate(breakdown, totalRev, costB);
  cancelAnimationFrame(tweenRaf);
  if (!lastDraw || reduceMotion || document.hidden) { drawSettled(breakdown, totalRev, costB); stageNumbers(totalRev, costB); lastDraw = { breakdown, costB }; return; }

  const from = lastDraw, meta = {}, keys = [];
  from.breakdown.concat(breakdown).forEach(b => { if (!meta[b.key]) { meta[b.key] = b; keys.push(b.key); } });
  breakdown.forEach(b => meta[b.key] = b);
  const a0 = Object.fromEntries(from.breakdown.map(b => [b.key, b.rev]));
  const a1 = Object.fromEntries(breakdown.map(b => [b.key, b.rev]));
  const order = breakdown.map(b => b.key).concat(keys.filter(k => !(k in a1)));
  const t0 = performance.now(), dur = presenting ? 900 : 350;
  lastDraw = { breakdown, costB };

  (function frame(now) {
    const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
    if (t >= 1) { drawSettled(breakdown, totalRev, costB); stageNumbers(totalRev, costB); return; }
    const mix = order.map(k => ({ key: k, name: meta[k].name, color: meta[k].color, rev: (a0[k] || 0) + ((a1[k] || 0) - (a0[k] || 0)) * e })).filter(b => b.rev > 0.05);
    const cost = from.costB + (costB - from.costB) * e;
    const rev = mix.reduce((s, b) => s + b.rev, 0);
    _drawPie(mix, rev, cost);
    stageNumbers(rev, cost);
    tweenRaf = requestAnimationFrame(frame);
  })(t0);
};

function afterUpdate(breakdown, totalRev, costB) {
  if (DESIGN === 'nit') {
    $('ubi-display').textContent = 'Poverty-line floor';
    $('r-monthly').textContent = '≈$1,000 floor';
  }
  $('sv-aibase').textContent = fmt(aiBaseB()) + '/yr';
  renderExplore();
  renderStageLegend(breakdown, costB);
  syncUrl();
}

/* ════ PRESENTATION STAGE ════ */
let presenting = false, step = 0, pieHome = null;

function stageNumbers(totalRev, costB) {
  const gap = Math.max(0, costB - totalRev);
  $('stage-amt-lbl').textContent = DESIGN === 'nit' ? 'Floor, shrinking with income' : 'Per adult, per month';
  $('stage-amt').textContent = DESIGN === 'nit' ? '≈$1,000' : '$' + getMonthly().toLocaleString();
  $('stage-cost').textContent = fmt(Math.round(costB));
  $('stage-gap-lbl').textContent = gap > 0.5 ? 'Still unfunded' : 'Surplus';
  $('stage-gap').textContent = gap > 0.5 ? fmt(gap >= 10 ? Math.round(gap) : gap) : fmt(Math.round(totalRev - costB));
  $('stage-gap').classList.toggle('ok', gap <= 0.5);
}

function renderStageLegend(breakdown, costB) {
  const rows = [...breakdown].sort((a, b) => b.rev - a.rev).slice(0, 7);
  $('stage-legend').innerHTML = rows.map(b =>
    `<div class="stage-leg-row"><span class="stage-leg-dot" style="background:${b.color}"></span><span class="stage-leg-name">${b.name}</span><span class="stage-leg-val">${fmt(b.rev)}</span></div>`).join('');
}

function renderStage() {
  const plan = PLANS[currentPlan];
  const has = plan.steps.length > 0;
  $('stage-say').textContent = has ? plan.steps[step].say : 'Press C to open the controls, or L to load a plan.';
  $('stage-dots').innerHTML = has ? plan.steps.map((_, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}"></span>`).join('') : '';
}

function goStep(i) {
  const plan = PLANS[currentPlan];
  if (!plan.steps.length) { renderStage(); return; }
  step = Math.max(0, Math.min(plan.steps.length - 1, i));
  setState(stateAtStep(plan, step));
  renderStage();
}

function enterPresent(startStep) {
  if (presenting) return;
  presenting = true;
  const wrap = $('pie-wrap');
  pieHome = { parent: wrap.parentNode, next: wrap.nextSibling };
  $('stage-mid').appendChild(wrap);
  $('stage').hidden = false;
  document.body.classList.add('present');
  $('stage-plans').innerHTML = PLAN_ORDER.map((id, i) => `<button type="button" data-plan="${id}"><kbd>${i}</kbd> ${PLANS[id].name}</button>`).join('');
  if (PLANS[currentPlan].steps.length) goStep(startStep || 0); else { renderStage(); update(); }
}

function exitPresent() {
  if (!presenting) return;
  presenting = false;
  pieHome.parent.insertBefore($('pie-wrap'), pieHome.next);
  $('stage').hidden = true;
  $('stage-plans').hidden = true;
  document.body.classList.remove('present', 'show-controls', 'hide-hint');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const plan = PLANS[currentPlan];
  if (plan.steps.length) { step = plan.steps.length - 1; setState(stateAtStep(plan, step)); } else update();
}

function nudgeAmount(d) {
  if (DESIGN === 'nit') return;
  const sl = $('ubi-slider');
  sl.value = Math.max(+sl.min, Math.min(+sl.max, +sl.value + d));
  update();
}

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ''));
  const k = e.key;
  if (!presenting) {
    if ((k === 'p' || k === 'P') && !typing) { enterPresent(); e.preventDefault(); }
    return;
  }
  if (k === 'Escape') { exitPresent(); return; }
  if (typing && k !== 'Escape') return;           // let sliders in the drawer use the arrows
  if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') goStep(step + 1);
  else if (k === 'ArrowLeft' || k === 'PageUp') goStep(step - 1);
  else if (k === 'ArrowUp') nudgeAmount(50);
  else if (k === 'ArrowDown') nudgeAmount(-50);
  else if (k === 'r' || k === 'R') goStep(0);
  else if (k === 'c' || k === 'C') document.body.classList.toggle('show-controls');
  else if (k === 'h' || k === 'H') document.body.classList.toggle('hide-hint');
  else if (k === 'l' || k === 'L') $('stage-plans').hidden = !$('stage-plans').hidden;
  else if (k === 'f' || k === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  else if (k === 'd' || k === 'D') { DESIGN = DESIGN === 'nit' ? 'ubi' : 'nit'; syncDesign(); update(); }
  else if (/^[0-5]$/.test(k)) { $('stage-plans').hidden = true; selectPlan(PLAN_ORDER[+k], 0); }
  else return;
  e.preventDefault();
});

/* ════ INIT ════ */
function initCalculator() {
  buildPlanChips();
  buildExplore();

  document.querySelectorAll('.design-opt').forEach(b => b.addEventListener('click', () => { DESIGN = b.dataset.design; syncDesign(); update(); }));
  $('sr-aibase').addEventListener('input', update);
  $('btn-present').addEventListener('click', () => enterPresent());
  $('btn-link').addEventListener('click', copyLink);
  $('stage-plans').addEventListener('click', e => {
    const b = e.target.closest('[data-plan]');
    if (b) { $('stage-plans').hidden = true; selectPlan(b.dataset.plan, 0); }
  });

  const q = new URLSearchParams(location.search);
  const planId = PLANS[q.get('plan')] ? q.get('plan') : 'blank';
  showPlanMeta(planId);
  if (q.has('m') || q.has('f') || q.has('c')) setState(queryToState(q));
  else if (planId !== 'blank') selectPlan(planId);
  else { syncDesign(); update(); }
  renderStage();
  if (q.get('present')) enterPresent(parseInt(q.get('step')) || 0);
}
