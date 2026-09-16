import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

export const metadata = {
  title: "Your Receipts — Underhyped",
  robots: "noindex",
};

export default async function ReceiptsPage() {
  const userId = await getUserId();

  if (!userId) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="eyebrow text-sm text-gray-600 mb-2">RECEIPTS</div>
        <h1 className="text-3xl font-bold mb-8">
          Proof you were <span className="text-lime-400">early</span>.
        </h1>
        <p className="text-gray-600 mb-8">
          Sign in with Google to start collecting proof of your good taste.
        </p>
        <button className="bg-lime-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-lime-500">
          Sign in with Google
        </button>
      </main>
    );
  }

  // TODO: Signed-in layout with battle count, people backed, best spot card, spot list
  // This requires getReceipts() query which is Task 9b
  // For now, show placeholder

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <div className="eyebrow text-sm text-gray-600 mb-2">🧾 RECEIPTS</div>
      <h1 className="text-3xl font-bold mb-8">YOUR EYE SO FAR</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-gray-600">battles played</div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-gray-600">people backed</div>
        </div>
      </div>

      <p className="text-center text-gray-600 py-8">
        No receipts cashed yet. Everyone you spot is still climbing.
      </p>

      <button className="w-full bg-lime-400 text-gray-900 font-semibold py-3 rounded-lg hover:bg-lime-500">
        Share your receipts
      </button>
    </main>
  );
}
