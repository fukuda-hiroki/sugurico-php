'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // --- HTML要素の取得 ---
    const listContainer = document.getElementById('blocked-users-list');

    // --- 1. ログイン状態をチェック ---
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    if (!currentUser) {
        window.location.href = 'login.html'; // 未ログインならリダイレクト
        return;
    }

    /**
     * ブロック中のユーザーを取得して表示する関数
     */
    async function fetchAndDisplayBlockedUsers() {
        try {
            // blocksテーブルから、自分がブロックしているユーザーの情報を取得
            // usersテーブルをJOINして、ブロック相手のユーザー名も取得する
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

            // 取得したデータからHTMLを生成
            listContainer.innerHTML = blockedUsers.map(item => {
                const blockedUser = item.users; // JOINしたusersテーブルのデータ
                if (!blockedUser) return ''; // 念のため

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

    // --- 2. ページ初期化時にブロックリストを取得・表示 ---
    await fetchAndDisplayBlockedUsers();


    // --- 3. [解除]ボタンのクリックイベント処理 (イベント委譲) ---
    listContainer.addEventListener('click', async (event) => {
        // クリックされたのが解除ボタンかチェック
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
            // blocksテーブルから該当のレコードを削除
            const { error } = await supabaseClient
                .from('blocks')
                .delete()
                .eq('blocker_user_id', currentUser.id) // 自分が
                .eq('blocked_user_id', targetUserId);  // 相手をブロックした記録

            if (error) throw error;

            alert(`「${targetUserName}」のブロックを解除しました。`);
            // リストを再読み込みして表示を更新
            await fetchAndDisplayBlockedUsers();

        } catch (error) {
            console.error('ブロック解除エラー:', error);
            alert('ブロックの解除に失敗しました。');
        }
    });
});