# ファイルの配置方法

このzipの中のファイルを、あなたの `sangokushi-app` プロジェクトフォルダに**上書き**してください。

## フォルダ構成

```
sangokushi-app/
├── lib/
│   └── supabase.ts        ← 新規作成
├── app/
│   ├── page.tsx           ← 上書き
│   └── login/
│       └── page.tsx       ← 新規作成
└── .env.local.example     ← 参考用（実際は .env.local を使う）
```

## 注意事項

- `.env.local` はすでに作成済みのものをそのまま使ってください
- `app/login/` フォルダがなければ作成してから `page.tsx` を配置してください
- 配置後は `npm run dev` で動作確認してください
