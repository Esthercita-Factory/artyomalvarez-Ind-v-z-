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

function loadEvents() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(savedEvents) && savedEvents.length > 0) {
      return savedEvents.map((event) => ({
        ...event,
        expenses: Array.isArray(event.expenses) ? event.expenses : [],
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

function renderExpenses() {
  const container = $("#expensesList");
  container.replaceChildren();
  container.classList.toggle("empty-list", expenses.length === 0);

  if (expenses.length === 0) {
    container.append(createElement("p", "", "Todavía no has agregado gastos."));
    renderSummary();
    return;
  }

  expenses.forEach((expense, index) => {
    const row = createElement("article", "expense-item");
    const info = createElement("div", "expense-info");
    const icon = createElement("div", "expense-icon", iconosCategoria[expense.category] ?? "📦");
    const details = createElement("div");
    const name = createElement("span", "expense-name", expense.paidBy);
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
    info.append(icon, details);
    right.append(amount, editButton, deleteButton);
    row.append(info, right);
    container.append(row);
  });

  renderSummary();
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
    expenses[editingExpenseIndex] = expense;
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

$("#btnCalcular").addEventListener("click", async () => {
  if (expenses.length === 0) {
    showToast("Agrega al menos un gasto primero.");
    return;
  }

  const button = $("#btnCalcular");
  button.disabled = true;
  $("#btnCalcularTexto").textContent = "Calculando...";

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

function showResults(result) {
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

  const balancesList = $("#balancesList");
  balancesList.replaceChildren();

  result.people.forEach((person) => {
    const row = createElement("article", "balance-item");
    const left = createElement("div", "balance-left");
    const avatar = createElement("div", "avatar", initials(person.name));
    const details = createElement("div");
    const name = createElement("div", "balance-name", person.name);
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
    left.append(avatar, details);
    row.append(left, chip);
    balancesList.append(row);
  });

  const transfersList = $("#transfersList");
  transfersList.replaceChildren();

  if (result.transfers.length === 0) {
    transfersList.append(createElement("p", "success-message", "No hacen falta transferencias."));
  }

  result.transfers.forEach((transfer) => {
    const alias = getAlias(transfer.to);
    const row = createElement("article", "transfer-item");
    const top = createElement("div", "transfer-top");
    const route = createElement("span", "", `${transfer.from} → ${transfer.to}`);
    const amount = createElement("span", "transfer-amount", formatMoney(transfer.amount));
    const bottom = createElement("div", "transfer-bottom");
    const aliasEditor = createElement("div", "alias-editor");
    const aliasInput = createElement("input", "alias-input");
    const saveAliasButton = createElement("button", "save-alias-btn", "Guardar llave");
    const copyButton = createElement("button", "copy-btn", "Copiar detalle");

    aliasInput.type = "text";
    aliasInput.value = alias;
    aliasInput.placeholder = `Llave o cuenta de ${transfer.to}`;
    aliasInput.setAttribute("aria-label", `Llave o cuenta de ${transfer.to}`);
    saveAliasButton.type = "button";
    saveAliasButton.dataset.person = transfer.to;
    copyButton.type = "button";
    copyButton.dataset.from = transfer.from;
    copyButton.dataset.recipient = transfer.to;
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

  $("#resultados").scrollIntoView({ behavior: "smooth", block: "start" });
}

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
    const text = `${button.dataset.from} le transfiere ${button.dataset.amount} a ${recipient}${
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
      `${transfer.from} le transfiere ${formatMoney(transfer.amount)} a ${transfer.to}${
        alias ? ` (llave/cuenta: ${alias})` : ""
      }`,
    );
  });

  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
});

$("#btnReiniciar").addEventListener("click", () => {
  if (!window.confirm("¿Seguro que deseas borrar los gastos del evento actual?")) return;

  expenses = [];
  activeEvent().expenses = expenses;
  resultadoActual = null;
  $("#resultados").hidden = true;
  saveState();
  renderExpenses();
});

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
  saveState();
  renderExpenses();
  $("#eventDialog").close();
  $("#eventName").value = "";
  showToast(`Evento “${name}” creado.`);
});

setMode(currentMode);
renderExpenses();
