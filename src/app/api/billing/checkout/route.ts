import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const createContext = () => ({ requestId: crypto.randomUUID(), startedAt: Date.now() });

export async function POST() {
  const context = createContext();
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonError("AUTH_REQUIRED", "Masuk untuk memilih paket Premium.", context, 401);
    }

    if (process.env.MIDTRANS_ENABLE_REAL_CHECKOUT !== "true") {
      const amount = Number(process.env.PREMIUM_PRICE_IDR || 49000);
      return jsonSuccess({
        orderId: `PLACEHOLDER-${Date.now()}`,
        checkoutUrl: null,
        amount,
        placeholder: true,
        message: "Checkout Premium masih berupa placeholder. Integrasi Midtrans akan diaktifkan setelah tahap demo.",
      }, context, 200);
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError("BILLING_NOT_CONFIGURED", "Pembayaran Sandbox belum dikonfigurasi.", context, 503);
    }

    const amount = Number(process.env.PREMIUM_PRICE_IDR || 49000);
    const admin = createAdminClient();
    const orderId = `ALURDAO-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: userData.user.id,
        provider_order_id: orderId,
        amount_idr: amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const endpoint = production
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        item_details: [{ id: "alurdao-premium-30d", price: amount, quantity: 1, name: "AlurDao Premium 30 hari" }],
        customer_details: {
          email: userData.user.email,
          first_name: userData.user.user_metadata?.display_name || userData.user.user_metadata?.full_name || "Pengguna AlurDao",
        },
      }),
    });
    const snap = (await response.json()) as { token?: string; redirect_url?: string; error_messages?: string[] };
    if (!response.ok || !snap.redirect_url) {
      await admin.from("payments").update({ status: "failed", metadata: { providerResponse: snap } }).eq("id", payment.id);
      return jsonError("PAYMENT_PROVIDER_ERROR", snap.error_messages?.[0] || "Midtrans menolak pembuatan pembayaran.", context, 502);
    }

    await admin.from("payments").update({ checkout_token: snap.token, checkout_url: snap.redirect_url }).eq("id", payment.id);
    return jsonSuccess({ orderId, checkoutUrl: snap.redirect_url, amount }, context, 201);
  } catch (error) {
    console.error(`[billing-checkout:${context.requestId}]`, error);
    return jsonError("INTERNAL_ERROR", "Pembayaran belum dapat dibuat.", context, 500);
  }
}
