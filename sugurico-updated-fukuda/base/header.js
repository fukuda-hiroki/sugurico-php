// header.js

'use strict';

// --- Supabaseクライアントの初期化 ---
// ★ この初期化コードは、複数のJSファイルで共通して使うので、
// ★ 本来は一つの共通ファイルにまとめるのがベストです。
const SUPABASE_URL = 'https://ahyayuewvlbgrpkuxhvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWF5dWV3dmxiZ3Jwa3V4aHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzQxNDgsImV4cCI6MjA2OTI1MDE0OH0.C3VoRGUdUxOIjUoAR4Hx2OLGpBy_5B0KSuuOqOu-arQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/**
 * ページのヘッダー フッターを動的に生成・表示する関数
 */
async function setupHeaderAndFooter() {

    const notificationBar = document.createElement('div');
    notificationBar.id = 'premium-notification-bar';
    notificationBar.style.display = 'none';
    document.body.prepend(notificationBar);


    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');

    if (!headerContainer || !footerContainer) {
        console.warn('header-containerまたはfooter-containerが見つかりません。');
        return;
    }

    // --- ログイン状態を取得 ---
    const { data: { session } } = await supabaseClient.auth.getSession();

    let navHTML = '';// ナビゲーション部分のHTML

    if (session && session.user) {
        await checkAndShowPremiumNotification(session.user);
        // 【ログインしている場合のナビゲーション】
        const userName = session.user.user_metadata?.user_name || 'ゲスト';
        navHTML = `
            <a href="../../ログイン系/html/mypage.html">${escapeHTML(userName)}さん</a>
            <a href="#" id="logout-button">ログアウト</a>
        `;

    } else {
        // 【ログインしていない場合のナビゲーション】
        navHTML = `
            <a href="../../ログイン系/html/login.html">ログイン</a>
            <a href="../../ログイン系/html/register.html">新規登録</a>
        `;
    }

    const headerHTML = `
        <div class="header-logo">
            <h1><a href="../../メイン系/html/index.html">スグリコ</a></h1>
        </div>

        <div class="search-form-container">
            <form action="../../メイン系/html/search.html" method="get">
                <input type="text" name="keyword" placeholder="キーワード検索...">
                <select name="type">
                    <option value="title">タイトル</option>
                    <option value="text">テキスト</option>
                    <option value="tag">タグ</option>
                </select>
                <button type="submit">検索</button>
            </form>
        </div>

        <nav class="header-nav">
            ${navHTML}
        </nav>
    `;

    // 生成したHTMLをヘッダーコンテナに挿入
    headerContainer.innerHTML = headerHTML;

    // フッターのHTMLを設定
    footerContainer.innerHTML = `<p>&copy; 2025 スグリコ. All Rights Reserved.</p>`;

    // --- ログアウトボタンのイベントリスナー設定 ---
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('ログアウトエラー:', error.message);
                alert('ログアウトに失敗しました。');
            } else {
                window.location.href = '../..//メイン系/html/index.html';
            }
        });
    }
}

async function checkAndShowPremiumNotification(user) {
    try {
        const { data: premium, error } = await supabaseClient
            .from('premium')
            .select('status, limit_date')
            .eq('id', user.id)
            .maybeSingle();
        if (error || !premium || premium.status !== 'active') {
            return; // プレミアム会員でないか、アクティブでなければ何もしない
        }

        const limitDate = new Date(premium.limit_date);
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        // --- 期限が、"現在" と "7日後" の間にあるかをチェック ---
        if (limitDate > now && limitDate < sevenDaysFromNow) {
            // --- 今日すでに通知を表示したかチェック ---
            const lastShownKey = `premium_notify_${user.id}`;
            const lastShownTimestamp = localStorage.getItem(lastShownKey);
            const today = new Date().toLocaleDateString();// "2025/8/1" のような日付文字列を取得

            if (lastShownTimestamp === today) {
                return;// 今日すでに表示済みなら何もしない
            }
            const notificationBar = document.getElementById('premium-notification-bar');
            const daysLeft = Math.ceil((limitDate - now) / (1000 * 60 * 60 * 24));

            notificationBar.innerHTML = `
            
                <p>プレミアム会員の有効期限が近づいています。あと${daysLeft}日で自動更新されます。
                   <a href="../../ログイン系/html/premium_edit.html">会員情報の確認・変更はこちら</a>
                </p>
                <button id="close-notification-button">&times;</button>
            `;
            notificationBar.style.display = 'flex';

            // --- 通知を閉じる処理 ---
            document.getElementById('close-notification-button').addEventListener('click', () => {
                notificationBar.style.display = 'none';
                localStorage.setItem(lastShownKey, today);
            });
        }

    } catch (error) {
        console.error('プレミアム通知のチェック中にエラー:', error);
    }
}

/**
 * XSS対策のためのHTMLエスケープ関数
 */
function escapeHTML(str) {
    // もしstrがnullやundefinedなら、空文字列を返す
    if (str === null || str === undefined) {
        return '';
    }
    // 文字列でなければ、文字列に変換する
    if (typeof str !== 'string') {
        str = String(str);
    }

    return str.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": "'"
        }[match];
    });
}

/**
 * ログイン中のユーザーが有効なプレミアム会員か判定する共通関数
 * @returns {Promise<boolean>} プレミアムならtrue, それ以外はfalse
 */
async function isCurrentUserPremium() {
    // Supabaseクライアントはheader.jsで既に初期化済み
    
    // 1. 現在のログインユーザー情報を取得
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 2. ログインしていなければプレミアムではない
    if (!user) {
        return false;
    }

    // 3. 'premium'テーブルからユーザーの情報を取得
    const { data: premium, error } = await supabaseClient
        .from('premium')
        .select('status, limit_date')
        .eq('id', user.id)
        .single();

    if (error || !premium) {
        // レコードが存在しない、または取得時にエラーが発生した場合
        return false;
    }

    // 4. ステータスが 'active' で、かつ有効期限が切れていないかチェック
    const isActive = premium.status === 'active';
    const isNotExpired = new Date(premium.limit_date) > new Date();

    return isActive && isNotExpired;
}

// --- 関数の実行 ---
setupHeaderAndFooter();
