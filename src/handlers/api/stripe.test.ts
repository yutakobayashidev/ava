import { describe, it, expect, beforeEach, vi } from "vitest";
import { setup } from "../../../tests/vitest.helper";
import app from "@/handlers/api/stripe";
import {
  generateSessionToken,
  createSession,
} from "@/usecases/auth/loginWithSlack";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

const { createCustomer, createCheckoutSession, createPortalSession } =
  vi.hoisted(() => ({
    createCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
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
      billingPortal = {
        sessions: {
          create: createPortalSession,
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
      await db.update(users).set({ email: null }).where(eq(users.id, user.id));

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
    it("should return 400 if stripe-signature header is missing", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("");
    });

    it("should return 400 if signature verification fails", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "invalid_signature",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Webhook signature verification failed");
    });
  });

  describe("POST /portal-session", () => {
    it("should throw an error if there is no session token", async () => {
      const res = await app.request("/portal-session", {
        method: "POST",
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });

    it("should throw an error if the user has no stripeId", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request("/portal-session", {
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

    it("should redirect to the billing portal", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      // Update user to have stripeId
      await db
        .update(users)
        .set({ stripeId: "cus_test123" })
        .where(eq(users.id, user.id));

      createPortalSession.mockResolvedValueOnce({
        url: "https://billing.stripe.com/session/test_123",
      });

      const res = await app.request("/portal-session", {
        method: "POST",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(createPortalSession.mock.calls).toMatchInlineSnapshot(`
        [
          [
            {
              "customer": "cus_test123",
              "return_url": "https://localhost:3000/billing",
            },
          ],
        ]
      `);

      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toMatchInlineSnapshot(
        `"https://billing.stripe.com/session/test_123"`,
      );
    });
  });

  describe("GET /subscription", () => {
    it("should throw an error if there is no session token", async () => {
      const res = await app.request("/subscription", {
        method: "GET",
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "error": "Unauthorized",
        }
      `);
    });

    it("should return null if the subscription is not found", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      const res = await app.request("/subscription", {
        method: "GET",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "data": null,
          "message": "subscription not found",
          "success": true,
        }
      `);
    });

    it("should return the subscription status", async () => {
      const { user } = await createTestUserAndWorkspace();
      const sessionToken = generateSessionToken();
      await createSession(db, sessionToken, user.id);

      // Create subscriptions with different statuses
      await db.insert(subscriptions).values([
        {
          id: "sub_expired",
          userId: user.id,
          cancelAtPeriodEnd: false,
          subscriptionId: "sub_1",
          status: "expired",
        },
        {
          id: "sub_active",
          userId: user.id,
          cancelAtPeriodEnd: false,
          subscriptionId: "sub_2",
          status: "active",
        },
        {
          id: "sub_complete",
          userId: user.id,
          cancelAtPeriodEnd: true,
          subscriptionId: "sub_3",
          status: "complete",
        },
      ]);

      // Should return active subscription first
      const res1 = await app.request("/subscription", {
        method: "GET",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(res1.status).toBe(200);
      expect(await res1.json()).toMatchInlineSnapshot(`
        {
          "data": {
            "cancelAtPeriodEnd": false,
            "currentPeriodEnd": null,
            "subscriptionId": "sub_2",
          },
          "success": true,
        }
      `);

      // Delete active subscription
      await db.delete(subscriptions).where(eq(subscriptions.id, "sub_active"));

      // Should return complete subscription now
      const res2 = await app.request("/subscription", {
        method: "GET",
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      expect(res2.status).toBe(200);
      expect(await res2.json()).toMatchInlineSnapshot(`
        {
          "data": {
            "cancelAtPeriodEnd": true,
            "currentPeriodEnd": null,
            "subscriptionId": "sub_3",
          },
          "success": true,
        }
      `);
    });
  });
});
