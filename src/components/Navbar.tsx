import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function Navbar() {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-opacity-10 backdrop-filter backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo/Name */}
            <div className="flex items-center">
              <span className="text-foreground font-bold text-xl">
                Mesh Mind
              </span>
            </div>

            {/* Right side - Navigation and Controls */}
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}