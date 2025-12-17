// register.js

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- HTML要素の取得 ---
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

    // --- フォーム送信イベントのリスナー ---
    if (signinForm) {
        signinForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            messageArea.style.display = 'none';
            submitButton.disabled = true;
            submitButton.textContent = '登録中...';

            // --- Supabase Auth を使ってユーザー登録 ---
            // トリガーがDBへの書き込みを行うので、JSはこれを呼び出すだけでOK
            const { data, error } = await supabaseClient.auth.signUp({
                email: emailInput.value,
                password: passwordInput.value,
                options: {
                    // このデータがトリガー関数に渡される
                    data: {
                        name: nameInput.value,
                        user_name: usernameInput.value,
                        login_id: loginIdInput.value
                    }
                }
            });

            if (error) {
                // 登録失敗

                if (error.message && error.message.includes('unique constraint')) {
                    messageArea.textContent = 'このメールアドレスまたはログインIDは既に使用されています。';
                } else {
                    messageArea.textContent = '登録に失敗しました: ' + (error ? error.message : '不明なエラーです。');
                }
                messageArea.className = 'message error';
                messageArea.style.display = 'block';
            } else {
                // 登録成功
                alert('登録が完了しました。');
                window.location.href = '../../メイン系/html/index.html';
            }

            // 失敗した場合のみボタンを元に戻す
            if (error) {
                submitButton.disabled = false;
                submitButton.textContent = '登録する';
            }
        });
    }

    eyeBox.addEventListener('click', () => {
        console.log('fire');
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