/* =========================================================
   J2 - v8.0 · Optimizado + Archivados + Eliminación segura
   by Sakura · Solución IT SAS
========================================================= */

/* =========================================================
   PLANES
========================================================= */
var PLAN_FEATURES = {
    basic: {
        name: "Básico",
        maxProducts: 30,
        features: ["sales", "change", "inventory_basic", "reports_day"]
    },
    pro: {
        name: "Pro", maxProducts: Infinity,
        features: ["sales", "change", "inventory", "categories_custom",
                   "credits", "reports", "cash_register", "backup",
                   "transfer", "providers", "receipts"]
    },
    promax: {
        name: "ProMax", maxProducts: Infinity,
        features: ["sales", "change", "inventory", "categories_custom",
                   "credits", "reports", "cash_register", "backup",
                   "backup_auto", "transfer", "providers", "receipts",
                   "barcode", "weight_sales", "price_sales",
                   "multi_user", "suggest_buy", "whatsapp", "labels"]
    }
};

var SAKURA_CONFIG = {
    phone: "573332688336",
    phoneDisplay: "+57 333 268 8336",
    email: "soporte@sakura-it.com"
};

var TEMP_CODE_SECRET = "SAKURA-j2-2026-JH32JN23";
var TEMP_CODE_WINDOW = 15;

/* Hash SHA-256 de la contraseña de admin (misma de main.js) */
var ADMIN_PASSWORD_HASH = "c3ee8ab5d32a76b3d7f1850cc681494a4f836ccaccb004a621de542125bdb25e";

var DEMO_CONFIG = {
    duration: 7,
    plan: "promax",
    storageKey: "j2_demo_used"
};

var UPDATE_CONFIG = {
    versionUrl: "https://delfos1209.github.io/j2-versions/version.json",
    currentVersion: "8.0",
    checkIntervalHours: 6,
    lastCheckKey: "j2_last_update_check"
};

/* =========================================================
   MENSAJES POR DEFECTO
========================================================= */
var DEFAULT_MESSAGES = {
    reminder: "Hola {nombre}, te saludamos de {tienda}. 👋\n\nTe recordamos que tienes un saldo pendiente de {deuda}.\n\n¡Gracias por tu preferencia!",
    statement: "Hola {nombre}, este es tu estado de cuenta en {tienda}.\n\n📅 Fecha: {fecha}\n💰 Total pendiente: {deuda}\n\n{detalle}\n\n¡Gracias!",
    oldCredit: "Hola {nombre}, esperamos que estés bien.\n\nTe escribimos de {tienda}. Notamos que tienes un saldo pendiente de {deuda} desde hace un tiempo.\n\n¿Podrías indicarnos cuándo podrías pasar a cancelarlo? ¡Gracias!"
};

/* =========================================================
   LICENCIAS
========================================================= */
var license = null;

function refreshLicenseState() {
    if (typeof Licencia !== "undefined") {
        license = Licencia.getLicense();
    }
}

function isLicenseValid() {
    if (typeof Licencia === "undefined") return false;
    return Licencia.isValid();
}

function getCurrentPlan() {
    if (typeof Licencia === "undefined") return PLAN_FEATURES.basic;
    return Licencia.getCurrentPlan();
}

function hasFeature(feature) {
    if (typeof Licencia === "undefined") return false;
    return Licencia.hasFeature(feature);
}

function daysUntilExpiry() {
    if (typeof Licencia === "undefined") return 0;
    return Licencia.daysUntilExpiry();
}

function isDemo() {
    if (typeof Licencia === "undefined") return false;
    return Licencia.isDemo();
}

async function activateLicense(code) {
    if (typeof Licencia === "undefined") {
        return { success: false, message: "Módulo de licencias no cargado." };
    }
    var result = await Licencia.activate(code);
    if (result.success) refreshLicenseState();
    return result;
}

function activateDemo() {
    if (typeof Licencia === "undefined") {
        return { success: false, message: "Módulo de licencias no cargado." };
    }
    var result = Licencia.activateDemo();
    if (result.success) refreshLicenseState();
    return result;
}

function isDemoUsed() {
    if (typeof Licencia === "undefined") return false;
    return Licencia.isDemoUsed();
}

function clearLicense() {
    if (typeof Licencia !== "undefined") {
        Licencia.clear();
        refreshLicenseState();
    }
}

async function getHwId() {
    if (typeof CryptoUtils === "undefined") return "no-disponible";
    return await CryptoUtils.generateHwId();
}

async function checkOnlineLicense() {
    if (typeof Licencia === "undefined") return { status: "disabled" };
    return await Licencia.checkOnlineStatus();
}

/* =========================================================
   CONTRASEÑAS TEMPORALES
========================================================= */
function generateTempRequestCode() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    var hour = String(now.getHours()).padStart(2, "0");
    var min = String(now.getMinutes()).padStart(2, "0");
    var random = String(Math.floor(100000 + Math.random() * 900000));
    return random + "-" + year + month + day + hour + min;
}

async function generateUnlockCodeHMAC(tempCode) {
    if (typeof CryptoUtils === "undefined") return "----";
    var fullHex = await CryptoUtils.hmac(tempCode, TEMP_CODE_SECRET);
    return (fullHex.substring(0, 4) + "-" + fullHex.substring(4, 8)).toUpperCase();
}

async function validateUnlockCode(unlockCode, tempCode) {
    if (!unlockCode || !tempCode) return false;
    var cleanUnlock = unlockCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanUnlock)) return false;

    var parts = tempCode.split("-");
    if (parts.length !== 2) return false;
    var timestamp = parts[1];

    var year = parseInt(timestamp.substring(0, 4));
    var month = parseInt(timestamp.substring(4, 6)) - 1;
    var day = parseInt(timestamp.substring(6, 8));
    var hour = parseInt(timestamp.substring(8, 10));
    var min = parseInt(timestamp.substring(10, 12));

    var codeTime = new Date(year, month, day, hour, min);
    var diffMinutes = (Date.now() - codeTime) / (1000 * 60);

    if (diffMinutes > TEMP_CODE_WINDOW) return false;
    if (diffMinutes < -2) return false;

    var expected = await generateUnlockCodeHMAC(tempCode);
    return cleanUnlock === expected;
}

function getCancellationsToday() {
    var today = todayString();
    return sales.filter(function(s) {
        return s.cancelled && s.cancelledAt && s.cancelledAt.startsWith(today);
    }).length;
}

function applyUnlockPassword(tempCode) {
    var expiresAt = new Date(Date.now() + TEMP_CODE_WINDOW * 60 * 1000);
    sessionStorage.setItem("j2_unlock_session", JSON.stringify({
        tempCode: tempCode,
        expiresAt: expiresAt.toISOString(),
        usesLeft: 1
    }));
}

function hasActiveUnlockSession() {
    var session = JSON.parse(sessionStorage.getItem("j2_unlock_session"));
    if (!session) return false;
    if (new Date(session.expiresAt) <= new Date()) {
        sessionStorage.removeItem("j2_unlock_session");
        return false;
    }
    if (session.usesLeft <= 0) {
        sessionStorage.removeItem("j2_unlock_session");
        return false;
    }
    return true;
}

function consumeUnlockSession() {
    var session = JSON.parse(sessionStorage.getItem("j2_unlock_session"));
    if (!session) return;
    session.usesLeft--;
    if (session.usesLeft <= 0) sessionStorage.removeItem("j2_unlock_session");
    else sessionStorage.setItem("j2_unlock_session", JSON.stringify(session));
}

/* =========================================================
   CONVERSIONES
========================================================= */
var WEIGHT_CONVERSIONS = {
    kg_to_lb: 2.20462, lb_to_kg: 0.453592,
    arroba_to_lb: 25, arroba_to_kg: 11.3398,
    kg_to_arroba: 1 / 11.3398, lb_to_arroba: 1 / 25
};

function convertWeight(amount, fromUnit, toUnit) {
    if (fromUnit === toUnit) return amount;
    var kg;
    if (fromUnit === "kg") kg = amount;
    else if (fromUnit === "lb") kg = amount * WEIGHT_CONVERSIONS.lb_to_kg;
    else if (fromUnit === "arroba") kg = amount * WEIGHT_CONVERSIONS.arroba_to_kg;
    if (toUnit === "kg") return kg;
    if (toUnit === "lb") return kg * WEIGHT_CONVERSIONS.kg_to_lb;
    if (toUnit === "arroba") return kg * WEIGHT_CONVERSIONS.kg_to_arroba;
    return amount;
}

function formatWeight(amount, unit) {
    var symbols = { kg: "kg", lb: "lb", arroba: "@" };
    return parseFloat(amount).toFixed(2) + " " + (symbols[unit] || unit);
}

/* =========================================================
   UTILIDADES
========================================================= */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function showToast(message) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() { toast.classList.remove("show"); }, 2400);
}

function formatMoney(value) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency", currency: "COP", maximumFractionDigits: 0
    }).format(value || 0);
}

function todayString() { return new Date().toISOString().split("T")[0]; }

function getCurrentTime() {
    return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function normalizeText(text) {
    return (text || "").toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s\-_]/g, "");
}

function fuzzyMatch(haystack, needle) {
    var h = normalizeText(haystack);
    var n = normalizeText(needle);
    if (!n) return true;
    return h.includes(n);
}

/* =========================================================
   ⚡ OPTIMIZACIÓN: DEBOUNCE
   Evita re-ejecutar funciones costosas (renders, saveData)
   en cada cambio. Solo se ejecuta al terminar de escribir.
========================================================= */
var _debounceTimers = {};

function debounce(fn, delay, key) {
    return function() {
        var args = arguments;
        var context = this;
        if (key) clearTimeout(_debounceTimers[key]);
        var timeoutId = setTimeout(function() {
            fn.apply(context, args);
            if (key) delete _debounceTimers[key];
        }, delay);
        if (key) _debounceTimers[key] = timeoutId;
    };
}

/* Versiones con debounce de las funciones más costosas */
var debouncedRenderInventory = debounce(renderInventory, 200, "renderInventory");
var debouncedRenderProducts = debounce(renderProducts, 200, "renderProducts");
var debouncedRenderAllProductsList = debounce(renderAllProductsList, 200, "renderAllProductsList");
var debouncedRenderCategoriaPOSGrid = debounce(renderCategoriaPOSGrid, 200, "renderCategoriaPOSGrid");
var debouncedSaveData = debounce(saveData, 150, "saveData");
var debouncedSaveSettings = debounce(saveSettings, 150, "saveSettings");

/* =========================================================
   ⚡ OPTIMIZACIÓN: MAP de productos por ID
   Búsquedas O(1) en lugar de O(n)
========================================================= */
var productsById = new Map();

function rebuildProductsIndex() {
    productsById.clear();
    for (var i = 0; i < products.length; i++) {
        productsById.set(products[i].id, products[i]);
    }
}

function getProductById(id) {
    return productsById.get(id);
}

/* =========================================================
   PANTALLA DE CARGA
========================================================= */
function showLoading() {
    var overlay = document.getElementById("loadingOverlay");
    if (overlay) {
        overlay.style.display = "flex";
        overlay.classList.remove("hidden");
    }
}

function hideLoading() {
    var overlay = document.getElementById("loadingOverlay");
    if (overlay) {
        overlay.classList.add("hidden");
        setTimeout(function() {
            overlay.style.display = "none";
        }, 500);
    }
}

/* ⚡ Spinner en botón mientras ejecuta acción */
function withButtonLoading(btn, asyncFn) {
    if (!btn) return asyncFn();
    var originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add("loading");
    var promise = Promise.resolve().then(asyncFn);
    promise.finally(function() {
        btn.classList.remove("loading");
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    });
    return promise;
}

/* =========================================================
   EMOJIS
========================================================= */
var EMOJI_PACK = {
    "Comida": ["🍔","🍕","🌮","🌯","🥙","🍟","🍿","🥨","🥐","🥖","🥯","🍞","🥞","🧇","🧀","🥗","🍝","🍜","🍲","🍛","🍣","🍤","🥟","🍱","🍚","🍙","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮"],
    "Bebidas": ["🥤","🍶","🍵","☕","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🧊","🥛","🍼","🫖","🧃","🍾"],
    "Frutas y Verduras": ["🍎","🍏","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥜","🌰","🍄"],
    "Carnes": ["🥩","🍖","🍗","🥓","🌭","🍔","🍤","🦐","🦀","🦞","🐟","🐠","🐡","🦑","🐙","🍣"],
    "Aseo y Hogar": ["🧴","🧼","🧽","🧹","🧺","🧻","🚿","🛁","🧯","🪣","🧷","🪥","🪒","🧵","🪡","🧶","🔨","🪚","🪛","🔧","🪜","🧰","🔩","🪝"],
    "Snacks y Dulces": ["🍬","🍭","🍫","🍩","🍪","🧁","🍰","🎂","🍮","🍯","🍿","🥨","🥮","🍡","🍧","🍨","🍦"],
    "Salud y Farmacia": ["💊","💉","🩹","🩺","🧬","🦠","🧪","🧫","🏥","🚑","🩸","🫀","🫁","🧠","🦷","👁️","👂","🦴"],
    "Mascotas": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦗","🕷️","🦂","🐢","🐍","🦎","🐙","🦑","🦀","🐠"],
    "Ocio y Hogar": ["🎮","🎯","🎲","🎰","🃏","🎴","🀄","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","📺","📻","📷","📹","🎥","🎞️","📞","☎️","📟","📠","🔋","🔌","💡","🔦","🕯️","🪔","🚪","🛋️","🛏️"],
    "Ropa y Accesorios": ["👕","👖","👔","👗","👘","👙","👚","👛","👜","👝","🎒","👞","👟","🥾","🥿","👠","👡","🩰","👢","🧦","🧤","🧣","🎩","🧢","👒","⛑️","💄","💍","💎","👓","🕶️","🌂","☂️"],
    "Tecnología": ["💻","🖥️","⌨️","🖱️","🖨️","💾","💿","📀","📱","📲","📡","🛰️","🕹️"],
    "Transporte": ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛹","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🚁","🛸","🚀","⛵","🚤","🛥️","🛳️","⛴️","🚢"],
    "Adultos +18": ["🍆","🍑","🥒","🌭","🍌","🥕","🍒","🍈","🍓","🍇","🍉","🍊","🍋","🍎","🥭","🍍","🥥","🥝","💋","💄","👄","👅","🫦","🔞","💏","💑","👫","🫂","❤️‍🔥","💦","💧","🔥"],
    "Varios": ["📦","📫","📮","📬","📭","📪","📯","📢","📣","🔔","🔕","🎁","🎀","🎊","🎉","🎈","🎂","🍾","🥂","🎗️","🏷️","🔖","📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔐","🔑","🗝️","⏰","⌚","⏳"]
};

/* =========================================================
   ESTADO GLOBAL
========================================================= */
var products = JSON.parse(localStorage.getItem("j2_products")) || [];
var sales = JSON.parse(localStorage.getItem("j2_sales")) || [];
var clients = JSON.parse(localStorage.getItem("j2_clients")) || [];
var providers = JSON.parse(localStorage.getItem("j2_providers")) || [];

rebuildProductsIndex();

if (localStorage.getItem("j2_categories_wipe_v7_2") !== "done") {
    localStorage.removeItem("j2_categories");
    localStorage.setItem("j2_categories_wipe_v7_2", "done");
}

var categories = JSON.parse(localStorage.getItem("j2_categories")) || [];

var storeSettings = JSON.parse(localStorage.getItem("j2_store_settings")) || {
    name: "", slogan: "", phone: "", address: "", logo: ""
};

var appSettings = JSON.parse(localStorage.getItem("j2_app_settings")) || {
    theme: "auto", accent: "#1e40af"
};

var creditSettings = JSON.parse(localStorage.getItem("j2_credit_settings")) || {
    globalLimit: 0, oldDays: 30
};

var customMessages = JSON.parse(localStorage.getItem("j2_messages")) || {
    reminder: DEFAULT_MESSAGES.reminder,
    statement: DEFAULT_MESSAGES.statement,
    oldCredit: DEFAULT_MESSAGES.oldCredit
};

var cart = [];
var currentWeightProduct = null;
var weightMode = "weight";
var currentPOSCategory = null;
var posAgregados = 0;
var posTotalAgregado = 0;
var pendingSaleForReceipt = null;
var saleToCancel = null;
var currentTempCode = null;
var tempCodeTimerInterval = null;
var currentClientForStatement = null;
var currentClientForQuickPayment = null;
var currentMessageClient = null;
var editingCategoryName = null;
var selectedEmoji = "🏷️";
var inventoryTab = "active";
var productToDeleteForever = null;

var salesChartInstance = null;
var topProductsChartInstance = null;
var categoryChartInstance = null;
var html5QrCode = null;

/* =========================================================
   PERSISTENCIA (con debounce)
========================================================= */
function saveData() {
    try {
        localStorage.setItem("j2_products", JSON.stringify(products));
        localStorage.setItem("j2_sales", JSON.stringify(sales));
        localStorage.setItem("j2_clients", JSON.stringify(clients));
        localStorage.setItem("j2_providers", JSON.stringify(providers));
        localStorage.setItem("j2_categories", JSON.stringify(categories));
        rebuildProductsIndex();
    } catch (e) {
        console.error("Error guardando datos:", e);
        showToast("⚠️ Error al guardar. Revisa el espacio de tu dispositivo.");
    }
}

function saveSettings() {
    localStorage.setItem("j2_store_settings", JSON.stringify(storeSettings));
    localStorage.setItem("j2_app_settings", JSON.stringify(appSettings));
}

function saveMessages() {
    localStorage.setItem("j2_messages", JSON.stringify(customMessages));
}

function saveCreditSettings() {
    localStorage.setItem("j2_credit_settings", JSON.stringify(creditSettings));
}

/* =========================================================
   TEMA Y BRANDING
========================================================= */
function applyTheme() {
    document.body.classList.remove("theme-light", "theme-dark", "theme-auto");
    document.body.classList.add("theme-" + appSettings.theme);

    var accentMap = {
        "#1e40af": null, "#16a34a": "green", "#dc2626": "red",
        "#9333ea": "purple", "#ea580c": "orange", "#0d9488": "teal",
        "#db2777": "pink", "#111827": "black"
    };
    var accentKey = accentMap[appSettings.accent];
    if (accentKey) {
        document.body.dataset.accent = accentKey;
        document.documentElement.style.removeProperty("--primary");
        document.documentElement.style.removeProperty("--primary-dark");
    } else {
        delete document.body.dataset.accent;
        document.documentElement.style.setProperty("--primary", appSettings.accent);
        var darkMap = {
            "#1e40af": "#1e3a8a", "#16a34a": "#15803d", "#dc2626": "#b91c1c",
            "#9333ea": "#7e22ce", "#ea580c": "#c2410c", "#0d9488": "#0f766e",
            "#db2777": "#be185d", "#111827": "#000000"
        };
        document.documentElement.style.setProperty("--primary-dark", darkMap[appSettings.accent] || appSettings.accent);
    }
}

function applyStoreBranding() {
    var nameEl = document.getElementById("topbarStoreName");
    var subtitleEl = document.getElementById("topbarStoreSubtitle");
    var logoEl = document.getElementById("topbarLogo");
    if (!nameEl || !subtitleEl || !logoEl) return;

    if (storeSettings.name) {
        nameEl.textContent = storeSettings.name;
        subtitleEl.textContent = storeSettings.slogan || "Punto de venta e inventario";
    } else {
        nameEl.textContent = "J2";
        subtitleEl.textContent = "Punto de venta e inventario";
    }
    logoEl.src = storeSettings.logo || "logo.png";
}

/* =========================================================
   FECHA / BADGE
========================================================= */
function updateDate() {
    var el = document.getElementById("currentDate");
    if (!el) return;
    el.textContent = new Date().toLocaleDateString("es-CO", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
}

function updatePlanBadge() {
    var badge = document.getElementById("planBadge");
    if (!badge) return;
    var plan = getCurrentPlan();
    if (!plan) { badge.textContent = ""; return; }
    var days = daysUntilExpiry();

    if (isDemo()) {
        badge.textContent = "🎁 Demo · " + days + "d";
        badge.style.background = "rgba(245, 158, 11, 0.2)";
        badge.style.color = "#fbbf24";
        badge.style.borderColor = "rgba(245, 158, 11, 0.4)";
    } else {
        badge.textContent = plan.name + " · " + days + "d";
        badge.style.background = "";
        badge.style.color = "";
        badge.style.borderColor = "";
    }
}

/* =========================================================
   NAVEGACIÓN
========================================================= */
function initNavigation() {
    document.querySelectorAll(".menu-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            document.querySelectorAll(".menu-btn").forEach(function(btn) { btn.classList.remove("active"); });
            document.querySelectorAll(".section").forEach(function(s) { s.classList.remove("active"); });
            button.classList.add("active");
            var sectionId = button.dataset.section;
            var section = document.getElementById(sectionId);
            if (section) section.classList.add("active");

            /* ⚡ Solo renderizamos lo necesario según sección */
            renderSection(sectionId);
        });
    });
}

function goToInventory() {
    document.querySelectorAll(".menu-btn").forEach(function(btn) { btn.classList.remove("active"); });
    document.querySelectorAll(".section").forEach(function(s) { s.classList.remove("active"); });
    var btn = document.querySelector('.menu-btn[data-section="inventario"]');
    var section = document.getElementById("inventario");
    if (btn) btn.classList.add("active");
    if (section) section.classList.add("active");
    renderSection("inventario");
}

/* ⚡ NUEVO: renderiza solo lo que la sección necesita */
function renderSection(sectionId) {
    if (!isLicenseValid()) return;

    switch (sectionId) {
        case "ventas":
            renderProducts();
            renderCategoriasPOS();
            renderCart();
            break;
        case "inventario":
            renderInventory();
            break;
        case "clientes":
            renderClients();
            break;
        case "proveedores":
            renderProviders();
            break;
        case "reportes":
            renderReports();
            break;
        case "caja":
            // No se renderiza hasta que se pida cierre
            break;
    }
}

/* =========================================================
   PLANTILLAS DE MENSAJES
========================================================= */
function construirMensaje(plantillaKey, cliente, extras) {
    var plantilla = customMessages[plantillaKey] || DEFAULT_MESSAGES[plantillaKey];
    var nombre = cliente ? cliente.name : "cliente";
    var tienda = storeSettings.name || "la tienda";
    var deuda = cliente ? (cliente.balance || 0) : 0;
    var telefono = storeSettings.phone || "";
    var fecha = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
    var detalle = (extras && extras.detalle) ? extras.detalle : "";

    return plantilla
        .replace(/\{nombre\}/g, nombre)
        .replace(/\{tienda\}/g, tienda)
        .replace(/\{deuda\}/g, formatMoney(deuda))
        .replace(/\{telefono\}/g, telefono)
        .replace(/\{fecha\}/g, fecha)
        .replace(/\{detalle\}/g, detalle);
}

/* =========================================================
   LÍMITE DE FIADO
========================================================= */
function getClientLimit(client) {
    if (client && client.creditLimit > 0) return client.creditLimit;
    return creditSettings.globalLimit || 0;
}

function verificarLimiteFiado(client, fiadoNuevo) {
    var limite = getClientLimit(client);
    if (limite === 0) return { ok: true, excede: false };
    var saldoActual = client.balance || 0;
    var saldoFuturo = saldoActual + fiadoNuevo;
    return {
        ok: saldoFuturo <= limite,
        excede: saldoFuturo > limite,
        limite: limite,
        saldoActual: saldoActual,
        saldoFuturo: saldoFuturo
    };
}

function registrarCambioTope(clientId, topeAnterior, topeNuevo, motivo) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;
    if (!c.limitHistory) c.limitHistory = [];
    c.limitHistory.push({
        fecha: todayString(),
        hora: getCurrentTime(),
        anterior: topeAnterior || 0,
        nuevo: topeNuevo || 0,
        motivo: motivo || ""
    });
    debouncedSaveData();
}

/* =========================================================
   CATEGORÍAS
========================================================= */
function getCategoryByName(name) {
    return categories.find(function(c) { return c.name === name; });
}

function categoryIsWeight(name) {
    var cat = getCategoryByName(name);
    return cat ? cat.weight === true : false;
}

function getCategoryEmoji(name) {
    var cat = getCategoryByName(name);
    return cat && cat.emoji ? cat.emoji : "🏷️";
}

function renderCategoryOptions() {
    var select = document.getElementById("productCategory");
    if (!select) return;
    var currentValue = select.value;
    var html = "";

    if (categories.length === 0) {
        html = '<option value="">— Crea tu primera categoría —</option>';
    } else {
        categories.forEach(function(cat) {
            html += '<option value="' + cat.name + '">' +
                (cat.emoji ? cat.emoji + " " : "") + cat.name + (cat.weight ? " ⚖️" : "") +
                '</option>';
        });
    }
    select.innerHTML = html;

    if (currentValue && categories.find(function(c) { return c.name === currentValue; })) {
        select.value = currentValue;
    }

    var filterSelect = document.getElementById("inventoryCategoryFilter");
    if (filterSelect) {
        var currentFilter = filterSelect.value;
        var filterHtml = '<option value="">Todas las categorías</option>';
        categories.forEach(function(cat) {
            filterHtml += '<option value="' + cat.name + '">' +
                (cat.emoji ? cat.emoji + " " : "") + cat.name +
                '</option>';
        });
        filterSelect.innerHTML = filterHtml;
        if (currentFilter) filterSelect.value = currentFilter;
    }
}

function openCategoryModal(editName) {
    closeManageCategoriesModal();

    editingCategoryName = editName || null;
    var form = document.getElementById("categoryForm");
    if (form) form.reset();

    var titleEl = document.getElementById("categoryModalTitle");
    var saveBtn = document.getElementById("saveCategoryBtn");

    if (editName) {
        var cat = getCategoryByName(editName);
        if (!cat) return;
        titleEl.textContent = "✏️ Editar categoría";
        document.getElementById("newCategoryName").value = cat.name;
        document.getElementById("newCategoryWeight").checked = cat.weight === true;
        selectedEmoji = cat.emoji || "🏷️";
        saveBtn.textContent = "Guardar";
    } else {
        titleEl.textContent = "➕ Nueva categoría";
        document.getElementById("newCategoryWeight").checked = false;
        selectedEmoji = "🏷️";
        saveBtn.textContent = "Agregar";
    }

    document.getElementById("selectedEmojiPreview").textContent = selectedEmoji;
    document.getElementById("categoryModal").classList.add("show");
}

function closeCategoryModal() {
    var modal = document.getElementById("categoryModal");
    if (modal) modal.classList.remove("show");
    editingCategoryName = null;
}

