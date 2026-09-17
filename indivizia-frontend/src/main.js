const API_URL = import.meta.env.VITE_API_URL ?? "/api/split";
const STORAGE_KEY = "indivizia_events";
const ACTIVE_EVENT_KEY = "indivizia_active_event";
const MODE_KEY = "indivizia_mode";

const iconosCategoria = {
  Herramientas: "🔧",
  Insumos: "📇",
  Pasajes: "🚗",
  Otros: "📦",
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let categoriaSeleccionada = "Insumos";
let tipoEventoSeleccionado = "Asado";
let resultadoActual = null;
let editingExpenseIndex = null;
let nameFilter = "";
let filterPanelOpen = false;
let currentMode = localStorage.getItem(MODE_KEY) === "simple" ? "simple" : "massive";
let events = loadEvents();
let activeEventId = localStorage.getItem(ACTIVE_EVENT_KEY) ?? events[0].id;

if (!events.some((event) => event.id === activeEventId)) {
  activeEventId = events[0].id;
}

let expenses = activeEvent().expenses;

const $ = (selector) => document.querySelector(selector);

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const AUTO_GUEST_REGEX = /^invitado\s+(\d+)$/i;

function normalizeAutoGuestLabel(name) {
  const match = name.trim().match(AUTO_GUEST_REGEX);
  return match ? `Invitado ${Number(match[1])}` : "";
}

function hydrateExpense(expense) {
  const autoGuest = expense.autoGuest || normalizeAutoGuestLabel(expense.paidBy ?? "");
  return autoGuest ? { ...expense, autoGuest } : { ...expense };
}

function loadEvents() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(savedEvents) && savedEvents.length > 0) {
      return savedEvents.map((event) => ({
        ...event,
        expenses: Array.isArray(event.expenses) ? event.expenses.map(hydrateExpense) : [],
        aliases: event.aliases && typeof event.aliases === "object" ? event.aliases : {},
      }));
    }
  } catch (error) {
    console.warn("No se pudieron recuperar los eventos guardados.", error);
  }

  return [
    {
      id: crypto.randomUUID(),
      name: "Mi primera vaca",
      type: "Juntada",
      estimatedPeople: 10,
      aliases: {},
      expenses: [],
    },
  ];
}

function activeEvent() {
  return events.find((event) => event.id === activeEventId) ?? events[0];
}

function saveState() {
  activeEvent().expenses = expenses;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  localStorage.setItem(ACTIVE_EVENT_KEY, activeEventId);
}

