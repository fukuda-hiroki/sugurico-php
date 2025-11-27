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

        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach((card, index) =>{
            setTimeout(() =>{
                card.classList.add('is-visible');
            }, index * 100);
        });
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
            const { data, error, count } = await supabaseClient.rpc('filter_user_posts', {
                user_id_param: currentUser.id,
                keyword_param: keywordInput.value.trim(),
                period_param: periodSelect.value,
                tag_id_param: tagSelect.value ? parseInt(tagSelect.value) : null,
                sort_order_param: sortSelect.value,
                page_param: page,
                limit_param: postsPerPage
            }, { count: 'exact' });

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
        return `
            <a href="../../投稿系/html/forum_detail.html?id=${post.forum_id}">
                <article class="post-item">
                    <h3>${escapeHTML(post.title)}</h3>
                    <p>${nl2br(post.text)}</p>
                </article>
            </a>
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