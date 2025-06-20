import os
import time
import hmac
import hashlib
import requests
import json
import threading
from urllib.parse import urlencode
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# 從 .env 檔案加載環境變數
load_dotenv()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False # 確保 JSON 回應支持中文顯示

# --- Binance API 設定 ---
# U本位合約 API Keys
FUTURES_API_KEY = os.getenv('BINANCE_FUTURES_API_KEY')
FUTURES_SECRET_KEY = os.getenv('BINANCE_FUTURES_SECRET_KEY')

# 跟單模式 API Keys
COPYTRADING_API_KEY = os.getenv('BINANCE_COPYTRADING_API_KEY')
COPYTRADING_SECRET_KEY = os.getenv('BINANCE_COPYTRADING_SECRET_KEY')

FAPI_BASE_URL = 'https://fapi.binance.com'

# 檢查 API Keys 是否已設定
if not all([FUTURES_API_KEY, FUTURES_SECRET_KEY, COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY]):
    raise ValueError("請在 .env 檔案中設定所有必要的幣安 API Keys")

# 時間偏移量，用於同步本地時間與幣安伺服器時間
time_offset = 0
# 交易所資訊快取
exchange_info_cache = {}

# --- 輔助函式 ---

def get_binance_server_time():
    """獲取幣安伺服器時間並計算與本地時間的偏移量"""
    global time_offset
    print("正在與幣安伺服器同步時間...")
    try:
        # 增加超時設定
        response = requests.get(f"{FAPI_BASE_URL}/fapi/v1/time", timeout=5)
        response.raise_for_status()
        server_time = response.json()['serverTime']
        local_time = int(time.time() * 1000)
        time_offset = server_time - local_time
        print(f"與幣安伺服器時間同步成功。偏移量: {time_offset}ms")
    except requests.exceptions.RequestException as e:
        print(f"獲取幣安伺服器時間失敗: {e}")
        # 拋出異常，讓呼叫者處理
        raise e

def sync_time_periodically():
    """在背景定期同步時間"""
    while True:
        # 每 30 分鐘同步一次 (1800 秒)
        time.sleep(1800)
        try:
            get_binance_server_time()
        except Exception as e:
            print(f"背景時間同步失敗: {e}")

def generate_signature(query_string, secret_key):
    """生成 HMAC SHA256 簽名"""
    return hmac.new(secret_key.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()

def handle_api_error(e, message):
    """統一處理 API 錯誤"""
    if isinstance(e, requests.exceptions.HTTPError):
        try:
            error_response = e.response.json()
            error_msg = error_response.get('msg', '未知錯誤')
            error_code = error_response.get('code', -1)
            return jsonify({"code": error_code, "msg": f"{message}: {error_msg}"}), e.response.status_code
        except json.JSONDecodeError:
            return jsonify({"code": -1, "msg": f"{message}: API 返回無效 JSON，狀態碼 {e.response.status_code}"}), e.response.status_code
    return jsonify({"code": -1, "msg": f"{message}: {str(e)}"}), 500

def get_exchange_info():
    """從幣安獲取並快取期貨交易對資訊"""
    global exchange_info_cache
    if not exchange_info_cache:
        print("正在從幣安獲取交易對資訊...")
        try:
            response = requests.get(f"{FAPI_BASE_URL}/fapi/v1/exchangeInfo")
            response.raise_for_status()
            data = response.json()
            exchange_info_cache = {s['symbol']: s for s in data['symbols']}
            print(f"已加載 {len(exchange_info_cache)} 個交易對資訊。")
        except requests.exceptions.RequestException as e:
            print(f"獲取交易對資訊失敗: {e}")
    return exchange_info_cache

def get_decimal_precision(num_str):
    """從字串獲取小數精度"""
    try:
        if '.' in num_str:
            return len(num_str.split('.')[1].rstrip('0'))
    except (ValueError, IndexError):
        pass
    return 0

def make_api_request(endpoint, method, params, api_key, secret_key):
    """發送簽名的 API 請求"""
    params['timestamp'] = int(time.time() * 1000) + time_offset
    params['recvWindow'] = 60000
    
    query_string = urlencode(params)
    signature = generate_signature(query_string, secret_key)
    query_string += f"&signature={signature}"
    
    headers = {'X-MBX-APIKEY': api_key}
    url = f"{FAPI_BASE_URL}{endpoint}?{query_string}"
    
    try:
        if method == 'POST':
            response = requests.post(url, headers=headers)
        elif method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError("不支援的 HTTP 方法")
            
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return handle_api_error(e, f"API 請求失敗: {endpoint}")

# --- Flask 路由 ---

@app.route('/')
def index():
    """渲染主頁面"""
    return render_template('index.html')

@app.route('/api/exchangeInfo', methods=['GET'])
def get_exchange_info_route():
    """提供交易對資訊給前端"""
    return jsonify(get_exchange_info())

def get_ticker_price(symbol):
    """獲取指定交易對的最新價格"""
    try:
        response = requests.get(f"{FAPI_BASE_URL}/fapi/v1/ticker/price?symbol={symbol}")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return handle_api_error(e, f"獲取 {symbol} 最新價格失敗")

@app.route('/api/tickerPrice', methods=['GET'])
def get_ticker_price_futures():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"code": -1, "msg": "缺少 symbol 參數"}), 400
    return get_ticker_price(symbol)

