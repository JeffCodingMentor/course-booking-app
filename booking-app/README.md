# Jeff老師暑期班預約系統 (Course Booking App)

本專案是一個基於 **Next.js (App Router)** 的課程預約與註冊系統，後端採用 **Vercel KV (Redis)** 進行資料儲存，並串接 **ChatEverywhere LINE Notify** 發送即時預約通知。

## 🌟 系統特色

1. **使用者登入與自動註冊**：
   * 輸入學生姓名、生日 (YYYYMMDD) 與家長電話即可登入。
   * 若系統無此學生資料，將自動跳出彈出視窗詢問並協助引導註冊。
2. **六週平日日曆 (2026/07/20 ~ 2026/08/28)**：
   * 僅顯示週一至週五（共 30 天）。
   * 顯示剩餘容量：「空位 2」或「空位 1」。
   * 已額滿的日期顯示紅色的「額滿」。
   * 目前登入學生已預約的日期顯示「上課」，並附有「取消」按鈕。
3. **價格隱藏與兩人同行功能**：
   * 全站 UI 隱藏價格資訊，保持簡潔。
   * 支援「兩人同行」核取方塊，可輸入同行者姓名進行即時驗證（驗證成功顯示「已確認」）。
   * 兩人同行會自動連動預約/取消雙方的上課名額。
4. **Python 專屬保留週**：
   * 2026/08/03 ~ 2026/08/07 鎖定為「額滿」，滑鼠懸停時會顯示「Python」提示工具。
5. **多選批次預約**：
   * 家長可點選多個可預約的日期（以橘黃色醒目顯示），點擊「確認預約」後一次性送出。
   * 預約成功後顯示「預約成功，等待老師電話聯繫確認」彈出提示。
6. **響應式設計 (RWD)**：
   * 支援手機與平板觸控操作。
   * 當螢幕寬度小於 600px 時，自動切換為垂直單欄的每日清單模式，並於週與週之間繪製分隔線，日期旁會顯示 `(週一)` ~ `(週五)` 等標籤。

---

## 🛠️ 開發環境設定

### 1. 安裝套件
在 `booking-app/` 目錄下執行：
```bash
npm install
```

### 2. 環境變數設定 (`.env.local`)
在本機進行開發或測試 LINE 通知時，請在 `booking-app/` 目錄下建立 `.env.local` 檔案並填入金鑰：

```env
# ChatEverywhere LINE Notify Token
CHAT_EVERYWHERE_TOKEN="bn6PqK5qffcvjsGWbxczUDS6CvVFY43a"

# Vercel KV (本機不填此二變數時，會自動使用 MemoryDB 進行本機測試，重啟伺服器會重設資料)
# KV_REST_API_URL="your_vercel_kv_rest_url"
# KV_REST_API_TOKEN="your_vercel_kv_rest_token"
```

---

## 🚀 執行指令

### 啟動開發伺服器
```bash
npm run dev
```
啟動後可在瀏覽器打開 `http://localhost:3000` 進行操作。

### 執行測試套件
我們編寫了完整的 Jest 測試套件，涵蓋資料庫、認證、預約限制與 LINE 通知：
```bash
npm run test
```

### 程式碼格式與檢查 (Linter)
```bash
npm run lint
```

### 生產環境編譯
```bash
npm run build
```

---

## 🔍 本機資料庫檢視 (Local Debugging)
在本機開發測試時，若想一鍵檢視記憶體資料庫的即時狀態，請在啟動伺服器後，直接以瀏覽器打開：
👉 **`http://localhost:3000/api/debug/db`**

該網址會以 JSON 格式序列化並印出目前本機資料庫記憶體內的 `store` 與 `sets` 狀態。
*注意：此網址僅限非生產環境（Development）執行，在生產環境中將自動回傳 403 Forbidden 錯誤。*
