'use strict';

const imageInputContainer = document.getElementById('image-input-container');
const previewContainer = document.getElementById('image-preview-container');

let maxImages = 3;
let existingImages = [];
let existingImagesToDelete = [];
let newImageObjectUrls = [];

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
    existingImagesToDelete = [];

    if (imageInputContainer) {
        imageInputContainer.innerHTML = ''; 
        const availableSlots = maxImages - existingImages.length;
        const slotsToCreate = Math.max(1, availableSlots); 
        if (availableSlots > 0) {
            for (let i = 0; i < slotsToCreate; i++) {
                addFileInput();
            }
        }

    }

    updateAllPreviews();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!imageInputContainer || !previewContainer) return;

    imageInputContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('image-input')) {
            updateAllPreviews();
        }
    });

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
    
    const wrapperLabel = document.createElement('label');
    wrapperLabel.className = 'image-input-wrapper custom-file-input';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'file-icon';
    iconSpan.textContent = '📁'; 

    const fileNameSpan = document.createElement('span');
    fileNameSpan.className = 'file-name';
    fileNameSpan.textContent = 'クリックして画像を選択';

    const newInput = document.createElement('input');
    newInput.type = 'file';
    newInput.className = 'image-input'; 
    newInput.name = 'images[]';
    newInput.accept = 'image/*';

    newInput.addEventListener('change', () => {
        if (newInput.files && newInput.files.length > 0) {
            fileNameSpan.textContent = newInput.files[0].name;
            wrapperLabel.classList.add('is-selected');
        } else {
            fileNameSpan.textContent = 'クリックして画像を選択';
            wrapperLabel.classList.remove('is-selected');
        }
    });
    
    wrapperLabel.appendChild(newInput); 
    wrapperLabel.appendChild(iconSpan);
    wrapperLabel.appendChild(fileNameSpan);

    imageInputContainer.appendChild(wrapperLabel);
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