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
    exportExcelBtn: document.getElementById("exportExcelBtn"),
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
  dom.exportExcelBtn.addEventListener("click", exportExcel);
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

async function exportExcel() {
  const rows = getFilteredProfiles();
  if (!rows.length) {
    showAlert("No hay perfiles disponibles con el filtro actual para exportar.");
    return;
  }
  if (!window.ExcelJS) {
    showAlert("No se pudo cargar el generador de Excel. Revise la conexion a internet e intente de nuevo.");
    return;
  }

  clearAlert();
  setExportBusy(true);

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SBM Management";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet("Perfiles", {
      views: [{ state: "frozen", ySplit: 4 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
      }
    });

    const columnCount = 9;
    sheet.mergeCells(1, 1, 1, columnCount);
    const title = sheet.getCell("A1");
    title.value = "SBM | Perfiles de nuevos funcionarios";
    title.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF262B2F" } };
    title.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 34;

    sheet.mergeCells(2, 1, 2, columnCount);
    const subtitle = sheet.getCell("A2");
    const filterText = dom.adminSearch.value.trim();
    subtitle.value = `Reporte generado: ${formatDate(new Date())} | Registros: ${rows.length}${filterText ? ` | Filtro: ${filterText}` : ""}`;
    subtitle.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF5F6971" } };
    subtitle.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(2).height = 22;
    sheet.getRow(3).height = 8;

    const headers = [
      "Fecha de registro", "Nombre completo", "Número de cédula", "Sobre mí",
      "Tiempo libre", "Entorno familiar", "Intereses en la vida",
      "Viajes o lugares especiales", "Información adicional"
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8642A" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF9F4B24" } },
        left: { style: "thin", color: { argb: "FF9F4B24" } },
        bottom: { style: "thin", color: { argb: "FF9F4B24" } },
        right: { style: "thin", color: { argb: "FF9F4B24" } }
      };
    });

    rows.forEach((profile, index) => {
      const createdAt = profile.created_at ? new Date(profile.created_at) : "";
      const row = sheet.addRow([
        createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : "",
        profile.full_name || "",
        String(profile.cedula || ""),
        profile.about_me || "",
        profile.free_time || "",
        profile.family_environment || "",
        profile.life_interests || "",
        profile.travel_experience || "",
        profile.additional_notes || ""
      ]);
      row.height = 54;
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.font = { name: "Arial", size: 10, color: { argb: "FF262B2F" } };
        cell.alignment = {
          vertical: "top",
          horizontal: columnNumber <= 3 ? "left" : "justify",
          wrapText: true
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF7F8F8" }
        };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFD9DDDF" } },
          right: { style: "hair", color: { argb: "FFE7E9EA" } }
        };
      });
      row.getCell(1).numFmt = "dd/mm/yyyy hh:mm";
      row.getCell(3).numFmt = "@";
    });

    const widths = [20, 30, 20, 45, 40, 40, 40, 40, 40];
    sheet.columns.forEach((column, index) => {
      column.width = widths[index];
    });
    sheet.autoFilter = { from: "A4", to: `I${sheet.rowCount}` };
    sheet.properties.defaultRowHeight = 18;
    sheet.headerFooter.oddFooter = "&LSBM Management&CPerfil de nuevos funcionarios&RPágina &P de &N";

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SBM_Perfiles_Funcionarios_${localDateStamp()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error(error);
    showAlert("No se pudo generar el archivo Excel. Intente nuevamente.");
  } finally {
    setExportBusy(false);
  }
}

function setExportBusy(isBusy) {
  dom.exportExcelBtn.disabled = isBusy;
  dom.exportExcelBtn.textContent = isBusy ? "Generando Excel..." : "Descargar Excel";
}

function localDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