@app.route('/api/copytrading/tickerPrice', methods=['GET'])
def get_ticker_price_copytrading():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"code": -1, "msg": "缺少 symbol 參數"}), 400
    return get_ticker_price(symbol)

def set_leverage_logic(data, api_key, secret_key):
    symbol = data.get('symbol')
    leverage = data.get('leverage')
    if not symbol or not leverage:
        return jsonify({"code": -1, "msg": "缺少 symbol 或 leverage 參數"}), 400
    params = {'symbol': symbol, 'leverage': leverage}
    return make_api_request('/fapi/v1/leverage', 'POST', params, api_key, secret_key)

@app.route('/api/setLeverage', methods=['POST'])
def set_leverage():
    return set_leverage_logic(request.get_json(), FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/setLeverage', methods=['POST'])
def copytrading_set_leverage():
    return set_leverage_logic(request.get_json(), COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

def change_margin_type_logic(data, api_key, secret_key):
    symbol = data.get('symbol')
    margin_type = data.get('marginType')
    if not symbol or not margin_type:
        return jsonify({"code": -1, "msg": "缺少 symbol 或 marginType 參數"}), 400
    params = {'symbol': symbol, 'marginType': margin_type}
    return make_api_request('/fapi/v1/marginType', 'POST', params, api_key, secret_key)

@app.route('/api/changeMarginType', methods=['POST'])
def change_margin_type():
    return change_margin_type_logic(request.get_json(), FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/changeMarginType', methods=['POST'])
def copytrading_change_margin_type():
    return change_margin_type_logic(request.get_json(), COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

def place_order_logic(data, api_key, secret_key):
    symbol = data.get('symbol')
    side = data.get('side')
    order_type = data.get('type', 'MARKET')
    
    if not symbol or not side:
        return jsonify({"code": -1, "msg": "缺少 symbol 或 side 參數"}), 400

    info = get_exchange_info().get(symbol)
    if not info:
        return jsonify({"code": -1, "msg": "無效的交易對符號"}), 400
        
    params = {'symbol': symbol, 'side': side, 'type': order_type}

    # 處理精度
    quantity_precision = get_decimal_precision(next((f['stepSize'] for f in info['filters'] if f['filterType'] == 'LOT_SIZE'), '1'))
    price_precision = get_decimal_precision(next((f['tickSize'] for f in info['filters'] if f['filterType'] == 'PRICE_FILTER'), '0.01'))

    # 計算數量
    quantity_usdt = data.get('quantity_usdt')
    quantity_contract = data.get('quantity_contract')
    final_quantity = 0.0

    if quantity_contract is not None:
        final_quantity = float(quantity_contract)
    elif quantity_usdt is not None:
        price_data = get_ticker_price(symbol)
        if isinstance(price_data, tuple): # 處理錯誤情況
            return price_data
        current_price = float(price_data['price'])
        if current_price > 0:
            final_quantity = float(quantity_usdt) / current_price
    
    if final_quantity <= 0:
        return jsonify({"code": -1, "msg": "委託數量必須大於零"}), 400

    params['quantity'] = f"{final_quantity:.{quantity_precision}f}"

    # 處理價格和觸發價
    price = data.get('price')
    stop_price = data.get('stopPrice')

    if order_type in ['LIMIT', 'TAKE_PROFIT', 'STOP']:
        if price is None:
            return jsonify({"code": -1, "msg": f"訂單類型 {order_type} 缺少 price 參數"}), 400
        params['price'] = f"{float(price):.{price_precision}f}"
        if order_type == 'LIMIT':
            params['timeInForce'] = 'GTC'
    
    if order_type in ['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'TAKE_PROFIT', 'STOP']:
        if stop_price is None:
            return jsonify({"code": -1, "msg": f"訂單類型 {order_type} 缺少 stopPrice 參數"}), 400
        params['stopPrice'] = f"{float(stop_price):.{price_precision}f}"
        if order_type in ['TAKE_PROFIT_MARKET', 'STOP_MARKET']:
            params['closePosition'] = 'true'

    return make_api_request('/fapi/v1/order', 'POST', params, api_key, secret_key)


@app.route('/api/placeOrder', methods=['POST'])
def place_order():
    return place_order_logic(request.get_json(), FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/placeOrder', methods=['POST'])
def copytrading_place_order():
    return place_order_logic(request.get_json(), COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

def get_positions_logic(api_key, secret_key):
    return make_api_request('/fapi/v2/positionRisk', 'GET', {}, api_key, secret_key)

@app.route('/api/getPositions', methods=['GET'])
def get_positions():
    return get_positions_logic(FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/getPositions', methods=['GET'])
def copytrading_get_positions():
    return get_positions_logic(COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

# [修改] 修正 get_open_orders_logic 來處理大整數 OrderID
def get_open_orders_logic(symbol, api_key, secret_key):
    """獲取當前委託，並將 orderId 轉為字串以防前端精度丟失"""
    params = {}
    if symbol:
        params['symbol'] = symbol
    
    # 複製 make_api_request 的核心邏輯以便攔截和修改回傳資料
    params['timestamp'] = int(time.time() * 1000) + time_offset
    params['recvWindow'] = 60000
    
    query_string = urlencode(params)
    signature = generate_signature(query_string, secret_key)
    query_string += f"&signature={signature}"
    
    headers = {'X-MBX-APIKEY': api_key}
    url = f"{FAPI_BASE_URL}/fapi/v1/openOrders?{query_string}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        orders = response.json()
        if isinstance(orders, list):
            for order in orders:
                if 'orderId' in order:
                    order['orderId'] = str(order['orderId']) # 轉為字串
        return jsonify(orders)
        
    except requests.exceptions.RequestException as e:
        return handle_api_error(e, "獲取當前委託失敗")
    except json.JSONDecodeError:
        return jsonify({"code": -1, "msg": "獲取當前委託失敗: API 返回無效 JSON"}), 500

@app.route('/api/getOpenOrders', methods=['GET'])
def get_open_orders():
    symbol = request.args.get('symbol')
    return get_open_orders_logic(symbol, FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/getOpenOrders', methods=['GET'])
def copytrading_get_open_orders():
    symbol = request.args.get('symbol')
    return get_open_orders_logic(symbol, COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

def cancel_all_open_orders_logic(symbol, api_key, secret_key):
    if not symbol:
        return jsonify({"code": -1, "msg": "缺少 symbol 參數"}), 400
    params = {'symbol': symbol}
    return make_api_request('/fapi/v1/allOpenOrders', 'DELETE', params, api_key, secret_key)

@app.route('/api/cancelAllOpenOrders', methods=['DELETE'])
def cancel_all_open_orders():
    symbol = request.args.get('symbol')
    return cancel_all_open_orders_logic(symbol, FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/cancelAllOpenOrders', methods=['DELETE'])
def copytrading_cancel_all_open_orders():
    symbol = request.args.get('symbol')
    return cancel_all_open_orders_logic(symbol, COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

# [修改] 修正撤銷單筆委託的邏輯
def cancel_order_logic(api_key, secret_key):
    """撤銷一筆指定的委託單"""
    symbol = request.args.get('symbol')
    order_id = request.args.get('orderId')
    if not symbol or not order_id:
        return jsonify({"code": -1, "msg": "缺少 symbol 或 orderId 參數"}), 400
    
    # 直接使用前端傳來的字串 orderId，不再轉換為整數
    params = {'symbol': symbol, 'orderId': order_id} 
    return make_api_request('/fapi/v1/order', 'DELETE', params, api_key, secret_key)

@app.route('/api/cancelOrder', methods=['DELETE'])
def cancel_order():
    return cancel_order_logic(FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/cancelOrder', methods=['DELETE'])
def copytrading_cancel_order():
    return cancel_order_logic(COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

def get_balance_logic(api_key, secret_key):
    """獲取帳戶餘額"""
    return make_api_request('/fapi/v2/balance', 'GET', {}, api_key, secret_key)

@app.route('/api/getBalance', methods=['GET'])
def get_futures_balance():
    return get_balance_logic(FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/getBalance', methods=['GET'])
def get_copytrading_balance():
    return get_balance_logic(COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)

def get_trade_history_logic(api_key, secret_key):
    """獲取指定時間範圍內的帳戶成交歷史"""
    start_time = request.args.get('startTime')
    end_time = request.args.get('endTime')
    
    params = {}
    if start_time:
        params['startTime'] = int(start_time)
    if end_time:
        params['endTime'] = int(end_time)
    params['limit'] = 1000
    
    return make_api_request('/fapi/v1/userTrades', 'GET', params, api_key, secret_key)

@app.route('/api/getTradeHistory', methods=['GET'])
def get_futures_trade_history():
    return get_trade_history_logic(FUTURES_API_KEY, FUTURES_SECRET_KEY)

@app.route('/api/copytrading/getTradeHistory', methods=['GET'])
def get_copytrading_trade_history():
    return get_trade_history_logic(COPYTRADING_API_KEY, COPYTRADING_SECRET_KEY)


if __name__ == '__main__':
    # --- 啟動程序 ---
    
    # 1. 啟動時同步時間，如果失敗則重試
    max_retries = 5
    retry_delay = 5 # seconds
    for i in range(max_retries):
        try:
            get_binance_server_time()
            break # 成功則跳出循環
        except Exception as e:
            print(f"時間同步失敗 (第 {i+1}/{max_retries} 次嘗試)。將在 {retry_delay} 秒後重試...")
            if i == max_retries - 1:
                print("無法與幣安伺服器同步時間，應用程式即將結束。請檢查您的網路連線或防火牆設定。")
                exit()
            time.sleep(retry_delay)

    # 2. 獲取交易所資訊
    with app.app_context():
        get_exchange_info()
    
    # 3. 啟動背景時間同步執行緒
    sync_thread = threading.Thread(target=sync_time_periodically)
    sync_thread.daemon = True # 讓主程式結束時，執行緒也跟著結束
    sync_thread.start()

    # 4. 啟動 Flask 應用
    app.run(debug=True, host='0.0.0.0', port=5000)

