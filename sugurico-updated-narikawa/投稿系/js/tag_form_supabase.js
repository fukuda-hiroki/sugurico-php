// tag_form_supabase.js
'use strict';

// ★ 外部からアクセス可能なTagEditorオブジェクトを作成
const TagEditor = {
    // --- 内部状態 ---
    _tags: [], // タグ名の配列
    _maxTags: 10,

    // --- HTML要素 ---
    _elements: {},
    
    /**
     * 初期化処理
     */
    init: function() {
        this._elements = {
            container: document.getElementById('tags-input-ui-wrapper'),
            input: document.getElementById('tag-text-input')
        };
        
        if (!this._elements.container) return; // ページに必要な要素がなければ中断
        
        this._setupEventListeners();
    },

    /**
     * 編集時に既存のタグリストをセットする
     * @param {Array} tagNames - ['タグ1', 'タグ2', ...]
     */
    setTags: function(tagNames) {
        this._tags = [...tagNames];
        this._render();
    },

    /**
     * 現在のタグリストを取得する
     * @returns {Array} - ['タグ1', 'タグ2', ...]
     */
    getTags: function() {
        return this._tags;
    },
    
    /**
     * イベントリスナーを設定
     */
    _setupEventListeners: function() {
        const { container, input } = this._elements;

        container.addEventListener('click', () => input.focus());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const newTag = input.value.trim();
                if (newTag) {
                    this._add(newTag);
                }
            }
            if (e.key === 'Backspace' && input.value === '') {
                if (this._tags.length > 0) {
                    this._remove(this._tags.length - 1);
                }
            }
        });
    },

    /**
     * タグのUIを描画する
     */
    _render: function() {
        const { container, input } = this._elements;
        container.querySelectorAll('.tag-item').forEach(el => el.remove());
        
        this._tags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.textContent = tag;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'tag-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => this._remove(index);

            tagElement.appendChild(removeBtn);
            container.insertBefore(tagElement, input);
        });
    },

    /**
     * タグを追加する
     */
    _add: function(tagName) {
        if (this._tags.length >= this._maxTags) {
            alert(`タグは最大${this._maxTags}個までです。`);
            return;
        }
        if (!this._tags.includes(tagName)) {
            this._tags.push(tagName);
            this._render();
        }
        this._elements.input.value = '';
    },

    /**
     * タグを削除する
     */
    _remove: function(index) {
        this._tags.splice(index, 1);
        this._render();
    }
};

// ページの読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => TagEditor.init());