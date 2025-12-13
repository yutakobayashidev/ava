import { Header } from "@/components/header";
import { Footer } from "@/components/landing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getCurrentSession } from "@/lib/server/session";
import {
  Code2,
  ExternalLink,
  GitBranch,
  GitFork,
  Heart,
  Scale,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

const techStack = [
  {
    category: "フロントエンド",
    items: ["Next.js 16", "React 19", "Tailwind CSS", "shadcn/ui"],
  },
  {
    category: "バックエンド",
    items: ["Hono", "Drizzle ORM", "PostgreSQL", "MCP SDK"],
  },
  {
    category: "インフラ",
    items: ["Terraform", "Cloud Run", "Cloud SQL", "Docker"],
  },
  {
    category: "認証・連携",
    items: ["OAuth 2.1 + PKCE", "Slack API", "OpenAI API"],
  },
];

const contributions = [
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Issue & PR",
    description: "バグ報告や機能提案、プルリクエストを歓迎しています",
  },
  {
    icon: <Code2 className="h-5 w-5" />,
    title: "コードレビュー",
    description: "コードの改善提案やレビューコメントをお待ちしています",
  },
  {
    icon: <Heart className="h-5 w-5" />,
    title: "フィードバック",
    description: "使い心地や改善点のフィードバックを教えてください",
  },
];

const values = [
  {
    icon: <Users className="h-6 w-6 text-primary" />,
    title: "静かに集中できる開発体験",
    description:
      "進捗報告の負担を減らし、開発者が本来の仕事に集中できる環境を目指しています",
  },
  {
    icon: <Scale className="h-6 w-6 text-primary" />,
    title: "透明性のある進捗管理",
    description:
      "プロセスを可視化しつつ、プライバシーに配慮した設計を心がけています",
  },
  {
    icon: <GitFork className="h-6 w-6 text-primary" />,
    title: "オープンな開発",
    description:
      "コードはすべて公開し、コミュニティとともに成長していきます",
  },
];

export default async function SourcePage() {
  const { user } = await getCurrentSession();

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-8 px-4 py-2 text-sm border-transparent"
          >
            <Code2 className="h-4 w-4" />
            Open Source
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
            オープンソースで
            <span className="block text-primary mt-2">ともに作る</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            {siteConfig.name}
            はオープンソースプロジェクトです。コードを公開し、コミュニティとともにより良い開発体験を追求しています。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Star className="h-5 w-5" />
                GitHubで見る
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/docs">ドキュメント</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="border-t border-slate-200 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                私たちの目指すもの
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                開発者の集中を守りながら、チームの透明性を実現する。その両立を目指しています。
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((value) => (
                <Card key={value.title} className="p-6 text-center">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate-600">{value.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-slate-50 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                技術スタック
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                モダンな技術スタックで構築されています。
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {techStack.map((stack) => (
                <Card key={stack.category} className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    {stack.category}
                  </h3>
                  <ul className="space-y-2">
                    {stack.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-slate-600"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contribution Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                コントリビューション
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                あなたの参加をお待ちしています。どんな貢献も歓迎します。
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {contributions.map((contribution) => (
                <Card key={contribution.title} className="p-6">
                  <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center mb-4">
                    {contribution.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {contribution.title}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {contribution.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* License Section */}
      <section className="border-t border-slate-200 py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
              ライセンス
            </h2>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              {siteConfig.name}はMITライセンスで公開されています。
              自由に使用、修正、配布することができます。
            </p>
            <Button asChild variant="outline" size="lg">
              <a
                href={`${siteConfig.github}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ライセンスを確認
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 text-white py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              一緒に作りませんか？
            </h2>
            <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
              GitHubでスターをつけたり、Issueを立てたり、プルリクエストを送ったり。
              あなたの参加をお待ちしています。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="px-8 py-4 shadow-lg hover:shadow-xl rounded-xl h-auto"
              >
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Star className="h-5 w-5" />
                  GitHubでスターする
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a
                  href={`${siteConfig.github}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Issueを見る
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
