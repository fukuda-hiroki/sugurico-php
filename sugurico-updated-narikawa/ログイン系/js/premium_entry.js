'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // --- HTML要素の取得 ---
    // 新しく追加したエリア
    const introductionSection = document.getElementById('introduction-section');
    const registrationFormSection = document.getElementById('registration-form-section');
    const proceedToRegisterButton = document.getElementById('proceed-to-register-button');
    const introMessageArea = document.getElementById('intro-message-area');

    // 既存の登録手続き関連エリア
    const passwordAuthSection = document.getElementById('password-auth-section');
    const paymentSection = document.getElementById('payment-section');
    const passwordInput = document.getElementById('password-input');
    const authButton = document.getElementById('auth-button');
    const authMessageArea = document.getElementById('auth-message-area');
    const subscribeButton = document.getElementById('subscribe-button');
    const planSelect = document.getElementById('plan-select');
    const subscriptionStatus = document.getElementById('subscription-status');

    let currentUser;

    /**
     * ページの初期化処理
     */
    async function initializePage() {
        // ログインユーザー情報を取得
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentUser = user;

        if (currentUser) {
            // --- ログインしている場合 ---
            // 1. 既にプレミアム会員なら、編集ページにリダイレクト
            await checkPremiumStatusAndRedirect();
            // 2. 認証失敗によるロック状態かチェック
            checkLockStatus();
        }

        // イベントリスナーを常に設定
        setupEventListeners();
    }

    /**
     * イベントリスナーをまとめて設定する関数
     */
    function setupEventListeners() {
        // [登録手続きに進む]ボタン
        proceedToRegisterButton.addEventListener('click', async () => {
            // ボタンクリック時に改めてログイン状態をチェック
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                // ログイン済みなら、エリアを切り替える
                introductionSection.style.display = 'none';
                registrationFormSection.style.display = 'block';
            } else {
                // 未ログインなら、ログインを促してリダイレクト
                showMessage(introMessageArea, 'お手続きにはログインが必要です。ログインページに移動します。', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        });

        // [認証する]ボタン
        authButton.addEventListener('click', handlePasswordAuth);

        // [この内容で登録する]ボタン
        subscribeButton.addEventListener('click', handleSubscription);
    }

    /**
     * 既にプレミアム会員であれば、会員情報ページにリダイレクトする
     */
    async function checkPremiumStatusAndRedirect() {
        if (!currentUser) return;

        const { data: premiumRecords, error } = await supabaseClient
            .from('premium')
            .select('status')
            .eq('id', currentUser.id);

        if (error) {
            console.error('プレミアム状態のチェックに失敗:', error);
            return;
        }

        const premiumStatus = premiumRecords && premiumRecords[0];

        if (premiumStatus && premiumStatus.status === 'active') {
            // 既にアクティブな会員は、アラートなしで編集ページに移動させる
            window.location.href = 'premium_edit.html';
        }
    }


    // =================================================================
    //  既存のロジック (本人確認、支払い処理など) - 大きな変更はありません
    // =================================================================

    /**
     * パスワードによる本人確認の処理
     */
    async function handlePasswordAuth() {
        const password = passwordInput.value;
        if (!password) {
            showMessage(authMessageArea, 'パスワードを入力してください。', 'error');
            return;
        }

        // ログイン中のユーザーのメールアドレスを使ってパスワード認証
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });

        if (error) {
            handleAuthFailure(); // 認証失敗
        } else {
            handleAuthSuccess(); // 認証成功
        }
    }

    /**
     * 認証成功時の処理
     */
    function handleAuthSuccess() {
        // 失敗カウントをリセット
        localStorage.removeItem(`auth_fails_${currentUser.id}`);
        // 画面を切り替え
        passwordAuthSection.style.display = 'none';
        paymentSection.style.display = 'block';
    }

    /**
     * 認証失敗・ロック関連の処理
     */
    function handleAuthFailure() {
        const failKey = `auth_fails_${currentUser.id}`;
        const lockKey = `auth_lock_${currentUser.id}`;
        const MAX_FAILS = 5;

        let failCount = parseInt(localStorage.getItem(failKey) || '0') + 1;
        localStorage.setItem(failKey, failCount);

        if (failCount >= MAX_FAILS) {
            // 失敗回数が上限に達したらロック
            const lockUntil = Date.now() + 24 * 60 * 60 * 1000; // 24時間後
            localStorage.setItem(lockKey, lockUntil);
            lockPage(lockUntil);
        } else {
            showMessage(authMessageArea, `パスワードが違います。残り試行回数: ${MAX_FAILS - failCount}回`, 'error');
        }
    }

    /**
     * 画面をロック状態にする関数
     * @param {number} lockUntil - ロックが解除されるタイムスタンプ
     */
    function lockPage(lockUntil) {
        passwordInput.disabled = true;
        authButton.disabled = true;
        const unlockTime = new Date(lockUntil).toLocaleString('ja-JP');
        showMessage(authMessageArea, `試行回数の上限に達しました。アカウントはロックされました。再試行可能: ${unlockTime}`, 'error');
    }

    /**
     * ページ読み込み時にロック状態かチェックする関数
     */
    function checkLockStatus() {
        if (!currentUser) return;
        const lockKey = `auth_lock_${currentUser.id}`;
        const lockUntil = parseInt(localStorage.getItem(lockKey) || '0');
        if (Date.now() < lockUntil) {
            lockPage(lockUntil);
        }
    }

    /**
     * プレミアム登録処理 (シミュレーション)
     */
    async function handleSubscription() {
        // --- カード情報のバリデーション ---
        const cardNumber = document.getElementById('card-number').value;
        const expiryDate = document.getElementById('expiry-date').value;
        if (!isValidLuhn(cardNumber)) {
            showMessage(subscriptionStatus, '有効なクレジットカード番号ではありません。', 'error');
            return;
        }
        if (!isValidExpiry(expiryDate)) {
            showMessage(subscriptionStatus, '有効期限が不正です (MM/YY)。', 'error');
            return;
        }

        subscribeButton.disabled = true;
        showMessage(subscriptionStatus, '登録処理中...', 'info');

        try {
            const selectedPlan = planSelect.value;
            const limitDate = new Date();
            if (selectedPlan === 'monthly') {
                limitDate.setMonth(limitDate.getMonth() + 1);
            } else if (selectedPlan === 'yearly') {
                limitDate.setFullYear(limitDate.getFullYear() + 1);
            }

            // 'premium'テーブルにUPSERT (存在すれば更新、なければ挿入)
            const { error } = await supabaseClient.from('premium').upsert({
                id: currentUser.id,
                plan: selectedPlan,
                status: 'active',
                limit_date: limitDate.toISOString(),
                updated_at: new Date().toISOString()
            });

            if (error) throw error;

            showMessage(subscriptionStatus, 'プレミアム会員登録が完了しました！マイページに移動します。', 'success');
            setTimeout(() => {
                window.location.href = 'mypage.html';
            }, 2000);

        } catch (error) {
            showMessage(subscriptionStatus, `登録処理に失敗しました。: ${error.message}`, 'error');
            subscribeButton.disabled = false;
        }
    }

    /**
     * メッセージを表示するヘルパー関数
     * @param {HTMLElement} element - メッセージを表示するDOM要素
     * @param {string} text - 表示するテキスト
     * @param {string} type - 'success', 'error', 'info' のいずれか
     */
    function showMessage(element, text, type) {
        element.textContent = text;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    /**
     * Luhnアルゴリズムでクレジットカード番号を検証 (シミュレーション用)
     */
    function isValidLuhn(cardNumber) {
        const num = cardNumber.replace(/\D/g, '');
        if (num.length < 13 || num.length > 19) {
            return false;
        }
        let sum = 0;
        let isSecond = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num.charAt(i), 10);
            if (isSecond) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isSecond = !isSecond;
        }
        return (sum % 10) === 0;
    }

    /**
     * 有効期限の形式(MM/YY)と日付を検証 (シミュレーション用)
     */
    function isValidExpiry(expiryDate) {
        const match = expiryDate.match(/^(\d{2})\s*\/\s*(\d{2})$/);
        if (!match) return false;

        const month = parseInt(match[1], 10);
        const year = 2000 + parseInt(match[2], 10);

        if (month < 1 || month > 12) return false;

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (year < currentYear) return false;
        if (year === currentYear && month < currentMonth) return false;

        return true;
    }

    // --- ページの初期化処理を実行 ---
    initializePage();
});