/* ==========================================================================
   FRANC BARBER — Serviços e lógica de agendamento
   Sem backend: a "disponibilidade" é calculada 100% no navegador a partir
   de uma lista de horários já ocupados (ver OCCUPIED_BY_DATE mais abaixo).
   ========================================================================== */

/* ------------------------------ Dados -------------------------------- */

// Fonte única dos serviços: usada tanto na vitrine (#servicos-grid)
// quanto no passo 1 do agendamento.
const SERVICES = [
  { id: 'corte',       name: 'Corte Masculino', duration: 30, price: 45 },
  { id: 'barba',       name: 'Barba',           duration: 20, price: 35 },
  { id: 'corte-barba', name: 'Corte + Barba',   duration: 50, price: 70 },
  { id: 'sobrancelha', name: 'Sobrancelha',     duration: 15, price: 20 },
  { id: 'pigmentacao', name: 'Pigmentação',     duration: 40, price: 60 },
  { id: 'combo-completo', name: 'Corte + Barba + Pigmentação', duration: 90, price: 145 },
];

// Horário de funcionamento, em minutos desde 00:00 (facilita comparar horários).
const OPENING_MIN = 9 * 60;   // 09:00
const CLOSING_MIN = 19 * 60;  // 19:00
const CLOSED_WEEKDAY = 0;     // 0 = domingo (Date.getDay())

// Grade fixa de horários possíveis: um novo horário a cada 30min,
// independente da duração do serviço (duração só decide se ele "cabe").
const SLOT_STEP_MIN = 30;

// Antecedência mínima para agendar no mesmo dia (evita marcar "agora mesmo").
const MIN_NOTICE_MIN = 30;

/* ------------------------ Simulação de agenda -------------------------
   Sem backend, então simulamos uma agenda com alguns horários já
   ocupados. As datas são calculadas em relação a "hoje" para que a
   demonstração funcione em qualquer dia em que o site for aberto.
   ------------------------------------------------------------------- */

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Formata como YYYY-MM-DD usando o horário local (evita o bug clássico
// de usar toISOString(), que converte pra UTC e pode "voltar" um dia).
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const today = new Date();

const RAW_BOOKINGS = [
  // Hoje: alguns horários espalhados já ocupados...
  { date: toISODate(today), time: '10:00', duration: 30 },
  { date: toISODate(today), time: '11:00', duration: 50 },
  { date: toISODate(today), time: '15:30', duration: 20 },
  // ...e um coladinho no fechamento, pra provar que um serviço longo
  // não pode "vazar" para depois das 19h.
  { date: toISODate(today), time: '18:30', duration: 30 },

  // Amanhã: manhã cheia, com agendamentos encostados um no outro
  // (testa a detecção de sobreposição entre intervalos).
  { date: toISODate(addDays(today, 1)), time: '09:00', duration: 30 },
  { date: toISODate(addDays(today, 1)), time: '09:30', duration: 30 },
  { date: toISODate(addDays(today, 1)), time: '10:00', duration: 40 },
  { date: toISODate(addDays(today, 1)), time: '10:40', duration: 20 },
  { date: toISODate(addDays(today, 1)), time: '13:00', duration: 50 },

  // Depois de amanhã: dia tranquilo, só um horário ocupado.
  { date: toISODate(addDays(today, 2)), time: '16:00', duration: 30 },
];

// Converte a lista acima num mapa { 'YYYY-MM-DD': [{start, end}, ...] }
// com os horários já em minutos, pronto para checar sobreposição.
const OCCUPIED_BY_DATE = RAW_BOOKINGS.reduce((map, booking) => {
  const start = timeToMinutes(booking.time);
  const end = start + booking.duration;
  if (!map[booking.date]) map[booking.date] = [];
  map[booking.date].push({ start, end });
  return map;
}, {});

/* ------------------------ Lógica de disponibilidade -------------------- */

// Gera os horários livres para uma data + duração de serviço.
// Estratégia: percorre a grade fixa de 30min dentro do funcionamento e,
// para cada candidato, testa se o intervalo [start, start+duration)
// colide com algum intervalo já ocupado naquele dia.
function getAvailableSlots(dateStr, duration) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (dateObj.getDay() === CLOSED_WEEKDAY) return [];

  const occupied = OCCUPIED_BY_DATE[dateStr] || [];
  const isToday = dateStr === toISODate(new Date());
  const now = new Date();
  const earliestAllowed = isToday ? now.getHours() * 60 + now.getMinutes() + MIN_NOTICE_MIN : -Infinity;

  const slots = [];
  for (let start = OPENING_MIN; start + duration <= CLOSING_MIN; start += SLOT_STEP_MIN) {
    if (start < earliestAllowed) continue;

    const end = start + duration;
    const overlaps = occupied.some((occ) => start < occ.end && end > occ.start);
    if (!overlaps) slots.push(minutesToTime(start));
  }
  return slots;
}

function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/* ------------------------------ Renderização --------------------------- */

