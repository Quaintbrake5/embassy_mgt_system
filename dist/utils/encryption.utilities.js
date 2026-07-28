"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
let cachedKey = null;
function getEncryptionKey() {
    if (cachedKey) {
        return cachedKey;
    }
    const key = process.env['ENCRYPTION_KEY'];
    if (key) {
        cachedKey = (0, crypto_1.scryptSync)(key, 'ems-salt', KEY_LENGTH);
        return cachedKey;
    }
    throw new Error('ENCRYPTION_KEY environment variable is required');
}
function encrypt(text) {
    const key = getEncryptionKey();
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
}
function decrypt(encryptedText) {
    const key = getEncryptionKey();
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        throw new Error('Decryption failed: invalid or tampered ciphertext');
    }
}