function canonicalName(name) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2400);
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function setMode(mode) {
  currentMode = mode;
  localStorage.setItem(MODE_KEY, mode);
  document.body.dataset.mode = mode;

  const simpleMode = mode === "simple";
  $("#btnModoSimple").classList.toggle("active", simpleMode);
  $("#btnModoMasivo").classList.toggle("active", !simpleMode);
  $("#eventSummary").hidden = simpleMode;
  $("#batchSection").hidden = simpleMode;
  $("#btnNuevoEvento").hidden = simpleMode;
  $("#modeLabel").textContent = simpleMode ? "Modo Simple" : "Modo Vaca Masiva";
  $("#modeDescription").textContent = simpleMode
    ? "División rápida de gastos cotidianos. Agrega con monto $0 a quien no haya pagado."
    : "La vaca masiva para grupos donde muchos consumen y pocos pagan.";
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAutoGuestLabel(name) {
  const key = canonicalName(name);
  const expense = expenses.find((item) => canonicalName(item.paidBy) === key);
  return expense?.autoGuest || normalizeAutoGuestLabel(name);
}

function displayPersonName(name) {
  const autoGuest = getAutoGuestLabel(name);
  if (autoGuest && canonicalName(autoGuest) !== canonicalName(name)) {
    return `${name} (${autoGuest})`;
  }
  return name;
}

function autoGuestHue(label) {
  const number = Number(label.match(/\d+/)?.[0] || 0);
  return (number * 47) % 360;
}

function isAutoGuestExpense(expense) {
  return Boolean(expense.autoGuest || normalizeAutoGuestLabel(expense.paidBy));
}

function appendGroupTitle(container, title) {
  container.append(createElement("p", "expense-group-title", title));
}

function getPeopleSummary() {
  const totals = new Map();
  expenses.forEach((expense) => {
    const key = canonicalName(expense.paidBy);
    const current = totals.get(key) ?? { name: expense.paidBy, total: 0 };
    current.total += Number(expense.amount);
    totals.set(key, current);
  });
  return [...totals.values()];
}

function isNameFilterActive() {
  return Boolean(canonicalName(nameFilter));
}

function getVisibleExpenses() {
  const query = canonicalName(nameFilter);
  return expenses
    .map((expense, index) => ({ expense, index }))
    .filter(({ expense }) => !query || canonicalName(expense.paidBy).includes(query));
}

function uniquePeopleNames() {
  const seen = new Set();
  const names = [];

  expenses.forEach((expense) => {
    const key = canonicalName(expense.paidBy);
    if (!seen.has(key)) {
      seen.add(key);
      names.push(expense.paidBy);
    }
  });

  return names.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

function resetNameFilter() {
  nameFilter = "";
  filterPanelOpen = false;
  const input = $("#inputFiltroNombre");
  if (input) input.value = "";
}

function renderNameFilter() {
  const filterButton = $("#btnFiltrarNombres");
  const panel = $("#filtroNombresPanel");
  const clearFilterButton = $("#btnQuitarFiltro");
  const chips = $("#nameFilterChips");
  const filtering = isNameFilterActive();
  const names = uniquePeopleNames();

  if (filterButton) {
    filterButton.hidden = expenses.length === 0;
    filterButton.classList.toggle("active", filterPanelOpen || filtering);
  }

  if (panel) panel.hidden = expenses.length === 0 || (!filterPanelOpen && !filtering);
  if (clearFilterButton) clearFilterButton.hidden = !filtering;

  if (!chips) return;

  chips.replaceChildren();
  chips.hidden = names.length === 0 || panel?.hidden;

  names.forEach((name) => {
    const chip = createElement("button", "name-chip", name);
    chip.type = "button";
    chip.dataset.name = name;
    chip.classList.toggle("active", canonicalName(name) === canonicalName(nameFilter));
    chips.append(chip);
  });
}

function renderSummary() {
  const people = getPeopleSummary();
  const buyers = people.filter((person) => person.total > 0).length;
  const consumers = people.length - buyers;
  const subtotal = expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  const estimatedPeople = Number(activeEvent().estimatedPeople) || people.length;

  $("#nombreEvento").textContent = activeEvent().name;
  $("#badgePersonas").textContent = `👥 ${people.length}/${estimatedPeople} personas`;
  $("#cantidadCompradores").textContent = buyers;
  $("#cantidadNoCompraron").textContent = consumers;
  $("#pozoActual").textContent = formatMoney(subtotal);
  $("#subtotalValue").textContent = formatMoney(subtotal);
  $("#countGastos").textContent = expenses.length;
  $("#resumenNoCompraron").textContent =
    consumers === 0
      ? "Ninguna persona agregada en $0."
      : `${consumers} ${consumers === 1 ? "persona agregada" : "personas agregadas"} en $0.`;
}

function createExpenseRow(expense, index) {
  const autoGuest = expense.autoGuest || normalizeAutoGuestLabel(expense.paidBy);
  const row = createElement("article", `expense-item${autoGuest ? " auto-guest-expense" : ""}`);
  const info = createElement("div", "expense-info");
  const icon = createElement("div", "expense-icon", iconosCategoria[expense.category] ?? "📦");
  const details = createElement("div");
  const name = createElement("span", "expense-name", expense.paidBy);
  if (autoGuest) {
    name.append(
      createElement(
        "span",
        "guest-badge",
        canonicalName(autoGuest) === canonicalName(expense.paidBy) ? "Automático" : autoGuest,
      ),
    );
  }
  const category = createElement("span", "expense-tag", expense.category);
  const description = createElement("div", "expense-desc", expense.description);
  const right = createElement("div", "expense-right");
  const amount = createElement("span", "expense-amount", formatMoney(expense.amount));
  const editButton = createElement("button", "delete-btn edit-expense-btn");
  const deleteButton = createElement("button", "delete-btn");

  editButton.type = "button";
  editButton.dataset.index = String(index);
  editButton.setAttribute("aria-label", `Editar gasto de ${expense.paidBy}`);
  editButton.append(createElement("span", "material-symbols-outlined", "edit"));
  deleteButton.type = "button";
  deleteButton.dataset.index = String(index);
  deleteButton.setAttribute("aria-label", `Eliminar gasto de ${expense.paidBy}`);
  deleteButton.append(createElement("span", "material-symbols-outlined", "delete"));

  name.append(category);
  details.append(name, description);

  if (autoGuest) {
    const rename = createElement("div", "guest-rename");
    const input = createElement("input", "guest-name-input");
    const saveButton = createElement("button", "save-guest-name-btn", "Poner nombre");
    const unnamed = canonicalName(expense.paidBy) === canonicalName(autoGuest);
    input.type = "text";
    input.value = unnamed ? "" : expense.paidBy;
    input.placeholder = `Nombre de ${autoGuest}`;
    input.setAttribute("aria-label", `Nombre de ${autoGuest}`);
    input.dataset.person = expense.paidBy;
    saveButton.type = "button";
    saveButton.dataset.person = expense.paidBy;
    rename.append(input, saveButton);
    details.append(rename);
  }

  info.append(icon, details);
  right.append(amount, editButton, deleteButton);
  row.append(info, right);
  return row;
}

function renderExpenses() {
  const container = $("#expensesList");
  const visibleExpenses = getVisibleExpenses();
  container.replaceChildren();
  container.classList.toggle("empty-list", visibleExpenses.length === 0);
  const clearBtn = $("#btnLimpiarGastos");
  if (clearBtn) clearBtn.hidden = expenses.length === 0;
  renderNameFilter();

  if (expenses.length === 0) {
    container.append(createElement("p", "", "Todavía no has agregado gastos."));
    renderSummary();
    return;
  }

  if (visibleExpenses.length === 0) {
    container.append(
      createElement(
        "p",
        "",
        `Ningún gasto coincide con “${nameFilter.trim()}”. Los datos siguen guardados.`,
      ),
    );
    renderSummary();
    $("#countGastos").textContent = `0/${expenses.length}`;
    return;
  }

  const loadedExpenses = visibleExpenses.filter(({ expense }) => !isAutoGuestExpense(expense));
  const guestExpenses = visibleExpenses.filter(({ expense }) => isAutoGuestExpense(expense));
  const splitGroups = loadedExpenses.length > 0 && guestExpenses.length > 0;

  if (splitGroups) {
    appendGroupTitle(container, "Gastos que ya estaban");
    loadedExpenses.forEach(({ expense, index }) => container.append(createExpenseRow(expense, index)));
    appendGroupTitle(container, "Invitados automáticos");
    guestExpenses.forEach(({ expense, index }) => container.append(createExpenseRow(expense, index)));
  } else {
    visibleExpenses.forEach(({ expense, index }) => container.append(createExpenseRow(expense, index)));
  }

  renderSummary();
  if (isNameFilterActive()) {
    $("#countGastos").textContent = `${visibleExpenses.length}/${expenses.length}`;
  }
}

$("#categoryPills").addEventListener("click", (event) => {
  const pill = event.target.closest(".pill");
  if (!pill) return;

  document.querySelectorAll(".pill").forEach((item) => item.classList.remove("active"));
  pill.classList.add("active");
  categoriaSeleccionada = pill.dataset.value;
});

document
  .querySelector(`.pill[data-value="${categoriaSeleccionada}"]`)
  .classList.add("active");

$("#btnModoSimple").addEventListener("click", () => setMode("simple"));
$("#btnModoMasivo").addEventListener("click", () => setMode("massive"));

$("#expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const paidBy = $("#inputPaidBy").value.trim().replace(/\s+/g, " ");
  const description = $("#inputDescription").value.trim();
  const rawAmount = $("#inputAmount").value;
  const amount = Number(rawAmount);
  const alias = $("#inputAlias").value.trim();

  if (!paidBy || rawAmount === "" || !Number.isFinite(amount) || amount < 0) {
    showToast("Completá quién pagó y un monto válido.");
    return;
  }

  if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-8) {
    showToast("El monto puede tener como máximo dos decimales.");
    return;
  }

  const expense = {
    paidBy,
    description: description || "Sin descripción",
    category: categoriaSeleccionada,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
  };

  if (editingExpenseIndex === null) {
    expenses.push(expense);
  } else {
    const previous = expenses[editingExpenseIndex];
    const autoGuest = previous.autoGuest || normalizeAutoGuestLabel(previous.paidBy);
    expenses[editingExpenseIndex] = autoGuest ? { ...expense, autoGuest } : expense;
  }

  if (alias) {
    activeEvent().aliases ??= {};
    activeEvent().aliases[canonicalName(paidBy)] = alias;
  }

  event.currentTarget.reset();
  finishExpenseEditing();
  $("#inputPaidBy").focus();
  saveState();
  renderExpenses();
});

