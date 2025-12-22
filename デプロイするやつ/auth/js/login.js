'use strict';

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const messageArea = document.getElementById('message-area');
const eyeBox = document.getElementById('eye-box');
const openEye = document.getElementById('open-eye');
const closeEye = document.getElementById('close-eye');

document.addEventListener('DOMContentLoaded', () => {



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
        window.location.href = '/index.html';
        return;
    }
}
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        messageArea.style.display = 'none'; 
        loginButton.disabled = true;
        loginButton.textContent = 'ログイン中...';

        try {
            const loginIdentifier = emailInput.value; 
            const password = passwordInput.value;
            let userEmail = '';

            if (loginIdentifier.includes('@')) {
                userEmail = loginIdentifier;
            } else {
                const { data: user, error: findError } = await supabaseClient
                    .from('users')
                    .select('mail')
                    .eq('login_id', loginIdentifier)
                    .single(); 

                if (findError || !user) {
                    throw new Error('ログインIDまたはパスワードが違います。');
                }
                userEmail = user.mail; 
            }

            const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: userEmail,
                password: password,
            });

            if (signInError) {
                throw new Error('ログインIDまたはパスワードが違います。');
            }
            if (data.user) {
                await checkAndUpdatePremiumStatus(data.user);
            }

            alert('ログインに成功しました！');
            window.location.href = '/index.html'; 

        } catch (error) {
            messageArea.textContent = error.message;
            messageArea.className = 'message error';
            messageArea.style.display = 'block';
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'ログイン';
        }
    });
}

async function checkAndUpdatePremiumStatus(user) {
    try {
        const { data: premium, error: selectError } = await supabaseClient
            .from('premium')
            .select('status, limit_date, plan')
            .eq('id', user.id)
            .maybeSingle();
        if (selectError) {
            if (selectError.code === 'PGRST116' || (premium && premium.status === 'canceled')) {
                return;
            }
            throw selectError;
        }

        if (premium && premium.status === 'active') {
            const limitDate = new Date(premium.limit_date);
            const now = new Date();

            if (limitDate < now) {
                const newLimitDate = new Date(limitDate);

                if (premium.plan === 'monthly') {
                    newLimitDate.setMonth(newLimitDate.getMonth() + 1);
                } else if (premium.plan === 'yearly') {
                    newLimitDate.setFullYear(newLimitDate.getFullYear() + 1);
                } else {
                    return;
                }

                const { error: updateError } = await supabaseClient
                    .from('premium')
                    .update({ limit_date: newLimitDate.toISOString() })
                    .eq('id', user.id);
                if (updateError) throw updateError;

            }
        }
    } catch (error) {

    }
}

eyeBox.addEventListener('click',()=>{
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