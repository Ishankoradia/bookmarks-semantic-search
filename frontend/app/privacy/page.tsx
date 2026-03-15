import type { Metadata } from 'next'
import Link from 'next/link'
import { Bookmark, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Privacy Policy - Semantic Bookmarks',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 bg-primary rounded-lg">
              <Bookmark className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Semantic Bookmarks</h1>
          </div>
          <p className="text-lg text-muted-foreground">Privacy Policy</p>
        </div>

        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="p-6 sm:p-8 space-y-8">

            <p className="text-sm text-muted-foreground">Last updated: March 15, 2026</p>

            <Section title="Overview">
              <p>
                Semantic Bookmarks is a bookmark management service that lets you save, organize, and
                search your bookmarks using AI-powered semantic search. This privacy policy explains what
                data we collect and how we use it.
              </p>
            </Section>

            <Section title="Data We Collect">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Account Information</h3>
                  <p>
                    When you sign in with Google, we receive and store your name, email address, and profile
                    picture. This is used solely to identify your account and display your profile within the app.
                  </p>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Bookmark Data</h3>
                  <p>
                    When you save a bookmark, we collect the URL and page title of the webpage you choose to
                    save. We may also fetch the page content to generate AI-powered tags, categories, and
                    search embeddings. This data is stored to provide the bookmark management and semantic
                    search functionality.
                  </p>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Authentication Tokens</h3>
                  <p>
                    Our Chrome extension stores an authentication token locally in your browser to keep you
                    signed in. This token is not shared with any third party.
                  </p>
                </div>
              </div>
            </Section>

            <Section title="How We Use Your Data">
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                <li>To provide the bookmark saving, organizing, and search functionality</li>
                <li>To generate AI-powered tags and categories for your bookmarks</li>
                <li>To authenticate you and secure your account</li>
              </ul>
            </Section>

            <Section title="Third-Party Services">
              <p className="mb-3">We use the following third-party services:</p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Google OAuth</span> — for user authentication
                </li>
                <li>
                  <span className="font-medium text-foreground">OpenAI API</span> — to generate embeddings,
                  tags, and categories for your bookmarks. Bookmark content sent to OpenAI is processed
                  according to their API data usage policy and is not used to train their models.
                </li>
              </ul>
            </Section>

            <Section title="Data Sharing">
              <p>
                We do not sell, trade, or transfer your personal data to third parties. Your data is only
                used to provide the Semantic Bookmarks service as described above.
              </p>
            </Section>

            <Section title="Data Storage and Security">
              <p>
                Your data is stored securely in our database. We use industry-standard security measures
                including encrypted connections (HTTPS) and JWT-based authentication to protect your data.
              </p>
            </Section>

            <Section title="Data Deletion">
              <p>
                You can delete individual bookmarks at any time through the app. If you wish to delete
                your entire account and all associated data, please contact us at the email below.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                We may update this privacy policy from time to time. Any changes will be reflected on this
                page with an updated date.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                If you have any questions about this privacy policy, please contact us at{' '}
                <a href="mailto:semanticbookmarks@gmail.com" className="text-primary hover:underline">
                  semanticbookmarks@gmail.com
                </a>.
              </p>
            </Section>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}