function saveCategory(event) {
    if (event) event.preventDefault();
    var name = document.getElementById("newCategoryName").value.trim();
    var isWeight = document.getElementById("newCategoryWeight").checked;
    var emoji = selectedEmoji || "🏷️";

    if (!name) { alert("Escribe un nombre."); return false; }

    if (editingCategoryName) {
        var cat = getCategoryByName(editingCategoryName);
        if (!cat) { closeCategoryModal(); return false; }
        if (name !== editingCategoryName && getCategoryByName(name)) {
            alert("Ya existe otra categoría con ese nombre."); return false;
        }
        var oldName = cat.name;
        cat.name = name;
        cat.weight = isWeight;
        cat.emoji = emoji;
        if (oldName !== name) {
            products.forEach(function(p) { if (p.category === oldName) p.category = name; });
        }
        debouncedSaveData();
        renderCategoryOptions();
        renderCategoriasPOS();
        closeCategoryModal();
        renderCategoriesList();
        openManageCategoriesModal();
        showToast("✅ Categoría actualizada");
        return false;
    }

    if (getCategoryByName(name)) {
        alert("Esa categoría ya existe."); return false;
    }
    categories.push({ name: name, weight: isWeight, emoji: emoji });
    debouncedSaveData();
    renderCategoryOptions();
    renderCategoriasPOS();
    var productCatSelect = document.getElementById("productCategory");
    if (productCatSelect) productCatSelect.value = name;
    closeCategoryModal();
    toggleCategoryFields();
    renderCategoriesList();
    openManageCategoriesModal();
    showToast("✅ Categoría agregada");
    return false;
}

function deleteCategory(name) {
    var cat = getCategoryByName(name);
    if (!cat) return;

    var productosConEsaCat = products.filter(function(p) {
        return p.active !== false && p.category === name;
    });

    var mensaje = "¿Eliminar la categoría \"" + name + "\"?";
    if (productosConEsaCat.length > 0) {
        mensaje += "\n\n⚠️ Esta categoría tiene " + productosConEsaCat.length + " producto(s) asociado(s).\n\nSi la eliminas, esos productos quedarán \"Sin categoría\" hasta que les asignes una nueva.";
    }

    if (!confirm(mensaje)) return;

    categories = categories.filter(function(c) { return c.name !== name; });
    if (productosConEsaCat.length > 0) {
        products.forEach(function(p) { if (p.category === name) p.category = null; });
    }

    debouncedSaveData();
    renderCategoryOptions();
    renderCategoriasPOS();
    renderCategoriesList();
    renderData();
    showToast("🗑️ Categoría eliminada");
}

function renderCategoriesList() {
    var container = document.getElementById("categoriesList");
    if (!container) return;
    container.innerHTML = "";

    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-state">Aún no tienes categorías. Crea la primera.</p>';
        return;
    }

    var fragment = document.createDocumentFragment();
    categories.forEach(function(cat) {
        var productosCount = products.filter(function(p) {
            return p.active !== false && p.category === cat.name;
        }).length;

        var row = document.createElement("div");
        row.className = "category-list-item";
        row.innerHTML =
            '<div class="category-list-info">' +
                '<span class="category-list-emoji">' + (cat.emoji || "🏷️") + '</span>' +
                '<div>' +
                    '<strong>' + cat.name + '</strong>' +
                    '<small>' + (cat.weight ? '⚖️ Por peso' : '📦 Por unidad') + ' · ' + productosCount + ' producto(s)</small>' +
                '</div>' +
            '</div>' +
            '<div class="category-list-actions">' +
                '<button class="action-btn edit-btn" onclick="openCategoryModal(\'' + cat.name.replace(/'/g, "\\'") + '\')">Editar</button>' +
                '<button class="action-btn delete-btn" onclick="deleteCategory(\'' + cat.name.replace(/'/g, "\\'") + '\')">Eliminar</button>' +
            '</div>';
        fragment.appendChild(row);
    });
    container.appendChild(fragment);
}

function openManageCategoriesModal() {
    renderCategoriesList();
    document.getElementById("manageCategoriesModal").classList.add("show");
}

function closeManageCategoriesModal() {
    var modal = document.getElementById("manageCategoriesModal");
    if (modal) modal.classList.remove("show");
}

function toggleCategoryFields() {
    var categoryEl = document.getElementById("productCategory");
    if (!categoryEl) return;
    var category = categoryEl.value;
    var isWeight = categoryIsWeight(category);
    var unitFields = document.getElementById("unitFields");
    var weightFields = document.getElementById("weightFields");
    var hint = document.getElementById("categoryHint");

    if (isWeight) {
        if (unitFields) unitFields.style.display = "none";
        if (weightFields) weightFields.style.display = "block";
        if (hint) {
            hint.textContent = "⚖️ Esta categoría se vende por peso. Configura el precio en la unidad base.";
            hint.classList.add("show");
        }
        updateBaseUnitLabels();
    } else {
        if (unitFields) unitFields.style.display = "block";
        if (weightFields) weightFields.style.display = "none";
        if (hint) hint.classList.remove("show");
    }
}

/* =========================================================
   EMOJI PICKER
========================================================= */
function abrirEmojiPicker() {
    document.getElementById("emojiSearch").value = "";
    renderEmojiPicker("");
    document.getElementById("emojiPickerModal").classList.add("show");
}

function closeEmojiPicker() {
    document.getElementById("emojiPickerModal").classList.remove("show");
}

function renderEmojiPicker(query) {
    var container = document.getElementById("emojiPickerBody");
    if (!container) return;
    container.innerHTML = "";

    var q = (query || "").trim().toLowerCase();
    var fragment = document.createDocumentFragment();

    Object.keys(EMOJI_PACK).forEach(function(catName) {
        if (q && !catName.toLowerCase().includes(q)) return;

        var emojis = EMOJI_PACK[catName];
        var section = document.createElement("div");
        section.className = "emoji-section";

        var title = document.createElement("h4");
        title.className = "emoji-section-title";
        title.textContent = catName;
        section.appendChild(title);

        var grid = document.createElement("div");
        grid.className = "emoji-grid";
        var gridFragment = document.createDocumentFragment();

        emojis.forEach(function(emoji) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "emoji-btn";
            btn.textContent = emoji;
            btn.addEventListener("click", function() { seleccionarEmoji(emoji); });
            gridFragment.appendChild(btn);
        });

        grid.appendChild(gridFragment);
        section.appendChild(grid);
        fragment.appendChild(section);
    });

    container.appendChild(fragment);

    if (container.children.length === 0) {
        container.innerHTML = '<p class="empty-state">No se encontraron emojis.</p>';
    }
}

function seleccionarEmoji(emoji) {
    selectedEmoji = emoji;
    var preview = document.getElementById("selectedEmojiPreview");
    if (preview) preview.textContent = emoji;
    closeEmojiPicker();
}

/* =========================================================
   PRODUCTOS
========================================================= */
function getTopProducts(limit) {
    limit = limit || 4;
    var counts = {};
    sales.forEach(function(sale) {
        if (sale.cancelled) return;
        sale.products.forEach(function(p) {
            var baseName = p.name.split(" (")[0];
            counts[baseName] = (counts[baseName] || 0) + 1;
        });
    });

    var sorted = Object.entries(counts)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, limit)
        .map(function(x) { return x[0]; });

    var top = sorted
        .map(function(name) { return products.find(function(p) { return p.name === name && p.active !== false; }); })
        .filter(Boolean);

    if (top.length < limit) {
        var activeProducts = products.filter(function(p) { return p.active !== false && top.indexOf(p) === -1; });
        return top.concat(activeProducts).slice(0, limit);
    }
    return top;
}

