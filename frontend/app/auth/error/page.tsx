"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Bookmark } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "You do not have permission to sign in. Your email might not be whitelisted.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Bookmark className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Semantic Bookmarks</h1>
          </div>
          <p className="text-slate-600">Search your bookmarks by meaning, not just keywords</p>
        </div>

        <Card className="w-full border-slate-200 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-2xl font-bold text-slate-900">Authentication Error</CardTitle>
            </div>
            <CardDescription className="text-center text-slate-600">
              {getErrorMessage()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600">
              {error === "AccessDenied" && (
                <p className="text-center">
                  If you believe you should have access, please contact your administrator
                  to add your email to the whitelist.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                <Link href="/auth/signin">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50">
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}