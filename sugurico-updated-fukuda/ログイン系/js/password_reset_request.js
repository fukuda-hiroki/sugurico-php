'use strict';

document.addEventListener('DOMContentLoaded', () => {

    //ステージ1の要素
    const verificationStage = document.getElementById('verification-stage');
    const verificationForm = document.getElementById('verification-form');
    const loginIdInput = document.getElementById('loginIdInput');
    const emailInput = document.getElementById('emailInput');

    //ステージ2の要素
    const resetStage = document.getElementById('reset-stage');
    const passwordInput = document.getElementById('passwordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');

    const messageArea = document.getElementById('message-area');

    let verifiedUserId = null;

    //ステージ1：本人確認フォームの送信イベント
    verificationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const { data: user, error } = await supabaseClient
                .from('users')
                .select('id')
                .eq('login_id', loginIdInput.value)
                .eq('mail', emailInput.value)
                .single();
            if (error || !user) {
                throw new Error('ログインIDまたはメールアドレスが正しくありません。');
            }

            // 認証成功
            verifiedUserId = user.id;// ユーザーIDを保存
            verificationStage.style.display = 'none';// ステージ1を非表示
            resetStage.style.display = 'block';// ステージ2を表示
            showMessage('ご本人様確認が完了しました。新しいパスワードを設定してください。', 'success');
        } catch (error) {
            showMessage(error.message, 'message');
        }
    });

    // --- ステージ2：パスワード再設定フォームの送信イベント ---
    resetStage.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (passwordInput.value !== confirmPasswordInput.value) {
            showMessage('パスワードが一致しません。', 'error');
        }
        if (!verifiedUserId) {
            showMessage('認証情報がありません。最初からやり直してください。', 'error');
            return;
        }

        try {
            const { error } = await supabaseClient
                .functions
                .invoke(
                    'update-user-password', {
                    body: {
                        userId: verifiedUserId,
                        newPassword: passwordInput.value
                    },
                }
                );
            if (error) {
                throw error;
            }

            //  更新成功
            showMessage('パスワードが正常に更新されました。ログインページに移動します。', 'success');
            setTimeout(() => {
                window.location.href = 'login.html?password_reset_success=1';
            }, 3000);

        } catch (error) {
            showMessage('パスワードの更新に失敗しました: ' + error.message, 'error');
        }
    });
    function showMessage(text, type) {
        messageArea.textContent = text;
        messageArea.className = `message ${type}`;
        messageArea.style.display = 'block';
    }

});