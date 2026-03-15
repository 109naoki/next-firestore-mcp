# MCP Chat

MCP (Model Context Protocol) 経由で外部ツールを活用できる AI チャット UI。
Anthropic Claude / OpenAI / Google Gemini をバックエンドに、ストリーミング応答・スレッド管理・認証を備えた Next.js アプリケーション。

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| AI / Streaming | Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`) |
| MCP Client | `@ai-sdk/mcp` (SSE transport) |
| Auth | Firebase Authentication (Client SDK + Admin SDK, Bearer トークン方式) |
| Database | Cloud Firestore |
| Form | react-hook-form + zod |
| Data Fetching | TanStack Query |
| UI | Tailwind CSS v4 + shadcn/ui + Radix UI |
| Deployment | Vercel |

## Architecture

```
┌─────────────┐     POST /api/chat      ┌──────────────────┐
│   Browser    │ ◄─── SSE Stream ──────► │  Next.js Server  │
│  (useChat)   │                         │                  │
└─────────────┘                         │  ┌────────────┐  │
                                        │  │ MCP Client │──┼──► External MCP Servers
                                        │  └────────────┘  │       (tools)
                                        │  ┌────────────┐  │
                                        │  │ streamText  │──┼──► Claude / GPT / Gemini API
                                        │  └────────────┘  │
                                        │  ┌────────────┐  │
                                        │  │ Firestore   │──┼──► Firebase (messages, threads)
                                        │  └────────────┘  │
                                        └──────────────────┘
```

### Auth Flow

Cookie は使わず、Firebase Client SDK の ID トークンを Bearer ヘッダーで送信するステートレスな認証方式を採用。

```
Firebase Auth (client)
  │  onAuthStateChanged → user.getIdToken()
  ▼
Authorization: Bearer <idToken>
  │
  ▼
API Route → verifyToken() → Firebase Admin verifyIdToken()
```

- クライアント: `useAuth` hook が認証状態を監視し、`authFetch` で全 API リクエストにトークンを自動付与
- サーバー: 各 API Route が `verifyToken()` で Bearer トークンを検証（メール認証済みユーザーのみ許可）

## Project Structure

```
├── app/
│   ├── layout.tsx                       # Root layout (QueryProvider)
│   ├── page.tsx                         # → /chat リダイレクト
│   ├── (auth)/
│   │   ├── login/page.tsx               # ログイン画面
│   │   ├── register/page.tsx            # ユーザー登録画面
│   │   └── verify-email/page.tsx        # メール認証確認画面
│   ├── api/
│   │   ├── chat/route.ts                # Chat API: MCP + streamText + Firestore 保存
│   │   └── threads/
│   │       ├── route.ts                 # スレッド一覧 GET
│   │       ├── create/route.ts          # スレッド作成 POST
│   │       ├── delete/route.ts          # スレッド削除 POST
│   │       ├── update-title/route.ts    # タイトル更新 POST
│   │       └── [threadId]/route.ts      # スレッド詳細 GET / メッセージ追記 PATCH
│   ├── actions/
│   │   └── generate-title.ts            # Claude Haiku でタイトル自動生成
│   └── chat/
│       ├── layout.tsx                   # サイドバー + メインエリア
│       ├── page.tsx                     # 最新スレッドへリダイレクト
│       └── [threadId]/page.tsx          # スレッド表示 (SSR → ChatInterface)
├── components/
│   ├── ChatInterface.tsx                # useChat hook でストリーミング統合
│   ├── ChatMessages.tsx                 # メッセージ表示 + ツール実行表示
│   ├── ChatInput.tsx                    # 入力 UI (Enter 送信, Shift+Enter 改行)
│   ├── ModelSelector.tsx                # モデル切り替え (Claude / GPT / Gemini)
│   ├── ThreadSidebar.tsx                # スレッド一覧・新規作成・削除
│   ├── providers/QueryProvider.tsx      # TanStack Query Provider
│   └── ui/                             # shadcn/ui コンポーネント
├── hooks/
│   ├── use-auth.ts                      # Firebase 認証状態管理 + authFetch
│   └── use-threads.ts                   # TanStack Query hooks (スレッド CRUD)
├── lib/
│   ├── firebase-admin.ts                # Firebase Admin SDK 初期化 (server-only)
│   ├── firebase-client.ts               # Firebase Client SDK 初期化
│   ├── verify-token.ts                  # Bearer トークン検証
│   ├── auth-chat-transport.ts           # AI SDK transport に認証を付与
│   ├── mcp-clients.ts                   # MCP Client factory
│   ├── threads.ts                       # Firestore スレッド操作
│   ├── types.ts                         # 型定義
│   └── utils.ts                         # cn() ヘルパー
├── firestore.indexes.json               # Firestore 複合インデックス定義
├── firestore.rules                      # Firestore セキュリティルール
└── vercel.json                          # Chat API maxDuration: 60s
```

## Firestore Schema

```
threads/{threadId}
  ├── userId: string
  ├── title: string
  ├── createdAt: Timestamp
  ├── updatedAt: Timestamp
  ├── lastMessagePreview: string
  ├── model: string
  │
  └── messages/{messageId}          (subcollection)
        ├── role: "user" | "assistant"
        ├── content: string
        └── createdAt: Timestamp
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Firebase プロジェクト (Firestore + Authentication 有効)
- Anthropic API Key（必須）
- OpenAI API Key / Google Gemini API Key（任意、対応モデルを使う場合）

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

`.env.local` を作成し、以下を設定:

```bash
# Firebase Client (public, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx

# Firebase Admin (server-only, private)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI Provider API Keys
ANTHROPIC_API_KEY=sk-ant-...       # 必須
OPENAI_API_KEY=sk-proj-...         # 任意
GOOGLE_GENERATIVE_AI_API_KEY=...   # 任意

# MCP Server URLs (numbered, add as many as needed)
MCP_SERVER_URL_1=https://your-mcp-server.example.com/sse
MCP_SERVER_URL_2=http://localhost:3001/sse
# MCP_SERVER_HEADERS_1='{"Authorization":"Bearer xxx"}'  # 認証が必要な場合
```

### 3. Deploy Firestore indexes & rules

```bash
firebase login
firebase init firestore
firebase deploy --only firestore:indexes,firestore:rules
```

### 4. Run locally

```bash
pnpm dev
```

http://localhost:3000 にアクセス。初回はユーザー登録 → メール認証 → チャット画面の順に進む。

## MCP Server Configuration

MCP サーバーを接続するには `.env.local` に URL を追加:

```bash
MCP_SERVER_URL_1=https://your-mcp-server.vercel.app/sse
MCP_SERVER_URL_2=http://localhost:3001/sse
```

番号を増やせば複数サーバーに同時接続可能。
各サーバーのツールは自動的にマージされ、チャット中に AI が使用できる。

設定しない場合はツールなしの素のチャットとして動作する。

### MCP 接続の仕組み

```
.env.local                    lib/mcp-clients.ts              app/api/chat/route.ts
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────────┐
│ MCP_SERVER_URL_1 │───>│ getDefaultMCPServers()│───>│ createMCPTools()        │
│ MCP_SERVER_URL_2 │    │ createMCPClient()     │    │ streamText({ tools })   │
│ MCP_SERVER_URL_3 │    │ client.tools()        │    │ → AI がツールを使用     │
└─────────────────┘    └──────────────────────┘    └─────────────────────────┘
```

## Deploy to Vercel

```bash
npx vercel
```

Vercel ダッシュボードで `.env.local` と同じ環境変数を設定。
`FIREBASE_PRIVATE_KEY` は Vercel UI に生のキーをペースト（エスケープ不要）。
