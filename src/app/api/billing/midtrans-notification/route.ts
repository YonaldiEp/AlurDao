import { createHash, timingSafeEqual } from "node:crypto";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/server";

const createContext = () => ({ requestId: crypto.randomUUID(), startedAt: Date.now() });

type Notification = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
};

export async function POST(request: Request) {
  const context = createContext();
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return jsonError("BILLING_NOT_CONFIGURED", "Webhook pembayaran belum dikonfigurasi.", context, 503);
    const body = (await request.json()) as Notification;
    if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
      return jsonError("INVALID_NOTIFICATION", "Notifikasi pembayaran tidak lengkap.", context, 400);
    }

    const expected = createHash("sha512")
      .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
      .digest("hex");
    const supplied = body.signature_key.toLowerCase();
    if (expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
      return jsonError("INVALID_SIGNATURE", "Tanda tangan notifikasi tidak valid.", context, 401);
    }

    const admin = createAdminClient();
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id,user_id,amount_idr,status")
      .eq("provider_order_id", body.order_id)
      .single();
    if (paymentError || !payment) return jsonError("PAYMENT_NOT_FOUND", "Pembayaran tidak ditemukan.", context, 404);
    if (Number(body.gross_amount) !== payment.amount_idr) {
      return jsonError("AMOUNT_MISMATCH", "Nominal pembayaran tidak sesuai.", context, 400);
    }

    const paid = body.transaction_status === "settlement"
      || (body.transaction_status === "capture" && body.fraud_status === "accept");
    const status = paid ? "paid"
      : body.transaction_status === "expire" ? "expired"
      : body.transaction_status === "cancel" ? "cancelled"
      : ["deny", "failure"].includes(body.transaction_status || "") ? "failed"
      : "pending";

    const safeMetadata = { ...body };
    delete safeMetadata.signature_key;
    await admin.from("payments").update({
      status,
      provider_transaction_id: body.transaction_id || null,
      paid_at: paid ? new Date().toISOString() : null,
      metadata: safeMetadata,
    }).eq("id", payment.id);

    if (paid && payment.status !== "paid") {
      const { error } = await admin.rpc("activate_premium_subscription", {
        target_user_id: payment.user_id,
        target_payment_id: payment.id,
      });
      if (error) throw error;
    }
    return jsonSuccess({ received: true, status }, context);
  } catch (error) {
    console.error(`[billing-webhook:${context.requestId}]`, error);
    return jsonError("INTERNAL_ERROR", "Notifikasi pembayaran gagal diproses.", context, 500);
  }
}
