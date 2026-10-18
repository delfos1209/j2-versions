/* =========================================================
   J2 · Módulo de licencias v3
   Verificación ECDSA P-256 + HW_ID + validación online híbrida
   by Sakura · Solución IT SAS
========================================================= */

const Licencia = (() => {

    /* =========================================================
       ⚙️ CONFIGURACIÓN
    ========================================================= */

    /**
     * 🔑 LLAVE PÚBLICA ECDSA P-256
     * 
     * ⚠️ SE GENERA EN generador.html → pestaña Configuración.
     * Copia las coordenadas X e Y aquí.
     * NO ES SECRETA — solo sirve para verificar firmas.
     */
    const PUBLIC_KEY = {
        kty: "EC",
        crv: "P-256",
        x: "lhbjhTA0YkfAbhDxVQJ99JA-qUPYyVAdV0eM8ARrzkg",
        y: "iwBebDe7aJteqEopaOer5744d92THq9xJtgcnM9oPjE",
        key_ops: ["verify"],
        ext: true
    };

    /**
     * 🌐 Validación online híbrida
     */
    const ONLINE_CONFIG = {
        enabled: true,
        url: "https://delfos1209.github.io/j2-versions/licencias.json",
        checkIntervalHours: 72,
        offlineGraceDays: 30,
        lastCheckKey: "j2_online_check_v2"
    };

    /**
     * 📁 Storage
     */
    const STORAGE_KEY = "j2_license_v2";
    const USED_CODES_KEY = "j2_used_codes_v2";
    const DEMO_KEY = "j2_demo_used_v2";
    const DEMO_DAYS = 7;

    /**
     * 📋 Planes y features
     */
    const PLAN_FEATURES = {
        basic: {
            name: "Básico",
            maxProducts: 30,
            maxUsers: 1,
            maxPos: 1,
            features: [
                "sales", "change", "inventory_basic", "reports_day"
            ]
        },
        pro: {
            name: "Pro",
            maxProducts: Infinity,
            maxUsers: 2,
            maxPos: 1,
            features: [
                "sales", "change", "inventory", "categories_custom",
                "credits", "reports", "cash_register", "backup",
                "transfer", "providers", "receipts"
            ]
        },
        promax: {
            name: "ProMax",
            maxProducts: Infinity,
            maxUsers: Infinity,
            maxPos: Infinity,
            features: [
                "sales", "change", "inventory", "categories_custom",
                "credits", "reports", "cash_register", "backup",
                "backup_auto", "transfer", "providers", "receipts",
                "barcode", "weight_sales", "price_sales",
                "multi_user", "suggest_buy", "whatsapp", "labels"
            ]
        }
    };

    /* =========================================================
       ESTADO
    ========================================================= */

    let license = null;
    let lastOnlineCheck = null;

    /* =========================================================
       CARGA / GUARDADO
    ========================================================= */

    function load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { license = null; return; }
        try {
            license = JSON.parse(raw);
        } catch (e) {
            license = null;
        }
        const lastCheck = localStorage.getItem(ONLINE_CONFIG.lastCheckKey);
        lastOnlineCheck = lastCheck ? parseInt(lastCheck) : null;
    }

    function save() {
        if (license) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    /* =========================================================
       MIGRACIÓN DESDE SISTEMA ANTIGUO
    ========================================================= */

    function migrateOldLicense() {
        const oldLicense = localStorage.getItem("j2_license");
        if (!oldLicense) return;

        try {
            const old = JSON.parse(oldLicense);
            if (old.expiry && new Date(old.expiry) > new Date()) {
                console.log("🔄 Migrando licencia antigua...");
                const migrated = {
                    ...old,
                    isLegacy: true,
                    migratedAt: new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                console.log("✅ Licencia migrada");
            }
            localStorage.removeItem("j2_license");
        } catch (e) {
            console.error("Error migrando:", e);
        }
    }

    /* =========================================================
       VALIDACIÓN DE CÓDIGO
    ========================================================= */

    async function validateCode(code) {
        code = (code || "").trim();
        if (!code) return { success: false, message: "Código vacío." };

        const parts = code.split(".");
        if (parts.length !== 2) {
            return { success: false, message: "Formato de código inválido." };
        }

        const [payloadB64, signatureB64] = parts;

        let payload;
        try {
            const payloadBytes = CryptoUtils.base64UrlToBytes(payloadB64);
            payload = JSON.parse(new TextDecoder().decode(payloadBytes));
        } catch (e) {
            return { success: false, message: "Código corrupto." };
        }

        if (!payload.plan || !payload.expires_at || !payload.serial) {
            return { success: false, message: "Código incompleto." };
        }

        // Verificar firma con ECDSA P-256
        const signatureValid = await CryptoUtils.verify(
            payloadB64, signatureB64, PUBLIC_KEY
        );

        if (!signatureValid) {
            return {
                success: false,
                message: "❌ Firma inválida.\n\nEste código no fue emitido por Sakura · Solución IT SAS."
            };
        }

        // Código ya usado
        const usedCodes = JSON.parse(localStorage.getItem(USED_CODES_KEY) || "[]");
        if (usedCodes.includes(payload.serial)) {
            return { success: false, message: "Este código ya fue utilizado en este dispositivo." };
        }

        // Expiración
        const expiryDate = new Date(payload.expires_at);
        if (expiryDate <= new Date()) {
            return {
                success: false,
                message: `Este código venció el ${expiryDate.toLocaleDateString("es-CO")}.`
            };
        }

        // HW_ID
        if (payload.hw_id && payload.hw_id !== "*") {
            const currentHwId = await CryptoUtils.generateHwId();
            if (payload.hw_id !== currentHwId) {
                return {
                    success: false,
                    message: `⚠️ Esta licencia fue emitida para otro dispositivo.\n\nSi cambiaste de equipo, contacta a soporte por WhatsApp.`
                };
            }
        }

        // Online (si tiene red)
        if (ONLINE_CONFIG.enabled) {
            const revoked = await checkRevoked(payload.serial);
            if (revoked) {
                return {
                    success: false,
                    message: "Esta licencia fue revocada. Contacta a soporte."
                };
            }
        }

        const newLicense = {
            code: code,
            plan: payload.plan,
            features: payload.features || PLAN_FEATURES[payload.plan]?.features || [],
            serial: payload.serial,
            client: payload.client || "",
            hwId: payload.hw_id || "",
            issuedAt: payload.issued_at,
            expiry: payload.expires_at,
            maxPos: payload.max_pos || 1,
            maxUsers: payload.max_users || 1,
            activatedAt: new Date().toISOString(),
            isDemo: false,
            isLegacy: false
        };

        return { success: true, license: newLicense };
    }

    /* =========================================================
       VALIDACIÓN ONLINE
    ========================================================= */

    async function checkRevoked(serial) {
        try {
            const res = await fetch(ONLINE_CONFIG.url + "?t=" + Date.now(), {
                cache: "no-store"
            });
            if (!res.ok) return false;
            const data = await res.json();
            return (data.revoked || []).includes(serial);
        } catch (e) {
            return false;
        }
    }

    async function checkOnlineStatus(force = false) {
        if (!ONLINE_CONFIG.enabled) return { status: "disabled" };
        if (!license || license.isDemo || license.isLegacy) return { status: "skip" };

        const now = Date.now();
        const hoursSinceLastCheck = lastOnlineCheck
            ? (now - lastOnlineCheck) / (1000 * 60 * 60)
            : Infinity;

        if (!force && hoursSinceLastCheck < ONLINE_CONFIG.checkIntervalHours) {
            return { status: "cached", hoursAgo: Math.round(hoursSinceLastCheck) };
        }

        try {
            const res = await fetch(ONLINE_CONFIG.url + "?t=" + now, {
                cache: "no-store"
            });
            if (!res.ok) throw new Error("HTTP " + res.status);

            const data = await res.json();
            const revokedList = data.revoked || [];
            const isRevoked = revokedList.includes(license.serial);

            lastOnlineCheck = now;
            localStorage.setItem(ONLINE_CONFIG.lastCheckKey, now.toString());

            if (isRevoked) {
                return { status: "revoked", message: "Licencia revocada por el proveedor." };
            }

            return { status: "ok", updated: data.updated };

        } catch (e) {
            const daysSince = lastOnlineCheck
                ? (now - lastOnlineCheck) / (1000 * 60 * 60 * 24)
                : 0;

            if (daysSince > ONLINE_CONFIG.offlineGraceDays) {
                return {
                    status: "offline_expired",
                    message: `Sin validación online hace ${Math.floor(daysSince)} días.`
                };
            }

            return { status: "offline", daysAgo: Math.floor(daysSince) };
        }
    }

    /* =========================================================
       ACTIVACIÓN
    ========================================================= */

    async function activate(code) {
        const result = await validateCode(code);
        if (!result.success) return result;

        const usedCodes = JSON.parse(localStorage.getItem(USED_CODES_KEY) || "[]");
        usedCodes.push(result.license.serial);
        localStorage.setItem(USED_CODES_KEY, JSON.stringify(usedCodes));

        license = result.license;
        save();

        if (ONLINE_CONFIG.enabled) {
            localStorage.setItem(ONLINE_CONFIG.lastCheckKey, Date.now().toString());
            lastOnlineCheck = Date.now();
        }

        return { success: true, license };
    }

    /* =========================================================
       CONSULTAS
    ========================================================= */

    function isValid() {
        if (!license || !license.expiry) return false;
        return new Date(license.expiry) > new Date();
    }

    function isDemo() {
        return license && license.isDemo === true;
    }

    function isLegacy() {
        return license && license.isLegacy === true;
    }

    function isDemoUsed() {
        return localStorage.getItem(DEMO_KEY) === "true";
    }

    function daysUntilExpiry() {
        if (!license || !license.expiry) return 0;
        const diff = new Date(license.expiry) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function getCurrentPlan() {
        if (!isValid()) return null;
        return PLAN_FEATURES[license.plan] || PLAN_FEATURES.basic;
    }

    function hasFeature(feature) {
        if (!isValid()) return false;

        if (isDemo()) {
            return PLAN_FEATURES.promax.features.includes(feature);
        }

        const plan = PLAN_FEATURES[license.plan];
        if (!plan) return false;

        if (license.features && license.features.length > 0) {
            return license.features.includes(feature);
        }

        return plan.features.includes(feature);
    }

    function getLicense() {
        return license;
    }

    /* =========================================================
       MODO DEMO
    ========================================================= */

    function activateDemo() {
        if (isDemoUsed()) {
            return {
                success: false,
                message: "Ya usaste tu prueba gratis en este dispositivo.\n\nPara continuar, activa una licencia."
            };
        }

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + DEMO_DAYS);

        license = {
            code: "DEMO-INTERNO",
            plan: "promax",
            features: PLAN_FEATURES.promax.features,
            serial: "DEMO-" + Date.now(),
            client: "Modo prueba",
            hwId: "*",
            issuedAt: new Date().toISOString(),
            expiry: expiry.toISOString(),
            maxPos: 1,
            maxUsers: 1,
            activatedAt: new Date().toISOString(),
            isDemo: true,
            isLegacy: false
        };

        save();
        localStorage.setItem(DEMO_KEY, "true");

        return { success: true, license };
    }

    /* =========================================================
       ADMIN / DEBUG
    ========================================================= */

    function clear() {
        license = null;
        save();
    }

    function exportDiagnostics() {
        return {
            hasLicense: !!license,
            license: license,
            isValid: isValid(),
            daysLeft: daysUntilExpiry(),
            demoUsed: isDemoUsed(),
            lastOnlineCheck: lastOnlineCheck
                ? new Date(lastOnlineCheck).toISOString()
                : null,
            publicKeyX: PUBLIC_KEY.x,
            publicKeyY: PUBLIC_KEY.y
        };
    }

    /* =========================================================
       INICIALIZACIÓN
    ========================================================= */

    migrateOldLicense();
    load();

    /* =========================================================
       EXPORTS
    ========================================================= */

    return {
        activate,
        activateDemo,
        clear,

        isValid,
        isDemo,
        isLegacy,
        isDemoUsed,
        daysUntilExpiry,
        getCurrentPlan,
        hasFeature,
        getLicense,

        validateCode,
        checkOnlineStatus,
        exportDiagnostics,

        PLAN_FEATURES
    };

})();