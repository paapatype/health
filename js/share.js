/* share.js — the cook handoff. Formats today's cooking as a message a
   person would actually send, then clipboard or native share sheet. */

import { data, menuFor, dayKey } from './data.js';

const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export function cookNote(d = new Date()) {
  const m = menuFor(d);
  const rules = data.menu.cook_rules;
  const lines = [
    `${DAY_NAMES[dayKey(d)]} —`,
    '',
    `Nashta: ${m.breakfast.cook ?? m.breakfast.name}`,
    `Lunch: ${m.lunch.cook ?? m.lunch.name}`,
    `Dinner: ${m.dinner.cook ?? m.dinner.name}`,
    '',
    rules.join('. ') + '.'
  ];
  return lines.join('\n');
}

export async function shareCookNote(d = new Date()) {
  const text = cookNote(d);
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      // fall through to clipboard
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

export async function copyCookNote(d = new Date()) {
  await navigator.clipboard.writeText(cookNote(d));
  return 'copied';
}
