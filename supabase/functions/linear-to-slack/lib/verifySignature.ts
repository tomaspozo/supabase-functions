export async function verifySignature(
    secret: string,
    rawBody: string,
    signatureHeader: string | null,
): Promise<boolean> {
    if (!signatureHeader) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const signature = Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return signature === signatureHeader;
}
