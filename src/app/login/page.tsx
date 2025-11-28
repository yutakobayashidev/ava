import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export default async function Page() {
  const { user } = await getCurrentSession();
  if (user !== null) {
    return redirect("/onboarding");
  }

  return (
    <>
      <h1>Sign in</h1>
      <a href="/login/slack">Sign in with Slack</a>
    </>
  );
}
