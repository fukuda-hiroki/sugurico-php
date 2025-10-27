'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // --- HTML要素の取得 ---
    const postContainer = document.getElementById('post-detail-container');
    const commentFormContainer = document.getElementById('comment-form-container');
    const commentListContainer = document.getElementById('comment-list-container');

    // --- 1. ページで共通して使う変数を定義 ---
    const urlParams = new URLSearchParams(window.location.search);
    const forumId = parseInt(urlParams.get('id'));
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUser = session?.user;

    // --- 2. 初期化処理の開始 ---
    if (!forumId) {
        postContainer.innerHTML = '<h1>無効な投稿IDです。</h1>';
        return;
    }

    try {
            // --- 3. 必要なデータを並行して取得 ---
            
            // ★ isPremium の判定を共通関数に置き換え
            const isPremium = currentUser ? await isCurrentUserPremium() : false;

            let isBookmarked = false;

            // ログインしている場合のみブックマーク情報を取得
            if (currentUser) {
                // ▼▼▼ Promise.allからプレミアム判定を削除 ▼▼▼
                const { data: bookmarkRes } = await supabaseClient
                    .from('bookmark')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .eq('post_id', forumId)
                    .maybeSingle();
                
                if (bookmarkRes) {
                    isBookmarked = true;
                }
            }

        // 投稿関連のデータを取得
        const [postRes, tagsRes, imagesRes, commentsRes] = await Promise.all([
            supabaseClient.from('forums').select('*, users!forums_user_id_auth_fkey(user_name)').eq('forum_id', forumId).single(),
            supabaseClient.from('tag').select('tag_dic(tag_name)').eq('forum_id', forumId),
            supabaseClient.from('forum_images').select('image_url').eq('post_id', forumId).order('display_order'),
            supabaseClient.from('comments').select('*, users!comments_user_id_auth_fkey(user_name)').eq('forum_id', forumId).order('created_at', { ascending: false })
        ]);

        if (postRes.error || !postRes.data) throw new Error('投稿が見つからないか、取得に失敗しました。');
        
        const post = postRes.data;

        // --- 4. アクセス制御 ---
        const isOwner = currentUser && post.user_id_auth === currentUser.id;
        if (!isOwner && post.delete_date && new Date(post.delete_date) < new Date()) {
            throw new Error('この投稿の公開期限は終了しました。');
        }

        // --- 5. ページを描画 ---
        renderPost(post, tagsRes.data || [], imagesRes.data || [], isPremium, isBookmarked, isOwner);
        renderComments(commentsRes.data || []);

        if (currentUser) {
            renderCommentForm();
        } else {
            commentFormContainer.innerHTML = `<p><a href="../../ログイン系/html/login.html">ログイン</a>してコメントを投稿する</p>`;
        }

    } catch (error) {
        console.error("詳細ページ読み込みエラー:", error);
        postContainer.innerHTML = `<h1>エラー</h1><p>${error.message}</p>`;
        commentFormContainer.style.display = 'none';
        commentListContainer.style.display = 'none';
    }

    // ==================================================
    //  ヘルパー関数セクション (ここから下はすべて関数定義)
    // ==================================================

    function renderPost(post, tags, images, isPremium, isBookmarked, isOwner) {
        const remainingTimeHTML = timeLeft(post.delete_date);
        const timeAgoHTML = timeAgo(post.created_at);
        const tagsHTML = tags.map(tag => `<a href="../../メイン系/html/search.html?keyword=${encodeURIComponent(tag.tag_dic.tag_name)}&type=tag" class="tag-link">#${escapeHTML(tag.tag_dic.tag_name)}</a>`).join(' ');
        const imagesHTML = images.map(image => `<div class="post-image-wrapper"><img src="${image.image_url}" alt="投稿画像" class="post-image"></div>`).join('');
        
        let authorHTML = escapeHTML(post.users?.user_name || '不明');
        if (currentUser && post.user_id_auth !== currentUser.id) {
            authorHTML = `<a href="user_posts.html?id=${post.user_id_auth}">${authorHTML}</a>`;
        }
        
        let ownerButtonsHTML = '';
        if (isOwner) {
            ownerButtonsHTML = `
                <div class="post-owner-actions">
                    <a href="forum_input.html?edit_id=${post.forum_id}" class="action-button edit-button">編集</a>
                    <button type="button" id="delete-post-button" class="action-button delete-button">削除</button>
                </div>`;
        }
        
        let bookmarkButtonHTML = '';
        if (isPremium) {
            const buttonText = isBookmarked ? 'ブックマーク解除' : 'ブックマークに追加';
            const buttonClass = isBookmarked ? 'action-button delete-button' : 'action-button edit-button';
            bookmarkButtonHTML = `
                <div class="bookmark-action">
                    <button type="button" id="bookmark-button" class="${buttonClass}" data-bookmarked="${isBookmarked}">${buttonText}</button>
                </div>`;
        }

        postContainer.innerHTML = `
            ${ownerButtonsHTML}
            ${bookmarkButtonHTML}
            <h1>${escapeHTML(post.title)}</h1>
            <p class="post-meta">投稿者: ${authorHTML}</p>
            <p class="post-meta">投稿日時: ${timeAgoHTML}</p>
            <div class="post-images-container">${imagesHTML}</div>
            <div class="post-content">${nl2br(post.text)}</div>
            <div class="post-tags">${tagsHTML}</div>
            ${remainingTimeHTML}`;
            
        // イベントリスナーを設定
        if (isOwner) document.getElementById('delete-post-button').addEventListener('click', () => handleDeletePost(post.forum_id));
        if (isPremium) document.getElementById('bookmark-button').addEventListener('click', handleBookmarkToggle);
    }

    function renderCommentForm() {
        commentFormContainer.innerHTML = `
            <form id="comment-form">
                <textarea name="comment_text" placeholder="コメントを入力..." required></textarea>
                <button type="submit">コメントを投稿する</button>
            </form>`;
        document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
    }

    async function handleCommentSubmit(event) {
        event.preventDefault();
        const commentText = event.target.querySelector('textarea').value.trim();
        if (!commentText) return;
        const { error } = await supabaseClient.from('comments').insert({
            forum_id: forumId,
            user_id_auth: currentUser.id,
            comment_text: commentText
        });
        if (error) {
            alert('コメントの投稿に失敗しました: ' + error.message);
        } else {
            event.target.querySelector('textarea').value = '';
            await fetchAndRenderComments();
        }
    }

    async function fetchAndRenderComments() {
        const { data: comments, error } = await supabaseClient.from('comments').select('*, users!comments_user_id_auth_fkey(user_name)').eq('forum_id', forumId).order('created_at', { ascending: false });
        if (error) {
            commentListContainer.innerHTML = '<p>コメントの読み込みに失敗しました。</p>';
        } else {
            renderComments(comments);
        }
    }

    function renderComments(comments) {
        if (comments && comments.length > 0) {
            commentListContainer.innerHTML = comments.map(comment => `
                <div class="comment-item">
                    <strong>${escapeHTML(comment.users?.user_name || '不明')}:</strong>
                    <p>${nl2br(comment.comment_text)}</p>
                    <small>${timeAgo(comment.created_at)}</small>
                </div>`).join('');
        } else {
            commentListContainer.innerHTML = "<p>まだコメントはありません。</p>";
        }
    }

    async function handleDeletePost(forumIdToDelete) {
        if (!confirm('この投稿を本当に削除しますか？\nこの操作は元に戻せません。')) return;
        try {
            const { error } = await supabaseClient.rpc('delete_forum_with_related_data', { forum_id_param: forumIdToDelete });
            if (error) throw error;
            alert('投稿を削除しました。');
            window.location.href = '../../メイン系/html/index.html';
        } catch (error) {
            console.error('削除エラー:', error);
            alert(`投稿の削除に失敗しました: ${error.message}`);
        }
    }
    
    async function handleBookmarkToggle(event) {
        const button = event.target;
        const isCurrentlyBookmarked = button.dataset.bookmarked === 'true';
        try {
            if (isCurrentlyBookmarked) {
                // ブックマークを削除
                const { error } = await supabaseClient.from('bookmark').delete().eq('user_id', currentUser.id).eq('post_id', forumId);
                if (error) throw error;
            } else {
                // ブックマークを追加
                const { error } = await supabaseClient.from('bookmark').insert({ user_id: currentUser.id, post_id: forumId });
                if (error) throw error;
            }
            const newIsBookmarked = !isCurrentlyBookmarked;
            button.dataset.bookmarked = newIsBookmarked;
            button.textContent = newIsBookmarked ? 'ブックマーク解除' : 'ブックマークに追加';
            button.className = newIsBookmarked ? 'action-button delete-button' : 'action-button edit-button';
        } catch (error) {
            console.error('ブックマーク操作エラー:', error);
            alert('ブックマーク操作に失敗しました。');
        }
    }
});