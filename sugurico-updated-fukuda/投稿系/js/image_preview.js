'use strict';

// --- ファイルスコープの変数 ---
const imageInputContainer = document.getElementById('image-input-container');
//const addButton = document.getElementById('add-image-button');
//const removeButton = document.getElementById('remove-image-button');
const previewContainer = document.getElementById('image-preview-container');

let maxImages = 3;
let existingImages = []; // {id, url} の配列
let existingImagesToDelete = []; // 削除対象のID配列
let newImageObjectUrls = []; // 新規追加画像のプレビュー用URL

// --- グローバルAPI (post_forum.jsからの窓口) ---
window.imageManager = {
    init: initialize,
    getImagesToDelete: () => existingImagesToDelete,
};

/**
 * 外部(post_forum.js)から呼び出される初期化関数
 * @param {boolean} isPremium - プレミアム会員か
 * @param {Array} initialImages - 編集時の初期画像リスト [{id, url}]
 */
function initialize(isPremium, initialImages = []) {
    const maxImagesCountSpan = document.getElementById('max-images-count');

    maxImages = isPremium ? 6 : 3;
    if (maxImagesCountSpan) maxImagesCountSpan.textContent = maxImages;

    existingImages = initialImages;
    existingImagesToDelete = []; // 初期化時にリセット

    if (imageInputContainer) {
        imageInputContainer.innerHTML = ''; // 既存のinputを一旦すべて削除
        const availableSlots = maxImages - existingImages.length;
        const slotsToCreate = Math.max(1, availableSlots); // 最低1つは作る
        if (availableSlots > 0) {
            for (let i = 0; i < slotsToCreate; i++) {
                addFileInput();
            }
        }

    }

    updateAllPreviews(); // プレビューを初期描画
}

document.addEventListener('DOMContentLoaded', () => {
    if (!imageInputContainer || !previewContainer) return;

    imageInputContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('image-input')) {
            updateAllPreviews();
        }
    });
    console.log("previewcontainer ランニング");
    previewContainer.addEventListener('click', (event) => {

        const clickedElement = event.target;

        if (clickedElement.classList.contains('delete-existing-image-button')) {
            event.preventDefault();
            event.stopPropagation();

            const imageId = parseInt(clickedElement.dataset.imageId);
            if (!imageId || existingImagesToDelete.includes(imageId)) return;

            existingImagesToDelete.push(imageId);

            const existingImageCount = existingImages.length - existingImagesToDelete.length;
            const newImageCount = imageInputContainer.querySelectorAll('.image-input').length;
            if (existingImageCount + newImageCount < maxImages) {
                addFileInput();
            }

            updateAllPreviews();
        } else if (clickedElement.tagName === 'IMG') {
            showModal(clickedElement.src);
        }
    });
});

/**
 * 新しいファイル入力欄を動的に追加する
 */
function addFileInput() {
    if (!imageInputContainer) return;
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
 * プレビュー全体を再描画する関数
 */
function updateAllPreviews() {
    if (!previewContainer) return;

    newImageObjectUrls.forEach(url => URL.revokeObjectURL(url));
    newImageObjectUrls = [];
    previewContainer.innerHTML = '';

    existingImages.forEach(image => {
        if (!existingImagesToDelete.includes(image.id)) {
            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview-wrapper existing-image';
            wrapper.innerHTML = `
                <img src="${image.url}" alt="既存の画像">
                <button type="button" class="delete-existing-image-button" data-image-id="${image.id}">×</button>
            `;
            previewContainer.appendChild(wrapper);
        }
    });

    const allInputs = document.querySelectorAll('#image-input-container .image-input');
    allInputs.forEach(input => {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const objectUrl = URL.createObjectURL(file);
            newImageObjectUrls.push(objectUrl);

            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview-wrapper';
            wrapper.innerHTML = `<img src="${objectUrl}" alt="新規画像プレビュー">`;
            previewContainer.appendChild(wrapper);
        }
    });
}

/**
 * 画像を拡大表示するモーダルを作成・表示
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