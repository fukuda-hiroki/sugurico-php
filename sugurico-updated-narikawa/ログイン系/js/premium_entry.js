'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // --- HTML要素の取得 ---
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
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // --- 登録済みか & ロック状態かチェック ---
        checkLockStatus();
        checkPremiumStatus();
        setupEventListner();
    }
    /**
     * イベントリスナーを設定
     */
    function setupEventListner() {
        authButton.addEventListener('click', handlePasswordAuth);
        subscribeButton.addEventListener('click', handleSubscription);
    }

    async function handlePasswordAuth() {
        const password = passwordInput.value;
        if (!password) { showMessage(authMessageArea, 'パスワードを入力してください。', 'error'); return; }

        const { data: { user }, error: getUserError } = await supabaseClient.auth.getUser();
        if (getUserError || !user) {
            showMessage(authMessageArea, 'ユーザー情報の取得に失敗しました。ページをリロードしてください。', 'error');
            return;
        }

        const { error } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (error) {
            handleAuthFailure();
        } else {
            handleAuthSuccess();
        }
    }

    // --- 認証成功/失敗/ロック関連の関数 ---

    function handleAuthSuccess() {
        localStorage.removeItem(`auth_fails_${currentUser.id}`);
        passwordAuthSection.style.display = 'none';
        paymentSection.style.display = 'block';
    }
    function handleAuthFailure() {
        const failKey = `auth_fails_${currentUser.id}`, lockKey = `auth_lock_${currentUser.id}`;
        const MAX_FAILS = 5;
        let failCount = parseInt(localStorage.getItem(failKey) || '0') + 1;
        localStorage.setItem(failKey, failCount);

        if (failCount > MAX_FAILS) {
            const lockUntil = Date.now() + 24 * 60 * 60 * 1000;
            lockPage(lockUntil);
        } else {
            showMessage(authMessageArea, `パスワードが違います。残り試行回数: ${MAX_FAILS - failCount}回`, 'error');
        }

    }

    function lockPage(lockUntil) {
        passwordInput.disabled = true;
        authButton.disabled = true;
        const unlockTime = new Date(lockUntil).toLocaleString('ja-JP');
        showMessage(authMessageArea, `試行回数の上限に達しました。アカウントはロックされました。再試行可能: ${unlockTime}`, 'error');
    }
    function checkLockStatus() {
        const lockKey = `auth_lock_${currentUser.id}`;
        const lockUntil = parseInt(localStorage.getItem(lockKey) || '0');
        if (Date.now() < lockUntil) {
            lockPage(lockUntil);
        }
    }

    async function checkPremiumStatus() {
        // ▼▼▼ "data" を "premiumRecords" という変数名で受け取るように修正 ▼▼▼
        const { data: premiumRecords, error } = await supabaseClient
            .from('premium')
            .select('status')
            .eq('id', currentUser.id);

        if (error) {
            console.error('プレミアム状態のチェックに失敗:', error);
            return;
        }

        // ★ 配列 "premiumRecords" の最初の要素を取得する
        const premiumStatus = premiumRecords && premiumRecords[0];

        // ★★★ "premiumStatus" (オブジェクト) の "status" プロパティをチェック ★★★
        if (premiumStatus && premiumStatus.status === 'active') {
            alert('あなたは既にプレミアム会員です。会員情報ページに移動します。');
            window.location.href = 'premium_edit.html';
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
            showMessage(subscriptionStatus,
                '有効なクレジットカード番号ではありません。',
                'error'
            );
            return;
        }

        if (!isValidExpiry(expiryDate)) {
            showMessage(
                subscriptionStatus,
                '有効期限が不正です (MM/YY)。',
                'error'
            );
            return;
        }

        subscribeButton.disabled = true;
        showMessage(
            subscriptionStatus,
            '登録処理中...',
            'info'
        );

        try {
            const selectPlan = planSelect.value;
            const limitDate = new Date();
            if (selectPlan === 'monthly') limitDate.setMonth(limitDate.getMonth() + 1);
            if (selectPlan === 'yearly') limitDate.setFullYear(limitDate.getFullYear() + 1);

            const { error } = await supabaseClient.from('premium')
                .upsert({
                    id: currentUser.id,
                    plan: selectPlan,
                    status: 'active',
                    limit_date: limitDate.toISOString(),
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
            showMessage(subscriptionStatus, 'プレミアム会員登録が完了しました！', 'success');
            setTimeout(() => {
                window.location.href = 'mypage.html';
            }, 2000);
        } catch (error) {
            showMessage(subscriptionStatus, `登録処理に失敗しました。: ${error.message}`, 'error');
            subscribeButton.disabled = 'false';
        }
    }

    function showMessage(element, text, type) {
        element.textContent = text;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    function isValidLuhn(cardNumber) {
        //  2222-2222-2222-20
        const num = cardNumber.replace(/\D/g, '');
        if (num.length < 13 || num.length > 19) {
            false;
        }
        let sum = 0;
        let isSecond = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num.charAt(i), 10);
            if (isSecond) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            isSecond = !isSecond;
        }
        return (sum % 10) === 0;
    }
    
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

    initializePage();



});