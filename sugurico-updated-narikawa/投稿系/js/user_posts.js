// user_posts.js

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // --- HTML要素の取得 ---
    const pageTitle = document.getElementById('page-title');
    const postsListContainer = document.getElementById('posts-list-container');
    const paginationContainer = document.getElementById('pagination-container');

    // 詳細検索フォームの要素
    const toggleSearchButton = document.getElementById('toggle-search-button');
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const filterButton = document.getElementById('filter-button');
    const keywordInput = document.getElementById('search-keyword');
    const periodSelect = document.getElementById('period-select');
    const sortSelect = document.getElementById('sort-select');
    const tagSelect = document.getElementById('tag-select');

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id');

    async function initializePage() {
        if (!targetUserId) {
            pageTitle.textContent = 'ユーザーが指定されていません。';
            return;
        }

        // --- 1. 表示対象ユーザーのプロフィール情報(user_name)を取得 ---
        try {
            const { data: targetUser, error: userError } = await supabaseClient
                .from('users')
                .select('user_name')
                .eq('id', targetUserId)
                .single();
            if (userError || !targetUser) throw new Error('ユーザーが見つかりません。');
            pageTitle.textContent = `${escapeHTML(targetUser.user_name)}さんの投稿一覧`
        } catch (e) {
            pageTitle.textContent = '';
            return;
        }


        await populateUserTags();
        await fetchAndDisplayUserPosts();
        setupEventListeners();
    }

    function setupEventListeners() {
        toggleSearchButton.addEventListener('click', () => {
            const isHidden = advancedSearchForm.style.display === 'none';
            advancedSearchForm.style.display = isHidden ? 'block' : 'none';
            toggleSearchButton.textContent = isHidden ? '詳細検索を閉じる' : '詳細検索';
        });

        filterButton.addEventListener('click', () => {
            fetchAndDisplayUserPosts(1);
        });
        console.log(3);
    }

    async function populateUserTags() {
        try {
            const { data: tags, error } = await supabaseClient
                .rpc('get_user_tags', {
                    user_id_param: targetUserId
                });
            if (error) throw error;

            tagSelect.innerHTML = '<option value="">すべてのタグ</option>';
            if (tags && tags.length > 0) {
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag.tag_id;  //  valueにはIDを設定
                    option.textContent = tag.tag_name;  //  表示はタグ名
                    tagSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('ユーザーのタグリスト取得に失敗:', error);
        }
    }

    async function fetchAndDisplayUserPosts(page = 1) {
        console.log(tagSelect.value);
        postsListContainer.innerHTML = '読み込み中...';
        paginationContainer.innerHTML = '';
        try {
            const postsPerPage = 10;
            // ▼▼▼ RPC呼び出しを直接クエリに置き換える ▼▼▼
            // --------------------------------------------------------------------
            let query = supabaseClient
                .from('forums')
                .select(`
                    forum_id,
                    title,
                    text,
                    created_at,
                    delete_date,
                    forum_images ( image_url )
                `, { count: 'exact' })
                .eq('user_id_auth', targetUserId); // targetUserId はページのURLから取得したID

            // rpc('filter_other_user_posts')が内部で行っていたフィルタリングをJSで再現
            const keyword = keywordInput.value.trim();
            if (keyword) {
                query = query.or(`title.ilike.%${keyword}%,text.ilike.%${keyword}%`);
            }
            
            // ... ここに期間、タグ、ソート順などのフィルタリング条件を追加できます ...
            
            // ソート順
            const sortOrder = sortSelect.value === 'asc'; // 'asc'ならtrue
            query = query.order('forum_id', { ascending: sortOrder });

            // ページネーション
            query = query.range((page - 1) * postsPerPage, page * postsPerPage - 1);
            
            const { data, error, count } = await query;

            if (error) {
                throw error;
            }

            const posts = data;
            const totalPosts = count ?? 0;
            if (posts && posts.length > 0) {
                postsListContainer.innerHTML = posts.map(post => renderPostHTML(post)).join('');
            } else {
                postsListContainer.innerHTML = '<p>該当する投稿はありません。</p>';
            }
            renderPagination(totalPosts, page, postsPerPage);
        } catch (error) {
            console.error('投稿の取得に失敗:', error);
            postsListContainer.innerHTML = `<p>投稿の取得中にエラーが発生しました。${error.message}</p>`;
        }
        console.log(4);
    }

    initializePage();

    function renderPostHTML(post) {
        let thumbnailHTML = '';
        if (post.forum_images && post.forum_images.length > 0) {
            thumbnailHTML = `<div class="post-item-thumbnail"><img src="${post.forum_images[0].image_url}" alt="投稿画像"></div>`;
        }

        const timeAgoString = timeAgo(post.created_at);
        const remainingTime = timeLeft(post.delete_date);

        return `
            <article class="post-item">
                <a href="../../投稿系/html/forum_detail.html?id=${post.forum_id}" class="post-item-link">
                    <div class="post-item-main ${thumbnailHTML ? 'has-thumbnail' : ''}">
                        ${thumbnailHTML}
                        <div class="post-item-content">
                            <h3>${escapeHTML(post.title)} <small style="color:gray;">${timeAgoString}</small></h3>
                            <p>${nl2br(post.text.length > 50 ? post.text.slice(0, 50) + '...' : post.text)}</p>
                            <div class="post-meta">
                                <small style="color:gray;">${remainingTime}</small>
                            </div>
                        </div>
                    </div>
                </a>
            </article>
        `;
    }

    function renderPagination(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        let paginationHTML = '';
        const baseLink = `?id=${targetUserId}`;
        if (currentPage > 1) {
            paginationHTML += `<a href="${baseLink}&page=${currentPage - 1}">« 前へ</a>`;
        }
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                paginationHTML += `<span class="current-page">${i}</span>`;
            } else {
                paginationHTML += `<a href="${baseLink}&page=${i}">${i}</a>`;
            }
        }
        if (currentPage < totalPages) {
            paginationHTML += `<a href="${baseLink}&page=${currentPage + 1}">次へ »</a>`;
        }
        paginationContainer.innerHTML = paginationHTML;
    }
});