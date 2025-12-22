'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    const listContainer = document.getElementById('blocked-users-list');

    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    /**
     * ブロック中のユーザーを取得して表示する関数
     */
    async function fetchAndDisplayBlockedUsers() {
        try {
            const { data: blockedUsers, error } = await supabaseClient
                .from('blocks')
                .select(`
                    blocked_user_id,
                    users!blocks_blocked_user_id_fkey ( user_name )
                `)
                .eq('blocker_user_id', currentUser.id);

            if (error) throw error;

            if (blockedUsers.length === 0) {
                listContainer.innerHTML = '<p>現在ブロック中のユーザーはいません。</p>';
                return;
            }

            listContainer.innerHTML = blockedUsers.map(item => {
                const blockedUser = item.users; 
                if (!blockedUser) return '';
                return `
                    <div class="post-item">
                        <div class="post-item-main">
                            <h3>${escapeHTML(blockedUser.user_name)}</h3>
                        </div>
                        <div class="post-item-actions">
                            <button 
                                type="button" 
                                class="action-button delete-button unblock-button" 
                                data-user-id="${item.blocked_user_id}"
                                data-user-name="${escapeHTML(blockedUser.user_name)}">
                                解除
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('ブロックリストの取得エラー:', error);
            listContainer.innerHTML = '<p>リストの取得中にエラーが発生しました。</p>';
        }
    }

    await fetchAndDisplayBlockedUsers();


    listContainer.addEventListener('click', async (event) => {
        if (!event.target.classList.contains('unblock-button')) {
            return;
        }

        const button = event.target;
        const targetUserId = button.dataset.userId;
        const targetUserName = button.dataset.userName;

        if (!confirm(`ユーザー「${targetUserName}」のブロックを解除しますか？`)) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('blocks')
                .delete()
                .eq('blocker_user_id', currentUser.id) 
                .eq('blocked_user_id', targetUserId);  

            if (error) throw error;

            alert(`「${targetUserName}」のブロックを解除しました。`);
            await fetchAndDisplayBlockedUsers();

        } catch (error) {
            console.error('ブロック解除エラー:', error);
            alert('ブロックの解除に失敗しました。');
        }
    });
});