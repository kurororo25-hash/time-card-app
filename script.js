'use strict';

const STORAGE_KEY = 'taikinRecords';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
let records = loadRecords();
let shownMonth = new Date();
shownMonth.setDate(1);

const $ = (id) => document.getElementById(id);
const todayLabel = $('todayLabel');
const monthTitle = $('monthTitle');
const recordList = $('recordList');
const summary = $('summary');
const editDialog = $('editDialog');

function pad(n) { return String(n).padStart(2, '0'); }
function localDateString(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
function localTimeString(date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function dateFromParts(dateStr, timeStr = '00:00') {
  const [y,m,d] = dateStr.split('-').map(Number);
  const [hh,mm] = timeStr.split(':').map(Number);
  return new Date(y, m-1, d, hh, mm, 0, 0);
}
function weekdayOf(dateStr) { return WEEKDAYS[dateFromParts(dateStr).getDay()]; }

// 月曜: 6:30〜14:00 = 7.5h / 土曜: 6:30〜12:30 = 6h
// その他の曜日は従来ルール: 14:00 = 8.5h
function ruleFor(dateStr) {
  const day = dateFromParts(dateStr).getDay();
  if (day === 1) return { start: '06:30', regularEnd: '14:00', baseHours: 7.5, label: '月曜ルール' };
  if (day === 6) return { start: '06:30', regularEnd: '12:30', baseHours: 6.0, label: '土曜ルール' };
  return { start: null, regularEnd: '14:00', baseHours: 8.5, label: '火〜金ルール' };
}

function roundedExtraHours(timeStr, regularEnd) {
  const [h,m] = timeStr.split(':').map(Number);
  const [eh,em] = regularEnd.split(':').map(Number);
  const diff = (h*60+m) - (eh*60+em);
  if (diff <= 0) return 0;
  // 従来どおり「定時を過ぎたら次の30分枠」として計算
  return Math.ceil(diff / 30) * 0.5;
}

function calculate(dateStr, timeStr) {
  const rule = ruleFor(dateStr);
  const overtime = roundedExtraHours(timeStr, rule.regularEnd);
  return { ...rule, overtime, workHours: rule.baseHours + overtime };
}

function formatHours(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function displayDate(dateStr) {
  const [y,m,d] = dateStr.split('-').map(Number);
  return `${y}/${m}/${d}（${weekdayOf(dateStr)}）`;
}

function normalizeRecord(item) {
  if (!item) return null;
  if (item.date && item.time) return { id: item.id || crypto.randomUUID(), date: item.date, time: item.time };
  const source = item.datetime || item.timestamp || item.dateTime || item.createdAt;
  if (source) {
    const dt = new Date(source);
    if (!Number.isNaN(dt.getTime())) return { id: item.id || crypto.randomUUID(), date: localDateString(dt), time: localTimeString(dt) };
  }
  return null;
}

function loadRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(normalizeRecord).filter(Boolean) : [];
  } catch { return []; }
}
function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }

function addNow() {
  const now = new Date();
  records.push({ id: crypto.randomUUID(), date: localDateString(now), time: localTimeString(now) });
  saveRecords();
  shownMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  render();
}

function render() {
  const y = shownMonth.getFullYear();
  const m = shownMonth.getMonth();
  monthTitle.textContent = `${y}年${m+1}月`;
  const monthRecords = records
    .filter(r => { const d = dateFromParts(r.date); return d.getFullYear() === y && d.getMonth() === m; })
    .sort((a,b) => dateFromParts(b.date,b.time) - dateFromParts(a.date,a.time));

  const totals = monthRecords.reduce((acc,r) => {
    const c = calculate(r.date,r.time);
    acc.work += c.workHours; acc.overtime += c.overtime; return acc;
  }, {work:0,overtime:0});

  summary.innerHTML = `
    <div class="summary-card">記録日数<b>${monthRecords.length}日</b></div>
    <div class="summary-card">実働合計<b>${formatHours(totals.work)}時間</b></div>
    <div class="summary-card">残業合計<b>${formatHours(totals.overtime)}時間</b></div>`;

  if (!monthRecords.length) {
    recordList.innerHTML = '<div class="empty">この月の記録はありません</div>';
    return;
  }
  recordList.innerHTML = '';
  for (const r of monthRecords) {
    const c = calculate(r.date,r.time);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'record';
    btn.innerHTML = `
      <div class="record-top"><span class="record-date">${displayDate(r.date)}</span><span class="record-time">${r.time}</span></div>
      <div class="record-bottom"><span>残業 ${formatHours(c.overtime)}時間</span><span>実働 ${formatHours(c.workHours)}時間</span><span>${c.label}</span></div>`;
    btn.addEventListener('click', () => openEdit(r.id));
    recordList.appendChild(btn);
  }
}

function openEdit(id) {
  const r = records.find(x => x.id === id);
  if (!r) return;
  $('editId').value = r.id;
  $('editDate').value = r.date;
  $('editTime').value = r.time;
  updateEditPreview();
  editDialog.showModal();
}

function updateEditPreview() {
  const date = $('editDate').value;
  const time = $('editTime').value;
  if (!date) return;
  $('editWeekday').textContent = `${weekdayOf(date)}曜日`;
  if (!time) { $('editCalculation').textContent = ''; return; }
  const c = calculate(date,time);
  $('editCalculation').innerHTML = `残業：<b>${formatHours(c.overtime)}時間</b><br>実働：<b>${formatHours(c.workHours)}時間</b><br>${c.label}<br>定時：${c.regularEnd}`;
}

$('clockOutBtn').addEventListener('click', addNow);
$('prevMonth').addEventListener('click', () => { shownMonth.setMonth(shownMonth.getMonth()-1); render(); });
$('nextMonth').addEventListener('click', () => { shownMonth.setMonth(shownMonth.getMonth()+1); render(); });
$('editDate').addEventListener('input', updateEditPreview);
$('editTime').addEventListener('input', updateEditPreview);
$('cancelEdit').addEventListener('click', () => editDialog.close());
$('editForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = records.find(x => x.id === $('editId').value);
  if (!r) return;
  r.date = $('editDate').value;
  r.time = $('editTime').value;
  saveRecords(); editDialog.close(); render();
});
$('deleteRecord').addEventListener('click', () => {
  const id = $('editId').value;
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords(); editDialog.close(); render();
});

const now = new Date();
todayLabel.textContent = `${displayDate(localDateString(now))} ${localTimeString(now)}`;
render();
