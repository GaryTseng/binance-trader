![image](https://github.com/user-attachments/assets/c2c6a952-b4db-4ec8-987d-5de96777af6c)
![image](https://github.com/user-attachments/assets/f3e42d57-1bf9-4eae-9b4b-5f0726d73589)
![image](https://github.com/user-attachments/assets/23d8c2a2-daa1-462e-90ea-b1fdc72450e2)



幣安合約交易 Web 應用程式
這是一個基於 Flask 的 Web 應用程式，提供了一個簡易的操作介面，用於執行幣安（Binance）的 U 本位合約交易，並包含一個獨立的「開單員」跟單模式。

✨ 主要功能
雙模式交易:

U本位合約: 直接操作您的主合約帳戶。

跟單模式 (開單員): 使用獨立的 API Key 進行交易，可用於開單給他人跟單，與主帳戶風險隔離。

基本交易操作:

設定槓桿倍率。

切換逐倉 (ISOLATED) / 全倉 (CROSSED) 保證金模式。

以市價買入 (開多) 或賣出 (開空)，使用 USDT 等值計算數量。

倉位與委託管理:

即時倉位列表: 顯示交易對、持倉方向、數量、入口價格、標記價格、未實現盈虧 (PNL) 以及槓桿回報率 (ROE %)。

即時委託列表: 顯示所有掛單的詳細資訊。

一鍵平倉: 在倉位旁提供市價平倉按鈕。

快速止盈: 根據指定的 ROE % 自動計算並建立止盈市價單。

單筆撤銷: 在每筆委託單旁提供獨立的撤銷按鈕。

全部撤銷: 一鍵撤銷指定交易對的所有掛單。

優化的使用者介面:

即時帳戶餘額: 在畫面右上角固定顯示 U 本位與跟單模式帳戶的 USDT 可用餘額。

即時合約價格: 在交易區塊顯示當前選擇合約的最新成交價，並每 2 秒更新一次。

我的最愛清單:

左側浮動面板，可收合與展開。

可新增、移除自選的合約。

點擊清單中的合約可快速帶入交易區塊。

您的最愛清單會儲存在瀏覽器中，下次開啟也會保留。

🚀 設定與安裝
1. 前置需求

Python 3.6+

幣安帳戶，並已申請 API Key。您需要兩組 API Key：一組用於主合約帳戶，另一組用於跟單模式的帳戶。

權限要求: 兩組 API Key 都需要啟用「允許合約交易」權限。為安全起見，請勿啟用「允許提現」權限。

2. 安裝步驟

a. Clone 或下載專案

將專案檔案下載到您的本地電腦。

b. 安裝相依套件

在專案的根目錄下，開啟終端機或命令提示字元，執行以下指令安裝所有必要的 Python 套件：

pip install -r requirements.txt

c. 設定環境變數

在專案的根目錄下，建立一個名為 .env 的檔案。複製以下內容並貼到 .env 檔案中，然後換成您自己的 API Keys：

# U本位合約 API Keys (您的主帳戶)
BINANCE_FUTURES_API_KEY="YOUR_MAIN_FUTURES_API_KEY"
BINANCE_FUTURES_SECRET_KEY="YOUR_MAIN_FUTURES_SECRET_KEY"

# 跟單模式 API Keys (您的開單員帳戶)
BINANCE_COPYTRADING_API_KEY="YOUR_COPYTRADING_API_KEY"
BINANCE_COPYTRADING_SECRET_KEY="YOUR_COPYTRADING_SECRET_KEY"

注意: 請確保 Key 的前後沒有多餘的空格。

d. 執行應用程式

在終端機中，執行以下指令來啟動 Flask 伺服器：

python app.py

3. 開始使用

伺服器啟動後，您會看到類似以下的訊息：

 * Running on http://127.0.0.1:5000

打開您的網頁瀏覽器，訪問 http://127.0.0.1:5000 或 http://YOUR_LOCAL_IP:5000 即可開始使用。
