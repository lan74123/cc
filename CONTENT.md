# 新增與修改專案

網站上的每個專案都是一個資料夾，裡面放**一個文字檔**和**照片**，不需要寫程式。

```
src/content/works/
  daliao/              ← 資料夾名稱 = 網址（/works/daliao/）
    index.md           ← 標題、地點、年份、介紹文字
    1.jpg  2.jpg …     ← 照片，依檔名順序排在介紹文字下方
  _template/           ← 範本（_ 開頭的資料夾不會出現在網站上）
```

研究文章（Research）的結構完全一樣，放在 `src/content/research/`。

---

## 一、新增一個專案

### 1. 複製範本資料夾

複製 `src/content/works/_template`，把副本改名成這個專案的網址名稱：

- 只用**小寫英文、數字、減號**，例如 `kaohsiung-loft`、`tainan-cafe-2026`
- 這個名稱就是網址：`https://ccspace.tw/works/kaohsiung-loft/`
- 名稱開頭不要加 `_`（加了就變草稿，不會上網站）

### 2. 放照片

把照片直接放進這個資料夾：

- 用 `01.jpg`、`02.jpg`、`03.jpg`… 命名，**網頁會照檔名順序排列**（`10.jpg` 會排在 `09.jpg` 後面）
- 格式：JPG、PNG、WebP 都可以
- 手機拍的照片**直接放**，方向會在發布時自動轉正
- iPhone 的 HEIC 格式網站讀不到，請先轉成 JPG（iPhone：設定 → 相機 → 格式 → 選「最相容」，之後拍的就是 JPG）
- 原圖不用先縮小，網站會自動產生適合手機和電腦的尺寸；但單張最好在 20 MB 以內

### 3. 填寫 `index.md`

打開資料夾裡的 `index.md`（用記事本或任何文字編輯器），照著裡面的說明填。最上面兩條 `---` 之間是**專案資料**，之後是**介紹文字**：

```yaml
---
title: "Kaohsiung Loft"
pubDate: 2026-10-20
category: Home
tags: [home]
location: "Kaohsiung"
year: "2026"
client: "Private Client"
image:
  src: ./01.jpg
  alt: "客廳面向窗景的全景"
description: "一句話描述這個專案。"
---
這裡開始是專案介紹，一段一段寫，段落之間空一行。
```

| 欄位                           | 必填 | 說明                                                          |
| ------------------------------ | ---- | ------------------------------------------------------------- |
| `title`                        | ✅   | 專案名稱                                                      |
| `pubDate`                      | ✅   | 日期，格式 `2026-10-20`。作品列表依日期由新到舊排列           |
| `description`                  | ✅   | 一兩句簡介。作品列表展開時、分享到 LINE / Facebook 時顯示     |
| `image`                        | 建議 | 封面照片。`src` 是檔名（前面加 `./`），`alt` 是照片的文字描述 |
| `category`                     |      | `Home`（住宅）或 `Commerce`（商空），只能二選一，大小寫要一樣 |
| `tags`                         |      | 標籤，例如 `[home]`                                           |
| `location` / `year` / `client` |      | 地點、年份、業主。不需要就整行刪掉，網頁上就不會顯示          |
| `gallery`                      |      | 選填。想自訂照片順序或給每張不同描述時才寫（範本裡有寫法）    |
| `placeholder: true`            |      | 只在測試站顯示，正式站看不到。適合還沒準備好的專案            |

**寫的時候要注意：**

- 文字裡有冒號 `:` 時，整段要用雙引號包起來，例如 `title: "Case Study: Daliao"`
- 縮排用**空格**，不要用 Tab（`image:` 底下的 `src`、`alt` 前面是兩個空格）
- 介紹文字可以用 `**粗體**`、用 `## 小標題` 開頭當段落標題

### 4. 預覽（在自己電腦上）

```sh
bun run dev
```

打開 http://localhost:4321/works/kaohsiung-loft/ 就能看到。存檔後頁面會自動更新。

### 5. 發布

- **先發到測試站**給大家看：`bun run deploy:preview`，網址 https://cc-space-preview.lan74123.workers.dev
- **上正式站**：把修改合併到 GitHub 的 `main` 分支並 push。`main` 一更新，Cloudflare 就會自動建置並上線（約 1–3 分鐘）

> 也可以用精靈建立資料夾：`bun run create`，照著問題回答即可，之後一樣把照片放進它建立的資料夾。

---

## 二、只用 GitHub 網頁（不用在電腦上安裝任何東西）

1. 到 https://github.com/lan74123/cc ，進入 `src/content/works/`
2. 按 **Add file → Create new file**，檔名輸入 `kaohsiung-loft/index.md`（打 `/` 會自動建立資料夾）
3. 把 `_template/index.md` 的內容貼上，改成這個專案的資料
4. 進入剛建立的 `kaohsiung-loft` 資料夾，按 **Add file → Upload files**，把照片拖進去
5. 按 **Commit changes**

⚠️ 在網頁上直接 commit 到 `main`，**會直接上線到正式站**。如果想先確認，commit 時選「Create a new branch」，之後再合併。

---

## 三、修改現有專案

| 想做的事           | 怎麼做                                            |
| ------------------ | ------------------------------------------------- |
| 改文字、地點、年份 | 編輯該專案的 `index.md`                           |
| 加照片             | 把照片放進資料夾，取一個排在想要位置的檔名        |
| 換照片順序         | 改檔名的數字                                      |
| 刪照片             | 刪掉檔案（如果它是封面，記得改 `image` 的 `src`） |
| 換封面             | 改 `image` 底下的 `src`                           |
| 暫時下架           | 資料夾名稱前面加 `_`，例如 `_kaohsiung-loft`      |
| 改網址             | 改資料夾名稱（舊網址會失效）                      |

---

## 四、出錯時

發布或預覽時如果出現紅字錯誤，通常是 `index.md` 上面的資料格式有問題，錯誤訊息會指出是哪個檔案、哪個欄位。最常見的幾種：

- **`category` 拼錯**：只能是 `Home` 或 `Commerce`
- **少了必填欄位**：`title`、`pubDate`、`description`
- **照片檔名對不上**：`image` 的 `src` 寫的檔名，資料夾裡要真的有那個檔案（大小寫也要一樣）
- **冒號沒加引號**、**用了 Tab 縮排**

改好存檔再試一次即可。

**改了資料夾或檔案名稱之後，本機預覽或建置出現看不懂的錯誤**（例如 `failed to resolve import ... index.mdx`）：這是電腦上的暫存檔還記著舊名稱，執行一次

```sh
bun run clean
```

再重新 `bun run dev` 或 `bun run build` 即可。這只會發生在自己的電腦上，正式站每次都是重新建置，不受影響。
