// --- DOM 元素定義 ---

// U本位合約相關 DOM 元素
const symbolSelect = document.getElementById('symbolSelect');
const leverageSelect = document.getElementById('leverageSelect');
const marginTypeSelect = document.getElementById('marginTypeSelect');
const quantityInput = document.getElementById('quantityInput');
const buyButton = document.getElementById('buyButton');
const sellButton = document.getElementById('sellButton');
const messageDiv = document.getElementById('message');
const positionsListDiv = document.getElementById('positionsList');
const positionsMessageDiv = document.getElementById('positionsMessage');
const refreshPositionsButton = document.getElementById('refreshPositionsButton');
const openOrdersListDiv = document.getElementById('openOrdersList');
const openOrdersMessageDiv = document.getElementById('openOrdersMessage');
const refreshOpenOrdersButton = document.getElementById('refreshOpenOrdersButton');
const cancelAllOpenOrdersButton = document.getElementById('cancelAllOpenOrdersButton');

// 跟單模式相關 DOM 元素
const copySymbolSelect = document.getElementById('copySymbolSelect');
const copyLeverageSelect = document.getElementById('copyLeverageSelect');
const copyMarginTypeSelect = document.getElementById('copyMarginTypeSelect');
const copyQuantityInput = document.getElementById('copyQuantityInput');
const copyBuyButton = document.getElementById('copyBuyButton');
const copySellButton = document.getElementById('copySellButton');
const copyMessageDiv = document.getElementById('copyMessage');
const copyPositionsListDiv = document.getElementById('copyPositionsList');
const copyPositionsMessageDiv = document.getElementById('copyPositionsMessage');
const copyRefreshPositionsButton = document.getElementById('copyRefreshPositionsButton');
const copyOpenOrdersListDiv = document.getElementById('copyOpenOrdersList');
const copyOpenOrdersMessageDiv = document.getElementById('copyOpenOrdersMessage');
const copyRefreshOpenOrdersButton = document.getElementById('copyRefreshOpenOrdersButton');
const copyCancelAllOpenOrdersButton = document.getElementById('copyCancelAllOpenOrdersButton');

// 頁籤切換相關 DOM 元素
const tabFutures = document.getElementById('tab-futures');
const tabCopytrading = document.getElementById('tab-copytrading');
const futuresContent = document.getElementById('futures-content');
const copytradingContent = document.getElementById('copytrading-content');

// 餘額顯示相關 DOM 元素
const futuresBalanceSpan = document.getElementById('futures-balance');
const copyBalanceSpan = document.getElementById('copy-balance');

// 價格顯示相關 DOM 元素
const futuresPriceDiv = document.getElementById('futures-current-price');
const copyPriceDiv = document.getElementById('copy-current-price');

// 我的最愛面板相關 DOM 元素
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesToggleBtn = document.getElementById('favorites-toggle-btn');
const addFavoriteBtn = document.getElementById('add-favorite-btn');
const favoriteSymbolInput = document.getElementById('favorite-symbol-input');
const favoritesList = document.getElementById('favorites-list');

// [新增] 交易紀錄面板相關 DOM 元素
const historyPanel = document.getElementById('history-panel');
const historyToggleBtn = document.getElementById('history-toggle-btn');
const historyTabFutures = document.getElementById('history-tab-futures');
const historyTabCopytrading = document.getElementById('history-tab-copytrading');
const historyStartDateInput = document.getElementById('history-start-date');
const historyEndDateInput = document.getElementById('history-end-date');
const queryHistoryBtn = document.getElementById('query-history-btn');
const tradeHistoryList = document.getElementById('trade-history-list');
const historyMessageDiv = document.getElementById('history-message');

// 合約價值顯示相關 DOM 元素
const futuresLeveragedValueDiv = document.getElementById('futures-leveraged-value');
const copyLeveragedValueDiv = document.getElementById('copy-leveraged-value');


// 全域變數
let exchangeInfo = {};
let favorites = []; 
const allSymbolsDatalist = document.getElementById('allSymbolsList');
let priceUpdateInterval = null; 


// --- 輔助函式 ---

function displayMessage(message, type = 'info', targetDiv = messageDiv) {
    targetDiv.innerHTML = message; // Use innerHTML to render bold tags etc.
    targetDiv.className = type;
    setTimeout(() => {
        targetDiv.textContent = '';
        targetDiv.className = '';
    }, 5000);
}

function showConfirmModal(message, callback) {
    const existingModal = document.getElementById('customConfirmModal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="customConfirmModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); text-align: center; max-width: 400px; width: 90%;">
                <p style="margin-bottom: 20px; font-size: 1.1em; color: #333;">${message}</p>
                <button id="confirmYes" style="background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-right: 15px; font-size: 1em;">是</button>
                <button id="confirmNo" style="background-color: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em;">否</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('customConfirmModal');
    document.getElementById('confirmYes').onclick = () => {
        callback(true);
        modal.remove();
    };
    document.getElementById('confirmNo').onclick = () => {
        callback(false);
        modal.remove();
    };
}

// --- API 相關函式 ---

async function apiCall(endpoint, method = 'GET', data = null, targetMessageDiv) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(endpoint, options);
        const result = await response.json();
        
        result.ok = response.ok;

        if (targetMessageDiv) {
            if (response.ok) {
                if (result.code === 200 || result.msg === 'success' || (result.status && ['NEW', 'FILLED', 'CANCELED'].includes(result.status))) {
                    displayMessage(`操作成功`, 'success', targetMessageDiv);
                } else if (result.code) {
                    displayMessage(`API 錯誤 (${result.code}): ${result.msg}`, 'error', targetMessageDiv);
                } else {
                     displayMessage(`操作成功`, 'success', targetMessageDiv);
                }
            } else {
                const errorMessage = result.msg || `HTTP 錯誤: ${response.status} ${response.statusText}`;
                displayMessage(`操作失敗: ${errorMessage}`, 'error', targetMessageDiv);
            }
        }
        return result; 
    } catch (error) {
        console.error(`API 請求失敗 (${endpoint}):`, error);
        if (targetMessageDiv) {
            displayMessage(`網絡請求失敗: ${error.message}`, 'error', targetMessageDiv);
        }
        return { ok: false, msg: `網絡請求失敗: ${error.message}` };
    }
}

