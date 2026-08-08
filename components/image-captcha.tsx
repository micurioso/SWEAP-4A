"use client";

import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Challenge = {
  image: string;
  token: string;
};

export function ImageCaptcha() {
  const answerId = useId();
  const [refreshKey, setRefreshKey] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setChallenge(null);
    setFailed(false);

    void fetch("/api/auth/captcha", {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load security code.");
        return (await response.json()) as Challenge;
      })
      .then(nextChallenge => setChallenge(nextChallenge))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [refreshKey]);

  function refresh() {
    setAnswer("");
    setRefreshKey(value => value + 1);
  }

  return (
    <div>
      <label htmlFor={answerId} className="mb-1 block text-sm font-medium text-slate-700">
        Security code
      </label>
      <input type="hidden" name="captcha_token" value={challenge?.token ?? ""} />
      <div className="flex h-11 items-stretch gap-2">
        <div
          className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white"
          aria-live="polite"
        >
          {challenge ? (
            <Image
              src={challenge.image}
              alt="Security code. Enter the five characters shown."
              width={260}
              height={88}
              className="h-full w-full object-contain"
              draggable={false}
              unoptimized
            />
          ) : failed ? (
            <span className="px-2 text-center text-[11px] leading-tight text-red-600">
              Could not load code
            </span>
          ) : (
            <span className="text-xs text-slate-400">Loading…</span>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          aria-label="Refresh security code"
          title="Refresh security code"
        >
          <RefreshCw size={16} />
        </button>
        <input
          id={answerId}
          name="captcha_answer"
          value={answer}
          onChange={event => setAnswer(event.target.value.toUpperCase())}
          type="text"
          required
          minLength={5}
          maxLength={5}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="w-24 shrink-0 rounded-md border border-slate-300 px-2 text-center font-mono text-sm font-semibold uppercase tracking-[0.16em] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-28"
          placeholder="CODE"
          disabled={!challenge}
        />
      </div>
    </div>
  );
}
