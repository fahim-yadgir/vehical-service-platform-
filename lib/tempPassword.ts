// No 0/O, 1/l/I, so the password is easy to read out or type from a WhatsApp message.
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

const pick = (chars: string) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return chars[buf[0] % chars.length];
};

/** 8 characters, always with letters and at least two digits. Show it once, never store it in plain text. */
export function generateTempPassword(length = 8) {
  const chars = [pick(DIGITS), pick(DIGITS), pick(LETTERS)];
  while (chars.length < length) chars.push(pick(LETTERS + DIGITS));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Number(pick("0123456789")) % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}