function renderServicosGrid() {
  const grid = document.getElementById('servicos-grid');
  if (!grid) return;

  grid.innerHTML = SERVICES.map((service) => `
    <article class="servico-card">
      <i data-lucide="scissors" class="servico-icon"></i>
      <h3 class="servico-nome">${service.name}</h3>
      <p class="servico-duracao">${service.duration} min</p>
      <p class="servico-preco">R$ ${service.price}</p>
    </article>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderServiceOptions() {
  const container = document.getElementById('service-options');
  if (!container) return;

  container.innerHTML = SERVICES.map((service) => `
    <button
      type="button"
      class="service-option"
      data-service-id="${service.id}"
      role="radio"
      aria-checked="false"
    >
      <span class="service-option-name">${service.name}</span>
      <span class="service-option-meta">${service.duration} min · R$ ${service.price}</span>
    </button>
  `).join('');
}

/* ------------------------------ Interação ------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  renderServicosGrid();
  renderServiceOptions();

  const serviceOptionsContainer = document.getElementById('service-options');
  const dateInput = document.getElementById('input-date');
  const timeSlotsContainer = document.getElementById('time-slots');
  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const summaryBox = document.getElementById('booking-summary');
  const confirmBtn = document.getElementById('btn-confirm');
  const form = document.getElementById('form-agendamento');

  let selectedServiceId = null;
  let selectedTime = null;

  // Limita a data selecionável entre hoje e daqui a 30 dias.
  const todayISO = toISODate(new Date());
  dateInput.min = todayISO;
  dateInput.max = toISODate(addDays(new Date(), 30));
  dateInput.value = todayISO;

  function getSelectedService() {
    return SERVICES.find((s) => s.id === selectedServiceId) || null;
  }

  function updateSummaryAndButton() {
    const service = getSelectedService();
    const dateStr = dateInput.value;
    const name = nameInput.value.trim();
    const phoneDigits = phoneInput.value.replace(/\D/g, '');

    const isComplete = Boolean(service && dateStr && selectedTime);
    const isValid = isComplete && name.length >= 2 && phoneDigits.length >= 10;

    confirmBtn.disabled = !isValid;

    if (isComplete) {
      summaryBox.hidden = false;
      summaryBox.innerHTML = `<strong>Resumo:</strong> ${service.name} · ${formatDateBR(dateStr)} às ${selectedTime}`;
    } else {
      summaryBox.hidden = true;
    }
  }

  function renderTimeSlots() {
    const service = getSelectedService();
    const dateStr = dateInput.value;
    selectedTime = null;
    timeSlotsContainer.innerHTML = '';

    if (!service) {
      timeSlotsContainer.innerHTML = '<p class="time-slots-placeholder">Escolha um serviço para ver os horários.</p>';
      updateSummaryAndButton();
      return;
    }
    if (!dateStr) {
      timeSlotsContainer.innerHTML = '<p class="time-slots-placeholder">Escolha uma data para ver os horários.</p>';
      updateSummaryAndButton();
      return;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday === CLOSED_WEEKDAY) {
      timeSlotsContainer.innerHTML = '<p class="time-slots-empty">Fechado aos domingos. Escolha outra data.</p>';
      updateSummaryAndButton();
      return;
    }

    const slots = getAvailableSlots(dateStr, service.duration);
    if (slots.length === 0) {
      timeSlotsContainer.innerHTML = '<p class="time-slots-empty">Nenhum horário disponível nessa data para este serviço. Tente outra data.</p>';
      updateSummaryAndButton();
      return;
    }

    slots.forEach((time) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-slot';
      btn.textContent = time;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.addEventListener('click', () => {
        timeSlotsContainer.querySelectorAll('.time-slot').forEach((b) => {
          b.classList.remove('is-selected');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('is-selected');
        btn.setAttribute('aria-checked', 'true');
        selectedTime = time;
        updateSummaryAndButton();
      });
      timeSlotsContainer.appendChild(btn);
    });

    updateSummaryAndButton();
  }

  serviceOptionsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.service-option');
    if (!btn) return;

    serviceOptionsContainer.querySelectorAll('.service-option').forEach((b) => {
      b.classList.remove('is-selected');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('is-selected');
    btn.setAttribute('aria-checked', 'true');
    selectedServiceId = btn.dataset.serviceId;

    renderTimeSlots();
  });

  dateInput.addEventListener('change', renderTimeSlots);

  // Máscara simples de telefone BR: (11) 91234-5678
  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    phoneInput.value = formatted;
    updateSummaryAndButton();
  });

  nameInput.addEventListener('input', updateSummaryAndButton);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const service = getSelectedService();
    if (!service || !dateInput.value || !selectedTime) return;

    const message = [
      'Olá! Gostaria de agendar um horário na Franc Barber:',
      '',
      `Serviço: ${service.name}`,
      `Data: ${formatDateBR(dateInput.value)}`,
      `Horário: ${selectedTime}`,
      `Nome: ${nameInput.value.trim()}`,
    ].join('\n');

    // TODO: substituir pelo número real da barbearia (formato: 55DDDNUMERO, só dígitos).
    const SHOP_WHATSAPP_NUMBER = '5511999999999';
    const url = `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  });

  // Primeira renderização (nenhum serviço selecionado ainda).
  renderTimeSlots();
});
