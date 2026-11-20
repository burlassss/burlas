import { requireUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { estadoKyc } from "@/lib/kyc";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bem-vindo — vamos conhecer-te" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const kyc = await estadoKyc(user.id);
  return (
    <div className="mx-auto w-full max-w-xl px-1 pt-2 sm:pt-6">
      <OnboardingWizard nome={user.nome.split(" ")[0]} kycInicial={kyc} />
    </div>
  );
}