// --- 我的最愛相關函式 ---

function loadFavorites() {
    const savedFavorites = localStorage.getItem('binanceFuturesFavorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }
}

function saveFavorites() {
    localStorage.setItem('binanceFuturesFavorites', JSON.stringify(favorites));
}

function renderFavorites() {
    favoritesList.innerHTML = ''; 
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<li class="no-favorites">尚無最愛項目</li>';
        return;
    }
    favorites.forEach(symbol => {
        const li = document.createElement('li');
        li.dataset.symbol = symbol;
        li.innerHTML = `
            <span class="favorite-name">${symbol}</span>
            <button class="remove-favorite-btn" data-symbol="${symbol}" title="移除最愛">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        favoritesList.appendChild(li);
    });
}

function addFavorite() {
    const symbol = favoriteSymbolInput.value.trim().toUpperCase();
    if (!symbol) {
        displayMessage('請輸入合約代碼。', 'warning', messageDiv);
        return;
    }
    if (!exchangeInfo[symbol]) {
        displayMessage(`無效的合約代碼: ${symbol}`, 'error', messageDiv);
        return;
    }
    if (favorites.includes(symbol)) {
        displayMessage(`${symbol} 已在您的最愛清單中。`, 'info', messageDiv);
        return;
    }

    favorites.push(symbol);
    favorites.sort(); 
    saveFavorites();
    renderFavorites();
    favoriteSymbolInput.value = ''; 
    displayMessage(`已新增 ${symbol} 到我的最愛。`, 'success', messageDiv);
}


async function fetchExchangeInfo() {
    try {
        const response = await fetch('/api/exchangeInfo');
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        exchangeInfo = await response.json();
        populateSymbolDatalist();
        console.log('交易對資訊已成功加載。');
    } catch (error) {
        console.error('獲取交易對資訊失敗:', error);
        displayMessage(`獲取交易對資訊失敗: ${error.message}`, 'error');
    }
}

function populateSymbolDatalist() {
    const symbols = Object.keys(exchangeInfo).sort();
    allSymbolsDatalist.innerHTML = '';
    symbols.forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol;
        allSymbolsDatalist.appendChild(option);
    });
    if (symbols.includes('BTCUSDT')) {
        symbolSelect.value = 'BTCUSDT';
        copySymbolSelect.value = 'BTCUSDT';
    } else if (symbols.length > 0) {
        symbolSelect.value = symbols[0];
        copySymbolSelect.value = symbols[0];
    }
}

// --- U本位合約相關函式 ---

async function setLeverage(symbol, leverage) {
    if (!exchangeInfo[symbol]) { return null; }
    return apiCall('/api/setLeverage', 'POST', { symbol, leverage }, null);
}

async function changeMarginType(symbol, marginType) {
    if (!exchangeInfo[symbol]) { return null; }
    return apiCall('/api/changeMarginType', 'POST', { symbol, marginType }, null);
}

async function placeOrder(symbol, side, order_type, quantity_usdt = null, quantity_contract = null, price = null, stop_price = null) {
    if (!exchangeInfo[symbol]) { return null; }
    const data = { symbol, side, type: order_type };
    if (quantity_usdt !== null) data.quantity_usdt = quantity_usdt;
    if (quantity_contract !== null) data.quantity_contract = quantity_contract;
    if (price !== null) data.price = price;
    if (stop_price !== null) data.stopPrice = stop_price;
    return apiCall('/api/placeOrder', 'POST', data, null);
}

async function fetchPositions() {
    positionsMessageDiv.textContent = '載入中...';
    try {
        const result = await apiCall('/api/getPositions', 'GET', null, null); 
        if (result && result.ok && Array.isArray(result)) {
            renderPositions(result, positionsListDiv, 'U本位', 'futures');
            positionsMessageDiv.textContent = '';
        } else {
            positionsListDiv.innerHTML = '<p class="no-positions">無法載入U本位持倉資訊。</p>';
            positionsMessageDiv.textContent = '';
        }
    } catch (error) {
        console.error('獲取U本位持倉失敗:', error);
        positionsListDiv.innerHTML = '<p class="no-positions">獲取U本位持倉失敗。</p>';
        positionsMessageDiv.textContent = '';
    }
}

async function fetchOpenOrders() {
    openOrdersMessageDiv.textContent = '載入中...';
    try {
        const result = await apiCall(`/api/getOpenOrders`, 'GET', null, null); 
        if (result && result.ok && Array.isArray(result)) {
            renderOpenOrders(result, openOrdersListDiv, 'U本位', 'futures');
            openOrdersMessageDiv.textContent = '';
        } else {
            openOrdersListDiv.innerHTML = '<p class="no-positions">無法載入U本位委託單資訊，或目前沒有委託單。</p>';
            openOrdersMessageDiv.textContent = '';
        }
    } catch (error) {
        console.error('獲取U本位委託單失敗:', error);
        openOrdersListDiv.innerHTML = '<p class="no-positions">獲取U本位委託單失敗。</p>';
        openOrdersMessageDiv.textContent = '';
    }
}

async function cancelAllOpenOrders(symbol, apiPrefix) {
    if (!exchangeInfo[symbol]) {
        displayMessage('無效的交易對符號...', 'warning', apiPrefix === '/api' ? openOrdersMessageDiv : copyOpenOrdersMessageDiv);
        return null;
    }
    const targetDiv = apiPrefix === '/api' ? openOrdersMessageDiv : copyOpenOrdersMessageDiv;
    showConfirmModal(`您確定要撤銷 ${symbol} 的所有委託單嗎？`, async (confirmed) => {
        if (confirmed) {
            const result = await apiCall(`${apiPrefix}/cancelAllOpenOrders?symbol=${symbol}`, 'DELETE', null, targetDiv);
            if (result && result.ok) {
                if (apiPrefix === '/api') fetchOpenOrders();
                else fetchCopyOpenOrders();
            }
        }
    });
}

// --- 跟單模式相關函式 ---

async function setCopyLeverage(symbol, leverage) {
    if (!exchangeInfo[symbol]) { return null; }
    return apiCall('/api/copytrading/setLeverage', 'POST', { symbol, leverage }, null);
}

async function changeCopyMarginType(symbol, marginType) {
    if (!exchangeInfo[symbol]) { return null; }
    return apiCall('/api/copytrading/changeMarginType', 'POST', { symbol, marginType }, null);
}

async function placeCopyOrder(symbol, side, order_type, quantity_usdt = null, quantity_contract = null, price = null, stop_price = null) {
    if (!exchangeInfo[symbol]) { return null; }
    const data = { symbol, side, type: order_type };
    if (quantity_usdt !== null) data.quantity_usdt = quantity_usdt;
    if (quantity_contract !== null) data.quantity_contract = quantity_contract;
    if (price !== null) data.price = price;
    if (stop_price !== null) data.stopPrice = stop_price;
    return apiCall('/api/copytrading/placeOrder', 'POST', data, null);
}

async function fetchCopyPositions() {
    copyPositionsMessageDiv.textContent = '載入中...';
    try {
        const result = await apiCall('/api/copytrading/getPositions', 'GET', null, null); 
        if (result && result.ok && Array.isArray(result)) {
            renderPositions(result, copyPositionsListDiv, '跟單模式', 'copytrading');
            copyPositionsMessageDiv.textContent = '';
        } else {
            copyPositionsListDiv.innerHTML = '<p class="no-positions">無法載入跟單模式持倉資訊。</p>';
            copyPositionsMessageDiv.textContent = '';
        }
    } catch (error) {
        console.error('獲取跟單模式持倉失敗:', error);
        copyPositionsListDiv.innerHTML = '<p class="no-positions">獲取跟單模式持倉失敗。</p>';
        copyPositionsMessageDiv.textContent = '';
    }
}

async function fetchCopyOpenOrders() {
    copyOpenOrdersMessageDiv.textContent = '載入中...';
    try {
        const result = await apiCall(`/api/copytrading/getOpenOrders`, 'GET', null, null); 
        if (result && result.ok && Array.isArray(result)) {
            renderOpenOrders(result, copyOpenOrdersListDiv, '跟單模式', 'copytrading');
            copyOpenOrdersMessageDiv.textContent = '';
        } else {
            copyOpenOrdersListDiv.innerHTML = '<p class="no-positions">無法載入跟單模式委託單資訊...</p>';
            copyOpenOrdersMessageDiv.textContent = '';
        }
    } catch (error) {
        console.error('獲取跟單模式委託單失敗:', error);
        copyOpenOrdersListDiv.innerHTML = '<p class="no-positions">獲取跟單模式委託單失敗。</p>';
        copyOpenOrdersMessageDiv.textContent = '';
    }
}


// --- 渲染函式 ---

function renderPositions(positions, targetDiv, mode, apiMode) {
    if (!positions || positions.length === 0 || positions.every(p => parseFloat(p.positionAmt) === 0)) {
        targetDiv.innerHTML = `<p class="no-positions">目前沒有 ${mode} 持倉。</p>`;
        return;
    }
    let html = `
        <table>
            <thead>
                <tr>
                    <th>交易對</th><th>持倉方向</th><th>數量</th><th>入口價格</th><th>標記價格</th><th>未實現盈虧</th><th>ROE %</th><th>槓桿</th><th>模式</th>
                    <th>市價平倉 (吃單)</th>
                    <th>限價平倉 (掛單)</th>
                    <th>止盈設定 (ROE %)</th>
                </tr>
            </thead>
            <tbody>`;
    positions.forEach(p => {
        const positionAmt = parseFloat(p.positionAmt);
        if (positionAmt === 0) return;
        const entryPrice = parseFloat(p.entryPrice);
        const markPrice = parseFloat(p.markPrice);
        const unRealizedProfit = parseFloat(p.unRealizedProfit);
        const leverage = parseInt(p.leverage);
        const positionSide = positionAmt > 0 ? '做多' : '做空';
        let pnlPercentage = 0;
        const initialMargin = parseFloat(p.initialMargin);
        if (initialMargin > 0) pnlPercentage = (unRealizedProfit / initialMargin) * 100;
        else if (unRealizedProfit !== 0) {
            const initialNotional = entryPrice * Math.abs(positionAmt);
            if(initialNotional > 0) pnlPercentage = (unRealizedProfit / initialNotional) * 100 * leverage;
        }
        const formatNumber = (num, precision = 2) => isNaN(num) || num === null ? 'N/A' : num.toFixed(precision);
        html += `
            <tr>
                <td>${p.symbol}</td>
                <td><span style="color:${positionAmt > 0 ? 'green':'red'};font-weight:bold;">${positionSide}</span></td>
                <td>${formatNumber(Math.abs(positionAmt), getQuantityPrecision(p.symbol))}</td>
                <td>${formatNumber(entryPrice, getPricePrecision(p.symbol))}</td>
                <td>${formatNumber(markPrice, getPricePrecision(p.symbol))}</td>
                <td style="color:${unRealizedProfit>=0?'green':'red'};">${formatNumber(unRealizedProfit,3)}</td>
                <td style="color:${pnlPercentage>=0?'green':'red'};">${formatNumber(pnlPercentage,2)}%</td>
                <td>${leverage}x</td><td>${p.marginType}</td>
                <td><button class="action-button-danger market-close-btn" data-symbol="${p.symbol}" data-side="${positionAmt > 0 ? 'SELL':'BUY'}" data-quantity="${Math.abs(positionAmt)}" data-apimode="${apiMode}">平倉</button></td>
                <td><button class="action-button limit-close-btn" data-symbol="${p.symbol}" data-side="${positionAmt > 0 ? 'SELL':'BUY'}" data-quantity="${Math.abs(positionAmt)}" data-apimode="${apiMode}">速止盈</button></td>
                <td><input type="number" class="take-profit-input" value="5" min="0.1" step="0.1" style="width:60px;display:inline-block;margin-right:5px;">% <button class="action-button set-take-profit-btn" data-symbol="${p.symbol}" data-side="${positionAmt > 0 ? 'SELL':'BUY'}" data-quantity="${Math.abs(positionAmt)}" data-entryprice="${entryPrice}" data-leverage="${leverage}" data-apimode="${apiMode}">止盈</button></td>
            </tr>`;
    });
    html += `</tbody></table>`;
    targetDiv.innerHTML = html;
    addPositionButtonListeners(targetDiv, apiMode);
}

function renderOpenOrders(orders, targetDiv, mode, apiMode) {
    if (!orders || orders.length === 0) {
        targetDiv.innerHTML = `<p class="no-positions">目前沒有 ${mode} 委託單。</p>`;
        return;
    }
    let html = `
        <table>
            <thead>
                <tr><th>委託單 ID</th><th>交易對</th><th>方向</th><th>類型</th><th>價格 / 觸發價格</th><th>數量 (單位)</th><th>狀態</th><th>時間</th><th>操作</th></tr>
            </thead>
            <tbody>`;
    orders.forEach(o => {
        const orderTime = new Date(o.time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        const formatNumber = (num, precision=2) => (isNaN(num)||num===null) ? 'N/A' : parseFloat(num).toFixed(precision);
        let priceToDisplay = '-';
        if (['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'TAKE_PROFIT', 'STOP'].includes(o.type)) {
            priceToDisplay = (o.stopPrice && parseFloat(o.stopPrice) !== 0) ? formatNumber(o.stopPrice, getPricePrecision(o.symbol)) : '市價觸發';
        } else if (o.price && parseFloat(o.price) !== 0) {
            priceToDisplay = formatNumber(o.price, getPricePrecision(o.symbol));
        } else if (o.type === 'MARKET') {
            priceToDisplay = '市價';
        }
        html += `
            <tr>
                <td>${o.orderId}</td><td>${o.symbol}</td>
                <td><span style="color:${o.side==='BUY'?'green':'red'};font-weight:bold;">${o.side==='BUY'?'買入':'賣出'}</span></td>
                <td>${o.type}</td><td>${priceToDisplay}</td>
                <td>${formatNumber(o.origQty, getQuantityPrecision(o.symbol))}</td>
                <td>${o.status}</td><td>${orderTime}</td>
                <td><button class="cancel-order-btn" title="撤銷此委託單" data-order-id="${o.orderId}" data-symbol="${o.symbol}" data-apimode="${apiMode}">&times;</button></td>
            </tr>`;
    });
    html += `</tbody></table>`;
    targetDiv.innerHTML = html;
    addOpenOrdersButtonListeners(targetDiv);
}

// --- 精確度輔助函式 ---

function getQuantityPrecision(symbol) {
    if (exchangeInfo[symbol]) {
        const filter = exchangeInfo[symbol].filters.find(f => f.filterType === 'LOT_SIZE');
        if (filter) {
            const step = filter.stepSize.toString();
            return step.includes('.') ? step.split('.')[1].length : 0;
        }
    }
    return 0;
}

function getPricePrecision(symbol) {
    if (exchangeInfo[symbol]) {
        const filter = exchangeInfo[symbol].filters.find(f => f.filterType === 'PRICE_FILTER');
        if (filter) {
            const tick = filter.tickSize.toString();
            return tick.includes('.') ? tick.split('.')[1].length : 0;
        }
    }
    return 2;
}

// --- 動態按鈕事件監聽器 ---

async function cancelSingleOrder(symbol, orderId, apiMode) {
    const apiPrefix = apiMode === 'futures' ? '/api' : '/api/copytrading';
    const targetDiv = apiMode === 'futures' ? openOrdersMessageDiv : copyOpenOrdersMessageDiv;
    showConfirmModal(`您確定要撤銷委託單 ID: ${orderId} 嗎？`, async (confirmed) => {
        if (confirmed) {
            const result = await apiCall(`${apiPrefix}/cancelOrder`, 'POST', { symbol, orderId }, targetDiv);
            if (result && result.ok) {
                if (apiMode === 'futures') fetchOpenOrders();
                else fetchCopyOpenOrders();
            }
        }
    });
}

function addOpenOrdersButtonListeners(containerDiv) {
    containerDiv.querySelectorAll('.cancel-order-btn').forEach(button => {
        button.onclick = () => {
            const { orderId, symbol, apimode } = button.dataset;
            cancelSingleOrder(symbol, orderId, apimode);
        };
    });
}

function addPositionButtonListeners(containerDiv, apiMode) {
    containerDiv.querySelectorAll('.market-close-btn').forEach(button => {
        button.onclick = async () => {
            const { symbol, side, quantity } = button.dataset;
            const msgDiv = apiMode === 'futures' ? messageDiv : copyMessageDiv;

            const confirmMsg = `您確定要以 <b style="color:red;">市價(吃單)</b> 平倉 ${symbol} 的 ${quantity} 單位嗎？`;
            showConfirmModal(confirmMsg, async (confirmed) => {
                if (confirmed) {
                    const placeOrderFn = apiMode === 'futures' ? placeOrder : placeCopyOrder;
                    displayMessage(`正在以市價送出平倉單...`, 'info', msgDiv);
                    const result = await placeOrderFn(symbol, side, 'MARKET', null, parseFloat(quantity));
                    if (result && result.ok) {
                        displayMessage('市價平倉單已成功送出！', 'success', msgDiv);
                        setTimeout(() => {
                            if (tabFutures.checked) { fetchPositions(); fetchOpenOrders(); }
                            else { fetchCopyPositions(); fetchCopyOpenOrders(); }
                        }, 1500);
                    } else {
                        displayMessage('市價平倉單送出失敗。', 'error', msgDiv);
                    }
                }
            });
        };
    });
    
    containerDiv.querySelectorAll('.limit-close-btn').forEach(button => {
        button.onclick = async () => {
            const { symbol, side, quantity } = button.dataset;
            const msgDiv = apiMode === 'futures' ? messageDiv : copyMessageDiv;

            displayMessage('正在獲取最新價格...', 'info', msgDiv);
            const priceEndpoint = apiMode === 'futures' ? '/api/tickerPrice' : '/api/copytrading/tickerPrice';
            const priceResponse = await apiCall(`${priceEndpoint}?symbol=${symbol}`, 'GET', null, null);
            if (!priceResponse || !priceResponse.price) {
                displayMessage(`無法獲取 ${symbol} 最新價格。`, 'error', msgDiv);
                return;
            }
            const currentPrice = parseFloat(priceResponse.price);

            const priceFilter = exchangeInfo[symbol]?.filters.find(f => f.filterType === 'PRICE_FILTER');
            if (!priceFilter) {
                displayMessage(`無法獲取 ${symbol} 的價格精度資訊。`, 'error', msgDiv);
                return;
            }
            const tickSize = parseFloat(priceFilter.tickSize);
            const pricePrecision = getPricePrecision(symbol);

            let limitPrice;
            if (side === 'SELL') { 
                limitPrice = currentPrice + tickSize;
            } else { 
                limitPrice = currentPrice - tickSize;
            }
            limitPrice = parseFloat(limitPrice.toFixed(pricePrecision));

            const confirmMsg = `您確定要以 <b style="color:blue;">限價 ${limitPrice} (掛單)</b> <br>平倉 ${symbol} 的 ${quantity} 單位嗎？`;
            showConfirmModal(confirmMsg, async (confirmed) => {
                if (confirmed) {
                    const placeOrderFn = apiMode === 'futures' ? placeOrder : placeCopyOrder;
                    displayMessage(`正在以限價 ${limitPrice} 送出平倉單...`, 'info', msgDiv);
                    const result = await placeOrderFn(symbol, side, 'LIMIT', null, parseFloat(quantity), limitPrice);
                    if (result && result.ok) {
                        displayMessage('限價平倉單已成功送出！', 'success', msgDiv);
                        setTimeout(() => {
                            if (tabFutures.checked) { fetchPositions(); fetchOpenOrders(); }
                            else { fetchCopyPositions(); fetchCopyOpenOrders(); }
                        }, 1500);
                    } else {
                         displayMessage('限價平倉單送出失敗。', 'error', msgDiv);
                    }
                }
            });
        };
    });

    containerDiv.querySelectorAll('.set-take-profit-btn').forEach(button => {
        button.onclick = async () => {
            const { symbol, side, quantity, entryprice, apimode, leverage } = button.dataset; 
            const takeProfitPercentage = parseFloat(button.previousElementSibling.value);
            if (isNaN(takeProfitPercentage) || takeProfitPercentage <= 0) {
                displayMessage('請輸入有效的止盈百分比。', 'warning', (apiMode === 'futures' ? messageDiv : copyMessageDiv));
                return;
            }
            const entryPriceNum = parseFloat(entryprice);
            const leverageNum = parseInt(leverage);
            let stopPrice = side === 'SELL' ? entryPriceNum * (1 + (takeProfitPercentage / (100 * leverageNum))) : entryPriceNum * (1 - (takeProfitPercentage / (100 * leverageNum)));
            stopPrice = parseFloat(stopPrice.toFixed(getPricePrecision(symbol)));
            showConfirmModal(`為 ${symbol} 建立止盈單(ROE ${takeProfitPercentage}%)？觸發價: ${stopPrice}`, async (confirmed) => {
                if (confirmed) {
                    const placeOrderFn = apimode === 'futures' ? placeOrder : placeCopyOrder;
                    await placeOrderFn(symbol, side, 'TAKE_PROFIT_MARKET', null, parseFloat(quantity), null, stopPrice);
                }
            });
        };
    });
}


async function handlePlaceOrder(apiMode, side) {
    const isFutures = apiMode === 'futures';
    const symbolInput = isFutures ? symbolSelect : copySymbolSelect;
    const leverageInput = isFutures ? leverageSelect : copyLeverageSelect;
    const marginTypeInput = isFutures ? marginTypeSelect : copyMarginTypeSelect;
    const quantityInputElem = isFutures ? quantityInput : copyQuantityInput;
    const msgDiv = isFutures ? messageDiv : copyMessageDiv;
    
    const setLeverageFn = isFutures ? setLeverage : setCopyLeverage;
    const changeMarginFn = isFutures ? changeMarginType : changeCopyMarginType;
    const placeOrderFn = isFutures ? placeOrder : placeCopyOrder;

    const symbol = symbolInput.value.trim().toUpperCase();
    const leverage = parseInt(leverageInput.value);
    const marginType = marginTypeInput.value;
    const marginAmount = parseFloat(quantityInputElem.value);

    if (!symbol || !exchangeInfo[symbol]) {
        displayMessage('請選擇或輸入一個有效的合約代碼。', 'error', msgDiv);
        return;
    }
    if (isNaN(marginAmount) || marginAmount <= 0) {
        displayMessage('請輸入有效的保證金金額。', 'error', msgDiv);
        return;
    }

    const leveragedValue = marginAmount * leverage;
    
    const confirmMsg = `您確定要下單嗎？<br><br>
                      合約: <b>${symbol}</b><br>
                      方向: <b>${side === 'BUY' ? '開多' : '開空'}</b><br>
                      槓桿: <b>${leverage}x</b><br>
                      模式: <b>${marginType === 'ISOLATED' ? '逐倉' : '全倉'}</b><br>
                      保證金: <b>${marginAmount.toFixed(2)} USDT</b><br>
                      合約價值: <b>≈${leveragedValue.toFixed(2)} USDT</b>`;
    
    showConfirmModal(confirmMsg, async (confirmed) => {
        if (!confirmed) return;

        try {
            displayMessage(`(1/3) 正在設定槓桿為 ${leverage}x...`, 'info', msgDiv);
            const leverageResult = await setLeverageFn(symbol, leverage);
            if (!leverageResult.ok) throw new Error('設定槓桿失敗，請檢查API權限或網路。');

            displayMessage(`(2/3) 正在設定保證金模式為 ${marginType}...`, 'info', msgDiv);
            const marginResult = await changeMarginFn(symbol, marginType);
            
            if (!marginResult.ok && marginResult.code !== -4046) {
                throw new Error(`設定保證金模式失敗: ${marginResult?.msg || '未知錯誤'}`);
            }
            if(marginResult.code === -4046){
                console.log('保證金模式無需變更，繼續執行。');
            }
            
            displayMessage(`(3/3) 正在下單...`, 'info', msgDiv);
            const orderResult = await placeOrderFn(symbol, side, 'MARKET', leveragedValue);
            if (!orderResult.ok) throw new Error(`下單失敗: ${orderResult?.msg || '請檢查餘額或API權限。'}`);

            displayMessage(`訂單成功送出！`, 'success', msgDiv);

        } catch (error) {
            console.error('下單流程中斷:', error);
            displayMessage(`操作失敗: ${error.message}`, 'error', msgDiv);
        }
    });
}

// --- 事件監聽器 ---

buyButton.addEventListener('click', () => handlePlaceOrder('futures', 'BUY'));
sellButton.addEventListener('click', () => handlePlaceOrder('futures', 'SELL'));
copyBuyButton.addEventListener('click', () => handlePlaceOrder('copytrading', 'BUY'));
copySellButton.addEventListener('click', () => handlePlaceOrder('copytrading', 'SELL'));


refreshPositionsButton.addEventListener('click', fetchPositions);
refreshOpenOrdersButton.addEventListener('click', fetchOpenOrders);
cancelAllOpenOrdersButton.addEventListener('click', () => cancelAllOpenOrders(symbolSelect.value.toUpperCase(), '/api'));
copyRefreshPositionsButton.addEventListener('click', fetchCopyPositions);
copyRefreshOpenOrdersButton.addEventListener('click', fetchCopyOpenOrders);
copyCancelAllOpenOrdersButton.addEventListener('click', () => cancelAllOpenOrders(copySymbolSelect.value.toUpperCase(), '/api/copytrading'));

// --- 即時更新相關 ---

async function updateTickerPrice() {
    let symbol, targetDiv, apiEndpoint;
    if (tabFutures.checked) {
        symbol = symbolSelect.value.toUpperCase();
        targetDiv = futuresPriceDiv;
        apiEndpoint = '/api/tickerPrice';
    } else {
        symbol = copySymbolSelect.value.toUpperCase();
        targetDiv = copyPriceDiv;
        apiEndpoint = '/api/copytrading/tickerPrice';
    }
    if (!symbol || !exchangeInfo[symbol]) {
        targetDiv.textContent = '-- USDT';
        return;
    }
    const priceResponse = await apiCall(`${apiEndpoint}?symbol=${symbol}`, 'GET', null, null);
    if (priceResponse && priceResponse.ok) {
        let oldPrice = parseFloat(targetDiv.textContent) || 0;
        let newPrice = parseFloat(priceResponse.price);
        targetDiv.textContent = `${newPrice.toFixed(getPricePrecision(symbol))} USDT`;
        if (newPrice > oldPrice) targetDiv.style.color = '#28a745';
        else if (newPrice < oldPrice) targetDiv.style.color = '#dc3545';
    } else {
        targetDiv.textContent = '獲取失敗';
    }
}

function handleSymbolChange() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    updateTickerPrice();
    priceUpdateInterval = setInterval(updateTickerPrice, 2000);
}

async function updateAccountBalances() {
    const futuresBalanceData = await apiCall('/api/getBalance', 'GET', null, null);
    if (futuresBalanceData && futuresBalanceData.ok && Array.isArray(futuresBalanceData)) {
        const usdtBalance = futuresBalanceData.find(asset => asset.asset === 'USDT');
        futuresBalanceSpan.textContent = usdtBalance ? parseFloat(usdtBalance.availableBalance).toFixed(2) : 'N/A';
    } else {
        futuresBalanceSpan.textContent = '錯誤';
    }
    const copyBalanceData = await apiCall('/api/copytrading/getBalance', 'GET', null, null);
    if (copyBalanceData && copyBalanceData.ok && Array.isArray(copyBalanceData)) {
        const usdtBalance = copyBalanceData.find(asset => asset.asset === 'USDT');
        copyBalanceSpan.textContent = usdtBalance ? parseFloat(usdtBalance.availableBalance).toFixed(2) : 'N/A';
    } else {
        copyBalanceSpan.textContent = '錯誤';
    }
}

function updateLeveragedValue() {
    const margin = parseFloat(quantityInput.value);
    const leverage = parseInt(leverageSelect.value);
    if (!isNaN(margin) && !isNaN(leverage) && margin > 0) {
        const leveragedValue = margin * leverage;
        futuresLeveragedValueDiv.textContent = leveragedValue.toFixed(2) + ' USDT';
    } else {
        futuresLeveragedValueDiv.textContent = '-- USDT';
    }

    const copyMargin = parseFloat(copyQuantityInput.value);
    const copyLeverage = parseInt(copyLeverageSelect.value);
    if (!isNaN(copyMargin) && !isNaN(copyLeverage) && copyMargin > 0) {
        const copyLeveragedValue = copyMargin * copyLeverage;
        copyLeveragedValueDiv.textContent = copyLeveragedValue.toFixed(2) + ' USDT';
    } else {
        copyLeveragedValueDiv.textContent = '-- USDT';
    }
}

function setupTab(isFutures) {
    futuresContent.classList.toggle('active', isFutures);
    copytradingContent.classList.toggle('active', !isFutures);
    if (isFutures) {
        fetchPositions();
        fetchOpenOrders();
    } else {
        fetchCopyPositions();
        fetchCopyOpenOrders();
    }
    handleSymbolChange();
    updateLeveragedValue(); 
}

tabFutures.addEventListener('change', () => setupTab(true));
tabCopytrading.addEventListener('change', () => setupTab(false));


function startRealtimeUpdates() {
    setInterval(() => {
        if (tabFutures.checked) {
            fetchPositions();
            fetchOpenOrders();
        } else {
            fetchCopyPositions();
            fetchCopyOpenOrders();
        }
        updateAccountBalances();
    }, 10000); 
}

// [新增] 交易紀錄相關函式
async function fetchTradeHistory() {
    historyMessageDiv.textContent = '查詢中...';
    tradeHistoryList.innerHTML = '';

    const apiMode = historyTabFutures.checked ? 'futures' : 'copytrading';
    const apiEndpoint = apiMode === 'futures' ? '/api/getTradeHistory' : '/api/copytrading/getTradeHistory';
    
    // 將日期轉換為 Unix 時間戳 (毫秒)
    const startDate = new Date(historyStartDateInput.value);
    startDate.setHours(0, 0, 0, 0); // 設定為當天 00:00:00
    const startTime = startDate.getTime();

    const endDate = new Date(historyEndDateInput.value);
    endDate.setHours(23, 59, 59, 999); // 設定為當天 23:59:59
    const endTime = endDate.getTime();

    if (isNaN(startTime) || isNaN(endTime)) {
        historyMessageDiv.textContent = '請選擇有效的日期範圍。';
        return;
    }
    
    const result = await apiCall(`${apiEndpoint}?startTime=${startTime}&endTime=${endTime}`, 'GET', null, null);

    if (result && result.ok && Array.isArray(result)) {
        renderTradeHistory(result);
        historyMessageDiv.textContent = `共查詢到 ${result.length} 筆交易。`;
    } else {
        tradeHistoryList.innerHTML = '<li>查詢失敗或沒有紀錄。</li>';
        historyMessageDiv.textContent = `查詢失敗: ${result?.msg || '未知錯誤'}`;
    }
}

function renderTradeHistory(trades) {
    if (trades.length === 0) {
        tradeHistoryList.innerHTML = '<li>此範圍內沒有交易紀錄。</li>';
        return;
    }

    // 依時間倒序排序 (API 回傳的是正序)
    trades.reverse();

    let listHtml = '';
    trades.forEach(trade => {
        const tradeTime = new Date(trade.time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        const pnl = parseFloat(trade.realizedPnl);
        const commission = parseFloat(trade.commission);
        const netPnl = pnl - commission;
        const pnlColor = netPnl >= 0 ? 'green' : 'red';
        const sideColor = trade.buyer ? 'green' : 'red'; // 買方為綠

        listHtml += `
            <li>
                <div class="trade-header">
                    <span class="trade-symbol">${trade.symbol}</span>
                    <span class="trade-pnl" style="color: ${pnlColor};">
                        ${netPnl.toFixed(4)} USDT
                    </span>
                </div>
                <div class="trade-info">
                    <span class="trade-label">方向:</span>
                    <span class="trade-value" style="color: ${sideColor}; font-weight: bold;">
                        ${trade.buyer ? '買入' : '賣出'} ${trade.maker ? '(掛單)' : '(吃單)'}
                    </span>
                </div>
                 <div class="trade-info">
                    <span class="trade-label">時間:</span>
                    <span class="trade-value trade-time">${tradeTime}</span>
                </div>
                <div class="trade-info">
                    <span class="trade-label">價格:</span>
                    <span class="trade-value">${parseFloat(trade.price).toFixed(getPricePrecision(trade.symbol))}</span>
                </div>
                 <div class="trade-info">
                    <span class="trade-label">數量:</span>
                    <span class="trade-value">${parseFloat(trade.qty)}</span>
                </div>
                 <div class="trade-info">
                    <span class="trade-label">手續費:</span>
                    <span class="trade-value">${commission.toFixed(4)} ${trade.commissionAsset}</span>
                </div>
                <div class="trade-info">
                    <span class="trade-label">實現盈虧:</span>
                    <span class="trade-value">${pnl.toFixed(4)}</span>
                </div>
            </li>
        `;
    });
    tradeHistoryList.innerHTML = listHtml;
}


document.addEventListener('DOMContentLoaded', async () => {
    // 初始化 Datepicker
    const datepicker_start = new Datepicker(historyStartDateInput, {
        autohide: true,
        format: 'yyyy-mm-dd',
        language: 'zh-TW',
    });
    const datepicker_end = new Datepicker(historyEndDateInput, {
        autohide: true,
        format: 'yyyy-mm-dd',
        language: 'zh-TW',
    });

    // 設定預設日期
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    datepicker_start.setDate(yesterday);
    datepicker_end.setDate(today);


    loadFavorites();
    renderFavorites();

    await fetchExchangeInfo();
    updateAccountBalances(); 
    
    // 我的最愛面板事件
    favoritesToggleBtn.addEventListener('click', () => {
        favoritesPanel.classList.toggle('collapsed');
        document.body.classList.toggle('favorites-collapsed');
    });
    addFavoriteBtn.addEventListener('click', addFavorite);
    favoriteSymbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addFavorite();
    });
    favoritesList.addEventListener('click', (e) => {
        const target = e.target;
        const symbol = target.closest('li')?.dataset.symbol;
        if (target.closest('.remove-favorite-btn')) {
            const symbolToRemove = target.closest('.remove-favorite-btn').dataset.symbol;
            favorites = favorites.filter(s => s !== symbolToRemove);
            saveFavorites();
            renderFavorites();
        } else if (symbol) {
            const targetInput = tabFutures.checked ? symbolSelect : copySymbolSelect;
            targetInput.value = symbol;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // [新增] 交易紀錄面板事件
    historyToggleBtn.addEventListener('click', () => {
        historyPanel.classList.toggle('collapsed');
        document.body.classList.toggle('history-collapsed');
    });
    queryHistoryBtn.addEventListener('click', fetchTradeHistory);
    historyTabFutures.addEventListener('change', fetchTradeHistory);
    historyTabCopytrading.addEventListener('change', fetchTradeHistory);


    // 交易對選擇框事件
    symbolSelect.addEventListener('input', handleSymbolChange);
    copySymbolSelect.addEventListener('input', handleSymbolChange);

    // 保證金與槓桿輸入事件
    quantityInput.addEventListener('input', updateLeveragedValue);
    leverageSelect.addEventListener('change', updateLeveragedValue);
    copyQuantityInput.addEventListener('input', updateLeveragedValue);
    copyLeverageSelect.addEventListener('change', updateLeveragedValue);
    
    setupTab(tabFutures.checked);
    startRealtimeUpdates();
    updateLeveragedValue(); 
    fetchTradeHistory(); // 首次載入時查詢一次交易紀錄
});
