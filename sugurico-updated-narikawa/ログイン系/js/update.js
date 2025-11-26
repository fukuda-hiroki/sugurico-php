// update.js
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // --- HTML要素の取得 ---
    const updateForm = document.getElementById('update-form');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const loginIdInput = document.getElementById('loginIdInput');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitButton = document.getElementById('submitButton');
    const messageArea = document.getElementById('message-area');

    // --- 1. ログイン状態をチェックし、現在のユーザー情報を取得 ---
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    console.log("取得したユーザー情報:", user);
    console.log("ユーザー情報取得時のエラー:", userError);
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // --- 2. DBからプロフィール情報を取得してフォームに表示 ---
    try {
        const { data: profile, error } = await supabaseClient
            .from('users')
            .select('name, user_name, login_id, mail')
            .eq('id', user.id)// AuthのIDを使って検索
            .single();
        if (error) throw error;
        if (profile) {
            nameInput.value = profile.name;
            usernameInput.value = profile.user_name;
            loginIdInput.value = profile.login_id;
            emailInput.value = profile.mail;
        }
    } catch (error) {
        messageArea.textContent = 'プロフィール情報の取得に失敗しました。';
        messageArea.className = 'message error';
        messageArea.style.display = 'block';
    }

    // --- 3. フォーム送信イベントの処理 ---
    updateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = '更新中...';
        messageArea.style.display = 'none';
        try {
            // --- 3a. パスワードの更新 ---
            const newPassword = passwordInput.value;
            if (newPassword) {
                const { error: passwordError } = await supabaseClient
                    .auth
                    .updateUser({ password: newPassword });
                if (passwordError) throw passwordError;
            }

            // --- 3b. プロフィール情報(usersテーブル)の更新 ---
            const { error: profileError } = await supabaseClient
                .from('users')
                .update({
                    name: nameInput.value,
                    user_name: usernameInput.value,
                    login_id: loginIdInput.value
                })
                .eq('id', user.id);
            if (profileError) throw profileError;

            // --- 3c. Authのメタデータも更新 (任意だが推奨) ---
            await supabaseClient.auth.updateUser({
                data: {
                    name: nameInput.value,
                    user_name: usernameInput.value,
                    login_id: loginIdInput.value
                }
            });

            // --- 成功処理 ---
            messageArea.textContent = 'ユーザー情報を更新しました。';
            messageArea.className = 'message success';
            messageArea.style.display = 'block';
            passwordInput.value = '';// パスワード欄をクリア
        } catch (error) {

            // エラー処理
            if (error.message.includes('duplicate key value violates unique constraint "users_login_id_key"')) {
                messageArea.textContent = 'このログインIDは既に使用されています';

            } else {
                messageArea.textContent = '更新に失敗しました:' + error.message;
            }
            messageArea.className = 'message error';
            messageArea.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '更新する';
        }
    })

    // --- 4. アカウント削除ボタンの処理 ---
    const deleteButton = document.getElementById('delete-account-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
            const confirmation = prompt('アカウント削除の確認のため、あなたのログインIDを入力してください。');
            if (confirmation === null) return; // キャンセルされた場合

            if (confirmation !== loginIdInput.value) {
                alert('入力されたログインIDが一致しません。');
                return;
            }

            if (!confirm('本当によろしいですか？この操作は元に戻せません。')) {
                return;
            }

            try {
                // 作成したRPCを呼び出す
                const { error } = await supabaseClient.rpc('delete_current_user');
                if (error) throw error;

                alert('アカウントを削除しました。ご利用ありがとうございました。');
                // ログアウト処理をしてトップページにリダイレクト
                await supabaseClient.auth.signOut();
                window.location.href = '../../メイン系/html/index.html';

            } catch (error) {
                console.error('アカウント削除エラー:', error);
                messageArea.textContent = 'アカウントの削除に失敗しました: ' + error.message;
                messageArea.className = 'message error';
                messageArea.style.display = 'block';
            }
        });
    }
// 誤操作を防ぐため、`prompt` を使ってログインIDを入力させる一手間を加えています。
});