function renderProducts() {
    var container = document.getElementById("productsGrid");
    if (!container) return;
    var search = document.getElementById("productSearch").value.trim();

    var filtered;
    if (search) {
        filtered = products.filter(function(p) { return p.active !== false && fuzzyMatch(p.name, search); });
    } else {
        filtered = getTopProducts(4);
    }

    container.innerHTML = "";

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state" style="grid-column:1/-1;">' +
            (search ? "No se encontraron productos." : "No hay productos. Agrega el primero en Inventario.") +
            '</p>';
        return;
    }

    var fragment = document.createDocumentFragment();
    filtered.forEach(function(product) {
        var card = document.createElement("div");
        card.className = "product-card";
        var isWeight = product.saleType === "weight";
        var priceDisplay, stockDisplay;
        if (isWeight) {
            priceDisplay = formatMoney(product.salePriceKg) + '<small style="font-size:11px;color:var(--muted);font-weight:normal;">/kg</small>';
            stockDisplay = "Peso: " + formatWeight(product.stock, product.baseUnit || "kg");
        } else {
            priceDisplay = formatMoney(product.salePrice);
            stockDisplay = "Stock: " + product.stock;
        }
        card.innerHTML =
            (isWeight ? '<span class="weight-badge">⚖️ PESO</span>' : '') +
            '<h4>' + product.name + '</h4>' +
            '<div class="product-price">' + priceDisplay + '</div>' +
            '<div class="product-stock">' + stockDisplay + '</div>';
        card.addEventListener("click", function() { handleProductClick(product); });
        if ((product.stock || 0) <= 0) {
            card.style.opacity = "0.5";
            card.style.pointerEvents = "none";
        }
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

function handleProductClick(product) {
    if (product.saleType === "weight") {
        openWeightModal(product);
    } else {
        addToCart(product.id);
    }
}

function openAllProductsModal() {
    var modal = document.getElementById("allProductsModal");
    if (modal) modal.classList.add("show");
    renderAllProductsList();
}

function closeAllProductsModal() {
    var modal = document.getElementById("allProductsModal");
    if (modal) modal.classList.remove("show");
    var search = document.getElementById("allProductsSearch");
    if (search) search.value = "";
}

function renderAllProductsList() {
    var container = document.getElementById("allProductsList");
    if (!container) return;
    var search = document.getElementById("allProductsSearch").value.trim();
    var filtered = products.filter(function(p) { return p.active !== false && fuzzyMatch(p.name, search); });

    container.innerHTML = "";
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state" style="grid-column:1/-1;">No hay productos.</p>';
        return;
    }

    var fragment = document.createDocumentFragment();
    filtered.forEach(function(product) {
        var card = document.createElement("div");
        card.className = "product-card";
        var isWeight = product.saleType === "weight";
        var priceDisplay, stockDisplay;
        if (isWeight) {
            priceDisplay = formatMoney(product.salePriceKg) + '<small style="font-size:11px;color:var(--muted);font-weight:normal;">/kg</small>';
            stockDisplay = "Peso: " + formatWeight(product.stock, product.baseUnit || "kg");
        } else {
            priceDisplay = formatMoney(product.salePrice);
            stockDisplay = "Stock: " + product.stock;
        }
        card.innerHTML =
            (isWeight ? '<span class="weight-badge">⚖️ PESO</span>' : '') +
            '<h4>' + product.name + '</h4>' +
            '<div class="product-price">' + priceDisplay + '</div>' +
            '<div class="product-stock">' + stockDisplay + '</div>';
        card.addEventListener("click", function() {
            handleProductClick(product);
            closeAllProductsModal();
        });
        if ((product.stock || 0) <= 0) {
            card.style.opacity = "0.5";
            card.style.pointerEvents = "none";
        }
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

/* =========================================================
   POS POR CATEGORÍAS
========================================================= */
function renderCategoriasPOS() {
    var container = document.getElementById("posCategorias");
    var label = document.getElementById("posCategoriasLabel");
    if (!container) return;
    container.innerHTML = "";

    if (categories.length === 0) {
        if (label) label.style.display = "none";
        return;
    }

    if (label) label.style.display = "flex";

    var fragment = document.createDocumentFragment();
    categories.forEach(function(cat) {
        var activos = products.filter(function(p) {
            return p.active !== false && p.category === cat.name && p.stock > 0;
        }).length;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pos-categoria-btn";
        btn.innerHTML =
            '<span class="pos-cat-emoji">' + (cat.emoji || "🏷️") + '</span>' +
            '<span class="pos-cat-name">' + cat.name + '</span>' +
            '<span class="pos-cat-count">' + activos + '</span>';
        btn.addEventListener("click", function() { abrirCategoriaPOS(cat.name); });
        fragment.appendChild(btn);
    });
    container.appendChild(fragment);
}

function abrirCategoriaPOS(catName) {
    currentPOSCategory = catName;
    posAgregados = 0;
    posTotalAgregado = 0;

    var cat = getCategoryByName(catName);
    var emoji = cat && cat.emoji ? cat.emoji : "🏷️";

    document.getElementById("posCategoriaTitle").textContent = emoji + " " + catName;
    document.getElementById("posCategoriaSearch").value = "";
    actualizarFooterPOS();

    renderCategoriaPOSGrid("");
    document.getElementById("posCategoriaModal").classList.add("show");
}

function cerrarCategoriaPOS() {
    document.getElementById("posCategoriaModal").classList.remove("show");
    currentPOSCategory = null;
    posAgregados = 0;
    posTotalAgregado = 0;
}

function renderCategoriaPOSGrid(query) {
    var container = document.getElementById("posCategoriaGrid");
    var empty = document.getElementById("posCategoriaEmpty");
    if (!container) return;
    container.innerHTML = "";

    if (!currentPOSCategory) return;

    var filtered = products.filter(function(p) {
        return p.active !== false && p.category === currentPOSCategory &&
               p.stock > 0 && fuzzyMatch(p.name, query);
    });

    if (filtered.length === 0) {
        if (empty) empty.style.display = "block";
        return;
    }
    if (empty) empty.style.display = "none";

    var fragment = document.createDocumentFragment();
    filtered.forEach(function(product) {
        var isWeight = product.saleType === "weight";
        var priceDisplay, stockDisplay;
        if (isWeight) {
            priceDisplay = formatMoney(product.salePriceKg) + '<small>/kg</small>';
            stockDisplay = formatWeight(product.stock, product.baseUnit || "kg");
        } else {
            priceDisplay = formatMoney(product.salePrice);
            stockDisplay = product.stock + " disp.";
        }

        var card = document.createElement("div");
        card.className = "pos-product-card";
        card.innerHTML =
            (isWeight ? '<span class="weight-badge">⚖️</span>' : '') +
            '<h4>' + product.name + '</h4>' +
            '<div class="pos-product-price">' + priceDisplay + '</div>' +
            '<div class="pos-product-stock">' + stockDisplay + '</div>';
        card.addEventListener("click", function() { agregarDesdePOS(product); });
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

function agregarDesdePOS(product) {
    if (product.saleType === "weight") {
        window._posReturnCat = currentPOSCategory;
        cerrarCategoriaPOS();
        openWeightModal(product, true);
        return;
    }
    addToCart(product.id);
    posAgregados += 1;
    posTotalAgregado += (product.salePrice || 0);
    actualizarFooterPOS();
}

function actualizarFooterPOS() {
    var contador = document.getElementById("posContador");
    var total = document.getElementById("posTotal");
    if (contador) {
        contador.textContent = posAgregados + " producto" + (posAgregados !== 1 ? "s" : "") + " agregado" + (posAgregados !== 1 ? "s" : "");
    }
    if (total) total.textContent = formatMoney(posTotalAgregado);
}

/* =========================================================
   CARRITO
========================================================= */
function addToCart(productId) {
    var product = getProductById(productId);
    if (!product) return;
    if (product.stock <= 0) { alert("Producto agotado."); return; }

    var existing = cart.find(function(item) { return item.productId === productId && !item.isWeight; });
    if (existing) {
        if (existing.quantity >= product.stock) {
            alert("No hay más unidades disponibles."); return;
        }
        existing.quantity++;
    } else {
        cart.push({
            productId: product.id, name: product.name,
            price: product.salePrice, purchasePrice: product.purchasePrice,
            quantity: 1, isWeight: false
        });
    }
    showToast("✅ " + product.name + " agregado");
    playSound("add"); vibrate(30);
    renderCart();
}

function addWeightToCart(product, unit, amount) {
    var baseUnit = product.baseUnit || "kg";
    var amountInBase = convertWeight(amount, unit, baseUnit);
    if (amountInBase > product.stock) {
        alert("No hay suficiente peso. Disponible: " + formatWeight(product.stock, baseUnit));
        return false;
    }
    var pricePerUnit = getPricePerUnit(product, unit);
    var subtotal = Math.round(pricePerUnit * amount);
    var purchasePerKg = product.purchasePriceKg || 0;
    var amountInKg = convertWeight(amount, unit, "kg");
    var purchaseCost = Math.round(purchasePerKg * amountInKg);

    cart.push({
        productId: product.id,
        name: product.name + " (" + formatWeight(amount, unit) + ")",
        price: subtotal, purchasePrice: purchaseCost,
        quantity: 1, isWeight: true,
        weight: amount, weightUnit: unit,
        weightInBase: amountInBase, baseUnit: baseUnit
    });
    showToast("✅ " + formatWeight(amount, unit) + " de " + product.name);
    playSound("add"); vibrate(30);
    renderCart();
    return subtotal;
}

function addUnitsToCart(product, units) {
    if (!product.unitWeight || product.unitWeight <= 0) {
        alert("Este producto no tiene configurado un peso por unidad.");
        return null;
    }
    var unitsQty = parseInt(units, 10);
    if (!unitsQty || unitsQty <= 0) {
        alert("Cantidad de unidades inválida.");
        return null;
    }

    var baseUnit = product.baseUnit || "kg";
    var pesoTotalBase = product.unitWeight * unitsQty;
    var pesoEnBase = convertWeight(pesoTotalBase, "kg", baseUnit);

    if (pesoEnBase > product.stock) {
        alert("No hay suficiente stock. Disponible: " + formatWeight(product.stock, baseUnit));
        return null;
    }

    var precioKg = product.salePriceKg || 0;
    var subtotal = Math.round(precioKg * pesoTotalBase);
    var compraKg = product.purchasePriceKg || 0;
    var costoCompra = Math.round(compraKg * pesoTotalBase);

    cart.push({
        productId: product.id,
        name: product.name + " (" + unitsQty + " und ≈ " + pesoTotalBase.toFixed(3) + " kg)",
        price: subtotal, purchasePrice: costoCompra,
        quantity: 1, isWeight: true,
        weight: pesoTotalBase, weightUnit: "kg",
        weightInBase: pesoEnBase, baseUnit: baseUnit
    });

    showToast("✅ " + unitsQty + " × " + product.name + " agregado(s)");
    playSound("add"); vibrate(30);
    renderCart();
    return subtotal;
}

function getPricePerUnit(product, unit) {
    if (unit === "kg") return product.salePriceKg || 0;
    if (unit === "lb") return product.salePriceLb || 0;
    if (unit === "arroba") return product.salePriceArroba || 0;
    return 0;
}

/* =========================================================
   MODAL DE PESO
========================================================= */
function openWeightModal(product, fromPOS) {
    if (!requireFeature("weight_sales", "Ventas por peso")) return;
    currentWeightProduct = product;

    document.getElementById("weightProductName").textContent = product.name;
    var baseUnit = product.baseUnit || "kg";
    var stockDisplay = formatWeight(product.stock, baseUnit);
    document.getElementById("weightProductPrices").textContent =
        "💵 Precios:\n• Por kg: " + formatMoney(product.salePriceKg) +
        "\n• Por libra: " + formatMoney(product.salePriceLb) +
        "\n• Por arroba: " + formatMoney(product.salePriceArroba) +
        (product.unitWeight ? "\n• Peso por unidad: " + product.unitWeight + " kg" : "") +
        "\n\n📦 Stock disponible: " + stockDisplay;

    document.getElementById("weightUnit").value = "kg";
    document.getElementById("weightAmount").value = "";
    document.getElementById("weightPriceUnit").value = "kg";
    document.getElementById("weightPriceAmount").value = "";
    document.getElementById("weightUnitQty").value = "";

    var tabUnit = document.getElementById("weightTabUnit");
    if (product.unitWeight && product.unitWeight > 0) {
        tabUnit.style.display = "inline-flex";
    } else {
        tabUnit.style.display = "none";
    }

    setWeightMode("weight");
    window._weightFromPOS = !!fromPOS;

    document.getElementById("weightModal").classList.add("show");
    updateWeightSubtotal();
    updateWeightPriceConversion();
    updateWeightUnitSubtotal();
}

function closeWeightModal() {
    var modal = document.getElementById("weightModal");
    if (modal) modal.classList.remove("show");
    currentWeightProduct = null;
    window._weightFromPOS = false;
}

function setWeightMode(mode) {
    weightMode = mode;
    document.querySelectorAll(".weight-tab").forEach(function(t) {
        t.classList.toggle("active", t.dataset.mode === mode);
    });
    document.getElementById("weightModeWeight").style.display = mode === "weight" ? "block" : "none";
    document.getElementById("weightModePrice").style.display = mode === "price" ? "block" : "none";
    document.getElementById("weightModeUnit").style.display = mode === "unit" ? "block" : "none";
}

function updateWeightSubtotal() {
    if (!currentWeightProduct) return;
    var unit = document.getElementById("weightUnit").value;
    var amount = parseFloat(document.getElementById("weightAmount").value) || 0;
    var pricePerUnit = getPricePerUnit(currentWeightProduct, unit);
    var subtotal = Math.round(pricePerUnit * amount);
    document.getElementById("weightSubtotal").textContent = formatMoney(subtotal);
    var baseUnit = currentWeightProduct.baseUnit || "kg";
    var inBase = convertWeight(amount, unit, baseUnit);
    var conversionText = document.getElementById("weightConversion");
    if (amount > 0 && unit !== baseUnit) {
        conversionText.textContent = "≈ " + formatWeight(inBase, baseUnit) + " (stock en " + baseUnit + ")";
    } else {
        conversionText.textContent = "";
    }
}

function updateWeightPriceConversion() {
    if (!currentWeightProduct) return;
    var unit = document.getElementById("weightPriceUnit").value;
    var monto = parseFloat(document.getElementById("weightPriceAmount").value) || 0;
    var pricePerUnit = getPricePerUnit(currentWeightProduct, unit);
    var el = document.getElementById("weightPriceConversion");

    if (pricePerUnit <= 0 || monto <= 0) {
        el.textContent = "0 " + (unit === "arroba" ? "@" : unit);
        return;
    }

    var peso = monto / pricePerUnit;
    var baseUnit = currentWeightProduct.baseUnit || "kg";
    var enBase = convertWeight(peso, unit, baseUnit);

    var texto = formatWeight(peso, unit);
    if (unit !== baseUnit) texto += " ≈ " + formatWeight(enBase, baseUnit);
    el.textContent = texto;
}

function updateWeightUnitSubtotal() {
    if (!currentWeightProduct) return;
    var qty = parseInt(document.getElementById("weightUnitQty").value, 10) || 0;
    var uw = currentWeightProduct.unitWeight || 0;
    var precioKg = currentWeightProduct.salePriceKg || 0;

    if (qty <= 0 || uw <= 0) {
        document.getElementById("weightUnitSubtotal").textContent = formatMoney(0);
        document.getElementById("weightUnitInfo").textContent = "";
        return;
    }

    var pesoKg = qty * uw;
    var subtotal = Math.round(pesoKg * precioKg);
    document.getElementById("weightUnitSubtotal").textContent = formatMoney(subtotal);
    document.getElementById("weightUnitInfo").textContent =
        qty + " und × " + uw + " kg = " + pesoKg.toFixed(3) + " kg";
}

function confirmWeight() {
    if (!currentWeightProduct) return;
    var product = currentWeightProduct;
    var fromPOS = window._weightFromPOS;
    var subtotalAgregado = 0;

    if (weightMode === "weight") {
        var unit = document.getElementById("weightUnit").value;
        var amount = parseFloat(document.getElementById("weightAmount").value);
        if (!amount || amount <= 0) { alert("Ingresa una cantidad válida."); return; }
        var pricePerUnit = getPricePerUnit(product, unit);
        subtotalAgregado = Math.round(pricePerUnit * amount);
        var ok = addWeightToCart(product, unit, amount);
        if (ok === false) return;
    } else if (weightMode === "price") {
        var unitP = document.getElementById("weightPriceUnit").value;
        var monto = parseFloat(document.getElementById("weightPriceAmount").value);
        if (!monto || monto <= 0) { alert("Ingresa un monto válido."); return; }
        var pricePerUnitP = getPricePerUnit(product, unitP);
        if (pricePerUnitP <= 0) { alert("Precio no configurado para esa unidad."); return; }
        var pesoCalculado = monto / pricePerUnitP;
        var okP = addWeightToCart(product, unitP, pesoCalculado);
        if (okP === false) return;
        subtotalAgregado = monto;
    } else if (weightMode === "unit") {
        var qty = parseInt(document.getElementById("weightUnitQty").value, 10);
        if (!qty || qty <= 0) { alert("Ingresa una cantidad válida."); return; }
        var result = addUnitsToCart(product, qty);
        if (result === null) return;
        subtotalAgregado = result;
    }

    closeWeightModal();

    if (fromPOS && window._posReturnCat) {
        var returnCat = window._posReturnCat;
        window._posReturnCat = null;
        abrirCategoriaPOS(returnCat);
        posAgregados += 1;
        posTotalAgregado += subtotalAgregado;
        actualizarFooterPOS();
    }
}

function addQuickProduct() {
    var input = document.getElementById("quickPrice");
    var price = Number(input.value);
    if (!price || price <= 0 || isNaN(price)) { alert("Ingresa un precio válido."); return; }
    cart.push({
        productId: null, name: "Producto rápido",
        price: Math.round(price), purchasePrice: 0,
        quantity: 1, isWeight: false
    });
    input.value = "";
    showToast("✅ Producto rápido agregado");
    playSound("add");
    renderCart();
}

function addQuickUnit() {
    var select = document.getElementById("quickUnitProduct");
    var qtyInput = document.getElementById("quickUnitQty");
    var productId = select.value;
    var qty = parseInt(qtyInput.value, 10);

    if (!productId) { alert("Selecciona un producto."); return; }
    var product = getProductById(productId);
    if (!product) return;
    if (!qty || qty <= 0) { alert("Ingresa una cantidad válida."); return; }

    var ok = addUnitsToCart(product, qty);
    if (ok !== null) qtyInput.value = "";
}

function renderQuickUnitProducts() {
    var select = document.getElementById("quickUnitProduct");
    if (!select) return;
    var current = select.value;
    var html = '<option value="">-- Seleccionar --</option>';

    var pesoConUnitWeight = products.filter(function(p) {
        return p.active !== false && p.saleType === "weight" && p.unitWeight > 0 && p.stock > 0;
    });

    if (pesoConUnitWeight.length === 0) {
        select.innerHTML = '<option value="">(No hay productos por peso con peso promedio)</option>';
        return;
    }

    pesoConUnitWeight.forEach(function(p) {
        html += '<option value="' + p.id + '">' + p.name + ' (1 und ≈ ' + p.unitWeight + ' kg)</option>';
    });
    select.innerHTML = html;
    if (current) select.value = current;
}

function changeQuantity(index, amount) {
    var item = cart[index];
    if (!item) return;
    if (item.isWeight) { if (amount < 0) removeFromCart(index); return; }
    if (amount > 0 && item.productId) {
        var product = getProductById(item.productId);
        if (product && item.quantity >= product.stock) {
            alert("No hay más unidades disponibles."); return;
        }
    }
    item.quantity += amount;
    if (item.quantity <= 0) cart.splice(index, 1);
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function getCartTotal() {
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
        total += cart[i].price * cart[i].quantity;
    }
    return total;
}

function renderCart() {
    var container = document.getElementById("cartItems");
    if (!container) return;

    var count = 0;
    for (var i = 0; i < cart.length; i++) count += cart[i].quantity;

    document.getElementById("cartCount").textContent = count + " producto" + (count !== 1 ? "s" : "");

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">No hay productos en la venta.</div>';
    } else {
        var fragment = document.createDocumentFragment();
        cart.forEach(function(item, index) {
            var row = document.createElement("div");
            row.className = "cart-item";
            row.innerHTML =
                '<div class="cart-item-info">' +
                    '<strong>' + item.name + '</strong>' +
                    '<span>' + formatMoney(item.price) + '</span>' +
                '</div>' +
                (item.isWeight
                    ? '<button class="remove-item" onclick="removeFromCart(' + index + ')">✕</button>'
                    : '<div class="quantity-controls">' +
                        '<button onclick="changeQuantity(' + index + ', -1)">-</button>' +
                        '<strong>' + item.quantity + '</strong>' +
                        '<button onclick="changeQuantity(' + index + ', 1)">+</button>' +
                       '</div>' +
                       '<strong>' + formatMoney(item.price * item.quantity) + '</strong>' +
                       '<button class="remove-item" onclick="removeFromCart(' + index + ')">✕</button>'
                );
            fragment.appendChild(row);
        });
        container.innerHTML = "";
        container.appendChild(fragment);
    }

    document.getElementById("saleTotal").textContent = formatMoney(getCartTotal());
    updateCreditClientSelect();
    calculateChange();
    actualizarResumenFiado();
}

/* =========================================================
   CAMBIO / TIPO PAGO
========================================================= */
function calculateChange() {
    var total = getCartTotal();
    var checked = document.querySelector('input[name="paymentType"]:checked');
    if (!checked) return;
    var type = checked.value;

    document.getElementById("cashBox").style.display = type === "cash" ? "block" : "none";
    document.getElementById("transferBox").style.display = type === "transfer" ? "block" : "none";
    document.getElementById("creditClientBox").style.display = type === "credit" ? "block" : "none";

    var completeBtn = document.getElementById("completeSale");
    var changeEl = document.getElementById("changeAmount");

    if (type === "credit") {
        changeEl.textContent = "Fiado";
        completeBtn.disabled = cart.length === 0;
        return;
    }
    if (type === "transfer") {
        changeEl.textContent = "Transferencia";
        completeBtn.disabled = cart.length === 0;
        return;
    }
    var received = Number(document.getElementById("cashReceived").value) || 0;
    var change = received - total;
    changeEl.textContent = change >= 0 ? formatMoney(change) : "Falta dinero";
    completeBtn.disabled = cart.length === 0 || received < total;
}

function togglePaymentMode() {
    var checked = document.querySelector('input[name="paymentType"]:checked');
    if (!checked) return;
    var type = checked.value;
    if (type === "credit" && !hasFeature("credits")) {
        alert("🔒 Las ventas fiadas requieren plan Pro o superior.");
        document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
        document.getElementById("plansModal").classList.add("show");
        return;
    }
    if (type === "transfer" && !hasFeature("transfer")) {
        alert("🔒 Los pagos por transferencia requieren plan Pro o superior.");
        document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
        document.getElementById("plansModal").classList.add("show");
        return;
    }
    document.getElementById("cashReceived").value = "";
    calculateChange();
    actualizarResumenFiado();
}

function toggleQuickMode() {
    var checked = document.querySelector('input[name="quickMode"]:checked');
    if (!checked) return;
    var mode = checked.value;
    var priceBox = document.getElementById("quickPriceBox");
    var unitBox = document.getElementById("quickUnitBox");
    if (mode === "unit") {
        priceBox.style.display = "none";
        unitBox.style.display = "block";
        renderQuickUnitProducts();
    } else {
        priceBox.style.display = "flex";
        unitBox.style.display = "none";
    }
}

/* =========================================================
   RESUMEN DE FIADO
========================================================= */
function actualizarResumenFiado() {
    var summaryBox = document.getElementById("creditSummary");
    var totalEl = document.getElementById("creditTotalDisplay");
    var abonoEl = document.getElementById("creditAbonoDisplay");
    var fiadoEl = document.getElementById("creditFiadoDisplay");
    var limitWarning = document.getElementById("creditLimitWarning");

    if (!summaryBox) return;

    var total = getCartTotal();
    var abonoElInput = document.getElementById("creditAbono");
    var abono = Number(abonoElInput ? abonoElInput.value : 0) || 0;
    var fiado = Math.max(0, total - abono);

    if (total > 0) {
        summaryBox.style.display = "block";
        totalEl.textContent = formatMoney(total);
        abonoEl.textContent = formatMoney(abono);
        fiadoEl.textContent = formatMoney(fiado);
    } else {
        summaryBox.style.display = "none";
    }

    var clientId = document.getElementById("creditClient").value;
    var client = clients.find(function(c) { return c.id === clientId; });
    if (client && limitWarning) {
        var check = verificarLimiteFiado(client, fiado);
        if (check.excede) {
            limitWarning.style.display = "block";
            limitWarning.innerHTML =
                "⚠️ Este cliente tiene un tope de fiado de " + formatMoney(check.limite) +
                ".<br>Saldo actual: " + formatMoney(check.saldoActual) +
                " · Nuevo saldo: " + formatMoney(check.saldoFuturo);
        } else {
            limitWarning.style.display = "none";
        }
    } else if (limitWarning) {
        limitWarning.style.display = "none";
    }
}

/* =========================================================
   FINALIZAR VENTA
========================================================= */
function completeSale() {
    try {
        var total = getCartTotal();
        var type = document.querySelector('input[name="paymentType"]:checked').value;
        if (cart.length === 0) { alert("No hay productos."); return; }

        var received = 0, change = 0, clientId = null, clientName = null;
        var abonoInicial = 0;
        var fechaEstimada = null;
        var notaFiado = "";
        var saleClientName = document.getElementById("saleClientName").value.trim();
        var saleClientId = document.getElementById("saleClientId").value.trim();

        if (type === "credit") {
            clientId = document.getElementById("creditClient").value;
            if (!clientId) { alert("Selecciona un cliente para el fiado."); return; }
            var client = clients.find(function(c) { return c.id === clientId; });
            clientName = client ? client.name : "";

            abonoInicial = Number(document.getElementById("creditAbono").value) || 0;
            if (abonoInicial < 0) abonoInicial = 0;
            if (abonoInicial > total) { alert("El abono inicial no puede ser mayor al total de la venta."); return; }

            var fechaInput = document.getElementById("creditEstimatedDate").value;
            if (fechaInput) fechaEstimada = fechaInput;

            notaFiado = document.getElementById("creditNote").value.trim();

            if (client) {
                var check = verificarLimiteFiado(client, total - abonoInicial);
                if (check.excede) {
                    if (!confirm("⚠️ Este cliente excederá su tope de fiado (" + formatMoney(check.limite) + ").\n\nSaldo actual: " + formatMoney(check.saldoActual) + "\nNuevo saldo: " + formatMoney(check.saldoFuturo) + "\n\n¿Continuar de todas formas?")) {
                        return;
                    }
                }
            }
        } else if (type === "cash") {
            received = Number(document.getElementById("cashReceived").value);
            if (isNaN(received) || received < total) { alert("Dinero insuficiente."); return; }
            change = received - total;
        } else if (type === "transfer") {
            received = total;
            change = 0;
        }

        cart.forEach(function(item) {
            if (!item.productId) return;
            var product = getProductById(item.productId);
            if (product) {
                if (item.isWeight) {
                    product.stock -= item.weightInBase;
                    if (product.stock < 0) product.stock = 0;
                } else {
                    product.stock -= item.quantity;
                    if (product.stock < 0) product.stock = 0;
                }
            }
        });

        var profit = cart.reduce(function(t, i) {
            return t + ((i.price - i.purchasePrice) * (i.isWeight ? 1 : i.quantity));
        }, 0);

        var sale = {
            id: generateId(),
            date: todayString(),
            time: getCurrentTime(),
            total: total, received: received, change: change,
            paymentType: type,
            clientId: clientId, clientName: clientName,
            saleClientName: saleClientName || null,
            saleClientId: saleClientId || null,
            abonoInicial: abonoInicial,
            fechaEstimada: fechaEstimada,
            notaFiado: notaFiado,
            cancelled: false,
            products: cart.map(function(i) {
                return {
                    name: i.name, quantity: i.quantity, price: i.price,
                    isWeight: i.isWeight || false,
                    weight: i.weight, weightUnit: i.weightUnit,
                    weightInBase: i.weightInBase, baseUnit: i.baseUnit,
                    productId: i.productId
                };
            }),
            quantity: cart.reduce(function(s, i) { return s + i.quantity; }, 0),
            profit: profit
        };

        sales.push(sale);

        if (type === "credit" && clientId) {
            var clientFull = clients.find(function(c) { return c.id === clientId; });
            if (clientFull) {
                if (!clientFull.movements) clientFull.movements = [];
                clientFull.movements.push({
                    type: "credit",
                    amount: total,
                    date: todayString(),
                    time: getCurrentTime(),
                    saleId: sale.id,
                    fechaEstimada: fechaEstimada,
                    nota: notaFiado,
                    productos: cart.map(function(i) {
                        return {
                            name: i.name, quantity: i.quantity, price: i.price,
                            isWeight: i.isWeight || false,
                            weight: i.weight, weightUnit: i.weightUnit,
                            subtotal: i.price * (i.isWeight ? 1 : i.quantity)
                        };
                    })
                });
                if (abonoInicial > 0) {
                    clientFull.movements.push({
                        type: "payment",
                        amount: abonoInicial,
                        date: todayString(),
                        time: getCurrentTime(),
                        saleId: sale.id,
                        note: "Abono inicial de la venta"
                    });
                }
                var fiadoReal = total - abonoInicial;
                clientFull.balance = (clientFull.balance || 0) + fiadoReal;
            }
        }

        saveData();
        playSound("sale");
        vibrate([50, 30, 50]);

        pendingSaleForReceipt = sale;
        showSuccessModal(sale);

        cart = [];
        document.getElementById("cashReceived").value = "";
        document.getElementById("saleClientName").value = "";
        document.getElementById("saleClientId").value = "";
        document.getElementById("creditAbono").value = "";
        document.getElementById("creditEstimatedDate").value = "";
        document.getElementById("creditNote").value = "";
        document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
        togglePaymentMode();
        renderCart();
        renderProducts();
    } catch (err) {
        console.error("Error en completeSale:", err);
        alert("❌ Ocurrió un error al finalizar la venta. Intenta de nuevo.");
    }
}

function showSuccessModal(sale) {
    var modal = document.getElementById("successModal");
    var details = document.getElementById("successDetails");

    var paymentLine = "";
    if (sale.paymentType === "credit") {
        paymentLine = '<div class="detail-row"><span>Tipo:</span><strong>📝 Fiado a ' + sale.clientName + '</strong></div>';
        if (sale.abonoInicial > 0) {
            paymentLine += '<div class="detail-row"><span>Abono inicial:</span><strong>' + formatMoney(sale.abonoInicial) + '</strong></div>';
            paymentLine += '<div class="detail-row"><span>Queda fiado:</span><strong>' + formatMoney(sale.total - sale.abonoInicial) + '</strong></div>';
        }
        if (sale.fechaEstimada) {
            paymentLine += '<div class="detail-row"><span>📅 Estimado:</span><strong>' + formatearFechaCorta(sale.fechaEstimada) + '</strong></div>';
        }
    } else if (sale.paymentType === "transfer") {
        paymentLine = '<div class="detail-row"><span>Tipo:</span><strong>📱 Transferencia</strong></div>';
    } else {
        paymentLine =
            '<div class="detail-row"><span>Recibido:</span><strong>' + formatMoney(sale.received) + '</strong></div>' +
            '<div class="detail-row change"><span>Cambio:</span><strong>' + formatMoney(sale.change) + '</strong></div>';
    }

    details.innerHTML =
        '<div class="detail-row"><span>Recibo #:</span><strong>' + sale.id.slice(-6).toUpperCase() + '</strong></div>' +
        '<div class="detail-row"><span>Hora:</span><strong>' + sale.time + '</strong></div>' +
        '<div class="detail-row"><span>Productos:</span><strong>' + sale.quantity + '</strong></div>' +
        paymentLine +
        '<div class="detail-row total"><span>Total:</span><span>' + formatMoney(sale.total) + '</span></div>';

    modal.classList.add("show");
}

function closeSuccessModal() {
    document.getElementById("successModal").classList.remove("show");
    pendingSaleForReceipt = null;
}

/* =========================================================
   IMPRESIÓN
========================================================= */
function moverAImpresion(elementoHTML, tituloDocumento) {
    var anterior = document.getElementById("print-container");
    if (anterior) anterior.remove();

    var container = document.createElement("div");
    container.id = "print-container";
    container.innerHTML = elementoHTML;
    document.body.appendChild(container);

    var originalTitle = document.title;
    if (tituloDocumento) document.title = tituloDocumento;

    setTimeout(function() {
        window.print();
        setTimeout(function() {
            if (container.parentNode) container.remove();
            document.title = originalTitle;
        }, 500);
    }, 100);
}

function printCurrentReceipt() {
    if (!pendingSaleForReceipt) {
        alert("No hay recibo para imprimir.");
        return;
    }
    var sale = pendingSaleForReceipt;
    closeSuccessModal();
    showReceipt(sale);
}

function imprimirRecibo() {
    var todosRecibos = document.querySelectorAll("#receiptContent .receipt-print-area");
    if (!todosRecibos.length) {
        alert("No hay recibo para imprimir.");
        return;
    }
    var htmlCompleto = "";
    todosRecibos.forEach(function(r) { htmlCompleto += r.outerHTML; });
    moverAImpresion(htmlCompleto, "Recibo_J2_" + todayString());
}

function guardarReciboPDF() {
    imprimirRecibo();
}

function showReceipt(sale) {
    if (!requireFeature("receipts", "Impresión de recibos")) return;

    var modal = document.getElementById("receiptModal");
    var content = document.getElementById("receiptContent");

    var buildReceiptHTML = function(copyLabel) {
        var productsHTML = sale.products.map(function(p) {
            var qtyText = p.isWeight ? (p.name.match(/\(([^)]+)\)/) || [])[1] || "" : "x" + p.quantity;
            var nameClean = p.name.replace(/\s*\([^)]*\)/, "");
            return '<div class="receipt-row"><span>' + nameClean + ' ' + qtyText + '</span><span>' + formatMoney(p.price * (p.isWeight ? 1 : p.quantity)) + '</span></div>';
        }).join("");

        var paymentHTML = "";
        if (sale.paymentType === "credit") {
            paymentHTML = '<div class="receipt-row"><span>Fiado a:</span><span>' + sale.clientName + '</span></div>';
            if (sale.abonoInicial > 0) {
                paymentHTML += '<div class="receipt-row"><span>Abono inicial:</span><span>' + formatMoney(sale.abonoInicial) + '</span></div>';
                paymentHTML += '<div class="receipt-row"><span>Queda fiado:</span><span>' + formatMoney(sale.total - sale.abonoInicial) + '</span></div>';
            }
            if (sale.fechaEstimada) {
                paymentHTML += '<div class="receipt-row"><span>📅 Pago estimado:</span><span>' + formatearFechaCorta(sale.fechaEstimada) + '</span></div>';
            }
        } else if (sale.paymentType === "transfer") {
            paymentHTML = '<div class="receipt-row"><span>Pago:</span><span>Transferencia</span></div>';
        } else {
            paymentHTML =
                '<div class="receipt-row"><span>Recibido:</span><span>' + formatMoney(sale.received) + '</span></div>' +
                '<div class="receipt-row"><span>Cambio:</span><span>' + formatMoney(sale.change) + '</span></div>';
        }

        var clientHTML = "";
        if (sale.saleClientName) clientHTML = '<div class="receipt-row"><span>Cliente:</span><span>' + sale.saleClientName + '</span></div>';
        if (sale.saleClientId) clientHTML += '<div class="receipt-row"><span>CC/NIT:</span><span>' + sale.saleClientId + '</span></div>';

        var storeName = storeSettings.name || "J2 · PUNTO DE VENTA";
        var storeSlogan = storeSettings.slogan ? '<p class="receipt-store-slogan">' + storeSettings.slogan + '</p>' : "";
        var contactLines = [];
        if (storeSettings.address) contactLines.push(storeSettings.address);
        if (storeSettings.phone) contactLines.push("Tel: " + storeSettings.phone);
        var storeContact = contactLines.length > 0
            ? '<p class="receipt-store-contact">' + contactLines.join(" · ") + '</p>' : "";

        var logoHTML = storeSettings.logo
            ? '<img src="' + storeSettings.logo + '" alt="' + storeName + '" class="receipt-logo" onerror="this.style.display=\'none\'">'
            : '<img src="logo.png" alt="J2" class="receipt-logo" onerror="this.style.display=\'none\'">';

        return '' +
            '<div class="receipt-print-area">' +
                logoHTML +
                '<p class="receipt-store-name">' + storeName + '</p>' +
                storeSlogan +
                storeContact +
                '<div style="text-align:center;"><span class="copy-label">' + copyLabel + '</span></div>' +
                '<div class="receipt-row"><span>Fecha:</span><span>' + sale.date + '</span></div>' +
                '<div class="receipt-row"><span>Hora:</span><span>' + sale.time + '</span></div>' +
                '<div class="receipt-row"><span>Recibo #:</span><span>' + sale.id.slice(-6).toUpperCase() + '</span></div>' +
                clientHTML +
                '<hr>' +
                productsHTML +
                '<hr>' +
                '<div class="receipt-row total"><span>TOTAL</span><span>' + formatMoney(sale.total) + '</span></div>' +
                paymentHTML +
                '<hr>' +
                '<p class="receipt-footer">¡Gracias por su compra!</p>' +
                '<div class="receipt-branding">' +
                    'Powered by <strong>Sakura · Solución IT SAS</strong><br>' +
                    '¿Quieres una app así para tu negocio? 💬 ' + SAKURA_CONFIG.phoneDisplay +
                '</div>' +
            '</div>';
    };

    content.innerHTML =
        buildReceiptHTML("COPIA - CLIENTE") +
        buildReceiptHTML("COPIA - TIENDA") +
        '<div class="receipt-actions no-print">' +
            '<button class="btn-print" onclick="imprimirRecibo()">🖨️ Imprimir (2 copias)</button>' +
            '<button class="btn-save" onclick="guardarReciboPDF()">📄 Guardar como PDF</button>' +
            '<button class="btn-close" onclick="closeReceipt()">Cerrar</button>' +
        '</div>';
    modal.classList.add("show");
}

function closeReceipt() {
    var modal = document.getElementById("receiptModal");
    if (modal) modal.classList.remove("show");
}

/* =========================================================
   INVENTARIO (con pestañas + filtro + eliminación definitiva)
========================================================= */
function switchInventoryTab(tab) {
    inventoryTab = tab;
    document.querySelectorAll(".inventory-tab").forEach(function(t) {
        t.classList.toggle("active", t.dataset.tab === tab);
    });
    renderInventory();
}

function renderInventory() {
    var table = document.getElementById("inventoryTable");
    if (!table) return;

    var search = document.getElementById("inventorySearch").value.trim();
    var catFilter = document.getElementById("inventoryCategoryFilter").value;
    var statusFilter = document.getElementById("inventoryStatusFilter").value;
    var sortBy = document.getElementById("inventorySort").value;

    var baseList = products.filter(function(p) {
        if (inventoryTab === "active") return p.active !== false;
        return p.active === false;
    });

    var filtered = baseList;
    if (search) filtered = filtered.filter(function(p) { return fuzzyMatch(p.name, search); });
    if (catFilter) filtered = filtered.filter(function(p) { return p.category === catFilter; });

    if (statusFilter && inventoryTab === "active") {
        filtered = filtered.filter(function(p) {
            if (statusFilter === "out") return p.stock <= 0;
            if (statusFilter === "low") return p.stock > 0 && p.stock <= p.minimumStock;
            if (statusFilter === "ok") return p.stock > p.minimumStock;
            return true;
        });
    }

    filtered.sort(function(a, b) {
        var priceA = a.saleType === "weight" ? a.salePriceKg : a.salePrice;
        var priceB = b.saleType === "weight" ? b.salePriceKg : b.salePrice;
        switch (sortBy) {
            case "name": return a.name.localeCompare(b.name);
            case "name_desc": return b.name.localeCompare(a.name);
            case "stock": return a.stock - b.stock;
            case "stock_desc": return b.stock - a.stock;
            case "price": return priceA - priceB;
            case "price_desc": return priceB - priceA;
            default: return 0;
        }
    });

    if (filtered.length === 0) {
        var mensaje = inventoryTab === "archived"
            ? "No hay productos archivados que coincidan."
            : "No hay productos que coincidan.";
        table.innerHTML = '<tr><td colspan="7" class="empty-state">' + mensaje + '</td></tr>';
    } else {
        var fragment = document.createDocumentFragment();
        filtered.forEach(function(product) {
            var status = "";
            if (inventoryTab === "archived") {
                status = '<span class="status" style="background:#e5e7eb; color:#374151;">🗄️ Archivado</span>';
            } else if (product.stock <= 0) {
                status = '<span class="status out">Agotado</span>';
            } else if (product.stock <= product.minimumStock) {
                status = '<span class="status low">Stock bajo</span>';
            } else {
                status = '<span class="status ok">Disponible</span>';
            }

            var isWeight = product.saleType === "weight";
            var priceDisplay, purchaseDisplay, stockDisplay;
            if (isWeight) {
                var baseUnit = product.baseUnit || "kg";
                priceDisplay = formatMoney(product.salePriceKg) + "/kg";
                purchaseDisplay = formatMoney(product.purchasePriceKg) + "/kg";
                stockDisplay = formatWeight(product.stock, baseUnit);
            } else {
                priceDisplay = formatMoney(product.salePrice);
                purchaseDisplay = formatMoney(product.purchasePrice);
                stockDisplay = product.stock;
            }

            var catDisplay = product.category || "Sin categoría";
            var catEmoji = product.category ? getCategoryEmoji(product.category) : "📦";

            var actionsHTML = "";
            if (inventoryTab === "active") {
                actionsHTML =
                    '<button class="action-btn edit-btn" onclick="editProduct(\'' + product.id + '\')">Editar</button>' +
                    '<button class="action-btn delete-btn" onclick="deleteProduct(\'' + product.id + '\')">Archivar</button>';
            } else {
                actionsHTML =
                    '<button class="action-btn restore-btn" onclick="restoreProduct(\'' + product.id + '\')">♻️ Restaurar</button>' +
                    '<button class="action-btn delete-forever-btn" onclick="openDeleteForever(\'' + product.id + '\')">🗑️ Eliminar</button>';
            }

            var row = document.createElement("tr");
            if (inventoryTab === "archived") row.style.opacity = "0.7";
            row.innerHTML =
                '<td><strong>' + product.name + '</strong>' + (isWeight ? ' <span style="font-size:11px;color:var(--warning);">⚖️</span>' : '') + '</td>' +
                '<td>' + catEmoji + ' ' + catDisplay + '</td>' +
                '<td>' + purchaseDisplay + '</td>' +
                '<td>' + priceDisplay + '</td>' +
                '<td>' + stockDisplay + '</td>' +
                '<td>' + status + '</td>' +
                '<td>' + actionsHTML + '</td>';
            fragment.appendChild(row);
        });
        table.innerHTML = "";
        table.appendChild(fragment);
    }

    var active = products.filter(function(p) { return p.active !== false; });
    var archived = products.filter(function(p) { return p.active === false; });

    document.getElementById("totalProducts").textContent = active.length;
    document.getElementById("totalStock").textContent =
        active.reduce(function(s, p) { return s + (p.saleType === "weight" ? 0 : p.stock); }, 0);
    document.getElementById("lowStock").textContent =
        active.filter(function(p) { return p.stock > 0 && p.stock <= p.minimumStock; }).length;
    document.getElementById("outStock").textContent =
        active.filter(function(p) { return p.stock <= 0; }).length;

    var tabActiveEl = document.getElementById("tabCountActive");
    var tabArchivedEl = document.getElementById("tabCountArchived");
    if (tabActiveEl) tabActiveEl.textContent = active.length;
    if (tabArchivedEl) tabArchivedEl.textContent = archived.length;

    renderStockAlert();
}

function clearInventoryFilters() {
    document.getElementById("inventorySearch").value = "";
    document.getElementById("inventoryCategoryFilter").value = "";
    document.getElementById("inventoryStatusFilter").value = "";
    document.getElementById("inventorySort").value = "name";
    renderInventory();
}

function renderStockAlert() {
    var box = document.getElementById("stockAlert");
    if (!box) return;
    var active = products.filter(function(p) { return p.active !== false; });
    var out = active.filter(function(p) { return p.stock <= 0; });
    var low = active.filter(function(p) { return p.stock > 0 && p.stock <= p.minimumStock; });
    if (out.length === 0 && low.length === 0) { box.classList.remove("show"); return; }
    box.classList.add("show");
    box.classList.toggle("danger", out.length > 0);
    var msg = "";
    if (out.length > 0 && low.length > 0) msg = "🚫 " + out.length + " agotado(s) y ⚠️ " + low.length + " con stock bajo.";
    else if (out.length > 0) msg = "🚫 " + out.length + " producto(s) agotado(s). ¡Reponer urgente!";
    else msg = "⚠️ " + low.length + " producto(s) con stock bajo.";
    box.innerHTML = '<span>' + msg + '</span><button onclick="goToInventory()">Ver inventario</button>';
}

/* =========================================================
   SIN MOVIMIENTO / SUGERENCIA
========================================================= */
function showDeadProducts() {
    var last30 = [];
    for (var i = 29; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        last30.push(d.toISOString().split("T")[0]);
    }

    var soldProductIds = new Set();
    sales.filter(function(s) { return !s.cancelled && last30.includes(s.date); })
        .forEach(function(s) {
            s.products.forEach(function(p) {
                if (p.productId) soldProductIds.add(p.productId);
            });
        });

    var dead = products.filter(function(p) {
        return p.active !== false && p.stock > 0 && !soldProductIds.has(p.id);
    });

    var content = document.getElementById("deadProductsContent");
    if (dead.length === 0) {
        content.innerHTML = "<p class='empty-state'>🎉 Todos tus productos tuvieron movimiento en los últimos 30 días. ¡Excelente!</p>";
    } else {
        content.innerHTML =
            '<p style="margin-bottom:15px; color:var(--muted); font-size:14px;">Estos productos no se han vendido en los últimos 30 días. Considera promocionarlos o bajar su precio.</p>' +
            dead.map(function(p) {
                return '<div class="dead-product-item">' +
                    '<div>' +
                        '<strong>' + p.name + '</strong>' +
                        '<small>Stock: ' + (p.saleType === "weight" ? formatWeight(p.stock, p.baseUnit || "kg") : p.stock) + ' · ' + (p.category || "Sin categoría") + '</small>' +
                    '</div>' +
                    '<button class="action-btn edit-btn" onclick="closeDeadProductsModal(); editProduct(\'' + p.id + '\');">Ajustar precio</button>' +
                '</div>';
            }).join("");
    }
    document.getElementById("deadProductsModal").classList.add("show");
}

function closeDeadProductsModal() {
    var modal = document.getElementById("deadProductsModal");
    if (modal) modal.classList.remove("show");
}

function suggestBuy() {
    if (!requireFeature("suggest_buy", "Sugerencia de compra")) return;
    var active = products.filter(function(p) { return p.active !== false; });
    var last7 = [];
    for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        last7.push(d.toISOString().split("T")[0]);
    }
    var suggestions = [];
    active.forEach(function(product) {
        var sold7 = sales.filter(function(s) { return !s.cancelled && last7.includes(s.date); })
            .flatMap(function(s) { return s.products; })
            .filter(function(p) { return p.name.startsWith(product.name); })
            .reduce(function(sum, p) { return sum + (p.quantity || 1); }, 0);
        var dailyAvg = sold7 / 7;
        var daysOfStock = dailyAvg > 0 ? product.stock / dailyAvg : 999;
        if (product.stock <= product.minimumStock || daysOfStock < 3) {
            var suggestedQty = Math.max(10, Math.ceil(dailyAvg * 7) + product.minimumStock - product.stock);
            suggestions.push({
                name: product.name,
                currentStock: product.stock.toFixed(2),
                dailyAvg: dailyAvg.toFixed(1),
                suggestedQty: suggestedQty
            });
        }
    });
    var content = document.getElementById("suggestContent");
    if (suggestions.length === 0) {
        content.innerHTML = "<p class='empty-state'>✅ No hay productos urgentes por comprar.</p>";
    } else {
        content.innerHTML = suggestions.map(function(s) {
            return '<div class="suggest-item">' +
                '<strong>' + s.name + '</strong>' +
                '<small>Stock actual: ' + s.currentStock + ' | Venta diaria: ~' + s.dailyAvg + '</small>' +
                '<div style="margin-top:8px; color: var(--primary); font-weight:bold;">' +
                    '💡 Comprar aprox: ' + s.suggestedQty +
                '</div>' +
            '</div>';
        }).join("");
    }
    document.getElementById("suggestModal").classList.add("show");
}

/* =========================================================
   MODAL PRODUCTO
========================================================= */
function openProductModal() {
    document.getElementById("modalTitle").textContent = "Nuevo producto";
    document.getElementById("productForm").reset();
    document.getElementById("productId").value = "";
    document.getElementById("minimumStock").value = 5;
    document.getElementById("baseUnit").value = "kg";
    renderCategoryOptions();

    if (categories.length === 0) {
        if (confirm("No tienes categorías creadas. ¿Quieres crear una ahora?")) {
            closeProductModal();
            openCategoryModal();
            return;
        }
    }

    toggleCategoryFields();
    updateBaseUnitLabels();
    document.getElementById("productModal").classList.add("show");
}

function closeProductModal() {
    var modal = document.getElementById("productModal");
    if (modal) modal.classList.remove("show");
}

function updateBaseUnitLabels() {
    var unitEl = document.getElementById("baseUnit");
    if (!unitEl) return;
    var unit = unitEl.value;
    var labels = { kg: "por kg", lb: "por lb", arroba: "por arroba (@)" };
    var unitName = labels[unit] || "por kg";
    document.getElementById("labelPurchaseUnit").textContent = unitName;
    document.getElementById("labelSaleUnit").textContent = unitName;
    var stockLabels = { kg: "kg", lb: "libras", arroba: "arrobas (@)" };
    document.getElementById("stockLabelWeight").textContent = "Peso disponible (" + stockLabels[unit] + ")";
    updateWeightEquivalences();
}

function updateWeightEquivalences() {
    var unitEl = document.getElementById("baseUnit");
    if (!unitEl) return;
    var unit = unitEl.value;
    var salePriceBase = Number(document.getElementById("salePriceBase").value) || 0;
    if (salePriceBase <= 0) {
        document.getElementById("eqPriceKg").textContent = "$0";
        document.getElementById("eqPriceLb").textContent = "$0";
        document.getElementById("eqPriceArroba").textContent = "$0";
        return;
    }
    var priceKg;
    if (unit === "kg") priceKg = salePriceBase;
    else if (unit === "lb") priceKg = salePriceBase * WEIGHT_CONVERSIONS.kg_to_lb;
    else if (unit === "arroba") priceKg = salePriceBase * WEIGHT_CONVERSIONS.kg_to_arroba;
    var priceLb = priceKg / WEIGHT_CONVERSIONS.kg_to_lb;
    var priceArroba = priceLb * 25;
    document.getElementById("eqPriceKg").textContent = formatMoney(Math.round(priceKg));
    document.getElementById("eqPriceLb").textContent = formatMoney(Math.round(priceLb));
    document.getElementById("eqPriceArroba").textContent = formatMoney(Math.round(priceArroba));
}

function editProduct(id) {
    var p = getProductById(id);
    if (!p) return;
    document.getElementById("modalTitle").textContent = "Editar producto";
    document.getElementById("productId").value = p.id;
    document.getElementById("productName").value = p.name;
    document.getElementById("productBarcode").value = p.barcode || "";
    renderCategoryOptions();
    document.getElementById("productCategory").value = p.category || "";

    var isWeight = p.saleType === "weight";
    if (isWeight) {
        var baseUnit = p.baseUnit || "kg";
        document.getElementById("baseUnit").value = baseUnit;
        var purchasePriceBase = 0, salePriceBase = 0;
        if (baseUnit === "kg") {
            purchasePriceBase = p.purchasePriceKg || 0;
            salePriceBase = p.salePriceKg || 0;
        } else if (baseUnit === "lb") {
            purchasePriceBase = p.purchasePriceKg ? Math.round(p.purchasePriceKg / WEIGHT_CONVERSIONS.kg_to_lb) : 0;
            salePriceBase = p.salePriceLb || 0;
        } else if (baseUnit === "arroba") {
            purchasePriceBase = p.purchasePriceKg ? Math.round(p.purchasePriceKg * WEIGHT_CONVERSIONS.kg_to_arroba) : 0;
            salePriceBase = p.salePriceArroba || 0;
        }
        document.getElementById("purchasePriceBase").value = purchasePriceBase;
        document.getElementById("salePriceBase").value = salePriceBase;
        document.getElementById("stockWeight").value = p.stock || 0;
        document.getElementById("unitWeight").value = p.unitWeight || "";
    } else {
        document.getElementById("purchasePrice").value = p.purchasePrice;
        document.getElementById("salePrice").value = p.salePrice;
        document.getElementById("stock").value = p.stock;
    }
    document.getElementById("minimumStock").value = p.minimumStock;
    toggleCategoryFields();
    updateBaseUnitLabels();
    document.getElementById("productModal").classList.add("show");
}

function saveProduct(event) {
    if (event) event.preventDefault();

    var btn = document.getElementById("saveProductBtn");
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }

    try {
        var id = document.getElementById("productId").value;
        var name = document.getElementById("productName").value.trim();
        var barcode = document.getElementById("productBarcode").value.trim();
        var category = document.getElementById("productCategory").value;
        var minStock = Number(document.getElementById("minimumStock").value);

        if (!name) { alert("Nombre obligatorio."); return false; }
        if (isNaN(minStock) || minStock < 0) { alert("Stock mínimo inválido."); return false; }
        if (!category) { alert("Debes crear o seleccionar una categoría primero."); return false; }

        var isWeightCategory = categoryIsWeight(category);
        var data = { name: name, barcode: barcode, category: category, minimumStock: minStock };

        if (isWeightCategory) {
            var baseUnit = document.getElementById("baseUnit").value;
            var ppBase = Number(document.getElementById("purchasePriceBase").value);
            var spBase = Number(document.getElementById("salePriceBase").value);
            var stockWeight = Number(document.getElementById("stockWeight").value);
            var unitWeightVal = document.getElementById("unitWeight").value.trim();
            var unitWeight = unitWeightVal === "" ? 0 : Number(unitWeightVal);

            if (isNaN(ppBase) || ppBase < 0) { alert("Precio de compra inválido."); return false; }
            if (isNaN(spBase) || spBase <= 0) { alert("Precio de venta inválido."); return false; }
            if (isNaN(stockWeight) || stockWeight < 0) { alert("Peso inválido."); return false; }
            if (isNaN(unitWeight) || unitWeight < 0) { alert("Peso por unidad inválido."); return false; }

            var priceKgPurchase, priceKgSale, priceLbSale, priceArrobaSale;
            if (baseUnit === "kg") {
                priceKgPurchase = ppBase; priceKgSale = spBase;
                priceLbSale = Math.round(spBase / WEIGHT_CONVERSIONS.kg_to_lb);
                priceArrobaSale = Math.round(priceLbSale * 25);
            } else if (baseUnit === "lb") {
                priceKgPurchase = Math.round(ppBase * WEIGHT_CONVERSIONS.kg_to_lb);
                priceKgSale = Math.round(spBase * WEIGHT_CONVERSIONS.kg_to_lb);
                priceLbSale = spBase;
                priceArrobaSale = Math.round(spBase * 25);
            } else {
                priceKgPurchase = Math.round(ppBase * WEIGHT_CONVERSIONS.kg_to_arroba);
                priceKgSale = Math.round(spBase * WEIGHT_CONVERSIONS.kg_to_arroba);
                priceLbSale = Math.round(spBase / 25);
                priceArrobaSale = spBase;
            }

            data = Object.assign(data, {
                saleType: "weight", baseUnit: baseUnit,
                purchasePriceKg: priceKgPurchase, salePriceKg: priceKgSale,
                salePriceLb: priceLbSale, salePriceArroba: priceArrobaSale,
                stock: stockWeight,
                purchasePrice: priceKgPurchase, salePrice: priceKgSale,
                unitWeight: unitWeight
            });
        } else {
            var pp = Number(document.getElementById("purchasePrice").value);
            var sp = Number(document.getElementById("salePrice").value);
            var stock = Number(document.getElementById("stock").value);
            if (isNaN(pp) || pp < 0) { alert("Precio compra inválido."); return false; }
            if (isNaN(sp) || sp <= 0) { alert("Precio venta inválido."); return false; }
            if (isNaN(stock) || stock < 0) { alert("Stock inválido."); return false; }
            if (sp < pp && !confirm("⚠️ Precio venta < precio compra. ¿Continuar?")) return false;
            data = Object.assign(data, { saleType: "unit", purchasePrice: pp, salePrice: sp, stock: stock, unitWeight: 0 });
        }

        if (barcode && !hasFeature("barcode")) {
            alert("🔒 El código de barras requiere plan ProMax.");
            document.getElementById("productBarcode").value = "";
            data.barcode = "";
        }
        if (barcode) {
            var exists = products.find(function(p) { return p.barcode === barcode && p.id !== id && p.active !== false; });
            if (exists) { alert("Código ya asignado a \"" + exists.name + "\"."); return false; }
        }
        if (!id && !checkProductLimit()) return false;

        if (id) {
            var idx = products.findIndex(function(p) { return p.id === id; });
            if (idx !== -1) products[idx] = Object.assign({}, products[idx], data);
        } else {
            products.push(Object.assign({ id: generateId(), active: true }, data));
        }
        saveData();
        closeProductModal();
        showToast("💾 Producto guardado");
        renderData();
        return false;
    } catch (err) {
        console.error("Error guardando producto:", err);
        alert("❌ Error al guardar. Intenta de nuevo.");
        return false;
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
    }
}

function deleteProduct(id) {
    var p = getProductById(id);
    if (!p) return;

    var enCarrito = cart.some(function(item) { return item.productId === id; });
    if (enCarrito) {
        if (!confirm("⚠️ Este producto está en la venta actual.\n\nSi lo archivas, seguirá en el carrito pero no aparecerá para nuevas ventas.\n\n¿Continuar?")) return;
    } else {
        if (!confirm("¿Archivar \"" + p.name + "\"?\n\nPodrás restaurarlo desde la pestaña 'Archivados'.")) return;
    }
    p.active = false;
    saveData();
    showToast("📦 Producto archivado");
    renderData();
}

function restoreProduct(id) {
    var p = getProductById(id);
    if (!p) return;
    if (!confirm("¿Restaurar \"" + p.name + "\" a productos activos?")) return;
    p.active = true;
    saveData();
    showToast("♻️ Producto restaurado");
    renderData();
}

/* =========================================================
   ELIMINAR DEFINITIVO (requiere contraseña de admin)
========================================================= */
function openDeleteForever(id) {
    var p = getProductById(id);
    if (!p) return;

    productToDeleteForever = p;

    document.getElementById("deleteForeverInfo").innerHTML =
        '<strong>Producto:</strong> ' + p.name + '<br>' +
        '<strong>Categoría:</strong> ' + (p.category || "Sin categoría") + '<br>' +
        '<strong>Stock actual:</strong> ' + (p.saleType === "weight" ? formatWeight(p.stock, p.baseUnit || "kg") : p.stock);

    document.getElementById("deleteForeverPassword").value = "";
    document.getElementById("deleteForeverModal").classList.add("show");
}

function closeDeleteForeverModal() {
    var modal = document.getElementById("deleteForeverModal");
    if (modal) modal.classList.remove("show");
    productToDeleteForever = null;
}

async function confirmDeleteForever() {
    if (!productToDeleteForever) return;

    var password = document.getElementById("deleteForeverPassword").value;

    if (!password) {
        alert("Ingresa la contraseña de administrador.");
        return;
    }

    /* Verificar contraseña con SHA-256 */
    var hash = await CryptoUtils.sha256Hex(password);
    if (hash !== ADMIN_PASSWORD_HASH) {
        alert("❌ Contraseña incorrecta.");
        document.getElementById("deleteForeverPassword").value = "";
        return;
    }

    /* Doble confirmación */
    if (!confirm("⚠️ ÚLTIMA ADVERTENCIA\n\n¿Eliminar PERMANENTEMENTE \"" + productToDeleteForever.name + "\"?\n\nEsta acción NO se puede deshacer.")) {
        return;
    }

    var productName = productToDeleteForever.name;
    var id = productToDeleteForever.id;

    /* Eliminar del array */
    products = products.filter(function(p) { return p.id !== id; });

    saveData();
    closeDeleteForeverModal();
    showToast("🗑️ \"" + productName + "\" eliminado permanentemente");
    renderData();
}

/* =========================================================
   CLIENTES
========================================================= */
function openClientModal() {
    if (!requireFeature("credits", "Clientes y fiados")) return;
    document.getElementById("clientModalTitle").textContent = "Nuevo cliente";
    document.getElementById("clientForm").reset();
    document.getElementById("clientId").value = "";
    document.getElementById("clientBalance").value = 0;
    document.getElementById("clientDocType").value = "CC";
    document.getElementById("clientCreditLimit").value = "";
    document.getElementById("clientCreditLimitNote").value = "";
    document.getElementById("clientModal").classList.add("show");
}

function closeClientModal() {
    var modal = document.getElementById("clientModal");
    if (modal) modal.classList.remove("show");
}

function editClient(id) {
    if (!requireFeature("credits", "Clientes y fiados")) return;
    var c = clients.find(function(x) { return x.id === id; });
    if (!c) return;
    document.getElementById("clientModalTitle").textContent = "Editar cliente";
    document.getElementById("clientId").value = c.id;
    document.getElementById("clientName").value = c.name;
    document.getElementById("clientDocType").value = c.docType || "CC";
    document.getElementById("clientDocNumber").value = c.docNumber || "";
    document.getElementById("clientPhone").value = c.phone || "";
    document.getElementById("clientAddress").value = c.address || "";
    document.getElementById("clientBalance").value = c.balance || 0;
    document.getElementById("clientCreditLimit").value = c.creditLimit || "";
    document.getElementById("clientCreditLimitNote").value = "";
    document.getElementById("clientModal").classList.add("show");
}

function saveClient(event) {
    if (event) event.preventDefault();
    var btn = document.getElementById("saveClientBtn");
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }

    try {
        var id = document.getElementById("clientId").value;
        var name = document.getElementById("clientName").value.trim();
        var docType = document.getElementById("clientDocType").value;
        var docNumber = document.getElementById("clientDocNumber").value.trim();
        var phone = document.getElementById("clientPhone").value.trim();
        var address = document.getElementById("clientAddress").value.trim();
        var balance = Number(document.getElementById("clientBalance").value) || 0;
        var creditLimit = Number(document.getElementById("clientCreditLimit").value) || 0;
        var creditLimitNote = document.getElementById("clientCreditLimitNote").value.trim();

        if (!name) { alert("Nombre obligatorio."); return false; }

        if (id) {
            var idx = clients.findIndex(function(c) { return c.id === id; });
            if (idx !== -1) {
                var anteriorLimit = clients[idx].creditLimit || 0;
                clients[idx] = Object.assign({}, clients[idx], {
                    name: name, docType: docType, docNumber: docNumber,
                    phone: phone, address: address, balance: balance,
                    creditLimit: creditLimit
                });
                if (anteriorLimit !== creditLimit) {
                    registrarCambioTope(id, anteriorLimit, creditLimit, creditLimitNote);
                }
            }
        } else {
            clients.push({
                id: generateId(),
                name: name, docType: docType, docNumber: docNumber,
                phone: phone, address: address, balance: balance,
                creditLimit: creditLimit,
                movements: [], messages: [], limitHistory: []
            });
        }
        saveData();
        closeClientModal();
        showToast("💾 Cliente guardado");
        renderClients();
        return false;
    } catch (err) {
        console.error("Error guardando cliente:", err);
        alert("❌ Error al guardar. Intenta de nuevo.");
        return false;
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
    }
}

function deleteClient(id) {
    var c = clients.find(function(x) { return x.id === id; });
    if (!c) return;
    if (c.balance > 0) {
        alert(c.name + " debe " + formatMoney(c.balance) + ". No se puede eliminar.");
        return;
    }
    if (!confirm("¿Eliminar a \"" + c.name + "\"?")) return;
    clients = clients.filter(function(x) { return x.id !== id; });
    saveData();
    showToast("🗑️ Cliente eliminado");
    renderClients();
}

function renderClients() {
    var table = document.getElementById("clientsTable");
    if (!table) return;
    table.innerHTML = "";
    if (clients.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="empty-state">No hay clientes registrados.</td></tr>';
        document.getElementById("totalClients").textContent = 0;
        document.getElementById("totalDebt").textContent = formatMoney(0);
        document.getElementById("expiredCredits").textContent = 0;
        return;
    }

    var totalEstimadosCumplidos = 0;
    var fragment = document.createDocumentFragment();

    clients.forEach(function(client) {
        var bal = client.balance || 0;
        var row = document.createElement("tr");

        var docDisplay = "—";
        if (client.docNumber) docDisplay = (client.docType || "CC") + " " + client.docNumber;

        var estimadosCumplidos = (client.movements || []).filter(function(m) {
            return m.type === "credit" && m.fechaEstimada && fechaEstimadaCumplida(m.fechaEstimada);
        }).length;
        if (estimadosCumplidos > 0) totalEstimadosCumplidos += estimadosCumplidos;

        var diasAntiguo = 0;
        (client.movements || []).forEach(function(m) {
            if (m.type === "credit") {
                var d = diasDesde(m.date);
                if (d > diasAntiguo) diasAntiguo = d;
            }
        });
        var esAntiguo = diasAntiguo >= creditSettings.oldDays;
        var showWhatsapp = bal > 0 && hasFeature("whatsapp");

        var badges = "";
        if (estimadosCumplidos > 0) badges += ' <span style="color:#f97316; font-size:11px; font-weight:700;">📅 ' + estimadosCumplidos + ' estimado(s)</span>';
        if (esAntiguo && bal > 0) badges += ' <span style="color:#6b7280; font-size:11px; font-weight:700;">⏰ +' + diasAntiguo + 'd</span>';

        row.innerHTML =
            '<td><strong>' + client.name + '</strong>' + badges + '</td>' +
            '<td style="font-size:12px;">' + docDisplay + '</td>' +
            '<td>' + (client.phone || "-") + '</td>' +
            '<td style="color:' + (bal > 0 ? '#dc2626' : '#16a34a') + '; font-weight:bold;">' + formatMoney(bal) + '</td>' +
            '<td>' +
                (bal > 0
                    ? '<button class="action-btn abono-btn" onclick="openAbono(\'' + client.id + '\')">💰 Abonar</button>' +
                      '<button class="action-btn" style="background:#dcfce7;color:#166534;" onclick="openQuickPayment(\'' + client.id + '\')">✅ Cobrar todo</button>' +
                      (showWhatsapp ? '<button class="action-btn wa-btn" onclick="abrirSelectorMensaje(\'' + client.id + '\')">📱 WhatsApp</button>' : '')
                    : '') +
                '<button class="action-btn view-btn" onclick="viewClientDetail(\'' + client.id + '\')">📋 Ver</button>' +
                '<button class="action-btn edit-btn" onclick="editClient(\'' + client.id + '\')">Editar</button>' +
                '<button class="action-btn delete-btn" onclick="deleteClient(\'' + client.id + '\')">Eliminar</button>' +
            '</td>';
        fragment.appendChild(row);
    });

    table.appendChild(fragment);
    document.getElementById("totalClients").textContent = clients.length;
    document.getElementById("totalDebt").textContent =
        formatMoney(clients.reduce(function(s, c) { return s + (c.balance || 0); }, 0));
    document.getElementById("expiredCredits").textContent = totalEstimadosCumplidos;
}

function logMessageSent(clientId, tipo) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;
    if (!c.messages) c.messages = [];
    c.messages.push({ tipo: tipo, date: todayString(), time: getCurrentTime() });
    debouncedSaveData();
}

