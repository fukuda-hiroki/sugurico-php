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
    const deadline = new Date(utcDatestr);
    const now = new Date() - 9 * 60 * 60 * 1000; // JSTに変換
    if (deadline <= now) return '';

    let diffInMs = deadline - now;
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    diffInMs -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    diffInMs -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diffInMs / (1000 * 60));

    let result = '閲覧期限:あと';
    if (days > 0) result += `${days}日`;
    if (hours > 0) result += `${hours}時間`;
    if (minutes > 0) result += `${minutes}分`;
    return (result === '閲覧期限:あと') ? '閲覧期限:あとわずか' : result.trim();
}
