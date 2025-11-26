// search.js

document.addEventListener('DOMContentLoaded', () => {

    const advancedSearchWrapper = document.getElementById('advanced-search-wrapper');
    const premiumSearchOverlay = document.getElementById('premium-search-overlay');

    // --- HTML要素の取得 ---
    const searchTitle = document.getElementById('search-title');
    const searchCount = document.getElementById('search-count');
    const postsListContainer = document.getElementById('posts-list-container');
    const paginationContainer = document.getElementById('pagination-container');
    // 詳細検索フォームの要素
    const toggleSearchButton = document.getElementById('toggle-search-button');
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const filterButton = document.getElementById('filter-button');
    const keywordInput = document.getElementById('keyword-input');
    const authorInput = document.getElementById('author-input');
    const tagInput = document.getElementById('tag-input');
    const periodSelect = document.getElementById('period-select');
    const sortSelect = document.getElementById('sort-select');

    //  絞り込み検索を実行し、結果を描画するメイン関数
    async function initializePage() {
        const urlParams = new URLSearchParams(window.location.search);
            keywordInput.value = urlParams.get('keyword') || '';
            authorInput.value = urlParams.get('author') || '';
            tagInput.value = urlParams.get('tag') || '';
            periodSelect.value = urlParams.get('period') || 'all'; // デフォルト値を指定
            sortSelect.value = urlParams.get('sort') || 'desc';   // デフォルト値を指定

        // ▼▼▼ プレミアム判定ロジックを追加 ▼▼▼
        const isPremium = await isCurrentUserPremium();
        if (isPremium) {
            premiumSearchOverlay.style.display = 'none';
        } else {
            advancedSearchWrapper.classList.add('is-not-premium');
        }
        // ▲▲▲ 追加ここまで ▲▲▲

        setupEventListeners(isPremium); // isPremiumの結果を渡す
        performSearch(parseInt(urlParams.get('page')) || 1);
    }

    function setupEventListeners(isPremium) { // isPremium の判定結果を引数で受け取ります
        
        // 「詳細検索」ボタンのクリックイベント
        toggleSearchButton.addEventListener('click', () => {
            // まず、詳細検索フォームが現在非表示かどうかを確認します
            const isHidden = advancedSearchForm.style.display === 'none';

            if (isHidden) {
                // --- これからパネルを開く場合の処理 ---

                // ラッパーとオーバーレイの表示をリセット
                advancedSearchWrapper.classList.remove('is-not-premium');
                premiumSearchOverlay.style.display = 'none';

                if (isPremium) {
                    // 【プレミアム会員の場合】
                    // 通常通りフォームを表示します
                    advancedSearchForm.style.display = 'flex';
                } else {
                    // 【プレミアム会員でない場合】
                    // ここで初めて、フォームを操作不可に見せ、オーバーレイを表示します
                    advancedSearchWrapper.classList.add('is-not-premium');
                    premiumSearchOverlay.style.display = 'flex';
                    advancedSearchForm.style.display = 'flex'; // フォームのガワだけ表示
                }
                
                toggleSearchButton.textContent = '詳細検索を閉じる';

            } else {
                // --- すでに開いているパネルを閉じる場合の処理 ---
                advancedSearchForm.style.display = 'none';
                premiumSearchOverlay.style.display = 'none'; // 念のためオーバーレイも非表示に
                toggleSearchButton.textContent = '詳細検索';
            }
        });

        // 「検索」または「絞り込み」ボタンのクリックイベント (変更なし)
        filterButton.addEventListener('click', () => {
            // 正しい関数である performSearch を呼び出すように修正
            performSearch(1);
        });
    }

    async function performSearch(page = 1) {
        postsListContainer.innerHTML = '検索中…';
        paginationContainer.innerHTML = '';

        try {
            // ログインユーザー情報を取得する処理を追加
            const {data: { user }} = await supabaseClient.auth.getUser();
            const currentUserId = user ? user.id : null; // 未ログイン時はnull
            const excludeTagInput = document.getElementById('exclude-tag-input');
            const excludeTags = excludeTagInput.value.trim()
                .split(',') // カンマで分割して配列にする
                .map(tag => tag.trim()) // 各タグの前後の空白を削除
                .filter(Boolean); // 空の要素を取り除く

            //  フォームから現在の検索条件を取得
            const searchParams = {
                current_user_id_param: currentUserId,
                keyword_param: keywordInput.value.trim(),
                author_param: authorInput.value.trim(),
                tag_param: tagInput.value.trim(),
                period_param: periodSelect.value,
                sort_order_param: sortSelect.value,
                page_param: page,
                limit_param: 10,
                exclude_tags_param: excludeTags
            };

            //  RPCでDB関数を呼び出し、総件数とページデータを一度に取得
            const { data, error, count } = await supabaseClient
                .rpc('search_public_forums', searchParams, { count: 'exact' });
            if (error) throw error;

            const posts = data;
            const totalposts = count ?? 0;

            searchTitle.textContent = '検索結果';
            searchCount.textContent = `${totalposts}件の投稿が見つかりました。`;
            if (posts && posts.length > 0) {
                console.log(posts);
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

    function renderPagination(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        const baseLink = new URLSearchParams(window.location.search);

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
    initializePage();
});