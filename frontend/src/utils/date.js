// src/utils/date.js
// Centralized date and time formatting utilities
// Strict format order: Date Month Year (DD-MM-YYYY)

function pad(num, size = 2) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Format any date input (YYYY-MM-DD string, Date object, ISO timestamp) 
 * strictly to Date Month Year order: "DD-MM-YYYY" (e.g., 20-11-2026)
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  if (!str || str === 'null' || str === 'undefined' || str === 'N/A') return '';

  // 1. Direct Regex match for YYYY-MM-DD or YYYY/MM/DD to avoid any timezone shifts
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [_, y, m, d] = ymdMatch;
    return `${pad(d)}-${pad(m)}-${y}`;
  }

  // 2. If already in DD-MM-YYYY or DD/MM/YYYY or DD MMM YYYY format, keep as is
  if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(str) || /^\d{2}\s+[A-Za-z]{3}\s+\d{4}/.test(str)) {
    return str;
  }

  // 3. Fallback for Date objects or ISO strings
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return str;
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format to "DD MMM YYYY" (e.g., 20 Nov 2026) in Date Month Year order
 */
export function formatDateWords(dateInput) {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  if (!str || str === 'null' || str === 'undefined') return '';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [_, y, m, d] = ymdMatch;
    const mIdx = parseInt(m, 10) - 1;
    return `${pad(d)} ${monthNames[mIdx] || m} ${y}`;
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return str;
  const day = pad(d.getDate());
  const month = monthNames[d.getMonth()] || pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a Date object or ISO date string to "hh:mm AM/PM".
 */
export function formatTime(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${pad(hours)}:${minutes} ${ampm}`;
}

/**
 * Format a Date object or ISO date string to "DD-MM-YYYY hh:mm AM/PM" (Strict Date Month Year order)
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return formatDate(dateInput);
  return `${formatDate(d)} ${formatTime(d)}`;
}
