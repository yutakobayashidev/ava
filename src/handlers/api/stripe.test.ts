import { describe, it, expect, beforeEach, vi } from "vitest";
import { setup } from "../../../tests/vitest.helper";
import app from "@/handlers/api/stripe";
import {
  generateSessionToken,
  createSession,
} from "@/usecases/auth/loginWithSlack";

const { createCustomer, createCheckoutSession } = vi.hoisted(() => ({
  createCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

const { db, createTestUserAndWorkspace } = await setup();

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      customers = {
        create: createCustomer,
      };
      checkout = {
        sessions: {
          create: createCheckoutSession,
        },
      };
    },
  };
});

describe("api/stripe", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("POST /checkout", () => {
    it("should throw an error if there is no session token", async () => {
      const res = await app.request("/checkout", {
        method: "POST",
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });

    it("should throw an error if the user is not found", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      // Update user to have no email
      await db
        .update((await import("@/db/schema")).users)
        .set({ email: null })
        .where(
          (await import("drizzle-orm")).eq(
            (await import("@/db/schema")).users.id,
            user.id,
          ),
        );

      const res = await app.request("/checkout", {
        method: "POST",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "user not found",
        }
      `);
    });

    it("should throw an error if there is no checkout session", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      createCustomer.mockResolvedValueOnce({
        id: "cus_test123",
      });

      createCheckoutSession.mockResolvedValueOnce({});

      const res = await app.request("/checkout", {
        method: "POST",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(res.status).toBe(500);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "checkoutSession url not found",
        }
      `);
    });

    it("should redirect to the checkout session url", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      createCustomer.mockResolvedValueOnce({
        id: "cus_test123",
      });

      createCheckoutSession.mockResolvedValueOnce({
        url: "https://checkout.stripe.com/test",
      });

      // Verify user before checkout
      const userBefore = await db.query.users.findFirst({
        where: (t, { eq }) => eq(t.id, user.id),
      });
      expect(userBefore?.stripeId).toBeNull();

      const res = await app.request("/checkout", {
        method: "POST",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(createCheckoutSession.mock.calls).toMatchInlineSnapshot(`
        [
          [
            {
              "automatic_tax": {
                "enabled": true,
              },
              "cancel_url": "https://localhost:3000/billing",
              "currency": "jpy",
              "customer": "cus_test123",
              "customer_update": {
                "shipping": "auto",
              },
              "line_items": [
                {
                  "price": "price_xxx",
                  "quantity": 1,
                },
              ],
              "mode": "subscription",
              "shipping_address_collection": {
                "allowed_countries": [
                  "JP",
                ],
              },
              "success_url": "https://localhost:3000/billing/success",
            },
          ],
        ]
      `);

      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe(
        "https://checkout.stripe.com/test",
      );

      // Verify stripeId was updated
      const userAfter = await db.query.users.findFirst({
        where: (t, { eq }) => eq(t.id, user.id),
      });
      expect(userAfter?.stripeId).toBe("cus_test123");
    });
  });

  describe("POST /webhook", () => {
    it("should return 501 not implemented", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
      });

      expect(res.status).toBe(501);
      expect(await res.json()).toMatchObject({
        message: "Not implemented",
      });
    });
  });

  describe("POST /portal-session", () => {
    it("should return 501 not implemented", async () => {
      const res = await app.request("/portal-session", {
        method: "POST",
      });

      expect(res.status).toBe(501);
      expect(await res.json()).toMatchObject({
        message: "Not implemented",
      });
    });
  });

  describe("GET /subscription", () => {
    it("should return 501 not implemented", async () => {
      const res = await app.request("/subscription", {
        method: "GET",
      });

      expect(res.status).toBe(501);
      expect(await res.json()).toMatchObject({
        message: "Not implemented",
      });
    });
  });
});