$("#expensesList").addEventListener("click", (event) => {
  const guestButton = event.target.closest(".save-guest-name-btn");
  if (guestButton) {
    const row = guestButton.closest(".expense-item");
    const input = row?.querySelector(".guest-name-input");
    renameAutoGuest(guestButton.dataset.person, input?.value ?? "");
    return;
  }

  const editButton = event.target.closest(".edit-expense-btn");
  if (editButton) {
    startExpenseEditing(Number(editButton.dataset.index));
    return;
  }

  const button = event.target.closest(".delete-btn");
  if (!button) return;

  const deletedIndex = Number(button.dataset.index);
  expenses.splice(deletedIndex, 1);
  if (editingExpenseIndex !== null) finishExpenseEditing();
  resultadoActual = null;
  $("#resultados").hidden = true;
  saveState();
  renderExpenses();
});

$("#expensesList").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest(".guest-name-input");
  if (!input) return;

  event.preventDefault();
  renameAutoGuest(input.dataset.person, input.value);
});

function startExpenseEditing(index) {
  const expense = expenses[index];
  if (!expense) return;

  editingExpenseIndex = index;
  $("#inputPaidBy").value = expense.paidBy;
  $("#inputDescription").value = expense.description;
  $("#inputAmount").value = expense.amount;
  $("#inputAlias").value = getAlias(expense.paidBy);
  categoriaSeleccionada = expense.category;
  document.querySelectorAll(".pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.value === categoriaSeleccionada);
  });
  $("#btnAgregarGastoTexto").textContent = "Guardar cambios";
  $("#btnCancelarEdicion").hidden = false;
  $("#expenseForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function finishExpenseEditing() {
  editingExpenseIndex = null;
  $("#btnAgregarGastoTexto").textContent = "Agregar gasto";
  $("#btnCancelarEdicion").hidden = true;
}

