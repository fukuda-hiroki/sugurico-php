// image_preview.js
'use strict';

// 外部からアクセス可能なImageUploaderオブジェクトを作成
const ImageUploader = {
    // --- 内部状態を管理する変数 ---
    _maxImages: 3,
    _existingImages: [], // {id, url} の配列
    _newFiles: [],       // Fileオブジェクトの配列
    _imagesToDelete: [], // 削除対象の画像IDの配列
    // --- HTML要素 ---
    _elements: {},

    /**
     * 初期化処理
     */
    init: async function() {
        this._elements = {
            dropZone: document.getElementById('image-drop-zone'),
            imageInput: document.getElementById('image-input'),
            selectButton: document.getElementById('select-image-button'),
            previewContainer: document.getElementById('image-preview-container'),
            maxCountSpan: document.getElementById('max-images-count'),
        };

        if (!this._elements.dropZone) return; // ページに必要な要素がなければ中断

        const isPremium = await isCurrentUserPremium();
        this._maxImages = isPremium ? 6 : 3;
        this._elements.maxCountSpan.textContent = this._maxImages;

        this._setupEventListeners();
    },

    /**
     * 編集時に既存の画像リストをセットする
     * @param {Array} images - [{image_id, image_url}, ...]
     */
    setExistingImages: function(images) {
        this._existingImages = images.map(img => ({ id: img.image_id, url: img.image_url }));
        this._renderPreviews();
    },

    /**
     * 削除対象の画像IDリストを取得する
     * @returns {Array} - [id1, id2, ...]
     */
    getImagesToDelete: function() {
        return this._imagesToDelete;
    },
    
    /**
     * 新しく追加されたファイルリストを取得する
     * @returns {Array} - [File, File, ...]
     */
    getNewFiles: function() {
        return this._newFiles;
    },

    /**
     * イベントリスナーを設定
     */
    _setupEventListeners: function() {
        const { dropZone, imageInput, selectButton } = this._elements;

        selectButton.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', () => this._handleFiles(imageInput.files, 'overwrite'));
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this._handleFiles(e.dataTransfer.files, 'append');
        });
    },

    /**
     * ファイル選択・ドロップ時の処理
     * @param {FileList} files - ユーザーが選択したファイルのリスト
     * @param {string} mode - 'append' (追加) または 'overwrite' (上書き)
     */
    _handleFiles: function(files, mode = 'append') {
        // ▼▼▼ ここからロジックを大幅に修正 ▼▼▼
        // --------------------------------------------------------------------
        // 「上書き」モードの場合、既存の新規ファイルリストをクリアする
        if (mode === 'overwrite') {
            this._newFiles = [];
        }

        for (const file of files) {
            // 現在の合計枚数を計算
            const currentCount = this._existingImages.length + this._newFiles.length;
            if (currentCount >= this._maxImages) {
                alert(`画像は最大${this._maxImages}枚までです。`);
                break; // ループを抜ける
            }
            if (!file.type.startsWith('image/')) continue;
            
            // 重複チェック（新規ファイルリスト内でのみ）
            if (this._newFiles.some(f => f.name === file.name)) continue;

            this._newFiles.push(file);
        }
        this._renderPreviews(); // 最後にプレビューを更新
    },

    /**
     * プレビューを再描画する
     */
    _renderPreviews: function() {
        const { previewContainer } = this._elements;
        previewContainer.innerHTML = '';

        // 1. 既存画像のプレビューを描画
        this._existingImages.forEach(image => {
            this._createPreviewElement(image.url, image.id, 'existing');
        });

        // 2. 新規画像のプレビューを描画
        this._newFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this._createPreviewElement(e.target.result, index, 'new');
            };
            reader.readAsDataURL(file);
        });
        
        // ★ 最後に、現在の_newFiles配列の状態を実際の<input>要素に反映させる
        // これにより、post_forum.jsが常に正しいファイルリストを参照できるようになる
        const dataTransfer = new DataTransfer();
        this._newFiles.forEach(file => dataTransfer.items.add(file));
        this._elements.imageInput.files = dataTransfer.files;
    },

    /**
     * 個別のプレビュー要素を生成して追加する
     */
    _createPreviewElement: function(src, identifier, type) {
        const wrapper = document.createElement('div');
        wrapper.className = `image-preview-wrapper ${type === 'existing' ? 'existing' : ''}`;
        
        const img = document.createElement('img');
        img.src = src;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-preview-button';
        removeBtn.textContent = '×';
        
        removeBtn.addEventListener('click', () => {
            if (type === 'existing') {
                // 既存画像を削除する場合
                this._imagesToDelete.push(identifier); // 削除リストにIDを追加
                this._existingImages = this._existingImages.filter(img => img.id !== identifier);
            } else {
                // 新規画像を削除する場合
                this._newFiles.splice(identifier, 1); // 配列からファイルを削除
            }
            this._renderPreviews(); // プレビューを再描画
        });
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        this._elements.previewContainer.appendChild(wrapper);
    }
};

// ページの読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => ImageUploader.init());