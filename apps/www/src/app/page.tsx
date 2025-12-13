import { Header } from "@/components/header";
import {
  HeroSection,
  VisionSection,
  SlackDemoSection,
  FeaturesSection,
  DashboardSection,
  PrivacySection,
  SetupSection,
  CtaSection,
  Footer,
} from "@/components/landing";
import { getCurrentSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { user } = await getCurrentSession();

  // オンボーディング完了済みのユーザーはダッシュボードへ
  if (user?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} />
      <HeroSection />
      <VisionSection />
      <SlackDemoSection />
      <FeaturesSection />
      <DashboardSection />
      <PrivacySection />
      <SetupSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