$("#btnCancelarEdicion").addEventListener("click", () => {
  $("#expenseForm").reset();
  finishExpenseEditing();
});

$("#btnAgregarNoCompraron").addEventListener("click", () => {
  const names = $("#inputNoCompraron")
    .value.split(/,|\n/)
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (names.length === 0) {
    showToast("Pega al menos un nombre.");
    return;
  }

  const existingNames = new Set(expenses.map((expense) => canonicalName(expense.paidBy)));
  const uniqueBatch = [];

  names.forEach((name) => {
    const key = canonicalName(name);
    if (!existingNames.has(key)) {
      existingNames.add(key);
      uniqueBatch.push(name);
    }
  });

  uniqueBatch.forEach((name) => {
    expenses.push({
      paidBy: name,
      description: "No compró",
      category: "Otros",
      amount: 0,
    });
  });

  $("#inputNoCompraron").value = "";
  saveState();
  renderExpenses();
  showToast(
    uniqueBatch.length > 0
      ? `${uniqueBatch.length} personas agregadas.`
      : "Esas personas ya estaban cargadas.",
  );
});

$("#btnLimpiarNombres").addEventListener("click", () => {
  $("#inputNoCompraron").value = "";
});

$("#btnPegarNombres").addEventListener("click", async () => {
  try {
    $("#inputNoCompraron").value = await navigator.clipboard.readText();
  } catch {
    showToast("El navegador no permitió leer el portapapeles.");
  }
});

$("#btnAgregarCantidad").addEventListener("click", () => {
  const input = $("#inputCantidadNoCompraron");
  const cantidad = parseInt(input.value, 10);

  if (isNaN(cantidad) || cantidad <= 0) {
    showToast("Ingresa un número válido de personas.");
    return;
  }

  const regex = /^invitado\s+(\d+)$/i;
  let maxIndex = 0;
  expenses.forEach((e) => {
    const match = e.paidBy.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIndex) maxIndex = num;
    }
  });

  for (let i = 1; i <= cantidad; i++) {
    const autoGuest = `Invitado ${maxIndex + i}`;
    expenses.push({
      paidBy: autoGuest,
      description: "No compró",
      category: "Otros",
      amount: 0,
      autoGuest,
    });
  }

  input.value = "";
  saveState();
  renderExpenses();
  showToast(
    `${cantidad} ${cantidad === 1 ? "invitado agregado" : "invitados agregados"} en $0.`,
  );
});

$("#btnCalcular").addEventListener("click", async () => {
  if (expenses.length === 0) {
    showToast("Agrega al menos un gasto primero.");
    return;
  }

  const button = $("#btnCalcular");
  button.disabled = true;
  $("#btnCalcularTexto").textContent = "Calculando...";
  clearQuotas({ confirm: false, silent: true });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        expenses.map((expense) => ({
          ...expense,
          amount: Math.round((Number(expense.amount) + Number.EPSILON) * 100) / 100,
        })),
      ),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error ?? `El servidor respondió ${response.status}.`);
    }

    resultadoActual = body;
    showResults(body);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof TypeError
        ? "No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose."
        : error.message;
    showToast(`No se pudo calcular: ${message}`);
  } finally {
    button.disabled = false;
    $("#btnCalcularTexto").textContent = "Calcular la vaca";
  }
});

