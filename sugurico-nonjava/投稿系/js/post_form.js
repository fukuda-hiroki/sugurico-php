// post_forum.js
'use strict';

document.addEventListener('DOMContentLoaded', async () =>{
    // header.jsで初期化済みのsupabaseクライアントをグローバルスコープから取得
    
    // --- HTML要素の取得 ---
    const postForm = document.getElementById('post-form');
    const titleInput = document.getElementById('titleInput');
    const textInput = document.getElementById('textInput');
    const expireSelect = document.getElementById('expireSelect');
    const imagesInput = document.getElementById('imagesInput');
    const submitButton = document.getElementById('submitButton');
    const messageArea = document.getElementById('message-area');

    // ★ IDではなく、クラスを持つ "すべて" の画像入力欄を対象にするコンテナを取得
    const imageInputContainer = document.getElementById('image-input-container');

    // --- ログインチェック ---
    const {data: {user} } = await supabaseClient.auth.getUser();
    if(!user){
        window.location.href ='../../ログイン系/html/login.html';
        return;
    }

    // --- フォーム送信イベント ---
    postForm.addEventListener('submit', async(event) =>{
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = '投稿中...';
        messageArea.style.display = 'none';

        try {
            // --- 1. 画像をSupabase Storageにアップロード ---
            // ★ コンテナの中から、すべてのファイル入力欄を取得
            const imageInputs = imageInputContainer.querySelectorAll('.image-input');
            const filesToUpload = [];
            imageInputs.forEach(input => {
                if (input.files[0]) {
                    filesToUpload.push(input.files[0]);
                }
            });
            // ★ 収集したファイルのリストをアップロード関数に渡す
            const imageUrls = await uploadImages(filesToUpload);

            // --- 2. 投稿本体(forumsテーブル)をDBに保存 ---
            const{data: savedForum,
                error: forumError
            } = await supabaseClient.from('forums').insert({
                user_id_auth: user.id,
                title: titleInput.value,
                text: textInput.value,
                delete_date:calculateDeleteDate(expireSelect.value)
            }).select() // INSERTしたデータを返すようにする
            .single();
            if (forumError) throw error;
            
            // --- 3. タグをDBに保存 ---
            const tagInputs = document.querySelectorAll('#tag-container input.tag-input');
            const tagValues = Array.from(tagInputs).map(input => input.value.trim()).filter(Boolean);

            // 配列から重複したタグを自動的に除去
            const tags = [...new Set(tagValues)];
            
            if (tags.length > 0) {
                await saveTags(savedForum.forum_id, tags);

            }

            // --- 4. 画像URLをDBに保存 ---
            if (imageUrls.length > 0) {
                await saveImageUrls(savedForum.forum_id, imageUrls);
            }
            
            // --- 成功 ---
            alert('投稿が完了しました。');
            window.location.href = '../../メイン系/html/index.html';
        } catch (error) {
            messageArea.textContent = '投稿に失敗しました:' + error.message;
            messageArea.className = 'message error';
            messageArea.style.display = 'block';
            console.error('Post Error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '投稿する';
        }
    });

    /**
     * 画像ファイルをSupabase Storageにアップロードする関数
     */

    async function uploadImages(files) {
        const uploadedUrls = [];
        if(!files || files.length === 0) return uploadedUrls;

        // ★ forEachではなく、Promise.allで並列アップロードすると高速
        const uploadPromises = Array.from(files).map(file => {
            const fileExt = file.name.split('.').pop();
            const randomName = crypto.randomUUID();
            const fileName = `${user.id}/${randomName}.${fileExt}`;

            return supabaseClient
                .storage
                .from('post-images')
                .upload(fileName, file);
        });

        // すべてのアップロードが完了するのを待つ
        const results = await Promise.all(uploadPromises);
        
        // 成功したものの公開URLを取得
        for (const result of results) {
            if(result.error) {
                // 1つでも失敗したらエラーを投げる
                throw new Error('画像アップロードに失敗:' + result.error.message);
            }
            const {data:{publicUrl}} = supabaseClient.storage.from('post-images').getPublicUrl(result.data.path);
            uploadedUrls.push(publicUrl);
        }
        return uploadedUrls;
    }

/**
     * タグ情報をDBに保存する関数
     * @param {number} forumId - 紐付ける投稿のID
     * @param {string[]} tagNames - タグ名の文字列の配列
     */
    async function saveTags(forumId, tagNames) {
        // --- 1. まず、既存のタグをDBからまとめて取得 ---
        const {
            data: existingTags, 
            error:selectError
        } = await supabaseClient
        .from('tag_dic')
        .select('tag_id, tag_name')
        .in('tag_name', tagNames);// 配列内のいずれかの名前に一致するものを検索

        if(selectError) throw selectError;

        // 検索しやすいように、{"tagName": tagId} の形式のマップに変換
        const existingTagsMap = new Map(
            existingTags.map(
                tag => [
                    tag.tag_name,
                    tag.tag_id
                ]
            )
        );

        // --- 2. 存在しないタグを特定し、DBに新規登録 ---
        const newTagNames = tagNames.filter(name =>
            !existingTagsMap.has(name)
        );

        let newTagIds = [];
        if (newTagNames.length > 0) {
            const newTagsToInsert = newTagNames.map(name => ({
                tag_name: name
            }));

            const{
                data: insertedTags, 
                error:insertError
            }= await supabaseClient.from('tag_dic')
            .insert(newTagsToInsert)
            .select('tag_id, tag_name');
            if (insertError) throw insertError;

            // 新しく作られたタグのIDをマップに追加
            insertedTags.forEach(tag => existingTagsMap.set(tag.tag_name, tag.tag_id));
        }
        // --- 3. すべてのタグを中間テーブルに紐付ける ---
        // 最終的に紐付けるべきtag_idのリストを作成

        const tagIdsToLink = tagNames.map(name => existingTagsMap.get(name));

        // 中間テーブルにINSERTするためのデータを作成
        const linksToInsert = tagIdsToLink.map(tagId => ({
            forum_id: forumId,
            tag_id: tagId
        }));
        const {error: linkError} = await supabaseClient
        .from('tag')// ★中間テーブル名
        .insert(linksToInsert);

        if(linkError) throw linkError;


    }

    /**
     * 画像URLをDBに保存する関数
     */
    async function saveImageUrls(forumId, urls) {
        const imageData = urls.map(
            (url,index) =>({
                post_id: forumId,
                image_url: url,
                display_order: index + 1
            }));
            const {error} = await supabaseClient.from('forum_images').insert(imageData);
            if(error) throw error;

    }

    /**
     * 公開期限の日時を計算する関数
     */
    function calculateDeleteDate(expiresOption){
        if(expiresOption === 'permanent') return null;
        
        const date = new Date();
        if (expiresOption === 'private') return date;
        const days = parseInt(expiresOption.replace('day', ''));
        date.setDate(date.getDate() + days);
        return date.toISOString();
    }

});