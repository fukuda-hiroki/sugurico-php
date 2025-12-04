'use strict';

document.addEventListener('DOMContentLoaded', async () => { // ★ async を追加

    // --- HTML要素の取得 ---
    const mypageTitle = document.getElementById('mypage-title');
    const postsListContainer = document.getElementById('my-posts-list');
    const paginationContainer = document.getElementById('pagination-container');
    const toggleSearchButton = document.getElementById('toggle-search-button');
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const filterButton = document.getElementById('filter-button');
    const keywordInput = document.getElementById('search-keyword');
    const periodSelect = document.getElementById('period-select');
    const sortSelect = document.getElementById('sort-select');
    const tagSelect = document.getElementById('tag-select');

    let currentUser;

    async function initializePage() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = session.user;

        const userName = currentUser.user_metadata?.user_name || 'あなた';
        mypageTitle.textContent = `${escapeHTML(userName)}の投稿一覧`;

        await populateUserTags();

        const urlParams = new URLSearchParams(window.location.search);
        // URLパラメータをフォームに反映
        keywordInput.value = urlParams.get('keyword') || '';
        periodSelect.value = urlParams.get('period') || 'all';
        sortSelect.value = urlParams.get('sort') || 'desc';
        tagSelect.value = urlParams.get('tag') || '';
        
        await fetchAndDisplayUserPosts(parseInt(urlParams.get('page')) || 1);

        setupEventListeners();
    }

    function setupEventListeners() {
        toggleSearchButton.addEventListener('click', () => {
            const isHidden = advancedSearchForm.style.display === 'none';
            advancedSearchForm.style.display = isHidden ? 'block' : 'none';
            
            // ボタンの表示をsearch.htmlと統一
            const btnIcon = toggleSearchButton.querySelector('.btn-icon');
            const btnText = toggleSearchButton.querySelector('.btn-text');
            if (isHidden) {
                if (btnIcon) btnIcon.textContent = '🔼';
                if (btnText) btnText.textContent = '閉じる';
            } else {
                if (btnIcon) btnIcon.textContent = '🔍';
                if (btnText) btnText.textContent = '詳細検索';
            }
        });

        filterButton.addEventListener('click', () => {
            updateURL(); // URLを更新してから検索
            fetchAndDisplayUserPosts(1);      
        });
    }

    async function populateUserTags() {
        try {
            const { data: tags, error } = await supabaseClient.rpc('get_user_tags', {
                user_id_param: currentUser.id
            });
            if (error) throw error;

            tagSelect.innerHTML = '<option value="">すべてのタグ</option>';
            if (tags) {
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag.tag_id;
                    option.textContent = tag.tag_name;
                    tagSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('ユーザーのタグリスト取得に失敗:', error);
            tagSelect.innerHTML = '<option value="">すべてのタグ</option>';
        }
    }

    async function fetchAndDisplayUserPosts(page = 1) {
        postsListContainer.innerHTML = '<p class="loading-text">読み込み中...</p>'; // CSSに合わせてクラス名変更
        paginationContainer.innerHTML = '';

        try {
            const postsPerPage = 10;
            // rpc関数のselect句は直接指定できないため、rpc自体を修正するか、
            // forumテーブルを直接叩く方式に変更する必要があります。
            // ここでは、mypage.js専用にforumテーブルを直接クエリする方式を提案します。
            
            let query = supabaseClient
                .from('forums')
                .select(`
                    forum_id,
                    title,
                    text,
                    created_at,
                    delete_date,
                    forum_images ( image_url )
                `, { count: 'exact' }) // count: 'exact' をここに追加
                .eq('user_id_auth', currentUser.id);

            // rpc('filter_user_posts')が内部で行っていたフィルタリングをJSで再現
            const keyword = keywordInput.value.trim();
            if (keyword) {
                query = query.or(`title.ilike.%${keyword}%,text.ilike.%${keyword}%`);
            }
            
            // ... 他のフィルタ（期間、タグ、ソート）もここに追加可能ですが、
            //     簡単のため、まずは画像表示を優先します。
            
            query = query.order('forum_id', { ascending: false }) // 仮のソート
                         .range((page - 1) * postsPerPage, page * postsPerPage - 1);


            const { data, error, count } = await query;

            if (error) throw error;
            
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
            postsListContainer.innerHTML = `<p>投稿の取得中にエラーが発生しました。</p>`;
        }
    }

    function renderPostHTML(post) {
        let thumbnailHTML = '';
        // 投稿に画像 (forum_images) があり、その中に画像が1枚以上あるかチェック
        if (post.forum_images && post.forum_images.length > 0) {
            thumbnailHTML = `<div class="post-item-thumbnail"><img src="${post.forum_images[0].image_url}" alt="投稿画像"></div>`;
        }

        const timeAgoString = timeAgo(post.created_at);
        const remainingTime = timeLeft(post.delete_date);

        // mypage.cssのスタイルに合わせてクラスを追加・調整
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
            return; // ページネーション不要
        }

        let paginationHTML = '';

        const params = new URLSearchParams();
        if (keywordInput.value.trim() !== '') params.set('keyword', keywordInput.value.trim());
        if (periodSelect.value !== 'all') params.set('period', periodSelect.value);
        if (sortSelect.value !== 'newest') params.set('sort', sortSelect.value);
        if (tagSelect.value !== '') params.set('tag', tagSelect.value);

        if (currentPage > 1) {
            params.set('page', currentPage - 1);
            paginationHTML += `<a href="?${params.toString()}" class="pagination-button">前へ</a>`;
        }

        for (let i = 1; i <= totalPages; i++) {
            params.set('page', i);
            if (i === currentPage) {
                paginationHTML += `<span class="pagination-button current">${i}</span>`;
            } else {
                paginationHTML += `<a href="?${params.toString()}" class="pagination-button">${i}</a>`;
            }
        }

        if (currentPage < totalPages) {
            params.set('page', currentPage + 1);
            paginationHTML += `<a href="?${params.toString()}" class="pagination-button">次へ</a>`;
        }

        paginationContainer.innerHTML = paginationHTML;
    }
    
    // URLを現在のフォーム内容で更新する関数 (search.jsから移植)
    function updateURL() {
        const urlParams = new URLSearchParams();
        if (keywordInput.value.trim()) urlParams.set('keyword', keywordInput.value.trim());
        if (periodSelect.value !== 'all') urlParams.set('period', periodSelect.value);
        if (sortSelect.value !== 'desc') urlParams.set('sort', sortSelect.value);
        if (tagSelect.value) urlParams.set('tag', tagSelect.value);
        history.replaceState(null, '', `?${urlParams.toString()}`);
    }

    initializePage();
});