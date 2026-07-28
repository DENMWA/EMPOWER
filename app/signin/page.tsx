import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
import { Card, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In to EmpowerNotes",
  description: "Sign in to EmpowerNotes with email, phone code, and authenticator 2FA.",
  alternates: {
    canonical: "/signin"
  }
};

export default function SignInPage() {
  return (
    <>
      <PageHeader
        eyebrow="Secure sign in"
        title="Sign in to your EmpowerNotes workspace"
        description="Workers and administrators use their assigned email address. EmpowerNotes opens the right workspace tools for their role."
      />
      <Section>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Card className="flex min-h-[150px] flex-col border-slate-200">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-sky-50 text-sky-800">
              <UserRound size={19} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-semibold text-ink">Team member sign in</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Open assigned clients, notes, incidents, documents, and shifts.</p>
            <a href="#secure-sign-in" className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-teal-700">
              Enter sign-in details <ArrowRight size={15} aria-hidden="true" />
            </a>
          </Card>
          <Link
            href="/signin?next=%2Fadmin"
            className="group flex min-h-[150px] flex-col rounded-lg border border-teal-200 bg-teal-50/50 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-teal-800 shadow-sm">
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-semibold text-ink">Administrator sign in</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Continue directly to team, clients, reports, rostering, billing, and settings.</p>
            <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-teal-800">
              Continue as administrator <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
        <div id="secure-sign-in" className="scroll-mt-36">
        <SupabaseSecurityPanel redirectAfterSignIn />
        </div>
      </Section>
    </>
  );
}
