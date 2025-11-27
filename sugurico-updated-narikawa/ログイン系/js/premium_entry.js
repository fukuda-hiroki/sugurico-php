'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // --- HTML要素の取得 ---
    const subscribeButton = document.getElementById('subscribe-button');
    const planSelect = document.getElementById('plan-select');
    const subscriptionStatus = document.getElementById('subscription-status');
    const passwordInput = document.getElementById('password-input'); // パスワード入力欄

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

        await checkPremiumStatus(); // 既存会員は編集ページへリダイレクト
        setupEventListener();
    }
    
    /**
     * イベントリスナーを設定
     */
    function setupEventListener() {
        // 登録ボタンにだけイベントリスナーを設定
        subscribeButton.addEventListener('click', handleSubscription);
    }
    
    /**
     * プレミアム登録処理（パスワード認証もここで行う）
     */
    async function handleSubscription() {
        // --- 1. パスワード認証 ---
        const password = passwordInput.value;
        if (!password) {
            showMessage(subscriptionStatus, 'ご本人様確認のため、パスワードを入力してください。', 'error');
            return;
        }

        const { error: authError } = await supabaseClient.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });

        if (authError) {
            showMessage(subscriptionStatus, 'パスワードが正しくありません。', 'error');
            return; // パスワードが違えば処理を中断
        }
        
        // --- 2. カード情報のバリデーション ---
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

        // --- 3. データベースへの登録処理 ---
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
            
            showMessage(subscriptionStatus, 'プレミアム会員登録が完了しました！マイページに移動します。', 'success');
            setTimeout(() => {
                window.location.href = 'mypage.html';
            }, 2000);

        } catch (error) {
            showMessage(subscriptionStatus, `登録処理に失敗しました。: ${error.message}`, 'error');
            subscribeButton.disabled = false;
        }
    }

    // --- (checkPremiumStatus, showMessage, isValidLuhn, isValidExpiry 関数は変更なし) ---
    async function checkPremiumStatus() {
        const { data: premiumRecords, error } = await supabaseClient
            .from('premium')
            .select('status')
            .eq('id', currentUser.id);
        if (error) { console.error('プレミアム状態のチェックに失敗:', error); return; }
        const premiumStatus = premiumRecords && premiumRecords[0];
        if (premiumStatus && (premiumStatus.status === 'active' || premiumStatus.status === 'canceled')) {
            alert('あなたは既にプレミアム会員、または解約手続き済みです。会員情報ページに移動します。');
            window.location.href = 'premium_edit.html';
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
        if (num.length < 13 || num.length > 19) return false;
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

    function isValidExpiry(expiryDate) {
        const match = expiryDate.match(/^(\d{2})\s*\/\s*(\d{2})$/);
        if (!match) return false;
        const month = parseInt(match[1], 10);
        const year = 2000 + parseInt(match[2], 10);
        if (month < 1 || month > 12) return false;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (year < currentYear || (year === currentYear && month < currentMonth)) return false;
        return true;
    }

    // --- ページの処理を開始 ---
    initializePage();
});