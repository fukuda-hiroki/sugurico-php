// premium_edit.js

'use strict';
document.addEventListener('DOMContentLoaded', async () => {

    // --- HTML要素の取得 ---
    const currentPlanEl = document.getElementById('current-plan');
    const currentStatusEl = document.getElementById('current-status');
    const nextBillingDateEl = document.getElementById('next-billing-date');
    const planSelect = document.getElementById('plan-select');
    const updatePlanButton = document.getElementById('update-plan-button');
    const updateCardButton = document.getElementById('update-card-button');
    const cancelSubscriptionButton = document.getElementById('cancel-subscription-button');
    const editMessageArea = document.getElementById('edit-message-area');
    const statusMessageArea = document.getElementById('status-message-area');

    let currentUser;
    let currentPremiumData;

    async function initializePage() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        await fetchAndDisplayPremiumStatus();
        setupEventListeners();
    }
    async function fetchAndDisplayPremiumStatus() {
        try {
            const { data, error } = await supabaseClient
                .from('premium')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error || data) {
                alert('まだプレミアム会員ではありません。登録ページに移動します。');
                window.location.href = 'premium_entry.html';
                return;
            }
            currentPremiumData = data;

            currentPlanEl.textContent = data.plan === 'monthly' ? '月額プラン' : '年間プラン';
            currentStatusEl.textContent = data.status === 'active' ? '有効' : '解約済み';
            nextBillingDateEl.textContent = new Date(data.limit_date).toLocaleString('ja-JP');
            planSelect.value = data.plan;

            if (data.status === 'canceled') {
                document.getElementById('edit-section').style.display = 'none';
                cancelSubscriptionButton.style.display = 'none';
                showMessage(statusMessageArea, 'このサブスクリプションは解約済みです。再登録は、有効期限が切れた後に行ってください。', 'info');

            }
        } catch (error) {
            console.error('プレミアム情報の取得エラー:', error);
        }
    }

    function setupEventListeners(params) {
        updatePlanButton.addEventListener('click', async () => {
            const newPlan = planSelect.value;
            if (newPlan === currentPremiumData.plan) {
                showMessage(editMessageArea, '現在のプランと同じです。', 'info');
                return;
            }

            const { error } = await supabaseClient
                .from('premium')
                .update({ plan: newPlan })
                .eq('id', currentUser.id);

            if (error) {
                showMessage(editMessageArea, 'プランの変更に失敗しました。', 'error');
            } else {
                showMessage(editMessageArea, 'プランを変更しました。', 'success');
                await fetchAndDisplayPremiumStatus();
            }
        });
    }



    function showMessage(element, text, type) {
        element.textContent = text;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    initializePage();
});