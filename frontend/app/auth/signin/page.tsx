"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Bookmark, Search, Tags, Compass, Users, Chrome } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg">
            <Bookmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Semantic Bookmarks</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://chromewebstore.google.com/detail/mefbjommjlcdcllmcjdjcngjaegnelik"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Chrome className="w-4 h-4" />
            Chrome Extension
          </a>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            size="sm"
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="container mx-auto px-4 max-w-lg">

          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Your AI-powered bookmark manager
            </h1>
            <p className="text-muted-foreground">
              Save, organize, and search your bookmarks using natural language
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-4 mb-8">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Search by meaning</h3>
                <p className="text-sm text-muted-foreground">
                  Find bookmarks using natural language. No need to remember exact titles or keywords.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Tags className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Auto-organize</h3>
                <p className="text-sm text-muted-foreground">
                  AI automatically categorizes and tags your bookmarks. Just save the URL.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Compass className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Discover new content</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized article recommendations based on your interests.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Share with friends</h3>
                <p className="text-sm text-muted-foreground">
                  Follow friends and see what they're reading. Discover content through your network.
                </p>
              </div>
            </div>
            <a
              href="https://chromewebstore.google.com/detail/mefbjommjlcdcllmcjdjcngjaegnelik"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Chrome className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Chrome Extension</h3>
                <p className="text-sm text-muted-foreground">
                  Save bookmarks directly from any webpage with one click.
                </p>
              </div>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
