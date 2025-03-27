import ConstellationViewer from "@/components/constellation-viewer"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="container mx-auto py-4 px-4 md:px-6 lg:px-8 min-h-screen">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Constellation Viewer</h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground hidden sm:block">View the night sky based on location and time</p>
          <ThemeToggle />
        </div>
      </div>
      <ConstellationViewer />
    </main>
  )
}

