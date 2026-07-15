import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity, CircleAlert, Gauge, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Event = {
  request_id: string;
  endpoint: string;
  provider: string | null;
  model: string | null;
  status_code: number;
  duration_ms: number;
  input_characters: number;
  error_code: string | null;
  created_at: string;
};

export default async function MonitoringPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userData.user.id).single();
  if (profile?.plan !== "admin") redirect("/studio");

  const { data } = await supabase.from("api_usage_events").select("request_id,endpoint,provider,model,status_code,duration_ms,input_characters,error_code,created_at").order("created_at", { ascending: false }).limit(200);
  const events = (data || []) as Event[];
  const errors = events.filter((event) => event.status_code >= 400);
  const average = events.length ? Math.round(events.reduce((sum, event) => sum + event.duration_ms, 0) / events.length) : 0;
  const characters = events.reduce((sum, event) => sum + event.input_characters, 0);

  return (
    <main className="monitor-shell">
      <header className="monitor-header"><div><Link href="/studio"><ArrowLeft size={16} /> Studio</Link><span className="kicker">Admin</span><h1>Monitoring API</h1><p>Ringkasan maksimal 200 request terbaru.</p></div></header>
      <section className="monitor-stats">
        <article><Activity /><span>Total request</span><strong>{events.length}</strong></article>
        <article><CircleAlert /><span>Error</span><strong>{errors.length}</strong></article>
        <article><Timer /><span>Rata-rata durasi</span><strong>{average.toLocaleString("id-ID")} ms</strong></article>
        <article><Gauge /><span>Karakter masuk</span><strong>{characters.toLocaleString("id-ID")}</strong></article>
      </section>
      <section className="monitor-table-wrap"><table><thead><tr><th>Waktu</th><th>Endpoint</th><th>Provider</th><th>Status</th><th>Durasi</th><th>Error</th></tr></thead><tbody>{events.map((event) => <tr key={event.request_id}><td>{new Date(event.created_at).toLocaleString("id-ID")}</td><td>{event.endpoint}</td><td>{event.provider || "—"}</td><td><span className={event.status_code >= 400 ? "status-bad" : "status-good"}>{event.status_code}</span></td><td>{event.duration_ms.toLocaleString("id-ID")} ms</td><td>{event.error_code || "—"}</td></tr>)}{!events.length && <tr><td colSpan={6}>Belum ada data penggunaan API.</td></tr>}</tbody></table></section>
    </main>
  );
}
