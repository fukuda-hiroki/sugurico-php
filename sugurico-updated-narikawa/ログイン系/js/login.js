// login.js
'use strict';

// --- HTML要素の取得 ---
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const messageArea = document.getElementById('message-area');

// --- ページ読み込み時の処理 ---
document.addEventListener('DOMContentLoaded', () => {



    // URLに ?register_success=1 が付いていたら、登録完了メッセージを表示
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('register_success')) {
        messageArea.textContent = 'ユーザー登録が完了しました。';
        messageArea.className = 'message success';
        messageArea.style.display = 'block';
    }
    initializePage();
});

async function initializePage() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        window.location.href = '../../メイン系/html/index.html';
        return;
    }
}
// --- フォーム送信イベントのリスナー ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // デフォルトの送信をキャンセル

        messageArea.style.display = 'none'; // メッセージをクリア
        loginButton.disabled = true;
        loginButton.textContent = 'ログイン中...';

        // ここから新しいコード
        try {
            const loginIdentifier = emailInput.value; //入力された値を取得
            const password = passwordInput.value;
            let userEmail = '';

            // 1. 入力されたのがメールアドレスか、ログインIDかを判定
            if (loginIdentifier.includes('@')) {
                // '@'が含まれている場合、メールアドレスとみなす
                userEmail = loginIdentifier;
            } else {
                // @'がなければログインIDとみなし、DBから対応するメールアドレスを検索
                const { data: user, error: findError } = await supabaseClient
                    .from('users')
                    .select('mail')
                    .eq('login_id', loginIdentifier)
                    .single(); //該当するユーザーが複数いる可能性は低い

                if (findError || !user) {
                    // ログインIDが見つからなかった
                    throw new Error('ログインIDまたはパスワードが違います。');
                }
                userEmail = user.mail; //対応するメールアドレスを取得
            }

            // 2. 取得したメールアドレスでログインを試みる
            const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: userEmail,
                password: password,
            });

            if (signInError) {
                throw new Error('ログインIDまたはパスワードが違います。');
            }

            // ▼▼▼ ここからが追加部分 ▼▼▼
            // --- ログイン成功後、プレミアム状態をチェック・更新 ---
            if (data.user) {
                await checkAndUpdatePremiumStatus(data.user);
            }
            // ▲▲▲ 追加ここまで ▲▲▲

            // ログイン成功
            alert('ログインに成功しました！');
            window.location.href = '../../メイン系/html/index.html'; // パスは適宜調整してください

        } catch (error) {
            // ログイン失敗 (全てのエラーをここでキャッチ)
            messageArea.textContent = error.message;
            messageArea.className = 'message error';
            messageArea.style.display = 'block';
        } finally {
            // 3. ボタンの状態を元に戻す
            loginButton.disabled = false;
            loginButton.textContent = 'ログイン';
        }
    });
}

async function checkAndUpdatePremiumStatus(user) {
    try {
        // 1. ユーザーのプレミアム情報を取得
        const { data: premium, error: selectError } = await supabaseClient
            .from('premium')
            .select('status, limit_date, plan')
            .eq('id', user.id)
            .single();
        if (selectError) {
            if (selectError.code === 'PGRST116' || (premium && premium.status === 'canceled')) {
                return;
            }
            throw selectError;
        }

        // 2. 状態が'active'で、かつ期限切れかチェック
        if (premium && premium.status === 'active') {
            const limitDate = new Date(premium.limit_date);
            const now = new Date();

            if (limitDate < now) {
                // --- 期限切れの場合、新しい有効期限を計算して更新 ---
                console.log('プレミアム期限切れのため、有効期限を更新します。');
                const newLimitDate = new Date(limitDate); // 元の期限を基準に計算

                // プランに応じて、新しい有効期限を設定
                if (premium.plan === 'monthly') {
                    // 1ヶ月延長
                    newLimitDate.setMonth(newLimitDate.getMonth() + 1);
                } else if (premium.plan === 'yearly') {
                    // 1年延長
                    newLimitDate.setFullYear(newLimitDate.getFullYear() + 1);
                } else {
                    // 不明なプランの場合は何もしない
                    return;
                }

                // DBの有効期限を更新
                const { error: updateError } = await supabaseClient
                    .from('premium')
                    .update({ limit_date: newLimitDate.toISOString() })
                    .eq('id', user.id);
                if (updateError) throw updateError;

                console.log(`新しい有効期限: ${newLimitDate.toLocaleString('ja-JP')}`);
            }
        }
    } catch (error) {

    }

}