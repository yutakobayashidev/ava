import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getCurrentSession } from "@/lib/session";
import { ArrowRight, Slack } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: { callbackUrl?: string };
};

export default async function Page({ searchParams }: LoginPageProps) {
  const { user } = await getCurrentSession();
  if (user !== null) {
    return redirect("/onboarding");
  }

  const loginHref = searchParams?.callbackUrl
    ? `/api/auth/slack?callbackUrl=${encodeURIComponent(searchParams.callbackUrl)}`
    : "/api/auth/slack";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {siteConfig.name}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">
            Slackで認証してダッシュボードへ。
          </p>
        </div>

        <Button asChild size="lg" className="h-11 w-full">
          <Link
            href={loginHref}
            className="flex items-center justify-center gap-2"
          >
            <Slack className="h-4 w-4" />
            Slackでログイン
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
