import { timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Uses constant-time comparison to ensure processing time doesn't leak information.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeCompare(a: string, b: string): boolean {
  // If lengths are different, still perform comparison to avoid timing leak
  // Pad the shorter string to match lengths
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  // If lengths differ, comparison will fail, but we still need constant time
  if (bufA.length !== bufB.length) {
    // Compare against a dummy buffer of the same length to maintain constant time
    const maxLength = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLength);
    const paddedB = Buffer.alloc(maxLength);

    bufA.copy(paddedA);
    bufB.copy(paddedB);

    // This will always return false, but in constant time
    timingSafeEqual(paddedA, paddedB);
    return false;
  }

  // Lengths are equal, perform constant-time comparison
  return timingSafeEqual(bufA, bufB);
}
