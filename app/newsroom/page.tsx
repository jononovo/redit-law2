import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Newspaper } from "lucide-react";

export default function NewsroomPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main className="pt-40 pb-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-100 mb-6">
              <Newspaper className="w-8 h-8 text-neutral-400" />
            </div>
            <h1
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6"
              data-testid="heading-newsroom"
            >
              Newsroom
            </h1>
            <p className="text-xl text-neutral-500 font-medium leading-relaxed" data-testid="text-newsroom-description">
              Updates, announcements, and press releases from CreditClaw. Check back soon.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