function createBalanceRow(person) {
  const autoGuest = getAutoGuestLabel(person.name);
  const row = createElement("article", `balance-item${autoGuest ? " auto-guest-row" : ""}`);
  const left = createElement("div", "balance-left");
  const avatar = createElement("div", `avatar${autoGuest ? " auto-guest" : ""}`, initials(person.name));
  const details = createElement("div");
  const name = createElement("div", "balance-name", person.name);
  if (autoGuest) {
    avatar.style.background = `hsl(${autoGuestHue(autoGuest)} 52% 42%)`;
    name.append(createElement("span", "guest-badge", autoGuest));
  }
  const paid = createElement(
    "div",
    "balance-paid",
    `Pagó ${formatMoney(person.totalPaid)} · Cuota ${formatMoney(person.fairShare)}`,
  );
  const balance = Number(person.balance);
  const chipClass =
    balance > 0 ? "chip-positive" : balance < 0 ? "chip-negative" : "chip-neutral";
  const chipText =
    balance > 0
      ? `Le deben ${formatMoney(balance)}`
      : balance < 0
        ? `Debe ${formatMoney(Math.abs(balance))}`
        : "Está saldado";
  const chip = createElement("span", `balance-chip ${chipClass}`, chipText);

  details.append(name, paid);

  if (autoGuest) {
    const rename = createElement("div", "guest-rename");
    const input = createElement("input", "guest-name-input");
    const saveButton = createElement("button", "save-guest-name-btn", "Poner nombre");
    const unnamed = canonicalName(person.name) === canonicalName(autoGuest);
    input.type = "text";
    input.value = unnamed ? "" : person.name;
    input.placeholder = `Nombre de ${autoGuest}`;
    input.setAttribute("aria-label", `Nombre de ${autoGuest}`);
    input.dataset.person = person.name;
    saveButton.type = "button";
    saveButton.dataset.person = person.name;
    rename.append(input, saveButton);
    details.append(rename);
  }

  left.append(avatar, details);
  row.append(left, chip);
  return row;
}

