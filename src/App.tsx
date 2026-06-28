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

  const title = view === "home" ? "中学受験 過去問ノート" : schools.find((s) => s.id === schoolId)?.name ?? "中学受験 過去問ノート";

  function back() {
    if (view === "attemptForm" && schoolId) goDetail(schoolId);
    else if (view === "schoolForm" && schoolId && schools.some((s) => s.id === schoolId)) goDetail(schoolId);
    else goHome();
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-paper/80 px-4 py-3 backdrop-blur-md">
        {view !== "home" ? (
          <button type="button" aria-label="戻る" className="-ml-1 rounded-lg p-1 text-sumi/70 active:bg-sumi/5" onClick={back}>
            <ChevronLeft size={22} />
          </button>
        ) : (
          <span className="seal grid h-8 w-8 flex-none place-items-center text-[17px]">過</span>
        )}
        <div className="mincho truncate text-[17px] tracking-tight text-sumi">{title}</div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">
        {view === "home" && <Home />}
        {view === "detail" && <SchoolDetail />}
        {view === "schoolForm" && <SchoolForm />}
        {view === "attemptForm" && <AttemptForm />}
      </main>

      <footer className="mx-auto max-w-2xl px-4 py-5 text-center text-xs text-sumi/40">
        端末内で完結・サーバ送信なし・登録不要
      </footer>

      <Toast />
    </div>
  );
}
