# 過去問グリッド(React+TS 標準スタック版)

中学受験の過去問演習を「志望校×年度×科目」で記録し、**合格最低点との差**を信号色でひと目にする静的PWA。
**新・標準スタック(`standards/stack.md`)の試金石(pilot)**=このアプリから標準テンプレ `apps/_template/` を抽出する。

> 既存の vanilla 版(`apps/kakomon-grid/`)は据え置き。本ディレクトリは同じ仕様を **React19+TS strict** で作り直したもの。

## スタック(2026-06-13 確定の標準)
React 19 / TypeScript strict / Vite / Tailwind CSS v4 / shadcn流UIプリミティブ(cva+clsx+tailwind-merge) / Zustand(persist=localStorage) / Vitest + Testing Library / vite-plugin-pwa(オフライン)。
**バックエンド無し・端末内完結・送客のみ**(no-code生命線=サーバを持たない)。

## コマンド
```
npm install
npm run dev        # 開発サーバ
npm test           # Vitest(48 tests:ロジック45＋コンポーネント3)
npm run build      # tsc -b(strict)＋vite build＋PWA生成
```

## 構成
| パス | 役割 |
|---|---|
| `src/lib/logic.ts` | 純粋ロジック(合計/乖離/科目率/グリッド/シェア文/検証/migrate)。型付き |
| `src/lib/logic.test.ts` | ロジックのVitestテスト |
| `src/store/useStore.ts` | Zustand＋persist(localStorage `kg_state_v1`、migrateStateで壊れデータを正規化) |
| `src/store/{useNav,useToast}.ts` | 画面遷移／トースト(取り消し対応) |
| `src/views/*` | Home / SchoolDetail(グリッド) / SchoolForm / AttemptForm |
| `src/components/ui/*` | Button(cva)・StatusChip(信号色) |

## 品質の床(P4)
- 初回体験=空状態3ステップ＋サンプル種まき(`?sample=1`直行)/ 取り消しトースト / 2段階削除 / 信号3色以外は無彩色 / strict型＋テスト緑。

## 公開時(★GO後)
Cloudflare Pages(Direct Upload)に `dist/` を配置。noindex解除・canonical/OGを本番URLで。リリースは8月末(過去問期)。課金は持たず外部ASP送客(★)。