/* =========================================================
   SELECTOR DE MENSAJE DE WHATSAPP
========================================================= */
function abrirSelectorMensaje(clientId) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;

    currentMessageClient = c;
    document.getElementById("messageSelectorClient").textContent = c.name;

    var options = document.getElementById("messageSelectorOptions");
    options.innerHTML = "";

    var tipos = [
        { tipo: "reminder", icon: "📩", titulo: "Recordatorio amigable", desc: "Mensaje cordial para recordar el saldo pendiente" },
        { tipo: "statement", icon: "📄", titulo: "Estado de cuenta completo", desc: "Detalle de fiados y abonos con el saldo total" },
        { tipo: "oldCredit", icon: "⏰", titulo: "Aviso de fiado antiguo", desc: "Para saldos con más de " + creditSettings.oldDays + " días" },
        { tipo: "custom", icon: "💬", titulo: "Mensaje personalizado", desc: "Escribe tú mismo el mensaje" }
    ];

    var fragment = document.createDocumentFragment();
    tipos.forEach(function(t) {
        var div = document.createElement("div");
        div.className = "message-option";

        var preview = "";
        if (t.tipo === "custom") {
            preview = "Se abrirá WhatsApp para que escribas";
        } else {
            var msg = customMessages[t.tipo] || DEFAULT_MESSAGES[t.tipo];
            preview = msg.replace(/\{nombre\}/g, c.name)
                        .replace(/\{deuda\}/g, formatMoney(c.balance || 0))
                        .replace(/\{tienda\}/g, storeSettings.name || "la tienda")
                        .substring(0, 80) + "...";
        }

        div.innerHTML =
            '<span class="message-option-icon">' + t.icon + '</span>' +
            '<div class="message-option-info">' +
                '<strong>' + t.titulo + '</strong>' +
                '<small>' + preview + '</small>' +
            '</div>';

        div.addEventListener("click", function() { enviarMensajeWhatsApp(c.id, t.tipo); });
        fragment.appendChild(div);
    });
    options.appendChild(fragment);

    document.getElementById("messageSelectorModal").classList.add("show");
}

function closeMessageSelectorModal() {
    var modal = document.getElementById("messageSelectorModal");
    if (modal) modal.classList.remove("show");
    currentMessageClient = null;
}

function enviarMensajeWhatsApp(clientId, tipo) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;

    var phoneClean = (c.phone || "").replace(/\D/g, "");
    if (!phoneClean) {
        alert("⚠️ Este cliente no tiene teléfono registrado.\n\nEdita el cliente para agregarlo.");
        return;
    }

    var mensaje = "";
    if (tipo === "custom") {
        mensaje = "";
    } else if (tipo === "statement") {
        var creditos = (c.movements || []).filter(function(m) { return m.type === "credit"; });
        var detalle = creditos.slice(0, 8).map(function(m) {
            var linea = "• " + m.date + ": " + formatMoney(m.amount);
            if (m.productos && m.productos.length > 0) {
                var productosResumen = m.productos.slice(0, 3)
                    .map(function(p) { return p.name + (p.quantity > 1 ? " x" + p.quantity : ""); })
                    .join(", ");
                linea += "\n   " + productosResumen;
            }
            return linea;
        }).join("\n");
        mensaje = construirMensaje("statement", c, { detalle: detalle });
    } else {
        mensaje = construirMensaje(tipo, c);
    }

    var waLink = "https://wa.me/57" + phoneClean;
    if (mensaje) waLink += "?text=" + encodeURIComponent(mensaje);
    window.open(waLink, "_blank");

    if (tipo !== "custom") logMessageSent(c.id, tipo);
    closeMessageSelectorModal();
}

