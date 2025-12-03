// update.js
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // --- HTML要素の取得 ---
    const updateForm = document.getElementById('update-form');
    const nameInput = document.getElementById('nameInput');
    const usernameInput = document.getElementById('usernameInput');
    const loginIdInput = document.getElementById('loginIdInput');
    const emailInput = document.getElementById('emailInput');
    const submitButton = document.getElementById('submitButton');
    const messageArea = document.getElementById('message-area');
    
    // ★ 除外タグUI関連の要素
    const excludeTagsSection = document.getElementById('exclude-tags-section');
    const tagsContainer = document.getElementById('exclude-tags-input-container');
    const tagTextInput = document.getElementById('exclude-tag-text-input');

    // ★ 状態を管理する変数
    let currentUser;
    let isPremium = false;
    let excludeTags = []; // 除外タグのリストを配列で管理

    // --- 1. ログイン＆プレミアムチェック ---
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    isPremium = await isCurrentUserPremium();

    if (!isPremium) {
        if (excludeTagsSection) excludeTagsSection.style.display = 'none';
    }

    // --- 2. ユーザー情報の取得と表示 ---
    try {
        // プロフィール情報
        const { data: profile, error: profileError } = await supabaseClient.from('users').select('name, user_name, login_id, mail').eq('id', currentUser.id).single();
        if (profileError) throw profileError;
        if (profile) {
            nameInput.value = profile.name;
            usernameInput.value = profile.user_name;
            loginIdInput.value = profile.login_id;
            emailInput.value = profile.mail;
        }
        
        // プレミアム会員なら除外タグ情報を取得
        if (isPremium) {
            const { data: excludeTagsData, error: excludeTagsError } = await supabaseClient.from('user_exclude_tags').select('exclude_tags').eq('user_id', currentUser.id).maybeSingle();
            if (excludeTagsError) throw excludeTagsError;

            // 取得したタグを配列にセットし、UIを再描画
            excludeTags = excludeTagsData?.exclude_tags || [];
            renderExcludeTags();
        }
    } catch (error) {
        messageArea.textContent = 'プロフィール情報の取得に失敗しました。';
        messageArea.className = 'message error';
        messageArea.style.display = 'block';
    }

    // --- 3. タグ入力UIのイベントリスナー ---
    if (isPremium && tagsContainer && tagTextInput) {
        // コンテナ自体をクリックしたら、入力欄にフォーカス
        tagsContainer.addEventListener('click', () => tagTextInput.focus());
        tagTextInput.addEventListener('keydown', (e) => {
            // Enterキーまたはカンマキーが押されたとき
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault(); // デフォルトの動作（フォーム送信など）をキャンセル
                const newTag = tagTextInput.value.trim();
                if (newTag) {
                    addExcludeTag(newTag);
                }
            }
            // Backspaceキーが押され、入力欄が空のとき
            if (e.key === 'Backspace' && tagTextInput.value === '') {
                if (excludeTags.length > 0) {
                    removeExcludeTag(excludeTags.length - 1); // 最後のタグを削除
                }
            }
        });
    }

    /**
     * ★ 除外タグのUIを描画する関数
     */
    function renderExcludeTags() {
        // 既存のタグ要素を一旦すべて削除 (入力欄は除く)
        tagsContainer.querySelectorAll('.tag-item').forEach(el => el.remove());

        // 配列を元にタグ要素を再生成
        excludeTags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.textContent = tag;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'tag-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => removeExcludeTag(index);

            tagElement.appendChild(removeBtn);
            // 入力欄の直前にタグを追加
            tagsContainer.insertBefore(tagElement, tagTextInput);
        });
    }

    /**
     * ★ 除外タグを配列に追加する関数
     */
    function addExcludeTag(tagName) {
        // 重複チェック
        if (!excludeTags.includes(tagName)) {
            excludeTags.push(tagName);
            renderExcludeTags(); // UIを更新
        }
        tagTextInput.value = ''; // 入力欄をクリア
    }

    /**
     * ★ 除外タグを配列から削除する関数
     */
    function removeExcludeTag(index) {
        excludeTags.splice(index, 1);
        renderExcludeTags(); // UIを更新
    }

    // --- 4. フォーム送信イベントの処理 ---
    updateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = '更新中...';

        try {
            // ... (パスワード、プロフィール更新処理は変更なし) ...

            // ★ プレミアム会員の場合、配列(excludeTags)を元にDBを更新
            if (isPremium) {
                const { error: excludeTagsError } = await supabaseClient
                    .from('user_exclude_tags')
                    .upsert({
                        user_id: currentUser.id,
                        exclude_tags: excludeTags, // ★ 配列をそのまま渡す
                        updated_at: new Date().toISOString()
                    });
                if (excludeTagsError) throw excludeTagsError;
            }

            messageArea.textContent = 'ユーザー情報を更新しました。';
            messageArea.className = 'message success';
            messageArea.style.display = 'block';

        } catch (error) {
            // ... (エラー処理は変更なし) ...
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '更新する';
        }
    });
    
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