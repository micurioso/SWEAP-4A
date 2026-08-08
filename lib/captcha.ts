import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 5;
const TOKEN_TTL_MS = 5 * 60 * 1000;

// Font-free vector glyphs keep the CAPTCHA portable across local and
// serverless environments while avoiding ambiguous characters such as 0/O.
const GLYPHS: Record<string, string> = {
  "2": "M3 8 Q13 -1 24 6 Q30 14 20 21 L4 38 L28 38",
  "3": "M4 5 Q15 0 24 6 Q28 14 17 19 Q29 21 26 32 Q23 43 4 36",
  "4": "M23 41 L23 3 L3 28 L29 28",
  "5": "M27 4 L7 4 L4 20 Q15 16 23 21 Q31 28 24 36 Q14 44 3 35",
  "6": "M25 5 Q11 0 5 17 Q0 32 10 39 Q22 45 27 33 Q30 22 20 18 Q11 15 5 23",
  "7": "M3 5 L28 5 L11 41",
  "8": "M15 2 Q27 2 26 12 Q25 19 15 20 Q3 19 4 11 Q5 2 15 2 M15 20 Q29 21 27 33 Q25 43 14 42 Q2 41 3 31 Q4 21 15 20",
  "9": "M25 22 Q18 28 9 23 Q0 18 5 8 Q10 -1 21 4 Q31 10 26 27 Q23 39 8 41",
  A: "M2 41 L14 3 Q16 0 18 4 L29 41 M7 27 L24 27",
  B: "M5 3 L5 40 M5 4 Q25 0 26 11 Q27 20 6 21 M6 21 Q29 20 27 32 Q26 42 5 39",
  C: "M27 8 Q22 1 14 3 Q3 6 3 22 Q3 38 15 40 Q23 42 28 34",
  D: "M5 3 L5 40 M5 3 Q27 2 28 21 Q29 40 5 40",
  E: "M28 4 L5 4 L5 39 L28 39 M5 21 L24 21",
  F: "M28 4 L5 4 L5 41 M5 21 L24 21",
  G: "M27 8 Q22 1 14 3 Q3 6 3 22 Q3 38 15 40 Q24 41 28 34 L28 24 L18 24",
  H: "M4 3 L4 41 M28 3 L28 41 M4 22 L28 22",
  J: "M8 4 L28 4 M22 4 L22 31 Q21 42 11 40 Q4 39 3 32",
  K: "M5 3 L5 41 M28 3 L6 24 M14 17 L29 41",
  L: "M5 3 L5 40 L28 40",
  M: "M3 41 L5 4 L16 23 L27 4 L29 41",
  N: "M4 41 L4 4 L28 40 L28 3",
  P: "M5 41 L5 4 Q27 0 28 13 Q29 25 5 23",
  Q: "M16 2 Q29 3 29 22 Q28 41 15 41 Q2 40 3 21 Q3 2 16 2 M19 31 L30 43",
  R: "M5 41 L5 4 Q27 0 28 13 Q29 24 5 23 M16 23 L30 41",
  S: "M28 7 Q21 0 11 3 Q1 7 5 17 Q8 22 18 23 Q29 25 27 34 Q25 43 13 41 Q5 40 2 34",
  T: "M2 4 L30 4 M16 4 L16 41",
  U: "M4 3 L4 29 Q4 41 16 41 Q28 41 28 29 L28 3",
  V: "M3 3 L15 40 Q16 43 18 39 L30 3",
  W: "M2 3 L7 40 L16 24 L24 40 L30 3",
  X: "M3 3 L29 41 M29 3 L3 41",
  Y: "M3 3 L16 22 L29 3 M16 22 L16 41",
  Z: "M3 4 L29 4 L3 40 L29 40"
};

type CaptchaPayload = {
  answer: string;
  expiresAt: number;
};

function secretKey() {
  const secret = process.env.CAPTCHA_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("CAPTCHA_SECRET is not configured.");
  return createHash("sha256").update(secret).digest();
}

function randomCode() {
  return Array.from(
    { length: CODE_LENGTH },
    () => ALPHABET[randomInt(0, ALPHABET.length)]
  ).join("");
}

function encodePayload(payload: CaptchaPayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

function decodePayload(token: string): CaptchaPayload | null {
  try {
    const [version, ivValue, tagValue, encryptedValue] = token.split(".");
    if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) return null;

    const decipher = createDecipheriv(
      "aes-256-gcm",
      secretKey(),
      Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
    return JSON.parse(decrypted) as CaptchaPayload;
  } catch {
    return null;
  }
}

function captchaSvg(answer: string) {
  const letters = answer
    .split("")
    .map((character, index) => {
      const path = GLYPHS[character];
      const x = 27 + index * 43 + randomInt(-2, 3);
      const y = 21 + randomInt(-3, 4);
      const rotation = randomInt(-12, 13);
      const skew = randomInt(-8, 9);
      return `<path d="${path}" transform="translate(${x} ${y}) rotate(${rotation} 15 21) skewX(${skew})"/>`;
    })
    .join("");

  const lines = Array.from({ length: 3 }, () => {
    const y1 = randomInt(20, 72);
    const y2 = randomInt(20, 72);
    const bend = randomInt(25, 70);
    return `<path d="M 18 ${y1} Q 130 ${bend} 242 ${y2}"/>`;
  }).join("");

  const dots = Array.from({ length: 14 }, () =>
    `<circle cx="${randomInt(15, 246)}" cy="${randomInt(12, 76)}" r="${randomInt(1, 3)}"/>`
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="88" viewBox="0 0 260 88" role="img" aria-label="Security code">
    <rect width="260" height="88" rx="8" fill="#ffffff"/>
    <g fill="none" stroke="#9aa9e8" stroke-width="1.5" stroke-linecap="round" opacity="0.6">${lines}</g>
    <g fill="#b8c3ef" opacity="0.65">${dots}</g>
    <g fill="none" stroke="#0000CD" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">${letters}</g>
  </svg>`;
}

export async function createCaptchaChallenge() {
  const answer = randomCode();
  const image = Buffer.from(captchaSvg(answer), "utf8").toString("base64");
  return {
    image: `data:image/svg+xml;base64,${image}`,
    token: encodePayload({ answer, expiresAt: Date.now() + TOKEN_TTL_MS })
  };
}

export function verifyCaptcha(
  token: string | null | undefined,
  submittedAnswer: string | null | undefined
) {
  if (!token || !submittedAnswer) return false;
  const payload = decodePayload(token);
  if (!payload || payload.expiresAt < Date.now()) return false;

  const expected = Buffer.from(payload.answer);
  const received = Buffer.from(submittedAnswer.trim().toUpperCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}
