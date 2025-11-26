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
            const { data, error, count } = await supabaseClient
                .rpc('filter_other_user_posts', {//  mypage.jsにあるfilter_user_postsとは別(時間指定があるから)
                    user_id_param: targetUserId,
                    keyword_param: keywordInput.value.trim(),
                    period_param: periodSelect.value,
                    tag_id_param: tagSelect.value ? parseInt(tagSelect.value) : null,
                    sort_order_param: sortSelect.value,
                    page_param: page,
                    limit_param: postsPerPage
                }, { count: 'exact' });

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