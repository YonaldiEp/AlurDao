"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Clock3, CreditCard, LoaderCircle } from "lucide-react";
import type { ApiResponse } from "@/lib/api/response";

type CheckoutData = { checkoutUrl: string | null; amount: number; orderId: string; placeholder?: boolean; message?: string };

export function BillingPanel({ plan, periodEnd, price }: { plan: string; periodEnd?: string | null; price: number }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function checkout() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const payload = (await response.json()) as ApiResponse<CheckoutData>;
      if (!payload.success) throw new Error(payload.error.message);
      if (payload.data.placeholder || !payload.data.checkoutUrl) {
        setMessage(payload.data.message || "Checkout Premium masih placeholder untuk demo.");
        setLoading(false);
        return;
      }
      window.location.assign(payload.data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pembayaran belum dapat dimulai.");
      setLoading(false);
    }
  }

  const premium = plan === "premium" || plan === "admin";
  return (
    <main className="billing-shell">
      <div className="billing-card">
        <Link href="/studio" className="auth-back"><ArrowLeft size={16} /> Kembali ke Studio</Link>
        <span className="kicker">Paket AlurDao</span>
        <h1>{premium ? "Premium aktif" : "Preview paket Premium."}</h1>
        <p className="billing-lead">Halaman ini masih placeholder untuk demo. Integrasi pembayaran Midtrans belum diaktifkan, jadi tidak ada transaksi nyata yang dibuat.</p>
        <div className="billing-placeholder-badge"><Clock3 size={15} /> Placeholder pembayaran</div>
        <div className="billing-price"><strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price)}</strong><span>/ 30 hari</span></div>
        <ul>
          <li><Check size={16} /> 100.000 karakter per bulan</li>
          <li><Check size={16} /> 10 project dan 100 bab per project</li>
          <li><Check size={16} /> Maksimal 10.000 karakter sekali terjemah</li>
          <li><Check size={16} /> Prioritas untuk workflow terjemahan panjang</li>
        </ul>
        {periodEnd && <p className="billing-period">Aktif sampai {new Date(periodEnd).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>}
        {!premium && <button className="button button-primary billing-button" onClick={() => void checkout()} disabled={loading}>{loading ? <LoaderCircle className="spinner" size={18} /> : <CreditCard size={18} />}{loading ? "Memeriksa placeholder..." : "Simulasikan checkout Premium"}</button>}
        {message && <div className="auth-message" role="status">{message}</div>}
        <small className="billing-note">Midtrans disiapkan untuk tahap berikutnya. Saat ini tombol hanya menampilkan placeholder dan tidak membuka halaman pembayaran.</small>
      </div>
    </main>
  );
}
