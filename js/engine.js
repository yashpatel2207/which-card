// Pure logic: no DOM, no storage. Tested in tests/engine.test.mjs.
import { CATALOG, PROGRAMS } from './cards.js';
import { ROTATING } from './rotating.js';
import { catNoun } from './categories.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- dates ----------
export function quarterOf(date) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}
export function quarterStart(date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}
export function nextQuarterKey(date) {
  const s = quarterStart(date);
  return quarterOf(new Date(s.getFullYear(), s.getMonth() + 3, 1));
}
export function quarterLabel(key) {
  const [y, q] = key.split('-Q').map(Number);
  const m = (q - 1) * 3;
  return `${MONTHS[m]}–${MONTHS[m + 2]} ${y}`;
}
export function periodStart(date, period) {
  return period === 'month' ? new Date(date.getFullYear(), date.getMonth(), 1) : quarterStart(date);
}
export function periodKey(date, period) {
  return period === 'month' ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : quarterOf(date);
}
export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function shortDate(s) {
  const d = parseISODate(s);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : '';
}

// ---------- card lookup ----------
export function getCardDef(id, state) {
  return state?.cardEdits?.[id] || state?.customCards?.find(c => c.id === id) || CATALOG.find(c => c.id === id) || null;
}

export function rotatingFor(card, qKey, state) {
  if (!card?.rotating) return null;
  const program = ROTATING[card.rotating] || { name: `${card.name} 5%`, rate: 5, capNote: '' };
  const quarter = state?.rotatingOverrides?.[card.rotating]?.[qKey] || program.quarters?.[qKey];
  if (!quarter) return null;
  return { ...program, ...quarter, key: card.rotating, quarter: qKey, merchants: quarter.merchants || [], cats: quarter.cats || [] };
}

export function rotatingProgram(card) {
  return card?.rotating ? ROTATING[card.rotating] || { name: `${card.name} 5%`, rate: 5 } : null;
}

export function pointValue(card, settings) {
  return PROGRAMS[card.currency]?.points ? Number(settings?.pointValues?.[card.currency] ?? 1) : 1;
}
export function boostFactor(card, settings) {
  return card.boost === 'bofa' ? 1 + Number(settings?.bofaTier || 0) / 100 : 1;
}
export function isPoints(card) {
  return !!PROGRAMS[card.currency]?.points;
}

function hits(cats = [], merchants = [], place) {
  return cats.some(c => place.cats.includes(c)) || (!!place.merchant && merchants.includes(place.merchant));
}

// ---------- one card at one place ----------
export function evaluate(card, entry, place, ctx) {
  const settings = ctx.state?.settings || {};
  const q = quarterOf(ctx.date);
  const unit = isPoints(card) ? 'x' : '%';
  let rate = card.base ?? 1;
  let why = 'Everyday rate';
  let source = 'base';
  const notes = [];

  for (const rule of card.rules || []) {
    if (hits(rule.cats, rule.merchants, place) && rule.rate > rate) {
      rate = rule.rate;
      source = 'bonus';
      const m = place.merchant && (rule.merchants || []).includes(place.merchant)
        ? `m:${place.merchant}` : (rule.cats || []).find(c => place.cats.includes(c));
      why = `${trimNum(rule.rate)}${unit} on ${catNoun(m)}`;
    }
  }

  if (card.choice && entry?.picks) {
    for (const slot of card.choice.slots) {
      for (const optId of entry.picks[slot.id] || []) {
        const opt = slot.options.find(o => o.id === optId);
        if (opt && hits(opt.cats, [], place) && slot.rate > rate) {
          rate = slot.rate;
          source = 'pick';
          why = card.choice.auto ? `Your Custom Cash category: ${opt.label}` : `Your ${slot.rate}% pick: ${opt.label}`;
        }
      }
    }
  }

  const rot = rotatingFor(card, q, ctx.state);
  if (rot && hits(rot.cats, rot.merchants, place)) {
    rate = rate + (rot.rate - 1);
    source = 'rotating';
    why = `${rot.name} this quarter`;
    const activated = !!entry?.activated?.[q];
    if (!activated) {
      notes.push({
        kind: 'warn',
        text: rot.retroactive === false
          ? `Activate ${card.name} first. 5% only counts from the day you activate.`
          : `Activate ${card.name} by ${shortDate(rot.activateBy)} to get the 5%.`,
      });
    }
  }

  if (source === 'pick' && card.choice?.auto) {
    notes.push({ kind: 'info', text: 'Earns 5% only if this is your top category this billing cycle (up to $500).' });
  } else if (source === 'rotating' && rot?.capNote) {
    notes.push({ kind: 'info', text: rot.capNote });
  } else if ((source === 'bonus' || source === 'pick') && card.capNote) {
    notes.push({ kind: 'info', text: card.capNote });
  }

  const pv = pointValue(card, settings);
  const boost = boostFactor(card, settings);
  const value = rate * pv * boost;
  if (boost > 1) why += `, plus ${Math.round((boost - 1) * 100)}% BofA boost`;
  const blocked = !!(place.networks && !place.networks.includes(card.network));

  return { card, entry, rate, value, why, source, notes, blocked, boost, pv, points: isPoints(card) };
}

