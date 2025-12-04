// search.js

document.addEventListener('DOMContentLoaded', async () => { // ★1. async を追加

    // --- HTML要素の取得 ---
    const searchTitle = document.getElementById('search-title');
    const searchCount = document.getElementById('search-count');
    const postsListContainer = document.getElementById('posts-list-container');
    const paginationContainer = document.getElementById('pagination-container');
    const toggleSearchButton = document.getElementById('toggle-search-button');
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const filterButton = document.getElementById('filter-button');
    const keywordInput = document.getElementById('keyword-input');
    const authorInput = document.getElementById('author-input');
    const tagInput = document.getElementById('tag-input');
    const periodSelect = document.getElementById('period-select');
    const sortSelect = document.getElementById('sort-select');
    const excludeTagInput = document.getElementById('exclude-tag-input');

    let isPremiumUser = false; // ★2. プレミアム状態を管理する変数を宣言

    /**
     *  ページの初期化処理
     */
    async function initializePage() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { data: premiumRecords } = await supabaseClient
                .from('premium')
                .select('status')
                .eq('id', user.id);

            const premiumStatus = premiumRecords && premiumRecords[0];
            isPremiumUser = premiumStatus?.status === 'active';
        }
        setupUIAndForms();
        setupEventListeners();
        performSearch(parseInt(new URLSearchParams(window.location.search).get('page')) || 1);
    }
    function setupUIAndForms() {
        const urlParams = new URLSearchParams(window.location.search);
        // URLパラメータをフォームに反映

        const searchType = urlParams.get('type');
        if (searchType === 'tag') {
            tagInput.value = urlParams.get('terms');
        } else {
            keywordInput.value = urlParams.get('terms');
        }

        if (isPremiumUser) {

            toggleSearchButton.style.display = 'flex';
            authorInput.value = urlParams.get('author') || '';
            periodSelect.value = urlParams.get('period') || 'all';
            sortSelect.value = urlParams.get('sort') || 'desc';
            if (excludeTagInput) excludeTagInput.parentElement.style.display = 'block';
        } else {
            toggleSearchButton.style.display = 'none';
            if (excludeTagInput) excludeTagInput.parentElement.style.display = 'none';
        }
    }
    function setupEventListeners() {
        if (isPremiumUser) {
            // プレミアム会員なら、詳細検索を開く機能を有効化
            toggleSearchButton.style.display = 'flex'; // ボタン自体を表示
            toggleSearchButton.addEventListener('click', () => {
                const isHidden = advancedSearchForm.style.display === 'none';
                advancedSearchForm.style.display = isHidden ? 'block' : 'none';
                // HTMLに合わせてアイコンとテキストを個別に操作
                const btnIcon = toggleSearchButton.querySelector('.btn-icon');
                const btnText = toggleSearchButton.querySelector('.btn-text');
                if (isHidden) {
                    btnIcon.textContent = '🔼';
                    btnText.textContent = '閉じる';
                } else {
                    btnIcon.textContent = '🔍';
                    btnText.textContent = '詳細検索';
                }
            });
        } else {
            // 通常会員・ログアウト時は、ボタンを非表示
            toggleSearchButton.style.display = 'none';
        }

        // 絞り込みボタンの機能は誰でも使える
        filterButton.addEventListener('click', () => performSearch(1));
    }
    /**
     * ★6. 検索の実行もプレミアム状態で分岐させる
     */
    async function performSearch(page = 1) {
        postsListContainer.innerHTML = '<p class="loading-text">検索中...</p>'; // CSSに合わせてクラス名を追加
        paginationContainer.innerHTML = '';

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            const currentUserId = user ? user.id : null;

            // ★★★ パラメータをDB関数に完全に一致させる ★★★
            let searchParams = {
                current_user_id_param: currentUserId, // ★ ログインユーザーIDを渡す
                keyword_param: keywordInput.value.trim() || '',
                author_param: '',
                tag_param: '',
                exclude_tags_param: [], // ★ プレミアム機能
                period_param: 'all',
                sort_order_param: 'desc',
                page_param: page,
                limit_param: 10
            };

            if (isPremiumUser) {
                searchParams.author_param = authorInput.value.trim() || '';
                searchParams.tag_param = tagInput.value.trim() || '';
                searchParams.period_param = periodSelect.value;
                searchParams.sort_order_param = sortSelect.value;

                if (excludeTagInput && excludeTagInput.value.trim()) {
                    searchParams.exclude_tags_param = excludeTagInput.value.trim().split(',').map(tag => tag.trim());
                }
            }

            const { data, error, count } = await supabaseClient
                .rpc('search_public_forums', searchParams, { count: 'exact' });

            if (error) throw error;

            const posts = data;
            const totalposts = count ?? 0;

            searchTitle.textContent = '検索結果';
            searchCount.textContent = `${totalposts}件の投稿が見つかりました。`;
            if (posts && posts.length > 0) {
                postsListContainer.innerHTML = posts.map(post => renderPost(post)).join('');
            } else {
                postsListContainer.innerHTML = '<p>該当する投稿は見つかりませんでした。</p>';
            }
            renderPagination(totalposts, page, 10);
        } catch (error) {
            console.error('検索エラー:', error);
            postsListContainer.innerHTML = `<p>検索中にエラーが発生しました。</p>`;
        }
    }

    // (renderPost は変更なし)
    function renderPost(post) {
        let thumbnailHTML = '';
        if (post.forum_images && post.forum_images.length > 0) {
            thumbnailHTML = `<div class="post-item-thumbnail"><img src="${post.forum_images[0].image_url}" alt="投稿画像"></div>`;
        }
        const remainingTime = timeLeft(post.delete_date);
        const timeAgoString = timeAgo(post.created_at);

        return `
                    <a href="../../投稿系/html/forum_detail.html?id=${post.forum_id}" class="post-link">
                        <article class="post-item ${thumbnailHTML ? 'has-thumbnail' : ''}" style="min-width:96%">
                            
                            <div class="post-item-content">
                            <h3>${escapeHTML(post.title)} <small style="color:gray;">${timeAgoString}</small> </h3>
                                <p>${nl2br(post.text.length > 20 ? post.text.slice(0, 20) + '...' : post.text).replace(/\n/g, '<br>')}</p>
                                <small>投稿者: ${escapeHTML(post.user_name)}</small>
                                <br>
                                <small style="color:gray;">${remainingTime}</small>
                            </div>
                            ${thumbnailHTML}
                        </article>
                    </a>
                `;
    }

    /**
     * ★7. ページネーションのリンク生成を修正
     */
    function renderPagination(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        // 現在のURLパラメータを維持しつつ、pageだけを書き換える
        const urlParams = new URLSearchParams(window.location.search);
        let paginationHTML = '';

        const createPageLink = (page) => {
            urlParams.set('page', page);
            return `?${urlParams.toString()}`;
        };

        if (currentPage > 1) {
            paginationHTML += `<a href="${createPageLink(currentPage - 1)}">« 前へ</a>`;
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                paginationHTML += `<span class="current-page">${i}</span>`;
            } else {
                paginationHTML += `<a href="${createPageLink(i)}">${i}</a>`;
            }
        }

        if (currentPage < totalPages) {
            paginationHTML += `<a href="${createPageLink(currentPage + 1)}">次へ »</a>`;
        }

        paginationContainer.innerHTML = paginationHTML;
    }

    initializePage();
});