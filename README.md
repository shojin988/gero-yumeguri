# 下呂温泉 湯めぐり手形プランナー

下呂温泉の「湯めぐり手形」で入れる施設を、地図・一覧で見て、公式の混雑状況とあわせて、どの順番で回れば入れるかを調べる Web アプリです（日本語・英語）。スマホのホーム画面に追加して使えます。

- データの出典: `data/sources.md`

入浴時間は変わることがあります。出かける前に公式ページ（https://www.gero-spa.or.jp/yu_meguri/ ）と、施設への電話で確認してください。

施設に不利益を与えないため、料金（通常料金・手形の価格）は扱いません。

## 言語

日本語と英語に対応しています。URL の `?lang=en`（または `?lang=ja`）、前回選んだ言語、端末の言語の順で決まり、日本語以外の端末では英語になります。英語版のポスターには `?lang=en` 付きの URL の QR コードを使います。画面の文言は `js/messages.js`、施設名とメモの英語は `data/facilities.json` の `i18n.en` にあります。

## 混雑状況

下呂温泉旅館協同組合の「手形入浴 混雑状況」（https://vista.kohnan.kitchen/#/gero_top ）と同じデータ（`js/congestion.js` の `CONGESTION_URL`）を5分ごとに読み込み、各施設の `congestionPlaceIds`（男湯・女湯の ID）で結び付けて表示します。取り直しが重なったときは最後に始めたものだけを使い、一時的に取れなくても15分までは前回の混雑を出します。それより長く取れないときは混雑を出さずに動きます。混雑は「今」の情報なので、プランタブの提案（先の時間の計画）には使いません。

## 手元で動かす

```bash
npm install
npx playwright install chromium   # 初回だけ
npm run serve                     # http://127.0.0.1:8080/ を開く
```

## テスト

```bash
npm test               # 計算とデータのテスト
npm run test:coverage  # 行カバレッジ（80% 以上で合格）
npm run test:e2e       # 画面のテスト（Playwright）
```

## データを更新する

1. 公式の手形ページを見て、`data/facilities.json` の `schedule`・`closedPeriods`・`notes` を直す。
2. 住所が変わったら `data/facilities.json` と `data/sources.md` を直す。
3. 徒歩で行けない施設（下呂駅から車・送迎が必要な施設）には `"walkable": false` を付ける。回る順番の提案から外れ、地図と一覧には「徒歩圏外（車・送迎）」と表示される。
4. `data/facilities.json` の `checkedOn` を確認した日にする。
5. `npm test` と `npm run test:e2e` を通してから、コミットして GitHub に push する（GitHub Pages に反映される）。

### 祝日データ

新しい年の祝日は、内閣府が前年2月ごろに公表します。公表されたら年を指定して作り直します。

```bash
node tools/update-holidays.js 2027 2028
```

`tests/data/holidays.test.js` の年と日数の期待値も新しい年に合わせて直します。

## 公開の仕組み

GitHub Pages で `main` ブランチのルートをそのまま公開しています。ビルド工程はありません。
