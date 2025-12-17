'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    const updateForm = document.getElementById('update-form');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const loginIdInput = document.getElementById('loginIdInput');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitButton = document.getElementById('submitButton');
    const messageArea = document.getElementById('message-area');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const { data: profile, error } = await supabaseClient
            .from('users')
            .select('name, user_name, login_id, mail')
            .eq('id', user.id)
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

    updateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = '更新中...';
        messageArea.style.display = 'none';
        try {
            const newPassword = passwordInput.value;
            if (newPassword) {
                const { error: passwordError } = await supabaseClient
                    .auth
                    .updateUser({ password: newPassword });
                if (passwordError) throw passwordError;
            }

            const { error: profileError } = await supabaseClient
                .from('users')
                .update({
                    name: nameInput.value,
                    user_name: usernameInput.value,
                    login_id: loginIdInput.value
                })
                .eq('id', user.id);
            if (profileError) throw profileError;

            await supabaseClient.auth.updateUser({
                data: {
                    name: nameInput.value,
                    user_name: usernameInput.value,
                    login_id: loginIdInput.value
                }
            });

            messageArea.textContent = 'ユーザー情報を更新しました。';
            messageArea.className = 'message success';
            messageArea.style.display = 'block';
            passwordInput.value = '';
        } catch (error) {

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

    const deleteButton = document.getElementById('delete-account-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
            const confirmation = prompt('アカウント削除の確認のため、あなたのログインIDを入力してください。');
            if (confirmation === null) return;

            if (confirmation !== loginIdInput.value) {
                alert('入力されたログインIDが一致しません。');
                return;
            }

            if (!confirm('本当によろしいですか？この操作は元に戻せません。')) {
                return;
            }

            try {
                const { error } = await supabaseClient.rpc('delete_current_user');
                if (error) throw error;

                alert('アカウントを削除しました。ご利用ありがとうございました。');
                await supabaseClient.auth.signOut();
                window.location.href = '/index.html';

            } catch (error) {
                console.error('アカウント削除エラー:', error);
                messageArea.textContent = 'アカウントの削除に失敗しました: ' + error.message;
                messageArea.className = 'message error';
                messageArea.style.display = 'block';
            }
        });
    }
});