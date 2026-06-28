import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { useToast } from "@/store/useToast";
import { Button } from "@/components/ui/button";
import { SUBJECT_PRESETS, validateSchool, type Subject, type YearStat, type SourceRef } from "@/lib/logic";
import { SCHOOL_CATALOG, getCatalogSchool } from "@/lib/schoolCatalog";

export function SchoolForm() {
  const { schoolId } = useNav();
  const nav = useNav();
  const toast = useToast();
  const { schools, addSchool, addSchoolFull, updateSchool, removeSchool, updateSchoolMeta } = useStore();
  const editing = schoolId ? schools.find((s) => s.id === schoolId) ?? null : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [applyStart, setApplyStart] = useState(editing?.applyStart ?? "");
  const [applyEnd, setApplyEnd] = useState(editing?.applyEnd ?? "");
  const [examDate, setExamDateLocal] = useState(editing?.examDate ?? "");
  const [resultDate, setResultDate] = useState(editing?.resultDate ?? "");
  const [admissionsUrl, setAdmissionsUrl] = useState(editing?.admissionsUrl ?? "");
  const [subjects, setSubjects] = useState<Subject[]>(
    editing ? editing.subjects.map((s) => ({ ...s })) : SUBJECT_PRESETS[0].subjects.map((s) => ({ ...s })),
  );
  const [presetId, setPresetId] = useState(editing ? "custom" : SUBJECT_PRESETS[0].id);
  // 同梱データから取り込む参考値・出典(カタログ選択時のみ保持)。
  const [reference, setReference] = useState<YearStat[] | undefined>(editing?.reference);
  const [source, setSource] = useState<SourceRef | undefined>(editing?.source);
  const [catalogId, setCatalogId] = useState("");
  const picked = catalogId ? getCatalogSchool(catalogId) : null;
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);

  function applyPreset(id: string) {
    setPresetId(id);
    const p = SUBJECT_PRESETS.find((x) => x.id === id);
    if (p) setSubjects(p.subjects.map((s) => ({ ...s })));
  }
  function setSubject(i: number, patch: Partial<Subject>) {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setPresetId("custom");
  }

  // 公式データから選ぶ:学校名・科目・満点を自動入力し、合格最低点/平均点(目安)を取り込む。
  function applyCatalog(id: string) {
    setCatalogId(id);
    const c = getCatalogSchool(id);
    if (!c) {
      setReference(undefined);
      setSource(undefined);
      return;
    }
    setName(c.name);
    setSubjects(c.subjects.map((s) => ({ ...s })));
    setPresetId("custom");
    setReference(c.reference.map((r) => ({ ...r })));
    setSource(c.source);
    if (c.source?.url && !admissionsUrl) setAdmissionsUrl(c.source.url); // 公式入試情報リンクの初期値
  }

  function save() {
    const draft = { name: name.trim(), subjects: subjects.filter((s) => s.name.trim()) };
    const v = validateSchool(draft);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    let id: string;
    if (editing) {
      updateSchool(editing.id, draft.name, draft.subjects);
      id = editing.id;
    } else {
      // カタログから選んだ場合は出典(公式リンク)を必ず保持。手入力は素のまま。
      id = picked ? addSchoolFull({ ...draft, reference: reference ?? [], source }) : addSchool(draft.name, draft.subjects);
    }
    updateSchoolMeta(id, { applyStart, applyEnd, examDate, resultDate, admissionsUrl: admissionsUrl.trim() });
    nav.goDetail(id);
    toast.show("保存しました");
  }

  return (
    <div className="space-y-3.5">
      <h1 className="mincho text-[22px] text-sumi">{editing ? "学校を編集" : "志望校を追加"}</h1>

      {!editing && (
        <Field label="公式データから選ぶ(任意・順次追加中)">
          <select className={inputCls} value={catalogId} onChange={(e) => applyCatalog(e.target.value)}>
            <option value="">手入力する</option>
            {SCHOOL_CATALOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {picked && !picked.demo && (
            <div className="mt-2 rounded-xl bg-brand/5 px-3 py-2 text-xs text-neutral-600">
              {reference && reference.length > 0 ? (
                <>科目・満点と、過去{reference.length}年の<b>合格最低点・受験者平均点(目安)</b>を取り込みます。</>
              ) : picked.disclosesMinPass === false ? (
                <>科目・満点を自動入力します。<b>この学校は合格最低点を公式非公表</b>のため、数値は取り込みません(得点率の推移で見ます)。</>
              ) : (
                <>科目・満点を自動入力します。合格最低点は公式の入試結果ページから記録時に入力してください。</>
              )}
              {source?.label && (
                <span className="mt-0.5 block text-[11px] text-neutral-400">
                  出典:{source.label}{source.asof && `(${source.asof}時点)`}・最新は各校公式でご確認ください
                </span>
              )}
            </div>
          )}
        </Field>
      )}

      <Field label="学校名">
        <input
          className={inputCls}
          value={name}
          maxLength={30}
          placeholder="例:桜花中"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-xs text-neutral-500">受験日程(任意・今後の予定と逆算に使う)</span>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="出願開始">
            <input className={inputCls} type="date" value={applyStart} onChange={(e) => setApplyStart(e.target.value)} />
          </Field>
          <Field label="出願締切">
            <input className={inputCls} type="date" value={applyEnd} onChange={(e) => setApplyEnd(e.target.value)} />
          </Field>
          <Field label="試験日">
            <input className={inputCls} type="date" value={examDate} onChange={(e) => setExamDateLocal(e.target.value)} />
          </Field>
          <Field label="合格発表">
            <input className={inputCls} type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="公式の入試情報・出願ページ(任意)">
        <input
          className={inputCls}
          type="url"
          inputMode="url"
          placeholder="https://… 各校公式"
          value={admissionsUrl}
          onChange={(e) => setAdmissionsUrl(e.target.value)}
        />
      </Field>

      <Field label="科目構成">
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_PRESETS.map((p) => (
            <PresetChip key={p.id} active={presetId === p.id} onClick={() => applyPreset(p.id)}>
              {p.label}
            </PresetChip>
          ))}
          <PresetChip active={presetId === "custom"} onClick={() => setPresetId("custom")}>
            カスタム
          </PresetChip>
        </div>
      </Field>

      <div className="space-y-2">
        {subjects.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inputBase} min-w-0 flex-1`}
              value={s.name}
              maxLength={8}
              placeholder="科目名"
              onChange={(e) => setSubject(i, { name: e.target.value })}
            />
            <span className="flex-none text-sm text-neutral-500">満点</span>
            <input
              className={`${inputBase} w-20 flex-none text-center`}
              type="number"
              inputMode="numeric"
              value={s.max}
              onChange={(e) => setSubject(i, { max: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="text-sm text-red-600">
          {errors.map((e, i) => (
            <div key={i}>・{e}</div>
          ))}
        </div>
      )}

      <Button size="block" onClick={save}>
        保存
      </Button>

      {editing && (
        <div className="mt-6 grid gap-2.5 border-t border-line pt-4">
          {!confirmDel ? (
            <Button variant="dangerGhost" size="block" onClick={() => setConfirmDel(true)}>
              この学校と記録をすべて削除
            </Button>
          ) : (
            <Button
              variant="danger"
              size="block"
              onClick={() => {
                removeSchool(editing.id);
                nav.goHome();
                toast.show("削除しました");
              }}
            >
              本当に削除する(取り消せません)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const inputBase =
  "rounded-xl border border-line bg-card px-3 py-3 text-base text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-300";
const inputCls = `w-full ${inputBase}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-xs text-neutral-500">{label}</span>
      {children}
    </div>
  );
}

function PresetChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
        active ? "border-neutral-900 bg-neutral-900 text-white" : "border-line bg-card text-neutral-700 active:bg-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}
