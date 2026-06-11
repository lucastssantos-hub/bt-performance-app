// ui.js — toasts, modais, confirmação e formatação (mantém a identidade visual do protótipo)

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DIAS_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function fmtShort(dateStr) { const d = new Date(dateStr + 'T12:00:00'); return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`; }
export function fmtDow(dateStr) { return DIAS[new Date(dateStr + 'T12:00:00').getDay()]; }
export function fmtDowLong(dateStr) { return DIAS_LONGO[new Date(dateStr + 'T12:00:00').getDay()]; }
export function fmtDayNum(dateStr) { return String(new Date(dateStr + 'T12:00:00').getDate()).padStart(2, '0'); }
export function fmtRange(a, b) { return `${fmtShort(a).split(' ')[0]}–${fmtShort(b)}`; }
export function fmtTimeAgo(ts) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)} dia${h >= 48 ? 's' : ''}`;
}
export function fmtHoursMin(h) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h ${String(mm).padStart(2, '0')}m`; }

// ── toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
export function toast(msg, kind = 'ok') {
  const host = document.getElementById('toast-host');
  const color = kind === 'err' ? '#FF5D5D' : kind === 'warn' ? '#FFC24B' : '#34E0A1';
  host.innerHTML = `<div class="toast" style="border-color:${color}55;"><span style="color:${color};font-weight:800;">${kind === 'err' ? '✕' : kind === 'warn' ? '!' : '✓'}</span><span>${esc(msg)}</span></div>`;
  host.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { host.style.display = 'none'; host.innerHTML = ''; }, 2600);
}

// ── modal ────────────────────────────────────────────────────────────────────
export function openModal(title, bodyHtml, { submitLabel = 'Salvar', onSubmit = null, danger = false } = {}) {
  const host = document.getElementById('modal-host');
  host.innerHTML = `
    <div class="modal-backdrop" data-action="modal-close"></div>
    <div class="modal-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;">${esc(title)}</div>
        <div class="tap backbtn" data-action="modal-close" style="width:32px;height:32px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4F6F8" stroke-width="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg></div>
      </div>
      <form id="modal-form">${bodyHtml}
        ${onSubmit ? `<button type="submit" class="tap btn-primary" style="margin-top:18px;${danger ? 'background:#FF5D5D;' : ''}">${esc(submitLabel)}</button>` : ''}
      </form>
    </div>`;
  host.style.display = 'block';
  const form = host.querySelector('#modal-form');
  if (onSubmit) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    onSubmit(data, form);
  });
  return form;
}
export function closeModal() { const host = document.getElementById('modal-host'); host.style.display = 'none'; host.innerHTML = ''; }

export function confirmDialog(msg, { okLabel = 'Confirmar', danger = true } = {}) {
  return new Promise((resolve) => {
    openModal('Confirmar', `<div style="font-size:14.5px;color:#C7CFDA;line-height:1.5;margin:2px 0 4px;">${esc(msg)}</div>
      <div style="display:flex;gap:10px;margin-top:18px;">
        <button type="button" class="tap btn-primary" id="cf-ok" style="${danger ? 'background:#FF5D5D;' : ''}flex:1;">${esc(okLabel)}</button>
        <button type="button" class="tap btn-dark" id="cf-cancel" style="flex:1;">Cancelar</button>
      </div>`);
    document.getElementById('cf-ok').onclick = () => { closeModal(); resolve(true); };
    document.getElementById('cf-cancel').onclick = () => { closeModal(); resolve(false); };
  });
}

// ── campos de formulário ─────────────────────────────────────────────────────
export const field = (label, inner) => `<label class="f-label">${esc(label)}${inner}</label>`;
export const input = (name, { type = 'text', value = '', placeholder = '', required = true, step = '', min = '', max = '' } = {}) =>
  `<input class="f-input" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${step ? `step="${step}"` : ''} ${min !== '' ? `min="${min}"` : ''} ${max !== '' ? `max="${max}"` : ''}>`;
export const select = (name, options, selected = '') =>
  `<select class="f-input" name="${name}">${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
export const textarea = (name, { value = '', placeholder = '' } = {}) =>
  `<textarea class="f-input" name="${name}" rows="2" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;

// ── pedaços visuais compartilhados ──────────────────────────────────────────
export function ring(value, color, size = 74, inner = 58, fontSize = 22, sub = '') {
  const pct = Math.max(0, Math.min(100, value));
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:conic-gradient(${color} 0 ${pct}%,#1C232C 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <div style="width:${inner}px;height:${inner}px;border-radius:50%;background:#0D1015;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <span style="font-family:'Space Grotesk';font-weight:700;font-size:${fontSize}px;color:${color};">${value}</span>${sub ? `<span style="font-size:9px;color:#5A6472;letter-spacing:.1em;">${sub}</span>` : ''}
    </div></div>`;
}
export const avatar = (initials, size = 46, grad = 'linear-gradient(135deg,#2A323D,#3A4350)', color = '#F4F6F8', radius = '50%') =>
  `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${grad};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(size / 3)}px;color:${color};flex-shrink:0;">${esc(initials)}</div>`;
export const initialsOf = (name) => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