function showResults(result, { scroll = true } = {}) {
  $("#resultados").hidden = false;
  $("#totalGastado").textContent = formatMoney(result.total);
  $("#cantidadPersonas").textContent = String(result.people.length);
  $("#cantidadPagos").textContent = `${result.transfers.length} pagos`;

  const shares = result.people.map((person) => Number(person.fairShare));
  const minimumShare = Math.min(...shares);
  const maximumShare = Math.max(...shares);
  $("#cuotaJusta").textContent =
    minimumShare === maximumShare
      ? formatMoney(minimumShare)
      : `${formatMoney(minimumShare)}–${formatMoney(maximumShare)}`;

  const unnamedGuests = result.people.filter(
    (person) => getAutoGuestLabel(person.name) && canonicalName(person.name) === canonicalName(getAutoGuestLabel(person.name)),
  ).length;
  const hint = $("#balancesHint");
  if (hint) {
    hint.hidden = unnamedGuests === 0;
    hint.textContent =
      unnamedGuests === 1
        ? "Hay 1 invitado automático. Ponle un nombre para reconocerlo en la cuota."
        : `Hay ${unnamedGuests} invitados automáticos. Ponles un nombre para reconocerlos en la cuota.`;
  }

  const balancesList = $("#balancesList");
  balancesList.replaceChildren();

  const originalPeople = result.people.filter((person) => !getAutoGuestLabel(person.name));
  const guestPeople = result.people.filter((person) => getAutoGuestLabel(person.name));
  const splitBalances = originalPeople.length > 0 && guestPeople.length > 0;

  if (splitBalances) {
    appendGroupTitle(balancesList, "Gastos que ya estaban");
    originalPeople.forEach((person) => balancesList.append(createBalanceRow(person)));
    appendGroupTitle(balancesList, "Invitados automáticos");
    guestPeople.forEach((person) => balancesList.append(createBalanceRow(person)));
  } else {
    result.people.forEach((person) => balancesList.append(createBalanceRow(person)));
  }

  const transfersList = $("#transfersList");
  transfersList.replaceChildren();

  if (result.transfers.length === 0) {
    transfersList.append(createElement("p", "success-message", "No hacen falta transferencias."));
  }

  result.transfers.forEach((transfer) => {
    const alias = getAlias(transfer.to);
    const row = createElement("article", "transfer-item");
    const top = createElement("div", "transfer-top");
    const route = createElement(
      "span",
      "",
      `${displayPersonName(transfer.from)} → ${displayPersonName(transfer.to)}`,
    );
    const amount = createElement("span", "transfer-amount", formatMoney(transfer.amount));
    const bottom = createElement("div", "transfer-bottom");
    const aliasEditor = createElement("div", "alias-editor");
    const aliasInput = createElement("input", "alias-input");
    const saveAliasButton = createElement("button", "save-alias-btn", "Guardar llave");
    const copyButton = createElement("button", "copy-btn", "Copiar detalle");

    aliasInput.type = "text";
    aliasInput.value = alias;
    aliasInput.placeholder = `Llave o cuenta de ${displayPersonName(transfer.to)}`;
    aliasInput.setAttribute("aria-label", `Llave o cuenta de ${transfer.to}`);
    saveAliasButton.type = "button";
    saveAliasButton.dataset.person = transfer.to;
    copyButton.type = "button";
    copyButton.dataset.from = transfer.from;
    copyButton.dataset.fromLabel = displayPersonName(transfer.from);
    copyButton.dataset.recipient = transfer.to;
    copyButton.dataset.recipientLabel = displayPersonName(transfer.to);
    copyButton.dataset.amount = formatMoney(transfer.amount);
    aliasEditor.append(aliasInput, saveAliasButton);
    top.append(route, amount);
    bottom.append(aliasEditor, copyButton);
    row.append(top, bottom);
    transfersList.append(row);
  });

  $("#checkFinal").textContent =
    minimumShare === maximumShare
      ? `Después de estas transferencias, cada persona habrá aportado ${formatMoney(minimumShare)}.`
      : `Para cerrar los centavos, las cuotas quedan entre ${formatMoney(minimumShare)} y ${formatMoney(maximumShare)}.`;

  if (scroll) {
    $("#resultados").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renameAutoGuest(oldName, rawName) {
  const nextName = rawName.trim().replace(/\s+/g, " ");
  const autoGuest = getAutoGuestLabel(oldName);

  if (!nextName) {
    showToast("Escribe el nombre de este invitado.");
    return;
  }

  if (canonicalName(nextName) === canonicalName(oldName)) {
    showToast("Ese invitado ya tiene ese nombre.");
    return;
  }

  const taken = expenses.some(
    (expense) =>
      canonicalName(expense.paidBy) !== canonicalName(oldName) &&
      canonicalName(expense.paidBy) === canonicalName(nextName),
  );
  if (taken) {
    showToast(`Ya existe alguien llamado “${nextName}”. Usa otro nombre.`);
    return;
  }

  const oldKey = canonicalName(oldName);
  expenses.forEach((expense) => {
    if (canonicalName(expense.paidBy) === oldKey) {
      expense.paidBy = nextName;
      expense.autoGuest ??= autoGuest;
    }
  });

  const aliases = activeEvent().aliases;
  if (aliases && aliases[oldKey] !== undefined) {
    aliases[canonicalName(nextName)] = aliases[oldKey];
    delete aliases[oldKey];
  }

  if (resultadoActual) {
    resultadoActual.people.forEach((person) => {
      if (canonicalName(person.name) === oldKey) person.name = nextName;
    });
    resultadoActual.transfers.forEach((transfer) => {
      if (canonicalName(transfer.from) === oldKey) transfer.from = nextName;
      if (canonicalName(transfer.to) === oldKey) transfer.to = nextName;
    });
  }

  saveState();
  renderExpenses();
  if (resultadoActual) showResults(resultadoActual, { scroll: false });
  showToast(`${autoGuest || "Invitado"} identificado como “${nextName}”.`);
}

$("#balancesList").addEventListener("click", (event) => {
  const button = event.target.closest(".save-guest-name-btn");
  if (!button) return;

  const row = button.closest(".balance-item");
  const input = row?.querySelector(".guest-name-input");
  renameAutoGuest(button.dataset.person, input?.value ?? "");
});

$("#balancesList").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest(".guest-name-input");
  if (!input) return;

  event.preventDefault();
  renameAutoGuest(input.dataset.person, input.value);
});

function getAlias(name) {
  return activeEvent().aliases?.[canonicalName(name)] || "";
}

function saveAlias(name, alias) {
  activeEvent().aliases ??= {};
  const key = canonicalName(name);

  if (alias) {
    activeEvent().aliases[key] = alias;
  } else {
    delete activeEvent().aliases[key];
  }

  saveState();
}

$("#transfersList").addEventListener("click", async (event) => {
  const aliasButton = event.target.closest(".save-alias-btn");
  if (aliasButton) {
    const row = aliasButton.closest(".transfer-item");
    const input = row.querySelector(".alias-input");
    const alias = input.value.trim();
    saveAlias(aliasButton.dataset.person, alias);
    aliasButton.textContent = "Guardado";
    window.setTimeout(() => {
      aliasButton.textContent = "Guardar llave";
    }, 1500);
    return;
  }

  const button = event.target.closest(".copy-btn");
  if (!button) return;

  try {
    const recipient = button.dataset.recipient;
    const alias = getAlias(recipient);
    const text = `${button.dataset.fromLabel || button.dataset.from} le transfiere ${button.dataset.amount} a ${button.dataset.recipientLabel || recipient}${
      alias ? `. Llave o cuenta: ${alias}` : ""
    }`;
    await navigator.clipboard.writeText(text);
    button.textContent = "¡Copiado!";
    window.setTimeout(() => {
      button.textContent = "Copiar detalle";
    }, 1500);
  } catch {
    showToast("No se pudo copiar el detalle.");
  }
});

