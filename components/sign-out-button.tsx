"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button onClick={signOut} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100">
      Sign out
    </button>
  );
}
