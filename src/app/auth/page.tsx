import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Masuk atau Daftar",
  description: "Masuk ke AlurDao untuk mengelola project terjemahan novelmu.",
};

export default function AuthPage() {
  return <AuthForm />;
}