$("#btnWhatsapp").addEventListener("click", () => {
  if (!resultadoActual) return;

  const lines = ["*Resumen InDivízia*"];
  const shares = resultadoActual.people.map((person) => Number(person.fairShare));
  const minimumShare = Math.min(...shares);
  const maximumShare = Math.max(...shares);
  lines.push(`Total: ${formatMoney(resultadoActual.total)}`);
  lines.push(
    minimumShare === maximumShare
      ? `Cuota: ${formatMoney(minimumShare)} por persona`
      : `Cuotas: entre ${formatMoney(minimumShare)} y ${formatMoney(maximumShare)}`,
  );
  lines.push("");
  resultadoActual.transfers.forEach((transfer) => {
    const alias = getAlias(transfer.to);
    lines.push(
      `${displayPersonName(transfer.from)} le transfiere ${formatMoney(transfer.amount)} a ${displayPersonName(transfer.to)}${
        alias ? ` (llave/cuenta: ${alias})` : ""
      }`,
    );
  });

  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
});

function clearQuotas({ confirm = true, silent = false } = {}) {
  if (!resultadoActual && $("#resultados").hidden) {
    if (!silent) showToast("No hay cuotas calculadas para limpiar.");
    return;
  }

  if (confirm && !window.confirm("¿Deseas limpiar las cuotas y transferencias?")) return;

  resultadoActual = null;
  $("#resultados").hidden = true;
  $("#balancesList").replaceChildren();
  $("#transfersList").replaceChildren();
  $("#totalGastado").textContent = "$ 0";
  $("#cantidadPersonas").textContent = "0";
  $("#cuotaJusta").textContent = "$ 0";
  $("#cantidadPagos").textContent = "0 pagos";
  $("#checkFinal").textContent = "";
  document.querySelectorAll(".navtab").forEach((item) => item.classList.remove("active"));
  document.querySelector('.navtab[data-target="gastos"]')?.classList.add("active");

  if (!silent) showToast("Cuotas limpiadas. Los gastos siguen cargados.");
}

$("#btnLimpiarCuotas")?.addEventListener("click", () => clearQuotas());

function clearExpenses() {
  if (expenses.length === 0) {
    showToast("No hay gastos cargados para limpiar.");
    return;
  }

  if (!window.confirm("¿Seguro que deseas borrar todos los gastos del evento actual?")) return;

  expenses = [];
  activeEvent().expenses = expenses;
  resultadoActual = null;
  $("#resultados").hidden = true;
  $("#expenseForm").reset();
  finishExpenseEditing();
  resetNameFilter();
  saveState();
  renderExpenses();
  showToast("Gastos limpiados con éxito.");
}

$("#btnFiltrarNombres")?.addEventListener("click", () => {
  filterPanelOpen = !filterPanelOpen;
  if (filterPanelOpen) {
    $("#filtroNombresPanel").hidden = false;
    renderNameFilter();
    $("#inputFiltroNombre").focus();
    return;
  }

  renderExpenses();
});

$("#inputFiltroNombre")?.addEventListener("input", (event) => {
  nameFilter = event.target.value;
  renderExpenses();
});

$("#btnQuitarFiltro")?.addEventListener("click", () => {
  nameFilter = "";
  $("#inputFiltroNombre").value = "";
  renderExpenses();
});

$("#nameFilterChips")?.addEventListener("click", (event) => {
  const chip = event.target.closest(".name-chip");
  if (!chip) return;

  const selected = chip.dataset.name;
  if (canonicalName(nameFilter) === canonicalName(selected)) {
    nameFilter = "";
    $("#inputFiltroNombre").value = "";
  } else {
    nameFilter = selected;
    $("#inputFiltroNombre").value = selected;
  }

  filterPanelOpen = true;
  renderExpenses();
});

$("#btnLimpiarGastos")?.addEventListener("click", clearExpenses);
$("#btnReiniciar")?.addEventListener("click", clearExpenses);

