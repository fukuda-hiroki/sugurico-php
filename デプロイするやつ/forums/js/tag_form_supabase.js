'use strict';

// --- グローバルAPI ---
window.tagManager = {
  init: initializeTags,
};

// --- ファイルスコープの変数 ---
const maxTags = 10;

/**
 * 外部から呼び出される初期化関数
 * @param {Array<string>} initialTags - 編集時の初期タグ名の配列
 */
function initializeTags(initialTags = []) {
    const tagContainer = document.getElementById('tag-container');
    if (!tagContainer) return;

    tagContainer.innerHTML = '';

    if (initialTags.length > 0) {
        initialTags.forEach(tag => addTagInput(tag));
    }
    
    addTagInput();
    
    if (!tagContainer.dataset.initialized) {
        setupTagEventListeners();
        tagContainer.dataset.initialized = 'true';
    }
}

function setupTagEventListeners() {
    const tagContainer = document.getElementById('tag-container');
    if (!tagContainer) return;

    tagContainer.addEventListener('input', (event) => {
        if (event.target.classList.contains('tag-input')) {
            const allWrappers = tagContainer.querySelectorAll('.tag-input-wrapper');
            const lastWrapper = allWrappers[allWrappers.length - 1];
            
            if (event.target === lastWrapper.querySelector('input') && event.target.value.trim() !== '') {
                addTagInput();
            }
        }
    });

    tagContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-tag-button')) {
            const allWrappers = tagContainer.querySelectorAll('.tag-input-wrapper');
            if (allWrappers.length > 1) {
                event.target.closest('.tag-input-wrapper').remove();
            } else {
                event.target.closest('.tag-input-wrapper').querySelector('input').value = '';
            }
        }
    });
}

function addTagInput(value = '') {
    const tagContainer = document.getElementById('tag-container');
    if (!tagContainer) return;

    const currentInputs = tagContainer.querySelectorAll('.tag-input-wrapper');
    if (currentInputs.length >= maxTags) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'tag-input-wrapper';

    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.name = 'tags[]';
    newInput.className = 'tag-input';
    newInput.placeholder = 'タグを追加...';
    newInput.value = value;
    newInput.autocomplete = 'off';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-tag-button';
    deleteButton.innerHTML = '&times;';

    wrapper.appendChild(newInput);
    wrapper.appendChild(deleteButton);
    tagContainer.appendChild(wrapper);
}