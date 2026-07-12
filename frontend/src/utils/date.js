// src/utils/date.js
// Centralized date and time formatting utilities
// Desired formats:
//   Date: DD-MMM-YYYY (e.g., 02-Jul-2026)
//   Time: hh:mm AM/PM (e.g., 03:45 PM)
//   DateTime: DD-MMM-YYYY hh:mm AM/PM

/**
 * Pad a number with leading zeros to reach the desired length.
 */
function pad(num, size = 2) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Format a Date object or ISO date string to "DD-MMM-YYYY".
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d)) return '';
  const day = pad(d.getDate());
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format a Date object or ISO date string to "hh:mm AM/PM".
 */
export function formatTime(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d)) return '';
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${pad(hours)}:${minutes} ${ampm}`;
}

/**
 * Format a Date object or ISO date string to "DD-MMM-YYYY hh:mm AM/PM".
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d)) return '';
  return `${formatDate(d)} ${formatTime(d)}`;
}