// ---------- rank the wallet ----------
export function rank(place, wallet, ctx) {
  const results = [];
  const blocked = [];
  wallet.forEach((entry, i) => {
    const card = getCardDef(entry.id, ctx.state);
    if (!card) return;
    const r = evaluate(card, entry, place, ctx);
    r.order = i;
    (r.blocked ? blocked : results).push(r);
  });
  const needsAction = r => r.notes.some(n => n.kind === 'warn') ? 1 : 0;
  results.sort((a, b) =>
    (b.value - a.value) || (needsAction(a) - needsAction(b)) || (a.points - b.points) || (a.order - b.order));
  return { results, blocked };
}

// ---------- formatting ----------
export function trimNum(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
// The big number is always an effective %, so cash and points cards compare directly.
export function headline(r) {
  return `${trimNum(r.value)}%`;
}
export function subline(r) {
  if (r.points) return `${trimNum(r.rate)}x ${PROGRAMS[r.card.currency]?.short || 'points'}, valued at ${trimNum(r.pv)}¢ each`;
  return '';
}

// ---------- pick suggestions ----------
// For every pick-your-category slot, choose the options that add the most over
// what the rest of the wallet already pays (including this quarter's rotating 5%).
export function suggest(wallet, ctx) {
  const state = ctx.state;
  const settings = state.settings || {};
  const spend = new Set(settings.spendCats || []);
  const weight = cat => (spend.size === 0 ? 1 : spend.has(cat) ? 1 : 0.1);

  const pairs = wallet.map(entry => ({ entry, card: getCardDef(entry.id, state) })).filter(p => p.card);
  const choicePairs = pairs.filter(p => p.card.choice);

  const allCats = new Set();
  choicePairs.forEach(p => p.card.choice.slots.forEach(s => s.options.forEach(o => o.cats.forEach(c => allCats.add(c)))));

  const best = {};
  for (const cat of allCats) {
    best[cat] = { value: 0, name: '', source: '' };
    for (const p of pairs) {
      const r = evaluate(p.card, { ...p.entry, picks: {} }, { cats: [cat], merchant: null }, ctx);
      if (r.value > best[cat].value) best[cat] = { value: r.value, name: p.card.name, source: r.source };
    }
  }

  const slots = [];
  for (const p of choicePairs) {
    for (const slot of p.card.choice.slots) {
      slots.push({ ...p, slot, slotValue: slot.rate * pointValue(p.card, settings) * boostFactor(p.card, settings) });
    }
  }
  slots.sort((a, b) => b.slotValue - a.slotValue);

  const out = {};
  for (const s of slots) {
    // Categories you spend on count fully (and add up); others only break ties.
    const scored = s.slot.options.map((opt, i) => {
      let ticked = 0;
      let other = 0;
      for (const cat of opt.cats) {
        const g = Math.max(0, s.slotValue - best[cat].value);
        if (weight(cat) === 1) ticked += g; else other = Math.max(other, g);
      }
      return { opt, gain: ticked + 0.1 * other, ticked, i };
    }).sort((a, b) => (b.gain - a.gain) || (a.i - b.i));

    const chosen = scored.slice(0, s.slot.pick);
    if (chosen.every(c => c.ticked <= 0)) {
      out[s.card.id] = out[s.card.id] || {};
      out[s.card.id][s.slot.id] = {
        picks: chosen.map(c => c.opt.id),
        reasons: [chosen.some(c => c.gain > 0)
          ? `Small difference this quarter. Your other cards already pay ${trimNum(s.slotValue)}% or more on what you spend on most, so this only helps with less common purchases.`
          : `It doesn't matter much this quarter. Your other cards already pay ${trimNum(s.slotValue)}% or more on all of these.`],
        covered: [],
      };
      markChosen(chosen, s, best);
      continue;
    }
    const reasons = chosen.map(({ opt, gain }) => {
      const main = [...opt.cats].sort((a, b) => weight(b) * (s.slotValue - best[b].value) - weight(a) * (s.slotValue - best[a].value))[0];
      const b = best[main];
      if (gain <= 0) return `${opt.label}: any choice works here, your other cards already pay ${trimNum(s.slotValue)}% or more`;
      return `${opt.label}: your best card for ${catNoun(main)} pays only ${trimNum(b.value)}% now (${b.name})`;
    });

    const covered = [];
    for (const { opt, gain } of scored.slice(s.slot.pick)) {
      const cat = opt.cats.find(c => spend.has(c));
      if (cat && gain <= 0 && best[cat].value >= s.slotValue) {
        covered.push(`${opt.label} is already ${trimNum(best[cat].value)}% on ${best[cat].name}${best[cat].source === 'rotating' ? ' this quarter' : ''}`);
      }
    }

    out[s.card.id] = out[s.card.id] || {};
    out[s.card.id][s.slot.id] = { picks: chosen.map(c => c.opt.id), reasons, covered: covered.slice(0, 3) };
    markChosen(chosen, s, best);
  }
  return out;
}

function markChosen(chosen, s, best) {
  for (const { opt } of chosen) {
    for (const cat of opt.cats) {
      if (s.slotValue > best[cat].value) best[cat] = { value: s.slotValue, name: `${s.card.name} (suggested)`, source: 'pick' };
    }
  }
}

// ---------- reminders ----------
export function reminderPeriod(card, settings) {
  const r = card.choice?.reminder;
  if (r === 'bofa') return settings?.bofaReminder === 'month' ? 'month' : 'quarter';
  return r || card.choice?.period || 'quarter';
}

export function picksComplete(card, entry) {
  return card.choice.slots.every(s => (entry.picks?.[s.id] || []).length === s.pick);
}

export function reminders(wallet, ctx) {
  const { date, state } = ctx;
  const settings = state.settings || {};
  const dismissed = state.dismissed || {};
  const q = quarterOf(date);
  const nq = nextQuarterKey(date);
  const lastMonthOfQuarter = date.getMonth() % 3 === 2;
  const lateInQuarter = lastMonthOfQuarter && date.getDate() >= 15;
  const list = [];

  for (const entry of wallet) {
    const card = getCardDef(entry.id, state);
    if (!card) continue;

    if (card.choice) {
      const period = reminderPeriod(card, settings);
      if (!picksComplete(card, entry)) {
        list.push({ id: `setup:${card.id}`, kind: 'setup', cardId: card.id, text: `Set your current picks for ${card.name}.` });
      } else {
        const confirmed = parseISODate(entry.confirmedAt);
        const id = `picks:${card.id}:${periodKey(date, period)}`;
        if ((!confirmed || confirmed < periodStart(date, period)) && !dismissed[id]) {
          const word = period === 'month' ? 'month' : 'quarter';
          list.push({ id, kind: 'picks', cardId: card.id, text: `New ${word}. Check your ${card.name} ${card.choice.auto ? 'category' : 'picks'}.` });
        }
      }
    }

    if (card.rotating) {
      const prog = rotatingProgram(card);
      const rot = rotatingFor(card, q, state);
      if (!rot) {
        const id = `missing:${card.id}:${q}`;
        if (!dismissed[id]) list.push({ id, kind: 'missing', cardId: card.id, quarter: q, text: `Add ${quarterLabel(q)} categories for ${card.name}.` });
      } else if (!entry.activated?.[q]) {
        const id = `activate:${card.id}:${q}`;
        if (!dismissed[id]) {
          list.push({
            id, kind: 'activate', cardId: card.id, quarter: q,
            text: `Activate ${prog.name} for ${quarterLabel(q)}${rot.activateBy ? ` by ${shortDate(rot.activateBy)}` : ''}.`,
          });
        }
      }

      if (lateInQuarter) {
        const next = rotatingFor(card, nq, state);
        const id = `next:${card.id}:${nq}`;
        if (!dismissed[id] && !entry.activated?.[nq]) {
          list.push(next
            ? { id, kind: 'activate', cardId: card.id, quarter: nq, text: `${quarterLabel(nq)} categories for ${card.name} are out. You can activate now.` }
            : { id, kind: 'missing', cardId: card.id, quarter: nq, text: `${card.name} usually announces ${quarterLabel(nq)} categories around now. Add them when they're out.` });
        }
      }
    }
  }
  const order = { setup: 0, activate: 1, picks: 2, missing: 3 };
  return list.sort((a, b) => order[a.kind] - order[b.kind]);
}

// ---------- short summary for lists ----------
export function summarize(card, entry, ctx) {
  const q = quarterOf(ctx.date);
  const parts = [];
  const rules = [...(card.rules || [])].sort((a, b) => b.rate - a.rate);
  const unit = isPoints(card) ? 'x' : '%';
  const rot = rotatingFor(card, q, ctx.state);
  if (rot) parts.push(`${rot.rate}% this quarter: ${rot.label}`);
  if (card.choice && entry?.picks) {
    for (const slot of card.choice.slots) {
      const labels = (entry.picks[slot.id] || []).map(id => slot.options.find(o => o.id === id)?.label).filter(Boolean);
      if (labels.length) parts.push(`${slot.rate}${unit} ${card.choice.auto ? 'plan' : 'picks'}: ${labels.join(' and ')}`);
    }
  }
  for (const r of rules.slice(0, 2)) {
    const names = [...(r.merchants || []).map(m => catNoun(`m:${m}`)), ...(r.cats || []).filter(c => c !== 'fast_food').map(catNoun)];
    const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} and more` : names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
    parts.push(`${trimNum(r.rate)}${unit} on ${list}`);
  }
  parts.push(`${trimNum(card.base)}${unit} on everything${parts.length ? ' else' : ''}`);
  return parts.join('. ') + '.';
}
