//tag_form_supabase.js
'use strict';

const tagContainer = document.getElementById('tag-container');
const insertButton = document.getElementById('insert-tags');
const deleteButton = document.getElementById('delete-tags');
const maxTags = 10;
// 新しいタグ入力欄を追加する関数

function addTagInput(value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'tag-input-wrapper';

    const newInput = document.createElement('input');
    newInput.value = value;
    newInput.type = 'text';
    newInput.name = 'tags[]';
    newInput.placeholder = 'タグを入力';
    newInput.className = 'tag-input';

    wrapper.appendChild(newInput);

    const buttonContainer = tagContainer.querySelector('.tag-buttons');
    tagContainer.insertBefore(wrapper, buttonContainer);

    newInput.focus();

}
function showButtons() {

    const wrappers = tagContainer.querySelectorAll('.tag-input-wrapper');
    insertButton.style.display = 'inline';
    deleteButton.style.display = 'inline';

    if (wrappers.length === 1) {
        deleteButton.style.display = 'none';
    }
    if (wrappers.length === maxTags) {
        insertButton.style.display = 'none';
    }
}
document.addEventListener('DOMContentLoaded', () => {


    if (!tagContainer || !insertButton || !deleteButton) {
        return;
    }



    showButtons();

    // --- [追加]ボタンのクリックイベント ---
    insertButton.addEventListener('click', (event) => {
        event.preventDefault();

        const wrappers = tagContainer.querySelectorAll('.tag-input-wrapper');
        const lastInput = wrappers[wrappers.length - 1].querySelector('input');

        // 直前の入力欄が空でないか
        if (lastInput.value.trim() === '') {
            alert('最後のタグ入力欄を埋めてから追加してください。');
            lastInput.focus();
            return; // 処理を中断
        }

        addTagInput();
        showButtons();
    });

    // --- [削除]ボタンのクリックイベント ---
    deleteButton.addEventListener('click', (event) => {
        event.preventDefault();

        const wrappers = tagContainer.querySelectorAll('.tag-input-wrapper');

        // ▼▼▼ 確認ダイアログを追加 ▼▼▼
        // 入力欄が1つより多く存在する場合
        if (wrappers.length > 1) {
            const lastWrapper = wrappers[wrappers.length - 1];
            const lastInput = lastWrapper.querySelector('input');

            // 最後の入力欄に何か入力されている場合は、確認メッセージを出す
            if (lastInput.value.trim() !== '') {
                if (confirm('最後のタグ「' + lastInput.value + '」を削除しますか？')) {
                    lastWrapper.remove();
                }
            } else {
                // 空の場合は、確認なしで削除
                lastWrapper.remove();
            }
        }
        showButtons();
    });






});