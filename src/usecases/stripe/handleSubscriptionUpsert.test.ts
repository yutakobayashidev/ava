import { describe, expect, beforeEach, it } from "vitest";
import { setup } from "../../../tests/vitest.helper";
import { handleSubscriptionUpsert } from "./handleSubscriptionUpsert";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const { db, createTestUserAndWorkspace } = await setup();

describe("handleSubscriptionUpsert", () => {
  let stripeId: string;
  let userId: string;

  beforeEach(async () => {
    const { user } = await createTestUserAndWorkspace();
    userId = user.id;
    stripeId = "cus_test_12345";

    // Update user with stripeId
    await db.update(users).set({ stripeId }).where(eq(users.id, userId));
  });

  it("should return undefined when user not found", async () => {
    const subscription = {
      id: "sub_123",
      customer: "cus_12345",
      items: {
        data: [
          {
            current_period_end: 0,
          },
        ],
      },
      status: "active",
      cancel_at_period_end: false,
    };

    // @ts-expect-error don't need to pass all the properties
    const result = await handleSubscriptionUpsert(db, subscription);

    expect(result).toBe(undefined);
  });

  it("should create a subscription", async () => {
    const subscription = {
      id: "sub_123",
      customer: stripeId,
      items: {
        data: [
          {
            current_period_end: 0,
          },
        ],
      },
      status: "active",
      cancel_at_period_end: false,
    };

    const existingCount = await db.query.subscriptions.findMany();
    expect(existingCount.length).toBe(0);

    // @ts-expect-error don't need to pass all the properties
    const res = await handleSubscriptionUpsert(db, subscription);

    if (!res) {
      throw new Error("Subscription not created");
    }

    const afterCount = await db.query.subscriptions.findMany();
    expect(afterCount.length).toBe(1);

    const { id: _, createdAt: __, updatedAt: ___, userId: ____, ...rest } = res;

    expect(rest).toMatchInlineSnapshot(`
      {
        "cancelAtPeriodEnd": false,
        "currentPeriodEnd": 1970-01-01T00:00:00.000Z,
        "status": "active",
        "subscriptionId": "sub_123",
      }
    `);
    expect(res.userId).toBe(userId);

    {
      const dbRes = await db.query.subscriptions.findFirst();

      if (!dbRes) {
        throw new Error("Subscription not found");
      }

      const {
        id: _,
        createdAt: __,
        updatedAt: ___,
        userId: ____,
        ...rest
      } = dbRes;

      expect(rest).toMatchInlineSnapshot(`
        {
          "cancelAtPeriodEnd": false,
          "currentPeriodEnd": 1970-01-01T00:00:00.000Z,
          "status": "active",
          "subscriptionId": "sub_123",
        }
      `);
      expect(dbRes.userId).toBe(userId);
    }
  });

  it("should update a subscription", async () => {
    const subscription = {
      id: "sub_123",
      customer: stripeId,
      items: {
        data: [
          {
            current_period_end: 0,
          },
        ],
      },
      status: "active",
      cancel_at_period_end: false,
    };

    const existingCount = await db.query.subscriptions.findMany();
    expect(existingCount.length).toBe(0);

    // @ts-expect-error don't need to pass all the properties
    await handleSubscriptionUpsert(db, subscription);

    const afterCreate = await db.query.subscriptions.findMany();
    expect(afterCreate.length).toBe(1);

    {
      const updatedSubscription = {
        ...subscription,
        status: "canceled",
        items: {
          data: [
            {
              current_period_end: 123456789,
            },
          ],
        },
        cancel_at_period_end: true,
      };

      // @ts-expect-error don't need to pass all the properties
      const res = await handleSubscriptionUpsert(db, updatedSubscription);

      if (!res) {
        throw new Error("Subscription not updated");
      }

      const {
        id: _,
        createdAt: __,
        updatedAt: ___,
        userId: ____,
        ...rest
      } = res;

      expect(rest).toMatchInlineSnapshot(`
        {
          "cancelAtPeriodEnd": true,
          "currentPeriodEnd": 1973-11-29T21:33:09.000Z,
          "status": "canceled",
          "subscriptionId": "sub_123",
        }
      `);
      expect(res.userId).toBe(userId);
    }
  });
});
