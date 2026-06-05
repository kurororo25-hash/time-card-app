const STORAGE_KEY = "taikin_records_v2";

const recordBtn = document.getElementById("recordBtn");
const manualRecordBtn = document.getElementById("manualRecordBtn");
const manualTime = document.getElementById("manualTime");
const recordList = document.getElementById("recordList");
const emptyText = document.getElementById("emptyText");
const clearAllBtn = document.getElementById("clearAllBtn");
const totalWork = document.getElementById("totalWork");
const totalOvertime = document.getElementById("totalOvertime");
const recordTemplate = document.getElementById("recordTemplate");

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function pad2(num) {
  return String(num).padStart(2, "0");
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function nowTimeString() {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

// 退勤時間から実働時間・残業時間を計算
// 14:00までは 実働8.5 / 残業0
// 14:00を1分でも超えたら、30分単位で切り上げて +0.5時間ずつ
function calcWorkAndOvertime(timeString) {
  const [hour, minute] = timeString.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  const baseMinutes = 14 * 60;

  if (totalMinutes <= baseMinutes) {
    return {
      workHours: 8.5,
      overtimeHours: 0
    };
  }

  const diffMinutes = totalMinutes - baseMinutes;
  const blocks = Math.ceil(diffMinutes / 30);
  const addHours = blocks * 0.5;

  return {
    workHours: 8.5 + addHours,
    overtimeHours: addHours
  };
}

function formatHours(value) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(1));
}

function createRecord(time) {
  const result = calcWorkAndOvertime(time);

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
    date: todayString(),
    time,
    workHours: result.workHours,
    overtimeHours: result.overtimeHours,
    createdAt: new Date().toISOString()
  };
}

function addRecord(time) {
  if (!time) {
    alert("時刻を入力してください。");
    return;
  }

  const records = loadRecords();
  records.unshift(createRecord(time));
  saveRecords(records);
  render();
}

function updateRecord(id, newTime) {
  if (!newTime) {
    alert("時刻を入力してください。");
    return;
  }

  const records = loadRecords();
  const index = records.findIndex(record => record.id === id);
  if (index === -1) return;

  const result = calcWorkAndOvertime(newTime);

  records[index].time = newTime;
  records[index].workHours = result.workHours;
  records[index].overtimeHours = result.overtimeHours;

  saveRecords(records);
  render();
}

function deleteRecord(id) {
  const records = loadRecords().filter(record => record.id !== id);
  saveRecords(records);
  render();
}

function clearAllRecords() {
  const ok = confirm("全ての記録を削除しますか？");
  if (!ok) return;

  saveRecords([]);
  render();
}

function isCurrentMonth(dateString) {
  const now = new Date();
  const [year, month] = dateString.split("-").map(Number);

  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function renderSummary(records) {
  const currentMonthRecords = records.filter(record => isCurrentMonth(record.date));

  const workSum = currentMonthRecords.reduce((sum, record) => sum + Number(record.workHours || 0), 0);
  const overtimeSum = currentMonthRecords.reduce((sum, record) => sum + Number(record.overtimeHours || 0), 0);

  totalWork.textContent = formatHours(workSum);
  totalOvertime.textContent = formatHours(overtimeSum);
}

function render() {
  const records = loadRecords();

  recordList.innerHTML = "";
  emptyText.style.display = records.length ? "none" : "block";

  renderSummary(records);

  records.forEach(record => {
    const clone = recordTemplate.content.cloneNode(true);
    const item = clone.querySelector(".record-item");
    const dateEl = clone.querySelector(".record-date");
    const valuesEl = clone.querySelector(".record-values");
    const editTime = clone.querySelector(".edit-time");
    const saveBtn = clone.querySelector(".save-btn");
    const deleteBtn = clone.querySelector(".delete-btn");

    dateEl.textContent = record.date;
    valuesEl.innerHTML = `
      退勤時間：${record.time}<br>
      実働時間：${formatHours(record.workHours)}時間<br>
      残業時間：${formatHours(record.overtimeHours)}時間
    `;

    editTime.value = record.time;

    saveBtn.addEventListener("click", () => {
      updateRecord(record.id, editTime.value);
    });

    deleteBtn.addEventListener("click", () => {
      const ok = confirm(`${record.date} ${record.time} の記録を削除しますか？`);
      if (ok) deleteRecord(record.id);
    });

    recordList.appendChild(clone);
  });
}

recordBtn.addEventListener("click", () => {
  addRecord(nowTimeString());
});

manualRecordBtn.addEventListener("click", () => {
  addRecord(manualTime.value);
});

clearAllBtn.addEventListener("click", clearAllRecords);

manualTime.value = nowTimeString();
render();
