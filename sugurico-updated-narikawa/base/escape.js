
// XSS対策のためのエスケープ関数群

/**
 * XSS対策のためのHTMLエスケープ関数
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

/**
 * 改行を<br>に変換する関数
 */
function nl2br(str) {
    return escapeHTML(str).replace(/\r\n|\n\r|\r|\n/g, '<br>');
}