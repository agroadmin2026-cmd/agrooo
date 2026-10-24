import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCloudinaryConfig,
  setCloudinaryConfig,
  buildCloudinaryUrl,
  uploadVehiclePhoto,
} from "@/lib/cloudinary";

describe("Servicio de Cloudinary y Almacenamiento CDN", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("recupera las credenciales estándar de AgroAdmin de forma predeterminada", () => {
    const config = getCloudinaryConfig();
    expect(config.cloudName).toBe("kmcpa5z4");
    expect(config.apiKey).toBe("365934627122888");
    expect(config.apiSecret).toBe("dz-8ysV-iUIiSNR4PgZTxtFfoKk");
  });

  it("permite actualizar y persistir configuración personalizada en localStorage", () => {
    setCloudinaryConfig("custom-cloud", "my-preset", "key123", "secret456");
    const config = getCloudinaryConfig();
    expect(config.cloudName).toBe("custom-cloud");
    expect(config.uploadPreset).toBe("my-preset");
    expect(config.apiKey).toBe("key123");
    expect(config.apiSecret).toBe("secret456");
  });

  it("genera URLs estándar de Cloudinary con transformaciones automáticas de optimización", () => {
    const rawUrl = "https://res.cloudinary.com/kmcpa5z4/image/upload/agroadmin_vehiculos/hilux.jpg";
    const transformed = buildCloudinaryUrl(rawUrl);
    expect(transformed).toContain("/image/upload/f_auto,q_auto,w_1200,c_limit/");
    expect(transformed).toContain("agroadmin_vehiculos/hilux.jpg");

    // Si ya tiene f_auto no lo duplica
    const alreadyTransformed = "https://res.cloudinary.com/kmcpa5z4/image/upload/f_auto,q_auto/hilux.jpg";
    expect(buildCloudinaryUrl(alreadyTransformed)).toBe(alreadyTransformed);

    // Con ID relativo
    const relativeUrl = buildCloudinaryUrl("vehiculos/foto1.png");
    expect(relativeUrl).toBe(
      "https://res.cloudinary.com/kmcpa5z4/image/upload/f_auto,q_auto,w_1200,c_limit/vehiculos/foto1.png",
    );

    // Con URL externa (Unsplash) y data: URL (WebP local)
    const externalUrl = "https://images.unsplash.com/photo-1559416523";
    expect(buildCloudinaryUrl(externalUrl)).toBe(externalUrl);

    const dataUrl = "data:image/webp;base64,UklGRm...";
    expect(buildCloudinaryUrl(dataUrl)).toBe(dataUrl);
  });

  it("sube exitosamente a Cloudinary cuando el endpoint responde con URL segura", async () => {
    const fakeFile = new File(["fake-image-bytes"], "camioneta.jpg", { type: "image/jpeg" });

    // Mock global fetch para simular respuesta exitosa de Cloudinary
    const mockSecureUrl =
      "https://res.cloudinary.com/kmcpa5z4/image/upload/v1792709437/agroadmin_vehiculos/test_car.png";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: mockSecureUrl,
        public_id: "agroadmin_vehiculos/test_car",
      }),
    } as unknown as Response);

    const result = await uploadVehiclePhoto(fakeFile);
    expect(result.provider).toBe("cloudinary");
    expect(result.url).toBe(mockSecureUrl);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.cloudinary.com/v1_1/kmcpa5z4/image/upload"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
