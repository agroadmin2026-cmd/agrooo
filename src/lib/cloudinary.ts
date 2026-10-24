/**
 * Servicio de Fotos y Almacenamiento Cloudinary / Local
 * Permite capturar fotos de vehículos directamente con la cámara del celular o seleccionar archivos,
 * subirlos a Cloudinary de forma directa (con firma criptográfica SHA-1 o preset)
 * o comprimirlos en el cliente como WebP/JPEG optimizado en caso de desconexión.
 */

const CLOUDINARY_CLOUD_KEY = "agroadmin_cloudinary_cloud_name";
const CLOUDINARY_PRESET_KEY = "agroadmin_cloudinary_upload_preset";
const CLOUDINARY_API_KEY_STORAGE = "agroadmin_cloudinary_api_key";
const CLOUDINARY_API_SECRET_STORAGE = "agroadmin_cloudinary_api_secret";

// Credenciales por defecto de AgroAdmin proporcionadas por el usuario
const DEFAULT_CLOUD_NAME = "kmcpa5z4";
const DEFAULT_API_KEY = "365934627122888";
const DEFAULT_API_SECRET = "dz-8ysV-iUIiSNR4PgZTxtFfoKk";

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset?: string;
  apiKey?: string;
  apiSecret?: string;
}

/**
 * Obtiene la configuración de Cloudinary desde localStorage o variables de entorno Vite
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  if (typeof window === "undefined") {
    return {
      cloudName: DEFAULT_CLOUD_NAME,
      apiKey: DEFAULT_API_KEY,
      apiSecret: DEFAULT_API_SECRET,
      uploadPreset: "",
    };
  }

  const cloudName =
    localStorage.getItem(CLOUDINARY_CLOUD_KEY) ||
    (import.meta.env["VITE_CLOUDINARY_CLOUD_NAME"] as string | undefined) ||
    DEFAULT_CLOUD_NAME;

  const uploadPreset =
    localStorage.getItem(CLOUDINARY_PRESET_KEY) ||
    (import.meta.env["VITE_CLOUDINARY_UPLOAD_PRESET"] as string | undefined) ||
    "";

  const apiKey =
    localStorage.getItem(CLOUDINARY_API_KEY_STORAGE) ||
    (import.meta.env["VITE_CLOUDINARY_API_KEY"] as string | undefined) ||
    DEFAULT_API_KEY;

  const apiSecret =
    localStorage.getItem(CLOUDINARY_API_SECRET_STORAGE) ||
    (import.meta.env["VITE_CLOUDINARY_API_SECRET"] as string | undefined) ||
    DEFAULT_API_SECRET;

  return { cloudName, uploadPreset, apiKey, apiSecret };
}

/**
 * Guarda la configuración de Cloudinary en el almacenamiento del navegador
 */
export function setCloudinaryConfig(
  cloudName: string,
  uploadPreset?: string,
  apiKey?: string,
  apiSecret?: string,
) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CLOUDINARY_CLOUD_KEY, cloudName.trim());
    if (uploadPreset !== undefined) {
      localStorage.setItem(CLOUDINARY_PRESET_KEY, uploadPreset.trim());
    }
    if (apiKey !== undefined) {
      localStorage.setItem(CLOUDINARY_API_KEY_STORAGE, apiKey.trim());
    }
    if (apiSecret !== undefined) {
      localStorage.setItem(CLOUDINARY_API_SECRET_STORAGE, apiSecret.trim());
    }
  }
}

/**
 * Genera el digest SHA-1 en formato hexadecimal utilizando Web Crypto API nativo
 * compatible con todos los navegadores móviles y de escritorio.
 */
async function computeSha1Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const subtleCrypto =
    (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) ||
    (typeof window !== "undefined" && window.crypto?.subtle);

  if (subtleCrypto) {
    const hashBuffer = await subtleCrypto.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("Criptografía SHA-1 no disponible en este entorno");
}

