// util.js - 共通ユーティリティ関数

'use strict';

function timeAgo(utcDatestr) {
    if (!utcDatestr) return '';

    const postDate = new Date(utcDatestr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 5) return 'たった今';
    if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}時間前`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}日前`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}ヶ月前`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}年前`;
}


function timeLeft(utcDatestr) {
    if (!utcDatestr) return '無期限';

    // DBからのUTC文字列を、正しくDateオブジェクトに変換
    const deadline = new Date(utcDatestr);
    
    // JavaScriptの現在時刻を取得
    const now = new Date();

    // 期限が過去（または現在）なら、空文字列を返す
    // Dateオブジェクト同士の比較は、内部的にミリ秒で行われるため、これでOK
    if (deadline <= now) {
        return '';
    }

    // --- ここから残り時間の計算 ---
    let diffInMs = deadline.getTime() - now.getTime();

    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    diffInMs -= days * (1000 * 60 * 60 * 24);

    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    diffInMs -= hours * (1000 * 60 * 60);

    const minutes = Math.floor(diffInMs / (1000 * 60));

    let result = '閲覧期限: あと';
    if (days > 0) result += ` ${days}日`;
    if (hours > 0) result += ` ${hours}時間`;
    // 1時間未満の場合のみ分を表示すると、より自然に見える
    if (days === 0 && minutes > 0) result += ` ${minutes}分`;
    
    // 何も追加されなかった場合（1分未満）
    if (result === '閲覧期限: あと') {
        return '閲覧期限: あとわずか';
    }

    return result.trim();
}
