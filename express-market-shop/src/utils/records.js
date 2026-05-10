const KEY = 'expressMarket_records_v1';

function _load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function updateRecord(job, level, days, earnings) {
  const data = _load();
  if (!data[job]) data[job] = {};
  const prev = data[job][level];
  const isNew = !prev || days < prev.days || (days === prev.days && earnings > prev.earnings);
  if (isNew) {
    data[job][level] = { days, earnings: parseFloat(earnings.toFixed(2)) };
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  return { record: data[job][level], isNew };
}

export function getRecords() {
  return _load();
}
