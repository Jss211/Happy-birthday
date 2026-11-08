

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ruta por defecto de la foto subida
const DEFAULT_IMAGE_PATH = 'C:/Users/JORDAN/.gemini/antigravity/brain/1bbc8176-db8f-4980-b257-e5b8d3eaf42d/.user_uploaded/media_1794158473720_6186d0c5.jpg';
const OUTPUT_JS_PATH = path.join(__dirname, '..', 'js', 'encrypted-payload.js');

// Normalizador de fechas a formato YYYY-MM-DD
function normalizeDate(input) {
  if (!input) return '2023-09-15'; // Fecha de ejemplo si no se especifica
  const clean = input.trim();
  // Si viene en formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Si viene en formato YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return clean;
}

function encryptImage(imagePath, secretDate) {
  const normalized = normalizeDate(secretDate);
  console.log(`[Encriptador] Procesando imagen: ${imagePath}`);
  console.log(`[Encriptador] Clave derivada de la fecha normalizada: "${normalized}"`);

  if (!fs.existsSync(imagePath)) {
    console.error(`Error: No se encontró la imagen en ${imagePath}`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`[Encriptador] Tamaño original de la imagen: ${imageBuffer.length} bytes`);

  // Generar sal (16 bytes) e IV (12 bytes para AES-GCM)
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // Derivar clave de 256 bits mediante PBKDF2
  const key = crypto.pbkdf2Sync(normalized, salt, 100000, 32, 'sha256');

  // Encriptar con AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(imageBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // En Web Crypto API, el tag de autenticación (16 bytes) va al final del ciphertext
  const combinedData = Buffer.concat([encrypted, authTag]);

  const payload = {
    generatedAt: new Date().toISOString(),
    format: 'image/jpeg',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: combinedData.toString('base64')
  };

  // Crear contenido del archivo JS
  const jsContent = `/**
 * ARCHIVO DE FOTO ENCRIPTADA (AES-256-GCM)
 * Este archivo NO contiene una imagen en formato plano.
 * La imagen está encriptada criptográficamente y solo el navegador de tu amiga
 * con la fecha correcta puede descifrarla en memoria.
 * NINGÚN visitante de GitHub puede ver la foto sin conocer la fecha exacta.
 */
window.ENCRYPTED_PHOTO_PAYLOAD = ${JSON.stringify(payload, null, 2)};
`;

  fs.writeFileSync(OUTPUT_JS_PATH, jsContent, 'utf-8');
  console.log(`[Encriptador] ¡Éxito! Archivo generado en: ${OUTPUT_JS_PATH}`);

  // Test de verificación inmediata de desencriptado
  try {
    const testKey = crypto.pbkdf2Sync(normalized, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', testKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (decrypted.length === imageBuffer.length) {
      console.log(`[Encriptador] Verificación automática: ¡Descifrado exitoso! (${decrypted.length} bytes verificados)`);
    }
  } catch (err) {
    console.error(`[Encriptador] Error en test de verificación:`, err);
  }
}

// Parámetros de línea de comandos: node scripts/encrypt-tool.js [FECHA] [RUTA_FOTO]
const argDate = process.argv[2] || '2023-09-15';
const argPath = process.argv[3] || DEFAULT_IMAGE_PATH;

encryptImage(argPath, argDate);
