"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentClient } from "@/clients/paymentClient";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Subscription = {
  id: string;
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

type SubscriptionCardProps = {
  subscription: Subscription | null;
};

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await paymentClient.checkout.$post();
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        console.error("Checkout failed");
      }
    } catch (error) {
      console.error("Error during checkout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await paymentClient["portal-session"].$post();
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        console.error("Portal session creation failed");
      }
    } catch (error) {
      console.error("Error accessing billing portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (subscription) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>現在のプラン</CardTitle>
              <CardDescription>Basic Monthly プラン</CardDescription>
            </div>
            <Badge
              variant={
                subscription.cancelAtPeriodEnd ? "destructive" : "default"
              }
            >
              {subscription.cancelAtPeriodEnd ? "キャンセル予定" : "有効"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">次回更新日</p>
            <p className="text-lg font-semibold">
              {subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    "ja-JP",
                  )
                : "未設定"}
            </p>
          </div>
          {subscription.cancelAtPeriodEnd && (
            <p className="text-sm text-red-600">
              このサブスクリプションは次回更新日にキャンセルされます
            </p>
          )}
          <Button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            サブスクリプションを管理
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Monthly プラン</CardTitle>
        <CardDescription>
          全機能をご利用いただけるサブスクリプションプラン
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">¥500</span>
            <span className="text-slate-600">/ 月</span>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            タスク進捗の自動共有
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            Slack連携
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            MCPサーバー統合
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            日次レポート生成
          </li>
        </ul>
        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          サブスクリプションを開始
        </Button>
      </CardContent>
    </Card>
  );
}
