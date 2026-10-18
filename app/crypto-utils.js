/* =========================================================
   J2 · Motor criptográfico
   ECDSA P-256 + HMAC-SHA256 + AES-GCM usando Web Crypto API
   (Reemplaza Ed25519 porque Electron no lo soporta nativamente)
   by Sakura · Solución IT SAS
========================================================= */

const CryptoUtils = (() => {

    /* =========================================================
       CODIFICACIÓN
    ========================================================= */

    function bytesToBase64(bytes) {
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function strToBytes(str) {
        return new TextEncoder().encode(str);
    }

    function bytesToStr(bytes) {
        return new TextDecoder().decode(bytes);
    }

    function bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    }

    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    function bytesToBase64Url(bytes) {
        return bytesToBase64(bytes)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    function base64UrlToBytes(b64url) {
        let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        return base64ToBytes(b64);
    }

    /* =========================================================
       ECDSA P-256
    ========================================================= */

    async function generateKeyPair() {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,
            ["sign", "verify"]
        );
        const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
        return { publicKey: publicKeyJwk, privateKey: privateKeyJwk };
    }

    async function importPublicKey(jwk) {
        return await crypto.subtle.importKey(
            "jwk", jwk,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"]
        );
    }

    async function importPrivateKey(jwk) {
        return await crypto.subtle.importKey(
            "jwk", jwk,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign"]
        );
    }

    async function sign(message, privateKeyJwk) {
        const privateKey = await importPrivateKey(privateKeyJwk);
        const data = strToBytes(message);
        const signature = await crypto.subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            privateKey,
            data
        );
        return bytesToBase64Url(new Uint8Array(signature));
    }

    async function verify(message, signatureB64Url, publicKeyJwk) {
        try {
            const publicKey = await importPublicKey(publicKeyJwk);
            const data = strToBytes(message);
            const signature = base64UrlToBytes(signatureB64Url);
            return await crypto.subtle.verify(
                { name: "ECDSA", hash: "SHA-256" },
                publicKey,
                signature,
                data
            );
        } catch (e) {
            console.error("verify error:", e);
            return false;
        }
    }

    /* =========================================================
       HMAC-SHA256
    ========================================================= */

    async function hmac(message, secret) {
        const key = await crypto.subtle.importKey(
            "raw",
            strToBytes(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            strToBytes(message)
        );
        return bytesToHex(new Uint8Array(signature));
    }

    async function hmacVerify(message, expectedHex, secret) {
        const actualHex = await hmac(message, secret);
        if (actualHex.length !== expectedHex.length) return false;
        let result = 0;
        for (let i = 0; i < actualHex.length; i++) {
            result |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
        }
        return result === 0;
    }

    /* =========================================================
       AES-GCM (para cifrar la llave privada)
    ========================================================= */

    async function deriveKeyFromPassword(password, saltB64) {
        const salt = base64UrlToBytes(saltB64);
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            strToBytes(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encryptWithPassword(obj, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKeyFromPassword(password, bytesToBase64Url(salt));
        const plaintext = strToBytes(JSON.stringify(obj));
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            plaintext
        );
        return {
            salt: bytesToBase64Url(salt),
            iv: bytesToBase64Url(iv),
            ciphertext: bytesToBase64Url(new Uint8Array(ciphertext))
        };
    }

    async function decryptWithPassword(encrypted, password) {
        try {
            const salt = base64UrlToBytes(encrypted.salt);
            const iv = base64UrlToBytes(encrypted.iv);
            const ciphertext = base64UrlToBytes(encrypted.ciphertext);
            const key = await deriveKeyFromPassword(password, encrypted.salt);
            const plaintext = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                ciphertext
            );
            return JSON.parse(bytesToStr(new Uint8Array(plaintext)));
        } catch (e) {
            return null;
        }
    }

    /* =========================================================
       SHA-256
    ========================================================= */

    async function sha256Hex(text) {
        const data = strToBytes(text);
        const hash = await crypto.subtle.digest("SHA-256", data);
        return bytesToHex(new Uint8Array(hash));
    }

    /* =========================================================
       HW_ID — Identificador estable de dispositivo
    ========================================================= */

    async function generateHwId() {
        const parts = [
            navigator.userAgent || "",
            navigator.language || "",
            navigator.platform || "",
            screen.colorDepth || "",
            screen.width || "",
            screen.height || "",
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 0,
            navigator.deviceMemory || 0,
            (window.process && window.process.platform) || "",
            (window.process && window.process.arch) || ""
        ];
        const raw = parts.join("|");
        const hash = await sha256Hex(raw);
        return hash.substring(0, 16);
    }

    /* =========================================================
       EXPORTS
    ========================================================= */

    return {
        bytesToBase64,
        base64ToBytes,
        bytesToBase64Url,
        base64UrlToBytes,
        bytesToHex,
        hexToBytes,

        generateKeyPair,
        importPublicKey,
        importPrivateKey,
        sign,
        verify,

        hmac,
        hmacVerify,

        deriveKeyFromPassword,
        encryptWithPassword,
        decryptWithPassword,

        sha256Hex,
        generateHwId
    };

})();