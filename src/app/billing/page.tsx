import { redirect } from "next/navigation";
import { BillingPanel } from "@/components/billing-panel";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth");
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userData.user.id).single(),
    supabase.from("subscriptions").select("current_period_end,status").eq("user_id", userData.user.id).maybeSingle(),
  ]);
  const price = Number(process.env.PREMIUM_PRICE_IDR || 49000);
  return <BillingPanel plan={profile?.plan || "free"} periodEnd={subscription?.status === "active" ? subscription.current_period_end : null} price={price} />;
}
