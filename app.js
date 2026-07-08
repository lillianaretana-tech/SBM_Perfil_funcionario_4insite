const SUPABASE_URL = "https://vgkyoyosjewdygxtnqvu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZna3lveW9zamV3ZHlneHRucXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTAxNDAsImV4cCI6MjA5ODIyNjE0MH0.oDxSWg61UFLqMh2MeEW6yxarZAjobhEA6TWm0KS_7CA";
const ADMIN_PIN = "2580";

const state = {
  supabase: null,
  profiles: [],
  adminAuthenticated: false
};

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bindEvents();
  initSupabase();
});

function cacheDom() {
  Object.assign(dom, {
    appAlert: document.getElementById("appAlert"),
    profileForm: document.getElementById("profileForm"),
    submitBtn: document.getElementById("submitBtn"),
    fullName: document.getElementById("fullName"),
    cedula: document.getElementById("cedula"),
    aboutMe: document.getElementById("aboutMe"),
    freeTime: document.getElementById("freeTime"),
    family: document.getElementById("family"),
    interests: document.getElementById("interests"),
    travel: document.getElementById("travel"),
    additionalNotes: document.getElementById("additionalNotes"),
    successPanel: document.getElementById("successPanel"),
    adminOpenBtn: document.getElementById("adminOpenBtn"),
    adminModal: document.getElementById("adminModal"),
    adminCloseBtn: document.getElementById("adminCloseBtn"),
    adminPinForm: document.getElementById("adminPinForm"),
    adminPin: document.getElementById("adminPin"),
    adminContent: document.getElementById("adminContent"),
    totalProfiles: document.getElementById("totalProfiles"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    adminSearch: document.getElementById("adminSearch"),
    adminRows: document.getElementById("adminRows"),
    adminEmpty: document.getElementById("adminEmpty")
  });
}

function bindEvents() {
  dom.profileForm.addEventListener("submit", submitProfile);
  dom.adminOpenBtn.addEventListener("click", openAdmin);
  dom.adminCloseBtn.addEventListener("click", closeAdmin);
  dom.adminModal.addEventListener("click", (event) => {
    if (event.target === dom.adminModal) closeAdmin();
  });
  dom.adminPinForm.addEventListener("submit", unlockAdmin);
  dom.adminSearch.addEventListener("input", renderAdminRows);
  dom.exportCsvBtn.addEventListener("click", exportCsv);
}

function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    showAlert("No se pudo cargar Supabase. Revise la conexion a internet e intente de nuevo.");
    return;
  }
  state.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function submitProfile(event) {
  event.preventDefault();
  clearAlert();
  if (!requireSupabase()) return;

  const payload = {
    full_name: dom.fullName.value.trim(),
    cedula: dom.cedula.value.trim(),
    about_me: dom.aboutMe.value.trim(),
    free_time: dom.freeTime.value.trim(),
    family_environment: dom.family.value.trim(),
    life_interests: dom.interests.value.trim(),
    travel_experience: dom.travel.value.trim(),
    additional_notes: dom.additionalNotes.value.trim(),
    updated_at: new Date().toISOString()
  };

  if (!payload.full_name || !payload.cedula || !payload.about_me) {
    showAlert("Complete nombre, cedula y la seccion Sobre mi para enviar el perfil.");
    return;
  }

  setBusy(true);
  const { error } = await state.supabase
    .from("sbm_new_employee_profiles")
    .upsert(payload, { onConflict: "cedula" });
  setBusy(false);

  if (error) {
    showAlert(`No se pudo guardar el perfil: ${error.message}`);
    return;
  }

  dom.profileForm.reset();
  dom.successPanel.classList.remove("hidden");
  dom.successPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function openAdmin() {
  dom.adminModal.classList.remove("hidden");
  dom.adminPin.focus();
  if (state.adminAuthenticated) await loadProfiles();
}

function closeAdmin() {
  dom.adminModal.classList.add("hidden");
}

async function unlockAdmin(event) {
  event.preventDefault();
  if (dom.adminPin.value !== ADMIN_PIN) {
    showAlert("Codigo administrativo incorrecto.");
    return;
  }
  state.adminAuthenticated = true;
  dom.adminPinForm.classList.add("hidden");
  dom.adminContent.classList.remove("hidden");
  await loadProfiles();
}

async function loadProfiles() {
  if (!requireSupabase()) return;
  const { data, error } = await state.supabase
    .from("sbm_new_employee_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showAlert(`No se pudieron cargar los perfiles: ${error.message}`);
    return;
  }

  state.profiles = data || [];
  dom.totalProfiles.textContent = state.profiles.length;
  renderAdminRows();
}

function getFilteredProfiles() {
  const filter = normalize(dom.adminSearch.value);
  return state.profiles.filter((profile) => {
    const text = normalize(`${profile.full_name || ""} ${profile.cedula || ""}`);
    return !filter || text.includes(filter);
  });
}

function renderAdminRows() {
  const rows = getFilteredProfiles();
  dom.adminRows.innerHTML = "";

  rows.forEach((profile) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatDate(profile.created_at))}</td>
      <td>${escapeHtml(profile.full_name || "")}</td>
      <td>${escapeHtml(profile.cedula || "")}</td>
      <td>${escapeHtml(profile.about_me || "")}</td>
      <td>${escapeHtml(profile.free_time || "")}</td>
      <td>${escapeHtml(profile.family_environment || "")}</td>
      <td>${escapeHtml(profile.life_interests || "")}</td>
      <td>${escapeHtml(profile.travel_experience || "")}</td>
      <td>${escapeHtml(profile.additional_notes || "")}</td>
    `;
    dom.adminRows.appendChild(tr);
  });

  dom.adminEmpty.classList.toggle("hidden", rows.length > 0);
}

function exportCsv() {
  const rows = getFilteredProfiles();
  const header = ["fecha", "nombre", "cedula", "sobre_mi", "tiempo_libre", "familia", "intereses", "viajes", "notas"];
  const body = rows.map((profile) => [
    formatDate(profile.created_at),
    profile.full_name || "",
    profile.cedula || "",
    profile.about_me || "",
    profile.free_time || "",
    profile.family_environment || "",
    profile.life_interests || "",
    profile.travel_experience || "",
    profile.additional_notes || ""
  ]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sbm-perfiles-nuevos-funcionarios-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function setBusy(isBusy) {
  dom.submitBtn.disabled = isBusy;
  dom.submitBtn.textContent = isBusy ? "Enviando..." : "Enviar mi perfil";
}

function requireSupabase() {
  if (state.supabase) return true;
  showAlert("Supabase no esta disponible. Intente de nuevo en unos minutos.");
  return false;
}

function showAlert(message) {
  dom.appAlert.textContent = message;
  dom.appAlert.classList.remove("hidden");
  dom.appAlert.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearAlert() {
  dom.appAlert.textContent = "";
  dom.appAlert.classList.add("hidden");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
