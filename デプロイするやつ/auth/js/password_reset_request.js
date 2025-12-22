'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const verificationStage = document.getElementById('verification-stage');
    const verificationForm = document.getElementById('verification-form');
    const loginIdInput = document.getElementById('loginIdInput');
    const emailInput = document.getElementById('emailInput');

    const resetStage = document.getElementById('reset-stage');
    const passwordInput = document.getElementById('passwordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');

    const messageArea = document.getElementById('message-area');

    let verifiedUserId = null;

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

            verifiedUserId = user.id;
            verificationStage.style.display = 'none';
            resetStage.style.display = 'block';
            showMessage('ご本人様確認が完了しました。新しいパスワードを設定してください。', 'success');
        } catch (error) {
            showMessage(error.message, 'message');
        }
    });

    resetStage.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (passwordInput.value !== confirmPasswordInput.value) {
            showMessage('パスワードが一致しません。', 'error');
            return;
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