/* =========================================================
   DETALLE DEL CLIENTE
========================================================= */
function viewClientDetail(clientId) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;

    var movements = (c.movements || []).slice().reverse();
    var totalCredit = (c.movements || []).filter(function(m) { return m.type === "credit"; })
        .reduce(function(s, m) { return s + m.amount; }, 0);
    var totalPaid = (c.movements || []).filter(function(m) { return m.type === "payment"; })
        .reduce(function(s, m) { return s + m.amount; }, 0);

    var docDisplay = c.docNumber ? ((c.docType || "CC") + " " + c.docNumber) : "No registrado";

    var movementsHTML = movements.length === 0
        ? '<p class="empty-state">Sin movimientos registrados</p>'
        : movements.map(function(m, idx) {
            var estimado = m.fechaEstimada ? formatearFechaCorta(m.fechaEstimada) : "";
            var cumplido = m.fechaEstimada && fechaEstimadaCumplida(m.fechaEstimada);
            var diasDesdeCompra = diasDesde(m.date);

            var metaLine = '<small style="color:var(--muted); margin-left:8px;">' + m.date + ' ' + (m.time || "") + '</small>';
            if (m.type === "credit" && diasDesdeCompra > 0) {
                metaLine += '<small style="color:' + (diasDesdeCompra >= creditSettings.oldDays ? '#dc2626' : '#94a3b8') + '; margin-left:8px;">hace ' + diasDesdeCompra + 'd</small>';
            }

            var extrasHTML = "";
            if (m.type === "credit" && m.fechaEstimada) {
                extrasHTML += '<div style="font-size:11px; color:' + (cumplido ? '#f97316' : '#6b7280') + '; margin-top:3px;">' +
                    (cumplido ? '📅 Estimado: ' : '📅 Pagará: ') + estimado + '</div>';
            }
            if (m.type === "credit" && m.nota) {
                extrasHTML += '<div style="font-size:11px; color:#6b7280; font-style:italic; margin-top:3px;">📝 "' + m.nota + '"</div>';
            }

            var detalleBtn = "";
            if (m.type === "credit" && m.productos && m.productos.length > 0) {
                detalleBtn = '<button class="action-btn" style="background:#e0e7ff;color:#3730a3;font-size:11px;padding:5px 9px;margin-top:5px;" onclick="openCreditDetail(\'' + c.id + '\',' + (c.movements.length - 1 - idx) + ')">👁 Ver productos</button>';
            }

            return '<div class="abono-history-item" style="flex-direction:column; align-items:stretch;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div>' +
                        '<span class="abono-type ' + m.type + '">' + (m.type === "credit" ? "📝 Fiado" : "💰 Abono") + '</span>' +
                        metaLine +
                    '</div>' +
                    '<span class="abono-amount ' + m.type + '">' + (m.type === "credit" ? "+" : "-") + formatMoney(m.amount) + '</span>' +
                '</div>' +
                extrasHTML +
                '<div style="margin-top:5px;">' + detalleBtn + '</div>' +
            '</div>';
        }).join("");

    var messages = (c.messages || []).slice().reverse().slice(0, 10);
    var messagesHTML = messages.length === 0
        ? '<p class="empty-state">Sin mensajes enviados</p>'
        : messages.map(function(m) {
            return '<div class="abono-history-item" style="padding:8px 12px;">' +
                '<div>' +
                    '<span style="font-size:12px;">' + (m.tipo === "reminder" ? "📩 Recordatorio" : m.tipo === "statement" ? "📄 Estado de cuenta" : "📅 Recordatorio antiguo") + '</span>' +
                    '<small style="color:var(--muted); margin-left:8px;">' + m.date + ' ' + (m.time || "") + '</small>' +
                '</div>' +
            '</div>';
        }).join("");

    var limitHistory = (c.limitHistory || []).slice().reverse();
    var limitHistoryHTML = "";
    if (limitHistory.length > 0) {
        limitHistoryHTML =
            '<p class="abono-history-title" style="margin-top:20px;">🔐 Historial de topes</p>' +
            limitHistory.map(function(h) {
                return '<div class="abono-history-item" style="padding:8px 12px;">' +
                    '<div>' +
                        '<span style="font-size:12px;">' + formatMoney(h.anterior) + ' → ' + formatMoney(h.nuevo) + '</span>' +
                        '<small style="color:var(--muted); margin-left:8px; display:block;">' + h.fecha + ' ' + h.hora + '</small>' +
                        (h.motivo ? '<small style="color:#6b7280; font-style:italic;">"' + h.motivo + '"</small>' : '') +
                    '</div>' +
                '</div>';
            }).join("");
    }

    var content = document.getElementById("clientDetailContent");
    content.innerHTML =
        '<div class="client-detail-card">' +
            '<h3>👤 ' + c.name + '</h3>' +
            '<p>🆔 Documento: <strong>' + docDisplay + '</strong></p>' +
            '<p>📱 Teléfono: <strong>' + (c.phone || "No registrado") + '</strong></p>' +
            '<p>🏠 Dirección: <strong>' + (c.address || "No registrada") + '</strong></p>' +
            (getClientLimit(c) > 0 ? '<p>💰 Tope de fiado: <strong>' + formatMoney(getClientLimit(c)) + '</strong>' + (c.creditLimit > 0 ? ' (personalizado)' : ' (global)') + '</p>' : '') +
        '</div>' +
        '<div class="inventory-summary" style="margin-bottom:15px;">' +
            '<div class="summary-card"><span>Total fiado</span><strong>' + formatMoney(totalCredit) + '</strong></div>' +
            '<div class="summary-card"><span>Total abonado</span><strong>' + formatMoney(totalPaid) + '</strong></div>' +
            '<div class="summary-card danger"><span>Saldo actual</span><strong>' + formatMoney(c.balance || 0) + '</strong></div>' +
        '</div>' +
        '<div style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap;">' +
            '<button class="primary-btn" style="flex:1; min-width:140px;" onclick="closeClientDetailModal(); openAccountStatement(\'' + c.id + '\')">📄 Estado de cuenta</button>' +
            (c.balance > 0 ? '<button class="secondary-btn" style="flex:1; min-width:140px;" onclick="closeClientDetailModal(); openQuickPayment(\'' + c.id + '\')">💰 Cobrar todo</button>' : '') +
        '</div>' +
        '<p class="abono-history-title">📜 Movimientos (' + movements.length + ')</p>' +
        movementsHTML +
        '<p class="abono-history-title" style="margin-top:20px;">📤 Mensajes enviados</p>' +
        messagesHTML +
        limitHistoryHTML;

    document.getElementById("clientDetailModal").classList.add("show");
}

function closeClientDetailModal() {
    var modal = document.getElementById("clientDetailModal");
    if (modal) modal.classList.remove("show");
}

/* =========================================================
   DETALLE DE UN FIADO
========================================================= */
function openCreditDetail(clientId, movementIndex) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;
    var m = c.movements[movementIndex];
    if (!m) return;

    var productosHTML = (m.productos || []).map(function(p) {
        return '<div class="statement-row">' +
            '<div><strong>' + p.name + '</strong>' + (p.quantity > 1 ? ' <small style="color:#666;">x' + p.quantity + '</small>' : '') + '</div>' +
            '<div style="text-align:right;"><strong>' + formatMoney(p.subtotal) + '</strong></div>' +
        '</div>';
    }).join("");

    var extrasHTML = "";
    if (m.fechaEstimada) extrasHTML += '<p style="margin-top:10px;"><strong>📅 Pago estimado:</strong> ' + formatearFechaCorta(m.fechaEstimada) + '</p>';
    if (m.nota) extrasHTML += '<p style="margin-top:5px; color:#6b7280; font-style:italic;">📝 "' + m.nota + '"</p>';

    var content = document.getElementById("creditDetailContent");
    content.innerHTML =
        '<div style="margin-bottom:15px;">' +
            '<p><strong>Fecha:</strong> ' + m.date + ' ' + (m.time || "") + '</p>' +
            '<p><strong>Cliente:</strong> ' + c.name + '</p>' +
            (m.saleId ? '<p><strong>Recibo #:</strong> ' + m.saleId.slice(-6).toUpperCase() + '</p>' : '') +
        '</div>' +
        '<h4 style="margin-bottom:10px; font-size:14px; color:#1e40af;">Productos:</h4>' +
        (productosHTML || '<p style="color:#666;">Sin detalle de productos</p>') +
        '<div class="statement-total" style="margin-top:15px;">' +
            '<span>TOTAL FIADO:</span><strong>' + formatMoney(m.amount) + '</strong>' +
        '</div>' + extrasHTML;

    document.getElementById("creditDetailTitle").textContent = "Detalle del fiado";
    document.getElementById("creditDetailModal").classList.add("show");
}

function closeCreditDetailModal() {
    var modal = document.getElementById("creditDetailModal");
    if (modal) modal.classList.remove("show");
}

function updateCreditClientSelect() {
    var select = document.getElementById("creditClient");
    if (!select) return;
    var current = select.value;
    var html = '<option value="">-- Seleccionar cliente --</option>';
    clients.forEach(function(c) {
        html += '<option value="' + c.id + '">' + c.name + (c.balance > 0 ? " (debe " + formatMoney(c.balance) + ")" : "") + '</option>';
    });
    select.innerHTML = html;
    if (current) select.value = current;
}

/* =========================================================
   ESTADO DE CUENTA
========================================================= */
function openAccountStatement(clientId) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;
    currentClientForStatement = c;

    var creditos = (c.movements || []).filter(function(m) { return m.type === "credit"; });
    var pagos = (c.movements || []).filter(function(m) { return m.type === "payment"; });

    var detalleHTML = creditos.map(function(m) {
        var estimado = m.fechaEstimada ? formatearFechaCorta(m.fechaEstimada) : "";
        var cumplido = m.fechaEstimada && fechaEstimadaCumplida(m.fechaEstimada);
        var productosHTML = (m.productos || []).map(function(p) {
            return '<div style="padding-left:20px; font-size:12px; color:#666; margin:2px 0;">• ' + p.name + (p.quantity > 1 ? " x" + p.quantity : "") + ' — ' + formatMoney(p.subtotal) + '</div>';
        }).join("");

        return '<div class="statement-row" style="flex-direction:column; align-items:stretch;">' +
            '<div style="display:flex; justify-content:space-between;">' +
                '<div>' +
                    '<strong>Venta ' + (m.saleId ? "#" + m.saleId.slice(-6).toUpperCase() : "") + '</strong><br>' +
                    '<small style="color:#666;">' + m.date + ' ' + (m.time || "") + '</small>' +
                    (m.fechaEstimada ? '<br><small style="color:' + (cumplido ? '#f97316' : '#666') + ';">📅 Estimado: ' + estimado + '</small>' : '') +
                    (m.nota ? '<br><small style="color:#6b7280; font-style:italic;">📝 "' + m.nota + '"</small>' : '') +
                '</div>' +
                '<div style="text-align:right;"><strong>' + formatMoney(m.amount) + '</strong></div>' +
            '</div>' + productosHTML +
        '</div>';
    }).join("");

    var pagosHTML = pagos.map(function(m) {
        return '<div class="statement-row">' +
            '<div>' +
                '<strong>Abono</strong><br>' +
                '<small style="color:#666;">' + m.date + ' ' + (m.time || "") + '</small>' +
                (m.note ? '<br><small style="color:#666; font-style:italic;">' + m.note + '</small>' : '') +
            '</div>' +
            '<div style="text-align:right; color:#16a34a;"><strong>-' + formatMoney(m.amount) + '</strong></div>' +
        '</div>';
    }).join("");

    var docDisplay = c.docNumber ? ((c.docType || "CC") + " " + c.docNumber) : "";
    var storeName = storeSettings.name || "J2";
    var storePhone = storeSettings.phone || "";
    var storeAddress = storeSettings.address || "";
    var fecha = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

    var content = document.getElementById("accountStatementContent");
    content.innerHTML =
        '<div class="statement-container">' +
            '<div class="statement-header">' +
                '<h2>' + storeName + '</h2>' +
                (storeAddress ? '<p>' + storeAddress + '</p>' : '') +
                (storePhone ? '<p>Tel: ' + storePhone + '</p>' : '') +
                '<h3>ESTADO DE CUENTA</h3>' +
                '<p>Fecha: ' + fecha + '</p>' +
            '</div>' +
            '<div class="statement-client">' +
                '<p><strong>Cliente:</strong> ' + c.name + '</p>' +
                (docDisplay ? '<p><strong>Documento:</strong> ' + docDisplay + '</p>' : '') +
                (c.phone ? '<p><strong>Teléfono:</strong> ' + c.phone + '</p>' : '') +
            '</div>' +
            '<h4>Fiados</h4>' +
            (detalleHTML || '<p style="color:#666;">Sin fiados registrados</p>') +
            '<h4>Abonos</h4>' +
            (pagosHTML || '<p style="color:#666;">Sin abonos registrados</p>') +
            '<div class="statement-total">' +
                '<span>SALDO PENDIENTE:</span><strong>' + formatMoney(c.balance || 0) + '</strong>' +
            '</div>' +
            '<div class="statement-footer">' +
                'Gracias por su preferencia.<br>' +
                'J2 · Punto de Venta · Sakura Solución IT SAS' +
            '</div>' +
        '</div>';

    document.getElementById("accountStatementModal").classList.add("show");
}

function closeAccountStatementModal() {
    var modal = document.getElementById("accountStatementModal");
    if (modal) modal.classList.remove("show");
    currentClientForStatement = null;
}

function printAccountStatement() {
    var reporte = document.querySelector(".statement-container");
    if (!reporte) return;
    var titulo = currentClientForStatement ? "Estado_Cuenta_" + currentClientForStatement.name.replace(/\s+/g, "_") : "Estado_Cuenta";
    moverAImpresion(reporte.outerHTML, titulo);
}

function sendAccountStatementWa() {
    if (!currentClientForStatement) return;
    var c = currentClientForStatement;
    var phoneClean = (c.phone || "").replace(/\D/g, "");
    if (!phoneClean) { alert("El cliente no tiene teléfono registrado."); return; }

    var creditos = (c.movements || []).filter(function(m) { return m.type === "credit"; });
    var detalle = creditos.slice(0, 8).map(function(m) {
        var linea = "• " + m.date + ": " + formatMoney(m.amount);
        if (m.productos && m.productos.length > 0) {
            var productosResumen = m.productos.slice(0, 3).map(function(p) { return p.name + (p.quantity > 1 ? " x" + p.quantity : ""); }).join(", ");
            linea += "\n   " + productosResumen;
        }
        if (m.fechaEstimada) linea += " (estimado " + formatearFechaCorta(m.fechaEstimada) + ")";
        return linea;
    }).join("\n");

    var mensajeBase = construirMensaje("statement", c, { detalle: detalle });
    var waLink = "https://wa.me/57" + phoneClean + "?text=" + encodeURIComponent(mensajeBase);
    window.open(waLink, "_blank");
    logMessageSent(c.id, "statement");
    closeAccountStatementModal();
}

/* =========================================================
   COBRO RÁPIDO
========================================================= */
function openQuickPayment(clientId) {
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;
    if (!c.balance || c.balance <= 0) { alert("Este cliente no tiene saldo pendiente."); return; }
    currentClientForQuickPayment = c;
    document.getElementById("quickPaymentInfo").innerHTML =
        '<strong>' + c.name + '</strong><br>' +
        'Saldo pendiente: <strong style="color:#dc2626;">' + formatMoney(c.balance) + '</strong>';
    document.getElementById("quickPaymentModal").classList.add("show");
}

function closeQuickPaymentModal() {
    var modal = document.getElementById("quickPaymentModal");
    if (modal) modal.classList.remove("show");
    currentClientForQuickPayment = null;
}

function confirmQuickPayment() {
    if (!currentClientForQuickPayment) return;
    var c = currentClientForQuickPayment;
    var monto = c.balance;
    if (!monto || monto <= 0) return;

    if (!c.movements) c.movements = [];
    c.movements.push({
        type: "payment", amount: monto,
        date: todayString(), time: getCurrentTime(),
        note: "Cobro total de saldo"
    });
    c.balance = 0;

    saveData();
    closeQuickPaymentModal();
    showToast("💰 Cobrado: " + formatMoney(monto));
    renderClients();
}

/* =========================================================
   PROVEEDORES
========================================================= */
function openProviderModal() {
    document.getElementById("providerModalTitle").textContent = "Nuevo proveedor";
    document.getElementById("providerForm").reset();
    document.getElementById("providerId").value = "";
    document.getElementById("providerModal").classList.add("show");
}

function closeProviderModal() {
    var modal = document.getElementById("providerModal");
    if (modal) modal.classList.remove("show");
}

function editProvider(id) {
    var p = providers.find(function(x) { return x.id === id; });
    if (!p) return;
    document.getElementById("providerModalTitle").textContent = "Editar proveedor";
    document.getElementById("providerId").value = p.id;
    document.getElementById("providerName").value = p.name;
    document.getElementById("providerPhone").value = p.phone;
    document.getElementById("providerProducts").value = p.products || "";
    document.getElementById("providerModal").classList.add("show");
}

function saveProvider(event) {
    if (event) event.preventDefault();
    var id = document.getElementById("providerId").value;
    var name = document.getElementById("providerName").value.trim();
    var phone = document.getElementById("providerPhone").value.trim();
    var productsSold = document.getElementById("providerProducts").value.trim();
    if (!name || !phone) { alert("Nombre y teléfono son obligatorios."); return false; }

    if (id) {
        var idx = providers.findIndex(function(p) { return p.id === id; });
        if (idx !== -1) providers[idx] = Object.assign({}, providers[idx], { name: name, phone: phone, products: productsSold });
    } else {
        providers.push({ id: generateId(), name: name, phone: phone, products: productsSold });
    }
    saveData();
    closeProviderModal();
    showToast("💾 Proveedor guardado");
    renderProviders();
    return false;
}

function deleteProvider(id) {
    var p = providers.find(function(x) { return x.id === id; });
    if (!p) return;
    if (!confirm("¿Eliminar a \"" + p.name + "\"?")) return;
    providers = providers.filter(function(x) { return x.id !== id; });
    saveData();
    showToast("🗑️ Proveedor eliminado");
    renderProviders();
}

function renderProviders() {
    var table = document.getElementById("providersTable");
    if (!table) return;
    table.innerHTML = "";
    if (providers.length === 0) {
        table.innerHTML = '<tr><td colspan="4" class="empty-state">No hay proveedores registrados.</td></tr>';
        document.getElementById("totalProviders").textContent = 0;
        return;
    }

    var fragment = document.createDocumentFragment();
    providers.forEach(function(provider) {
        var phoneClean = (provider.phone || "").replace(/\D/g, "");
        var waMsg = encodeURIComponent("Hola " + provider.name + ", necesito hacer un pedido para la tienda.");
        var waLink = "https://wa.me/57" + phoneClean + "?text=" + waMsg;
        var row = document.createElement("tr");
        row.innerHTML =
            '<td><strong>' + provider.name + '</strong></td>' +
            '<td>' + provider.phone + '</td>' +
            '<td>' + (provider.products || "-") + '</td>' +
            '<td>' +
                '<a href="tel:' + provider.phone + '" class="action-btn call-btn" style="text-decoration:none; display:inline-block;">📞 Llamar</a>' +
                '<a href="' + waLink + '" target="_blank" class="action-btn wa-btn" style="text-decoration:none; display:inline-block;">📱 WhatsApp</a>' +
                '<button class="action-btn edit-btn" onclick="editProvider(\'' + provider.id + '\')">Editar</button>' +
                '<button class="action-btn delete-btn" onclick="deleteProvider(\'' + provider.id + '\')">Eliminar</button>' +
            '</td>';
        fragment.appendChild(row);
    });
    table.appendChild(fragment);
    document.getElementById("totalProviders").textContent = providers.length;
}

/* =========================================================
   ABONOS
========================================================= */
function openAbono(clientId) {
    if (!requireFeature("credits", "Ventas fiadas")) return;
    var c = clients.find(function(x) { return x.id === clientId; });
    if (!c) return;
    document.getElementById("abonoClientId").value = clientId;
    document.getElementById("abonoClientName").textContent = "Cliente: " + c.name;
    document.getElementById("abonoCurrentBalance").textContent = "Saldo: " + formatMoney(c.balance);
    document.getElementById("abonoAmount").value = "";
    document.getElementById("abonoModal").classList.add("show");
}

function closeAbonoModal() {
    var modal = document.getElementById("abonoModal");
    if (modal) modal.classList.remove("show");
}

function saveAbono(event) {
    if (event) event.preventDefault();
    var btn = document.getElementById("saveAbonoBtn");
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }

    try {
        var clientId = document.getElementById("abonoClientId").value;
        var amount = Number(document.getElementById("abonoAmount").value);
        if (!amount || amount <= 0) { alert("Monto inválido."); return false; }
        var c = clients.find(function(x) { return x.id === clientId; });
        if (!c) return false;
        if (amount > c.balance) { alert("Abono mayor al saldo (" + formatMoney(c.balance) + ")."); return false; }
        c.balance -= amount;
        if (!c.movements) c.movements = [];
        c.movements.push({
            type: "payment", amount: amount,
            date: todayString(), time: getCurrentTime()
        });
        saveData();
        closeAbonoModal();
        showToast("💰 Abono: " + formatMoney(amount));
        renderClients();
        return false;
    } catch (err) {
        console.error("Error guardando abono:", err);
        alert("❌ Error al guardar. Intenta de nuevo.");
        return false;
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
    }
}

/* =========================================================
   REPORTES
========================================================= */
function getFilteredSales() {
    var period = document.getElementById("reportPeriod").value;
    var active = sales.filter(function(s) { return !s.cancelled; });
    if (period === "today") return active.filter(function(s) { return s.date === todayString(); });
    if (period === "week") {
        var limit = new Date(); limit.setDate(limit.getDate() - 7);
        return active.filter(function(s) { return new Date(s.date) >= limit; });
    }
    if (period === "month") {
        var limit2 = new Date(); limit2.setDate(limit2.getDate() - 30);
        return active.filter(function(s) { return new Date(s.date) >= limit2; });
    }
    return active;
}

function renderReports() {
    var filtered = getFilteredSales();
    document.getElementById("todaySales").textContent = formatMoney(filtered.reduce(function(s, x) { return s + x.total; }, 0));
    document.getElementById("todayTransactions").textContent = filtered.length;
    document.getElementById("todayProducts").textContent = filtered.reduce(function(s, x) { return s + x.quantity; }, 0);
    document.getElementById("todayProfit").textContent = formatMoney(filtered.reduce(function(s, x) { return s + x.profit; }, 0));
    renderSalesHistory();
    renderCharts();
}

