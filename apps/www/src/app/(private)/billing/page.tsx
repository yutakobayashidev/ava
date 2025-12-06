import { db } from "@/clients/drizzle";
import { requireWorkspace } from "@/lib/auth";
import { Header } from "@/components/header";
import { SubscriptionCard } from "./SubscriptionCard";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function BillingPage() {
  const { user } = await requireWorkspace(db);

  const userWithStripe = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: {
      subscriptions: true,
    },
  });

  const activeSubscription = userWithStripe?.subscriptions.find(
    (sub) => sub.status === "active" || sub.status === "complete",
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} className="bg-slate-50" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">請求管理</h1>
          <p className="text-slate-600">
            サブスクリプションプランの管理と請求情報の確認ができます
          </p>
        </div>

        <SubscriptionCard subscription={activeSubscription ?? null} />
      </div>
    </div>
  );
}