/**
 * Genera una URL estándar y optimizada de Cloudinary
 * con transformaciones automáticas (formato automático WebP/AVIF y compresión inteligente)
 */
export function buildCloudinaryUrl(
  publicIdOrUrl: string,
  transformations = "f_auto,q_auto,w_1200,c_limit",
  cloudName = DEFAULT_CLOUD_NAME,
): string {
  if (!publicIdOrUrl) return "";

  // Si es un Data URL local (base64) o blob:, devolver tal cual sin alterar
  if (publicIdOrUrl.startsWith("data:") || publicIdOrUrl.startsWith("blob:")) {
    return publicIdOrUrl;
  }

  // Si es una URL completa de Cloudinary, asegurar que tenga transformaciones estándar
  if (publicIdOrUrl.includes("res.cloudinary.com")) {
    if (
      publicIdOrUrl.includes("/image/upload/") &&
      !publicIdOrUrl.includes("/image/upload/f_auto") &&
      !publicIdOrUrl.includes("/image/upload/q_auto")
    ) {
      return publicIdOrUrl.replace(
        "/image/upload/",
        `/image/upload/${transformations}/`,
      );
    }
    return publicIdOrUrl;
  }

  // Si es una URL externa (ej. Unsplash u otro servidor), devolver tal cual
  if (publicIdOrUrl.startsWith("http://") || publicIdOrUrl.startsWith("https://")) {
    return publicIdOrUrl;
  }

  // Si es un public_id relativo de Cloudinary
  const cleanId = publicIdOrUrl.replace(/^\/+/, "");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${cleanId}`;
}

/**
 * Comprime y escala una imagen en el navegador del cliente a WebP/JPEG de alta calidad
 */
export async function compressImageToDataUrl(
  file: File | Blob,
  maxWidth = 1200,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer el archivo de imagen"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Error al decodificar la imagen"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Priorizar WebP, con fallback a JPEG
        try {
          const webpData = canvas.toDataURL("image/webp", quality);
          if (webpData.startsWith("data:image/webp")) {
            resolve(webpData);
            return;
          }
        } catch {
          // Ignorar y usar JPEG
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una foto directamente a Cloudinary (mediante firma criptográfica SHA-1 o preset)
 * o genera el DataURL comprimido local si el dispositivo está sin conexión a internet.
 */
export async function uploadVehiclePhoto(
  file: File | Blob,
  folder = "agroadmin_vehiculos",
): Promise<{ url: string; provider: "cloudinary" | "local"; publicId?: string }> {
  const config = getCloudinaryConfig();

  // 1. Método A: Subida Autenticada con Firma Criptográfica SHA-1
  // No requiere crear ni configurar Upload Presets en Cloudinary. Funciona al instante.
  if (config.cloudName && config.apiKey && config.apiSecret) {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      // En Cloudinary, los parámetros se ordenan alfabéticamente antes de firmar: folder y timestamp
      const stringToSign = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
      const signature = await computeSha1Hex(stringToSign);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", config.apiKey);
      formData.append("timestamp", timestamp);
      formData.append("folder", folder);
      formData.append("signature", signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return {
            url: data.secure_url,
            provider: "cloudinary",
            publicId: data.public_id,
          };
        }
      } else {
        const errorText = await response.text();
        console.warn("Error en subida autenticada a Cloudinary:", errorText);
      }
    } catch (err) {
      console.warn("Fallo subida autenticada a Cloudinary:", err);
    }
  }

  // 2. Método B: Subida con Upload Preset (Unsigned)
  if (config.cloudName && config.uploadPreset) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("folder", folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return {
            url: data.secure_url,
            provider: "cloudinary",
            publicId: data.public_id,
          };
        }
      }
    } catch (err) {
      console.warn("Fallo subida no autenticada a Cloudinary:", err);
    }
  }

  // 3. Fallback: Compresión local en navegador (WebP/JPEG optimizado)
  const localDataUrl = await compressImageToDataUrl(file);
  return { url: localDataUrl, provider: "local" };
}

