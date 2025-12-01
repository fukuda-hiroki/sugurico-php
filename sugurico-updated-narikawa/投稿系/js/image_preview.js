// image_preview.js
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // 必要な要素をページから取得
    const dropZone = document.getElementById('image-drop-zone');
    const imageInput = document.getElementById('image-input');
    const selectButton = document.getElementById('select-image-button');
    const previewContainer = document.getElementById('image-preview-container');
    const maxImagesCountSpan = document.getElementById('max-images-count');

    // 必要な要素がなければ処理を中断
    if (!dropZone || !imageInput || !selectButton || !previewContainer) {
        return;
    }

    // プレミアム状態に応じて最大枚数を設定
    const isPremium = await isCurrentUserPremium(); 
    const maxImages = isPremium ? 6 : 3;
    maxImagesCountSpan.textContent = maxImages;

    // 選択されたファイルを管理するための配列
    let selectedFiles = [];

    // --- イベントリスナーの設定 ---

    // 「ファイルを選択」ボタンがクリックされたら、隠れているinputをクリック
    selectButton.addEventListener('click', () => imageInput.click());

    // ファイルが選択されたら処理を実行
    imageInput.addEventListener('change', () => {
        handleFiles(imageInput.files);
    });

    // --- ドラッグ＆ドロップのイベント設定 ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // ブラウザのデフォルト動作を無効化
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files); // ドロップされたファイルを取得
    });

    /**
     * ファイルが選択された（またはドロップされた）ときのメイン処理
     * @param {FileList} files - ユーザーが選択したファイルのリスト
     */
    function handleFiles(files) {
        for (const file of files) {
            // 上限チェック
            if (selectedFiles.length >= maxImages) {
                alert(`画像は最大${maxImages}枚までです。`);
                break;
            }
            // ファイル形式チェック
            if (!file.type.startsWith('image/')) continue;
            // 重複チェック (同じ名前のファイルは追加しない)
            if (selectedFiles.some(f => f.name === file.name)) continue;
            
            selectedFiles.push(file);
        }
        renderPreviews();
    }

    /**
     * プレビューを描画する関数
     */
    function renderPreviews() {
        previewContainer.innerHTML = ''; // プレビューを一度クリア

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                // プレビュー用のHTML要素を作成
                const wrapper = document.createElement('div');
                wrapper.className = 'image-preview-wrapper';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-preview-button';
                removeBtn.textContent = '×';
                // ★ ボタンに、削除対象のファイルのインデックスを保存
                removeBtn.dataset.index = index;

                removeBtn.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.target.dataset.index, 10);
                    // ファイル管理配列から指定のファイルを削除
                    selectedFiles.splice(indexToRemove, 1);
                    // プレビューを再描画
                    renderPreviews();
                });
                
                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                previewContainer.appendChild(wrapper);
            };
            
            reader.readAsDataURL(file);
        });
        
        // ★ フォーム送信で使えるように、最新のファイルリストをinput要素にセットし直す
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        imageInput.files = dataTransfer.files;
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