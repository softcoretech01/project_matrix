// src/utils/helpers.js
// Reusable date and API helper functions for ProjectMatrix

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];



/**
 * Normalize a date value from MySQL (which may be ISO string) to "YYYY-MM-DD"
 * for use in <input type="date"> value attributes.
 */
export function toInputDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Build standard headers for API requests, including x-user-id.
 * @param {object} user - The authenticated user object with user.id
 * @param {boolean} json - Whether to include Content-Type: application/json
 */
export function apiHeaders(user, json = false) {
  const headers = {};
  if (user && user.id) {
    headers['x-user-id'] = user.id;
  }
  if (json) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}