function renderCharts() {
    if (typeof Chart === "undefined") return;

    /* ⚡ Solo renderizar gráficos si la sección Reportes está visible */
    var reportesSection = document.getElementById("reportes");
    if (!reportesSection || !reportesSection.classList.contains("active")) return;

    var last7Days = [];
    var last7Labels = [];
    for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var dateStr = d.toISOString().split("T")[0];
        var dayTotal = sales.filter(function(s) { return !s.cancelled && s.date === dateStr; })
            .reduce(function(sum, s) { return sum + s.total; }, 0);
        last7Days.push(dayTotal);
        last7Labels.push(d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" }));
    }

    var ctx1 = document.getElementById("salesChart");
    if (!ctx1) return;
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctx1.getContext("2d"), {
        type: "bar",
        data: { labels: last7Labels, datasets: [{ label: "Ventas ($)", data: last7Days, backgroundColor: appSettings.accent, borderRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return "$" + v.toLocaleString("es-CO"); } } } }
        }
    });

    var productCount = {};
    sales.filter(function(s) { return !s.cancelled; }).forEach(function(s) {
        s.products.forEach(function(p) {
            var baseName = p.name.split(" (")[0];
            productCount[baseName] = (productCount[baseName] || 0) + 1;
        });
    });
    var sorted = Object.entries(productCount).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
    var labels = sorted.map(function(x) { return x[0]; });
    var data = sorted.map(function(x) { return x[1]; });

    var ctx2 = document.getElementById("topProductsChart");
    if (!ctx2) return;
    if (topProductsChartInstance) topProductsChartInstance.destroy();
    if (data.length === 0) {
        topProductsChartInstance = new Chart(ctx2.getContext("2d"), {
            type: "bar",
            data: { labels: ["Sin datos"], datasets: [{ data: [0], backgroundColor: "#94a3b8" }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } else {
        topProductsChartInstance = new Chart(ctx2.getContext("2d"), {
            type: "doughnut",
            data: { labels: labels, datasets: [{ data: data, backgroundColor: ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6"] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
        });
    }

    var categoryTotals = {};
    sales.filter(function(s) { return !s.cancelled; }).forEach(function(s) {
        s.products.forEach(function(p) {
            var baseName = p.name.split(" (")[0];
            var product = products.find(function(pr) { return pr.name === baseName; });
            var cat = product ? (product.category || "Sin categoría") : "Sin categoría";
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (p.price * (p.isWeight ? 1 : p.quantity));
        });
    });
    var catSorted = Object.entries(categoryTotals).sort(function(a, b) { return b[1] - a[1]; });
    var catLabels = catSorted.map(function(x) { return x[0]; });
    var catData = catSorted.map(function(x) { return x[1]; });

    var ctx3 = document.getElementById("categoryChart");
    if (!ctx3) return;
    if (categoryChartInstance) categoryChartInstance.destroy();
    if (catData.length === 0) {
        categoryChartInstance = new Chart(ctx3.getContext("2d"), {
            type: "bar",
            data: { labels: ["Sin datos"], datasets: [{ data: [0], backgroundColor: "#94a3b8" }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } else {
        categoryChartInstance = new Chart(ctx3.getContext("2d"), {
            type: "bar",
            data: {
                labels: catLabels,
                datasets: [{
                    label: "Ventas ($)", data: catData,
                    backgroundColor: ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4", "#ec4899"],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return "$" + v.toLocaleString("es-CO"); } } } }
            }
        });
    }
}

function renderSalesHistory() {
    var table = document.getElementById("salesHistory");
    if (!table) return;
    table.innerHTML = "";
    var last = sales.slice().reverse().slice(0, 20);
    if (last.length === 0) {
        table.innerHTML = '<tr><td colspan="6" class="empty-state">No hay ventas registradas.</td></tr>';
        return;
    }
    var fragment = document.createDocumentFragment();
    last.forEach(function(sale) {
        var row = document.createElement("tr");
        if (sale.cancelled) row.className = "cancelled-sale";
        var txt = sale.products.map(function(p) { return p.name; }).join(", ");
        var typeLabel = "💵 Efectivo";
        if (sale.paymentType === "credit") typeLabel = "📝 Fiado (" + sale.clientName + ")";
        else if (sale.paymentType === "transfer") typeLabel = "📱 Transferencia";

        row.innerHTML =
            '<td>' + sale.date + '</td>' +
            '<td>' + sale.time + '</td>' +
            '<td>' + txt + '</td>' +
            '<td>' + formatMoney(sale.total) + '</td>' +
            '<td>' + (sale.cancelled ? "❌ Anulada" : typeLabel) + '</td>' +
            '<td>' +
                '<button class="action-btn print-btn" onclick="reprint(\'' + sale.id + '\')">🖨️</button>' +
                (!sale.cancelled ? '<button class="action-btn cancel-btn" onclick="openCancelSale(\'' + sale.id + '\')">❌</button>' : '') +
            '</td>';
        fragment.appendChild(row);
    });
    table.appendChild(fragment);
}

function reprint(saleId) {
    var sale = sales.find(function(s) { return s.id === saleId; });
    if (sale) { pendingSaleForReceipt = sale; showReceipt(sale); }
}

/* =========================================================
   EXPORTAR REPORTES
========================================================= */
function exportCSV() {
    if (!requireFeature("reports", "Exportar reportes")) return;
    if (sales.length === 0) { alert("No hay ventas para exportar."); return; }
    document.getElementById("exportModal").classList.add("show");
    document.getElementById("exportPeriod").value = "all";
    document.getElementById("exportFormat").value = "xls";
    document.getElementById("customRangeBox").style.display = "none";
    document.getElementById("exportStartDate").value = "";
    document.getElementById("exportEndDate").value = "";
}

function closeExportModal() {
    var modal = document.getElementById("exportModal");
    if (modal) modal.classList.remove("show");
}

function calcularRangoFechas(periodo, fechaInicio, fechaFin) {
    var hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    var inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    switch (periodo) {
        case "today": return { desde: hoy, hasta: hoy };
        case "week": inicio.setDate(inicio.getDate() - 6); return { desde: inicio, hasta: hoy };
        case "month": inicio.setDate(1); return { desde: inicio, hasta: hoy };
        case "month30": inicio.setDate(inicio.getDate() - 29); return { desde: inicio, hasta: hoy };
        case "year": inicio.setMonth(0, 1); return { desde: inicio, hasta: hoy };
        case "all": return { desde: new Date(2000, 0, 1), hasta: hoy };
        case "custom":
            var desde = fechaInicio ? new Date(fechaInicio + "T00:00:00") : new Date(2000, 0, 1);
            var hasta = fechaFin ? new Date(fechaFin + "T23:59:59") : hoy;
            return { desde: desde, hasta: hasta };
        default: return { desde: new Date(2000, 0, 1), hasta: hoy };
    }
}

function confirmarExportacion() {
    var btn = document.getElementById("confirmExport");
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }

    try {
        var periodo = document.getElementById("exportPeriod").value;
        var formato = document.getElementById("exportFormat").value;
        var fechaInicio = document.getElementById("exportStartDate").value;
        var fechaFin = document.getElementById("exportEndDate").value;

        if (periodo === "custom" && (!fechaInicio || !fechaFin)) {
            alert("⚠️ Selecciona ambas fechas para el rango personalizado.");
            return;
        }

        var rango = calcularRangoFechas(periodo, fechaInicio, fechaFin);
        var ventasFiltradas = sales.filter(function(s) {
            var fechaVenta = new Date(s.date + "T12:00:00");
            return fechaVenta >= rango.desde && fechaVenta <= rango.hasta;
        });

        if (ventasFiltradas.length === 0) {
            alert("⚠️ No hay ventas en el período seleccionado.");
            return;
        }

        if (formato === "csv") {
            generarCSVBasico(ventasFiltradas, periodo, rango);
        } else {
            generarReporteFormateado(ventasFiltradas, periodo, rango);
        }

        closeExportModal();
    } catch (err) {
        console.error("Error exportando:", err);
        alert("❌ Error al exportar. Intenta de nuevo.");
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
    }
}

function generarCSVBasico(ventas, periodo, rango) {
    var headers = ["Fecha", "Hora", "Productos", "Total", "Recibido", "Cambio", "Ganancia", "Tipo", "Cliente", "Cédula", "Estado"];
    var rows = ventas.map(function(s) {
        return [
            s.date, s.time,
            s.products.map(function(p) { return p.name; }).join(" | "),
            s.total, s.received, s.change, s.profit,
            s.paymentType === "credit" ? "Fiado" : s.paymentType === "transfer" ? "Transferencia" : "Efectivo",
            s.saleClientName || s.clientName || "",
            s.saleClientId || "",
            s.cancelled ? "Anulada" : "Activa"
        ];
    });

    var csv = headers.join(",") + "\n";
    rows.forEach(function(r) {
        csv += r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",") + "\n";
    });

    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ventas_" + periodo + "_" + todayString() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("📄 CSV descargado");
}

function generarReporteFormateado(ventas, periodo, rango) {
    /* Reutilizo la misma función existente (igual al v7.9) */
    var storeName = storeSettings.name || "J2 · Punto de Venta";
    var storeSlogan = storeSettings.slogan || "";
    var storePhone = storeSettings.phone || "";
    var storeAddress = storeSettings.address || "";

    var totalVentas = ventas.reduce(function(s, v) { return s + v.total; }, 0);
    var totalGanancia = ventas.reduce(function(s, v) { return s + (v.cancelled ? 0 : v.profit); }, 0);
    var totalProductos = ventas.reduce(function(s, v) { return s + v.quantity; }, 0);
    var ventasActivas = ventas.filter(function(v) { return !v.cancelled; });
    var totalActivas = ventasActivas.reduce(function(s, v) { return s + v.total; }, 0);

    var fechaInicio = rango.desde.toLocaleDateString("es-CO");
    var fechaFin = rango.hasta.toLocaleDateString("es-CO");

    var nombrePeriodo = {
        today: "Hoy (" + fechaInicio + ")",
        week: "Últimos 7 días (" + fechaInicio + " - " + fechaFin + ")",
        month: "Este mes (" + fechaInicio + " - " + fechaFin + ")",
        month30: "Últimos 30 días (" + fechaInicio + " - " + fechaFin + ")",
        year: "Este año (" + fechaInicio + " - " + fechaFin + ")",
        all: "Histórico completo (hasta " + fechaFin + ")",
        custom: "Rango personalizado (" + fechaInicio + " - " + fechaFin + ")"
    }[periodo] || "Período";

    var ventasPorDia = {};
    ventas.forEach(function(v) {
        if (v.cancelled) return;
        ventasPorDia[v.date] = (ventasPorDia[v.date] || 0) + v.total;
    });
    var diasOrdenados = Object.keys(ventasPorDia).sort();

    var productosCount = {};
    ventas.forEach(function(v) {
        if (v.cancelled) return;
        v.products.forEach(function(p) {
            var name = p.name.split(" (")[0];
            productosCount[name] = (productosCount[name] || 0) + (p.quantity || 1);
        });
    });
    var topProductos = Object.entries(productosCount)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, 8);

    var categoriasTotal = {};
    ventas.forEach(function(v) {
        if (v.cancelled) return;
        v.products.forEach(function(p) {
            var name = p.name.split(" (")[0];
            var prod = products.find(function(pr) { return pr.name === name; });
            var cat = prod ? (prod.category || "Sin categoría") : "Sin categoría";
            categoriasTotal[cat] = (categoriasTotal[cat] || 0) + (p.price * (p.isWeight ? 1 : p.quantity));
        });
    });

    var filasHTML = ventas.slice().reverse().map(function(v) {
        var productosTexto = v.products.map(function(p) {
            return p.name + (p.quantity > 1 ? " x" + p.quantity : "");
        }).join(", ");

        var tipoLabel = v.paymentType === "credit" ? "Fiado" :
                        v.paymentType === "transfer" ? "Transferencia" : "Efectivo";

        var colorFila = v.cancelled ? "#fee2e2" : "";

        return '<tr style="background:' + colorFila + '">' +
            '<td>' + v.date + '</td>' +
            '<td>' + v.time + '</td>' +
            '<td>' + productosTexto + '</td>' +
            '<td style="text-align:right; font-weight:bold;">' + formatMoney(v.total) + '</td>' +
            '<td style="text-align:right;">' + (v.cancelled ? "❌" : formatMoney(v.profit)) + '</td>' +
            '<td>' + tipoLabel + '</td>' +
            '<td>' + (v.saleClientName || v.clientName || "—") + '</td>' +
            '<td>' + (v.cancelled ? "Anulada" : "Activa") + '</td>' +
        '</tr>';
    }).join("");

    var diasLabelsJSON = JSON.stringify(diasOrdenados.map(function(d) {
        var partes = d.split("-");
        return partes[2] + "/" + partes[1];
    }));
    var diasDataJSON = JSON.stringify(diasOrdenados.map(function(d) { return ventasPorDia[d]; }));

    var topLabelsJSON = JSON.stringify(topProductos.map(function(p) { return p[0]; }));
    var topDataJSON = JSON.stringify(topProductos.map(function(p) { return p[1]; }));

    var catLabelsJSON = JSON.stringify(Object.keys(categoriasTotal));
    var catDataJSON = JSON.stringify(Object.values(categoriasTotal));

    var logoDataURL = storeSettings.logo || "logo.png";

    var reporteHTML =
        '<!DOCTYPE html>' +
        '<html lang="es">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<title>Reporte J2 · ' + nombrePeriodo + '</title>' +
            '<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' +
            '<style>' +
                'body { font-family: "Segoe UI", Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; color: #1f2937; }' +
                '.container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }' +
                '.header { display: flex; align-items: center; gap: 20px; padding-bottom: 20px; border-bottom: 3px solid #1e40af; margin-bottom: 25px; }' +
                '.header-logo { width: 80px; height: 80px; object-fit: contain; background: white; padding: 6px; border-radius: 12px; }' +
                '.header-info h1 { margin: 0 0 5px; color: #1e40af; font-size: 26px; }' +
                '.header-info p { margin: 2px 0; color: #64748b; font-size: 13px; }' +
                '.periodo-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; margin-top: 8px; }' +
                '.resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }' +
                '.resumen-card { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(30,64,175,0.2); }' +
                '.resumen-card span { display: block; font-size: 12px; opacity: 0.9; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }' +
                '.resumen-card strong { font-size: 24px; font-weight: 800; }' +
                '.resumen-card.verde { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); box-shadow: 0 4px 12px rgba(22,163,74,0.2); }' +
                '.resumen-card.naranja { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); box-shadow: 0 4px 12px rgba(234,88,12,0.2); }' +
                '.resumen-card.morado { background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%); box-shadow: 0 4px 12px rgba(147,51,234,0.2); }' +
                'h2 { color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-top: 30px; font-size: 18px; }' +
                '.chart-container { background: white; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 20px; height: 340px; position: relative; }' +
                'table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }' +
                'th { background: #1e40af; color: white; padding: 12px 10px; text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }' +
                'td { padding: 10px; border-bottom: 1px solid #e5e7eb; }' +
                'tbody tr:nth-child(even) { background: #f9fafb; }' +
                'tbody tr:hover { background: #f0f9ff; }' +
                '.totales-finales { background: #f0f9ff; border: 2px solid #1e40af; border-radius: 10px; padding: 20px; margin-top: 20px; }' +
                '.totales-finales .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px dashed #cbd5e1; }' +
                '.totales-finales .row:last-child { border-bottom: none; font-size: 20px; font-weight: 800; color: #1e40af; padding-top: 15px; border-top: 2px solid #1e40af; margin-top: 10px; }' +
                '.footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="container">' +
                '<div class="header">' +
                    '<img src="' + logoDataURL + '" alt="J2" class="header-logo" onerror="this.style.display=\'none\'">' +
                    '<div class="header-info">' +
                        '<h1>' + storeName + '</h1>' +
                        (storeSlogan ? '<p>' + storeSlogan + '</p>' : '') +
                        (storeAddress ? '<p>📍 ' + storeAddress + '</p>' : '') +
                        (storePhone ? '<p>📞 ' + storePhone + '</p>' : '') +
                        '<div class="periodo-badge">📅 ' + nombrePeriodo + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="resumen-grid">' +
                    '<div class="resumen-card"><span>💰 Ventas activas</span><strong>' + formatMoney(totalActivas) + '</strong></div>' +
                    '<div class="resumen-card verde"><span>📈 Ganancia estimada</span><strong>' + formatMoney(totalGanancia) + '</strong></div>' +
                    '<div class="resumen-card naranja"><span>🧾 Transacciones</span><strong>' + ventas.length + '</strong></div>' +
                    '<div class="resumen-card morado"><span>📦 Productos vendidos</span><strong>' + totalProductos + '</strong></div>' +
                '</div>' +
                '<h2>📈 Ventas por día</h2><div class="chart-container"><canvas id="chartVentasDia"></canvas></div>' +
                '<h2>🏆 Productos más vendidos</h2><div class="chart-container"><canvas id="chartTopProductos"></canvas></div>' +
                '<h2>🏷️ Ventas por categoría</h2><div class="chart-container"><canvas id="chartCategorias"></canvas></div>' +
                '<h2>📋 Detalle de ventas (' + ventas.length + ')</h2>' +
                '<table><thead><tr><th>Fecha</th><th>Hora</th><th>Productos</th><th style="text-align:right;">Total</th><th style="text-align:right;">Ganancia</th><th>Tipo</th><th>Cliente</th><th>Estado</th></tr></thead>' +
                '<tbody>' + filasHTML + '</tbody></table>' +
                '<div class="totales-finales">' +
                    '<div class="row"><span>Total de ventas brutas</span><strong>' + formatMoney(totalVentas) + '</strong></div>' +
                    '<div class="row"><span>Ventas anuladas</span><strong>- ' + formatMoney(totalVentas - totalActivas) + '</strong></div>' +
                    '<div class="row"><span>Ganancia estimada</span><strong>' + formatMoney(totalGanancia) + '</strong></div>' +
                    '<div class="row"><span>TOTAL NETO</span><strong>' + formatMoney(totalActivas) + '</strong></div>' +
                '</div>' +
                '<div class="footer">Reporte generado por J2 · Punto de Venta el ' + new Date().toLocaleString("es-CO") + '<br>Powered by Sakura · Solución IT SAS · +57 333 268 8336</div>' +
            '</div>' +
            '<script>' +
                'window.addEventListener("load", function() {' +
                    'var ctxVentas = document.getElementById("chartVentasDia");' +
                    'if (ctxVentas) { new Chart(ctxVentas, { type: "line", data: { labels: ' + diasLabelsJSON + ', datasets: [{ label: "Ventas ($)", data: ' + diasDataJSON + ', borderColor: "#1e40af", backgroundColor: "rgba(30,64,175,0.1)", borderWidth: 3, fill: true, tension: 0.3, pointBackgroundColor: "#1e40af", pointRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return "$" + v.toLocaleString("es-CO"); } } } } } }); }' +
                    'var ctxTop = document.getElementById("chartTopProductos");' +
                    'if (ctxTop) { new Chart(ctxTop, { type: "bar", data: { labels: ' + topLabelsJSON + ', datasets: [{ label: "Unidades vendidas", data: ' + topDataJSON + ', backgroundColor: ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"], borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } } } }); }' +
                    'var ctxCat = document.getElementById("chartCategorias");' +
                    'if (ctxCat) { new Chart(ctxCat, { type: "doughnut", data: { labels: ' + catLabelsJSON + ', datasets: [{ data: ' + catDataJSON + ', backgroundColor: ["#1e40af", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } } }); }' +
                '});' +
            '<\/script>' +
        '</body></html>';

    var blob = new Blob([reporteHTML], { type: "application/vnd.ms-excel;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "reporte_J2_" + periodo + "_" + todayString() + ".xls";
    a.click();
    URL.revokeObjectURL(url);
    showToast("📊 Reporte generado: " + nombrePeriodo);
}

/* =========================================================
   ANULAR VENTA
========================================================= */
function openCancelSale(saleId) {
    if (getCancellationsToday() >= 3) {
        alert("🚫 Se alcanzó el límite de 3 anulaciones por día.\n\nContacta a soporte si necesitas más.");
        return;
    }
    var sale = sales.find(function(s) { return s.id === saleId; });
    if (!sale) return;
    saleToCancel = sale;

    document.getElementById("cancelSaleInfo").innerHTML =
        '<strong>Recibo #' + sale.id.slice(-6).toUpperCase() + '</strong><br>' +
        'Fecha: ' + sale.date + ' ' + sale.time + '<br>' +
        'Total: ' + formatMoney(sale.total);
    document.getElementById("cancelSalePassword").value = "";
    document.getElementById("cancelSaleModal").classList.add("show");
}

function closeCancelSaleModal() {
    var modal = document.getElementById("cancelSaleModal");
    if (modal) modal.classList.remove("show");
    saleToCancel = null;
}

async function confirmCancelSale() {
    if (!saleToCancel) return;
    var password = document.getElementById("cancelSalePassword").value.trim().toUpperCase();

    var validSession = hasActiveUnlockSession();
    if (!validSession) {
        var savedTempCode = sessionStorage.getItem("j2_last_temp_code");
        if (!savedTempCode) {
            alert("❌ No hay una sesión de recuperación activa.\n\nPresiona 'Solicitar contraseña temporal' primero.");
            return;
        }
        var ok = await validateUnlockCode(password, savedTempCode);
        if (!ok) {
            alert("❌ Contraseña inválida o expirada.\n\nSolicita una nueva.");
            return;
        }
        applyUnlockPassword(savedTempCode);
        validSession = true;
        sessionStorage.removeItem("j2_last_temp_code");
    }

    saleToCancel.products.forEach(function(p) {
        var product = getProductById(p.productId);
        if (product) {
            if (p.isWeight && p.weightInBase) product.stock += p.weightInBase;
            else product.stock += p.quantity;
        }
    });

    if (saleToCancel.paymentType === "credit" && saleToCancel.clientId) {
        var client = clients.find(function(c) { return c.id === saleToCancel.clientId; });
        if (client) {
            var fiadoReal = saleToCancel.total - (saleToCancel.abonoInicial || 0);
            client.balance -= fiadoReal;
            if (client.balance < 0) client.balance = 0;
            if (!client.movements) client.movements = [];
            client.movements.push({
                type: "payment", amount: fiadoReal,
                date: todayString(), time: getCurrentTime(),
                note: "Anulación de venta"
            });
        }
    }

    saleToCancel.cancelled = true;
    saleToCancel.cancelledAt = new Date().toISOString();
    consumeUnlockSession();
    saveData();
    closeCancelSaleModal();
    showToast("❌ Venta anulada. Stock devuelto.");
    renderData();
}

/* =========================================================
   SOLICITAR CONTRASEÑA TEMPORAL
========================================================= */
function openRequestPasswordModal() {
    closeCancelSaleModal();
    currentTempCode = generateTempRequestCode();
    sessionStorage.setItem("j2_last_temp_code", currentTempCode);
    document.getElementById("tempCodeValue").textContent = currentTempCode;
    document.getElementById("tempCodeValue").style.color = "";

    var secondsLeft = TEMP_CODE_WINDOW * 60;
    if (tempCodeTimerInterval) clearInterval(tempCodeTimerInterval);

    function updateTimer() {
        var min = Math.floor(secondsLeft / 60);
        var sec = secondsLeft % 60;
        document.getElementById("tempCodeTimer").textContent =
            String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
        if (secondsLeft <= 0) {
            clearInterval(tempCodeTimerInterval);
            document.getElementById("tempCodeTimer").textContent = "EXPIRADO";
            document.getElementById("tempCodeValue").style.color = "#dc2626";
        }
        secondsLeft--;
    }
    updateTimer();
    tempCodeTimerInterval = setInterval(updateTimer, 1000);
    document.getElementById("requestPasswordModal").classList.add("show");
}

function closeRequestPasswordModal() {
    var modal = document.getElementById("requestPasswordModal");
    if (modal) modal.classList.remove("show");
    if (tempCodeTimerInterval) clearInterval(tempCodeTimerInterval);
}

function sendTempCodeByWhatsApp() {
    if (!currentTempCode) return;
    var msg = encodeURIComponent(
        "Hola Sakura · Solución IT, necesito una contraseña temporal para J2.\n\nCódigo: " + currentTempCode
    );
    window.open("https://wa.me/" + SAKURA_CONFIG.phone + "?text=" + msg, "_blank");
}

/* =========================================================
   CIERRE DE CAJA
========================================================= */
function generateCashReport() {
    if (!requireFeature("cash_register", "Cierre de caja")) return;
    var today = todayString();
    var todaySales = sales.filter(function(s) { return s.date === today && !s.cancelled; });
    var cash = todaySales.filter(function(s) { return s.paymentType === "cash"; });
    var transfer = todaySales.filter(function(s) { return s.paymentType === "transfer"; });
    var credit = todaySales.filter(function(s) { return s.paymentType === "credit"; });

    var cashTotal = cash.reduce(function(s, x) { return s + x.total; }, 0);
    var transferTotal = transfer.reduce(function(s, x) { return s + x.total; }, 0);
    var creditTotal = credit.reduce(function(s, x) { return s + x.total; }, 0);
    var totalSales = cashTotal + transferTotal + creditTotal;
    var profit = todaySales.reduce(function(s, x) { return s + x.profit; }, 0);
    var cashReceived = cash.reduce(function(s, x) { return s + x.received; }, 0);
    var cashChange = cash.reduce(function(s, x) { return s + x.change; }, 0);

    var date = new Date().toLocaleDateString("es-CO", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    var storeName = storeSettings.name || "J2";
    var storeSlogan = storeSettings.slogan || "";
    var storePhone = storeSettings.phone || "";
    var storeAddress = storeSettings.address || "";

    var report = document.getElementById("cashReport");
    report.innerHTML =
        '<div class="cash-report-print-area">' +
            '<div style="text-align:center; margin-bottom:20px; padding-bottom:15px; border-bottom:2px solid #333;">' +
                '<h2 style="margin:0 0 5px; font-size:22px;">' + storeName + '</h2>' +
                (storeSlogan ? '<p style="margin:0; font-size:13px; color:#666;">' + storeSlogan + '</p>' : '') +
                (storePhone ? '<p style="margin:0; font-size:12px; color:#666;">Tel: ' + storePhone + '</p>' : '') +
                (storeAddress ? '<p style="margin:0; font-size:12px; color:#666;">' + storeAddress + '</p>' : '') +
                '<h3 style="margin:15px 0 5px; font-size:18px;">💰 CIERRE DE CAJA</h3>' +
                '<p style="margin:0; font-size:13px;">' + date + '</p>' +
            '</div>' +
            '<h3 style="font-size:16px; margin-top:20px; border-bottom:1px solid #333; padding-bottom:5px;">Ventas por método de pago</h3>' +
            '<div class="cash-row"><span>💵 Efectivo</span><strong>' + formatMoney(cashTotal) + '</strong></div>' +
            '<div class="cash-row"><span>📱 Transferencia</span><strong>' + formatMoney(transferTotal) + '</strong></div>' +
            '<div class="cash-row"><span>📝 Fiado</span><strong>' + formatMoney(creditTotal) + '</strong></div>' +
            '<div class="cash-row total"><span>TOTAL VENDIDO</span><strong>' + formatMoney(totalSales) + '</strong></div>' +
            '<h3 style="font-size:16px; margin-top:25px; border-bottom:1px solid #333; padding-bottom:5px;">Movimiento en efectivo</h3>' +
            '<div class="cash-row"><span>Efectivo recibido</span><strong>' + formatMoney(cashReceived) + '</strong></div>' +
            '<div class="cash-row"><span>Cambio entregado</span><strong>- ' + formatMoney(cashChange) + '</strong></div>' +
            '<div class="cash-row total"><span>EFECTIVO EN CAJA</span><strong>' + formatMoney(cashReceived - cashChange) + '</strong></div>' +
            '<h3 style="font-size:16px; margin-top:25px; border-bottom:1px solid #333; padding-bottom:5px;">Resumen del día</h3>' +
            '<div class="cash-row"><span>Transacciones totales</span><strong>' + todaySales.length + '</strong></div>' +
            '<div class="cash-row"><span>Productos vendidos</span><strong>' + todaySales.reduce(function(s, x) { return s + x.quantity; }, 0) + '</strong></div>' +
            '<div class="cash-row total"><span>GANANCIA ESTIMADA</span><strong>' + formatMoney(profit) + '</strong></div>' +
            '<div style="margin-top:40px; padding-top:20px; border-top:1px dashed #999; text-align:center; font-size:11px; color:#666;">' +
                'Generado por J2 · Punto de Venta · ' + new Date().toLocaleString("es-CO") + '<br>' +
                'Powered by Sakura · Solución IT SAS' +
            '</div>' +
        '</div>' +
        '<div style="margin-top:25px; text-align:center;" class="no-print">' +
            '<button class="primary-btn" onclick="imprimirCierre()" style="margin-right:10px;">🖨️ Imprimir cierre</button>' +
            '<button class="primary-btn" onclick="guardarCierrePDF()" style="background:#2563eb;">📄 Guardar como PDF</button>' +
        '</div>';
}

function imprimirCierre() {
    var reporte = document.querySelector(".cash-report-print-area");
    if (!reporte) { alert("Primero genera el cierre de caja."); return; }
    moverAImpresion(reporte.outerHTML, "Cierre_Caja_J2_" + todayString());
}

function guardarCierrePDF() { imprimirCierre(); }

/* =========================================================
   CÓDIGO DE BARRAS
========================================================= */
function openScanModal() {
    if (!requireFeature("barcode", "Código de barras")) return;
    var modal = document.getElementById("scanModal");
    if (modal) modal.classList.add("show");
    if (typeof Html5Qrcode === "undefined") {
        alert("El escáner no está disponible (no se cargó html5-qrcode).");
        return;
    }
    setTimeout(function() {
        html5QrCode = new Html5Qrcode("qrReader");
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            function(text) { closeScanModal(); handleBarcodeScanned(text); },
            function() {}
        ).catch(function() {
            alert("No se pudo acceder a la cámara.");
            closeScanModal();
        });
    }, 300);
}

function closeScanModal() {
    if (html5QrCode) {
        html5QrCode.stop().then(function() { html5QrCode.clear(); html5QrCode = null; }).catch(function() {});
    }
    var modal = document.getElementById("scanModal");
    if (modal) modal.classList.remove("show");
}

function handleBarcodeScanned(barcode) {
    var product = products.find(function(x) { return x.barcode === barcode && x.active !== false; });
    if (product) {
        if (product.saleType === "weight") openWeightModal(product);
        else { addToCart(product.id); showToast("✅ " + product.name + " agregado"); }
    } else {
        showToast("❌ Código " + barcode + " no registrado");
        if (confirm("El código " + barcode + " no está registrado.\n\n¿Crear un producto nuevo?")) {
            openProductModal();
            document.getElementById("productBarcode").value = barcode;
        }
    }
}

/* =========================================================
   RESPALDO
========================================================= */
function backupData() {
    if (!requireFeature("backup", "Respaldos")) return;
    var btn = document.getElementById("backupBtn");
    if (btn) btn.classList.add("loading");

    try {
        var data = {
            products: products, sales: sales, clients: clients, providers: providers,
            categories: categories, storeSettings: storeSettings, appSettings: appSettings,
            messages: customMessages, creditSettings: creditSettings,
            version: "8.0", date: new Date().toISOString()
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "j2_backup_" + todayString() + ".json";
        a.click();
        URL.revokeObjectURL(url);
        showToast("💾 Respaldo descargado");
    } catch (err) {
        console.error("Error respaldo:", err);
        alert("❌ Error al respaldar.");
    } finally {
        if (btn) btn.classList.remove("loading");
    }
}

function restoreData(event) {
    if (!requireFeature("backup", "Respaldos")) return;
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (!data.products || !data.sales) throw new Error("Formato inválido");
            if (!confirm("⚠️ Esto reemplazará TODOS los datos actuales. ¿Continuar?")) return;
            products = data.products;
            sales = data.sales;
            clients = data.clients || [];
            providers = data.providers || [];
            categories = data.categories || categories;
            storeSettings = data.storeSettings || storeSettings;
            appSettings = data.appSettings || appSettings;
            customMessages = data.messages || customMessages;
            creditSettings = data.creditSettings || creditSettings;
            rebuildProductsIndex();
            saveData();
            saveSettings();
            saveMessages();
            saveCreditSettings();
            applyTheme();
            applyStoreBranding();
            showToast("📂 Datos restaurados");
            renderData();
        } catch (err) {
            alert("Archivo inválido.");
        }
    };
    reader.readAsText(file);
    event.target.value = "";
}

/* =========================================================
   LIMPIAR VENTA
========================================================= */
function clearSale() {
    if (cart.length > 0 && !confirm("¿Cancelar la venta actual?")) return;
    cart = [];
    document.getElementById("cashReceived").value = "";
    document.getElementById("saleClientName").value = "";
    document.getElementById("saleClientId").value = "";
    document.getElementById("creditAbono").value = "";
    document.getElementById("creditEstimatedDate").value = "";
    document.getElementById("creditNote").value = "";
    document.querySelector('input[name="paymentType"][value="cash"]').checked = true;
    togglePaymentMode();
    renderCart();
}

/* =========================================================
   LICENCIA UI
========================================================= */
function requireFeature(featureName, featureDisplayName) {
    if (hasFeature(featureName)) return true;
    var plan = getCurrentPlan();
    var planName = plan ? plan.name : "ninguno";
    if (confirm("🔒 \"" + featureDisplayName + "\" requiere un plan superior.\n\nTu plan actual: " + planName + "\n\n¿Ver planes disponibles?")) {
        document.getElementById("plansModal").classList.add("show");
    }
    return false;
}

function checkProductLimit() {
    var plan = getCurrentPlan();
    if (!plan) return true;
    if (plan.maxProducts === Infinity) return true;
    var active = products.filter(function(p) { return p.active !== false; }).length;
    if (active >= plan.maxProducts) {
        alert("🔒 Tu plan " + plan.name + " permite máximo " + plan.maxProducts + " productos.");
        document.getElementById("plansModal").classList.add("show");
        return false;
    }
    return true;
}

function updateExpiryBanner() {
    var banner = document.getElementById("expiryBanner");
    if (!banner) return;
    if (isDemo()) { banner.style.display = "none"; updateDemoBanner(); return; }
    if (!license || !isLicenseValid()) { banner.style.display = "none"; return; }

    var days = daysUntilExpiry();
    if (days > 7) { banner.style.display = "none"; return; }

    banner.style.display = "flex";
    banner.classList.toggle("danger", days <= 3);

    var msg = "";
    if (days <= 0) msg = "🚨 ¡Tu licencia vence HOY!";
    else if (days === 1) msg = "⚠️ Tu licencia vence mañana.";
    else msg = "⏰ Tu licencia vence en " + days + " días.";

    banner.innerHTML =
        '<span>' + msg + ' Renueva para seguir usando todas las funciones.</span>' +
        '<button onclick="document.getElementById(\'plansModal\').classList.add(\'show\')">Ver planes</button>';
}

function updateDemoBanner() {
    var banner = document.getElementById("demoBanner");
    if (!banner) return;
    if (!isDemo() || !isLicenseValid()) { banner.style.display = "none"; return; }

    var days = daysUntilExpiry();
    banner.style.display = "flex";
    banner.classList.toggle("expiring", days <= 2);

    var msg = "";
    if (days <= 0) msg = "🚨 ¡Tu prueba gratis terminó!";
    else if (days === 1) msg = "⚠️ ¡Último día de prueba gratis!";
    else msg = "🎁 Estás en modo prueba · Te quedan " + days + " días gratis";

    banner.innerHTML =
        '<span>' + msg + '</span>' +
        '<button onclick="document.getElementById(\'plansModal\').classList.add(\'show\')">Ver planes</button>';
}

function initLicenseUI() {
    var modal = document.getElementById("licenseModal");

    if (isLicenseValid()) {
        modal.classList.remove("show");
        var closeBtn = document.getElementById("closeLicenseModal");
        if (closeBtn) closeBtn.style.display = "inline-flex";
        updateExpiryBanner();
        updatePlanBadge();
        desbloquearApp();
        return;
    }

    if (license && !isLicenseValid()) {
        document.getElementById("licenseTitle").textContent = "⏰ Licencia vencida";
        document.getElementById("licenseSubtitle").textContent =
            "Tu plan " + (PLAN_FEATURES[license.plan] ? PLAN_FEATURES[license.plan].name : "") + " venció.\nActiva un nuevo código para seguir usando J2.";
    } else {
        document.getElementById("licenseTitle").textContent = "Activa tu licencia";
        document.getElementById("licenseSubtitle").textContent = "Ingresa el código que te enviamos o prueba gratis 7 días.";
    }

    var closeBtn = document.getElementById("closeLicenseModal");
    if (closeBtn) closeBtn.style.display = "none";

    bloquearApp();
    modal.classList.add("show");
}

/* =========================================================
   BLOQUEO / DESBLOQUEO
========================================================= */
function bloquearApp() {
    document.body.classList.add("app-locked");
    document.addEventListener("keydown", bloquearAtajosSiBloqueado, true);
    document.addEventListener("click", reabrirLicenciaSiBloqueado, true);
}

function desbloquearApp() {
    document.body.classList.remove("app-locked");
    document.removeEventListener("keydown", bloquearAtajosSiBloqueado, true);
    document.removeEventListener("click", reabrirLicenciaSiBloqueado, true);
}

function bloquearAtajosSiBloqueado(e) {
    if (!document.body.classList.contains("app-locked")) return;
    var licenseCodeInput = document.getElementById("licenseCode");
    if (licenseCodeInput && (e.target === licenseCodeInput || licenseCodeInput.contains(e.target))) return;

    if (e.key === "F2" || (e.key === "/" && e.target === document.body) || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
    }
}

function reabrirLicenciaSiBloqueado(e) {
    if (!document.body.classList.contains("app-locked")) return;
    var modal = document.getElementById("licenseModal");
    if (modal && modal.contains(e.target)) return;
    var otroModal = e.target.closest(".modal.show");
    if (otroModal && otroModal.id !== "licenseModal") return;
    e.preventDefault();
    e.stopPropagation();
    if (modal && !modal.classList.contains("show")) modal.classList.add("show");
}

/* =========================================================
   PLANES
========================================================= */
function activarPlanDesdeModal(planKey) {
    var plansModal = document.getElementById("plansModal");
    if (plansModal) plansModal.classList.remove("show");

    var activationModal = document.getElementById("activationModal");
    if (!activationModal) return;

    var nombres = { basic: "Básico", pro: "Pro", promax: "ProMax" };
    var planNombre = nombres[planKey] || "";

    document.getElementById("activationModalTitle").textContent = "🔓 Activa tu plan " + planNombre;
    document.getElementById("activationSubtitle").textContent = "Pega el código de licencia que te enviamos para el plan " + planNombre + ".";
    document.getElementById("activationStep1").style.display = "block";
    document.getElementById("activationStep2").style.display = "none";
    document.getElementById("activationCode").value = "";

    var requestBtn = document.getElementById("requestPlanWa");
    requestBtn.dataset.planKey = planKey;
    requestBtn.textContent = "💬 Pedir plan " + planNombre + " por WhatsApp";

    activationModal.classList.add("show");
}

function closeActivationModal() {
    document.getElementById("activationModal").classList.remove("show");
}

function pedirPlanWhatsApp(planKey) {
    var nombres = { basic: "Básico", pro: "Pro", promax: "ProMax" };
    var planNombre = nombres[planKey] || "";
    var msg = "Hola Sakura · Solución IT, me interesa el plan " + planNombre +
              " de J2. ¿Me puedes dar más información sobre precios y disponibilidad?";
    window.open("https://wa.me/" + SAKURA_CONFIG.phone + "?text=" + encodeURIComponent(msg), "_blank");
}

/* =========================================================
   CONFIGURACIÓN
========================================================= */
function openSettingsModal() {
    document.getElementById("settingsModal").classList.add("show");
    loadSettingsUI();
    updateTechStats();
    loadMessagesUI();
    loadCreditSettingsUI();
}

function closeSettingsModal() {
    var modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("show");
}

function loadSettingsUI() {
    document.getElementById("settingStoreName").value = storeSettings.name || "";
    document.getElementById("settingStoreSlogan").value = storeSettings.slogan || "";
    document.getElementById("settingStorePhone").value = storeSettings.phone || "";
    document.getElementById("settingStoreAddress").value = storeSettings.address || "";

    if (storeSettings.logo) {
        document.getElementById("logoPreviewImg").src = storeSettings.logo;
        document.getElementById("logoPreview").style.display = "block";
    } else {
        document.getElementById("logoPreview").style.display = "none";
    }

    var themeRadio = document.querySelector('input[name="themeSelect"][value="' + appSettings.theme + '"]');
    if (themeRadio) themeRadio.checked = true;
    var colorRadio = document.querySelector('input[name="colorSelect"][value="' + appSettings.accent + '"]');
    if (colorRadio) colorRadio.checked = true;

    var plan = getCurrentPlan();
    if (plan) {
        document.getElementById("settingsPlanName").textContent = plan.name + (isDemo() ? " (Demo)" : "");
        document.getElementById("settingsPlanActivated").textContent =
            license && license.activatedAt ? new Date(license.activatedAt).toLocaleDateString("es-CO") : "—";
        document.getElementById("settingsPlanExpiry").textContent =
            license && license.expiry ? new Date(license.expiry).toLocaleDateString("es-CO") : "—";
        document.getElementById("settingsPlanDays").textContent = daysUntilExpiry() + " días";
    }
}

function loadCreditSettingsUI() {
    document.getElementById("settingGlobalCreditLimit").value = creditSettings.globalLimit || 0;
    document.getElementById("settingOldCreditDays").value = creditSettings.oldDays || 30;
}

function saveCreditSettingsUI() {
    creditSettings.globalLimit = Number(document.getElementById("settingGlobalCreditLimit").value) || 0;
    creditSettings.oldDays = Number(document.getElementById("settingOldCreditDays").value) || 30;
    if (creditSettings.oldDays < 1) creditSettings.oldDays = 1;
    saveCreditSettings();
    showToast("💾 Configuración de fiados guardada");
}

function loadMessagesUI() {
    document.getElementById("msgReminder").value = customMessages.reminder || DEFAULT_MESSAGES.reminder;
    document.getElementById("msgStatement").value = customMessages.statement || DEFAULT_MESSAGES.statement;
    document.getElementById("msgOldCredit").value = customMessages.oldCredit || DEFAULT_MESSAGES.oldCredit;
}

function saveMessagesUI() {
    var reminder = document.getElementById("msgReminder").value.trim();
    var statement = document.getElementById("msgStatement").value.trim();
    var oldCredit = document.getElementById("msgOldCredit").value.trim();
    if (!reminder || !statement || !oldCredit) { alert("Todos los mensajes deben tener contenido."); return; }
    customMessages.reminder = reminder;
    customMessages.statement = statement;
    customMessages.oldCredit = oldCredit;
    saveMessages();
    showToast("💾 Mensajes guardados");
}

function resetMessagesUI() {
    if (!confirm("¿Restaurar los mensajes predeterminados?")) return;
    customMessages.reminder = DEFAULT_MESSAGES.reminder;
    customMessages.statement = DEFAULT_MESSAGES.statement;
    customMessages.oldCredit = DEFAULT_MESSAGES.oldCredit;
    saveMessages();
    loadMessagesUI();
    showToast("↺ Mensajes restaurados");
}

async function updateTechStats() {
    var stats = document.getElementById("techStats");
    if (!stats) return;
    var storage = JSON.stringify(localStorage).length;
    var storageKB = (storage / 1024).toFixed(2);
    var hwId = "no-disponible";
    try { hwId = await getHwId(); } catch (e) {}

    var plan = getCurrentPlan();
    stats.innerHTML =
        '<div><strong>Versión:</strong> 8.0</div>' +
        '<div><strong>Modo:</strong> ' + (isDemo() ? "🎁 Demo (7 días)" : "💎 Licencia") + '</div>' +
        '<div><strong>Productos totales:</strong> ' + products.length + '</div>' +
        '<div><strong>Ventas totales:</strong> ' + sales.length + '</div>' +
        '<div><strong>Anulaciones hoy:</strong> ' + getCancellationsToday() + ' / 3</div>' +
        '<div><strong>Clientes:</strong> ' + clients.length + '</div>' +
        '<div><strong>Categorías:</strong> ' + categories.length + '</div>' +
        '<div><strong>Uso de almacenamiento:</strong> ' + storageKB + ' KB</div>' +
        '<div><strong>Plan activo:</strong> ' + (plan ? plan.name : "Ninguno") + '</div>' +
        '<div><strong>Días restantes:</strong> ' + daysUntilExpiry() + '</div>' +
        '<div style="margin-top:10px; padding-top:10px; border-top:1px solid #334155;">' +
            '<strong>🔑 HW_ID del dispositivo:</strong>' +
            '<div style="font-family:Consolas,monospace; font-size:12px; color:#4ade80; word-break:break-all; margin-top:4px;">' + hwId + '</div>' +
            '<button class="secondary-btn small-btn" onclick="copyHwId(\'' + hwId + '\')" style="margin-top:6px; font-size:11px; padding:5px 10px;">📋 Copiar HW_ID</button>' +
        '</div>';
}

function copyHwId(hwId) {
    navigator.clipboard.writeText(hwId).then(function() {
        showToast("📋 HW_ID copiado al portapapeles");
    });
}

function saveStoreSettings() {
    storeSettings.name = document.getElementById("settingStoreName").value.trim();
    storeSettings.slogan = document.getElementById("settingStoreSlogan").value.trim();
    storeSettings.phone = document.getElementById("settingStorePhone").value.trim();
    storeSettings.address = document.getElementById("settingStoreAddress").value.trim();
    saveSettings();
    applyStoreBranding();
    showToast("💾 Datos de la tienda guardados");
}

function saveThemeSettings() {
    var themeRadio = document.querySelector('input[name="themeSelect"]:checked');
    var colorRadio = document.querySelector('input[name="colorSelect"]:checked');
    if (themeRadio) appSettings.theme = themeRadio.value;
    if (colorRadio) appSettings.accent = colorRadio.value;
    saveSettings();
    applyTheme();
    renderCharts();
    showToast("🎨 Tema actualizado");
}

/* =========================================================
   ACTUALIZACIONES
========================================================= */
function compareVersions(a, b) {
    var pa = a.split(".").map(Number);
    var pb = b.split(".").map(Number);
    var maxLen = Math.max(pa.length, pb.length);
    for (var i = 0; i < maxLen; i++) {
        var na = pa[i] || 0;
        var nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

/* ⚡ Detecta si está en escritorio o móvil */
function isDesktopApp() {
    return window.location.protocol === "file:" ||
           (typeof process !== "undefined" && process.versions && process.versions.electron) ||
           !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function checkForUpdates(force) {
    try {
        if (!force) {
            var lastCheck = localStorage.getItem(UPDATE_CONFIG.lastCheckKey);
            if (lastCheck) {
                var hoursSince = (Date.now() - parseInt(lastCheck)) / (1000 * 60 * 60);
                if (hoursSince < UPDATE_CONFIG.checkIntervalHours) {
                    var cached = localStorage.getItem("j2_update_cache");
                    if (cached) { handleUpdateData(JSON.parse(cached)); return; }
                }
            }
        }
        var response = await fetch(UPDATE_CONFIG.versionUrl + "?t=" + Date.now());
        if (!response.ok) throw new Error("No se pudo conectar");
        var data = await response.json();
        localStorage.setItem(UPDATE_CONFIG.lastCheckKey, Date.now().toString());
        localStorage.setItem("j2_update_cache", JSON.stringify(data));
        handleUpdateData(data);
    } catch (error) {
        console.log("⚠️ No se pudo verificar actualizaciones:", error.message);
    }
}

function handleUpdateData(data) {
    if (!data || !data.version) return;
    var comparison = compareVersions(data.version, UPDATE_CONFIG.currentVersion);
    if (comparison > 0) {
        localStorage.setItem("j2_update_available", JSON.stringify(data));
        var dismissedInSession = sessionStorage.getItem("j2_update_dismissed");
        if (!dismissedInSession) showUpdateBanner(data);
        updateSettingsBadge(true);
    } else {
        localStorage.removeItem("j2_update_available");
        updateSettingsBadge(false);
    }
}

function showUpdateBanner(data) {
    var banner = document.getElementById("updateBanner");
    if (!banner) return;
    banner.style.display = "flex";
    banner.innerHTML =
        '<div class="update-banner-content">' +
            '<span class="update-icon">✨</span>' +
            '<div class="update-text">' +
                '<strong>Nueva versión disponible: v' + data.version + '</strong>' +
                '<small>' + (data.notes || "Mejoras y correcciones") + '</small>' +
            '</div>' +
        '</div>' +
        '<div class="update-banner-actions">' +
            '<button class="update-btn-primary" onclick="openUpdateModal()">Ver detalles</button>' +
            '<button class="update-btn-dismiss" onclick="dismissUpdateBanner()">✕</button>' +
        '</div>';
}

function dismissUpdateBanner() {
    var banner = document.getElementById("updateBanner");
    if (banner) banner.style.display = "none";
    sessionStorage.setItem("j2_update_dismissed", "true");
}

function openUpdateModal() {
    var data = JSON.parse(localStorage.getItem("j2_update_available"));
    if (!data) { showToast("No hay actualización disponible"); return; }

    /* ⚡ Elige la descarga apropiada según plataforma */
    var esEscritorio = isDesktopApp();
    var downloadUrl = "";

    if (data.downloads) {
        downloadUrl = esEscritorio ? data.downloads.desktop : data.downloads.android;
    } else if (data.downloadUrl) {
        /* Compatibilidad con formato antiguo */
        downloadUrl = data.downloadUrl;
    }

    var plataformaLabel = esEscritorio ? "🖥️ Escritorio (Windows)" : "📱 Android";

    var modal = document.getElementById("updateModal");
    var content = document.getElementById("updateContent");
    content.innerHTML =
        '<div class="update-header">' +
            '<div class="update-icon-large">✨</div>' +
            '<h3>Nueva versión disponible</h3>' +
            '<p class="update-version-info">' +
                '<span class="update-old">v' + UPDATE_CONFIG.currentVersion + '</span>' +
                '<span class="update-arrow">→</span>' +
                '<span class="update-new">v' + data.version + '</span>' +
            '</p>' +
        '</div>' +
        '<div class="update-details">' +
            '<div class="update-detail-row"><span>📅 Fecha:</span><strong>' + (data.releaseDate || "Reciente") + '</strong></div>' +
            '<div class="update-detail-row"><span>' + plataformaLabel + ':</span><strong>Descarga para tu plataforma</strong></div>' +
        '</div>' +
        '<div class="update-notes">' +
            '<h4>📝 Novedades:</h4>' +
            '<p>' + (data.notes || "Mejoras y correcciones generales") + '</p>' +
        '</div>' +
        '<div class="update-actions">' +
            (downloadUrl
                ? '<a href="' + downloadUrl + '" target="_blank" class="primary-btn update-download-btn">📥 Descargar ' + (esEscritorio ? "instalador" : "APK") + '</a>'
                : '<p style="color:#dc2626; font-weight:700;">⚠️ Descarga no disponible. Contacta a soporte.</p>') +
            '<button class="secondary-btn" onclick="closeUpdateModal()">Más tarde</button>' +
        '</div>';
    modal.classList.add("show");
}

function closeUpdateModal() {
    var modal = document.getElementById("updateModal");
    if (modal) modal.classList.remove("show");
}

function updateSettingsBadge(show) {
    var settingsBtn = document.getElementById("settingsBtn");
    if (!settingsBtn) return;
    if (show) settingsBtn.classList.add("has-notification");
    else settingsBtn.classList.remove("has-notification");
}

async function forceCheckUpdates() {
    var btn = document.getElementById("checkUpdatesBtn");
    if (!btn) return;
    var originalText = btn.textContent;
    btn.textContent = "🔍 Verificando...";
    btn.disabled = true;
    await checkForUpdates(true);
    btn.textContent = originalText;
    btn.disabled = false;
    var updateData = JSON.parse(localStorage.getItem("j2_update_available"));
    if (updateData) openUpdateModal();
    else alert("✅ Estás en la última versión disponible.");
}

/* =========================================================
   ONBOARDING
========================================================= */
var ONBOARDING_STEPS = [
    { icon: "👋", title: "¡Bienvenido a J2!", text: "Vamos a hacer un recorrido rápido por la app. Solo te tomará 30 segundos." },
    { icon: "📦", title: "Aquí agregas productos", text: "Ve a la sección Inventario y crea tu primer producto con precio, stock y categoría." },
    { icon: "🧮", title: "Aquí haces ventas", text: "En la sección Ventas busca o escanea productos, agrega al carrito y cobra. ¡El cambio se calcula solo!" },
    { icon: "👥", title: "Aquí controlas los fiados", text: "En Clientes registras quién te debe, cuánto, y les envías recordatorios por WhatsApp." },
    { icon: "⚙️", title: "Personaliza tu app", text: "En Configuración puedes poner el nombre de tu tienda, tu logo, y cambiar los colores." }
];

var onboardingStep = 0;

function showOnboarding() {
    if (localStorage.getItem("j2_onboarded")) return;
    onboardingStep = 0;
    renderOnboardingStep();
    document.getElementById("onboardingModal").classList.add("show");
}

function renderOnboardingStep() {
    var step = ONBOARDING_STEPS[onboardingStep];
    document.getElementById("onboardingIcon").textContent = step.icon;
    document.getElementById("onboardingTitle").textContent = step.title;
    document.getElementById("onboardingText").textContent = step.text;
    document.querySelectorAll(".progress-dot").forEach(function(dot, i) {
        dot.classList.toggle("active", i === onboardingStep);
    });
    var nextBtn = document.getElementById("nextOnboarding");
    if (nextBtn) nextBtn.textContent = onboardingStep === ONBOARDING_STEPS.length - 1 ? "¡Empezar! 🚀" : "Siguiente →";
}

function nextOnboarding() {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
        onboardingStep++;
        renderOnboardingStep();
    } else {
        finishOnboarding();
    }
}

function skipOnboarding() { finishOnboarding(); }

function finishOnboarding() {
    localStorage.setItem("j2_onboarded", "true");
    document.getElementById("onboardingModal").classList.remove("show");
}

function showOnboardingAgain() {
    localStorage.removeItem("j2_onboarded");
    onboardingStep = 0;
    renderOnboardingStep();
    document.getElementById("onboardingModal").classList.add("show");
}

/* =========================================================
   HELPERS DE EVENTOS
========================================================= */
function on(id, event, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
    else console.warn("[INIT] Elemento no encontrado: #" + id);
}

function onAll(selector, event, handler) {
    document.querySelectorAll(selector).forEach(function(el) {
        el.addEventListener(event, handler);
    });
}

/* =========================================================
   ATAJOS DE TECLADO
========================================================= */
function initKeyboardShortcuts() {
    document.addEventListener("keydown", function(e) {
        if (e.target.matches("input, select, textarea")) return;
        if (e.key === "F2") {
            e.preventDefault();
            clearSale();
            document.getElementById("productSearch").focus();
        }
        if (e.key === "/") {
            e.preventDefault();
            document.getElementById("productSearch").focus();
        }
        if (e.key === "Escape") {
            document.querySelectorAll(".modal.show").forEach(function(m) {
                if (m.id === "scanModal") closeScanModal();
                else if (m.id === "receiptModal") closeReceipt();
                else if (m.id === "weightModal") closeWeightModal();
                else if (m.id === "allProductsModal") closeAllProductsModal();
                else if (m.id === "successModal") closeSuccessModal();
                else if (m.id === "onboardingModal") skipOnboarding();
                else if (m.id === "settingsModal") closeSettingsModal();
                else if (m.id === "requestPasswordModal") closeRequestPasswordModal();
                else if (m.id === "updateModal") closeUpdateModal();
                else if (m.id === "accountStatementModal") closeAccountStatementModal();
                else if (m.id === "quickPaymentModal") closeQuickPaymentModal();
                else if (m.id === "creditDetailModal") closeCreditDetailModal();
                else if (m.id === "messageSelectorModal") closeMessageSelectorModal();
                else if (m.id === "exportModal") closeExportModal();
                else if (m.id === "installModal") m.classList.remove("show");
                else if (m.id === "emojiPickerModal") closeEmojiPicker();
                else if (m.id === "posCategoriaModal") cerrarCategoriaPOS();
                else if (m.id === "manageCategoriesModal") closeManageCategoriesModal();
                else if (m.id === "categoryModal") closeCategoryModal();
                else if (m.id === "activationModal") closeActivationModal();
                else if (m.id === "deleteForeverModal") closeDeleteForeverModal();
                else if (m.id !== "licenseModal" && m.id !== "welcomeModal" && m.id !== "demoActivatedModal") {
                    m.classList.remove("show");
                }
            });
        }
    });
}

/* =========================================================
   ⚡ RENDER OPTIMIZADO
   renderData: lo más usado (rápido)
   renderReports: solo cuando Reportes está activo
========================================================= */
function renderData() {
    if (!isLicenseValid()) return;
    updateDate();
    updatePlanBadge();
    updateExpiryBanner();
    updateDemoBanner();
    renderProducts();
    renderCategoriasPOS();
    renderCart();
    renderInventory();
    renderClients();
    renderProviders();
}

/* Alias para compatibilidad con código existente */
function renderAll() {
    renderData();
    /* Solo renderiza reportes si está activa la sección */
    var reportes = document.getElementById("reportes");
    if (reportes && reportes.classList.contains("active")) {
        renderReports();
    }
}

/* =========================================================
   BIENVENIDA
========================================================= */
var welcomeSlide = 1;
var totalSlides = 3;

function showWelcomeSlide(n) {
    document.querySelectorAll(".welcome-slide").forEach(function(s) { s.classList.remove("active"); });
    document.querySelectorAll(".welcome-dot").forEach(function(d) { d.classList.remove("active"); });
    var slide = document.querySelector('.welcome-slide[data-slide="' + n + '"]');
    var dot = document.querySelector('.welcome-dot[data-dot="' + n + '"]');
    if (slide) slide.classList.add("active");
    if (dot) dot.classList.add("active");
    var prevBtn = document.getElementById("welcomePrev");
    var nextBtn = document.getElementById("welcomeNext");
    if (prevBtn) prevBtn.style.display = n === 1 ? "none" : "inline-flex";
    if (nextBtn) nextBtn.style.display = n === totalSlides ? "none" : "inline-flex";
    welcomeSlide = n;
}

/* =========================================================
   INIT EVENTS
========================================================= */
function initEvents() {

    /* Bienvenida */
    on("welcomeNext", "click", function() {
        if (welcomeSlide < totalSlides) showWelcomeSlide(welcomeSlide + 1);
    });
    on("welcomePrev", "click", function() {
        if (welcomeSlide > 1) showWelcomeSlide(welcomeSlide - 1);
    });
    onAll(".welcome-dot", "click", function(e) {
        showWelcomeSlide(parseInt(e.currentTarget.dataset.dot));
    });

    on("startDemoBtn", "click", function() {
        var result = activateDemo();
        if (result.success) {
            localStorage.setItem("j2_welcomed", "true");
            document.getElementById("welcomeModal").classList.remove("show");
            var demoModal = document.getElementById("demoActivatedModal");
            var expiryDate = new Date(result.license.expiry);
            document.getElementById("demoExpiryDate").textContent =
                expiryDate.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
            demoModal.classList.add("show");
            desbloquearApp();
        } else {
            alert("⚠️ " + result.message);
            document.getElementById("welcomeModal").classList.remove("show");
            localStorage.setItem("j2_welcomed", "true");
            document.getElementById("licenseModal").classList.add("show");
        }
    });

    on("activateLicenseBtn", "click", function() {
        localStorage.setItem("j2_welcomed", "true");
        document.getElementById("welcomeModal").classList.remove("show");
        document.getElementById("licenseModal").classList.add("show");
    });

    on("startDemoApp", "click", function() {
        document.getElementById("demoActivatedModal").classList.remove("show");
        updateDemoBanner();
        updatePlanBadge();
        renderData();
        setTimeout(showOnboarding, 500);
    });

    on("closeLicenseModal", "click", function() {
        if (!isLicenseValid()) {
            showToast("⚠️ Debes activar una licencia o iniciar la demo para usar J2.");
            return;
        }
        document.getElementById("licenseModal").classList.remove("show");
    });

    on("closeInstallModal", "click", function() {
        document.getElementById("installModal").classList.remove("show");
    });

    on("activateLicense", "click", async function() {
        var code = document.getElementById("licenseCode").value;
        await withButtonLoading(document.getElementById("activateLicense"), async function() {
            try {
                var result = await activateLicense(code);
                if (result.success) {
                    var plan = PLAN_FEATURES[result.license.plan] || PLAN_FEATURES.basic;
                    document.getElementById("licenseStep1").style.display = "none";
                    document.getElementById("licenseStep2").style.display = "block";
                    document.getElementById("activatedPlan").textContent = plan.name;
                    document.getElementById("activatedExpiry").textContent =
                        new Date(result.license.expiry).toLocaleDateString("es-CO");
                    document.getElementById("activatedDays").textContent = daysUntilExpiry() + " días";
                    desbloquearApp();
                    var closeBtn = document.getElementById("closeLicenseModal");
                    if (closeBtn) closeBtn.style.display = "inline-flex";
                    renderData();
                } else {
                    alert("❌ " + result.message);
                }
            } catch (err) {
                alert("❌ Error: " + err.message);
            }
        });
    });

    on("licenseCode", "keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            document.getElementById("activateLicense").click();
        }
    });

    on("requestTrial", "click", function(e) {
        e.preventDefault();
        var msg = encodeURIComponent("Hola Sakura · Solución IT, quiero solicitar una prueba gratis de 7 días de J2.");
        if (confirm("📱 Se abrirá WhatsApp para contactar a Sakura. ¿Continuar?")) {
            window.open("https://wa.me/" + SAKURA_CONFIG.phone + "?text=" + msg, "_blank");
        }
    });

    on("startApp", "click", function() {
        document.getElementById("licenseModal").classList.remove("show");
        localStorage.setItem("j2_welcomed", "true");
        updateExpiryBanner();
        updatePlanBadge();
        renderData();
        setTimeout(showOnboarding, 500);
    });

    /* Productos - ⚡ DEBOUNCE */
    on("productSearch", "input", debouncedRenderProducts);
    on("addQuickProduct", "click", addQuickProduct);
    on("addQuickUnit", "click", addQuickUnit);
    onAll('input[name="quickMode"]', "change", toggleQuickMode);
    on("newProductBtn", "click", openProductModal);
    on("closeModal", "click", closeProductModal);
    on("cancelProduct", "click", closeProductModal);
    on("productForm", "submit", saveProduct);
    on("productCategory", "change", toggleCategoryFields);
    on("baseUnit", "change", updateBaseUnitLabels);
    on("salePriceBase", "input", updateWeightEquivalences);
    on("purchasePriceBase", "input", updateWeightEquivalences);
    on("clearSaleBtn", "click", clearSale);

    /* Categorías */
    on("addCategoryBtn", "click", function() { openCategoryModal(); });
    on("closeCategoryModal", "click", closeCategoryModal);
    on("cancelCategory", "click", closeCategoryModal);
    on("categoryForm", "submit", saveCategory);
    on("openEmojiPickerBtn", "click", abrirEmojiPicker);
    on("closeEmojiPickerModal", "click", closeEmojiPicker);
    on("emojiSearch", "input", function(e) { renderEmojiPicker(e.target.value); });
    on("manageCategoriesBtn", "click", openManageCategoriesModal);
    on("closeManageCategoriesModal", "click", closeManageCategoriesModal);
    on("newCategoryFromManage", "click", function() { openCategoryModal(); });

    /* POS categorías - ⚡ DEBOUNCE */
    on("closePosCategoriaModal", "click", cerrarCategoriaPOS);
    on("posListoBtn", "click", cerrarCategoriaPOS);
    on("posCategoriaSearch", "input", function(e) {
        var q = e.target.value;
        clearTimeout(window._posSearchTimer);
        window._posSearchTimer = setTimeout(function() {
            renderCategoriaPOSGrid(q);
        }, 200);
    });

    /* Todos los productos - ⚡ DEBOUNCE */
    on("showAllProductsBtn", "click", openAllProductsModal);
    on("closeAllProductsModal", "click", closeAllProductsModal);
    on("allProductsSearch", "input", debouncedRenderAllProductsList);

    /* Venta */
    on("cashReceived", "input", calculateChange);
    on("cashReceived", "keydown", function(e) {
        if (e.key === "Enter" && !document.getElementById("completeSale").disabled) {
            e.preventDefault();
            completeSale();
        }
    });
    on("completeSale", "click", completeSale);
    onAll('input[name="paymentType"]', "change", togglePaymentMode);
    onAll(".quick-cash-btn", "click", function(e) {
        var amount = Number(e.currentTarget.dataset.amount);
        var input = document.getElementById("cashReceived");
        var current = Number(input.value) || 0;
        input.value = current + amount;
        calculateChange();
    });

    /* Fiado */
    on("creditAbono", "input", actualizarResumenFiado);
    on("creditClient", "change", actualizarResumenFiado);

    /* Venta exitosa */
    on("closeSuccessBtn", "click", closeSuccessModal);
    on("printReceiptBtn", "click", printCurrentReceipt);

    /* Peso */
    on("weightUnit", "change", updateWeightSubtotal);
    on("weightAmount", "input", updateWeightSubtotal);
    on("weightPriceUnit", "change", updateWeightPriceConversion);
    on("weightPriceAmount", "input", updateWeightPriceConversion);
    on("weightUnitQty", "input", updateWeightUnitSubtotal);
    onAll(".weight-tab", "click", function(e) {
        setWeightMode(e.currentTarget.dataset.mode);
    });
    on("confirmWeight", "click", confirmWeight);
    on("cancelWeight", "click", closeWeightModal);
    on("closeWeightModal", "click", closeWeightModal);

    /* Inventario - ⚡ DEBOUNCE */
    on("inventorySearch", "input", debouncedRenderInventory);
    on("inventoryCategoryFilter", "change", renderInventory);
    on("inventoryStatusFilter", "change", renderInventory);
    on("inventorySort", "change", renderInventory);
    on("clearInventoryFilters", "click", clearInventoryFilters);

    onAll(".inventory-tab", "click", function(e) {
        switchInventoryTab(e.currentTarget.dataset.tab);
    });

    /* Clientes */
    on("newClientBtn", "click", openClientModal);
    on("closeClientModal", "click", closeClientModal);
    on("cancelClient", "click", closeClientModal);
    on("clientForm", "submit", saveClient);
    on("closeClientDetailModal", "click", closeClientDetailModal);
    on("quickAddClient", "click", openClientModal);

    on("closeCreditDetailModal", "click", closeCreditDetailModal);

    on("closeAccountStatementModal", "click", closeAccountStatementModal);
    on("printAccountStatement", "click", printAccountStatement);
    on("sendAccountStatementWa", "click", sendAccountStatementWa);

    on("closeQuickPaymentModal", "click", closeQuickPaymentModal);
    on("cancelQuickPayment", "click", closeQuickPaymentModal);
    on("confirmQuickPayment", "click", confirmQuickPayment);

    /* Proveedores */
    on("newProviderBtn", "click", openProviderModal);
    on("closeProviderModal", "click", closeProviderModal);
    on("cancelProvider", "click", closeProviderModal);
    on("providerForm", "submit", saveProvider);

    /* Abonos */
    on("closeAbonoModal", "click", closeAbonoModal);
    on("cancelAbono", "click", closeAbonoModal);
    on("abonoForm", "submit", saveAbono);

    /* Reportes */
    on("exportCsvBtn", "click", exportCSV);
    on("reportPeriod", "change", renderReports);

    /* Selector de mensajes */
    on("closeMessageSelectorModal", "click", closeMessageSelectorModal);
    on("cancelMessageSelector", "click", closeMessageSelectorModal);

    /* Exportar */
    on("closeExportModal", "click", closeExportModal);
    on("cancelExport", "click", closeExportModal);
    on("confirmExport", "click", confirmarExportacion);
    on("exportPeriod", "change", function(e) {
        document.getElementById("customRangeBox").style.display = e.target.value === "custom" ? "block" : "none";
    });

    /* Escáner */
    on("scanBarcodeBtn", "click", openScanModal);
    on("closeScanModal", "click", closeScanModal);

    /* Sugerencias */
    on("suggestBuyBtn", "click", suggestBuy);
    on("closeSuggestModal", "click", function() {
        document.getElementById("suggestModal").classList.remove("show");
    });
    on("deadProductsBtn", "click", showDeadProducts);
    on("closeDeadProductsModal", "click", closeDeadProductsModal);

    /* Cierre de caja */
    on("closeCashBtn", "click", generateCashReport);

    /* Respaldos */
    on("backupBtn", "click", backupData);
    on("restoreBtn", "click", function() {
        document.getElementById("restoreInput").click();
    });
    on("restoreInput", "change", restoreData);

    /* Planes */
    on("plansBtn", "click", function() {
        document.getElementById("plansModal").classList.add("show");
    });
    on("closePlansModal", "click", function() {
        document.getElementById("plansModal").classList.remove("show");
    });

    /* Settings / Onboarding */
    on("helpBtn", "click", showOnboardingAgain);
    on("settingsBtn", "click", openSettingsModal);
    on("closeSettingsModal", "click", closeSettingsModal);
    on("nextOnboarding", "click", nextOnboarding);
    on("skipOnboarding", "click", skipOnboarding);

    onAll(".settings-tab", "click", function(e) {
        var tab = e.currentTarget;
        document.querySelectorAll(".settings-tab").forEach(function(t) { t.classList.remove("active"); });
        document.querySelectorAll(".settings-panel").forEach(function(p) { p.classList.remove("active"); });
        tab.classList.add("active");
        var panel = document.querySelector('.settings-panel[data-panel="' + tab.dataset.tab + '"]');
        if (panel) panel.classList.add("active");
    });

    on("saveStoreSettings", "click", saveStoreSettings);
    on("saveThemeSettings", "click", saveThemeSettings);
    on("saveMessages", "click", saveMessagesUI);
    on("resetMessages", "click", resetMessagesUI);
    on("saveCreditSettings", "click", saveCreditSettingsUI);

    on("settingStoreLogo", "change", function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 500000) { alert("⚠️ El logo es muy grande. Máximo 500KB."); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
            storeSettings.logo = ev.target.result;
            document.getElementById("logoPreviewImg").src = ev.target.result;
            document.getElementById("logoPreview").style.display = "block";
            saveSettings();
            applyStoreBranding();
        };
        reader.readAsDataURL(file);
    });

    on("removeLogoBtn", "click", function() {
        storeSettings.logo = "";
        saveSettings();
        document.getElementById("logoPreview").style.display = "none";
        document.getElementById("settingStoreLogo").value = "";
        applyStoreBranding();
        showToast("🗑️ Logo eliminado");
    });

    on("settingsRenewBtn", "click", function() {
        closeSettingsModal();
        document.getElementById("plansModal").classList.add("show");
    });

    /* Anular venta */
    on("closeCancelSaleModal", "click", closeCancelSaleModal);
    on("cancelCancelSale", "click", closeCancelSaleModal);
    on("confirmCancelSale", "click", confirmCancelSale);
    on("forgotPasswordBtn", "click", openRequestPasswordModal);
    on("closeRequestPasswordModal", "click", closeRequestPasswordModal);
    on("sendTempCodeBtn", "click", sendTempCodeByWhatsApp);

    on("closeUpdateModalBtn", "click", closeUpdateModal);

    /* Plan activation modal */
    on("closeActivationModal", "click", closeActivationModal);
    on("requestPlanWa", "click", function(e) {
        pedirPlanWhatsApp(e.currentTarget.dataset.planKey);
    });
    on("confirmActivation", "click", async function() {
        var code = document.getElementById("activationCode").value;
        await withButtonLoading(document.getElementById("confirmActivation"), async function() {
            try {
                var result = await activateLicense(code);
                if (result.success) {
                    var plan = PLAN_FEATURES[result.license.plan] || PLAN_FEATURES.basic;
                    document.getElementById("activationStep1").style.display = "none";
                    document.getElementById("activationStep2").style.display = "block";
                    document.getElementById("activatedPlanModal").textContent = plan.name;
                    document.getElementById("activatedExpiryModal").textContent = new Date(result.license.expiry).toLocaleDateString("es-CO");
                    document.getElementById("activatedDaysModal").textContent = daysUntilExpiry() + " días";
                    desbloquearApp();
                    renderData();
                } else {
                    alert("❌ " + result.message);
                }
            } catch (err) {
                alert("❌ Error: " + err.message);
            }
        });
    });

    on("startAppFromModal", "click", function() {
        document.getElementById("activationModal").classList.remove("show");
        document.getElementById("welcomeModal").classList.remove("show");
        localStorage.setItem("j2_welcomed", "true");
        updateExpiryBanner();
        updatePlanBadge();
        renderData();
        setTimeout(showOnboarding, 500);
    });

    /* Eliminar definitivo */
    on("closeDeleteForeverModal", "click", closeDeleteForeverModal);
    on("cancelDeleteForever", "click", closeDeleteForeverModal);
    on("confirmDeleteForever", "click", confirmDeleteForever);
    on("deleteForeverPassword", "keydown", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            confirmDeleteForever();
        }
    });

    /* Cerrar modales al hacer clic fuera */
    document.addEventListener("click", function(e) {
        if (e.target.id === "receiptModal") closeReceipt();
        if (e.target.id === "plansModal") document.getElementById("plansModal").classList.remove("show");
        if (e.target.id === "successModal") closeSuccessModal();
        if (e.target.id === "clientDetailModal") closeClientDetailModal();
        if (e.target.id === "settingsModal") closeSettingsModal();
        if (e.target.id === "requestPasswordModal") closeRequestPasswordModal();
        if (e.target.id === "updateModal") closeUpdateModal();
        if (e.target.id === "accountStatementModal") closeAccountStatementModal();
        if (e.target.id === "quickPaymentModal") closeQuickPaymentModal();
        if (e.target.id === "creditDetailModal") closeCreditDetailModal();
        if (e.target.id === "messageSelectorModal") closeMessageSelectorModal();
        if (e.target.id === "exportModal") closeExportModal();
        if (e.target.id === "installModal") document.getElementById("installModal").classList.remove("show");
        if (e.target.id === "emojiPickerModal") closeEmojiPicker();
        if (e.target.id === "posCategoriaModal") cerrarCategoriaPOS();
        if (e.target.id === "manageCategoriesModal") closeManageCategoriesModal();
        if (e.target.id === "categoryModal") closeCategoryModal();
        if (e.target.id === "activationModal") closeActivationModal();
        if (e.target.id === "deleteForeverModal") closeDeleteForeverModal();
    });
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
async function inicializar() {
    console.log("🚀 Inicializando J2 v8.0...");

    var yearEl = document.getElementById("footerYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    console.log(
        "%c      🏪 J2 v8.0 · Optimizado + Archivados + Admin      ",
        "background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-weight: bold; font-size: 20px; padding: 10px 20px; border-radius: 8px;"
    );

    refreshLicenseState();
    applyTheme();
    applyStoreBranding();
    renderCategoryOptions();
    renderCategoriasPOS();
    initNavigation();
    initEvents();
    initKeyboardShortcuts();

    var isElectron = window.location.protocol === "file:";
    if ("serviceWorker" in navigator && !isElectron) {
        window.addEventListener("load", function() {
            navigator.serviceWorker.register("./sw.js")
                .then(function() { console.log("✅ SW registrado"); })
                .catch(function(err) { console.log("⚠️ SW no registrado:", err); });
        });
    }

    var deferredPrompt = null;
    var installBtn = document.getElementById("installBtn");

    window.addEventListener("beforeinstallprompt", function(e) {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.style.display = "inline-flex";
    });

    if (installBtn) {
        installBtn.addEventListener("click", async function() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                var choice = await deferredPrompt.userChoice;
                if (choice.outcome === "accepted" && installBtn) installBtn.style.display = "none";
                deferredPrompt = null;
            } else {
                document.getElementById("installModal").classList.add("show");
            }
        });
    }

    window.addEventListener("appinstalled", function() {
        if (installBtn) installBtn.style.display = "none";
    });

    var isFirstTime = !localStorage.getItem("j2_welcomed");

    if (!isLicenseValid()) {
        if (isFirstTime && !isDemoUsed()) {
            document.getElementById("welcomeModal").classList.add("show");
            document.getElementById("licenseModal").classList.remove("show");
        } else {
            document.getElementById("welcomeModal").classList.remove("show");
            initLicenseUI();
        }
    } else {
        document.getElementById("welcomeModal").classList.remove("show");
        document.getElementById("licenseModal").classList.remove("show");
        updateDemoBanner();
        renderData();
        setTimeout(showOnboarding, 800);
        setTimeout(function() { checkForUpdates(); }, 5000);
    }

    if (isLicenseValid() && !isDemo()) {
        setTimeout(async function() {
            try {
                var result = await checkOnlineLicense();
                if (result.status === "revoked") {
                    alert("⚠️ Tu licencia fue revocada.\n\nContacta a soporte inmediatamente.");
                } else if (result.status === "offline_expired") {
                    alert("⚠️ No se ha podido validar tu licencia online en mucho tiempo.\n\nConéctate a internet para continuar usando J2.");
                }
            } catch (e) {
                console.log("Error validación online:", e);
            }
        }, 3000);
    }

    setTimeout(hideLoading, 600);
    console.log("✅ J2 v8.0 inicializado correctamente");
}

function arrancar() {
    try {
        inicializar();
    } catch (e) {
        console.error("❌ Error en inicializar:", e);
        hideLoading();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
} else {
    arrancar();
}

/* =========================================================
   EXPONER FUNCIONES A WINDOW
========================================================= */
window.showWelcomeSlide = showWelcomeSlide;
window.nextOnboarding = nextOnboarding;
window.skipOnboarding = skipOnboarding;
window.showOnboardingAgain = showOnboardingAgain;
window.clearSale = clearSale;
window.removeFromCart = removeFromCart;
window.changeQuantity = changeQuantity;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.restoreProduct = restoreProduct;
window.openDeleteForever = openDeleteForever;
window.closeDeleteForeverModal = closeDeleteForeverModal;
window.confirmDeleteForever = confirmDeleteForever;
window.saveProduct = saveProduct;
window.openAllProductsModal = openAllProductsModal;
window.closeAllProductsModal = closeAllProductsModal;
window.openWeightModal = openWeightModal;
window.closeWeightModal = closeWeightModal;
window.confirmWeight = confirmWeight;
window.openScanModal = openScanModal;
window.closeScanModal = closeScanModal;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.deleteCategory = deleteCategory;
window.openManageCategoriesModal = openManageCategoriesModal;
window.closeManageCategoriesModal = closeManageCategoriesModal;
window.abrirCategoriaPOS = abrirCategoriaPOS;
window.cerrarCategoriaPOS = cerrarCategoriaPOS;
window.abrirEmojiPicker = abrirEmojiPicker;
window.closeEmojiPicker = closeEmojiPicker;
window.seleccionarEmoji = seleccionarEmoji;
window.openClientModal = openClientModal;
window.closeClientModal = closeClientModal;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.saveClient = saveClient;
window.viewClientDetail = viewClientDetail;
window.closeClientDetailModal = closeClientDetailModal;
window.openAbono = openAbono;
window.closeAbonoModal = closeAbonoModal;
window.saveAbono = saveAbono;
window.openProviderModal = openProviderModal;
window.closeProviderModal = closeProviderModal;
window.editProvider = editProvider;
window.deleteProvider = deleteProvider;
window.saveProvider = saveProvider;
window.showDeadProducts = showDeadProducts;
window.closeDeadProductsModal = closeDeadProductsModal;
window.suggestBuy = suggestBuy;
window.exportCSV = exportCSV;
window.backupData = backupData;
window.restoreData = restoreData;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveStoreSettings = saveStoreSettings;
window.saveThemeSettings = saveThemeSettings;
window.openCancelSale = openCancelSale;
window.closeCancelSaleModal = closeCancelSaleModal;
window.confirmCancelSale = confirmCancelSale;
window.openRequestPasswordModal = openRequestPasswordModal;
window.closeRequestPasswordModal = closeRequestPasswordModal;
window.sendTempCodeByWhatsApp = sendTempCodeByWhatsApp;
window.closeReceipt = closeReceipt;
window.imprimirRecibo = imprimirRecibo;
window.guardarReciboPDF = guardarReciboPDF;
window.imprimirCierre = imprimirCierre;
window.guardarCierrePDF = guardarCierrePDF;
window.generateCashReport = generateCashReport;
window.reprint = reprint;
window.goToInventory = goToInventory;
window.copyHwId = copyHwId;
window.closeUpdateModal = closeUpdateModal;
window.openUpdateModal = openUpdateModal;
window.dismissUpdateBanner = dismissUpdateBanner;
window.forceCheckUpdates = forceCheckUpdates;
window.calculateChange = calculateChange;
window.completeSale = completeSale;
window.addQuickProduct = addQuickProduct;
window.addQuickUnit = addQuickUnit;
window.toggleCategoryFields = toggleCategoryFields;
window.printCurrentReceipt = printCurrentReceipt;
window.openAccountStatement = openAccountStatement;
window.closeAccountStatementModal = closeAccountStatementModal;
window.printAccountStatement = printAccountStatement;
window.sendAccountStatementWa = sendAccountStatementWa;
window.openQuickPayment = openQuickPayment;
window.closeQuickPaymentModal = closeQuickPaymentModal;
window.confirmQuickPayment = confirmQuickPayment;
window.logMessageSent = logMessageSent;
window.actualizarResumenFiado = actualizarResumenFiado;
window.openCreditDetail = openCreditDetail;
window.closeCreditDetailModal = closeCreditDetailModal;
window.abrirSelectorMensaje = abrirSelectorMensaje;
window.closeMessageSelectorModal = closeMessageSelectorModal;
window.enviarMensajeWhatsApp = enviarMensajeWhatsApp;
window.closeExportModal = closeExportModal;
window.confirmarExportacion = confirmarExportacion;
window.activarPlanDesdeModal = activarPlanDesdeModal;
window.pedirPlanWhatsApp = pedirPlanWhatsApp;
window.bloquearApp = bloquearApp;
window.desbloquearApp = desbloquearApp;
window.closeActivationModal = closeActivationModal;
window.switchInventoryTab = switchInventoryTab;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

/* =========================================================
   RESET DE EMERGENCIA
========================================================= */
window.resetApp = function() {
    if (!confirm("⚠️ ¿Estás SEGURO?\n\nEsto borrará TODOS los datos de J2.")) return;
    if (!confirm("⚠️ ÚLTIMA ADVERTENCIA\n\n¿Realmente quieres borrar todo?")) return;
    Object.keys(localStorage).filter(function(k) { return k.startsWith("j2_"); }).forEach(function(k) {
        localStorage.removeItem(k);
    });
    sessionStorage.clear();
    location.reload();
};

console.log("✅ app.js v8.0 cargado completamente");