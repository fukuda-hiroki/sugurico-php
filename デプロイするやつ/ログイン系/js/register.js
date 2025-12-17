
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signin-form');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const loginIdInput = document.getElementById('loginIdInput');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitButton = document.getElementById('submitButton');
    const messageArea = document.getElementById('message-area');
    const eyeBox = document.getElementById('eye-box');
    const openEye = document.getElementById('open-eye');
    const closeEye = document.getElementById('close-eye');

    if (signinForm) {
        signinForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            messageArea.style.display = 'none';
            submitButton.disabled = true;
            submitButton.textContent = '登録中...';

            const { data, error } = await supabaseClient.auth.signUp({
                email: emailInput.value,
                password: passwordInput.value,
                options: {
                    data: {
                        name: nameInput.value,
                        user_name: usernameInput.value,
                        login_id: loginIdInput.value
                    }
                }
            });

            if (error) {

                if (error.message && error.message.includes('unique constraint')) {
                    messageArea.textContent = 'このメールアドレスまたはログインIDは既に使用されています。';
                } else {
                    messageArea.textContent = '登録に失敗しました: ' + (error ? error.message : '不明なエラーです。');
                }
                messageArea.className = 'message error';
                messageArea.style.display = 'block';
            } else {
                alert('登録が完了しました。');
                window.location.href = '/index.html';
            }

            if (error) {
                submitButton.disabled = false;
                submitButton.textContent = '登録する';
            }
        });
    }

    eyeBox.addEventListener('click', () => {
        if (closeEye.style.display === 'none') {
            closeEye.style.display = 'block';
            openEye.style.display = 'none';
            passwordInput.type = "text";
        } else {
            closeEye.style.display = 'none';
            openEye.style.display = 'block';
            passwordInput.type = "password";

        }
    });
});