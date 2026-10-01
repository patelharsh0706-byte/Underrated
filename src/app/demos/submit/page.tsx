import { DemosSubmit } from "@/components/demos/demos-submit";

export const metadata = {
  title: "Submit your demo · Underhyped",
  description: "15 seconds to make us care. Upload a screen recording of your product.",
};

// Dodo's static link sends a paid maker back here with ?paid=1 → "In review".
export default async function DemosSubmitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { paid } = await searchParams;
  return <DemosSubmit paid={paid === "1"} />;
}