document.querySelectorAll(".navtab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = document.getElementById(tab.dataset.target);
    if (!target || $("#resultados").hidden) {
      if (tab.dataset.target !== "gastos") showToast("Primero calcula la división.");
      return;
    }

    document.querySelectorAll(".navtab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function renderEvents() {
  const container = $("#eventosList");
  container.replaceChildren();
  $("#cantidadEventos").textContent = `${events.length} ${events.length === 1 ? "evento" : "eventos"}`;

  events.forEach((eventData) => {
    const card = createElement(
      "article",
      `event-option${eventData.id === activeEventId ? " selected" : ""}`,
    );
    const selectButton = createElement("button", "event-select");
    const details = createElement("div");
    const name = createElement("strong", "", `${eventData.type}: ${eventData.name}`);
    const people = new Set(eventData.expenses.map((expense) => canonicalName(expense.paidBy))).size;
    const total = eventData.expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );
    const summary = createElement("span", "", `${people} personas · ${formatMoney(total)}`);
    const actions = createElement("div", "event-actions");
    const renameButton = createElement("button", "event-action rename-event");
    const deleteButton = createElement("button", "event-action delete-event");

    selectButton.type = "button";
    selectButton.dataset.eventId = eventData.id;
    renameButton.type = "button";
    renameButton.dataset.eventId = eventData.id;
    renameButton.setAttribute("aria-label", `Renombrar ${eventData.name}`);
    renameButton.append(createElement("span", "material-symbols-outlined", "edit"));
    deleteButton.type = "button";
    deleteButton.dataset.eventId = eventData.id;
    deleteButton.setAttribute("aria-label", `Eliminar ${eventData.name}`);
    deleteButton.append(createElement("span", "material-symbols-outlined", "delete"));
    details.append(name, summary);
    selectButton.append(
      details,
      createElement("span", "material-symbols-outlined", "check_circle"),
    );
    actions.append(renameButton, deleteButton);
    card.append(selectButton, actions);
    container.append(card);
  });
}

function openEventDialog() {
  renderEvents();
  $("#eventDialog").showModal();
}

$("#btnNuevoEvento").addEventListener("click", openEventDialog);
$("#btnCambiarEvento").addEventListener("click", openEventDialog);

$("#eventosList").addEventListener("click", (event) => {
  const renameButton = event.target.closest(".rename-event");
  if (renameButton) {
    const eventData = events.find((item) => item.id === renameButton.dataset.eventId);
    if (!eventData) return;

    const newName = window.prompt("Nuevo nombre del evento:", eventData.name)?.trim();
    if (!newName) return;

    eventData.name = newName;
    saveState();
    renderEvents();
    renderSummary();
    return;
  }

  const deleteButton = event.target.closest(".delete-event");
  if (deleteButton) {
    if (events.length === 1) {
      showToast("Debe existir al menos un evento.");
      return;
    }

    const eventData = events.find((item) => item.id === deleteButton.dataset.eventId);
    if (!eventData || !window.confirm(`¿Deseas eliminar el evento “${eventData.name}”?`)) return;

    events = events.filter((item) => item.id !== eventData.id);
    if (activeEventId === eventData.id) {
      activeEventId = events[0].id;
      expenses = events[0].expenses;
      resultadoActual = null;
      $("#resultados").hidden = true;
      $("#expenseForm").reset();
      finishExpenseEditing();
      resetNameFilter();
    }

    saveState();
    renderEvents();
    renderExpenses();
    return;
  }

  const option = event.target.closest(".event-select");
  if (!option) return;

  activeEventId = option.dataset.eventId;
  expenses = activeEvent().expenses;
  resultadoActual = null;
  $("#resultados").hidden = true;
  $("#expenseForm").reset();
  finishExpenseEditing();
  resetNameFilter();
  saveState();
  renderEvents();
  renderExpenses();
  $("#eventDialog").close();
});

$("#eventTypePills").addEventListener("click", (event) => {
  const option = event.target.closest(".event-type");
  if (!option) return;

  document.querySelectorAll(".event-type").forEach((item) => item.classList.remove("active"));
  option.classList.add("active");
  tipoEventoSeleccionado = option.dataset.type;
});

$("#btnConfirmarEvento").addEventListener("click", () => {
  const name = $("#eventName").value.trim();
  const estimatedPeople = Number($("#eventPeople").value);

  if (!name) {
    showToast("Escribe el nombre del nuevo evento.");
    return;
  }

  if (!Number.isInteger(estimatedPeople) || estimatedPeople < 2 || estimatedPeople > 500) {
    showToast("Ingresa entre 2 y 500 personas.");
    return;
  }

  const newEvent = {
    id: crypto.randomUUID(),
    name,
    type: tipoEventoSeleccionado,
    estimatedPeople,
    aliases: {},
    expenses: [],
  };

  events.push(newEvent);
  activeEventId = newEvent.id;
  expenses = newEvent.expenses;
  resultadoActual = null;
  $("#resultados").hidden = true;
  resetNameFilter();
  saveState();
  renderExpenses();
  $("#eventDialog").close();
  $("#eventName").value = "";
  showToast(`Evento “${name}” creado.`);
});

setMode(currentMode);
renderExpenses();
