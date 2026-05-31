# 退勤記録 Webアプリ

Windows 11しかない場合用の、自分だけで使う退勤記録アプリです。

## 機能
- 退勤時間をワンタップ記録
- 1ヶ月分を一覧表示
- 記録をタップして時刻編集
- 今月分をコピー
- 今月分を削除
- 保存先はブラウザの localStorage

## 使い方の概要
1. index.html / manifest.webmanifest / sw.js をWeb上に置く
2. iPhoneのSafariでそのURLを開く
3. 共有 → ホーム画面に追加
4. ホーム画面から「退勤記録」を開く

注意: localStorage保存なので、SafariのWebサイトデータ削除やブラウザ初期化をすると記録が消える可能性があります。
