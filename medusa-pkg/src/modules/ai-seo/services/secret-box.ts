import crypto from "node:crypto"

/**
 * 密钥加密/解密。对应 Spree 的 Toonhub::SecretBox。
 * 使用后端 JWT_SECRET 派生 AES-256-GCM 密钥,格式: base64(iv):base64(tag):base64(ciphertext)
 */
export class SecretBox {
  private static key(): Buffer {
    const secret = (process.env.JWT_SECRET || process.env.COOKIE_SECRET || "toonhub-medusa-dev-secret").toString()
    return crypto.createHash("sha256").update(secret + ":toonhub-ai-seo-secret-box-v12").digest()
  }

  static encrypt(value: string | null | undefined): string | null {
    if (!value) return null
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key(), iv)
    const encrypted = Buffer.concat([cipher.update(value.toString(), "utf8"), cipher.final()])
    const tag = cipher.getAuthTag()
    return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
  }

  static decrypt(value: string | null | undefined): string | null {
    if (!value) return null
    try {
      const [ivB64, tagB64, dataB64] = value.split(":")
      if (!ivB64 || !tagB64 || !dataB64) return null
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.key(), Buffer.from(ivB64, "base64"))
      decipher.setAuthTag(Buffer.from(tagB64, "base64"))
      return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8")
    } catch {
      return null
    }
  }

  static mask(value: string | null | undefined): string {
    const raw = (value || "").toString()
    if (!raw) return ""
    if (raw.length <= 10) return "********"
    return `${raw.slice(0, 5)}...${raw.slice(-4)}`
  }
}
