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

    let isPremiumUser = false; // ★2. プレミアム状態を管理する変数を宣言

    /**
     *  ページの初期化処理
     */
    async function initializePage() {
        // ★3. 最初にログイン状態とプレミアム状態を確認する
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { data: premiumRecords } = await supabaseClient
                .from('premium')
                .select('status')
                .eq('id', user.id);
            
            const premiumStatus = premiumRecords && premiumRecords[0];
            isPremiumUser = premiumStatus?.status === 'active';
        }

        // ★4. あなたのURL引継ぎロジックをプレミアム判定と組み合わせる
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const searchTerms = urlParams.get('terms');

        if (type === 'tag' && isPremiumUser) { // タグ検索はプレミアム会員のみ
            tagInput.value = searchTerms || '';
        } else if (type) { // それ以外のタイプ（title, textなど）は誰でもOK
            keywordInput.value = searchTerms || '';
        }

        setupEventListeners();
        performSearch(parseInt(urlParams.get('page')) || 1);
    }

    /**
     * ★5. イベントリスナーの設定をプレミアム状態で分岐させる
     */
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

            // 基本の検索パラメータ
            let searchParams = {
                current_user_id_param: currentUserId,
                keyword_param: keywordInput.value.trim(),
                author_param: null, // デフォルトはnull
                tag_param: null,    // デフォルトはnull
                period_param: 'all',
                sort_order_param: 'desc',
                page_param: page,
                limit_param: 10
            };

            // ★ もしプレミアム会員なら、詳細検索の値をパラメータに追加
            if (isPremiumUser) {
                searchParams.author_param = authorInput.value.trim();
                searchParams.tag_param = tagInput.value.trim();
                searchParams.period_param = periodSelect.value;
                searchParams.sort_order_param = sortSelect.value;
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
                        <article class="post-item ${thumbnailHTML ? 'has-thumbnail' : ''}">
                            
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