// image_preview.js
'use strict';

// DOMContentLoadedのコールバックを「async」関数に変更します
document.addEventListener('DOMContentLoaded', async () => {
    const imageInputContainer = document.getElementById('image-input-container');
    const addButton = document.getElementById('add-image-button');
    const removeButton = document.getElementById('remove-image-button');
    const previewContainer = document.getElementById('image-preview-container');
    const maxImagesCountSpan = document.getElementById('max-images-count');

    // もし必要な要素がなければ処理を中断
    if (!imageInputContainer ||
        !addButton ||
        !removeButton ||
        !previewContainer) {
        return;
    }

    // supabaseClientが読み込まれているか確認
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client is not available. Make sure header.js is loaded.');
        return;
    }

    // ★ 共通関数を呼び出すように変更
    let currentObjectUrls = [];

    // ★ 共通関数を呼び出すように変更
    const isPremium = await isCurrentUserPremium(); 
    const maxImages = isPremium ? 6 : 3;
    maxImagesCountSpan.textContent = maxImages;

    // [追加]ボタンのクリックイベント
    addButton.addEventListener('click', () => {
        const currentInputs = imageInputContainer.querySelectorAll('.image-input');
        const lastInput = currentInputs[currentInputs.length - 1];
        // 最後の入力欄にファイルが選択されているかチェック
        if (lastInput.files.length === 0) {
            alert('最後の画像を選択してから追加してください。');
            lastInput.click(); // ファイル選択ダイアログを開く
            return;
        }
        if (currentInputs.length < maxImages) {
            addImageInput();
        } else {
            alert(`画像は最大${maxImages}枚までです。`);
        }
    });

    // [削除]ボタンのクリックイベント
    removeButton.addEventListener('click', () => {
        const wrappers = imageInputContainer.querySelectorAll('.image-input-wrapper');
        if (wrappers.length > 1) {
            wrappers[wrappers.length - 1].remove();
            updateAllPreviews();// 削除後にプレビュー全体を更新
        }
    });

    // 動的に追加される要素に対応するため、親要素にイベントリスナーを設定（イベント移譲）
    imageInputContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('image-input')) {
            updateAllPreviews();
        }
    });

    // --- 関数群 ---

    /**
     * 新しい画像入力欄を追加する
     */
    function addImageInput() {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-input-wrapper';

        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.name = 'images[]';
        newInput.className = 'image-input';
        newInput.accept = 'image/*';

        wrapper.appendChild(newInput);
        imageInputContainer.appendChild(wrapper);
    }

    /**
     * すべての入力欄をチェックし、プレビューを再描画する
     */
    function updateAllPreviews() {
        // ★ 古いblob URLをすべて無効化してメモリを解放
        currentObjectUrls.forEach(url => URL.revokeObjectURL(url));
        currentObjectUrls = [];// 配列をリセット

        previewContainer.innerHTML = '';
        const allInputs = imageInputContainer.querySelectorAll('.image-input');

        allInputs.forEach(input => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if (!file.type.startsWith('image/')) return;

                const previewWrapper = document.createElement('div');
                previewWrapper.className = 'image-preview-wrapper';

                const img = document.createElement('img');
                const objectUrl = URL.createObjectURL(file);

                // ★ 新しく生成したURLを管理配列に追加
                currentObjectUrls.push(objectUrl);

                img.src = objectUrl;
                img.alt = '画像プレビュー';
                img.addEventListener('click', () => { showModal(objectUrl); });

                previewWrapper.appendChild(img);
                previewContainer.appendChild(previewWrapper);

            }
        });
    }

    /**
     * 画像を拡大表示するモーダルを作成・表示
     * @param {string} src - 表示する画像のソースURL
     */
    function showModal(src) {
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';

        const modalImage = document.createElement('img');
        modalImage.src = src;
        modalImage.className = 'modal-image';

        modalBackdrop.appendChild(modalImage);
        document.body.appendChild(modalBackdrop);
        modalBackdrop.addEventListener('click', () => {
            modalBackdrop.remove();
        });
    }
});