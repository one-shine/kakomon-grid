import { ChevronLeft } from "lucide-react";
import { useNav } from "@/store/useNav";
import { useStore } from "@/store/useStore";
import { Toast } from "@/components/Toast";
import { Home } from "@/views/Home";
import { SchoolDetail } from "@/views/SchoolDetail";
import { SchoolForm } from "@/views/SchoolForm";
import { AttemptForm } from "@/views/AttemptForm";

export default function App() {
  const { view, schoolId, goHome, goDetail } = useNav();
  const { schools } = useStore();

  const title = view === "home" ? "過去問グリッド" : schools.find((s) => s.id === schoolId)?.name ?? "過去問グリッド";

  function back() {
    if (view === "attemptForm" && schoolId) goDetail(schoolId);
    else if (view === "schoolForm" && schoolId && schools.some((s) => s.id === schoolId)) goDetail(schoolId);
    else goHome();
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-white/85 px-4 py-3 backdrop-blur-md">
        {view !== "home" ? (
          <button type="button" aria-label="戻る" className="-ml-1 rounded-lg p-1 text-neutral-700 active:bg-neutral-100" onClick={back}>
            <ChevronLeft size={22} />
          </button>
        ) : (
          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand text-[13px] font-black text-white">過</span>
        )}
        <div className="truncate font-bold tracking-tight text-neutral-900">{title}</div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        {view === "home" && <Home />}
        {view === "detail" && <SchoolDetail />}
        {view === "schoolForm" && <SchoolForm />}
        {view === "attemptForm" && <AttemptForm />}
      </main>

      <footer className="mx-auto max-w-2xl px-4 py-4 text-center text-xs text-neutral-400">
        端末内で完結・サーバ送信なし・登録不要
      </footer>

      <Toast />
    </div>
  );
}
