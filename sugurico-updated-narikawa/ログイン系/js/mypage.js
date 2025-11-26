// mypage.js

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const advancedSearchWrapper = document.getElementById('advanced-search-wrapper');
    const premiumSearchOverlay = document.getElementById('premium-search-overlay');

    // --- HTML要素の取得 ---
    const mypageTitle = document.getElementById('mypage-title');
    const postsListContainer = document.getElementById('my-posts-list');
    const paginationContainer = document.getElementById('pagination-container');
    // 詳細検索フォームの要素
    const toggleSearchButton = document.getElementById('toggle-search-button');
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const filterButton = document.getElementById('filter-button');
    const keywordInput = document.getElementById('search-keyword');
    const periodSelect = document.getElementById('period-select');
    const sortSelect = document.getElementById('sort-select');
    const tagSelect = document.getElementById('tag-select');

    let currentUser;    //  ログインユーザー情報を保持する変数

    //  ページの初期化を行うメイン関数
    async function initializePage() {
        //  1. ログイン状態とユーザー情報を取得
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html'; // ログインページへリダイレクト
            return;
        }
        currentUser = session.user;

        // ▼▼▼ この制御ロジックを追加 ▼▼▼
        const isPremium = await isCurrentUserPremium();
        if (isPremium) {
            // プレミアム会員の場合：通常通り機能させる
            premiumSearchOverlay.style.display = 'none';
        } else {
            // プレミアム会員でない場合：ラッパーにクラスを付けて見た目を変え、オーバーレイを表示
            advancedSearchWrapper.classList.add('is-not-premium');
        }
        // ▲▲▲ 追加ここまで ▲▲▲

        const userName = currentUser.user_metadata?.user_name || 'あなた';
        mypageTitle.textContent = `${escapeHTML(userName)}の投稿一覧`;

        //  2. ユーザーが使用したタグを取得し、プルダウンを生成
        await populateUserTags();

        //  3. URLのパラメータを読み込んで、初期表示を行う
        const urlParams = new URLSearchParams(window.location.search);
        const page = parseInt(urlParams.get('page')) || 1;
        await fetchAndDisplayUserPosts(page);

        // --- 4. イベントリスナーを設定 ---
        setupEventListeners(isPremium); 
    }

    //  イベントリスナーをまとめて設定する関数
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
            fetchAndDisplayUserPosts(1); // or performSearch(1);
        });
    }

    //  ユーザーの投稿を取得し、表示する関数
    async function populateUserTags() {
        try {
            //  SupabaseのRPCで、作成したDB関数 "get_user_tags" を呼び出す
            const { data: tags, error } = await supabaseClient.
                rpc(
                    'get_user_tags', {
                    user_id_param: currentUser.id   //  関数の引数に、ログイン中のユーザーIDを渡す
                }
                );

            if (error) throw error;

            //  <select>の中身を一度クリアし、「すべてのタグ」を先頭に追加
            tagSelect.innerHTML = '<option value="">すべてのタグ</option>'

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
            // エラー時でも最低限の選択肢を表示
            tagSelect.innerHTML = '<option value="">すべてのタグ</option>';
        }
    }

    //  絞り込み条件に基づいてユーザーの投稿を取得・表示するメイン関数
    async function fetchAndDisplayUserPosts(page = 1) {
        postsListContainer.innerHTML = '読み込み中...';
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
            }, {
                count: 'exact'
            });
            if (error) throw error;
            console.log(data);

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
            postsListContainer.innerHTML = `<p>投稿の取得中にエラーが発生しました。:${error.message}</p>`;
        }
    }

    function renderPostHTML(post) {
        // 自分の投稿なので、編集・削除ボタンを追加
        const actionsHTML = `
            <div class="post-item-actions">
                <a href="../../投稿系/html/forum_input.html?edit_id=${post.forum_id}" class="action-button edit-button">編集</a>
                <button type="button" class="action-button delete-button" data-post-id="${post.forum_id}">削除</button>
            </div>
        `;

        // aタグで全体を囲むのではなく、リンクとアクションを分離する
        return `
            <article class="post-item">
                <a href="../../投稿系/html/forum_detail.html?id=${post.forum_id}" class="post-item-link">
                    <div class="post-item-main">
                        <h3>${escapeHTML(post.title)}</h3>
                        <p>${nl2br(post.text)}</p>
                    </div>
                </a>
                ${actionsHTML}
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
        if (keywordInput.value.trim() !== '') params.set('keyword', kewordInput.value.trim());
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
    initializePage();

    // 削除ボタン用のイベントリスナーを設定
    postsListContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-button')) {
            const postId = event.target.dataset.postId;
            if (confirm('この投稿を本当に削除しますか？')) {
                const { error } = await supabaseClient.rpc('delete_forum_with_related_data', { forum_id_param: postId });
                if (error) {
                    alert('削除に失敗しました。');
                } else {
                    alert('削除しました。');
                    location.reload(); // 簡単にするためリロード
                }
            }
        }
    });
});