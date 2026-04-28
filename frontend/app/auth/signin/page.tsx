"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Bookmark, Search, Tags, Compass, Users, Chrome, Smartphone, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Top Nav */}
      <nav className="px-6 py-4 max-w-4xl mx-auto w-full flex items-center justify-between">
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
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Chrome className="w-4 h-4" />
            Chrome Extension
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.semanticbookmarks.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Android App
          </a>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
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
            <p className="text-muted-foreground mb-5">
              Save, organize, and search your bookmarks using natural language
            </p>
            <Button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              size="lg"
              className="gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Get Started with Google
            </Button>
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
              href="https://play.google.com/store/apps/details?id=com.semanticbookmarks.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">Android App <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></h3>
                <p className="text-sm text-muted-foreground">
                  Manage your bookmarks on the go. Available on the Google Play Store.
                </p>
              </div>
            </a>
            <a
              href="https://chromewebstore.google.com/detail/mefbjommjlcdcllmcjdjcngjaegnelik"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Chrome className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">Chrome Extension <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></h3>
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
